# User guide

ExoKortex keeps your portfolio website up to date for you. You keep working on your projects. ExoKortex notices what changed, writes a short explanation, asks you before anything new goes on your portfolio, and then opens a pull request with the update. You merge it, and your site updates the way it always does.

You stay in control. ExoKortex never merges, never deploys, and never posts anything without your approval.

## What you need

- A GitHub account with your portfolio website in a repository. The site should read its project list from a data file, such as `projects.json` or a Markdown folder.
- An API key for an AI model that speaks the OpenAI format. OpenAI, OpenRouter, and Groq all work. You pay that provider directly. ExoKortex does not charge for AI use.
- Optional: Hugging Face, Kaggle, or Google Colab accounts, if some of your work lives there.

## First-time setup

Home shows a checklist with four steps. It goes away when all four are done.

### 1. Connect where your work lives

Open **Connections**.

- **GitHub**: choose Connect and pick the repositories ExoKortex may see. Include your portfolio repository.
- **Hugging Face**: paste a read token from your Hugging Face settings.
- **Kaggle**: paste your Kaggle API token.
- **Google Colab**: choose Connect and sign in with Google.

Your repositories appear on the **Repositories** page. Tokens are stored encrypted and are never shown again.

### 2. Add your AI model

Open **AI model**.

1. Pick your provider. If yours is not listed, choose Custom and paste its base URL.
2. Type the model name, for example `gpt-4o-mini`.
3. Paste your API key and choose **Save**.
4. Choose **Test model**. A green result means it works.

Your key is never shown again and is never sent to the AI itself. When you change any setting here later, paste the key again.

### 3. Pick your portfolio

Open **Repositories** and find your portfolio repository. Set its role to **Portfolio**. If your site deploys from a branch other than the default one, type that branch name next to it.

Set anything you do not want watched, such as forks or old experiments, to **Excluded**. Everything else stays **Source** and is watched.

### 4. Run your first scan

On Repositories, choose **Scan now**. The first scan only takes a snapshot of where each project is today, so nothing shows up in Activity yet. That is expected.

After that, ExoKortex scans on a schedule. Weekly is the default. A push to GitHub also triggers a scan of that repository straight away.

## Everyday use

### When something changes

You keep working as usual. On the next scan:

1. ExoKortex sees that a project changed.
2. It reads the change and writes a short summary. You can read these on **Activity**.
3. It decides whether your portfolio needs an update. Small things like typo fixes are ignored.
4. If a project is new, or an existing one changed in a way worth showing, it asks you.

You get an email when something is waiting, if email is set up. The sidebar shows a number next to **Approvals**.

### Approving

Open **Approvals**. Each card says what ExoKortex wants to do and why.

- **Approve** if it looks right.
- **Reject** if it does not. Nothing happens to your portfolio.

When you have answered everything, ExoKortex opens one pull request on your portfolio repository with all the approved changes. The link appears on the card. Open it, check it, and merge it. Your site deploys the way it always does.

If the pull request step fails, the card says why and offers **Try again**.

### Other pages

- **Home**: counts, the time of the last and next scan, and the latest activity.
- **Activity**: every change ExoKortex has seen. Filter by Open, Analyzed, or Ignored. **Run analysis** on an ignored change makes your model read it properly. **Run curator** on an analyzed change asks again whether your portfolio should change.
- **Projects**: the projects ExoKortex knows are on your portfolio.
- **Settings**: how often to scan, your timezone, light or dark theme, and account deletion.

## Changing your mind

- **Stop watching one repository**: set it to Excluded on Repositories.
- **Disconnect an account**: Connections, then Disconnect on that account. The stored token is wiped.
- **Delete everything**: Settings, then Delete account data. Type `delete` to confirm. This removes your repositories, connections, approvals, and settings from ExoKortex. It does not touch anything on GitHub or your other accounts.

## Common questions

**Nothing shows up in Activity after my first scan.**
That is normal. The first scan is a snapshot. Make a change in a project, then scan again.

**A change was ignored but I wanted it on my portfolio.**
Open Activity, choose the Ignored filter, and choose Run analysis on that change. When it finishes, choose Run curator.

**The AI model test fails.**
Check the base URL, the model name, and that your key has credit. Some providers need the full path ending in `/v1`.

**Can ExoKortex break my site?**
It can only open a pull request. Nothing reaches your site until you merge, and your own CI still runs first.

**Does ExoKortex see my keys or send them to the AI?**
Keys are stored encrypted and are only used by the server to call the service they belong to. The AI only sees the content of your projects.
