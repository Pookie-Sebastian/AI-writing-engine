# Spec: Push Project to GitHub

## Problem Statement

The local repository has no commits and nothing has been pushed to the remote (`https://github.com/Pookie-Sebastian/AI-writing-engine.git`). The full project needs to be committed and pushed to the `main` branch, with proper `.gitignore` coverage to exclude generated/dependency files.

## Requirements

1. Create a root-level `.gitignore` that excludes common noise files (`.DS_Store`, `*.log`, `.env*`, `node_modules/`, `.next/`, `dist/`, `.ona/` internal files if appropriate).
2. Verify `coursework-ai/.gitignore` already excludes `node_modules/`, `.next/`, `*.tsbuildinfo`, `.env*` — it does, no changes needed.
3. Stage all project files (respecting `.gitignore` exclusions).
4. Create the initial commit with message `feat: initial project setup`.
5. Push to `origin main`.

## Acceptance Criteria

- `git status` shows a clean working tree after the push.
- `node_modules/` and `.next/` are NOT present in the remote repository.
- The GitHub repo at `https://github.com/Pookie-Sebastian/AI-writing-engine` shows the committed files on `main`.
- The commit message is `feat: initial project setup`.

## Implementation Steps

1. Create `/workspaces/AI-writing-engine/.gitignore` with appropriate root-level exclusions.
2. Run `git add .` to stage all non-ignored files.
3. Run `git status` to verify what will be committed (confirm no `node_modules` or `.next`).
4. Run `git commit -m "feat: initial project setup"`.
5. Run `git push -u origin main`.
6. Confirm push succeeded with `git log --oneline` and `git status`.
