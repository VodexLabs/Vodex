/** PostgREST / cache errors where the table exists but API metadata is stale. */
export function isPostgrestSchemaOrMissingTableError(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes("schema cache") ||
    m.includes("could not find the table") ||
    (m.includes("relation") && m.includes("does not exist"))
  );
}
