/** Hard caps so dev/webpack caches never serialize giant runtime blobs. */
export const MAX_EVENT_LOG_CHARS = 2048;
export const MAX_DIAGNOSTIC_METADATA_CHARS = 4096;
export const MAX_CLIENT_CACHE_JSON_BYTES = 48_000;
