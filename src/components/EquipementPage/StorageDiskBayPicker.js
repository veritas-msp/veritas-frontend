import React, { useMemo } from "react";
import { Icon } from "@iconify/react";
import { interpolate } from "../../i18n/translate";
import {
  ABSOLUTE_MAX_BAYS,
  MIN_DISK_BAYS,
  buildDiskBayState,
  sanitizeDiskCapacity,
} from "./storageDiskUtils";
import styles from "./StorageDiskBayPicker.module.css";

export default function StorageDiskBayPicker({
  nbDisquesActuels,
  nbDisquesMax,
  disques,
  capacite,
  onChange,
  idPrefix = "storage-disk-bay",
  widgetsCopy = {},
}) {
  const state = useMemo(
    () => buildDiskBayState({ nbDisquesActuels, nbDisquesMax, disques, capacite }),
    [nbDisquesActuels, nbDisquesMax, disques, capacite]
  );

  const minBays = Math.max(MIN_DISK_BAYS, state.activeCount);
  const canRemoveBay = state.maxBays > minBays;
  const canAddBay = state.maxBays < ABSOLUTE_MAX_BAYS;
  const unitGb = widgetsCopy.unitGb || "Go";

  const emitChange = (next) => {
    onChange?.({
      nbDisquesActuels: String(next.activeCount || ""),
      nbDisquesMax: String(next.maxBays || ""),
      disques: next.disques || [],
      capacite: next.capacite ?? "",
    });
  };

  const handleBayClick = (index) => {
    if (index < state.activeCount) {
      emitChange({
        ...state,
        activeCount: index,
        disques: state.disques.slice(0, index),
        capacite: computeTotalCapacity(state.disques.slice(0, index)),
      });
      return;
    }

    const isNext = index === state.activeCount;
    const isRemovableEmptyBay =
      index >= state.activeCount &&
      index === state.maxBays - 1 &&
      state.maxBays > minBays &&
      !isNext;

    if (isRemovableEmptyBay) {
      emitChange({
        ...state,
        maxBays: state.maxBays - 1,
      });
      return;
    }

    if (isNext) {
      const nextDisques = [...state.disques, { capacite: "" }];
      emitChange({
        ...state,
        activeCount: state.activeCount + 1,
        disques: nextDisques,
        capacite: computeTotalCapacity(nextDisques),
      });
    }
  };

  const handleAddBay = () => {
    if (!canAddBay) return;
    emitChange({
      ...state,
      maxBays: state.maxBays + 1,
    });
  };

  const handleRemoveBay = () => {
    if (!canRemoveBay) return;
    emitChange({
      ...state,
      maxBays: state.maxBays - 1,
    });
  };

  const handleDiskCapacityChange = (index, value) => {
    const nextDisques = state.disques.map((disk, diskIndex) =>
      diskIndex === index ? { ...disk, capacite: sanitizeDiskCapacity(value) } : disk
    );
    emitChange({
      ...state,
      disques: nextDisques,
      capacite: computeTotalCapacity(nextDisques),
    });
  };

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <div>
          <span className={styles.label}>{widgetsCopy.title || "Baies de disques"}</span>
          <p className={styles.hint}>
            {widgetsCopy.hint ||
              "Cliquez sur une baie vide pour installer un disque, sur un disque pour le retirer, ou sur une baie vide en bout de ligne pour la supprimer."}
          </p>
        </div>
        <span className={styles.summary}>
          {interpolate(widgetsCopy.installedSummary || "{active} / {max} installés", {
            active: state.activeCount,
            max: state.maxBays,
          })}
        </span>
      </div>

      <div className={styles.bayPanel}>
        <div className={styles.bayGrid} role="group" aria-label={widgetsCopy.title || "Baies de disques"}>
          {Array.from({ length: state.maxBays }, (_, index) => {
            const filled = index < state.activeCount;
            const isNext = index === state.activeCount;
            const isRemovableEmptyBay =
              !filled &&
              index >= state.activeCount &&
              index === state.maxBays - 1 &&
              state.maxBays > minBays &&
              !isNext;
            const buttonClass = [
              styles.bayButton,
              filled ? styles.bayButtonFilled : "",
              !filled && isNext ? styles.bayButtonNext : "",
              isRemovableEmptyBay ? styles.bayButtonRemovable : "",
            ]
              .filter(Boolean)
              .join(" ");

            return (
              <div key={`${idPrefix}-${index}`} className={styles.bayItem}>
                <button
                  type="button"
                  className={buttonClass}
                  onClick={() => handleBayClick(index)}
                  aria-label={
                    filled
                      ? interpolate(widgetsCopy.removeDiskAria || "Retirer le disque {index}", {
                          index: index + 1,
                        })
                      : isRemovableEmptyBay
                        ? interpolate(widgetsCopy.removeBayAria || "Supprimer la baie {index}", {
                            index: index + 1,
                          })
                        : isNext
                          ? interpolate(
                              widgetsCopy.installDiskAria ||
                                "Installer un disque dans la baie {index}",
                              { index: index + 1 }
                            )
                          : interpolate(
                              widgetsCopy.bayUnavailableAria || "Baie {index} indisponible",
                              { index: index + 1 }
                            )
                  }
                  disabled={!filled && !isNext && !isRemovableEmptyBay}
                >
                  <span className={styles.bayIndex}>{index + 1}</span>
                  <Icon
                    icon={
                      filled
                        ? "mdi:harddisk"
                        : isRemovableEmptyBay
                          ? "mdi:minus"
                          : "mdi:harddisk-plus"
                    }
                    width={20}
                    height={20}
                  />
                </button>
                {filled ? (
                  <>
                    <input
                      type="text"
                      inputMode="numeric"
                      className={styles.bayCapacityInput}
                      value={state.disques[index]?.capacite || ""}
                      placeholder={unitGb}
                      aria-label={interpolate(
                        widgetsCopy.diskCapacityAria || "Capacité du disque {index} en Go",
                        { index: index + 1 }
                      )}
                      onChange={(event) => handleDiskCapacityChange(index, event.target.value)}
                      onClick={(event) => event.stopPropagation()}
                    />
                    <span className={styles.bayCapacityLabel}>{unitGb}</span>
                  </>
                ) : (
                  <span className={styles.bayCapacityLabel} aria-hidden>
                    &nbsp;
                  </span>
                )}
              </div>
            );
          })}

          {(canAddBay || canRemoveBay) ? (
            <div className={styles.bayItem}>
              <div className={styles.bayControls}>
                {canRemoveBay ? (
                  <button
                    type="button"
                    className={styles.bayRemoveButton}
                    onClick={handleRemoveBay}
                    aria-label={widgetsCopy.removeBayButtonAria || "Supprimer une baie"}
                    title={widgetsCopy.removeBayButtonAria || "Supprimer une baie"}
                  >
                    <Icon icon="mdi:minus" width={18} height={18} />
                  </button>
                ) : null}
                {canAddBay ? (
                  <button
                    type="button"
                    className={styles.bayAddButton}
                    onClick={handleAddBay}
                    aria-label={widgetsCopy.addBayButtonAria || "Ajouter une baie"}
                    title={widgetsCopy.addBayButtonAria || "Ajouter une baie"}
                  >
                    <Icon icon="mdi:plus" width={18} height={18} />
                  </button>
                ) : null}
              </div>
              <span className={styles.bayCapacityLabel}>
                {widgetsCopy.baysLabel || "Baies"}
              </span>
            </div>
          ) : null}
        </div>

        <div className={styles.legend}>
          <span className={styles.legendItem}>
            <span className={`${styles.legendDot} ${styles.legendDotFilled}`} />
            {widgetsCopy.legendInstalled || "Disque installé"}
          </span>
          <span className={styles.legendItem}>
            <span className={`${styles.legendDot} ${styles.legendDotEmpty}`} />
            {widgetsCopy.legendEmpty || "Baie libre"}
          </span>
        </div>
      </div>
    </div>
  );
}

function computeTotalCapacity(disques) {
  const total = (disques || []).reduce(
    (sum, disk) => sum + (parseInt(disk?.capacite, 10) || 0),
    0
  );
  return total > 0 ? String(total) : "";
}
