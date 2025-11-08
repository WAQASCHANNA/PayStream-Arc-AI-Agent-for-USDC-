import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { createPublicClient, http } from 'viem';

const ERC20_ABI = [
  { type: 'function', name: 'symbol', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'string' }] },
  { type: 'function', name: 'decimals', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint8' }] },
];

function getArg(flag) {
  const i = process.argv.indexOf(flag);
  if (i !== -1 && i + 1 < process.argv.length) return process.argv[i + 1];
  return undefined;
}

async function main() {
  let txHash = getArg('--tx');
  if (!txHash) {
    // Fallback: find a positional 0x-prefixed 64-hex hash in argv
    const positional = process.argv.find((a) => /^0x[0-9a-fA-F]{64}$/.test(a));
    txHash = positional;
  }
  if (!txHash) {
    console.error('Usage: node resolve-usdc-from-tx.mjs --tx <txHash> [--write-env]');
    process.exit(1);
  }
  const rpcUrl = process.env.RPC_URL || 'https://rpc.testnet.arc.network';
  const chainId = Number(process.env.CHAIN_ID || 5042002);

  const chain = {
    id: chainId,
    name: 'ARC Testnet',
    nativeCurrency: { name: 'ARC', symbol: 'ARC', decimals: 18 },
    rpcUrls: { default: { http: [rpcUrl] } },
  };
  const client = createPublicClient({ chain, transport: http(rpcUrl) });

  console.log(`Fetching receipt for ${txHash} on ${rpcUrl} (chainId=${chainId})...`);
  const receipt = await client.getTransactionReceipt({ hash: txHash });
  const TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
  const tokenAddresses = new Set();

  for (const log of receipt.logs) {
    if (log.topics && log.topics[0] && log.topics[0].toLowerCase() === TRANSFER_TOPIC) {
      tokenAddresses.add(log.address.toLowerCase());
    }
  }

  if (tokenAddresses.size === 0) {
    console.error('No ERC20 Transfer logs found in this transaction.');
    process.exit(1);
  }

  console.log('Token contract addresses seen in Transfer logs:');
  for (const addr of tokenAddresses) {
    let symbol = 'UNKNOWN';
    let decimals = 'N/A';
    try {
      symbol = await client.readContract({ address: addr, abi: ERC20_ABI, functionName: 'symbol' });
    } catch {}
    try {
      decimals = await client.readContract({ address: addr, abi: ERC20_ABI, functionName: 'decimals' });
    } catch {}
    console.log(`- ${addr} (symbol=${symbol}, decimals=${decimals})`);
  }

  // If exactly one token and user requests, write to ../.env
  const writeEnv = process.argv.includes('--write-env');
  // Auto-write if we have a single USDC token and no explicit flag
  let autoWrite = false;
  let onlySymbol = 'UNKNOWN';
  if (tokenAddresses.size === 1) {
    const [onlyAddr] = Array.from(tokenAddresses);
    try {
      onlySymbol = await client.readContract({ address: onlyAddr, abi: ERC20_ABI, functionName: 'symbol' });
    } catch {}
    if (String(onlySymbol).toUpperCase() === 'USDC') autoWrite = true;
  }

  if ((writeEnv || autoWrite) && tokenAddresses.size === 1) {
    const [only] = Array.from(tokenAddresses);
    const envPath = path.resolve('../.env');
    let env = fs.readFileSync(envPath, 'utf8');
    if (env.includes('USDC_ADDRESS=')) {
      env = env.replace(/USDC_ADDRESS=.*/g, `USDC_ADDRESS=${only}`);
    } else {
      env += `\nUSDC_ADDRESS=${only}\n`;
    }
    fs.writeFileSync(envPath, env);
    console.log(`Updated USDC_ADDRESS in ${envPath} to ${only}`);
  } else if (writeEnv) {
    console.log('Multiple tokens found; not writing to .env. Pass the desired address manually.');
  }
}

main().catch((e) => {
  console.error('Resolve failed:', e instanceof Error ? e.message : e);
  process.exit(1);
});