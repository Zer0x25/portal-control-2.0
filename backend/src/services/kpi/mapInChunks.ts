export const KPI_LOOKUP_CHUNK_SIZE = 50;

export async function mapInChunks<T, U>(
  items: readonly T[],
  mapper: (item: T) => Promise<U> | U,
  chunkSize = KPI_LOOKUP_CHUNK_SIZE,
): Promise<U[]> {
  if (!Number.isInteger(chunkSize) || chunkSize < 1) {
    throw new RangeError("chunkSize must be a positive integer");
  }

  const results: U[] = [];
  for (let start = 0; start < items.length; start += chunkSize) {
    const chunkResults = await Promise.all(items.slice(start, start + chunkSize).map(mapper));
    results.push(...chunkResults);
    await new Promise<void>((resolve) => setImmediate(resolve));
  }

  return results;
}
