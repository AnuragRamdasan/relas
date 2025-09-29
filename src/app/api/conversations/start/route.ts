import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getOrCreateConversation, sendConversationMessage, formatPhoneForConversations } from "@/lib/twilio-conversations"

export async function POST() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get user profile
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: {
        id: true,
        name: true,
        phone: true,
        isSubscribed: true
      }
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    if (!user.isSubscribed) {
      return NextResponse.json({ 
        error: "Subscription required to start conversations" 
      }, { status: 403 })
    }

    if (!user.phone) {
      return NextResponse.json({ 
        error: "Phone number required to start conversations" 
      }, { status: 400 })
    }

    const formattedPhone = formatPhoneForConversations(user.phone)
    const userName = user.name || "there"
    
    // Create a starter message
    const starterMessage = `Hi ${userName}! 👋 I'm your relationship assistant. How are you feeling about your relationship today? I'm here to listen and help you work through any thoughts or concerns you might have. ❤️`

    // Create or get Twilio Conversation
    const conversationResult = await getOrCreateConversation({
      userId: user.id,
      phone: formattedPhone,
      name: user.name || undefined,
      platform: "sms"
    })

    if (!conversationResult.success) {
      return NextResponse.json({
        error: "Failed to create conversation",
        details: conversationResult.error
      }, { status: 500 })
    }

    const { conversation: twilioConversation } = conversationResult

    // Send starter message via Conversations API
    const messageResult = await sendConversationMessage(
      twilioConversation.sid,
      starterMessage,
      false
    )

    if (!messageResult.success) {
      return NextResponse.json({
        error: "Failed to send starter message",
        details: messageResult.error
      }, { status: 500 })
    }

    // Create conversation record in our database
    const conversation = await prisma.conversation.create({
      data: {
        userId: user.id,
        title: "Conversations API Chat",
        messages: {
          create: {
            sender: 'assistant',
            content: starterMessage,
            userId: user.id,
            messageType: 'text',
            platform: 'conversations'
          }
        }
      },
      include: {
        messages: true
      }
    })

    console.log(`Conversation starter sent to user ${user.id} via Conversations API`)
    console.log(`Twilio Conversation SID: ${twilioConversation.sid}`)

    return NextResponse.json({
      success: true,
      conversationId: conversation.id,
      twilioConversationSid: twilioConversation.sid,
      platform: "conversations",
      message: "Conversation started! Check your phone for a message."
    })

  } catch (error) {
    console.error("Error starting conversation:", error)
    return NextResponse.json({
      error: "Failed to start conversation",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}