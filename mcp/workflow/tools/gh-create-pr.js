import { gh } from "../lib/exec.js";

const definition = {
  name: "gh_create_pr",
  description: "Create a pull request",
  inputSchema: {
    type: "object",
    properties: {
      title: {
        type: "string",
        description: "PR title",
      },
      body: {
        type: "string",
        description: "PR body/description (markdown)",
      },
      base: {
        type: "string",
        description: "Base branch to merge into (default: repo default branch)",
      },
      head: {
        type: "string",
        description: "Head branch with changes (default: current branch)",
      },
      draft: {
        type: "boolean",
        description: "Create as draft PR",
      },
      labels: {
        type: "array",
        items: { type: "string" },
        description: "Labels to add",
      },
      milestone: {
        type: "string",
        description: "Milestone title or number",
      },
      assignees: {
        type: "array",
        items: { type: "string" },
        description: "Assignees to add",
      },
      reviewers: {
        type: "array",
        items: { type: "string" },
        description: "Reviewers to request",
      },
    },
    required: ["title", "body"],
  },
};

async function handler(args) {
  const {
    title,
    body,
    base,
    head,
    draft,
    labels,
    milestone,
    assignees,
    reviewers,
  } = args;

  const ghArgs = [
    "pr",
    "create",
    "--title",
    title,
    "--body",
    body,
    "--json",
    "number,url,headRefName,baseRefName",
  ];

  if (base) {
    ghArgs.push("--base", base);
  }

  if (head) {
    ghArgs.push("--head", head);
  }

  if (draft) {
    ghArgs.push("--draft");
  }

  if (labels && labels.length > 0) {
    for (const label of labels) {
      ghArgs.push("--label", label);
    }
  }

  if (milestone) {
    ghArgs.push("--milestone", milestone);
  }

  if (assignees && assignees.length > 0) {
    for (const assignee of assignees) {
      ghArgs.push("--assignee", assignee);
    }
  }

  if (reviewers && reviewers.length > 0) {
    for (const reviewer of reviewers) {
      ghArgs.push("--reviewer", reviewer);
    }
  }

  const { stdout } = await gh(ghArgs);
  const result = JSON.parse(stdout);

  return {
    content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
  };
}

export { definition, handler };
