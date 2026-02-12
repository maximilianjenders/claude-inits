import { git } from "../lib/exec.js";

const definition = {
  name: "git_diff",
  description: "Get diff between HEAD and a base branch, pinned to merge-base",
  inputSchema: {
    type: "object",
    properties: {
      base: {
        type: "string",
        description: "Base branch to diff against (default: master)",
      },
      mode: {
        type: "string",
        enum: ["full", "stat", "name-only"],
        description: "Diff output mode (default: full)",
      },
      cwd: {
        type: "string",
        description: "Working directory (defaults to MCP server cwd)",
      },
    },
    required: [],
  },
};

async function handler(args) {
  const { base = "master", mode = "full", cwd } = args;
  const opts = cwd ? { cwd } : {};

  // Pin diff to merge-base to avoid drift if base branch moves
  const { stdout: mergeBase } = await git(["merge-base", base, "HEAD"], opts);

  // Build diff command
  const diffArgs = ["diff"];
  if (mode === "stat") diffArgs.push("--stat");
  else if (mode === "name-only") diffArgs.push("--name-only");
  diffArgs.push(`${mergeBase}..HEAD`);

  const { stdout: diff } = await git(diffArgs, opts);

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(
          {
            merge_base: mergeBase,
            merge_base_short: mergeBase.slice(0, 7),
            diff,
          },
          null,
          2
        ),
      },
    ],
  };
}

export { definition, handler };
