import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { sendMessage } from "@/lib/twilio"

export async function POST() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    if (!user.phone) {
      return NextResponse.json({ 
        error: "Phone number required. Please add your phone number in settings first." 
      }, { status: 400 })
    }

    // Check if user is subscribed
    if (!user.isSubscribed) {
      return NextResponse.json({ 
        error: "Subscription required. Please subscribe to start conversations." 
      }, { status: 403 })
    }

    // Create a new conversation
    const conversation = await prisma.conversation.create({
      data: {
        userId: user.id,
        title: "New Conversation",
        status: "active",
        totalMessages: 0,
        lastMessageAt: new Date(),
      }
    })

    // Send a welcome message to start the conversation
    const welcomeMessage = `Hi ${user.name || 'there'}! 👋 

I'm your AI relationship assistant. I'm here to help you navigate relationship challenges, improve communication, and provide emotional support.

Feel free to share what's on your mind - whether it's about relationships, communication issues, or just need someone to talk to. Everything we discuss is private and confidential.

What would you like to talk about today?`

    const sendResult = await sendMessage({ 
      to: user.phone, 
      message: welcomeMessage,
      platform: "sms" 
    })

    if (!sendResult.success) {
      // Delete the conversation if message failed to send
      await prisma.conversation.delete({
        where: { id: conversation.id }
      })
      
      return NextResponse.json({ 
        error: `Failed to send message: ${sendResult.error}` 
      }, { status: 500 })
    }

    // Create the initial message record
    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        userId: user.id,
        content: welcomeMessage,
        sender: "assistant",
        platform: "sms",
        messageType: "text",
      }
    })

    // Update conversation with first message
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: {
        totalMessages: 1,
        lastMessageAt: new Date(),
      }
    })

    return NextResponse.json({ 
      message: "Conversation started successfully!",
      conversationId: conversation.id,
      phone: user.phone
    })

  } catch (error) {
    console.error("Start conversation API error:", error)
    return NextResponse.json(
      { error: "Failed to start conversation" },
      { status: 500 }
    )
  }
}