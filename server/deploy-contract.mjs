import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import solc from 'solc';
import { createPublicClient, createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

function compileContract() {
  const sourcePath = path.resolve('../src/ConditionalEscrow.sol');
  const source = fs.readFileSync(sourcePath, 'utf8');
  const input = {
    language: 'Solidity',
    sources: { 'ConditionalEscrow.sol': { content: source } },
    settings: {
      optimizer: { enabled: true, runs: 200 },
      outputSelection: { '*': { '*': ['abi', 'evm.bytecode.object'] } },
    },
  };
  const output = JSON.parse(solc.compile(JSON.stringify(input)));
  const contracts = output.contracts?.['ConditionalEscrow.sol'];
  if (!contracts) throw new Error('Compilation failed: ' + JSON.stringify(output.errors || output));
  const c = contracts['ConditionalEscrow'];
  const abi = c.abi;
  const bytecode = '0x' + c.evm.bytecode.object;
  return { abi, bytecode };
}

async function main() {
  const rpcUrl = process.env.RPC_URL || 'https://rpc.testnet.arc.network';
  const chain = {
    id: Number(process.env.CHAIN_ID || 5042002),
    name: 'ARC Testnet',
    nativeCurrency: { name: 'ARC', symbol: 'ARC', decimals: 18 },
    rpcUrls: { default: { http: [rpcUrl] } },
  };
  const pk = process.env.PRIVATE_KEY;
  const usdc = process.env.USDC_ADDRESS;
  const oracle = process.env.ORACLE_ADDRESS;
  if (!pk || !usdc || !oracle) throw new Error('Missing PRIVATE_KEY, USDC_ADDRESS, or ORACLE_ADDRESS in env');
  const account = privateKeyToAccount(pk);
  const wallet = createWalletClient({ account, chain, transport: http(rpcUrl) });
  const client = createPublicClient({ transport: http(rpcUrl) });

  const { abi, bytecode } = compileContract();
  console.log('Deploying ConditionalEscrow...');
  const hash = await wallet.deployContract({ abi, bytecode, args: [usdc, oracle] });
  console.log('Deployment tx:', hash);
  const receipt = await client.waitForTransactionReceipt({ hash });
  const address = receipt.contractAddress;
  if (!address) throw new Error('No contractAddress in receipt');
  console.log('CONTRACT_ADDRESS:', address);
}

main().catch((e) => {
  console.error('Deploy failed:', e instanceof Error ? e.message : e);
  process.exit(1);
});