import Stripe from "stripe"

// Validate required environment variables
if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY environment variable is required")
}

if (!process.env.STRIPE_WEBHOOK_SECRET) {
  throw new Error("STRIPE_WEBHOOK_SECRET environment variable is required")
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-08-27.basil",
  typescript: true,
})

export const formatAmountForDisplay = (
  amount: number,
  currency: string
): string => {
  const numberFormat = new Intl.NumberFormat(["en-US"], {
    style: "currency",
    currency: currency,
    currencyDisplay: "symbol",
  })
  return numberFormat.format(amount)
}

export const formatAmountForStripe = (
  amount: number,
  currency: string
): number => {
  const numberFormat = new Intl.NumberFormat(["en-US"], {
    style: "currency",
    currency: currency,
    currencyDisplay: "symbol",
  })
  const parts = numberFormat.formatToParts(amount)
  let zeroDecimalCurrency: boolean = true
  for (const part of parts) {
    if (part.type === "decimal") {
      zeroDecimalCurrency = false
    }
  }
  return zeroDecimalCurrency ? amount : Math.round(amount * 100)
}