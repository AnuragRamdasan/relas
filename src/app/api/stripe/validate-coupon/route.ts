import { NextRequest, NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import Stripe from "stripe"

interface ValidateCouponRequest {
  couponCode: string
}

export async function POST(request: NextRequest) {
  try {
    const { couponCode }: ValidateCouponRequest = await request.json()

    if (!couponCode) {
      return NextResponse.json({ error: "Coupon code is required" }, { status: 400 })
    }

    // Validate coupon with Stripe
    const coupon = await stripe.coupons.retrieve(couponCode)

    if (!coupon.valid) {
      return NextResponse.json({ error: "Coupon is not valid or has expired" }, { status: 400 })
    }

    // Return coupon details
    return NextResponse.json({
      valid: true,
      discount: coupon.percent_off || coupon.amount_off,
      discountType: coupon.percent_off ? "percent" : "amount",
      currency: coupon.currency,
      name: coupon.name,
    })
  } catch (error: unknown) {
    console.error("Coupon validation error:", error)
    
    // Handle Stripe-specific errors
    if (error instanceof Stripe.errors.StripeInvalidRequestError) {
      return NextResponse.json({ error: "Invalid coupon code" }, { status: 400 })
    }
    
    return NextResponse.json(
      { error: "Failed to validate coupon" },
      { status: 500 }
    )
  }
}