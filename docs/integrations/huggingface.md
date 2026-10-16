# Hugging Face

Status: **Implemented**.

Create a read token at [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens). A classic read token is enough. On Connections, paste it into Hugging Face. The Worker calls `whoami`, encrypts the token with `ENCRYPTION_KEY`, and stores ciphertext on the `huggingface` connection. The API never returns the token, and agents never receive it.

Discovery lists models, datasets, and spaces whose author is that username. Org repositories are not included. Each row is a source. It cannot be marked as the portfolio. The portfolio repository stays on GitHub, and the Engineer still opens the pull request there.

There is no Hugging Face webhook. Scan now and the weekly schedule enqueue a separate job from the GitHub scan. The first scan stores the commit SHA and writes no change event. A later SHA writes one event. Changed files are the paths whose blob id differs between the two commits. Files larger than 200 KB are not read.

A missing or rejected token fails the connect call and stores nothing. Disconnect clears the ciphertext.
