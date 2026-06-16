/**
 * IndexedDB cache for processed session data.
 *
 * Stores the RESULT of processSessionData (400–600 sessions with buckets),
 * not the raw 52 MB EMS payload — so cache reads are fast and storage is small.
 *
 * Schema:  objectStore "sessions", key = "sessions_v2_<userId>"
 * Entry:   { data: Session[], timestamp: number }
 * TTL:     45 minutes
 */

const DB_NAME = "hubcharge_cache";
const DB_VERSION = 1;
const STORE = "sessions";
const CACHE_VERSION = "v2"; // bump when processSessionData output shape changes
const TTL_MS = 4 * 60 * 60 * 1000; // 4 hours

let _db = null; // singleton — one open connection per page load

function openDb() {
  if (_db) return Promise.resolve(_db);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => e.target.result.createObjectStore(STORE);
    req.onsuccess = (e) => { _db = e.target.result; resolve(_db); };
    req.onerror = (e) => reject(e.target.error);
  });
}

function cacheKey(userId) {
  return `sessions_${CACHE_VERSION}_${userId || "anon"}`;
}

/** Read cached processed sessions. Returns null on miss or expiry. */
export async function getCachedSessions(userId) {
  try {
    const db = await openDb();
    const key = cacheKey(userId);
    return new Promise((resolve) => {
      const req = db.transaction(STORE, "readonly").objectStore(STORE).get(key);
      req.onsuccess = () => {
        const entry = req.result;
        if (!entry || Date.now() - entry.timestamp > TTL_MS) return resolve(null);
        resolve(entry.data);
      };
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

/** Write processed sessions to the cache (fire-and-forget). */
export async function setCachedSessions(userId, data) {
  try {
    const db = await openDb();
    const key = cacheKey(userId);
    return new Promise((resolve) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put({ data, timestamp: Date.now() }, key);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    });
  } catch {
    return false;
  }
}

/** Remove the cache entry for a user (called on manual refresh). */
export async function clearSessionCache(userId) {
  try {
    const db = await openDb();
    const key = cacheKey(userId);
    return new Promise((resolve) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).delete(key);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    });
  } catch {
    return false;
  }
}
