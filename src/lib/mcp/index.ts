import { auth, defineMcp } from "@lovable.dev/mcp-js";
import getMyProgress from "./tools/get-my-progress";
import listMcqAttempts from "./tools/list-mcq-attempts";
import getStudyPlan from "./tools/get-study-plan";
import listContests from "./tools/list-contests";
import updateStudyGoal from "./tools/update-study-goal";

const projectRef = import.meta.env['VITE_SUPABASE_PROJECT_ID'] ?? "project-ref-unset";

export default defineMcp({
  name: "englishpro-ai",
  title: "EnglishPro AI",
  version: "0.1.0",
  instructions:
    "Tools for the Prepare exam-preparation app (EnglishPro AI). Read the signed-in candidate's profile and progress with `get_my_progress`, recent practice results with `list_mcq_attempts`, their AI roadmap with `get_study_plan`, upcoming live exams with `list_contests`, and adjust their goal with `update_study_goal`.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [getMyProgress, listMcqAttempts, getStudyPlan, listContests, updateStudyGoal],
});
