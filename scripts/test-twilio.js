#!/usr/bin/env node

const twilio = require('twilio');
require('dotenv').config();

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

async function testTwilioIntegration() {
  try {
    console.log('🧪 Testing Twilio integration...');
    
    console.log('\n📋 Environment check:');
    console.log(`Account SID: ${process.env.TWILIO_ACCOUNT_SID ? '✅ Set' : '❌ Missing'}`);
    console.log(`Auth Token: ${process.env.TWILIO_AUTH_TOKEN ? '✅ Set' : '❌ Missing'}`);
    console.log(`Phone Number: ${process.env.TWILIO_PHONE_NUMBER || '❌ Missing'}`);
    console.log(`WhatsApp Number: ${process.env.TWILIO_WHATSAPP_NUMBER || '❌ Missing'}`);
    
    console.log('\n📱 Testing account access...');
    const account = await client.api.accounts(process.env.TWILIO_ACCOUNT_SID).fetch();
    console.log(`✅ Account: ${account.friendlyName} (${account.status})`);
    
    console.log('\n📞 Listing phone numbers...');
    const phoneNumbers = await client.incomingPhoneNumbers.list();
    console.log(`✅ Found ${phoneNumbers.length} phone number(s):`);
    
    phoneNumbers.forEach(pn => {
      console.log(`  📱 ${pn.phoneNumber} (${pn.friendlyName || 'No name'})`);
      console.log(`    SMS URL: ${pn.smsUrl || 'Not set'}`);
      console.log(`    SMS Method: ${pn.smsMethod || 'Not set'}`);
    });
    
    console.log('\n🔍 Checking webhook configuration...');
    const targetPhone = process.env.TWILIO_PHONE_NUMBER;
    const configuredPhone = phoneNumbers.find(pn => pn.phoneNumber === targetPhone);
    
    if (configuredPhone) {
      const expectedWebhook = process.env.NODE_ENV === 'production' 
        ? 'https://test.anuragramdasan.com/api/twilio/webhook'
        : `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/twilio/webhook`;
        
      console.log(`✅ Phone ${targetPhone} found`);
      console.log(`Current webhook: ${configuredPhone.smsUrl}`);
      console.log(`Expected webhook: ${expectedWebhook}`);
      console.log(`Webhook configured: ${configuredPhone.smsUrl === expectedWebhook ? '✅ Yes' : '❌ No'}`);
    } else {
      console.log(`❌ Phone ${targetPhone} not found in account`);
    }
    
    const testPhone = process.argv[2];
    if (testPhone) {
      console.log(`\n📤 Testing outbound message to ${testPhone}...`);
      
      try {
        const message = await client.messages.create({
          body: 'Test message from your Relationship Assistant! 🤖',
          from: process.env.TWILIO_PHONE_NUMBER,
          to: testPhone
        });
        
        console.log(`✅ Message sent successfully!`);
        console.log(`Message SID: ${message.sid}`);
        console.log(`Status: ${message.status}`);
        
      } catch (error) {
        console.error(`❌ Failed to send test message: ${error.message}`);
      }
    } else {
      console.log('\n💡 To test outbound messaging, run:');
      console.log('node scripts/test-twilio.js +1234567890');
    }
    
    console.log('\n🎉 Twilio integration test complete!');
    console.log('\n📝 Next steps:');
    console.log('1. Run `npm run setup-twilio` to configure webhooks');
    console.log('2. Send an SMS to your Twilio number to test inbound messaging');
    console.log('3. Check application logs for webhook activity');
    
  } catch (error) {
    console.error('❌ Error testing Twilio integration:', error.message);
    if (error.code) {
      console.error(`Error code: ${error.code}`);
    }
    process.exit(1);
  }
}

testTwilioIntegration();