# Decision Record: Convert Decision Docs to Cursor Rules

## Context
We maintain project-defining decisions in `decisions/*.md`. To improve in-IDE guidance, these need to be mirrored as Cursor rules (`.mdc`) so Cursor can contextually surface them during implementation.

## Decision
Create categorized `.mdc` rule files under `.cursor/rules/decisions/n8n-extension/<category>/` for each decision. Automate conversion to ensure completeness and consistency.

## Implementation Details
- Script: `scripts/convert-decisions-to-rules.mjs`
- Mapping → categories: governance, architecture, dev-workflow, api, ux, browser-extension, testing, error-handling, state-management, security, use-cases
- Header schema:
  - `alwaysApply`: true for governance, security, testing, error-handling, dev-workflow; false otherwise
  - `description`: derived from the decision title (fallback: first sentence)
- File naming: `<number>-<slug>.mdc` preserving original order
- Conversion preserves original markdown content verbatim after frontmatter header

## Alternatives Considered
- Manual creation: error-prone and slow
- Single monolithic rule: too noisy and not context-precise

## Consequences
- Pros: Better in-IDE guidance, consistent rule surfacing, easy maintenance via script
- Cons: Duplicate sources (original decisions + generated rules); mitigated by regenerating as needed

## References
- `.cursor/rules/decisions/decision-documentation.mdc`
- `scripts/convert-decisions-to-rules.mjs`

