---
name: kb-resume
description: Resume interrupted project work from durable vault state instead of chat memory. Use at the start of a session to read the Project, its latest Checkpoint, the active Tasks, and the changed artifacts, then continue from the recorded exact next action.
---

# Skill: kb-resume

## Purpose
Resume interrupted project work from durable vault state rather than chat memory.

## Inputs
- Project identity
- vault access

## Procedure
1. Read Project.
2. Resolve Project's current checkpoint; otherwise find newest non-superseded Checkpoint belonging to it.
3. Read `works_on` Tasks and linked WorkSession.
4. Inspect listed changed Artifacts/files before modifying them.
5. Revalidate external assumptions that could have changed.
6. Detect stale `In Progress` session; mark Interrupted only after confirming it is no longer active.
7. Start a new WorkSession or explicitly continue the prior one according to local policy.
8. Continue from Checkpoint's exact next action unless current reality invalidates it; if invalid, record why and checkpoint the revised state.

## Output
Short resume brief: verified current state, active tasks, next action, invalidated assumptions if any.
