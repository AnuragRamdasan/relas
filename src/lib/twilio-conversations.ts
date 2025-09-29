import twilio from "twilio"

export const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID!,
  process.env.TWILIO_AUTH_TOKEN!
)

export interface ConversationParticipant {
  userId: string
  phone: string
  name?: string
  platform: "sms" | "whatsapp"
}

export interface ConversationMessage {
  body: string
  from: string
  platform: "sms" | "whatsapp"
}

/**
 * Create or get existing conversation for a user
 */
export async function getOrCreateConversation(participant: ConversationParticipant) {
  try {
    const conversationSid = `relas-${participant.userId}`
    
    // Try to get existing conversation
    try {
      const conversation = await twilioClient.conversations.v1
        .conversations(conversationSid)
        .fetch()
      
      console.log(`✅ Found existing conversation: ${conversation.sid}`)
      return { success: true, conversation, isNew: false }
    } catch (error) {
      // Conversation doesn't exist, create new one
      console.log(`📝 Creating new conversation for user ${participant.userId}`)
    }
    
    // Create new conversation
    const conversation = await twilioClient.conversations.v1
      .conversations
      .create({
        uniqueName: conversationSid,
        friendlyName: `Relationship Assistant - ${participant.name || participant.phone}`,
        attributes: JSON.stringify({
          userId: participant.userId,
          platform: participant.platform,
          createdBy: 'relationship-assistant'
        })
      })
    
    console.log(`✅ Created conversation: ${conversation.sid}`)
    
    // Add user as participant
    await addParticipantToConversation(conversation.sid, participant)
    
    return { success: true, conversation, isNew: true }
    
  } catch (error) {
    console.error("Error creating/getting conversation:", error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error" 
    }
  }
}

/**
 * Add participant to conversation
 */
export async function addParticipantToConversation(
  conversationSid: string, 
  participant: ConversationParticipant
) {
  try {
    const formattedPhone = participant.platform === "whatsapp" 
      ? `whatsapp:${participant.phone}`
      : participant.phone
    
    const twilioParticipant = await twilioClient.conversations.v1
      .conversations(conversationSid)
      .participants
      .create({
        'messagingBinding.address': formattedPhone,
        'messagingBinding.proxyAddress': participant.platform === "whatsapp" 
          ? process.env.TWILIO_WHATSAPP_NUMBER!
          : process.env.TWILIO_PHONE_NUMBER!,
        attributes: JSON.stringify({
          userId: participant.userId,
          platform: participant.platform,
          name: participant.name
        })
      })
    
    console.log(`✅ Added participant ${participant.phone} to conversation`)
    return { success: true, participant: twilioParticipant }
    
  } catch (error) {
    // Participant might already exist
    if (error instanceof Error && error.message.includes('Participant already exists')) {
      console.log(`ℹ️  Participant ${participant.phone} already in conversation`)
      return { success: true, participant: null }
    }
    
    console.error("Error adding participant:", error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error" 
    }
  }
}

/**
 * Send message in conversation
 */
export async function sendConversationMessage(
  conversationSid: string,
  message: string,
  fromUser: boolean = false
) {
  try {
    const twilioMessage = await twilioClient.conversations.v1
      .conversations(conversationSid)
      .messages
      .create({
        body: message,
        author: fromUser ? 'user' : 'assistant',
        attributes: JSON.stringify({
          sender: fromUser ? 'user' : 'assistant',
          timestamp: new Date().toISOString(),
          platform: 'api'
        })
      })
    
    console.log(`✅ Sent message in conversation ${conversationSid}`)
    return { success: true, message: twilioMessage }
    
  } catch (error) {
    console.error("Error sending conversation message:", error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error" 
    }
  }
}

/**
 * Get conversation history
 */
export async function getConversationHistory(conversationSid: string, limit: number = 50) {
  try {
    const messages = await twilioClient.conversations.v1
      .conversations(conversationSid)
      .messages
      .list({ limit })
    
    return { 
      success: true, 
      messages: messages.map(msg => ({
        sid: msg.sid,
        body: msg.body,
        author: msg.author,
        dateCreated: msg.dateCreated,
        attributes: msg.attributes ? JSON.parse(msg.attributes) : {}
      }))
    }
    
  } catch (error) {
    console.error("Error getting conversation history:", error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error" 
    }
  }
}

/**
 * Configure conversation webhooks
 */
export async function configureConversationWebhooks() {
  try {
    const webhookUrl = process.env.NODE_ENV === 'production' 
      ? 'https://relas.relationshipgpt.ai/api/twilio/conversations-webhook'
      : `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/twilio/conversations-webhook`
    
    console.log(`🔧 Configuring Conversations webhooks...`)
    console.log(`📍 Webhook URL: ${webhookUrl}`)
    
    // Get or create webhook configuration
    const configuration = await twilioClient.conversations.v1
      .configuration()
      .update({
        defaultChatServiceSid: await getDefaultChatService(),
        defaultMessagingServiceSid: undefined, // We'll use phone numbers directly
        defaultInactiveTimer: 'PT1H', // 1 hour timeout
        defaultClosedTimer: 'P30D'    // 30 days to close
      })
    
    // Set webhook URLs
    await twilioClient.conversations.v1
      .configuration()
      .webhooks()
      .update({
        method: 'POST',
        filters: ['onMessageAdded', 'onConversationUpdated', 'onParticipantAdded'],
        target: 'webhook',
        'webhook.target': webhookUrl
      })
    
    console.log(`✅ Conversations webhooks configured`)
    return { success: true, configuration }
    
  } catch (error) {
    console.error("Error configuring conversations webhooks:", error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error" 
    }
  }
}

/**
 * Get default chat service (create if needed)
 */
async function getDefaultChatService() {
  try {
    const services = await twilioClient.conversations.v1.services.list()
    
    if (services.length > 0) {
      return services[0].sid
    }
    
    // Create default service
    const service = await twilioClient.conversations.v1.services.create({
      friendlyName: 'Relationship Assistant Conversations'
    })
    
    return service.sid
    
  } catch (error) {
    console.error("Error getting chat service:", error)
    throw error
  }
}

/**
 * Format phone number for Twilio
 */
export function formatPhoneForConversations(phone: string, platform: "sms" | "whatsapp" = "sms"): string {
  // Remove all non-digits
  const digits = phone.replace(/\D/g, "")
  
  // Add country code if not present
  let formattedPhone = phone
  if (digits.length === 10) {
    formattedPhone = `+1${digits}`
  } else if (digits.length === 11 && digits.startsWith("1")) {
    formattedPhone = `+${digits}`
  }
  
  // Add WhatsApp prefix if needed
  if (platform === "whatsapp") {
    return `whatsapp:${formattedPhone}`
  }
  
  return formattedPhone
}