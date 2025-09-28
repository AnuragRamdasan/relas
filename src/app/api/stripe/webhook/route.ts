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

  console.log(`Processing webhook event: ${event.type}`)

  switch (event.type) {
    case "checkout.session.completed":
      const session = event.data.object as Stripe.Checkout.Session
      console.log(`Checkout session completed:`, {
        sessionId: session.id,
        mode: session.mode,
        subscription: session.subscription,
        metadata: session.metadata,
        customer: session.customer
      })
      
      if (session.mode === "subscription" && session.subscription) {
        const subscriptionId = typeof session.subscription === 'string' 
          ? session.subscription 
          : session.subscription.id
          
        const subscription = await stripe.subscriptions.retrieve(subscriptionId)
        console.log(`Retrieved subscription:`, {
          id: subscription.id,
          status: subscription.status,
          customer: subscription.customer
        })
        
        if (session.metadata?.userId) {
          console.log(`Processing subscription created for userId: ${session.metadata.userId}`)
          await handleSubscriptionCreated(subscription, session.metadata.userId)
        } else {
          console.error(`Missing userId in session metadata:`, session.metadata)
          // Try to find user by customer email if metadata is missing
          const customer = await stripe.customers.retrieve(subscription.customer as string)
          if (customer && !customer.deleted && customer.email) {
            console.log(`Attempting to find user by email: ${customer.email}`)
            const user = await prisma.user.findUnique({
              where: { email: customer.email }
            })
            if (user) {
              console.log(`Found user by email, processing subscription for userId: ${user.id}`)
              await handleSubscriptionCreated(subscription, user.id)
            } else {
              console.error(`Could not find user with email: ${customer.email}`)
            }
          } else {
            console.error(`Could not retrieve customer or customer has no email`)
          }
        }
      }
      break

    case "customer.subscription.updated":
    case "customer.subscription.deleted":
      const subscription = event.data.object as Stripe.Subscription
      console.log(`Subscription ${event.type}:`, {
        id: subscription.id,
        status: subscription.status,
        customer: subscription.customer
      })
      await handleSubscriptionUpdated(subscription)
      break

    case "invoice.payment_succeeded":
      const invoice = event.data.object as Stripe.Invoice & { subscription?: string | Stripe.Subscription }
      console.log(`Invoice payment succeeded:`, {
        invoiceId: invoice.id,
        subscription: invoice.subscription,
        customer: invoice.customer
      })
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
    console.log(`handleSubscriptionCreated called for userId: ${userId}, subscriptionId: ${subscription.id}`)
    
    // Create subscription record
    const subscriptionRecord = await prisma.subscription.create({
      data: {
        userId,
        stripeSubscriptionId: subscription.id,
        status: subscription.status,
        currentPeriodStart: new Date((subscription as StripeSubscriptionWithPeriods).current_period_start * 1000),
        currentPeriodEnd: new Date((subscription as StripeSubscriptionWithPeriods).current_period_end * 1000),
      },
    })
    console.log(`Created subscription record:`, subscriptionRecord)

    // Update user subscription status
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { isSubscribed: true },
    })
    console.log(`Updated user subscription status:`, {
      userId: updatedUser.id,
      isSubscribed: updatedUser.isSubscribed
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
    console.log(`handleSubscriptionUpdated called for subscriptionId: ${subscription.id}, status: ${subscription.status}`)
    
    const existingSubscription = await prisma.subscription.findUnique({
      where: { stripeSubscriptionId: subscription.id },
      include: { user: true },
    })

    if (existingSubscription) {
      console.log(`Found existing subscription for userId: ${existingSubscription.userId}`)
      
      await prisma.subscription.update({
        where: { stripeSubscriptionId: subscription.id },
        data: {
          status: subscription.status,
          currentPeriodStart: new Date((subscription as StripeSubscriptionWithPeriods).current_period_start * 1000),
          currentPeriodEnd: new Date((subscription as StripeSubscriptionWithPeriods).current_period_end * 1000),
          cancelAtPeriodEnd: (subscription as StripeSubscriptionWithPeriods).cancel_at_period_end,
        },
      })

      const isSubscribed = ["active", "trialing"].includes(subscription.status)
      console.log(`Updating user subscription status to: ${isSubscribed} (status: ${subscription.status})`)
      
      // Update user subscription status
      const updatedUser = await prisma.user.update({
        where: { id: existingSubscription.userId },
        data: { 
          isSubscribed: isSubscribed
        },
      })
      console.log(`Updated user ${updatedUser.id} isSubscribed to: ${updatedUser.isSubscribed}`)
    } else {
      console.error(`No existing subscription found for stripeSubscriptionId: ${subscription.id}`)
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

