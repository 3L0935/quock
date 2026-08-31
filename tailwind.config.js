const colors = require("./src/lib/design/colors.cjs");

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  presets: [require("nativewind/preset")],
  // CSS-variable based theming. `darkMode: 'class'` lets `dark:` variants
  // activate via `setColorScheme()`; we also rebind the base color values to
  // `var(--*)` so `bg-background`, `text-foreground`, etc. switch palettes the
  // moment ThemeProvider swaps the vars on the root view.
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Shadcn semantic layer.
        background: "var(--color-background, " + colors.background + ")",
        foreground: "var(--color-foreground, " + colors.foreground + ")",
        card: "var(--color-card, " + colors.card + ")",
        "card-foreground": "var(--color-card-foreground, " + colors.cardForeground + ")",
        popover: "var(--color-popover, " + colors.popover + ")",
        "popover-foreground": "var(--color-popover-foreground, " + colors.popoverForeground + ")",
        primary: "var(--color-primary, " + colors.primary + ")",
        "primary-foreground": "var(--color-primary-foreground, " + colors.primaryForeground + ")",
        secondary: "var(--color-secondary, " + colors.secondary + ")",
        "secondary-foreground": "var(--color-secondary-foreground, " + colors.secondaryForeground + ")",
        muted: "var(--color-muted, " + colors.muted + ")",
        "muted-foreground": "var(--color-muted-foreground, " + colors.mutedForeground + ")",
        accent: "var(--color-accent, " + colors.accent + ")",
        "accent-foreground": "var(--color-accent-foreground, " + colors.accentForeground + ")",
        destructive: "var(--color-destructive, " + colors.destructive + ")",
        "destructive-foreground": "var(--color-destructive-foreground, " + colors.destructiveForeground + ")",
        "destructive-soft": "var(--color-destructive-soft, " + colors.destructiveSoft + ")",
        border: "var(--color-border, " + colors.border + ")",
        input: "var(--color-input, " + colors.input + ")",
        ring: "var(--color-ring, " + colors.ring + ")",
        // iOS 27 label ramp.
        label: "var(--color-label, " + colors.label + ")",
        "label-secondary": "var(--color-label-secondary, " + colors.labelSecondary + ")",
        "label-tertiary": "var(--color-label-tertiary, " + colors.labelTertiary + ")",
        // iOS 27 separators.
        separator: "var(--color-separator, " + colors.separator + ")",
        "separator-opaque": "var(--color-separator-opaque, " + colors.separatorOpaque + ")",
        // iOS 27 system fills.
        "fill-secondary": "var(--color-fill-secondary, " + colors.fillSecondary + ")",
        "fill-tertiary": "var(--color-fill-tertiary, " + colors.fillTertiary + ")",
        "fill-quaternary": "var(--color-fill-quaternary, " + colors.fillQuaternary + ")",
        // Segmented control selected-option pill.
        "segmented-selected": "var(--color-segmented-selected, " + colors.segmentedSelected + ")",
        // Apple HIG system colors (status / charts).
        red: "var(--color-red, " + colors.red + ")",
        orange: "var(--color-orange, " + colors.orange + ")",
        yellow: "var(--color-yellow, " + colors.yellow + ")",
        green: "var(--color-green, " + colors.green + ")",
        mint: "var(--color-mint, " + colors.mint + ")",
        teal: "var(--color-teal, " + colors.teal + ")",
        cyan: "var(--color-cyan, " + colors.cyan + ")",
        blue: "var(--color-blue, " + colors.blue + ")",
        indigo: "var(--color-indigo, " + colors.indigo + ")",
        purple: "var(--color-purple, " + colors.purple + ")",
        pink: "var(--color-pink, " + colors.pink + ")",
        brown: "var(--color-brown, " + colors.brown + ")",
        // Apple HIG system grays.
        gray: "var(--color-gray, " + colors.gray + ")",
        gray2: "var(--color-gray2, " + colors.gray2 + ")",
        gray3: "var(--color-gray3, " + colors.gray3 + ")",
        gray4: "var(--color-gray4, " + colors.gray4 + ")",
        gray5: "var(--color-gray5, " + colors.gray5 + ")",
        gray6: "var(--color-gray6, " + colors.gray6 + ")",
        // Utility.
        scrim: "var(--color-scrim, " + colors.scrim + ")",
      },
      spacing: {
        // Fixed-px layout values Tailwind's scale lacks. NativeWind inlines rem at 14px, so these are exact pt, not rem-derived; keys avoid the stock numeric scale (e.g. no 80) so nothing is redefined.
        4.5: "18px",
        5.25: "20px",
        5.5: "22px",
        8.5: "34px",
        9.5: "38px",
        13: "52px",
        15: "60px",
        25: "100px",
        50: "200px",
        65: "260px",
      },
      maxWidth: {
        card: "360px",
        // Login hero title cap (was the stock-colliding spacing key `80`).
        title: "320px",
      },
      fontSize: {
        // iOS 27 type ramp — px-defined so each style renders at its exact pt (NativeWind rem is 14px, so stock text-* tiers can't express these). Tracking per Apple's SF Pro table.
        "large-title": ["34px", { lineHeight: "41px", letterSpacing: "0.4px" }],
        "title-1": ["28px", { lineHeight: "34px", letterSpacing: "0.38px" }],
        "title-2": ["22px", { lineHeight: "28px", letterSpacing: "-0.26px" }],
        "title-3": ["20px", { lineHeight: "25px", letterSpacing: "-0.45px" }],
        // Headline is body-sized but ships semibold — pair text-headline with font-semibold at use-sites.
        headline: ["17px", { lineHeight: "22px", letterSpacing: "-0.43px" }],
        body: ["17px", { lineHeight: "22px", letterSpacing: "-0.43px" }],
        callout: ["16px", { lineHeight: "21px", letterSpacing: "-0.31px" }],
        subhead: ["15px", { lineHeight: "20px", letterSpacing: "-0.23px" }],
        footnote: ["13px", { lineHeight: "18px", letterSpacing: "-0.08px" }],
        "caption-1": ["12px", { lineHeight: "16px", letterSpacing: "0px" }],
        "caption-2": ["11px", { lineHeight: "13px", letterSpacing: "0.06px" }],
      },
      fontFamily: {
        // System = SF Pro on iOS, Roboto on Android — Apple HIG defaults. No custom font is loaded.
        sans: ["System"],
        mono: ["Menlo", "monospace"],
      },
    },
  },
  plugins: [],
};
