import { gh } from "../lib/exec.js";

const definition = {
  name: "gh_milestone_issues",
  description: "List issues in a milestone with full metadata",
  inputSchema: {
    type: "object",
    properties: {
      milestone: {
        type: "string",
        description: "Milestone title",
      },
      state: {
        type: "string",
        enum: ["open", "closed", "all"],
        description: "Filter by state (default: all)",
      },
      label: {
        type: "string",
        description: "Filter by label (optional)",
      },
    },
    required: ["milestone"],
  },
};

async function handler(args) {
  const { milestone, state = "all", label } = args;

  // Build gh issue list command
  const ghArgs = [
    "issue", "list",
    "--milestone", milestone,
    "--state", state,
    "--json", "number,title,state,labels,body",
    "--jq", '[.[] | {number, title, state, labels: [.labels[].name], body}]'
  ];

  if (label) {
    ghArgs.push("--label", label);
  }

  const { stdout } = await gh(ghArgs);
  const issues = stdout ? JSON.parse(stdout) : [];

  return {
    content: [{ type: "text", text: JSON.stringify(issues, null, 2) }],
  };
}

export { definition, handler };
