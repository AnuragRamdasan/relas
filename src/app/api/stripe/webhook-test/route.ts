import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    console.log("Webhook test endpoint called!")
    console.log("Headers:", Object.fromEntries(request.headers.entries()))
    console.log("Body:", body)
    
    return NextResponse.json({ 
      received: true, 
      timestamp: new Date().toISOString(),
      bodyLength: body.length 
    })
  } catch (error) {
    console.error("Webhook test error:", error)
    return NextResponse.json({ error: "Test failed" }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ 
    message: "Webhook test endpoint is accessible",
    timestamp: new Date().toISOString()
  })
}