import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { slimRecord, appendSection, toText } from "./slim.js";

describe("slimRecord", () => {
  it("reduces labels, milestone and assignees to their names", () => {
    const raw = {
      number: 7,
      title: "Fix it",
      labels: [
        { id: "LA_1", name: "bug", description: "Something broke", color: "d73a4a" },
        { id: "LA_2", name: "in-progress", description: "", color: "fbca04" },
      ],
      milestone: { number: 3, title: "Backlog", description: "bucket", dueOn: null },
      assignees: [{ id: "U_1", login: "max", name: "Max" }],
    };
    assert.deepEqual(slimRecord(raw), {
      number: 7,
      title: "Fix it",
      labels: ["bug", "in-progress"],
      milestone: "Backlog",
      assignees: ["max"],
    });
  });

  it("keeps a null milestone and leaves other fields untouched", () => {
    const raw = { number: 1, body: "text", milestone: null, labels: [], assignees: [] };
    assert.deepEqual(slimRecord(raw), { number: 1, body: "text", milestone: null, labels: [], assignees: [] });
  });

  it("reduces a PR author to its login", () => {
    const raw = { number: 4, author: { id: "U_1", is_bot: false, login: "max", name: "Max" } };
    assert.deepEqual(slimRecord(raw), { number: 4, author: "max" });
  });

  it("does not add fields that were absent", () => {
    assert.deepEqual(slimRecord({ number: 2 }), { number: 2 });
  });
});

describe("appendSection", () => {
  it("appends after a blank line, trimming trailing whitespace of the body", () => {
    assert.equal(appendSection("## Summary\nx\n\n", "## Branch\n`feature/a`"), "## Summary\nx\n\n## Branch\n`feature/a`");
  });

  it("returns only the section for an empty body", () => {
    assert.equal(appendSection("", "## Branch\n`b`"), "## Branch\n`b`");
    assert.equal(appendSection(null, "## Branch\n`b`"), "## Branch\n`b`");
  });
});

describe("toText", () => {
  it("serialises without indentation", () => {
    assert.equal(toText({ a: [1, 2] }), '{"a":[1,2]}');
  });
});
