import { DashboardPage, Metric, Panel } from "@/components/dashboard-page";

export default function ReportsPage() {
  return (
    <DashboardPage
      title="Reports & Analytics"
      description="Review daily movement coverage, fleet utilization and operational performance."
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Metric label="Jobs Completed" value="—" note="Requires completed job records" />
        <Metric label="On-Time Delivery" value="—" note="Requires planned and actual timestamps" />
        <Metric label="Vehicle Utilization" value="—" note="Requires capacity and load records" />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Panel title="Daily Performance">
          <div className="flex min-h-52 items-center justify-center rounded-lg border border-dashed border-slate-700 p-6 text-center text-sm text-slate-500">
            Charts will be generated after operational records are available.
          </div>
        </Panel>

        <Panel title="Available Reports">
          <div className="space-y-3 text-sm">
            {[
              "Daily pickup and delivery summary",
              "Vehicle allocation and utilization",
              "Pending and completed movements",
              "Planned versus actual kilometres",
            ].map((report) => (
              <div
                key={report}
                className="flex items-center justify-between gap-3 rounded-lg border border-slate-800 p-4"
              >
                <span className="text-slate-300">{report}</span>
                <span className="text-xs text-slate-500">Data pending</span>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </DashboardPage>
  );
}
