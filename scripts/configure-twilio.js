#!/usr/bin/env node

/**
 * Twilio Configuration Script
 * Configures Twilio phone numbers and WhatsApp for two-way messaging
 * Sets webhook URLs for incoming messages
 */

require('dotenv').config()
const twilio = require('twilio')

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
)

async function configureTwilio() {
  console.log('🔧 Configuring Twilio for two-way messaging...')
  
  const baseUrl = process.env.NODE_ENV === 'production' 
    ? 'https://relas.relationshipgpt.ai'
    : (process.env.NEXTAUTH_URL || 'https://relas.relationshipgpt.ai')
  const webhookUrl = `${baseUrl}/api/twilio/webhook`
  
  console.log(`📍 Webhook URL: ${webhookUrl}`)
  
  try {
    // Get all phone numbers associated with the account
    console.log('📱 Fetching Twilio phone numbers...')
    const phoneNumbers = await client.incomingPhoneNumbers.list()
    
    if (phoneNumbers.length === 0) {
      console.log('❌ No phone numbers found. Please purchase a Twilio phone number first.')
      return
    }
    
    console.log(`📞 Found ${phoneNumbers.length} phone number(s):`)
    phoneNumbers.forEach(number => {
      console.log(`  - ${number.phoneNumber} (${number.friendlyName || 'No name'})`)
    })
    
    // Configure SMS webhook for each phone number
    console.log('\n📨 Configuring SMS webhooks...')
    for (const phoneNumber of phoneNumbers) {
      try {
        await client.incomingPhoneNumbers(phoneNumber.sid).update({
          smsUrl: webhookUrl,
          smsMethod: 'POST',
          voiceUrl: '', // Disable voice for now
        })
        console.log(`✅ SMS webhook configured for ${phoneNumber.phoneNumber}`)
      } catch (error) {
        console.error(`❌ Failed to configure SMS for ${phoneNumber.phoneNumber}:`, error.message)
      }
    }
    
    // Configure WhatsApp sandbox (if using sandbox)
    console.log('\n💬 Configuring WhatsApp sandbox...')
    try {
      // Note: For WhatsApp sandbox, we need to configure it through the Twilio Console
      // or use the WhatsApp Business API if you have it approved
      console.log('📋 WhatsApp configuration:')
      console.log(`   1. Go to Twilio Console > Messaging > Try it out > Send a WhatsApp message`)
      console.log(`   2. Set webhook URL to: ${webhookUrl}`)
      console.log(`   3. Set HTTP method to: POST`)
      console.log(`   4. Save configuration`)
      
      // If you have WhatsApp Business API approved, you can configure it programmatically:
      // const whatsappNumbers = await client.incomingPhoneNumbers.list({
      //   phoneNumber: process.env.TWILIO_WHATSAPP_NUMBER?.replace('whatsapp:', '')
      // })
      
    } catch (error) {
      console.error('❌ WhatsApp configuration error:', error.message)
    }
    
    console.log('\n🎉 Twilio configuration completed!')
    console.log('\n📋 Next steps:')
    console.log('1. Test SMS by sending a message to your Twilio phone number')
    console.log('2. For WhatsApp: Follow the sandbox setup instructions above')
    console.log('3. Check your webhook logs to verify messages are being received')
    
  } catch (error) {
    console.error('💥 Configuration failed:', error.message)
    console.error('Stack:', error.stack)
  }
}

// Validate environment variables
function validateEnvironment() {
  const required = [
    'TWILIO_ACCOUNT_SID',
    'TWILIO_AUTH_TOKEN',
    'TWILIO_PHONE_NUMBER'
  ]
  
  const missing = required.filter(key => !process.env[key])
  
  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:')
    missing.forEach(key => console.error(`  - ${key}`))
    process.exit(1)
  }
}

async function main() {
  console.log('🚀 Starting Twilio Configuration')
  console.log('================================')
  
  validateEnvironment()
  await configureTwilio()
}

if (require.main === module) {
  main().catch(console.error)
}

module.exports = { configureTwilio }