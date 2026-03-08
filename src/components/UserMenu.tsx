"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { useState } from "react";

export default function UserMenu() {
  const { data: session, status } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);

  if (status === "loading") return null;

  if (!session) {
    return (
      <Link
        href="/login"
        className="px-4 py-1.5 text-xs font-medium border border-[var(--border)] rounded-full hover:bg-white/80 transition-colors bg-[var(--background)]"
      >
        Sign in
      </Link>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setMenuOpen(!menuOpen)}
        className="cursor-pointer flex items-center gap-2"
      >
        {session.user?.image ? (
          <img
            src={session.user.image}
            alt=""
            className="w-8 h-8 rounded-full border border-[var(--border)]"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-[var(--accent)] flex items-center justify-center text-white text-xs font-medium">
            {session.user?.name?.[0]?.toUpperCase() || "?"}
          </div>
        )}
      </button>

      {menuOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setMenuOpen(false)}
          />
          <div className="absolute right-0 top-10 z-50 bg-white border border-[var(--border)] rounded-lg shadow-lg py-2 min-w-[180px]">
            <div className="px-4 py-2 border-b border-[var(--border)]">
              <p className="text-sm font-medium truncate">
                {session.user?.name}
              </p>
              <p className="text-xs text-[var(--muted)] truncate">
                {session.user?.email}
              </p>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="cursor-pointer w-full text-left px-4 py-2 text-sm hover:bg-[var(--background)] transition-colors text-red-600"
            >
              Sign out
            </button>
          </div>
        </>
      )}
    </div>
  );
}
