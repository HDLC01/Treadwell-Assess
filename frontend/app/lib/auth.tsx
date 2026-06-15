"use client";

// Employer auth — Supabase Google sign-in, restricted to @wetreadwell.com.
// Pattern adapted (not imported) from the Treadwell proposal tool's auth.js.
//
// Reuses the shared Treadwell cloud Supabase project. Config (url + publishable
// anon key) is fetched from the backend's /api/public-config at runtime, so no
// build-time secrets. When the backend reports auth_enabled=false (Supabase not
// configured), the app runs OPEN — local dev needs no keys.

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createClient } from "@supabase/supabase-js";
import { setAuthToken } from "./api";

interface AuthState {
  ready: boolean; // initial session resolved (or auth disabled)
  authEnabled: boolean; // backend has Supabase configured
  allowedDomain: string;
  user: User | null;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

const HOME_PAGE = "/hire";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [authEnabled, setAuthEnabled] = useState(false);
  const [allowedDomain, setAllowedDomain] = useState("wetreadwell.com");
  const [user, setUser] = useState<User | null>(null);
  const clientRef = useRef<SupabaseClient | null>(null);

  useEffect(() => {
    let unsub: (() => void) | undefined;

    (async () => {
      let cfg: {
        supabase_url?: string;
        supabase_anon_key?: string;
        allowed_domain?: string;
        auth_enabled?: boolean;
      } = {};
      try {
        cfg = await (await fetch("/api/public-config")).json();
      } catch {
        /* backend down — fall through to open mode */
      }

      if (!cfg.auth_enabled || !cfg.supabase_url || !cfg.supabase_anon_key) {
        setAuthEnabled(false);
        setReady(true);
        return;
      }

      setAuthEnabled(true);
      if (cfg.allowed_domain) setAllowedDomain(cfg.allowed_domain);

      const sb = createClient(cfg.supabase_url, cfg.supabase_anon_key, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
      });
      clientRef.current = sb;

      const { data } = sb.auth.onAuthStateChange((_evt, session) => {
        setAuthToken(session?.access_token ?? null);
        setUser(session?.user ?? null);
      });
      unsub = () => data.subscription.unsubscribe();

      const {
        data: { session },
      } = await sb.auth.getSession();
      setAuthToken(session?.access_token ?? null);
      setUser(session?.user ?? null);
      setReady(true);
    })();

    return () => unsub?.();
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      ready,
      authEnabled,
      allowedDomain,
      user,
      async signInWithGoogle() {
        const sb = clientRef.current;
        if (!sb) return;
        await sb.auth.signInWithOAuth({
          provider: "google",
          options: {
            redirectTo: location.origin + HOME_PAGE,
            queryParams: { hd: allowedDomain, prompt: "select_account" },
          },
        });
      },
      async signOut() {
        try {
          await clientRef.current?.auth.signOut();
        } catch {
          /* ignore */
        }
        setAuthToken(null);
        setUser(null);
      },
    }),
    [ready, authEnabled, allowedDomain, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
