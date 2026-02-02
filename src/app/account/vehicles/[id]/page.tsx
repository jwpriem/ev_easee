"use client";

import { useState, useEffect, use } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface VehicleStatus {
  batteryLevel: number;
  range: number;
  isCharging: boolean;
  isLocked: boolean;
  odometer: number;
  lastUpdated: string;
  location?: {
    latitude: number;
    longitude: number;
  };
  chargingStatus?: {
    isPluggedIn: boolean;
    chargingPower: number;
    timeToFullCharge: number;
    chargeLimit: number;
  };
}

interface Vehicle {
  id: number;
  brand: string;
  model: string | null;
  nickname: string;
  vin: string | null;
}

interface VehicleData {
  vehicle: Vehicle;
  status: VehicleStatus | null;
  message?: string;
}

export default function VehicleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [data, setData] = useState<VehicleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  async function loadVehicleStatus() {
    try {
      const response = await fetch(
        `/api/vehicles/${resolvedParams.id}/status`
      );

      if (response.status === 401) {
        router.push("/login");
        return;
      }

      if (response.status === 404) {
        setError("Vehicle not found");
        return;
      }

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || "Failed to load vehicle");
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
    loadVehicleStatus();
  }, [resolvedParams.id]);

  function handleRefresh() {
    setRefreshing(true);
    loadVehicleStatus();
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <header className="bg-white shadow-sm">
          <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center">
            <Link href="/account" className="text-2xl font-bold text-blue-600">
              EV Easee
            </Link>
          </nav>
        </header>
        <main className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <header className="bg-white shadow-sm">
          <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center">
            <Link href="/account" className="text-2xl font-bold text-blue-600">
              EV Easee
            </Link>
          </nav>
        </header>
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-red-600 mb-4">{error}</p>
            <Link
              href="/account"
              className="text-blue-600 hover:underline"
            >
              Back to vehicles
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const { vehicle, status, message } = data || {};

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="bg-white shadow-sm">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/account" className="text-2xl font-bold text-blue-600">
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
            Back to vehicles
          </Link>
        </nav>
      </header>

      <main className="flex-1 py-8 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Vehicle Header */}
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 bg-gray-100 rounded-xl flex items-center justify-center">
                <Image
                  src={`/brands/${vehicle?.brand.toLowerCase()}.svg`}
                  alt={vehicle?.brand || "Vehicle"}
                  width={64}
                  height={64}
                  className="object-contain"
                />
              </div>
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-gray-900">
                  {vehicle?.nickname}
                </h1>
                <p className="text-gray-600">
                  {vehicle?.brand} {vehicle?.model || ""}
                </p>
                {vehicle?.vin && (
                  <p className="text-sm text-gray-400 mt-1">
                    VIN: {vehicle.vin}
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
                  className={`h-5 w-5 text-gray-600 ${
                    refreshing ? "animate-spin" : ""
                  }`}
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
              {/* Battery & Range */}
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Battery & Range
                </h2>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-gray-600">Battery Level</span>
                      <span className="font-semibold text-gray-900">
                        {status.batteryLevel}%
                      </span>
                    </div>
                    <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all ${
                          status.batteryLevel > 20
                            ? "bg-green-500"
                            : "bg-red-500"
                        }`}
                        style={{ width: `${status.batteryLevel}%` }}
                      />
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Estimated Range</span>
                    <span className="font-semibold text-gray-900">
                      {status.range} km
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Odometer</span>
                    <span className="font-semibold text-gray-900">
                      {status.odometer.toLocaleString()} km
                    </span>
                  </div>
                </div>
              </div>

              {/* Status */}
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Status
                </h2>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Charging</span>
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium ${
                        status.isCharging
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {status.isCharging ? "Charging" : "Not Charging"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Lock Status</span>
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium ${
                        status.isLocked
                          ? "bg-green-100 text-green-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {status.isLocked ? "Locked" : "Unlocked"}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Last Updated</span>
                    <span className="text-gray-500">
                      {new Date(status.lastUpdated).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Charging Details */}
              {status.chargingStatus && (
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">
                    Charging Details
                  </h2>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Plugged In</span>
                      <span className="font-semibold text-gray-900">
                        {status.chargingStatus.isPluggedIn ? "Yes" : "No"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Charging Power</span>
                      <span className="font-semibold text-gray-900">
                        {status.chargingStatus.chargingPower} kW
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Time to Full</span>
                      <span className="font-semibold text-gray-900">
                        {Math.floor(
                          status.chargingStatus.timeToFullCharge / 60
                        )}
                        h{" "}
                        {status.chargingStatus.timeToFullCharge % 60}m
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Charge Limit</span>
                      <span className="font-semibold text-gray-900">
                        {status.chargingStatus.chargeLimit}%
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Location */}
              {status.location && (
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">
                    Location
                  </h2>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Latitude</span>
                      <span className="font-semibold text-gray-900">
                        {status.location.latitude.toFixed(6)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Longitude</span>
                      <span className="font-semibold text-gray-900">
                        {status.location.longitude.toFixed(6)}
                      </span>
                    </div>
                  </div>
                </div>
              )}
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
                  d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                No Status Available
              </h2>
              <p className="text-gray-600">
                Unable to fetch vehicle status. The connection may need to be
                refreshed.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
