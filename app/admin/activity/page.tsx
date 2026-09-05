"use client";

import { useEffect, useState } from "react";

type Batch = {
  id: string;
  batchId: string;
  name: string;
  farmerName?: string;
  status: string;
};

export default function AdminActivityPage() {
  const [batches, setBatches] = useState<Batch[]>([]);

  useEffect(() => {
    async function loadActivity() {
      const res = await fetch("/api/marketplace");
      const data = await res.json();
      setBatches(data);
    }

    loadActivity();
  }, []);

  return (
    <main className="min-h-screen bg-amber-50 p-10">
      <div className="mx-auto max-w-6xl rounded-3xl bg-white p-10 shadow-lg">
        <h1 className="text-4xl font-bold text-amber-900">
          Platform Activity
        </h1>

        <p className="mt-4 text-gray-700">
          Recent user and blockchain-related activity.
        </p>

        <div className="mt-8 space-y-4">
          {batches.map((batch) => (
            <div key={batch.id} className="rounded-2xl border p-5">
              <p className="font-semibold text-amber-900">
                Batch registered: {batch.batchId}
              </p>
              <p>Product: {batch.name}</p>
              <p>Producer: {batch.farmerName}</p>
              <p>Status: {batch.status}</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}