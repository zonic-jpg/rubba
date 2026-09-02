import { useCallback, useEffect, useRef } from "react";

/**
 * Accessible image lightbox for Value Zone grids.
 *
 * Behaviour that matters when browsing a long results list:
 * - Opening locks the page without moving it, and closing puts the member back
 *   on the exact pixel they were on so they keep their place in the grid.
 * - The scrollbar width is padded back onto <body> while locked, so enlarging a
 *   card never nudges the grid sideways.
 * - Esc closes, ← / → step through the visible results, focus is trapped inside
 *   the dialog and handed back to the card that opened it.
 */
type LightboxProps<T> = {
  /** The list currently on screen, so arrows walk the same results. */
  items: T[];
  /** Active item index; null (or out of range) means closed. */
  index: number | null;
  onClose: () => void;
  onIndexChange: (index: number) => void;
  resolveImage: (item: T) => string | undefined;
  resolveLabel: (item: T) => string;
  renderMeta?: (item: T) => React.ReactNode;
  onPrimaryAction?: (item: T) => void;
  primaryActionLabel?: string;
};

export default function Lightbox<T>({
  items,
  index,
  onClose,
  onIndexChange,
  resolveImage,
  resolveLabel,
  renderMeta,
  onPrimaryAction,
  primaryActionLabel = "View details",
}: LightboxProps<T>) {
  const open = index != null && index >= 0 && index < items.length;
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const restoreFocusRef = useRef<Element | null>(null);
  const scrollYRef = useRef(0);

  const total = items.length;
  const item = open ? items[index as number] : null;

  const step = useCallback(
    (delta: number) => {
      if (!total || index == null) return;
      onIndexChange((index + delta + total) % total);
    },
    [index, total, onIndexChange],
  );

  // Remember the trigger so focus can go back to it, then move focus in.
  useEffect(() => {
    if (!open) return;
    restoreFocusRef.current = document.activeElement;
    const t = requestAnimationFrame(() => closeRef.current?.focus());
    return () => cancelAnimationFrame(t);
  }, [open]);

  // Freeze the page in place, pad the missing scrollbar, then restore exactly.
  useEffect(() => {
    if (!open) return;
    const body = document.body;
    const prevOverflow = body.style.overflow;
    const prevPadding = body.style.paddingRight;
    const gutter = window.innerWidth - document.documentElement.clientWidth;

    scrollYRef.current = window.scrollY || window.pageYOffset || 0;
    body.style.overflow = "hidden";
    if (gutter > 0) body.style.paddingRight = `${gutter}px`;

    return () => {
      const y = scrollYRef.current;
      body.style.overflow = prevOverflow;
      body.style.paddingRight = prevPadding;
      // Some browsers drop scrollTop while overflow is hidden — put it back
      // without animating so the member never sees a jump to the hero.
      window.scrollTo({ top: y, left: 0, behavior: "instant" as ScrollBehavior });
      const el = restoreFocusRef.current as HTMLElement | null;
      if (el && typeof el.focus === "function") el.focus({ preventScroll: true });
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        step(1);
        return;
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        step(-1);
        return;
      }
      if (e.key !== "Tab") return;
      const focusables = dialogRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (!focusables?.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose, step]);

  if (!open || !item) return null;

  const src = resolveImage(item);
  const label = resolveLabel(item);

  return (
    <div
      className="lb-backdrop"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="lb-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={`${label} — enlarged view, ${(index as number) + 1} of ${total}`}
        ref={dialogRef}
      >
        <div className="lb-bar">
          <span className="lb-count" aria-live="polite">
            {(index as number) + 1} of {total}
          </span>
          <button
            type="button"
            className="lb-close"
            onClick={onClose}
            ref={closeRef}
            aria-label="Close enlarged view and return to results"
          >
            Close ✕
          </button>
        </div>

        <div className="lb-stage">
          {total > 1 && (
            <button type="button" className="lb-nav lb-prev" onClick={() => step(-1)} aria-label="Previous result">
              ‹
            </button>
          )}
          {src ? (
            <img className="lb-img" src={src} alt={label} />
          ) : (
            <p className="lb-noimg">No picture for this one yet.</p>
          )}
          {total > 1 && (
            <button type="button" className="lb-nav lb-next" onClick={() => step(1)} aria-label="Next result">
              ›
            </button>
          )}
        </div>

        <div className="lb-meta">
          {renderMeta ? renderMeta(item) : <strong>{label}</strong>}
          {onPrimaryAction && (
            <button type="button" className="lb-action" onClick={() => onPrimaryAction(item)}>
              {primaryActionLabel}
            </button>
          )}
        </div>
        <p className="lb-hint">Esc closes · ← → move between results</p>
      </div>
    </div>
  );
}
