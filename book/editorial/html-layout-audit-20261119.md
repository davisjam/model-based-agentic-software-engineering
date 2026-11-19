# HTML layout audit — 19 November 2026

The published PDF layouts were the reference for this pass. The earlier shared fix (871b5d073) corrected print-coordinate SVG sizing, isolated each inline SVG stylesheet, centered concept insets, and kept citation side notes out of caption flow while preserving citation links.

## Coverage and findings

- Inspected all 67 numbered HTML figures, including front matter, chapter introductions, Chapters 1–7, and Appendix A.
- Measured 64 current content pages at desktop (1600 px) and phone (390 px) widths: 67 figures, 26 tables, and 49 blockquotes/insets. Deliberately excluded stale redirect pages.
- Compared representative figure layouts with 22 rendered PDF pages spanning Chapters 1–7. Checked the remaining HTML figures in contact sheets, including the appendix diagrams.
- No additional instances of undersized SVG viewports, escaping SVG styles, captions narrower than their SVG, caption side notes displacing tables, or horizontal page overflow were found.
- The deliberately floated `bw-aside` and `aside-sidenote` definitions remain distinct from centered concept insets. Centering every blockquote would erase this intended distinction.
- HTML retains its existing color variants where present; this audit concerns sizing, caption flow, and inset geometry, not changing accepted figure content or color policy.

## Durable verification

`book/check_figure_layout.mjs` now accepts `--all` to exercise every current content page, rather than only the two Chapter 2 regressions. It checks desktop, intermediate, and phone widths (1600, 1100, 390 px), responsive figure bounds, caption widths and gaps, isolated SVG styles, centered concept insets, and table-caption citation links. All 192 page/viewport combinations passed. It also retains the specific architecture-label regression that exposed cross-SVG stylesheet leakage.

Run after rebuilding MkDocs:

```sh
CHROME_PATH='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' \
  node book/check_figure_layout.mjs http://127.0.0.1:8766/ --all
```

The shared CSS required no further exceptions. Review screenshots and measurement JSON were produced under `/tmp/mage-html-audit`, `/tmp/mage-html-audit-extra`, and `/tmp/mage-pdf-audit`; these are transient review artifacts, not manuscript assets.
