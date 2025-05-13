#!/bin/bash

# Exit on error
set -e

# Define ports to avoid conflicts
RPC_PORT=8900
FAUCET_PORT=9901
GOSSIP_PORT=8002
TPU_PORT=8903

# Kill any existing solana-test-validator processes
echo "Stopping any existing solana-test-validator..."
pkill -f solana-test-validator || true

# Create a test wallet if it doesn't exist
TEST_WALLET=~/.config/solana/test-wallet.json
if [ ! -f "$TEST_WALLET" ]; then
    echo "Creating test wallet..."
    solana-keygen new --no-bip39-passphrase --outfile $TEST_WALLET --force
fi

# Set the test wallet as default
export SOLANA_CONFIG=~/.config/solana/cli/config-test.yml
export ANCHOR_PROVIDER_URL=http://127.0.0.1:$RPC_PORT
solana config set --keypair $TEST_WALLET --url $ANCHOR_PROVIDER_URL

# Start a local validator in the background with specific ports
echo "Starting solana-test-validator on port $RPC_PORT..."
solana-test-validator \
    --reset \
    --quiet \
    --rpc-port $RPC_PORT \
    --faucet-port $FAUCET_PORT \
    --gossip-port $GOSSIP_PORT \
    --ledger test-ledger &


# Wait for the validator to start
echo "Waiting for validator to start..."
sleep 10

# Airdrop SOL to the test wallet
echo "Airdropping SOL to test wallet..."
for i in {1..3}; do
    solana airdrop 10 && break || sleep 5
done

# Check balance
echo "Test wallet balance:"
solana balance

# Build the program
echo "Building program..."
anchor build

# Deploy the program
echo "Deploying program..."
anchor deploy --provider.cluster localnet --provider.wallet $TEST_WALLET

# Run the tests
echo "Running tests..."
ANCHOR_WALLET=$TEST_WALLET \
ANCHOR_PROGRAM_ID=4UUkEZrwe8PoseD6Ph7WuUHJJ1ob5P4WevNcpFZt2LTC \
    yarn test

# Clean up
echo "Tests completed. Cleaning up..."
pkill -f solana-test-validator
rm -rf test-ledger

# Reset the config to the original
echo "Restoring original Solana config..."
solana config set --keypair ~/.config/solana/id.json --url https://api.devnet.solana.com

echo "Test script completed."
