import 'dotenv/config';
import { createPublicClient, createWalletClient, http, keccak256, encodePacked } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
async function sttTranscribe(_audioPath) {
    // TODO: integrate ElevenLabs or Workers AI STT.
    return 'Pay 1 USDC to 0x000000000000000000000000000000000000dead when report delivered in 24h';
}
async function parseIntentWithLLM(_spoken) {
    // TODO: call LLM to parse recipients, amounts, condition, deadline.
    return {
        recipients: ['0x000000000000000000000000000000000000dEaD'],
        amounts: [BigInt(1_000_000)], // 1 USDC with 6 decimals
        condition: 'report delivered',
        deadline: Math.floor(Date.now() / 1000) + 24 * 60 * 60,
    };
}
function buildAgreementId(intent) {
    const payload = encodePacked(['string', 'uint256', 'address[]', 'uint256[]'], [intent.condition, BigInt(intent.deadline), intent.recipients, intent.amounts]);
    return keccak256(payload);
}
async function postJson(url, body) {
    const resp = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
    });
    if (!resp.ok) {
        const text = await resp.text();
        throw new Error(`POST ${url} failed: ${resp.status} ${text}`);
    }
    return (await resp.json());
}
async function main() {
    const rpcUrl = process.env.RPC_URL || 'https://rpc.testnet.arc.network';
    const chain = {
        id: 5042002,
        name: 'ARC Testnet',
        nativeCurrency: { name: 'ARC', symbol: 'ARC', decimals: 18 },
        rpcUrls: { default: { http: [rpcUrl] } },
    };
    const client = createPublicClient({ transport: http(rpcUrl) });
    const serverUrl = process.env.SERVER_URL || 'http://127.0.0.1:3000';
    const contractAddress = process.env.CONTRACT_ADDRESS;
    if (!contractAddress)
        throw new Error('Missing CONTRACT_ADDRESS in env');
    const signerPk = process.env.ORACLE_PRIVATE_KEY;
    if (!signerPk)
        throw new Error('Missing ORACLE_PRIVATE_KEY in env');
    const account = privateKeyToAccount(signerPk);
    const wallet = createWalletClient({ account, chain, transport: http(rpcUrl) });
    const spoken = await sttTranscribe('path/to/audio.wav');
    const intent = await parseIntentWithLLM(spoken);
    // Prepare agreement on server (computes id + typedData)
    const agreement = {
        recipients: intent.recipients,
        // send as numbers (server converts to BigInt internally)
        amounts: intent.amounts.map((v) => Number(v)),
        condition: intent.condition,
        deadline: intent.deadline,
    };
    const prep = await postJson(`${serverUrl}/prepare-agreement`, { agreement });
    console.log('Agreement ID:', prep.id);
    // Ask server to sign oracle message using ORACLE_PRIVATE_KEY env
    const sign = await postJson(`${serverUrl}/oracle-sign`, {
        id: prep.id,
        recipients: agreement.recipients,
        amounts: agreement.amounts,
    });
    console.log('Oracle Signature:', sign.signature);
    // Create the agreement on-chain
    const abi = [
        {
            type: 'function',
            name: 'createAgreement',
            stateMutability: 'nonpayable',
            inputs: [
                { name: 'id', type: 'bytes32' },
                { name: 'recipients', type: 'address[]' },
                { name: 'amounts', type: 'uint256[]' },
                { name: 'deadline', type: 'uint256' },
                { name: 'conditionHash', type: 'bytes32' },
            ],
            outputs: [],
        },
        {
            type: 'function',
            name: 'executeAgreement',
            stateMutability: 'nonpayable',
            inputs: [
                { name: 'id', type: 'bytes32' },
                { name: 'oracleSig', type: 'bytes' },
            ],
            outputs: [],
        },
    ];
    const conditionHash = keccak256(encodePacked(['string'], [agreement.condition]));
    const createHash = await wallet.writeContract({
        address: contractAddress,
        abi,
        functionName: 'createAgreement',
        args: [
            prep.id,
            agreement.recipients,
            agreement.amounts.map((v) => BigInt(v)),
            BigInt(agreement.deadline),
            conditionHash,
        ],
    });
    console.log('createAgreement tx:', createHash);
    // Execute the agreement (will revert if contract lacks USDC balance)
    try {
        const execHash = await wallet.writeContract({
            address: contractAddress,
            abi,
            functionName: 'executeAgreement',
            args: [prep.id, sign.signature],
        });
        console.log('executeAgreement tx:', execHash);
    }
    catch (e) {
        console.error('executeAgreement failed (likely insufficient USDC on contract):', e instanceof Error ? e.message : e);
    }
}
main().catch((err) => {
    console.error(err);
    process.exit(1);
});
