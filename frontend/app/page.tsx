
"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import "./globals.css";

const API =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

type User = {
  id: number | string;
  full_name: string;
  email: string;
  role: string;
  is_active: boolean;
};

type JobStatus = "Planned" | "In Transit" | "Completed" | "Unassigned";

type Job = {
  id: string;
  type: "Pickup" | "Delivery";
  from: string;
  to: string;
  batteries: number;
  weight: number;
  status: JobStatus;
  vehicle: string;
};

type ApiDashboard = {
  source: string;
  planning_status: string;
  metrics: {
    total_jobs: number;
    total_vehicles: number;
    active_vehicles: number;
    unassigned_jobs: number;
    completed_jobs: number;
  };
  vehicles: {
    id: number;
    vehicle_code: string;
    registration_number: string;
    driver_name: string;
    payload_capacity_kg: number;
    availability_status: string;
    is_active: boolean;
  }[];
  jobs: {
    id: number;
    job_code: string;
    operating_date: string;
    job_type: string;
    battery_quantity: number;
    total_weight_kg: number;
    status: string;
    pickup_location: string;
    delivery_location: string;
    assigned_vehicle: string | null;
  }[];
};

const initialJobs: Job[] = [
  {
    id: "JOB-1001",
    type: "Pickup",
    from: "BRC Noida",
    to: "Dealer A",
    batteries: 18,
    weight: 360,
    status: "Planned",
    vehicle: "MH-01",
  },
  {
    id: "JOB-1002",
    type: "Delivery",
    from: "BRC Ghaziabad",
    to: "Dealer B",
    batteries: 12,
    weight: 240,
    status: "In Transit",
    vehicle: "MH-02",
  },
  {
    id: "JOB-1003",
    type: "Pickup",
    from: "Dealer C",
    to: "BRC Noida",
    batteries: 24,
    weight: 480,
    status: "Unassigned",
    vehicle: "—",
  },
  {
    id: "JOB-1004",
    type: "Delivery",
    from: "BRC Noida",
    to: "Dealer D",
    batteries: 10,
    weight: 200,
    status: "Planned",
    vehicle: "MH-01",
  },
  {
    id: "JOB-1005",
    type: "Pickup",
    from: "Dealer E",
    to: "BRC Ghaziabad",
    batteries: 8,
    weight: 160,
    status: "Completed",
    vehicle: "MH-03",
  },
];

const initialVehicles = [
  {
    id: "MH-01",
    name: "Vehicle 01",
    capacity: 1500,
    state: "On route",
  },
  {
    id: "MH-02",
    name: "Vehicle 02",
    capacity: 1200,
    state: "On route",
  },
  {
    id: "MH-03",
    name: "Vehicle 03",
    capacity: 1000,
    state: "Available",
  },
];

const navItems = [
  ["Overview", "▦", "/"],
  ["Daily Planning", "↗", "/daily-planning"],
  ["Live Operations", "⌖", "/live-operations"],
  ["Movements", "⇄", "/movements"],
  ["Vehicles & Batteries", "▤", "/vehicles-batteries"],
  ["Route Analysis", "⇄", "/route-analysis"],
  ["Reports", "▥", "/reports"],
] as const;

function Status({ value }: { value: string }) {
  const styles: Record<string, string> = {
    Planned: "blue",
    "In Transit": "amber",
    Completed: "green",
    Unassigned: "red",
    "On route": "amber",
    Available: "green",
    Resolved: "green",
  };

  return (
    <span className={`status ${styles[value] || "blue"}`}>
      {value}
    </span>
  );
}

export default function Home() {
  const pathname = usePathname();
  const router = useRouter();

  const active =
    navItems.find(([, , href]) => href === pathname)?.[0] ?? "Overview";

  const [today, setToday] = useState("");
  const [user, setUser] = useState<User | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [authError, setAuthError] = useState("");

  const [jobs, setJobs] = useState<Job[]>(initialJobs);
  const [apiDashboard, setApiDashboard] =
    useState<ApiDashboard | null>(null);

  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All");
  const [optimized, setOptimized] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const updateDate = () => {
      setToday(
        new Intl.DateTimeFormat("en-GB", {
          weekday: "long",
          day: "2-digit",
          month: "long",
          year: "numeric",
          timeZone: "Asia/Kolkata",
        }).format(new Date())
      );
    };

    updateDate();

    const interval = window.setInterval(updateDate, 60_000);
    return () => window.clearInterval(interval);
  }, []);

  // Load the authenticated user.
  useEffect(() => {
    let cancelled = false;

    async function loadUser() {
      try {
        const response = await fetch(`${API}/auth/me`, {
          credentials: "include",
          cache: "no-store",
        });

        if (response.status === 401 || response.status === 403) {
          router.replace("/login");
          return;
        }

        if (!response.ok) {
          throw new Error("Unable to load account");
        }

        const data: User = await response.json();

        if (!cancelled) {
          setUser(data);
          setAuthError("");
        }
      } catch {
        if (!cancelled) {
          setAuthError(
            "Account details unavailable. Please check the backend connection."
          );
        }
      }
    }

    loadUser();

    return () => {
      cancelled = true;
    };
  }, [router]);

  // Load dashboard data from FastAPI.
  useEffect(() => {
    let cancelled = false;

    async function loadDashboard() {
      try {
        const response = await fetch(`${API}/api/v1/dashboard`, {
          credentials: "include",
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error(`Dashboard API failed: ${response.status}`);
        }

        const data: ApiDashboard = await response.json();

        if (!cancelled) {
          setApiDashboard(data);

          const apiJobs: Job[] = data.jobs.map((job) => ({
            id: job.job_code,
            type: job.job_type === "PICKUP" ? "Pickup" : "Delivery",
            from: job.pickup_location,
            to: job.delivery_location,
            batteries: job.battery_quantity,
            weight: Number(job.total_weight_kg),
            status:
              job.status === "COMPLETED"
                ? "Completed"
                : job.status === "IN_TRANSIT"
                  ? "In Transit"
                  : job.status === "UNASSIGNED"
                    ? "Unassigned"
                    : "Planned",
            vehicle: job.assigned_vehicle ?? "—",
          }));

          setJobs(apiJobs);
        }
      } catch {
        // Keep sample data visible if the API is unavailable.
      }
    }

    loadDashboard();

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleLogout() {
    setLoggingOut(true);
    setAuthError("");

    try {
      const response = await fetch(`${API}/auth/logout`, {
        method: "POST",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Logout request failed");
      }

      setProfileOpen(false);
      router.replace("/login");
      router.refresh();
    } catch {
      setAuthError("Logout failed. Check the backend and try again.");
      setLoggingOut(false);
    }
  }

  const initials =
    user?.full_name
      ?.trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "U";

  const vehicles = useMemo(() => {
    if (apiDashboard) {
      return apiDashboard.vehicles.map((vehicle) => {
        const load = jobs
          .filter(
            (job) =>
              job.vehicle === vehicle.vehicle_code &&
              job.status !== "Completed"
          )
          .reduce((sum, job) => sum + job.weight, 0);

        return {
          id: vehicle.vehicle_code,
          name: vehicle.driver_name || vehicle.vehicle_code,
          capacity: Number(vehicle.payload_capacity_kg),
          state:
            vehicle.availability_status === "AVAILABLE"
              ? "Available"
              : vehicle.availability_status,
          load,
        };
      });
    }

    return initialVehicles.map((vehicle) => {
      const load = jobs
        .filter(
          (job) =>
            job.vehicle === vehicle.id && job.status !== "Completed"
        )
        .reduce((sum, job) => sum + job.weight, 0);

      return { ...vehicle, load };
    });
  }, [apiDashboard, jobs]);

  const filteredJobs = jobs.filter((job) => {
    const matchesQuery =
      `${job.id} ${job.from} ${job.to} ${job.vehicle}`
        .toLowerCase()
        .includes(query.toLowerCase());

    return matchesQuery && (filter === "All" || job.status === filter);
  });

  const completed = apiDashboard
    ? apiDashboard.metrics.completed_jobs
    : jobs.filter((job) => job.status === "Completed").length;

  const unassigned = apiDashboard
    ? apiDashboard.metrics.unassigned_jobs
    : jobs.filter((job) => job.status === "Unassigned").length;

  const totalJobs = apiDashboard
    ? apiDashboard.metrics.total_jobs
    : jobs.length;

  const totalVehicles = apiDashboard
    ? apiDashboard.metrics.total_vehicles
    : vehicles.length;

  const activeVehicles = apiDashboard
    ? apiDashboard.metrics.active_vehicles
    : vehicles.filter((vehicle) => vehicle.state === "On route").length;

  const activeJobs = jobs.filter(
    (job) => job.status !== "Completed"
  ).length;

  function runDemoOptimization() {
    if (apiDashboard) {
      setNotice(
        "Demo optimization is disabled for live database records. Connect the actual route optimization engine first."
      );
      return;
    }

    const loads: Record<string, number> = Object.fromEntries(
      vehicles.map((vehicle) => [vehicle.id, vehicle.load])
    );

    const nextJobs = jobs.map((job): Job => {
      if (job.status !== "Unassigned") return job;

      const candidate = vehicles
        .map((vehicle) => ({
          id: vehicle.id,
          remaining: vehicle.capacity - loads[vehicle.id],
        }))
        .filter((vehicle) => vehicle.remaining >= job.weight)
        .sort((a, b) => b.remaining - a.remaining)[0];

      if (!candidate) return job;

      loads[candidate.id] += job.weight;

      return {
        ...job,
        vehicle: candidate.id,
        status: "Planned",
      };
    });

    const stillUnassigned = nextJobs.filter(
      (job) => job.status === "Unassigned"
    ).length;

    setJobs(nextJobs);
    setOptimized(true);

    setNotice(
      stillUnassigned
        ? `${stillUnassigned} job(s) could not be allocated. This is a demo; OR-Tools is not connected.`
        : "Demo assignments updated. Verify capacity before approval. OR-Tools is not connected."
    );
  }

  function resetDemo() {
    if (apiDashboard) {
      setNotice(
        "Reset is disabled for live database records to prevent accidental data changes."
      );
      return;
    }

    setJobs(initialJobs);
    setOptimized(false);
    setNotice("Demo data restored.");
  }

  function completeJob(id: string) {
    if (apiDashboard) {
      setNotice(
        "This action only updates demo records. Live job status updates require a backend endpoint."
      );
      return;
    }

    setJobs((current) =>
      current.map((job) =>
        job.id === id ? { ...job, status: "Completed" } : job
      )
    );

    setNotice(`${id} marked completed in the demo.`);
  }

  return (
    <main className="overview shell">
      <aside className="sidebar">
        <div className="brand">
          <Image
            src="/Motivus%20Logo.png"
            alt="Motivus"
            width={180}
            height={75}
            priority
            className="object-contain"
          />
        </div>

        <div className="workspace-label">WORKSPACE</div>

        <nav>
          {navItems.map(([label, icon, href]) => (
            <Link
              key={label}
              href={href}
              className={`nav-item ${active === label ? "selected" : ""}`}
            >
              <span className="nav-icon">{icon}</span>
              {label}
              {label === "Live Operations" && (
                <span className="live-dot" />
              )}
            </Link>
          ))}
        </nav>
      </aside>

      <section className="main-area">
        {/* Header styled to match the other dashboard pages. */}
        <header className="overview-header">
          <div className="overview-header-copy">
            <p className="overview-breadcrumb">
              Workspace / {active}
            </p>
            <h1>Daily Operations Overview</h1>
            <p className="overview-description">
              Monitor fleet movement, battery jobs and operational performance.
            </p>
          </div>

          <div className="overview-header-actions">
            <span className="environment-badge">
              <span className="environment-dot" />
              Demo environment
            </span>

            <button
              type="button"
              className="icon-button"
              title="Notifications"
              aria-label="Notifications"
              onClick={() =>
                setNotice("Notifications are not connected yet.")
              }
            >
              ♧
            </button>

            <div className="profile-menu-anchor">
              <button
                type="button"
                title="Account menu"
                aria-label="Open account menu"
                aria-expanded={profileOpen}
                onClick={() => {
                  setProfileOpen((open) => !open);
                  setAuthError("");
                }}
                className="overview-profile-button"
              >
                <span className="overview-avatar">{initials}</span>

                <span className="overview-profile-copy">
                  <span className="overview-profile-name">
                    {user?.full_name || "My Account"}
                  </span>
                  <span className="overview-profile-role">
                    {user?.role?.replaceAll("_", " ") || "Account"}
                  </span>
                </span>

                <span className="overview-profile-chevron">⌄</span>
              </button>

              {profileOpen && (
                <>
                  <button
                    type="button"
                    className="profile-dismiss"
                    aria-label="Close account menu"
                    onClick={() => setProfileOpen(false)}
                  />

                  <div className="profile-dropdown" role="menu">
                    <div className="profile-dropdown-info">
                      <p className="profile-name">
                        {user?.full_name || "Account"}
                      </p>
                      <p className="profile-email">
                        {user?.email || "Account details unavailable"}
                      </p>

                      {user && (
                        <p className="profile-role">
                          {user.role.replaceAll("_", " ")}
                          {" · "}
                          {user.is_active ? "Active" : "Inactive"}
                        </p>
                      )}
                    </div>

                    <Link
                      href="/profile"
                      role="menuitem"
                      onClick={() => setProfileOpen(false)}
                      className="profile-menu-link"
                    >
                      ◎ My Profile
                    </Link>

                    <button
                      type="button"
                      role="menuitem"
                      onClick={handleLogout}
                      disabled={loggingOut}
                      className="profile-logout"
                    >
                      {loggingOut ? "Signing out..." : "↪ Logout"}
                    </button>

                    {authError && (
                      <p role="alert" className="profile-error">
                        {authError}
                      </p>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        <div className="content">
          {/* Action buttons stay here; the duplicate title is removed. */}
          <div className="overview-actions-row">
            <div>
              <h2 className="overview-section-title">
                Operational snapshot
              </h2>
              <p className="subtitle">
                Daily pickup, delivery and fleet allocation summary.
              </p>
            </div>

            <div className="heading-actions">
              <button
                className="button secondary"
                onClick={resetDemo}
                type="button"
              >
                ↻ Reset demo
              </button>
              <button
                className="button primary"
                onClick={runDemoOptimization}
                type="button"
              >
                ✦ Optimize plan
              </button>
            </div>
          </div>

          {notice && (
            <div className="notice" role="status">
              <span>ⓘ</span> {notice}
              <button
                type="button"
                onClick={() => setNotice("")}
                aria-label="Dismiss notice"
              >
                ×
              </button>
            </div>
          )}

          <div className="date-row">
            <div className="date-chip">
              ▦ &nbsp; {today || "Loading date..."}
            </div>
            <span className="plan-status">
              <span /> Planning workspace
            </span>
          </div>

          <div className="metrics">
            <Metric
              label="Total jobs"
              value={String(totalJobs).padStart(2, "0")}
              note="Today's operational plan"
              icon="▤"
              tone="blue"
            />
            <Metric
              label="Active vehicles"
              value={String(activeVehicles).padStart(2, "0")}
              note={
                apiDashboard
                  ? `Out of ${totalVehicles} registered vehicles`
                  : "Demo fleet activity"
              }
              icon="▣"
              tone="purple"
            />
            <Metric
              label="Jobs completed"
              value={`${completed}/${totalJobs}`}
              note={`${
                totalJobs > 0
                  ? Math.round((completed / totalJobs) * 100)
                  : 0
              }% completion`}
              icon="✓"
              tone="green"
            />
            <Metric
              label="Unassigned jobs"
              value={String(unassigned).padStart(2, "0")}
              note="Require allocation"
              icon="⚑"
              tone="orange"
            />
          </div>

          <div className="section-grid">
            <section className="panel route-panel">
              <div className="panel-header">
                <div>
                  <h2>Network overview</h2>
                  <p>Illustrative regional movement</p>
                </div>
                <span className="live-tag">
                  <span /> DEMO MAP
                </span>
              </div>

              <div className="map-canvas">
                <div className="map-grid" />

                <svg
                  className="route-svg"
                  viewBox="0 0 600 320"
                  preserveAspectRatio="none"
                  aria-label="Illustrative vehicle routes"
                  role="img"
                >
                  <path
                    d="M 80 220 C 150 200 140 100 235 110 S 350 240 435 175 S 510 80 550 90"
                    className="route-line route-one"
                  />
                  <path
                    d="M 80 220 C 180 270 230 235 315 220 S 400 120 435 175"
                    className="route-line route-two"
                  />
                  <path
                    d="M 235 110 Q 290 55 360 72 T 550 90"
                    className="route-line route-three"
                  />
                </svg>

                {[
                  { name: "BRC Noida", x: 13, y: 66, cls: "hub" },
                  { name: "BRC Ghaziabad", x: 39, y: 33, cls: "hub" },
                  { name: "Dealer A", x: 73, y: 52, cls: "" },
                  { name: "Dealer B", x: 53, y: 70, cls: "" },
                  { name: "Dealer C", x: 86, y: 25, cls: "" },
                ].map((point) => (
                  <div
                    key={point.name}
                    className="map-point"
                    style={{
                      left: `${point.x}%`,
                      top: `${point.y}%`,
                    }}
                  >
                    <span className={`point-dot ${point.cls}`} />
                    <span className="point-label">{point.name}</span>
                  </div>
                ))}

                <div className="map-legend">
                  <span><i className="legend-hub" /> BRC</span>
                  <span><i className="legend-dealer" /> Pickup / delivery</span>
                  <span><i className="legend-route" /> Planned route</span>
                </div>

                <div className="map-disclaimer">
                  Illustrative map · Not geographic coordinates
                </div>
              </div>

              <div className="route-summary">
                <div>
                  <span>Planned distance</span>
                  <strong>186 km</strong>
                </div>
                <div>
                  <span>Estimated duration</span>
                  <strong>4h 35m</strong>
                </div>
                <div>
                  <span>Route coverage</span>
                  <strong>80%</strong>
                </div>
              </div>
            </section>

            <section className="panel vehicle-panel">
              <div className="panel-header">
                <div>
                  <h2>Fleet status</h2>
                  <p>Vehicle payload utilization</p>
                </div>
                <Link className="text-button" href="/vehicles-batteries">
                  View fleet →
                </Link>
              </div>

              <div className="vehicle-list">
                {vehicles.map((vehicle) => {
                  const pct =
                    vehicle.capacity > 0
                      ? Math.min(
                          100,
                          Math.round(
                            (vehicle.load / vehicle.capacity) * 100
                          )
                        )
                      : 0;

                  return (
                    <div className="vehicle-card" key={vehicle.id}>
                      <div className="vehicle-top">
                        <div className="vehicle-symbol">▰</div>
                        <div className="vehicle-info">
                          <strong>{vehicle.name}</strong>
                          <span>{vehicle.id}</span>
                        </div>
                        <Status value={vehicle.state} />
                      </div>

                      <div className="capacity-label">
                        <span>Payload utilization</span>
                        <strong>{pct}%</strong>
                      </div>

                      <div
                        className="progress"
                        role="progressbar"
                        aria-valuenow={pct}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label={`${vehicle.id} payload utilization`}
                      >
                        <span style={{ width: `${pct}%` }} />
                      </div>

                      <div className="capacity-foot">
                        <span>{vehicle.load.toLocaleString()} kg loaded</span>
                        <span>
                          {vehicle.capacity.toLocaleString()} kg capacity
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>

          <section className="panel jobs-panel">
            <div className="panel-header jobs-header">
              <div>
                <h2>Today's pickup &amp; delivery jobs</h2>
                <p>Review allocations and job status</p>
              </div>

              <button
                className="button secondary small-button"
                type="button"
                onClick={() =>
                  setNotice(
                    "CSV export will be enabled in a later integration phase."
                  )
                }
              >
                ↓ Export
              </button>
            </div>

            <div className="table-tools">
              <div className="search-box">
                <span>⌕</span>
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search job, location or vehicle..."
                  aria-label="Search jobs"
                />
              </div>

              <select
                value={filter}
                onChange={(event) => setFilter(event.target.value)}
                aria-label="Filter jobs by status"
              >
                {[
                  "All",
                  "Planned",
                  "In Transit",
                  "Completed",
                  "Unassigned",
                ].map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>

            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>JOB ID</th>
                    <th>TYPE</th>
                    <th>PICKUP / ORIGIN</th>
                    <th>DELIVERY / DESTINATION</th>
                    <th>BATTERIES</th>
                    <th>TOTAL WEIGHT</th>
                    <th>VEHICLE</th>
                    <th>STATUS</th>
                    <th>ACTION</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredJobs.map((job) => (
                    <tr key={job.id}>
                      <td className="job-id">{job.id}</td>
                      <td>
                        <span className={`job-type ${job.type.toLowerCase()}`}>
                          {job.type}
                        </span>
                      </td>
                      <td>{job.from}</td>
                      <td>{job.to}</td>
                      <td>{job.batteries}</td>
                      <td>{job.weight} kg</td>
                      <td>{job.vehicle}</td>
                      <td><Status value={job.status} /></td>
                      <td>
                        {job.status !== "Completed" && (
                          <button
                            className="row-action"
                            type="button"
                            title="Mark completed"
                            aria-label={`Mark ${job.id} completed`}
                            onClick={() => completeJob(job.id)}
                          >
                            ✓
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}

                  {filteredJobs.length === 0 && (
                    <tr>
                      <td colSpan={9} className="empty">
                        No jobs match this filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="table-footer">
              Showing {filteredJobs.length} of {totalJobs} jobs
              <span>
                {apiDashboard
                  ? "Backend dashboard data"
                  : "Sample data · Not live company data"}
              </span>
            </div>
          </section>

          <div className="bottom-grid">
            <section className="panel">
              <div className="panel-header">
                <div>
                  <h2>Operational alerts</h2>
                  <p>Items requiring attention</p>
                </div>
              </div>

              <div className="alert-item">
                <span className="alert-icon warning">!</span>
                <div>
                  <strong>Unassigned pickup job</strong>
                  <p>Review unassigned jobs in the current plan.</p>
                </div>
                <Status value={unassigned ? "Unassigned" : "Resolved"} />
              </div>

              <div className="alert-item">
                <span className="alert-icon info">i</span>
                <div>
                  <strong>Tracking is simulated</strong>
                  <p>No real GPS or traffic feed connected.</p>
                </div>
              </div>
            </section>

            <section className="panel">
              <div className="panel-header">
                <div>
                  <h2>Optimization summary</h2>
                  <p>Latest planning action</p>
                </div>
              </div>

              <div className="summary-row">
                <span>Plan status</span>
                <strong>
                  {optimized ? "Demo updated" : "Awaiting optimization"}
                </strong>
              </div>

              <div className="summary-row">
                <span>Unassigned jobs</span>
                <strong>{unassigned}</strong>
              </div>

              <div className="summary-row">
                <span>Jobs in active plan</span>
                <strong>{activeJobs}</strong>
              </div>

              <div className="summary-note">
                Final route feasibility, distance and cost require the backend
                optimizer and approved routing data.
              </div>
            </section>
          </div>

          <footer>
            Motivus Logistics Optimizer · Prototype v0.1
            <span>Sample data · For internal review</span>
          </footer>
        </div>
      </section>
    </main>
  );
}

function Metric({
  label,
  value,
  note,
  icon,
  tone,
}: {
  label: string;
  value: string;
  note: string;
  icon: string;
  tone: string;
}) {
  return (
    <section className="metric-card">
      <div className="metric-top">
        <span>{label}</span>
        <span className={`metric-icon ${tone}`}>{icon}</span>
      </div>
      <div className="metric-value">{value}</div>
      <div className="metric-note">{note}</div>
    </section>
  );
}
