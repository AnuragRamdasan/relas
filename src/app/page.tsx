"use client"

import { useEffect, useCallback } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"

export default function Home() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const checkUserOnboarding = useCallback(async () => {
    try {
      const response = await fetch("/api/user/profile")
      if (response.ok) {
        const profile = await response.json()
        
        // Check if user has completed onboarding
        if (!profile.gender || !profile.age || !profile.phone) {
          router.push("/onboarding")
        } else if (!profile.isSubscribed) {
          router.push("/subscription")
        } else {
          router.push("/dashboard")
        }
      } else {
        router.push("/onboarding")
      }
    } catch (error) {
      console.error("Error checking user status:", error)
      router.push("/onboarding")
    }
  }, [router])

  useEffect(() => {
    if (status === "loading") return // Still loading

    if (status === "unauthenticated") {
      router.push("/auth/signin")
    } else if (session?.user) {
      // Check if user needs onboarding
      checkUserOnboarding()
    }
  }, [status, session, router, checkUserOnboarding])

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading...</p>
      </div>
    </div>
  )
}