import type { NextApiRequest, NextApiResponse } from "next";
import { createPublicClient, http, encodePacked, keccak256, toBytes } from "viem";

let escrowAbi: any = undefined;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  try {
    const { id } = req.body || {};
    if (!id) return res.status(400).json({ error: "Missing id" });

    const rpcUrl = process.env.RPC_URL;
    const chainId = Number(process.env.CHAIN_ID || 0);
    const escrow = process.env.CONTRACT_ADDRESS as `0x${string}`;
    const oraclePk = process.env.ORACLE_PRIVATE_KEY as `0x${string}`;
    if (!rpcUrl || !chainId || !escrow || !oraclePk) {
      return res.status(500).json({ error: "Missing chain configuration", details: { rpcUrl, chainId, escrow, oraclePk: !!oraclePk } });
    }

    const client = createPublicClient({ transport: http(rpcUrl) });

    // Build ABI using parseAbi to ensure proper tuple decoding
    if (!escrowAbi) {
      const { parseAbi } = await import("viem");
      escrowAbi = parseAbi([
        "function agreements(bytes32 id) view returns ((address creator,address[] recipients,uint256[] amounts,uint256 totalAmount,uint256 deadline,bytes32 conditionHash,bool executed))",
      ]);
    }

    // Read agreement details from chain to ensure correct recipients and amounts
    const ag = (await client.readContract({ address: escrow, abi: escrowAbi, functionName: "agreements", args: [id] })) as any;
    const recipients = ag?.recipients as `0x${string}`[];
    const amounts = ag?.amounts as bigint[];
    const executed = ag?.executed as boolean;
    const deadline = ag?.deadline as bigint;
    if (!recipients || !amounts || amounts.length === 0) {
      return res.status(400).json({ error: "Agreement not found or empty" });
    }
    if (executed) return res.status(400).json({ error: "Agreement already executed" });
    const now = BigInt(Math.floor(Date.now() / 1000));
    if (deadline && now > deadline) return res.status(400).json({ error: "Agreement deadline passed" });

    // Build message hash: keccak256(abi.encodePacked(id, recipients, amounts))
    const msgHash = keccak256(encodePacked(["bytes32", "address[]", "uint256[]"], [id as `0x${string}`, recipients, amounts]));

    const { privateKeyToAccount } = await import("viem/accounts");
    const account = privateKeyToAccount(oraclePk);
    const signature = await account.signMessage({ message: { raw: toBytes(msgHash) } });

    return res.status(200).json({ id, recipients, amounts, signature });
  } catch (e: any) {
    return res.status(500).json({ error: "oracle-sign failed", details: e?.message || String(e) });
  }
}