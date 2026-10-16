# Vision

ExoKortex keeps a software portfolio honest. You choose the repositories that are your work, and one repository that is your portfolio. When the work changes, ExoKortex notices, explains the change, and later proposes a portfolio update as a pull request. You merge it. Your existing CI deploys it.

The model is yours. You bring an OpenAI-compatible API key. ExoKortex does not pay for inference and does not send tokens or keys to the model.

## What this is

A multi-tenant service: many people share one deployment, and each person’s rows are keyed by their user id. There are no teams. One person has one portfolio.

The orchestrator is ordinary TypeScript. Agents propose structured JSON. They do not hold credentials, and they do not merge or deploy.

## What this is not

Billing, a mobile app, several portfolios per person, autonomous deletion, or a redesign of the portfolio’s look.
