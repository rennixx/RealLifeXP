---
name: Solar Flare
colors:
  surface: '#131313'
  surface-dim: '#131313'
  surface-bright: '#3a3939'
  surface-container-lowest: '#0e0e0e'
  surface-container-low: '#1c1b1b'
  surface-container: '#201f1f'
  surface-container-high: '#2a2a2a'
  surface-container-highest: '#353534'
  on-surface: '#e5e2e1'
  on-surface-variant: '#d7c4ac'
  inverse-surface: '#e5e2e1'
  inverse-on-surface: '#313030'
  outline: '#9f8e78'
  outline-variant: '#524533'
  surface-tint: '#ffba43'
  primary: '#ffd597'
  on-primary: '#432c00'
  primary-container: '#ffb000'
  on-primary-container: '#6a4700'
  inverse-primary: '#805600'
  secondary: '#c6c6c7'
  on-secondary: '#2f3131'
  secondary-container: '#454747'
  on-secondary-container: '#b4b5b5'
  tertiary: '#dddbda'
  on-tertiary: '#303030'
  tertiary-container: '#c1bfbf'
  on-tertiary-container: '#4e4e4e'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#ffddaf'
  primary-fixed-dim: '#ffba43'
  on-primary-fixed: '#281800'
  on-primary-fixed-variant: '#614000'
  secondary-fixed: '#e2e2e2'
  secondary-fixed-dim: '#c6c6c7'
  on-secondary-fixed: '#1a1c1c'
  on-secondary-fixed-variant: '#454747'
  tertiary-fixed: '#e4e2e1'
  tertiary-fixed-dim: '#c8c6c5'
  on-tertiary-fixed: '#1b1c1c'
  on-tertiary-fixed-variant: '#474746'
  background: '#131313'
  on-background: '#e5e2e1'
  surface-variant: '#353534'
typography:
  headline-xl:
    fontFamily: Anton
    fontSize: 72px
    fontWeight: '400'
    lineHeight: 72px
    letterSpacing: 0.02em
  headline-lg:
    fontFamily: Anton
    fontSize: 48px
    fontWeight: '400'
    lineHeight: 48px
    letterSpacing: 0.02em
  headline-lg-mobile:
    fontFamily: Anton
    fontSize: 32px
    fontWeight: '400'
    lineHeight: 32px
    letterSpacing: 0.02em
  headline-md:
    fontFamily: Anton
    fontSize: 24px
    fontWeight: '400'
    lineHeight: 28px
    letterSpacing: 0.05em
  body-lg:
    fontFamily: Archivo Narrow
    fontSize: 18px
    fontWeight: '500'
    lineHeight: 26px
    letterSpacing: 0.01em
  body-md:
    fontFamily: Archivo Narrow
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
    letterSpacing: 0.01em
  label-caps:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '700'
    lineHeight: 16px
    letterSpacing: 0.15em
  stat-value:
    fontFamily: Anton
    fontSize: 40px
    fontWeight: '400'
    lineHeight: 40px
    letterSpacing: 0.02em
spacing:
  unit: 4px
  gutter: 16px
  margin-mobile: 20px
  margin-desktop: 64px
  container-max: 1440px
---

## Brand & Style

The design system embodies "Solar Flare"—a high-octane, prestigious aesthetic tailored for elite performance tracking. The personality is authoritative, unapologetic, and precise, drawing heavy inspiration from luxury horology and high-end automotive instrumentation. 

The visual style is **High-Contrast / Bold** with a touch of **Modern Minimalism**. It relies on the tension between a vast, "Obsidian" void and sharp, "Radiant" data points. Every element should feel engineered rather than merely designed, evoking an emotional response of focus, urgency, and premium exclusivity. Whitespace is used not for relaxation, but to provide "breathing room" for critical metrics, much like a racing dashboard.

## Colors

The palette is built on a "True Dark" foundation to maximize the luminosity of the primary accent.

*   **Primary (Radiant Orange/Gold):** Used exclusively for interactive states, progress indicators, and critical data highlights. It represents the "Flare."
*   **Secondary (Pure White):** Reserved for primary labels and high-priority headings to ensure maximum legibility against the dark background.
*   **Tertiary (Iron Grey):** Used for structural lines, dividers, and inactive states. It provides a subtle metallic sheen to the interface.
*   **Neutral (Obsidian):** The primary background color. It should be deep and expansive, allowing the foreground elements to "pop" with high intensity.

## Typography

Typography in this design system is aggressive and condensed. **Anton** serves as the primary headline face, providing a powerful, vertical rhythm that mimics luxury branding. **Archivo Narrow** handles body copy, maintaining the condensed aesthetic while ensuring high-density information remains readable. **JetBrains Mono** is introduced for secondary labels and technical data, reinforcing the "engineered" feel of a precision instrument.

All headlines and labels should use uppercase styling to maintain the authoritative tone. Tracking (letter spacing) should be tight for headlines but expanded for labels to enhance technical clarity.

## Layout & Spacing

The layout follows a **Fixed Grid** model with a rigid 4px baseline. 

*   **Desktop:** A 12-column grid with narrow 16px gutters to maintain a "dense" technical look. 
*   **Mobile:** A 4-column grid with 20px margins. 
*   **Philosophy:** Elements should be aligned to a strict horizontal and vertical axis. Groupings are achieved through high-contrast dividers (1px Tertiary) rather than large gaps. Components should feel "locked" into the grid, like tiles on a cockpit display.

## Elevation & Depth

This design system eschews soft shadows in favor of **Tonal Layers** and **Hard Outlines**.

1.  **Base Layer:** Obsidian (#0A0A0A) for the global background.
2.  **Surface Layer:** Iron Grey (#1A1A1A) for card backgrounds and container surfaces.
3.  **Accents:** Radiant Orange (#FFB000) is used as a "glow" effect rather than a shadow—utilizing a very tight, high-opacity outer glow on active or "critical" elements to simulate light emission.
4.  **Dividers:** Use 1px solid lines in Tertiary or Secondary (at 10% opacity) to define hierarchy. No blurs or frosted glass effects are permitted; the interface must remain "sharp."

## Shapes

The shape language is strictly **Sharp (0px)**. Roundness is perceived as "soft," which contradicts the high-energy, professional nature of this design. Every button, input, card, and modal must have 90-degree corners. This creates a architectural, technical aesthetic that feels precise and uncompromising.

## Components

*   **Buttons:** Rectangular with no radius. Primary buttons use a solid Radiant Orange fill with black text. Secondary buttons use a 2px white border with no fill.
*   **Inputs:** Bottom-border only or a very thin 1px frame. Labels are always `label-caps` positioned above the input.
*   **Cards:** Dark grey backgrounds (#1A1A1A) with 1px border (#262626). No shadows.
*   **Progress Bars:** Thin, high-contrast tracks. The progress fill should use a subtle gradient from #FFB000 to a brighter #FFD700 to simulate a light streak.
*   **Data Vitals:** Large, `stat-value` typography paired with small `label-caps` descriptors. 
*   **Navigation:** Minimalist, using high-contrast text links and a "marker" (2px orange line) to indicate the active state.