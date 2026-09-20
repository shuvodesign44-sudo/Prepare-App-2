import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_contests",
  title: "List live contests",
  description:
    "List public Prepare live exam contests with their exam category, subject, start time, duration and status.",
  inputSchema: {
    status: z
      .enum(["scheduled", "live", "finished"])
      .describe("Optional status filter.")
      .optional(),
    limit: z.number().int().describe("How many contests to return (1-25). Defaults to 10.").optional(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ status, limit }, ctx) => {
    if (!ctx.isAuthenticated())
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const take = Math.min(25, Math.max(1, Math.trunc(limit ?? 10)));
    const supabase = supabaseForUser(ctx);
    let query = supabase
      .from("contests")
      .select(
        "id,title,contest_type,exam_category,subject,difficulty,language,question_count,duration_seconds,negative_marking,prize,starts_at,status",
      )
      .eq("is_private", false)
      .order("starts_at", { ascending: true })
      .limit(take);
    if (status) query = query.eq("status", status);
    const { data, error } = await query;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    const contests = data ?? [];
    return {
      content: [
        { type: "text", text: contests.length ? JSON.stringify(contests) : "No contests found." },
      ],
      structuredContent: { contests },
    };
  },
});
