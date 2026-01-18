---
description: Process speech-to-text clipboard input, clean up transcription errors, and rework using context
allowed-tools: Read, Bash(pbpaste:*), Bash(pbcopy:*)
---

# Voice Input Processor

You are processing speech-to-text input from the clipboard. Voice transcription often contains errors, mishearings, and awkward phrasing that need cleanup.

## Step 1: Get Clipboard Content

Run `pbpaste` to retrieve the voice-transcribed text from the clipboard.

## Step 2: Gather Context

To properly interpret and clean the transcription, you need context:

1. **Use conversation context first** - if there's an ongoing conversation, use that context to understand what the user is likely referring to
2. **If no conversation context exists**, read these files for project context:
   - `@DIARY.md` - development decisions and current project state
   - `@prompt.md` - project requirements and domain concepts

## Step 3: Analyze and Clean the Transcription

Common speech-to-text issues to fix:

### Mishearings
- Technical terms transcribed phonetically (e.g., "fast A P I" → "FastAPI", "pie test" → "pytest")
- Project-specific names written incorrectly
- Homophones chosen wrongly (e.g., "their/there/they're", "to/too/two")

### Structural Issues
- Run-on sentences that should be broken up
- Missing punctuation
- Filler words ("um", "uh", "like", "you know")
- False starts and repetitions
- Incomplete thoughts that trail off

### Context-Based Corrections
- Replace vague references with specific terms from context
- Expand abbreviations spoken aloud
- Correct domain terminology based on project vocabulary

## Step 4: Output the Cleaned Version

The reworked text should:

1. **Preserve the original intent** - don't change what the user meant to say
2. **Fix transcription errors** - correct obvious mishearings
3. **Improve clarity** - restructure for readability while keeping the user's voice
4. **Maintain appropriate formality** - match the tone of the original

## Step 5: Copy to Clipboard

After cleaning the text, copy the cleaned version to the clipboard using `pbcopy`:

```bash
echo "cleaned text here" | pbcopy
```

## Output Format

Show the user what was processed:

```
## Original (from clipboard):
[The raw transcribed text]

## Cleaned version (copied to clipboard):
[The reworked, cleaned text]

## Changes made:
- [Brief list of significant corrections/improvements]
```

## Important Guidelines

- **Don't over-edit** - preserve the user's phrasing when it's clear enough
- **Don't add content** - only clarify what was said, don't invent new ideas
- **Flag uncertainty** - if something is ambiguous and context doesn't help, note it
- **Be conservative** - when unsure if something is an error, keep the original
