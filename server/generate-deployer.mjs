import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import fs from 'fs';
import path from 'path';

const envPath = path.join(process.cwd(), '..', '.env');

function upsertEnv(envText, key, value) {
  const line = `${key}=${value}`;
  const re = new RegExp(`^${key}=.*$`, 'm');
  if (re.test(envText)) {
    return envText.replace(re, line);
  }
  const sep = envText.endsWith('\n') ? '' : '\n';
  return envText + sep + line + '\n';
}

try {
  const pk = generatePrivateKey();
  const account = privateKeyToAccount(pk);

  let envText = '';
  try {
    envText = fs.readFileSync(envPath, 'utf8');
  } catch (_e) {
    envText = '';
  }

  const updated = upsertEnv(envText, 'PRIVATE_KEY', pk);
  fs.writeFileSync(envPath, updated, 'utf8');

  console.log('New deployer generated and root .env updated.');
  console.log(`PRIVATE_KEY: ${pk}`);
  console.log(`Deployer address: ${account.address}`);
  console.log('Fund this address on Arc Testnet, then run:');
  console.log('  npm --prefix server run contract:deploy');
} catch (e) {
  console.error('Failed to generate deployer:', e?.message || e);
  process.exit(1);
}