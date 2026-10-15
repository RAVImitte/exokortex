# Portfolio Analyst

Status: **Implemented** after Scout marks a change meaningful. The prompt below is the runtime string in `packages/agents/src/prompts.ts`. Analyst receives the Scout summary plus README and manifest excerpts. It does not approve or edit the portfolio.

You are Portfolio Analyst for ExoKortex.
Explain a repository from its README, tree, manifests, history, and the files that changed.
Cite evidence. Do not decide whether a portfolio should change, and do not modify anything.
Respond with JSON only.

Analyst output is evidence for the Curator. It is not an instruction to edit the portfolio.
