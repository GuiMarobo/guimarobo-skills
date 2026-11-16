# Deterministic gates

## Ground rules

- Detect the package manager from the lockfile (`pnpm-lock.yaml`, `yarn.lock`, `package-lock.json`, `bun.lock` / `bun.lockb`) and prefer the project's own `package.json` scripts. In a monorepo, run per affected workspace (`pnpm --filter`, `npm -w`, `yarn workspace`, or nx/turbo targets).
- Run only tools that are already installed (`node_modules/.bin` or on PATH). **Never `npx` a package that isn't a dependency**: npx downloads and executes it.
- A missing tool → "not run" plus a one-line setup hint. Don't install anything without asking. **Every gate is optional**; the review still runs on whatever exists.
- Long runs (full suite) go in the background while you prepare the lens prompts. Keep only summary lines and findings in context.
- Scope to the diff where the tool allows it; report only issues introduced by this branch.

## Detection

| Gate | Runs when | Command (adapt) |
|---|---|---|
| Typecheck | `tsconfig.json` + `typescript` installed | `typecheck` script, else `tsc --noEmit -p <tsconfig>` |
| Lint | an ESLint/Biome config exists | `eslint <changed files>` / `biome check <changed files>` |
| Tests | a test script or runner config exists | the test script; add coverage if the runner supports it (`--coverage`) and read it for changed files |
| Mutation (thorough mode only) | `@stryker-mutator/core` installed and the user asked for thorough mode | `stryker run --mutate "<changed src files, comma-separated>"`. The CLI value **replaces** the config's `mutate`. Add `--incremental` if the project uses it. |
| Dependency audit | a lockfile changed | npm: `npm audit --omit=dev --audit-level=high` · pnpm: `pnpm audit --prod --audit-level=high` · yarn berry: `yarn npm audit --environment production` · yarn v1: `yarn audit --groups dependencies` · or `osv-scanner scan source -L <lockfile>` (v2 syntax) |
| Secrets | `gitleaks` (or `betterleaks`) on PATH | `gitleaks git -v --log-opts="<base>..HEAD" .` (v8.19+; `detect` is deprecated). Uncommitted files: `gitleaks dir <paths>`. Gitleaks is feature-complete; its author now works on Betterleaks. |
| SAST | `semgrep` on PATH | `semgrep scan --config p/typescript --config p/nodejs --config p/owasp-top-ten --config p/secrets <changed files>`. `--baseline-commit <base>` reports only new findings but **aborts** with unstaged changes or outside git: use it only on a clean tree. |
| Duplication | `jscpd` installed | `jscpd <changed dirs> --min-tokens 50` |

Without any tools, the review still works: the lenses read the code. The report's "Not checked" section says which gates were missing.

## Lint rules worth recommending when absent

Recommend; don't add:
- `typescript-eslint` typed rules (need type-aware linting): `no-floating-promises`, `no-misused-promises`, `await-thenable`, `switch-exhaustiveness-check`, the `no-unsafe-*` family;
- `eslint-plugin-security`;
- core `complexity` (ESLint default max is 20; ≈ 10 is stricter, matching ub-mode's CRAP < 10). High complexity plus low coverage on a changed function is a CRAP hotspot: flag it in maintainability.

## New dependencies (manual, always)

For every dependency added to `package.json`:
- Is it needed, or does the platform or an existing dependency already do it?
- Maintained (recent release, open security issues), widely used, correctly spelled (typosquatting)?
- `preinstall` / `install` / `postinstall` scripts?
- License compatible?
- `dependencies` vs `devDependencies` correct?

## Sources

- StrykerJS configuration and incremental mode: https://stryker-mutator.io/docs/stryker-js/configuration/
- Gitleaks: https://github.com/gitleaks/gitleaks
- Semgrep CLI reference: https://semgrep.dev/docs/cli-reference
- OSV-Scanner usage: https://google.github.io/osv-scanner/usage/
- npm audit: https://docs.npmjs.com/cli/commands/npm-audit · pnpm audit: https://pnpm.io/cli/audit · yarn: https://yarnpkg.com/cli/npm/audit
- jscpd: https://github.com/kucherenko/jscpd
- typescript-eslint rules: https://typescript-eslint.io/rules/
- OWASP Node.js Security Cheat Sheet (npm audit, strict mode): https://cheatsheetseries.owasp.org/cheatsheets/Nodejs_Security_Cheat_Sheet.html
