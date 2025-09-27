import { NextRequest, NextResponse } from "next/server"
import { sendMessage, formatPhoneNumber } from "@/lib/twilio"

export async function POST(request: NextRequest) {
  try {
    const { to, message, platform = "sms" } = await request.json()

    if (!to || !message) {
      return NextResponse.json(
        { error: "Missing required fields: to, message" },
        { status: 400 }
      )
    }

    const formattedPhone = formatPhoneNumber(to)
    const result = await sendMessage({
      to: formattedPhone,
      message,
      platform,
    })

    if (result.success) {
      return NextResponse.json({
        success: true,
        messageId: result.messageId,
        status: result.status,
      })
    } else {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error("Send message API error:", error)
    return NextResponse.json(
      { error: "Failed to send message" },
      { status: 500 }
    )
  }
}