# Lens: Reliability and operability

What happens when dependencies are slow or down, messages repeat, instances multiply, or the process restarts mid-way?

## Checklist

**External calls**
- Timeouts set. axios's `timeout` defaults to `0` (no timeout); `fetch` has no timeout option of its own, so pass `signal: AbortSignal.timeout(ms)`.
- Retries only for idempotent operations, with backoff + jitter and a cap. No retry storms.
- A failing dependency can't cascade (circuit breaker, fallback, or a fast fail where it matters).
- Third-party responses are validated before use.

**Idempotency and delivery**
- Queue consumers, webhooks, and jobs are at-least-once: duplicates are detected (dedupe key, unique constraint, processed-message table).
- Creating payments, orders, or other side-effecting POSTs: is there an idempotency key, or protection against double submit?
- Poison messages go to a DLQ instead of looping forever.

**Consistency across systems**
- DB write + message publish / external call: what if the second step fails? Outbox, compensation, or reconciliation. Otherwise state the accepted inconsistency.
- Multi-step flows can be safely resumed or retried after a crash halfway (idempotent steps).

**Multi-instance**
- Scheduled jobs run in **every** process: the NestJS scheduler docs state this for `@Cron`, and the same holds for `setInterval` / node-cron. Is there a distributed lock or a single runner? (Recent Nest docs point to `@OnOneInstance()` from `@nestjs/locks`; otherwise a DB/Redis lock.)
- In-memory caches, sessions, locks, or rate limits that assume one instance. `@nestjs/throttler` uses in-memory storage by default.

**Errors and lifecycle**
- Errors carry context and are logged once at the right layer: no swallowing, no log-and-rethrow spam.
- Graceful shutdown: new connections, consumers, and intervals are closed on SIGTERM and in-flight work drains. In Nest, lifecycle shutdown hooks only run on signals after `app.enableShutdownHooks()`.
- After `uncaughtException`, the process cleans up and exits; it doesn't keep serving.
- Health/readiness checks updated for new critical dependencies.

**Observability**
- New critical flows log success/failure recording when, where, who, and what, as structured logs, with an interaction/correlation id that links the events of one request.
- Metrics or traces where the team relies on them.
- No secrets or unnecessary PII in logs.

**Config and rollout**
- New env vars validated at startup, documented, with safe defaults (or startup fails fast).
- Can the change be turned off (flag) or rolled back without a data fix?

## Sources

- NestJS Task scheduling (jobs run in every process): https://docs.nestjs.com/techniques/task-scheduling
- NestJS Rate limiting (in-memory default storage): https://docs.nestjs.com/security/rate-limiting
- NestJS Lifecycle events (`enableShutdownHooks`): https://docs.nestjs.com/fundamentals/lifecycle-events
- axios README, Request Config (`timeout` default `0`, no timeout): https://github.com/axios/axios#request-config
- MDN `AbortSignal.timeout()`: https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal/timeout_static
- OWASP Node.js Security Cheat Sheet (uncaught exceptions): https://cheatsheetseries.owasp.org/cheatsheets/Nodejs_Security_Cheat_Sheet.html
- AWS Builders' Library, "Timeouts, retries, and backoff with jitter": https://builder.aws.com/content/3EumjoZascWd1oZiEgL8ORlv3qE/timeouts-retries-and-backoff-with-jitter
- M. Fowler, "CircuitBreaker": https://martinfowler.com/bliki/CircuitBreaker.html
- Transactional outbox pattern: https://microservices.io/patterns/data/transactional-outbox.html
- IETF draft "The Idempotency-Key HTTP Header Field": https://datatracker.ietf.org/doc/draft-ietf-httpapi-idempotency-key-header/ · Stripe idempotent requests: https://docs.stripe.com/api/idempotent_requests
- OWASP Logging Cheat Sheet (when/where/who/what; interaction identifier): https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html
- Node.js `process` docs, using `uncaughtException` correctly: https://nodejs.org/api/process.html
