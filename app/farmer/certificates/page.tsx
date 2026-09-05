"use client";
// app/farmer/certificates/page.tsx
// Farmer's QR codes & certificates — one QR per approved batch

import { useEffect, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";

const BatchQRCode = dynamic(() => import("@/components/BatchQRCode"), { ssr: false });

type Batch = {
  batchId: string;
  name?: string;
  coffeeType?: string;
  origin?: string;
  farmerName?: string;
  approvalStatus?: string;
  qualityStatus?: string;
  certificateUrl?: string;
  txHash?: string;
};

export default function FarmerCertificatesPage() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState("");

  useEffect(() => {
    // auth_user is httpOnly — use /api/auth/me
    fetch("/api/auth/me")
      .then(r => r.ok ? r.json() : { user: null })
      .then(d => {
        const name = d.user?.name?.toLowerCase() ?? "";
        fetch("/api/marketplace?all=true")
          .then(r => r.json())
          .then(data => {
            const all: Batch[] = Array.isArray(data) ? data : data.batches || [];
            // Only show this farmer's own batches
            setBatches(all.filter(b => (b.farmerName || "").toLowerCase() === name));
            setLoading(false);
          })
          .catch(() => setLoading(false));
      })
      .catch(() => setLoading(false));
  }, []);

  const filtered = batches.filter(b =>
    !search ||
    b.batchId.toLowerCase().includes(search.toLowerCase()) ||
    (b.coffeeType || "").toLowerCase().includes(search.toLowerCase()) ||
    (b.origin || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-amber-50 py-10">
      <div className="mx-auto max-w-5xl px-6 space-y-6">

        <div>
          <Link href="/farmer" className="text-xs text-gray-400 hover:text-gray-600">← Back</Link>
          <h1 className="text-3xl font-bold text-amber-900 mt-2">My QR Codes & Certificates</h1>
          <p className="text-sm text-gray-500 mt-1">
            Download or print QR codes to attach to your coffee jars. Customers scan them to verify authenticity.
          </p>
        </div>

        {/* How it works */}
        <div className="rounded-2xl bg-white border border-amber-200 p-5">
          <h2 className="text-sm font-bold text-amber-800 mb-3">How the QR system works</h2>
          <div className="grid grid-cols-3 gap-4">
            {[
              { step: "1", title: "Print & stick",   desc: "Download the QR code for your batch and stick it on each jar." },
              { step: "2", title: "Customer scans",  desc: "Customer scans the QR with their phone camera — no app needed." },
              { step: "3", title: "Instant verify",  desc: "They see lab results, blockchain proof, and your producer profile." },
            ].map(s => (
              <div key={s.step} className="text-center">
                <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-800 font-bold text-sm flex items-center justify-center mx-auto mb-2">
                  {s.step}
                </div>
                <p className="text-sm font-semibold text-gray-700">{s.title}</p>
                <p className="text-xs text-gray-500 mt-0.5">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>

        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search batches…"
          className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
        />

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[...Array(2)].map((_, i) => <div key={i} className="rounded-2xl bg-white h-80 animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl bg-white p-12 text-center">
            <p className="text-gray-400">
              {batches.length === 0
                ? "No batches yet. Register your first batch to get a QR code."
                : "No batches match your search."}
            </p>
            {batches.length === 0 && (
              <Link href="/farmer/register-batch"
                className="mt-4 inline-block rounded-xl bg-amber-600 text-white px-5 py-2.5 text-sm font-semibold hover:bg-amber-700">
                Register a batch →
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filtered.map(batch => (
              <div key={batch.batchId} className="rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-5 border-b border-gray-100">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-mono text-sm font-bold text-amber-800">{batch.batchId}</p>
                      <p className="text-base font-semibold text-gray-800 mt-0.5">
                        {batch.coffeeType ? `${batch.coffeeType} Coffee` : batch.name || "Coffee Batch"}
                      </p>
                      {batch.origin && <p className="text-xs text-gray-500 mt-0.5"> {batch.origin}</p>}
                    </div>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                      batch.approvalStatus === "approved" ? "bg-green-100 text-green-800"
                      : batch.approvalStatus === "rejected" ? "bg-red-100 text-red-800"
                      : "bg-amber-100 text-amber-800"
                    }`}>
                      {batch.approvalStatus === "approved" ? " Verified"
                        : batch.approvalStatus === "rejected" ? " Rejected"
                        : " Pending"}
                    </span>
                  </div>
                </div>

                <div className="p-6 flex flex-col items-center bg-amber-50/40">
                  <BatchQRCode
                    batchId={batch.batchId}
                    coffeeType={batch.coffeeType}
                    farmerName={batch.farmerName}
                    size={180}
                    showLabel
                    showActions
                  />
                </div>

                <div className="px-5 py-3 border-t border-gray-100 flex gap-3">
                  <Link href={`/verify/${batch.batchId}`} target="_blank"
                    className="text-xs font-semibold text-blue-700 hover:text-blue-900">
                    Preview verify page ↗
                  </Link>
                  {batch.certificateUrl && (
                    <a href={batch.certificateUrl} target="_blank" rel="noopener noreferrer"
                      className="text-xs font-semibold text-blue-600 hover:text-blue-800">
                      View lab PDF ↗
                    </a>
                  )}
                  {batch.txHash && (
                    <span className="text-xs text-gray-400 font-mono ml-auto truncate max-w-[120px]">
                      tx: {batch.txHash.slice(0, 10)}…
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
