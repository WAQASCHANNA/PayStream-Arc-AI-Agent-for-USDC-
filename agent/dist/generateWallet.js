import 'dotenv/config';
import { randomBytes } from 'crypto';
import { toHex } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
function generatePrivateKey() {
    // Generate a 32-byte random private key
    const bytes = randomBytes(32);
    return toHex(bytes);
}
async function main() {
    const pk = generatePrivateKey();
    const account = privateKeyToAccount(pk);
    console.log('Local wallet generated:');
    console.log('Address:', account.address);
    console.log('Private Key:', pk);
    console.log('\nStore this securely (do NOT commit to git).');
}
main().catch((e) => {
    console.error(e);
    process.exit(1);
});
