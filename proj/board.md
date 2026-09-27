---
title: Better Flashcards
---

How to work this board (binding, same rules as proj/docs/model.md):

- Move a card into "Doing" before starting work on it, and into "Done" the moment
  it is committed. Never leave a card in "Doing" that nobody is working on.
- Work top to bottom in "Todo". "Todo" is ordered: the top card is the next one.
- One card = one commit. The commit message names the card id.
- pnpm run check must be green before a commit, and the change must touch only
  what the card asks for.
- Red test first, per AGENTS.md. A card whose done-when is a report field or a
  text needs a test on the literal text.
- "Done" is a staging area, not an archive. When a phase closes, its Done cards
  move into proj/docs/history.md and the column empties.
- A card that gets decided out of scope does not stay on the board: it goes to
  proj/docs/decisions.md with the reason and the condition to revisit it.
- proj/docs/ holds the contract (model.md), the phases (roadmap.md) and the
  history. The board holds work. Do not paste prose into a card that belongs in
  a doc; a card description is a scope and a done-when.

# Todo
- [ ] [Sync] Sync reads the ledger instead of the deck snapshots: Gating. Unblocks UC-29, UC-30, UC-31 and the action inventory in proj/docs/decisions.md.
  Scope = settings.noteLifecycle, no deckImportSnapshots guard; deckName added to
  the record; the observed status is persisted so block banners become reachable;
  notes added in Anki are counted as "needs import" instead of a silent skip;
  empty ledger = no-op with a helpful hint; aggregate report; a new "Sync current
  note" command for the active file.
  Two report-honesty holes are folded in from the dropped UC-25l, because UC-28
  rewrites exactly that code: counts.refreshed is set to eligible.length BEFORE
  the delegated import filters, so the report can claim a refresh that never
  happened (sync.ts:220), and an untracked Anki note with no linked block vanishes
  with no counter (sync.ts:122-126).
  Done-when: refreshed is the number of files the import actually wrote, the
  untracked note has a named reason, and the aggregate report carries both.
  It also rewrites syncDeckNotes, so the ratchet ceiling for it drops as a side
  effect.
- [ ] [Sync] Export checks the note's real Anki model before writing: Gating for the mapping page in UC-36.
  The model in a create's payload is decisive, but a push's modelName is inert -
  updateNoteFields cannot change a notetype (ENT-07). So a push must be checked
  against the model the note already has in Anki, while the field names it writes
  still come from the pack resolved from the block's model. That combination is
  silent data loss today and the exact case the built-in comparison cannot see: a
  block written before note-form had a model key reads as Basic (MODEL-09) while
  its Anki note is a Cloze with Text / Back Extra.
  Before planning, batch-read modelNames + modelFieldNames for every model in
  play, verify per note that the pack's field names are real fields of that
  note's model, and count a mismatch as "skipped on model mismatch" instead of
  letting AnkiConnect abort the whole multi. A create whose model is missing is
  still created from the built-in definition (UC-25a).
  This is the prerequisite for the mapping page in UC-36: without it the bulk
  report lies and one odd model kills the whole export.
- [ ] [Sync] A note goes to the Anki deck its vault folder implies: Read the Anki deck via cardsInfo, enforce the vault path's deck with changeDeck
  for the cards in the ledger deck only, per SYNC-09.
- [ ] [Sync] Deleting a note in Obsidian leaves a tombstone, not an orphan: Depends on [Tests] the import wizard never deletes anything, proven.
  Vault delete event -> noteId -> deletedAt; resurrect iff Anki is newer than the
  deletion, otherwise respect the deletion; reverse index cleanup. Both
  resurrection paths clear the tombstone: a Sync RESURRECT and a forced import,
  and Purge ledger forgets the record with it.
- [ ] [Sync] A note deleted in Anki always loses its block: Depends on [Tests] the import wizard never deletes anything, proven.
  Anki deletion wins per SYNC-03: strip the block, purge the record, clean
  tombstones.
- [ ] [Sync] Two edits within a minute are reported, not silently broken: syncTieWinner + syncTieThresholdSec + ties reported (SYNC-04).
- [ ] [Sync] Each audit finding becomes one test: Every vault scan respects ignoredDirectories per SYNC-10 (records in ignored
  folders are reported, never purged, so the setting can never become a
  data-loss switch), pack check before ENROLL, purgedRecords in the Sync report,
  stale vault-index handling.
- [ ] [Sync] Counts read as notes first, with Anki cards in brackets: Non-blocking, needs UC-28 context. Counts shown as notes (our tracked unit)
  with Anki card counts in parentheses? Proposed yes, awaiting confirmation.
  Was duplicated in the old TODO.md in two places with different wording; merged
  here into one card.
- [ ] [UI] Both wizards share one shell and one notes table: Gating for UC-36 and UC-36a.
  Per ENT-06: a wizard shell (page indicator, footer, cancel/back/next, progress)
  plus a shared notes table (pagination, field search, selection, per-row force
  toggle) and a shared report footer, in a shared gui folder. The import wizard is
  migrated onto them with no behavior change; the export wizard then inherits
  them. Prerequisite for UC-36 and UC-36a.
- [ ] [UI] The export wizard is the import wizard, reversed: The exact mirror of the import wizard, same page order and the same per-note
  force, only reversed.
  Deck: Anki deckNames as the list, each row showing how many vault notes map to
  it and how many already exist in Anki.
  Fields: the real field names of each target model, not our built-in definition.
  A model whose fields do not match the pack is mapped by the user here and saved
  as a pack, so the re-plan runs on a fixed mapping instead of a retry loop,
  since Fields comes before Notes. A model that does not exist at all can be
  created from that mapping - the field mapped to Front/Text is the card front,
  the one mapped to Back/Extra is the back, Skip fields are left out, and a
  one-sided mapping yields a one-field model with a front-only template - always
  behind an explicit confirmation, because it writes a new notetype into the
  user's collection. The bulk Export to Anki command never creates a type from a
  mapping, it has no way to ask: it may only create a missing built-in (UC-25a)
  and report the rest (UC-33a).
  Notes: validation (empty front, cloze markers, no pack, missing media) and
  per-row decisions, every row saying what will happen: creates a note / nothing
  to do / pushes your change / skipped, use Sync / edited in both, force /
  deleted in Anki, force to recreate.
  Execute: reuse planExport as the candidate engine and pass the user's per-row
  decisions into exportActFor as isForced.
  Renames the command to "Export deck from Obsidian" (id
  export-deck-from-obsidian, mirroring import-deck-from-anki; no migration per
  MODEL-10) and mirrors the import side typographically: exportDeckCommandName,
  registerExportCommand, ExportWizard + ExportModal in src/gui/export-wizard/
  next to the import wizard, ExportExecution beside ImportExecution, runExport
  moved into the modal. The report keeps the short "Export: ..." prefix and
  errors keep "Export failed: ...". The force toggle is "Obsidian wins" with the
  same aria pattern as "Anki wins" and the same bulk button, and it must also
  cover vaultOnly.ankiDeleted (recreate), which the import side covers with
  RESURRECT.
- [ ] [UI] Every preview row says what will happen to your file: The notes preview is where every decision is made, so it must be obvious and
  fast. The shared table from UC-35 is the place, so the export wizard inherits
  it: a "Notes" column with the summary and the consequence badge; a selection
  column whose checkbox means "import this note" and is never silently greyed (a
  row the wizard will not write says so in the badge and explains on hover);
  "Anki wins" as its own labelled column instead of two boxes crammed into one
  cell; the row label toggles the checkbox as well as the box itself; a header
  checkbox selects or clears the whole page and a second one every filtered row
  once search exists; the selected count moves into the table header next to the
  column name, and the bulk force button sits in the header bar of that column so
  the consequence line ("re-creates N notes you deleted in Obsidian") stays next
  to it; forced rows get their own visual treatment (colour from Obsidian theme
  vars plus the badge wording from UC-22d) instead of text only.
  Keyboard: space toggles the focused row's selection, tab order runs row by row,
  and force is never reachable by a stray keypress. The "Cards to import" line
  becomes "Notes" together with UC-34. No behavior change to the decisions
  themselves, this is the affordance layer over importActFor. Folds the two old
  backlog lines "label click toggles checkbox" and "vertically align checkbox
  with label".
- [ ] [UI] Import and export open from the note you are in: Both wizards reachable from a note context with field search pre-filled; used
  by the future buttons.
- [ ] [UI] The mapping page shows undecided fields, not a wall: Simple-by-default: only undecided surplus rows; an "all auto-mapped" state
  instead of an empty table; a one-line summary of auto-mapped/skipped counts;
  settings mappingAdvancedView boolean, default false, revealing auto read-only
  rows + forced-Skip rows + pack metadata; ankiDefaultFields constant,
  extra->backExtra renames.
- [ ] [UI] First run explains the three commands and asks permission: Permission -> import a deck or create a note; explains the three commands; the
  single Sync ribbon icon replaces the export icon. This is where
  ensureDefaultModels, the all-built-ins check, gets its caller - until then it
  is used only by tests.
- [ ] [UI] A New note command with a type picker and a folder preview: Type picker: Basic, Basic (and reversed card), Basic (optional reversed card),
  Basic (type in the answer), Cloze; deck/folder preview; inserts a validated
  block. Replaces the raw template commands.
- [ ] [UI] Editing a block tells you it saved, and what will not export: Front non-empty, cloze markers, tags normalisation, "no pack, this note will
  not export" warning, a visible saved indicator, an explicit conflict message
  instead of the silent drop in the persister. Blur stays the save trigger.
- [ ] [UI] A deck changed in Anki moves the file, or is reported: Mirror a detected single-deck change as a file move to deckFolder,
  collision-safe renaming, ambiguous multi-deck notes reported and left alone per
  SYNC-09. A move into an ignored folder is reported, never performed.
- [ ] [UI] Ignored folders are visible in the wizard, never silent: A line plus tooltip listing the folders on both wizard Scope pages, a Settings
  hint that the rule is plugin-wide, and a report counter for notes skipped
  because of it.
- [ ] [Tests] The import wizard never deletes anything, proven: Gating, and it lands before the destructive work in UC-30 and UC-31.
  No purge, no resurrection, no file removal in any path. Landed before the
  destructive features (tombstones, deletions) rather than after, because it is
  the guarantee the whole import side rests on.
- [ ] [Tests] Running a command twice changes nothing: Import, export and sync run twice = no-op; convergence after a forced
  overwrite.
- [ ] [Tests] New note to export to import to sync, end to end: New note -> export -> import -> sync, no duplicates in Anki or the vault.
- [ ] [Tests] A live Anki answers what the fakes cannot: Real model names and field names via curl; closes the UC-13 done-when, records
  the result in ux/persona.md notes or docs/synchronization.md. Also records
  whether AnkiConnect rejects or silently drops a field name that is not in the
  target notetype, because the wording of the mismatch report depends on it and
  the pre-check in UC-33a must not contradict it.
- [ ] [Tests] Round-trip fixtures built from real cards: Parked, back after sync.
- [ ] [Tests] Model simple paths kept as a regression pack: Done-when: the model simple paths are generated from the transition table as a regression pack, so a future machine change that drops a path fails a test.
- [ ] [Tests] Reimport after an edit duplicates no media: Done-when: importing a note again after editing it in the vault writes no second copy and no second media file.
- [ ] [Tests] Cancel, and Anki down, on every page: Done-when: cancelling Save, and losing Anki on every wizard page, produce a message instead of a hang or a stack trace.
- [ ] [Tests] Save without a folder, label toggles box, selection resets: Done-when: Save without a folder, the row label toggles the checkbox, changing deck clears the selection, and the report and the error path are asserted.
- [ ] [Quality] The named complexity offenders come down as they are refactored: Named offenders to tighten as each is refactored: syncDeckNotes (17
  cyclomatic, 19 cognitive, 116 lines, 7 parameters), classifyNoteLifecycle
  (14 / 19), ImportWizard (221 lines), NotesPreview (242), FieldMapping (126),
  DeckSelection (119). UC-28 rewrites syncDeckNotes, UC-35/36a the wizard
  components, UC-36 the export page, so the ceilings drop as a side effect of
  that work.
- [ ] [Quality] The three note classes stop repeating toPayload and media handling: basic-note, cloze-note and custom-mapped-note repeat toPayload and the media
  handling (47 of the 68 duplicated lines left in src), and export.ts vs
  note-push.ts repeat the update flow (17 lines). Do it while touching those
  files for UC-36 (the export creator) or ENT-01/ENT-04, whichever comes
  first.
- [ ] [Quality] buildNoteSyncState leaves the useMemo in ImportWizard: Done-when: the useMemo is a named buildNoteSyncState and ImportWizard is under the max-lines-per-function ceiling on its own.
- [ ] [Quality] Export inserting a duplicate block gets a test: The case the removed TODO comment in main.ts pointed at.
- [ ] [Quality] Sync detects Obsidian-side edits through a per-note hash: Subsumed by synced.vaultNewer/hash work, kept as reminder.
- [ ] [Quality] Two same-named media files stop colliding in Anki: Done-when: two media files with the same basename in different vault folders get distinct names in Anki, and the round trip restores both.
- [ ] [Quality] Stricter tsconfig flags once the easy ones are in: exactOptionalPropertyTypes, noPropertyAccessFromIndexSignature
  (noUncheckedIndexedAccess is already on since UC-25c).
- [ ] [Chore] Decide whether media lives inside the subdeck tree: Media goes to one attachments folder per imported deck (Medicine/attachments/)
  while notes now go to their own deck folders, so a media file referenced by a
  subdeck note sits outside its tree. Deliberate for now: media is keyed by
  filename and deduplicated, and two subdecks can reference one file, so
  per-subdeck folders would duplicate bytes. The reference in the note points at
  the real path either way.
  Needs a user decision: keep one attachments folder, or place each file next to
  the first note that references it.
- [ ] [Chore] The README stops describing the removed generate command: Done-when: the README describes only commands that exist.
- [ ] [Chore] lastSyncRev goes away with the ledger work: Done-when: settings.lastSyncRev is gone, the wizard deck counters read what they actually read, and no test reaches for the fallback.
- [ ] [Chore] Coverage thresholds once the real numbers settle: Done-when: jest runs with real branch, function, line and statement thresholds, chosen from the numbers the knip and jscpd cleanup produced.
- [ ] [Chore] Mutation testing on the lifecycle and sync services: Done-when: mutation testing runs on the lifecycle and sync services only, and a surviving mutant is either fixed or written down as equivalent.
- [ ] [Chore] The plugin is called ObsidiANki everywhere: Inventory: manifest.json (display name "Better Flashcards", id
  better-flashcards), package.json name flashcards, pluginFolderName =
  "better-flashcards" in src/services/note-packs.ts, rollup.config.js (four
  paths into the test vault), .gitignore (the test-vault plugin path),
  docs/BUILD_AND_RELEASE.md (5), docs/CONTRIBUTING.md (4), README.md (2),
  AGENTS.md (1), docs/test-vault/.obsidian/community-plugins.json (the tracked
  fixture that enables the plugin).
  Traps: (a) changing the manifest id changes the install folder, so Obsidian
  installs a *second* plugin and the old data.json with the whole ledger stays
  behind - the safe path is to change only the display name and move the id only
  together with a migration that reads the old folder; (b) note-packs writes
  saved packs under the plugin folder, so an id change orphans every pack a user
  saved unless that path is migrated; (c) main.js and dist/ are build artifacts,
  nothing to rename there.
  Deliberately not renamed: the CSS prefix flashcards- (122 occurrences in
  styles.css plus the class maps) and the icon id flashcards - internal
  identifiers, not the product name, and renaming them is pure churn.

# Doing

# Done
- [x] [Quality] The lifecycle runs on the machine, not on the table: Not planned: found while auditing src/services/ for duplication, when the machine was about to be deleted for having no call site in src/.
  transitionNoteLifecycle now resolves through noteLifecycleMachine (snapshot.can() separates a legal self-loop from an illegal event, transition() returns no actions to execute), so the architecture is table -> machine -> app. lifecycleTransitions is now read only to generate the machine and the diagram.
  Three command call sites are untouched; they call the same function with the same throw contract. New tests pin the self-loop, both failure messages and the unknown-event message; the pre-existing conformance test (machine agrees with the table) is what proves the generation is lossless, and UC-25i runs all 132 status x event pairs through the new path.
  Done-when: production resolves through the machine, the conformance test is the load-bearing proof, and ENT-02 says which of the two is the source of truth.
- [x] [Quality] One home for the shared pieces: hash, Anki reads, file names: First half of the services tidy, and the part that unblocks the architecture rule that follows.
  Removed, because each had two or more copies: fetchNotesById was byte-identical in export.ts and note-push.ts with a third variant in sync.ts, and the notesInfo batch size was declared five times across four files with two different values - 50 and 100. The 100 wins because it is the only one a test pins, so three untested local choices moved to the tested value. The hash lived inside yaml-note.ts while note-hash.ts only delegated to it, which is how a 26-line adapter ended up importing an 865-line command; both are now notes/content-hash.ts and the adapter is gone. Three copies of the stem-N.ext loop (import twice, media once) and two of parentFolderOf became one vault/paths.ts each, and note-push private copy of escapeRegExp deleted.
  Two of my own mistakes are worth naming: a shortcut that matched the note id with a raw string instead of parsing the fence would have overwritten nothing and created a second file, and enrichment-by-cards was added to fetchDeckNotes when only executeImport needs it.
  Done-when: 503 tests green, not one asserted value changed (six awaits, because the occupancy check can now be async), jscpd down from 5 clones to 4, and no module outside commands/ reaches a command module.
- [x] [Quality] Group the services by domain, and name them after what they do: Pure move: 15 files with git mv, every import path rewritten, and the tests moved to mirror the new shape. No logic changed.
  anki/ is the AnkiConnect boundary (anki, anki-models, read). notes/ is the note itself (lifecycle, decision-table, document, packs, text, fields, content-hash). vault/ is the filesystem side (vault, paths, media, records). commands/ are the three user commands and the push engine (import-deck, export-deck, sync, push). yaml-engine and logger stay at the folder root, because one is a port and the other is platform.
  Renames, because the old names were either bare keywords or easy to confuse with a neighbour: sync-decision.ts is notes/decision-table.ts, so it can no longer be mistaken for commands/sync.ts. import.ts and export.ts are import-deck.ts and export-deck.ts, after the command names in the contract. ledger.ts is vault/records.ts, since the file forgets records and never says purge. note-push.ts is commands/push.ts, which is what it does. yaml-note.ts and note-parser.ts merged into notes/document.ts, because the fence and the block it contains are one thing read together.
  dev-reset.ts moved to src/dev/reset-data.ts, which is where AGENTS.md already said developer-only code belongs.
  The largest file went from 865 lines to 669 (import-deck), and nothing in services/ is over 474. The release bundle moved by 0.02 %.
  Done-when: 503 tests green with not one assertion changed, knip clean, and the tree says which layer a module sits in before you open it.
- [x] [Quality] The import command does one thing: run the import: Third of the tidy. 669 lines went to 514, and the three things that were not about importing a deck left the file.
  notes/fields.ts took model discovery, because asking a live deck which fields a notetype has is the same question as which fields a note has. isKnownModel went further, to anki/anki-models.ts, because it asks about the catalogue of built-ins - and that deleted a second list of the same five model names that import-deck was carrying. vault/paths.ts took the target-file resolution, which is where markdownFileName and the id-in-content check already lived for the name half of the same job.
  What is left in the command is the command: the preview snapshot, the fields a note writes, the decision (status -> act), the plan, the write, and executeImport itself. Nothing in it converts text, reads Anki or resolves paths any more.
  knip caught a second copy of parentFolderOf still living in commands/push.ts, which the first commit missed - the moved one is the only one now. Four exports in vault/paths.ts turned out to be internal and are no longer exported.
  Done-when: 503 tests green with not one assertion changed, and no file in src/services/ is over 474 lines except the four commands, where it belongs.
- [x] [Quality] The domain is not allowed to reach for a command: The folders were documentation until this commit. This is the rule that makes them architecture: no-commands-from-domain in .dependency-cruiser.cjs, error severity, so the one edge that pointed the wrong way can never come back. It was writable only after the first commit of this series removed that edge; a rule you have to switch off to land is not a rule.
  Verified by breaking it on purpose: an import from notes/fields.ts to commands/import-deck.ts is reported by name, and the layout stays clean with it reverted. A rule that has never been seen to fail is a guess.
  Deliberately not added: no-folder-imports-another. The graph does not allow it - anki.ts needs the default deck name from vault, vault.ts reads note blocks - and a rule that needs an exception teaches people to ignore rules.
  Written down in proj/docs/model.md (where the code sits, and the two rules) and in AGENTS.md (where a new service goes), so the next file lands in the right folder without reading the tree first.
  Done-when: the rule exists, fails on a deliberate break, and the contract says which of the two things is the source of truth.
- [x] [Quality] The root utils file is gone; each helper has an owner: Five functions in src/utils.ts, one to two callers each, and no owner. Two of them had a real owner: describeUnknown and toError exist because AnkiConnect answers with untyped values, so they moved to anki/anki.ts next to the client that needs them (main.ts already imported Anki from there, so no new edge). arraysEqual moved to entities/anki-note.ts, its only caller.
  trimDashes and escapeRegExp stayed, because they are genuinely shared: trimDashes by notes/document.ts and notes/packs.ts, escapeRegExp by vault/media.ts and commands/push.ts. A shared/ folder for two functions would be a folder with a name instead of a job.
  utils.ts: 5 functions, 62 lines, no owner -> 2 functions, 16 lines, each with a reason to exist.
  Done-when: src/utils.ts holds only the two helpers that are actually shared, and no root-level catch-all module is left holding code whose owner is unclear.
