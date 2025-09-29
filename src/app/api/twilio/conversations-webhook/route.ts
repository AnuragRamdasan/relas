import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { generateRelationshipResponse } from "@/lib/openai"
import { sendConversationMessage, getConversationHistory } from "@/lib/twilio-conversations"

export async function POST(request: NextRequest) {
  try {
    console.log("🔔 CONVERSATIONS WEBHOOK CALLED")
    
    const formData = await request.formData()
    
    // Extract webhook data
    const eventType = formData.get("EventType") as string
    const conversationSid = formData.get("ConversationSid") as string
    const messageSid = formData.get("MessageSid") as string
    const messageBody = formData.get("Body") as string
    const author = formData.get("Author") as string
    const participantSid = formData.get("ParticipantSid") as string
    const source = formData.get("Source") as string
    
    console.log("📱 Conversations webhook data:", {
      eventType,
      conversationSid,
      messageSid,
      messageBody,
      author,
      participantSid,
      source,
      timestamp: new Date().toISOString()
    })
    
    // Only process message added events from users (not our assistant)
    if (eventType !== "onMessageAdded" || author === "assistant" || source === "API") {
      console.log(`ℹ️  Ignoring event: ${eventType} from ${author} (source: ${source})`)
      return NextResponse.json({ success: true, ignored: true })
    }
    
    // Extract user ID from conversation attributes or name
    const userId = conversationSid.replace('relas-', '')
    console.log(`🔍 Processing message for user: ${userId}`)
    
    // Find user by ID
    const user = await prisma.user.findFirst({
      where: {
        id: userId,
        isSubscribed: true,
      },
      include: {
        context: true,
      },
    })
    
    if (!user) {
      console.log(`❌ No subscribed user found for ID: ${userId}`)
      
      // Send error message back to conversation
      await sendConversationMessage(
        conversationSid,
        "Hi! It looks like you don't have an active subscription to our relationship assistant service. Please visit our website to get started!",
        false
      )
      return NextResponse.json({ success: true })
    }
    
    console.log(`✅ Found user:`, {
      id: user.id,
      name: user.name,
      email: user.email,
      isSubscribed: user.isSubscribed
    })
    
    // Find or create active conversation in our database
    let conversation = await prisma.conversation.findFirst({
      where: {
        userId: user.id,
        status: "active",
      },
    })
    
    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          userId: user.id,
          title: "Conversations API Chat",
          status: "active",
        },
      })
    }
    
    // Save user message to our database
    const userMessage = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        userId: user.id,
        content: messageBody,
        sender: "user",
        platform: "conversations", // New platform type for Conversations API
      },
    })
    
    // Get recent conversation history for context
    const historyResult = await getConversationHistory(conversationSid, 10)
    const conversationHistory = historyResult.success ? historyResult.messages : []
    
    // Build context from recent messages
    const recentMessages = conversationHistory
      .filter(msg => msg.body && msg.body.trim())
      .slice(-5) // Last 5 messages for context
      .map(msg => `${msg.author}: ${msg.body}`)
      .join("\\n")
    
    // Generate AI response with conversation context
    const userProfile = {
      id: user.id,
      name: user.name || undefined,
      gender: user.gender || undefined,
      age: user.age || undefined,
      location: [user.city, user.state, user.country].filter(Boolean).join(", "),
      personalityProfile: (user.personalityProfile as Record<string, unknown>) || undefined,
      preferredCommunicationStyle: user.preferredCommunicationStyle || undefined,
      context: (user.context as Record<string, unknown>) || undefined,
    }
    
    console.log(`🤖 Generating AI response for user ${user.id}...`)
    console.log(`📜 Conversation context: ${recentMessages.length > 0 ? recentMessages : 'No recent context'}`)
    
    const enhancedPrompt = recentMessages 
      ? `Recent conversation context:\\n${recentMessages}\\n\\nLatest message: ${messageBody}`
      : messageBody
    
    const aiResult = await generateRelationshipResponse(
      userProfile,
      enhancedPrompt,
      conversation.id,
      "conversations"
    )
    
    console.log(`🎯 AI response generated:`, {
      responseLength: aiResult.response.length,
      sentiment: aiResult.sentiment,
      emotions: aiResult.emotions,
      topics: aiResult.topics
    })
    
    // Update user message with analysis
    await prisma.message.update({
      where: { id: userMessage.id },
      data: {
        sentiment: aiResult.sentiment,
        emotions: aiResult.emotions,
        topics: aiResult.topics,
        urgencyLevel: aiResult.urgencyLevel,
      },
    })
    
    // Save AI message to our database
    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        userId: user.id,
        content: aiResult.response,
        sender: "assistant",
        platform: "conversations",
      },
    })
    
    // Send AI response via Conversations API
    const sendResult = await sendConversationMessage(
      conversationSid,
      aiResult.response,
      false
    )
    
    if (!sendResult.success) {
      console.error(`❌ Failed to send response: ${sendResult.error}`)
    } else {
      console.log(`✅ AI response sent successfully`)
    }
    
    // Create sentiment log
    await prisma.sentimentLog.create({
      data: {
        userId: user.id,
        messageId: userMessage.id,
        sentiment: aiResult.sentiment,
        confidence: 0.8,
        emotions: aiResult.emotions,
        intensity: aiResult.urgencyLevel / 5,
      },
    })
    
    // Update conversation metadata
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: {
        lastMessageAt: new Date(),
        totalMessages: { increment: 2 },
      },
    })
    
    return NextResponse.json({ success: true })
    
  } catch (error) {
    console.error("Conversations webhook error:", error)
    return NextResponse.json(
      { error: "Failed to process conversation message" },
      { status: 500 }
    )
  }
}