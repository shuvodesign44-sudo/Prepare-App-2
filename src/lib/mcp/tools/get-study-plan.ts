import { defineTool } from "@lovable.dev/mcp-js";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "get_study_plan",
  title: "Get study plan",
  description:
    "Get the signed-in candidate's latest AI study roadmap: target exam, summary, weekly plan and daily tasks.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated())
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("study_plans")
      .select("id,exam,summary,weeks,daily_tasks,updated_at")
      .eq("user_id", ctx.getUserId()!)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    if (!data)
      return {
        content: [{ type: "text", text: "No study plan yet — generate one in the app's Roadmap screen." }],
      };
    return {
      content: [{ type: "text", text: JSON.stringify(data) }],
      structuredContent: { plan: data },
    };
  },
});
