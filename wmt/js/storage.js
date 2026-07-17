/**
 * In-memory only — no cookies, no localStorage, no disk cache.
 * Settings and layout last only while this browser tab is open.
 * Closing the tab clears everything; next visit starts fresh.
 */
const Storage = (() => {
  const PREFIX = "wmt_mem_";
  /** Session RAM only (not written to the device) */
  const mem = Object.create(null);

  function get(key, fallback = null) {
    if (!Object.prototype.hasOwnProperty.call(mem, PREFIX + key)) return fallback;
    try {
      return JSON.parse(JSON.stringify(mem[PREFIX + key]));
    } catch {
      return fallback;
    }
  }

  function set(key, value) {
    try {
      mem[PREFIX + key] = JSON.parse(JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  }

  function remove(key) {
    delete mem[PREFIX + key];
  }

  function clearAll() {
    Object.keys(mem).forEach((k) => {
      if (k.startsWith(PREFIX)) delete mem[k];
    });
  }

  /**
   * Feed cache disabled for privacy — always miss so sources stay live-first.
   * In-page feed state still lives in the Feeds module (RAM for this visit only).
   */
  function cacheGet(/* feedId, maxAgeMs */) {
    return null;
  }

  function cacheSet(/* feedId, data */) {
    /* no-op: do not store feed snapshots on the device */
  }

  /** One-time wipe of any older WMT localStorage from previous versions */
  function wipeLegacyDisk() {
    try {
      if (typeof localStorage === "undefined") return;
      const doomed = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && (k.startsWith("wmt_") || k.includes("wmt_v"))) doomed.push(k);
      }
      doomed.forEach((k) => localStorage.removeItem(k));
    } catch {
      /* private mode / blocked storage */
    }
    try {
      if (typeof sessionStorage !== "undefined") {
        const doomed = [];
        for (let i = 0; i < sessionStorage.length; i++) {
          const k = sessionStorage.key(i);
          if (k && k.startsWith("wmt_")) doomed.push(k);
        }
        doomed.forEach((k) => sessionStorage.removeItem(k));
      }
    } catch {
      /* ignore */
    }
  }

  wipeLegacyDisk();

  return {
    get,
    set,
    remove,
    clearAll,
    cacheGet,
    cacheSet,
    PREFIX,
    /** true: nothing is saved on the user's disk */
    ephemeral: true,
  };
})();
