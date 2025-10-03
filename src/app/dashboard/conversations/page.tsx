"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Search, Filter, MessageCircle, Clock, Tag, BarChart3, Calendar, ChevronRight, ArrowLeft } from "lucide-react"

interface ConversationData {
  id: string
  title?: string
  lastMessageAt: string
  totalMessages: number
  topicTags: string[]
  status: string
  createdAt: string
  contextSummary?: string
}

export default function ConversationsPage() {
  const router = useRouter()
  const [conversations, setConversations] = useState<ConversationData[]>([])
  const [filteredConversations, setFilteredConversations] = useState<ConversationData[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [sortBy, setSortBy] = useState("lastMessageAt")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")

  const fetchConversations = async () => {
    try {
      const response = await fetch("/api/conversations")
      if (response.ok) {
        const data = await response.json()
        // Parse topicTags for SQLite compatibility
        const processedData = data.map((conv: ConversationData & { topicTags: string | string[] }) => ({
          ...conv,
          topicTags: typeof conv.topicTags === 'string' ? JSON.parse(conv.topicTags) : conv.topicTags || []
        }))
        setConversations(processedData)
      }
    } catch (error) {
      console.error("Error fetching conversations:", error)
    } finally {
      setLoading(false)
    }
  }

  const filterAndSortConversations = useCallback(() => {
    let filtered = [...conversations]

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(conv =>
        conv.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        conv.contextSummary?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        conv.topicTags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    }

    // Apply status filter
    if (statusFilter) {
      filtered = filtered.filter(conv => conv.status === statusFilter)
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: string | number = a[sortBy as keyof ConversationData] as string | number
      let bValue: string | number = b[sortBy as keyof ConversationData] as string | number

      // Handle date sorting
      if (sortBy === "lastMessageAt" || sortBy === "createdAt") {
        aValue = new Date(aValue as string).getTime()
        bValue = new Date(bValue as string).getTime()
      }

      // Handle number sorting
      if (sortBy === "totalMessages") {
        aValue = Number(aValue)
        bValue = Number(bValue)
      }

      if (sortOrder === "asc") {
        return aValue > bValue ? 1 : -1
      } else {
        return aValue < bValue ? 1 : -1
      }
    })

    setFilteredConversations(filtered)
  }, [conversations, searchTerm, statusFilter, sortBy, sortOrder])

  useEffect(() => {
    fetchConversations()
  }, [])

  useEffect(() => {
    filterAndSortConversations()
  }, [filterAndSortConversations])

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInMs = now.getTime() - date.getTime()
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24))

    if (diffInDays === 0) {
      return "Today"
    } else if (diffInDays === 1) {
      return "Yesterday"
    } else if (diffInDays < 7) {
      return `${diffInDays} days ago`
    } else {
      return date.toLocaleDateString()
    }
  }

  const getConversationStats = () => {
    const totalMessages = conversations.reduce((sum, conv) => sum + conv.totalMessages, 0)
    const activeConversations = conversations.filter(conv => conv.status === "active").length
    const archivedConversations = conversations.filter(conv => conv.status === "archived").length
    
    // Get all unique topics
    const allTopics = conversations.flatMap(conv => conv.topicTags)
    const uniqueTopics = [...new Set(allTopics)]

    return {
      totalConversations: conversations.length,
      totalMessages,
      activeConversations,
      archivedConversations,
      uniqueTopics: uniqueTopics.length
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading conversations...</p>
        </div>
      </div>
    )
  }

  const stats = getConversationStats()

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.push("/dashboard")}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-5 h-5 mr-1" />
            Back to Dashboard
          </button>
          
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                All Conversations
              </h1>
              <p className="text-gray-600">
                Explore your complete conversation history and insights
              </p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center">
              <MessageCircle className="w-5 h-5 text-purple-500 mr-2" />
              <div>
                <div className="text-lg font-semibold text-gray-900">{stats.totalConversations}</div>
                <div className="text-xs text-gray-600">Total</div>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center">
              <BarChart3 className="w-5 h-5 text-blue-500 mr-2" />
              <div>
                <div className="text-lg font-semibold text-gray-900">{stats.totalMessages}</div>
                <div className="text-xs text-gray-600">Messages</div>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
              <div>
                <div className="text-lg font-semibold text-gray-900">{stats.activeConversations}</div>
                <div className="text-xs text-gray-600">Active</div>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center">
              <div className="w-2 h-2 bg-gray-500 rounded-full mr-2"></div>
              <div>
                <div className="text-lg font-semibold text-gray-900">{stats.archivedConversations}</div>
                <div className="text-xs text-gray-600">Archived</div>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center">
              <Tag className="w-5 h-5 text-indigo-500 mr-2" />
              <div>
                <div className="text-lg font-semibold text-gray-900">{stats.uniqueTopics}</div>
                <div className="text-xs text-gray-600">Topics</div>
              </div>
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search conversations, topics, or summaries..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
            
            <div className="flex gap-2">
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent appearance-none bg-white"
                >
                  <option value="">All status</option>
                  <option value="active">Active</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
              
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white"
              >
                <option value="lastMessageAt">Last Message</option>
                <option value="createdAt">Created Date</option>
                <option value="totalMessages">Message Count</option>
                <option value="title">Title</option>
              </select>
              
              <button
                onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white hover:bg-gray-50"
              >
                {sortOrder === "asc" ? "↑" : "↓"}
              </button>
            </div>
          </div>
          
          {(searchTerm || statusFilter) && (
            <div className="mt-3 text-sm text-gray-600">
              Showing {filteredConversations.length} of {conversations.length} conversations
            </div>
          )}
        </div>

        {/* Conversations List */}
        <div className="space-y-4">
          {filteredConversations.length > 0 ? (
            filteredConversations.map((conversation) => (
              <div
                key={conversation.id}
                onClick={() => router.push(`/dashboard/conversations/${conversation.id}`)}
                className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow cursor-pointer"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {conversation.title || `Conversation ${conversation.id.slice(0, 8)}`}
                      </h3>
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                      <span className="flex items-center">
                        <MessageCircle className="w-4 h-4 mr-1" />
                        {conversation.totalMessages} messages
                      </span>
                      <span className="flex items-center">
                        <Clock className="w-4 h-4 mr-1" />
                        {formatDate(conversation.lastMessageAt)}
                      </span>
                      <span className="flex items-center">
                        <Calendar className="w-4 h-4 mr-1" />
                        Started {formatDate(conversation.createdAt)}
                      </span>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        conversation.status === "active" 
                          ? "bg-green-100 text-green-700" 
                          : "bg-gray-100 text-gray-700"
                      }`}>
                        {conversation.status}
                      </span>
                    </div>

                    {conversation.contextSummary && (
                      <p className="text-sm text-gray-700 mb-3 line-clamp-2">
                        {conversation.contextSummary}
                      </p>
                    )}

                    {conversation.topicTags.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {conversation.topicTags.slice(0, 5).map((tag) => (
                          <span
                            key={tag}
                            className="inline-flex items-center text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded"
                          >
                            <Tag className="w-3 h-3 mr-1" />
                            {tag}
                          </span>
                        ))}
                        {conversation.topicTags.length > 5 && (
                          <span className="text-xs text-gray-500">
                            +{conversation.topicTags.length - 5} more
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <MessageCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchTerm || statusFilter ? "No conversations found" : "No conversations yet"}
              </h3>
              <p className="text-gray-600 mb-4">
                {searchTerm || statusFilter 
                  ? "Try adjusting your search or filter criteria."
                  : "Start your first conversation to see it here."
                }
              </p>
              {!(searchTerm || statusFilter) && (
                <button
                  onClick={() => router.push("/dashboard")}
                  className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700"
                >
                  Go to Dashboard
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}