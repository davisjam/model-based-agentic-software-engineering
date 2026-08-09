<!-- part-foreshadows: modeling-thesis, alignment-thesis, govern-the-environment, failures-become-machinery -->
Earlier Parts laid out the ingredients and built the kitchen. This Part is where you learn to
cook. The first three Parts built the pieces of MAGE; this one assembles them into a way of
working. Models, mechanisms, and governance stop appearing one at a time and become the
engineering workflow itself. Instead of asking what each idea means in isolation, the chapters
that follow ask a different question: what does a normal day of engineering look like when a
fleet writes the implementation?

That day runs one recurring cycle, and the earlier Parts already named its moves. A task
arrives. You make its intent explicit in a representation the fleet can reason through. You give
that intent authority the environment will hold. You run the work, and you convert what the work
reveals back into the representation or the mechanism. The two theses alternate, beat by beat:
**Modeling makes intent explicit; Alignment gives it authority.** Then failure feeds both — the
loop's third move — and the wheel turns again. This is the causal spine of the method, worn as a
daily loop.

*In other words:* a normal day is not "build a model, then bolt on a mechanism." It is a turn of
the same wheel — say what must be true, make the environment insist on it, then let the day's
failures sharpen the next turn.

- **Modeling — make intent explicit.** Ask what the agent must know and what must stay true, and
  put both into a representation: a linked wiki, a structured model, an invariant stated over it.
- **Alignment — give intent authority.** Ask how much of that intent the environment can enforce
  on its own, and wire it in — a brief that aims, a lint or gate that holds.
- **Feedback — convert what happened.** When the work fails, or an agent rediscovers something it
  should have inherited, feed the lesson back: a richer representation, or a new mechanism, so the
  next agent meets the check instead of the failure.

[Brownfield](4.1-brownfield.html) runs the first two beats on the artifacts you already own;
[Lessons Learned](4.5-lessons-learned.html) is mostly the third. By the end, MAGE should feel
less like a collection of concepts than a practical discipline.
