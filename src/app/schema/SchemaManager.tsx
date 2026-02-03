"use client";

import { useState, useEffect } from "react";

interface Charger {
  id: number;
  name: string;
  charger_id: string;
  brand: string;
}

interface Schema {
  id: number;
  charger_id: number;
  max_price: string;
  enabled: boolean;
  updated_at: string;
  charger_name: string;
  easee_charger_id: string;
  brand: string;
}

interface Slot {
  startsAt: string;
  price: number;
  level: string;
  active: boolean;
}

interface Schedule {
  schemaId: number;
  chargerId: number;
  chargerName: string;
  maxPrice: number;
  enabled: boolean;
  slots: Slot[];
  summary: {
    activeSlots: number;
    totalSlots: number;
    activeHours: number;
    totalHours: number;
    cheapestPrice: number;
    mostExpensivePrice: number;
  };
}

interface ApplyResult {
  schemaId: number;
  chargerName: string;
  easeeChargerId: string;
  currentPrice: number;
  maxPrice: number;
  shouldCharge: boolean;
  action: "start" | "pause" | "none";
  actionResult: "success" | "error" | "skipped";
  message: string;
}

interface ApplyResponse {
  results: ApplyResult[];
  currentPrice: number;
  timestamp: string;
}

interface AutomationStatus {
  active: boolean;
  cronApiKey?: string;
  doConfigured: boolean;
  triggerName?: string;
  namespaceId?: string;
}

function formatTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDate(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleDateString([], {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export default function SchemaManager() {
  const [chargers, setChargers] = useState<Charger[]>([]);
  const [schemas, setSchemas] = useState<Schema[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Form state
  const [selectedCharger, setSelectedCharger] = useState<number | "">("");
  const [maxPrice, setMaxPrice] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  // Apply state
  const [applying, setApplying] = useState(false);
  const [applyResults, setApplyResults] = useState<ApplyResponse | null>(null);
  const [applyError, setApplyError] = useState("");

  // Automation state
  const [automationStatus, setAutomationStatus] =
    useState<AutomationStatus | null>(null);
  const [automationLoading, setAutomationLoading] = useState(false);
  const [automationError, setAutomationError] = useState("");
  const [doToken, setDoToken] = useState("");
  const [appUrl, setAppUrl] = useState("");
  const [showDoSetup, setShowDoSetup] = useState(false);

  useEffect(() => {
    loadData();
    loadAutomationStatus();
  }, []);

  async function loadData() {
    setLoading(true);
    setError("");
    try {
      const [chargersRes, schemasRes] = await Promise.all([
        fetch("/api/chargers"),
        fetch("/api/schemas"),
      ]);

      if (chargersRes.ok) {
        const chargersData = await chargersRes.json();
        setChargers(chargersData.chargers || chargersData);
      }
      if (schemasRes.ok) {
        const schemasData = await schemasRes.json();
        setSchemas(Array.isArray(schemasData) ? schemasData : []);
      }

      // Load schedules
      const scheduleRes = await fetch("/api/schemas/schedule");
      if (scheduleRes.ok) {
        const data = await scheduleRes.json();
        setSchedules(data.schedules || []);
      }
    } catch {
      setError("Failed to load data");
    } finally {
      setLoading(false);
    }
  }

  async function loadAutomationStatus() {
    try {
      const res = await fetch("/api/automation/status");
      if (res.ok) {
        const data = await res.json();
        setAutomationStatus(data);
      }
    } catch {
      // ignore
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveError("");

    try {
      const res = await fetch("/api/schemas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chargerId: selectedCharger,
          maxPrice: parseFloat(maxPrice),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSaveError(data.error || "Failed to save");
        return;
      }
      setSelectedCharger("");
      setMaxPrice("");
      await loadData();
    } catch {
      setSaveError("Failed to connect to server");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(schemaId: number, enabled: boolean) {
    try {
      await fetch("/api/schemas", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schemaId, enabled }),
      });
      await loadData();
    } catch {
      // ignore
    }
  }

  async function handleDelete(schemaId: number) {
    try {
      await fetch("/api/schemas", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schemaId }),
      });
      await loadData();
    } catch {
      // ignore
    }
  }

  async function handleApply() {
    setApplying(true);
    setApplyError("");
    setApplyResults(null);
    try {
      const res = await fetch("/api/schemas/apply", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setApplyError(data.error || "Failed to apply schemas");
        return;
      }
      setApplyResults(data);
    } catch {
      setApplyError("Failed to connect to server");
    } finally {
      setApplying(false);
    }
  }

  async function handleSetupAutomation(e: React.FormEvent) {
    e.preventDefault();
    setAutomationLoading(true);
    setAutomationError("");
    try {
      const res = await fetch("/api/automation/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ doApiToken: doToken, appUrl }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAutomationError(data.error || "Failed to set up automation");
        return;
      }
      setDoToken("");
      setShowDoSetup(false);
      setAutomationStatus(data);
    } catch {
      setAutomationError("Failed to connect to server");
    } finally {
      setAutomationLoading(false);
    }
  }

  async function handleStopAutomation() {
    setAutomationLoading(true);
    setAutomationError("");
    try {
      const res = await fetch("/api/automation/stop", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setAutomationError(data.error || "Failed to stop automation");
        return;
      }
      setAutomationStatus(data);
    } catch {
      setAutomationError("Failed to connect to server");
    } finally {
      setAutomationLoading(false);
    }
  }

  async function handleDeleteAutomation() {
    if (!confirm("Delete the automation? This will remove the DigitalOcean Function and all settings.")) return;
    setAutomationLoading(true);
    setAutomationError("");
    try {
      const res = await fetch("/api/automation/delete", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setAutomationError(data.error || "Failed to delete automation");
        return;
      }
      setAutomationStatus(data);
    } catch {
      setAutomationError("Failed to connect to server");
    } finally {
      setAutomationLoading(false);
    }
  }

  // Chargers that don't have a schema yet
  const availableChargers = chargers.filter(
    (c) => !schemas.some((s) => s.charger_id === c.id)
  );

  const hasEnabledSchemas = schemas.some((s) => s.enabled);

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-8">
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-8 text-center">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  if (chargers.length === 0) {
    return (
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
            d="M12 9v2m0 4h.01M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
          />
        </svg>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          No Chargers Found
        </h2>
        <p className="text-gray-600">
          Add a charger on the{" "}
          <a
            href="/account"
            className="text-green-600 hover:text-green-700 underline"
          >
            Chargers page
          </a>{" "}
          first before creating a charging schema.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Add / Edit Schema Form */}
      {availableChargers.length > 0 && (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Add Charging Schema
          </h2>
          <form
            onSubmit={handleSave}
            className="flex flex-col sm:flex-row gap-4 items-end"
          >
            <div className="flex-1">
              <label
                htmlFor="charger-select"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Charger
              </label>
              <select
                id="charger-select"
                value={selectedCharger}
                onChange={(e) =>
                  setSelectedCharger(
                    e.target.value ? parseInt(e.target.value) : ""
                  )
                }
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none text-gray-900 bg-white"
              >
                <option value="">Select a charger</option>
                {availableChargers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name || c.charger_id} ({c.brand})
                  </option>
                ))}
              </select>
            </div>
            <div className="w-full sm:w-48">
              <label
                htmlFor="max-price"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Max price (&euro;/kWh)
              </label>
              <input
                id="max-price"
                type="number"
                step="0.0001"
                min="0.0001"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                placeholder="e.g. 0.25"
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none text-gray-900"
              />
            </div>
            <button
              type="submit"
              disabled={saving || !selectedCharger || !maxPrice}
              className="px-6 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            >
              {saving ? "Saving..." : "Add Schema"}
            </button>
          </form>
          {saveError && (
            <p className="mt-3 text-sm text-red-600">{saveError}</p>
          )}
        </div>
      )}

      {/* Apply & Automation */}
      {hasEnabledSchemas && (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Apply to Easee
              </h2>
              <p className="text-sm text-gray-500">
                Check the current price and start or pause your chargers
                accordingly.
              </p>
            </div>
            <button
              onClick={handleApply}
              disabled={applying}
              className="flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {applying ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  Applying...
                </>
              ) : (
                <>
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
                      d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  Apply Now
                </>
              )}
            </button>
          </div>

          {applyError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-red-700">{applyError}</p>
            </div>
          )}

          {applyResults && (
            <div className="space-y-3 mb-6">
              <div className="text-sm text-gray-500">
                Current price:{" "}
                <span className="font-semibold text-gray-900">
                  &euro;{applyResults.currentPrice.toFixed(4)}/kWh
                </span>
                <span className="mx-2">&middot;</span>
                Applied at{" "}
                {new Date(applyResults.timestamp).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })}
              </div>
              {applyResults.results.map((r) => (
                <div
                  key={r.schemaId}
                  className={`flex items-start gap-3 p-3 rounded-lg border ${
                    r.actionResult === "success"
                      ? "bg-green-50 border-green-200"
                      : r.actionResult === "error"
                        ? "bg-red-50 border-red-200"
                        : "bg-gray-50 border-gray-200"
                  }`}
                >
                  <div
                    className={`mt-0.5 h-5 w-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                      r.actionResult === "success"
                        ? "bg-green-500"
                        : r.actionResult === "error"
                          ? "bg-red-500"
                          : "bg-gray-400"
                    }`}
                  >
                    {r.actionResult === "success" ? (
                      <svg
                        className="h-3 w-3 text-white"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={3}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    ) : r.actionResult === "error" ? (
                      <svg
                        className="h-3 w-3 text-white"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={3}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    ) : (
                      <svg
                        className="h-3 w-3 text-white"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={3}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M20 12H4"
                        />
                      </svg>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {r.chargerName}
                    </p>
                    <p className="text-sm text-gray-600">{r.message}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Automation Section */}
          <div className="border-t border-gray-200 pt-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-semibold text-gray-700">
                  Automated Scheduling (every 15 min)
                </h3>
                <p className="text-xs text-gray-500">
                  Uses DigitalOcean Functions to automatically apply your schemas every 15 minutes.
                </p>
              </div>
              {automationStatus?.active && (
                <span className="flex items-center gap-1.5 text-xs font-medium text-green-700 bg-green-50 px-2.5 py-1 rounded-full">
                  <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                  Active
                </span>
              )}
            </div>

            {automationError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-3">
                <p className="text-sm text-red-700">{automationError}</p>
              </div>
            )}

            {automationStatus?.active ? (
              <div className="space-y-3">
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <p className="text-sm text-green-800">
                    Your schemas are being applied automatically every 15 minutes via DigitalOcean Functions.
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleStopAutomation}
                    disabled={automationLoading}
                    className="flex items-center gap-2 px-4 py-2 bg-yellow-500 text-white text-sm font-medium rounded-lg hover:bg-yellow-600 transition-colors disabled:opacity-50"
                  >
                    {automationLoading ? (
                      <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent" />
                    ) : (
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    )}
                    Pause Automation
                  </button>
                  <button
                    onClick={handleDeleteAutomation}
                    disabled={automationLoading}
                    className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white text-sm font-medium rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50"
                  >
                    {automationLoading ? (
                      <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent" />
                    ) : (
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    )}
                    Delete Automation
                  </button>
                </div>
              </div>
            ) : automationStatus && !automationStatus.active && automationStatus.doConfigured ? (
              <div className="space-y-3">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <p className="text-sm text-yellow-800">
                    Automation is paused. Click below to re-enable it.
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={async () => {
                      setAutomationLoading(true);
                      setAutomationError("");
                      try {
                        const res = await fetch("/api/automation/resume", { method: "POST" });
                        const data = await res.json();
                        if (!res.ok) {
                          setAutomationError(data.error || "Failed to resume");
                          return;
                        }
                        setAutomationStatus(data);
                      } catch {
                        setAutomationError("Failed to connect to server");
                      } finally {
                        setAutomationLoading(false);
                      }
                    }}
                    disabled={automationLoading}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                  >
                    {automationLoading ? (
                      <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent" />
                    ) : (
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                      </svg>
                    )}
                    Resume Automation
                  </button>
                  <button
                    onClick={handleDeleteAutomation}
                    disabled={automationLoading}
                    className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white text-sm font-medium rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50"
                  >
                    {automationLoading ? (
                      <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent" />
                    ) : (
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    )}
                    Delete Automation
                  </button>
                </div>
              </div>
            ) : showDoSetup ? (
              <form onSubmit={handleSetupAutomation} className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    DigitalOcean API Token
                  </label>
                  <input
                    type="password"
                    value={doToken}
                    onChange={(e) => setDoToken(e.target.value)}
                    placeholder="dop_v1_..."
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none text-gray-900"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Create a token at{" "}
                    <a
                      href="https://cloud.digitalocean.com/account/api/tokens"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-green-600 hover:text-green-700 underline"
                    >
                      DigitalOcean API Settings
                    </a>
                    {" "}with read/write access to Functions.
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Application URL
                  </label>
                  <input
                    type="url"
                    value={appUrl}
                    onChange={(e) => setAppUrl(e.target.value)}
                    placeholder="https://your-app.vercel.app"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none text-gray-900"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    The public URL where this app is hosted. The DO Function will call this URL.
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={automationLoading || !doToken || !appUrl}
                    className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                  >
                    {automationLoading ? "Setting up..." : "Set Up Automation"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowDoSetup(false)}
                    className="px-4 py-2 text-gray-600 text-sm font-medium hover:text-gray-800"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <button
                onClick={() => setShowDoSetup(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Set Up Automated Scheduling
              </button>
            )}
          </div>
        </div>
      )}

      {/* Existing Schemas with Schedules */}
      {schemas.length === 0 ? (
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
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            No Schemas Yet
          </h2>
          <p className="text-gray-600">
            Create a charging schema above to automatically schedule charging
            based on electricity prices.
          </p>
        </div>
      ) : (
        schemas.map((schema) => {
          const schedule = schedules.find((s) => s.schemaId === schema.id);
          return (
            <SchemaCard
              key={schema.id}
              schema={schema}
              schedule={schedule}
              onToggle={handleToggle}
              onDelete={handleDelete}
            />
          );
        })
      )}
    </div>
  );
}

function SchemaCard({
  schema,
  schedule,
  onToggle,
  onDelete,
}: {
  schema: Schema;
  schedule?: Schedule;
  onToggle: (id: number, enabled: boolean) => void;
  onDelete: (id: number) => void;
}) {
  const [editPrice, setEditPrice] = useState("");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/schemas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chargerId: schema.charger_id,
          maxPrice: parseFloat(editPrice),
        }),
      });
      if (res.ok) {
        setEditing(false);
        window.location.reload();
      }
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  }

  // Group slots by day
  const slotsByDay: Record<string, Slot[]> = {};
  if (schedule) {
    for (const slot of schedule.slots) {
      const day = formatDate(slot.startsAt);
      if (!slotsByDay[day]) slotsByDay[day] = [];
      slotsByDay[day].push(slot);
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 bg-green-100 rounded-lg flex items-center justify-center">
              <svg
                className="h-6 w-6 text-green-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                {schema.charger_name || schema.easee_charger_id}
              </h3>
              <p className="text-sm text-gray-500">{schema.brand}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Toggle */}
            <button
              onClick={() => onToggle(schema.id, !schema.enabled)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                schema.enabled ? "bg-green-600" : "bg-gray-300"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  schema.enabled ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
            {/* Delete */}
            <button
              onClick={() => onDelete(schema.id)}
              className="text-gray-400 hover:text-red-600 transition-colors"
              title="Delete schema"
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
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Max Price */}
        <div className="mt-4 flex items-center gap-4">
          {editing ? (
            <form onSubmit={handleUpdate} className="flex items-center gap-2">
              <input
                type="number"
                step="0.0001"
                min="0.0001"
                value={editPrice}
                onChange={(e) => setEditPrice(e.target.value)}
                className="w-32 px-3 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none text-gray-900"
              />
              <span className="text-sm text-gray-500">&euro;/kWh</span>
              <button
                type="submit"
                disabled={saving}
                className="px-3 py-1 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="px-3 py-1 text-gray-600 text-sm hover:text-gray-800"
              >
                Cancel
              </button>
            </form>
          ) : (
            <>
              <div className="bg-green-50 px-3 py-1.5 rounded-lg">
                <span className="text-sm text-gray-500">Max price: </span>
                <span className="text-sm font-semibold text-green-700">
                  &euro;{parseFloat(schema.max_price).toFixed(4)}/kWh
                </span>
              </div>
              <button
                onClick={() => {
                  setEditPrice(parseFloat(schema.max_price).toFixed(4));
                  setEditing(true);
                }}
                className="text-sm text-green-600 hover:text-green-700 font-medium"
              >
                Edit
              </button>
            </>
          )}
        </div>

        {/* Summary */}
        {schedule && (
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="text-center p-2 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500">Active</p>
              <p className="text-lg font-bold text-green-600">
                {schedule.summary.activeHours.toFixed(1)}h
                <span className="text-sm font-normal text-gray-400">
                  /{schedule.summary.totalHours.toFixed(1)}h
                </span>
              </p>
            </div>
            <div className="text-center p-2 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500">Inactive</p>
              <p className="text-lg font-bold text-red-500">
                {(schedule.summary.totalHours - schedule.summary.activeHours).toFixed(1)}h
              </p>
            </div>
            <div className="text-center p-2 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500">Cheapest</p>
              <p className="text-lg font-bold text-gray-900">
                &euro;{schedule.summary.cheapestPrice.toFixed(4)}
              </p>
            </div>
            <div className="text-center p-2 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500">Most Expensive</p>
              <p className="text-lg font-bold text-gray-900">
                &euro;{schedule.summary.mostExpensivePrice.toFixed(4)}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Schedule Timeline - 15 minute slots */}
      {schedule && schedule.slots.length > 0 && (
        <div className="p-6">
          <h4 className="text-sm font-semibold text-gray-700 mb-4">
            Charging Schedule (15-min intervals)
          </h4>
          {Object.entries(slotsByDay).map(([day, slots]) => (
            <div key={day} className="mb-4 last:mb-0">
              <p className="text-xs font-medium text-gray-500 mb-2">{day}</p>
              <div className="flex gap-px">
                {slots.map((slot, i) => {
                  const now = new Date();
                  const slotStart = new Date(slot.startsAt);
                  const slotEnd = new Date(
                    slotStart.getTime() + 15 * 60 * 1000
                  );
                  const isNow = now >= slotStart && now < slotEnd;

                  return (
                    <div
                      key={i}
                      className="group relative flex-1"
                      title={`${formatTime(slot.startsAt)}: €${slot.price.toFixed(4)}/kWh — ${slot.active ? "Charging" : "Paused"}`}
                    >
                      <div
                        className={`h-8 transition-all ${
                          i === 0 ? "rounded-l-sm" : ""
                        } ${i === slots.length - 1 ? "rounded-r-sm" : ""} ${
                          slot.active
                            ? "bg-green-500 hover:bg-green-600"
                            : "bg-red-300 hover:bg-red-400"
                        } ${isNow ? "ring-2 ring-offset-1 ring-gray-900" : ""}`}
                      />
                      {/* Show time label every hour (every 4th slot) */}
                      <span className="text-[10px] text-gray-400 block text-center mt-0.5 leading-tight">
                        {i % 4 === 0 ? formatTime(slot.startsAt) : ""}
                      </span>

                      {/* Tooltip */}
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                        <div className="bg-gray-900 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap shadow-lg">
                          <p className="font-medium">
                            {formatTime(slot.startsAt)}
                          </p>
                          <p>&euro;{slot.price.toFixed(4)}/kWh</p>
                          <p
                            className={
                              slot.active ? "text-green-400" : "text-red-400"
                            }
                          >
                            {slot.active ? "Charging" : "Paused"}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              {/* Legend for this row */}
              <div className="flex gap-4 mt-1.5 text-[10px] text-gray-500">
                <div className="flex items-center gap-1">
                  <div className="w-2.5 h-2.5 rounded-sm bg-green-500" />
                  Charging
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2.5 h-2.5 rounded-sm bg-red-300" />
                  Paused
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* No schedule available */}
      {!schedule && (
        <div className="p-6 text-center text-sm text-gray-500">
          {schema.enabled
            ? "Connect Tibber on the Prices page to see the charging schedule."
            : "Schema is disabled. Enable it to see the charging schedule."}
        </div>
      )}
    </div>
  );
}
