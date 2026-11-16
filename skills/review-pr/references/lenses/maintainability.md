# Lens: Maintainability and standards

Will this code be cheap to change? Findings here are **Minor** by default. If a smell is hiding a real bug, report the bug under correctness instead. Max 8 findings; prefer the ones with the most leverage.

## Sources, in priority order

1. The repo's documented standards: `CLAUDE.md` / `AGENTS.md`, `CODING_STANDARDS.md`, `CONTRIBUTING.md`, ADRs, `GLOSSARY.md`. **The repo always wins** over the baseline below. Cite file + rule for each violation; these may be hard violations.
2. The baseline below. Each item is a judgement call: label it "possible …".

Skip anything lint or the type checker already enforces.

## Baseline

**Structure (from the project's layering)**
- Business rules in controllers, resolvers, or ORM entities instead of domain/services; framework code inside domain logic.
- Validation scattered inside the core instead of parsed once at the boundary.
- One decision encoded in several places (duplicated rule, magic numbers repeated).

**Types**
- `any`, unchecked `as`, `@ts-ignore` / `@ts-expect-error`, `!`.
- A primitive standing in for a domain concept (`string` for email/money/status) where the codebase has or needs a type.
- Illegal states representable (boolean flags that conflict; optional fields that are required together).

**Complexity**
- Changed functions with high cyclomatic complexity (≈ >10), especially with low coverage (CRAP hotspot).
- Deep nesting; long parameter lists; flags that switch behaviour.

**Fowler smells (Refactoring, ch. 3)**: name it, quote the hunk, suggest the move.
- Mysterious Name → rename.
- Duplicated Code (also jscpd output) → extract the shared shape.
- Feature Envy → move the method to the data it uses.
- Data Clumps → bundle into a type.
- Primitive Obsession → small domain type.
- Repeated Switches → polymorphism or one shared map.
- Shotgun Surgery → gather what changes together.
- Divergent Change → split by reason to change.
- Speculative Generality → delete; inline until a real need shows.
- Message Chains → hide the walk behind one method.
- Middle Man → call the real target directly.
- Refused Bequest → composition over inheritance.

**Dead weight**
- Unused exports, params, branches, feature flags, and commented-out code introduced by the diff.

## Sources

- M. Fowler, *Refactoring* (2nd ed.), ch. 3 "Bad Smells in Code" (via Matt Pocock's `code-review` skill).
- CRAP metric (complexity × coverage) and duplication gates, from Uncle Bob's `ub-mode` (crapper / dryer).
- ESLint `complexity` rule: https://eslint.org/docs/latest/rules/complexity
