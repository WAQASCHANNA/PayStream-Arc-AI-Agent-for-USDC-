import 'dotenv/config';
import { createPublicClient, createWalletClient, http, parseUnits } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

// Minimal ERC20 ABI for approve and balanceOf
const ERC20_ABI = [
  { type: 'function', name: 'approve', stateMutability: 'nonpayable', inputs: [
    { name: 'spender', type: 'address' },
    { name: 'value', type: 'uint256' }
  ], outputs: [{ name: 'success', type: 'bool' }] },
  { type: 'function', name: 'balanceOf', stateMutability: 'view', inputs: [
    { name: 'owner', type: 'address' }
  ], outputs: [{ name: 'balance', type: 'uint256' }] },
  { type: 'function', name: 'decimals', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint8' }] },
];

// Minimal ConditionalEscrow ABI for deposit
const ESCROW_ABI = [
  { type: 'function', name: 'deposit', stateMutability: 'nonpayable', inputs: [
    { name: 'amount', type: 'uint256' }
  ], outputs: [] }
];

function getArg(flag, fallback) {
  const i = process.argv.indexOf(flag);
  if (i !== -1 && i + 1 < process.argv.length) return process.argv[i + 1];
  return fallback;
}

async function main() {
  const rpcUrl = getArg('--rpc-url', process.env.RPC_URL || 'https://rpc.testnet.arc.network');
  const chainId = Number(getArg('--chain-id', process.env.CHAIN_ID || 5042002));
  const usdc = getArg('--usdc', process.env.USDC_ADDRESS);
  const escrow = getArg('--contract', process.env.CONTRACT_ADDRESS);
  const pk = getArg('--pk', process.env.PRIVATE_KEY);
  let amountInput = getArg('--amount', process.env.DEPOSIT_AMOUNT || undefined); // in USDC units
  if (!amountInput) {
    // Fallback: accept positional numeric like "9" or "9.5" from npm arg forwarding
    const posNum = process.argv.find((a) => /^\d+(\.\d+)?$/.test(a));
    amountInput = posNum || '10';
  }

  if (!usdc) throw new Error('Missing USDC address. Pass --usdc or set USDC_ADDRESS in env.');
  if (!escrow) throw new Error('Missing escrow contract. Pass --contract or set CONTRACT_ADDRESS in env.');
  if (!pk) throw new Error('Missing PRIVATE_KEY. Pass --pk or set PRIVATE_KEY in env.');

  const chain = {
    id: chainId,
    name: 'Custom',
    nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
    rpcUrls: { default: { http: [rpcUrl] } },
  };

  const account = privateKeyToAccount(pk);
  const wallet = createWalletClient({ account, chain, transport: http(rpcUrl) });
  const client = createPublicClient({ chain, transport: http(rpcUrl) });

  // Fetch decimals to parse the human amount correctly (defaults to 6 for USDC)
  let decimals = 6;
  try {
    decimals = await client.readContract({ address: usdc, abi: ERC20_ABI, functionName: 'decimals' });
  } catch (_) {}
  let amount = parseUnits(amountInput, decimals);

  console.log(`Using RPC: ${rpcUrl} (chainId=${chainId})`);
  console.log(`USDC: ${usdc}`);
  console.log(`Escrow: ${escrow}`);
  console.log(`Depositor: ${account.address}`);
  console.log(`Amount (USDC units): ${amountInput} -> raw ${amount}`);

  // Check depositor balance and cap the amount to avoid revert
  const depositorBal = await client.readContract({ address: usdc, abi: ERC20_ABI, functionName: 'balanceOf', args: [account.address] });
  console.log('Depositor USDC balance (raw):', depositorBal);
  if (amount > depositorBal) {
    if (depositorBal === 0n) throw new Error('Depositor USDC balance is 0; cannot deposit.');
    // Use max available minus 1 unit to ensure transferFrom succeeds
    amount = depositorBal - 1n;
    console.log(`Requested exceeds balance; adjusting deposit amount to raw ${amount}`);
  }

  // Approve escrow to pull funds
  console.log('Approving escrow to spend USDC...');
  const approveHash = await wallet.writeContract({
    address: usdc,
    abi: ERC20_ABI,
    functionName: 'approve',
    args: [escrow, amount],
  });
  console.log('Approve tx:', approveHash);
  await client.waitForTransactionReceipt({ hash: approveHash });
  console.log('Approve confirmed.');

  // Call deposit on escrow
  // Recheck balance after approval (USDC gas may be charged from balance)
  const postBal = await client.readContract({ address: usdc, abi: ERC20_ABI, functionName: 'balanceOf', args: [account.address] });
  const feeReserve = BigInt(10) ** BigInt(decimals - 2); // ~0.01 USDC reserve
  if (postBal <= feeReserve) throw new Error('Insufficient post-approval balance to cover deposit and fees.');
  if (amount > postBal - feeReserve) {
    amount = postBal - feeReserve;
    console.log(`Adjusted deposit to raw ${amount} after approval to account for fees.`);
  }
  console.log('Depositing into escrow...');
  const depositHash = await wallet.writeContract({
    address: escrow,
    abi: ESCROW_ABI,
    functionName: 'deposit',
    args: [amount],
  });
  console.log('Deposit tx:', depositHash);
  const receipt = await client.waitForTransactionReceipt({ hash: depositHash });
  console.log('Deposit confirmed in block:', receipt.blockNumber);

  // Show escrow contract’s USDC balance after deposit
  const escrowBal = await client.readContract({ address: usdc, abi: ERC20_ABI, functionName: 'balanceOf', args: [escrow] });
  console.log('Escrow USDC balance (raw):', escrowBal);
}

main().catch((e) => {
  console.error('Deposit failed:', e instanceof Error ? e.message : e);
  process.exit(1);
});