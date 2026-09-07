# Office Models ({Slides,Docs,Sheets}Model)

**Intent** — Route all remediation of a format family through one structured model, with raw library access
(and raw string-matching into the serialized form) banned by lint. The same construction+ban-lint pattern
as [pdf-model](pdf-model.md), on a second object model (our instance: `{Slides,Docs,Sheets}Model` over
`DocumentFormat.OpenXml`).

| | |
|---|---|
| Summary | All OOXML through structured models; raw SDK access banned. |
| Target | Product · **Canonical models & seams** |
| Form | `typed-ir` |
| Move | `package` — a constraint shipped with its sensors |
| Model | `is-a-model` — a structured model you check a system property against |
| Enforcement | **Hard** (deterministic) · *blocking* — the two lints fail the build on raw OpenXml / raw-XML string-match; the structured models are *construction*, the lints are the counted sensors |
| Derivation | `model-from-code` — induced from the code, reconciled at build |

*Its place in the environment — a **variant / known-use** of **One Door Enforced**, under **CONSTRAIN · Constrain where and how agents act**. Preserved here for its technical texture.*

## Motivation — the failure it kills

Raw OpenXML SDK access, and the sneakier path of *regexing into the XML*, are the Office equivalent of
the raw-PDF-library minefield: brittle, corruption-prone, and with no single point to enforce structural
invariants. Left ad hoc, the same raw-library corruption class recurs across three separate document
formats.

## Why it's not just "PdfModel already solves this" (or "handle Office ad hoc")

Office is a *different object model* (the OpenXML SDK), so `PdfModel` cannot cover it, but the **same
defect class** (raw-library corruption) applies. The Office Models are the parallel typed seam, and
routing all three formats through the same structured-model + ban-lint pattern is **defect-class
consolidation**: a fix to the pattern benefits all four formats at once, which is sufficient
justification on its own: capability parity, not new capability. Applying one construction + ban-lint
pattern per object-model keeps the corruption class killed everywhere; per-format ad hoc handling lets
it recur three more times. A second ban-lint on raw-XML string-matching closes the sneaky
regex-into-serialized-form escape that a plain "no raw SDK" rule would miss.

## Mechanism

Route through `SlidesModel` / `DocsModel` / `SheetsModel` and the shared `OpenXmlCommon`; the
Checking layer routes through `RuleWalkers/`. `openxml-direct-access` bans raw
`DocumentFormat.OpenXml.*`; `no-raw-xml-string-match` bans regexing the serialized XML.

## Prerequisites

- **A structured model per Office format** plus a shared common layer for cross-format primitives.
- **Two ban-lints**: one on the raw SDK, one on raw-XML string-matching (the sneaky path).
- **Call-site migration** across all three formats.

## Consequences & costs

- **Three models plus a shared layer to maintain** — more surface than the single PdfModel.
- **Coverage gaps per format** force a `noqa` or a model extension, same as PdfModel.
- **The string-match ban can false-positive** on a legitimate string operation over document text,
  needing an escape.

## Known uses

- `SlidesModel` / `DocsModel` / `SheetsModel` + `OpenXmlCommon`; `RuleWalkers/` for the checking path.
- `openxml-direct-access` + `no-raw-xml-string-match` ban-lints.

## Related mechanisms

- *See also (sibling)* — [pdf-model](pdf-model.md): the PDF half of the unified "structured model + ban-lint"
  pattern; together they consolidate the raw-library corruption defect class across all four formats.
- **Counterpart** — the `openxml-direct-access` + `no-raw-xml-string-match` lints (hard) hold these
  construction-mode seams in place.
- *See also* — [canonical-walkers](canonical-walkers.md): traversal over the Office models' trees.
