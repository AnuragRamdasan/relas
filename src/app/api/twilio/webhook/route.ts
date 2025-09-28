import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { sendMessage } from "@/lib/twilio"
import { generateRelationshipResponse } from "@/lib/openai"

export async function POST(request: NextRequest) {
  try {
    console.log("🔔 TWILIO WEBHOOK CALLED")
    
    const formData = await request.formData()
    const body = formData.get("Body") as string
    const from = formData.get("From") as string
    // const to = formData.get("To") as string
    // const messageSid = formData.get("MessageSid") as string

    console.log("📱 Twilio webhook data:", {
      body,
      from,
      timestamp: new Date().toISOString()
    })

    // Determine if this is WhatsApp or SMS
    const isWhatsApp = from.startsWith("whatsapp:")
    const cleanFrom = from.replace("whatsapp:", "")
    const platform = isWhatsApp ? "whatsapp" : "sms"

    console.log("📞 Processed phone data:", {
      isWhatsApp,
      cleanFrom,
      platform
    })

    // Find user by phone number
    console.log(`🔍 Looking for user with phone: ${cleanFrom}`)
    
    const user = await prisma.user.findFirst({
      where: {
        phone: cleanFrom,
        isSubscribed: true,
      },
      include: {
        context: true,
      },
    })

    if (!user) {
      console.log(`❌ No subscribed user found for phone: ${cleanFrom}`)
      
      // Let's also check if user exists but isn't subscribed
      const unsubscribedUser = await prisma.user.findFirst({
        where: { phone: cleanFrom }
      })
      
      if (unsubscribedUser) {
        console.log(`⚠️ User exists but not subscribed:`, {
          id: unsubscribedUser.id,
          email: unsubscribedUser.email,
          isSubscribed: unsubscribedUser.isSubscribed
        })
      } else {
        console.log(`❌ No user found with phone: ${cleanFrom}`)
      }
      
      // Send error message for non-subscribed users
      await sendMessage({
        to: cleanFrom,
        message: "Hi! It looks like you don't have an active subscription to our relationship assistant service. Please visit our website to get started!",
        platform: isWhatsApp ? "whatsapp" : "sms",
      })
      return NextResponse.json({ success: true })
    }
    
    console.log(`✅ Found user:`, {
      id: user.id,
      name: user.name,
      email: user.email,
      isSubscribed: user.isSubscribed
    })

    // Find or create active conversation
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
          title: "SMS Conversation",
          status: "active",
        },
      })
    }

    // Save user message
    const userMessage = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        userId: user.id,
        content: body,
        sender: "user",
        platform,
      },
    })

    // Generate AI response with analysis
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
    
    const aiResult = await generateRelationshipResponse(
      userProfile,
      body,
      conversation.id,
      platform
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

    // Save AI message
    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        userId: user.id,
        content: aiResult.response,
        sender: "assistant",
        platform,
      },
    })

    // Send AI response via Twilio
    await sendMessage({
      to: cleanFrom,
      message: aiResult.response,
      platform: isWhatsApp ? "whatsapp" : "sms",
    })

    // Create sentiment log
    await prisma.sentimentLog.create({
      data: {
        userId: user.id,
        messageId: userMessage.id,
        sentiment: aiResult.sentiment,
        confidence: 0.8, // Default confidence
        emotions: aiResult.emotions,
        intensity: aiResult.urgencyLevel / 5, // Convert to 0-1 scale
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
    console.error("Twilio webhook error:", error)
    return NextResponse.json(
      { error: "Failed to process message" },
      { status: 500 }
    )
  }
}

