# Lens: Tests

Do the tests protect the behaviour that matters, and only that? Missing tests are risk; redundant tests are cost. Report both.

Inputs: the coverage report for changed files and Stryker survivors (if run).

## Checklist

**Missing protection** (Major when it covers an AC, authz, money, or data integrity)
- An AC without a test at the agreed seam.
- A bug fix without a regression test that fails on the old code.
- A new authorization rule without a test proving another user/role gets 403/404.
- New error paths (validation, not found, conflict, dependency failure) never exercised.
- Stryker survivors: for each one, say whether it shows a **missing test** (it mutates behaviour a caller cares about) or **unnecessary code** (no requirement needs it → delete the code). Equivalent mutants: ignore.

**Tests that can't fail**
- Weak assertions: `toBeDefined`, `toBeTruthy`, bare `toThrow()`, `expect(res.status).toBeLessThan(500)`.
- Would it pass if the code returned `undefined` / empty?
- Tautological expected values.
- Snapshots of logic or of huge payloads nobody reviews.
- Assertions inside callbacks or `.then` that never run (missing `await` / `expect.assertions`).

**Coupled to implementation**
- Mocks of the project's own services/repositories; call-count or call-order assertions between internal classes; private-method tests.

**Redundant** (Minor, but list them; they slow every future change)
- The same behaviour tested at two levels (domain + controller + e2e).
- Tests differing only in data → `it.each`.
- Nest CLI `should be defined` stubs.

**Flaky or misleading**
- Real time, sleeps, randomness without a seed, network calls, order dependence, shared DB state without cleanup.
- The test app is configured differently from `main.ts` (global pipes/guards/filters missing), so tests pass against behaviour production doesn't have.
- `.only` / `.skip` / `todo` committed.

## Sources

- StrykerJS (mutation testing): https://stryker-mutator.io/docs/stryker-js/introduction/
- K. Beck, *Test-Driven Development: By Example* (test list).
- Matt Pocock's `tdd` skill and Uncle Bob's `ub-mode` (anti-patterns; "would still pass if every function returned nothing").
