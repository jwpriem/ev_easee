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
    activeHours: number;
    totalHours: number;
    cheapestPrice: number;
    mostExpensivePrice: number;
  };
}

function formatTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDate(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleDateString([], { weekday: "short", day: "numeric", month: "short" });
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

  useEffect(() => {
    loadData();
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
        setChargers(await chargersRes.json());
      }
      if (schemasRes.ok) {
        setSchemas(await schemasRes.json());
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

  // Chargers that don't have a schema yet
  const availableChargers = chargers.filter(
    (c) => !schemas.some((s) => s.charger_id === c.id)
  );

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
          <a href="/account" className="text-green-600 hover:text-green-700 underline">
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
          <form onSubmit={handleSave} className="flex flex-col sm:flex-row gap-4 items-end">
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
                onChange={(e) => setSelectedCharger(e.target.value ? parseInt(e.target.value) : "")}
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
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
              <p className="text-xs text-gray-500">Active Hours</p>
              <p className="text-lg font-bold text-green-600">
                {schedule.summary.activeHours}
                <span className="text-sm font-normal text-gray-400">
                  /{schedule.summary.totalHours}
                </span>
              </p>
            </div>
            <div className="text-center p-2 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500">Inactive Hours</p>
              <p className="text-lg font-bold text-red-500">
                {schedule.summary.totalHours - schedule.summary.activeHours}
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

      {/* Schedule Timeline */}
      {schedule && schedule.slots.length > 0 && (
        <div className="p-6">
          <h4 className="text-sm font-semibold text-gray-700 mb-4">
            Charging Schedule
          </h4>
          {Object.entries(slotsByDay).map(([day, slots]) => (
            <div key={day} className="mb-4 last:mb-0">
              <p className="text-xs font-medium text-gray-500 mb-2">{day}</p>
              <div className="flex gap-0.5">
                {slots.map((slot, i) => {
                  const now = new Date();
                  const slotStart = new Date(slot.startsAt);
                  const slotEnd = new Date(slotStart.getTime() + 60 * 60 * 1000);
                  const isNow = now >= slotStart && now < slotEnd;

                  return (
                    <div
                      key={i}
                      className="group relative flex-1"
                      title={`${formatTime(slot.startsAt)}: €${slot.price.toFixed(4)}/kWh — ${slot.active ? "Charging" : "Paused"}`}
                    >
                      <div
                        className={`h-8 rounded-sm transition-all ${
                          slot.active
                            ? "bg-green-500 hover:bg-green-600"
                            : "bg-red-300 hover:bg-red-400"
                        } ${isNow ? "ring-2 ring-offset-1 ring-gray-900" : ""}`}
                      />
                      <span className="text-[10px] text-gray-400 block text-center mt-0.5 leading-tight">
                        {i % 3 === 0 ? formatTime(slot.startsAt) : ""}
                      </span>

                      {/* Tooltip */}
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                        <div className="bg-gray-900 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap shadow-lg">
                          <p className="font-medium">{formatTime(slot.startsAt)}</p>
                          <p>&euro;{slot.price.toFixed(4)}/kWh</p>
                          <p className={slot.active ? "text-green-400" : "text-red-400"}>
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
