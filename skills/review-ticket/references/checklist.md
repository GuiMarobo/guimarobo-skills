# Ticket review checklist

Method: for each changed function, list its inputs and the state it reads, then try empty / zero / negative / max, `null` / `undefined`, duplicates, concurrent calls, and the failure of every awaited call. Trace the code; don't pattern-match names.

## 1. Conformance

- Every AC is implemented **and** has a test at the agreed seam. Quote the AC for each gap.
- Behaviour not asked for (scope creep): new endpoints, params, flags, abstractions.
- Behaviour that looks implemented but is wrong. Check it against a worked example from the AC.
- Written project standards (only the files the brief lists): a rule the diff breaks that lint/types don't enforce, e.g. constants outside the place the standard names, a domain error not extending the documented base class. Quote the rule. Lens `standards`, Minor unless the rule protects correctness.

## 2. Correctness

- Conditions: inverted or incomplete, `<` vs `<=`, a `switch` over a union without exhaustiveness (`never`).
- Nullish: `||` where `??` was intended (`0`, `''`, `false` are valid values), `!` on data that can be missing, `.find()` result used unchecked.
- Async: floating promise (not awaited or returned), `await` inside `forEach`, try/catch around an un-awaited call, `Promise.all` where one rejection shouldn't discard the rest.
- Errors: swallowed `catch {}`, returning a default that hides failure, a 500 where a 4xx is right, partial state left after a throw.
- State: check-then-act across an `await` (read → decide → write) without an atomic update, lock, or unique constraint. Request data stored on `this` in a Nest provider (providers are singletons).
- Types: money in a float `number` (IEEE 754 binary doubles), `Number('')` → `0`, dates and timezones (`new Date('2026-01-01')` is UTC, while `'2026-01-01T00:00'` is local), in-place `sort` / `reverse` / `splice` on inputs (use `toSorted` / `toReversed`).
- Transactions: multiple writes that must succeed together without a transaction. Emails or queue publishes inside a transaction that may roll back.

## 3. Test quality

- A test that would pass if the code returned `undefined` / empty: weak assertions (`toBeDefined`, `toBeTruthy`, bare `toThrow()`).
- Tautological expected values (recomputed like the code does).
- Mocks of the project's own modules, call-count assertions, Nest `should be defined` stubs.
- The same behaviour tested at two levels. Tests differing only in data that should be one `it.each`.
- A bug fix without a regression test. A new authorization rule without a "different user gets 403/404" test.
- Real time or sleeps, order-dependent tests, committed `.only` / `.skip`.

## 4. Security quick-scan

References: OWASP Top 10:2025, OWASP API Security Top 10:2023, CWE. Items marked **[Nest]** apply when `@nestjs/*` is a dependency. Otherwise check the framework's equivalent (zod/joi/Fastify schema validation, auth middleware/hooks).

- New route/resolver/gateway/handler: protected by auth? Resource loaded by id **with** an owner/tenant condition (`{ id, ownerId: user.id }`), not `{ id }` alone (A01 / API1, CWE-639)?
- Input validated at the boundary with bounds (lengths, sizes, ranges). **[Nest]** DTO under a `ValidationPipe` with `whitelist` + `forbidNonWhitelisted`. Nested objects need `@ValidateNested()` plus `@Type(() => X)`: class-validator only validates nested class instances, and class-transformer needs `@Type` to create them.
- Mass assignment: `repo.save({ ...body })`, `Object.assign(entity, body)`, `prisma.x.update({ data: body })` able to set `role`, `ownerId`, `isAdmin`, … (API3, CWE-915).
- Responses built from DTOs/allowlists, not entities (no `passwordHash` or internal fields) (API3).
- SQL/NoSQL built from strings (`query(\`… ${x}\`)`, `$queryRawUnsafe` with concatenation), `orderBy` from input without an allowlist (A05, CWE-89 / CWE-943).
- `exec` with interpolated input (CWE-78), `path.join(base, userInput)` without a prefix check (CWE-22), `eval` / `new Function` (CWE-94), deep-merging user objects (prototype pollution, CWE-1321).
- Outbound requests to user-supplied URLs (SSRF, A01, CWE-918).
- Secrets in code, tokens/passwords/PII in logs (CWE-532), `Math.random()` for tokens (CWE-338), plain or fast password hashes (use Argon2id / scrypt; bcrypt for legacy).

## Output format (per finding)

```
### [<B|M|m><n>] <title>    (Blocker | Major | Minor)
- Lens: conformance | correctness | tests | security | standards · Where: <file:line>
- Scenario: <input/state → wrong outcome or exploit; for standards: the quoted rule>
- Evidence: <≤5 quoted lines>
- Fix direction: <what to change>
- Regression test: <the RED test to write>
```

## Sources

- OWASP Top 10:2025: https://top10.owasp.org/2025/ · OWASP API Security Top 10:2023: https://owasp.org/API-Security/editions/2023/en/0x11-t10/
- OWASP Cheat Sheets (Mass Assignment, SSRF Prevention, Prototype Pollution Prevention, Password Storage, Logging): https://cheatsheetseries.owasp.org/
- CWE definitions: https://cwe.mitre.org/
- NestJS Validation: https://docs.nestjs.com/techniques/validation · class-validator nested objects: https://github.com/typestack/class-validator
- typescript-eslint promise rules: https://typescript-eslint.io/rules/no-floating-promises
- MDN (JS semantics: `??` vs `||`, `forEach` doesn't await promises, `Date.parse`, `Number('')`, `Array.prototype.sort`): https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference
- class-transformer `@Type` (nested objects): https://github.com/typestack/class-transformer
