# Pi MCP Debug Tools

## Overview

Add 3 new tools to Pi MCP for container debugging with restricted command execution.

## Tools

### 1. `pi_docker_inspect`

Get metadata about containers or images.

**Parameters:**
- `target` (required): Container name or image reference
- `format` (optional): Go template format string

**Examples:**
```
pi_docker_inspect(target: "spendee-staging")
pi_docker_inspect(target: "spendee-staging", format: "{{.Config.Image}}")
```

### 2. `pi_docker_exec`

Run a whitelisted read-only command inside a running container.

**Parameters:**
- `container` (required): Container name
- `command` (required): Command to run (must be in whitelist)
- `args` (optional): Array of arguments

**Examples:**
```
pi_docker_exec(container: "spendee-staging", command: "cat", args: ["/app/src/templates/login.html"])
pi_docker_exec(container: "spendee-staging", command: "ls", args: ["-la", "/app"])
```

### 3. `pi_docker_run`

Run a whitelisted read-only command in a temporary container from an image.

**Parameters:**
- `image` (required): Image reference
- `command` (required): Command to run (must be in whitelist)
- `args` (optional): Array of arguments

**Examples:**
```
pi_docker_run(image: "ghcr.io/maximilianjenders/spendee:staging", command: "cat", args: ["/app/src/templates/login.html"])
```

## Security

### Command Whitelist

Only these read-only commands are allowed for exec/run:

- `cat` - Read file contents
- `ls` - List directory contents
- `head` - First N lines of file
- `tail` - Last N lines of file
- `find` - Find files by name/pattern
- `grep` - Search file contents
- `env` - Show environment variables
- `ps` - List processes
- `stat` - File metadata

### Enforcement

- Command validated against whitelist before execution
- Args sanitized using existing `sanitizeInput` (rejects shell metacharacters)
- No shell expansion - uses array form for docker commands
- `docker run` uses `--rm` to ensure no persistent containers

## Architecture

Add tools inline to existing `mcp/pi/server.js` - no structural changes.

Add shared constant:
```javascript
const ALLOWED_COMMANDS = ["cat", "ls", "head", "tail", "find", "grep", "env", "ps", "stat"];
```
