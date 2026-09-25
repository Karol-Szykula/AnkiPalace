# proj/

The project's source of truth, in files, in git. No database, no server, no
infrastructure — the files are the state and the git history is the log.

```
proj/
  board.md          the kanban: 40 cards, ordered, this is the work
  docs/
    model.md        the binding contract: states, SYNC/MODEL/ENT rules, commands
    roadmap.md      what the plugin is when it is done, and why the phases order
    history.md      phases 0a-1c, the cards that closed, the bugs they fixed
    decisions.md    work decided out of scope, with the reason to revisit it
```

## Run the board

```sh
pnpm run board          # or: bunx kanban-cli proj/board.md
```

It serves a Trello-style board on `http://127.0.0.1:4177` and opens it. Drag a
card between columns and the markdown file is rewritten; edit the markdown in
Neovim or Obsidian and the board follows. Both directions, because the file is
the state.

Bun 1.3+ is the only requirement (the tool is a Bun CLI; `bunx` and `npx` both
fetch it, and `npx` still needs `bun` on `PATH` because of the shebang). Useful
flags: `--no-open` (do not launch a browser), `--port <n>`, `--host <h>`.

Two traps, both hit while writing this file:

- **Forward flags without `--`.** `pnpm run board -- --port 4201` passes the
  separator through as a positional, so `--port` arrives *after* it and is read
  as a second file path. `pnpm run board --port 4201` is correct.
- **The tool creates the path it is given.** A typo, or a stray `--help`, becomes
  a new markdown file with the default starter board. It will not refuse.


## How a card is worked

The rules are binding and they sit twice: in this file's `model.md` and at the
top of `board.md`, so an agent that only opens the board still obeys them. In
short: work top to bottom in `Todo`, move to `Doing` before starting, one card =
one commit with the card id in the message, `pnpm run check` green before that
commit, red test first.

`Todo` is **ordered**. The top card is the next one, and reordering is a real
decision, not a drag accident. `P1:` in a title means the card changes the order
of others, not that it is more interesting.

## Epics

There is no grouping feature in the tool — columns are the only structure it
has, and epics are a title convention. Every card title starts with its epic in
square brackets, so the board can be read or grepped by area:

| Tag | What it is | Cards |
| --- | --- | --- |
| `[Sync]` | Sync becomes ledger-driven, then deletions, decks and ties | 8 |
| `[UI]` | The shared wizard shell, the export wizard, and the surfaces that make decisions obvious | 10 |
| `[Tests]` | Invariance, end to end, the never-deletes regression, live Anki | 9 |
| `[Quality]` | The named offenders, the duplicated entities, the stricter flags | 7 |
| `[Chore]` | Docs, settings cleanup, coverage, mutation testing, the rename | 6 |

Cards are grouped by epic and the epics are in dependency order, so top to
bottom still means the next thing to do. **Within** an epic the order is the
decision; nothing enforces it. When a card genuinely gates another, that is
written in the card, not encoded in position:

- `Gating.` — other cards wait for this one (4 cards).
- `Depends on [tag] …` — this card waits for another (2 cards).

That is how the two dependencies that cut across epics are expressed: the
never-deletes regression is a `[Tests]` card that must land before the
destructive `[Sync]` work in tombstones and deletions, and the shared shell is a
`[UI]` card that must land before the export wizard. Reading order does not have
to carry that, so the cards say it in words.

If the board ever outgrows one file, epics become files — the tool accepts
several and offers a switcher in the header. That is the only native grouping
it has.

## Titles

Titles say what changes for the user, not which module is touched, and they
carry no colon. Both rules are load-bearing:

- **A colon in a title moves the boundary.** The format is
  `- [ ] Title: description`, and the parser splits on the *first* colon, so
  `P1: UC-28 ledger-driven Sync` parses as the title `P1` with the rest as
  description. In the UI that card shows up as "P1". Priority and dependency
  live in the description instead, which is where the reasoning belongs anyway.
- **`Todo` is ordered, so the first words have to carry the meaning.** A row
  that says "UC-29 deck vault -> Anki" tells a reader nothing about whether it
  is worth doing; "A note goes to the Anki deck its vault folder implies" does.

Cheap sanity check after any edit outside the tool — both counts must be 40, and
a card whose title came out as a single word means a colon crept in:

```sh
rg -c '^- \[ \] ' proj/board.md                                    # 40
rg -c '^- \[ \] \[(Sync|UI|Tests|Quality|Chore)\] ' proj/board.md  # 40
```

## What goes where

- A card is a **scope and a done-when**. Two to ten lines. If the text is a
  paragraph, it is a doc.
- `docs/model.md` — the contract. It changes only in its own commit, because
  everything else obeys it.
- `docs/decisions.md` — anything decided out of scope, including the condition
  that would make it worth revisiting.
- `docs/history.md` — a phase, or a card, once it is closed. Cards move here from
  the board's `Done` column when their phase closes, with the commit named.
- `docs/roadmap.md` — why the phases are in this order and what the finished
  plugin feels like.

## What this format cannot hold, on purpose

`board.md` is machine-owned. The tool rewrites the whole file in one canonical
form on every save, so:

- There are no priority, label, assignee or due fields. The card model is exactly
  `{ title, description, done }`. Priority is order plus the `P1:` prefix;
  meta lives in the description.
- Card ids are not persisted, so a card cannot be referenced by id from outside
  this folder. Cite a commit, a `file:line`, or the UC number instead.
- `Done` is a staging area, not an archive. It empties into `docs/history.md`.
- Hand-formatting does not survive. Do not hand-format `board.md`; if something
  must not be rewritten, it belongs in `docs/`.

The same reason keeps documentation out of the board: a heading in this file is
a column, so `docs/` is a sibling folder rather than a section.
