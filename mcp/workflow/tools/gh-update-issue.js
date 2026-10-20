import { gh } from "../lib/exec.js";
import { slimRecord, appendSection, toText } from "../lib/slim.js";

const definition = {
  name: "gh_update_issue",
  description: "Update an existing GitHub issue (title, body, milestone, labels). Use append_body to add a section without re-reading the body.",
  inputSchema: {
    type: "object",
    properties: {
      cwd: {
        type: "string",
        description: "Working directory (defaults to MCP server cwd)",
      },
      issue: {
        type: "number",
        description: "Issue number to update",
      },
      title: {
        type: "string",
        description: "New title (optional)",
      },
      body: {
        type: "string",
        description: "New body content (optional)",
      },
      append_body: {
        type: "string",
        description: "Markdown appended to the current body after a blank line; the server fetches the body (optional, not with body)",
      },
      milestone: {
        type: "string",
        description: "Milestone title or number to set (optional)",
      },
      add_labels: {
        type: "array",
        items: { type: "string" },
        description: "Labels to add (optional)",
      },
      remove_labels: {
        type: "array",
        items: { type: "string" },
        description: "Labels to remove (optional)",
      },
      add_assignees: {
        type: "array",
        items: { type: "string" },
        description: "Assignees to add (optional)",
      },
      remove_assignees: {
        type: "array",
        items: { type: "string" },
        description: "Assignees to remove (optional)",
      },
    },
    required: ["issue"],
  },
};

async function handler(args) {
  const {
    cwd,
    issue,
    title,
    body,
    append_body,
    milestone,
    add_labels,
    remove_labels,
    add_assignees,
    remove_assignees,
  } = args;

  if (body && append_body) {
    throw new Error("Pass either body or append_body, not both");
  }

  const opts = cwd ? { cwd } : {};
  const ghArgs = ["issue", "edit", String(issue)];

  if (title) {
    ghArgs.push("--title", title);
  }

  if (body) {
    ghArgs.push("--body", body);
  }

  if (append_body) {
    const { stdout: current } = await gh(["issue", "view", String(issue), "--json", "body", "--jq", ".body"], opts);
    ghArgs.push("--body", appendSection(current, append_body));
  }

  if (milestone) {
    ghArgs.push("--milestone", milestone);
  }

  if (add_labels && add_labels.length > 0) {
    for (const label of add_labels) {
      ghArgs.push("--add-label", label);
    }
  }

  if (remove_labels && remove_labels.length > 0) {
    for (const label of remove_labels) {
      ghArgs.push("--remove-label", label);
    }
  }

  if (add_assignees && add_assignees.length > 0) {
    for (const assignee of add_assignees) {
      ghArgs.push("--add-assignee", assignee);
    }
  }

  if (remove_assignees && remove_assignees.length > 0) {
    for (const assignee of remove_assignees) {
      ghArgs.push("--remove-assignee", assignee);
    }
  }

  // Check if any updates were requested
  if (ghArgs.length === 3) {
    return {
      content: [{ type: "text", text: "No updates specified" }],
    };
  }

  await gh(ghArgs, opts);

  // Fetch updated issue
  const { stdout } = await gh([
    "issue",
    "view",
    String(issue),
    "--json",
    "number,title,state,labels,milestone,assignees,url",
  ], opts);

  const result = slimRecord(JSON.parse(stdout));

  return {
    content: [{ type: "text", text: toText(result) }],
  };
}

export { definition, handler };
