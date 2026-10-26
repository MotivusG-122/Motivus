
"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { DashboardPage, Metric, Panel } from "@/components/dashboard-page";

const API = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

type Vehicle = {
  id: number;
  vehicle_code: string;
  registration_number: string | null;
  driver_name: string | null;
  payload_capacity_kg: number;
  availability_status: string;
  is_active: boolean;
};

type DashboardData = {
  vehicles: Vehicle[];
};

const inputClass =
  "mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-blue-500";

export default function VehiclesBatteriesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [form, setForm] = useState({
    vehicle_code: "",
    registration_number: "",
    driver_name: "",
    payload_capacity_kg: "",
    availability_status: "AVAILABLE",
  });

  const loadVehicles = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${API}/api/v1/dashboard`, {
        credentials: "include",
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(
          response.status === 401 || response.status === 403
            ? "Please log in first, then refresh this page."
            : `Could not load vehicles (HTTP ${response.status}).`,
        );
      }

      const data: DashboardData = await response.json();
      setVehicles(data.vehicles ?? []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load vehicles.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void (async () => {
      await loadVehicles();
    })();
  }, [loadVehicles]);

  function updateField(
    field: keyof typeof form,
    value: string,
  ) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(`${API}/api/v1/vehicles`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          vehicle_code: form.vehicle_code.trim(),
          registration_number: form.registration_number.trim().toUpperCase(),
          driver_name: form.driver_name.trim(),
          payload_capacity_kg: Number(form.payload_capacity_kg),
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        const detail = data?.detail;
        throw new Error(
          typeof detail === "string"
            ? detail
            : `Could not save vehicle (HTTP ${response.status}).`,
        );
      }

      setForm({
        vehicle_code: "",
        registration_number: "",
        driver_name: "",
        payload_capacity_kg: "",
        availability_status: "AVAILABLE",
      });

      setMessage("Vehicle added successfully.");
      await loadVehicles();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save vehicle.");
    } finally {
      setSaving(false);
    }
  }

  const availableCount = vehicles.filter(
    (vehicle) =>
      vehicle.is_active &&
      vehicle.availability_status.toUpperCase() === "AVAILABLE",
  ).length;

  return (
    <DashboardPage
      title="Vehicles & Batteries"
      description="Manage fleet records, vehicle capacity and battery master data."
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Metric
          label="Total Vehicles"
          value={loading ? "…" : String(vehicles.length)}
          note="From PostgreSQL records"
        />
        <Metric
          label="Available Vehicles"
          value={loading ? "…" : String(availableCount)}
          note="Active vehicles marked available"
        />
        <Metric
          label="Battery Types"
          value="—"
          note="Verified master data required"
        />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Panel title="Add Vehicle">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm text-slate-300">
                Vehicle Code
                <input
                  className={inputClass}
                  value={form.vehicle_code}
                  onChange={(e) => updateField("vehicle_code", e.target.value)}
                  placeholder="e.g. VEH-001"
                  maxLength={50}
                  required
                />
              </label>

              <label className="block text-sm text-slate-300">
                Registration Number
                <input
                  className={inputClass}
                  value={form.registration_number}
                  onChange={(e) =>
                    updateField("registration_number", e.target.value)
                  }
                  placeholder="e.g. UP14AB1234"
                  maxLength={30}
                  required
                />
              </label>

              <label className="block text-sm text-slate-300">
                Driver Name
                <input
                  className={inputClass}
                  value={form.driver_name}
                  onChange={(e) => updateField("driver_name", e.target.value)}
                  placeholder="Enter driver name"
                  maxLength={100}
                  required
                />
              </label>

              <label className="block text-sm text-slate-300">
                Payload Capacity (kg)
                <input
                  className={inputClass}
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={form.payload_capacity_kg}
                  onChange={(e) =>
                    updateField("payload_capacity_kg", e.target.value)
                  }
                  placeholder="e.g. 2500"
                  required
                />
              </label>

              <label className="block text-sm text-slate-300 sm:col-span-2">
                Availability Status
                <select
                  className={inputClass}
                  value={form.availability_status}
                  onChange={(e) =>
                    updateField("availability_status", e.target.value)
                  }
                >
                  <option value="AVAILABLE">Available</option>
                  <option value="IN_USE">In Use</option>
                  <option value="MAINTENANCE">Maintenance</option>
                  <option value="UNAVAILABLE">Unavailable</option>
                </select>
              </label>
            </div>

            {error && (
              <p role="alert" className="text-sm text-red-400">
                {error}
              </p>
            )}

            {message && (
              <p role="status" className="text-sm text-emerald-400">
                {message}
              </p>
            )}

            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Saving…" : "Add Vehicle"}
            </button>
          </form>
        </Panel>

        <Panel title="Battery Master Data">
          <div className="rounded-lg border border-dashed border-slate-700 p-6 text-center">
            <p className="font-medium text-slate-300">
              Battery records not connected
            </p>
            <p className="mt-2 text-sm text-slate-500">
              Battery type, quantity and verified weight will be added after
              company data is received.
            </p>
          </div>
        </Panel>
      </div>

      <div className="mt-6">
        <Panel title="Vehicle Registry">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-slate-700 text-slate-400">
                <tr>
                  <th className="p-3">Vehicle Code</th>
                  <th className="p-3">Registration</th>
                  <th className="p-3">Driver Name</th>
                  <th className="p-3">Capacity (kg)</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-slate-400">
                      Loading vehicles…
                    </td>
                  </tr>
                ) : vehicles.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-slate-500">
                      No vehicle records found.
                    </td>
                  </tr>
                ) : (
                  vehicles.map((vehicle) => (
                    <tr
                      key={vehicle.id}
                      className="border-b border-slate-800 last:border-0"
                    >
                      <td className="p-3 text-white">{vehicle.vehicle_code}</td>
                      <td className="p-3 text-slate-300">
                        {vehicle.registration_number || "—"}
                      </td>
                      <td className="p-3 text-slate-300">
                        {vehicle.driver_name || "—"}
                      </td>
                      <td className="p-3 text-slate-300">
                        {Number(vehicle.payload_capacity_kg).toLocaleString()}
                      </td>
                      <td className="p-3 text-slate-300">
                        {vehicle.availability_status.replaceAll("_", " ")}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <button
            type="button"
            onClick={() => void loadVehicles()}
            disabled={loading}
            className="mt-4 rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 disabled:opacity-60"
          >
            Refresh vehicles
          </button>
        </Panel>
      </div>
    </DashboardPage>
  );
}

