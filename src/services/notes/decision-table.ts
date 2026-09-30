import type {
  NoteLifecycleEvent,
  NoteLifecycleStatus,
} from "src/services/notes/lifecycle";
import { NOTE_LIFECYCLE_STATUSES } from "src/services/notes/lifecycle";

export const OUT_OF_SCOPE = "OUT_OF_SCOPE";

export const SYNC_COMMANDS = ["export", "import", "sync"] as const;

export type SyncCommand = (typeof SYNC_COMMANDS)[number];

type SyncCommandOwner = SyncCommand | "purge" | "wizard";

export type SyncDecisionAct = NoteLifecycleEvent | typeof OUT_OF_SCOPE;

export type OutcomeKind =
  "conflict" | "create" | "missing" | "quiet" | "skip" | "overwrite";

export interface SyncDecisionRow {
  act: SyncDecisionAct;
  forcedAct?: SyncDecisionAct;
  forcedOutcome?: string;
  kind: OutcomeKind;
  owner: SyncCommandOwner;
  rationale: string;
}

const enrolsSameFile =
  "Has an id but no record: enrols it, rewrites the same file.";

const staleRecord = "Only a stale record left: Purge ledger forgets it.";

const decisions: Record<
  SyncCommand,
  Record<NoteLifecycleStatus, SyncDecisionRow>
> = {
  import: {
    "ankiOnly.neverImported": {
      act: "IMPORT",
      kind: "create",
      owner: "import",
      rationale: "Anki only: creates the file.",
    },
    "ankiOnly.fileDeleted": {
      act: OUT_OF_SCOPE,
      forcedAct: "RESURRECT",
      forcedOutcome: "Anki wins: re-creates the file you deleted.",
      kind: "missing",
      owner: "sync",
      rationale: "File gone: Sync decides, Anki wins re-creates it.",
    },
    "synced.clean": {
      act: "CHECK",
      forcedOutcome: "Anki wins: rewrites the same content.",
      kind: "quiet",
      owner: "sync",
      rationale: "Both sides match: rewrites nothing.",
    },
    "synced.ankiNewer": {
      act: "PULL",
      kind: "overwrite",
      owner: "sync",
      rationale: "Newer in Anki: overwrites your file.",
    },
    "synced.vaultNewer": {
      act: OUT_OF_SCOPE,
      forcedAct: "FORCE_PULL",
      forcedOutcome: "Anki wins: overwrites your newer edits.",
      kind: "skip",
      owner: "sync",
      rationale: "Newer in Obsidian: skipped, use Sync.",
    },
    "synced.diverged": {
      act: OUT_OF_SCOPE,
      forcedAct: "FORCE_PULL",
      forcedOutcome: "Anki wins: overwrites your newer edits.",
      kind: "conflict",
      owner: "sync",
      rationale: "Edited in both: newest wins on Sync.",
    },
    "linked.unenrolled": {
      act: "ENROLL",
      kind: "quiet",
      owner: "wizard",
      rationale: enrolsSameFile,
    },
    "vaultOnly.unexported": {
      act: OUT_OF_SCOPE,
      kind: "create",
      owner: "export",
      rationale: "Vault only: the export wizard creates it.",
    },
    "vaultOnly.unenrolled": {
      act: "ENROLL",
      kind: "quiet",
      owner: "wizard",
      rationale: enrolsSameFile,
    },
    "vaultOnly.ankiDeleted": {
      act: OUT_OF_SCOPE,
      kind: "missing",
      owner: "sync",
      rationale: "Gone from Anki: Sync deletes the file.",
    },
    orphaned: {
      act: OUT_OF_SCOPE,
      kind: "missing",
      owner: "purge",
      rationale: staleRecord,
    },
  },
  export: {
    "ankiOnly.neverImported": {
      act: OUT_OF_SCOPE,
      kind: "create",
      owner: "import",
      rationale: "Anki only: the import wizard brings it in.",
    },
    "ankiOnly.fileDeleted": {
      act: OUT_OF_SCOPE,
      kind: "missing",
      owner: "sync",
      rationale: "File gone: Sync decides, nothing to push.",
    },
    "synced.clean": {
      act: "CHECK",
      kind: "quiet",
      owner: "sync",
      rationale: "Both sides match: nothing to write.",
    },
    "synced.ankiNewer": {
      act: OUT_OF_SCOPE,
      forcedAct: "FORCE_PUSH",
      forcedOutcome: "Obsidian wins: overwrites Anki.",
      kind: "skip",
      owner: "sync",
      rationale: "Newer in Anki: skipped, use Sync.",
    },
    "synced.vaultNewer": {
      act: "PUSH",
      kind: "overwrite",
      owner: "export",
      rationale: "Newer in Obsidian: pushes to Anki.",
    },
    "synced.diverged": {
      act: OUT_OF_SCOPE,
      forcedAct: "FORCE_PUSH",
      forcedOutcome: "Obsidian wins: overwrites Anki.",
      kind: "conflict",
      owner: "sync",
      rationale: "Edited in both: skipped, use Sync.",
    },
    "linked.unenrolled": {
      act: "ENROLL",
      kind: "quiet",
      owner: "wizard",
      rationale: "Has an id but no record: enrols it, writes nothing.",
    },
    "vaultOnly.unexported": {
      act: "EXPORT",
      kind: "create",
      owner: "export",
      rationale: "Vault only: creates the Anki note, writes the id back.",
    },
    "vaultOnly.unenrolled": {
      act: "ENROLL",
      kind: "quiet",
      owner: "wizard",
      rationale: "Has an id but no record: enrols it, writes nothing.",
    },
    "vaultOnly.ankiDeleted": {
      act: OUT_OF_SCOPE,
      forcedAct: "EXPORT",
      forcedOutcome: "Obsidian wins: re-creates it in Anki.",
      kind: "missing",
      owner: "sync",
      rationale: "Gone from Anki: Sync applies the deletion.",
    },
    orphaned: {
      act: OUT_OF_SCOPE,
      kind: "missing",
      owner: "purge",
      rationale: staleRecord,
    },
  },
  sync: {
    "ankiOnly.neverImported": {
      act: OUT_OF_SCOPE,
      kind: "create",
      owner: "import",
      rationale: "Untracked Anki note: counted as needing import.",
    },
    "ankiOnly.fileDeleted": {
      act: OUT_OF_SCOPE,
      kind: "missing",
      owner: "sync",
      rationale:
        "No file: the purge path handles it outside this table, the tombstone rule arrives with OBSID-19.",
    },
    "synced.clean": {
      act: "CHECK",
      kind: "quiet",
      owner: "sync",
      rationale: "Both sides match: nothing to do.",
    },
    "synced.ankiNewer": {
      act: "PULL",
      kind: "overwrite",
      owner: "sync",
      rationale: "Newer in Anki: refreshes the vault file.",
    },
    "synced.vaultNewer": {
      act: "PUSH",
      kind: "overwrite",
      owner: "sync",
      rationale: "Newer in Obsidian: pushes to Anki.",
    },
    "synced.diverged": {
      act: "RESOLVE_NEWEST",
      kind: "conflict",
      owner: "sync",
      rationale: "Edited in both: the newer side wins.",
    },
    "linked.unenrolled": {
      act: OUT_OF_SCOPE,
      kind: "quiet",
      owner: "wizard",
      rationale: "Enrolling is the wizards' job.",
    },
    "vaultOnly.unexported": {
      act: OUT_OF_SCOPE,
      kind: "create",
      owner: "export",
      rationale: "Vault only: the export wizard creates it.",
    },
    "vaultOnly.unenrolled": {
      act: OUT_OF_SCOPE,
      kind: "quiet",
      owner: "wizard",
      rationale: "Enrolling is the wizards' job.",
    },
    "vaultOnly.ankiDeleted": {
      act: OUT_OF_SCOPE,
      kind: "missing",
      owner: "sync",
      rationale:
        "Gone from Anki: the purge path handles it, DELETE_FILE arrives with OBSID-20.",
    },
    orphaned: {
      act: OUT_OF_SCOPE,
      kind: "missing",
      owner: "purge",
      rationale: staleRecord,
    },
  },
};

export function isInScope(act: SyncDecisionAct): act is NoteLifecycleEvent {
  return act !== OUT_OF_SCOPE;
}

export function syncDecisionFor(
  command: SyncCommand,
  status: NoteLifecycleStatus,
): SyncDecisionRow {
  return decisions[command][status];
}

export function decisionActFor(
  command: SyncCommand,
  status: NoteLifecycleStatus,
  isForced = false,
): SyncDecisionAct {
  const row = decisions[command][status];
  if (isForced && row.forcedAct !== undefined) {
    return row.forcedAct;
  }
  return row.act;
}

const forceLabels: Record<SyncCommand, string> = {
  export: "Obsidian wins",
  import: "Anki wins",
  sync: "no force",
};

function whyOf(row: SyncDecisionRow): string {
  return row.forcedOutcome === undefined
    ? row.rationale
    : `${row.rationale} Forced: ${row.forcedOutcome}`;
}

export function syncDecisionTableMarkdown(): string {
  const header = [
    "| State | Import (Anki wins) | Export (Obsidian wins) | Sync (no force) |",
    "|-------|--------------------|------------------------|-----------------|",
  ];

  const rows = NOTE_LIFECYCLE_STATUSES.map((status) => {
    const cells = SYNC_COMMANDS.map((command) => {
      const row = decisions[command][status];
      const defaultStr = row.act === OUT_OF_SCOPE ? "—" : row.act;
      const forcedStr = row.forcedAct ?? "—";
      const kind = row.kind;
      const owner = row.owner;
      const forcedInfo =
        row.forcedAct !== undefined
          ? `<br/>**Force:** ${row.forcedAct} (${forceLabels[command]})`
          : "";
      const rationale = whyOf(row).replace(/\n/g, " ");
      const defaultPart = `\`${defaultStr}\``;
      const forcePart = forcedStr !== "—" ? ` / \`${forcedStr}\` (force)` : "";
      return `${defaultPart}${forcePart}<br/>${kind} · ${owner}${forcedInfo}<br/>${rationale}`;
    });
    return `| \`${status}\` | ${cells.join(" | ")} |`;
  });

  return [...header, ...rows].join("\n");
}

function statusId(status: string): string {
  return status.replace(".", "_");
}

function cmdNode(command: string): string {
  return command.charAt(0).toUpperCase() + command.slice(1);
}

function rowLabel(row: SyncDecisionRow): string {
  const defaultAct = row.act === OUT_OF_SCOPE ? "—" : row.act;
  const forcedAct = row.forcedAct ?? "—";
  const label = `def:${defaultAct}\\nforce:${forcedAct}\\nkind:${row.kind}\\nowner:${row.owner}`;
  return label.replace(/\[/g, "&#91;").replace(/\]/g, "&#93;");
}

function buildCommandSubgraph(lines: string[]): void {
  lines.push("  subgraph Commands");
  lines.push("    direction TB");
  lines.push('    Import["Import (Anki wins)"]');
  lines.push('    Export["Export (Obsidian wins)"]');
  lines.push('    Sync["Sync (no force)"]');
  lines.push("  end");
  lines.push("");
}

function buildStatesSubgraph(lines: string[]): void {
  lines.push("  subgraph States");
  lines.push("    direction TB");
  for (const status of NOTE_LIFECYCLE_STATUSES) {
    lines.push(`    ${statusId(status)}["${status}"]`);
  }
  lines.push("  end");
  lines.push("");
}

function buildCommandEdges(lines: string[]): void {
  for (const command of SYNC_COMMANDS) {
    const node = cmdNode(command);
    for (const [status, row] of Object.entries(decisions[command])) {
      const sid = statusId(status);
      const label = rowLabel(row);
      lines.push(`  ${node} -->|${label}| ${sid}`);
      if (row.forcedAct !== undefined) {
        lines.push(`  ${sid} -.->|forced: ${row.forcedAct}| ${node}`);
      }
    }
  }
  lines.push("");
}

function buildClassDefs(lines: string[]): void {
  lines.push("  classDef cmd fill:#e1f5fe,stroke:#01579b,stroke-width:2px;");
  lines.push("  classDef state fill:#f3e5f5,stroke:#4a148c,stroke-width:1px;");
  lines.push("  class Import,Export,Sync cmd;");
  for (const status of NOTE_LIFECYCLE_STATUSES) {
    lines.push(`  class ${statusId(status)} state;`);
  }
}

export function syncDecisionTableMermaid(): string {
  const lines = ["flowchart LR"];
  buildCommandSubgraph(lines);
  buildStatesSubgraph(lines);
  buildCommandEdges(lines);
  buildClassDefs(lines);
  return lines.join("\n");
}
