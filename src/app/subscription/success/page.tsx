"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"

export default function SubscriptionSuccess() {
  const { status } = useSession()
  const router = useRouter()
  const [checking, setChecking] = useState(true)
  const [attempts, setAttempts] = useState(0)
  const maxAttempts = 30 // 30 seconds maximum wait

  const checkSubscriptionStatus = useCallback(async () => {
    try {
      const response = await fetch("/api/user/profile")
      if (response.ok) {
        const profile = await response.json()
        
        if (profile.isSubscribed) {
          // Success! User is now subscribed
          setChecking(false)
          router.push("/dashboard")
          return
        }
      }
      
      // If not subscribed yet, wait and try again
      if (attempts < maxAttempts) {
        setTimeout(() => {
          setAttempts(prev => prev + 1)
          checkSubscriptionStatus()
        }, 1000) // Check every second
      } else {
        // Max attempts reached, something went wrong
        setChecking(false)
        alert("Subscription processing is taking longer than expected. Please contact support if you were charged but don&apos;t have access.")
        router.push("/subscription")
      }
    } catch (error) {
      console.error("Error checking subscription status:", error)
      
      if (attempts < maxAttempts) {
        setTimeout(() => {
          setAttempts(prev => prev + 1)
          checkSubscriptionStatus()
        }, 1000)
      } else {
        setChecking(false)
        router.push("/subscription")
      }
    }
  }, [attempts, maxAttempts, router])

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin")
      return
    }

    if (status === "authenticated") {
      checkSubscriptionStatus()
    }
  }, [status, router, checkSubscriptionStatus])

  if (status === "loading" || checking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md mx-auto text-center">
          <div className="mb-6">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-green-600 mx-auto"></div>
          </div>
          
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            🎉 Payment Successful!
          </h1>
          
          <p className="text-gray-600 mb-4">
            We&apos;re activating your subscription now. This usually takes just a few seconds...
          </p>
          
          <div className="bg-blue-50 rounded-lg p-4 mb-4">
            <p className="text-sm text-blue-700">
              <strong>Checking subscription status...</strong><br />
              Attempt {attempts + 1} of {maxAttempts}
            </p>
          </div>
          
          <p className="text-xs text-gray-500">
            Please don&apos;t close this page. You&apos;ll be redirected automatically once your subscription is active.
          </p>
        </div>
      </div>
    )
  }

  return null
}