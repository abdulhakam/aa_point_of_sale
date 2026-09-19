---
name: kb-relationship-model
description: Choose the correct Tolaria relationship field and direction for a semantic statement. Use when deciding between belongs_to, related_to, has, blocked_by, implements, verifies, affects, supersedes, work_session, and works_on.
---

# Skill: kb-relationship-model

## Purpose
Choose the correct relationship field and direction.

## Inputs
- source object type/title
- target object type/title
- semantic statement

## Decision rules
- Strong ownership/composition/context: child `belongs_to` parent.
- Loose symmetric association: `related_to`.
- Hard Task dependency: dependent Task `blocked_by` prerequisite Task (the helper also accepts the `depends_on` alias).
- Implementation: Task/Artifact `implements` Requirement.
- Verification: Test `verifies` Requirement/Task/Issue.
- Impact: Issue/Decision `affects` Artifact/Project/Requirement.
- Replacement: newer Decision/Checkpoint `supersedes` older one.
- Session work target: WorkSession/Checkpoint `works_on` Task.

## Procedure
1. Prefer Tolaria-native relations when sufficient.
2. Avoid manually mirrored inverse edges.
3. Confirm the relation is durable enough for frontmatter; otherwise use a body link.
4. Return field, direction, and wikilink value.

## Escalate when
The relation implies a new reusable semantic not covered by the standard model.
