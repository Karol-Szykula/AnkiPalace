# Roadmap

What the plugin is when it is finished, and which phase gets it there. The board
holds the work in execution order; this file holds why the phases are in that
order.

## What "done" feels like

Kasia opens Obsidian, picks a deck, and sees before she clicks: this note is
newer in Anki, this one is newer in her vault, this one was edited in both, this
one she deleted in Obsidian and the note is still in Anki. Each row says what will
happen to her file. Nothing is silent, nothing is guessed.

Tomek presses one button and Sync sweeps everything he already tracks. His edit
in Anki appears in his vault, his edit in the vault appears in Anki, a note he
deleted in Anki loses its block, a note he deleted in Obsidian comes back if Anki
is newer than the deletion. He is not asked about any of it, because a
whole-ledger sweep is the one operation where asking per note is worse than
acting.

The promise that makes both possible: the plugin never destroys work it did not
understand. Every skip is counted and named, and the cases where it refuses to
act are written down in [model.md](model.md) rather than discovered in a bug
report.

## Phase 2 — sync core

The command the whole plugin exists for. Today Sync is scoped by
`deckImportSnapshots` and reshapes its own report; UC-28 makes it a sweep over
the ledger itself, which is the model in [model.md](model.md) and nothing else.
After it: decks move in both directions (UC-29), deletions in Obsidian leave
tombstones instead of orphans (UC-30), deletions in Anki win unconditionally
(UC-31), ties are reported rather than silently broken (UC-32), and the audit
findings are swept (UC-33, UC-33a).

This phase carries the destructive operations, which is why UC-45 ("the import
wizard never deletes") is marked P1 and pulled forward: the guarantee has to exist
before the features that could break it.

## Phase 3 — onboarding and UI

The plugin is only as good as its second minute with it. The two wizards become
one shell and one notes table by construction (UC-35), the export wizard is
built as the exact mirror of the import one (UC-36), the notes preview becomes
fast and obvious because that is where every decision gets made (UC-36a), and the
missing surfaces arrive: single-note flows, the mapping UI, the first-run modal,
a New note command, edit validation, and deck moves arriving from the Anki side
(UC-37 to UC-42).

`ux/persona.md` is the reference. Its anti-goals are out of scope, which is
deliberate: a plugin that does three things well beats one that does nine.

## Phase 4 — validation

The claims in [model.md](model.md) become tests. Invariance (running a command
twice changes nothing, convergence after a forced overwrite), the end-to-end
happy path on the test vault, the never-deletes regression, and a live
AnkiConnect smoke that closes the one question the fakes cannot answer: what
Anki actually does with a field name its notetype does not have. UC-33a's
mismatch report and UC-46's finding must not contradict each other, which is why
the smoke test is in this phase and the pre-check is in Phase 2.

## Standing work, not phases

Ratchet ceilings, the stricter tsconfig flags, coverage thresholds and mutation
testing sit on the board as individual cards. They are not a phase because none
of them is blocked by anything: they get done when a file is already open.

## What is deliberately not on the roadmap

Scan/recreate, per-card operations (suspend one side of a reversed pair),
notetype changes, Image Occlusion, and any migration machinery. Each is named
with its reason in [decisions.md](decisions.md) or [model.md](model.md). If one
of them turns out to be the thing the plugin is missing, that is a contract
change, and it gets its own commit against this file.
