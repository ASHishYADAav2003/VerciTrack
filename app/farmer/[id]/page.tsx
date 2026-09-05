"use client";
// app/farmer/[id]/page.tsx
// Public farmer profile page — no auth required

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

type FarmerProfile = {
  id: string;
  name: string;
  farmName: string | null;
  location: string | null;
  walletAddress: string | null;
  status: string;
};

type BatchCard = {
  batchId: string;
  name: string;
  coffeeType: string;
  origin: string;
  price: string | number | null;
  weight: string | null;
  image: string | null;
  qualityStatus: string;
  approvedAt: string | null;
  certificateUrl: string | null;
  pdfHash: string | null;
};

function QualityPill({ status }: { status: string }) {
  const s =
    status === "passed"  ? "bg-green-100 text-green-700 border-green-200" :
    status === "caution" ? "bg-amber-100 text-amber-700 border-amber-200" :
                           "bg-red-100   text-red-700   border-red-200";
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize ${s}`}>
      {status}
    </span>
  );
}

export default function FarmerProfilePage() {
  const params = useParams();
  const id =
    typeof params?.id === "string" ? params.id
    : Array.isArray(params?.id)   ? params.id[0]
    : null;

  const [farmer, setFarmer] = useState<FarmerProfile | null>(null);
  const [batches, setBatches]     = useState<BatchCard[]>([]);
  const [status, setStatus]       = useState<"loading" | "found" | "not-found">("loading");

  useEffect(() => {
    if (!id) { setStatus("not-found"); return; }
    fetch(`/api/farmers/${encodeURIComponent(id)}`)
      .then(async (res) => {
        if (!res.ok) { setStatus("not-found"); return; }
        const data = await res.json();
        setFarmer(data.farmer);
        setBatches(data.batches || []);
        setStatus("found");
      })
      .catch(() => setStatus("not-found"));
  }, [id]);

  if (status === "loading") {
    return (
      <main className="min-h-screen bg-amber-50 flex items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-amber-200 border-t-amber-600" />
      </main>
    );
  }

  if (status === "not-found" || !farmer) {
    return (
      <main className="min-h-screen bg-amber-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 max-w-sm w-full text-center space-y-4">
          <div className="text-5xl"></div>
          <h1 className="text-xl font-bold text-gray-800">Farmer not found</h1>
          <p className="text-sm text-gray-400">This profile doesn't exist or has been removed.</p>
          <Link href="/verify" className="inline-block rounded-xl bg-amber-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-amber-700 transition-colors">
            Back to verify
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-amber-50 py-10 px-4">
      <div className="mx-auto max-w-3xl space-y-6">

        {/* Nav */}
        <Link href="/verify" className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
          ← Back to registry
        </Link>

        {/* Profile card */}
        <div className="rounded-2xl bg-white shadow-sm border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-amber-500 to-amber-400 px-6 py-8 flex items-center gap-5">
            {/* Avatar */}
            <div className="h-16 w-16 rounded-full bg-white/20 flex items-center justify-center shrink-0">
              <span className="text-3xl"></span>
            </div>
            <div>
              <p className="text-white/70 text-xs font-medium uppercase tracking-widest mb-1">Verified Farmer</p>
              <h1 className="text-2xl font-bold text-white leading-tight">{farmer.name}</h1>
              {farmer.farmName && (
                <p className="text-amber-100 text-sm mt-0.5">{farmer.farmName}</p>
              )}
            </div>
          </div>

          <div className="p-6 grid sm:grid-cols-3 gap-4">
            {/* Location */}
            <div className="rounded-xl bg-gray-50 border border-gray-100 p-4 text-center">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Location</p>
              <p className="text-sm font-bold text-gray-800">{farmer.location || "—"}</p>
            </div>
            {/* Batches */}
            <div className="rounded-xl bg-amber-50 border border-amber-100 p-4 text-center">
              <p className="text-xs font-semibold text-amber-500 uppercase tracking-wide mb-1">Verified batches</p>
              <p className="text-2xl font-bold text-amber-700">{batches.length}</p>
            </div>
            {/* Wallet */}
            <div className="rounded-xl bg-gray-50 border border-gray-100 p-4 text-center">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Wallet</p>
              {farmer.walletAddress ? (
                <p className="font-mono text-xs text-gray-600 break-all">
                  {farmer.walletAddress.slice(0, 6)}…{farmer.walletAddress.slice(-4)}
                </p>
              ) : (
                <p className="text-sm text-gray-400">Not linked</p>
              )}
            </div>
          </div>
        </div>

        {/* Batches */}
        <div>
          <h2 className="text-base font-bold text-gray-800 mb-3">
            Approved batches <span className="text-gray-400 font-normal text-sm">({batches.length})</span>
          </h2>

          {batches.length === 0 ? (
            <div className="rounded-2xl bg-white border border-gray-100 p-10 text-center">
              <p className="text-gray-400 text-sm">No approved batches yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {batches.map((b) => (
                <div key={b.batchId} className="rounded-2xl bg-white shadow-sm border border-gray-100 p-4 flex items-center gap-4">
                  {/* Image */}
                  <div className="h-12 w-12 rounded-xl overflow-hidden bg-amber-100 flex items-center justify-center shrink-0">
                    {b.image
                      ? <img src={b.image} alt={b.name} className="h-full w-full object-cover" />
                      : <span className="text-2xl"></span>
                    }
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <span className="font-mono text-xs font-bold text-amber-700">{b.batchId}</span>
                      <QualityPill status={b.qualityStatus} />
                    </div>
                    <p className="text-sm font-semibold text-gray-800 truncate">{b.name}</p>
                    <p className="text-xs text-gray-400">{b.origin}{b.weight ? ` · ${b.weight}` : ""}</p>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    {b.price && <p className="text-sm font-bold text-gray-800">€{b.price}</p>}
                    <div className="flex gap-2">
                      {b.certificateUrl && (
                        <a
                          href={b.certificateUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-lg bg-blue-50 border border-blue-200 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition-colors"
                        >
                          PDF PDF
                        </a>
                      )}
                      <Link
                        href={`/verify/${encodeURIComponent(b.batchId)}`}
                        className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-100 transition-colors"
                      >
                        Verify
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <p className="text-center text-xs text-gray-400 pb-4">
          All batches listed here have been verified by the CoffeeTrace admin and recorded on-chain.
        </p>
      </div>
    </main>
  );
}