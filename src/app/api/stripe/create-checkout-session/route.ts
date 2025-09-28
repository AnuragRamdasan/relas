import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { stripe } from "@/lib/stripe"
import { prisma } from "@/lib/prisma"
import Stripe from "stripe"

interface CheckoutSessionRequest {
  priceId: string
  couponCode?: string
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { priceId, couponCode }: CheckoutSessionRequest = await request.json()

    // Get or create Stripe customer
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    let customerId = user.stripeCustomerId

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: session.user.email,
        name: session.user.name || undefined,
        metadata: {
          userId: user.id,
        },
      })
      
      customerId = customer.id
      
      await prisma.user.update({
        where: { id: user.id },
        data: { stripeCustomerId: customerId },
      })
    }

    // Prepare checkout session configuration
    const sessionConfig: Stripe.Checkout.SessionCreateParams = {
      customer: customerId,
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${process.env.APP_URL}/dashboard?success=true`,
      cancel_url: `${process.env.APP_URL}/subscription?canceled=true`,
      metadata: {
        userId: user.id,
      },
    }

    // Add coupon if provided
    if (couponCode) {
      try {
        // Validate coupon exists and is active
        const coupon = await stripe.coupons.retrieve(couponCode)
        if (coupon.valid) {
          sessionConfig.discounts = [{ coupon: couponCode }]
        } else {
          return NextResponse.json(
            { error: "Coupon is not valid or has expired" },
            { status: 400 }
          )
        }
      } catch {
        return NextResponse.json(
          { error: "Invalid coupon code" },
          { status: 400 }
        )
      }
    }

    // Create checkout session
    const checkoutSession = await stripe.checkout.sessions.create(sessionConfig)

    return NextResponse.json({ sessionId: checkoutSession.id })
  } catch (error) {
    console.error("Stripe checkout error:", error)
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    )
  }
}