# Feature ideas

A parking lot of bigger and stranger ideas. None of these are planned. Each one says what it is and why it might be worth it. Some would break a rule in [vision.md](vision.md), and that is called out.

## Make the portfolio smarter

- **Portfolio health score.** One number on Home: how many projects are stale, missing a demo link, missing screenshots, or describe a stack the code no longer uses. Each point links to a fix.
- **Auto screenshots.** When a project has a live URL, take a screenshot after each change and put it in the pull request. The portfolio always shows what the project looks like today.
- **"What I did this month" post.** Turn the month’s approved changes into a short changelog-style blog post, opened as a second pull request in the portfolio repository.
- **Résumé sync.** Keep a `resume.md` or JSON Résumé file in the portfolio repository updated from the same approvals. Export to PDF from the dashboard.
- **Skill timeline.** Track which languages and frameworks appear across projects over time and draw it. It answers "when did I start using Rust" honestly.
- **Ghost project finder.** Spot repositories with real work that were never added to the portfolio and suggest them, ranked by how much work went in.

## Make the agents more useful

- **Ask your portfolio.** A chat box that answers questions like "which projects used Postgres" or "what did I ship in March" from the analyst summaries already in D1.
- **Recruiter view.** Paste a job description and get the three projects that fit best, with a one-paragraph pitch for each. Read-only, nothing is changed.
- **Tone presets.** Let the user choose how project descriptions read: plain, technical, or friendly. Curator and Engineer follow it.
- **Second opinion.** Run Curator on two different models and only ask for approval when they disagree. Fewer approvals for obvious changes.
- **Release notes for sources.** When a GitHub repository gets a tag, have Analyst write release notes and offer them as a pull request on that repository too. This adds a write on a source repository, which the current design avoids.

## More places to watch

- **GitLab and Bitbucket.** The same flow as GitHub, including as the portfolio host.
- **npm, PyPI, and crates.io.** Notice a new published version and treat it as a change.
- **Papers and talks.** arXiv, Google Scholar, or a YouTube channel as sources, for people whose work is not only code.
- **Design work.** Figma or Dribbble files as sources, with thumbnails in the portfolio.
- **Blogs.** An RSS feed as a source. A new post can update the related project.

## Less clicking

- **Approve from email.** Signed one-click Approve and Reject links in the approval mail. Opening the dashboard becomes optional.
- **Mobile push and a PWA.** Install the dashboard to a phone home screen and get a push notification instead of mail. The vision rules out a mobile app. A PWA is the cheap middle ground.
- **Slack and Discord bot.** Approvals arrive as a message with buttons.
- **Trust levels.** Let the user say "auto-approve updates to existing projects, ask me about new ones". This loosens the human-approval rule and should stay opt-in per project.
- **Auto-merge when CI is green.** For people who trust it. This breaks the "you merge" rule in the vision and ADR 017, so it would need its own decision record.

## Bigger bets

- **Portfolio themes.** Ship a few ready-made portfolio sites that read the same project data file, so someone without a portfolio can start with one click. The vision says ExoKortex does not redesign the portfolio, so this would be a separate starter, not an edit.
- **Teams and studios.** One portfolio for a small agency, fed by many people’s repositories. This breaks the one-user-one-tenant rule in ADR 009.
- **Public profile page.** A hosted page at `exokortex.dev/name` built from the approved projects, for people who do not want to run their own site.
- **Local model mode.** Point the base URL at Ollama or LM Studio over a tunnel, with presets in the AI model page, for people who want nothing to leave their machine.
- **Time machine.** Scroll back through the portfolio as it looked at any past date, using the stored approvals and pull requests.
