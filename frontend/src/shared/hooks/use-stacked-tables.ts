import { useEffect, type RefObject } from 'react';

/**
 * Phones show `.vt-stack` tables as one card per row (see globals.css). Each cell
 * gets its column name as `data-label` so the card can print "Status · Confirmed".
 * One observer per layout keeps labels right as rows load or change.
 */
export function useStackedTables(root: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    let frame = 0;
    const label = () => {
      frame = 0;
      el.querySelectorAll<HTMLTableElement>('.vt-stack table').forEach((table) => {
        const heads = Array.from(table.querySelectorAll('thead th')).map((th) => th.textContent?.trim() ?? '');
        table.querySelectorAll<HTMLTableRowElement>('tbody tr').forEach((tr) => {
          let col = 0;
          for (const td of Array.from(tr.cells)) {
            const want = td.colSpan > 1 ? '' : (heads[col] ?? '');
            if (td.getAttribute('data-label') !== want) td.setAttribute('data-label', want);
            col += td.colSpan || 1;
          }
        });
      });
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(label);
    };
    schedule();
    const mo = new MutationObserver(schedule);
    mo.observe(el, { childList: true, subtree: true });
    return () => {
      mo.disconnect();
      if (frame) cancelAnimationFrame(frame);
    };
  }, [root]);
}
