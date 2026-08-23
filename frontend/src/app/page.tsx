import Link from 'next/link';
import { ArrowRight, Leaf, ShieldCheck, Database } from 'lucide-react';

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center">
      <header className="w-full max-w-6xl p-6 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Leaf className="text-green-600 w-8 h-8" />
          <span className="text-xl font-bold text-gray-800">AgriTrust AI</span>
        </div>
        <div className="space-x-4">
          <Link href="/dashboard" className="text-gray-600 hover:text-green-600 font-medium">Dashboard</Link>
          <Link href="/scan" className="bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 transition">
            Scan Product
          </Link>
        </div>
      </header>

      <section className="flex-1 w-full max-w-6xl flex flex-col md:flex-row items-center justify-center p-6 gap-12 mt-12">
        <div className="flex-1 space-y-6">
          <h1 className="text-5xl font-extrabold text-gray-900 leading-tight">
            AI-Powered <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-emerald-400">Quality Grading</span> <br/> Secured on Blockchain
          </h1>
          <p className="text-lg text-gray-600">
            A fully web-based system to automatically grade agricultural produce using MobileNetV3 and permanently record results on the Base Sepolia network. Fair pricing starts with transparent quality.
          </p>
          <div className="flex gap-4">
            <Link href="/scan" className="flex items-center gap-2 bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 transition shadow-lg shadow-green-200">
              Start Grading <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
        
        <div className="flex-1 w-full relative">
          <div className="absolute inset-0 bg-gradient-to-r from-green-100 to-emerald-50 rounded-2xl transform rotate-3 scale-105 -z-10"></div>
          <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-100 flex flex-col gap-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-blue-50 rounded-lg text-blue-600"><Leaf className="w-6 h-6"/></div>
              <div>
                <h3 className="font-bold text-gray-900">1. Capture Image</h3>
                <p className="text-sm text-gray-500">Take a photo of the batch from your browser.</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="p-3 bg-purple-50 rounded-lg text-purple-600"><Database className="w-6 h-6"/></div>
              <div>
                <h3 className="font-bold text-gray-900">2. AI Inference</h3>
                <p className="text-sm text-gray-500">MobileNetV3 assigns Grade A, B, C or Reject.</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="p-3 bg-green-50 rounded-lg text-green-600"><ShieldCheck className="w-6 h-6"/></div>
              <div>
                <h3 className="font-bold text-gray-900">3. Blockchain Record</h3>
                <p className="text-sm text-gray-500">Immutable hash stored on Base Sepolia.</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
