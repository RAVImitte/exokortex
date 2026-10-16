# Kaggle

Status: **Implemented**.

Create an API token at [kaggle.com/settings/api](https://www.kaggle.com/settings/api). On Connections, paste it into Kaggle. The Worker checks the token, encrypts it with `ENCRYPTION_KEY`, and stores ciphertext on the `kaggle` connection. The API never returns the token, and agents never receive it.

Discovery lists datasets and notebooks owned by that username. Rows owned by someone else are skipped. Each row is a source. It cannot be marked as the portfolio. The portfolio repository stays on GitHub, and the Engineer still opens the pull request there.

There is no Kaggle webhook. Scan now and the weekly schedule enqueue a separate job. The revision is the dataset or notebook version number. The first scan stores it and writes no change event. A later version writes one event. Dataset changes are files whose size differs. A notebook change is the source file. Files larger than 200 KB, and zipped downloads, are not read.

A missing or rejected token fails the connect call and stores nothing. Disconnect clears the ciphertext.
