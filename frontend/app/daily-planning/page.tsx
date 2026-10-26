
"use client";

import { useCallback, useEffect, useState } from "react";
import { DashboardPage, Metric, Panel } from "@/components/dashboard-page";

type BRCLocation = {
  id: number;
  code: string;
  name: string;
  location_type?: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
};

type LocationsResponse = {
  locations: BRCLocation[];
};

export default function DailyPlanningPage() {
  const [date, setDate] = useState("");
  const [fileName, setFileName] = useState("");
  const [brcs, setBrcs] = useState<BRCLocation[]>([]);
  const [loadingBrcs, setLoadingBrcs] = useState(true);
  const [brcError, setBrcError] = useState("");

  const API =
    process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

  const fetchBrcs = useCallback(async () => {
    setLoadingBrcs(true);
    setBrcError("");

    try {
      const response = await fetch(`${API}/api/v1/locations`, {
        method: "GET",
        credentials: "include",
        headers: { Accept: "application/json" },
      });

      if (response.status === 401) {
        throw new Error("Please log in to view BRC locations.");
      }

      if (!response.ok) {
        throw new Error(
          `Unable to load BRC locations (HTTP ${response.status}).`
        );
      }

      const data: LocationsResponse = await response.json();
      setBrcs(Array.isArray(data.locations) ? data.locations : []);
    } catch (error) {
      setBrcError(
        error instanceof Error
          ? error.message
          : "Something went wrong while loading BRC locations."
      );
    } finally {
      setLoadingBrcs(false);
    }
  }, [API]);

  useEffect(() => {
    void fetchBrcs();
  }, [fetchBrcs]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const now = new Date();
      const localDate = [
        now.getFullYear(),
        String(now.getMonth() + 1).padStart(2, "0"),
        String(now.getDate()).padStart(2, "0"),
      ].join("-");

      setDate(localDate);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  return (
    <DashboardPage
      title="Daily Planning"
      description="Manage BRC locations, select the operating date, and prepare the daily vehicle allocation plan."
    >
      {/* Summary metrics */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Metric
          label="BRC Locations"
          value={loadingBrcs ? "..." : String(brcs.length)}
          note="Active BRC locations loaded from database"
        />

        <Metric
          label="Planning Date"
          value={date || "—"}
          note="Selected operating date"
        />

        <Metric
          label="Excel Import"
          value="Pending"
          note="Import and validation are not connected yet"
        />
      </div>

      {/* Planning date and file selection */}
      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Panel title="1. Select Planning Date">
          <label
            htmlFor="planning-date"
            className="mb-2 block text-sm text-[#778399]"
          >
            Operating date
          </label>

          <input
            id="planning-date"
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            className="w-full rounded-lg border border-[#e3e8f0] bg-white p-3 text-[#17243a] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#26c995]"
          />

          <p className="mt-3 text-[#778399]">
            Selected date: {date || "Not selected"}
          </p>
        </Panel>

        <Panel title="2. Select Daily Excel File">
          <label
            htmlFor="daily-file"
            className="mb-3 block text-sm text-[#778399]"
          >
            Select an Excel or CSV file
          </label>

          <input
            id="daily-file"
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={(event) =>
              setFileName(event.target.files?.[0]?.name ?? "")
            }
            className="block w-full text-sm ttext-[#52627a] file:mr-3 file:rounded-lg file:border-0 file:bg-cyan-400 file:px-4 file:py-2 file:font-semibold file:text-slate-950"
          />

          {fileName && (
            <p className="mt-3 break-all text-sm text-cyan-300">
              Selected: {fileName}
            </p>
          )}

          <p className="mt-3 text-xs text-amber-300">
            File selection only. Excel/CSV import, validation, and
            database insertion will be implemented separately.
          </p>
        </Panel>
      </div>

      {/* BRC locations */}
      <div className="mt-6">
        <Panel title={`Fixed BRC Locations (${brcs.length})`}>
          {loadingBrcs ? (
            <div className="py-8 text-center text-sm text-[#778399]">
              Loading BRC locations...
            </div>
          ) : brcError ? (
            <div className="rounded-lg border border-red-900 bg-red-950/30 p-4">
              <p className="text-sm text-red-300">{brcError}</p>

              <button
                type="button"
                onClick={() => void fetchBrcs()}
                className="mt-3 rounded-lg bg-slate-700 px-4 py-2 text-sm font-semibold text-[#17243a] hover:bg-slate-600"
              >
                Retry
              </button>
            </div>
          ) : brcs.length === 0 ? (
            <div className="py-8 text-center text-sm text-[#778399]">
              No active BRC locations found in the database.
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {brcs.map((brc) => {
                const hasCoordinates =
                  brc.latitude !== null &&
                  brc.longitude !== null &&
                  Number.isFinite(Number(brc.latitude)) &&
                  Number.isFinite(Number(brc.longitude));

                const mapsUrl = hasCoordinates
                  ? `https://www.google.com/maps/search/?api=1&query=${brc.latitude},${brc.longitude}`
                  : null;

                return (
                  <article
                    key={brc.id}
                    className="rounded-xl border border-[#e3e8f0] bg-white p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="font-semibold text-[#17243a]">
                        {brc.name}
                      </h3>

                      <span className="shrink-0 rounded-md border border-cyan-900 bg-cyan-950/50 px-2 py-1 text-xs text-cyan-300">
                        BRC
                      </span>
                    </div>

                    <p className="mt-2 break-all text-xs text-[#778399]">
                      {brc.code}
                    </p>

                    <p className="mt-3 text-sm leading-6 text-[#778399]">
                      {brc.address || "Address not available"}
                    </p>

                    <div className="mt-4 border-t border-[#e3e8f0] pt-3">
                      <p className="text-xs text-[#778399]">
                        Coordinates
                      </p>

                      {hasCoordinates && mapsUrl ? (
                        <>
                          <p className="mt-1 text-[#52627a]">
                            {brc.latitude}, {brc.longitude}
                          </p>

                          <a
                            href={mapsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-3 inline-flex text-sm font-medium text-[#277a83] hover:text-[#17372e]"
                          >
                            View on Google Maps ↗
                          </a>
                        </>
                      ) : (
                        <p className="mt-1 text-sm text-amber-300">
                          Coordinates not available
                        </p>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          <p className="mt-4 text-xs text-[#778399]">
            Location details are fetched from the backend API. Locations
            without coordinates can still be displayed, but map-based
            route calculations require valid coordinates.
          </p>
        </Panel>
      </div>

      {/* Daily movement plan */}
      <div className="mt-6">
        <Panel title="Daily Movement Plan">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] text-left text-sm">
              <thead className="border-b border-slate-700 text-[#778399]">
                <tr>
                  <th className="p-3">Job ID</th>
                  <th className="p-3">Pickup / BRC</th>
                  <th className="p-3">Destination</th>
                  <th className="p-3">Vehicle</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>

              <tbody>
                <tr>
                  <td
                    colSpan={5}
                    className="p-8 text-center text-[#778399]"
                  >
                    No daily movement records loaded yet. Excel import
                    and job listing integration are pending.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <button
            type="button"
            disabled
            className="mt-5 cursor-not-allowed rounded-lg bg-slate-700 px-4 py-3 text-sm font-semibold text-[#778399]"
            title="Enable after daily jobs and planning integration"
          >
            Generate Vehicle Plan · Coming next
          </button>
        </Panel>
      </div>
    </DashboardPage>
  );
}
