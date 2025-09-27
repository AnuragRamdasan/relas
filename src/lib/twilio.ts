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

    const twilioMessage = await twilioClient.messages.create({
      body: message,
      from: fromNumber,
      to: formattedTo,
    })

    return {
      success: true,
      messageId: twilioMessage.sid,
      status: twilioMessage.status,
    }
  } catch (error) {
    console.error("Twilio send message error:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

export function formatPhoneNumber(phone: string): string {
  // Remove all non-digits
  const digits = phone.replace(/\D/g, "")
  
  // Add country code if not present
  if (digits.length === 10) {
    return `+1${digits}`
  } else if (digits.length === 11 && digits.startsWith("1")) {
    return `+${digits}`
  }
  
  return phone // Return original if we can't format it
}