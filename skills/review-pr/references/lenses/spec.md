# Lens: Spec conformance

Does the branch implement what was asked: all of it, only it, and correctly?

## Pick the mode

- **Spec mode:** a spec, tickets, or a PR description with real requirements exists. Quote the source line for every finding.
- **Inferred mode:** nothing usable exists. Write the intent in 1–3 sentences from the commit messages, branch name, and diff, and put it at the top of your output as "Inferred intent". Then report only:
  - internal contradictions (the code does X in one path and not-X in a sibling path);
  - half-finished work: TODOs, unreachable branches, a flag added but never read, a new field written but never read (or the reverse);
  - behaviour that contradicts the code's own names, docs, or types.

  Label every finding "(inferred)". Never invent requirements.

## Spec mode: report three things

1. **Missing or partial:** user stories, ACs, or implementation decisions not delivered, or delivered only in part. Check every ticket's AC checklist.
2. **Wrong:** looks implemented, but the behaviour differs from the spec. Give a worked example: spec says X for input I, the code does Y.
3. **Unasked:** behaviour, endpoints, options, or abstractions the spec didn't ask for (scope creep), and anything the spec's *Out of Scope* section excludes.

Also check, when present:
- *Implementation Decisions* (modules, interfaces, schema, API contracts) are honoured, or the deviation is explained in commits or ADRs.
- *Testing Decisions* (seams, modules to test) are followed.
- Domain terms match `GLOSSARY.md`.

## PR discussion (when given)

For each unresolved review thread or change request, check the current code and mark it `addressed` (cite file:line), `not addressed`, or `unclear`. Output these as a short list, not as findings. A request that is not addressed **and** matches an AC or spec decision also becomes a finding, at the usual severity.

## Severity

A missing AC or wrong behaviour is a Blocker or Major depending on impact. Scope creep is Minor, or Major if it adds attack surface or a public contract. Inferred-mode findings are at most Major.

## Sources

- Matt Pocock's `code-review` skill (Spec axis: missing, unasked, wrong).
