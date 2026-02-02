"use client";

import { useState } from "react";
import Image from "next/image";

interface AddVehicleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVehicleAdded: () => void;
}

type Step = "brands" | "login" | "naming";

interface ZeekrVehicle {
  vin: string;
  model: string;
}

export default function AddVehicleModal({
  isOpen,
  onClose,
  onVehicleAdded,
}: AddVehicleModalProps) {
  const [step, setStep] = useState<Step>("brands");
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [region, setRegion] = useState<"EU" | "SEA">("EU");
  const [nickname, setNickname] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Store connection data between steps
  const [connectionData, setConnectionData] = useState<{
    encryptedToken?: string;
    encryptedRefreshToken?: string;
    userId?: string;
    vehicles?: ZeekrVehicle[];
  } | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<ZeekrVehicle | null>(
    null
  );

  const brands = [
    {
      id: "zeekr",
      name: "Zeekr",
      logo: "/brands/zeekr.svg",
      available: true,
    },
  ];

  function handleClose() {
    setStep("brands");
    setSelectedBrand(null);
    setEmail("");
    setPassword("");
    setNickname("");
    setError("");
    setConnectionData(null);
    setSelectedVehicle(null);
    onClose();
  }

  function handleBrandSelect(brandId: string) {
    setSelectedBrand(brandId);
    setStep("login");
    setError("");
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/vehicles/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brand: selectedBrand,
          email,
          password,
          region,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to connect");
        return;
      }

      setConnectionData({
        encryptedToken: data.encryptedToken,
        encryptedRefreshToken: data.encryptedRefreshToken,
        userId: data.userId,
        vehicles: data.vehicles,
      });

      // If vehicles found, select the first one
      if (data.vehicles && data.vehicles.length > 0) {
        setSelectedVehicle(data.vehicles[0]);
      }

      setStep("naming");
    } catch {
      setError("Connection failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/vehicles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brand: selectedBrand,
          model: selectedVehicle?.model,
          nickname,
          vin: selectedVehicle?.vin,
          encryptedToken: connectionData?.encryptedToken,
          encryptedRefreshToken: connectionData?.encryptedRefreshToken,
          region,
          externalUserId: connectionData?.userId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to save vehicle");
        return;
      }

      onVehicleAdded();
      handleClose();
    } catch {
      setError("Failed to save. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-semibold text-gray-900">
            {step === "brands" && "Add Vehicle"}
            {step === "login" && `Connect ${selectedBrand}`}
            {step === "naming" && "Name Your Vehicle"}
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 p-1"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm">
              {error}
            </div>
          )}

          {/* Step 1: Brand Selection */}
          {step === "brands" && (
            <div>
              <p className="text-gray-600 mb-6">
                Select your vehicle brand to connect
              </p>
              <div className="grid grid-cols-2 gap-4">
                {brands.map((brand) => (
                  <button
                    key={brand.id}
                    onClick={() =>
                      brand.available && handleBrandSelect(brand.id)
                    }
                    disabled={!brand.available}
                    className={`p-6 border-2 rounded-xl flex flex-col items-center gap-3 transition-all ${
                      brand.available
                        ? "hover:border-blue-500 hover:bg-blue-50 cursor-pointer"
                        : "opacity-50 cursor-not-allowed"
                    }`}
                  >
                    <div className="w-16 h-16 relative flex items-center justify-center">
                      <Image
                        src={brand.logo}
                        alt={brand.name}
                        width={64}
                        height={64}
                        className="object-contain"
                      />
                    </div>
                    <span className="font-medium text-gray-900">
                      {brand.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Login */}
          {step === "login" && (
            <form onSubmit={handleLogin} className="space-y-4">
              <p className="text-gray-600 mb-4">
                Enter your Zeekr account credentials
              </p>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Region
                </label>
                <select
                  value={region}
                  onChange={(e) => setRegion(e.target.value as "EU" | "SEA")}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                >
                  <option value="EU">Europe</option>
                  <option value="SEA">Southeast Asia / Australia</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  placeholder="your-zeekr-email@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  placeholder="Your Zeekr password"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setStep("brands")}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? "Connecting..." : "Connect"}
                </button>
              </div>
            </form>
          )}

          {/* Step 3: Naming */}
          {step === "naming" && (
            <form onSubmit={handleSave} className="space-y-4">
              <p className="text-gray-600 mb-4">
                Connection successful! Give your vehicle a name.
              </p>

              {connectionData?.vehicles && connectionData.vehicles.length > 1 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Select Vehicle
                  </label>
                  <select
                    value={selectedVehicle?.vin || ""}
                    onChange={(e) => {
                      const vehicle = connectionData.vehicles?.find(
                        (v) => v.vin === e.target.value
                      );
                      setSelectedVehicle(vehicle || null);
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  >
                    {connectionData.vehicles.map((v) => (
                      <option key={v.vin} value={v.vin}>
                        {v.model} ({v.vin.slice(-6)})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Vehicle Name
                </label>
                <input
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  placeholder="e.g., 001, My Zeekr, Family Car"
                />
                <p className="text-sm text-gray-500 mt-1">
                  This name will help you identify your vehicle
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setStep("login")}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading || !nickname}
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? "Saving..." : "Save Vehicle"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
