export function explainGitHubWriteError(error: string): string {
  if (error.includes("returned 403")) {
    return "GitHub refused to open the pull request. Set Contents and Pull requests to Read and write on the GitHub App, save, and approve that request on the installation. Then try again.";
  }
  return error;
}
