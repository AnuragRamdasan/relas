import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { sendMessage, formatPhoneNumber } from "@/lib/twilio"

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

    const formattedPhone = formatPhoneNumber(user.phone)
    const userName = user.name || "there"
    
    // Create a starter message
    const starterMessage = `Hi ${userName}! 👋 I'm your relationship assistant. How are you feeling about your relationship today? I'm here to listen and help you work through any thoughts or concerns you might have. ❤️`

    // Try SMS first, fallback to WhatsApp
    const smsResult = await sendMessage({
      to: formattedPhone,
      message: starterMessage,
      platform: "sms"
    })

    let platform = "sms"

    if (!smsResult.success) {
      console.log(`SMS failed for user ${user.id}, trying WhatsApp...`)
      const whatsappResult = await sendMessage({
        to: formattedPhone,
        message: starterMessage,
        platform: "whatsapp"
      })
      
      platform = "whatsapp"
      
      if (!whatsappResult.success) {
        return NextResponse.json({
          error: "Failed to send message via SMS and WhatsApp",
          details: {
            sms: smsResult.error,
            whatsapp: whatsappResult.error
          }
        }, { status: 500 })
      }
    }

    // Create conversation record
    const conversation = await prisma.conversation.create({
      data: {
        userId: user.id,
        title: "New Conversation",
        messages: {
          create: {
            sender: 'assistant',
            content: starterMessage,
            userId: user.id,
            messageType: 'text',
            platform: platform
          }
        }
      },
      include: {
        messages: true
      }
    })

    console.log(`Conversation starter sent to user ${user.id} via ${platform}`)

    return NextResponse.json({
      success: true,
      conversationId: conversation.id,
      platform,
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