import { writeFileSync } from "fs";
import { noteLifecycleMermaid } from "src/services/notes/lifecycle";
import {
  syncDecisionTableMarkdown,
  syncDecisionTableMarkdownCommandCentric,
  syncDecisionTableMermaid,
} from "src/services/notes/decision-table";

const doc = `# Note Lifecycle State Machine & Decision Tables

> This document is generated from source code. Do not edit manually.
> Run \`pnpm run doc:state-machine\` to regenerate.

## 1. Dependency Chain (What Derives From What)

\`\`\`mermaid
flowchart TB
  subgraph SOURCE["Source of Truth (Manual)"]
    direction TB
    LT["lifecycleTransitions<br/>(lifecycle.ts:47-79)"]
    DT["decisions[cmd][status]<br/>(decision-table.ts:33-255)"]
  end

  subgraph GEN["Derived / Generated"]
    direction TB
    XSTATE["xstate machine<br/>(machineStates)"]
    MERMAID_LC["noteLifecycleMermaid()"]
    MERMAID_DT["syncDecisionTableMermaid()"]
    MD_DT["syncDecisionTableMarkdown()"]
    MD_DT_CMD["syncDecisionTableMarkdownCommandCentric()"]
    DOC["docs/state-machine.md"]
  end

  subgraph RUNTIME["Runtime"]
    direction TB
    CLASSIFY["classifyNoteLifecycle"]
    DECIDE["decisionActFor"]
    TRANSIT["transitionNoteLifecycle"]
    LEDGER["syncedCleanRecord"]
  end

  LT --> XSTATE
  LT --> MERMAID_LC
  DT --> MERMAID_DT
  DT --> MD_DT
  DT --> MD_DT_CMD
  DT --> DECIDE
  MERMAID_LC --> DOC
  MERMAID_DT --> DOC
  MD_DT --> DOC
  MD_DT_CMD --> DOC
  XSTATE --> TRANSIT
  CLASSIFY --> DECIDE
  DECIDE --> TRANSIT
  TRANSIT --> LEDGER

  classDef src fill:#e8f5e9,stroke:#33691e,stroke-width:2px,color:#1b5e20;
  classDef gen fill:#fff8e1,stroke:#f57c00,stroke-width:2px,color:#e65100;
  classDef run fill:#e8eaf6,stroke:#283593,stroke-width:2px,color:#1a237e;
  classDef doc fill:#fce4ec,stroke:#ad1457,stroke-width:2px,color:#880e4f;
  class LT,DT src;
  class XSTATE,MERMAID_LC,MERMAID_DT,MD_DT,MD_DT_CMD,DOC gen;
  class CLASSIFY,DECIDE,TRANSIT,LEDGER run;
\`\`\`

## 2. Source Tables — The Two Independent Authorities

### 2.1 lifecycleTransitions — State Machine Topology

**Location:** \`src/services/notes/lifecycle.ts:47-79\`  
**11 states, 13 events, ~30 transitions**

This is the **single source of truth** for legal state transitions. The xstate machine, Mermaid diagram, and runtime validation all derive from this table.

\`\`\`mermaid
${noteLifecycleMermaid().replace(/\(/g, "<br/>").replace(/\)/g, "")}
\`\`\`

### 2.2 decisions[command][status] — Command Policy

**Location:** \`src/services/notes/decision-table.ts:33-255\`  
**3 commands × 11 states = 33 rows**

This is the **second independent authority**. It defines what each command (import/export/sync) does in each state — which event to emit, whether force changes it, who owns the decision, and why.

### 2.2.1 Export Wizard (force: Obsidian wins)

\`\`\`mermaid
${syncDecisionTableMermaid("export")}
\`\`\`

### 2.2.2 Import Wizard (force: Anki wins)

\`\`\`mermaid
${syncDecisionTableMermaid("import")}
\`\`\`

### 2.2.3 Sync Command (no force)

\`\`\`mermaid
${syncDecisionTableMermaid("sync")}
\`\`\`

#### Decision Table (Markdown) — State-Centric (Transposed)

${syncDecisionTableMarkdown()}

<details>
<summary>Command-Centric Tables (per command)</summary>

${syncDecisionTableMarkdownCommandCentric()}

</details>

## 3. How They Relate — Dependency Graph

\`\`\`mermaid
flowchart TB
  subgraph SOURCE["Source Tables (Manual)"]
    direction TB
    LT["lifecycleTransitions<br/>(11 states × events)"]
    DT["decisions[cmd][status]<br/>(3 cmds × 11 states)"]
  end

  subgraph GEN["Derived (Generated)"]
    direction TB
    XSTATE["xstate machine<br/>via machineStates"]
    MERMAID_LC["noteLifecycleMermaid()"]
    MERMAID_DT["syncDecisionTableMermaid()"]
    MD_TABLE["syncDecisionTableMarkdown()"]
    MD_TABLE_CMD["syncDecisionTableMarkdownCommandCentric()"]
    DOC["docs/state-machine.md"]
  end

  subgraph RUNTIME["Runtime Entry Points"]
    direction TB
    CLASSIFY["classifyNoteLifecycle"]
    DECIDE["decisionActFor"]
    TRANSIT["transitionNoteLifecycle"]
    LEDGER["syncedCleanRecord"]
  end

  LT --> XSTATE
  LT --> MERMAID_LC
  DT --> MERMAID_DT
  DT --> MD_TABLE
  DT --> MD_TABLE_CMD
  MERMAID_LC --> DOC
  MERMAID_DT --> DOC
  MD_TABLE --> DOC
  MD_TABLE_CMD --> DOC
  XSTATE --> TRANSIT

  CLASSIFY --> DECIDE
  DECIDE --> TRANSIT
  TRANSIT --> LEDGER

  classDef src fill:#e8f5e9,stroke:#33691e,stroke-width:2px,color:#1b5e20;
  classDef gen fill:#fff8e1,stroke:#f57c00,stroke-width:2px,color:#e65100;
  classDef run fill:#e8eaf6,stroke:#283593,stroke-width:2px,color:#1a237e;
  classDef doc fill:#fce4ec,stroke:#ad1457,stroke-width:2px,color:#880e4f;
  class LT,DT src;
  class XSTATE,MERMAID_DT,MD_TABLE,MD_TABLE_CMD,DOC gen;
  class CLASSIFY,DECIDE,TRANSIT,LEDGER run;
\`\`\`

## 4. Classification & Event Resolution — The Runtime Flow

Every sync operation follows this chain:

\`\`\`mermaid
flowchart TB
  A["classifyNoteLifecycle"] -->|returns NoteLifecycleStatus| B
  B["decisionActFor"] -->|returns NoteLifecycleEvent or OUT_OF_SCOPE| C
  C -->|if in scope| D["transitionNoteLifecycle"]
  D -->|validated by xstate| E["nextStatus"]
  E --> F["syncedCleanRecord"]
  F --> G["update ledger"]
  C -.->|if OUT_OF_SCOPE| H["no state change, counted in report"]

  classDef entry fill:#e8eaf6,stroke:#283593,stroke-width:2px,color:#1a237e;
  classDef decision fill:#fff8e1,stroke:#f57c00,stroke-width:2px,color:#e65100;
  classDef transit fill:#e8f5e9,stroke:#33691e,stroke-width:2px,color:#1b5e20;
  classDef ledger fill:#fce4ec,stroke:#ad1457,stroke-width:2px,color:#880e4f;
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
flowchart TB
  subgraph SRC1["Source 1: Machine Topology"]
    direction TB
    LT["lifecycleTransitions"]
  end
  subgraph SRC2["Source 2: Command Policy"]
    direction TB
    DT["decisions"]
  end

  LT --> XSTATE["xstate machine"]
  XSTATE --> TRANSIT["transitionNoteLifecycle"]

  DT --> DECIDE["decisionActFor"]
  DECIDE -->|event| TRANSIT

  CLASSIFY["classifyNoteLifecycle"] --> DECIDE
  TRANSIT --> LEDGER["syncedCleanRecord"]

  classDef src fill:#e8f5e9,stroke:#33691e,stroke-width:2px,color:#1b5e20;
  classDef derived fill:#fff8e1,stroke:#f57c00,stroke-width:2px,color:#e65100;
  classDef runtime fill:#e8eaf6,stroke:#283593,stroke-width:2px,color:#1a237e;
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
| Decision Table Markdown (Command-Centric) | \`syncDecisionTableMarkdownCommandCentric()\` | \`decisions\` | \`decision-table.test.ts:296-302\` |

Run \`pnpm run doc:state-machine\` to regenerate this document.
Run \`pnpm run test\` to verify anti-drift.

---

*Generated by \`pnpm run doc:state-machine\` from \`src/dev/print-state-machine.ts\`*
`;

writeFileSync("docs/state-machine.md", doc);
