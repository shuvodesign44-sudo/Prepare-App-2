/* eslint-disable @typescript-eslint/no-explicit-any */
// Server-only: daily activity, XP and streak bookkeeping.

export async function recordActivity(
  supabase: any,
  userId: string,
  minutes: number,
  xp: number,
) {
  const today = new Date().toISOString().slice(0, 10);
  const client = supabase as any;

  const { data: existing } = await client
    .from("daily_activity")
    .select("id, minutes, xp, lessons_completed")
    .eq("user_id", userId)
    .eq("activity_date", today)
    .maybeSingle();

  if (existing) {
    await client
      .from("daily_activity")
      .update({
        minutes: existing.minutes + minutes,
        xp: existing.xp + xp,
        lessons_completed: existing.lessons_completed + 1,
      })
      .eq("id", existing.id);
  } else {
    await client.from("daily_activity").insert({
      user_id: userId,
      activity_date: today,
      minutes,
      xp,
      lessons_completed: 1,
    });
  }

  const { data: profile } = await client
    .from("profiles")
    .select("xp, streak, last_active_date")
    .eq("id", userId)
    .maybeSingle();

  if (profile) {
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const streak =
      profile.last_active_date === today
        ? profile.streak
        : profile.last_active_date === yesterday
          ? profile.streak + 1
          : 1;
    await client
      .from("profiles")
      .update({
        xp: (profile.xp ?? 0) + xp,
        streak,
        last_active_date: today,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);
  }
}

