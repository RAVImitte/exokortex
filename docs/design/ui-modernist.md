# Modernist UI experiment

Branch: `ui-modernist`, based on `origin/main` at `8ca5d42`.

The style was selected once with PowerShell `Get-Random` from all 25 styles supplied in the request. The result was **Modernist**. The [creation prompt](landing-page-prompt.md) contains exactly three paragraphs, with no technical implementation requirements inside the prompt.

## Design

The new visual language uses warm gray, cobalt, large Bahnschrift display type, fine dividers, restrained corners, and a repeated geometric sculpture. The sculpture is built in CSS, with no external image or font requests and no new runtime dependencies.

The redesign covers the public landing page, development and Clerk sign-in layouts, navigation, dashboard, repository lists, connections, projects, activity, approvals, AI configuration, settings, dialogs, and shared controls. Existing workflows and API contracts are preserved. The root URL is now public; workspace entry is at `/login`. Workspace code loads separately from the landing page.

Light and dark modes use the existing saved theme preference. Mobile navigation traps focus, makes background content inert, closes with Escape, and restores focus. Reduced motion also applies to dashboard counters.

## Local preview

The current isolated checkout is `.ui-modernist`. Its live UI runs at `http://127.0.0.1:5176`, with an isolated local Worker and D1 database at `http://127.0.0.1:8789`. The Worker also serves the production frontend at its own URL. Use the development email form to enter the workspace; no external identity provider is required for local UI review.

To reproduce after installing dependencies and running the repository's normal local setup:

```powershell
pnpm --filter @exokortex/web build
pnpm --filter @exokortex/worker db:migrate:local
pnpm --filter @exokortex/worker exec wrangler dev --port 8789
```

In a second terminal:

```powershell
$env:EXOKORTEX_API_URL = "http://127.0.0.1:8789"
pnpm --filter @exokortex/web exec vite --host 127.0.0.1 --port 5176
```

The API override is optional; the normal development default remains port 8787. Local credentials and database state are ignored by Git and excluded from the patch.

## Validation

- TypeScript, ESLint, formatting, production build, and Git whitespace checks.
- Real development sign-in against the isolated Worker and local database.
- Dashboard plus all seven other workspace routes, including empty states.
- Landing page at widths 320, 390, 768, 1024, and 1440; workspace pages down to 320px.
- Interactive example, native FAQ disclosures, skip link, mobile focus containment, Escape dismissal, saved light/dark preference, and reduced motion.
- Populated project cards using browser-only fixtures; sample projects were not stored in the local database.
- No JavaScript runtime errors in the browser checks. External provider connections and model inference require credentials and were not exercised.

Browser screenshots and verification scripts are available locally in `output/playwright/` and excluded from Git. The distributable patch is `output/exokortex-modernist.patch`, generated against the base commit. Apply it to a clean checkout of that base with `git apply /path/to/exokortex-modernist.patch`.
