"use client";

import { ConnectButton } from "thirdweb/react";
import Link from "next/link";
import Image from "next/image";
import { client } from "./client";

export default function Home() {
  return (
    <main className="container max-w-screen-xl mx-auto px-4">
      <section className="py-16 md:py-24">
        <Header />

        <div className="mt-8 flex flex-col md:flex-row items-center gap-4">
          <Link
            href="/voice"
            prefetch={false}
            className="inline-flex items-center justify-center rounded-md bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 text-sm font-medium transition-colors"
          >
            Try the Voice Payments Demo
          </Link>
          <ConnectButton
            client={client}
            appMetadata={{
              name: "PayStream",
              url: "https://example.com",
            }}
          />
        </div>
      </section>

      <ArcResources />
      <ThirdwebResources />
      <CircleResources />
      <TechLogos />
    </main>
  );
}

function Header() {
  return (
    <header className="text-center">
      <h1 className="text-3xl md:text-6xl font-bold tracking-tight text-zinc-100">
        PayStream
      </h1>
      <p className="mt-3 md:mt-4 text-sm md:text-base text-zinc-300">
        Voice-triggered conditional USDC payments on the Arc testnet.
      </p>
      <p className="mt-2 text-xs md:text-sm text-zinc-500">
        Prepare agreements by voice and execute on-chain with oracle authorization.
      </p>
    </header>
  );
}

function ArcResources() {
  return (
    <section className="py-8">
      <div className="grid gap-4 md:grid-cols-3">
        <ArticleCard
          title="Arc Network"
          href="https://arc.website/"
          description="Settlement layer powering voice-triggered USDC payments."
          logoSrc="/arc.svg"
          logoAlt="Arc"
        />
        <ArticleCard
          title="Arc Docs"
          href="https://docs.arc.tech/"
          description="Developer documentation and getting started."
          logoSrc="/arc.svg"
          logoAlt="Arc Docs"
        />
        <ArticleCard
          title="Arc Explorer"
          href="https://explorer.arc.tech/"
          description="Inspect transactions, contracts, and blocks on Arc."
          logoSrc="/arc.svg"
          logoAlt="Arc Explorer"
        />
      </div>
    </section>
  );
}

function ThirdwebResources() {
  return (
    <section className="py-8">
      <div className="grid gap-4 md:grid-cols-3">
      <ArticleCard
        title="thirdweb SDK Docs"
        href="https://portal.thirdweb.com/typescript/v5"
        description="thirdweb TypeScript SDK documentation"
        logoSrc="/thirdweb.svg"
        logoAlt="thirdweb"
      />

      <ArticleCard
        title="Components and Hooks"
        href="https://portal.thirdweb.com/typescript/v5/react"
        description="Learn about the thirdweb React components and hooks in thirdweb SDK"
        logoSrc="/thirdweb.svg"
        logoAlt="thirdweb"
      />

      <ArticleCard
        title="thirdweb Dashboard"
        href="https://thirdweb.com/dashboard"
        description="Deploy, configure, and manage your smart contracts from the dashboard."
        logoSrc="/thirdweb.svg"
        logoAlt="thirdweb"
      />
      </div>
    </section>
  );
}

function ArticleCard(props: {
  title: string;
  href: string;
  description: string;
  logoSrc?: string;
  logoAlt?: string;
}) {
  return (
    <a
      href={props.href + "?utm_source=next-template"}
      target="_blank"
      className="flex flex-col border border-zinc-800 p-4 rounded-lg hover:bg-zinc-900 transition-colors hover:border-zinc-700"
    >
      <article>
        <div className="flex items-center gap-2 mb-1">
          {props.logoSrc ? (
            <Image src={props.logoSrc} alt={props.logoAlt ?? "logo"} width={20} height={20} className="rounded-sm" />
          ) : null}
          <h2 className="text-lg font-semibold text-zinc-100">{props.title}</h2>
        </div>
        <p className="text-sm text-zinc-400">{props.description}</p>
      </article>
    </a>
  );
}

function CircleResources() {
  return (
    <section className="py-4">
      <div className="grid gap-4 md:grid-cols-3">
        <ArticleCard
          title="Circle Web3 Services"
          href="https://developers.circle.com/w3s"
          description="Programmatic wallets, policy controls, and secure API access."
          logoSrc="/circle.svg"
          logoAlt="Circle"
        />
        <ArticleCard
          title="USDC Overview"
          href="https://www.circle.com/usdc"
          description="Stablecoin for predictable settlement across chains."
          logoSrc="/usdc-coin.svg"
          logoAlt="USDC"
        />
        <ArticleCard
          title="CCTP (Cross-Chain USDC)"
          href="https://developers.circle.com/stablecoins/docs/cctp"
          description="Move USDC natively across supported ecosystems."
          logoSrc="/circle.svg"
          logoAlt="Circle CCTP"
        />
      </div>
    </section>
  );
}

function TechLogos() {
  return (
    <section className="py-8">
      <h3 className="text-sm font-medium text-zinc-400 mb-3">Tech & Integrations</h3>
      <div className="flex flex-wrap items-center gap-4">
        <span className="inline-flex items-center gap-2 border border-zinc-800 rounded-md px-3 py-2 bg-black/30">
          <Image src="/arc.svg" alt="Arc" width={20} height={20} />
          <span className="text-zinc-300 text-sm">Arc</span>
        </span>
        <span className="inline-flex items-center gap-2 border border-zinc-800 rounded-md px-3 py-2 bg-black/30">
          <Image src="/circle.svg" alt="Circle" width={20} height={20} />
          <span className="text-zinc-300 text-sm">Circle</span>
        </span>
        <span className="inline-flex items-center gap-2 border border-zinc-800 rounded-md px-3 py-2 bg-black/30">
          <Image src="/usdc-coin.svg" alt="USDC" width={20} height={20} />
          <span className="text-zinc-300 text-sm">USDC</span>
        </span>
        <span className="inline-flex items-center gap-2 border border-zinc-800 rounded-md px-3 py-2 bg-black/30">
          <Image src="/thirdweb.svg" alt="thirdweb" width={20} height={20} />
          <span className="text-zinc-300 text-sm">thirdweb</span>
        </span>
        <span className="inline-flex items-center gap-2 border border-zinc-800 rounded-md px-3 py-2 bg-black/30">
          <Image src="/cloudflare.svg" alt="Cloudflare" width={20} height={20} />
          <span className="text-zinc-300 text-sm">Cloudflare</span>
        </span>
        <span className="inline-flex items-center gap-2 border border-zinc-800 rounded-md px-3 py-2 bg-black/30">
          <Image src="/elevenlabs.svg" alt="ElevenLabs" width={20} height={20} />
          <span className="text-zinc-300 text-sm">ElevenLabs</span>
        </span>
        <span className="inline-flex items-center gap-2 border border-zinc-800 rounded-md px-3 py-2 bg-black/30">
          <Image src="/aimlapi.svg" alt="AI/ML API" width={20} height={20} />
          <span className="text-zinc-300 text-sm">AI/ML API</span>
        </span>
        <span className="inline-flex items-center gap-2 border border-zinc-800 rounded-md px-3 py-2 bg-black/30">
          <Image src="/next.svg" alt="Next.js" width={20} height={20} />
          <span className="text-zinc-300 text-sm">Next.js</span>
        </span>
        <span className="inline-flex items-center gap-2 border border-zinc-800 rounded-md px-3 py-2 bg-black/30">
          <Image src="/vercel.svg" alt="Vercel" width={20} height={20} />
          <span className="text-zinc-300 text-sm">Vercel</span>
        </span>
      </div>
    </section>
  );
}
