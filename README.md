# Relationship Assistant

A comprehensive relationship assistant platform that provides AI-powered guidance through SMS and WhatsApp conversations. Users can get personalized relationship advice that remembers their history and provides tailored feedback.

## Features

- **Google OAuth Authentication**: Secure login with Google accounts
- **User Onboarding**: Collect user preferences and demographics for personalization
- **Stripe Subscription**: $19/month premium subscription model
- **SMS/WhatsApp Integration**: Twilio-powered messaging for real-time conversations
- **AI Memory System**: OpenAI-powered assistant with long-term memory and context
- **Sentiment Tracking**: Monitor emotional patterns and relationship progress
- **Conversation History**: Track all interactions and insights
- **Dashboard**: Web interface to view conversation history and emotional insights

## Tech Stack

- **Frontend**: Next.js 15 with TypeScript and Tailwind CSS
- **Backend**: Next.js API routes
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js with Google OAuth
- **Payments**: Stripe for subscription management
- **Messaging**: Twilio for SMS and WhatsApp
- **AI**: OpenAI GPT-4o-mini for conversation and analysis

## Setup Instructions

### 1. Environment Variables

Copy `.env.example` to `.env.local` and fill in your credentials:

```bash
cp .env.example .env.local
```

Required environment variables:

- **Database**: PostgreSQL connection string
- **NextAuth**: Secret key and Google OAuth credentials
- **Stripe**: API keys and webhook secret
- **Twilio**: Account SID, auth token, and phone numbers
- **OpenAI**: API key

### 2. Database Setup

```bash
# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate dev
```

### 3. Development Server

```bash
npm run dev
```

### 4. Webhook Configuration

#### Stripe Webhooks
Set up a webhook endpoint in your Stripe dashboard:
- URL: `https://yourdomain.com/api/stripe/webhook`
- Events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_succeeded`

#### Twilio Webhooks
Configure your Twilio phone number webhook:
- URL: `https://yourdomain.com/api/twilio/webhook`
- HTTP Method: POST

## Key Features Explained

### AI Personality System

The AI assistant is designed to:
- Remember previous conversations and patterns
- Provide balanced feedback (validation + constructive criticism)
- Adapt communication style to user preferences
- Track emotional patterns and relationship progress
- Reference past interactions for personalized advice

### Memory & Context Management

- **User Context**: Stores relationship history, communication patterns, triggers
- **Conversation Memory**: Maintains conversation history with sentiment analysis
- **Sentiment Tracking**: Monitors emotional patterns over time
- **Topic Analysis**: Categorizes conversations by relationship themes

### Subscription Flow

1. User signs up with Google OAuth
2. Completes onboarding (demographics, phone number)
3. Subscribes to $19/month plan via Stripe
4. Receives welcome SMS/WhatsApp message
5. Can start conversing with AI assistant

## Development Notes

- The AI is designed to genuinely help improve relationship quality, not just provide validation
- Sentiment analysis helps track emotional patterns and progress
- Long-term memory allows for continuity across conversations
- User privacy is maintained while enabling personalization