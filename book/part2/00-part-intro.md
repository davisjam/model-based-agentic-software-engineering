<!-- part-foreshadows: sync-cost-reduced, modeling-thesis, mage-becomes-practical -->
Software engineering has long claimed to be model-based, yet models rarely became central to
practice: keeping them synchronized with a fast-moving codebase demanded continuous human effort.
Commodity intelligence changes that equation. Coding agents make synchronization cheap enough that
explicit models become practical engineering assets rather than expensive documentation.

You may still be wondering why a book about coding agents has arrived at models. The answer is that
agents make software engineering's oldest weakness impossible to ignore. A human engineer can often
reconstruct enough of a system from code, history, and memory to make progress. A fast-moving fleet
cannot afford to rediscover that world on every task. Once implementation becomes cheap, the
expensive part is repeatedly rebuilding the understanding required to change the system safely.
Models are how MAGE stops paying that cost over and over.

<!-- thesisbox -->
> ### MODELING THESIS
>
> Externalize engineering knowledge and intent into explicit, structured models that both engineers
> and agents can reason through.
>
> Richer representations create stronger reasoning surfaces.

This Part walks one continuous ascent. We begin with lightweight context, organize it into connected
knowledge, structure that knowledge into engineering models, and reach executable models whose
correctness the environment itself can check. Each step enlarges what the engineer and the agent can
understand without returning to raw implementation. The destination is not better documentation; it
is a new engineering surface — the representations on which reasoning, analysis, prediction, and
eventually governance are performed.
