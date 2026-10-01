# Note Lifecycle State Machine & Decision Tables

> This document is generated from source code. Do not edit manually.
> Run `pnpm run doc:state-machine` to regenerate.

## 1. State Machine Topology

**Location:** `src/services/notes/lifecycle.ts:47-79`  
**11 states, 13 events, ~30 transitions**

This is the **single source of truth** for legal state transitions. The xstate machine, Mermaid diagram, and runtime validation all derive from this table.

```mermaid
stateDiagram-v2
  direction TB
  [*] --> ankiOnly_neverImported
  ankiOnly_neverImported["ankiOnly.neverImported"]
  ankiOnly_fileDeleted["ankiOnly.fileDeleted"]
  synced_clean["synced.clean"]
  synced_ankiNewer["synced.ankiNewer"]
  synced_vaultNewer["synced.vaultNewer"]
  synced_diverged["synced.diverged"]
  linked_unenrolled["linked.unenrolled"]
  vaultOnly_unexported["vaultOnly.unexported"]
  vaultOnly_unenrolled["vaultOnly.unenrolled"]
  vaultOnly_ankiDeleted["vaultOnly.ankiDeleted"]
  orphaned["orphaned"]
  ankiOnly_neverImported --> synced_clean: IMPORT
  ankiOnly_neverImported --> ankiOnly_neverImported: SKIP
  ankiOnly_fileDeleted --> synced_ankiNewer: RESURRECT
  ankiOnly_fileDeleted --> orphaned: PURGE
  synced_clean --> synced_clean: CHECK
  synced_ankiNewer --> synced_clean: PULL
  synced_ankiNewer --> synced_clean: FORCE_PUSH
  synced_vaultNewer --> synced_clean: PUSH
  synced_vaultNewer --> synced_clean: FORCE_PULL
  synced_vaultNewer --> synced_clean: RESOLVE_NEWEST
  synced_diverged --> synced_clean: FORCE_PULL
  synced_diverged --> synced_clean: FORCE_PUSH
  synced_diverged --> synced_clean: RESOLVE_NEWEST
  linked_unenrolled --> synced_clean: ENROLL
  vaultOnly_unexported --> synced_clean: EXPORT
  vaultOnly_unenrolled --> synced_clean: ENROLL
  vaultOnly_ankiDeleted --> orphaned: DELETE_FILE
  vaultOnly_ankiDeleted --> synced_clean: EXPORT
  orphaned --> orphaned: PURGE
```

## 2. Decision Tables — Command Policies

**Location:** `src/services/notes/decision-table.ts:33-255`  
**3 commands × 11 states = 33 rows**

This is the **second independent authority**. It defines what each command (import/export/sync) does in each state — which event to emit, whether force changes it, who owns the decision, and why.

### 1. Export Wizard (force: Obsidian wins)

```mermaid
flowchart TB
  subgraph COMMAND[Command]
  direction TB
    Export["Export (Obsidian wins)"]
  end

  subgraph STATES[States]
  direction TB
    ankiOnly_neverImported["ankiOnly.neverImported"]
    ankiOnly_fileDeleted["ankiOnly.fileDeleted"]
    synced_clean["synced.clean"]
    synced_ankiNewer["synced.ankiNewer"]
    synced_vaultNewer["synced.vaultNewer"]
    synced_diverged["synced.diverged"]
    linked_unenrolled["linked.unenrolled"]
    vaultOnly_unexported["vaultOnly.unexported"]
    vaultOnly_unenrolled["vaultOnly.unenrolled"]
    vaultOnly_ankiDeleted["vaultOnly.ankiDeleted"]
    orphaned["orphaned"]
  end

  Export -->|start| START["[*]"]

  Export -->|"—<br/>create · import<br/>Anki only: the import wizard brings it in."| ankiOnly_neverImported
  Export -->|"—<br/>missing · sync<br/>File gone: Sync decides, nothing to push."| ankiOnly_fileDeleted
  Export -->|"CHECK<br/>quiet · sync<br/>Both sides match: nothing to write."| synced_clean
  Export -->|"— / FORCE_PUSH (force)<br/>skip · sync<br/>force: FORCE_PUSH (Obsidian wins)<br/>Newer in Anki: skipped, use Sync. Forced: Obsidian wins: overwrites Anki."| synced_ankiNewer
  synced_ankiNewer -.->|"forced: FORCE_PUSH"| Export
  Export -->|"PUSH<br/>overwrite · export<br/>Newer in Obsidian: pushes to Anki."| synced_vaultNewer
  Export -->|"— / FORCE_PUSH (force)<br/>conflict · sync<br/>force: FORCE_PUSH (Obsidian wins)<br/>Edited in both: skipped, use Sync. Forced: Obsidian wins: overwrites Anki."| synced_diverged
  synced_diverged -.->|"forced: FORCE_PUSH"| Export
  Export -->|"ENROLL<br/>quiet · wizard<br/>Has an id but no record: enrols it, writes nothing."| linked_unenrolled
  Export -->|"EXPORT<br/>create · export<br/>Vault only: creates the Anki note, writes the id back."| vaultOnly_unexported
  Export -->|"ENROLL<br/>quiet · wizard<br/>Has an id but no record: enrols it, writes nothing."| vaultOnly_unenrolled
  Export -->|"— / EXPORT (force)<br/>missing · sync<br/>force: EXPORT (Obsidian wins)<br/>Gone from Anki: Sync applies the deletion. Forced: Obsidian wins: re-creates it in Anki."| vaultOnly_ankiDeleted
  vaultOnly_ankiDeleted -.->|"forced: EXPORT"| Export
  Export -->|"—<br/>missing · purge<br/>Only a stale record left: Purge ledger forgets it."| orphaned

  Export -->|end| END["[*]"]

  classDef cmd fill:#e8eaf6,stroke:#283593,stroke-width:2px,color:#1a237e;
  classDef state fill:#fce4ec,stroke:#ad1457,stroke-width:1px,color:#880e4f;
  class Export cmd;
  class ankiOnly_neverImported state;
  class ankiOnly_fileDeleted state;
  class synced_clean state;
  class synced_ankiNewer state;
  class synced_vaultNewer state;
  class synced_diverged state;
  class linked_unenrolled state;
  class vaultOnly_unexported state;
  class vaultOnly_unenrolled state;
  class vaultOnly_ankiDeleted state;
  class orphaned state;
```

### 2. Import Wizard (force: Anki wins)

```mermaid
flowchart TB
  subgraph COMMAND[Command]
  direction TB
    Import["Import (Anki wins)"]
  end

  subgraph STATES[States]
  direction TB
    ankiOnly_neverImported["ankiOnly.neverImported"]
    ankiOnly_fileDeleted["ankiOnly.fileDeleted"]
    synced_clean["synced.clean"]
    synced_ankiNewer["synced.ankiNewer"]
    synced_vaultNewer["synced.vaultNewer"]
    synced_diverged["synced.diverged"]
    linked_unenrolled["linked.unenrolled"]
    vaultOnly_unexported["vaultOnly.unexported"]
    vaultOnly_unenrolled["vaultOnly.unenrolled"]
    vaultOnly_ankiDeleted["vaultOnly.ankiDeleted"]
    orphaned["orphaned"]
  end

  Import -->|start| START["[*]"]

  Import -->|"IMPORT<br/>create · import<br/>Anki only: creates the file."| ankiOnly_neverImported
  Import -->|"— / RESURRECT (force)<br/>missing · sync<br/>force: RESURRECT (Anki wins)<br/>File gone: Sync decides, Anki wins re-creates it. Forced: Anki wins: re-creates the file you deleted."| ankiOnly_fileDeleted
  ankiOnly_fileDeleted -.->|"forced: RESURRECT"| Import
  Import -->|"CHECK<br/>quiet · sync<br/>Both sides match: rewrites nothing. Forced: Anki wins: rewrites the same content."| synced_clean
  Import -->|"PULL<br/>overwrite · sync<br/>Newer in Anki: overwrites your file."| synced_ankiNewer
  Import -->|"— / FORCE_PULL (force)<br/>skip · sync<br/>force: FORCE_PULL (Anki wins)<br/>Newer in Obsidian: skipped, use Sync. Forced: Anki wins: overwrites your newer edits."| synced_vaultNewer
  synced_vaultNewer -.->|"forced: FORCE_PULL"| Import
  Import -->|"— / FORCE_PULL (force)<br/>conflict · sync<br/>force: FORCE_PULL (Anki wins)<br/>Edited in both: newest wins on Sync. Forced: Anki wins: overwrites your newer edits."| synced_diverged
  synced_diverged -.->|"forced: FORCE_PULL"| Import
  Import -->|"ENROLL<br/>quiet · wizard<br/>Has an id but no record: enrols it, rewrites the same file."| linked_unenrolled
  Import -->|"—<br/>create · export<br/>Vault only: the export wizard creates it."| vaultOnly_unexported
  Import -->|"ENROLL<br/>quiet · wizard<br/>Has an id but no record: enrols it, rewrites the same file."| vaultOnly_unenrolled
  Import -->|"—<br/>missing · sync<br/>Gone from Anki: Sync deletes the file."| vaultOnly_ankiDeleted
  Import -->|"—<br/>missing · purge<br/>Only a stale record left: Purge ledger forgets it."| orphaned

  Import -->|end| END["[*]"]

  classDef cmd fill:#e8eaf6,stroke:#283593,stroke-width:2px,color:#1a237e;
  classDef state fill:#fce4ec,stroke:#ad1457,stroke-width:1px,color:#880e4f;
  class Import cmd;
  class ankiOnly_neverImported state;
  class ankiOnly_fileDeleted state;
  class synced_clean state;
  class synced_ankiNewer state;
  class synced_vaultNewer state;
  class synced_diverged state;
  class linked_unenrolled state;
  class vaultOnly_unexported state;
  class vaultOnly_unenrolled state;
  class vaultOnly_ankiDeleted state;
  class orphaned state;
```

### 3. Sync Command (no force)

```mermaid
flowchart TB
  subgraph COMMAND[Command]
  direction TB
    Sync["Sync (no force)"]
  end

  subgraph STATES[States]
  direction TB
    ankiOnly_neverImported["ankiOnly.neverImported"]
    ankiOnly_fileDeleted["ankiOnly.fileDeleted"]
    synced_clean["synced.clean"]
    synced_ankiNewer["synced.ankiNewer"]
    synced_vaultNewer["synced.vaultNewer"]
    synced_diverged["synced.diverged"]
    linked_unenrolled["linked.unenrolled"]
    vaultOnly_unexported["vaultOnly.unexported"]
    vaultOnly_unenrolled["vaultOnly.unenrolled"]
    vaultOnly_ankiDeleted["vaultOnly.ankiDeleted"]
    orphaned["orphaned"]
  end

  Sync -->|start| START["[*]"]

  Sync -->|"—<br/>create · import<br/>Untracked Anki note: counted as needing import."| ankiOnly_neverImported
  Sync -->|"—<br/>missing · sync<br/>No file: the purge path handles it outside this table, the tombstone rule arrives with OBSID-19."| ankiOnly_fileDeleted
  Sync -->|"CHECK<br/>quiet · sync<br/>Both sides match: nothing to do."| synced_clean
  Sync -->|"PULL<br/>overwrite · sync<br/>Newer in Anki: refreshes the vault file."| synced_ankiNewer
  Sync -->|"PUSH<br/>overwrite · sync<br/>Newer in Obsidian: pushes to Anki."| synced_vaultNewer
  Sync -->|"RESOLVE_NEWEST<br/>conflict · sync<br/>Edited in both: the newer side wins."| synced_diverged
  Sync -->|"—<br/>quiet · wizard<br/>Enrolling is the wizards' job."| linked_unenrolled
  Sync -->|"—<br/>create · export<br/>Vault only: the export wizard creates it."| vaultOnly_unexported
  Sync -->|"—<br/>quiet · wizard<br/>Enrolling is the wizards' job."| vaultOnly_unenrolled
  Sync -->|"—<br/>missing · sync<br/>Gone from Anki: the purge path handles it, DELETE_FILE arrives with OBSID-20."| vaultOnly_ankiDeleted
  Sync -->|"—<br/>missing · purge<br/>Only a stale record left: Purge ledger forgets it."| orphaned

  Sync -->|end| END["[*]"]

  classDef cmd fill:#e8eaf6,stroke:#283593,stroke-width:2px,color:#1a237e;
  classDef state fill:#fce4ec,stroke:#ad1457,stroke-width:1px,color:#880e4f;
  class Sync cmd;
  class ankiOnly_neverImported state;
  class ankiOnly_fileDeleted state;
  class synced_clean state;
  class synced_ankiNewer state;
  class synced_vaultNewer state;
  class synced_diverged state;
  class linked_unenrolled state;
  class vaultOnly_unexported state;
  class vaultOnly_unenrolled state;
  class vaultOnly_ankiDeleted state;
  class orphaned state;
```

#### Decision Table (Markdown) — State-Centric (Transposed)

| State | Import (Anki wins) | Export (Obsidian wins) | Sync (no force) |
|-------|--------------------|------------------------|-----------------|
| `ankiOnly.neverImported` | `—`<br/>create · import<br/>Anki only: the import wizard brings it in. | `IMPORT`<br/>create · import<br/>Anki only: creates the file. | `—`<br/>create · import<br/>Untracked Anki note: counted as needing import. |
| `ankiOnly.fileDeleted` | `—`<br/>missing · sync<br/>File gone: Sync decides, nothing to push. | `—` / `RESURRECT` (force)<br/>missing · sync<br/>**Force:** RESURRECT (Anki wins)<br/>File gone: Sync decides, Anki wins re-creates it. Forced: Anki wins: re-creates the file you deleted. | `—`<br/>missing · sync<br/>No file: the purge path handles it outside this table, the tombstone rule arrives with OBSID-19. |
| `synced.clean` | `CHECK`<br/>quiet · sync<br/>Both sides match: nothing to write. | `CHECK`<br/>quiet · sync<br/>Both sides match: rewrites nothing. Forced: Anki wins: rewrites the same content. | `CHECK`<br/>quiet · sync<br/>Both sides match: nothing to do. |
| `synced.ankiNewer` | `—` / `FORCE_PUSH` (force)<br/>skip · sync<br/>**Force:** FORCE_PUSH (Obsidian wins)<br/>Newer in Anki: skipped, use Sync. Forced: Obsidian wins: overwrites Anki. | `PULL`<br/>overwrite · sync<br/>Newer in Anki: overwrites your file. | `PULL`<br/>overwrite · sync<br/>Newer in Anki: refreshes the vault file. |
| `synced.vaultNewer` | `PUSH`<br/>overwrite · export<br/>Newer in Obsidian: pushes to Anki. | `—` / `FORCE_PULL` (force)<br/>skip · sync<br/>**Force:** FORCE_PULL (Anki wins)<br/>Newer in Obsidian: skipped, use Sync. Forced: Anki wins: overwrites your newer edits. | `PUSH`<br/>overwrite · sync<br/>Newer in Obsidian: pushes to Anki. |
| `synced.diverged` | `—` / `FORCE_PUSH` (force)<br/>conflict · sync<br/>**Force:** FORCE_PUSH (Obsidian wins)<br/>Edited in both: skipped, use Sync. Forced: Obsidian wins: overwrites Anki. | `—` / `FORCE_PULL` (force)<br/>conflict · sync<br/>**Force:** FORCE_PULL (Anki wins)<br/>Edited in both: newest wins on Sync. Forced: Anki wins: overwrites your newer edits. | `RESOLVE_NEWEST`<br/>conflict · sync<br/>Edited in both: the newer side wins. |
| `linked.unenrolled` | `ENROLL`<br/>quiet · wizard<br/>Has an id but no record: enrols it, writes nothing. | `ENROLL`<br/>quiet · wizard<br/>Has an id but no record: enrols it, rewrites the same file. | `—`<br/>quiet · wizard<br/>Enrolling is the wizards' job. |
| `vaultOnly.unexported` | `EXPORT`<br/>create · export<br/>Vault only: creates the Anki note, writes the id back. | `—`<br/>create · export<br/>Vault only: the export wizard creates it. | `—`<br/>create · export<br/>Vault only: the export wizard creates it. |
| `vaultOnly.unenrolled` | `ENROLL`<br/>quiet · wizard<br/>Has an id but no record: enrols it, writes nothing. | `ENROLL`<br/>quiet · wizard<br/>Has an id but no record: enrols it, rewrites the same file. | `—`<br/>quiet · wizard<br/>Enrolling is the wizards' job. |
| `vaultOnly.ankiDeleted` | `—` / `EXPORT` (force)<br/>missing · sync<br/>**Force:** EXPORT (Obsidian wins)<br/>Gone from Anki: Sync applies the deletion. Forced: Obsidian wins: re-creates it in Anki. | `—`<br/>missing · sync<br/>Gone from Anki: Sync deletes the file. | `—`<br/>missing · sync<br/>Gone from Anki: the purge path handles it, DELETE_FILE arrives with OBSID-20. |
| `orphaned` | `—`<br/>missing · purge<br/>Only a stale record left: Purge ledger forgets it. | `—`<br/>missing · purge<br/>Only a stale record left: Purge ledger forgets it. | `—`<br/>missing · purge<br/>Only a stale record left: Purge ledger forgets it. |

<details>
<summary>Command-Centric Tables (per command)</summary>

### export (force: Obsidian wins)

| state | kind | default | forced | owner | why |
| --- | --- | --- | --- | --- | --- |
| `ankiOnly.neverImported` | `create` | `—` | `—` | `import` | Anki only: the import wizard brings it in. |
| `ankiOnly.fileDeleted` | `missing` | `—` | `—` | `sync` | File gone: Sync decides, nothing to push. |
| `synced.clean` | `quiet` | `CHECK` | `—` | `sync` | Both sides match: nothing to write. |
| `synced.ankiNewer` | `skip` | `—` | `FORCE_PUSH` | `sync` | Newer in Anki: skipped, use Sync. Forced: Obsidian wins: overwrites Anki. |
| `synced.vaultNewer` | `overwrite` | `PUSH` | `—` | `export` | Newer in Obsidian: pushes to Anki. |
| `synced.diverged` | `conflict` | `—` | `FORCE_PUSH` | `sync` | Edited in both: skipped, use Sync. Forced: Obsidian wins: overwrites Anki. |
| `linked.unenrolled` | `quiet` | `ENROLL` | `—` | `wizard` | Has an id but no record: enrols it, writes nothing. |
| `vaultOnly.unexported` | `create` | `EXPORT` | `—` | `export` | Vault only: creates the Anki note, writes the id back. |
| `vaultOnly.unenrolled` | `quiet` | `ENROLL` | `—` | `wizard` | Has an id but no record: enrols it, writes nothing. |
| `vaultOnly.ankiDeleted` | `missing` | `—` | `EXPORT` | `sync` | Gone from Anki: Sync applies the deletion. Forced: Obsidian wins: re-creates it in Anki. |
| `orphaned` | `missing` | `—` | `—` | `purge` | Only a stale record left: Purge ledger forgets it. |

### import (force: Anki wins)

| state | kind | default | forced | owner | why |
| --- | --- | --- | --- | --- | --- |
| `ankiOnly.neverImported` | `create` | `IMPORT` | `—` | `import` | Anki only: creates the file. |
| `ankiOnly.fileDeleted` | `missing` | `—` | `RESURRECT` | `sync` | File gone: Sync decides, Anki wins re-creates it. Forced: Anki wins: re-creates the file you deleted. |
| `synced.clean` | `quiet` | `CHECK` | `—` | `sync` | Both sides match: rewrites nothing. Forced: Anki wins: rewrites the same content. |
| `synced.ankiNewer` | `overwrite` | `PULL` | `—` | `sync` | Newer in Anki: overwrites your file. |
| `synced.vaultNewer` | `skip` | `—` | `FORCE_PULL` | `sync` | Newer in Obsidian: skipped, use Sync. Forced: Anki wins: overwrites your newer edits. |
| `synced.diverged` | `conflict` | `—` | `FORCE_PULL` | `sync` | Edited in both: newest wins on Sync. Forced: Anki wins: overwrites your newer edits. |
| `linked.unenrolled` | `quiet` | `ENROLL` | `—` | `wizard` | Has an id but no record: enrols it, rewrites the same file. |
| `vaultOnly.unexported` | `create` | `—` | `—` | `export` | Vault only: the export wizard creates it. |
| `vaultOnly.unenrolled` | `quiet` | `ENROLL` | `—` | `wizard` | Has an id but no record: enrols it, rewrites the same file. |
| `vaultOnly.ankiDeleted` | `missing` | `—` | `—` | `sync` | Gone from Anki: Sync deletes the file. |
| `orphaned` | `missing` | `—` | `—` | `purge` | Only a stale record left: Purge ledger forgets it. |

### sync (force: no force)

| state | kind | default | forced | owner | why |
| --- | --- | --- | --- | --- | --- |
| `ankiOnly.neverImported` | `create` | `—` | `—` | `import` | Untracked Anki note: counted as needing import. |
| `ankiOnly.fileDeleted` | `missing` | `—` | `—` | `sync` | No file: the purge path handles it outside this table, the tombstone rule arrives with OBSID-19. |
| `synced.clean` | `quiet` | `CHECK` | `—` | `sync` | Both sides match: nothing to do. |
| `synced.ankiNewer` | `overwrite` | `PULL` | `—` | `sync` | Newer in Anki: refreshes the vault file. |
| `synced.vaultNewer` | `overwrite` | `PUSH` | `—` | `sync` | Newer in Obsidian: pushes to Anki. |
| `synced.diverged` | `conflict` | `RESOLVE_NEWEST` | `—` | `sync` | Edited in both: the newer side wins. |
| `linked.unenrolled` | `quiet` | `—` | `—` | `wizard` | Enrolling is the wizards' job. |
| `vaultOnly.unexported` | `create` | `—` | `—` | `export` | Vault only: the export wizard creates it. |
| `vaultOnly.unenrolled` | `quiet` | `—` | `—` | `wizard` | Enrolling is the wizards' job. |
| `vaultOnly.ankiDeleted` | `missing` | `—` | `—` | `sync` | Gone from Anki: the purge path handles it, DELETE_FILE arrives with OBSID-20. |
| `orphaned` | `missing` | `—` | `—` | `purge` | Only a stale record left: Purge ledger forgets it. |


</details>

---

*Generated by `pnpm run doc:state-machine` from `src/dev/print-state-machine.ts`*
