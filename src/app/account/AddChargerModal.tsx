"use client";

import { useState } from "react";
import Image from "next/image";

interface AddChargerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onChargerAdded: () => void;
}

type Step = "brands" | "login" | "select";

interface EaseeCharger {
  id: string;
  name: string;
}

export default function AddChargerModal({
  isOpen,
  onClose,
  onChargerAdded,
}: AddChargerModalProps) {
  const [step, setStep] = useState<Step>("brands");
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Store connection data between steps
  const [connectionData, setConnectionData] = useState<{
    encryptedAccessToken?: string;
    encryptedRefreshToken?: string;
    chargers?: EaseeCharger[];
  } | null>(null);
  const [selectedCharger, setSelectedCharger] = useState<EaseeCharger | null>(null);
  const [customName, setCustomName] = useState("");

  const brands = [
    {
      id: "easee",
      name: "Easee",
      logo: "/brands/easee.svg",
      available: true,
    },
  ];

  function handleClose() {
    setStep("brands");
    setSelectedBrand(null);
    setUsername("");
    setPassword("");
    setCustomName("");
    setError("");
    setConnectionData(null);
    setSelectedCharger(null);
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
      const response = await fetch("/api/chargers/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brand: selectedBrand,
          username,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to connect");
        return;
      }

      setConnectionData({
        encryptedAccessToken: data.encryptedAccessToken,
        encryptedRefreshToken: data.encryptedRefreshToken,
        chargers: data.chargers,
      });

      // If chargers found, select the first one
      if (data.chargers && data.chargers.length > 0) {
        setSelectedCharger(data.chargers[0]);
        setCustomName(data.chargers[0].name || "My Easee Charger");
      } else {
        setCustomName("My Easee Charger");
      }

      setStep("select");
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
      const response = await fetch("/api/chargers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brand: selectedBrand,
          name: customName,
          chargerId: selectedCharger?.id,
          encryptedAccessToken: connectionData?.encryptedAccessToken,
          encryptedRefreshToken: connectionData?.encryptedRefreshToken,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to save charger");
        return;
      }

      onChargerAdded();
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
            {step === "brands" && "Add Charger"}
            {step === "login" && `Connect to ${selectedBrand}`}
            {step === "select" && "Select Charger"}
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
                Select your charger brand to connect
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
                        ? "hover:border-green-500 hover:bg-green-50 cursor-pointer"
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
                Enter your Easee account credentials
              </p>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number or Email
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                  placeholder="+31612345678 or email@example.com"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Use your phone number with country code (e.g., +31...) or email
                </p>
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
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                  placeholder="Your Easee password"
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
                  className="flex-1 bg-green-600 text-white py-2 rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50"
                >
                  {loading ? "Connecting..." : "Connect"}
                </button>
              </div>
            </form>
          )}

          {/* Step 3: Select Charger */}
          {step === "select" && (
            <form onSubmit={handleSave} className="space-y-4">
              <p className="text-gray-600 mb-4">
                Connection successful! Select and name your charger.
              </p>

              {connectionData?.chargers && connectionData.chargers.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Select Charger
                  </label>
                  <select
                    value={selectedCharger?.id || ""}
                    onChange={(e) => {
                      const charger = connectionData.chargers?.find(
                        (c) => c.id === e.target.value
                      );
                      setSelectedCharger(charger || null);
                      if (charger?.name) {
                        setCustomName(charger.name);
                      }
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                  >
                    {connectionData.chargers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name || c.id}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Charger Name
                </label>
                <input
                  type="text"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                  placeholder="e.g., Home Charger, Garage"
                />
                <p className="text-sm text-gray-500 mt-1">
                  This name will help you identify your charger
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
                  disabled={loading || !customName}
                  className="flex-1 bg-green-600 text-white py-2 rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50"
                >
                  {loading ? "Saving..." : "Save Charger"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
