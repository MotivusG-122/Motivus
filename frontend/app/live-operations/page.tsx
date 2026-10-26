import { DashboardPage, Metric, Panel } from "@/components/dashboard-page";
export default function LiveOperationsPage() {
  return (
    <DashboardPage
      title="Live Operations"
      description="Monitor trip execution, movement status and operational exceptions."
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Metric label="Active Trips" value="—" note="Waiting for operational data" />
        <Metric label="Delayed Trips" value="—" note="Requires planned and actual times" />
        <Metric label="Completed Stops" value="—" note="Calculated from trip events" />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Panel title="Vehicle Movement Map">
          <div className="flex min-h-64 items-center justify-center rounded-lg border border-dashed border-slate-700 bg-slate-900/60 p-6 text-center">
            <div>
              <p className="text-lg font-semibold text-slate-300">Map integration pending</p>
              <p className="mt-2 text-sm text-slate-500">
                Vehicle locations will appear after an authorized driver-phone or GPS source is connected.
              </p>
            </div>
          </div>
        </Panel>

        <Panel title="Trip Activity">
          <div className="space-y-3 text-sm text-slate-400">
            <p className="rounded-lg border border-slate-800 p-4">No trip events available.</p>
            <p className="text-xs text-slate-500">
              Arrival, departure, delay and deviation status will be shown when trip data is available.
            </p>
          </div>
        </Panel>
      </div>
    </DashboardPage>
  );
}
