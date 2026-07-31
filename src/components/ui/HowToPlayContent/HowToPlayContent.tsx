import { Fragment } from "react";
import { Trans, useTranslation } from "react-i18next";
import styles from "./HowToPlayContent.module.css";
import { HOW_TO_PLAY_SECTIONS } from "./HowToPlayContent.constants";

/**
 * Body of the "How To Play" modal: the rules in two numbered sections, each
 * followed by the shot of the UI it describes.
 *
 * Steps go through `Trans` rather than `t`, because the copy bolds a fragment
 * mid-sentence — which keeps the whole sentence one translatable string
 * instead of three that a translator would have to reassemble.
 */
export const HowToPlayContent = () => {
  const { t } = useTranslation();

  return (
    <div className={styles["how-to-play"]}>
      {HOW_TO_PLAY_SECTIONS.map(({ titleKey, stepKeys, image }) => (
        <Fragment key={titleKey}>
          <section className={styles["how-to-play__block"]}>
            <h2 className={styles["how-to-play__title"]}>{t(titleKey)}</h2>

            <ol className={styles["how-to-play__steps"]}>
              {stepKeys.map((key) => (
                <li key={key}>
                  {/* One element, so the step stays a single grid cell — a
                      bare `Trans` spreads its words across the columns. */}
                  <span>
                    <Trans i18nKey={key} components={{ b: <b /> }} />
                  </span>
                </li>
              ))}
            </ol>
          </section>

          <img
            className={styles["how-to-play__image"]}
            src={image.src}
            width={image.width}
            height={image.height}
            alt={t(image.altKey)}
          />
        </Fragment>
      ))}
    </div>
  );
};
