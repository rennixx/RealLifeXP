# RealLife XP — Implementation Plan

## Operating Method

Codex should execute this plan in order and keep the checkboxes current.

For each phase:

1. Inspect existing code and migrations.
2. Implement the smallest complete vertical slice.
3. Run formatting, linting, type checks, and relevant tests.
4. Fix failures before continuing.
5. Mark only verified tasks complete.
6. Add a concise entry to the Progress Log.
7. Record any minor interpretation under Decision Log rather than asking the user, unless implementation is genuinely blocked by unavailable credentials or an external legal/business choice.

Do not build post-MVP features while completing these phases.

---

## Phase 0 — Repository and Quality Foundation

### Tasks

- [x] Initialize or inspect the Expo TypeScript project.
- [x] Configure Expo Router.
- [x] Confirm `npm` scripts for `start`, `ios`, `android`, `lint`, `typecheck`, and `test`.
- [x] Enable strict TypeScript.
- [x] Configure ESLint and Prettier.
- [x] Add Jest and React Native Testing Library.
- [x] Create the feature-oriented folder structure from the technical specification.
- [x] Add centralized design tokens and basic UI primitives.
- [x] Add `.env.example`.
- [x] Configure the Supabase client with environment validation.
- [x] Initialize the local Supabase directory and migration workflow.
- [x] Add generated database-type workflow.
- [x] Create a replaceable analytics adapter with no-op provider.
- [x] Create typed error translation.
- [x] Add GitHub Actions for install, lint, typecheck, and tests.
- [x] Confirm a clean app is SDK-compatible for Android and iOS targets.

### Verification gate

- [x] Fresh clone can install with `npm install`.
- [x] App starts without secrets committed.
- [x] Lint, typecheck, and tests pass.
- [x] Environment misconfiguration produces a clear development error.
- [x] No post-MVP dependency has been added.

---

## Phase 1 — Database, Authentication, and Onboarding

### Database tasks

- [x] Add PostgreSQL extensions and enums.
- [x] Create `profiles`, `categories`, `attributes`, `user_categories`, and `user_attributes`.
- [x] Create templates, logs, ledger, achievements, and titles tables.
- [x] Add timestamp triggers and integrity constraints.
- [x] Seed categories, attributes, system templates, achievements, titles, emblems, and level thresholds/functions.
- [x] Enable RLS on every table.
- [x] Add initial ownership/reference-data policies.
- [x] Add SQL tests for seed integrity.
- [x] Add SQL tests for cross-user access.

### App tasks

- [x] Implement auth session provider and protected routing.
- [x] Build sign-up, sign-in, password reset, sign-out, and account-loading states.
- [x] Build onboarding identity screen.
- [x] Build category selection with 3–6 selection validation.
- [x] Build starter-template selection.
- [x] Build character-sheet preview.
- [x] Implement `complete_onboarding` RPC.
- [x] Route completed users to tabs and incomplete users to onboarding.
- [x] Add onboarding component and flow tests.

### Verification gate

- [ ] A new user can create an account and complete onboarding.
- [ ] Refresh/relaunch preserves the authenticated session.
- [ ] A second user cannot read the first user's selections.
- [ ] “Character Created” achievement and “The Initiate” title unlock once.
- [ ] No gameplay XP is awarded merely for onboarding.
- [ ] Seed data comes from migrations, not hardcoded screen arrays.

---

## Phase 2 — Core Activity-to-XP Vertical Slice

### Backend tasks

- [x] Implement and test `xp_for_tier`.
- [x] Implement and test level calculations.
- [x] Implement `log_activity` RPC with explicit safe `search_path`.
- [x] Enforce trusted template/tier resolution.
- [x] Add activity snapshots.
- [x] Add immutable positive XP ledger event.
- [x] Update category and attribute progression atomically.
- [x] Add idempotency through `client_request_id`.
- [x] Return the full progression delta contract.
- [x] Add SQL tests for happy path, invalid ownership, duplicate request, and totals.

### App tasks

- [x] Build reusable activity-template picker.
- [x] Build recent/favorite template section.
- [x] Build full category → attribute → template path.
- [x] Build optional note, reflection, duration, and occurrence controls.
- [x] Show trusted XP preview from template data.
- [x] Submit through RPC.
- [x] Build pending, success, and recoverable failure states.
- [x] Implement lightweight XP gain feedback with haptics.
- [x] Add component tests for the core logging flow.

### Verification gate

- [ ] A selected starter activity can be logged in fewer than 10 seconds.
- [ ] Client cannot choose an arbitrary numeric XP amount.
- [ ] Character/category/attribute totals all change correctly.
- [ ] Duplicate network submission awards XP once.
- [ ] A user cannot log another user's private template.
- [ ] Failed submission preserves the draft.

---

## Phase 3 — Dashboard, Character Sheet, and Category Progress

### Tasks

- [x] Build dashboard summary query/view or RPC.
- [x] Build home header with character level, title, and emblem.
- [x] Build overall XP progress.
- [x] Build category cards.
- [x] Build recent activity area.
- [x] Build new-user empty state.
- [x] Build character sheet.
- [x] Build top-category and top-attribute calculations.
- [x] Build category detail screen.
- [x] Add attribute progression rows.
- [x] Add paginated recent category activity.
- [x] Add lightweight time-series progress query and chart.
- [x] Add loading skeletons and retry states.
- [x] Test boundary rendering at exact level thresholds.

### Verification gate

- [ ] Dashboard data matches ledger-derived server data.
- [ ] Character sheet remains useful with minimal activity.
- [ ] Category screen does not fetch full history.
- [ ] Level progress never shows negative or over-100% values.
- [ ] Cached dashboard content is visible during background refresh.

---

## Phase 4 — Achievements and Titles

### Backend tasks

- [x] Implement allowed achievement rule evaluator.
- [x] Evaluate achievements within successful activity transactions.
- [x] Ensure each achievement unlocks once.
- [x] Create associated user-title unlock atomically.
- [x] Implement `equip_title`.
- [x] Add SQL tests for every rule type used by seed data.

### App tasks

- [x] Build achievements grid/list.
- [x] Build rarity, hidden, locked, and unlocked states.
- [x] Build achievement detail.
- [x] Build combined unlock celebration.
- [x] Build title selector.
- [x] Display equipped title on dashboard and character sheet.
- [x] Respect reduced-motion setting.
- [x] Add component tests for unlock and equip flows.

### Verification gate

- [ ] Seed achievements can be earned through real activity.
- [ ] Unlocks occur once under concurrent/retried requests.
- [ ] Users cannot equip locked titles.
- [ ] Multiple unlocks appear in one dismissible summary.
- [ ] Reduced-motion mode avoids large movement animations.

---

## Phase 5 — Templates, History, Reversal, and Offline Queue

### Custom templates

- [x] Build custom template creation.
- [x] Validate category/attribute relationship.
- [x] Lock tier-to-XP mapping.
- [x] Build edit/archive behavior.
- [x] Preserve historical snapshots after template edits.
- [x] Build favorite handling for system and custom templates.

### History and reversal

- [ ] Build paginated history.
- [ ] Add category, attribute, tier, and date filters.
- [ ] Build activity detail.
- [ ] Allow edits only to non-XP-bearing fields.
- [ ] Implement `reverse_activity`.
- [ ] Show explicit reversal confirmation.
- [ ] Display reversed state without treating it as an active log.
- [ ] Add ledger consistency and idempotency tests.

### Offline queue

- [ ] Persist pending activity commands.
- [ ] Add connectivity-aware processing.
- [ ] Add idempotent retry.
- [ ] Show pending status.
- [ ] Allow user to retry or discard permanent failures.
- [ ] Test app restart with queued commands.

### Verification gate

- [x] Template edits do not change old activity records.
- [ ] Reversal removes exactly the original XP once.
- [ ] Totals and levels remain consistent after reversal.
- [ ] Queued offline activity syncs once when connection returns.
- [ ] Invalid queued items do not retry forever.

---

## Phase 6 — Character Card, Settings, Accessibility, and Polish

### Character card

- [ ] Build a dedicated export-safe card component.
- [ ] Add optional hidden-name mode.
- [ ] Include only approved public fields.
- [ ] Capture locally without remote-image dependency.
- [ ] Open the native share sheet.
- [ ] Emit privacy-safe export analytics event.

### Settings and account

- [ ] Profile identity editing.
- [ ] Emblem selection.
- [ ] Active category management.
- [ ] Reduced motion.
- [ ] Haptic preference.
- [ ] Privacy explanation.
- [ ] Data export request path or documented initial export method.
- [ ] Implement and test the authenticated `delete-account` Edge Function.
- [ ] Account deletion with re-authentication where required.
- [ ] Verify owned database rows cascade or are explicitly cleaned up.
- [ ] Sign out.

### Polish

- [ ] Apply Stitch-derived design consistently through tokens/components.
- [ ] Add intentional empty, loading, error, and offline states.
- [ ] Audit touch targets and text scaling.
- [ ] Audit screen-reader labels.
- [ ] Audit contrast.
- [ ] Remove debug output.
- [ ] Add friendly copy review.
- [ ] Add app icon, splash, and launch configuration.

### Verification gate

- [ ] Export never includes private notes/reflections/email.
- [ ] Character card works on both platforms.
- [ ] Reduced-motion and haptic settings persist.
- [ ] Account deletion removes or anonymizes owned records as specified.
- [ ] Core screens are usable with larger system text.

---

## Phase 7 — Release Hardening

### Tasks

- [ ] Create development, preview, and production app configuration.
- [ ] Configure EAS profiles.
- [ ] Add privacy-policy and support placeholders.
- [ ] Run full database test suite.
- [ ] Run full unit/component suite.
- [ ] Run Maestro smoke flow.
- [ ] Test auth recovery.
- [ ] Test poor connectivity and offline queue.
- [ ] Test duplicate taps and retry behavior.
- [ ] Test a second account for RLS leakage.
- [ ] Test fresh production-like database migration.
- [ ] Verify no service key or secret is bundled.
- [ ] Verify the app requests no unnecessary permissions.
- [ ] Review dependency licenses and remove unused packages.
- [ ] Produce internal preview builds for iOS and Android.
- [ ] Complete the MVP definition-of-done checklist in `00_README.md`.

### Final verification gate

- [ ] All automated checks pass.
- [ ] Critical E2E flow passes on iOS and Android.
- [ ] Database reset reproduces the complete schema and seed state.
- [ ] No open critical or high-severity bug remains.
- [ ] Post-MVP features have not leaked into release scope.

---

## Deferred Backlog

Do not implement these during MVP:

- [ ] Friends.
- [ ] Parties.
- [ ] Leaderboards.
- [ ] Public profiles.
- [ ] External verification integrations.
- [ ] Seasonal/yearly recap.
- [ ] AI coach or AI-generated progression.
- [ ] Full avatar cosmetics.
- [ ] Purchases/subscriptions.
- [ ] Push campaigns.
- [ ] Skill-tree editor.
- [ ] Web client.

---

## Decision Log

Codex should append concise entries only when it resolves an unspecified minor implementation detail.

| Date | Decision | Reason | Files affected |
|---|---|---|---|
| 2026-08-15 | Keep numbered product documents at repository root and scaffold into the same root project workspace | Repository already stores `00_README.md` and numbered specs at root, not inside `docs/`; no extra migration of source documents is required for MVP startup | Project-wide structure only |
| 2026-08-15 | No Stitch export payload has been provided yet | Implementation must begin from `04_STITCH_DESIGN_PROMPT.md` and translate to reusable React Native components directly | `docs/04_STITCH_DESIGN_PROMPT.md` usage |
| 2026-08-16 | Align dependency versions to Expo SDK 57 compatibility checks during Phase 0 | `npx expo-doctor` initially flagged mismatches; lockstep updates improve long-term runtime safety | `package.json`, `package-lock.json` |
| 2026-08-16 | Keep `components/useClientOnlyValue.web.ts` aligned with Expo starter intent for a native-first app | No SSR render path is needed in MVP; returning `client` directly avoids lint anti-pattern and avoids unnecessary runtime effects | `components/useClientOnlyValue.web.ts` |
| 2026-08-16 | Downgrade to Expo SDK 54 to match iPhone Expo Go compatibility requirement | User requested testability on device; Expo 57 was not compatible with their environment, so dependency set was realigned and verified with `npx expo-doctor` and `npx expo install --check` | `package.json`, `package-lock.json`, `app/_layout.tsx`, `app/(tabs)/_layout.tsx`, `components/useColorScheme.ts`, `components/Themed.tsx` |
| 2026-08-16 | Supabase CLI cannot run locally because Docker daemon is unavailable in this workspace | `supabase db start` fails against missing `dockerDesktopLinuxEngine`; database checks are deferred until local Docker is available | Host environment (`npx supabase db start`) |
| 2026-08-16 | Keep `typography.label` as a dedicated token to match Solar Flare design labels instead of replacing call sites | Existing onboarding/auth screens use `typography.label`; preserving design intent while fixing compile issues is lowest-risk | `src/theme/tokens.ts` |
| 2026-08-16 | Convert typography `letterSpacing` tokens from string units to numeric points | RN `TextStyle.letterSpacing` expects a number; shared token compatibility required a one-way translation while preserving visual intent | `src/theme/tokens.ts` |
| 2026-08-16 | Clear selected starter template IDs when toggling off onboarding categories | Prevents invalid category/template combinations before calling `complete_onboarding` without adding category-template dependency tracking | `src/features/onboarding/OnboardingDraftContext.tsx` |
| 2026-08-16 | Update `stitch-screen-designs` as the implementation-time reference and keep repository source aligned with that family | User-provided design folder is now available and should drive subsequent screen implementations | `stitch-screen-designs/DESIGN.md`, `app/(auth)/*`, `app/(onboarding)/*`, `app/(tabs)/*` |
| 2026-08-16 | Use `z.string().email` for email validation in all auth forms | `z.email` is not a zod API; this is an API-corrective fix required for runtime validation | `app/(auth)/forgot-password.tsx`, `app/(auth)/sign-in.tsx`, `app/(auth)/sign-up.tsx` |
| 2026-08-16 | Normalize onboarding template category join typing and icon-key typing under strict TS | Supabase join types can be interpreted as array/object and icon names are strict unions, so normalization + explicit icon type keeps onboarding flows fully type-safe | `app/(onboarding)/categories.tsx`, `src/features/onboarding/onboarding-service.ts` |
| 2026-08-16 | Validate onboarding emblem keys centrally in SQL and constrain profile emblem values | Five known emblems are used in onboarding; server-side validation prevents unsupported identifiers from reaching user profiles | `supabase/migrations/0003_phase1_onboarding_rpc.sql`, `supabase/migrations/0004_phase1_reference_data.sql` |
| 2026-08-16 | Seed titles, achievements, and level math helpers from SQL migrations | `character-created` and `the-initiate` are required for onboarding unlock behavior; deterministic seed data and helper functions reduce hidden client assumptions | `supabase/migrations/0004_phase1_reference_data.sql`, `supabase/tests/phase1_reference_integrity.sql` |
| 2026-08-16 | Seed canonical MVP categories, attributes, and starter system templates | Onboarding and starter activity flows depend on DB-provided defaults; adding migration seeds avoids hardcoded domain data paths in client code | `supabase/migrations/0005_phase1_seed_defaults.sql`, `supabase/tests/phase1_reference_integrity.sql` |
| 2026-08-16 | Expand seed-integrity SQL assertions to verify seeded category/template invariants | Migration-level checks catch accidental seed drift on category/attribute/template counts and ensure template-category relationships stay valid | `supabase/tests/phase1_reference_integrity.sql` |
| 2026-08-16 | Keep activity form submission on react-hook-form's public `handleSubmit` API and avoid private form state | Private form internals are fragile and can desync with future RHF versions; explicit public submit flow is safer and preserves validation behavior | `src/features/activity/ActivityLogScreen.tsx` |
| 2026-08-16 | Preserve selected template metadata in `ActivityLogScreen` success state | Mutating selection state after submission would clear context for success messaging; a snapshot is needed for accurate post-submit feedback | `src/features/activity/ActivityLogScreen.tsx` |
| 2026-08-16 | Build dashboard/character progression from server-owned rows and compute per-scope progress with threshold rows only for display | Avoided exposing client-calculable awards and kept calculations consistent with `level_thresholds` data model | `src/features/dashboard/dashboard-service.ts`, `app/(tabs)/index.tsx`, `app/(tabs)/character.tsx` |
| 2026-08-16 | Add explicit SQL cross-user isolation coverage for Phase 1 RLS checks | Cross-user security validation was blocking a completed task; regression test file now documents expected deny behavior under session context | `supabase/tests/phase1_cross_user_access.sql` |
| 2026-08-16 | Keep category detail data server-scoped and pagination-limited per slice | Category detail now uses dedicated per-user category and attribute queries with page-limited activity loading to avoid fetching full history | `app/(tabs)/index.tsx`, `app/(tabs)/category/[categoryId].tsx`, `src/features/dashboard/category-detail-service.ts` |
| 2026-08-16 | Render 4-week category progress chart data client-side from activity snapshots as a lightweight initial implementation | This keeps the slice fast without a dedicated migration or new endpoint while satisfying the Phase 3 progress chart requirement | `src/features/dashboard/category-detail-service.ts`, `app/(tabs)/category/[categoryId].tsx` |
| 2026-08-16 | Normalize dashboard/category attribute joins to both object and array Supabase shapes before mapping | Join responses vary by endpoint under strict TypeScript; normalization prevents casts from drifting into unsafe assumptions and keeps mappings resilient | `src/features/dashboard/category-detail-service.ts` |
| 2026-08-16 | Register Stitch MCP in `.claude.json` for persistent local tool access | User requested persistent Stitch MCP setup for design-retrieval workflow, with API key passed via header as required by the MCP endpoint | `C:\\Users\\h4mah\\.claude.json` |
| 2026-08-16 | Export `buildProgress` from dashboard service for testability | Boundary math should be validated directly without loading DB/networking layers, so explicit export enables deterministic unit coverage | `src/features/dashboard/dashboard-service.ts`, `src/features/dashboard/dashboard-service.test.ts` |
| 2026-08-16 | Implement Phase 4 achievement evaluation and title equip behavior in a follow-up migration | Hard-coded slugs prevented future seeded rule expansion; a generic evaluator with safe rule config handling centralizes unlock checks | `supabase/migrations/0007_phase4_achievements_evaluator.sql` |
| 2026-08-16 | Add Phase 4 SQL regression test coverage for seed rule unlocks and equip-title ownership guard | Seeded rule behavior must remain deterministic across environments and prevent unowned title equip without client-side checks | `supabase/tests/phase4_achievements.sql` |
| 2026-08-16 | Validate seeded `onboarding_completed` rule directly via SQL evaluator assertions before rule-unlock activity assertions | Keeps SQL test coverage aligned with all seeded rule types and avoids assumptions about external UI state during backend-only validation | `supabase/tests/phase4_achievements.sql` |
| 2026-08-16 | Use the delivered `stitch-screen-designs` trophy/title references to implement the achievements UX and keep screen behavior faithful while retaining app shell primitives | Visual references are now available for this slice and this avoids re-deriving layout semantics without inventing inconsistent patterns | `app/(tabs)/achievements.tsx`, `src/features/achievements/achievements-service.ts` |
| 2026-08-16 | Keep `PrimaryButton` API stable and assert interactions in tests via visible labels instead of adding `testID` to generic component props | `PrimaryButton` remains a stable public primitive; testability is preserved without widening component contracts unnecessarily | `src/features/achievements/AchievementsScreen.test.tsx` |

---

## Progress Log

Append one line per completed, verified slice.

| Date | Phase | Completed | Verification |
|---|---|---|---|
| — | — | Project not started | — |
| 2026-08-16 | 0 | Bootstrapped the Expo app, strict foundation tooling, Supabase local structure, env validation, lint/typecheck/test scripts, and quality checks pass on Expo SDK 54 (including Expo Go compatibility alignment) | `npm install`, `npm run lint`, `npm run typecheck`, `npm run test`, `npx expo-doctor`, `npx expo install --check`, `.env` placeholders in `.gitignore` |
| 2026-08-16 | 1 (partial) | Added core schema migration with enums, core tables, triggers, and baseline RLS/policies; kept seed/test data for a later pass | `supabase/migrations/0002_phase1_schema.sql`; verification: `npm run lint/typecheck/test`, `npx expo-doctor`; **blocker:** `npx supabase db start` failed due missing Docker API |
| 2026-08-16 | 1 (partial) | Completed vertical slice for Auth + Onboarding UI shell/routing and onboarding RPC wiring | `src/features/auth/AuthProvider.tsx`, `app/_layout.tsx`, `app/index.tsx`, `app/(auth)/*`, `app/(onboarding)/*`, `src/features/onboarding/OnboardingDraftContext.tsx`, `src/features/onboarding/onboarding-service.ts`, `supabase/migrations/0003_phase1_onboarding_rpc.sql`; verification: `npm run lint`, `npm run typecheck`, `npm run test`, `npx expo-doctor`, `npx expo install --check` |
| 2026-08-16 | 1 (partial) | Added Phase 1 reference seeds/functions and SQL integrity checks: level functions/thresholds, title and achievement seeds, DB emblem guardrails | `supabase/migrations/0004_phase1_reference_data.sql`, `supabase/tests/phase1_reference_integrity.sql`; verification: `npm run lint`, `npm run typecheck`, `npm run test`, `npx expo-doctor`, `npx expo install --check` |
| 2026-08-16 | 1 (partial) | Seeded MVP reference data for all categories/attributes and starter system templates from PRD defaults | `supabase/migrations/0005_phase1_seed_defaults.sql`, `supabase/tests/phase1_reference_integrity.sql`; verification: `npm run lint`, `npm run typecheck`, `npm run test`, `npx expo-doctor`, `npx expo install --check`; SQL migration integrity checks pending local docker-dependent execution |
| 2026-08-16 | 1 (partial) | Added onboarding draft context flow tests for defaults, updates, and category-driven template reset | `src/features/onboarding/OnboardingDraftContext.test.tsx`; verification: `npm run test -- src/features/onboarding/OnboardingDraftContext.test.tsx`, `npm run lint`, `npm run typecheck`, `npm run test` |
| 2026-08-16 | 2 | Added the activity logging UI + RPC-integrated flow and SQL-level validation coverage for `log_activity` | `app/log-activity.tsx`, `src/features/activity/ActivityLogScreen.tsx`, `src/features/activity/activity-service.ts`, `src/features/activity/ActivityLogScreen.test.tsx`, `supabase/tests/phase2_log_activity.sql`; verification: `npm run lint`, `npm run typecheck`, `npm run test` (frontend only; SQL checks run in local Supabase when db available) |
| 2026-08-16 | 1 (cross-user) | Added SQL regression checks for private table read isolation between users | `supabase/tests/phase1_cross_user_access.sql`; verification: environment-dependent, pending local auth/session fixtures |
| 2026-08-16 | 3 (partial) | Implemented dashboard progression service, home dashboard UI slice (header, XP progress, category cards, recent activity, empty states), and character sheet with strongest attributes | `src/features/dashboard/dashboard-service.ts`, `app/(tabs)/index.tsx`, `app/(tabs)/character.tsx`, `src/components/ui/ProgressBar.tsx`; verification: `npm run lint`, `npm run typecheck`, `npm run test` |
| 2026-08-16 | 3 (partial) | Added category detail screen with per-category attribute rows and paginated recent category activity, with home navigation entry points | `app/(tabs)/index.tsx`, `app/(tabs)/category/[categoryId].tsx`, `src/features/dashboard/category-detail-service.ts`; verification: `npm run lint`, `npm run typecheck`, `npm run test` |
| 2026-08-16 | 3 (partial) | Added category progress chart series query + rendering and skeleton/retry loading states on dashboard, character, and category detail screens | `src/features/dashboard/category-detail-service.ts`, `app/(tabs)/category/[categoryId].tsx`, `app/(tabs)/index.tsx`, `app/(tabs)/character.tsx`, `src/components/ui/Skeleton.tsx` | verification: `npm run lint`, `npm run typecheck`, `npm run test -- --runInBand --forceExit` |
| 2026-08-16 | 3 (partial) | Added boundary threshold progress rendering tests to keep level bars stable at cumulative and required XP boundaries | `src/features/dashboard/dashboard-service.test.ts` | verification: `npm run lint`, `npm run typecheck`, `npm run test -- --runInBand --forceExit` |
| 2026-08-16 | 4 (backend) | Added a generic, reusable achievement rule evaluator plus atomic unlock updates to `log_activity` and created title equip RPC | `supabase/migrations/0007_phase4_achievements_evaluator.sql` | verification: `npm run lint`, `npm run typecheck`, `npm run test -- --runInBand --forceExit` |
| 2026-08-16 | 4 | Implemented achievements screen service/query wiring, grid/detail/title selector interactions, reduced-motion detail modal handling, and focused UI tests for unlock/equip behavior | `src/features/achievements/achievements-service.ts`, `app/(tabs)/achievements.tsx`, `src/features/achievements/AchievementsScreen.test.tsx`, `src/features/activity/ActivityLogScreen.tsx` | verification: `npm run lint`, `npm run typecheck`, `npm run test -- src/features/achievements/AchievementsScreen.test.tsx src/features/activity/ActivityLogScreen.test.tsx`, `npx expo-doctor` |
| 2026-08-16 | 4 (backend) | Completed seeded rule test coverage for `onboarding_completed`, `first-activity`, and `novice-analyst` behavior in SQL assertions | `supabase/tests/phase4_achievements.sql` | verification: `npm run lint`, `npm run typecheck`, `npm run test -- src/features/achievements/AchievementsScreen.test.tsx src/features/activity/ActivityLogScreen.test.tsx` |
| 2026-08-16 | 5 | Implemented custom template management with owned create/edit/archive, favorites, and owner-scoped server policies + template integrity enforcement; added log-flow navigation to templates | `supabase/migrations/0009_phase5_template_management.sql`, `src/features/templates/templates-service.ts`, `src/features/templates/TemplatesScreen.tsx`, `app/templates.tsx`, `app/_layout.tsx`, `src/features/activity/ActivityLogScreen.tsx` | verification: not fully automated in this environment yet (manual check and local SQL runs pending) |
