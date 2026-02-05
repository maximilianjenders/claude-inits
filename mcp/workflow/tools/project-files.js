import { stat, readFile } from "fs/promises";
import { join } from "path";

const definition = {
  name: "project_files",
  description: "Check for project documentation files (CLAUDE.md, README.md, etc.) and optionally read their contents",
  inputSchema: {
    type: "object",
    properties: {
      cwd: {
        type: "string",
        description: "Working directory to check (defaults to MCP server cwd)",
      },
      files: {
        type: "array",
        items: { type: "string" },
        description: "Files to check (defaults to ['CLAUDE.md', 'README.md'])",
      },
      read_content: {
        type: "boolean",
        description: "If true, read and return file contents (default: false)",
      },
      max_lines: {
        type: "number",
        description: "Maximum lines to read per file when read_content is true (default: 100)",
      },
    },
    required: [],
  },
};

async function handler(args) {
  const {
    cwd = process.cwd(),
    files = ["CLAUDE.md", "README.md"],
    read_content = false,
    max_lines = 100,
  } = args;

  const results = {};

  for (const file of files) {
    const filePath = join(cwd, file);
    try {
      const stats = await stat(filePath);
      results[file] = {
        exists: true,
        size: stats.size,
        modified: stats.mtime.toISOString(),
      };

      if (read_content) {
        const content = await readFile(filePath, "utf-8");
        const lines = content.split("\n");
        const truncated = lines.length > max_lines;
        results[file].content = truncated
          ? lines.slice(0, max_lines).join("\n") + "\n... (truncated)"
          : content;
        results[file].lines = lines.length;
        results[file].truncated = truncated;
      }
    } catch (error) {
      if (error.code === "ENOENT") {
        results[file] = { exists: false };
      } else {
        results[file] = { exists: false, error: error.message };
      }
    }
  }

  return {
    content: [{ type: "text", text: JSON.stringify(results, null, 2) }],
  };
}

export { definition, handler };
