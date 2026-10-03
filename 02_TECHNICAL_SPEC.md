# RealLife XP — Technical Specification

## 1. Architecture Decision

Use a single Expo application backed by Supabase.

```text
Expo mobile client
├── Expo Router
├── React Native UI
├── TanStack Query
├── React Hook Form + Zod
└── Supabase JavaScript client
        │
        ├── Supabase Auth
        ├── PostgreSQL
        ├── Row Level Security
        ├── SQL/RPC functions
        └── Realtime only where later justified
```

This architecture is chosen because it gives a solo developer:

- One TypeScript mobile codebase.
- PostgreSQL without maintaining a separate API server.
- Authentication and RLS.
- Migrations and local Supabase development.
- A clean path to Edge Functions later.
- Low initial infrastructure complexity.

Do not introduce a separate Node.js backend in MVP. Sensitive writes are implemented as PostgreSQL functions exposed through Supabase RPC. Add an Edge Function only when a requirement cannot be safely handled by PostgreSQL/RLS.

---

## 2. Locked Technology Stack

| Concern | Choice |
|---|---|
| Mobile | Expo + React Native |
| Language | TypeScript with strict mode |
| Routing | Expo Router |
| Package manager | npm |
| Backend | Supabase |
| Database | PostgreSQL |
| Authentication | Supabase Auth |
| Remote data | TanStack Query |
| Local UI state | React state; Zustand only if cross-feature client state becomes necessary |
| Forms | React Hook Form |
| Validation | Zod |
| Styling | React Native StyleSheet with centralized design tokens |
| Icons | `@expo/vector-icons` or one consistent Expo-compatible icon set |
| Animation | React Native Reanimated |
| Haptics | Expo Haptics |
| Share card | `react-native-view-shot` plus Expo Sharing |
| Local persistence | AsyncStorage with persisted query/offline queue |
| Unit/component tests | Jest + React Native Testing Library |
| Database tests | Supabase CLI + pgTAP/SQL assertions |
| E2E smoke tests | Maestro before release |
| Formatting/linting | Prettier + ESLint |
| CI | GitHub Actions |

Avoid a large UI framework in MVP. Build reusable primitives from tokens so Stitch output can be translated cleanly into native components.

---

## 3. Environment and Configuration

Required public client variables:

```bash
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
EXPO_PUBLIC_APP_ENV=development
```

Rules:

- Never place the Supabase service-role key in Expo code or `EXPO_PUBLIC_*`.
- Use `.env.example` with placeholders.
- Keep development, preview, and production Supabase projects separate before public launch.
- Generate TypeScript database types after schema changes.
- Commit migrations, not live-dashboard-only schema edits.
- Store no secrets in Git.

Recommended commands:

```bash
npm install
npx expo start
npx supabase start
npx supabase db reset
npx supabase gen types typescript --local > src/types/database.ts
npm test
npm run lint
npm run typecheck
```

### Required Edge Function

MVP uses one Supabase Edge Function: `delete-account`.

It must:

1. Require a valid user JWT.
2. Resolve the current user from the verified token; never accept a target user ID.
3. Use the service-role key only inside the Edge Function environment.
4. Delete the authenticated `auth.users` record so database cascades remove owned rows.
5. Return an idempotent success response when deletion is already complete.
6. Avoid logging email, activity text, reflections, or tokens.
7. Be covered by an integration test or a documented local verification script.

No service credential may enter the Expo bundle. Other MVP mutations remain PostgreSQL RPCs.

---

## 4. Project Structure

```text
app/
├── _layout.tsx
├── index.tsx
├── (auth)/
│   ├── _layout.tsx
│   ├── sign-in.tsx
│   ├── sign-up.tsx
│   ├── forgot-password.tsx
│   └── reset-password.tsx
├── (onboarding)/
│   ├── _layout.tsx
│   ├── identity.tsx
│   ├── categories.tsx
│   ├── activities.tsx
│   └── preview.tsx
├── (tabs)/
│   ├── _layout.tsx
│   ├── index.tsx
│   ├── character.tsx
│   ├── achievements.tsx
│   └── history.tsx
├── category/
│   └── [categoryId].tsx
├── activity/
│   ├── log.tsx
│   └── [activityId].tsx
├── templates/
│   ├── new.tsx
│   └── [templateId].tsx
└── settings/
    ├── index.tsx
    ├── profile.tsx
    ├── categories.tsx
    ├── accessibility.tsx
    └── account.tsx

src/
├── components/
│   ├── ui/
│   ├── progression/
│   ├── activities/
│   └── feedback/
├── features/
│   ├── auth/
│   ├── onboarding/
│   ├── progression/
│   ├── activities/
│   ├── achievements/
│   ├── character/
│   ├── history/
│   └── settings/
├── hooks/
├── lib/
│   ├── supabase.ts
│   ├── query-client.ts
│   ├── offline-queue.ts
│   ├── analytics.ts
│   └── errors.ts
├── services/
│   ├── activities.ts
│   ├── progression.ts
│   ├── achievements.ts
│   └── profiles.ts
├── theme/
│   ├── tokens.ts
│   ├── categories.ts
│   └── typography.ts
├── types/
│   ├── database.ts
│   └── domain.ts
├── utils/
└── constants/

supabase/
├── config.toml
├── functions/
│   └── delete-account/
├── migrations/
├── seed.sql
└── tests/
```

Feature modules may contain their own components, hooks, schemas, and tests. Shared UI primitives belong in `src/components/ui`.

---

## 5. Database Model

Use UUID primary keys and `timestamptz` timestamps. Enable `citext` for case-insensitive unique handles when supported.

### Enumerations

```text
xp_tier:
quick | focused | challenging | milestone | major

xp_source:
manual | system_reward | integration

xp_event_type:
activity_award | activity_reversal | migration_adjustment

achievement_rarity:
common | rare | epic | legendary

activity_status:
active | reversed
```

Do not add `admin_adjustment` to the client-facing product. Any migration adjustment must be operational and documented.

### 5.1 `profiles`

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | References `auth.users(id)` |
| handle | citext unique | 3–24 characters |
| display_name | text | 1–50 characters |
| emblem_key | text | Controlled local emblem identifier |
| equipped_title_id | uuid nullable | Must belong to user |
| onboarding_completed | boolean | Default false |
| reduced_motion | boolean | Default false |
| haptics_enabled | boolean | Default true |
| created_at | timestamptz | Server default |
| updated_at | timestamptz | Trigger-maintained |

### 5.2 `categories`

Seeded system records.

| Column | Type |
|---|---|
| id | uuid PK |
| slug | text unique |
| name | text |
| description | text |
| icon_key | text |
| color_token | text |
| sort_order | integer |
| is_active | boolean |

### 5.3 `attributes`

Seeded system records.

| Column | Type |
|---|---|
| id | uuid PK |
| category_id | uuid FK |
| slug | text |
| name | text |
| description | text |
| icon_key | text |
| sort_order | integer |
| is_active | boolean |

Unique constraint: `(category_id, slug)`.

### 5.4 `user_categories`

Tracks category selection and denormalized progression.

| Column | Type |
|---|---|
| user_id | uuid FK |
| category_id | uuid FK |
| is_selected | boolean |
| sort_order | integer |
| total_xp | bigint default 0 |
| current_level | integer default 1 |
| created_at | timestamptz |
| updated_at | timestamptz |

Primary key: `(user_id, category_id)`.

### 5.5 `user_attributes`

| Column | Type |
|---|---|
| user_id | uuid FK |
| attribute_id | uuid FK |
| total_xp | bigint default 0 |
| current_level | integer default 1 |
| created_at | timestamptz |
| updated_at | timestamptz |

Primary key: `(user_id, attribute_id)`.

### 5.6 `activity_templates`

System templates use `owner_user_id = null`; custom templates have an owner.

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| owner_user_id | uuid nullable | Null means system template |
| category_id | uuid FK | |
| attribute_id | uuid FK | Must belong to category |
| name | text | 1–80 characters |
| description | text nullable | |
| xp_tier | xp_tier | |
| xp_value | integer | Must equal tier mapping |
| icon_key | text | Controlled icon |
| default_duration_minutes | integer nullable | 1–1440 |
| is_archived | boolean | Default false |
| created_at | timestamptz | |
| updated_at | timestamptz | |

Favorite and usage state for both system and custom templates belongs in `user_template_preferences`, never in the shared template record:

### 5.7 `user_template_preferences`

| Column | Type |
|---|---|
| user_id | uuid FK |
| template_id | uuid FK |
| is_favorite | boolean |
| last_used_at | timestamptz nullable |
| use_count | integer default 0 |

Primary key: `(user_id, template_id)`.

### 5.8 `activity_logs`

Activity logs preserve snapshots so template edits never rewrite history.

| Column | Type |
|---|---|
| id | uuid PK |
| user_id | uuid FK |
| template_id | uuid nullable FK |
| category_id | uuid FK |
| attribute_id | uuid FK |
| template_name_snapshot | text |
| xp_tier_snapshot | xp_tier |
| xp_value_snapshot | integer |
| source | xp_source |
| note | text nullable |
| private_reflection | text nullable |
| duration_minutes | integer nullable |
| occurred_at | timestamptz |
| status | activity_status |
| client_request_id | uuid |
| created_at | timestamptz |
| updated_at | timestamptz |
| reversed_at | timestamptz nullable |

Unique constraint: `(user_id, client_request_id)` for idempotent offline retries.

### 5.9 `xp_ledger`

Immutable ledger.

| Column | Type |
|---|---|
| id | uuid PK |
| user_id | uuid FK |
| category_id | uuid FK |
| attribute_id | uuid FK |
| activity_log_id | uuid FK |
| event_type | xp_event_type |
| amount | integer |
| source | xp_source |
| metadata | jsonb |
| created_at | timestamptz |

Rules:

- Positive award amount must match the activity snapshot.
- Reversal amount must be the exact negative of the original award.
- Ledger rows cannot be updated or deleted through client policies.
- One positive award and at most one reversal per activity log.
- Use unique partial indexes to enforce these constraints.

### 5.10 `titles`

| Column | Type |
|---|---|
| id | uuid PK |
| slug | text unique |
| name | text |
| description | text |
| rarity | achievement_rarity |
| icon_key | text nullable |
| is_active | boolean |

### 5.11 `achievements`

| Column | Type |
|---|---|
| id | uuid PK |
| slug | text unique |
| name | text |
| description | text |
| rarity | achievement_rarity |
| icon_key | text |
| is_hidden | boolean |
| rule_type | text |
| rule_config | jsonb |
| reward_title_id | uuid nullable |
| sort_order | integer |
| is_active | boolean |

Allowed `rule_type` values for MVP:

```text
onboarding_completed
total_activity_count
total_xp
character_level
category_level
attribute_level
active_category_count
distinct_active_days
activity_tier_count
category_activity_count
```

`rule_config` must be validated by the achievement evaluator; do not execute arbitrary expressions from JSON.

### 5.12 `user_achievements`

| Column | Type |
|---|---|
| user_id | uuid FK |
| achievement_id | uuid FK |
| unlocked_at | timestamptz |
| trigger_activity_log_id | uuid nullable |

Primary key: `(user_id, achievement_id)`.

### 5.13 `user_titles`

| Column | Type |
|---|---|
| user_id | uuid FK |
| title_id | uuid FK |
| unlocked_at | timestamptz |
| source_achievement_id | uuid nullable |

Primary key: `(user_id, title_id)`.

### 5.14 `profile_progress`

Prefer a view or one-row summary table maintained transactionally:

| Field | Purpose |
|---|---|
| user_id | Owner |
| total_xp | Sum of active ledger |
| current_level | Derived from total XP |
| activity_count | Active logs |
| achievement_count | Unlock count |
| distinct_active_days | Retention/progress display |
| updated_at | Freshness |

Start with a SQL view if performance is sufficient. Move to a summary table only after profiling.

---

## 6. XP and Level Functions

### Tier mapping

The database owns this mapping:

```text
quick       = 10
focused     = 25
challenging = 60
milestone   = 150
major       = 400
```

Client-supplied numeric XP is ignored.

### Required SQL functions

#### `xp_for_tier(tier xp_tier) -> integer`

Returns the locked tier value.

#### `xp_required_for_next_level(level integer) -> integer`

```text
round(100 × level^1.35)
```

Reject levels below 1.

#### `level_from_total_xp(total_xp bigint) -> integer`

Iteratively or through a precomputed level table determines the level. A precomputed `level_thresholds` seed table for levels 1–100 is acceptable and may be simpler to test. Support beyond level 100 by extending the table or using the formula.

#### `log_activity(...)`

A `security definer` RPC with a fixed `search_path` that:

1. Resolves `auth.uid()`.
2. Validates the template is a visible system template or belongs to the user.
3. Resolves category, attribute, tier, and XP from the trusted template.
4. Validates the attribute belongs to the category.
5. Inserts the activity log with snapshots and `client_request_id`.
6. Inserts the positive ledger event.
7. Recalculates or increments category and attribute totals.
8. Updates template preference usage.
9. Evaluates achievements.
10. Returns the activity, XP result, old/new levels, and newly unlocked achievements/titles.
11. Handles duplicate `client_request_id` idempotently by returning the original result.

Do not let the client insert directly into `xp_ledger`.

#### `reverse_activity(activity_id uuid)`

A transaction that:

1. Verifies ownership and active status.
2. Inserts the exact negative ledger event.
3. Marks the log reversed.
4. Recalculates affected progression.
5. Returns old/new level state.
6. Is idempotent: a second call returns the existing reversed state without another negative row.

#### `equip_title(title_id uuid)`

Verifies the user owns the title before changing `profiles.equipped_title_id`.

#### `complete_onboarding(...)`

Creates profile selections and awards the onboarding achievement/title without granting gameplay XP.

### Level result contract

Return enough information to animate accurately:

```ts
type ProgressionDelta = {
  xpAwarded: number;
  character: {
    oldLevel: number;
    newLevel: number;
    oldTotalXp: number;
    newTotalXp: number;
  };
  category: {
    id: string;
    oldLevel: number;
    newLevel: number;
    oldTotalXp: number;
    newTotalXp: number;
  };
  attribute: {
    id: string;
    oldLevel: number;
    newLevel: number;
    oldTotalXp: number;
    newTotalXp: number;
  };
  unlockedAchievements: Achievement[];
  unlockedTitles: Title[];
};
```

The mobile client displays the returned delta; it does not infer unlocks.

---

## 7. Row Level Security

Enable RLS on every user-accessible table.

### Public reference data

Authenticated users may read:

- Active categories.
- Active attributes.
- Active system activity templates.
- Active achievements.
- Active titles.

Only migrations/service operations may write reference data.

### Private user data

A user may read only rows where `user_id = auth.uid()` or `owner_user_id = auth.uid()`.

A user may directly update only safe fields:

- Their profile identity/preferences.
- Their custom template metadata.
- Non-XP-bearing fields of their own active activity logs where permitted.

Trusted mutations use RPCs:

- Activity award.
- Activity reversal.
- Title equip.
- Onboarding completion.

### Security requirements

- All `security definer` functions set an explicit safe `search_path`.
- All RPCs derive the acting user from `auth.uid()`, never a client user ID.
- Validate ownership in the database even when the UI already checks it.
- Prevent direct client inserts/updates/deletes on `xp_ledger`.
- Prevent users from assigning themselves titles or achievements.
- Test cross-user denial for every private table.
- Do not expose private reflections through broad views.
- Sanitize or bound all text fields at database and Zod layers.
- Use foreign-key cascades or an explicit tested cleanup transaction so `delete-account` removes all user-owned rows.

---

## 8. Seed Data

Migrations/seed files must include:

- Eight categories.
- All default attributes listed in the PRD.
- At least 3 useful system activity templates per category.
- Five emblem options.
- The initial achievement set.
- Titles associated with achievements.
- Level thresholds or tested level function.

Examples of system templates:

```text
Development
- Focused coding session — Focused
- Finish and test a feature — Challenging
- Ship a project or major release — Milestone

Knowledge
- Focused study session — Focused
- Finish a chapter or lesson — Focused
- Pass an exam or complete a course — Milestone

Fitness
- Complete a workout — Focused
- Complete a challenging training session — Challenging
- Complete a major event — Milestone

Creativity
- Focused creative session — Focused
- Finish a creative piece — Challenging
- Publish or present a major work — Milestone
```

Seed examples are real template definitions, not fake user activity.

---

## 9. Client Data Flow

### Query conventions

Use query keys such as:

```text
['profile']
['progression', 'character']
['categories']
['category', categoryId]
['activity-templates', filters]
['activity-history', filters]
['achievements']
['titles']
```

### Mutation conventions

- All activity mutations use a generated UUID `client_request_id`.
- On confirmed success, update relevant query caches from the server response and then refetch in the background.
- Never show awarded XP as confirmed before the RPC succeeds.
- Show a pending badge for queued offline logs.
- Retry idempotently when connectivity returns.
- Failed permanent validation returns the draft to the user for correction.

### Offline queue

Store only pending activity-command payloads, not secret keys.

Each queued command contains:

```ts
type PendingActivityCommand = {
  clientRequestId: string;
  templateId: string;
  occurredAt: string;
  durationMinutes?: number;
  note?: string;
  privateReflection?: string;
  queuedAt: string;
  attemptCount: number;
};
```

Queue requirements:

- FIFO processing.
- Idempotent RPC.
- Visible pending state.
- Exponential retry for transient failures.
- No infinite retry for validation or authorization failures.
- Manual retry/delete option.

Full offline browsing is not required for MVP; cached last-known data is enough.

---

## 10. UI Engineering Rules

- Use centralized spacing, typography, radius, elevation, motion, and semantic color tokens.
- Category colors are accents, not entire screen backgrounds.
- All text must support Dynamic Type reasonably.
- Minimum interactive target: 44×44 points.
- Avoid conveying level/rarity using color alone.
- Reduced-motion mode replaces large animations with opacity/number changes.
- Haptics respect the user setting.
- Reusable primitives include:
  - `Screen`
  - `AppHeader`
  - `Card`
  - `Button`
  - `IconButton`
  - `ProgressBar`
  - `LevelBadge`
  - `CategoryBadge`
  - `StatTile`
  - `EmptyState`
  - `ErrorState`
  - `Skeleton`
  - `BottomSheet`
  - `CelebrationModal`
- No web-only CSS, hover-dependent interactions, or desktop side navigation.

---

## 11. Error Handling

Create typed application errors:

```text
AuthError
ValidationError
AuthorizationError
ConflictError
NetworkError
ServerError
UnknownError
```

User-facing rules:

- Explain what happened in plain language.
- Preserve unsent form data.
- Offer retry only when meaningful.
- Never expose raw PostgreSQL or Supabase error text.
- Log technical context through a replaceable error reporter.
- Authentication expiration redirects safely to sign-in after preserving pending local drafts.

---

## 12. Analytics Contract

Create a small analytics adapter with a no-op implementation initially. Product code emits named events without depending directly on a vendor.

Initial events:

```text
sign_up_completed
onboarding_started
onboarding_completed
category_selected
activity_log_started
activity_log_completed
activity_log_failed
activity_reversed
custom_template_created
character_level_up
category_level_up
attribute_level_up
achievement_unlocked
title_equipped
character_card_exported
offline_activity_queued
offline_activity_synced
account_deleted
```

Never send notes, reflections, email addresses, or activity text as analytics properties.

---

## 13. Testing Requirements

### Database tests

Must cover:

- Tier-to-XP mapping.
- Level threshold correctness at boundary values.
- Activity log transaction.
- Duplicate `client_request_id`.
- Reversal idempotency.
- Ledger immutability.
- Category and attribute total consistency.
- Achievement unlock exactly once.
- Title ownership enforcement.
- Cross-user RLS denial.
- System versus custom template visibility.
- Invalid category/attribute combinations.
- Account deletion behavior.

### Unit tests

Must cover:

- Zod form schemas.
- Client progress formatting.
- Offline queue retry classification.
- Share-card privacy mapping.
- Reduced-motion behavior helpers.
- Error translation.

### Component tests

Must cover:

- Empty dashboard.
- Log activity happy path.
- Server failure preserving form.
- Pending offline activity state.
- Level-up result rendering.
- Locked/unlocked achievement rendering.
- Reversal confirmation.

### E2E smoke flow

Before release:

1. Create account.
2. Complete onboarding.
3. Log an activity.
4. Observe XP.
5. Open category detail.
6. Unlock/equip a seeded easy title.
7. Export character card.
8. Reverse activity.
9. Sign out/in.
10. Confirm persistence.

---

## 14. Performance and Quality Targets

- Dashboard should render useful cached content immediately after first successful load.
- Avoid N+1 queries; use views/RPC result payloads for dashboard summaries.
- Paginate history, initially 25 records per page.
- Do not load all historical activities for charts.
- Character card generation must work without remote image dependencies.
- Keep app startup free of unnecessary network requests.
- Use strict TypeScript with no unexplained `any`.
- No unhandled promise rejections.
- No production `console.log`.
- All migrations must be reversible through local reset even when a down migration is not separately maintained.

---

## 15. Release Configuration

Prepare:

- Development app identity.
- Preview/internal testing identity.
- Production app identity.
- EAS build configuration.
- Privacy policy URL placeholder.
- Support email placeholder.
- Account deletion path.
- App icon and splash assets.
- iOS and Android permission descriptions only for permissions actually used.

The MVP should not request camera, photo library, location, contacts, health, or notification permissions because none are required for the locked scope.

---

## 16. Future Compatibility

Design the schema so later features can add:

- `friendships`
- `parties`
- `party_members`
- `verified_integrations`
- `integration_events`
- `seasons`
- `season_progress`
- `character_card_themes`
- `public_profile_settings`

Do not create these tables until their features are approved.
