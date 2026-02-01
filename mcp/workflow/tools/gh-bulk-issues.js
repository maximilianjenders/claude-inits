import { gh } from "../lib/exec.js";
import { batchExecute } from "../lib/github-api.js";

const definition = {
  name: "gh_bulk_issues",
  description: "Bulk operations on multiple issues with retry logic",
  inputSchema: {
    type: "object",
    properties: {
      action: {
        type: "string",
        enum: ["label", "unlabel", "close", "reopen"],
        description: "Action to perform",
      },
      issues: {
        type: "array",
        items: { type: "number" },
        description: "Array of issue numbers",
      },
      label: {
        type: "string",
        description: "Label to add/remove (required for label/unlabel actions)",
      },
      comment: {
        type: "string",
        description: "Comment to add when closing (optional)",
      },
    },
    required: ["action", "issues"],
  },
};

async function handler(args) {
  const { action, issues, label, comment } = args;

  // Validate label is provided for label/unlabel actions
  if ((action === "label" || action === "unlabel") && !label) {
    throw new Error(`label is required for ${action} action`);
  }

  const executeAction = async (issueNumber) => {
    switch (action) {
      case "label":
        await gh(["issue", "edit", String(issueNumber), "--add-label", label]);
        break;

      case "unlabel":
        await gh(["issue", "edit", String(issueNumber), "--remove-label", label]);
        break;

      case "close":
        if (comment) {
          await gh(["issue", "close", String(issueNumber), "--comment", comment]);
        } else {
          await gh(["issue", "close", String(issueNumber)]);
        }
        // Add label if provided (common pattern: close + add code-complete)
        if (label) {
          await gh(["issue", "edit", String(issueNumber), "--add-label", label]);
        }
        break;

      case "reopen":
        await gh(["issue", "reopen", String(issueNumber)]);
        break;

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  };

  const results = await batchExecute(issues, executeAction);

  return {
    content: [{ type: "text", text: JSON.stringify(results, null, 2) }],
  };
}

export { definition, handler };
