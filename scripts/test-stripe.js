#!/usr/bin/env node

// Quick Stripe connection test
const Stripe = require('stripe');

// Load environment variables
require('dotenv').config();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

async function testStripe() {
  console.log('🧪 Testing Stripe connection...');
  
  try {
    // Test 1: Check if we can connect to Stripe
    console.log('1. Testing Stripe API connection...');
    const account = await stripe.accounts.retrieve();
    console.log('✅ Connected to Stripe account:', account.id);
    
    // Test 2: Check if the price exists
    console.log('2. Testing price ID...');
    const priceId = process.env.NEXT_PUBLIC_SUBSCRIPTION_PRICE_ID;
    console.log('Price ID:', priceId);
    
    if (priceId) {
      const price = await stripe.prices.retrieve(priceId);
      console.log('✅ Price found:', {
        id: price.id,
        amount: price.unit_amount / 100,
        currency: price.currency,
        interval: price.recurring?.interval
      });
    } else {
      console.log('❌ No price ID found in environment');
    }
    
    // Test 3: Try creating a test customer
    console.log('3. Testing customer creation...');
    const testCustomer = await stripe.customers.create({
      email: 'test@example.com',
      name: 'Test User'
    });
    console.log('✅ Test customer created:', testCustomer.id);
    
    // Clean up test customer
    await stripe.customers.del(testCustomer.id);
    console.log('✅ Test customer deleted');
    
    console.log('\n🎉 All Stripe tests passed!');
    
  } catch (error) {
    console.error('❌ Stripe test failed:', error.message);
    console.error('Error details:', error);
  }
}

testStripe();