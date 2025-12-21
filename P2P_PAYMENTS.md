# Peer-to-Peer Payment Architecture

## Overview

Trainr implements a **zero-fee peer-to-peer payment system** that allows trainers and clients to transact directly without any platform cuts. Trainers receive 100% of payments (minus only Stripe's standard processing fees).

## Architecture

### Stripe Connect
- **Express Accounts**: Trainers create Stripe Express accounts for direct payment receipt
- **Direct Transfers**: Payments go directly from clients to trainers' Stripe accounts
- **Zero Platform Fee**: Application fee is set to 0% on all transactions
- **Onboarding**: Trainers complete Stripe onboarding to enable payments

### Payment Types

1. **One-Time Payments**
   - Single session payments
   - Program purchases
   - Direct transfer to trainer's account

2. **Subscriptions**
   - Recurring payments (weekly/monthly/yearly)
   - Automatic billing cycles
   - Client can cancel anytime
   - Funds go directly to trainer

3. **Escrow Payments** (Blockchain - Future)
   - Secure payment holding via Aptos smart contracts
   - Funds released on workout/program completion
   - Trustless payment verification

## Database Schema

### Payments Table
- Records all transactions
- Links trainers and clients
- Tracks payment status and Stripe IDs
- Stores blockchain escrow hashes (for future escrow payments)

### Subscriptions Table
- Manages recurring payments
- Tracks billing cycles
- Stores Stripe subscription IDs

### Trainer Stripe Accounts Table
- Stores trainer's Stripe Connect account IDs
- Tracks onboarding status
- Manages payment capabilities

## API Endpoints

### Trainer Endpoints
- `POST /api/payments/trainer/connect/setup` - Set up Stripe Connect account
- `GET /api/payments/trainer/connect/status` - Check payment account status
- `GET /api/payments/trainer/history` - View payment history

### Client Endpoints
- `POST /api/payments/create-payment-intent` - Create one-time payment
- `POST /api/payments/create-subscription` - Create recurring subscription
- `GET /api/payments/client/history` - View payment history
- `GET /api/payments/client/subscriptions` - View active subscriptions
- `POST /api/payments/subscriptions/:id/cancel` - Cancel subscription

## Frontend Components

### Payments Page
- **Trainers**: Connect Stripe account, view payment history, check account status
- **Clients**: View subscriptions, payment history, manage recurring payments

## Benefits

1. **Zero Platform Fees**: Trainers keep 100% of payments
2. **Direct Relationships**: No intermediary between trainer and client
3. **Transparent**: All transactions visible to both parties
4. **Secure**: Stripe handles all payment processing and security
5. **Flexible**: Support for one-time and recurring payments
6. **Future-Ready**: Blockchain escrow ready for implementation

## Setup

1. Trainers must connect their Stripe account via onboarding
2. Clients add payment methods when subscribing or making payments
3. All payments processed through Stripe Connect with 0% application fee
4. Trainers receive funds directly to their connected Stripe account

## Future Enhancements

- Blockchain escrow for milestone-based payments
- Cryptocurrency payment options
- Payment splitting for group training
- Automated refund handling
- Payment analytics and reporting

