import { prisma } from "@/lib/prisma"
import { sendMessage, formatPhoneNumber } from "@/lib/twilio"

export interface WelcomeMessageResult {
  success: boolean
  messagesSent: number
  platform: "sms" | "whatsapp" | "both"
  error?: string
}

export interface WelcomeMessageOptions {
  userId: string
  trigger: "subscription_created" | "payment_success" | "manual"
  forceResend?: boolean
}

export async function sendWelcomeMessageSequence({
  userId,
  trigger,
  forceResend = false
}: WelcomeMessageOptions): Promise<WelcomeMessageResult> {
  try {
    // Check if we should send messages
    if (!forceResend) {
      const shouldSend = await shouldSendWelcomeMessage(userId)
      if (!shouldSend) {
        return {
          success: true,
          messagesSent: 0,
          platform: "sms",
          error: "Welcome messages already sent to this user"
        }
      }
    }

    // Get user information
    const user = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user?.phone) {
      return {
        success: false,
        messagesSent: 0,
        platform: "sms",
        error: "No phone number found for user"
      }
    }

    const formattedPhone = formatPhoneNumber(user.phone)
    const userName = user.name || "there"
    
    // Welcome message sequence
    const welcomeMessages = [
      `Hi ${userName}! 🎉 Welcome to your personal relationship assistant! I'm here to help you navigate your relationship journey with personalized guidance and support.`,
      `Feel free to text me anytime you need relationship advice, want to talk through a situation, or just need someone to listen. I'm available 24/7! 💬`,
      `To get started, you can tell me about your current relationship situation or ask me any questions you have. How are you feeling about your relationship today? ❤️`
    ]

    let messagesSent = 0
    let platform: "sms" | "whatsapp" | "both" = "sms"
    let lastError: string | undefined

    // Send each message in the sequence
    for (let i = 0; i < welcomeMessages.length; i++) {
      const message = welcomeMessages[i]
      
      // Try SMS first
      const smsResult = await sendMessage({
        to: formattedPhone,
        message,
        platform: "sms"
      })

      if (smsResult.success) {
        messagesSent++
        console.log(`SMS ${i + 1}/3 sent successfully to user ${userId}`)
      } else {
        console.log(`SMS failed for user ${userId}, trying WhatsApp...`)
        
        // Fallback to WhatsApp
        const whatsappResult = await sendMessage({
          to: formattedPhone,
          message,
          platform: "whatsapp"
        })
        
        if (whatsappResult.success) {
          messagesSent++
          platform = platform === "sms" ? "whatsapp" : "both"
          console.log(`WhatsApp ${i + 1}/3 sent successfully to user ${userId}`)
        } else {
          lastError = `Message ${i + 1}: ${whatsappResult.error}`
          console.error(`Both SMS and WhatsApp failed for message ${i + 1} to user ${userId}`)
        }
      }

      // Add delay between messages
      if (i < welcomeMessages.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000))
      }
    }

    // Create conversation record if any messages were sent
    if (messagesSent > 0) {
      await createWelcomeConversation(userId, welcomeMessages.slice(0, messagesSent))
      
      // Log the welcome message delivery
      await logWelcomeMessageDelivery(userId, trigger, messagesSent, platform)
    }

    return {
      success: messagesSent > 0,
      messagesSent,
      platform,
      error: messagesSent === 0 ? lastError : undefined
    }

  } catch (error) {
    console.error("Error in sendWelcomeMessageSequence:", error)
    return {
      success: false,
      messagesSent: 0,
      platform: "sms",
      error: error instanceof Error ? error.message : "Unknown error"
    }
  }
}

async function shouldSendWelcomeMessage(userId: string): Promise<boolean> {
  try {
    // Check if user has any previous conversations
    const conversationCount = await prisma.conversation.count({
      where: { userId }
    })
    
    // Check if we've already sent welcome messages
    const welcomeMessageCount = await prisma.message.count({
      where: {
        conversation: { userId },
        sender: 'assistant',
        content: {
          contains: 'Welcome to your personal relationship assistant'
        }
      }
    })
    
    return conversationCount === 0 && welcomeMessageCount === 0
  } catch (error) {
    console.error("Error checking if should send welcome message:", error)
    return true // Default to sending if we can't determine
  }
}

async function createWelcomeConversation(userId: string, messages: string[]): Promise<void> {
  try {
    await prisma.conversation.create({
      data: {
        userId,
        title: "Welcome to Your Relationship Assistant",
        messages: {
          create: messages.map((content) => ({
            sender: 'assistant',
            content,
            userId,
            messageType: 'text',
            platform: 'sms'
          }))
        }
      }
    })
  } catch (error) {
    console.error("Error creating welcome conversation:", error)
  }
}

async function logWelcomeMessageDelivery(
  userId: string, 
  trigger: string, 
  messagesSent: number, 
  platform: string
): Promise<void> {
  try {
    // Log to console for now - in production, you might want to use a logging service
    console.log(`Welcome message delivery logged:`, {
      userId,
      trigger,
      messagesSent,
      platform,
      timestamp: new Date().toISOString()
    })
    
    // You could also store this in a dedicated log table:
    // await prisma.messageLog.create({
    //   data: {
    //     userId,
    //     trigger,
    //     messagesSent,
    //     platform,
    //     timestamp: new Date()
    //   }
    // })
    
  } catch (error) {
    console.error("Error logging welcome message delivery:", error)
  }
}