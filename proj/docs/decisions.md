# Decisions

Work that was decided out of scope, and why. A card leaves the board when it
lands here: the board holds work, this file holds the arguments.

Every entry says what would make it worth revisiting, so a decision is never
just "no".

## UC-25m — guards as data: skipped by decision, not an oversight

The 17 runtime guards stay where they are (pack, model, media, ignored dirs,
selection, index freshness) and the pack check keeps running twice
(`sync.ts:130` and `import.ts:444`).

Skipped because it is the most expensive item in its phase, it changes no
behavior, and it is the one that goes stale fastest — its centrepiece, the scope
guard, is the snapshots logic UC-28 deletes. What it would have carried is
already covered where it mattered: the three silent outcomes of UC-25j and the two
report-honesty holes folded into UC-28.

**Revisit if** UC-30 or UC-31 find themselves writing the same rule in three
places. The shape, so it does not have to be reinvented:
`Guard = { id, appliesTo, blocks, reason, mvp }`, where `mvp: "unsupported"` means
a mandatory counter, never a silent skip.

## UC-25n — the action inventory: deferred, not cancelled

Every action that changes a note's state, as a second section of the generated
decision document: for each, the states it fires in, its producer, the card that
owns it.

Deferred because it can only become true after the producers exist — the
`DELETE_FILE` and tombstone rows arrive with UC-30 and UC-31. Three actions have
no cell today: `DELETE_FILE` has no producer at all, and purge and
fill-id-by-hash bypass the resolver.

**Done when** it is complete against the code under the same anti-drift test as
the existing document, with every gap named as a Phase 2 entry.

## Ordering: UC-28 comes before UC-25n

Recorded because the order looks arbitrary otherwise. UC-28 rewrites the scope
logic that the guard table would encode, so building UC-25m first would have
encoded a rule that was about to be deleted. UC-25l (one classification snapshot)
was folded into UC-28 for the same reason — UC-28 rewrites exactly the code it
would have touched.

## Not in this phase

- **The scan/recreate command** — a Sync sweep over the vault that recreates
  untracked Anki notes. Deferred; UC-28 gets the ledger scope right first.
- **`syncTieThresholdSec`** — the time-tie rule. UC-32 owns it, and SYNC-04
  already states the default. It was deliberately not built early because a tie
  threshold nobody has measured is a guess.
- **A placeholder for runtime values in a rationale** — the up-to-date badge
  keeps composing its own path instead. A `{path}` placeholder would put a
  runtime value in a data table that is otherwise fully static, and the anti-drift
  document would have to describe a format rather than a policy.
- **The legacy formats** — the old `flashcard-form` fence, the `Obsidian-*` model
  names and the spaced/source markers are not detected and not reported. MODEL-10
  says no migrations, and the plugin does not guess at content it no longer reads.

## A bug report that was wrong in two of three claims

Worth keeping, because the failure mode repeats: a plausible bug report that was
never verified against the vendor's documentation.

The report said the import wizard "does not create subdecks", on three grounds.
Ground one (import never calls `createDeck`) was true but irrelevant: import
writes vault files only, and `ensureDecks` on the export side is the only
`createDeck` caller, by design. Ground two (`::` is only flattened) was false:
`deckFolder` split `::` into `/` and `ensureFolderExists` already recursed.
Ground three (`deck:"Name"` does not match `Name::*`) was false, and the Anki
manual says so directly: *deck:french find cards in a top-level deck called
"French", **or its subdecks** like "French::Words"*. Excluding subdecks needs an
explicit `-deck:french::*`.

The real bug was underneath all three claims, and it was a different bug: the
deck *was* read with its subdecks, and the notes were written to one folder. Read
the vendor's manual before writing the bug down.

## Why jscpd did not catch a duplicated function

Three independent reasons, each verified rather than guessed, because the same
blind spot applies to every other small helper:

1. The function was 4 lines and ~30 tokens, against `minLines: 6` and
   `minTokens: 60` in `.jscpd.json`. It failed both size gates.
2. The two copies were not token-identical — one hoisted a `const`, the other
   inlined the call — so even at lowered thresholds the detector had nothing
   matching.
3. One copy was `typescript` and the other `tsx`, and jscpd instantiates its
   detector per format and never compares across formats.

Lowering the thresholds to `--min-lines 3 --min-tokens 20` surfaced 64 clones
(and, incidentally, real ones such as `reset-confirm-modal.ts` vs
`import-modal.ts`), but still not this pair, which is how reasons 2 and 3 were
confirmed. A tool that reports zero duplication is not evidence that duplication
is absent; it is evidence that nothing crossed the threshold.

## Open decision: UC-34 report wording

Counts shown as notes (our tracked unit) with Anki card counts in parentheses?
Proposed yes, awaiting the user's confirmation. It was listed twice in the old
`TODO.md` with different wording, once in the Phase 2 list and once under "Open
decisions"; merged into one card.

## Open decision: media placement

Media goes to one attachments folder per imported deck (`Medicine/attachments/`)
while notes now go to their own deck folders, so a media file referenced by a
subdeck note sits outside its tree. Deliberate for now: media is keyed by
filename and deduplicated, and two subdecks can reference one file, so
per-subdeck folders would duplicate bytes. The reference inside the note points
at the real path either way.

Needs a user decision: keep one attachments folder per imported deck, or place
each file next to the first note that references it.

## xstate stays a production dependency

The lifecycle runs as `table -> machine -> app`: `lifecycleTransitions` is the
source of truth, `machineStates()` generates the xstate machine from it, and
`transitionNoteLifecycle` resolves through that machine, so no command can
bypass it. The conformance test in `tests/services/note-lifecycle.test.ts` runs
every defined move through the machine and compares it with the table, which is
what proves the generation is lossless.

Two things are recorded here because both were got wrong first.

**The machine was nearly deleted for being unused.** An audit found that
`noteLifecycleMachine` has no call site in `src/` and concluded it was dead
weight, with xstate occupying "94 KB of the bundle". The first half was right
about the call sites and wrong about the meaning: the machine is what production
*should* run on, and the table lookup was the deviation. The second half was
simply a bad measurement — the span of unminified `xstate` identifiers in
`main.js` is 94 KB, but xstate bundled and minified on its own is **36 KB**,
0.8% of the release bundle. A dependency looked expensive because it was measured
wrong, and a machine looked unused because nobody asked what it was *for*.

**ENT-02 said the machine was the source of truth, and the code said the
opposite** for the whole of Phase 1c. The fix was to change the code, not the
contract: the architecture the contract described is the one worth having, and
the table stays the single place a human edits. The one-line amendment to ENT-02
records the direction that already existed in the code comments.

The cost is one `resolveState` plus one `transition` per note per run instead of
a map lookup, at three call sites. The benefit is that the transition table has
an independent semantics checking it, and a legal self-loop (`synced.clean` on
`CHECK`) is distinguished from an illegal event by `snapshot.can()` rather than
by comparing a result with its input.
