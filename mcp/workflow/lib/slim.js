// gh returns full label/milestone/assignee objects (ids, colors, descriptions).
// Tool results go straight into the model's context, so keep only the names.

const LIST_FIELDS = {
  labels: (l) => l.name,
  assignees: (a) => a.login,
};

const OBJECT_FIELDS = {
  milestone: (m) => m.title,
  author: (a) => a.login,
};

/**
 * Reduce an issue or PR record from `gh ... --json` to the fields a model reads.
 */
function slimRecord(record) {
  const out = { ...record };
  for (const [field, pick] of Object.entries(LIST_FIELDS)) {
    if (Array.isArray(out[field])) {
      out[field] = out[field].map((item) => (item && typeof item === "object" ? pick(item) : item));
    }
  }
  for (const [field, pick] of Object.entries(OBJECT_FIELDS)) {
    if (out[field] && typeof out[field] === "object") {
      out[field] = pick(out[field]);
    }
  }
  return out;
}

/**
 * Append a markdown section to an issue body, separated by a blank line.
 */
function appendSection(body, section) {
  const existing = (body || "").trimEnd();
  return existing ? `${existing}\n\n${section}` : section;
}

/**
 * Compact JSON for tool results (indentation costs tokens, not readability, for a model).
 */
function toText(data) {
  return JSON.stringify(data);
}

export { slimRecord, appendSection, toText };
