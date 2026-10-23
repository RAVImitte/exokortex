export function explainGitHubWriteError(error: string): string {
  if (error.includes("Too many subrequests")) {
    return "Building the portfolio made too many GitHub requests. Try again.";
  }
  if (
    error.includes("returned 403") &&
    (error.includes("/user/repos") || error.includes("/orgs/"))
  ) {
    return "GitHub refused to create the repository. Set Repository creation to Read and write on the GitHub App, save, and approve that permission on the installation. Then try again.";
  }
  if (error.includes("returned 403")) {
    return "GitHub refused to open the pull request. Set Contents and Pull requests to Read and write on the GitHub App, save, and approve that request on the installation. Then try again.";
  }
  return error;
}
