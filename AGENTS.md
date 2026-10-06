## Code Comments

Comments explain **why**, not what.

* Prefer clear code over comments.
* Comment only non-obvious constraints: API/protocol behavior, lifecycle or ordering requirements, security concerns, upstream quirks, and intentional workarounds.
* Keep comments short and consistent with surrounding code.
* Do not narrate code, record change history, or leave commented-out code.
* TODO/FIXME must state the unresolved constraint and reference an issue when available.
* Update expired comments promptly

## Tests

Tests verify behavior and contracts, not implementation details.

* Follow the repository's existing test structure, helpers, fixtures, and commands.
* Add or update tests for meaningful behavior changes.
* For bug fixes, prefer a regression test that reproduces the bug before the fix and passes after it.
* Run the smallest relevant test first; broaden validation only after targeted tests pass or when the change affects shared behavior.
* Prefer integration tests when behavior crosses components, lifecycle boundaries, protocols, or user-facing flows.
* Do not expose internals, add production hooks, or restructure production code solely to make testing easier.
* Do not duplicate production logic in tests.
* Do not weaken assertions, skip tests, update expectations blindly, or change test configuration merely to make a failure pass.
* For async or concurrent behavior, wait for explicit observable conditions; do not rely on arbitrary sleeps or timing assumptions.
* Reuse existing test utilities before introducing new mocks, fixtures, or harnesses.
* Keep tests deterministic, isolated, and focused on externally observable results.
* Do not claim tests pass unless the relevant commands were actually run successfully.
* If required validation cannot be run, state exactly what was not verified and why.

## Changelog

Location: `CHANGELOG.md` (single file, before writing the changelog, you should read [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) format).

- All new entries go under `## [Unreleased]`, in the right subsection (`### Added`, `### Changed`, `### Fixed`, `### Removed`, `### Security`, `### Refactored`). Read the section first and append to existing subsections; never duplicate them.
- Breaking changes are not a separate subsection. Call them out with a `> **⚠️ Breaking: …**` blockquote at the top of the version section, and/or a bold `**BREAKING:**` bullet under `### Changed`, with a migration note.
- Entries are concise — a bold lead-in stating what changed, then a sentence or two on why it changed and anything a user must do about it. Aim for 2–4 sentences; a genuinely intricate change may run longer, but length is never the goal. Do not match the density of older entries, several of which are far too long.
- Cut what the reader doesn't need: narration of the investigation, alternatives considered and rejected, restatements of the diff, and detail recoverable from the code or the linked issue. Name a file or symbol only when it helps someone find the change.
- Released version sections (e.g. `## [0.7.0]`) are immutable; never modify them.
