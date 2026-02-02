"use client";

import { useState, useEffect, use } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface ChargerStatus {
  isOnline: boolean;
  opMode: number;
  opModeText: string;
  totalPower: number;
  sessionEnergy: number;
  energyPerHour: number;
  voltage: number;
  outputCurrent: number;
  cableLocked: boolean;
  smartCharging: boolean;
  lastPulse: string;
  firmware: number;
}

interface Charger {
  id: number;
  brand: string;
  name: string;
  chargerId: string | null;
}

interface ChargerData {
  charger: Charger;
  status: ChargerStatus | null;
  message?: string;
}

export default function ChargerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [data, setData] = useState<ChargerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  async function loadChargerStatus() {
    try {
      const response = await fetch(
        `/api/chargers/${resolvedParams.id}/status`
      );

      if (response.status === 401) {
        router.push("/login");
        return;
      }

      if (response.status === 404) {
        setError("Charger not found");
        return;
      }

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || "Failed to load charger");
        return;
      }

      setData(result);
    } catch {
      setError("Failed to connect to server");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadChargerStatus();
  }, [resolvedParams.id]);

  function handleRefresh() {
    setRefreshing(true);
    loadChargerStatus();
  }

  function getStatusColor(opMode: number): string {
    switch (opMode) {
      case 1: return "bg-gray-100 text-gray-800"; // Disconnected
      case 2: return "bg-yellow-100 text-yellow-800"; // Awaiting Start
      case 3: return "bg-green-100 text-green-800"; // Charging
      case 4: return "bg-blue-100 text-blue-800"; // Completed
      case 5: return "bg-red-100 text-red-800"; // Error
      case 6: return "bg-cyan-100 text-cyan-800"; // Ready to Charge
      default: return "bg-gray-100 text-gray-800";
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <header className="bg-white shadow-sm">
          <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center">
            <Link href="/account" className="text-2xl font-bold text-green-600">
              EV Easee
            </Link>
          </nav>
        </header>
        <main className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <header className="bg-white shadow-sm">
          <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center">
            <Link href="/account" className="text-2xl font-bold text-green-600">
              EV Easee
            </Link>
          </nav>
        </header>
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-red-600 mb-4">{error}</p>
            <Link href="/account" className="text-green-600 hover:underline">
              Back to chargers
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const { charger, status, message } = data || {};

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="bg-white shadow-sm">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/account" className="text-2xl font-bold text-green-600">
            EV Easee
          </Link>
          <Link
            href="/account"
            className="text-gray-600 hover:text-gray-900 flex items-center gap-2"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back to chargers
          </Link>
        </nav>
      </header>

      <main className="flex-1 py-8 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Charger Header */}
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 bg-gray-100 rounded-xl flex items-center justify-center">
                <Image
                  src={`/brands/${charger?.brand.toLowerCase()}.svg`}
                  alt={charger?.brand || "Charger"}
                  width={64}
                  height={64}
                  className="object-contain"
                />
              </div>
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-gray-900">
                  {charger?.name}
                </h1>
                <p className="text-gray-600">{charger?.brand}</p>
                {charger?.chargerId && (
                  <p className="text-sm text-gray-400 mt-1">
                    ID: {charger.chargerId}
                  </p>
                )}
              </div>
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="p-3 rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-50"
                title="Refresh status"
              >
                <svg
                  className={`h-5 w-5 text-gray-600 ${refreshing ? "animate-spin" : ""}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
              </button>
            </div>
          </div>

          {message && !status && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6">
              <p className="text-yellow-800">{message}</p>
            </div>
          )}

          {status ? (
            <div className="grid gap-6 md:grid-cols-2">
              {/* Status Overview */}
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Status
                </h2>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Connection</span>
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium ${
                        status.isOnline
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {status.isOnline ? "Online" : "Offline"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Charging Status</span>
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(status.opMode)}`}
                    >
                      {status.opModeText}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Cable</span>
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium ${
                        status.cableLocked
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {status.cableLocked ? "Locked" : "Unlocked"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Smart Charging</span>
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium ${
                        status.smartCharging
                          ? "bg-blue-100 text-blue-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {status.smartCharging ? "Enabled" : "Disabled"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Power & Energy */}
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Power & Energy
                </h2>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Current Power</span>
                    <span className="font-semibold text-gray-900">
                      {status.totalPower.toFixed(2)} kW
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Session Energy</span>
                    <span className="font-semibold text-gray-900">
                      {status.sessionEnergy.toFixed(2)} kWh
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Energy per Hour</span>
                    <span className="font-semibold text-gray-900">
                      {status.energyPerHour.toFixed(2)} kWh/h
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Voltage</span>
                    <span className="font-semibold text-gray-900">
                      {status.voltage.toFixed(1)} V
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Output Current</span>
                    <span className="font-semibold text-gray-900">
                      {status.outputCurrent.toFixed(1)} A
                    </span>
                  </div>
                </div>
              </div>

              {/* Device Info */}
              <div className="bg-white rounded-xl shadow-lg p-6 md:col-span-2">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Device Information
                </h2>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Firmware Version</span>
                    <span className="font-semibold text-gray-900">
                      {status.firmware}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Last Communication</span>
                    <span className="font-semibold text-gray-900">
                      {status.lastPulse
                        ? new Date(status.lastPulse).toLocaleString()
                        : "Unknown"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-lg p-8 text-center">
              <svg
                className="mx-auto h-16 w-16 text-gray-400 mb-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                No Status Available
              </h2>
              <p className="text-gray-600">
                Unable to fetch charger status. The connection may need to be
                refreshed.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
