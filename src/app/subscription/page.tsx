"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { loadStripe } from "@stripe/stripe-js"

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

export default function Subscription() {
  const { data: session } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleSubscribe = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          priceId: process.env.NEXT_PUBLIC_SUBSCRIPTION_PRICE_ID,
        }),
      })

      const { sessionId } = await response.json()
      const stripe = await stripePromise

      if (stripe) {
        await stripe.redirectToCheckout({ sessionId })
      }
    } catch (error) {
      console.error("Subscription error:", error)
    }
    setLoading(false)
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