# PayStream Agent

Minimal Node.js scaffold for voice → STT → LLM intent parsing → EIP-712-like payload creation and EIP-191 message signing compatible with `ConditionalEscrow.executeAgreement`.

## Setup

- Copy `.env.example` to `.env` at the repo root, ensure `ORACLE_PRIVATE_KEY` is set.
- Optionally set `RPC_URL` to Arc testnet: `https://rpc.testnet.arc.network`.

## Run

```bash
pnpm i
pnpm --filter paystream-agent dev
```

Outputs:
- Agreement ID (`bytes32`)
- Oracle signature (`0x`-prefixed 65-byte hex) suitable for `executeAgreement(id, sig)`

## Notes

- `signMessage({ raw: msgHash })` prefixes per EIP-191, matching the contract’s recovery of `"\x19Ethereum Signed Message:\n32" + msgHash`.
- Integrate STT (ElevenLabs/Workers AI) and LLM parsing where marked TODO.