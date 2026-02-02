"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import AddChargerModal from "./AddChargerModal";

interface Charger {
  id: number;
  brand: string;
  name: string;
  charger_id: string | null;
  created_at: string;
}

export default function ChargerList() {
  const [chargers, setChargers] = useState<Charger[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  async function loadChargers() {
    try {
      const response = await fetch("/api/chargers");
      const data = await response.json();
      if (response.ok) {
        setChargers(data.chargers || []);
      }
    } catch (error) {
      console.error("Failed to load chargers:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadChargers();
  }, []);

  function handleChargerAdded() {
    loadChargers();
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-8">
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
        </div>
      </div>
    );
  }

  return (
    <>
      {chargers.length === 0 ? (
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
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              No chargers connected yet
            </h2>
            <p className="text-gray-600 mb-8">
              Connect your home charger to monitor and control it.
            </p>

            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center justify-center gap-3 bg-green-600 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:bg-green-700 transition-colors shadow-lg hover:shadow-xl"
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
              Add Charger
            </button>

            <div className="mt-8 pt-8 border-t border-gray-200">
              <p className="text-sm text-gray-500">
                Supported brands: <span className="font-medium">Easee</span>
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Charger Cards */}
          <div className="grid gap-4 md:grid-cols-2">
            {chargers.map((charger) => (
              <Link
                key={charger.id}
                href={`/account/chargers/${charger.id}`}
                className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow cursor-pointer block"
              >
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden">
                    <Image
                      src={`/brands/${charger.brand.toLowerCase()}.svg`}
                      alt={charger.brand}
                      width={48}
                      height={48}
                      className="object-contain"
                    />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {charger.name}
                    </h3>
                    <p className="text-gray-600">{charger.brand}</p>
                    {charger.charger_id && (
                      <p className="text-sm text-gray-400">
                        ID: {charger.charger_id}
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

          {/* Add Another Charger Button */}
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="w-full bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow border-2 border-dashed border-gray-300 hover:border-green-500 group"
          >
            <div className="flex items-center justify-center gap-3 text-gray-500 group-hover:text-green-600">
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
              <span className="font-semibold">Add Another Charger</span>
            </div>
          </button>
        </div>
      )}

      <AddChargerModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onChargerAdded={handleChargerAdded}
      />
    </>
  );
}
