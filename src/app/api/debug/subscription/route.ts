import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get user with subscription details
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        subscription: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Get all subscriptions for this user (in case there are multiple)
    const allSubscriptions = await prisma.subscription.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        isSubscribed: user.isSubscribed,
        stripeCustomerId: user.stripeCustomerId,
        createdAt: user.createdAt
      },
      currentSubscription: user.subscription,
      allSubscriptions: allSubscriptions,
      subscriptionCount: allSubscriptions.length
    })
  } catch (error) {
    console.error("Debug subscription API error:", error)
    return NextResponse.json(
      { error: "Failed to fetch subscription debug info" },
      { status: 500 }
    )
  }
}