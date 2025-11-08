"use client";
import React, { useState, useRef } from "react";
import axios from "axios";

export default function VoiceDemo() {
  const [recording, setRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [agreement, setAgreement] = useState<any>(null);
  const [status, setStatus] = useState("");
  const [prepared, setPrepared] = useState<any>(null);
  const [recipientOverride, setRecipientOverride] = useState<string>("");
  const mediaRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  async function startRecording() {
    try {
      setStatus("");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRef.current = mediaRecorder;
      audioChunksRef.current = [];
      mediaRecorder.ondataavailable = (e) => audioChunksRef.current.push(e.data);
      mediaRecorder.onstop = async () => {
        try {
          const audioBlob = new Blob(audioChunksRef.current, { type: "audio/wav" });
          setStatus("Uploading audio...");
          const parseRes = await fetch("/api/parse-voice", {
            method: "POST",
            body: audioBlob,
          });
          if (!parseRes.ok) {
            const errTxt = await parseRes.text();
            setStatus(`Voice parse failed (${parseRes.status}): ${errTxt}`);
            return;
          }
          const parsed = await parseRes.json();
          const text: string | undefined = parsed?.text;
          if (!text) {
            setStatus("No transcript returned. Check ELEVEN_API_KEY and audio format.");
            return;
          }
          setTranscript(text);
          setStatus("Parsing intent...");
          const intent = await axios.post("/api/parse-intent", { text });
          setAgreement(intent.data.agreement);
          setStatus("Agreement parsed.");
        } catch (err: any) {
          console.error(err);
          const msg = err?.response?.data?.error || err?.message || String(err);
          setStatus(`Error: ${msg}`);
        }
      };
      mediaRecorder.start();
      setRecording(true);
    } catch (err: any) {
      console.error(err);
      setStatus(`Mic error: ${err?.message || String(err)}`);
    }
  }

  function stopRecording() {
    mediaRef.current?.stop();
    setRecording(false);
  }

  async function createOnChainAgreement() {
    try {
      setStatus("Creating agreement on-chain...");
      // Use override if provided, otherwise parsed recipients
      const recips: string[] = (recipientOverride
        ? [recipientOverride]
        : ((agreement?.recipients || []) as string[]));
      // Basic validation: ensure recipients are valid addresses
      const bad = recips.find((r) => !/^0x[0-9a-fA-F]{40}$/.test(r));
      if (bad) {
        const isTxHashLike = /^0x[0-9a-fA-F]{64}$/.test(bad);
        const hint = isTxHashLike
          ? "Looks like a transaction hash (66 hex chars). Paste a wallet address (42 chars), e.g., 0x37a687D9fD61BF192525bE8fE09404195f63A1c8."
          : "Please provide a full 42-char hex address (0x + 40 hex).";
        setStatus(`Invalid recipient address: ${bad}. ${hint}`);
        return;
      }
      const payload = { agreement: { ...agreement, recipients: recips } };
      const resp = await axios.post("/api/prepare-agreement", payload);
      const data = resp.data;
      setPrepared(data);
      const tx = data?.createTx ? `\nTx: ${data.createTx}` : "";
      setStatus("Agreement prepared: " + JSON.stringify(data) + tx);
    } catch (err: any) {
      console.error(err);
      const baseErr = err?.response?.data?.error || err?.message || String(err);
      const details = err?.response?.data?.details;
      const d = details ? (typeof details === "string" ? details : JSON.stringify(details)) : "";
      setStatus(`Prepare failed: ${baseErr}${d ? `\nDetails: ${d}` : ""}`);
    }
  }

  async function executeOnChainAgreement() {
    try {
      if (!prepared?.id) {
        setStatus("No prepared agreement id found.");
        return;
      }
      setStatus("Executing agreement on-chain...");
      const resp = await axios.post("/api/execute-agreement", {
        id: prepared.id,
        recipients: prepared.recipients,
        amounts: prepared.amounts,
      });
      const data = resp.data;
      setStatus("Agreement executed: " + JSON.stringify(data));
      setPrepared((prev: any) => ({ ...prev, executeTx: data?.executeTx, execDetails: data?.details }));
    } catch (err: any) {
      console.error(err);
      const baseErr = err?.response?.data?.error || err?.message || String(err);
      const details = err?.response?.data?.details;
      const d = details ? (typeof details === "string" ? details : JSON.stringify(details)) : "";
      setStatus(`Execute failed: ${baseErr}${d ? `\nDetails: ${d}` : ""}`);
    }
  }

  const MicIcon = ({ active }: { active: boolean }) => (
    <svg viewBox="0 0 24 24" className={"w-6 h-6 " + (active ? "text-white" : "text-zinc-100") } aria-hidden>
      <path fill="currentColor" d="M12 14a4 4 0 0 0 4-4V6a4 4 0 1 0-8 0v4a4 4 0 0 0 4 4Zm-6-4a6 6 0 0 0 12 0h-2a4 4 0 0 1-8 0H6Zm5 6v2h2v-2h-2Z" />
    </svg>
  );

  return (
    <div className="container max-w-screen-xl mx-auto px-4 py-10">
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-zinc-100">Voice Payments</h1>
        <p className="text-sm text-zinc-400 mt-2">Speak a payment instruction (e.g., "Pay Waqas 1 USD when invoice 123 is paid").</p>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        <section className="flex-1 border border-zinc-800 rounded-xl bg-black/40 p-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-zinc-100">Recorder</h3>
            <button
              aria-label={recording ? "Stop recording" : "Start recording"}
              onClick={() => (recording ? stopRecording() : startRecording())}
              className={
                "relative inline-flex items-center justify-center rounded-full " +
                (recording ? "bg-red-600 hover:bg-red-500" : "bg-blue-600 hover:bg-blue-500") +
                " text-white size-12 md:size-14 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-400"
              }
              title={recording ? "Stop Recording" : "Start Recording"}
            >
              {recording && (
                <span className="absolute inset-0 rounded-full animate-ping bg-red-600/30" aria-hidden />
              )}
              <MicIcon active={recording} />
            </button>
          </div>

          <div className="mt-4">
            <h4 className="text-sm font-medium text-zinc-300">Transcript</h4>
            <div className="mt-1 text-sm text-zinc-200 min-h-[2rem]">{transcript || "—"}</div>
          </div>
        </section>

        <section className="flex-1 border border-zinc-800 rounded-xl bg-black/40 p-4">
          <h3 className="font-semibold text-zinc-100">Parsed Agreement</h3>
          <pre className="bg-zinc-900 p-3 rounded mt-2 text-sm">{agreement ? JSON.stringify(agreement, null, 2) : "—"}</pre>
          <div className="mt-3">
            <label className="block text-xs text-zinc-400 mb-1">Recipient (override)</label>
            <input
              className="border border-zinc-700 bg-white text-black rounded-md px-2 py-1 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="0x1234... (Arc testnet address)"
              value={recipientOverride}
              onChange={(e) => setRecipientOverride(e.target.value.trim())}
            />
            <div className="text-xs mt-1 text-zinc-500">Paste a full 42-char hex address to override the parsed recipient.</div>
          </div>
        </section>
      </div>

      <section className="mt-6 border border-zinc-800 rounded-xl bg-black/40 p-4">
        <div className="flex flex-wrap gap-3">
          <button
            className="inline-flex items-center rounded-md bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 text-sm font-medium disabled:opacity-50"
            onClick={createOnChainAgreement}
            disabled={!agreement}
          >
            Create Agreement on-chain
          </button>
          <button
            className="inline-flex items-center rounded-md border border-zinc-700 hover:bg-zinc-900 text-zinc-100 px-4 py-2 text-sm font-medium disabled:opacity-50"
            onClick={executeOnChainAgreement}
            disabled={!prepared?.id}
            title={!prepared?.id ? "Prepare an agreement first" : "Execute the prepared agreement"}
          >
            Execute Agreement
          </button>
        </div>

        <div className="mt-3 text-sm">
          <span className="font-semibold">Status:</span>
          <pre className="mt-2 bg-zinc-900 p-3 rounded text-zinc-200 whitespace-pre-wrap">{status || "—"}</pre>
        </div>
      </section>
      {(prepared?.approveTx || prepared?.depositTx || prepared?.createTx) && (
        <div className="mt-4 text-sm">
          <div className="font-semibold">ArcScan Links</div>
          {prepared?.approveTx && (
            <div>
              Approve: {" "}
              <a
                className="text-blue-400 underline"
                href={`https://testnet.arcscan.app/tx/${prepared.approveTx}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                {prepared.approveTx}
              </a>
            </div>
          )}
          {prepared?.depositTx && (
            <div>
              Deposit: {" "}
              <a
                className="text-blue-400 underline"
                href={`https://testnet.arcscan.app/tx/${prepared.depositTx}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                {prepared.depositTx}
              </a>
            </div>
          )}
          {prepared?.createTx && (
            <div>
              Create: {" "}
              <a
                className="text-blue-400 underline"
                href={`https://testnet.arcscan.app/tx/${prepared.createTx}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                {prepared.createTx}
              </a>
            </div>
          )}
          {prepared?.executeTx && (
            <div>
              Execute: {" "}
              <a
                className="text-blue-400 underline"
                href={`https://testnet.arcscan.app/tx/${prepared.executeTx}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                {prepared.executeTx}
              </a>
            </div>
          )}
          {prepared?.execDetails && (
            <div className="mt-4 border border-zinc-800 rounded-xl bg-black/40 p-4">
              <div className="font-semibold mb-2 text-zinc-100">Execution Details</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div className="text-zinc-300">Signing Oracle: <span className="text-zinc-100">{prepared.execDetails.signingOracle}</span></div>
                <div className="text-zinc-300">On-chain Oracle: <span className="text-zinc-100">{prepared.execDetails.onChainOracle}</span></div>
                <div className="text-zinc-300">Msg Hash: <span className="text-zinc-100 break-all">{prepared.execDetails.msgHash}</span></div>
                <div className="text-zinc-300">Prefixed Hash: <span className="text-zinc-100 break-all">{prepared.execDetails.ethHash}</span></div>
                <div className="text-zinc-300 md:col-span-2">Signature: <span className="text-zinc-100 break-all">{prepared.execDetails.signature}</span></div>
              </div>
              <div className="mt-3 text-zinc-300">Recipients & Amounts:</div>
              <pre className="bg-zinc-900 p-3 rounded text-zinc-200 mt-2">{JSON.stringify(
                (prepared.execDetails.recipients || []).map((r: string, i: number) => ({ recipient: r, amount: prepared.execDetails.amounts?.[i] })),
                null,
                2
              )}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}