import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/session";
import LogoutButton from "./LogoutButton";

export default async function AccountPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="bg-white shadow-sm">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold text-blue-600">
            EV Easee
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-gray-600">{session.email}</span>
            <LogoutButton />
          </div>
        </nav>
      </header>

      <main className="flex-1 py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">My Vehicles</h1>

          <div className="bg-white rounded-xl shadow-lg p-8">
            <div className="text-center">
              <div className="mb-6">
                <svg
                  className="mx-auto h-16 w-16 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M8 7h8m-8 4h8m-4 4v3m-6-3h12a2 2 0 002-2V7a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                No vehicles connected yet
              </h2>
              <p className="text-gray-600 mb-8">
                Connect your electric vehicle to start tracking and managing it.
              </p>

              <button
                type="button"
                className="inline-flex items-center justify-center gap-3 bg-blue-600 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:bg-blue-700 transition-colors shadow-lg hover:shadow-xl"
              >
                <svg
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                Add Vehicle
              </button>

              <div className="mt-8 pt-8 border-t border-gray-200">
                <p className="text-sm text-gray-500">
                  Supported brands: <span className="font-medium">Zeekr</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
