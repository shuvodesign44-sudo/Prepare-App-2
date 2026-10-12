# Account connection to Python

The active React project is `/Users/shuvoroy/work2026/Prepare AI Loveable/Prepare AI React` (the project shown in the user's screenshot). This is distinct from the earlier inspected extracted copy under `/Users/shuvoroy/lovable-project-6400393f`.

`VITE_API_BASE_URL` points to the Python server root, e.g. `http://127.0.0.1:8000`; the API client appends `/api/v1`. Supabase remains the authentication provider. No new password store or server credential is added to the frontend.

## Connected in this stage

- Profile identity/preferences are read from `GET /profile` with the current Supabase access token.
- Settings language updates use `PUT /profile`; reminder and job-alert preferences use `GET/PUT /settings`.
- Settings → Exam target & study time opens `/onboarding?backendProfile=true`. This editor loads and saves the Python profile and returns to Profile.
- Profile sign-out calls Python first, then clears the local Supabase session and query cache.
- Requests refresh expired sessions once, share an in-flight refresh, preserve request bodies/idempotency keys, and reject replay if the account changes. Queries are keyed by user ID. Errors/retry/loading/saving states are shown without replacing failed history with zero values.

The original onboarding flow without `backendProfile=true` still uses its existing Supabase implementation. Original login, navigation links, styles and component layout are retained. Dashboard, Analytics and Profile practice statistics now use the Python data source (see the progress stage below); historical Supabase scores are not imported, reset or re-awarded. The new Python profile may need its exam/name/preferences filled in separately through Settings. This is an account integration stage, not the migration of all feature screens.

No production data migration, live deployment, native Android change, or user-account creation was performed.

## Local verification

```sh
node --experimental-strip-types --test tests/api-client.test.ts
./node_modules/.bin/tsc --noEmit
npm run build
```

The API-client tests mock the network to exercise token headers, refresh/retry, account isolation, shared refresh, missing configuration/session and failures. Build and TypeScript checks pass. A real logged-in browser save/sign-out test still needs the user's session; no browser credentials are read or fabricated.

To try the UI, run the Python backend and `npm run dev -- --host localhost --port 3000 --strictPort` here. Open http://localhost:3000/auth, sign in with an existing account, then open Profile → Settings. Change language/reminders, reload, and verify persistence. Use Settings → Exam target & study time to save the connected profile. Finally test sign-out.

For Android emulator/physical-device use, loopback addresses and origins need platform-specific configuration. This stage targets the Mac's local browser only.

## Practice integration — September 26, 2026

The user confirmed email login after switching both local projects to the replacement Supabase project. Google authentication is disabled in that project's settings.

Smart Practice now uses the Python `/api/v1/practice` and submission endpoints with the existing Supabase bearer session. It translates displayed question positions to immutable server question IDs and renders server scores, weak topics and revealed explanations. Start retries retain their idempotency key; submission retries retain the first submitted answers. The question language is explicit. The timer uses the server's remaining duration and elapsed wall time, including background tabs. The backend rejects late submissions; an unsubmitted expired set shows no fabricated score. A submission whose response was lost can still be retried with identical answers.

Try `/practice` → **Try 5 sample questions** → choose answers → **Submit** before the five-minute deadline. This button selects the existing local English BCS arithmetic seed; it does not claim coverage of the full exam catalog. Other sets require enough reviewed questions matching the exact exam, subject, difficulty and language. The 100-question option is disabled because the current API supports at most 50. A failed start is displayed with a retryable error instead of generating substitute content.

Practice's legacy bookmark and AI explanation actions are not used with the new server snapshots. Explanations appear after scoring. Bookmarks, live contests and leaderboard still use their original data sources. Dashboard, Analytics and Profile were subsequently connected in the progress stage below. New practice records remain in the Python database. Reload/navigation recovery of an unfinished attempt is not implemented in this stage.

Validation: 12 frontend API/contract tests, TypeScript and changed-file lint pass; 25 backend API/analytics tests pass using isolated SQLite and mocked external identity verification. These tests do not use the user's credentials. Logged-in browser practice submission still needs a user check.


## Progress integration — September 26, 2026

The user tested practice successfully and shared a 2/5 result with 40% accuracy. Dashboard, Analytics and Profile now share an account-scoped backend progress query. New submissions invalidate that query. All-time score totals, questions, XP, streak and topic accuracy come from `/analytics`; the latest 20 completed practice records come from `/practice/history?completed=true&limit=20`. Aggregate totals are not calculated from this limited history window. Existing Supabase history remains untouched and is not added to these totals.

The backend splits merged study intervals at Bangladesh midnight and returns daily seconds. The Dashboard daily goal and the Analytics 14-day chart use those seconds, rather than treating attempt counts as minutes. Overlapping practice sessions do not double-count time. This measures elapsed submitted practice time and may include idle time. Backend aggregates include submitted contests; recent history specifically shows practice attempts. Empty data displays zero/empty states; request failures display errors and Retry instead of fabricated zero results.

Dashboard profile and exam goals now use the Python profile; missing goals link to the connected onboarding editor rather than forcing the legacy onboarding redirect. Its MCQ buttons open the connected Practice flow. Profile XP/streak/test counts use the same backend source, and Dashboard sign-out uses the same session revocation flow as Profile.

Validation: 15 frontend tests, TypeScript, changed-file ESLint and production build pass. 27 backend API/analytics tests pass, including overlapping intervals, midnight splitting and completed-history filtering. The local stored latest result and aggregate were inspected read-only; no user records were edited. Browser rendering and navigation still need the user's final check in their signed-in session.

## Saved Questions integration — September 26, 2026

Practice now saves bookmarks by server question ID through `PUT /bookmarks/{id}`. The existing icon reports saved only after success and prevents duplicate clicks while saving. Changing questions during a request marks the original question, not the newly displayed one. Account-scoped bookmarks are loaded when Practice opens, and save invalidates the saved-list cache.

Saved Questions now lists the Python backend bookmarks and supports removal through `DELETE /bookmarks/{id}`. Remove failures preserve the row; successful removal refreshes the cache. Loading, failed loads with Retry, and a genuine empty list are distinct states. The list shows question text, options, subject and topic. Correct answers and explanations remain available in submitted practice results; the bookmark API does not disclose them. The legacy Supabase bookmark records remain untouched and are not migrated into this list. Legacy contest actions still require their own integration.

Validation includes authenticated bookmark client paths, missing IDs, failed saves, per-account cache keys, repeated deletes, ownership isolation, and answer secrecy. No user bookmarks were created or deleted during automated testing. To verify in the signed-in browser: start the five-question sample, save a question, submit the set, open Saved Questions, reload to confirm persistence, remove it and reload again.

## Tutor and text Viva — September 26, 2026

AI Coach now links to `/tutor`. Tutor and `/viva` submit authenticated background tasks, poll queued/running jobs, stop polling on completion/failure, and display provider feedback, follow-up questions and limitations. Manual retries of an ambiguous create request retain the same key while the page remains open. Only the task ID is stored in per-user, per-feature session storage to resume polling after reload in the same tab; prompts and answers are not stored there. Poll failures offer Check again without automatically creating a billable replacement. Live responses remain unverified until an API key is supplied.

The previous Viva UI expected a different Supabase six-question voice/scoring workflow. The connected screen instead uses the Python backend's typed question/answer feedback contract and preserves the app's card, typography, navigation and colour styles. A follow-up answer is a new standalone assessment containing its question and answer, not a full persistent interview transcript. Voice upload/transcription, pronunciation/confidence scores and downloadable speaking reports are not part of this stage. No numerical scores are fabricated.

The user selected GPT-5.5. Backend local settings use `https://api.openai.com/v1` and `gpt-5.5`; its request uses `max_completion_tokens=4096`, low reasoning, and the existing validated JSON output contract. Estimated standard token rates are configured at $5 input/$30 output per million, without cached-input discounts. These estimates are not invoice reconciliation. The key remains backend-only and must be supplied in the Python project's `.env` as `AI_API_KEY`. `AI_TRANSCRIPTION_MODEL` remains unset because this stage is text-only.

Official references checked: https://developers.openai.com/api/docs/models/gpt-5.5 and https://developers.openai.com/api/reference/resources/chat/subresources/completions/methods/create . Mocked provider and client contract tests verify the flow; no paid generation was invoked.
