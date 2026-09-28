---
name: LocaBite Marketplace
colors:
  surface: '#f9f9ff'
  surface-dim: '#d3daef'
  surface-bright: '#f9f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f1f3ff'
  surface-container: '#e9edff'
  surface-container-high: '#e1e8fd'
  surface-container-highest: '#dce2f7'
  on-surface: '#141b2b'
  on-surface-variant: '#5b403a'
  inverse-surface: '#293040'
  inverse-on-surface: '#edf0ff'
  outline: '#8f7068'
  outline-variant: '#e4beb5'
  surface-tint: '#b32b00'
  primary: '#ae2a00'
  on-primary: '#ffffff'
  primary-container: '#d63d10'
  on-primary-container: '#fffbff'
  inverse-primary: '#ffb4a1'
  secondary: '#006c49'
  on-secondary: '#ffffff'
  secondary-container: '#6cf8bb'
  on-secondary-container: '#00714d'
  tertiary: '#825100'
  on-tertiary: '#ffffff'
  tertiary-container: '#a36700'
  on-tertiary-container: '#fffbff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffdbd2'
  primary-fixed-dim: '#ffb4a1'
  on-primary-fixed: '#3c0800'
  on-primary-fixed-variant: '#891f00'
  secondary-fixed: '#6ffbbe'
  secondary-fixed-dim: '#4edea3'
  on-secondary-fixed: '#002113'
  on-secondary-fixed-variant: '#005236'
  tertiary-fixed: '#ffddb8'
  tertiary-fixed-dim: '#ffb95f'
  on-tertiary-fixed: '#2a1700'
  on-tertiary-fixed-variant: '#653e00'
  background: '#f9f9ff'
  on-background: '#141b2b'
  surface-variant: '#dce2f7'
typography:
  display-hero:
    fontFamily: Plus Jakarta Sans
    fontSize: 40px
    fontWeight: '800'
    lineHeight: 48px
    letterSpacing: -0.03em
  display-hero-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 30px
    fontWeight: '800'
    lineHeight: 36px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 26px
    fontWeight: '700'
    lineHeight: 34px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 20px
    fontWeight: '700'
    lineHeight: 28px
    letterSpacing: -0.015em
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 22px
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 15px
    fontWeight: '400'
    lineHeight: 22px
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  body-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 11px
    fontWeight: '400'
    lineHeight: 15px
  label-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '700'
    lineHeight: 18px
    letterSpacing: 0.01em
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 10px
    fontWeight: '700'
    lineHeight: 12px
    letterSpacing: 0.04em
  price-numeral:
    fontFamily: Plus Jakarta Sans
    fontSize: 15px
    fontWeight: '800'
    lineHeight: 18px
    letterSpacing: -0.02em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-sm: 0.75rem
  gutter-lg: 1.5rem
  margin: 1rem
  margin-tablet: 1.5rem
  margin-desktop: 2.5rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-lg: 1rem
  space-xl: 1.5rem
---

## Brand & Style

This design system targets urban consumers seeking instantaneous, reliable access to local culinary staples and rapid 10-minute grocery essentials. The visual identity sits at the crossroads of tactile hospitality and high-velocity commerce: warm, appetizing, and conversion-optimized, yet disciplined and surgically clear.

The design movement combines **Modern High-Density Commerce** with **Tactile Soft Polish**:
- **Appetite & Agility:** Searing, warm coral-orange triggers immediate purchase intent and appetite stimulation, while crisp emerald evokes market-fresh produce and hyper-speed dispatch reliability.
- **Atmosphere:** Clean, elevated surfaces prevent visual fatigue during high-volume catalog browsing. Visual noise is minimized to focus on food photography, pricing transparency, and instant basket construction.
- **Emotional Response:** Inspires instant trust, rapid decision-making, and sensory anticipation—reassuring the customer of speed, hygiene, and curation.

## Colors

The palette establishes explicit semantic swimlanes between instant dining, grocery utility, and urgency drivers:

- **Primary (`#F04F23`):** LocaBite Coral. Reserved strictly for primary checkout CTAs, instant restaurant dish additions, active bottom tab bars, and high-impact promotions.
- **Secondary (`#10B981`):** Fresh Dispatch Emerald. Dedicated to fresh groceries, lightning delivery tags (e.g., "12 Mins"), live driver location pings, and positive order milestones.
- **Tertiary (`#F59E0B`):** Warm Amber. Applied exclusively to ratings, discount ribbons, flash deal tags, and loyalty coin balances.
- **Neutral Dark (`#111827`):** Deep Charcoal. Yields high contrast on titles, item names, and pricing, avoiding harsh absolute black.
- **Neutral Surface & Background:** Background uses ultra-soft warm slate (`#F8F9FA` to `#F9FAFB`), framed by pristine white cards (`#FFFFFF`) layered with fine boundary definitions (`#E5E7EB`).

## Typography

Plus Jakarta Sans delivers geometric precision with rounded apertures that feel human, fast, and legible even at dense card scales:

- **Display & Section Titles:** Emphasize high negative letter spacing (-0.02em to -0.03em) with heavy weights (700/800) to anchor multi-category landing screens.
- **Price Numerals:** Treated with specialized proportional spacing and weight (800) to ensure immediate scannability across discount strike-throughs and bundle values.
- **Micro-Badges & Time Estimates:** Set uppercase in `label-sm` with slightly widened letter-spacing (+0.04em) to maintain crisp legibility on colored chips.

## Layout & Spacing

A compact, thumb-driven fluid layout optimized for single-hand mobile interactions that smoothly expands into balanced grid rails on tablet and desktop surfaces.

- **Mobile Viewports (< 640px):** Single-column vertical stream or 2-column compact grocery product grids. Outer container margin is fixed at `1rem`, with tight gutters (`gutter-sm: 0.75rem`) to maximize hero image real estate.
- **Tablet (640px – 1023px):** 6-column fluid structure. Margin increases to `1.5rem` (`margin-tablet`), enabling 3-column product displays and side-by-side merchant profiles.
- **Desktop (1024px+):** 12-column bounded system (max 1280px) with `margin-desktop: 2.5rem` and `gutter-lg: 1.5rem`. Enables persistent checkout baskets on the right rail and category filters pinned on the left.
- **Thumb Zone Design:** All actionable conversion drivers (add buttons, bottom floating carts, filter pills) sit within the lower 40% vertical screen zone on handheld screens.

## Elevation & Depth

Visual hierarchy uses clean multi-layered surfaces paired with warm-tinted ambient drop shadows rather than heavy structural borders:

- **Flat Baseline (Canvas):** Tone `#F8F9FA` anchors the viewport, preventing the glare of stark pure white.
- **Level 1 (Product & Store Cards):** Pure white background (`#FFFFFF`) with a micro-stroke border (`1px solid #F3F4F6`) and subtle ambient dispersion: `box-shadow: 0 2px 8px -2px rgba(17, 24, 39, 0.05), 0 1px 3px 0 rgba(17, 24, 39, 0.03)`.
- **Level 2 (Interactive Floating Bars & Hover States):** Used for elevated cart summaries and hovering cards: `box-shadow: 0 10px 24px -4px rgba(240, 79, 35, 0.12), 0 4px 10px -2px rgba(17, 24, 39, 0.06)`. Note the subtle coral ambient bloom reinforcing interactivity.
- **Level 3 (Modals, Delivery Time Trackers, Bottom Sheets):** Deep background blur (`backdrop-filter: blur(12px)`) underneath a high-depth shadow: `box-shadow: 0 20px 35px -8px rgba(17, 24, 39, 0.16)`.

## Shapes

The design system implements a balanced `roundedness: 2` geometry, creating tactile, approachable corners without drifting into childlike cartoon contours.

- **Standard Cards & Containers:** Standardized at `rounded-lg` (16px / 1rem) for food dishes and merchant profile panels.
- **CTAs, Search Bars, & Filters:** Use full pill shapes (`rounded-full` / 9999px) to invite direct fingertip engagement.
- **Micro-Badges & Veg/Non-Veg Indicators:** Scoped to `rounded-sm` (4px to 6px) to maintain crisp, stamp-like authority.
- **Quantity Steppers:** Outfitted with seamless matching inner-outer radiuses (8px) for an integrated hardware feel.

## Components

### Buttons & Quick CTAs
- **Primary Action (Add to Cart / Place Order):** Solid Coral `#F04F23` with bold white text. Includes a 1px inner highlight for depth. Hover/Active scales slightly down (`scale-98`) with background `#E23E12`.
- **Secondary Action (Grocery Dispatch / Bulk Reorder):** Emerald `#10B981` solid or tinted fill (`#ECFDF5`) with deep emerald text (`#065F46`).
- **Floating Cart Bar:** Full-width pinned mobile bar, elevated with Level 2 shadow, displaying item count thumbnail avatars, total price, and a high-contrast chevron indicator.

### Quantity Stepper ("ADD" to "- Qty +")
- **Initial State:** Pill or rounded rectangle button, crisp white fill, 1px border (`#E5E7EB`), text "ADD" in bold coral `#F04F23`, with a micro `+` icon on the right edge.
- **Active State:** Transforms into a solid coral or clean white card with coral accents. The left side holds a tactile minus icon, center contains the bold `price-numeral` count, and the right holds a plus icon. Touch target stays at minimum 44px height for effortless adjustment.

### Cards (Restaurant vs. Grocery Item)
- **Restaurant Card:** Horizontal or vertical layout with a 16:9 imagery aspect ratio. Overlaid top-left pill for discount ("FLAT 50% OFF") and top-right pill for delivery time ("22 MINS"). Displays venue name, rating star chip (Amber `#F59E0B` fill with `#78350F` text), and distance/cuisine tags.
- **Grocery SKU Card:** Square image (1:1) with subtle off-white backing (`#F9FAFB`) to make packaging pop. Includes weight/volume line (`body-sm`), instant price with slashed MRP, and the quantity stepper nestled overlapping the lower-right edge of the thumbnail.

### Chips & Badges
- **Delivery Time Pill:** Emerald tint (`#ECFDF5`), bold emerald text (`#047857`), paired with a lightning bolt or stopwatch micro-icon.
- **Dietary Icons:** Clean square icons with rounded borders: green dot within green border for Vegetarian, red triangle within red border for Non-Vegetarian.
- **Category Filter Chips:** Horizontal scrolling pills with `#FFFFFF` background and `#E5E7EB` border. Selected state switches to neutral dark `#111827` fill with white text, or vibrant coral tint.

### Inputs & Search Bar
- **Global Search:** Pill-shaped, extra-tall (48px mobile, 52px desktop), subtle border `#E5E7EB`, pure white base. Left icon holds a dual-tone search glass, right icon includes a microphone or split barcode/filter prompt. Placeholder text rotates dynamically through popular cravings.