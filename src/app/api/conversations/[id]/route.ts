import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params
    
    const conversation = await prisma.conversation.findFirst({
      where: { 
        id,
        userId: user.id 
      },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            content: true,
            sender: true,
            messageType: true,
            platform: true,
            sentiment: true,
            emotions: true,
            topics: true,
            urgencyLevel: true,
            createdAt: true,
          }
        },
        _count: {
          select: {
            messages: true
          }
        }
      }
    })

    if (!conversation) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 })
    }

    // Parse JSON fields for SQLite compatibility
    const processedConversation = {
      ...conversation,
      topicTags: conversation.topicTags ? JSON.parse(conversation.topicTags) : [],
      messages: conversation.messages.map(message => ({
        ...message,
        emotions: message.emotions ? JSON.parse(message.emotions) : [],
        topics: message.topics ? JSON.parse(message.topics) : [],
      }))
    }

    return NextResponse.json(processedConversation)
  } catch (error) {
    console.error("Conversation detail API error:", error)
    return NextResponse.json(
      { error: "Failed to fetch conversation" },
      { status: 500 }
    )
  }
}