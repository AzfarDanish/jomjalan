# AGENTS.md

## Git Commit Policy

**Do NOT run `git commit` automatically.**

- Never stage and commit changes on your own initiative.
- Never create commits at the end of a task, after a "logical unit of work", or because changes appear complete.
- You may run read-only git commands freely: `git status`, `git diff`, `git log`, `git branch`, `git stash list`.
- You may stage files with `git add` only if the user explicitly asks you to prepare a commit.

## When You May Commit

Commit **only** when the user explicitly instructs you to, for example:

- "commit this"
- "make a commit"
- "commit the changes"
- "stage and commit"

An explicit instruction must come from the user in the current conversation. Do not infer permission from context, prior commits, or the completion of a task.

## When Commit Is Requested

When the user asks you to commit:

1. Run `git status` and `git diff` first and show the user what will be committed.
2. Do not stage unrelated files, generated artifacts, `.env` files, secrets, or lockfiles unless the user says so.
3. Write a concise commit message that describes the change.
4. Make the commit, then confirm what was committed (hash + message + file list).

## Other Destructive Git Operations

Do not run any of the following unless the user explicitly asks:

- `git push`
- `git reset --hard`
- `git clean -fd`
- `git rebase`
- `git branch -D`
- `git checkout -- .` / `git restore .`
- amending or force-pushing existing commits

## Summary

Read-only git: allowed. Anything that changes history or remote state: user-initiated only.