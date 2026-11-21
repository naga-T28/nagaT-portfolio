/** Joins items with slashes. The slash stays on the same line as the item before it. */
/** 158 becomes 2:38. */
export const formatTime = (seconds: number): string =>
  `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;

export const joinList = (items: string[]): string => items.join(' / ');
