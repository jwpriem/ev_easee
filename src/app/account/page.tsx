import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/session";
import LogoutButton from "./LogoutButton";
import ChargerList from "./ChargerList";

export default async function AccountPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="bg-white shadow-sm">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold text-green-600">
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
          <h1 className="text-3xl font-bold text-gray-900 mb-8">My Chargers</h1>
          <ChargerList />
        </div>
      </main>
    </div>
  );
}
