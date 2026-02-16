import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  sanitizeInput,
  validateApp,
  validateEnv,
  validatePath,
  validateCommand,
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
