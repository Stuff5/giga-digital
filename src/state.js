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
      return Object.prototype.hasOwnProperty.call(memoryStore, key) ? memoryStore[key] : null;
    },
    setItem(key, value) {
      const stringValue = String(value);
      memoryStore[key] = stringValue;
      indexedDBStorage.setItem(key, stringValue);
    },
    removeItem(key) {
      delete memoryStore[key];
      indexedDBStorage.removeItem(key);
    },
    clear() {
      for (const key in memoryStore) {
        delete memoryStore[key];
      }
      indexedDBStorage.clear();
    }
  };
})();

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

// ==========================================================================
// APPLICATION STATE
// ==========================================================================
let state = {
  currentUser: null,
  favoriteGames: [],
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
  supplierDisplayMode: "name", // "name", "logo"
  platformDisplayMode: "name", // "name", "logo"
  inventorySortBy: "date-desc", // "date-desc", "date-asc", "title-asc", "title-desc", "duration-desc", "duration-asc"
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
    "financeMonthly", "financeAverages", "financeOutflow", "costRevenue", "markupAnalysis", "financeBenchmark"
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
    topBestsellers: { visible: true, collapsed: false, limit: 5, metric: 'profit', timeframe: 'global' },
    topBestsellersRevenue: { visible: true, collapsed: false, limit: 5, metric: 'revenue', timeframe: 'global' },
    topBestsellersSales: { visible: true, collapsed: false, limit: 5, metric: 'sales', timeframe: 'global' },
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
    financeBenchmark: 2
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
    
    // Force-migrate any old "transposed" layout values in local storage to "full"
    const storedLayoutStyle = localStorage.getItem("gv_finance_layout_style");
    if (storedLayoutStyle === "transposed") {
      localStorage.setItem("gv_finance_layout_style", "full");
      state.financeLayoutStyle = "full";
    } else {
      state.financeLayoutStyle = storedLayoutStyle || "full";
    }
    
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

    if (storedInventory && storedSales) {
      try {
        state.inventory = JSON.parse(storedInventory) || [];
        state.sales = JSON.parse(storedSales) || [];
      } catch (e) {
        console.error("Error parsing user inventory/sales data, resetting to defaults", e);
        state.inventory = [...MOCK_INVENTORY];
        state.sales = [...MOCK_SALES];
      }
    } else {
      state.inventory = [...MOCK_INVENTORY];
      state.sales = [...MOCK_SALES];
    }

    if (!Array.isArray(state.inventory)) state.inventory = [...MOCK_INVENTORY];
    if (!Array.isArray(state.sales)) state.sales = [...MOCK_SALES];

    try {
      if (storedSuppliers) {
        const rawSuppliers = JSON.parse(storedSuppliers);
        if (Array.isArray(rawSuppliers)) {
          state.suppliers = rawSuppliers.map((s, idx) => {
            if (typeof s === "string") {
              return { 
                name: s, 
                dateAdded: Date.now() - (rawSuppliers.length - idx) * 1000,
                color: getSupplierColorName(s)
              };
            }
            return {
              ...s,
              color: s.color || getSupplierColorName(s.name)
            };
          });
        } else {
          state.suppliers = DEFAULT_SUPPLIERS.map((s, idx) => ({
            name: s,
            dateAdded: Date.now() - (DEFAULT_SUPPLIERS.length - idx) * 1000,
            color: getSupplierColorName(s)
          }));
        }
      } else {
        state.suppliers = DEFAULT_SUPPLIERS.map((s, idx) => ({
          name: s,
          dateAdded: Date.now() - (DEFAULT_SUPPLIERS.length - idx) * 1000,
          color: getSupplierColorName(s)
        }));
      }
    } catch (e) {
      console.error("Error parsing suppliers data, resetting to defaults", e);
      state.suppliers = DEFAULT_SUPPLIERS.map((s, idx) => ({
        name: s,
        dateAdded: Date.now() - (DEFAULT_SUPPLIERS.length - idx) * 1000,
        color: getSupplierColorName(s)
      }));
    }

    const defaultPlatforms = [
      { name: "Steam", dateAdded: Date.now() - 5000, enabled: true },
      { name: "PlayStation 5", dateAdded: Date.now() - 4000, enabled: true },
      { name: "Xbox Series X/S", dateAdded: Date.now() - 3000, enabled: true },
      { name: "Nintendo Switch", dateAdded: Date.now() - 2000, enabled: true },
      { name: "Epic Games", dateAdded: Date.now() - 1000, enabled: true }
    ];

    try {
      const storedPlatforms = localStorage.getItem("gv_platforms" + userSuffix);
      if (storedPlatforms) {
        state.platforms = JSON.parse(storedPlatforms) || [];
      } else {
        state.platforms = [...defaultPlatforms];
      }
    } catch (e) {
      console.error("Error parsing platforms data:", e);
      state.platforms = [...defaultPlatforms];
    }

    state.customLogo = localStorage.getItem("gv_custom_logo") || null;
    state.fontSize = parseInt(localStorage.getItem("gv_font_size")) || 16;
    state.lowStockThreshold = parseInt(localStorage.getItem("gv_low_stock_threshold")) || 5;
    state.defaultMarkupType = localStorage.getItem("gv_default_markup_type") || "percent";
    state.defaultMarkupValue = parseFloat(localStorage.getItem("gv_default_markup_value")) || 20;
    state.syncMode = localStorage.getItem("gv_sync_mode") || "realtime";

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
          "financeMonthly", "financeAverages", "financeOutflow", "costRevenue", "markupAnalysis", "financeBenchmark"
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

    state.autoSyncInterval = localStorage.getItem("gv_auto_sync_interval") || "off";
    state.autoPushGitHub = localStorage.getItem("gv_auto_push_github") === "true";
    state.autoPullGitHub = localStorage.getItem("gv_auto_pull_github") === "true";

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
    state.customLogo = null;
  }
}

// Automatically cleans up empty/invalid items from database state
function saveStateToStorage() {
  const userSuffix = (state.currentUser && state.currentUser !== "guest") ? `_${state.currentUser}` : "";
  localStorage.setItem("gv_inventory" + userSuffix, JSON.stringify(state.inventory));
  localStorage.setItem("gv_favorite_games" + userSuffix, JSON.stringify(state.favoriteGames || []));
  localStorage.setItem("gv_sales" + userSuffix, JSON.stringify(state.sales));
  localStorage.setItem("gv_suppliers" + userSuffix, JSON.stringify(state.suppliers));
  localStorage.setItem("gv_platforms" + userSuffix, JSON.stringify(state.platforms));
  localStorage.setItem("gv_recycle_bin" + userSuffix, JSON.stringify(state.recycleBin));
  localStorage.setItem("gv_payouts" + userSuffix, JSON.stringify(state.payouts));
  localStorage.setItem("gv_expense_categories" + userSuffix, JSON.stringify(state.expenseCategories));
  localStorage.setItem("gv_inv_layout", state.inventoryLayout);
  localStorage.setItem("gv_entries_layout", state.entriesLayout);
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
  if (state.customLogo) {
    localStorage.setItem("gv_custom_logo", state.customLogo);
  } else {
    localStorage.removeItem("gv_custom_logo");
  }

  if (state.autoPushGitHub && !state._isImporting && !state._isRestoring) {
    triggerDebouncedGitHubPush();
  }
}

function saveUsersToStorage(users) {
  try {
    localStorage.setItem("gv_users", JSON.stringify(users));
  } catch (err) {
    console.error("Error saving users to storage:", err);
  }
}

// Perform login submission
