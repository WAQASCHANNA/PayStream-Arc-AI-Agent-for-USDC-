import 'dotenv/config';
import express from 'express';
import bodyParser from 'body-parser';
import { encodePacked, keccak256, toBytes } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

const app = express();
app.use(bodyParser.json({ limit: '10mb' }));

function buildAgreementId(agreement) {
  const packed = encodePacked(
    ['string', 'uint256', 'address[]', 'uint256[]'],
    [agreement.condition, BigInt(agreement.deadline), agreement.recipients, agreement.amounts.map(BigInt)]
  );
  return keccak256(packed);
}

function buildTypedDataSkeleton(id, agreement) {
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
      // Convert to strings to avoid BigInt in JSON responses
      amounts: agreement.amounts.map((v) => BigInt(v).toString()),
      condition: agreement.condition,
      deadline: agreement.deadline,
    },
  };
}

app.post('/parse-voice', async (req, res) => {
  const { audio } = req.body; // base64
  res.json({ text: 'transcribed text (mock)', received: !!audio });
});

app.post('/parse-intent', async (req, res) => {
  const { text } = req.body;
  const agreement = {
    recipients: ['0x000000000000000000000000000000000000dEaD'],
    amounts: [1_000_000],
    condition: text || 'invoice:123 paid',
    deadline: Math.floor(Date.now() / 1000) + 86400,
  };
  res.json({ agreement });
});

app.post('/prepare-agreement', async (req, res) => {
  const { agreement } = req.body;
  const id = buildAgreementId(agreement);
  const typedData = buildTypedDataSkeleton(id, agreement);
  res.json({ id, typedData });
});

app.post('/oracle-sign', async (req, res) => {
  if (!process.env.ORACLE_PRIVATE_KEY) return res.status(400).json({ error: 'Missing ORACLE_PRIVATE_KEY' });
  const { id, recipients, amounts } = req.body;
  const msgHash = keccak256(
    encodePacked(['bytes32', 'address[]', 'uint256[]'], [id, recipients, amounts.map(BigInt)])
  );
  const account = privateKeyToAccount(process.env.ORACLE_PRIVATE_KEY);
  const signature = await account.signMessage({ message: { raw: toBytes(msgHash) } });
  res.json({ signature });
});

app.listen(3000, () => console.log('Dev server listening on :3000'));