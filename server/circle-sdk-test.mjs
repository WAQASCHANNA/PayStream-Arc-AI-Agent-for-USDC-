import 'dotenv/config';
import { Circle, CircleEnvironments } from '@circle-fin/circle-sdk';

const apiKey = process.env.CIRCLE_API_KEY || process.env.SAND_API_KEY;
if (!apiKey) {
  console.error('Missing CIRCLE_API_KEY or SAND_API_KEY in .env');
  process.exit(1);
}

const circle = new Circle(apiKey, CircleEnvironments.sandbox);

async function main() {
  try {
    const res = await circle.balances.listBalances();
    console.log('Balances response:', JSON.stringify(res.data, null, 2));
  } catch (err) {
    const code = err?.response?.status || err?.code;
    const msg = err?.response?.data || err?.message || String(err);
    console.error('SDK call failed:', code, typeof msg === 'string' ? msg : JSON.stringify(msg));
    process.exit(1);
  }
}

main();