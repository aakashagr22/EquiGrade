"use client";

import { useState } from "react";
import { Save, Sliders, Bell, Shield, Loader2 } from "lucide-react";

export default function SettingsPage() {
  const [saving, setSaving] = useState(false);
  const [weights, setWeights] = useState({
    quality: 50,
    quantity: 30,
    consistency: 20,
  });
  const [notifications, setNotifications] = useState({
    flag_alerts: true,
    sync_complete: true,
    weekly_report: false,
  });

  const handleSave = async () => {
    setSaving(true);
    await new Promise((r) => setTimeout(r, 1000));
    setSaving(false);
  };

  const total = weights.quality + weights.quantity + weights.consistency;

  return (
    <>
      <h1 className="text-2xl font-bold mb-1">Settings</h1>
      <p className="text-sm text-[var(--text-secondary)] mb-8">
        Configure scoring weights and notification preferences
      </p>

      <div className="max-w-2xl space-y-8">
        {/* Scoring Weights */}
        <div className="glass-card p-6">
          <div className="flex items-center gap-2 mb-6">
            <Sliders className="w-5 h-5 text-[var(--primary-light)]" />
            <h2 className="text-lg font-semibold">Scoring Weights</h2>
          </div>

          <div className="space-y-5">
            {Object.entries(weights).map(([key, value]) => (
              <div key={key}>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium capitalize">{key}</label>
                  <span className="text-sm font-bold text-[var(--primary-light)]">
                    {value}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={value}
                  onChange={(e) =>
                    setWeights((p) => ({
                      ...p,
                      [key]: parseInt(e.target.value),
                    }))
                  }
                  className="w-full accent-[var(--primary)]"
                />
              </div>
            ))}
          </div>

          {total !== 100 && (
            <div className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400">
              ⚠ Weights must sum to 100%. Current total: {total}%
            </div>
          )}
          {total === 100 && (
            <div className="mt-4 p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-xs text-green-400">
              ✓ Weights are balanced (total: 100%)
            </div>
          )}
        </div>

        {/* Notifications */}
        <div className="glass-card p-6">
          <div className="flex items-center gap-2 mb-6">
            <Bell className="w-5 h-5 text-[var(--primary-light)]" />
            <h2 className="text-lg font-semibold">Notifications</h2>
          </div>

          <div className="space-y-4">
            {[
              { key: "flag_alerts", label: "Suspicious Behavior Alerts", desc: "Get notified when flags are detected" },
              { key: "sync_complete", label: "Sync Completion", desc: "Notified when data sync finishes" },
              { key: "weekly_report", label: "Weekly Summary Report", desc: "Receive weekly progress summaries" },
            ].map((item) => (
              <div
                key={item.key}
                className="flex items-center justify-between p-3 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)]"
              >
                <div>
                  <div className="text-sm font-medium">{item.label}</div>
                  <div className="text-xs text-[var(--text-muted)]">{item.desc}</div>
                </div>
                <button
                  onClick={() =>
                    setNotifications((p) => ({
                      ...p,
                      [item.key]: !p[item.key as keyof typeof p],
                    }))
                  }
                  className={`w-11 h-6 rounded-full transition-all relative ${
                    notifications[item.key as keyof typeof notifications]
                      ? "bg-[var(--primary)]"
                      : "bg-[var(--bg-card)]"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${
                      notifications[item.key as keyof typeof notifications]
                        ? "left-[22px]"
                        : "left-0.5"
                    }`}
                  />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Save */}
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving || total !== 100}
            className="btn btn-primary disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" /> Save Settings
              </>
            )}
          </button>
        </div>
      </div>
    </>
  );
}
