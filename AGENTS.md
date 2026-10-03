# AGENTS.md — RealLife XP

## Mission

Build the RealLife XP MVP defined in the numbered product documents. The result must be a polished Expo application with a secure Supabase/PostgreSQL progression backend.

## Required Reading Order

Before modifying code, read:

1. `00_README.md` or its repository equivalent.
2. `docs/01_PRD.md`.
3. `docs/02_TECHNICAL_SPEC.md`.
4. `docs/03_IMPLEMENTATION_PLAN.md`.
5. `docs/04_STITCH_DESIGN_PROMPT.md` when implementing UI.

If files remain at the root, use the same numbered order.

## Source-of-Truth Priority

When instructions appear to conflict:

1. User's newest explicit instruction.
2. `01_PRD.md` for product behavior and scope.
3. `02_TECHNICAL_SPEC.md` for architecture/security.
4. `03_IMPLEMENTATION_PLAN.md` for order of work.
5. Existing implementation.
6. Personal preference.

Do not silently change a locked product decision.

## Work Protocol

- Inspect before editing.
- Implement in the phases defined by `03_IMPLEMENTATION_PLAN.md`.
- Prefer complete vertical slices over broad scaffolding.
- Keep the plan checklist and Progress Log accurate.
- Run relevant tests after each slice.
- Fix regressions before moving on.
- When a minor detail is unspecified, choose the simplest consistent option, append it to the Decision Log, and proceed.
- Ask the user only when blocked by missing credentials, a legal/business choice, destructive access outside the repository, or a true contradiction that cannot be resolved from the documents.
- Do not ask for confirmation of decisions already specified.
- Never claim a task is complete without verification.

## Scope Discipline

MVP includes the personal progression loop only.

Do not implement:

- Friends.
- Parties.
- Leaderboards.
- Public feeds/profiles.
- External activity integrations.
- AI coaching.
- Streaks.
- Quests.
- Marketplace.
- Payment.
- Full avatar system.
- Yearly recap.
- Web application.

Create no speculative infrastructure for deferred features unless required to avoid a known migration dead end.

## Stack Rules

- Expo + React Native.
- TypeScript strict mode.
- Expo Router.
- Supabase Auth and PostgreSQL.
- TanStack Query.
- React Hook Form + Zod.
- React Native StyleSheet with centralized tokens.
- Jest + React Native Testing Library.
- Supabase SQL/pgTAP tests.
- npm only unless the user explicitly changes package managers.

Do not introduce a standalone API server for MVP.

## Security Rules

- Never expose or bundle a Supabase service-role key.
- Never trust user IDs, XP values, achievement unlocks, title ownership, or progression totals from the client.
- Derive identity from `auth.uid()` inside trusted database functions.
- Enable RLS on every user-facing table.
- Use explicit safe `search_path` in `security definer` functions.
- The client cannot write directly to `xp_ledger`.
- Use immutable ledger events and compensating reversals.
- Add idempotency to activity logging and reversal.
- Test cross-user denial.
- Never leak private reflections into analytics, exports, broad views, logs, or error messages.

## Data Rules

- Schema changes require committed Supabase migrations.
- Seed reference data through migrations/seed files.
- Generate and use database TypeScript types.
- Activity logs retain snapshots.
- Template edits do not alter history.
- Reversal creates a negative ledger entry; it does not delete ledger history.
- No fake user activity in production paths.
- Test data belongs in fixtures/tests only.

## UI Rules

- Follow the Stitch document and centralized tokens.
- Preserve native mobile behavior.
- Build reusable primitives rather than one-off screen styling.
- Dark-first, mature, premium, and game-inspired.
- Do not make the app look like a habit tracker.
- Provide empty, loading, offline, error, locked, and success states.
- Minimum touch target is 44×44.
- Respect reduced motion and haptic settings.
- Do not require camera, location, contacts, health, notification, or photo permissions in MVP.
- Do not expose private activity details in share cards.

## Code Quality

- No unexplained `any`.
- No production `console.log`.
- No swallowed errors.
- Validate external/form input with Zod and database constraints.
- Keep domain logic out of presentation components.
- Prefer small focused functions and components.
- Use descriptive names.
- Remove dead code and unused dependencies.
- Do not leave broad TODO comments; record deferred product work in the plan.
- Keep comments for non-obvious reasons, not restating code.

## Testing and Completion

Before marking a phase complete:

- Run formatting.
- Run lint.
- Run typecheck.
- Run relevant unit/component tests.
- Run relevant SQL tests.
- Verify the behavior manually where automation does not cover it.
- Record the exact verification in the Progress Log.

Before release:

- Run all checks.
- Run the critical Maestro flow.
- Test fresh database reset/migration.
- Test two-user RLS isolation.
- Test offline duplicate submission.
- Test reversal idempotency.
- Test account deletion.
- Test iOS and Android preview builds.

## Commit Guidance

When commits are requested, use focused conventional messages such as:

```text
feat(auth): add protected onboarding flow
feat(xp): implement idempotent activity logging RPC
feat(character): add progression dashboard
test(db): cover ledger reversal and RLS
fix(history): preserve snapshots after template edits
```

Do not combine unrelated phases into one commit.
