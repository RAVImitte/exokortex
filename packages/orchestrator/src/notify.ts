export interface Notice {
  subject: string;
  text: string;
}

export function approvalWaitingNotice(input: {
  action: string;
  reason: string;
  repositoryName: string;
  approvalsUrl: string;
}): Notice {
  const kind = input.action === "NEW_PROJECT" ? "New project" : "Project update";
  return {
    subject: `${kind} waiting for approval`,
    text: [
      `${kind} in ${input.repositoryName} is waiting for you.`,
      input.reason,
      input.approvalsUrl,
    ]
      .filter((line) => line.length > 0)
      .join("\n\n"),
  };
}

export function pullRequestOpenedNotice(input: { projectName: string; url: string }): Notice {
  return {
    subject: `Pull request opened for ${input.projectName}`,
    text: `A pull request is ready for you to merge.\n\n${input.url}`,
  };
}
