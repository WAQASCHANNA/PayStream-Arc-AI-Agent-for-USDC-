import 'dotenv/config';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

const API_KEY = process.env.CIRCLE_API_KEY;
if (!API_KEY) {
  console.error('Please set CIRCLE_API_KEY in your .env');
  process.exit(1);
}

const baseURL = process.env.CIRCLE_BASE_URL || 'https://api-sandbox.circle.com';
const blockchains = (process.env.W3S_BLOCKCHAINS || 'ETH-SEPOLIA')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
const client = axios.create({
  baseURL,
  headers: {
    Authorization: `Bearer ${API_KEY}`,
    'Content-Type': 'application/json',
  },
});

async function createWallet() {
  try {
    const payload = {
      idempotencyKey: uuidv4(),
      blockchains,
      count: 1,
      name: 'paystream-demo-wallet',
      metadata: [{ name: 'project', value: 'paystream-hackathon' }],
    };
    const response = await client.post('/v1/w3s/developer/wallets', payload);
    console.log('Wallet created:', JSON.stringify(response.data, null, 2));
    const wallet = response?.data?.data?.wallets?.[0] || response?.data?.data?.wallet?.[0];
    if (wallet) {
      console.log('Wallet ID:', wallet.id);
      console.log('Wallet Address:', wallet.address);
    }
    return wallet;
  } catch (err) {
    const data = err?.response?.data;
    console.error('Error creating wallet:', data || err.message);
    process.exit(1);
  }
}

createWallet();