import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/session";
import LogoutButton from "../account/LogoutButton";
import PriceChart from "./PriceChart";
import ConnectedBanner from "./ConnectedBanner";

export default async function PricesPage({
  searchParams,
}: {
  searchParams: Promise<{ connected?: string; error?: string }>;
}) {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const params = await searchParams;

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="bg-white shadow-sm">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/" className="text-2xl font-bold text-green-600">
              EV Easee
            </Link>
            <div className="flex items-center gap-4">
              <Link
                href="/account"
                className="text-gray-600 hover:text-gray-900 font-medium"
              >
                Chargers
              </Link>
              <Link
                href="/prices"
                className="text-green-600 font-medium"
              >
                Prices
              </Link>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-gray-600">{session.email}</span>
            <LogoutButton />
          </div>
        </nav>
      </header>

      <main className="flex-1 py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">
            Energy Prices
          </h1>
          {params.connected === "true" && <ConnectedBanner />}
          {params.error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4">
              <p className="text-red-800">{params.error}</p>
            </div>
          )}
          <PriceChart />
        </div>
      </main>
    </div>
  );
}
