# Conversations API Webhook Setup

The Conversations API webhook needs to be configured manually in the Twilio Console to receive replies.

## Manual Configuration Steps

### 1. Access Twilio Console
1. Go to [console.twilio.com](https://console.twilio.com)
2. Navigate to **Conversations** in the left sidebar

### 2. Configure Service Webhook
1. Click on **Services**
2. Click on your service: `IS673fefa9940e4272a058c9e71e968437`
3. Go to **Webhooks** tab

### 3. Set Webhook Configuration
Configure the following settings:

**Pre-Event URL**: `https://relas.relationshipgpt.ai/api/twilio/conversations-webhook`
**Post-Event URL**: `https://relas.relationshipgpt.ai/api/twilio/conversations-webhook`
**Method**: `POST`

**Events to Enable**:
- ✅ `onMessageAdded` - When a message is added to conversation
- ✅ `onParticipantAdded` - When a participant joins
- ✅ `onConversationUpdated` - When conversation is updated

### 4. Save Configuration
Click **Save** to apply the webhook settings.

### 5. Test the Setup
1. Use the dashboard "Start Conversation" button
2. Reply to the message you receive
3. Check application logs for webhook processing

## Expected Webhook Flow

When you reply to a Conversations API message:

1. **Message Received**: Twilio receives your reply
2. **Webhook Triggered**: Calls `/api/twilio/conversations-webhook`
3. **User Lookup**: Finds user by conversation ID
4. **AI Processing**: Generates relationship advice response
5. **Reply Sent**: Sends AI response back via Conversations API

## Debugging

If replies still don't work after configuration:

### Check Webhook Logs
```bash
# View application logs
docker-compose logs -f app | grep -E "(CONVERSATIONS|webhook)"
```

### Test Webhook Endpoint
```bash
# Test if webhook endpoint is accessible
curl -X POST https://relas.relationshipgpt.ai/api/twilio/conversations-webhook \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "EventType=onMessageAdded&ConversationSid=test&Body=test"
```

### Verify Service Configuration
In Twilio Console:
1. Go to Conversations > Services
2. Click on your service
3. Check that webhook URL is set correctly
4. Verify events are enabled

## Alternative: Use Conversation SID Directly

If the service webhook doesn't work, you can also configure webhooks on individual conversations:

1. Get conversation SID from logs
2. Go to Conversations > Manage Conversations
3. Click on specific conversation
4. Set webhook URL in conversation settings

This is what the webhook should process when working correctly.