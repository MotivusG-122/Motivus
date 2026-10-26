import { DashboardPage, Metric, Panel } from "@/components/dashboard-page";

export default function RouteAnalysisPage() {
  return (
    <DashboardPage
      title="Route Analysis"
      description="Review planned routes, distance estimates and future route optimization results."
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Metric label="Planned Distance" value="— km" note="Requires route data" />
        <Metric label="Estimated Travel Time" value="—" note="Requires routing service" />
        <Metric label="Route Deviations" value="—" note="Requires actual movement data" />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Panel title="Route Overview">
          <div className="flex min-h-64 items-center justify-center rounded-lg border border-dashed border-slate-700 bg-slate-900/60 p-6 text-center">
            <div>
              <p className="text-lg font-semibold text-slate-300">Route map not connected</p>
              <p className="mt-2 text-sm text-slate-500">
                Routes can be plotted after pickup locations, destination coordinates and a routing provider are confirmed.
              </p>
            </div>
          </div>
        </Panel>

        <Panel title="Route Comparison">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-700 text-slate-400">
                <tr>
                  <th className="p-3">Route</th>
                  <th className="p-3">Distance</th>
                  <th className="p-3">ETA</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td colSpan={3} className="p-6 text-center text-slate-500">
                    No verified route calculations available.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </Panel>
      </div>
    </DashboardPage>
  );
}
