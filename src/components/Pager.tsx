import { useEffect, useMemo, useState } from "react";

/** Numbered page breaks — no infinite scroll, so a place in the list is keepable. */
export function Pager({
  page,
  totalPages,
  onChange,
}: {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;

  const windowSize = 5;
  let start = Math.max(1, page - Math.floor(windowSize / 2));
  const end = Math.min(totalPages, start + windowSize - 1);
  start = Math.max(1, end - windowSize + 1);
  const pages: number[] = [];
  for (let i = start; i <= end; i++) pages.push(i);

  return (
    <nav className="pager" aria-label="Pagination">
      <button
        type="button"
        className="page-link"
        aria-label="Previous page"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
      >
        ‹
      </button>
      {start > 1 && (
        <button type="button" className="page-link" onClick={() => onChange(1)}>
          1
        </button>
      )}
      {start > 2 && <span className="page-gap">…</span>}
      {pages.map((n) =>
        n === page ? (
          <span key={n} className="page-link on" aria-current="page">
            {n}
          </span>
        ) : (
          <button key={n} type="button" className="page-link" onClick={() => onChange(n)}>
            {n}
          </button>
        ),
      )}
      {end < totalPages - 1 && <span className="page-gap">…</span>}
      {end < totalPages && (
        <button type="button" className="page-link" onClick={() => onChange(totalPages)}>
          {totalPages}
        </button>
      )}
      <button
        type="button"
        className="page-link"
        aria-label="Next page"
        disabled={page >= totalPages}
        onClick={() => onChange(page + 1)}
      >
        ›
      </button>
    </nav>
  );
}

/**
 * Slice a list into pages. Changing page scrolls to the results anchor when one
 * is given — never back to the page hero, which would lose the member's place.
 */
export function usePaged<T>(
  items: T[],
  perPage = 6,
  opts: { scrollTarget?: React.RefObject<HTMLElement | null> } = {},
) {
  const { scrollTarget } = opts;
  const [page, setPage] = useState(1);
  const list = items ?? [];
  const totalPages = Math.max(1, Math.ceil(list.length / perPage));

  useEffect(() => {
    setPage(1);
  }, [list.length, perPage]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const slice = useMemo(() => {
    const start = (page - 1) * perPage;
    return list.slice(start, start + perPage);
  }, [list, page, perPage]);

  const go = (n: number) => {
    const next = Math.min(totalPages, Math.max(1, n));
    setPage(next);
    requestAnimationFrame(() => {
      const el = scrollTarget?.current;
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }
      // No anchor: hold the current vertical context rather than jumping.
      const y = window.scrollY || 0;
      if (y > 120) window.scrollTo({ top: Math.max(80, y - 40), behavior: "smooth" });
    });
  };

  return { page, totalPages, slice, setPage: go, perPage, total: list.length };
}
