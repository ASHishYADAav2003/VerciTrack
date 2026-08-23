"use client";

import { usePathname } from 'next/navigation';
import { ShieldCheck, Calendar, MapPin, Hash, CheckCircle } from 'lucide-react';
import QRCodeGenerator from '../../components/QRCodeGenerator';

export default function BatchDetails() {
  const pathname = usePathname();
  const batchId = pathname.split('/').pop() || 'Unknown';

  // Mock data for the view
  const batchData = {
    batchId: batchId,
    product: 'Tomato',
    origin: 'Farm Region A, Maharashtra',
    grade: 'Grade A',
    confidence: '96.5%',
    date: '2023-10-28',
    ipfsHash: 'QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG',
    txHash: '0x7f2c9b...e4a1'
  };

  const verificationUrl = typeof window !== 'undefined' ? window.location.href : `https://agritrust.example.com/batch/${batchId}`;

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto space-y-6">
        
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 flex flex-col md:flex-row gap-8 items-center md:items-start justify-between">
          <div className="space-y-4 flex-1">
            <div className="inline-flex items-center gap-2 bg-green-50 text-green-700 px-3 py-1 rounded-full text-sm font-semibold">
              <ShieldCheck className="w-4 h-4" /> Blockchain Verified
            </div>
            <h1 className="text-3xl font-bold text-gray-900">{batchData.product} - {batchData.grade}</h1>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
              <div className="flex items-center gap-3 text-gray-600">
                <Hash className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-xs font-medium text-gray-400 uppercase">Batch ID</p>
                  <p className="font-mono text-sm">{batchData.batchId}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-gray-600">
                <Calendar className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-xs font-medium text-gray-400 uppercase">Graded On</p>
                  <p className="text-sm font-medium">{batchData.date}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-gray-600">
                <MapPin className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-xs font-medium text-gray-400 uppercase">Origin</p>
                  <p className="text-sm font-medium">{batchData.origin}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-gray-600">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <div>
                  <p className="text-xs font-medium text-gray-400 uppercase">AI Confidence</p>
                  <p className="text-sm font-medium text-green-700">{batchData.confidence}</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col items-center gap-3 bg-gray-50 p-4 rounded-xl border border-gray-100">
            <QRCodeGenerator value={verificationUrl} size={150} />
            <p className="text-xs text-gray-500 font-medium text-center">Scan to Verify</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Technical Ledger Details</h2>
          <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-xs font-medium text-gray-500 uppercase mb-1">Base Sepolia Transaction Hash</p>
              <a href={`https://sepolia.basescan.org/tx/${batchData.txHash}`} target="_blank" rel="noopener noreferrer" className="font-mono text-sm text-blue-600 hover:underline break-all">
                {batchData.txHash}
              </a>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-xs font-medium text-gray-500 uppercase mb-1">IPFS Image Reference (Pinata)</p>
              <a href={`https://gateway.pinata.cloud/ipfs/${batchData.ipfsHash}`} target="_blank" rel="noopener noreferrer" className="font-mono text-sm text-blue-600 hover:underline break-all">
                ipfs://{batchData.ipfsHash}
              </a>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
