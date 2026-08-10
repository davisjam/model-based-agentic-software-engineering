## A note on vendor features

The mechanisms in this book are described against one concrete substrate — a coding agent and its harness — because a real system is what makes them legible. The mechanism is never the vendor feature, though; the vendor feature is one *instance* of it. A harness's lifecycle hooks, for example, realize a general idea: **enforcement points** on the agent's runtime lifecycle, where a deterministic step fires whether or not the agent cooperates. Your framework may expose that idea differently — a middleware layer, a git hook, a CI stage, a wrapper process — and the concept carries across intact.

Read every "the agent does X" in these appendices as *here is one way to realize the MAGE concept X*. The concept is the portable part, and it is what you are meant to take with you.
