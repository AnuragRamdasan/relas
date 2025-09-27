import OpenAI from "openai"
import { prisma } from "./prisma"

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
})

export interface UserProfile {
  id: string
  name?: string
  gender?: string
  age?: number
  location?: string
  personalityProfile?: any
  preferredCommunicationStyle?: string
  context?: any
}

export interface ConversationContext {
  recentMessages: Array<{
    content: string
    sender: string
    createdAt: Date
    sentiment?: string
    emotions?: string[]
  }>
  userContext: any
  conversationSummary?: string
  topicTags?: string[]
}

export async function generateRelationshipResponse(
  user: UserProfile,
  message: string,
  conversationId: string,
  platform: string = "sms"
): Promise<{
  response: string
  sentiment: string
  emotions: string[]
  topics: string[]
  urgencyLevel: number
}> {
  try {
    // Get conversation context
    const context = await buildConversationContext(user.id, conversationId)
    
    // Analyze current message
    const messageAnalysis = await analyzeMessage(message)
    
    // Generate personalized response
    const response = await generatePersonalizedResponse(
      user,
      message,
      context,
      messageAnalysis,
      platform
    )

    // Update user context based on conversation
    await updateUserContext(user.id, message, messageAnalysis, response)

    return {
      response: response.content,
      sentiment: messageAnalysis.sentiment,
      emotions: messageAnalysis.emotions,
      topics: messageAnalysis.topics,
      urgencyLevel: messageAnalysis.urgencyLevel,
    }
  } catch (error) {
    console.error("OpenAI generation error:", error)
    return {
      response: getFallbackResponse(message),
      sentiment: "neutral",
      emotions: [],
      topics: [],
      urgencyLevel: 1,
    }
  }
}

async function buildConversationContext(
  userId: string,
  conversationId: string
): Promise<ConversationContext> {
  // Get recent messages
  const recentMessages = await prisma.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: "desc" },
    take: 20,
  })

  // Get user context
  const userContext = await prisma.userContext.findUnique({
    where: { userId },
  })

  // Get conversation metadata
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
  })

  return {
    recentMessages: recentMessages.reverse(),
    userContext: userContext || {},
    conversationSummary: conversation?.contextSummary,
    topicTags: conversation?.topicTags,
  }
}

async function analyzeMessage(message: string) {
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `Analyze this relationship-related message and return a JSON object with:
        - sentiment: "positive", "negative", "neutral", or "mixed"
        - emotions: array of detected emotions (happy, sad, angry, frustrated, anxious, excited, confused, hopeful, etc.)
        - topics: array of relationship topics (communication, trust, intimacy, conflict, support, future, family, etc.)
        - urgencyLevel: number 1-5 (1=casual chat, 5=crisis/urgent help needed)
        
        Keep your analysis brief and accurate.`,
      },
      {
        role: "user",
        content: message,
      },
    ],
    max_tokens: 200,
    temperature: 0.3,
  })

  try {
    const analysis = JSON.parse(completion.choices[0].message.content || "{}")
    return {
      sentiment: analysis.sentiment || "neutral",
      emotions: analysis.emotions || [],
      topics: analysis.topics || [],
      urgencyLevel: analysis.urgencyLevel || 1,
    }
  } catch {
    return {
      sentiment: "neutral",
      emotions: [],
      topics: [],
      urgencyLevel: 1,
    }
  }
}

async function generatePersonalizedResponse(
  user: UserProfile,
  message: string,
  context: ConversationContext,
  analysis: any,
  platform: string
) {
  const systemPrompt = buildSystemPrompt(user, context, platform)
  const conversationHistory = buildConversationHistory(context.recentMessages)

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      ...conversationHistory,
      { role: "user", content: message },
    ],
    max_tokens: platform === "sms" ? 150 : 300,
    temperature: 0.7,
  })

  return {
    content: completion.choices[0].message.content?.trim() || getFallbackResponse(message),
  }
}

function buildSystemPrompt(
  user: UserProfile,
  context: ConversationContext,
  platform: string
): string {
  const userInfo = `
User Profile:
- Name: ${user.name || "User"}
- Gender: ${user.gender || "Not specified"}
- Age: ${user.age || "Not specified"}
- Location: ${user.location || "Not specified"}
- Communication Style: ${user.preferredCommunicationStyle || "Not specified"}
`

  const contextInfo = context.userContext?.relationshipHistory 
    ? `\nPrevious Context: ${JSON.stringify(context.userContext.relationshipHistory).slice(0, 500)}`
    : ""

  const platformGuidance = platform === "sms" 
    ? "Keep responses under 160 characters when possible. Be concise but warm."
    : "You can be more detailed in your responses, but stay conversational."

  return `You are an AI relationship assistant. Your goal is to help improve relationship quality through empathetic support and honest guidance.

${userInfo}${contextInfo}

Your approach:
1. Be empathetic and supportive, but also provide honest feedback when needed
2. Reference patterns from past conversations when relevant
3. Balance validation with constructive challenges
4. Focus on actionable advice that improves relationship outcomes
5. Ask clarifying questions to better understand situations
6. Recognize when professional help might be needed

${platformGuidance}

Remember: You're not just here to make them feel good, but to genuinely help their relationship improve.`
}

function buildConversationHistory(messages: any[]) {
  return messages.slice(-10).map(msg => ({
    role: msg.sender === "user" ? "user" : "assistant",
    content: msg.content,
  }))
}

async function updateUserContext(
  userId: string,
  message: string,
  analysis: any,
  response: any
) {
  try {
    const existingContext = await prisma.userContext.findUnique({
      where: { userId },
    })

    const currentPatterns = existingContext?.communicationPatterns || {}
    const currentTriggers = existingContext?.triggerPoints || {}

    // Update communication patterns
    if (analysis.emotions.length > 0) {
      analysis.emotions.forEach((emotion: string) => {
        currentPatterns[emotion] = (currentPatterns[emotion] || 0) + 1
      })
    }

    // Update trigger points for negative emotions
    if (analysis.sentiment === "negative" && analysis.topics.length > 0) {
      analysis.topics.forEach((topic: string) => {
        currentTriggers[topic] = (currentTriggers[topic] || 0) + 1
      })
    }

    await prisma.userContext.upsert({
      where: { userId },
      create: {
        userId,
        communicationPatterns: currentPatterns,
        triggerPoints: currentTriggers,
      },
      update: {
        communicationPatterns: currentPatterns,
        triggerPoints: currentTriggers,
        updatedAt: new Date(),
      },
    })
  } catch (error) {
    console.error("Error updating user context:", error)
  }
}

function getFallbackResponse(message: string): string {
  const fallbacks = [
    "I hear you. Can you tell me more about what's happening?",
    "That sounds challenging. How are you feeling about the situation?",
    "I understand. What would you like to work on together?",
    "Thanks for sharing that with me. What's your biggest concern right now?",
  ]
  
  return fallbacks[Math.floor(Math.random() * fallbacks.length)]
}