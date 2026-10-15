# ADR-009 — One user is one tenant

Status: Accepted

## Context

The service is multi-tenant in the sense that one deployment serves many people. The product does not have teams, orgs, or shared portfolios.

## Decision

`users.id` is the tenant key. Every query for owned data includes that id. Deleting the user deletes their rows.

## Alternatives considered

A `tenants` table with membership. One database per user.

## Consequences

There is no team invite. Isolation bugs are missed `user_id` predicates, which reviews should look for.
