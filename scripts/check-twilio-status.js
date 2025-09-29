#!/usr/bin/env node

require('dotenv').config()
const twilio = require('twilio')

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
)

async function checkTwilioStatus() {
  try {
    console.log('🔍 Checking Twilio Account Status...')
    console.log('=====================================')
    
    // Get account information
    const account = await client.api.accounts(process.env.TWILIO_ACCOUNT_SID).fetch()
    
    console.log('📊 Account Details:')
    console.log(`   Status: ${account.status}`)
    console.log(`   Type: ${account.type}`)
    console.log(`   Created: ${account.dateCreated}`)
    
    // Check if it's a trial account
    if (account.type === 'Trial') {
      console.log('\n⚠️  TRIAL ACCOUNT DETECTED')
      console.log('   Trial accounts have limitations:')
      console.log('   - Can only message verified phone numbers')
      console.log('   - May have webhook restrictions')
      console.log('   - Limited functionality')
      console.log('\n💳 Consider upgrading to remove limitations')
    }
    
    // Get balance
    const balance = await client.balance.fetch()
    console.log(`\n💰 Account Balance: $${balance.balance} ${balance.currency}`)
    
    // List verified phone numbers (trial accounts only)
    console.log('\n📱 Verified Phone Numbers:')
    try {
      const verifiedNumbers = await client.outgoingCallerIds.list()
      if (verifiedNumbers.length === 0) {
        console.log('   ❌ No verified numbers found')
        console.log('   🔧 Add your phone number: Console > Phone Numbers > Verified Caller IDs')
      } else {
        verifiedNumbers.forEach(num => {
          console.log(`   ✅ ${num.phoneNumber} (${num.friendlyName || 'No name'})`)
        })
      }
    } catch (error) {
      console.log('   ⚠️  Could not fetch verified numbers')
    }
    
    // Check recent messages for debugging
    console.log('\n📨 Recent Messages (last 5):')
    const messages = await client.messages.list({ limit: 5 })
    if (messages.length === 0) {
      console.log('   No recent messages found')
    } else {
      messages.forEach(msg => {
        console.log(`   ${msg.direction}: ${msg.from} → ${msg.to}`)
        console.log(`   Status: ${msg.status}, Body: "${msg.body.substring(0, 50)}..."`)
        console.log(`   Date: ${msg.dateCreated}`)
        console.log('   ---')
      })
    }
    
    // Check webhook configuration
    console.log('\n🔗 Phone Number Webhook Configuration:')
    const phoneNumbers = await client.incomingPhoneNumbers.list()
    phoneNumbers.forEach(num => {
      console.log(`   📞 ${num.phoneNumber}:`)
      console.log(`      SMS URL: ${num.smsUrl || 'Not configured'}`)
      console.log(`      Voice URL: ${num.voiceUrl || 'Not configured'}`)
    })
    
  } catch (error) {
    console.error('❌ Error checking Twilio status:', error.message)
    
    if (error.code === 20003) {
      console.log('\n🔑 Authentication failed - check your credentials:')
      console.log('   TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN')
    }
  }
}

checkTwilioStatus()