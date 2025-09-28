"use client"

import { useState } from "react"
import { loadStripe } from "@stripe/stripe-js"

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

export default function Subscription() {
  const [loading, setLoading] = useState(false)
  const [couponCode, setCouponCode] = useState("")
  const [couponError, setCouponError] = useState("")
  const [couponSuccess, setCouponSuccess] = useState("")

  const handleSubscribe = async () => {
    setLoading(true)
    setCouponError("")
    
    try {
      const requestBody: any = {
        priceId: process.env.NEXT_PUBLIC_SUBSCRIPTION_PRICE_ID,
      }
      
      // Add coupon code if provided
      if (couponCode.trim()) {
        requestBody.couponCode = couponCode.trim()
      }
      
      const response = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        throw new Error(`Failed to create checkout session: ${response.statusText}`)
      }

      const data = await response.json()
      
      if (!data.sessionId) {
        throw new Error("No session ID returned from server")
      }

      const stripe = await stripePromise

      if (!stripe) {
        throw new Error("Stripe failed to load")
      }

      const { error } = await stripe.redirectToCheckout({ sessionId: data.sessionId })
      
      if (error) {
        throw new Error(error.message)
      }
    } catch (error) {
      console.error("Subscription error:", error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      
      // Check if it's a coupon-related error
      if (errorMessage.toLowerCase().includes('coupon')) {
        setCouponError(errorMessage)
      } else {
        alert(`Subscription failed: ${errorMessage}`)
      }
    }
    setLoading(false)
  }

  const validateCoupon = async () => {
    if (!couponCode.trim()) {
      setCouponError("Please enter a coupon code")
      return
    }

    try {
      const response = await fetch("/api/stripe/validate-coupon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ couponCode: couponCode.trim() }),
      })

      const data = await response.json()

      if (response.ok) {
        setCouponError("")
        setCouponSuccess(`✓ ${data.discount}% off applied!`)
      } else {
        setCouponError(data.error || "Invalid coupon code")
        setCouponSuccess("")
      }
    } catch (error) {
      setCouponError("Failed to validate coupon")
      setCouponSuccess("")
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 py-12">
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Choose Your Plan
          </h1>
          <p className="text-xl text-gray-600">
            Get unlimited access to your personal relationship assistant
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-2xl mx-auto">
          {/* Free Plan */}
          <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-200">
            <div className="text-center">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Free Trial</h3>
              <div className="text-4xl font-bold text-gray-900 mb-2">$0</div>
              <p className="text-gray-600 mb-6">7 days free</p>
              
              <ul className="text-left space-y-3 mb-8">
                <li className="flex items-center">
                  <span className="text-green-500 mr-3">✓</span>
                  Limited conversation history
                </li>
                <li className="flex items-center">
                  <span className="text-green-500 mr-3">✓</span>
                  Basic relationship guidance
                </li>
                <li className="flex items-center">
                  <span className="text-red-500 mr-3">✗</span>
                  Long-term memory
                </li>
                <li className="flex items-center">
                  <span className="text-red-500 mr-3">✗</span>
                  Personalized insights
                </li>
              </ul>
              
              <button
                disabled
                className="w-full py-3 px-6 bg-gray-200 text-gray-500 rounded-lg cursor-not-allowed"
              >
                Current Plan
              </button>
            </div>
          </div>

          {/* Premium Plan */}
          <div className="bg-white rounded-xl shadow-lg p-8 border-2 border-purple-500 relative">
            <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
              <span className="bg-purple-500 text-white px-4 py-2 rounded-full text-sm font-medium">
                Recommended
              </span>
            </div>
            
            <div className="text-center">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Premium</h3>
              <div className="text-4xl font-bold text-purple-600 mb-2">$19</div>
              <p className="text-gray-600 mb-6">per month</p>
              
              <ul className="text-left space-y-3 mb-8">
                <li className="flex items-center">
                  <span className="text-green-500 mr-3">✓</span>
                  Unlimited conversations
                </li>
                <li className="flex items-center">
                  <span className="text-green-500 mr-3">✓</span>
                  Full conversation history
                </li>
                <li className="flex items-center">
                  <span className="text-green-500 mr-3">✓</span>
                  Long-term memory & context
                </li>
                <li className="flex items-center">
                  <span className="text-green-500 mr-3">✓</span>
                  Personalized insights
                </li>
                <li className="flex items-center">
                  <span className="text-green-500 mr-3">✓</span>
                  SMS & WhatsApp support
                </li>
                <li className="flex items-center">
                  <span className="text-green-500 mr-3">✓</span>
                  Progress tracking
                </li>
              </ul>
              
              {/* Coupon Code Section - Only show in development */}
              {process.env.NODE_ENV === 'development' && (
                <div className="mb-6">
                  <div className="text-left">
                    <label htmlFor="coupon" className="block text-sm font-medium text-gray-700 mb-2">
                      Coupon Code (Dev Only)
                    </label>
                    <div className="flex gap-2">
                      <input
                        id="coupon"
                        type="text"
                        value={couponCode}
                        onChange={(e) => {
                          setCouponCode(e.target.value)
                          setCouponError("")
                          setCouponSuccess("")
                        }}
                        placeholder="Enter coupon code"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                      <button
                        type="button"
                        onClick={validateCoupon}
                        disabled={!couponCode.trim()}
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                      >
                        Apply
                      </button>
                    </div>
                    
                    {/* Coupon Error */}
                    {couponError && (
                      <p className="mt-2 text-sm text-red-600">
                        {couponError}
                      </p>
                    )}
                    
                    {/* Coupon Success */}
                    {couponSuccess && (
                      <p className="mt-2 text-sm text-green-600 font-medium">
                        {couponSuccess}
                      </p>
                    )}
                  </div>
                </div>
              )}
              
              <button
                onClick={handleSubscribe}
                disabled={loading}
                className="w-full py-3 px-6 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {loading ? "Processing..." : "Start Premium"}
              </button>
            </div>
          </div>
        </div>

        <div className="text-center mt-8 text-gray-600">
          <p>No commitment. Cancel anytime.</p>
        </div>
      </div>
    </div>
  )
}