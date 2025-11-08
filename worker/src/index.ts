import { encodePacked, keccak256, toBytes, Hex } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

type Agreement = {
  recipients: string[];
  amounts: number[]; // smallest units
  condition: string;
  deadline: number; // unix seconds
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function buildAgreementId(agreement: Agreement): Hex {
  const packed = encodePacked(
    ['string', 'uint256', 'address[]', 'uint256[]'],
    [agreement.condition, BigInt(agreement.deadline), agreement.recipients, agreement.amounts.map(BigInt)]
  );
  return keccak256(packed);
}

function buildTypedDataSkeleton(id: Hex, agreement: Agreement) {
  return {
    domain: {
      name: 'PayStream',
      version: '1',
      chainId: 5042002,
    },
    types: {
      Agreement: [
        { name: 'id', type: 'bytes32' },
        { name: 'recipients', type: 'address[]' },
        { name: 'amounts', type: 'uint256[]' },
        { name: 'condition', type: 'string' },
        { name: 'deadline', type: 'uint256' },
      ],
    },
    primaryType: 'Agreement',
    message: {
      id,
      recipients: agreement.recipients,
      // Avoid BigInt in JSON responses
      amounts: agreement.amounts.map((v) => BigInt(v).toString()),
      condition: agreement.condition,
      deadline: agreement.deadline,
    },
  };
}

export default {
  async fetch(req: Request, env: { ORACLE_PRIVATE_KEY?: string; SAND_API_KEY?: string; CIRCLE_API_KEY?: string }) {
    const url = new URL(req.url);

    if (req.method === 'POST' && url.pathname === '/parse-voice') {
      const { audio } = await req.json();
      return json({ text: 'transcribed text (mock)', received: !!audio });
    }

    if (req.method === 'POST' && url.pathname === '/parse-intent') {
      const { text } = await req.json();
      const agreement: Agreement = {
        recipients: ['0x000000000000000000000000000000000000dEaD'],
        amounts: [1_000_000],
        condition: (text as string) || 'invoice:123 paid',
        deadline: Math.floor(Date.now() / 1000) + 86400,
      };
      return json({ agreement });
    }

    if (req.method === 'POST' && url.pathname === '/prepare-agreement') {
      const { agreement } = (await req.json()) as { agreement: Agreement };
      const id = buildAgreementId(agreement);
      const typedData = buildTypedDataSkeleton(id, agreement);
      return json({ id, typedData });
    }

    if (req.method === 'POST' && url.pathname === '/oracle-sign') {
      if (!env.ORACLE_PRIVATE_KEY) return json({ error: 'Missing ORACLE_PRIVATE_KEY' }, 400);
      const { id, recipients, amounts } = await req.json();
      const msgHash = keccak256(
        encodePacked(['bytes32', 'address[]', 'uint256[]'], [id as Hex, recipients as string[], (amounts as number[]).map(BigInt)])
      );
      const account = privateKeyToAccount(env.ORACLE_PRIVATE_KEY as Hex);
      const signature = await account.signMessage({ message: { raw: toBytes(msgHash) } });
      return json({ signature });
    }

    if (req.method === 'GET' && url.pathname === '/circle/balances') {
      const key = env.SAND_API_KEY || env.CIRCLE_API_KEY;
      if (!key) return json({ error: 'Missing SAND_API_KEY or CIRCLE_API_KEY' }, 400);
      const resp = await fetch('https://api-sandbox.circle.com/v1/balances', {
        headers: {
          Authorization: `Bearer ${key}`,
        },
      });
      const data = await resp.json();
      if (!resp.ok) return json({ error: data }, resp.status);
      return json(data);
    }

    return new Response('Not Found', { status: 404 });
  },
};