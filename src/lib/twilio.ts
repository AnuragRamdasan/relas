import twilio from "twilio"

export const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID!,
  process.env.TWILIO_AUTH_TOKEN!
)

export interface MessageOptions {
  to: string
  message: string
  platform?: "sms" | "whatsapp"
}

export async function sendMessage({ to, message, platform = "sms" }: MessageOptions) {
  try {
    const fromNumber = platform === "whatsapp" 
      ? process.env.TWILIO_WHATSAPP_NUMBER!
      : process.env.TWILIO_PHONE_NUMBER!

    const formattedTo = platform === "whatsapp" 
      ? `whatsapp:${to}`
      : to

    console.log(`📤 Sending ${platform} message to ${formattedTo} from ${fromNumber}`)

    const twilioMessage = await twilioClient.messages.create({
      body: message,
      from: fromNumber,
      to: formattedTo,
    })

    console.log(`✅ Message sent successfully: ${twilioMessage.sid}`)

    return {
      success: true,
      messageId: twilioMessage.sid,
      status: twilioMessage.status,
    }
  } catch (error) {
    console.error("❌ Twilio send message error:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

export function formatPhoneNumber(phone: string): string {
  const digits = phone.replace(/\D/g, "")
  
  if (digits.length === 10) {
    return `+1${digits}`
  } else if (digits.length === 11 && digits.startsWith("1")) {
    return `+${digits}`
  } else if (digits.length > 11) {
    return `+${digits}`
  }
  
  return phone.startsWith("+") ? phone : `+${phone}`
}

export async function setupTwilioWebhook() {
  try {
    const webhookUrl = process.env.NODE_ENV === 'production' 
      ? 'https://test.anuragramdasan.com/api/twilio/webhook'
      : `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/twilio/webhook`

    console.log(`🔧 Setting up Twilio webhook URL: ${webhookUrl}`)

    const phoneNumber = process.env.TWILIO_PHONE_NUMBER!
    const phoneNumberSid = await getPhoneNumberSid(phoneNumber)

    if (!phoneNumberSid) {
      throw new Error(`Could not find SID for phone number ${phoneNumber}`)
    }

    await twilioClient.incomingPhoneNumbers(phoneNumberSid)
      .update({
        smsUrl: webhookUrl,
        smsMethod: 'POST'
      })

    console.log(`✅ Webhook configured for ${phoneNumber}`)
    return { success: true, webhookUrl }

  } catch (error) {
    console.error("❌ Error setting up webhook:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    }
  }
}

async function getPhoneNumberSid(phoneNumber: string): Promise<string | null> {
  try {
    const phoneNumbers = await twilioClient.incomingPhoneNumbers.list()
    const found = phoneNumbers.find(pn => pn.phoneNumber === phoneNumber)
    return found?.sid || null
  } catch (error) {
    console.error("Error finding phone number SID:", error)
    return null
  }
}