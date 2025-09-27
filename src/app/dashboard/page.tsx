"use client"

import { useSession } from "next-auth/react"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

interface ConversationData {
  id: string
  title: string
  lastMessageAt: string
  totalMessages: number
  topicTags: string[]
}

interface SentimentData {
  date: string
  sentiment: string
  emotions: string[]
  intensity: number
}

export default function Dashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [conversations, setConversations] = useState<ConversationData[]>([])
  const [sentimentHistory, setSentimentHistory] = useState<SentimentData[]>([])
  const [loading, setLoading] = useState(true)
  const [userProfile, setUserProfile] = useState<any>(null)

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin")
    } else if (status === "authenticated") {
      fetchDashboardData()
    }
  }, [status, router])

  const fetchDashboardData = async () => {
    try {
      const [conversationsRes, sentimentRes, profileRes] = await Promise.all([
        fetch("/api/conversations"),
        fetch("/api/sentiment/history"),
        fetch("/api/user/profile"),
      ])

      if (conversationsRes.ok) {
        setConversations(await conversationsRes.json())
      }
      if (sentimentRes.ok) {
        setSentimentHistory(await sentimentRes.json())
      }
      if (profileRes.ok) {
        setUserProfile(await profileRes.json())
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error)
    } finally {
      setLoading(false)
    }
  }

  const getSentimentEmoji = (sentiment: string) => {
    switch (sentiment) {
      case "positive": return "😊"
      case "negative": return "😔"
      case "mixed": return "😐"
      default: return "😶"
    }
  }

  const getSubscriptionStatus = () => {
    if (userProfile?.isSubscribed) {
      return (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center">
            <span className="text-green-600 font-medium">✓ Premium Active</span>
          </div>
          <p className="text-sm text-green-600 mt-1">
            Unlimited conversations and full AI memory
          </p>
        </div>
      )
    } else {
      return (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <span className="text-yellow-700 font-medium">⚠ Free Trial</span>
            <button
              onClick={() => router.push("/subscription")}
              className="text-sm bg-purple-600 text-white px-3 py-1 rounded hover:bg-purple-700"
            >
              Upgrade
            </button>
          </div>
          <p className="text-sm text-yellow-700 mt-1">
            Limited features. Upgrade for full access.
          </p>
        </div>
      )
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome back, {session?.user?.name}!
          </h1>
          <p className="text-gray-600">
            Track your relationship conversations and emotional insights
          </p>
        </div>

        {/* Subscription Status */}
        <div className="mb-8">
          {getSubscriptionStatus()}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Total Conversations
            </h3>
            <p className="text-3xl font-bold text-purple-600">
              {conversations.length}
            </p>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Messages Exchanged
            </h3>
            <p className="text-3xl font-bold text-blue-600">
              {conversations.reduce((total, conv) => total + conv.totalMessages, 0)}
            </p>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Recent Mood
            </h3>
            <div className="flex items-center">
              <span className="text-3xl mr-2">
                {sentimentHistory.length > 0 
                  ? getSentimentEmoji(sentimentHistory[0]?.sentiment)
                  : "😶"
                }
              </span>
              <span className="text-lg font-medium text-gray-700 capitalize">
                {sentimentHistory.length > 0 
                  ? sentimentHistory[0]?.sentiment
                  : "No data"
                }
              </span>
            </div>
          </div>
        </div>

        {/* Recent Conversations */}
        <div className="grid md:grid-cols-2 gap-8">
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                Recent Conversations
              </h2>
            </div>
            <div className="p-6">
              {conversations.length > 0 ? (
                <div className="space-y-4">
                  {conversations.slice(0, 5).map((conversation) => (
                    <div
                      key={conversation.id}
                      className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-medium text-gray-900">
                          {conversation.title || "Conversation"}
                        </h3>
                        <span className="text-sm text-gray-500">
                          {new Date(conversation.lastMessageAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">
                        {conversation.totalMessages} messages
                      </p>
                      {conversation.topicTags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {conversation.topicTags.slice(0, 3).map((tag) => (
                            <span
                              key={tag}
                              className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500 mb-4">No conversations yet</p>
                  <p className="text-sm text-gray-400">
                    Start texting your AI assistant to begin!
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Sentiment Timeline */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                Emotional Journey
              </h2>
            </div>
            <div className="p-6">
              {sentimentHistory.length > 0 ? (
                <div className="space-y-4">
                  {sentimentHistory.slice(0, 10).map((entry, index) => (
                    <div key={index} className="flex items-center space-x-3">
                      <span className="text-2xl">
                        {getSentimentEmoji(entry.sentiment)}
                      </span>
                      <div className="flex-1">
                        <div className="flex justify-between items-center">
                          <span className="font-medium capitalize text-gray-900">
                            {entry.sentiment}
                          </span>
                          <span className="text-sm text-gray-500">
                            {new Date(entry.date).toLocaleDateString()}
                          </span>
                        </div>
                        {entry.emotions.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {entry.emotions.slice(0, 3).map((emotion) => (
                              <span
                                key={emotion}
                                className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded"
                              >
                                {emotion}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500 mb-4">No sentiment data yet</p>
                  <p className="text-sm text-gray-400">
                    Have some conversations to see your emotional patterns!
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Contact Info */}
        <div className="mt-8 bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            How to Connect
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-blue-50 rounded-lg p-4">
              <h3 className="font-medium text-blue-900 mb-2">📱 SMS</h3>
              <p className="text-sm text-blue-700">
                Text your AI assistant at: <br />
                <span className="font-mono">{userProfile?.phone || "Update your phone in settings"}</span>
              </p>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <h3 className="font-medium text-green-900 mb-2">💬 WhatsApp</h3>
              <p className="text-sm text-green-700">
                Message on WhatsApp: <br />
                <span className="font-mono">Same number as SMS</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}