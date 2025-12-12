# Blockchain Integration

This directory contains the Aptos blockchain integration for the Personal Trainer App.

## Features

- **Review Verification**: Store and verify trainer reviews on-chain
- **Reputation System**: Calculate and track trainer reputation scores
- **Progress Milestones**: Record major client achievements on blockchain
- **Workout Verification**: Verify workout completion records

## Setup

1. Install dependencies:
```bash
npm install @aptos-labs/ts-sdk
```

2. Configure Aptos network in `.env`:
```
APTOS_NODE_URL=https://fullnode.testnet.aptoslabs.com
APTOS_FAUCET_URL=https://faucet.testnet.aptoslabs.com
```

## Smart Contracts

Smart contracts will be developed in Move language and deployed to Aptos testnet/mainnet.

## Current Status

The blockchain integration is currently in mock/development mode. Full smart contract implementation will be added in future iterations.

