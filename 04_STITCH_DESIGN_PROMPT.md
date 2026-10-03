# Stitch Design Prompt — RealLife XP Mobile App

Copy everything inside the prompt section into Stitch.

---

## Prompt

Design a complete high-fidelity mobile application called **RealLife XP** for iOS and Android.

### Product concept

RealLife XP turns meaningful real-world activity into an RPG-style personal character profile. Users log completed activities such as coding, studying, exercising, creating, exploring, maintaining their life, or improving finances. Activities grant XP to a broad category and a specific attribute. Users gain character levels, category levels, achievements, badges, and cosmetic titles.

The app is **not a habit tracker, task manager, childish game, public social network, or fantasy role-playing game**. It should feel like a sophisticated modern game profile powered by real life.

Tagline: **Your real life has stats.**

### Overall visual direction

Create a premium, immersive, dark-first mobile design with the polish of a modern RPG character menu and the clarity of a high-quality consumer finance or fitness app.

The visual tone should be:

- Mature.
- Focused.
- Rewarding.
- Slightly futuristic.
- Minimal but not empty.
- Game-inspired without swords, dragons, medieval ornaments, pixel art, or childish cartoon UI.
- Rich enough to feel special, but simple enough for daily use.

Use:

- Near-black and charcoal surfaces.
- Layered cards with subtle borders and soft elevation.
- A warm off-white primary text color.
- One restrained electric accent for global character progress.
- Category-specific accent colors.
- Soft controlled gradients only for level-up moments, character cards, and rare achievements.
- Clear, strong typography.
- Rounded geometry around 16–24 px.
- Thin progress tracks with bright filled states.
- Clean iconography.
- Small particles, glows, rings, or grid textures only as subtle game atmosphere.
- Large amounts of readable negative space.
- Premium number styling for levels and XP.

Avoid:

- Neon overload.
- Glassmorphism on every element.
- Tiny low-contrast text.
- Dense dashboards.
- Generic productivity checkmarks everywhere.
- Calendar-first habit UI.
- Red failure states for inactivity.
- Flame streak icons.
- Public-feed patterns.
- Desktop sidebars.
- Web hover states.
- Fake 3D characters that would be difficult to implement in Expo.

### Category color system

Use semantic accent colors consistently:

- Development — electric blue.
- Knowledge — violet.
- Fitness — emerald.
- Creativity — magenta.
- Social — amber.
- Exploration — cyan.
- Life Management — cool slate.
- Finance — muted gold.

Category color should accent icons, progress, and borders. It should not fill entire screens.

### Device and implementation constraints

Design for a modern mobile viewport around **390 × 844** while remaining adaptable to smaller Android devices.

The final design must be practical to implement in:

- Expo.
- React Native.
- Expo Router.
- React Native StyleSheet.
- React Native Reanimated.

Use native-friendly layouts and components. Do not rely on web-only CSS, complex shader effects, hover interactions, permanent side navigation, or impossible layered 3D scenes.

Use a bottom tab bar with:

1. Home
2. Character
3. Achievements
4. History

Keep a prominent **Log Activity** action accessible from the dashboard and primary navigation area. Settings is opened from the profile/header, not a fifth tab.

### Core navigation flow

```text
Welcome / Authentication
→ Onboarding
→ Home Dashboard
→ Log Activity
→ XP Result / Level-Up
→ Character / Category / Achievements / History
```

### Screen 1 — Welcome and authentication

Design a striking but restrained welcome screen.

Include:

- RealLife XP wordmark.
- Tagline: “Your real life has stats.”
- Abstract character-level ring or stat constellation as the hero visual.
- Primary button: “Create Your Character.”
- Secondary button: “Sign In.”
- Email/password sign-up and sign-in variations.
- Forgot-password state.
- Loading and inline error states.

Do not make the screen look like a fantasy game login.

### Screen 2 — Onboarding: identity

Include:

- Progress indicator for onboarding.
- Display name.
- Unique handle.
- Selection of 5 abstract emblem/initial-avatar styles.
- Live mini-preview of the character identity.
- Clear continue button.
- Friendly copy: “Start with who you are. Your stats come next.”

### Screen 3 — Onboarding: choose categories

Create selectable cards for:

- Development.
- Knowledge.
- Fitness.
- Creativity.
- Social.
- Exploration.
- Life Management.
- Finance.

Requirements:

- User chooses 3–6.
- Each card includes icon, name, short description, and accent.
- Selected state feels powerful and clear.
- Show the selected count.
- Avoid checkbox-list aesthetics.
- Include a compact view of the default attributes after selecting a category.

### Screen 4 — Onboarding: starter activities

For selected categories, show recommended activity templates such as:

- Focused coding session — +25 XP.
- Finish and test a feature — +60 XP.
- Focused study session — +25 XP.
- Complete a workout — +25 XP.
- Finish a creative piece — +60 XP.

Let users favorite starter activities. Keep this screen fast and skippable with sensible defaults.

### Screen 5 — Onboarding: character preview

Show a polished preview card containing:

- Emblem.
- Display name.
- Handle.
- Character Level 1.
- Title: “The Initiate.”
- Selected categories at Level 1.
- Locked achievement silhouettes.
- CTA: “Begin Your Journey.”

This should create anticipation without pretending the user has already earned XP.

### Screen 6 — Home dashboard

This is the most important daily screen.

Top section:

- Small greeting.
- Settings/profile icon.
- Character emblem.
- Large “LEVEL 7” treatment.
- Equipped title, e.g. “The Builder.”
- Overall XP text, e.g. “1,240 / 1,446 XP.”
- Overall progress bar or ring.

Primary action:

- Large, obvious “Log Activity” button.
- It should feel rewarding, not like adding a task.

Main content:

- Active category cards in a two-column grid or horizontally scrollable stack.
- Each category card shows icon, level, category name, and progress.
- “Continue your build” section with recent/favorite activity templates.
- Recent progress list.
- Nearby achievement card such as “Specialist — Reach Level 5 in any category.”
- Compact empty state for a brand-new profile.

Provide loaded, skeleton, empty, offline-cached, and recoverable-error versions.

### Screen 7 — Log activity: fast bottom sheet

Create a fast bottom sheet/modal.

Initial view:

- Search.
- Recent templates.
- Favorite templates.
- Category filter chips.
- Each template shows icon, category/attribute, name, and trusted XP.

Example:

```text
Finish and test a feature
Development · Backend
+60 XP
```

Selecting a template opens a confirmation state with:

- Template name.
- XP amount and tier.
- Occurrence time.
- Optional duration.
- Optional short note.
- Expandable private reflection.
- Confirm button: “Claim +60 XP.”

Also design:

- Full browse path: category → attribute → template.
- Create custom template entry.
- Offline queued state labeled “Pending sync.”
- Validation failure that preserves the entered data.

### Screen 8 — XP gained / level-up result

Design three adaptive result states:

1. Normal XP gain.
2. Category or attribute level-up.
3. Combined level-up plus achievement unlock.

Normal state:

- “+60 XP”
- Category and attribute progress animation.
- Dismiss or view category.

Level-up state:

- Strong but tasteful celebration.
- “BACKEND — LEVEL 5.”
- Old and new level.
- Progress carryover.
- Subtle particles or expanding rings.

Achievement state:

- Achievement badge.
- Rarity.
- Title unlocked when applicable.
- Equip title action.

All result states must be dismissible immediately and have a reduced-motion alternative.

### Screen 9 — Character sheet

This is the emotional centerpiece and must look highly shareable.

Include:

- Large abstract emblem/initial avatar.
- Display name and handle.
- Character level.
- Equipped title.
- Total XP.
- Journey start date.
- Category stat list with levels.
- Top 3 attributes.
- Achievement count.
- “Export Character Card” button.
- Edit/equip-title action.

Create two layouts:

1. Full interactive character screen.
2. Clean export card with only share-safe data.

The export card should look excellent in Instagram Stories or messaging apps. Do not show email, private notes, or exact activity details.

### Screen 10 — Category detail

Example category: Development.

Header:

- Category icon and accent.
- “Development — Level 8.”
- XP to next level.
- Progress bar.

Content:

- Attribute rows: Frontend, Backend, Mobile, DevOps, Shipping.
- Each row includes level and progress.
- Recent activities.
- Favorite templates.
- Stats: active days, total logs, total XP.
- Simple weekly/monthly XP chart.
- Positive language only; no “you are behind.”

Provide empty and established-user versions.

### Screen 11 — Achievements

Design:

- Summary header with unlocked count.
- Filter by All, Unlocked, Locked, Hidden.
- Grid or visually rich list of badges.
- Rarity treatments: common, rare, epic, legendary.
- Locked achievements remain understandable.
- Hidden achievements appear as tasteful silhouettes.
- Achievement detail sheet with description, condition, unlock date, and rewarded title.
- Recently unlocked state.

Avoid making the screen look like a mobile game store.

### Screen 12 — Title selection

Create a focused title selector:

```text
The Initiate
The Rising
The Builder
The Specialist
The Versatile
The Veteran
```

Each item shows rarity, source achievement, and equipped state. Locked titles cannot be equipped. Preview the title live beneath the user's name.

### Screen 13 — History

Include:

- Chronological grouped list.
- Search and filters for category, attribute, tier, and date.
- Activity row with category icon, name, date, and XP.
- Pending offline item.
- Reversed item with clear neutral styling.
- Pagination/infinite-scroll loading state.
- Empty filtered state.

Activity detail includes:

- Snapshot name.
- Category/attribute.
- Awarded XP.
- Date/time.
- Duration.
- Note.
- Private reflection.
- Edit safe fields.
- Reverse activity action with a serious confirmation sheet explaining that XP will be removed.

Do not make “reverse” look like a casual swipe action.

### Screen 14 — Custom activity template

Form fields:

- Name.
- Category.
- Attribute.
- XP tier selection using five visually clear tier cards:
  - Quick +10
  - Focused +25
  - Challenging +60
  - Milestone +150
  - Major +400
- Optional default duration.
- Icon selector.
- Favorite toggle.

Include guidance examples so users select honest tiers. Show a live template-row preview.

### Screen 15 — Settings

Sections:

- Profile and emblem.
- Active categories.
- Accessibility: reduced motion and haptics.
- Appearance: dark default and system option.
- Privacy and data.
- Export data.
- Sign out.
- Delete account.

The delete-account flow should be clear and serious but not visually alarming across the entire settings screen.

### Reusable component system

Create a consistent component inventory:

- App header.
- Bottom tab bar.
- Floating/primary log button.
- Character emblem.
- Level badge.
- XP progress bar/ring.
- Category card.
- Attribute progress row.
- Activity template row.
- Stat tile.
- Achievement badge.
- Rarity label.
- Title chip.
- Bottom sheet.
- Confirmation dialog.
- Skeleton.
- Empty state.
- Offline banner.
- Toast.
- Celebration modal.
- Export card.

Show component states:

- Default.
- Pressed.
- Disabled.
- Loading.
- Selected.
- Locked.
- Pending sync.
- Error.

### Typography and spacing

Use a modern sans-serif family available or replaceable in Expo.

- Display numbers and level labels should feel strong and game-like.
- Body copy must remain highly readable.
- Use an 8-point spacing rhythm.
- Preserve at least 16 px screen edge padding.
- Use 44×44 minimum touch targets.
- Support larger system text without breaking primary flows.

### Accessibility

- Meet good contrast for normal text.
- Do not communicate rarity or progress using color alone.
- Include icons and labels.
- Make every interactive element screen-reader understandable.
- Design reduced-motion versions of XP and level-up feedback.
- Avoid tiny captions as the only source of important information.

### Copy tone

Use concise, confident language.

Good examples:

- “Your real life has stats.”
- “Log what you completed.”
- “Claim +60 XP.”
- “Backend reached Level 5.”
- “Title unlocked: The Builder.”
- “No progress is lost when you take a break.”
- “Pending sync.”

Avoid:

- “Crush your goals.”
- “You broke your streak.”
- “You failed today.”
- Excessive fantasy dialogue.
- Therapy or medical claims.
- Aggressive productivity language.

### Output requested from Stitch

Produce:

1. A coherent high-fidelity mobile design system.
2. All 15 screens and important variants.
3. A component library with reusable states.
4. Mobile navigation and interaction annotations.
5. Color, typography, spacing, radius, elevation, and motion tokens.
6. Empty, loading, offline, error, locked, and celebration states.
7. Expo/React Native-friendly layouts.
8. A clean exportable character-card design.

Prioritize consistency and implementability over decorative complexity. The result should make a user think: **“This is my real character profile,”** not **“This is another habit tracker.”**
