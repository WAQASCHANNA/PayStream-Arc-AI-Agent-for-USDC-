import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

async function main() {
  const apiKey = process.env.CIRCLE_API_KEY;
  if (!apiKey) {
    console.error('Missing CIRCLE_API_KEY in .env');
    process.exit(1);
  }
  let entitySecret = process.env.ENTITY_SECRET;
  if (!entitySecret) {
    entitySecret = `0x${crypto.randomBytes(32).toString('hex')}`;
    console.log('Generated new ENTITY_SECRET:', entitySecret);
  }
  try {
    const { registerEntitySecretCiphertext, generateEntitySecretCiphertext } = await import('@circle-fin/developer-controlled-wallets');
    const baseUrl = process.env.CIRCLE_BASE_URL || 'https://api-sandbox.circle.com';
    const res = await registerEntitySecretCiphertext({ apiKey, entitySecret, baseUrl });
    const recoveryFile = res?.data?.recoveryFile;
    if (recoveryFile) {
      const outPath = path.resolve('./entity-secret-recovery.json');
      fs.writeFileSync(outPath, JSON.stringify(recoveryFile, null, 2));
      console.log('Saved recovery file to', outPath);
    }
    const ciphertext = await generateEntitySecretCiphertext({ apiKey, entitySecret, baseUrl });
    console.log('Entity Secret registered. Ciphertext generated.');
    // Update root .env
    const envPath = path.resolve('../.env');
    let envText = '';
    try { envText = fs.readFileSync(envPath, 'utf8'); } catch {}
    function upsert(k, v) {
      const re = new RegExp(`^${k}=.*$`, 'm');
      const line = `${k}=${v}`;
      envText = re.test(envText) ? envText.replace(re, line) : envText + (envText.endsWith('\n') ? '' : '\n') + line + '\n';
    }
    upsert('ENTITY_SECRET', entitySecret);
    upsert('ENTITY_SECRET_CIPHERTEXT', ciphertext);
    fs.writeFileSync(envPath, envText, 'utf8');
    console.log('Updated ../.env with ENTITY_SECRET and ENTITY_SECRET_CIPHERTEXT');
  } catch (e) {
    console.error('Failed to register entity secret:', e?.response?.data || e?.message || e);
    process.exit(1);
  }
}

main();