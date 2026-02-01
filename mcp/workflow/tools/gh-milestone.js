import { gh } from "../lib/exec.js";

const definition = {
  name: "gh_milestone",
  description: "Milestone operations: find, close, open, rename",
  inputSchema: {
    type: "object",
    properties: {
      action: {
        type: "string",
        enum: ["find", "close", "open", "rename"],
        description: "Action to perform",
      },
      identifier: {
        type: "string",
        description: "Milestone number or title pattern",
      },
      new_title: {
        type: "string",
        description: "New title (required for rename action)",
      },
    },
    required: ["action", "identifier"],
  },
};

async function findMilestone(identifier) {
  // If it's a number, fetch directly
  if (/^\d+$/.test(identifier)) {
    const { stdout } = await gh([
      "api",
      `repos/{owner}/{repo}/milestones/${identifier}`,
      "--jq", '{ number, title, state, open_issues, closed_issues }'
    ]);
    return JSON.parse(stdout);
  }

  // Otherwise search by title
  const { stdout } = await gh([
    "api", "repos/{owner}/{repo}/milestones",
    "--jq", `.[] | select(.title | contains("${identifier}")) | { number, title, state, open_issues, closed_issues }`
  ]);

  if (!stdout) {
    throw new Error(`No milestone found matching: ${identifier}`);
  }

  // Take first match
  const lines = stdout.trim().split("\n");
  return JSON.parse(lines[0]);
}

async function handler(args) {
  const { action, identifier, new_title } = args;

  // Find the milestone first
  const milestone = await findMilestone(identifier);

  switch (action) {
    case "find":
      return {
        content: [{ type: "text", text: JSON.stringify(milestone, null, 2) }],
      };

    case "close":
      await gh([
        "api", "-X", "PATCH",
        `repos/{owner}/{repo}/milestones/${milestone.number}`,
        "-f", "state=closed"
      ]);
      milestone.state = "closed";
      return {
        content: [{ type: "text", text: JSON.stringify(milestone, null, 2) }],
      };

    case "open":
      await gh([
        "api", "-X", "PATCH",
        `repos/{owner}/{repo}/milestones/${milestone.number}`,
        "-f", "state=open"
      ]);
      milestone.state = "open";
      return {
        content: [{ type: "text", text: JSON.stringify(milestone, null, 2) }],
      };

    case "rename":
      if (!new_title) {
        throw new Error("new_title is required for rename action");
      }
      await gh([
        "api", "-X", "PATCH",
        `repos/{owner}/{repo}/milestones/${milestone.number}`,
        "-f", `title=${new_title}`
      ]);
      milestone.title = new_title;
      return {
        content: [{ type: "text", text: JSON.stringify(milestone, null, 2) }],
      };

    default:
      throw new Error(`Unknown action: ${action}`);
  }
}

export { definition, handler };
