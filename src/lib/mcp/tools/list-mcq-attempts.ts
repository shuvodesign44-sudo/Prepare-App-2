import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_mcq_attempts",
  title: "List MCQ attempts",
  description:
    "List the signed-in candidate's recent MCQ practice attempts with category, score, difficulty and duration.",
  inputSchema: {
    limit: z.number().int().describe("How many recent attempts to return (1-25). Defaults to 10.").optional(),
    category: z.string().describe("Optional exam category filter, e.g. 'BCS Preliminary'.").optional(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit, category }, ctx) => {
    if (!ctx.isAuthenticated())
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const take = Math.min(25, Math.max(1, Math.trunc(limit ?? 10)));
    const supabase = supabaseForUser(ctx);
    let query = supabase
      .from("mcq_attempts")
      .select("id,category,difficulty,language,score,total,duration_seconds,completed,created_at")
      .eq("user_id", ctx.getUserId()!)
      .order("created_at", { ascending: false })
      .limit(take);
    if (category) query = query.eq("category", category);
    const { data, error } = await query;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    const attempts = data ?? [];
    return {
      content: [
        {
          type: "text",
          text: attempts.length ? JSON.stringify(attempts) : "No MCQ attempts recorded yet.",
        },
      ],
      structuredContent: { attempts },
    };
  },
});
