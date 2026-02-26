export function createSelectionKey(words: string[]): string {
  return [...words]
    .map(word => word.trim())
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, 'he'))
    .join('|');
}

