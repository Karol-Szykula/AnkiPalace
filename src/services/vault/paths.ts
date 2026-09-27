/**
 * Where a note's file belongs, and what to call it when that name is taken.
 *
 * The three callers (import, media, the deck-to-vault mapping) all need the
 * same thing: take a name, and if something already answers to it, add a
 * number. They differed only in what they considered "taken", so that is the
 * one thing the caller still decides.
 */

/**
 * A name is free when nothing holds it here and the vault has no such file.
 * The check is a predicate because "occupied" means something different to each
 * caller: media only cares about names taken in this run, a note's file is
 * free again if what sits there is that same note. Deciding that means
 * reading the file, so the check may be async.
 */
export type OccupiedCheck = (candidate: string) => boolean | Promise<boolean>;

export async function uniquePath(
  folder: string,
  fileName: string,
  takenPaths: Set<string>,
  isOccupied: OccupiedCheck,
): Promise<string> {
  const { stem, extension } = splitFileName(fileName);
  const base = folder ? `${folder}/${stem}${extension}` : `${stem}${extension}`;
  let candidate = base;
  let suffix = 0;
  while (takenPaths.has(candidate) || (await isOccupied(candidate))) {
    suffix += 1;
    candidate = folder
      ? `${folder}/${stem}-${suffix}${extension}`
      : `${stem}-${suffix}${extension}`;
  }
  takenPaths.add(candidate);
  return candidate;
}

function splitFileName(fileName: string): {
  extension: string;
  stem: string;
} {
  const dot = fileName.lastIndexOf(".");
  if (dot <= 0) {
    return { extension: "", stem: fileName };
  }
  return { extension: fileName.slice(dot), stem: fileName.slice(0, dot) };
}

export function parentFolderOf(filePath: string): string {
  const slash = filePath.lastIndexOf("/");
  return slash < 0 ? "" : filePath.slice(0, slash);
}

/** A deck's `Parent::Child` chain is a nested vault folder. */
export function deckFolder(deckName: string, targetFolder: string): string {
  const deckPath = deckName.split("::").join("/");
  return targetFolder ? `${targetFolder}/${deckPath}` : deckPath;
}
