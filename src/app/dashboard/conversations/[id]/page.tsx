"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter, useParams } from "next/navigation"
import { ChevronLeft, Search, Filter, MessageCircle, Clock, Heart, Brain, Tag } from "lucide-react"

interface Message {
  id: string
  content: string
  sender: string
  messageType: string
  platform: string
  sentiment?: string
  emotions: string[]
  topics: string[]
  urgencyLevel?: number
  createdAt: string
}

interface ConversationDetail {
  id: string
  title?: string
  status: string
  totalMessages: number
  lastMessageAt: string
  topicTags: string[]
  contextSummary?: string
  createdAt: string
  updatedAt: string
  messages: Message[]
  _count: {
    messages: number
  }
}

export default function ConversationDetailPage() {
  const router = useRouter()
  const params = useParams()
  const conversationId = params.id as string

  const [conversation, setConversation] = useState<ConversationDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [sentimentFilter, setSentimentFilter] = useState("")
  const [filteredMessages, setFilteredMessages] = useState<Message[]>([])

  const fetchConversation = useCallback(async () => {
    try {
      const response = await fetch(`/api/conversations/${conversationId}`)
      if (response.ok) {
        const data = await response.json()
        setConversation(data)
      } else if (response.status === 404) {
        router.push("/dashboard")
      }
    } catch (error) {
      console.error("Error fetching conversation:", error)
    } finally {
      setLoading(false)
    }
  }, [conversationId, router])

  const filterMessages = useCallback(() => {
    if (!conversation) return

    let filtered = conversation.messages

    if (searchTerm) {
      filtered = filtered.filter(message =>
        message.content.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (sentimentFilter) {
      filtered = filtered.filter(message => message.sentiment === sentimentFilter)
    }

    setFilteredMessages(filtered)
  }, [conversation, searchTerm, sentimentFilter])

  useEffect(() => {
    if (conversationId) {
      fetchConversation()
    }
  }, [conversationId, fetchConversation])

  useEffect(() => {
    if (conversation) {
      filterMessages()
    }
  }, [conversation, filterMessages])

  const getSentimentEmoji = (sentiment?: string) => {
    switch (sentiment) {
      case "positive": return "😊"
      case "negative": return "😔"
      case "mixed": return "😐"
      case "neutral": return "😶"
      default: return ""
    }
  }

  const getSentimentColor = (sentiment?: string) => {
    switch (sentiment) {
      case "positive": return "text-green-600 bg-green-50"
      case "negative": return "text-red-600 bg-red-50"
      case "mixed": return "text-yellow-600 bg-yellow-50"
      case "neutral": return "text-gray-600 bg-gray-50"
      default: return "text-gray-600 bg-gray-50"
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  const getMessageStats = () => {
    if (!conversation) return null

    const userMessages = conversation.messages.filter(m => m.sender === "user")
    const assistantMessages = conversation.messages.filter(m => m.sender === "assistant")
    
    const sentiments = conversation.messages
      .filter(m => m.sentiment)
      .reduce((acc, m) => {
        acc[m.sentiment!] = (acc[m.sentiment!] || 0) + 1
        return acc
      }, {} as Record<string, number>)

    return {
      userMessages: userMessages.length,
      assistantMessages: assistantMessages.length,
      sentiments
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading conversation...</p>
        </div>
      </div>
    )
  }

  if (!conversation) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Conversation not found</h1>
          <button
            onClick={() => router.push("/dashboard")}
            className="text-purple-600 hover:text-purple-700"
          >
            ← Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

  const stats = getMessageStats()

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.push("/dashboard")}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <ChevronLeft className="w-5 h-5 mr-1" />
            Back to Dashboard
          </button>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
              <div className="mb-4 lg:mb-0">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                  {conversation.title || "Conversation"}
                </h1>
                <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                  <span className="flex items-center">
                    <MessageCircle className="w-4 h-4 mr-1" />
                    {conversation.totalMessages} messages
                  </span>
                  <span className="flex items-center">
                    <Clock className="w-4 h-4 mr-1" />
                    Last active: {formatDate(conversation.lastMessageAt)}
                  </span>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    conversation.status === "active" 
                      ? "bg-green-100 text-green-700" 
                      : "bg-gray-100 text-gray-700"
                  }`}>
                    {conversation.status}
                  </span>
                </div>
                
                {conversation.topicTags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {conversation.topicTags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded"
                      >
                        <Tag className="w-3 h-3 mr-1" />
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Quick Stats */}
              {stats && (
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div className="bg-blue-50 rounded-lg p-3">
                    <div className="text-lg font-semibold text-blue-700">{stats.userMessages}</div>
                    <div className="text-xs text-blue-600">Your messages</div>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-3">
                    <div className="text-lg font-semibold text-purple-700">{stats.assistantMessages}</div>
                    <div className="text-xs text-purple-600">AI responses</div>
                  </div>
                </div>
              )}
            </div>

            {conversation.contextSummary && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <h3 className="text-sm font-medium text-gray-900 mb-2">Conversation Summary</h3>
                <p className="text-sm text-gray-700">{conversation.contextSummary}</p>
              </div>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search messages..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <select
                value={sentimentFilter}
                onChange={(e) => setSentimentFilter(e.target.value)}
                className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent appearance-none bg-white"
              >
                <option value="">All sentiments</option>
                <option value="positive">Positive</option>
                <option value="negative">Negative</option>
                <option value="mixed">Mixed</option>
                <option value="neutral">Neutral</option>
              </select>
            </div>
          </div>
          
          {(searchTerm || sentimentFilter) && (
            <div className="mt-3 text-sm text-gray-600">
              Showing {filteredMessages.length} of {conversation.messages.length} messages
              {searchTerm && (
                <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                  Search: &quot;{searchTerm}&quot;
                </span>
              )}
              {sentimentFilter && (
                <span className="ml-2 px-2 py-1 bg-green-100 text-green-700 rounded text-xs">
                  Sentiment: {sentimentFilter}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Messages */}
        <div className="space-y-4">
          {filteredMessages.length > 0 ? (
            filteredMessages.map((message) => (
              <div
                key={message.id}
                className={`bg-white rounded-lg shadow p-4 ${
                  message.sender === "user" ? "ml-8" : "mr-8"
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium ${
                      message.sender === "user" 
                        ? "bg-blue-500" 
                        : "bg-purple-500"
                    }`}>
                      {message.sender === "user" ? "You" : "AI"}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900 capitalize">
                        {message.sender === "user" ? "You" : "AI Assistant"}
                      </div>
                      <div className="text-xs text-gray-500">
                        {formatDate(message.createdAt)} • {message.platform}
                      </div>
                    </div>
                  </div>
                  
                  {message.sentiment && (
                    <div className={`px-2 py-1 rounded text-xs font-medium ${getSentimentColor(message.sentiment)}`}>
                      {getSentimentEmoji(message.sentiment)} {message.sentiment}
                    </div>
                  )}
                </div>

                <div className="mb-3">
                  <p className="text-gray-800 whitespace-pre-wrap">{message.content}</p>
                </div>

                {/* Message metadata */}
                <div className="flex flex-wrap gap-2">
                  {message.emotions.length > 0 && (
                    <div className="flex items-center space-x-1">
                      <Heart className="w-3 h-3 text-pink-500" />
                      <div className="flex flex-wrap gap-1">
                        {message.emotions.slice(0, 3).map((emotion) => (
                          <span
                            key={emotion}
                            className="text-xs bg-pink-100 text-pink-700 px-2 py-1 rounded"
                          >
                            {emotion}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {message.topics.length > 0 && (
                    <div className="flex items-center space-x-1">
                      <Brain className="w-3 h-3 text-indigo-500" />
                      <div className="flex flex-wrap gap-1">
                        {message.topics.slice(0, 3).map((topic) => (
                          <span
                            key={topic}
                            className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded"
                          >
                            {topic}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {message.urgencyLevel && message.urgencyLevel > 3 && (
                    <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">
                      High urgency ({message.urgencyLevel}/5)
                    </span>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <MessageCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No messages found</h3>
              <p className="text-gray-600">
                {searchTerm || sentimentFilter 
                  ? "Try adjusting your search or filter criteria."
                  : "This conversation doesn&apos;t have any messages yet."
                }
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}