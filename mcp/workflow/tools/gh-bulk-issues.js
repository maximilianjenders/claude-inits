import { gh } from "../lib/exec.js";
import { batchExecute } from "../lib/github-api.js";

const definition = {
  name: "gh_bulk_issues",
  description: "Bulk operations on issues: create, label, unlabel, close, reopen",
  inputSchema: {
    type: "object",
    properties: {
      cwd: {
        type: "string",
        description: "Working directory (defaults to MCP server cwd)",
      },
      action: {
        type: "string",
        enum: ["create", "label", "unlabel", "close", "reopen"],
        description: "Action to perform",
      },
      issues: {
        type: "array",
        items: { type: "number" },
        description: "Issue numbers (required for label/unlabel/close/reopen)",
      },
      new_issues: {
        type: "array",
        description: "Issues to create (required for create action)",
        items: {
          type: "object",
          properties: {
            title: { type: "string", description: "Issue title" },
            body: { type: "string", description: "Issue body (markdown)" },
            labels: {
              type: "array",
              items: { type: "string" },
              description: "Labels to add",
            },
            blocked_by_indices: {
              type: "array",
              items: { type: "number" },
              description: "0-based indices of issues in this batch that block this one",
            },
            blocked_by_issues: {
              type: "array",
              items: { type: "number" },
              description: "Existing issue numbers that block this one",
            },
          },
          required: ["title", "body"],
        },
      },
      milestone: {
        type: "string",
        description: "Milestone title or number (for create action)",
      },
      label: {
        type: "string",
        description: "Label to add/remove (for label/unlabel/close actions)",
      },
      comment: {
        type: "string",
        description: "Comment to add when closing",
      },
    },
    required: ["action"],
  },
};

async function handleCreate(args, opts = {}) {
  const { new_issues, milestone } = args;

  if (!new_issues || new_issues.length === 0) {
    throw new Error("new_issues is required for create action");
  }

  // Track created issue numbers for dependency resolution
  const createdIssues = [];

  for (let i = 0; i < new_issues.length; i++) {
    const issue = new_issues[i];
    const { title, body, labels, blocked_by_indices, blocked_by_issues } = issue;

    // Build dependency section
    const blockers = [];

    if (blocked_by_issues && blocked_by_issues.length > 0) {
      for (const num of blocked_by_issues) {
        blockers.push(`#${num}`);
      }
    }

    if (blocked_by_indices && blocked_by_indices.length > 0) {
      for (const idx of blocked_by_indices) {
        if (idx >= 0 && idx < createdIssues.length) {
          blockers.push(`#${createdIssues[idx].number}`);
        }
      }
    }

    let fullBody = body;
    if (blockers.length > 0) {
      const blockerLines = blockers.map((b) => `- Blocked by: ${b}`).join("\n");
      fullBody = `${body}\n\n## Dependencies\n\n${blockerLines}`;
    }

    const ghArgs = ["issue", "create", "--title", title, "--body", fullBody];

    if (milestone) {
      ghArgs.push("--milestone", milestone);
    }

    if (labels && labels.length > 0) {
      for (const label of labels) {
        ghArgs.push("--label", label);
      }
    }

    try {
      const { stdout } = await gh(ghArgs, opts);
      // gh issue create outputs the URL like: https://github.com/owner/repo/issues/123
      const url = stdout.trim();
      const number = parseInt(url.split("/").pop(), 10);
      createdIssues.push({ index: i, number, url, title });
    } catch (error) {
      createdIssues.push({ index: i, error: error.message, title });
    }
  }

  const successful = createdIssues.filter((i) => !i.error);
  const failed = createdIssues.filter((i) => i.error);

  return {
    created: successful.length,
    failed: failed.length,
    issues: createdIssues,
    summary: `${successful.length}/${new_issues.length} created successfully`,
  };
}

async function handleModify(args, opts = {}) {
  const { action, issues, label, comment } = args;

  if (!issues || issues.length === 0) {
    throw new Error(`issues array is required for ${action} action`);
  }

  if ((action === "label" || action === "unlabel") && !label) {
    throw new Error(`label is required for ${action} action`);
  }

  const executeAction = async (issueNumber) => {
    switch (action) {
      case "label":
        await gh(["issue", "edit", String(issueNumber), "--add-label", label], opts);
        break;

      case "unlabel":
        await gh(["issue", "edit", String(issueNumber), "--remove-label", label], opts);
        break;

      case "close":
        if (comment) {
          await gh(["issue", "close", String(issueNumber), "--comment", comment], opts);
        } else {
          await gh(["issue", "close", String(issueNumber)], opts);
        }
        if (label) {
          await gh(["issue", "edit", String(issueNumber), "--add-label", label], opts);
        }
        break;

      case "reopen":
        await gh(["issue", "reopen", String(issueNumber)], opts);
        break;
    }
  };

  return await batchExecute(issues, executeAction);
}

async function handler(args) {
  const { cwd, action } = args;
  const opts = cwd ? { cwd } : {};

  let result;
  if (action === "create") {
    result = await handleCreate(args, opts);
  } else {
    result = await handleModify(args, opts);
  }

  return {
    content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
  };
}

export { definition, handler };
