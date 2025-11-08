import type { NextApiRequest, NextApiResponse } from "next";
import { createPublicClient, createWalletClient, http, encodePacked, keccak256, toHex, parseUnits } from "viem";

const erc20Abi = [
  { name: "approve", type: "function", stateMutability: "nonpayable", inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ], outputs: [{ name: "", type: "bool" }] },
  { name: "decimals", type: "function", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint8" }] },
];

const escrowAbi = [
  { name: "deposit", type: "function", stateMutability: "nonpayable", inputs: [ { name: "amount", type: "uint256" } ], outputs: [] },
  { name: "createAgreement", type: "function", stateMutability: "nonpayable", inputs: [
      { name: "id", type: "bytes32" },
      { name: "recipients", type: "address[]" },
      { name: "amounts", type: "uint256[]" },
      { name: "deadline", type: "uint256" },
      { name: "conditionHash", type: "bytes32" },
    ], outputs: [] },
];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  try {
    const { agreement } = req.body || {};
    if (!agreement) return res.status(400).json({ error: "Missing agreement" });

    const rpcUrl = process.env.RPC_URL;
    const chainId = Number(process.env.CHAIN_ID || 0);
    const usdc = process.env.USDC_ADDRESS as `0x${string}`;
    const escrow = process.env.CONTRACT_ADDRESS as `0x${string}`;
    const pk = process.env.PRIVATE_KEY as `0x${string}`;
    if (!rpcUrl || !chainId || !usdc || !escrow || !pk) {
      return res.status(500).json({ error: "Missing chain configuration", details: { rpcUrl, chainId, usdc, escrow, pk: !!pk } });
    }

    const chain = {
      id: chainId,
      name: "ARC Testnet",
      nativeCurrency: { name: "ARC", symbol: "ARC", decimals: 18 },
      rpcUrls: { default: { http: [rpcUrl] } },
    } as const;

    const { privateKeyToAccount } = await import("viem/accounts");
    const account = privateKeyToAccount(pk);
    const wallet = createWalletClient({ account, chain, transport: http(rpcUrl) });
    const client = createPublicClient({ transport: http(rpcUrl) });

    // Read USDC decimals
    const decimals = (await client.readContract({ address: usdc, abi: erc20Abi, functionName: "decimals" })) as number;

    // Convert amounts
    const amountsUnits = (agreement.amounts as string[]).map((a) => parseUnits(a, decimals));
    const total = amountsUnits.reduce((acc, v) => acc + v, 0n);
    const deadlineSeconds = BigInt(Math.floor(Date.now() / 1000 + (agreement.deadline_hours || 24) * 3600));
    const conditionText: string = agreement.condition || "";
    const conditionHash = keccak256(toHex(conditionText));

    // Build deterministic id
    const packed = encodePacked(
      ["string", "uint256", "address[]", "uint256[]"],
      [conditionText, deadlineSeconds, agreement.recipients as `0x${string}`[], amountsUnits]
    );
    const id = keccak256(packed);

    // Approve USDC to escrow
    const approveHash = await wallet.writeContract({ address: usdc, abi: erc20Abi, functionName: "approve", args: [escrow, total] });
    const approveReceipt = await client.waitForTransactionReceipt({ hash: approveHash });

    // Deposit into escrow
    const depositHash = await wallet.writeContract({ address: escrow, abi: escrowAbi, functionName: "deposit", args: [total] });
    const depositReceipt = await client.waitForTransactionReceipt({ hash: depositHash });

    // Create agreement
    const createHash = await wallet.writeContract({ address: escrow, abi: escrowAbi, functionName: "createAgreement", args: [id, agreement.recipients as `0x${string}`[], amountsUnits, deadlineSeconds, conditionHash] });
    const createReceipt = await client.waitForTransactionReceipt({ hash: createHash });

    return res.status(200).json({
      ok: true,
      id,
      // Echo back the canonical recipients & amounts used on-chain
      recipients: agreement.recipients as `0x${string}`[],
      amounts: amountsUnits.map((v) => v.toString()),
      approveTx: approveReceipt.transactionHash,
      depositTx: depositReceipt.transactionHash,
      createTx: createReceipt.transactionHash,
      chainId,
    });
  } catch (e: any) {
    return res.status(500).json({ error: "prepare-agreement failed", details: e?.message || String(e) });
  }
}