export const commonWizardClasses = {
  pageView: "flashcards-note-transfer-wizard-modal__page-view",
} as const;

export const noteTransferWizardClasses = {
  modal: "flashcards-note-transfer-wizard-modal",
} as const;

export const pageIndicatorClasses = {
  pageIndicator: "flashcards-note-transfer-wizard-modal__page-indicator",
  page: "flashcards-note-transfer-wizard-modal__page",
  pageNumber: "flashcards-note-transfer-wizard-modal__page-number",
  pageActive: "flashcards-note-transfer-wizard-modal__page--active",
  pageDone: "flashcards-note-transfer-wizard-modal__page--done",
  pageSeparator: "flashcards-note-transfer-wizard-modal__page-separator",
} as const;

export const footerClasses = {
  footer: "flashcards-note-transfer-wizard-modal__footer",
  footerRight: "flashcards-note-transfer-wizard-modal__footer-right",
  footerCenter: "flashcards-note-transfer-wizard-modal__footer-center",
  pageIndicator: "flashcards-note-transfer-wizard-modal__footer-page-indicator",
} as const;

export const scopeSelectionClasses = {
  scopeLabelText: "flashcards-note-transfer-wizard-modal__scope-label-text",
  scopeRadio: "flashcards-note-transfer-wizard-modal__scope-radio",
  scopeRow: "flashcards-note-transfer-wizard-modal__scope-row",
  scopeRowDisabled:
    "flashcards-note-transfer-wizard-modal__scope-row--disabled",
} as const;

export const transferFieldMappingClasses = {
  modelSection: "flashcards-note-transfer-wizard-modal__model-section",
  modelRecognized:
    "flashcards-note-transfer-wizard-modal__model-badge--recognized",
  fieldRow: "flashcards-note-transfer-wizard-modal__field-row",
  fieldSample: "flashcards-note-transfer-wizard-modal__field-sample",
} as const;

export const transferNotesPreviewClasses = {
  previewRow: "flashcards-note-transfer-wizard-modal__preview-row",
  previewRowImported:
    "flashcards-note-transfer-wizard-modal__preview-row--imported",
  previewBadge: "flashcards-note-transfer-wizard-modal__preview-badge",
  previewBadgeNew: "flashcards-note-transfer-wizard-modal__preview-badge--new",
  previewBadgeImported:
    "flashcards-note-transfer-wizard-modal__preview-badge--imported",
  previewBadgeOverwrite:
    "flashcards-note-transfer-wizard-modal__preview-badge--overwrite",
  previewBadgeSkipped:
    "flashcards-note-transfer-wizard-modal__preview-badge--skipped",
  previewPagination:
    "flashcards-note-transfer-wizard-modal__preview-pagination",
  noticeText: "flashcards-note-transfer-wizard-modal__preview-notice",
} as const;
