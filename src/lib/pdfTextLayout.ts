/** Position-aware PDF text assembly (shared by server extraction and client highlights). */

export type LayoutBox = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export type LayoutTextItem = {
  str: string;
  box: LayoutBox;
  hasEOL?: boolean;
};

export function appendWithSpacing(
  built: string,
  item: LayoutTextItem,
  prev: LayoutTextItem | null,
): string {
  if (!prev) return item.str;
  const hGap = item.box.left - (prev.box.left + prev.box.width);
  const vGap = Math.abs(item.box.top - prev.box.top);
  if (vGap > prev.box.height * 0.5) return `${built}\n${item.str}`;
  if (hGap > prev.box.height * 0.18) return `${built} ${item.str}`;
  return `${built}${item.str}`;
}

/** PDF text items are not always in reading order — sort top-to-bottom, left-to-right. */
export function sortItemsReadingOrder<T extends LayoutTextItem>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const lineThreshold = Math.max(a.box.height, b.box.height) * 0.5;
    if (Math.abs(a.box.top - b.box.top) > lineThreshold) {
      return a.box.top - b.box.top;
    }
    return a.box.left - b.box.left;
  });
}

export function buildPageTextFromItems(items: LayoutTextItem[]): {
  text: string;
  itemRanges: Array<{ itemIndex: number; start: number; end: number }>;
} {
  let text = "";
  const itemRanges: Array<{ itemIndex: number; start: number; end: number }> =
    [];

  for (let i = 0; i < items.length; i++) {
    const start = text.length;
    text = appendWithSpacing(text, items[i]!, i > 0 ? items[i - 1]! : null);
    itemRanges.push({ itemIndex: i, start, end: text.length });
  }

  return { text, itemRanges };
}
