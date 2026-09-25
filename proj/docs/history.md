# History

What is already built. Phases are two sentences each, as agreed in Phase 1b.
Cards that closed move here from the board's `Done` column when their phase
closes; the commit is named so the change can be read.

## Phase 0a — cuts (no user-visible change)

Removed the code nothing used: the legacy markdown builders, the `flashcardsTag`
chain, the code-highlight feature with its ~437KB of base64 constants, and
unused test helpers. Done first so every later change happens on code that is
actually reachable.

## Phase 0b — renames (mechanical, no behavior change)

Renamed the vocabulary to the Anki mirror: the `flashcard-form` fence became
`note-form` and Card became Note across services, the wizard and the tests,
with a green gate after each. Old fences are dropped rather than migrated
(MODEL-10: no production users, no migration code).

## Phase 0c — Anki-mirror foundation (behavior, on clean renamed code)

Built the mirror itself: the xstate note-lifecycle machine as the single source
of truth for what a note may do, the persisted ledger record, the `AnkiNote`
hierarchy, per-model note-form shapes with saved packs, and the unknown-model
flow in the wizard. This is what makes the three commands mirrors of one policy
instead of three separate ones.

## Phase 1 — ledger, matching, export flows

Made both directions real: a vault-side export that creates notes and writes the
Anki id back, and an import that only pulls, with every note's direction and
consequence named before the click, a fence-aware vault index, Purge ledger, and
a round-trip test that caught a real duplicate file. Along the way it fixed an
export that aborted outright on modern AnkiConnect, and stopped exporting one
note from creating three unrelated note types.

- **UC-26** — purge scope fix (data loss): Sync asked only `notesInfo` for
  records not seen in the snapshot decks and removed their blocks + records, so
  notes exported to a deck without a snapshot were deleted from the vault. Purge
  now confirms absence with a batched `notesInfo` per candidate; foreign records
  stay untouched.
- **UC-27** — `synced.diverged` newest-wins (`isAnkiNewer` in note-push: Anki mod
  * 1000 vs `TFile.stat.mtime`; Anki newer -> export reports it, Sync pulls;
  vault newer -> both push).

Both are squashed into `624d868`.

## Phase 1b — code quality toolchain (local only, no network, strict)

Made quality non-negotiable: strict TypeScript, type-aware ESLint with sonarjs
and complexity ratchets, Prettier, knip, jscpd on `src`, dependency-cruiser with
no-circular, one `pnpm run check` gate, and a dev-only data reset behind a
separate build entry. It also fixed real damage found on the way — nine
super-linear regexes that could freeze the editor, "[object Object]" error
messages, untyped AnkiConnect responses — and deleted dead code, so the
two-sided flows rest on a codebase that can be trusted and safely changed.

## Phase 1c — decision table, guards and honest reports (local only, no behavior regression)

The lifecycle machine answers "is this transition legal" but never answered
"what does this command do with this note in this run" — that lived in three
resolvers, ~17 guards across three services, and four places where a note was
neither written nor counted. This phase turned the answer into one table, proved
the table is complete, and closed the silent outcomes.

- **UC-25h** (`40557df`) — the decision table as data, replacing the three
  resolver switches. `src/services/sync-decision.ts` owns one row per (command,
  status): `{ act, forcedAct?, owner, rationale }`, with `OUT_OF_SCOPE` an
  explicit constant, so an empty cell is impossible where three `default:` arms
  used to mean both "not this command's note" and "someone forgot a case".
  `syncDecisionFor` returns the row, `decisionActFor` owns the force precedence,
  and the resolvers are deleted rather than wrapped. The table prints to
  `docs/sync-decision-table.md` via `pnpm run doc:sync-table`, pinned by an
  anti-drift test; the 33 resolver cases moved verbatim, so 432/432 with no
  assertion touched. Deviations: services not entities (the row needs the
  lifecycle types), the rationale is per (command, status) so UC-25k may need a
  per-forced label, owner is the state owner rather than the acting command, and
  Sync rows carry no `forcedAct` at all.
- **UC-25i** (`1c9c4ec`) — four property tests, and they found three things.
  Totality: all 33 command x status rows resolve, every act is a lifecycle event
  or `OUT_OF_SCOPE`, every row has an owner and a non-empty rationale, and all
  66 acts are legal in their state (`transitionNoteLifecycle` must not throw), so
  the table cannot promise what the machine forbids. Confinement at two levels:
  the per-command act sets, plus the AnkiConnect request log of a real run — a
  full `executeImport` issues no `addNotes` / `addNote` / `updateNoteFields` /
  `deleteNotes`, a full `executeExport` creates exactly one note and issues no
  `deleteNotes`, and the neighbouring test asserts the import really wrote a file
  so the "no writes" check cannot pass vacuously. Reachability: every (state,
  event) pair the machine allows is emitted by a row or sits on an explicit list
  with a reason — four do not, and adding a producer without deleting its entry
  fails the test. Findings: the "out of scope => another command owns it"
  invariant is false for Sync's own two cells (purge handles them outside the
  resolver), so the strong check runs for the wizards and those cells are pinned
  to a rationale naming UC-30 / UC-31; `getSimplePaths` does not report
  self-loops and saw only two of the four unreachable pairs, so reachability
  reads the transition wrapper instead; and the import confinement is a
  request-log promise, not structural, because `executeImport` takes an Anki
  instance and may only read media with it.
- **UC-25j** (`25bdd91`) — three real bugs, each a named counter and a test on
  its literal text, no change to what is written anywhere. Media
  (`media.ts:62-65`): a file Anki does not have was dropped with no trace, and
  the extractor even asked for remote images — `mediaFilenamesIn` now filters
  any reference with a scheme or a protocol-relative `src`, `importDeckMedia`
  returns `{ notImported, written }`, and the report says "media not imported:
  N" (not "missing", because a name Anki stores normalized would be counted as
  missing while the file exists; that case is unverified and deliberately not
  fixed). Export (`export.ts:82`): a fence that fails to parse vanished without
  a word — `scanBlocks` returns the unreadable count and the report says
  "skipped unreadable: N". Sync (`sync.ts:439`): records were forgotten without
  the count, and the case where a record is forgotten while its block stays
  behind is now pinned by a test — purge never deletes a block it cannot parse,
  and the report says "N deleted, M records forgotten". Left out on purpose: the
  "sum of outcomes = number of notes" property, because the reports mix terminal
  outcomes with modifiers (forced, media) and that shape is UC-28's to rewrite;
  and the normalized-name case of the media inventory, which needs a real
  collection to confirm.
- **UC-25k** (`c75ce40`) — the badge is the rationale. `NotesPreview` keeps the
  lifecycle status (not just the six-value preview status) and reads the row, so
  the text is policy again: the 11 literals are gone, the two `noFile` variants
  stay in the component because they are guard reasons, and the up-to-date row
  still appends its path because that value is not in the table. Three of the
  ten GUI assertions changed their expected sentence, because the rationales
  were rewritten to be short consequences ("Anki wins: overwrites your newer
  edits."), which is the one visible change. Two hand-written policy lists died
  with it: `isImportSelectedByDefault` is now the import write acts read off the
  table, and `isForceDecisive` is `row.forcedAct !== undefined`; both were
  deleted from `note-lifecycle.ts` with their twelve tests, replaced by four
  table contracts (every forced act has a sentence, exactly one row carries a
  label without an act, every kind is colourable) and one new GUI test that pins
  the case the old badge got wrong: a block with an id and no ledger record says
  it enrols the block instead of promising a new file. Colours come from
  `row.kind`, so an overwrite is `--text-error` and a skip is `--text-warning`;
  the old single "updated" colour and its token are gone. Icons are deliberately
  a coloured span with `aria-label` and `title`, not `setIcon`: `IconName` is a
  plain string in these typings so a wrong name would render nothing, and
  `obsidian-test-mocks` exports neither `setIcon` nor `setTooltip`. Swapping in
  Lucide glyphs is one line once the mock grows `setIcon`.
- **UC-25o** (`cddc963`) — one classification snapshot for preview and
  execution. The preview and the run classified the same note separately from a
  deck read cached when the user picked the deck, so a note edited in between
  was silently written from stale content and a note deleted in between was
  written back from the vault. The run now refreshes the selected notes from
  Anki, acts on that read, and reports two facts the user could not see before:
  how many notes changed since the preview and how many are no longer in the
  deck. Neither blocks the run.

  This one was left unchecked in the old `TODO.md` after its commit — the code
  landed and the plan file did not follow. Noted here so the next reader does
  not think it is outstanding.

## Bugs found after Phase 1c

- **Import flattened the subdeck tree** (`2c71f91`) — importing `Medicine`
  wrote notes that live in `Medicine::Anatomy` into `Medicine/`, because
  `fetchDeckNotes` returns the deck *and its descendants* (Anki's `deck:` search
  spans subdecks) while `executeImport` computed one folder from the selected
  deck name for the whole batch. `AnkiNoteInfo` carried no deck, so the
  structure could not be reproduced; the one Anki call that could supply it,
  `cardsInfo`, existed in `src/services/anki.ts` and was never called. Fixed by
  resolving each note's deck from its cards (chunks of 100, mapped by `cardId`,
  the alphabetically first deck when a note has cards in several) inside
  `executeImport`, grouping the plan by
  `deckFolder(note.deckName ?? request.deckName)`, and counting the result as
  `report.folders`. A folder is created only for a group that holds notes, so an
  empty subdeck branch gets no directory: the vault tree is a copy of the deck
  tree *where there are notes*, not of the deck tree itself. Round trip is now
  proven — a note exported from `Languages/Russian/` lands back in
  `Languages/Russian/`.
- **Two copies of `deckSearchQuery`** (`2c71f91`) — one in
  `src/services/import.ts`, one in
  `src/gui/import-wizard/components/DeckSelection.tsx`. One function now lives
  in `src/services/deck-query.ts` and escapes a quoted deck name instead of
  deleting the quote, which used to turn the deck `Say "hi"` into a search for
  `Say hi` — a different deck that happened to exist.
- **Wizard note selection survived a deck change** (done in UC-22) — the deck
  handler now clears the selection and the force decisions, so the counter cannot
  describe a different deck than the one being imported.

## Ratchet and coverage state

Not a phase, a standing list. The named offenders and their current numbers live
on the board as one card (`Ratchet targets for the complexity metrics`); they are
not repeated here because a duplicated number is a number that goes stale.

- 500 tests, 38 suites, all green at the time of writing.
- jscpd on `src`: 5 clones, 0.97% duplicated tokens (threshold 3).
- dependency-cruiser: 61 modules, 223 dependencies, no violations.
