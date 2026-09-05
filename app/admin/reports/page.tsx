"use client";

import { useEffect, useState } from "react";

type Batch = {
  id: string;
  name: string;
  batchId: string;
  farmerName?: string;
  origin: string;
  coffeeType?: string;
  status: string;
  pdfHash?: string;
};

export default function AdminReportsPage() {
  const [batches, setBatches] = useState<Batch[]>([]);

  useEffect(() => {
    async function loadBatches() {
      const res = await fetch("/api/marketplace");
      const data = await res.json();
      setBatches(data);
    }

    loadBatches();
  }, []);

  function exportReport() {
    const report = JSON.stringify(batches, null, 2);
    const blob = new Blob([report], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = "traceability-report.json";
    link.click();

    URL.revokeObjectURL(url);
  }

  return (
    <main className="min-h-screen bg-amber-50 p-10">
      <div className="mx-auto max-w-6xl rounded-3xl bg-white p-10 shadow-lg">
        <h1 className="text-4xl font-bold text-amber-900">
          Reports & Traceability Logs
        </h1>

        <p className="mt-4 text-gray-700">
          Export coffee batch data and traceability records for review.
        </p>

        <button
          onClick={exportReport}
          className="mt-8 rounded-xl bg-amber-600 px-6 py-3 text-white hover:bg-amber-700"
        >
          Export JSON Report
        </button>

        <div className="mt-8 space-y-4">
          {batches.map((batch) => (
            <div key={batch.id} className="rounded-2xl border p-5">
              <h2 className="text-xl font-bold text-amber-900">
                {batch.batchId}
              </h2>
              <p>Product: {batch.name}</p>
              <p>Producer: {batch.farmerName}</p>
              <p>Origin: {batch.origin}</p>
              <p>Coffee Type: {batch.coffeeType}</p>
              <p>Status: {batch.status}</p>
              <p className="break-all text-sm text-gray-600">
                Hash: {batch.pdfHash}
              </p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}