"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import AddVehicleModal from "./AddVehicleModal";

interface Vehicle {
  id: number;
  brand: string;
  model: string | null;
  nickname: string;
  vin: string | null;
  region: string;
  created_at: string;
}

export default function VehicleList() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  async function loadVehicles() {
    try {
      const response = await fetch("/api/vehicles");
      const data = await response.json();
      if (response.ok) {
        setVehicles(data.vehicles || []);
      }
    } catch (error) {
      console.error("Failed to load vehicles:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadVehicles();
  }, []);

  function handleVehicleAdded() {
    loadVehicles();
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-8">
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <>
      {vehicles.length === 0 ? (
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
              onClick={() => setIsModalOpen(true)}
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
      ) : (
        <div className="space-y-6">
          {/* Vehicle Cards */}
          <div className="grid gap-4 md:grid-cols-2">
            {vehicles.map((vehicle) => (
              <Link
                key={vehicle.id}
                href={`/account/vehicles/${vehicle.id}`}
                className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow cursor-pointer block"
              >
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden">
                    <Image
                      src={`/brands/${vehicle.brand.toLowerCase()}.svg`}
                      alt={vehicle.brand}
                      width={48}
                      height={48}
                      className="object-contain"
                    />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {vehicle.nickname}
                    </h3>
                    <p className="text-gray-600">
                      {vehicle.brand} {vehicle.model || ""}
                    </p>
                    {vehicle.vin && (
                      <p className="text-sm text-gray-400">
                        VIN: ...{vehicle.vin.slice(-6)}
                      </p>
                    )}
                  </div>
                  <svg
                    className="h-5 w-5 text-gray-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </div>
              </Link>
            ))}
          </div>

          {/* Add Another Vehicle Button */}
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="w-full bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow border-2 border-dashed border-gray-300 hover:border-blue-500 group"
          >
            <div className="flex items-center justify-center gap-3 text-gray-500 group-hover:text-blue-600">
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
              <span className="font-semibold">Add Another Vehicle</span>
            </div>
          </button>
        </div>
      )}

      <AddVehicleModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onVehicleAdded={handleVehicleAdded}
      />
    </>
  );
}
