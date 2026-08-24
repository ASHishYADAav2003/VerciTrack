"use client";

import { useState, useRef } from 'react';
import { Camera, Upload, CheckCircle2, Loader2, Leaf, Coffee } from 'lucide-react';
import Link from 'next/link';

export default function ScanPage() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<{batchId: string, grade: string, confidence: number, txHash: string} | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      const objectUrl = URL.createObjectURL(selected);
      setPreview(objectUrl);
    }
  };

  const handleProcess = () => {
    if (!file) return;
    setIsProcessing(true);
    
    // Simulate backend API call, AI inference, and Blockchain transaction
    setTimeout(() => {
      setResult({
        batchId: 'b-' + Math.random().toString(36).substring(2, 9),
        grade: 'Specialty',
        confidence: 96.5,
        txHash: '0xabc123...def456'
      });
      setIsProcessing(false);
    }, 2500);
  };

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative Garden Background Elements */}
      <div className="absolute top-10 left-10 text-amber-700/20 animate-float"><Leaf size={48} /></div>
      <div className="absolute bottom-20 right-10 text-orange-600/20 animate-float-delayed"><Leaf size={64} /></div>
      <div className="absolute top-1/3 left-4 text-amber-900/10 animate-float-slow"><Coffee size={100} /></div>
      <div className="absolute bottom-1/3 right-1/4 text-orange-800/15 animate-float"><Leaf size={40} /></div>

      <div className="bg-white max-w-md w-full rounded-2xl shadow-xl overflow-hidden border border-gray-100 relative z-10 animate-sway">
        <div className="bg-amber-700 p-6 text-white text-center">
          <h2 className="text-2xl font-bold">New Quality Scan</h2>
          <p className="text-amber-100 text-sm mt-1">Capture or upload an image of the batch</p>
        </div>

        <div className="p-6 space-y-6">
          {!preview ? (
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-300 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer hover:border-amber-500 hover:bg-amber-50 transition min-h-[250px]"
            >
              <Camera className="w-12 h-12 text-gray-400 mb-4" />
              <p className="text-gray-600 font-medium">Tap to capture or upload</p>
              <p className="text-gray-400 text-sm mt-1">Supports JPG, PNG</p>
            </div>
          ) : (
            <div className="relative rounded-xl overflow-hidden bg-black min-h-[250px] flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview} alt="Preview" className="max-h-[300px] object-contain" />
              {!isProcessing && !result && (
                <button 
                  onClick={() => setPreview(null)}
                  className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded hover:bg-black/70"
                >
                  Retake
                </button>
              )}
            </div>
          )}

          <input 
            type="file" 
            accept="image/*" 
            capture="environment" 
            className="hidden" 
            ref={fileInputRef}
            onChange={handleFileChange}
          />

          {!result ? (
            <button
              onClick={handleProcess}
              disabled={!file || isProcessing}
              className={`w-full py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition
                ${!file || isProcessing ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-amber-700 text-white hover:bg-amber-800 shadow-md'}`}
            >
              {isProcessing ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> Processing AI & Blockchain...</>
              ) : (
                <><Upload className="w-5 h-5" /> Generate Quality Grade</>
              )}
            </button>
          ) : (
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-center space-y-3">
              <CheckCircle2 className="w-12 h-12 text-amber-500 mx-auto" />
              <div>
                <h3 className="font-bold text-gray-900 text-lg">Batch Graded Successfully</h3>
                <p className="text-sm text-gray-600">Assigned: <span className="font-bold text-amber-700">{result.grade.replace('_', ' ')} ({result.confidence}%)</span></p>
              </div>
              <Link href={`/batch/${result.batchId}`} className="block w-full py-2 bg-amber-700 text-white rounded-lg font-medium hover:bg-amber-800">
                View Batch Details & QR
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
