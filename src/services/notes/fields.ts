import { ankiFieldNames } from "src/conf/constants";
import { mappedFieldValue } from "src/services/notes/text";
import type { AnkiNoteInfo } from "src/entities/anki-note";
import type { FieldMapping } from "src/entities/field-mapping";

/**
 * The four values we can compare and hash: what a note shows on its front, on
 * its back, its tags, and the notetype they belong to. A note has no other
 * content of our own making.
 */
export interface YamlNoteFields {
  back: string;
  front: string;
  tags: string;
}

export function buildYamlNoteFields(
  note: AnkiNoteInfo,
  mapping: FieldMapping,
): YamlNoteFields | null {
  const front = mappedFieldValue(note, mapping, ankiFieldNames.front);
  const back = mappedFieldValue(note, mapping, ankiFieldNames.back);
  const text = mappedFieldValue(note, mapping, ankiFieldNames.text);
  const extra = mappedFieldValue(note, mapping, ankiFieldNames.extra);
  const tags = note.tags.join(" ");
  if (front && back) {
    return { back, front, tags };
  }
  if (text) {
    return { back: extra, front: text, tags };
  }
  if (front) {
    return { back: "", front, tags };
  }
  return null;
}
