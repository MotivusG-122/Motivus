
"use client";

import { useCallback, useEffect, useState } from "react";
import { DashboardPage } from "@/components/dashboard-page";

const API =
    process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

type BRCLocation = {
    id: number;
    code: string;
    name: string;
    location_type: string;
    is_active: boolean;
};

type LocationsResponse = {
    locations: BRCLocation[];
};

type Movement = {
    id: number;
    movement_code: string;
    movement_type: string;
    source_location_id: number;
    source_location: string;
    destination_location_id: number;
    destination_location: string;
    vehicle_id: number | null;
    vehicle_code: string | null;
    movement_date: string;
    status: string;
    dispatched_at: string | null;
    received_at: string | null;
    notes: string | null;
    created_at: string;
    battery_count: number;
    received_battery_count: number;
};

function StatusBadge({ status }: { status: string }) {
    const colors: Record<string, string> = {
        DRAFT: "bg-slate-100 text-slate-700",
        DISPATCHED: "bg-blue-100 text-blue-700",
        PARTIALLY_RECEIVED: "bg-amber-100 text-amber-800",
        RECEIVED: "bg-emerald-100 text-emerald-700",
        CANCELLED: "bg-red-100 text-red-700",
    };

    return (
        <span
            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${colors[status] || "bg-slate-100 text-slate-700"
                }`}
        >
            {status.replaceAll("_", " ")}
        </span>
    );
}

export default function MovementsPage() {
    const [movements, setMovements] = useState<Movement[]>([]);
    const [locations, setLocations] = useState<BRCLocation[]>([]);

    const [loading, setLoading] = useState(true);
    const [locationsLoading, setLocationsLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [busyId, setBusyId] = useState<number | null>(null);

    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    const [locationsError, setLocationsError] = useState("");

    const [sourceId, setSourceId] = useState("");
    const [destinationId, setDestinationId] = useState("");
    const [batteryIds, setBatteryIds] = useState("1");
    const [movementDate, setMovementDate] = useState("");
    const [vehicleId, setVehicleId] = useState("");
    const [notes, setNotes] = useState("");

    const loadLocations = useCallback(async () => {


        try {
            const response = await fetch(`${API}/api/v1/locations`, {
                credentials: "include",
                cache: "no-store",
            });

            if (!response.ok) {
                if (response.status === 401 || response.status === 403) {
                    throw new Error(
                        "Session expired. Please log in again."
                    );
                }

                throw new Error(
                    `Unable to load BRC locations (HTTP ${response.status}).`
                );
            }

            const data: LocationsResponse = await response.json();

            // The eight BRCs are maintained in the database.
            // Only active BRC records are used in the dropdowns.
            const brcs = Array.isArray(data.locations)
                ? data.locations.filter(
                    (location) =>
                        location.location_type === "BRC" &&
                        location.is_active
                )
                : [];

            setLocations(brcs);

            setSourceId((current) =>
                brcs.some((location) => String(location.id) === current)
                    ? current
                    : String(brcs[0]?.id ?? "")
            );

            setDestinationId((current) =>
                brcs.some((location) => String(location.id) === current)
                    ? current
                    : String(
                        brcs.find(
                            (location) =>
                                String(location.id) !==
                                String(brcs[0]?.id ?? "")
                        )?.id ?? ""
                    )
            );
        } catch (err) {
            setLocationsError(
                err instanceof Error
                    ? err.message
                    : "Failed to load BRC locations."
            );
        } finally {
            setLocationsLoading(false);
        }
    }, []);

    const loadMovements = useCallback(async () => {
        try {
            setError("");

            const response = await fetch(`${API}/api/v1/movements`, {
                credentials: "include",
                cache: "no-store",
            });

            if (!response.ok) {
                if (response.status === 401 || response.status === 403) {
                    throw new Error(
                        "Session expired. Please log in again."
                    );
                }

                throw new Error(
                    `Could not load movements (HTTP ${response.status}).`
                );
            }

            const data = await response.json();
            setMovements(data.movements ?? []);
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Failed to load movements."
            );
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const timeoutId = window.setTimeout(() => {
            void loadLocations();
            void loadMovements();

            const today = new Date();
            const year = today.getFullYear();
            const month = String(today.getMonth() + 1).padStart(2, "0");
            const day = String(today.getDate()).padStart(2, "0");

            setMovementDate(`${year}-${month}-${day}`);
        }, 0);

        return () => window.clearTimeout(timeoutId);
    }, [loadLocations, loadMovements]);

    async function createMovement(
        event: React.FormEvent<HTMLFormElement>
    ) {
        event.preventDefault();
        setError("");
        setMessage("");

        const ids = batteryIds
            .split(",")
            .map((value) => Number(value.trim()))
            .filter(
                (value) => Number.isInteger(value) && value > 0
            );

        if (locationsLoading || locations.length === 0) {
            setError("BRC locations load hone ka wait karo.");
            return;
        }

        if (
            !locations.some((location) => String(location.id) === sourceId) ||
            !locations.some(
                (location) => String(location.id) === destinationId
            )
        ) {
            setError("Valid source aur destination BRC select karo.");
            return;
        }

        if (Number(sourceId) === Number(destinationId)) {
            setError("Source aur destination alag hone chahiye.");
            return;
        }

        if (ids.length === 0) {
            setError("Kam se kam ek valid Battery ID enter karo.");
            return;
        }

        if (new Set(ids).size !== ids.length) {
            setError("Duplicate Battery IDs allowed nahi hain.");
            return;
        }

        if (vehicleId.trim() && (
            !Number.isInteger(Number(vehicleId)) ||
            Number(vehicleId) <= 0
        )) {
            setError("Valid Vehicle ID enter karo.");
            return;
        }

        setSubmitting(true);

        try {
            const response = await fetch(`${API}/api/v1/movements`, {
                method: "POST",
                credentials: "include",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    movement_type: "BRC_TO_BRC",
                    source_location_id: Number(sourceId),
                    destination_location_id: Number(destinationId),
                    vehicle_id: vehicleId.trim()
                        ? Number(vehicleId)
                        : null,
                    movement_date: movementDate,
                    battery_ids: ids,
                    notes: notes.trim() || null,
                }),
            });

            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
                const detail =
                    typeof data.detail === "string"
                        ? data.detail
                        : data.detail?.message ||
                        JSON.stringify(data.detail || data);

                throw new Error(
                    detail ||
                    `Create failed (HTTP ${response.status}).`
                );
            }

            setMessage(
                `Movement ${data.movement_code || `ID ${data.id ?? ""}`
                } created successfully.`
            );

            setBatteryIds("");
            setVehicleId("");
            setNotes("");

            await loadMovements();
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Movement create failed."
            );
        } finally {
            setSubmitting(false);
        }
    }

    async function runAction(
        id: number,
        action: "dispatch" | "receive"
    ) {
        setError("");
        setMessage("");
        setBusyId(id);

        try {
            const response = await fetch(
                `${API}/api/v1/movements/${id}/${action}`,
                {
                    method: "POST",
                    credentials: "include",
                }
            );

            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
                const detail =
                    typeof data.detail === "string"
                        ? data.detail
                        : data.detail?.message ||
                        JSON.stringify(data.detail || data);

                throw new Error(
                    detail ||
                    `${action} failed (HTTP ${response.status}).`
                );
            }

            setMessage(
                `Movement #${id}: ${action === "dispatch" ? "dispatched" : "received"
                } successfully.`
            );

            await loadMovements();
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : `Could not ${action} movement.`
            );
        } finally {
            setBusyId(null);
        }
    }

    return (
        <DashboardPage
            title="Movement Management"
            description="Create, dispatch and track battery movements between BRC locations."
        >
            <div className="space-y-6">
                {error && (
                    <div
                        role="alert"
                        className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
                    >
                        {error}
                    </div>
                )}

                {message && (
                    <div
                        role="status"
                        className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700"
                    >
                        {message}
                    </div>
                )}

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div className="rounded-2xl border border-slate-200 bg-white p-5">
                        <p className="text-sm text-slate-500">
                            Total movements
                        </p>
                        <p className="mt-2 text-3xl font-bold text-slate-900">
                            {movements.length}
                        </p>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-5">
                        <p className="text-sm text-slate-500">In transit</p>
                        <p className="mt-2 text-3xl font-bold text-blue-700">
                            {
                                movements.filter(
                                    (movement) =>
                                        movement.status === "DISPATCHED" ||
                                        movement.status === "PARTIALLY_RECEIVED"
                                ).length
                            }
                        </p>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-5">
                        <p className="text-sm text-slate-500">Completed</p>
                        <p className="mt-2 text-3xl font-bold text-emerald-700">
                            {
                                movements.filter(
                                    (movement) =>
                                        movement.status === "RECEIVED"
                                ).length
                            }
                        </p>
                    </div>
                </div>

                <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
                    <div className="mb-5">
                        <h2 className="text-lg font-bold text-slate-900">
                            Create movement
                        </h2>
                        <p className="mt-1 text-sm text-slate-500">
                            Abhi BRC-to-BRC movement supported hai. Battery
                            IDs comma se separate karo.
                        </p>
                    </div>

                    {locationsError && (
                        <div
                            role="alert"
                            className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"
                        >
                            {locationsError}
                            <button
                                type="button"
                                onClick={() => void loadLocations()}
                                className="ml-2 font-semibold underline"
                            >
                                Retry
                            </button>
                        </div>
                    )}

                    <form
                        onSubmit={createMovement}
                        className="grid grid-cols-1 gap-4 md:grid-cols-2"
                    >
                        <label className="block text-sm font-medium text-slate-700">
                            Source BRC
                            <select
                                value={sourceId}
                                onChange={(event) =>
                                    setSourceId(event.target.value)
                                }
                                className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5"
                                disabled={
                                    locationsLoading ||
                                    locations.length === 0
                                }
                                required
                            >
                                {locationsLoading ? (
                                    <option value="">
                                        Loading BRC locations...
                                    </option>
                                ) : locations.length === 0 ? (
                                    <option value="">
                                        No BRC locations available
                                    </option>
                                ) : (
                                    locations.map((location) => (
                                        <option
                                            key={location.id}
                                            value={location.id}
                                        >
                                            {location.name}
                                        </option>
                                    ))
                                )}
                            </select>
                        </label>

                        <label className="block text-sm font-medium text-slate-700">
                            Destination BRC
                            <select
                                value={destinationId}
                                onChange={(event) =>
                                    setDestinationId(event.target.value)
                                }
                                className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5"
                                disabled={
                                    locationsLoading ||
                                    locations.length < 2
                                }
                                required
                            >
                                {locationsLoading ? (
                                    <option value="">
                                        Loading BRC locations...
                                    </option>
                                ) : locations.length < 2 ? (
                                    <option value="">
                                        Need at least two BRC locations
                                    </option>
                                ) : (
                                    locations.map((location) => (
                                        <option
                                            key={location.id}
                                            value={location.id}
                                        >
                                            {location.name}
                                        </option>
                                    ))
                                )}
                            </select>
                        </label>

                        <label className="block text-sm font-medium text-slate-700">
                            Movement date
                            <input
                                type="date"
                                value={movementDate}
                                onChange={(event) =>
                                    setMovementDate(event.target.value)
                                }
                                className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5"
                                required
                            />
                        </label>

                        <label className="block text-sm font-medium text-slate-700">
                            Battery IDs
                            <input
                                value={batteryIds}
                                onChange={(event) =>
                                    setBatteryIds(event.target.value)
                                }
                                placeholder="Example: 1, 2, 3"
                                className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5"
                                required
                            />
                            <span className="mt-1 block text-xs font-normal text-slate-500">
                                Sirf existing, ACTIVE batteries jo source BRC
                                par hain.
                            </span>
                        </label>

                        <label className="block text-sm font-medium text-slate-700">
                            Vehicle ID (optional)
                            <input
                                type="number"
                                min="1"
                                value={vehicleId}
                                onChange={(event) =>
                                    setVehicleId(event.target.value)
                                }
                                placeholder="Leave blank if not assigned"
                                className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5"
                            />
                            <span className="mt-1 block text-xs font-normal text-slate-500">
                                Abhi database mein vehicles available nahi
                                hain.
                            </span>
                        </label>

                        <label className="block text-sm font-medium text-slate-700 md:col-span-2">
                            Notes (optional)
                            <textarea
                                value={notes}
                                onChange={(event) =>
                                    setNotes(event.target.value)
                                }
                                rows={3}
                                placeholder="Movement details..."
                                className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5"
                            />
                        </label>

                        <div className="md:col-span-2">
                            <button
                                type="submit"
                                disabled={
                                    submitting ||
                                    locationsLoading ||
                                    locations.length < 2
                                }
                                className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {submitting
                                    ? "Creating..."
                                    : "Create movement"}
                            </button>
                        </div>
                    </form>
                </section>

                <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-5">
                        <div>
                            <h2 className="text-lg font-bold text-slate-900">
                                Movement history
                            </h2>
                            <p className="mt-1 text-sm text-slate-500">
                                Latest movements and their current status.
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={() => void loadMovements()}
                            className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                        >
                            Refresh
                        </button>
                    </div>

                    {loading ? (
                        <p className="p-6 text-sm text-slate-500">
                            Loading movements...
                        </p>
                    ) : movements.length === 0 ? (
                        <p className="p-6 text-sm text-slate-500">
                            No movements found yet.
                        </p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[900px] text-left text-sm">
                                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                                    <tr>
                                        <th className="px-5 py-3">Movement</th>
                                        <th className="px-5 py-3">Route</th>
                                        <th className="px-5 py-3">Date</th>
                                        <th className="px-5 py-3">Batteries</th>
                                        <th className="px-5 py-3">Status</th>
                                        <th className="px-5 py-3">Actions</th>
                                    </tr>
                                </thead>

                                <tbody className="divide-y divide-slate-100">
                                    {movements.map((movement) => (
                                        <tr
                                            key={movement.id}
                                            className="hover:bg-slate-50/70"
                                        >
                                            <td className="px-5 py-4">
                                                <p className="font-semibold text-slate-900">
                                                    {movement.movement_code}
                                                </p>
                                                <p className="mt-1 text-xs text-slate-500">
                                                    ID: {movement.id}
                                                </p>
                                            </td>

                                            <td className="px-5 py-4">
                                                <p className="font-medium text-slate-800">
                                                    {movement.source_location}
                                                </p>
                                                <p className="my-1 text-xs text-slate-400">
                                                    ↓ to
                                                </p>
                                                <p className="font-medium text-slate-800">
                                                    {movement.destination_location}
                                                </p>
                                            </td>

                                            <td className="whitespace-nowrap px-5 py-4 text-slate-600">
                                                {String(
                                                    movement.movement_date
                                                ).slice(0, 10)}
                                            </td>

                                            <td className="px-5 py-4">
                                                <p className="font-semibold text-slate-800">
                                                    {movement.battery_count}
                                                </p>
                                                <p className="text-xs text-slate-500">
                                                    {movement.received_battery_count} received
                                                </p>
                                            </td>

                                            <td className="px-5 py-4">
                                                <StatusBadge
                                                    status={movement.status}
                                                />
                                            </td>

                                            <td className="px-5 py-4">
                                                <div className="flex gap-2">
                                                    {movement.status ===
                                                        "DRAFT" && (
                                                            <button
                                                                type="button"
                                                                disabled={
                                                                    busyId ===
                                                                    movement.id
                                                                }
                                                                onClick={() =>
                                                                    void runAction(
                                                                        movement.id,
                                                                        "dispatch"
                                                                    )
                                                                }
                                                                className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                                                            >
                                                                {busyId ===
                                                                    movement.id
                                                                    ? "Please wait..."
                                                                    : "Dispatch"}
                                                            </button>
                                                        )}

                                                    {(movement.status ===
                                                        "DISPATCHED" ||
                                                        movement.status ===
                                                        "PARTIALLY_RECEIVED") && (
                                                            <button
                                                                type="button"
                                                                disabled={
                                                                    busyId ===
                                                                    movement.id
                                                                }
                                                                onClick={() =>
                                                                    void runAction(
                                                                        movement.id,
                                                                        "receive"
                                                                    )
                                                                }
                                                                className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                                                            >
                                                                {busyId ===
                                                                    movement.id
                                                                    ? "Please wait..."
                                                                    : "Receive"}
                                                            </button>
                                                        )}

                                                    {movement.status ===
                                                        "RECEIVED" && (
                                                            <span className="text-xs text-slate-400">
                                                                Completed
                                                            </span>
                                                        )}

                                                    {movement.status ===
                                                        "CANCELLED" && (
                                                            <span className="text-xs text-slate-400">
                                                                No actions
                                                            </span>
                                                        )}
                                                </div>

                                                {movement.notes && (
                                                    <p className="mt-2 max-w-[220px] text-xs text-slate-500">
                                                        {movement.notes}
                                                    </p>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>
            </div>
        </DashboardPage>
    );
}
