import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "update_study_goal",
  title: "Update study goal",
  description:
    "Update the signed-in candidate's preparation goal: target exam, level, exam date and daily study minutes.",
  inputSchema: {
    target_exam: z.string().describe("Target exam, e.g. '46th BCS Preliminary'.").optional(),
    level: z.enum(["beginner", "intermediate", "advanced"]).describe("Current preparation level.").optional(),
    exam_date: z.string().describe("Exam date as YYYY-MM-DD.").optional(),
    daily_minutes: z.number().int().describe("Daily study minutes target (10-600).").optional(),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated())
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };

    const patch: Record<string, unknown> = {};
    if (input.target_exam) patch.target_exam = input.target_exam.trim();
    if (input.level) patch.level = input.level;
    if (input.exam_date) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(input.exam_date))
        return { content: [{ type: "text", text: "exam_date must be YYYY-MM-DD." }], isError: true };
      patch.exam_date = input.exam_date;
    }
    if (input.daily_minutes !== undefined)
      patch.daily_minutes = Math.min(600, Math.max(10, Math.trunc(input.daily_minutes)));

    if (!Object.keys(patch).length)
      return { content: [{ type: "text", text: "Nothing to update — provide at least one field." }], isError: true };

    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("profiles")
      .update(patch)
      .eq("id", ctx.getUserId()!)
      .select("target_exam,level,exam_date,daily_minutes")
      .maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? patch) }],
      structuredContent: { profile: data },
    };
  },
});
