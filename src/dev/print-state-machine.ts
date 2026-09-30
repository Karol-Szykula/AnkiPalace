import { writeFileSync } from "fs";
import { noteLifecycleMermaid } from "src/services/notes/lifecycle";
import {
  syncDecisionTableMarkdown,
  syncDecisionTableMermaid,
} from "src/services/notes/decision-table";

const doc = `# Note Lifecycle State Machine & Decision Tables

> This document is generated from source code. Do not edit manually.
> Run \`pnpm run doc:state-machine\` to regenerate.

## 1. Dependency Chain (What Derives From What)

\`\`\`mermaid
flowchart LR
  subgraph "Source of Truth (Manual)"
    LT["lifecycleTransitions\n(lifecycle.ts:47-79)"]
    DT["decisions[cmd][status]\n(decision-table.ts:33-255)"]
  end

  subgraph "Derived / Generated"
    XSTATE["xstate machine\n(machineStates())"]
    MERMAID_LC["noteLifecycleMermaid()"]
    MERMAID_DT["syncDecisionTableMermaid()"]
    MD_DT["syncDecisionTableMarkdown()"]
    DOC["docs/state-machine.md"]
  end

  subgraph "Runtime"
    CLASSIFY["classifyNoteLifecycle()"]
    DECIDE["decisionActFor()"]
    TRANSIT["transitionNoteLifecycle()"]
    LEDGER["syncedCleanRecord()"]
  end

  LT --> XSTATE
  LT --> MERMAID_LC
  DT --> MERMAID_DT
  DT --> MD_DT
  MERMAID_LC --> DOC
  MERMAID_DT --> DOC
  MD_DT --> DOC
  XSTATE --> TRANSIT
  CLASSIFY --> DECIDE
  DECIDE --> TRANSIT
  TRANSIT --> LEDGER

  classDef src fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px;
  classDef gen fill:#fff3e0,stroke:#ef6c00,stroke-width:2px;
  classDef run fill:#e3f2fd,stroke:#1565c0,stroke-width:2px;
  classDef doc fill:#fce4ec,stroke:#c2185b,stroke-width:2px;
  class LT,DT src;
  class XSTATE,MERMAID_LC,MERMAID_DT,MD_DT,DOC gen;
  class CLASSIFY,DECIDE,TRANSIT,LEDGER run;
\`\`\`

## 2. Source Tables — The Two Independent Authorities

### 2.1 lifecycleTransitions — State Machine Topology

**Location:** \`src/services/notes/lifecycle.ts:47-79\`  
**11 states, 13 events, ~30 transitions**

This is the **single source of truth** for legal state transitions. The xstate machine, Mermaid diagram, and runtime validation all derive from this table.

\`\`\`mermaid
${noteLifecycleMermaid()}
\`\`\`

### 2.2 decisions[command][status] — Command Policy

**Location:** \`src/services/notes/decision-table.ts:33-255\`  
**3 commands × 11 states = 33 rows**

This is the **second independent authority**. It defines what each command (import/export/sync) does in each state — which event to emit, whether force changes it, who owns the decision, and why.

\`\`\`mermaid
${syncDecisionTableMermaid()}
\`\`\`

#### Decision Table (Markdown)

${syncDecisionTableMarkdown()}

## 3. How They Relate — Dependency Graph

\`\`\`mermaid
flowchart LR
  subgraph "Source Tables (Manual)"
    LT["lifecycleTransitions\n(11 states × events)"]
    DT["decisions[cmd][status]\n(3 cmds × 11 states)"]
  end

  subgraph "Derived (Generated)"
    XSTATE["xstate machine\nvia machineStates()"]
    MERMAID_LC["noteLifecycleMermaid()"]
    MERMAID_DT["syncDecisionTableMermaid()"]
    MD_TABLE["syncDecisionTableMarkdown()"]
    DOC["docs/state-machine.md"]
  end

  subgraph "Runtime Entry Points"
    CLASSIFY["classifyNoteLifecycle(anki, block, record)"]
    DECIDE["decisionActFor(cmd, state, forced?)"]
    TRANSIT["transitionNoteLifecycle(state, event)"]
    LEDGER["syncedCleanRecord(hash, mod)"]
  end

  LT --> XSTATE
  LT --> MERMAID_LC
  DT --> MERMAID_DT
  DT --> MD_TABLE
  MERMAID_LC --> DOC
  MERMAID_DT --> DOC
  XSTATE --> TRANSIT

  CLASSIFY --> DECIDE
  DECIDE --> TRANSIT
  TRANSIT --> LEDGER

  classDef src fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px;
  classDef gen fill:#fff3e0,stroke:#ef6c00,stroke-width:2px;
  classDef run fill:#e3f2fd,stroke:#1565c0,stroke-width:2px;
  classDef doc fill:#fce4ec,stroke:#c2185b,stroke-width:2px;
  class LT,DT src;
  class XSTATE,MERMAID_DT,MD_TABLE,DOC gen;
  class CLASSIFY,DECIDE,TRANSIT,LEDGER run;
\`\`\`

## 4. Classification & Event Resolution — The Runtime Flow

Every sync operation follows this chain:

\`\`\`mermaid
flowchart TD
  A[classifyNoteLifecycle(anki?, block?, record?)] -->|returns NoteLifecycleStatus| B
  B[decisionActFor(command, status, forced?)] -->|returns NoteLifecycleEvent or OUT_OF_SCOPE| C
  C -->|if in scope| D[transitionNoteLifecycle(status, event)]
  D -->|validated by xstate| E[nextStatus]
  E --> F[syncedCleanRecord(hash, mod)]
  F --> G[update ledger]
  C -.->|if OUT_OF_SCOPE| H[no state change, counted in report]

  classDef entry fill:#e3f2fd,stroke:#1565c0,stroke-width:2px;
  classDef decision fill:#fff3e0,stroke:#ef6c00,stroke-width:2px;
  classDef transit fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px;
  classDef ledger fill:#fce4ec,stroke:#c2185b,stroke-width:2px;
  class A entry;
  class B decision;
  class C,D transit;
  class F,G ledger;
\`\`\`

### Step-by-step

1. **classifyNoteLifecycle(anki?, block?, record?)** — Single entry point. Compares:
   - \`block.hash !== record.lastHash\` → \`vaultDirty\`
   - \`anki.mod > record.lastMod\` → \`ankiDirty\`
   - Returns one of 11 \`NoteLifecycleStatus\` values.

2. **decisionActFor(command, status, forced?)** — Looks up \`decisions[command][status]\`:
   - Returns \`act\` (default) or \`forcedAct\` (if \`isForced\`).
   - May return \`OUT_OF_SCOPE\` (command defers to another).

3. **transitionNoteLifecycle(status, event)** — Gateway:
   - Validates \`event\` exists in \`NOTE_LIFECYCLE_EVENTS\`.
   - Uses xstate snapshot to check \`can({type: event})\`.
   - Throws if illegal; returns \`nextStatus\` if legal.

4. **syncedCleanRecord(hash, mod)** — Creates fresh ledger record:
   - \`lastHash\` = content hash
   - \`lastMod\` = Anki's \`mod\` (seconds)
   - \`status = "synced.clean"\`

## 5. The Two Tables — Relationship at Runtime

\`\`\`mermaid
flowchart LR
  subgraph "Source 1: Machine Topology"
    LT[lifecycleTransitions]
  end
  subgraph "Source 2: Command Policy"
    DT[decisions[cmd][status]]
  end

  LT --> XSTATE[xstate machine]
  XSTATE --> TRANSIT[transitionNoteLifecycle]

  DT --> DECIDE[decisionActFor]
  DECIDE -->|event| TRANSIT

  CLASSIFY[classifyNoteLifecycle] --> DECIDE
  TRANSIT --> LEDGER[syncedCleanRecord]

  classDef src fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px;
  classDef derived fill:#fff3e0,stroke:#ef6c00,stroke-width:2px;
  classDef runtime fill:#e3f2fd,stroke:#1565c0,stroke-width:2px;
  class LT,DT src;
  class DECIDE derived;
  class CLASSIFY,DECIDE,TRANSIT runtime;
\`\`\`

## 6. Classification Logic — How State Is Determined

\`classifyNoteLifecycle(inputs)\` (lifecycle.ts:239-280) evaluates:

| anki | block | record | → status |
|------|-------|--------|----------|
| ✓ | ✗ | ✗ | ankiOnly.neverImported |
| ✓ | ✗ | ✓ | ankiOnly.fileDeleted |
| ✓ | ✓ | ✗ | linked.unenrolled |
| ✓ | ✓ | ✓ | synced.clean / ankiNewer / vaultNewer / diverged |
| ✗ | ✓ (no id) | ✗ | vaultOnly.unexported |
| ✗ | ✓ (id) | ✗ | vaultOnly.unenrolled |
| ✗ | ✓ | ✓ | vaultOnly.ankiDeleted |
| ✗ | ✗ | ✓ | orphaned |

For the 3-present case: \`vaultDirty = block.hash !== record.lastHash\`, \`ankiDirty = anki.mod > record.lastMod\`.

## 7. Clocks, Hashes & Deletions

- **Hash-first dirtiness:** \`lastHash = hash(front\\nback\\ntags\\nmodel)\`. Content change → dirty; our own writes don't look like foreign changes.
- **Clocks:** Anki \`mod\` (unix seconds) vs file \`mtime\` (ms). \`isAnkiNewer = (anki.mod * 1000) > file.stat.mtime\`. Used only by \`Sync\` command.
- **Ties:** < 1s difference → vault wins (OBSID-21 open for configurable threshold).
- **Post-write real mod:** After any Anki write, ledger stores actual \`mod\` from \`notesInfo\` round-trip → prevents ping-pong.
- **Missing file resolution:** \`resolveMissingFile(ankiMod, recordLastMod)\` → \`ankiMod > recordLastMod\` ? \`RESURRECT\` : \`PURGE\`.
- **Anki deletion:** Note gone from \`findNotes\` → block removed, record deleted.

## 8. Command Scopes

| Capability | Import | Export | Sync |
|------------|--------|--------|------|
| Pull (vault ← Anki) | ✓ | ✗ | ✓ |
| Push (vault → Anki) | ✗ | ✓ | ✓ |
| Resolve clocks | ✗ | ✗ | ✓ (RESOLVE_NEWEST) |
| Force (per note) | Anki wins | Obsidian wins | none |
| Deletions | never resolves | never resolves | resolves |
| Enroll | ✓ | ✓ | ✗ (wizards only) |

## 9. Anti-Drift Guarantees

| Artifact | Generator | Source | Anti-Drift Test |
|----------|-----------|--------|-----------------|
| State Machine Mermaid | \`noteLifecycleMermaid()\` | \`lifecycleTransitions\` | \`lifecycle.test.ts:252-263\` |
| Decision Table Mermaid | \`syncDecisionTableMermaid()\` | \`decisions\` | \`decision-table.test.ts\` (new) |
| Decision Table Markdown | \`syncDecisionTableMarkdown()\` | \`decisions\` | \`decision-table.test.ts:268-278\` |

Run \`pnpm run doc:state-machine\` to regenerate this document.
Run \`pnpm run test\` to verify anti-drift.

---

*Generated by \`pnpm run doc:state-machine\` from \`src/dev/print-state-machine.ts\`*
`;

writeFileSync("docs/state-machine.md", doc);
