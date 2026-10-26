"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

type User = {
  id: number | string;
  full_name: string;
  email: string;
  role: string;
  is_active: boolean;
};

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
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
          throw new Error("Unable to load profile");
        }

        const data: User = await response.json();
        if (!cancelled) setUser(data);
      } catch {
        if (!cancelled) {
          setError("Profile load nahi hua. Backend connection check karo.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadProfile();
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (loading) {
    return <main className="min-h-screen bg-[#F7F9F1] p-8 text-[#17372E]">Loading profile...</main>;
  }

  if (error || !user) {
    return (
      <main className="min-h-screen bg-[#F7F9F1] p-8 text-[#17372E]">
        <p>{error || "Profile unavailable."}</p>
        <button onClick={() => router.push("/")} className="mt-4 rounded-lg bg-[#17372E] px-4 py-2 text-white">
          Back to dashboard
        </button>
      </main>
    );
  }

  const initials = user.full_name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return (
    <main className="min-h-screen bg-[#F7F9F1] p-5 text-[#20352B] md:p-10">
      <div className="mx-auto max-w-3xl">
        <button onClick={() => router.push("/")} className="mb-6 text-sm font-semibold text-[#17372E] hover:underline">
          ← Back to dashboard
        </button>

        <div className="mb-7">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#718074]">Account settings</p>
          <h1 className="mt-2 text-3xl font-bold text-[#17372E]">My Profile</h1>
          <p className="mt-2 text-sm text-[#718074]">Your account information and access status.</p>
        </div>

        <section className="rounded-2xl border border-[#e3e9dc] bg-white p-6 shadow-sm md:p-8">
          <div className="flex items-center gap-5 border-b border-[#edf0e8] pb-7">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-[#F1F7CF] text-2xl font-bold text-[#17372E]">
              {initials || "U"}
            </div>
            <div className="min-w-0">
              <h2 className="break-words text-xl font-bold text-[#17372E]">{user.full_name}</h2>
              <p className="mt-1 break-all text-sm text-[#718074]">{user.email}</p>
              <span className={`mt-3 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${user.is_active ? "bg-[#edf7df] text-[#35652b]" : "bg-red-100 text-red-700"}`}>
                {user.is_active ? "Active account" : "Inactive account"}
              </span>
            </div>
          </div>

          <div className="grid gap-5 pt-6 sm:grid-cols-2">
            <div className="rounded-xl bg-[#F7F9F1] p-4">
              <p className="text-xs uppercase tracking-wide text-[#718074]">Full name</p>
              <p className="mt-2 break-words font-semibold">{user.full_name}</p>
            </div>
            <div className="rounded-xl bg-[#F7F9F1] p-4">
              <p className="text-xs uppercase tracking-wide text-[#718074]">Email address</p>
              <p className="mt-2 break-all font-semibold">{user.email}</p>
            </div>
            <div className="rounded-xl bg-[#F7F9F1] p-4">
              <p className="text-xs uppercase tracking-wide text-[#718074]">Role</p>
              <p className="mt-2 font-semibold capitalize">{user.role.replaceAll("_", " ")}</p>
            </div>
            <div className="rounded-xl bg-[#F7F9F1] p-4">
              <p className="text-xs uppercase tracking-wide text-[#718074]">Account status</p>
              <p className="mt-2 font-semibold">{user.is_active ? "Enabled" : "Disabled"}</p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
