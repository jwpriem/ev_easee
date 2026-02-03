"use client";

import { useState } from "react";

export default function ConnectedBanner() {
  const [visible, setVisible] = useState(true);

  if (!visible) return null;

  return (
    <div className="mb-6 bg-green-50 border border-green-200 rounded-xl p-4 flex items-center justify-between">
      <p className="text-green-800 font-medium">
        Tibber account connected successfully!
      </p>
      <button
        onClick={() => setVisible(false)}
        className="text-green-600 hover:text-green-800"
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
