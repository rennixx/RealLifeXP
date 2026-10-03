# RealLife XP — Product Bundle

**Working name:** RealLife XP  
**Tagline:** Your real life has stats.  
**Platform:** Expo mobile app for iOS and Android  
**Backend:** Supabase with PostgreSQL  
**Status:** Implementation-ready MVP specification

## What This Bundle Contains

Read the files in this order:

1. `01_PRD.md` — product scope, rules, flows, and acceptance criteria.
2. `02_TECHNICAL_SPEC.md` — architecture, database, XP engine, security, and project structure.
3. `03_IMPLEMENTATION_PLAN.md` — ordered implementation phases and verification gates.
4. `04_STITCH_DESIGN_PROMPT.md` — copy-paste prompt for generating the mobile UI in Stitch.
5. `AGENTS.md` — permanent operating rules for Codex.

These files are the source of truth. The project should not require another product-planning round before implementation begins.

## Locked Product Decisions

- Build **RealLife XP**, not MemoryMap or SkillTree.
- The MVP is a personal progression product, not a social network.
- The central loop is:
  **log meaningful activity → earn XP → level categories and attributes → unlock achievements/titles → improve a character sheet**.
- The app is not a habit tracker and does not punish missed days.
- No global leaderboard, AI coach, public feed, parties, marketplace, or external integrations in MVP.
- Use Expo, TypeScript, Expo Router, Supabase Auth, and Supabase PostgreSQL.
- Use server-side PostgreSQL functions for XP writes; never trust XP calculated by the mobile client.
- Use a premium dark visual style that feels like a modern RPG profile, not a childish game.
- Use generated initials/character emblems in MVP; do not build image uploads yet.
- Use `npm` as the package manager.
- Build both iOS and Android from one Expo codebase.

## Repository Setup

Place this bundle at the project root before starting. `AGENTS.md` should remain at the root so Codex automatically sees it.

Recommended initial structure:

```text
reallife-xp/
├── app/
├── src/
├── supabase/
├── assets/
├── docs/
│   ├── 01_PRD.md
│   ├── 02_TECHNICAL_SPEC.md
│   ├── 03_IMPLEMENTATION_PLAN.md
│   └── 04_STITCH_DESIGN_PROMPT.md
├── AGENTS.md
├── app.json
├── package.json
└── README.md
```

The numbered files may be moved into `docs/`. Keep `AGENTS.md` at the repository root.

## Prompt to Start Codex

Copy this into Codex after opening the project folder:

> Read `AGENTS.md` and every numbered document in `docs/` before changing code. Treat them as the product source of truth. Inspect the repository, then update `docs/03_IMPLEMENTATION_PLAN.md` with any repository-specific setup tasks you discover. Begin implementation from Phase 0 and continue in the documented order. Work in tested vertical slices, update the implementation checklist after each verified slice, and do not ask questions whose answers already exist in the specifications. When a minor detail is unspecified, choose the simplest option consistent with the product principles, record the decision under the plan's Decision Log, and proceed. Do not use fake production data, do not expose Supabase service credentials, and do not calculate trusted XP on the client.

## Definition of MVP Done

The MVP is done only when a new user can:

1. Create an account and complete onboarding.
2. Select life categories and attributes.
3. Log a meaningful activity in under 10 seconds after initial setup.
4. Receive server-authoritative XP.
5. See overall, category, and attribute progression.
6. Unlock an achievement and a title.
7. Equip a title on their character sheet.
8. Review and reverse an activity without corrupting XP totals.
9. Export a shareable character card.
10. Sign out, sign back in, and recover the same data.
11. Use the core experience on both iOS and Android.
12. Pass the security, database, unit, and critical-flow checks in the implementation plan.

## Product Boundary

A feature belongs in MVP only when it directly strengthens the core progression loop. Everything else belongs in the post-MVP roadmap. This rule should be used to prevent scope creep.
