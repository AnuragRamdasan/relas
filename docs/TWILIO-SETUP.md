# Twilio Two-Way Messaging Setup

This guide explains how to configure Twilio for two-way conversational messaging with the Relationship Assistant application.

## Overview

The application supports both SMS and WhatsApp messaging through Twilio. For two-way conversations to work, incoming messages must be configured to send to our webhook endpoint.

## Prerequisites

1. **Twilio Account**: Sign up at [twilio.com](https://twilio.com)
2. **Phone Number**: Purchase a Twilio phone number for SMS
3. **WhatsApp Access**: Enable WhatsApp sandbox or get WhatsApp Business API approval
4. **Environment Variables**: Configure Twilio credentials in your `.env` file

## Required Environment Variables

```bash
# Twilio Configuration
TWILIO_ACCOUNT_SID="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
TWILIO_AUTH_TOKEN="your-auth-token-here"
TWILIO_PHONE_NUMBER="+1234567890"
TWILIO_WHATSAPP_NUMBER="whatsapp:+14155238886"  # Sandbox number or approved number
```

## Automatic Configuration

### Using the Configuration Script

The easiest way to configure Twilio is using our automated script:

```bash
# For development (localhost webhook)
npm run configure-twilio

# For production (domain webhook)
NODE_ENV=production npm run configure-twilio
```

This script will:
- ✅ Configure SMS webhook URL for all your Twilio phone numbers
- 📱 Display instructions for WhatsApp sandbox configuration
- 🔍 Validate your environment variables
- 📊 Show configuration status

### Deployment Integration

The configuration script is automatically run during deployment:

```bash
./deployment/scripts/deploy.sh
```

The deploy script includes Twilio configuration and will show any configuration errors.

## Manual Configuration

### SMS Configuration

1. **Login to Twilio Console**: Go to [console.twilio.com](https://console.twilio.com)
2. **Navigate to Phone Numbers**: Go to Phone Numbers → Manage → Active numbers
3. **Select Your Number**: Click on your Twilio phone number
4. **Configure Webhook**:
   - Set **Webhook URL** to: `https://your-domain.com/api/twilio/webhook`
   - Set **HTTP Method** to: `POST`
   - Leave **Voice** configuration empty (we only handle messaging)
5. **Save Configuration**

### WhatsApp Configuration

#### For WhatsApp Sandbox (Development)

1. **Navigate to WhatsApp**: Console → Messaging → Try it out → Send a WhatsApp message
2. **Configure Sandbox Webhook**:
   - Set **Webhook URL** to: `https://your-domain.com/api/twilio/webhook`
   - Set **HTTP Method** to: `POST`
3. **Save Configuration**
4. **Test Connection**: Send `join [your-sandbox-keyword]` to the sandbox number

#### For WhatsApp Business API (Production)

1. **Get WhatsApp Approval**: Apply for WhatsApp Business API access
2. **Configure Webhook**: Same as sandbox but with your approved WhatsApp number
3. **Update Environment**: Set `TWILIO_WHATSAPP_NUMBER` to your approved number

## Webhook Endpoint

The application webhook endpoint handles both SMS and WhatsApp messages:

- **URL**: `https://your-domain.com/api/twilio/webhook`
- **Method**: `POST`
- **Content-Type**: `application/x-www-form-urlencoded`

### Webhook Processing

When a message is received:

1. **Parse Message**: Extract phone number, message content, and platform (SMS/WhatsApp)
2. **Find User**: Look up user by phone number and subscription status
3. **Generate Response**: Use OpenAI to create personalized relationship advice
4. **Save to Database**: Store both user message and AI response
5. **Send Reply**: Send AI response back via Twilio

## Testing the Setup

### 1. Send Test Message

Send an SMS or WhatsApp message to your configured number:

```
Hi, I need relationship advice about communication with my partner.
```

### 2. Check Logs

Monitor the application logs for webhook activity:

```bash
# View all logs
docker-compose logs -f app

# Filter for Twilio webhook logs
docker-compose logs -f app | grep "TWILIO WEBHOOK"
```

### 3. Expected Log Flow

You should see logs like:
```
🔔 TWILIO WEBHOOK CALLED
📱 Twilio webhook data: { body: "Hi, I need...", from: "+1234567890" }
🔍 Looking for user with phone: +1234567890
✅ Found user: { id: "user123", isSubscribed: true }
🤖 Generating AI response for user user123...
🎯 AI response generated: { responseLength: 245, sentiment: "concerned" }
```

## Troubleshooting

### Common Issues

#### 1. "No subscribed user found"
- **Cause**: User's phone number doesn't match database or isn't subscribed
- **Fix**: Ensure phone number format matches (with +1 country code)
- **Check**: Look up user in database with exact phone format

#### 2. Webhook not receiving messages
- **Cause**: Webhook URL not configured or incorrect
- **Fix**: Run configuration script or manually set webhook URL
- **Verify**: Check Twilio Console → Phone Numbers → Webhook settings

#### 3. Generic responses instead of AI
- **Cause**: Webhook endpoint might be wrong or rate limiting
- **Fix**: Verify webhook URL points to `/api/twilio/webhook`
- **Debug**: Check application logs for webhook processing

#### 4. WhatsApp messages not working
- **Cause**: Sandbox not joined or webhook not configured
- **Fix**: Send `join [keyword]` to sandbox number
- **Verify**: Check WhatsApp sandbox configuration in Twilio Console

### Debug Commands

```bash
# Test webhook configuration
curl -X POST https://your-domain.com/api/twilio/webhook \
  -d "Body=test message" \
  -d "From=%2B1234567890"

# Check Twilio configuration
npm run configure-twilio

# View recent webhook logs
docker-compose logs -f app | grep -E "(TWILIO|webhook)"

# Test from inside container
docker-compose exec app npm run configure-twilio
```

## Security Notes

- ✅ Webhook endpoint validates requests are from Twilio
- ✅ Phone numbers are normalized and sanitized
- ✅ User subscription status is verified before processing
- ✅ All messages and responses are logged for debugging
- ✅ Rate limiting prevents spam (configured in Next.js)

## Production Checklist

- [ ] Environment variables configured correctly
- [ ] SMS webhook URL set to production domain
- [ ] WhatsApp webhook URL set to production domain  
- [ ] Test messaging from real phone numbers
- [ ] Monitor logs for webhook processing
- [ ] Verify AI responses are generated correctly
- [ ] Check message delivery and response timing

## Support

If you encounter issues:

1. **Check Logs**: Always start with application logs
2. **Verify Config**: Run the configuration script to check setup
3. **Test Webhook**: Use curl to test the webhook endpoint directly
4. **Twilio Console**: Check Twilio Console for delivery status and errors

For detailed webhook debugging, see the enhanced logging in `/src/app/api/twilio/webhook/route.ts`.