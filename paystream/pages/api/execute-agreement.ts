import type { NextApiRequest, NextApiResponse } from "next";
import { createPublicClient, createWalletClient, http } from "viem";

const escrowAbi = [
  { name: "executeAgreement", type: "function", stateMutability: "nonpayable", inputs: [
      { name: "id", type: "bytes32" },
      { name: "oracleSig", type: "bytes" },
    ], outputs: [] },
];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  try {
    const { id, recipients: recIn, amounts: amtIn } = req.body || {};
    if (!id) return res.status(400).json({ error: "Missing id" });

    const rpcUrl = process.env.RPC_URL;
    const chainId = Number(process.env.CHAIN_ID || 0);
    const escrow = process.env.CONTRACT_ADDRESS as `0x${string}`;
    const pk = process.env.PRIVATE_KEY as `0x${string}`;
    const oraclePk = process.env.ORACLE_PRIVATE_KEY as `0x${string}`;
    if (!rpcUrl || !chainId || !escrow || !pk || !oraclePk) {
      return res.status(500).json({ error: "Missing chain configuration", details: { rpcUrl, chainId, escrow, pk: !!pk, oraclePk: !!oraclePk } });
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

    // Sanity check: ensure ORACLE_PRIVATE_KEY matches on-chain oracle address
    const oracleAbi = [
      { name: "oracle", type: "function", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "address" }] },
      { name: "setOracle", type: "function", stateMutability: "nonpayable", inputs: [{ name: "newOracle", type: "address" }], outputs: [] },
    ];
    const oracleOnChain = (await client.readContract({ address: escrow, abi: oracleAbi, functionName: "oracle" })) as `0x${string}`;
    // Build oracle signature using recipients/amounts provided by the client (from prepare step)
    const oracleAccount = privateKeyToAccount(oraclePk);
    if (oracleOnChain?.toLowerCase() !== oracleAccount.address.toLowerCase()) {
      // Attempt to auto-sync oracle using current PRIVATE_KEY (must be owner)
      try {
        const tx = await wallet.writeContract({ address: escrow, abi: oracleAbi, functionName: "setOracle", args: [oracleAccount.address] });
        await client.waitForTransactionReceipt({ hash: tx });
        const after = (await client.readContract({ address: escrow, abi: oracleAbi, functionName: "oracle" })) as `0x${string}`;
        if (after?.toLowerCase() !== oracleAccount.address.toLowerCase()) {
          return res.status(500).json({
            error: "oracle key mismatch",
            details: {
              onChainOracle: oracleOnChain,
              signingOracle: oracleAccount.address,
              afterAttempt: after,
              hint: "setOracle failed or PRIVATE_KEY is not owner. Use deployer key or update ORACLE_PRIVATE_KEY to match on-chain oracle.",
            },
          });
        }
      } catch (err: any) {
        return res.status(500).json({
          error: "oracle key mismatch",
          details: {
            onChainOracle: oracleOnChain,
            signingOracle: oracleAccount.address,
            attemptError: err?.message || String(err),
            hint: "setOracle requires owner. Use deployer key or correct ORACLE_PRIVATE_KEY.",
          },
        });
      }
    }
    const recipients = (recIn || []) as `0x${string}`[];
    const amountsStr = (amtIn || []) as string[];
    if (!Array.isArray(recipients) || !Array.isArray(amountsStr) || recipients.length !== amountsStr.length || recipients.length === 0) {
      return res.status(400).json({ error: "Missing or invalid recipients/amounts" });
    }
    const amounts = amountsStr.map((s) => BigInt(s));

    const { encodePacked, keccak256, toBytes } = await import("viem");
    const msgHash = keccak256(encodePacked(["bytes32", "address[]", "uint256[]"], [id as `0x${string}`, recipients, amounts]));
    const signature = await oracleAccount.signMessage({ message: { raw: toBytes(msgHash) } });
    const ethHash = keccak256(encodePacked(["string", "bytes32"], ["\x19Ethereum Signed Message:\n32", msgHash]));

    // Execute agreement on-chain
    const execHash = await wallet.writeContract({ address: escrow, abi: escrowAbi, functionName: "executeAgreement", args: [id as `0x${string}`, signature] });
    const receipt = await client.waitForTransactionReceipt({ hash: execHash });

    return res.status(200).json({
      ok: true,
      id,
      executeTx: receipt.transactionHash,
      chainId,
      details: {
        signingOracle: oracleAccount.address,
        onChainOracle: oracleOnChain,
        msgHash,
        ethHash,
        recipients,
        amounts: amounts.map(String),
        signature,
      },
    });
  } catch (e: any) {
    return res.status(500).json({ error: "execute-agreement failed", details: e?.message || String(e) });
  }
}