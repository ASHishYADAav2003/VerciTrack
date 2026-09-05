import Link from "next/link";

export default function AdminDashboardPage() {
  return (
    <main className="min-h-screen bg-amber-50 p-10">
      <div className="mx-auto max-w-6xl rounded-3xl bg-white p-10 shadow-lg">
        <h1 className="text-4xl font-bold text-amber-900">
          Admin Dashboard
        </h1>

        <p className="mt-4 text-gray-700">
          Manage users, coffee batches, marketplace listings,
          certificates, and platform activity.
        </p>

        <div className="mt-10 grid gap-6 md:grid-cols-2">

          <Link
            href="/admin/register-batch"
            className="rounded-2xl bg-green-700 p-6 text-white hover:bg-green-800"
          >
            <h2 className="text-2xl font-bold">
              Register Coffee Batch
            </h2>

            <p className="mt-2 text-sm">
              Add coffee batch data and upload laboratory certificates.
            </p>
          </Link>

          <Link
            href="/admin/batches"
            className="rounded-2xl bg-amber-600 p-6 text-white hover:bg-amber-700"
          >
            <h2 className="text-2xl font-bold">
              View All Batches
            </h2>

            <p className="mt-2 text-sm">
              Monitor all registered coffee batches.
            </p>
          </Link>

          <Link
            href="/admin/users"
            className="rounded-2xl border p-6 hover:bg-gray-50"
          >
            <h2 className="text-2xl font-bold text-amber-900">
              Manage Users
            </h2>

            <p className="mt-2 text-sm text-gray-700">
              View and manage customers and farmers.
            </p>
          </Link>

          <Link
            href="/admin/certificates"
            className="rounded-2xl border p-6 hover:bg-gray-50"
          >
            <h2 className="text-2xl font-bold text-amber-900">
              Manage Certificates
            </h2>

            <p className="mt-2 text-sm text-gray-700">
              Review uploaded laboratory certificates.
            </p>
          </Link>

          <Link
            href="/admin/marketplace"
            className="rounded-2xl border p-6 hover:bg-gray-50"
          >
            <h2 className="text-2xl font-bold text-amber-900">
              Marketplace Management
            </h2>

            <p className="mt-2 text-sm text-gray-700">
              Manage coffee products and marketplace listings.
            </p>
          </Link>

          <Link
            href="/admin/settings"
            className="rounded-2xl border p-6 hover:bg-gray-50"
          >
            <h2 className="text-2xl font-bold text-amber-900">
              Platform Settings
            </h2>

            <p className="mt-2 text-sm text-gray-700">
              Configure platform administration settings.
            </p>
          </Link>

        </div>
      </div>
    </main>
  );
}
