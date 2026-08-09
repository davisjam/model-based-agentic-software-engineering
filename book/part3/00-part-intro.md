<!-- part-foreshadows: govern-the-environment, alignment-thesis, failures-become-machinery -->
Part 1 argued that reliability should come from the environment rather than from repeatedly
reading code. This Part builds that environment. The question this Part answers is how an
engineering environment becomes trustworthy — trustworthy enough that reliability comes from
it rather than from a human re-reading the code.

The last Part made engineering intent explicit; this Part makes it binding. **Modeling makes
intent explicit; Alignment makes it binding.** *In other words:* the last Part wrote the
system down in a form both people and machines could read; this Part teaches the engineering
environment to insist on it. That is the turn the whole Part performs — a represented intent
stops being advice and acquires authority. **Represented intent becomes authority.** *In
other words:* the build, the deployment pipeline, and the runtime start refusing to violate
what the models say, instead of merely documenting it. On the capability ladder this is the
top half: rungs 1–4 mostly help the reasoner, and rungs 5–8 give the environment authority
over the artifact.

Reliability is not one mechanism but a collection of them. Some obligations are known before
the first line of code is written. Others surface only when a fast-moving agent makes a new
mistake. This Part develops the environment that captures both: the policies you encode from
the start, and the mechanisms that grow later, as governance conversion turns experience into
infrastructure. Along the way you assemble a working vocabulary of constraints, sensors,
validators, gates, runbooks, metrics, and control graphs. None of these is an isolated tool;
each is a piece of one governed engineering environment. What you are building is not the
software but the machinery that builds trustworthy software.

By the end you will see that environment not as a collection of tools but as an engineered
system in its own right — one you finally turn the method back onto, governing the governance,
and one that increasingly carries the judgment that would otherwise have stayed in people's
heads.
