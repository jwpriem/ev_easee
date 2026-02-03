import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/session";
import LogoutButton from "../account/LogoutButton";
import SchemaManager from "./SchemaManager";

export default async function SchemaPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

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
                className="text-gray-600 hover:text-gray-900 font-medium"
              >
                Prices
              </Link>
              <Link
                href="/schema"
                className="text-green-600 font-medium"
              >
                Schema
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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Charging Schema
          </h1>
          <p className="text-gray-600 mb-8">
            Set a maximum electricity price per charger. The system will
            calculate when your charger should be active based on Tibber prices.
          </p>
          <SchemaManager />
        </div>
      </main>
    </div>
  );
}
