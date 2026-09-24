# Siemens — measurement & incidents lens

Source: `book/_design/evidence-factory-cases-260923/siemens/README.md`. "Siemens" is five business units; only Knowledge Fabric (CORP) is Siemens changing its own software, and that account is vendor-authored [S8]. This sheet is short because the measurement record is.

## 1. What Siemens reports measuring

- **Product marketing quantities, method never stated**: Eigen "2–5x faster execution," "up to 80% higher overall solution quality," "up to 50% greater engineering efficiency" [E10][E11][E15b] — no denominator, sample, task set, or baseline anywhere; "solution quality" undefined. EDA: ">10X" characterization turnaround reduction, "5X to 10X reduction in token costs" [E19] — joint marketing release with NVIDIA; the token figure is the sole cost number in the Siemens corpus and concerns EDA characterization, not software change [G10].
- **Siemens' own software factory: zero quantities** [G3]. Every stated benefit is unquantified — "far less time," "reduced overall coding effort" [E27]. No throughput, defect rate, adoption count, or headcount.
- Intelligence Center X customer figures (95% manual-effort reduction, 85% faster issue resolution, 6,000 hours/yr) [E32] are **business-process metrics, not software-production metrics** — do not import them into the factory frame.
- Discipline note: Siemens describes strong quality *machinery* — golden test harnesses, physics-based engines as validators [E18], Amesim simulation [E37], "pre-defined performance benchmarks" as Eigen's acceptance criterion [E12] — and reports **no measured result** from any of it. Mechanism exists; result-measurement and management-use are not publicly established for any of these.
- Human/organizational: **not reported.** The one adjacent datum is a skill-scarcity framing (formal-property proficiency takes "six to nine months" [E16c]; 3–5M CAE specialists vs 30–50M engineers needing simulation [E9a]) — expertise scarcity as the *delegation motive*, not a measurement of anything.

## 2. Incidents

**None, in any unit.** No rollback, incident, post-mortem, defect attributed to an agent, or rejected agent change appears anywhere [G11]. [E26] states the stakes ("hallucinated or unvalidated changes are… operationally unacceptable") without describing any response machinery or any occurrence. How experience changes any Siemens factory is unestablished [G7] — "persistent expertise building" [E16] and the "Learn" step of Siemens' agent definition [E38] are vocabulary without mechanism or report.

## 3. Model-critique note

Two case-specific observations, both single-case and offered with that caveat:

- **Expertise scarcity as the factory's raison d'être** (EDA property-writing apprenticeship, CAE specialist ratio [E16c][E9a]): Siemens frames delegation targets by *human skill supply*, which the current model treats implicitly at best. Recurs weakly elsewhere (Spotify's "only a few teams have the required expertise" for complex Fleetshifts [SPOTIFY E25]).
- The vendor/deployer split: Siemens sells "customer-defined governance boundaries" and "configurable human oversight" [E16] — admission authority as a *customer-set parameter* — while publishing nothing on how any customer sets it [G6]. The model's authority concept holds this fine; the measurement record just never reaches it.
