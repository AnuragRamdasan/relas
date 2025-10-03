import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { sendMessage } from "@/lib/twilio"
import { generateRelationshipResponse } from "@/lib/openai"

export async function POST(request: NextRequest) {
  try {
    console.log("🔔 TWILIO WEBHOOK RECEIVED")
    
    const formData = await request.formData()
    const body = formData.get("Body") as string
    const from = formData.get("From") as string
    const to = formData.get("To") as string
    const messageSid = formData.get("MessageSid") as string

    console.log("📱 Webhook data:", {
      body,
      from,
      to,
      messageSid,
      timestamp: new Date().toISOString()
    })

    if (!body || !from) {
      console.log("❌ Missing required webhook data")
      return NextResponse.json({ error: "Missing required data" }, { status: 400 })
    }

    const isWhatsApp = from.startsWith("whatsapp:")
    const cleanFrom = from.replace("whatsapp:", "")
    const platform = isWhatsApp ? "whatsapp" : "sms"

    console.log("📞 Processing:", {
      isWhatsApp,
      cleanFrom,
      platform
    })

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
      console.log(`❌ No subscribed user found for: ${cleanFrom}`)
      
      const unsubscribedUser = await prisma.user.findFirst({
        where: { phone: cleanFrom }
      })
      
      if (unsubscribedUser) {
        console.log(`⚠️ User exists but not subscribed: ${unsubscribedUser.email}`)
      }
      
      await sendMessage({
        to: cleanFrom,
        message: "Hi! It looks like you don't have an active subscription. Please visit our website to get started with your relationship assistant!",
        platform: platform,
      })
      
      return NextResponse.json({ success: true })
    }
    
    console.log(`✅ Found user: ${user.email} (${user.name})`)

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
          title: `${platform.toUpperCase()} Conversation`,
          status: "active",
        },
      })
      console.log(`📝 Created new conversation: ${conversation.id}`)
    }

    const userMessage = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        userId: user.id,
        content: body,
        sender: "user",
        platform,
      },
    })

    console.log(`💬 Saved user message: ${userMessage.id}`)

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

    console.log(`🤖 Generating AI response...`)
    
    const aiResult = await generateRelationshipResponse(
      userProfile,
      body,
      conversation.id,
      platform
    )
    
    console.log(`🎯 AI response generated: ${aiResult.response.substring(0, 50)}...`)

    await prisma.message.update({
      where: { id: userMessage.id },
      data: {
        sentiment: aiResult.sentiment,
        emotions: JSON.stringify(aiResult.emotions),
        topics: JSON.stringify(aiResult.topics),
        urgencyLevel: aiResult.urgencyLevel,
      },
    })

    const assistantMessage = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        userId: user.id,
        content: aiResult.response,
        sender: "assistant",
        platform,
      },
    })

    console.log(`🤖 Saved AI message: ${assistantMessage.id}`)

    const sendResult = await sendMessage({
      to: cleanFrom,
      message: aiResult.response,
      platform: platform,
    })

    if (!sendResult.success) {
      console.error(`❌ Failed to send response: ${sendResult.error}`)
    }

    await prisma.sentimentLog.create({
      data: {
        userId: user.id,
        messageId: userMessage.id,
        sentiment: aiResult.sentiment,
        confidence: 0.8,
        emotions: JSON.stringify(aiResult.emotions),
        intensity: aiResult.urgencyLevel / 5,
      },
    })

    await prisma.conversation.update({
      where: { id: conversation.id },
      data: {
        lastMessageAt: new Date(),
        totalMessages: { increment: 2 },
      },
    })

    console.log(`✅ Webhook processing complete`)
    return NextResponse.json({ success: true })

  } catch (error) {
    console.error("❌ Webhook error:", error)
    return NextResponse.json(
      { error: "Failed to process webhook" },
      { status: 500 }
    )
  }
}