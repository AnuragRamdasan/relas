import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
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

    const sentimentLogs = await prisma.sentimentLog.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 30, // Last 30 sentiment entries
      select: {
        sentiment: true,
        emotions: true,
        intensity: true,
        createdAt: true,
      },
    })

    const formattedData = sentimentLogs.map(log => ({
      date: log.createdAt.toISOString(),
      sentiment: log.sentiment,
      emotions: log.emotions,
      intensity: log.intensity,
    }))

    return NextResponse.json(formattedData)
  } catch (error) {
    console.error("Sentiment history API error:", error)
    return NextResponse.json(
      { error: "Failed to fetch sentiment history" },
      { status: 500 }
    )
  }
}