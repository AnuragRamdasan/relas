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
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const search = searchParams.get('search') || ''
    const sentiment = searchParams.get('sentiment') || ''

    // Verify conversation belongs to user
    const conversation = await prisma.conversation.findFirst({
      where: { 
        id,
        userId: user.id 
      },
    })

    if (!conversation) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 })
    }

    const skip = (page - 1) * limit

    // Build where clause for filtering
    const whereClause: {
      conversationId: string
      content?: { contains: string }
      sentiment?: string
    } = {
      conversationId: id
    }

    if (search) {
      whereClause.content = {
        contains: search
      }
    }

    if (sentiment) {
      whereClause.sentiment = sentiment
    }

    const [messages, totalCount] = await Promise.all([
      prisma.message.findMany({
        where: whereClause,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
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
      }),
      prisma.message.count({
        where: whereClause
      })
    ])

    // Parse JSON fields for SQLite compatibility
    const processedMessages = messages.map(message => ({
      ...message,
      emotions: message.emotions ? JSON.parse(message.emotions) : [],
      topics: message.topics ? JSON.parse(message.topics) : [],
    }))

    return NextResponse.json({
      messages: processedMessages,
      totalCount,
      currentPage: page,
      totalPages: Math.ceil(totalCount / limit),
      hasNextPage: page < Math.ceil(totalCount / limit),
      hasPrevPage: page > 1
    })
  } catch (error) {
    console.error("Messages API error:", error)
    return NextResponse.json(
      { error: "Failed to fetch messages" },
      { status: 500 }
    )
  }
}