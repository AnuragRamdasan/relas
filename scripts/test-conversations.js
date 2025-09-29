#!/usr/bin/env node

require('dotenv').config()
const twilio = require('twilio')

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
)

// Simple conversation functions for testing
async function getOrCreateConversation(participant) {
  try {
    const conversationSid = `relas-${participant.userId}`
    
    // Try to get existing conversation
    try {
      const conversation = await client.conversations.v1
        .conversations(conversationSid)
        .fetch()
      
      return { success: true, conversation, isNew: false }
    } catch (error) {
      // Conversation doesn't exist, create new one
    }
    
    // Create new conversation
    const conversation = await client.conversations.v1
      .conversations
      .create({
        uniqueName: conversationSid,
        friendlyName: `Test Conversation - ${participant.name}`,
      })
    
    // Add user as participant
    const formattedPhone = participant.platform === "whatsapp" 
      ? `whatsapp:${participant.phone}`
      : participant.phone
    
    await client.conversations.v1
      .conversations(conversation.sid)
      .participants
      .create({
        'messagingBinding.address': formattedPhone,
        'messagingBinding.proxyAddress': process.env.TWILIO_PHONE_NUMBER
      })
    
    return { success: true, conversation, isNew: true }
    
  } catch (error) {
    return { 
      success: false, 
      error: error.message
    }
  }
}

async function sendConversationMessage(conversationSid, message, fromUser = false) {
  try {
    const twilioMessage = await client.conversations.v1
      .conversations(conversationSid)
      .messages
      .create({
        body: message,
        author: fromUser ? 'user' : 'assistant'
      })
    
    return { success: true, message: twilioMessage }
    
  } catch (error) {
    return { 
      success: false, 
      error: error.message
    }
  }
}

async function testConversations() {
  console.log('🧪 Testing Conversations API...')
  console.log('==============================')
  
  try {
    // Test participant (you can change this to your verified number)
    const testParticipant = {
      userId: 'test-user-123',
      phone: '+919167725432', // Your verified number
      name: 'Test User',
      platform: 'sms'
    }
    
    console.log('📞 Creating conversation...')
    const conversationResult = await getOrCreateConversation(testParticipant)
    
    if (!conversationResult.success) {
      console.error('❌ Failed to create conversation:', conversationResult.error)
      return
    }
    
    const conversation = conversationResult.conversation
    console.log(`✅ Conversation created/found: ${conversation.sid}`)
    console.log(`   Unique Name: ${conversation.uniqueName}`)
    console.log(`   Friendly Name: ${conversation.friendlyName}`)
    console.log(`   Is New: ${conversationResult.isNew}`)
    
    // Send a test message
    console.log('\n📝 Sending test message...')
    const messageResult = await sendConversationMessage(
      conversation.sid,
      'Hello! This is a test message from the Conversations API. If you receive this, the integration is working! 🎉',
      false
    )
    
    if (messageResult.success) {
      console.log('✅ Test message sent successfully!')
      console.log(`   Message SID: ${messageResult.message.sid}`)
      
      console.log('\n📱 Check your phone for the test message!')
      console.log('If you receive it, reply to test the webhook.')
      
    } else {
      console.error('❌ Failed to send test message:', messageResult.error)
    }
    
  } catch (error) {
    console.error('💥 Test failed:', error.message)
    console.error('Stack:', error.stack)
  }
}

testConversations()