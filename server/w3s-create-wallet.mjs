import 'dotenv/config';
import crypto from 'node:crypto';

// Try to use SDK if available; otherwise fall back to REST.
let developerSdk = null;
let sdkFactory = null;
let generateCiphertextFn = null;
try {
  const { initiateDeveloperControlledWalletsClient, generateEntitySecretCiphertext } = await import('@circle-fin/developer-controlled-wallets');
  sdkFactory = initiateDeveloperControlledWalletsClient;
  generateCiphertextFn = generateEntitySecretCiphertext;
  const apiKey = process.env.CIRCLE_API_KEY;
  const entitySecret = process.env.ENTITY_SECRET;
  if (apiKey && entitySecret) {
    developerSdk = initiateDeveloperControlledWalletsClient({ apiKey, entitySecret });
  }
} catch (_) {
  // SDK not installed or import failed; we'll use REST below.
}

const API_BASE = process.env.CIRCLE_BASE_URL || 'https://api.circle.com';
const API_KEY = process.env.CIRCLE_API_KEY;
if (!API_KEY) {
  console.error('Missing CIRCLE_API_KEY in env');
  process.exit(1);
}

async function fetchJson(path, init) {
  const url = `${API_BASE}${path}`;
  const resp = await fetch(url, {
    ...init,
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      authorization: `Bearer ${API_KEY}`,
      ...(init?.headers || {}),
    },
  });
  const text = await resp.text();
  try {
    const json = JSON.parse(text);
    return { ok: resp.ok, status: resp.status, json };
  } catch {
    return { ok: resp.ok, status: resp.status, json: { raw: text } };
  }
}

async function ensureEntitySecretCiphertext() {
  if (developerSdk && generateCiphertextFn) {
    try {
      const ciphertext = await generateCiphertextFn({ apiKey: API_KEY, entitySecret: process.env.ENTITY_SECRET });
      return ciphertext;
    } catch (e) {
      console.warn('SDK failed to generate entity secret ciphertext:', e?.message || e);
    }
  }
  const ciphertext = process.env.ENTITY_SECRET_CIPHERTEXT;
  if (!ciphertext) {
    // Try generating a temporary secret if SDK is available
    if (sdkFactory && generateCiphertextFn) {
      const tmpSecret = `0x${crypto.randomBytes(32).toString('hex')}`;
      console.warn('ENTITY_SECRET not set; generated a temporary secret. Save this for future use:', tmpSecret);
      developerSdk = sdkFactory({ apiKey: API_KEY, entitySecret: tmpSecret });
      const generated = await generateCiphertextFn({ apiKey: API_KEY, entitySecret: tmpSecret });
      return generated;
    }
    throw new Error('Missing ENTITY_SECRET or ENTITY_SECRET_CIPHERTEXT in env');
  }
  return ciphertext;
}

async function ensureWalletSetId(entitySecretCiphertext) {
  const existing = process.env.WALLET_SET_ID;
  if (existing) return existing;

  const idempotencyKey = crypto.randomUUID();
  const name = process.env.WALLET_SET_NAME || 'PayStream Wallet Set';
  const res = await fetchJson('/v1/w3s/developer/walletSets', {
    method: 'POST',
    body: JSON.stringify({ idempotencyKey, name, entitySecretCiphertext }),
  });
  if (!res.ok) {
    const msg = res.json?.error || res.json?.message || JSON.stringify(res.json);
    throw new Error(`Create wallet set failed (${res.status}): ${msg}`);
  }
  const walletSetId = res.json?.data?.walletSet?.id || res.json?.data?.id || res.json?.data?.walletSetId;
  if (!walletSetId) throw new Error(`Unexpected response for walletSet: ${JSON.stringify(res.json)}`);
  return walletSetId;
}

async function createWallets(walletSetId, entitySecretCiphertext) {
  const accountType = process.env.ACCOUNT_TYPE || 'SCA'; // 'EOA' or 'SCA'
  const blockchains = (process.env.W3S_BLOCKCHAINS || 'ETH-SEPOLIA')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const count = Number(process.env.WALLET_COUNT || 1);
  const metadata = Array.from({ length: count }, (_, i) => ({ name: `Wallet ${i + 1}` }));

  if (developerSdk) {
    return developerSdk.createWallets({ walletSetId, accountType, blockchains, count, metadata });
  }

  // REST fallback
  const idempotencyKey = crypto.randomUUID();
  const res = await fetchJson('/v1/w3s/developer/wallets', {
    method: 'POST',
    body: JSON.stringify({ idempotencyKey, walletSetId, accountType, blockchains, count, metadata, entitySecretCiphertext }),
  });
  if (!res.ok) {
    const msg = res.json?.error || res.json?.message || JSON.stringify(res.json);
    throw new Error(`Create wallets failed (${res.status}): ${msg}`);
  }
  return res.json;
}

async function main() {
  try {
    const entitySecretCiphertext = await ensureEntitySecretCiphertext();
    const walletSetId = await ensureWalletSetId(entitySecretCiphertext);
    console.log('Wallet Set ID:', walletSetId);
    const resp = await createWallets(walletSetId, entitySecretCiphertext);
    console.log('Create Wallets response:', JSON.stringify(resp, null, 2));
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/Resource not found|404/.test(msg)) {
      console.error('W3S endpoints appear disabled for this API key. Enable Developer Controlled Wallets in Circle Console.');
    }
    console.error('Error:', msg);
    process.exit(1);
  }
}

main();