"use client";

import { useState, useEffect, useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from "recharts";

interface TibberPrice {
  total: number;
  energy: number;
  tax: number;
  startsAt: string;
  level: string;
}

type Resolution = "60" | "15";

function getLevelColor(level: string): string {
  switch (level) {
    case "VERY_CHEAP":
      return "#16a34a";
    case "CHEAP":
      return "#65a30d";
    case "NORMAL":
      return "#ca8a04";
    case "EXPENSIVE":
      return "#ea580c";
    case "VERY_EXPENSIVE":
      return "#dc2626";
    default:
      return "#6b7280";
  }
}

function formatTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function interpolateTo15Min(prices: TibberPrice[]): TibberPrice[] {
  if (prices.length === 0) return [];
  const result: TibberPrice[] = [];
  for (let i = 0; i < prices.length; i++) {
    const current = prices[i];
    const startTime = new Date(current.startsAt);
    for (let q = 0; q < 4; q++) {
      const slotTime = new Date(startTime.getTime() + q * 15 * 60 * 1000);
      result.push({
        total: current.total,
        energy: current.energy,
        tax: current.tax,
        startsAt: slotTime.toISOString(),
        level: current.level,
      });
    }
  }
  return result;
}

interface ChartEntry {
  time: string;
  price: number;
  level: string;
  startsAt: string;
  isNow: boolean;
}

export default function PriceChart() {
  const [todayPrices, setTodayPrices] = useState<TibberPrice[]>([]);
  const [tomorrowPrices, setTomorrowPrices] = useState<TibberPrice[]>([]);
  const [resolution, setResolution] = useState<Resolution>("60");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchPrices() {
      try {
        const response = await fetch("/api/prices");
        const data = await response.json();

        if (!response.ok) {
          setError(data.error || "Failed to fetch prices");
          return;
        }

        setTodayPrices(data.today || []);
        setTomorrowPrices(data.tomorrow || []);
      } catch {
        setError("Failed to connect to server");
      } finally {
        setLoading(false);
      }
    }

    fetchPrices();
  }, []);

  const chartData = useMemo(() => {
    const allPrices = [...todayPrices, ...tomorrowPrices];
    const prices = resolution === "15" ? interpolateTo15Min(allPrices) : allPrices;

    const now = new Date();

    return prices.map((p): ChartEntry => {
      const startTime = new Date(p.startsAt);
      const intervalMs = resolution === "15" ? 15 * 60 * 1000 : 60 * 60 * 1000;
      const endTime = new Date(startTime.getTime() + intervalMs);
      const isNow = now >= startTime && now < endTime;

      return {
        time: formatTime(p.startsAt),
        price: p.total,
        level: p.level,
        startsAt: p.startsAt,
        isNow,
      };
    });
  }, [todayPrices, tomorrowPrices, resolution]);

  const avgPrice = useMemo(() => {
    if (chartData.length === 0) return 0;
    return chartData.reduce((sum, d) => sum + d.price, 0) / chartData.length;
  }, [chartData]);

  const currentPrice = useMemo(() => {
    return chartData.find((d) => d.isNow);
  }, [chartData]);

  const minPrice = useMemo(() => {
    if (chartData.length === 0) return 0;
    return Math.min(...chartData.map((d) => d.price));
  }, [chartData]);

  const maxPrice = useMemo(() => {
    if (chartData.length === 0) return 0;
    return Math.max(...chartData.map((d) => d.price));
  }, [chartData]);

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
      <div className="bg-white rounded-xl shadow-lg p-8">
        <div className="text-center">
          <svg
            className="mx-auto h-12 w-12 text-red-400 mb-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"
            />
          </svg>
          <p className="text-red-600 mb-2 font-medium">
            Unable to load prices
          </p>
          <p className="text-gray-500 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (todayPrices.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-8 text-center">
        <p className="text-gray-600">No price data available.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-lg p-4">
          <p className="text-sm text-gray-500">Current Price</p>
          <p className="text-2xl font-bold text-gray-900">
            {currentPrice
              ? `€${currentPrice.price.toFixed(4)}`
              : "—"}
          </p>
          {currentPrice && (
            <span
              className="text-xs px-2 py-0.5 rounded-full mt-1 inline-block"
              style={{
                backgroundColor: getLevelColor(currentPrice.level) + "20",
                color: getLevelColor(currentPrice.level),
              }}
            >
              {currentPrice.level.replace("_", " ")}
            </span>
          )}
        </div>
        <div className="bg-white rounded-xl shadow-lg p-4">
          <p className="text-sm text-gray-500">Average</p>
          <p className="text-2xl font-bold text-gray-900">
            €{avgPrice.toFixed(4)}
          </p>
          <p className="text-xs text-gray-400">per kWh</p>
        </div>
        <div className="bg-white rounded-xl shadow-lg p-4">
          <p className="text-sm text-gray-500">Lowest</p>
          <p className="text-2xl font-bold text-green-600">
            €{minPrice.toFixed(4)}
          </p>
          <p className="text-xs text-gray-400">per kWh</p>
        </div>
        <div className="bg-white rounded-xl shadow-lg p-4">
          <p className="text-sm text-gray-500">Highest</p>
          <p className="text-2xl font-bold text-red-600">
            €{maxPrice.toFixed(4)}
          </p>
          <p className="text-xs text-gray-400">per kWh</p>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        {/* Resolution Selector */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900">
            Today{tomorrowPrices.length > 0 ? " & Tomorrow" : ""}
          </h2>
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setResolution("60")}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                resolution === "60"
                  ? "bg-white shadow text-gray-900"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              60 min
            </button>
            <button
              onClick={() => setResolution("15")}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                resolution === "15"
                  ? "bg-white shadow text-gray-900"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              15 min
            </button>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 mb-4 text-xs">
          {[
            { level: "VERY_CHEAP", label: "Very Cheap" },
            { level: "CHEAP", label: "Cheap" },
            { level: "NORMAL", label: "Normal" },
            { level: "EXPENSIVE", label: "Expensive" },
            { level: "VERY_EXPENSIVE", label: "Very Expensive" },
          ].map((item) => (
            <div key={item.level} className="flex items-center gap-1.5">
              <div
                className="w-3 h-3 rounded"
                style={{ backgroundColor: getLevelColor(item.level) }}
              />
              <span className="text-gray-600">{item.label}</span>
            </div>
          ))}
        </div>

        {/* Recharts Bar Chart */}
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
              <XAxis
                dataKey="time"
                tick={{ fontSize: 11, fill: "#6b7280" }}
                interval={resolution === "15" ? 7 : 1}
                tickLine={false}
                axisLine={{ stroke: "#e5e7eb" }}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#6b7280" }}
                tickFormatter={(value: number) => `€${value.toFixed(2)}`}
                tickLine={false}
                axisLine={false}
                width={60}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload as ChartEntry;
                    return (
                      <div className="bg-white shadow-lg rounded-lg p-3 border border-gray-200">
                        <p className="font-medium text-gray-900">
                          {data.time}
                          {data.isNow && (
                            <span className="ml-2 text-xs bg-green-100 text-green-800 px-1.5 py-0.5 rounded">
                              Now
                            </span>
                          )}
                        </p>
                        <p className="text-lg font-bold" style={{ color: getLevelColor(data.level) }}>
                          €{data.price.toFixed(4)}/kWh
                        </p>
                        <p className="text-xs text-gray-500">
                          {data.level.replace(/_/g, " ")}
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <ReferenceLine
                y={avgPrice}
                stroke="#9ca3af"
                strokeDasharray="4 4"
                label={{
                  value: "Avg",
                  position: "right",
                  fill: "#9ca3af",
                  fontSize: 11,
                }}
              />
              <Bar dataKey="price" radius={[2, 2, 0, 0]} maxBarSize={resolution === "15" ? 8 : 20}>
                {chartData.map((entry, index) => (
                  <Cell
                    key={index}
                    fill={getLevelColor(entry.level)}
                    opacity={entry.isNow ? 1 : 0.75}
                    stroke={entry.isNow ? "#000" : "none"}
                    strokeWidth={entry.isNow ? 2 : 0}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
