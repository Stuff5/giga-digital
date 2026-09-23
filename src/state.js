/**
 * GameVault - Digital Game Sales & Inventory Tracker
 * Main Application Script (app.js)
 */

(function() {
  const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  if (isDev) {
    // Override both prototypes and instances directly for maximum browser compatibility
    const targets = [Storage.prototype, window.localStorage, window.sessionStorage];
    targets.forEach(target => {
      if (!target) return;
      const originalGetItem = target.getItem;
      const originalSetItem = target.setItem;
      const originalRemoveItem = target.removeItem;

      // Only override if not already overridden
      if (originalGetItem && !originalGetItem.isOverridden) {
        const newGet = function(key) {
          if (key && key.startsWith('gv_')) {
            return originalGetItem.call(this, 'gv_dev_' + key.slice(3));
          }
          return originalGetItem.call(this, key);
        };
        newGet.isOverridden = true;
        target.getItem = newGet;
      }

      if (originalSetItem && !originalSetItem.isOverridden) {
        const newSet = function(key, value) {
          if (key && key.startsWith('gv_')) {
            return originalSetItem.call(this, 'gv_dev_' + key.slice(3), value);
          }
          return originalSetItem.call(this, key, value);
        };
        newSet.isOverridden = true;
        target.setItem = newSet;
      }

      if (originalRemoveItem && !originalRemoveItem.isOverridden) {
        const newRemove = function(key) {
          if (key && key.startsWith('gv_')) {
            return originalRemoveItem.call(this, 'gv_dev_' + key.slice(3));
          }
          return originalRemoveItem.call(this, key);
        };
        newRemove.isOverridden = true;
        target.removeItem = newRemove;
      }
    });
    console.log("GameVault Environment: DEVELOPMENT (LocalStorage virtualized with gv_dev_ prefixes)");
  } else {
    console.log("GameVault Environment: PRODUCTION (LocalStorage using normal gv_ prefixes)");
  }
})();

// Generic debounce helper function
function debounce(func, wait) {
  let timeout;
  return function(...args) {
    const context = this;
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(context, args), wait);
  };
}

// IndexedDB low-level asynchronous storage layer
const indexedDBStorage = (() => {
  const DB_NAME = "GameVaultDB";
  const DB_VERSION = 1;
  const STORE_NAME = "key_value_store";
  let dbPromise = null;

  function getDB() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      try {
        const request = window.indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = (event) => {
          const db = event.target.result;
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.createObjectStore(STORE_NAME);
          }
        };
        request.onsuccess = (event) => {
          resolve(event.target.result);
        };
        request.onerror = (event) => {
          console.error("IndexedDB open error:", event.target.error);
          reject(event.target.error);
        };
      } catch (err) {
        console.error("IndexedDB is not supported or blocked in this environment:", err);
        reject(err);
      }
    });
    return dbPromise;
  }

  return {
    async getItem(key) {
      try {
        const db = await getDB();
        return new Promise((resolve, reject) => {
          const transaction = db.transaction(STORE_NAME, "readonly");
          const store = transaction.objectStore(STORE_NAME);
          const request = store.get(key);
          request.onsuccess = () => resolve(request.result !== undefined ? request.result : null);
          request.onerror = () => reject(request.error);
        });
      } catch (e) {
        return null;
      }
    },
    async setItem(key, value) {
      try {
        const db = await getDB();
        return new Promise((resolve, reject) => {
          const transaction = db.transaction(STORE_NAME, "readwrite");
          const store = transaction.objectStore(STORE_NAME);
          const request = store.put(value, key);
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        });
      } catch (e) {
        console.error("IndexedDB setItem error:", e);
      }
    },
    async removeItem(key) {
      try {
        const db = await getDB();
        return new Promise((resolve, reject) => {
          const transaction = db.transaction(STORE_NAME, "readwrite");
          const store = transaction.objectStore(STORE_NAME);
          const request = store.delete(key);
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        });
      } catch (e) {
        console.error("IndexedDB removeItem error:", e);
      }
    },
    async clear() {
      try {
        const db = await getDB();
        return new Promise((resolve, reject) => {
          const transaction = db.transaction(STORE_NAME, "readwrite");
          const store = transaction.objectStore(STORE_NAME);
          const request = store.clear();
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        });
      } catch (e) {
        console.error("IndexedDB clear error:", e);
      }
    },
    async getAll() {
      try {
        const db = await getDB();
        return new Promise((resolve, reject) => {
          const transaction = db.transaction(STORE_NAME, "readonly");
          const store = transaction.objectStore(STORE_NAME);
          const keysRequest = store.getAllKeys();
          keysRequest.onsuccess = () => {
            const keys = keysRequest.result;
            const valuesRequest = store.getAll();
            valuesRequest.onsuccess = () => {
              const values = valuesRequest.result;
              const result = {};
              keys.forEach((key, index) => {
                result[key] = values[index];
              });
              resolve(result);
            };
            valuesRequest.onerror = () => reject(valuesRequest.error);
          };
          keysRequest.onerror = () => reject(keysRequest.error);
        });
      } catch (e) {
        return {};
      }
    }
  };
})();

// Safe local storage interface wrapper backed by IndexedDB and synchronous memory fallback
const safeStorage = (() => {
  const memoryStore = {};

  return {
    _memoryStore: memoryStore,

    getItem(key) {
      if (Object.prototype.hasOwnProperty.call(memoryStore, key)) {
        return memoryStore[key];
      }
      try {
        const val = window.localStorage.getItem(key);
        if (val !== null) {
          memoryStore[key] = val;
          return val;
        }
      } catch (e) {}
      return null;
    },
    setItem(key, value) {
      const stringValue = String(value);
      memoryStore[key] = stringValue;
      indexedDBStorage.setItem(key, stringValue);
      try {
        window.localStorage.setItem(key, stringValue);
      } catch (e) {}
    },
    removeItem(key) {
      delete memoryStore[key];
      indexedDBStorage.removeItem(key);
      try {
        window.localStorage.removeItem(key);
      } catch (e) {}
    },
    clear() {
      for (const key in memoryStore) {
        delete memoryStore[key];
      }
      indexedDBStorage.clear();
      try {
        window.localStorage.clear();
      } catch (e) {}
    }
  };
})();
window.safeStorage = safeStorage;

// Override localStorage and sessionStorage locally within this script's scope
const localStorage = safeStorage;
const sessionStorage = safeStorage;

// Initializes safeStorage memory cache from IndexedDB and migrates legacy localStorage values
async function initIndexedDBStorage() {
  try {
    const dbData = await indexedDBStorage.getAll();
    const dbKeys = Object.keys(dbData);

    if (dbKeys.length > 0) {
      // IndexedDB has data, populate memoryStore
      dbKeys.forEach(key => {
        safeStorage._memoryStore[key] = dbData[key];
      });
      console.log(`Loaded ${dbKeys.length} items from IndexedDB.`);
    } else {
      // IndexedDB is empty, check for legacy localStorage data to migrate
      let migratedCount = 0;
      try {
        const testKey = "__storage_test__";
        window.localStorage.setItem(testKey, testKey);
        window.localStorage.removeItem(testKey);
        
        // Migrate all keys starting with "gv_"
        for (let i = 0; i < window.localStorage.length; i++) {
          const key = window.localStorage.key(i);
          if (key && key.startsWith("gv_")) {
            const value = window.localStorage.getItem(key);
            safeStorage._memoryStore[key] = value;
            await indexedDBStorage.setItem(key, value);
            migratedCount++;
          }
        }
        if (migratedCount > 0) {
          console.log(`Migrated ${migratedCount} items from localStorage to IndexedDB.`);
        }
      } catch (storageErr) {
        console.warn("localStorage legacy check failed or not accessible:", storageErr);
      }
    }
  } catch (err) {
    console.error("Failed to initialize IndexedDB storage cache:", err);
  }
}

// Global DOM elements cache layer
const DOM = {};

// Global error boundary display for remote environment debugging
window.addEventListener("error", (event) => {
  const errContainer = document.createElement("div");
  errContainer.style.cssText = "position: fixed; top: 10px; left: 10px; right: 10px; background: rgba(220, 53, 69, 0.95); color: white; padding: 15px; border-radius: 8px; z-index: 100000; font-family: monospace; font-size: 12px; border: 1px solid #ff0000; box-shadow: 0 4px 15px rgba(0,0,0,0.3); overflow-wrap: break-word; max-height: 50vh; overflow-y: auto;";
  errContainer.innerHTML = `<strong>[Global Runtime Error]</strong><br>${event.message}<br><small>in ${event.filename} at line ${event.lineno}:${event.colno}</small><pre style="margin-top: 8px; white-space: pre-wrap; font-size: 11px;">${event.error ? event.error.stack : 'No stack trace'}</pre>`;
  document.body.appendChild(errContainer);
});

window.addEventListener("unhandledrejection", (event) => {
  const errContainer = document.createElement("div");
  errContainer.style.cssText = "position: fixed; top: 10px; left: 10px; right: 10px; background: rgba(220, 53, 69, 0.95); color: white; padding: 15px; border-radius: 8px; z-index: 100000; font-family: monospace; font-size: 12px; border: 1px solid #ff0000; box-shadow: 0 4px 15px rgba(0,0,0,0.3); overflow-wrap: break-word; max-height: 50vh; overflow-y: auto;";
  errContainer.innerHTML = `<strong>[Unhandled Promise Rejection]</strong><br>${event.reason}<br><pre style="margin-top: 8px; white-space: pre-wrap; font-size: 11px;">${event.reason && event.reason.stack ? event.reason.stack : 'No stack trace'}</pre>`;
  document.body.appendChild(errContainer);
});

// ==========================================================================
// MOCK INITIAL DATA (For first-load experience)
// ==========================================================================
const MOCK_INVENTORY = [
  {
    id: "inv_1",
    title: "Elden Ring: Shadow of the Erdtree",
    platform: "Steam",
    key: "ELDEN-SOTE-9988-XAAA-FF33",
    cost: 25.00,
    source: "Humble Bundle",
    purchaseDate: "2026-05-10",
    status: "Available",
    notes: "Summer Sale Bundle key."
  },
  {
    id: "inv_2",
    title: "Resident Evil 4 Remake",
    platform: "PlayStation 5",
    key: "RE4R-PS5-KEY-8888-2222",
    cost: 20.00,
    source: "CDKeys",
    purchaseDate: "2026-05-12",
    status: "Available",
    notes: "EU Region locked."
  },
  {
    id: "inv_3",
    title: "Cyberpunk 2077: Phantom Liberty",
    platform: "GOG",
    key: "CP77-PLGOG-9821-2291-0000",
    cost: 15.00,
    source: "Fanatical",
    purchaseDate: "2026-04-05",
    status: "Sold",
    notes: "Sold on Kinguin. Fast transaction."
  },
  {
    id: "inv_4",
    title: "Hades II (Early Access)",
    platform: "Steam",
    key: "HADE-S2SE-8881-2224-BBAA",
    cost: 12.50,
    source: "Humble Bundle",
    purchaseDate: "2026-05-15",
    status: "Available",
    notes: "Global key."
  },
  {
    id: "inv_5",
    title: "The Legend of Zelda: Tears of the Kingdom",
    platform: "Nintendo Switch",
    key: "TOTK-SWIT-1092-2290-7761",
    cost: 35.00,
    source: "CDKeys",
    purchaseDate: "2026-03-20",
    status: "Sold",
    notes: "Sold on eBay. Shipped digitially via messages."
  },
  {
    id: "inv_6",
    title: "Grand Theft Auto V: Premium Edition",
    platform: "Epic Games",
    key: "GTAV-EPIC-KEY-1111-2222-3333",
    cost: 8.00,
    source: "Fanatical",
    purchaseDate: "2026-02-15",
    status: "Sold",
    notes: "Sold on G2A."
  },
  {
    id: "inv_7",
    title: "Diablo IV: Vessel of Hatred",
    platform: "Xbox Series X/S",
    key: "D4VH-XBOX-LIVE-4444-5555",
    cost: 30.00,
    source: "Kinguin Seller",
    purchaseDate: "2026-05-01",
    status: "Reserved",
    notes: "Reserved for Discord buyer 'gmer99'."
  },
  {
    id: "inv_8",
    title: "Minecraft: Java & Bedrock Edition",
    platform: "Steam", // Redeemable via MS but categorized for PC
    key: "MINE-CRAF-TKEY-JAVA-BEDR",
    cost: 10.00,
    source: "Humble Bundle",
    purchaseDate: "2026-03-10",
    status: "Sold",
    notes: "Sold on Kinguin API."
  },
  {
    id: "inv_9",
    title: "Marvel's Spider-Man 2",
    platform: "PlayStation 5",
    key: "SMAN-PS5-9081-3324-4411",
    cost: 38.00,
    source: "GameStop Trade",
    purchaseDate: "2026-01-20",
    status: "Sold",
    notes: "Sold on eBay. High profit."
  },
  {
    id: "inv_10",
    title: "Helldivers 2",
    platform: "Steam",
    key: "HELL-DIVE-RS2P-CKEY-9999",
    cost: 22.00,
    source: "Fanatical",
    purchaseDate: "2026-04-18",
    status: "Sold",
    notes: "Sold via Discord Direct."
  },
  {
    id: "inv_11",
    title: "Red Dead Redemption 2",
    platform: "Steam",
    key: "RDR2-STEA-MKEY-0909-1111",
    cost: 14.00,
    source: "Humble Bundle",
    purchaseDate: "2026-05-02",
    status: "Available",
    notes: "Global key, great demand."
  },
  {
    id: "inv_12",
    title: "Baldur's Gate 3",
    platform: "Steam",
    key: "BG3S-TEAM-GIFT-KEY-8888",
    cost: 28.00,
    source: "CDKeys",
    purchaseDate: "2026-04-20",
    status: "Sold",
    notes: "Sold on G2A."
  }
];

const MOCK_SALES = [
  {
    id: "sale_1",
    inventoryId: "inv_3",
    title: "Cyberpunk 2077: Phantom Liberty",
    platform: "GOG",
    cost: 15.00,
    sellPrice: 28.50,
    platformSold: "Kinguin",
    fees: 0.00,
    profit: 13.50,
    saleDate: "2026-04-12",
    notes: "Kinguin transaction #K-10928."
  },
  {
    id: "sale_2",
    inventoryId: "inv_5",
    title: "The Legend of Zelda: Tears of the Kingdom",
    platform: "Nintendo Switch",
    cost: 35.00,
    sellPrice: 59.99,
    platformSold: "eBay",
    fees: 0.00,
    profit: 24.99,
    saleDate: "2026-04-18",
    notes: "eBay buyer: 'switch_fanatic'."
  },
  {
    id: "sale_3",
    inventoryId: "inv_6",
    title: "Grand Theft Auto V: Premium Edition",
    platform: "Epic Games",
    cost: 8.00,
    sellPrice: 15.99,
    platformSold: "G2A",
    fees: 0.00,
    profit: 7.99,
    saleDate: "2026-03-05",
    notes: "Sold on G2A marketplace."
  },
  {
    id: "sale_4",
    inventoryId: "inv_8",
    title: "Minecraft: Java & Bedrock Edition",
    platform: "Steam",
    cost: 10.00,
    sellPrice: 22.00,
    platformSold: "Kinguin API",
    fees: 0.00,
    profit: 12.00,
    saleDate: "2026-03-25",
    notes: "API Auto-fulfill transaction."
  },
  {
    id: "sale_5",
    inventoryId: "inv_9",
    title: "Marvel's Spider-Man 2",
    platform: "PlayStation 5",
    cost: 38.00,
    sellPrice: 65.00,
    platformSold: "eBay",
    fees: 0.00,
    profit: 27.00,
    saleDate: "2026-02-10",
    notes: "eBay buyer: 'peterparker1'."
  },
  {
    id: "sale_6",
    inventoryId: "inv_10",
    title: "Helldivers 2",
    platform: "Steam",
    cost: 22.00,
    sellPrice: 35.00,
    platformSold: "Discord",
    fees: 0.00,
    profit: 13.00,
    saleDate: "2026-05-22",
    notes: "Sold to user: diver#9012 via Paypal F&F."
  },
  {
    id: "sale_7",
    inventoryId: "inv_12",
    title: "Baldur's Gate 3",
    platform: "Steam",
    cost: 28.00,
    sellPrice: 48.00,
    platformSold: "G2A",
    fees: 0.00,
    profit: 20.00,
    saleDate: "2026-05-05",
    notes: "Sold on G2A store."
  }
];

// Fee Preset Settings
let PLATFORM_FEE_PRESETS = {
  g2a: { name: "G2A", percent: 0.0, fixed: 0.00, desc: "0% fees" },
  kinguin: { name: "Kinguin", percent: 0.0, fixed: 0.00, desc: "0% fees" },
  ebay: { name: "eBay", percent: 0.0, fixed: 0.00, desc: "0% fees" },
  playerauctions: { name: "PlayerAuctions", percent: 0.0, fixed: 0.00, desc: "0% fees" },
  direct: { name: "Discord", percent: 0.0, fixed: 0.00, desc: "0% fees" },
  other: { name: "Other", percent: 0.0, fixed: 0.00, desc: "0% fees" }
};

// Default Suppliers Fallbacks
const DEFAULT_SUPPLIERS = ["Humble Bundle", "Fanatical", "CDKeys", "GameStop", "Direct", "Other"];

// Predefined Premium Color Accents for Suppliers
const SUPPLIER_COLORS = [
  { name: "purple", value: "hsl(270, 85%, 60%)" },
  { name: "pink", value: "hsl(330, 95%, 60%)" },
  { name: "teal", value: "hsl(175, 90%, 48%)" },
  { name: "cyan", value: "hsl(195, 90%, 50%)" },
  { name: "emerald", value: "hsl(145, 80%, 45%)" },
  { name: "gold", value: "hsl(40, 95%, 55%)" },
  { name: "coral", value: "hsl(355, 85%, 55%)" },
  { name: "slate", value: "hsl(220, 15%, 60%)" },
  { name: "indigo", value: "hsl(250, 85%, 65%)" },
  { name: "rose", value: "hsl(345, 90%, 60%)" },
  { name: "amber", value: "hsl(25, 95%, 55%)" },
  { name: "lime", value: "hsl(85, 85%, 50%)" },
  { name: "mint", value: "hsl(150, 80%, 50%)" },
  { name: "sky", value: "hsl(210, 95%, 55%)" },
  { name: "fuchsia", value: "hsl(295, 90%, 60%)" }
];

// Helper to resolve supplier name to default color accent name
function getSupplierColorName(supplierName) {
  const name = (supplierName || "").toLowerCase().trim();
  if (name.includes("humble")) return "purple";
  if (name.includes("fanatical")) return "pink";
  if (name.includes("cdkeys")) return "teal";
  if (name.includes("gamestop")) return "gold";
  if (name.includes("direct")) return "emerald";
  return "slate";
}

// Predefined Known Domains for instant logo auto-resolution
const SUPPLIER_KNOWN_DOMAINS = {
  "humble bundle": "humblebundle.com",
  "humble": "humblebundle.com",
  "humblebundle": "humblebundle.com",
  "fanatical": "fanatical.com",
  "bundle stars": "fanatical.com",
  "cdkeys": "cdkeys.com",
  "cdkeys.com": "cdkeys.com",
  "kinguin": "kinguin.net",
  "king": "kinguin.net",
  "eneba": "eneba.com",
  "gamivo": "gamivo.com",
  "g2a": "g2a.com",
  "gamestop": "gamestop.com",
  "green man gaming": "greenmangaming.com",
  "greenman": "greenmangaming.com",
  "greenmangaming": "greenmangaming.com",
  "gmg": "greenmangaming.com",
  "instant gaming": "instant-gaming.com",
  "instgam": "instant-gaming.com",
  "gamersoutlet": "gamers-outlet.net",
  "gamers outlet": "gamers-outlet.net",
  "difmark": "difmark.com",
  "k4g": "k4g.com",
  "mmoga": "mmoga.com",
  "playasia": "play-asia.com",
  "play asia": "play-asia.com",
  "play-asia": "play-asia.com",
  "steam": "store.steampowered.com",
  "valve": "valvesoftware.com",
  "gog": "gog.com",
  "gog.com": "gog.com",
  "good old games": "gog.com",
  "epic games": "epicgames.com",
  "epic": "epicgames.com",
  "indiegala": "indiegala.com",
  "indie gala": "indiegala.com",
  "voidu": "voidu.com",
  "2game": "2game.com",
  "loaded": "loaded.com",
  "hrk": "hrkgame.com",
  "hrk game": "hrkgame.com",
  "yuplay": "yuplay.com",
  "gamesplanet": "gamesplanet.com",
  "allyouplay": "allyouplay.com",
  "wingamestore": "wingamestore.com",
  "wingame": "wingamestore.com",
  "macgamestore": "macgamestore.com",
  "dlgamer": "dlgamer.com",
  "gamersgate": "gamersgate.com",
  "playstation": "playstation.com",
  "psn": "playstation.com",
  "sony": "playstation.com",
  "xbox": "xbox.com",
  "microsoft": "microsoft.com",
  "nintendo": "nintendo.com",
  "ubisoft": "ubisoft.com",
  "ea": "ea.com",
  "origin": "ea.com",
  "electronic arts": "ea.com",
  "battle.net": "battle.net",
  "battlenet": "battle.net",
  "blizzard": "blizzard.com",
  "amazon": "amazon.com",
  "best buy": "bestbuy.com",
  "bestbuy": "bestbuy.com",
  "target": "target.com",
  "walmart": "walmart.com",
  "ebay": "ebay.com",
  "playerauctions": "playerauctions.com"
};
window.SUPPLIER_KNOWN_DOMAINS = SUPPLIER_KNOWN_DOMAINS;

const PLATFORM_KNOWN_DOMAINS = {
  "steam": "store.steampowered.com",
  "playstation": "playstation.com",
  "playstation 5": "playstation.com",
  "ps5": "playstation.com",
  "ps4": "playstation.com",
  "playstation 4": "playstation.com",
  "xbox": "xbox.com",
  "xbox series x/s": "xbox.com",
  "xbox series": "xbox.com",
  "xbox one": "xbox.com",
  "nintendo": "nintendo.com",
  "nintendo switch": "nintendo.com",
  "switch": "nintendo.com",
  "epic games": "epicgames.com",
  "epic": "epicgames.com",
  "gog": "gog.com",
  "ubisoft": "ubisoft.com",
  "ea": "ea.com",
  "origin": "ea.com",
  "battle.net": "battle.net"
};
window.PLATFORM_KNOWN_DOMAINS = PLATFORM_KNOWN_DOMAINS;

function resolveSupplierDomain(supplierName) {
  if (!supplierName) return "";
  const clean = supplierName.toLowerCase().trim();
  if (clean === "direct" || clean === "other") return "";
  if (SUPPLIER_KNOWN_DOMAINS[clean]) return SUPPLIER_KNOWN_DOMAINS[clean];
  
  for (const [key, domain] of Object.entries(SUPPLIER_KNOWN_DOMAINS)) {
    if (clean.includes(key)) return domain;
  }
  
  const domainMatch = clean.match(/(?:https?:\/\/)?(?:www\.)?([a-z0-9-]+(?:\.[a-z0-9-]+)+)/i);
  if (domainMatch && domainMatch[1]) {
    return domainMatch[1];
  }
  
  const stripped = clean.replace(/[^a-z0-9]/g, "");
  return stripped ? `${stripped}.com` : "";
}
window.resolveSupplierDomain = resolveSupplierDomain;

function getSupplierAutoLogo(supplierName) {
  if (!supplierName) return null;
  const domain = resolveSupplierDomain(supplierName);
  if (!domain) return null;
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128`;
}
window.getSupplierAutoLogo = getSupplierAutoLogo;

function getPlatformAutoLogo(platformName) {
  if (!platformName) return null;
  const clean = platformName.toLowerCase().trim();
  if (clean === "other") return null;
  let domain = PLATFORM_KNOWN_DOMAINS[clean];
  if (!domain) {
    for (const [k, d] of Object.entries(PLATFORM_KNOWN_DOMAINS)) {
      if (clean.includes(k)) { domain = d; break; }
    }
  }
  if (!domain) return null;
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128`;
}
window.getPlatformAutoLogo = getPlatformAutoLogo;

function getSupplierLogoCaseInsensitive(map, name) {
  if (!map || !name) return null;
  const clean = String(name).trim();
  if (map[clean]) return map[clean];
  const lower = clean.toLowerCase();
  for (const [k, v] of Object.entries(map)) {
    if (k && k.trim().toLowerCase() === lower && v) return v;
  }
  return null;
}
window.getSupplierLogoCaseInsensitive = getSupplierLogoCaseInsensitive;

// Default pre-seeded logo registries so no store ever lacks an icon
const DEFAULT_SUPPLIER_LOGOS = {
  "G2A": "https://www.google.com/s2/favicons?domain=g2a.com&sz=128",
  "HRK": "https://www.google.com/s2/favicons?domain=hrkgame.com&sz=128",
  "K4G": "https://www.google.com/s2/favicons?domain=k4g.com&sz=128",
  "King": "https://www.google.com/s2/favicons?domain=kinguin.net&sz=128",
  "Eneba": "https://www.google.com/s2/favicons?domain=eneba.com&sz=128",
  "MMOGA": "https://www.google.com/s2/favicons?domain=mmoga.com&sz=128",
  "CDKeys": "https://www.google.com/s2/favicons?domain=cdkeys.com&sz=128",
  "Gamivo": "https://www.google.com/s2/favicons?domain=gamivo.com&sz=128",
  "YuPlay": "https://www.google.com/s2/favicons?domain=yuplay.com&sz=128",
  "DifMark": "https://www.google.com/s2/favicons?domain=difmark.com&sz=128",
  "InstGam": "https://www.google.com/s2/favicons?domain=instant-gaming.com&sz=128",
  "Kinguin": "https://www.google.com/s2/favicons?domain=kinguin.net&sz=128",
  "WinGame": "https://www.google.com/s2/favicons?domain=wingamestore.com&sz=128",
  "GameStop": "https://www.google.com/s2/favicons?domain=gamestop.com&sz=128",
  "GreenMan": "https://www.google.com/s2/favicons?domain=greenmangaming.com&sz=128",
  "PlayAsia": "https://www.google.com/s2/favicons?domain=play-asia.com&sz=128",
  "Fanatical": "https://www.google.com/s2/favicons?domain=fanatical.com&sz=128",
  "IndieGala": "https://www.google.com/s2/favicons?domain=indiegala.com&sz=128",
  "GamersGate": "https://www.google.com/s2/favicons?domain=gamersgate.com&sz=128",
  "GamesPlanet": "https://www.google.com/s2/favicons?domain=gamesplanet.com&sz=128",
  "GamersOutlet": "https://www.google.com/s2/favicons?domain=gamers-outlet.net&sz=128",
  "GreenManGaming": "https://www.google.com/s2/favicons?domain=greenmangaming.com&sz=128",
  "Humble Bundle": "https://www.google.com/s2/favicons?domain=humblebundle.com&sz=128"
};
window.DEFAULT_SUPPLIER_LOGOS = DEFAULT_SUPPLIER_LOGOS;

const DEFAULT_PLATFORM_LOGOS = {
  "Steam": "https://www.google.com/s2/favicons?domain=store.steampowered.com&sz=128",
  "PlayStation 5": "https://www.google.com/s2/favicons?domain=playstation.com&sz=128",
  "PlayStation 4": "https://www.google.com/s2/favicons?domain=playstation.com&sz=128",
  "Xbox Series X/S": "https://www.google.com/s2/favicons?domain=xbox.com&sz=128",
  "Nintendo Switch": "https://www.google.com/s2/favicons?domain=nintendo.com&sz=128",
  "Epic Games": "https://www.google.com/s2/favicons?domain=epicgames.com&sz=128"
};
window.DEFAULT_PLATFORM_LOGOS = DEFAULT_PLATFORM_LOGOS;

const PUBLISHER_KNOWN_DOMAINS = {
  "electronic arts": "ea.com",
  "ea": "ea.com",
  "ea games": "ea.com",
  "ea sports": "ea.com",
  "ubisoft": "ubisoft.com",
  "capcom": "capcom.com",
  "square enix": "square-enix.com",
  "bandai namco": "bandainamcoent.com",
  "bandai namco entertainment": "bandainamcoent.com",
  "bandai": "bandainamcoent.com",
  "namco": "bandainamcoent.com",
  "bethesda": "bethesda.net",
  "bethesda softworks": "bethesda.net",
  "sega": "sega.com",
  "konami": "konami.com",
  "activision": "activision.com",
  "blizzard": "blizzard.com",
  "blizzard entertainment": "blizzard.com",
  "activision blizzard": "activision.com",
  "take-two": "take2games.com",
  "take-two interactive": "take2games.com",
  "2k": "2k.com",
  "2k games": "2k.com",
  "rockstar": "rockstargames.com",
  "rockstar games": "rockstargames.com",
  "cd projekt": "cdprojektred.com",
  "cd projekt red": "cdprojektred.com",
  "valve": "valvesoftware.com",
  "valve corporation": "valvesoftware.com",
  "sony": "playstation.com",
  "sony interactive entertainment": "playstation.com",
  "playstation pc llc": "playstation.com",
  "playstation publishing llc": "playstation.com",
  "microsoft": "xbox.com",
  "xbox game studios": "xbox.com",
  "warner bros": "warnerbros.com",
  "warner bros. games": "warnerbros.com",
  "warner bros. interactive entertainment": "warnerbros.com",
  "wb games": "warnerbros.com",
  "devolver digital": "devolverdigital.com",
  "devolver": "devolverdigital.com",
  "paradox interactive": "paradoxinteractive.com",
  "paradox": "paradoxinteractive.com",
  "thq nordic": "thqnordic.com",
  "505 games": "505games.com",
  "deep silver": "plaion.com",
  "plaion": "plaion.com",
  "koch media": "plaion.com",
  "focus entertainment": "focus-entmt.com",
  "focus home interactive": "focus-entmt.com",
  "koei tecmo": "koeitecmoamerica.com",
  "koei tecmo games": "koeitecmoamerica.com",
  "remedy entertainment": "remedygames.com",
  "remedy": "remedygames.com",
  "team17": "team17.com",
  "team17 digital": "team17.com",
  "techland": "techland.net",
  "bungie": "bungie.net",
  "rebellion": "rebellion.com",
  "frontier developments": "frontier.co.uk",
  "krafton": "krafton.com",
  "io interactive": "ioi.dk",
  "fromsoftware": "fromsoftware.jp",
  "atlus": "atlus.com",
  "lucasarts": "lucasfilm.com",
  "lucasfilm": "lucasfilm.com",
  "disney": "disney.com",
  "disney interactive": "disney.com",
  "epic games": "epicgames.com",
  "raw fury": "rawfury.com",
  "tinybuild": "tinybuild.com",
  "daedalic entertainment": "daedalic.com",
  "dotemu": "dotemu.com",
  "annapurna interactive": "annapurnainteractive.com",
  "chucklefish": "chucklefish.org",
  "tripwire interactive": "tripwireinteractive.com",
  "crytek": "crytek.com",
  "bohemia interactive": "bohemia.net",
  "milestone": "milestone.it",
  "milestone s.r.l.": "milestone.it",
  "nis america": "nisamerica.com",
  "spike chunsoft": "spike-chunsoft.com",
  "arc system works": "arcsystemworks.com",
  "snk": "snk-corp.co.jp",
  "snk corporation": "snk-corp.co.jp",
  "marvelous": "marvelous.co.jp",
  "aspyr": "aspyr.com",
  "aspyr media": "aspyr.com",
  "saber interactive": "saber.com",
  "gearbox publishing": "gearboxsoftware.com",
  "curve games": "curvegames.com",
  "curve digital": "curvegames.com",
  "playway": "playway.com",
  "playway s.a.": "playway.com",
  "humble games": "humblegames.com",
  "riot games": "riotgames.com"
};
window.PUBLISHER_KNOWN_DOMAINS = PUBLISHER_KNOWN_DOMAINS;

function resolvePublisherDomain(publisherName) {
  if (!publisherName) return "";
  const clean = publisherName.toLowerCase().trim();
  if (clean === "no publisher" || clean === "unknown" || clean === "other" || clean === "direct") return "";
  if (PUBLISHER_KNOWN_DOMAINS[clean]) return PUBLISHER_KNOWN_DOMAINS[clean];
  
  for (const [key, domain] of Object.entries(PUBLISHER_KNOWN_DOMAINS)) {
    if (clean.includes(key)) return domain;
  }
  
  const domainMatch = clean.match(/(?:https?:\/\/)?(?:www\.)?([a-z0-9-]+(?:\.[a-z0-9-]+)+)/i);
  if (domainMatch && domainMatch[1]) {
    return domainMatch[1];
  }
  
  const stripped = clean.replace(/[^a-z0-9]/g, "");
  return stripped ? `${stripped}.com` : "";
}
window.resolvePublisherDomain = resolvePublisherDomain;

function getPublisherAutoLogo(publisherName) {
  if (!publisherName) return null;
  const domain = resolvePublisherDomain(publisherName);
  if (!domain) return null;
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128`;
}
window.getPublisherAutoLogo = getPublisherAutoLogo;

function getPublisherLogoCaseInsensitive(map, name) {
  if (!map || !name) return null;
  const clean = String(name).trim();
  if (map[clean]) return map[clean];
  const lower = clean.toLowerCase();
  for (const [k, v] of Object.entries(map)) {
    if (k && k.trim().toLowerCase() === lower && v) return v;
  }
  return null;
}
window.getPublisherLogoCaseInsensitive = getPublisherLogoCaseInsensitive;

const DEFAULT_PUBLISHER_LOGOS = {
  "Ubisoft": "https://www.google.com/s2/favicons?domain=ubisoft.com&sz=128",
  "Electronic Arts": "https://www.google.com/s2/favicons?domain=ea.com&sz=128",
  "EA": "https://www.google.com/s2/favicons?domain=ea.com&sz=128",
  "Capcom": "https://www.google.com/s2/favicons?domain=capcom.com&sz=128",
  "Square Enix": "https://www.google.com/s2/favicons?domain=square-enix.com&sz=128",
  "Bandai Namco": "https://www.google.com/s2/favicons?domain=bandainamcoent.com&sz=128",
  "Bethesda": "https://www.google.com/s2/favicons?domain=bethesda.net&sz=128",
  "Bethesda Softworks": "https://www.google.com/s2/favicons?domain=bethesda.net&sz=128",
  "Sega": "https://www.google.com/s2/favicons?domain=sega.com&sz=128",
  "Konami": "https://www.google.com/s2/favicons?domain=konami.com&sz=128",
  "Activision": "https://www.google.com/s2/favicons?domain=activision.com&sz=128",
  "Blizzard": "https://www.google.com/s2/favicons?domain=blizzard.com&sz=128",
  "2K": "https://www.google.com/s2/favicons?domain=2k.com&sz=128",
  "2K Games": "https://www.google.com/s2/favicons?domain=2k.com&sz=128",
  "Rockstar Games": "https://www.google.com/s2/favicons?domain=rockstargames.com&sz=128",
  "CD Projekt Red": "https://www.google.com/s2/favicons?domain=cdprojektred.com&sz=128",
  "Valve": "https://www.google.com/s2/favicons?domain=valvesoftware.com&sz=128",
  "Sony": "https://www.google.com/s2/favicons?domain=playstation.com&sz=128",
  "PlayStation PC LLC": "https://www.google.com/s2/favicons?domain=playstation.com&sz=128",
  "Xbox Game Studios": "https://www.google.com/s2/favicons?domain=xbox.com&sz=128",
  "Warner Bros": "https://www.google.com/s2/favicons?domain=warnerbros.com&sz=128",
  "Devolver Digital": "https://www.google.com/s2/favicons?domain=devolverdigital.com&sz=128",
  "Paradox Interactive": "https://www.google.com/s2/favicons?domain=paradoxinteractive.com&sz=128",
  "THQ Nordic": "https://www.google.com/s2/favicons?domain=thqnordic.com&sz=128",
  "505 Games": "https://www.google.com/s2/favicons?domain=505games.com&sz=128",
  "Deep Silver": "https://www.google.com/s2/favicons?domain=plaion.com&sz=128",
  "Focus Entertainment": "https://www.google.com/s2/favicons?domain=focus-entmt.com&sz=128",
  "Koei Tecmo": "https://www.google.com/s2/favicons?domain=koeitecmoamerica.com&sz=128",
  "Remedy Entertainment": "https://www.google.com/s2/favicons?domain=remedygames.com&sz=128",
  "Team17": "https://www.google.com/s2/favicons?domain=team17.com&sz=128",
  "Techland": "https://www.google.com/s2/favicons?domain=techland.net&sz=128",
  "FromSoftware": "https://www.google.com/s2/favicons?domain=fromsoftware.jp&sz=128",
  "Atlus": "https://www.google.com/s2/favicons?domain=atlus.com&sz=128",
  "Epic Games": "https://www.google.com/s2/favicons?domain=epicgames.com&sz=128"
};
window.DEFAULT_PUBLISHER_LOGOS = DEFAULT_PUBLISHER_LOGOS;

// ==========================================================================
// APPLICATION STATE
// ==========================================================================
let state = {
  currentUser: null,
  favoriteGames: [],
  auditLogs: [],
  entriesFilterFav: false,
  suppliersActiveTab: "supplier",
  lowStockThreshold: 5,
  defaultMarkupType: "percent",
  defaultMarkupValue: 20,
  syncMode: "realtime",
  pendingDeletes: {
    inventory: [],
    sales: [],
    suppliers: [],
    platforms: []
  },
  selectedInventoryIds: [],
  inventory: [],
  sales: [],
  suppliers: [],
  catalogArtwork: {},
  catalogReviews: {},
  recycleBin: {
    inventory: [],
    sales: []
  },
  activePeriod: "all", // "all", "month", "week", "today", "custom"
  customStartDate: "",
  customEndDate: "",
  supActivePeriod: "all",
  supFilterSupplier: "all",
  inventoryLayout: "list", // "list", "grid"
  entriesLayout: "table", // "table", "gallery"
  entriesSortBy: "rating-desc", // "rating-desc", "rating-asc", "margin-desc", "margin-asc", "roi-desc", "roi-asc", "title-asc", "title-desc", "stock-asc", "stock-desc", "sold-desc", "profit-desc"
  entriesRatingFilter: "all", // "all", "80plus", "70plus", "40to69", "under40", "unrated"
  entriesStockFilter: "all", // "all", "in-stock", "low-stock", "out-of-stock", "high-stock"
  supplierDisplayMode: "name", // "name", "logo"
  platformDisplayMode: "name", // "name", "logo"
  supplierLogos: { ...DEFAULT_SUPPLIER_LOGOS }, // Key-value map: supplierName -> logoUrl
  platformLogos: { ...DEFAULT_PLATFORM_LOGOS }, // Key-value map: platformName -> logoUrl
  publisherLogos: { ...DEFAULT_PUBLISHER_LOGOS }, // Key-value map: publisherName -> logoUrl
  inventorySortBy: "date-desc", // "date-desc", "date-asc", "title-asc", "title-desc", "duration-desc", "duration-asc"
  filterDuplicatesOnly: false,
  inventoryPageSize: 25,
  inventoryCurrentPage: 1,
  salesPageSize: 25,
  salesCurrentPage: 1,
  entriesPageSize: 25,
  entriesCurrentPage: 1,
  catalogKeysPageSize: 25,
  catalogKeysCurrentPage: 1,
  activeCatalogKeysTitle: "",
  themeMode: "dark", // "dark", "light"
  themeColor: "classic", // "classic", "ocean", "cyberpunk", "emerald", "amber"
  customLogo: null, // Base64 string or image URL
  currency: "EUR",
  dateFormat: "YYYY-MM-DD",
  financeLayoutStyle: localStorage.getItem("gv_finance_layout_style") || "full",
  financeBreakdownCollapsed: localStorage.getItem("gv_finance_breakdown_collapsed") === "true",
  financeSortOrder: localStorage.getItem("gv_finance_sort_order") || "desc",
  sidebarCollapsed: false,
  showSalesLedger: true,
  visibleMetrics: {
    profit: true,
    cost: true,
    revenue: true,
    roi: true,
    stock: true,
    velocity: true,
    str: true,
    unitProfit: true
  },
  supVisibleMetrics: {
    profit: true,
    cost: true,
    revenue: true,
    roi: true,
    stock: true,
    velocity: true,
    str: true,
    unitProfit: true
  },
  visibleFigures: {
    salesProfit: true,
    platformSplit: true,
    costRevenue: true,
    supplierSplit: true,
    topBestsellers: true,
    topBestsellersRevenue: true,
    topBestsellersSales: true,
    dailyProfitMonth: true
  },
  metricOrder: [],
  supMetricOrder: [],
  fontSize: 16,
  menuIcons: {
    dashboard: "fa-chart-line",
    inventory: "fa-boxes-stacked",
    sales: "fa-receipt",
    finance: "fa-coins",
    suppliers: "fa-truck-ramp-box",
    platforms: "fa-gamepad",
    entries: "fa-tags",
    recycle: "fa-trash-can",
    settings: "fa-gear"
  },
  menuTitles: {
    dashboard: "Dashboard",
    inventory: "Inventory",
    sales: "Sales Ledger",
    finance: "Finance",
    suppliers: "Suppliers",
    platforms: "Platforms",
    entries: "Entries",
    recycle: "Recycle Bin",
    settings: "Settings"
  },
  menuVisibility: {
    dashboard: true,
    inventory: true,
    sales: true,
    finance: true,
    suppliers: true,
    platforms: true,
    entries: true,
    recycle: true,
    settings: true
  },
  autoSyncInterval: localStorage.getItem("gv_auto_sync_interval") || "off",
  autoPushGitHub: localStorage.getItem("gv_auto_push_github") === "true",
  autoPullGitHub: localStorage.getItem("gv_auto_pull_github") === "true",
  expenseCategories: [],
  payouts: [],
  menuOrder: ["dashboard", "inventory", "sales", "finance", "suppliers", "platforms", "entries", "recycle", "settings"],
  dashboardOrder: [
    "salesProfit", "platformSplit", "supplierSplit", "topBestsellers", "topBestsellersRevenue", "topBestsellersSales", "dailyProfitMonth",
    "stockSpeed", "salesFeed", "stockTurnover", "stockAging"
  ],
  financeOrder: [
    "financeMonthly", "financeAverages", "financeOutflow", "costRevenue", "markupAnalysis", "financeBenchmark", "financeTracker"
  ],
  dashboardSpans: {
    salesProfit: 2,
    platformSplit: 1,
    supplierSplit: 1,
    topBestsellers: 3,
    topBestsellersRevenue: 3,
    topBestsellersSales: 3,
    dailyProfitMonth: 3,
    stockSpeed: 1,
    salesFeed: 2,
    stockTurnover: 3,
    stockAging: 3
  },
  widgetSettings: {
    salesProfit: { visible: true, collapsed: false, chartType: 'line', timeframe: 'global' },
    platformSplit: { visible: true, collapsed: false, chartType: 'doughnut', timeframe: 'global' },
    costRevenue: { visible: true, collapsed: false, chartType: 'bar', timeframe: 'global' },
    supplierSplit: { visible: true, collapsed: false, chartType: 'doughnut', timeframe: 'global' },
    topBestsellers: { visible: true, collapsed: false, limit: 5, metric: 'profit', timeframe: 'global', coverStyle: 'cover' },
    topBestsellersRevenue: { visible: true, collapsed: false, limit: 5, metric: 'revenue', timeframe: 'global', coverStyle: 'cover' },
    topBestsellersSales: { visible: true, collapsed: false, limit: 5, metric: 'sales', timeframe: 'global', coverStyle: 'cover' },
    dailyProfitMonth: { visible: true, collapsed: false, chartType: 'bar', timeframe: 'global' },
    stockSpeed: { visible: true, collapsed: false, chartType: 'doughnut', timeframe: 'global' },
    salesFeed: { visible: true, collapsed: false, limit: 5, timeframe: 'global' },
    financeTracker: { visible: true, collapsed: false, timeframe: 'global' },
    markupAnalysis: { visible: true, collapsed: false, chartType: 'bar', groupBy: 'publisher', timeframe: 'global' },
    stockTurnover: { visible: true, collapsed: false, chartType: 'line', timeframe: 'global' },
    stockAging: { visible: true, collapsed: false, chartType: 'bar', supplier: 'all', timeframe: 'global' },
    financeMonthly: { visible: true, collapsed: false },
    financeAverages: { visible: true, collapsed: false, chartType: 'bar', metricType: 'financial', timeframe: 'global' },
    financeOutflow: { visible: true, collapsed: false, timeframe: 'global' },
    financeBenchmark: { visible: true, collapsed: false, yearA: '', yearB: '' }
  },
  financeSpans: {
    financeMonthly: 2,
    financeAverages: 1,
    financeOutflow: 1,
    costRevenue: 1,
    markupAnalysis: 1,
    financeBenchmark: 2,
    financeTracker: 1
  },
  aiSettings: {
    provider: "gemini",
    apiKey: "",
    geminiApiKey: "",
    openaiApiKey: "",
    model: "gemini-2.5-flash",
    customBaseUrl: "https://api.openai.com/v1",
    includeContext: true,
    temperature: 0.7,
    isVerified: false,
    verifiedProvider: "",
    verifiedKey: "",
    verifiedAt: null
  }
};

const DEFAULT_EXPENSE_CATEGORIES = [
  "PayPal / Payment Gateway Fee",
  "Platform Commission",
  "Overhead / Server Cost",
  "Software Subscription",
  "Marketing / Ads",
  "Monthly Salary / Payout",
  "Miscellaneous Expense"
];

// Charts reference objects for hot-reloading data
let salesProfitChartInstance = null;
let platformSplitChartInstance = null;
let financeMonthlyChartInstance = null;
let financeAveragesChartInstance = null;
let financeOutflowChartInstance = null;
let costRevenueChartInstance = null;
let stockAgingChartInstance = null;
let supplierSplitChartInstance = null;
let supplierRoiMatrixChartInstance = null;
let dailyProfitMonthChartInstance = null;
let stockSpeedChartInstance = null;
let markupAnalysisChartInstance = null;
let stockTurnoverChartInstance = null;

// Initialize notification center state and bindings
function initNotificationCenter() {
  // Load notification limit
  try {
    state.notificationLimit = parseInt(localStorage.getItem("gv_notification_limit") || "10", 10);
  } catch (err) {
    state.notificationLimit = 10;
  }

  // Load notifications from LocalStorage if they exist
  try {
    const saved = localStorage.getItem("gv_notifications");
    state.notifications = saved ? JSON.parse(saved) : [];
  } catch (err) {
    console.error("Failed to load notifications:", err);
    state.notifications = [];
  }

  // Render initial list
  renderNotifications();
  updateUnreadBadge();

  // Set up button event listeners
  const btnBell = document.getElementById("btn-notification-bell");
  const dropdown = document.getElementById("notification-dropdown");
  const btnClear = document.getElementById("btn-clear-notifications");

  if (btnBell && dropdown) {
    btnBell.addEventListener("click", (e) => {
      e.stopPropagation();
      const isVisible = dropdown.style.display === "block";
      dropdown.style.display = isVisible ? "none" : "block";
      
      // If we open it, clear the unread badge count
      if (!isVisible) {
        clearUnreadBadge();
      }
    });

    // Close dropdown when clicking outside
    document.addEventListener("click", (e) => {
      if (!dropdown.contains(e.target) && e.target !== btnBell && !btnBell.contains(e.target)) {
        dropdown.style.display = "none";
      }
    });
  }

  // Bind notification limit bubbles click handler
  const bubbles = document.querySelectorAll(".btn-notif-limit-bubble");
  bubbles.forEach(bubble => {
    const limitVal = parseInt(bubble.getAttribute("data-limit"), 10);
    
    // Set initial active state based on state.notificationLimit
    if (limitVal === state.notificationLimit) {
      bubble.classList.add("active");
      bubble.style.background = "var(--accent-cyan)";
      bubble.style.color = "#000";
    } else {
      bubble.classList.remove("active");
      bubble.style.background = "transparent";
      bubble.style.color = "var(--text-secondary)";
    }
    
    bubble.addEventListener("click", (e) => {
      e.stopPropagation(); // Prevent closing dropdown
      state.notificationLimit = limitVal;
      try {
        localStorage.setItem("gv_notification_limit", state.notificationLimit.toString());
      } catch (err) {
        console.error("Failed to save notification limit:", err);
      }
      
      // Update bubbles active states visual toggling
      bubbles.forEach(b => {
        const bLimit = parseInt(b.getAttribute("data-limit"), 10);
        if (bLimit === state.notificationLimit) {
          b.classList.add("active");
          b.style.background = "var(--accent-cyan)";
          b.style.color = "#000";
        } else {
          b.classList.remove("active");
          b.style.background = "transparent";
          b.style.color = "var(--text-secondary)";
        }
      });
      
      renderNotifications();
    });
  });

  if (btnClear) {
    btnClear.addEventListener("click", (e) => {
      e.stopPropagation();
      state.notifications = [];
      saveNotificationsToStorage();
      renderNotifications();
      clearUnreadBadge();
    });
  }
}

// Log a notification message
function logActionNotification(text) {
  // If the app is still loading initial state, skip logging to avoid cluttering the recent 10 actions on reload/startup
  if (!window.appInitialized) return;

  if (typeof window.logAuditAction === "function") {
    window.logAuditAction("User Action", text);
  }

  if (!state.notifications) {
    state.notifications = [];
  }

  // Add the new notification to the top
  const notification = {
    id: "notif_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9),
    text: text,
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    unread: true
  };

  state.notifications.unshift(notification);

  // Keep only the last 10 notifications
  if (state.notifications.length > 10) {
    state.notifications = state.notifications.slice(0, 10);
  }

  saveNotificationsToStorage();
  renderNotifications();
  updateUnreadBadge();
}

function saveNotificationsToStorage() {
  try {
    localStorage.setItem("gv_notifications", JSON.stringify(state.notifications));
  } catch (err) {
    console.error("Failed to save notifications:", err);
  }
}

function renderNotifications() {
  const listContainer = document.getElementById("notification-list");
  if (!listContainer) return;

  if (!state.notifications || state.notifications.length === 0) {
    listContainer.innerHTML = `<div style="padding: 16px; text-align: center; color: var(--text-muted); font-size: 0.8rem;">No actions recorded yet</div>`;
    return;
  }

  const limit = state.notificationLimit || 10;
  const visibleNotifications = state.notifications.slice(0, limit);

  listContainer.innerHTML = visibleNotifications.map(notif => `
    <div style="padding: 10px 16px; border-bottom: 1px solid var(--border-color); display: flex; flex-direction: column; gap: 4px; background: ${notif.unread ? 'var(--bg-input)' : 'transparent'};">
      <div style="font-size: 0.82rem; color: var(--text-main); line-height: 1.3;">${escapeHTML(notif.text)}</div>
      <div style="font-size: 0.7rem; color: var(--text-muted); text-align: right;">${notif.time}</div>
    </div>
  `).join("");
}

function updateUnreadBadge() {
  const badge = document.getElementById("notification-badge");
  if (!badge) return;

  const unreadCount = (state.notifications || []).filter(n => n.unread).length;
  if (unreadCount > 0) {
    badge.textContent = unreadCount;
    badge.style.display = "flex";
  } else {
    badge.style.display = "none";
  }
}

function clearUnreadBadge() {
  if (state.notifications) {
    state.notifications.forEach(n => n.unread = false);
    saveNotificationsToStorage();
  }
  updateUnreadBadge();
  renderNotifications();
}

function initDOMCache() {
  const elements = [
    // Views
    "dashboard-view", "inventory-view", "sales-view", "finance-view", "suppliers-view", "settings-view", "recycle-view", "entries-view",
    // Modals
    "add-game-modal", "edit-game-modal", "sell-game-modal", "help-modal", "view-key-modal", "catalog-keys-modal", "payout-categories-modal",
    // Main UI tables & ledger containers
    "publishers-table-body", "suppliers-table-body", "platforms-table-body", "entries-table-body", "recycle-table-body", "payouts-ledger-body",
    // Toolbars & Action Bars
    "bulk-actions-bar", "recycle-bulk-actions", "recycle-info-text",
    // Sync indicators & timers
    "sync-pending-indicator", "auto-sync-timer-countdown", "auto-sync-status-badge", "auto-sync-next-run"
  ];
  
  elements.forEach(id => {
    DOM[id] = document.getElementById(id);
  });
}

// ==========================================================================
// APP INITIALIZATION
// ==========================================================================
function loadStateFromStorage() {
  try {
    if (typeof clearHistoryStacks === "function") {
      clearHistoryStacks();
    }
    const storedInvLayout = localStorage.getItem("gv_inv_layout") || "list";
    state.inventoryLayout = (storedInvLayout === "list" || storedInvLayout === "grid") ? storedInvLayout : "list";
    state.entriesLayout = localStorage.getItem("gv_entries_layout") || "table";
    state.supplierDisplayMode = localStorage.getItem("gv_supplier_display_mode") || "name";
    state.platformDisplayMode = localStorage.getItem("gv_platform_display_mode") || "name";
    state.inventorySortBy = localStorage.getItem("gv_inventory_sort_by") || "date-desc";
    state.inventoryPageSize = parseInt(localStorage.getItem("gv_inv_page_size")) || 25;
    state.inventoryCurrentPage = 1;
    state.salesPageSize = parseInt(localStorage.getItem("gv_sales_page_size")) || 25;
    state.salesCurrentPage = 1;
    state.entriesPageSize = parseInt(localStorage.getItem("gv_entries_page_size")) || 25;
    state.entriesCurrentPage = 1;
    state.catalogKeysPageSize = parseInt(localStorage.getItem("gv_catalog_keys_page_size")) || 25;
    state.catalogKeysCurrentPage = 1;
    // Load and migrate theme settings
    const legacyTheme = localStorage.getItem("gv_theme");
    state.themeMode = localStorage.getItem("gv_theme_mode");
    state.themeColor = localStorage.getItem("gv_theme_color");
    
    if (!state.themeMode && !state.themeColor) {
      if (legacyTheme) {
        if (legacyTheme === "light") {
          state.themeMode = "light";
          state.themeColor = "classic";
        } else {
          state.themeMode = "dark";
          state.themeColor = legacyTheme === "dark" ? "classic" : legacyTheme;
        }
      } else {
        state.themeMode = "dark";
        state.themeColor = "classic";
      }
    } else {
      state.themeMode = state.themeMode || "dark";
      state.themeColor = state.themeColor || "classic";
    }
    state.currency = localStorage.getItem("gv_currency") || "EUR";
    state.dateFormat = localStorage.getItem("gv_date_format") || "YYYY-MM-DD";
    state.benchmarkMode = localStorage.getItem("gv_benchmark_mode") || "averages";
    
    state.financeLayoutStyle = localStorage.getItem("gv_finance_layout_style") || "full";
    state.financeBreakdownCollapsed = localStorage.getItem("gv_finance_breakdown_collapsed") === "true";
    state.financeSortOrder = localStorage.getItem("gv_finance_sort_order") || "desc";
    state.sidebarCollapsed = localStorage.getItem("gv_sidebar_collapsed") === "true";

    const storedShowSalesLedger = localStorage.getItem("gv_show_sales_ledger");
    state.showSalesLedger = storedShowSalesLedger === null ? true : storedShowSalesLedger === "true";

    const storedVisibleMetrics = localStorage.getItem("gv_visible_metrics");
    if (storedVisibleMetrics) {
      try {
        const parsed = JSON.parse(storedVisibleMetrics);
        state.visibleMetrics = {
          profit: true,
          cost: true,
          revenue: true,
          roi: true,
          stock: true,
          velocity: true,
          str: true,
          unitProfit: true,
          ...parsed
        };
      } catch (e) {
        console.error("Error parsing visible metrics state, using defaults:", e);
      }
    }

    const storedSupVisibleMetrics = localStorage.getItem("gv_sup_visible_metrics");
    if (storedSupVisibleMetrics) {
      try {
        const parsed = JSON.parse(storedSupVisibleMetrics);
        state.supVisibleMetrics = {
          profit: true,
          cost: true,
          revenue: true,
          roi: true,
          stock: true,
          velocity: true,
          str: true,
          unitProfit: true,
          ...parsed
        };
      } catch (e) {
        console.error("Error parsing suppliers visible metrics state, using defaults:", e);
      }
    }

    const storedVisibleFigures = localStorage.getItem("gv_visible_figures");
    if (storedVisibleFigures) {
      try {
        const parsed = JSON.parse(storedVisibleFigures);
        state.visibleFigures = {
          salesProfit: true,
          platformSplit: true,
          costRevenue: true,
          supplierSplit: true,
          topBestsellers: true,
          topBestsellersRevenue: true,
          topBestsellersSales: true,
          dailyProfitMonth: true,
          ...parsed
        };
      } catch (e) {
        console.error("Error parsing visible figures state, using defaults:", e);
      }
    } else {
      state.visibleFigures = {
        salesProfit: true,
        platformSplit: true,
        costRevenue: true,
        supplierSplit: true,
        topBestsellers: true,
        topBestsellersRevenue: true,
        topBestsellersSales: true,
        dailyProfitMonth: true
      };
    }

    const storedMetricOrder = localStorage.getItem("gv_metric_order");
    if (storedMetricOrder) {
      try {
        state.metricOrder = JSON.parse(storedMetricOrder) || [];
      } catch (e) {
        console.error("Error parsing metric order state, using defaults:", e);
      }
    }

    const storedSupMetricOrder = localStorage.getItem("gv_sup_metric_order");
    if (storedSupMetricOrder) {
      try {
        state.supMetricOrder = JSON.parse(storedSupMetricOrder) || [];
      } catch (e) {
        console.error("Error parsing suppliers metric order state, using defaults:", e);
      }
    }

    // User-specific data loading (supports isolated storage namespaces)
    const userSuffix = (state.currentUser && state.currentUser !== "guest") ? `_${state.currentUser}` : "";
    
    try {
      const storedFavs = localStorage.getItem("gv_favorite_games" + userSuffix);
      state.favoriteGames = storedFavs ? JSON.parse(storedFavs) : [];
      if (!Array.isArray(state.favoriteGames)) state.favoriteGames = [];
    } catch (e) {
      console.error("Error loading favorite games:", e);
      state.favoriteGames = [];
    }
    
    const storedInventory = localStorage.getItem("gv_inventory" + userSuffix);
    const storedSales = localStorage.getItem("gv_sales" + userSuffix);
    const storedSuppliers = localStorage.getItem("gv_suppliers" + userSuffix);

    const hasSupabase = (localStorage.getItem("gv_supabase_url" + userSuffix) || (window.GV_CONFIG && window.GV_CONFIG.supabaseUrl));
    const hasFirebase = (localStorage.getItem("gv_firebase_apikey" + userSuffix) || (window.GV_CONFIG && window.GV_CONFIG.firebaseConfig));
    const isCloud = !!(hasSupabase || hasFirebase);

    if (storedInventory && storedSales) {
      try {
        state.inventory = JSON.parse(storedInventory) || [];
        state.sales = JSON.parse(storedSales) || [];
      } catch (e) {
        console.error("Error parsing user inventory/sales data, resetting to defaults", e);
        state.inventory = isCloud ? [] : [...MOCK_INVENTORY];
        state.sales = isCloud ? [] : [...MOCK_SALES];
      }
    } else {
      state.inventory = isCloud ? [] : [...MOCK_INVENTORY];
      state.sales = isCloud ? [] : [...MOCK_SALES];
    }

    if (!Array.isArray(state.inventory)) state.inventory = isCloud ? [] : [...MOCK_INVENTORY];
    if (!Array.isArray(state.sales)) state.sales = isCloud ? [] : [...MOCK_SALES];

    try {
      const storedSupLogos = localStorage.getItem("gv_supplier_logos" + userSuffix) || localStorage.getItem("gv_supplier_logos");
      const parsedSupLogos = storedSupLogos ? JSON.parse(storedSupLogos) : {};
      state.supplierLogos = { ...DEFAULT_SUPPLIER_LOGOS, ...(parsedSupLogos || {}) };
    } catch (e) {
      console.error("Error parsing supplier logos:", e);
      state.supplierLogos = { ...DEFAULT_SUPPLIER_LOGOS };
    }

    try {
      const storedPlatLogos = localStorage.getItem("gv_platform_logos" + userSuffix) || localStorage.getItem("gv_platform_logos");
      const parsedPlatLogos = storedPlatLogos ? JSON.parse(storedPlatLogos) : {};
      state.platformLogos = { ...DEFAULT_PLATFORM_LOGOS, ...(parsedPlatLogos || {}) };
    } catch (e) {
      console.error("Error parsing platform logos:", e);
      state.platformLogos = { ...DEFAULT_PLATFORM_LOGOS };
    }

    try {
      const storedPubLogos = localStorage.getItem("gv_publisher_logos" + userSuffix) || localStorage.getItem("gv_publisher_logos");
      const parsedPubLogos = storedPubLogos ? JSON.parse(storedPubLogos) : {};
      state.publisherLogos = { ...DEFAULT_PUBLISHER_LOGOS, ...(parsedPubLogos || {}) };
    } catch (e) {
      console.error("Error parsing publisher logos:", e);
      state.publisherLogos = { ...DEFAULT_PUBLISHER_LOGOS };
    }

    try {
      const storedSuppliers = localStorage.getItem("gv_suppliers" + userSuffix) || localStorage.getItem("gv_suppliers");
      if (storedSuppliers) {
        const rawSuppliers = JSON.parse(storedSuppliers);
        if (Array.isArray(rawSuppliers)) {
          state.suppliers = rawSuppliers.map((s, idx) => {
            const supName = typeof s === "string" ? s : (s && s.name ? s.name : "");
            const autoLogo = (typeof window.getSupplierAutoLogo === "function" ? window.getSupplierAutoLogo(supName) : null);
            const sLogo = (s && s.logo) || (supName && (state.supplierLogos[supName] || getSupplierLogoCaseInsensitive(state.supplierLogos, supName))) || autoLogo || null;
            if (sLogo && supName) state.supplierLogos[supName] = sLogo;
            if (typeof s === "string") {
              return { 
                name: supName, 
                dateAdded: Date.now() - (rawSuppliers.length - idx) * 1000,
                color: getSupplierColorName(supName),
                logo: sLogo
              };
            }
            return {
              ...s,
              name: supName,
              color: s.color || getSupplierColorName(supName),
              logo: sLogo
            };
          });
        } else {
          state.suppliers = DEFAULT_SUPPLIERS.map((s, idx) => {
            const autoLogo = (typeof window.getSupplierAutoLogo === "function" ? window.getSupplierAutoLogo(s) : null);
            return {
              name: s,
              dateAdded: Date.now() - (DEFAULT_SUPPLIERS.length - idx) * 1000,
              color: getSupplierColorName(s),
              logo: (state.supplierLogos && (state.supplierLogos[s] || getSupplierLogoCaseInsensitive(state.supplierLogos, s))) || autoLogo || null
            };
          });
        }
      } else {
        state.suppliers = DEFAULT_SUPPLIERS.map((s, idx) => {
          const autoLogo = (typeof window.getSupplierAutoLogo === "function" ? window.getSupplierAutoLogo(s) : null);
          return {
            name: s,
            dateAdded: Date.now() - (DEFAULT_SUPPLIERS.length - idx) * 1000,
            color: getSupplierColorName(s),
            logo: (state.supplierLogos && (state.supplierLogos[s] || getSupplierLogoCaseInsensitive(state.supplierLogos, s))) || autoLogo || null
          };
        });
      }
    } catch (e) {
      console.error("Error parsing suppliers data, resetting to defaults", e);
      state.suppliers = DEFAULT_SUPPLIERS.map((s, idx) => {
        const autoLogo = (typeof window.getSupplierAutoLogo === "function" ? window.getSupplierAutoLogo(s) : null);
        return {
          name: s,
          dateAdded: Date.now() - (DEFAULT_SUPPLIERS.length - idx) * 1000,
          color: getSupplierColorName(s),
          logo: (state.supplierLogos && (state.supplierLogos[s] || getSupplierLogoCaseInsensitive(state.supplierLogos, s))) || autoLogo || null
        };
      });
    }

    const defaultPlatforms = [
      { name: "Steam", dateAdded: Date.now() - 5000, enabled: true },
      { name: "PlayStation 5", dateAdded: Date.now() - 4000, enabled: true },
      { name: "Xbox Series X/S", dateAdded: Date.now() - 3000, enabled: true },
      { name: "Nintendo Switch", dateAdded: Date.now() - 2000, enabled: true },
      { name: "Epic Games", dateAdded: Date.now() - 1000, enabled: true }
    ];

    try {
      const storedPlatforms = localStorage.getItem("gv_platforms" + userSuffix) || localStorage.getItem("gv_platforms");
      if (storedPlatforms) {
        const rawPlatforms = JSON.parse(storedPlatforms) || [];
        state.platforms = rawPlatforms.map(p => {
          const platName = typeof p === "string" ? p : (p && p.name ? p.name : "");
          const autoPlatLogo = (typeof window.getPlatformAutoLogo === "function" ? window.getPlatformAutoLogo(platName) : null);
          const pLogo = (p && p.logo) || (platName && (state.platformLogos[platName] || getSupplierLogoCaseInsensitive(state.platformLogos, platName))) || autoPlatLogo || null;
          if (pLogo && platName) state.platformLogos[platName] = pLogo;
          if (typeof p === "string") {
            return {
              name: platName,
              dateAdded: Date.now(),
              enabled: true,
              logo: pLogo
            };
          }
          return {
            ...p,
            name: platName,
            logo: pLogo
          };
        });
      } else {
        state.platforms = defaultPlatforms.map(p => {
          const autoPlatLogo = (typeof window.getPlatformAutoLogo === "function" ? window.getPlatformAutoLogo(p.name) : null);
          return {
            ...p,
            logo: (state.platformLogos && (state.platformLogos[p.name] || getSupplierLogoCaseInsensitive(state.platformLogos, p.name))) || autoPlatLogo || null
          };
        });
      }
    } catch (e) {
      console.error("Error parsing platforms data:", e);
      state.platforms = defaultPlatforms.map(p => {
        const autoPlatLogo = (typeof window.getPlatformAutoLogo === "function" ? window.getPlatformAutoLogo(p.name) : null);
        return {
          ...p,
          logo: (state.platformLogos && (state.platformLogos[p.name] || getSupplierLogoCaseInsensitive(state.platformLogos, p.name))) || autoPlatLogo || null
        };
      });
    }

    state.customLogo = localStorage.getItem("gv_custom_logo") || null;
    state.fontSize = parseInt(localStorage.getItem("gv_font_size")) || 16;
    state.lowStockThreshold = parseInt(localStorage.getItem("gv_low_stock_threshold")) || 5;
    state.defaultMarkupType = localStorage.getItem("gv_default_markup_type") || "percent";
    state.defaultMarkupValue = parseFloat(localStorage.getItem("gv_default_markup_value")) || 20;
    state.syncMode = localStorage.getItem("gv_sync_mode") || "realtime";
    state.entriesSortBy = localStorage.getItem("gv_entries_sort_by") || "rating-desc";
    state.entriesRatingFilter = localStorage.getItem("gv_entries_rating_filter") || "all";
    state.entriesStockFilter = localStorage.getItem("gv_entries_stock_filter") || "all";

    const storedFeePresets = localStorage.getItem("gv_platform_fee_presets");
    if (storedFeePresets) {
      try {
        PLATFORM_FEE_PRESETS = JSON.parse(storedFeePresets);
      } catch (e) {
        console.error("Error parsing platform fee presets, using defaults:", e);
      }
    }

    const storedIcons = localStorage.getItem("gv_menu_icons");
    if (storedIcons) {
      try {
        state.menuIcons = { ...state.menuIcons, ...JSON.parse(storedIcons) };
      } catch (e) {
        console.error("Error parsing menu icons, using defaults:", e);
      }
    }

    const storedTitles = localStorage.getItem("gv_menu_titles");
    if (storedTitles) {
      try {
        state.menuTitles = { ...state.menuTitles, ...JSON.parse(storedTitles) };
      } catch (e) {
        console.error("Error parsing menu titles, using defaults:", e);
      }
    }

    const storedVisibility = localStorage.getItem("gv_menu_visibility");
    if (storedVisibility) {
      try {
        state.menuVisibility = { ...state.menuVisibility, ...JSON.parse(storedVisibility) };
        // Force settings menu item to always be visible
        state.menuVisibility.settings = true;
        if (state.menuVisibility.sales !== undefined) {
          state.showSalesLedger = state.menuVisibility.sales;
        }
      } catch (e) {
        console.error("Error parsing menu visibility, using defaults:", e);
      }
    } else {
      state.menuVisibility.sales = state.showSalesLedger;
      state.menuVisibility.settings = true;
    }

    const storedDashboardOrder = localStorage.getItem("gv_dashboard_order");
    if (storedDashboardOrder) {
      try {
        state.dashboardOrder = JSON.parse(storedDashboardOrder);
        const expectedKeys = [
          "salesProfit", "platformSplit", "supplierSplit", "topBestsellers", "topBestsellersRevenue", "topBestsellersSales", "dailyProfitMonth",
          "stockSpeed", "salesFeed", "stockTurnover", "stockAging"
        ];
        state.dashboardOrder = state.dashboardOrder.filter(k => expectedKeys.includes(k));
        expectedKeys.forEach(k => {
          if (!state.dashboardOrder.includes(k)) {
            state.dashboardOrder.push(k);
          }
        });
      } catch (e) {
        console.error("Error parsing dashboard order, using defaults:", e);
      }
    }

    const storedFinanceOrder = localStorage.getItem("gv_finance_order");
    if (storedFinanceOrder) {
      try {
        state.financeOrder = JSON.parse(storedFinanceOrder);
        const expectedFinKeys = [
          "financeMonthly", "financeAverages", "financeOutflow", "costRevenue", "markupAnalysis", "financeBenchmark", "financeTracker"
        ];
        state.financeOrder = state.financeOrder.filter(k => expectedFinKeys.includes(k));
        expectedFinKeys.forEach(k => {
          if (!state.financeOrder.includes(k)) {
            state.financeOrder.push(k);
          }
        });
      } catch (e) {
        console.error("Error parsing finance order, using defaults:", e);
      }
    }

    const storedDashboardSpans = localStorage.getItem("gv_dashboard_spans");
    if (storedDashboardSpans) {
      try {
        state.dashboardSpans = { ...state.dashboardSpans, ...JSON.parse(storedDashboardSpans) };
      } catch (e) {
        console.error("Error parsing dashboard spans, using defaults:", e);
      }
    }

    const storedFinanceSpans = localStorage.getItem("gv_finance_spans");
    if (storedFinanceSpans) {
      try {
        state.financeSpans = { ...state.financeSpans, ...JSON.parse(storedFinanceSpans) };
      } catch (e) {
        console.error("Error parsing finance spans, using defaults:", e);
      }
    }

    const storedWidgetSettings = localStorage.getItem("gv_widget_settings");
    if (storedWidgetSettings) {
      try {
        state.widgetSettings = { ...state.widgetSettings, ...JSON.parse(storedWidgetSettings) };
      } catch (e) {
        console.error("Error parsing widget settings, using defaults:", e);
      }
    }

    if (state.widgetSettings && state.visibleFigures) {
      Object.keys(state.widgetSettings).forEach(key => {
        if (state.widgetSettings[key] && state.widgetSettings[key].visible === false) {
          state.visibleFigures[key] = false;
        } else if (state.visibleFigures[key] === false && state.widgetSettings[key]) {
          state.widgetSettings[key].visible = false;
        }
      });
    }

    const storedAiSettings = localStorage.getItem("gv_ai_settings");
    if (storedAiSettings) {
      try {
        state.aiSettings = { ...state.aiSettings, ...JSON.parse(storedAiSettings) };
        if (
          !state.aiSettings.model ||
          state.aiSettings.model === "gemini-1.5-flash" ||
          state.aiSettings.model === "gemini-1.5-pro" ||
          state.aiSettings.model === "gemini-2.5-flash-lite" ||
          (typeof state.aiSettings.model === "string" && state.aiSettings.model.includes("flash-lite"))
        ) {
          state.aiSettings.model = "gemini-2.5-flash";
        }
      } catch (e) {
        console.error("Error parsing AI settings, using defaults:", e);
      }
    }

    try {
      const storedRecycle = localStorage.getItem("gv_recycle_bin" + userSuffix);
      state.recycleBin = storedRecycle ? JSON.parse(storedRecycle) : { inventory: [], sales: [] };
      if (!state.recycleBin.inventory) state.recycleBin.inventory = [];
      if (!state.recycleBin.sales) state.recycleBin.sales = [];
    } catch (e) {
      console.error("Error parsing recycle bin, using defaults:", e);
      state.recycleBin = { inventory: [], sales: [] };
    }

    try {
      const storedPending = localStorage.getItem("gv_pending_deletes" + userSuffix);
      state.pendingDeletes = storedPending ? JSON.parse(storedPending) : { inventory: [], sales: [], suppliers: [], platforms: [] };
      if (!state.pendingDeletes.inventory) state.pendingDeletes.inventory = [];
      if (!state.pendingDeletes.sales) state.pendingDeletes.sales = [];
      if (!state.pendingDeletes.suppliers) state.pendingDeletes.suppliers = [];
      if (!state.pendingDeletes.platforms) state.pendingDeletes.platforms = [];
    } catch (e) {
      console.error("Error parsing pending deletes, using defaults:", e);
      state.pendingDeletes = { inventory: [], sales: [], suppliers: [], platforms: [] };
    }

    try {
      const storedPayouts = localStorage.getItem("gv_payouts" + userSuffix);
      state.payouts = storedPayouts ? JSON.parse(storedPayouts) : [];
      if (!Array.isArray(state.payouts)) state.payouts = [];
    } catch (e) {
      console.error("Error parsing payouts data, resetting to empty:", e);
      state.payouts = [];
    }

    try {
      const storedCategories = localStorage.getItem("gv_expense_categories" + userSuffix);
      state.expenseCategories = storedCategories ? JSON.parse(storedCategories) : [...DEFAULT_EXPENSE_CATEGORIES];
      if (!Array.isArray(state.expenseCategories)) {
        state.expenseCategories = [...DEFAULT_EXPENSE_CATEGORIES];
      }
    } catch (e) {
      console.error("Error parsing expense categories, using defaults:", e);
      state.expenseCategories = [...DEFAULT_EXPENSE_CATEGORIES];
    }

    try {
      const storedMenuOrder = localStorage.getItem("gv_menu_order");
      state.menuOrder = storedMenuOrder ? JSON.parse(storedMenuOrder) : ["dashboard", "inventory", "sales", "finance", "suppliers", "platforms", "entries", "recycle", "settings"];
      if (!Array.isArray(state.menuOrder)) {
        state.menuOrder = ["dashboard", "inventory", "sales", "finance", "suppliers", "platforms", "entries", "recycle", "settings"];
      } else {
        const defaults = ["dashboard", "inventory", "sales", "finance", "suppliers", "platforms", "entries", "recycle", "settings"];
        defaults.forEach(item => {
          if (!state.menuOrder.includes(item)) {
            state.menuOrder.push(item);
          }
        });
        // Filter out any invalid items
        state.menuOrder = state.menuOrder.filter(item => defaults.includes(item));
      }
    } catch (e) {
      console.error("Error parsing menu order, using defaults:", e);
      state.menuOrder = ["dashboard", "inventory", "sales", "finance", "suppliers", "platforms", "entries", "recycle", "settings"];
    }

    try {
      const storedAuditLogs = localStorage.getItem("gv_audit_logs");
      state.auditLogs = storedAuditLogs ? JSON.parse(storedAuditLogs) : [];
      if (!Array.isArray(state.auditLogs)) state.auditLogs = [];
    } catch (e) {
      console.error("Error parsing audit logs, resetting:", e);
      state.auditLogs = [];
    }

    state.autoSyncInterval = localStorage.getItem("gv_auto_sync_interval") || "off";
    state.autoPushGitHub = localStorage.getItem("gv_auto_push_github") === "true";
    state.autoPullGitHub = localStorage.getItem("gv_auto_pull_github") === "true";

    try {
      const storedCatalogArtwork = localStorage.getItem("gv_catalog_artwork");
      state.catalogArtwork = storedCatalogArtwork ? JSON.parse(storedCatalogArtwork) : {};
    } catch (e) {
      state.catalogArtwork = {};
    }

    try {
      const storedCatalogReviews = localStorage.getItem("gv_catalog_reviews");
      state.catalogReviews = storedCatalogReviews ? JSON.parse(storedCatalogReviews) : {};
    } catch (e) {
      state.catalogReviews = {};
    }

    // Purge empty/invalid rows from the database state automatically
    cleanupEmptyDatabaseRows();

    if (!storedInventory || !storedSales || !storedSuppliers) {
      saveStateToStorage();
    }
  } catch (err) {
    console.error("Error loading state from storage:", err);
    state.currentUser = "guest";
    state.inventory = [];
    state.sales = [];
    state.suppliers = [];
    state.supplierLogos = {};
    state.platforms = [];
    state.platformLogos = {};
    state.publisherLogos = {};
    state.customLogo = null;
  }
}

// Automatically cleans up empty/invalid items from database state
function saveStateToStorage() {
  const userSuffix = (state.currentUser && state.currentUser !== "guest") ? `_${state.currentUser}` : "";
  if (state.widgetSettings && state.visibleFigures) {
    Object.keys(state.widgetSettings).forEach(key => {
      if (state.widgetSettings[key]) {
        state.visibleFigures[key] = state.widgetSettings[key].visible !== false;
      }
    });
  }
  localStorage.setItem("gv_inventory" + userSuffix, JSON.stringify(state.inventory));
  localStorage.setItem("gv_catalog_artwork", JSON.stringify(state.catalogArtwork || {}));
  localStorage.setItem("gv_catalog_reviews", JSON.stringify(state.catalogReviews || {}));
  localStorage.setItem("gv_favorite_games" + userSuffix, JSON.stringify(state.favoriteGames || []));
  localStorage.setItem("gv_sales" + userSuffix, JSON.stringify(state.sales));
  localStorage.setItem("gv_suppliers" + userSuffix, JSON.stringify(state.suppliers));
  localStorage.setItem("gv_supplier_logos" + userSuffix, JSON.stringify(state.supplierLogos || {}));
  localStorage.setItem("gv_supplier_logos", JSON.stringify(state.supplierLogos || {}));
  localStorage.setItem("gv_platforms" + userSuffix, JSON.stringify(state.platforms));
  localStorage.setItem("gv_platform_logos" + userSuffix, JSON.stringify(state.platformLogos || {}));
  localStorage.setItem("gv_platform_logos", JSON.stringify(state.platformLogos || {}));
  localStorage.setItem("gv_publisher_logos" + userSuffix, JSON.stringify(state.publisherLogos || {}));
  localStorage.setItem("gv_publisher_logos", JSON.stringify(state.publisherLogos || {}));
  localStorage.setItem("gv_recycle_bin" + userSuffix, JSON.stringify(state.recycleBin));
  localStorage.setItem("gv_payouts" + userSuffix, JSON.stringify(state.payouts));
  localStorage.setItem("gv_expense_categories" + userSuffix, JSON.stringify(state.expenseCategories));
  localStorage.setItem("gv_pending_deletes" + userSuffix, JSON.stringify(state.pendingDeletes));
  localStorage.setItem("gv_audit_logs", JSON.stringify(state.auditLogs || []));
  localStorage.setItem("gv_inv_layout", state.inventoryLayout);
  localStorage.setItem("gv_entries_layout", state.entriesLayout);
  localStorage.setItem("gv_entries_sort_by", state.entriesSortBy || "rating-desc");
  localStorage.setItem("gv_entries_rating_filter", state.entriesRatingFilter || "all");
  localStorage.setItem("gv_entries_stock_filter", state.entriesStockFilter || "all");
  localStorage.setItem("gv_supplier_display_mode", state.supplierDisplayMode);
  localStorage.setItem("gv_platform_display_mode", state.platformDisplayMode);
  localStorage.setItem("gv_inventory_sort_by", state.inventorySortBy);
  localStorage.setItem("gv_inv_page_size", state.inventoryPageSize);
  localStorage.setItem("gv_sales_page_size", state.salesPageSize);
  localStorage.setItem("gv_entries_page_size", state.entriesPageSize);
  localStorage.setItem("gv_catalog_keys_page_size", state.catalogKeysPageSize);
  localStorage.setItem("gv_theme_mode", state.themeMode);
  localStorage.setItem("gv_theme_color", state.themeColor);
  // Keep legacy gv_theme synced
  localStorage.setItem("gv_theme", state.themeMode === "light" ? "light" : state.themeColor);
  localStorage.setItem("gv_currency", state.currency);
  localStorage.setItem("gv_date_format", state.dateFormat);
  localStorage.setItem("gv_benchmark_mode", state.benchmarkMode);
  localStorage.setItem("gv_sidebar_collapsed", state.sidebarCollapsed);
  localStorage.setItem("gv_show_sales_ledger", state.showSalesLedger);
  localStorage.setItem("gv_visible_metrics", JSON.stringify(state.visibleMetrics));
  localStorage.setItem("gv_sup_visible_metrics", JSON.stringify(state.supVisibleMetrics));
  localStorage.setItem("gv_visible_figures", JSON.stringify(state.visibleFigures));
  localStorage.setItem("gv_metric_order", JSON.stringify(state.metricOrder));
  localStorage.setItem("gv_sup_metric_order", JSON.stringify(state.supMetricOrder));
  localStorage.setItem("gv_menu_order", JSON.stringify(state.menuOrder));
  localStorage.setItem("gv_font_size", state.fontSize);
  localStorage.setItem("gv_low_stock_threshold", state.lowStockThreshold);
  localStorage.setItem("gv_default_markup_type", state.defaultMarkupType);
  localStorage.setItem("gv_default_markup_value", state.defaultMarkupValue);
  localStorage.setItem("gv_sync_mode", state.syncMode);
  localStorage.setItem("gv_auto_sync_interval", state.autoSyncInterval);
  localStorage.setItem("gv_auto_push_github", state.autoPushGitHub ? "true" : "false");
  localStorage.setItem("gv_auto_pull_github", state.autoPullGitHub ? "true" : "false");
  localStorage.setItem("gv_platform_fee_presets", JSON.stringify(PLATFORM_FEE_PRESETS));
  localStorage.setItem("gv_menu_icons", JSON.stringify(state.menuIcons));
  localStorage.setItem("gv_menu_titles", JSON.stringify(state.menuTitles));
  localStorage.setItem("gv_menu_visibility", JSON.stringify(state.menuVisibility));
  localStorage.setItem("gv_dashboard_order", JSON.stringify(state.dashboardOrder));
  localStorage.setItem("gv_finance_order", JSON.stringify(state.financeOrder));
  localStorage.setItem("gv_dashboard_spans", JSON.stringify(state.dashboardSpans));
  localStorage.setItem("gv_finance_spans", JSON.stringify(state.financeSpans));
  localStorage.setItem("gv_widget_settings", JSON.stringify(state.widgetSettings));
  localStorage.setItem("gv_ai_settings", JSON.stringify(state.aiSettings));
  if (state.customLogo) {
    localStorage.setItem("gv_custom_logo", state.customLogo);
  } else {
    localStorage.removeItem("gv_custom_logo");
  }

  if (state.autoPushGitHub && !state._isImporting && !state._isRestoring) {
    triggerDebouncedGitHubPush();
  }
}

function getUsersFromStorage() {
  let arr = [];
  try {
    const users = localStorage.getItem("gv_users");
    if (users) {
      const parsed = JSON.parse(users);
      if (Array.isArray(parsed)) {
        arr = parsed;
      }
    }
  } catch (err) {
    console.error("Error reading users from storage:", err);
    try {
      localStorage.removeItem("gv_users");
    } catch (e) {}
  }

  const hasAdmin = arr.some(u => u && u.username && u.username.toLowerCase() === "admin");
  if (!hasAdmin) {
    const defaultAdmin = {
      username: "admin",
      email: "admin@gamevault.local",
      password: "password",
      role: "admin",
      twoFactorEnabled: false
    };
    arr.push(defaultAdmin);
  }

  // Ensure all users have a role assigned
  let needsSave = false;
  arr.forEach(u => {
    if (u && !u.role) {
      u.role = (u.username && u.username.toLowerCase() === "admin") ? "admin" : "merchant";
      needsSave = true;
    }
  });

  if (needsSave || !hasAdmin) {
    try {
      localStorage.setItem("gv_users", JSON.stringify(arr));
    } catch (e) {
      console.error("Failed to seed default admin to storage:", e);
    }
  }

  if (state.currentUser) {
    const hasCurrent = arr.some(u => u && u.username && u.username.toLowerCase() === state.currentUser.toLowerCase());
    if (!hasCurrent) {
      const shadowUser = {
        username: state.currentUser,
        email: state.currentUser.includes("@") ? state.currentUser : `${state.currentUser}@gamevault.local`,
        password: "cloud_authenticated_user_placeholder_pwd",
        role: "merchant",
        twoFactorEnabled: false
      };
      arr.push(shadowUser);
      try {
        localStorage.setItem("gv_users", JSON.stringify(arr));
      } catch (e) {}
    }
  }
  return arr;
}

function mergeUsers(localUsers = [], cloudUsers = []) {
  if (!Array.isArray(cloudUsers) || cloudUsers.length === 0) {
    return Array.isArray(localUsers) ? localUsers : [];
  }

  // Cloud users is the master list from the database
  const userMap = new Map();
  cloudUsers.forEach(u => {
    if (u && u.username) {
      userMap.set(u.username.toLowerCase(), { ...u });
    }
  });

  // Ensure default admin always exists if missing
  if (!userMap.has("admin")) {
    userMap.set("admin", {
      username: "admin",
      email: "admin@gamevault.local",
      password: "password",
      role: "admin",
      twoFactorEnabled: false
    });
  }

  return Array.from(userMap.values());
}

function saveUsersToStorage(users) {
  try {
    localStorage.setItem("gv_users", JSON.stringify(users));
  } catch (err) {
    console.error("Error saving users to storage:", err);
  }

  // Also sync to cloud app_settings if Supabase is connected
  try {
    const saveFn = window.dbSaveSettings || (typeof dbSaveSettings === "function" ? dbSaveSettings : null);
    if (saveFn && window.supabaseClient) {
      saveFn("appUsers", users, true).catch(err => {
        console.warn("Failed to sync appUsers to cloud storage:", err);
      });
    }
  } catch (syncErr) {
    console.warn("Error triggering cloud user sync:", syncErr);
  }
}

// Global window bindings
window.getUsersFromStorage = getUsersFromStorage;
window.saveUsersToStorage = saveUsersToStorage;
window.mergeUsers = mergeUsers;
