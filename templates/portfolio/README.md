# Portfolio template

A built-in portfolio for someone who does not already have one. If they do, they link that repository instead and ExoKortex edits it in place. This folder is the fallback: copy it, mark it as the portfolio, and approved work from their other repositories lands here.

## What a project file holds

`exokortex.json` points at `src/content/projects/{slug}.json`. Those four fields are the ones a repository usually has, and they are the ones ExoKortex updates:

- `title` is the repository name.
- `summary` is what that repository says it is. The analyst reads `README.md`, and `package.json`, `pyproject.toml`, or `Cargo.toml` when those exist.
- `stack` is the technologies named in those files.
- `sourceUrl` is the repository URL.

Any other key you add stays. The engineer does not invent a picture.

`src/data/profile.json` is the person: name, role, bio, location, email, and links. ExoKortex does not write this file.

## Use it

1. Copy this folder into its own GitHub repository.
2. Replace the sample person in `src/data/profile.json`. Delete the sample projects in `src/content/projects/`.
3. In ExoKortex, mark this repository as the portfolio.
4. Approve a connected repository. ExoKortex opens a pull request that adds or updates that one project file.
5. Merge it. Your existing CI deploys the site.

```powershell
pnpm install
pnpm dev
```

Open http://localhost:5173. `pnpm build` writes `dist/`.
