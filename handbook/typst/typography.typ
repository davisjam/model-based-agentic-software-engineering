// typography.typ — the Handbook's visual vocabulary.
//
// Reuses the MAGE book's "Umber Monograph" palette and self-hosted type families (Source Serif 4,
// Source Sans 3, IBM Plex Mono) so the two books feel related, but this is the Handbook's own
// template: it reads as a textbook — a serif reading face for body, a sans face for headings and
// callout titles. Colors and sizes live here so the rest of the template never hard-codes a hex.

#let palette = (
  ink:        rgb("#1c1917"),
  paper:      rgb("#fdfcf9"),
  panel:      rgb("#f6f4ef"),
  rule:       rgb("#e4e0d8"),
  muted:      rgb("#57534e"),
  accent:     rgb("#9a3f12"), // burnt umber
  accent-tint: rgb("#faf1e6"),
  code-bg:    rgb("#f3efe7"),
  def-rule:   rgb("#1f6fae"), def-fill:   rgb("#eef4fb"),
  good-rule:  rgb("#15803d"), good-fill:  rgb("#eef7ee"),
  inset-rule: rgb("#7c6bb0"), inset-fill: rgb("#f2effb"),
  warn-rule:  rgb("#b23b3b"), warn-fill:  rgb("#fbeaea"),
  case-rule:  rgb("#2f5169"), case-fill:  rgb("#e7edf3"),
)

#let font-body = ("Source Serif 4", "Charter", "Georgia")
#let font-display = ("Source Sans 3", "Helvetica Neue", "Arial")
#let font-mono = ("IBM Plex Mono", "Menlo")

// Per-kind callout styling: (rule color, fill color). One place to retune the semantic palette.
#let callout-style = (
  definition:     (palette.def-rule,   palette.def-fill),
  decision:       (palette.accent,     palette.accent-tint),
  tradeoff:       (palette.inset-rule, palette.inset-fill),
  "key-idea":     (palette.good-rule,  palette.good-fill),
  example:        (palette.good-rule,  palette.good-fill),
  "code-example": (palette.muted,      palette.code-bg),
  "case-study":   (palette.case-rule,  palette.case-fill),
  warning:        (palette.warn-rule,  palette.warn-fill),
  note:           (palette.muted,      palette.panel),
  exercise:       (palette.accent,     palette.accent-tint),
  quotation:      (palette.muted,      palette.panel),
  "mage-moment":  (palette.accent,     palette.accent-tint),
)
