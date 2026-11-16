# Seams by project type

Pick the **highest seam that can observe the behaviour**, and keep a rule's many cases at the **lowest seam that owns the rule**. Each behaviour is tested at one seam only.

## Universal ladder

| Seam | Use for |
|---|---|
| **Pure domain** (functions / classes with no framework, I/O, or clock) | business rules with many cases: calculations, eligibility, state transitions, parsing. Table-driven, fast. |
| **Entry point** (HTTP handler, CLI command, queue handler, component, public function of a library) | what the caller observes: status codes, validation errors, authorization, output shape, wiring. One test per AC, plus one per validation class and per authorization rule that matters. |
| **Full flow** (app + real DB, boundaries faked) | a few critical cross-module journeys. |

If the rule is tangled inside a handler, extract it into a pure function first (a small, behaviour-preserving step) rather than testing all its cases through HTTP.

## By kind of project

| Project | Entry-point seam | Notes |
|---|---|---|
| **NestJS** | `Test.createTestingModule` + `supertest` | See nestjs.md. |
| **Express / Koa** | `supertest(app)`, with the app exported without `listen()` | If `app` is created and listened to in one file, split creation from `listen` first. |
| **Fastify** | `app.inject({ method, url, payload })` | Built-in fake HTTP injection; no `listen()` needed. |
| **Next.js route handlers / server actions** | call the exported handler with a `Request` / form data and assert on the `Response` | Keep logic in plain modules the handler calls. |
| **Library / package** | the exported public API only (what `index.ts` exports) | Never import internal files in tests. |
| **CLI** | the command function with args, or spawn the binary and assert stdout/exit code | Inject the file system or use a temp dir. |
| **Queue / job / cron handler** | the handler's public method with a realistic message | Deliver the same message twice to prove idempotency. |
| **Front-end component** | Testing Library: render, interact like a user (`getByRole`, `userEvent`), assert what the user sees | No asserting on internal state, hooks, or CSS classes. |

## Database fallback order

1. The project's existing test DB setup (reuse it).
2. Testcontainers or a compose test DB, **if Docker is available and the user agrees** to add it.
3. Otherwise, an in-memory **fake of the repository port** (same interface, real behaviour on a `Map`). Record in the report that persistence isn't covered (queries, constraints, transactions).

Never mock repository method calls with `jest.fn()` return values: that tests the call, not the data.

## Sources

- supertest (binds an ephemeral port when the server isn't listening): https://github.com/forwardemail/supertest
- Fastify testing (`inject`): https://fastify.dev/docs/latest/Guides/Testing/
- Next.js route handlers (Web `Request` / `Response`): https://nextjs.org/docs/app/api-reference/file-conventions/route
- Testing Library guiding principles and query priority (`getByRole` first): https://testing-library.com/docs/guiding-principles · https://testing-library.com/docs/queries/about#priority
- Testcontainers for Node: https://node.testcontainers.org/
- M. Fowler, "Mocks Aren't Stubs" (fakes: working implementations with a shortcut, e.g. an in-memory database): https://martinfowler.com/articles/mocksArentStubs.html
- The seam ladder and "one behaviour at one seam" are this skill's design choices, building on Matt Pocock's `tdd` skill (seams) and `to-spec` ("use the highest seam possible").
