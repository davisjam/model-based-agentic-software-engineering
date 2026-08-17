<!-- part-foreshadows: abundant-implementation, govern-the-environment -->
Engineering reorganizes when a constraint moves.[note: The intuition is familiar from Amdahl's law: accelerating one part of a computation increases the relative importance of the work that remains [cite: amdahl1967]. Goldratt's Theory of Constraints states the broader operational version: system performance is governed by a constraint, and improving that constraint eventually moves attention to another [cite: goldratt1984]. The same constraint logic applies to software-engineering economics.] Steam radically reduced the cost of mechanical power;
integrated circuits did the same for computation. Coding agents are now reducing the cost of software
implementation. A scarce factor constrains
output, so it draws investment and attention. Implementation was never the only scarce input to
software engineering, but for most of the field's history it consumed enough expert effort to
limit what teams could attempt and how quickly they could change a system. As its marginal cost
falls, other constraints become more visible: deciding what to build, representing a large system
well enough to reason about it, producing evidence that a change is acceptable, and giving
consequential engineering decisions authority across many changes.

<!-- principlebox -->
> ### FOUNDING PREMISE
>
> Commodity intelligence makes implementation abundant relative to engineering judgment.
>
> Engineering effort concentrates around what limits reliable production. As implementation
> capacity becomes cheaper and more abundant, judgment, representation, evidence, and authority
> become relatively scarcer. Engineering effort moves with the constraint.

Abundance does not make implementation unimportant; it changes where additional engineering effort
earns the greatest return. A factory with unlimited machine capacity and one inspector has not
stopped manufacturing; inspection has become the throughput constraint. In software, agents can now
produce changes faster than engineers can specify, understand, validate, and govern them. Models
amortize representation and judgment across many acts of implementation; validators and gates can
amortize selected judgments about acceptance. Rational effort therefore moves toward representation,
evidence, authority, and the engineered environment that carries them. This Part asks what follows from that
shift: what remains hard, which properties of the new substrate matter, and what engineering
problems they leave us to solve.
