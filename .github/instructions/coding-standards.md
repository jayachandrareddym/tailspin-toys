---
description: 'Repository-wide coding and documentation standards (comments, TSDoc/JSDoc, and component contracts)'
applyTo: '**/*'
---

# Coding & Documentation Standards

## Comment philosophy

- Comment intent, not mechanics. Explain *why* a decision exists, trade-offs, or the reasoning behind non-obvious behavior. Avoid comments that simply restate the code immediately below.
- Treat outdated comments as bugs: update or remove them in the same change that touches the related code.

## TSDoc / JSDoc expectations

- Every exported function in `db/` and `src/lib/` must include a TSDoc/JSDoc block describing:
  - A one-line summary of purpose
  - Parameters (including `db` when present) with types and intent
  - Return value and shape (or `Promise<...>`)
  - Any side effects (migrations, seeding, network, file I/O)

Example (db helper):

```ts
/**
 * Fetch all public game IDs ordered by title.
 *
 * @param db - An injectable Drizzle `Database` instance (use createTestDatabase() in tests).
 * @returns A promise that resolves to an array of numeric game IDs in stable alphabetical order.
 */
export async function getAllGameIds(db: Database): Promise<number[]> { ... }
```

## Component contracts (.astro)

- Each reusable `.astro` component must declare a `Props` interface in frontmatter and include a short TSDoc comment describing expected props and any invariants (e.g., `id` must be present, `imageUrl` may be `null`).

Example (component props):

```astro
---
/** Props for GameCard component. */
interface Props {
  /** Unique numeric game id. */
  id: number;
  /** Title to display. */
  title: string;
}
const { id, title } = Astro.props as Props;
---
```

## TypeScript formatting & enforcement

- Use explicit parameter and return types for exported helpers in `db/` and `src/lib/` so the native type-checker (`tsgo`) can verify them.
- Prefer single-line TSDoc summaries and use `@param` / `@returns` for clarity.
- Where possible, enforce formatting and basic doc presence via ESLint rules (see project ESLint config). When adding lint rules, ensure `npm run lint` still passes; update rule exceptions only with a clear justification and tests if needed.

## Acceptance checklist (for PRs changing code/docs)

- [ ] Comments follow "intent, not mechanics" (no paraphrasing of line-level code)
- [ ] Exported functions in `db/` and `src/lib/` have TSDoc/JSDoc blocks
- [ ] `.astro` components document their `Props` interfaces in frontmatter
- [ ] README links to these coding standards (this file)

Please refer to these guidelines when authoring or reviewing changes that touch the data layer, components, or public APIs.
