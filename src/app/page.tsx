import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white shadow-sm">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center">
            <span className="text-2xl font-bold text-green-600">EV Easee</span>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-gray-600 hover:text-gray-900 font-medium"
            >
              Login
            </Link>
            <Link
              href="/signup"
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 font-medium"
            >
              Sign Up
            </Link>
          </div>
        </nav>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-4">
        <div className="text-center max-w-3xl">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Manage Your Home Charger
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Connect and monitor your EV home charger in one place. Track your
            charging sessions, power usage, and optimize your charging experience.
          </p>
          <Link
            href="/signup"
            className="inline-block bg-green-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-green-700 transition-colors"
          >
            Get Started
          </Link>
        </div>
      </main>

      <footer className="bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 text-center text-gray-500">
          <p>&copy; 2024 EV Easee. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
