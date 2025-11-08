/**
 * circle-sandbox-demo.js
 * - Uses Circle Sandbox endpoints to create a developer wallet,
 *   create an address-book recipient, and make a payout.
 *
 * NOTE: Adjust payloads to match your Circle account settings and permission scopes.
 * See Circle docs for extra required fields for large payouts or KYC-restricted features.
 */

import axios from "axios";
import { v4 as uuidv4 } from "uuid";
import dotenv from "dotenv";
dotenv.config();

const BASE = "https://api-sandbox.circle.com"; // sandbox base
const API_KEY = process.env.CIRCLE_API_KEY;
if (!API_KEY) {
  console.error("Set CIRCLE_API_KEY in .env (sandbox key).\nGet one from Circle dashboard → API Keys.");
  process.exit(1);
}

const client = axios.create({
  baseURL: BASE,
  headers: {
    Authorization: `Bearer ${API_KEY}`,
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

/**
 * 1) Create Developer-Controlled Wallet (ARC-TESTNET)
 * Endpoint (docs): POST /v1/w3s/developer/wallets
 * - blockchains: array including "ARC-TESTNET"
 * - walletSetId and entitySecretCiphertext may be required depending on account config.
 *   Some sandbox accounts permit minimal payload.
 */
async function createDeveloperWallet() {
  try {
    const payload = {
      idempotencyKey: uuidv4(),
      blockchains: ["ARC-TESTNET"],
      count: 1,
      metadata: [{ name: "PayStream Demo Wallet" }],
      name: "paystream-demo-wallet",
    };

    const res = await client.post("/v1/w3s/developer/wallets", payload);
    console.log("createDeveloperWallet response:", JSON.stringify(res.data, null, 2));
    const wallet = res.data?.data?.wallets?.[0];
    return wallet;
  } catch (err) {
    console.error("createDeveloperWallet error:", err.response?.data || err.message);
    throw err;
  }
}

/**
 * 2) Create Address Book Recipient (for payouts)
 * Endpoint: POST /v1/addressBook/recipients
 * Provide chain (e.g., ETH) and on-chain address. ARC-TESTNET support varies in sandbox.
 */
async function createAddressBookRecipient(chain, addressHex) {
  try {
    const payload = {
      idempotencyKey: uuidv4(),
      chain,
      address: addressHex,
      metadata: {
        nickname: "demo-recipient",
        email: "demo@example.com",
      },
    };
    const res = await client.post("/v1/addressBook/recipients", payload);
    console.log("createAddressBookRecipient response:", JSON.stringify(res.data, null, 2));
    return res.data.data;
  } catch (err) {
    console.error("createAddressBookRecipient error:", err.response?.data || err.message);
    throw err;
  }
}

/**
 * 3) Create a Payout
 * Endpoint: POST /v1/payouts
 * - source: usually a Circle wallet id (source wallet)
 * - destination: type "address_book" with id returned from recipients
 * - amount: { amount: "1.00", currency: "USD" }  // USDC uses USD representation
 */
async function createPayout(sourceWalletId, recipientAddressBookId, amountStr = "1.00") {
  try {
    const payload = {
      idempotencyKey: uuidv4(),
      source: {
        type: "wallet",
        id: sourceWalletId,
      },
      destination: {
        type: "address_book",
        id: recipientAddressBookId,
      },
      amount: {
        amount: amountStr,
        currency: "USD",
      },
      toAmount: {
        currency: "USD",
      },
      metadata: {
        purpose: "paystream-demo",
      },
    };

    const res = await client.post("/v1/payouts", payload);
    console.log("createPayout response:", JSON.stringify(res.data, null, 2));
    return res.data.data;
  } catch (err) {
    console.error("createPayout error:", err.response?.data || err.message);
    throw err;
  }
}

/** Orchestrator */
async function run() {
  try {
    // 1: create developer wallet (developer-controlled)
    const wallet = await createDeveloperWallet();
    console.log("Wallet created:", wallet?.id, wallet?.address);

    // 2: add recipient (use a normal EOA address you own for test)
    // Docs commonly use chain "ETH"; ARC-TESTNET availability for address book may differ.
    const recipient = await createAddressBookRecipient("ETH", "0x000000000000000000000000000000000000dEaD");
    console.log("Recipient created:", recipient?.id);

    // 3: create a payout (sourceWalletId must be a valid wallet id in your Circle account)
    const sourceWalletId = wallet?.id || "YOUR_EXISTING_SOURCE_WALLET_ID";
    const payout = await createPayout(sourceWalletId, recipient?.id, "0.01"); // 0.01 USD
    console.log("Payout created:", payout?.id);
  } catch (e) {
    console.error("Demo run failed:", e.message || e);
  }
}

run();