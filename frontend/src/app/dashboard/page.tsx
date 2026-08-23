import Link from 'next/link';
import { Package, Plus } from 'lucide-react';

// Mock data
const recentBatches = [
  { id: 'b-123', product: 'Tomato', grade: 'Grade_A', confidence: 94.5, date: '2023-10-27', status: 'Verified' },
  { id: 'b-124', product: 'Tomato', grade: 'Grade_B', confidence: 88.2, date: '2023-10-26', status: 'Verified' },
  { id: 'b-125', product: 'Tomato', grade: 'Reject', confidence: 99.1, date: '2023-10-25', status: 'Verified' },
];

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Farmer Dashboard</h1>
            <p className="text-gray-500">Manage your graded agricultural batches</p>
          </div>
          <Link href="/scan" className="flex items-center gap-2 bg-green-600 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-green-700 transition">
            <Plus className="w-5 h-5" /> New Batch
          </Link>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
              <Package className="w-5 h-5 text-gray-400" /> Recent Activity
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 text-gray-500 text-sm">
                <tr>
                  <th className="p-4 font-medium">Batch ID</th>
                  <th className="p-4 font-medium">Product</th>
                  <th className="p-4 font-medium">AI Grade</th>
                  <th className="p-4 font-medium">Confidence</th>
                  <th className="p-4 font-medium">Blockchain</th>
                  <th className="p-4 font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {recentBatches.map((batch) => (
                  <tr key={batch.id} className="hover:bg-gray-50 transition">
                    <td className="p-4 font-mono text-sm text-gray-600">{batch.id}</td>
                    <td className="p-4 text-gray-900">{batch.product}</td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold
                        ${batch.grade === 'Grade_A' ? 'bg-green-100 text-green-700' : 
                          batch.grade === 'Grade_B' ? 'bg-blue-100 text-blue-700' : 
                          batch.grade === 'Reject' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'}`}>
                        {batch.grade.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="p-4 text-gray-600">{batch.confidence}%</td>
                    <td className="p-4">
                      <span className="flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md w-fit">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> {batch.status}
                      </span>
                    </td>
                    <td className="p-4">
                      <Link href={`/batch/${batch.id}`} className="text-blue-600 hover:underline text-sm font-medium">
                        View Details
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
