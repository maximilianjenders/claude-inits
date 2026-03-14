import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  sanitizeInput,
  validateApp,
  validateEnv,
  validatePath,
  validateCommand,
  validateQuery,
  applyPagination,
  ALLOWED_COMMANDS,
} from "./server.js";

describe("sanitizeInput", () => {
  it("allows clean strings", () => {
    assert.equal(sanitizeInput("hello"), "hello");
    assert.equal(sanitizeInput("/home/max/file.txt"), "/home/max/file.txt");
  });

  it("rejects shell metacharacters", () => {
    for (const char of [";", "|", "&", "$", "`", "(", ")", ">", "<"]) {
      assert.throws(() => sanitizeInput(`test${char}inject`), /dangerous/i);
    }
  });
});

describe("validatePath", () => {
  it("allows safe absolute paths", () => {
    assert.equal(validatePath("/home/max/pi-setup/docker-compose.yml"), "/home/max/pi-setup/docker-compose.yml");
    assert.equal(validatePath("/data/butler/prod/food_butler.db"), "/data/butler/prod/food_butler.db");
    assert.equal(validatePath("/etc/hostname"), "/etc/hostname");
  });

  it("rejects relative paths", () => {
    assert.throws(() => validatePath("relative/path"), /absolute/i);
  });

  it("blocks .env files", () => {
    assert.throws(() => validatePath("/home/max/pi-setup/.env"), /blocked|sensitive/i);
    assert.throws(() => validatePath("/root/.env"), /blocked|sensitive/i);
    assert.throws(() => validatePath("/some/path/.env.local"), /blocked|sensitive/i);
  });

  it("blocks .ssh directory", () => {
    assert.throws(() => validatePath("/home/max/.ssh/id_ed25519"), /blocked|sensitive/i);
    assert.throws(() => validatePath("/root/.ssh/authorized_keys"), /blocked|sensitive/i);
  });

  it("blocks /etc/shadow", () => {
    assert.throws(() => validatePath("/etc/shadow"), /blocked|sensitive/i);
  });

  it("allows /etc/passwd (not actually secret)", () => {
    // /etc/passwd is world-readable and doesn't contain password hashes
    // But we block it anyway as defense-in-depth
    assert.throws(() => validatePath("/etc/passwd"), /blocked|sensitive/i);
  });
});

describe("validateCommand", () => {
  it("allows read-only commands", () => {
    for (const cmd of ["cat", "ls", "head", "tail", "find", "grep", "ps", "stat"]) {
      assert.equal(validateCommand(cmd), cmd);
    }
  });

  it("rejects env command (leaks secrets)", () => {
    assert.throws(() => validateCommand("env"), /not allowed/i);
  });

  it("rejects dangerous commands", () => {
    assert.throws(() => validateCommand("rm"), /not allowed/i);
    assert.throws(() => validateCommand("bash"), /not allowed/i);
  });
});

describe("ALLOWED_COMMANDS", () => {
  it("does not include env", () => {
    assert.ok(!ALLOWED_COMMANDS.includes("env"), "env command should not be in ALLOWED_COMMANDS");
  });
});

describe("validateQuery", () => {
  it("allows SELECT queries", () => {
    assert.equal(validateQuery("SELECT * FROM ingredients"), "SELECT * FROM ingredients");
  });

  it("allows SELECT with parentheses and functions", () => {
    assert.equal(
      validateQuery("SELECT COUNT(*) FROM ingredients WHERE name LIKE '%chicken%'"),
      "SELECT COUNT(*) FROM ingredients WHERE name LIKE '%chicken%'"
    );
  });

  it("allows PRAGMA queries", () => {
    assert.equal(validateQuery("PRAGMA table_info(ingredients)"), "PRAGMA table_info(ingredients)");
  });

  it("allows EXPLAIN queries", () => {
    assert.equal(validateQuery("EXPLAIN SELECT * FROM ingredients"), "EXPLAIN SELECT * FROM ingredients");
  });

  it("allows WITH (CTE) queries", () => {
    const q = "WITH cte AS (SELECT * FROM ingredients) SELECT * FROM cte";
    assert.equal(validateQuery(q), q);
  });

  it("allows single-quoted strings", () => {
    assert.equal(validateQuery("SELECT 'name' FROM ingredients"), "SELECT 'name' FROM ingredients");
  });

  it("rejects INSERT", () => {
    assert.throws(() => validateQuery("INSERT INTO ingredients VALUES (1, 'test')"), /blocked/i);
  });

  it("rejects DELETE", () => {
    assert.throws(() => validateQuery("DELETE FROM ingredients"), /blocked/i);
  });

  it("rejects DROP", () => {
    assert.throws(() => validateQuery("DROP TABLE ingredients"), /blocked/i);
  });

  it("rejects UPDATE", () => {
    assert.throws(() => validateQuery("UPDATE ingredients SET name = 'x'"), /blocked/i);
  });

  it("rejects ATTACH", () => {
    assert.throws(() => validateQuery("ATTACH DATABASE '/tmp/x.db' AS x"), /blocked/i);
  });

  it("rejects VACUUM", () => {
    assert.throws(() => validateQuery("VACUUM"), /blocked/i);
  });

  it("rejects BEGIN", () => {
    assert.throws(() => validateQuery("BEGIN TRANSACTION"), /blocked/i);
  });

  it("rejects dot-commands", () => {
    assert.throws(() => validateQuery(".shell ls /"), /dot-command/i);
    assert.throws(() => validateQuery(".read /etc/passwd"), /dot-command/i);
  });

  it("rejects double quotes (shell injection)", () => {
    assert.throws(() => validateQuery('SELECT "name" FROM ingredients'), /double quote|backslash/i);
  });

  it("rejects backslashes (shell injection)", () => {
    assert.throws(() => validateQuery("SELECT * FROM ingredients WHERE name = '\\x'"), /double quote|backslash/i);
  });

  it("rejects dollar signs (shell injection via double-quote wrapping)", () => {
    assert.throws(() => validateQuery("SELECT * FROM ingredients WHERE name = $var"), /\$|backtick/i);
  });

  it("rejects backticks (shell injection via double-quote wrapping)", () => {
    assert.throws(() => validateQuery("SELECT * FROM `ingredients`"), /\$|backtick/i);
  });

  it("blocks write keywords hidden in comments", () => {
    assert.throws(() => validateQuery("/* comment */ DROP TABLE ingredients"), /blocked/i);
  });

  it("blocks write keywords after line comments", () => {
    assert.throws(() => validateQuery("-- comment\nDROP TABLE ingredients"), /blocked/i);
  });

  it("rejects queries with unknown first keyword", () => {
    assert.throws(() => validateQuery("RELEASE savepoint1"), /must start with/i);
  });

  it("trims whitespace", () => {
    assert.equal(validateQuery("  SELECT 1  "), "SELECT 1");
  });
});

describe("applyPagination", () => {
  it("appends LIMIT when query has none", () => {
    assert.equal(applyPagination("SELECT * FROM x", 500, 0), "SELECT * FROM x LIMIT 500");
  });

  it("appends LIMIT and OFFSET when offset > 0", () => {
    assert.equal(applyPagination("SELECT * FROM x", 500, 100), "SELECT * FROM x LIMIT 500 OFFSET 100");
  });

  it("respects explicit LIMIT in query", () => {
    assert.equal(applyPagination("SELECT * FROM x LIMIT 10", 500, 0), "SELECT * FROM x LIMIT 10");
  });

  it("does not append OFFSET when query has explicit LIMIT", () => {
    assert.equal(applyPagination("SELECT * FROM x LIMIT 10", 500, 50), "SELECT * FROM x LIMIT 10");
  });

  it("uses custom limit value", () => {
    assert.equal(applyPagination("SELECT * FROM x", 100, 0), "SELECT * FROM x LIMIT 100");
  });

  it("skips LIMIT for PRAGMA queries", () => {
    assert.equal(applyPagination("PRAGMA table_info(ingredients)", 500, 0), "PRAGMA table_info(ingredients)");
  });

  it("skips LIMIT for PRAGMA queries case-insensitive", () => {
    assert.equal(applyPagination("pragma table_list", 500, 0), "pragma table_list");
  });
});
