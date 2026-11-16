# Lens: Correctness

Find inputs, states, or sequences that produce a wrong result, a crash, or corrupted state.

## Method

For each changed function: list its inputs and the state it reads, then try empty / zero / negative / max, `null` / `undefined`, duplicates, unicode and whitespace, two concurrent calls, and the failure of every awaited call. Follow callers and callees outside the diff when the behaviour depends on them. Compare the code's result with a worked example from the spec.

## Checklist

**Control flow**
- Inverted or incomplete conditions, `<` vs `<=`, wrong operator precedence.
- A `switch` / if-chain over a union with no exhaustiveness check (`const _: never = x`).
- Early `return` / `throw` skipping cleanup, release, or a required write.

**Nullish and types**
- `||` where `??` was intended (`0`, `''`, `false` are valid).
- `!` or `as` on data that can be missing.
- Unchecked `.find()` / `Map.get()` / `[0]`.
- `Number('')` → `0`; `parseInt` without a radix (inferred from the string, e.g. `0x…` → 16, not always 10); `NaN` propagating; `typeof null === 'object'`.
- Money in a `number` (IEEE 754 binary double): use integer minor units or a decimal library; rounding applied at the wrong step.
- Dates: date-only strings (`new Date('2026-01-01')`) parse as UTC, but date-time strings without an offset parse as local time; server timezone, DST, end-of-month, inclusive vs exclusive ranges.

**Async**
- Floating promises: created with no `await`, `return`, `.catch`, two-argument `.then`, or explicit `void`.
- `await` inside `forEach` (it doesn't wait for promises), or `map` without `Promise.all`.
- try/catch around an un-awaited promise (the catch never fires).
- `Promise.all` where a single rejection should not discard the other results (`allSettled`).
- Async work started in constructors / `onModuleInit` without being awaited.

**Errors**
- `catch {}` or a catch that returns a default and hides the failure.
- Re-throwing without the cause.
- Wrong exception type → wrong status (500 for a client error, 404 vs 403).
- Partial writes left behind when a later step throws.

**State and concurrency**
- Check-then-act across an `await` (read balance → decide → write) with no atomic update, row lock, optimistic version, or unique constraint. Two concurrent requests break it.
- Request-specific data stored on `this` in a singleton Nest provider, or in module-level variables.
- Caches not invalidated on the write paths the diff adds.

**Collections**
- In-place `sort` / `reverse` / `splice` on arguments or shared arrays (`toSorted` / `toReversed` / `toSpliced` copy).
- Pagination off-by-one (page 0 vs 1, inclusive cursors); unstable sort without a tiebreaker → duplicates or gaps across pages.
- Missing dedupe; key collisions in maps built from user data.

**Transactions**
- Writes that must succeed together, made outside a transaction, or in one using a different `EntityManager` / client than the transaction.
- Side effects (email, publish, external charge) inside a transaction that may roll back.

**Spec semantics**
- The rule computed differs from the spec's wording or worked example. Quote both.

## Not this lens

Security exploitability, performance, style, test quality.

## Sources

- typescript-eslint `no-floating-promises`, `no-misused-promises`, `switch-exhaustiveness-check`: https://typescript-eslint.io/rules/
- TypeScript Handbook, exhaustiveness checking with `never`: https://www.typescriptlang.org/docs/handbook/2/narrowing.html#exhaustiveness-checking
- MDN: nullish coalescing, `Array.prototype.forEach` / `sort` / `toSorted`, `Promise.all` / `allSettled`, `Date.parse`, `Number` (coercion, IEEE 754), `parseInt`, `typeof`. https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference
- OWASP Top 10:2025 A10 Mishandling of Exceptional Conditions: https://top10.owasp.org/2025/
- Engineering practice (no single standard): boundary/equivalence analysis, concurrency and transaction checks.
