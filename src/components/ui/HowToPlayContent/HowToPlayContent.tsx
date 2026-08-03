import { Fragment } from "react";
import { Trans, useTranslation } from "react-i18next";
import { Toggle } from "../Toggle";
import styles from "./HowToPlayContent.module.css";
import { HOW_TO_PLAY_SECTIONS } from "./HowToPlayContent.constants";
import type { HowToPlayBlock } from "./HowToPlayContent.constants";

/**
 * Body of the "How To Play" modal: the rules in sections, each followed by the
 * shot of the UI it describes.
 *
 * Copy goes through `Trans` rather than `t`, because sentences bold a fragment
 * mid-way — which keeps the whole sentence one translatable string instead of
 * three that a translator would have to reassemble.
 */
export const HowToPlayContent = () => {
  const { t } = useTranslation();

  const renderBlock = (block: HowToPlayBlock, index: number) => {
    switch (block.kind) {
      case "text":
        return (
          <p key={index} className={styles["how-to-play__text"]}>
            <Trans i18nKey={block.key} components={{ b: <b /> }} />
          </p>
        );

      case "label":
        return (
          <span key={index} className={styles["how-to-play__label"]}>
            {t(block.key)}
          </span>
        );

      case "steps":
        return (
          <ol key={index} className={styles["how-to-play__steps"]}>
            {block.keys.map((key) => (
              <li key={key}>
                {/* One element, so the step stays a single grid cell — a
                    bare `Trans` spreads its words across the columns. */}
                <span>
                  <Trans i18nKey={key} components={{ b: <b /> }} />
                </span>
              </li>
            ))}
          </ol>
        );

      case "example":
        return (
          <div key={index} className={styles["how-to-play__example"]}>
            <span className={styles["how-to-play__example-label"]}>
              {t("howToPlay.example.label")}
            </span>
            <ol className={styles["how-to-play__steps"]}>
              {block.keys.map((key) => (
                <li key={key}>
                  <span>
                    <Trans i18nKey={key} components={{ b: <b /> }} />
                  </span>
                </li>
              ))}
            </ol>
          </div>
        );

      case "toggle":
        return (
          <div key={index} className={styles["how-to-play__toggle"]}>
            <span>{t("bet.autoBet")}</span>
            {/* A picture of the control, not the control — the real one lives
                in the bet area. */}
            <Toggle checked={false} readOnly tabIndex={-1} aria-hidden="true" />
          </div>
        );

      case "figure":
        return (
          <img
            key={index}
            className={styles["how-to-play__image"]}
            src={block.src}
            width={block.width}
            height={block.height}
            // Never past its own resolution: a few shots are small crops and
            // stretching them to the design's cap just softens them.
            style={{ maxWidth: Math.min(block.maxWidth, block.width) }}
            alt={t(block.altKey)}
          />
        );

      case "group":
        return (
          <section key={index} className={styles["how-to-play__group"]}>
            <h3 className={styles["how-to-play__subtitle"]}>
              {t(block.titleKey)}
            </h3>
            {block.blocks.map(renderBlock)}
          </section>
        );
    }
  };

  return (
    <div className={styles["how-to-play"]}>
      {HOW_TO_PLAY_SECTIONS.map(({ titleKey, blocks }) => (
        <Fragment key={titleKey}>
          <section className={styles["how-to-play__block"]}>
            <h2 className={styles["how-to-play__title"]}>{t(titleKey)}</h2>
            {blocks.map(renderBlock)}
          </section>
        </Fragment>
      ))}
    </div>
  );
};
