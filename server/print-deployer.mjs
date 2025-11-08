import 'dotenv/config';
import { privateKeyToAccount } from 'viem/accounts';

const pk = process.env.PRIVATE_KEY;
if (!pk) {
  console.error('Missing PRIVATE_KEY in env');
  process.exit(1);
}
const account = privateKeyToAccount(pk);
console.log('Deployer Address:', account.address);