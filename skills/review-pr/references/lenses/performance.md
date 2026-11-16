# Lens: Performance and scalability

Report only costs that **grow** with data, users, or traffic, or that block the event loop. No micro-optimizations. For every finding, state the growth ("1 + N queries per request, N = orders per customer") and whether the path is hot.

## Checklist

**Database**
- N+1: `await repo.findOne` inside a loop, lazy relations accessed per item, GraphQL field resolvers without DataLoader.
- Unbounded queries: list endpoints or jobs with no `take` / limit or cursor.
- New `WHERE` / `ORDER BY` / `JOIN` columns without a supporting index (check the migrations in the diff).
- Selecting large columns or whole entities when a few fields are needed; loading rows only to count them.
- Transactions or connections held open across external HTTP calls (pool exhaustion).

**Event loop**
- Synchronous expensive work in the request path: sync crypto/zlib/fs/child_process APIs (`*Sync`), `JSON.parse` / `JSON.stringify` on large input, vulnerable regexes, image/PDF processing. Move it to async APIs, the worker pool, or a queue.

**Async patterns**
- Independent awaits run sequentially → `Promise.all`.
- `Promise.all` over user-sized arrays → bounded concurrency (e.g. `p-limit`) to protect pools and rate limits.
- One external API call per item where a batch endpoint exists.

**Memory**
- Whole tables or files loaded into memory → stream or paginate.
- Module-level `Map` / array caches with no TTL or size bound (a leak in a long-running process).
- Event listeners or intervals registered per request and never removed.

**Algorithmic**
- `array.includes` / `find` / `filter` inside loops over the same data (O(n²)) → `Set` / `Map`.
- Repeated sorting or recomputation inside loops.

**NestJS specifics**
- `Scope.REQUEST` providers: the scope bubbles up every dependent, instantiating the chain per request.
- Heavy work in global middleware or interceptors that runs on every route.

## Severity

- **Major:** grows with user-controlled or growing data on a hot path, or blocks the event loop under normal load.
- **Minor:** otherwise.

## Sources

- NestJS Injection scopes (request scope bubbles up; performance note): https://docs.nestjs.com/fundamentals/injection-scopes
- OWASP Node.js Security Cheat Sheet (don't block the event loop; JSON parsing is blocking): https://cheatsheetseries.owasp.org/cheatsheets/Nodejs_Security_Cheat_Sheet.html
- Node.js guide "Don't Block the Event Loop": https://nodejs.org/en/learn/asynchronous-work/dont-block-the-event-loop
- Prisma, query optimization (the n+1 problem; `include`, `in` filters, batching): https://www.prisma.io/docs/orm/prisma-client/queries/query-optimization-performance
- DataLoader (batching and caching per request): https://github.com/graphql/dataloader
- p-limit (limited concurrency): https://github.com/sindresorhus/p-limit
- Algorithmic checks (O(n²) lookups, repeated sorting): general engineering practice, no single standard.
