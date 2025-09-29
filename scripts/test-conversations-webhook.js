#!/usr/bin/env node

const http = require('http')
const https = require('https')
const querystring = require('querystring')

async function testWebhook() {
  console.log('🧪 Testing Conversations Webhook Endpoint...')
  console.log('============================================')
  
  // Test data mimicking Twilio webhook
  const testData = {
    EventType: 'onMessageAdded',
    ConversationSid: 'relas-test-user-123',
    MessageSid: 'IM12345678901234567890123456789012',
    Body: 'This is a test reply to check webhook processing',
    Author: 'user',
    ParticipantSid: 'MB12345678901234567890123456789012',
    Source: 'SMS'
  }
  
  const postData = querystring.stringify(testData)
  
  // Test localhost first
  console.log('📡 Testing local webhook endpoint...')
  await testEndpoint('localhost', 3000, '/api/twilio/conversations-webhook', postData, false)
  
  // Test production if domain resolves
  console.log('\n📡 Testing production webhook endpoint...')
  await testEndpoint('relas.relationshipgpt.ai', 443, '/api/twilio/conversations-webhook', postData, true)
}

function testEndpoint(hostname, port, path, postData, useHttps = false) {
  return new Promise((resolve) => {
    const options = {
      hostname,
      port,
      path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData)
      },
      timeout: 10000
    }
    
    const client = useHttps ? https : http
    
    const req = client.request(options, (res) => {
      console.log(`✅ ${hostname}:${port} - Status: ${res.statusCode}`)
      
      let data = ''
      res.on('data', (chunk) => {
        data += chunk
      })
      
      res.on('end', () => {
        try {
          const response = JSON.parse(data)
          console.log(`   Response: ${JSON.stringify(response)}`)
        } catch (error) {
          console.log(`   Response: ${data}`)
        }
        resolve()
      })
    })
    
    req.on('error', (error) => {
      console.log(`❌ ${hostname}:${port} - Error: ${error.message}`)
      resolve()
    })
    
    req.on('timeout', () => {
      console.log(`⏰ ${hostname}:${port} - Timeout`)
      req.destroy()
      resolve()
    })
    
    req.write(postData)
    req.end()
  })
}

testWebhook()