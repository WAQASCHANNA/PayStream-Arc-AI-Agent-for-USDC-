"use client";
import Link from "next/link";

export default function About() {
  return (
    <main className="container max-w-screen-xl mx-auto px-4 py-10">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-zinc-100">About PayStream</h1>
        <p className="text-zinc-400 mt-2">Where AI Decisions Meet USDC Execution</p>
      </header>

      <section className="grid gap-6 md:grid-cols-2">
        <div className="border border-zinc-800 rounded-xl bg-black/40 p-5">
          <h2 className="text-xl font-semibold text-zinc-100">Introduction</h2>
          <p className="text-sm text-zinc-300 mt-2">
            VoiceFlow is a revolutionary AI-powered payment system that enables users to create complex, conditional financial agreements using natural voice commands.
            Built on Arc blockchain with USDC, VoiceFlow transforms spoken language into executable smart contracts, making sophisticated financial instruments accessible to everyone.
          </p>
        </div>

        <div className="border border-zinc-800 rounded-xl bg-black/40 p-5">
          <h2 className="text-xl font-semibold text-zinc-100">Tagline</h2>
          <p className="text-sm text-zinc-300 mt-2">“Where AI Decisions Meet USDC Execution”</p>
        </div>
      </section>

      <section className="mt-6 border border-zinc-800 rounded-xl bg-black/40 p-5">
        <h2 className="text-xl font-semibold text-zinc-100">The Problem</h2>
        <p className="text-sm text-zinc-300 mt-2">Current Challenges in Digital Payments</p>
        <div className="overflow-x-auto mt-3">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-zinc-300">
                <th className="py-2 pr-4">Problem</th>
                <th className="py-2">Impact</th>
              </tr>
            </thead>
            <tbody className="text-zinc-200">
              <tr className="border-t border-zinc-800">
                <td className="py-2 pr-4">Technical Barrier</td>
                <td className="py-2">Setting up conditional payments requires coding skills</td>
              </tr>
              <tr className="border-t border-zinc-800">
                <td className="py-2 pr-4">Limited Flexibility</td>
                <td className="py-2">Most payment systems support only basic "if-then" logic</td>
              </tr>
              <tr className="border-t border-zinc-800">
                <td className="py-2 pr-4">Multi-Party Complexity</td>
                <td className="py-2">Coordinating multiple approvals is manual and error-prone</td>
              </tr>
              <tr className="border-t border-zinc-800">
                <td className="py-2 pr-4">Cross-Chain Friction</td>
                <td className="py-2">Moving assets between chains is complex and expensive</td>
              </tr>
              <tr className="border-t border-zinc-800">
                <td className="py-2 pr-4">Voice AI Isolation</td>
                <td className="py-2">Voice technology exists but isn't integrated with payments</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="mt-4 text-sm text-zinc-300">
          <p className="font-medium">Real-World Pain Points</p>
          <ul className="list-disc list-inside mt-2">
            <li>Freelancers: Can't easily set up milestone-based payments</li>
            <li>Real Estate: Complex multi-party escrows require legal intermediaries</li>
            <li>Supply Chain: Payments delayed by manual verification processes</li>
            <li>Content Creators: No automated royalty distribution based on performance</li>
          </ul>
        </div>
      </section>

      <section className="mt-6 grid gap-6 md:grid-cols-2">
        <div className="border border-zinc-800 rounded-xl bg-black/40 p-5">
          <h2 className="text-xl font-semibold text-zinc-100">Our Solution</h2>
          <p className="text-sm text-zinc-300 mt-2">VoiceFlow addresses these challenges through:</p>
        </div>
        <div className="border border-zinc-800 rounded-xl bg-black/40 p-5">
          <h2 className="text-xl font-semibold text-zinc-100">Key Innovations</h2>
          <ul className="mt-2 text-sm text-zinc-300 space-y-2">
            <li>
              <span className="font-medium">Natural Language Processing</span>
              <div className="text-zinc-400">Convert voice commands into structured payment conditions; Understand complex multi-condition statements</div>
            </li>
            <li>
              <span className="font-medium">Multi-Party Conditional Escrow</span>
              <div className="text-zinc-400">Smart contracts with customizable approval logic; Support for "M of N" signature requirements</div>
            </li>
            <li>
              <span className="font-medium">Cross-Chain Ready</span>
              <div className="text-zinc-400">Built-in CCTP V2 integration for cross-chain USDC movement; Seamless asset transfer across ecosystems</div>
            </li>
            <li>
              <span className="font-medium">Real-World Data Integration</span>
              <div className="text-zinc-400">Oracle feeds for external condition verification; Automated payment triggering based on real events</div>
            </li>
          </ul>
        </div>
      </section>

      <section className="mt-6 grid gap-6 md:grid-cols-2">
        <div className="border border-zinc-800 rounded-xl bg-black/40 p-5">
          <h2 className="text-xl font-semibold text-zinc-100">Circle Integration</h2>
          <p className="text-sm text-zinc-300 mt-2">
            We use Circle’s Web3 Services and USDC to turn voice intent into secure, on-chain payments.
          </p>
          <ul className="mt-3 text-sm text-zinc-300 space-y-2">
            <li>
              <span className="font-medium">Wallets & Entity Setup</span>
              <div className="text-zinc-400">Provision programmatic wallets (W3S), register an entity secret, and operate in the sandbox for development.</div>
              <div className="mt-2 text-xs text-zinc-500">Scripts: <code className="text-zinc-200">server/w3s-register-entity-secret.mjs</code>, <code className="text-zinc-200">server/w3s-create-wallet.mjs</code>, <code className="text-zinc-200">server/circle-sandbox-demo.js</code>, <code className="text-zinc-200">server/circle-config.js</code>.</div>
            </li>
            <li>
              <span className="font-medium">USDC as Settlement Asset</span>
              <div className="text-zinc-400">Approve and deposit USDC into the escrow, then execute agreements once conditions pass oracle checks.</div>
              <div className="mt-2 text-xs text-zinc-500">Code: <code className="text-zinc-200">src/ConditionalEscrow.sol</code>, <code className="text-zinc-200">server/escrow-deposit.mjs</code>, <code className="text-zinc-200">paystream/pages/api/prepare-agreement.ts</code>, <code className="text-zinc-200">paystream/pages/api/execute-agreement.ts</code>.</div>
            </li>
          </ul>
        </div>
        <div className="border border-zinc-800 rounded-xl bg-black/40 p-5">
          <h3 className="text-lg font-medium text-zinc-100">End-to-End Flow</h3>
          <ol className="mt-3 list-decimal pl-6 text-sm text-zinc-300 space-y-2">
            <li>Capture voice intent → parse agreement (payer, payee, amount, terms).</li>
            <li>Prepare agreement → approve USDC and deposit into <code className="text-zinc-200">ConditionalEscrow</code>.</li>
            <li>Oracle/signature checks validate conditions.</li>
            <li>Execute agreement → release funds when conditions are met.</li>
          </ol>
          <p className="mt-3 text-xs text-zinc-500">Circle provides reliable wallet provisioning and USDC settlement; the contract provides on-chain guarantees.</p>
        </div>
      </section>

      <section className="mt-6 grid gap-6 md:grid-cols-4">
        <div className="border border-zinc-800 rounded-xl bg-black/40 p-5">
          <h2 className="text-xl font-semibold text-zinc-100">Powered By: Cloudflare</h2>
          <p className="text-sm text-zinc-300 mt-2">Edge runtime for fast APIs and routing.</p>
          <ul className="mt-3 text-sm text-zinc-300 space-y-2">
            <li>Workers power low-latency endpoints and request handling.</li>
            <li>Great fit for voice-to-intent flows and webhooks.</li>
          </ul>
          <p className="mt-2 text-xs text-zinc-500">Repo: <code className="text-zinc-200">worker/</code>, config <code className="text-zinc-200">wrangler.toml</code>.</p>
        </div>
        <div className="border border-zinc-800 rounded-xl bg-black/40 p-5">
          <h2 className="text-xl font-semibold text-zinc-100">Powered By: AI/ML API</h2>
          <p className="text-sm text-zinc-300 mt-2">LLM/NLP services for parsing voice agreements.</p>
          <ul className="mt-3 text-sm text-zinc-300 space-y-2">
            <li>Extract payer, payee, amount, terms from transcripts.</li>
            <li>Supports multi-condition and approval rules.</li>
          </ul>
          <p className="mt-2 text-xs text-zinc-500">Endpoints: <code className="text-zinc-200">/api/parse-voice</code>, <code className="text-zinc-200">/api/parse-intent</code>.</p>
        </div>
        <div className="border border-zinc-800 rounded-xl bg-black/40 p-5">
          <h2 className="text-xl font-semibold text-zinc-100">Powered By: ElevenLabs</h2>
          <p className="text-sm text-zinc-300 mt-2">High-quality TTS for confirmations and UX.</p>
          <ul className="mt-3 text-sm text-zinc-300 space-y-2">
            <li>Optional voice feedback after prepare/execute steps.</li>
            <li>Enhances accessibility and trust via audible summaries.</li>
          </ul>
          <p className="mt-2 text-xs text-zinc-500">Integration path: REST API from server or client-side widget.</p>
        </div>
        <div className="border border-zinc-800 rounded-xl bg-black/40 p-5">
          <h2 className="text-xl font-semibold text-zinc-100">Powered By: Arc</h2>
          <p className="text-sm text-zinc-300 mt-2">Settlement chain and infra for USDC execution.</p>
          <ul className="mt-3 text-sm text-zinc-300 space-y-2">
            <li>Runs smart contracts like <code className="text-zinc-200">ConditionalEscrow</code>.</li>
            <li>Explorer and tooling for transactions and contracts.</li>
          </ul>
          <p className="mt-2 text-xs text-zinc-500">Docs: <Link href="https://docs.arc.tech/" className="text-blue-400 hover:underline">docs.arc.tech</Link>, Explorer: <Link href="https://explorer.arc.tech/" className="text-blue-400 hover:underline">explorer.arc.tech</Link>.</p>
        </div>
      </section>

      <div className="mt-8">
        <Link href="/voice" prefetch={false} className="inline-flex items-center rounded-md bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 text-sm font-medium">Try Voice Payments</Link>
      </div>
    </main>
  );
}