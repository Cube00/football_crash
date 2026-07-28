/**
 * A dotted key into the locale files, e.g. `menu.sound`.
 *
 * A plain string on purpose. i18next can type keys against `en.json` by
 * augmenting `CustomTypeOptions`, but its v26 key builder only resolves the
 * default namespace under TypeScript 6 — on TS 5.x every `t("…")` call in the
 * app fails to compile. Editors commonly run their own bundled TypeScript
 * rather than the version pinned here, so that augmentation lights up the whole
 * project red for anyone whose editor is behind.
 *
 * Swap this alias for i18next's `ParseKeys` once TS 6 is the floor everywhere,
 * and every key below becomes checked with no other change.
 */
export type TranslationKey = string;
