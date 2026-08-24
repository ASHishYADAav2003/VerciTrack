import Link from 'next/link';
import { ArrowRight, Coffee, ShieldCheck, Database, Camera, Leaf } from 'lucide-react';

export default function Home() {
  return (
    <main className="min-h-screen bg-stone-50 flex flex-col items-center relative overflow-hidden">
      {/* Decorative Garden Background Elements */}
      <div className="absolute top-20 left-10 text-green-700/20 animate-float"><Leaf size={48} /></div>
      <div className="absolute top-40 right-20 text-amber-600/20 animate-float-delayed"><Leaf size={64} /></div>
      <div className="absolute bottom-40 left-1/4 text-amber-900/10 animate-float-slow"><Coffee size={120} /></div>
      <div className="absolute top-1/2 right-1/3 text-orange-800/15 animate-float"><Leaf size={40} /></div>
      <header className="w-full max-w-6xl p-6 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Coffee className="text-amber-700 w-8 h-8" />
          <span className="text-xl font-bold text-gray-800">CoffeeTrust AI</span>
        </div>
        <div className="space-x-4">
          <Link href="/dashboard" className="text-gray-600 hover:text-amber-700 font-medium">Dashboard</Link>
          <Link href="/scan" className="bg-amber-700 text-white px-4 py-2 rounded-lg font-medium hover:bg-amber-800 transition">
            Scan Product
          </Link>
        </div>
      </header>

      <section className="flex-1 w-full max-w-6xl flex flex-col md:flex-row items-center justify-center p-6 gap-12 mt-12">
        <div className="flex-1 space-y-6">
          <h1 className="text-5xl font-extrabold text-gray-900 leading-tight">
            AI-Powered <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-700 to-orange-500">Coffee Bean Quality Assessment</span> <br/> Secured on Blockchain
          </h1>
          <p className="text-lg text-gray-600">
            A fully web-based system to automatically assess coffee bean quality using MobileNetV3 and permanently record results on the Base Sepolia network. Fair pricing starts with transparent quality.
          </p>
          <div className="flex gap-4">
            <Link href="/scan" className="flex items-center gap-2 bg-amber-700 text-white px-6 py-3 rounded-lg font-semibold hover:bg-amber-800 transition shadow-lg shadow-amber-200">
              Start Grading <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
        
        <div className="flex-1 w-full relative animate-sway">
          <div className="absolute inset-0 bg-gradient-to-r from-amber-100 to-orange-50 rounded-2xl transform rotate-3 scale-105 -z-10"></div>
          <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-100 flex flex-col gap-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-orange-50 rounded-lg text-orange-600"><Camera className="w-6 h-6"/></div>
              <div>
                <h3 className="font-bold text-gray-900">1. Capture Image</h3>
                <p className="text-sm text-gray-500">Take a photo of the batch from your browser.</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="p-3 bg-purple-50 rounded-lg text-purple-600"><Database className="w-6 h-6"/></div>
              <div>
                <h3 className="font-bold text-gray-900">2. AI Inference</h3>
                <p className="text-sm text-gray-500">MobileNetV3 assigns Specialty, Premium, Commercial or Reject.</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="p-3 bg-amber-50 rounded-lg text-amber-600"><ShieldCheck className="w-6 h-6"/></div>
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
