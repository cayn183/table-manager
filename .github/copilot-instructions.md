## Purpose

This file gives concise, actionable guidance for AI coding agents working in this repository.

**Repo State:** The repository currently contains only [README.md](README.md#L1) and [LICENSE](LICENSE). No source files, package manifests, or CI configs were found.

**Primary Objective:** If asked to modify or add code, first confirm desired language, intended entrypoint, and whether to scaffold a new project layout (e.g., Node/Python/Go). Do not assume language or tests.

## Quick discovery steps (run before editing)

- **Check Git history / branches:** run the following to find previous commits or branches with code:

```powershell
git fetch --all
git branch -a
git log --name-only -n 50
```

- **Look for hidden files or manifests:** search for common manifests if user didn't include source yet (e.g., `package.json`, `pyproject.toml`, `go.mod`).

## If no code is present

- **Ask the user**: "Which language/framework, entrypoint, or example app should I scaffold?"
- **Suggest minimal scaffolding** only after confirmation. Example minimal layout to propose:

  - `src/` — source files
  - `tests/` — unit tests
  - `README.md` — usage + run commands
  - language manifest (`package.json` / `pyproject.toml` / `go.mod`)

## Merge guidance (if this file already exists)

- Preserve any hand-written guidance at the top of `.github/copilot-instructions.md`. Add an extra short section below titled "Repository snapshot (automatically generated)" describing discovered state (what files are present) and the quick discovery steps above.

## Project-specific notes discovered

- The only explicit file is [README.md](README.md#L1) containing the project title. No build, test, or CI commands are discoverable; do not run or add opinionated CI without user approval.

## Safe-editing rules for AI agents

- **Don't assume** runtime, package manager, or test runner. Ask before creating language-specific files.
- **If scaffolding**: include a small README and a single smoke test; add instructions in the top-level README and wait for user approval before extending.
- **When editing existing files**: keep changes minimal and explain intent in a single-line commit message.

## Where to document follow-ups

- After any non-trivial change, add a short note in `README.md` summarizing next steps and how to run the app/tests.

---

If anything above is unclear or you want me to scaffold a specific language layout now, tell me which language and the desired entrypoint (for example: a CLI called `table-manager` or a web server on port 3000). I will wait for confirmation before creating code.
