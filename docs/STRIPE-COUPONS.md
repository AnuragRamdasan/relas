# Stripe Coupon Codes Setup

This guide explains how to create and manage coupon codes for your Relationship Assistant subscription service.

## Overview

The coupon system allows you to offer discounts to customers:
- **Development Only**: Coupon UI only appears in development mode
- **Percentage Discounts**: e.g., 20% off, 50% off
- **Fixed Amount Discounts**: e.g., $5 off, $10 off
- **Automatic Validation**: Real-time coupon validation
- **Stripe Integration**: Seamless checkout with applied discounts

## Creating Coupons in Stripe Dashboard

### Step 1: Access Stripe Dashboard

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/)
2. Navigate to **Products** → **Coupons**
3. Click **Create coupon**

### Step 2: Configure Coupon Details

**Basic Information:**
- **ID**: Enter a coupon code (e.g., `WELCOME20`, `SAVE50`)
- **Name**: Display name for internal use
- **Discount Type**: Choose percentage or fixed amount

**Percentage Discount Example:**
```
ID: WELCOME20
Name: Welcome 20% Off
Discount: 20% off
Duration: Once
```

**Fixed Amount Discount Example:**
```
ID: SAVE5
Name: $5 Off Subscription
Discount: $5.00 off
Currency: USD
Duration: Once
```

### Step 3: Set Usage Limits (Optional)

- **Max redemptions**: Total number of times coupon can be used
- **Max per customer**: How many times one customer can use it
- **Expiration date**: When the coupon expires

### Step 4: Save and Test

1. Click **Create coupon**
2. Note the coupon ID for testing
3. Test in development mode

## Coupon Duration Options

### Once
- Applied only to the first invoice
- Best for new customer incentives

### Forever
- Applied to every invoice until cancelled
- Use carefully as it affects recurring revenue

### Repeating
- Applied for a specific number of billing cycles
- Good for limited-time promotions

## Testing Coupon Codes

### In Development Mode

1. Start your development server: `npm run dev`
2. Navigate to `/subscription`
3. You'll see the "Coupon Code (Dev Only)" field
4. Enter your coupon code and click "Apply"
5. Verify the discount appears
6. Proceed with test checkout

### Using Stripe Test Data

For testing, you can use these test coupon codes:

```bash
# Create test coupons via Stripe CLI
stripe coupons create --percent-off=20 --duration=once --id=TEST20
stripe coupons create --amount-off=500 --currency=usd --duration=once --id=TEST5OFF
```

## Common Coupon Patterns

### Welcome Discounts
```
ID: WELCOME25
Name: Welcome 25% Off
Discount: 25% off
Duration: Once
Max redemptions: 1000
```

### Limited Time Offers
```
ID: BLACKFRIDAY50
Name: Black Friday 50% Off
Discount: 50% off
Duration: Once
Expires: 2024-12-01
```

### Referral Discounts
```
ID: REFER10
Name: Referral $10 Off
Discount: $10.00 off
Duration: Once
Max per customer: 1
```

### Loyalty Discounts
```
ID: LOYAL15
Name: Loyal Customer 15% Off
Discount: 15% off
Duration: Repeating (3 months)
```

## API Endpoints

### Validate Coupon
**POST** `/api/stripe/validate-coupon`

```json
{
  "couponCode": "WELCOME20"
}
```

**Response:**
```json
{
  "valid": true,
  "discount": 20,
  "discountType": "percent",
  "name": "Welcome 20% Off"
}
```

### Create Checkout with Coupon
**POST** `/api/stripe/create-checkout-session`

```json
{
  "priceId": "price_1234567890",
  "couponCode": "WELCOME20"
}
```

## Error Handling

### Common Error Messages

- **"Invalid coupon code"**: Coupon doesn't exist
- **"Coupon is not valid or has expired"**: Coupon exists but inactive/expired
- **"Failed to validate coupon"**: Network or server error

### User Experience

- Real-time validation when user clicks "Apply"
- Clear error messages for invalid codes
- Success message showing discount amount
- Discount applied automatically at checkout

## Security Considerations

### Development vs Production

- Coupon UI only shows in development (`NODE_ENV === 'development'`)
- For production, consider:
  - Admin-only coupon distribution
  - Targeted email campaigns
  - Partner-specific landing pages

### Rate Limiting

- Consider rate limiting coupon validation API
- Monitor for coupon abuse patterns
- Set reasonable usage limits on high-value coupons

## Monitoring and Analytics

### Stripe Dashboard Metrics

- Track coupon usage in Stripe Dashboard
- Monitor revenue impact of discounts
- Analyze customer acquisition via coupons

### Key Metrics to Track

- Coupon redemption rate
- Customer lifetime value with/without coupons
- Conversion rate improvement from discounts
- Revenue impact per coupon campaign

## Troubleshooting

### Coupon Not Working

1. **Check coupon exists**: Verify in Stripe Dashboard
2. **Check validity**: Ensure not expired or usage limit reached
3. **Case sensitivity**: Coupon codes are case-sensitive
4. **Environment**: Ensure using correct Stripe keys (test vs live)

### Common Issues

**Issue**: "Invalid coupon code" for existing coupon
**Solution**: Check if using test coupon with live keys or vice versa

**Issue**: Discount not applying at checkout
**Solution**: Verify coupon configuration allows subscription discounts

**Issue**: Coupon UI not showing
**Solution**: Ensure `NODE_ENV=development` for local testing

## Best Practices

### Coupon Code Naming

- Use memorable, branded codes: `WELCOME20`, `SUMMER50`
- Include discount amount in code: `SAVE10`, `GET25OFF`
- Use expiration dates: `BLACKFRIDAY2024`

### Marketing Strategy

- **First-time customers**: 10-25% off to reduce signup friction
- **Seasonal promotions**: 30-50% off during holidays
- **Retention**: Small recurring discounts for loyal customers
- **Referrals**: Fixed amount discounts for both referrer and referee

### Technical Implementation

- Always validate coupons server-side
- Cache coupon validation for performance
- Log coupon usage for analytics
- Handle expired/invalid coupons gracefully

## Support and Resources

- **Stripe Coupons Documentation**: https://stripe.com/docs/billing/subscriptions/coupons
- **Stripe Dashboard**: https://dashboard.stripe.com/coupons
- **Test Credit Cards**: https://stripe.com/docs/testing#cards

## Example Coupon Campaigns

### Launch Campaign
```
Coupon: LAUNCH50
Discount: 50% off first month
Duration: Once
Expires: 30 days after launch
Max redemptions: 500
```

### Referral Program
```
Coupon: FRIEND10
Discount: $10 off
Duration: Once
Max per customer: 1
Never expires
```

### Win-back Campaign
```
Coupon: COMEBACK25
Discount: 25% off
Duration: Repeating (2 months)
Targeted to churned customers
```

This coupon system provides flexible discount options while maintaining security and proper validation!