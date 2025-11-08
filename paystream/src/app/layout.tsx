import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThirdwebProvider } from "thirdweb/react";
import Link from "next/link";
import Image from "next/image";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "thirdweb SDK + Next starter",
  description:
    "Starter template for using thirdweb SDK with Next.js App router",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className} suppressHydrationWarning={true}>
        <ThirdwebProvider>
          <div className="min-h-screen flex flex-col">
            <header className="border-b border-zinc-800 bg-black/40 backdrop-blur">
              <div className="container max-w-screen-xl mx-auto px-4 py-3 flex items-center justify-between">
                <Link href="/" prefetch={false} className="flex items-center gap-2">
                  <Image src="/usdc-coin.svg" alt="PayStream" width={24} height={24} className="rounded-full" />
                  <span className="font-semibold tracking-tight text-zinc-100">PayStream</span>
                </Link>
                <nav className="flex items-center gap-6 text-sm">
                  <Link href="/" prefetch={false} className="text-zinc-300 hover:text-white transition-colors">Home</Link>
                  <Link href="/about" prefetch={false} className="text-zinc-300 hover:text-white transition-colors">About</Link>
                  <Link href="/voice" prefetch={false} className="text-zinc-300 hover:text-white transition-colors">Voice</Link>
                </nav>
              </div>
            </header>

            <main className="flex-1">
              {children}
            </main>

            <footer className="border-t border-zinc-800">
              <div className="container max-w-screen-xl mx-auto px-4 py-6 text-sm text-zinc-400">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <span>Hackathon Demo • Arc Testnet • USDC Streams</span>
                  <span className="text-zinc-500">Built with Next.js & thirdweb</span>
                </div>
              </div>
            </footer>
          </div>
        </ThirdwebProvider>
      </body>
    </html>
  );
}
