# ADR 0002: Version the feedback API explicitly

## Status

Accepted

## Context

The repo exposes a serverless feedback endpoint but did not document a contract or a visible versioning strategy. That made future backend evolution ambiguous.

## Decision

Version the endpoint explicitly with:

- response header `X-TrailReplay-API-Version`
- `version` field in JSON responses

Document the request and response contract in `docs/api/contact-contract.md`.

## Consequences

- clients can branch safely on a visible version
- breaking changes now have a documented migration path
- contract reviews no longer depend on reading implementation only
