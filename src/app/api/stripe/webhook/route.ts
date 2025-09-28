import { NextRequest, NextResponse } from "next/server"
import { headers } from "next/headers"
import { stripe } from "@/lib/stripe"
import { prisma } from "@/lib/prisma"
import { sendWelcomeMessageSequence } from "@/lib/welcome-messages"
import Stripe from "stripe"

// Simple in-memory cache for processed events (use Redis in production)
const processedEvents = new Set<string>()

// Extended Stripe types for webhook data
interface StripeSubscriptionWithPeriods extends Stripe.Subscription {
  current_period_start: number
  current_period_end: number
  cancel_at_period_end: boolean
}

export async function POST(request: NextRequest) {
  const body = await request.text()
  const headersList = await headers()
  const signature = headersList.get("stripe-signature")

  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err) {
    console.error("Webhook signature verification failed:", err)
    return NextResponse.json({ error: "Webhook Error" }, { status: 400 })
  }

  // Check for duplicate events
  if (processedEvents.has(event.id)) {
    console.log(`Duplicate event received: ${event.id}`)
    return NextResponse.json({ received: true, duplicate: true })
  }
  
  // Mark event as processed
  processedEvents.add(event.id)
  
  // Clean up old events (keep last 1000)
  if (processedEvents.size > 1000) {
    const eventArray = Array.from(processedEvents)
    processedEvents.clear()
    eventArray.slice(-500).forEach(id => processedEvents.add(id))
  }

  switch (event.type) {
    case "checkout.session.completed":
      const session = event.data.object as Stripe.Checkout.Session
      
      if (session.mode === "subscription" && session.subscription) {
        const subscriptionId = typeof session.subscription === 'string' 
          ? session.subscription 
          : session.subscription.id
          
        const subscription = await stripe.subscriptions.retrieve(subscriptionId)
        
        if (session.metadata?.userId) {
          await handleSubscriptionCreated(subscription, session.metadata.userId)
        }
      }
      break

    case "customer.subscription.updated":
    case "customer.subscription.deleted":
      const subscription = event.data.object as Stripe.Subscription
      await handleSubscriptionUpdated(subscription)
      break

    case "invoice.payment_succeeded":
      const invoice = event.data.object as Stripe.Invoice & { subscription?: string | Stripe.Subscription }
      if (invoice.subscription) {
        const subscriptionId = typeof invoice.subscription === 'string' 
          ? invoice.subscription 
          : invoice.subscription.id
        await handleSuccessfulPayment(subscriptionId)
      }
      break

    default:
      console.log(`Unhandled event type: ${event.type}`)
  }

  return NextResponse.json({ received: true })
}

async function handleSubscriptionCreated(
  subscription: Stripe.Subscription,
  userId: string
) {
  try {
    // Create subscription record
    await prisma.subscription.create({
      data: {
        userId,
        stripeSubscriptionId: subscription.id,
        status: subscription.status,
        currentPeriodStart: new Date((subscription as StripeSubscriptionWithPeriods).current_period_start * 1000),
        currentPeriodEnd: new Date((subscription as StripeSubscriptionWithPeriods).current_period_end * 1000),
      },
    })

    // Update user subscription status
    await prisma.user.update({
      where: { id: userId },
      data: { isSubscribed: true },
    })

    // Send welcome message via Twilio
    const messageResult = await sendWelcomeMessageSequence({
      userId,
      trigger: "subscription_created"
    })
    
    if (messageResult.success) {
      console.log(`Welcome messages sent to new subscriber ${userId}: ${messageResult.messagesSent} messages via ${messageResult.platform}`)
    } else {
      console.error(`Failed to send welcome messages to ${userId}: ${messageResult.error}`)
    }
  } catch (error) {
    console.error("Error handling subscription created:", error)
  }
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  try {
    const existingSubscription = await prisma.subscription.findUnique({
      where: { stripeSubscriptionId: subscription.id },
      include: { user: true },
    })

    if (existingSubscription) {
      await prisma.subscription.update({
        where: { stripeSubscriptionId: subscription.id },
        data: {
          status: subscription.status,
          currentPeriodStart: new Date((subscription as StripeSubscriptionWithPeriods).current_period_start * 1000),
          currentPeriodEnd: new Date((subscription as StripeSubscriptionWithPeriods).current_period_end * 1000),
          cancelAtPeriodEnd: (subscription as StripeSubscriptionWithPeriods).cancel_at_period_end,
        },
      })

      // Update user subscription status
      await prisma.user.update({
        where: { id: existingSubscription.userId },
        data: { 
          isSubscribed: ["active", "trialing"].includes(subscription.status) 
        },
      })
    }
  } catch (error) {
    console.error("Error handling subscription updated:", error)
  }
}

async function handleSuccessfulPayment(subscriptionId: string) {
  try {
    const subscription = await prisma.subscription.findUnique({
      where: { stripeSubscriptionId: subscriptionId },
      include: { user: true },
    })

    if (subscription) {
      // Ensure user is marked as subscribed
      await prisma.user.update({
        where: { id: subscription.userId },
        data: { isSubscribed: true },
      })

      // Send welcome message sequence for payment success
      const messageResult = await sendWelcomeMessageSequence({
        userId: subscription.userId,
        trigger: "payment_success"
      })
      
      if (messageResult.success) {
        console.log(`Welcome messages sent to user ${subscription.userId}: ${messageResult.messagesSent} messages via ${messageResult.platform}`)
      } else {
        console.error(`Failed to send welcome messages to ${subscription.userId}: ${messageResult.error}`)
      }
    }
  } catch (error) {
    console.error("Error handling successful payment:", error)
  }
}

