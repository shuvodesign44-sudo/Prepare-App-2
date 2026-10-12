import { Capacitor } from "@capacitor/core";
import { supabase } from "@/integrations/supabase/client";
import { createApi, ApiError } from "./api-client";

export { ApiError };
export interface BackendProfile {
  id: string;
  display_name: string;
  target_exam: string;
  level: "beginner" | "intermediate" | "advanced";
  exam_date: string | null;
  daily_minutes: number;
  language: "en" | "bn";
}
export interface Preferences {
  study_reminders: boolean;
  job_alerts: boolean;
  push_enabled: boolean;
}
const configuredApiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "";
// 10.0.2.2 is the Android emulator's host alias; desktop browsers must use loopback.
const apiBaseUrl =
  !Capacitor.isNativePlatform() && configuredApiBaseUrl.includes("10.0.2.2")
    ? configuredApiBaseUrl.replace("10.0.2.2", "127.0.0.1")
    : configuredApiBaseUrl;
export const backend = createApi(apiBaseUrl, supabase);
export const profileKey = (id: string) => ["backend-profile", id] as const;
export const settingsKey = (id: string) => ["backend-settings", id] as const;
export const backendRetry = (count: number, error: Error) =>
  !(error instanceof ApiError && [401, 403, 422].includes(error.status)) && count < 1;
export const loadProfile = (signal?: AbortSignal) =>
  backend.request<BackendProfile>("/profile", { signal });
export const saveProfile = ({ id: _id, ...profile }: BackendProfile) =>
  backend.request<BackendProfile>("/profile", { method: "PUT", body: JSON.stringify(profile) });
export const loadPreferences = (signal?: AbortSignal) =>
  backend.request<Preferences>("/settings", { signal });
export const savePreferences = (preferences: Preferences) =>
  backend.request<Preferences>("/settings", { method: "PUT", body: JSON.stringify(preferences) });

export async function signOutBackend() {
  try {
    await backend.request("/auth/signout", { method: "POST" });
  } catch (error) {
    if (!(error instanceof ApiError && error.status === 401)) throw error;
  }
  const { error } = await supabase.auth.signOut({ scope: "local" });
  if (error) throw error;
}
