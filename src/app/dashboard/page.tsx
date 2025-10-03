"use client"

import { useSession } from "next-auth/react"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { ChevronRight, Eye } from "lucide-react"

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
  const [userProfile, setUserProfile] = useState<{
    isSubscribed: boolean;
    phone?: string;
    name?: string;
  } | null>(null)
  const [startingConversation, setStartingConversation] = useState(false)

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin")
    } else if (status === "authenticated") {
      fetchDashboardData()
    }
  }, [status, router])

  useEffect(() => {
    // Redirect non-subscribed users to subscription page
    // But give a brief moment for subscription status to update after payment
    if (userProfile !== null && !userProfile.isSubscribed) {
      const timer = setTimeout(() => {
        router.push("/subscription")
      }, 2000) // Wait 2 seconds before redirecting
      
      return () => clearTimeout(timer)
    }
  }, [userProfile, router])

  const fetchDashboardData = async () => {
    try {
      const [conversationsRes, sentimentRes, profileRes] = await Promise.all([
        fetch("/api/conversations"),
        fetch("/api/sentiment/history"),
        fetch("/api/user/profile"),
      ])

      if (conversationsRes.ok) {
        const data = await conversationsRes.json()
        // Parse topicTags for SQLite compatibility
        const processedData = data.map((conv: ConversationData & { topicTags: string | string[] }) => ({
          ...conv,
          topicTags: typeof conv.topicTags === 'string' ? JSON.parse(conv.topicTags) : conv.topicTags || []
        }))
        setConversations(processedData)
      }
      if (sentimentRes.ok) {
        const sentimentData = await sentimentRes.json()
        // Parse emotions for SQLite compatibility
        const processedSentimentData = sentimentData.map((entry: SentimentData & { emotions: string | string[] }) => ({
          ...entry,
          emotions: typeof entry.emotions === 'string' ? JSON.parse(entry.emotions) : entry.emotions || []
        }))
        setSentimentHistory(processedSentimentData)
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

  const handleStartConversation = async () => {
    if (!userProfile?.phone) {
      alert("Please add your phone number in settings to start conversations")
      return
    }

    setStartingConversation(true)
    
    try {
      const response = await fetch("/api/conversations/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      })

      const result = await response.json()

      if (response.ok) {
        alert(`${result.message} You should receive a message shortly on your phone.`)
        // Refresh the dashboard to show the new conversation
        fetchDashboardData()
      } else {
        alert(`Failed to start conversation: ${result.error}`)
      }
    } catch (error) {
      console.error("Error starting conversation:", error)
      alert("Failed to start conversation. Please try again.")
    } finally {
      setStartingConversation(false)
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

  // Show loading state for non-subscribed users (giving time for webhook to process)
  if (userProfile !== null && !userProfile.isSubscribed) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Verifying your subscription...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Welcome back, {session?.user?.name}!
              </h1>
              <p className="text-gray-600">
                Track your relationship conversations and emotional insights
              </p>
            </div>
            <div className="mt-4 sm:mt-0">
              <button
                onClick={handleStartConversation}
                disabled={startingConversation || !userProfile?.phone}
                className={`px-6 py-3 rounded-lg font-medium text-white transition-colors ${
                  startingConversation 
                    ? "bg-gray-400 cursor-not-allowed"
                    : !userProfile?.phone
                    ? "bg-gray-400 cursor-not-allowed" 
                    : "bg-purple-600 hover:bg-purple-700"
                }`}
              >
                {startingConversation ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Starting...
                  </span>
                ) : (
                  <>💬 Start New Conversation</>
                )}
              </button>
              {!userProfile?.phone && (
                <p className="text-xs text-gray-500 mt-1 text-center">
                  Phone number required
                </p>
              )}
            </div>
          </div>
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
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">
                  Recent Conversations
                </h2>
                {conversations.length > 0 && (
                  <button
                    onClick={() => router.push("/dashboard/conversations")}
                    className="flex items-center text-sm text-purple-600 hover:text-purple-700"
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    View All
                  </button>
                )}
              </div>
            </div>
            <div className="p-6">
              {conversations.length > 0 ? (
                <div className="space-y-4">
                  {conversations.slice(0, 5).map((conversation) => (
                    <div
                      key={conversation.id}
                      onClick={() => router.push(`/dashboard/conversations/${conversation.id}`)}
                      className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-medium text-gray-900">
                          {conversation.title || "Conversation"}
                        </h3>
                        <div className="flex items-center text-sm text-gray-500">
                          <span className="mr-2">
                            {new Date(conversation.lastMessageAt).toLocaleDateString()}
                          </span>
                          <ChevronRight className="w-4 h-4" />
                        </div>
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
                          {conversation.topicTags.length > 3 && (
                            <span className="text-xs text-gray-500">
                              +{conversation.topicTags.length - 3} more
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500 mb-4">No conversations yet</p>
                  <p className="text-sm text-gray-400 mb-4">
                    Click &quot;Start New Conversation&quot; above to begin!
                  </p>
                  {userProfile?.phone ? (
                    <button
                      onClick={handleStartConversation}
                      disabled={startingConversation}
                      className="text-sm bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 disabled:bg-gray-400"
                    >
                      {startingConversation ? "Starting..." : "💬 Start First Conversation"}
                    </button>
                  ) : (
                    <p className="text-xs text-gray-400">
                      Add phone number in settings first
                    </p>
                  )}
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