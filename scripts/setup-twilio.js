#!/usr/bin/env node

const twilio = require('twilio');
require('dotenv').config();

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

async function setupTwilioWebhook() {
  try {
    console.log('🔧 Setting up Twilio webhook...');
    
    const webhookUrl = process.env.NODE_ENV === 'production' 
      ? 'https://test.anuragramdasan.com/api/twilio/webhook'
      : `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/twilio/webhook`;

    console.log(`📍 Webhook URL: ${webhookUrl}`);
    
    const phoneNumber = process.env.TWILIO_PHONE_NUMBER;
    if (!phoneNumber) {
      throw new Error('TWILIO_PHONE_NUMBER environment variable is required');
    }

    console.log(`📱 Configuring phone number: ${phoneNumber}`);

    const phoneNumbers = await client.incomingPhoneNumbers.list();
    const phoneNumberResource = phoneNumbers.find(pn => pn.phoneNumber === phoneNumber);

    if (!phoneNumberResource) {
      throw new Error(`Phone number ${phoneNumber} not found in your Twilio account`);
    }

    console.log(`✅ Found phone number SID: ${phoneNumberResource.sid}`);

    await client.incomingPhoneNumbers(phoneNumberResource.sid)
      .update({
        smsUrl: webhookUrl,
        smsMethod: 'POST'
      });

    console.log('✅ SMS webhook configured successfully!');
    
    if (process.env.TWILIO_WHATSAPP_NUMBER) {
      console.log('\n📱 WhatsApp sandbox configuration:');
      console.log(`WhatsApp number: ${process.env.TWILIO_WHATSAPP_NUMBER}`);
      console.log('Note: For WhatsApp, you need to configure the webhook in the Twilio Console:');
      console.log('1. Go to Messaging > Try it out > Send a WhatsApp message');
      console.log('2. Configure the webhook URL in the sandbox settings');
      console.log(`3. Use this URL: ${webhookUrl}`);
    }

    console.log('\n🎉 Twilio setup complete!');
    console.log('\nTo test:');
    console.log(`1. Send an SMS to ${phoneNumber}`);
    console.log('2. Check your application logs for webhook activity');
    
  } catch (error) {
    console.error('❌ Error setting up Twilio webhook:', error.message);
    process.exit(1);
  }
}

setupTwilioWebhook();