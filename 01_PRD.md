# RealLife XP — Product Requirements Document

## 1. Product Definition

### One-line pitch

**Your real life has stats.**

### Product concept

RealLife XP converts meaningful real-world actions into a persistent RPG-style character profile. Users earn XP in life categories such as Development, Knowledge, Fitness, Creativity, Social, Exploration, Life Management, and Finance. Each category contains more specific attributes. Progress produces levels, achievements, unlockable titles, and a shareable character sheet.

The product should feel like opening a character menu in a polished game and discovering that the character is the user.

### What it is not

RealLife XP is not:

- A to-do list.
- A conventional habit tracker.
- A streak-maintenance app.
- A self-help coach.
- A public social network.
- A competitive fitness platform.
- A system that claims to objectively measure a person's worth.
- A game with real-money rewards.

XP represents self-defined progress inside the app. It is motivational feedback, not a scientific score.

---

## 2. Product Principles

1. **Meaningful over repetitive.** Reward completed actions and milestones, not endless checkbox spam.
2. **Fast logging.** A recurring activity should be loggable in fewer than 10 seconds.
3. **No guilt mechanics.** Missing a day never removes XP, breaks a visible streak, or produces shame-based copy.
4. **Transparent progression.** Users must always understand why they received XP and what is required for the next level.
5. **Personal first.** The profile should remain valuable without friends or followers.
6. **Game feel, adult presentation.** Use satisfying feedback, haptics, levels, titles, and rarity without childish language.
7. **Privacy by default.** User activity is private unless the user deliberately exports a static share card.
8. **Honest competition later.** Social comparison must distinguish self-reported progress from future verified integrations.
9. **Low friction.** Avoid forms that ask for unnecessary detail.
10. **Respectful flexibility.** Users choose which areas of life matter to them.

---

## 3. Goals and Success Criteria

### MVP goals

- Prove users enjoy representing personal growth as an RPG profile.
- Make the first activity log and first level-up satisfying.
- Establish a durable XP ledger that can support later social and integration features.
- Create a polished character sheet users want to revisit and share.
- Achieve useful retention without relying on punitive streaks.

### Product success signals

The following events matter more than raw downloads:

- User completes onboarding.
- User logs a first activity.
- User returns and logs on multiple distinct days.
- User reaches a category level.
- User unlocks and equips a title.
- User views their character sheet repeatedly.
- User exports a character card.
- User creates at least one custom activity template.

### Initial product metrics

Track:

- Onboarding completion rate.
- First activity completion rate.
- Median time from onboarding completion to first log.
- Activities logged per active user.
- Distinct active days per user over 7 and 30 days.
- Percentage of users reaching character level 3.
- Achievement unlock rate.
- Title equip rate.
- Character card export rate.
- Account deletion and activity reversal/error rates.

Do not optimize around streak length.

---

## 4. Target Users

### Primary users

- Students who want a satisfying view of academic and personal development.
- Developers and creators who enjoy game progression systems.
- Gamers who understand levels, attributes, achievements, and titles.
- Young adults who find conventional productivity apps sterile or guilt-driven.
- Multi-interest users who want to see balance across different areas of life.

### Core jobs to be done

- “Show me that the things I do are adding up.”
- “Let me see which parts of my life I am developing.”
- “Make progress feel satisfying without turning my life into chores.”
- “Give me a profile that represents what I have actually done.”
- “Help me remember meaningful milestones.”
- “Give me a fun yearly record of how I changed.”

---

## 5. Core Progression Model

### Hierarchy

```text
Character
└── Categories
    └── Attributes
        └── Activity templates
            └── Activity logs
```

- **Character level:** Represents total XP across all categories.
- **Category level:** Represents progress in a broad life area.
- **Attribute level:** Represents progress in a specific discipline inside a category.
- **Activity template:** A reusable definition such as “Focused coding session.”
- **Activity log:** One completed real-world action.
- **Achievement:** A permanent unlock earned by satisfying a rule.
- **Title:** A cosmetic identity label unlocked through achievements.
- **Character card:** A visual summary of the user's level, title, and strongest stats.

### Default categories and attributes

Users choose 3–6 active categories during onboarding. Inactive categories remain available later.

| Category | Purpose | Default attributes |
|---|---|---|
| Development | Career and technical building | Frontend, Backend, Mobile, DevOps, Shipping |
| Knowledge | Structured learning | Coursework, Reading, Research, Languages |
| Fitness | Physical development | Strength, Cardio, Mobility, Recovery |
| Creativity | Creative output | Design, Writing, Music, Content |
| Social | Relationships and community | Friends, Family, Community, Networking |
| Exploration | New places and experiences | Travel, New Places, New Experiences |
| Life Management | Maintaining everyday life | Organization, Maintenance, Administration |
| Finance | Financial capability | Saving, Earning, Learning, Planning |

The language should never imply that one category is morally more valuable than another.

### XP tiers

Every activity template has one fixed XP tier. The user sees the XP before logging.

| Tier | XP | Intended use | Example |
|---|---:|---|---|
| Quick | 10 | Small but meaningful action | Read a useful article |
| Focused | 25 | Deliberate session or normal completion | Complete a focused study session |
| Challenging | 60 | Substantial task | Finish and test a feature |
| Milestone | 150 | Significant completion | Pass an exam or ship a project |
| Major | 400 | Rare major achievement | Graduate, complete a marathon, release a major product |

Users may create custom activity templates and choose a tier, but XP labels must include plain-language guidance to discourage inflation.

### Level curve

All character, category, and attribute levels use the same curve:

```text
XP required to advance from level L to L+1:
round(100 × L^1.35)
```

- All profiles begin at Level 1 with 0 XP.
- Levels never decrease because of inactivity.
- Reversing an incorrect activity may reduce XP and therefore recalculate a level.
- The UI displays current-level progress and XP required for the next level.
- Level calculations are performed on the server.

### Integrity model

MVP XP is self-reported and should be presented honestly as such.

- No global leaderboard in MVP.
- XP writes are created by a server-authoritative database function.
- The client may preview XP but cannot directly insert trusted XP ledger rows.
- Each activity log creates an immutable positive ledger event.
- Reversing an activity creates an immutable negative ledger event.
- Ledger rows are not edited or deleted.
- Future integrations may mark XP as `verified`, but verified XP is post-MVP.

---

## 6. Core User Experience

### 6.1 Authentication

MVP supports:

- Email and password sign-up.
- Email verification where configured.
- Sign-in.
- Password reset.
- Sign-out.
- Account deletion.

Social authentication is post-MVP.

### 6.2 Onboarding

The onboarding flow should take only a few minutes:

1. Enter display name and unique handle.
2. Select an emblem style or initials-based avatar.
3. Choose 3–6 active categories.
4. Review the default attributes under each selected category.
5. Choose starter activity templates or accept recommended defaults.
6. See a preview of the future character sheet.
7. Complete onboarding and receive the non-XP “Character Created” achievement.

The app must not ask users to define long-term goals before they understand the product.

### 6.3 Home dashboard

The home dashboard contains:

- Character level, equipped title, and emblem.
- Overall XP progress.
- Primary **Log Activity** action.
- Active category cards with level and progress.
- Recent activity summary.
- Most recent achievement or next nearby achievement.
- Empty-state guidance for a new user.

The dashboard must avoid dense analytics.

### 6.4 Log activity

Fast path:

1. Tap **Log Activity**.
2. Select a recent/favorite template.
3. Optionally adjust date/time, duration, or add a short note.
4. Confirm.
5. Receive XP feedback.

Full path:

1. Select category.
2. Select attribute.
3. Select an existing template or create a custom template.
4. Review XP tier.
5. Add optional details.
6. Confirm.

Required fields:

- Activity template.
- Occurrence date/time.

Optional fields:

- Note, maximum 280 characters.
- Duration in minutes.
- Private reflection, maximum 1,000 characters, hidden from share output.

Logging an activity should use optimistic UI only after the server RPC accepts the transaction. If offline, queue the activity locally and label it as pending rather than showing confirmed XP.

### 6.5 Progress feedback

After a successful log:

- Show gained XP.
- Animate the affected attribute and category bars.
- Use light haptic feedback.
- If a level changes, show a focused level-up celebration.
- If an achievement unlocks, show it after the XP animation.
- Do not show more than one full-screen celebration per log; combine multiple unlocks in one summary.

The user can dismiss all animations immediately.

### 6.6 Character sheet

The character sheet is the emotional center of the app.

It shows:

- Emblem or initials avatar.
- Display name and handle.
- Character level.
- Equipped title.
- Total XP.
- Active category levels.
- Strongest attributes.
- Achievement count.
- Account creation date or “Journey began.”
- Share/export action.

The character sheet must remain visually useful even for a new account.

### 6.7 Category detail

Each category page shows:

- Category name, level, XP, and next-level progress.
- Attribute list with individual levels.
- Recent activities in that category.
- Favorite/recent activity templates.
- Total activities and distinct active days.
- A lightweight progress chart by week or month.

Do not show negative judgments such as “falling behind.”

### 6.8 Achievements and titles

Achievements are data-driven and permanent.

Initial achievement rule types:

- Total activity count.
- Total XP.
- Character level.
- Category level.
- Attribute level.
- Number of active categories.
- Number of distinct active days.
- Count of activities by XP tier.
- Count of activities in a category.

Initial achievements should include:

| Achievement | Rule | Reward |
|---|---|---|
| Character Created | Finish onboarding | Title: The Initiate |
| First Step | Log first activity | Cosmetic badge |
| Taking Form | Reach character level 3 | Title: The Rising |
| Specialist | Reach level 5 in any category | Title: The Specialist |
| Multi-Class | Reach level 3 in three categories | Title: The Versatile |
| Deep Focus | Log 10 Focused-or-higher activities | Cosmetic badge |
| Milestone Maker | Log first Milestone activity | Title: The Builder |
| Major Moment | Log first Major activity | Epic badge |
| Century | Log 100 activities | Title: The Veteran |
| Showing Up | Log on 10 distinct days | Cosmetic badge |
| Balanced Build | Have five active categories with XP | Title: The Balanced |
| Attribute Mastery I | Reach attribute level 5 | Category-themed badge |

Achievements may be hidden until unlocked when discovery adds value. Hidden achievements must not obscure essential product understanding.

Users can equip one unlocked title. Titles are cosmetic and never provide XP multipliers.

### 6.9 History and correction

History supports:

- Chronological activity list.
- Filter by category, attribute, template, tier, and date.
- Activity detail.
- Edit note, reflection, duration, and occurrence time.
- Reverse an activity.
- Recreate an activity with another template when the XP-bearing fields were wrong.

A reversal must clearly explain that the corresponding XP will be removed. The system records a reversal event rather than deleting financial-ledger-style history.

### 6.10 Custom activity templates

Users may create reusable templates with:

- Name.
- Category.
- Attribute.
- XP tier.
- Optional default duration.
- Icon from a controlled icon set.
- Favorite status.

Users can edit or archive their templates. Editing a template never changes historical activity logs because logs store snapshots.

### 6.11 Shareable character card

The user can export a static image containing:

- Display name or optional hidden-name mode.
- Emblem.
- Character level.
- Equipped title.
- Top 3 categories.
- Top 3 attributes.
- Achievement count.
- RealLife XP branding.

The exported card must not include private notes, email, detailed activity history, or exact personal dates. Sharing occurs through the operating system share sheet. There is no public profile URL in MVP.

### 6.12 Settings and data controls

Settings include:

- Profile identity and emblem.
- Active category management.
- Theme preference: dark by default, system option available.
- Reduced motion.
- Haptic feedback.
- Data export request.
- Privacy explanation.
- Sign out.
- Delete account.

Account deletion must delete or anonymize all user-owned data according to the backend retention policy.

---

## 7. Navigation

Use a bottom tab navigator with four destinations:

1. **Home**
2. **Character**
3. **Achievements**
4. **History**

The central or floating **Log Activity** action remains accessible from primary screens.

Settings opens from the profile/header area and is not a fifth tab.

---

## 8. MVP Scope

### Included

- Expo iOS and Android app.
- Supabase authentication.
- Onboarding.
- Default categories and attributes.
- System and custom activity templates.
- Server-authoritative XP logging.
- Character, category, and attribute levels.
- Home dashboard.
- Character sheet.
- Category details.
- Activity history and reversal.
- Initial achievement and title system.
- Generated emblem/initial avatars.
- Shareable character card.
- Reduced-motion and basic accessibility support.
- Local pending queue for temporarily offline activity logs.
- Database migrations, seed data, RLS policies, tests, and basic error monitoring hooks.

### Explicitly deferred

- Friends and friend comparisons.
- Parties and cooperative achievements.
- Global or category leaderboards.
- Public profiles and feeds.
- GitHub, Apple Health, Health Connect, Strava, Steam, Duolingo, or calendar integrations.
- Verified XP.
- AI-generated plans or coaching.
- Daily quests.
- Streaks.
- Push-notification campaigns.
- Full character/avatar customization.
- Purchasable cosmetics.
- Creator marketplace.
- Organizations or university accounts.
- Yearly animated recap.
- Web application.
- Localization beyond an architecture-ready string system.

---

## 9. Monetization Direction

Do not add payment code until the free loop is validated.

Pro candidates after MVP:

- Advanced character card themes.
- Additional emblem and profile themes.
- Unlimited custom activity templates if a sensible free limit is needed.
- Detailed historical charts.
- Yearly character recap.
- Data integrations.
- Multiple saved character-card layouts.
- Optional private backup/export features.
- Party creation and advanced social features.

Preferred launch model:

- Useful free core.
- Low-cost lifetime Founder unlock during early launch.
- Later annual Pro option.
- No pay-to-earn XP.
- No ads interrupting activity logging or level-up moments.

---

## 10. Post-MVP Roadmap

### Expansion A — Social layer

- Friend requests or invite links.
- Private friend profiles.
- Category-specific comparison.
- Parties.
- Cooperative achievements.
- Manual XP remains visibly self-reported.

### Expansion B — Verified integrations

- GitHub.
- Health platforms.
- Strava.
- Learning platforms.
- Calendar-based events.
- Verified XP shown separately from self-reported XP.

### Expansion C — Seasons and recap

- Yearly season summary.
- Character sheet history.
- “Your Year as a Character” export.
- Category growth comparisons.
- Meaningful milestone timeline.

### Expansion D — Deeper skill progression

- Optional user-created skill trees.
- Boss challenges and project evidence.
- This can borrow selected concepts from the separate SkillTree product without turning MVP into a learning platform.

---

## 11. Acceptance Criteria

### Product-level acceptance

The MVP is acceptable when:

- A user can finish onboarding without developer assistance.
- Default categories, attributes, activities, achievements, and titles are seeded by migrations.
- A normal activity can be logged from the dashboard in fewer than 10 seconds after setup.
- The database, not the client, decides the trusted XP amount.
- Character, category, and attribute totals remain consistent after create and reversal operations.
- Level-up feedback accurately reflects the server result.
- The user can unlock and equip a title.
- The user can export a character card without exposing private fields.
- No core screen requires fake production data.
- Empty, loading, offline, and recoverable error states exist.
- Critical flows work on both iOS and Android.
- RLS prevents one user from reading or changing another user's private records.
- Account deletion is implemented and verified.
- Automated tests cover XP calculations, ledger integrity, RLS ownership, and the primary logging flow.

### No unresolved decisions required to begin

Minor implementation details should follow the simplest approach consistent with this document and be recorded in the implementation plan's Decision Log.
