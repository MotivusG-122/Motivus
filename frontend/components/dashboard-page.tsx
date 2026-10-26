
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  useEffect,
  useState,
  type ReactNode,
} from "react";

const API =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

type User = {
  id: number | string;
  full_name: string;
  email: string;
  role: string;
  is_active: boolean;
};

const navigation = [
  { name: "Overview", href: "/", icon: "▦" },
  { name: "Daily Planning", href: "/daily-planning", icon: "↗" },
  { name: "Live Operations", href: "/live-operations", icon: "⌖" },
  { name: "Movements", href: "/movements", icon: "⇄" },
  { name: "Vehicles & Batteries", href: "/vehicles-batteries", icon: "▤" },
  { name: "Route Analysis", href: "/route-analysis", icon: "⌁" },
  { name: "Reports", href: "/reports", icon: "▥" },
];

export function DashboardPage({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState("");
  const [today, setToday] = useState("");

  useEffect(() => {
    setToday(
      new Intl.DateTimeFormat("en-IN", {
        dateStyle: "full",
        timeZone: "Asia/Kolkata",
      }).format(new Date())
    );
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadUser() {
      try {
        const response = await fetch(`${API}/auth/me`, {
          credentials: "include",
          cache: "no-store",
        });

        if (!response.ok) return;

        const data: User = await response.json();

        if (!cancelled) {
          setUser(data);
        }
      } catch {
        // Keep the shell visible if the API is temporarily unavailable.
      }
    }

    void loadUser();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setMenuOpen(false);
    setMobileNavOpen(false);
  }, [pathname]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenuOpen(false);
        setMobileNavOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  async function handleLogout() {
    if (loggingOut) return;

    setLoggingOut(true);
    setLogoutError("");

    try {
      const response = await fetch(`${API}/auth/logout`, {
        method: "POST",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Logout request failed");
      }

      setMenuOpen(false);
      router.replace("/login");
      router.refresh();
    } catch {
      setLogoutError(
        "Logout failed. Check your connection and try again."
      );
      setLoggingOut(false);
    }
  }

  const initials =
    user?.full_name
      ?.split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "U";

  const activePage =
    navigation.find((item) => item.href === pathname)?.name || title;

  return (
    <div className="min-h-screen bg-[#f5f7fb] text-[#17243a]">
      <div className="min-h-screen md:flex">
        {/* Mobile overlay */}
        {mobileNavOpen && (
          <button
            type="button"
            aria-label="Close navigation"
            className="fixed inset-0 z-40 bg-[#101b2e]/50 md:hidden"
            onClick={() => setMobileNavOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside
          className={`fixed inset-y-0 left-0 z-50 flex w-[260px] flex-col overflow-y-auto bg-[#111d32] px-4 py-5 text-[#d7e0ef] transition-transform duration-200 md:sticky md:top-0 md:z-20 md:h-screen md:translate-x-0 ${
            mobileNavOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex items-center justify-between px-2 pb-8 pt-2">
            <Link href="/" className="block">
              <span className="block text-xl font-extrabold tracking-[0.12em] text-white">
                MOTIVUS<span className="text-[#cde05d]">.</span>
              </span>
              <span className="mt-1 block text-[10px] tracking-[0.19em] text-[#92a3bd]">
                LOGISTICS CONTROL
              </span>
            </Link>

            <button
              type="button"
              onClick={() => setMobileNavOpen(false)}
              aria-label="Close sidebar"
              className="rounded-lg px-3 py-2 text-lg text-[#c2cde0] hover:bg-[#263650] md:hidden"
            >
              ×
            </button>
          </div>

          <div className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-[#8293ad]">
            Workspace
          </div>

          <nav
            aria-label="Main navigation"
            className="flex flex-col gap-1.5"
          >
            {navigation.map((item) => {
              const active = pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`group flex items-center gap-3 rounded-xl px-3 py-3 text-[13px] transition-colors ${
                    active
                      ? "bg-[#cde05d] font-bold text-[#20352b] shadow-sm"
                      : "text-[#c2cde0] hover:bg-[#202f49] hover:text-white"
                  }`}
                >
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-lg ${
                      active
                        ? "bg-[#b9cf49] text-[#20352b]"
                        : "bg-[#1c2b44] text-[#aab8cf] group-hover:text-white"
                    }`}
                  >
                    {item.icon}
                  </span>

                  <span className="flex-1">{item.name}</span>

                  {active && (
                    <span className="h-1.5 w-1.5 rounded-full bg-[#20352b]" />
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto pt-8">
            <div className="rounded-xl border border-[#2b3a52] bg-[#192840] p-4">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-[#cde05d]" />
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#e0e8f4]">
                  Prototype environment
                </p>
              </div>

              <p className="mt-3 text-xs leading-5 text-[#9eafc8]">
                Sample records may be displayed. Verify data connectivity
                before using operational figures.
              </p>
            </div>

            <div className="mt-4 border-t border-[#2b3850] pt-4">
              <div className="flex items-center gap-3 px-1">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#dbe6ff] text-xs font-bold text-[#2852ae]">
                  {initials}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-white">
                    {user?.full_name || "My Account"}
                  </p>
                  <p className="mt-1 truncate text-[10px] text-[#92a2ba]">
                    {user?.role?.replaceAll("_", " ") || "Account"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* Main workspace */}
        <main className="min-w-0 flex-1">
          {/* Top bar */}
          <header className="sticky top-0 z-30 border-b border-[#e3e8f0] bg-white/95 backdrop-blur">
            <div className="flex min-h-[76px] items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-9">
              <div className="flex min-w-0 items-center gap-3">
                <button
                  type="button"
                  aria-label="Open navigation"
                  aria-expanded={mobileNavOpen}
                  onClick={() => setMobileNavOpen(true)}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#e3e8f0] bg-white text-lg text-[#33445d] hover:bg-[#f5f7fb] md:hidden"
                >
                  ☰
                </button>

                <div className="min-w-0">
                  <div className="hidden items-center gap-2 text-[11px] text-[#8a96a8] sm:flex">
                    <span>Workspace</span>
                    <span>/</span>
                    <span className="font-medium text-[#536178]">
                      {activePage}
                    </span>
                  </div>

                  <p className="truncate text-sm font-bold text-[#17243a] sm:mt-1">
                    {activePage}
                  </p>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-2 sm:gap-3">
                <div className="hidden items-center gap-2 rounded-full border border-[#eadfba] bg-[#fffaf0] px-3 py-2 sm:flex">
                  <span className="h-2 w-2 rounded-full bg-[#d99b2b]" />
                  <span className="text-[10px] font-semibold text-[#8c6723]">
                    Demo data
                  </span>
                </div>

                <div className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen((open) => !open);
                      setLogoutError("");
                    }}
                    aria-expanded={menuOpen}
                    aria-haspopup="menu"
                    aria-label="Open account menu"
                    className="flex items-center gap-2 rounded-xl border border-[#e3e8f0] bg-white p-1.5 pr-2.5 transition hover:border-[#c5d39c] hover:bg-[#fbfcf7] sm:gap-3 sm:pr-3"
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#eaf2d1] text-xs font-bold text-[#20352b]">
                      {initials}
                    </span>

                    <span className="hidden min-w-0 text-left sm:block">
                      <span className="block max-w-[130px] truncate text-xs font-bold text-[#20352b]">
                        {user?.full_name || "My Account"}
                      </span>
                      <span className="mt-1 block text-[10px] text-[#718074]">
                        Account settings
                      </span>
                    </span>

                    <span className="text-xs text-[#718074]">⌄</span>
                  </button>

                  {menuOpen && (
                    <>
                      <button
                        type="button"
                        aria-label="Close account menu"
                        className="fixed inset-0 z-40 cursor-default"
                        onClick={() => setMenuOpen(false)}
                      />

                      <div
                        role="menu"
                        className="absolute right-0 z-50 mt-3 w-72 max-w-[calc(100vw-2rem)] rounded-2xl border border-[#e3e9df] bg-white p-2 shadow-[0_18px_50px_rgba(20,40,30,0.14)]"
                      >
                        <div className="border-b border-[#edf0e8] px-3 py-3">
                          <p className="truncate text-sm font-bold text-[#20352b]">
                            {user?.full_name || "User account"}
                          </p>
                          <p className="mt-1 break-all text-xs text-[#718074]">
                            {user?.email || "Account details unavailable"}
                          </p>

                          {user && (
                            <div className="mt-3 flex flex-wrap items-center gap-2">
                              <span className="rounded-full bg-[#edf3ff] px-2.5 py-1 text-[10px] font-semibold capitalize text-[#3567d7]">
                                {user.role.replaceAll("_", " ")}
                              </span>

                              <span
                                className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                                  user.is_active
                                    ? "bg-[#e9f8ef] text-[#168c61]"
                                    : "bg-[#fff0ef] text-[#cf4c51]"
                                }`}
                              >
                                {user.is_active ? "Active" : "Inactive"}
                              </span>
                            </div>
                          )}
                        </div>

                        <Link
                          href="/profile"
                          role="menuitem"
                          onClick={() => setMenuOpen(false)}
                          className="mt-2 flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-[#33445d] hover:bg-[#f4f7eb]"
                        >
                          <span className="text-lg">◎</span>
                          My Profile
                        </Link>

                        <button
                          type="button"
                          role="menuitem"
                          onClick={handleLogout}
                          disabled={loggingOut}
                          className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold text-[#b42318] hover:bg-[#fff3f2] disabled:cursor-wait disabled:opacity-60"
                        >
                          <span className="text-lg">↪</span>
                          {loggingOut ? "Signing out..." : "Logout"}
                        </button>

                        {logoutError && (
                          <p
                            role="alert"
                            className="m-2 rounded-lg bg-[#fff3f2] p-3 text-xs leading-5 text-[#b42318]"
                          >
                            {logoutError}
                          </p>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </header>

          {/* Page content */}
          <div className="mx-auto w-full max-w-[1600px] p-4 sm:p-6 lg:p-9">
            <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div className="min-w-0">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[#83906e]">
                  Motivus / Operations
                </p>

                <h1 className="text-2xl font-extrabold tracking-tight text-[#17243a] sm:text-3xl">
                  {title}
                </h1>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-[#778399]">
                  {description}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-2 self-start rounded-xl border border-[#e3e8f0] bg-white px-3 py-2.5 sm:self-auto">
                <span className="text-[#83906e]">▦</span>
                <span className="text-xs font-medium text-[#52627a]">
                  {today || "Loading date..."}
                </span>
              </div>
            </div>

            {children}

            <footer className="mt-10 flex flex-col gap-2 border-t border-[#e3e8f0] py-5 text-[11px] text-[#8a95a7] sm:flex-row sm:items-center sm:justify-between">
              <span>
                Prototype environment · Verify live data before operations
              </span>
            </footer>
          </div>
        </main>
      </div>
    </div>
  );
}

export function Panel({
  title,
  children,
  action,
}: {
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className="min-w-0 overflow-hidden rounded-2xl border border-[#e3e8f0] bg-white shadow-[0_2px_8px_rgba(23,36,58,0.025)] transition-shadow hover:shadow-[0_8px_24px_rgba(23,36,58,0.045)]">
      <div className="flex items-center justify-between gap-3 border-b border-[#edf0f5] px-5 py-4 sm:px-6">
        <h2 className="text-sm font-bold text-[#17243a]">{title}</h2>
        {action}
      </div>

      <div className="p-5 sm:p-6">{children}</div>
    </section>
  );
}

export function Metric({
  label,
  value,
  note,
  icon = "▦",
  tone = "green",
}: {
  label: string;
  value: string;
  note: string;
  icon?: string;
  tone?: "green" | "blue" | "purple" | "orange";
}) {
  const tones = {
    green: {
      icon: "bg-[#edf5d7] text-[#516b1b]",
      indicator: "bg-[#a6bf40]",
    },
    blue: {
      icon: "bg-[#edf3ff] text-[#3567d7]",
      indicator: "bg-[#5882e8]",
    },
    purple: {
      icon: "bg-[#f1edff] text-[#8060dc]",
      indicator: "bg-[#9475e8]",
    },
    orange: {
      icon: "bg-[#fff3e5] text-[#c47b24]",
      indicator: "bg-[#e6a044]",
    },
  };

  const style = tones[tone];

  return (
    <section className="min-w-0 rounded-2xl border border-[#e3e8f0] bg-white p-5 shadow-[0_2px_8px_rgba(23,36,58,0.025)] transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(23,36,58,0.06)] sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-semibold text-[#778399] sm:text-sm">
          {label}
        </p>

        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg ${style.icon}`}
        >
          {icon}
        </span>
      </div>

      <p className="mt-5 break-words text-3xl font-extrabold tracking-tight text-[#17243a] sm:text-4xl">
        {value}
      </p>

      <div className="mt-4 flex items-start gap-2">
        <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${style.indicator}`} />
        <p className="text-xs leading-5 text-[#778399]">{note}</p>
      </div>
    </section>
  );
}
