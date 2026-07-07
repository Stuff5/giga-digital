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
  inventoryLayout: "list", // "list", "grid", "gallery"
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
  bestsellersLimit: parseInt(localStorage.getItem("gv_bestsellers_limit")) || 5,
  bestsellersMetric: localStorage.getItem("gv_bestsellers_metric") || "profit",
  expenseCategories: [],
  payouts: [],
  menuOrder: ["dashboard", "inventory", "sales", "finance", "suppliers", "platforms", "entries", "recycle", "settings"],
  dashboardOrder: [
    "salesProfit", "platformSplit", "costRevenue", "supplierSplit", "topBestsellers", "dailyProfitMonth",
    "stockSpeed", "salesFeed", "financeTracker", "markupAnalysis", "stockTurnover"
  ],
  dashboardSpans: {
    salesProfit: 2,
    platformSplit: 1,
    costRevenue: 2,
    supplierSplit: 1,
    topBestsellers: 3,
    dailyProfitMonth: 3,
    stockSpeed: 1,
    salesFeed: 2,
    financeTracker: 1,
    markupAnalysis: 2,
    stockTurnover: 3
  },
  widgetSettings: {
    salesProfit: { visible: true, collapsed: false, chartType: 'line', timeframe: 'global' },
    platformSplit: { visible: true, collapsed: false, chartType: 'doughnut', timeframe: 'global' },
    costRevenue: { visible: true, collapsed: false, chartType: 'bar', timeframe: 'global' },
    supplierSplit: { visible: true, collapsed: false, chartType: 'doughnut', timeframe: 'global' },
    topBestsellers: { visible: true, collapsed: false, limit: 5, metric: 'profit', timeframe: 'global' },
    dailyProfitMonth: { visible: true, collapsed: false, chartType: 'bar', timeframe: 'global' },
    stockSpeed: { visible: true, collapsed: false, chartType: 'doughnut', timeframe: 'global' },
    salesFeed: { visible: true, collapsed: false, limit: 5, timeframe: 'global' },
    financeTracker: { visible: true, collapsed: false, timeframe: 'global' },
    markupAnalysis: { visible: true, collapsed: false, chartType: 'bar', groupBy: 'publisher', timeframe: 'global' },
    stockTurnover: { visible: true, collapsed: false, chartType: 'line', timeframe: 'global' }
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
let costRevenueChartInstance = null;
let supplierSplitChartInstance = null;
let topBestsellersChartInstance = null;
let supplierRoiMatrixChartInstance = null;
let dailyProfitMonthChartInstance = null;
let stockSpeedChartInstance = null;
let markupAnalysisChartInstance = null;
let stockTurnoverChartInstance = null;

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
document.addEventListener("DOMContentLoaded", async () => {
  try {
    // Show Dev Mode badge if running locally
    const devBadge = document.getElementById("dev-mode-badge");
    if (devBadge && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
      devBadge.classList.remove("hidden");
    }

    // Initialize DOM cache layer
    initDOMCache();
    
    // Initialize IndexedDB storage and populate memory cache
    await initIndexedDBStorage();
    
    // Load State and check session
    loadStateFromStorage();
    
    // Apply theme
    applyTheme(state.themeMode, state.themeColor);

    // Apply font size
    applyFontSize(state.fontSize);
    
    // Set up navigation router
    initNavigation();

    // Initialize bulk actions & bulk price adjusts
    updateUndoRedoButtons();
    initBulkActionsToolbar();
    initBulkPriceAdjustModalForm();

    // Set up forms & modals event handlers
    initEventHandlers();

    // Set up auth forms event listeners
    const loginForm = document.getElementById("login-form");
    if (loginForm) {
      loginForm.addEventListener("submit", handleLoginSubmit);
    }
    const registerForm = document.getElementById("register-form");
    if (registerForm) {
      registerForm.addEventListener("submit", handleRegisterSubmit);
    }
    const twofaForm = document.getElementById("2fa-form");
    if (twofaForm) {
      twofaForm.addEventListener("submit", handleVerify2FASubmit);
    }
    const adminCreateUserForm = document.getElementById("admin-create-user-form");
    if (adminCreateUserForm) {
      adminCreateUserForm.addEventListener("submit", handleAdminCreateUser);
    }
    const editUserForm = document.getElementById("edit-user-form");
    if (editUserForm) {
      editUserForm.addEventListener("submit", handleEditUserSubmit);
    }
    const logoutBtn = document.getElementById("btn-logout");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", handleLogout);
    }

    // Start top bar clock
    startClock();

    // Enforce Authentication (Always Required)
    const activeUser = localStorage.getItem("gv_active_user") || sessionStorage.getItem("gv_active_user");
    const appContainer = document.getElementById("app-container");
    const authContainer = document.getElementById("auth-container");

    if (!activeUser) {
      if (appContainer) appContainer.classList.add("hidden");
      if (authContainer) authContainer.classList.remove("hidden");
      if (logoutBtn) logoutBtn.classList.add("hidden");
      
      const nameDisplay = document.getElementById("user-display-name");
      if (nameDisplay) nameDisplay.textContent = "Sign In Required";
      state.currentUser = null;
    } else {
      state.currentUser = activeUser;
      loadStateFromStorage();
      if (appContainer) appContainer.classList.remove("hidden");
      if (authContainer) authContainer.classList.add("hidden");
      if (logoutBtn) logoutBtn.classList.remove("hidden");
      
      const nameDisplay = document.getElementById("user-display-name");
      if (nameDisplay) nameDisplay.textContent = activeUser;
    }
    
    const supplierDisplayInput = document.getElementById("settings-supplier-display");
    if (supplierDisplayInput) {
      supplierDisplayInput.value = state.supplierDisplayMode || "name";
    }



    const invSortInput = document.getElementById("inv-sort-by");
    if (invSortInput) {
      invSortInput.value = state.inventorySortBy || "date-desc";
    }

    // Perform initial rendering
    updateUI();
    
    // Pre-fill fields in Modals (like current date)
    const purchaseDateInput = document.getElementById("game-purchase-date");
    if (purchaseDateInput) purchaseDateInput.valueAsDate = new Date();
    
    const saleDateInput = document.getElementById("sale-date");
    if (saleDateInput) saleDateInput.valueAsDate = new Date();

    // Initialize color picker swatches in Suppliers forms
    initColorPickers();

    // Register Edit Supplier submit handler
    const editSupplierForm = document.getElementById("edit-supplier-form");
    if (editSupplierForm) {
      editSupplierForm.addEventListener("submit", handleEditSupplierSubmit);
    }

    // Register Add & Edit Platform submit handlers
    const addPlatformForm = document.getElementById("add-platform-form");
    if (addPlatformForm) {
      addPlatformForm.addEventListener("submit", handleAddPlatformSubmit);
    }
    const editPlatformForm = document.getElementById("edit-platform-form");
    if (editPlatformForm) {
      editPlatformForm.addEventListener("submit", handleEditPlatformSubmit);
    }

    // Register Edit Publisher submit handler
    const editPublisherForm = document.getElementById("edit-publisher-form");
    if (editPublisherForm) {
      editPublisherForm.addEventListener("submit", handleEditPublisherSubmit);
    }

    // Set initial logo and active theme cards highlight
    applyLogo(state.customLogo);
    updateThemeSelectionCards(state.themeMode, state.themeColor);
    updateCurrencySymbols();
    updateCurrencySelectionCards(state.currency);
    applyDateFormat(state.dateFormat);
    applySidebarState(state.sidebarCollapsed);
    applySalesLedgerVisibility(state.showSalesLedger);
    applyMetricsVisibility();
    applySupplierMetricsVisibility();
    applyFiguresVisibility();
    applyMetricOrder();
    applySupplierMetricOrder();
    initDragAndDrop();
    bindDashboardDragAndDrop();
    bindDashboardCardActions();
    applyWidgetVisibility();
    bindWidgetControls();
    applyMenuIcons();
    applyMenuTitles();
    renderSidebarCustomizationSettings();
    initSupabaseConnection();
    bindSupabaseSettingsControls();
    initFirebaseConnection();
    bindFirebaseSettingsControls();
    initGitHubConnection();
    bindGitHubSettingsControls();
    initAdvancedSettings();
    bindAdvancedSettingsControls();
    initPayouts();

    // Auto-Pull from GitHub on startup if configured and credentials exist
    if (state.autoPullGitHub) {
      const token = localStorage.getItem("gv_github_token") || "";
      const repo = localStorage.getItem("gv_github_repo") || "";
      if (token && repo) {
        console.log("GitHub Auto-Pull on startup enabled, initiating remote pull...");
        setTimeout(() => {
          syncFromGitHub(true);
        }, 1000);
      }
    }

    // Bind Help Modal Elements
    const btnOpenHelp = document.getElementById("btn-open-help");
    const helpModal = document.getElementById("help-modal");
    const helpSearchInput = document.getElementById("help-search-input");
    const helpTabs = document.querySelectorAll(".help-tab-btn");
    const helpPanes = document.querySelectorAll(".help-tab-pane");

    if (btnOpenHelp) {
      btnOpenHelp.addEventListener("click", () => {
        if (helpSearchInput) {
          helpSearchInput.value = "";
          helpTabs.forEach(t => t.style.display = "");
        }
        openModal("help-modal");
      });
    }

    // Bind Theme Toggle Element
    const btnThemeToggle = document.getElementById("btn-theme-toggle");
    if (btnThemeToggle) {
      btnThemeToggle.addEventListener("click", () => {
        const nextMode = state.themeMode === "light" ? "dark" : "light";
        state.themeMode = nextMode;
        saveStateToStorage();
        applyTheme(state.themeMode, state.themeColor);
        updateThemeSelectionCards(state.themeMode, state.themeColor);
        if (window.supabaseClient) {
          dbSaveSettings("themeMode", state.themeMode);
        }
        updateUI();
        showToast(`Switched to ${nextMode === "light" ? "Light Mode" : "Dark Mode"}`, "info");
      });
    }

    // Tab switcher in help modal
    helpTabs.forEach(tab => {
      tab.addEventListener("click", () => {
        const targetPaneId = tab.getAttribute("data-help-tab");
        helpTabs.forEach(t => {
          t.classList.remove("active");
          t.style.backgroundColor = "transparent";
          t.style.color = "var(--text-secondary)";
        });
        helpPanes.forEach(p => {
          p.classList.add("hidden");
        });
        
        tab.classList.add("active");
        tab.style.backgroundColor = "var(--bg-input)";
        tab.style.color = "var(--text-main)";
        
        const targetPane = document.getElementById(targetPaneId);
        if (targetPane) {
          targetPane.classList.remove("hidden");
        }
      });
    });

    // Interactive search query filtering in help modal
    if (helpSearchInput) {
      helpSearchInput.addEventListener("input", (e) => {
        const query = e.target.value.toLowerCase().trim();
        let firstVisibleTab = null;
        let activeTabVisible = false;

        helpTabs.forEach(tab => {
          const targetPaneId = tab.getAttribute("data-help-tab");
          const pane = document.getElementById(targetPaneId);
          if (!pane) return;

          const tabText = tab.textContent.toLowerCase();
          const paneText = pane.textContent.toLowerCase();

          const isMatch = tabText.includes(query) || paneText.includes(query);
          if (isMatch) {
            tab.style.display = "";
            if (!firstVisibleTab) firstVisibleTab = tab;
            if (tab.classList.contains("active")) activeTabVisible = true;
          } else {
            tab.style.display = "none";
          }
        });

        // Switch active tab if current active tab button is hidden
        if (!activeTabVisible && firstVisibleTab) {
          firstVisibleTab.click();
        }
      });
    }

    // Keyboard Shortcuts (F1, ?, Escape)
    window.addEventListener("keydown", (e) => {
      // Avoid triggering when user is typing inside text inputs or textareas
      const activeTag = document.activeElement ? document.activeElement.tagName.toLowerCase() : "";
      if (activeTag === "input" || activeTag === "textarea" || (document.activeElement && document.activeElement.isContentEditable)) {
        if (e.key === "Escape" && helpModal && helpModal.classList.contains("active")) {
          closeModal("help-modal");
        }
        return;
      }

      if (e.key === "F1" || e.key === "?") {
        e.preventDefault();
        if (helpModal) {
          if (helpModal.classList.contains("active")) {
            closeModal("help-modal");
          } else {
            if (helpSearchInput) {
              helpSearchInput.value = "";
              helpTabs.forEach(t => t.style.display = "");
            }
            openModal("help-modal");
          }
        }
      } else if (e.key === "Escape") {
        if (helpModal && helpModal.classList.contains("active")) {
          closeModal("help-modal");
        }
      }
    });

    const toggleSalesInput = document.getElementById("toggle-show-sales-ledger");
    if (toggleSalesInput) {
      toggleSalesInput.checked = state.showSalesLedger;
      toggleSalesInput.addEventListener("change", (e) => {
        state.showSalesLedger = e.target.checked;
        saveStateToStorage();
        applySalesLedgerVisibility(state.showSalesLedger);
        if (window.supabaseClient) {
          dbSaveSettings("showSalesLedger", state.showSalesLedger);
        }
      });
    }


  } catch (err) {
    console.error("Initialization Error:", err);
  }
});

// Load data from LocalStorage
function loadStateFromStorage() {
  try {
    if (typeof clearHistoryStacks === "function") {
      clearHistoryStacks();
    }
    state.inventoryLayout = localStorage.getItem("gv_inv_layout") || "list";
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
        const expectedKeys = ["salesProfit", "platformSplit", "costRevenue", "supplierSplit", "topBestsellers", "dailyProfitMonth"];
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

    const storedDashboardSpans = localStorage.getItem("gv_dashboard_spans");
    if (storedDashboardSpans) {
      try {
        state.dashboardSpans = { ...state.dashboardSpans, ...JSON.parse(storedDashboardSpans) };
      } catch (e) {
        console.error("Error parsing dashboard spans, using defaults:", e);
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
    state.bestsellersLimit = parseInt(localStorage.getItem("gv_bestsellers_limit")) || 5;
    state.bestsellersMetric = localStorage.getItem("gv_bestsellers_metric") || "profit";

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
function cleanupEmptyDatabaseRows() {
  try {
    const initialInvLength = state.inventory.length;
    
    // An item is invalid if it has no title or no key or title/key are completely blank
    state.inventory = state.inventory.filter(item => {
      if (!item) return false;
      const title = String(item.title || "").trim();
      const key = String(item.key || "").trim();
      // Keep only rows that have a title and key
      return title !== "" && key !== "";
    });

    const initialSalesLength = state.sales.length;
    // Keep only sales associated with valid inventory items
    const validInvIds = new Set(state.inventory.map(item => item.id));
    state.sales = state.sales.filter(sale => {
      if (!sale) return false;
      return sale.inventoryId && validInvIds.has(sale.inventoryId);
    });

    if (state.inventory.length !== initialInvLength || state.sales.length !== initialSalesLength) {
      console.log(`Cleaned up ${initialInvLength - state.inventory.length} empty inventory rows and ${initialSalesLength - state.sales.length} orphaned sales rows.`);
      saveStateToStorage();
    }
  } catch (e) {
    console.error("Error in cleanupEmptyDatabaseRows:", e);
  }
}

// Save data to LocalStorage
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
  localStorage.setItem("gv_bestsellers_limit", state.bestsellersLimit);
  localStorage.setItem("gv_bestsellers_metric", state.bestsellersMetric);
  localStorage.setItem("gv_menu_icons", JSON.stringify(state.menuIcons));
  localStorage.setItem("gv_menu_titles", JSON.stringify(state.menuTitles));
  localStorage.setItem("gv_menu_visibility", JSON.stringify(state.menuVisibility));
  localStorage.setItem("gv_dashboard_order", JSON.stringify(state.dashboardOrder));
  localStorage.setItem("gv_dashboard_spans", JSON.stringify(state.dashboardSpans));
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

// ==========================================================================
// UNDO / REDO HISTORY MANAGEMENT
// ==========================================================================
let undoStack = [];
let redoStack = [];
const MAX_HISTORY_LIMIT = 50;

function pushToUndoStack() {
  const snapshot = {
    inventory: JSON.parse(JSON.stringify(state.inventory || [])),
    sales: JSON.parse(JSON.stringify(state.sales || [])),
    suppliers: JSON.parse(JSON.stringify(state.suppliers || [])),
    platforms: JSON.parse(JSON.stringify(state.platforms || [])),
    recycleBin: JSON.parse(JSON.stringify(state.recycleBin || { inventory: [], sales: [] })),
    payouts: JSON.parse(JSON.stringify(state.payouts || [])),
    expenseCategories: JSON.parse(JSON.stringify(state.expenseCategories || []))
  };
  
  undoStack.push(snapshot);
  if (undoStack.length > MAX_HISTORY_LIMIT) {
    undoStack.shift();
  }
  redoStack = [];
  updateUndoRedoButtons();
}

function updateUndoRedoButtons() {
  const btnUndo = document.getElementById("btn-undo");
  const btnRedo = document.getElementById("btn-redo");
  if (btnUndo) {
    btnUndo.disabled = undoStack.length === 0;
  }
  if (btnRedo) {
    btnRedo.disabled = redoStack.length === 0;
  }


}

function restoreFromSnapshot(snapshot) {
  state.inventory = JSON.parse(JSON.stringify(snapshot.inventory));
  state.sales = JSON.parse(JSON.stringify(snapshot.sales));
  state.suppliers = JSON.parse(JSON.stringify(snapshot.suppliers));
  state.platforms = JSON.parse(JSON.stringify(snapshot.platforms));
  state.recycleBin = JSON.parse(JSON.stringify(snapshot.recycleBin));
  state.payouts = JSON.parse(JSON.stringify(snapshot.payouts));
  if (snapshot.expenseCategories) {
    state.expenseCategories = JSON.parse(JSON.stringify(snapshot.expenseCategories));
  }
  
  saveStateToStorage();
  
  if (window.supabaseClient) {
    localStorage.setItem("gv_unsynced_changes", "true");
    const syncIndicator = document.getElementById("sync-pending-indicator");
    if (syncIndicator) syncIndicator.classList.remove("hidden");
    if (state.syncMode === "realtime" && typeof pushStateToCloud === "function") {
      pushStateToCloud();
    }
  }
  
  populateCategoryDropdown();
  renderPayoutCategoriesList();
  updateUI();
  updateUndoRedoButtons();
}

window.handleUndo = function() {
  if (undoStack.length === 0) return;
  
  const currentSnapshot = {
    inventory: JSON.parse(JSON.stringify(state.inventory || [])),
    sales: JSON.parse(JSON.stringify(state.sales || [])),
    suppliers: JSON.parse(JSON.stringify(state.suppliers || [])),
    platforms: JSON.parse(JSON.stringify(state.platforms || [])),
    recycleBin: JSON.parse(JSON.stringify(state.recycleBin || { inventory: [], sales: [] })),
    payouts: JSON.parse(JSON.stringify(state.payouts || [])),
    expenseCategories: JSON.parse(JSON.stringify(state.expenseCategories || []))
  };
  redoStack.push(currentSnapshot);
  if (redoStack.length > MAX_HISTORY_LIMIT) {
    redoStack.shift();
  }
  
  const previousSnapshot = undoStack.pop();
  restoreFromSnapshot(previousSnapshot);
  showToast("Action undone", "info");
};

window.handleRedo = function() {
  if (redoStack.length === 0) return;
  
  const currentSnapshot = {
    inventory: JSON.parse(JSON.stringify(state.inventory || [])),
    sales: JSON.parse(JSON.stringify(state.sales || [])),
    suppliers: JSON.parse(JSON.stringify(state.suppliers || [])),
    platforms: JSON.parse(JSON.stringify(state.platforms || [])),
    recycleBin: JSON.parse(JSON.stringify(state.recycleBin || { inventory: [], sales: [] })),
    payouts: JSON.parse(JSON.stringify(state.payouts || [])),
    expenseCategories: JSON.parse(JSON.stringify(state.expenseCategories || []))
  };
  undoStack.push(currentSnapshot);
  if (undoStack.length > MAX_HISTORY_LIMIT) {
    undoStack.shift();
  }
  
  const nextSnapshot = redoStack.pop();
  restoreFromSnapshot(nextSnapshot);
  showToast("Action redone", "info");
};

function clearHistoryStacks() {
  undoStack = [];
  redoStack = [];
  updateUndoRedoButtons();
}

// ==========================================================================
// USER AUTHENTICATION LOGIC
// ==========================================================================

// Switch between Login and Register tabs on the Auth view
window.switchAuthTab = function(tab) {
  const tabLogin = document.getElementById("tab-login");
  const tabRegister = document.getElementById("tab-register");
  const secLogin = document.getElementById("auth-login-section");
  const secRegister = document.getElementById("auth-register-section");
  const sec2fa = document.getElementById("auth-2fa-section");

  if (tab === "login") {
    if (tabLogin) tabLogin.classList.add("active");
    if (tabRegister) tabRegister.classList.remove("active");
    if (secLogin) secLogin.classList.add("active");
    if (secRegister) secRegister.classList.remove("active");
    if (sec2fa) sec2fa.classList.remove("active");
  } else if (tab === "register") {
    if (tabRegister) tabRegister.classList.add("active");
    if (tabLogin) tabLogin.classList.remove("active");
    if (secRegister) secRegister.classList.add("active");
    if (secLogin) secLogin.classList.remove("active");
    if (sec2fa) sec2fa.classList.remove("active");
  } else if (tab === "2fa") {
    if (tabLogin) tabLogin.classList.remove("active");
    if (tabRegister) tabRegister.classList.remove("active");
    if (secLogin) secLogin.classList.remove("active");
    if (secRegister) secRegister.classList.remove("active");
    if (sec2fa) sec2fa.classList.add("active");
  }
};

// Handle mock forgot password trigger
window.handleForgotPassword = function(e) {
  e.preventDefault();
  const username = document.getElementById("login-username").value.trim();
  if (username) {
    showToast(`Password recovery instructions sent to the email associated with '${username}' (Mock).`, "info");
  } else {
    showToast("Please enter your username first to retrieve your password.", "warning");
  }
};

// Helper to get registered user list
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

  const hasAdmin = arr.some(u => u.username.toLowerCase() === "admin");
  if (!hasAdmin) {
    const defaultAdmin = {
      username: "admin",
      email: "admin@gamevault.local",
      password: "password",
      twoFactorEnabled: false
    };
    arr.push(defaultAdmin);
    try {
      localStorage.setItem("gv_users", JSON.stringify(arr));
    } catch (e) {
      console.error("Failed to seed default admin to storage:", e);
    }
  }
  return arr;
}

// Helper to save users list
function saveUsersToStorage(users) {
  try {
    localStorage.setItem("gv_users", JSON.stringify(users));
  } catch (err) {
    console.error("Error saving users to storage:", err);
  }
}

// Perform login submission
function handleLoginSubmit(e) {
  e.preventDefault();
  try {
    const username = document.getElementById("login-username").value.trim();
    const password = document.getElementById("login-password").value;
    const remember = document.getElementById("login-remember").checked;

    if (!username || !password) {
      showToast("Please fill in all required fields.", "warning");
      return;
    }

    const users = getUsersFromStorage();
    console.log("[Auth Debug] Current registered users in storage:", users);
    const matchedUser = users.find(u => u.username.toLowerCase() === username.toLowerCase());
    console.log("[Auth Debug] Attempted login for:", username, "Matched User found:", matchedUser);

    if (!matchedUser || matchedUser.password !== password) {
      console.warn("[Auth Debug] Invalid login credentials mismatch:", { enteredUser: username, enteredPass: password, storedUser: matchedUser ? matchedUser.username : null, storedPass: matchedUser ? matchedUser.password : null });
      showToast("Invalid username or password.", "error");
      return;
    }

    // Check if 2FA is enabled for the user
    if (matchedUser.twoFactorEnabled) {
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      state.pending2FA = {
        username: matchedUser.username,
        code: code,
        remember: remember
      };
      
      switchAuthTab("2fa");
      showToast(`2FA Required! Code: ${code} (Simulating SMS/App)`, "info", 15000);
      
      // Clear password field for security
      document.getElementById("login-password").value = "";
      return;
    }

    // Set active session
    localStorage.removeItem("gv_local_logout");
    if (remember) {
      localStorage.setItem("gv_active_user", matchedUser.username);
      sessionStorage.removeItem("gv_active_user");
    } else {
      sessionStorage.setItem("gv_active_user", matchedUser.username);
      localStorage.removeItem("gv_active_user");
    }

    // Set state and load data
    state.currentUser = matchedUser.username;
    loadStateFromStorage();
    
    // Transition to main dashboard
    const authContainer = document.getElementById("auth-container");
    const appContainer = document.getElementById("app-container");
    const logoutBtn = document.getElementById("btn-logout");
    
    if (authContainer) authContainer.classList.add("hidden");
    if (appContainer) appContainer.classList.remove("hidden");
    if (logoutBtn) logoutBtn.classList.remove("hidden");
    
    // Update sidebar display name
    const nameDisplay = document.getElementById("user-display-name");
    if (nameDisplay) nameDisplay.textContent = matchedUser.username;

    // Clear form inputs
    const loginForm = document.getElementById("login-form");
    if (loginForm) loginForm.reset();

    // Draw UI & charts
    updateUI();
    showToast(`Welcome back, ${matchedUser.username}!`, "success");
  } catch (err) {
    console.error("Login Error:", err);
    showToast("An error occurred during sign in. Check developer logs.", "error");
  }
}

function handleVerify2FASubmit(e) {
  e.preventDefault();
  try {
    const enteredCode = document.getElementById("auth-2fa-code").value.trim();
    if (!state.pending2FA) {
      showToast("No pending session found. Please sign in again.", "error");
      switchAuthTab("login");
      return;
    }

    if (enteredCode !== state.pending2FA.code) {
      showToast("Invalid verification code. Please try again.", "error");
      return;
    }

    const username = state.pending2FA.username;
    const remember = state.pending2FA.remember;

    // Set active session
    localStorage.removeItem("gv_local_logout");
    if (remember) {
      localStorage.setItem("gv_active_user", username);
      sessionStorage.removeItem("gv_active_user");
    } else {
      sessionStorage.setItem("gv_active_user", username);
      localStorage.removeItem("gv_active_user");
    }

    // Clear pending state
    state.pending2FA = null;

    // Set state and load data
    state.currentUser = username;
    loadStateFromStorage();
    
    // Transition to main dashboard
    const authContainer = document.getElementById("auth-container");
    const appContainer = document.getElementById("app-container");
    const logoutBtn = document.getElementById("btn-logout");
    
    if (authContainer) authContainer.classList.add("hidden");
    if (appContainer) appContainer.classList.remove("hidden");
    if (logoutBtn) logoutBtn.classList.remove("hidden");
    
    // Update sidebar display name
    const nameDisplay = document.getElementById("user-display-name");
    if (nameDisplay) nameDisplay.textContent = username;

    // Clear forms
    document.getElementById("auth-2fa-code").value = "";
    const loginForm = document.getElementById("login-form");
    if (loginForm) loginForm.reset();

    // Draw UI & charts
    updateUI();
    showToast(`2FA Verified. Welcome back, ${username}!`, "success");
  } catch (err) {
    console.error("2FA Verification Error:", err);
    showToast("An error occurred during verification.", "error");
  }
}

// Perform registration submission
function handleRegisterSubmit(e) {
  e.preventDefault();
  try {
    const username = document.getElementById("register-username").value.trim();
    const email = document.getElementById("register-email").value.trim();
    const password = document.getElementById("register-password").value;
    const confirmPassword = document.getElementById("register-confirm").value;

    // Validation checks
    if (username.length < 3) {
      showToast("Username must be at least 3 characters long.", "warning");
      return;
    }
    
    const alphaNumericRegex = /^[a-zA-Z0-9_]+$/;
    if (!alphaNumericRegex.test(username)) {
      showToast("Username must only contain letters, numbers, and underscores.", "warning");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      showToast("Please enter a valid email address.", "warning");
      return;
    }

    if (password.length < 6) {
      showToast("Password must be at least 6 characters long.", "warning");
      return;
    }

    if (password !== confirmPassword) {
      showToast("Passwords do not match.", "error");
      return;
    }

    const users = getUsersFromStorage();
    const exists = users.some(u => u.username.toLowerCase() === username.toLowerCase());
    if (exists) {
      showToast("Username is already taken.", "warning");
      return;
    }

    // Create new user and append
    const twoFactorEnabled = document.getElementById("register-2fa")?.checked || false;
    const newUser = { username, email, password, twoFactorEnabled };
    console.log("[Auth Debug] Registering new user:", newUser);
    users.push(newUser);
    saveUsersToStorage(users);
    console.log("[Auth Debug] Users in storage after save:", getUsersFromStorage());

    // Set active session
    localStorage.removeItem("gv_local_logout");
    localStorage.setItem("gv_active_user", username);
    
    // Set state, clone default datasets into isolated namespace
    state.currentUser = username;
    
    // Initialize user storage arrays with mock clones
    localStorage.setItem(`gv_inventory_${username}`, JSON.stringify(MOCK_INVENTORY));
    localStorage.setItem(`gv_sales_${username}`, JSON.stringify(MOCK_SALES));
    localStorage.setItem(`gv_suppliers_${username}`, JSON.stringify(
      DEFAULT_SUPPLIERS.map((s, idx) => ({
        name: s,
        dateAdded: Date.now() - (DEFAULT_SUPPLIERS.length - idx) * 1000
      }))
    ));

    loadStateFromStorage();

    // Transition to main dashboard
    const authContainer = document.getElementById("auth-container");
    const appContainer = document.getElementById("app-container");
    const logoutBtn = document.getElementById("btn-logout");
    
    if (authContainer) authContainer.classList.add("hidden");
    if (appContainer) appContainer.classList.remove("hidden");
    if (logoutBtn) logoutBtn.classList.remove("hidden");

    // Update sidebar display name
    const nameDisplay = document.getElementById("user-display-name");
    if (nameDisplay) nameDisplay.textContent = username;

    // Clear inputs
    const registerForm = document.getElementById("register-form");
    if (registerForm) registerForm.reset();
    
    // Switch back auth view tabs to login
    switchAuthTab("login");

    // Draw UI & charts
    updateUI();
    showToast(`Account created successfully! Welcome, ${username}!`, "success");
  } catch (err) {
    console.error("Registration Error:", err);
    showToast("An error occurred during registration.", "error");
  }
}

// Admin panel: Manually create a user
function handleAdminCreateUser(e) {
  e.preventDefault();
  try {
    const username = document.getElementById("admin-new-username").value.trim();
    const email = document.getElementById("admin-new-email").value.trim();
    const password = document.getElementById("admin-new-password").value;
    const confirmPassword = document.getElementById("admin-confirm-password").value;

    if (username.length < 3) {
      showToast("Username must be at least 3 characters long.", "warning");
      return;
    }
    
    const alphaNumericRegex = /^[a-zA-Z0-9_]+$/;
    if (!alphaNumericRegex.test(username)) {
      showToast("Username must only contain letters, numbers, and underscores.", "warning");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      showToast("Please enter a valid email address.", "warning");
      return;
    }

    if (password.length < 6) {
      showToast("Password must be at least 6 characters long.", "warning");
      return;
    }

    if (password !== confirmPassword) {
      showToast("Passwords do not match.", "error");
      return;
    }

    const users = getUsersFromStorage();
    const exists = users.some(u => u.username.toLowerCase() === username.toLowerCase());
    if (exists) {
      showToast("Username is already taken.", "warning");
      return;
    }

    const twoFactorEnabled = document.getElementById("admin-new-2fa")?.checked || false;
    const newUser = { username, email, password, twoFactorEnabled };
    users.push(newUser);
    saveUsersToStorage(users);

    // Initialize user storage arrays with mock clones
    localStorage.setItem(`gv_inventory_${username}`, JSON.stringify([]));
    localStorage.setItem(`gv_sales_${username}`, JSON.stringify([]));
    localStorage.setItem(`gv_suppliers_${username}`, JSON.stringify([]));
    localStorage.setItem(`gv_platforms_${username}`, JSON.stringify([]));
    localStorage.setItem(`gv_recycle_bin_${username}`, JSON.stringify({ inventory: [], sales: [] }));
    localStorage.setItem(`gv_payouts_${username}`, JSON.stringify([]));
    localStorage.setItem(`gv_expense_categories_${username}`, JSON.stringify(DEFAULT_EXPENSE_CATEGORIES));

    showToast(`User '${username}' created successfully!`, "success");

    // Clear form
    document.getElementById("admin-create-user-form").reset();
    renderAdminUsers();
  } catch (err) {
    console.error("Admin user creation failed:", err);
    showToast("An error occurred while creating the user.", "error");
  }
}

// Admin panel: delete a user
window.deleteUser = function(username) {
  if (username === state.currentUser) {
    showToast("You cannot delete the user account you are currently logged into.", "warning");
    return;
  }
  
  if (!confirm(`Are you sure you want to delete user '${username}'? This will delete all of their isolated data and cannot be undone.`)) {
    return;
  }

  try {
    let users = getUsersFromStorage();
    users = users.filter(u => u.username !== username);
    saveUsersToStorage(users);

    // Clean up their namespace
    localStorage.removeItem(`gv_inventory_${username}`);
    localStorage.removeItem(`gv_sales_${username}`);
    localStorage.removeItem(`gv_suppliers_${username}`);
    localStorage.removeItem(`gv_platforms_${username}`);
    localStorage.removeItem(`gv_recycle_bin_${username}`);
    localStorage.removeItem(`gv_payouts_${username}`);
    localStorage.removeItem(`gv_expense_categories_${username}`);

    showToast(`User '${username}' deleted successfully.`, "success");
    renderAdminUsers();
  } catch (err) {
    console.error("Error deleting user:", err);
    showToast("Failed to delete user.", "error");
  }
};

// Admin panel: toggle 2FA status for a user
window.toggleUser2FA = function(username) {
  try {
    const users = getUsersFromStorage();
    const user = users.find(u => u.username === username);
    if (!user) {
      showToast("User not found.", "error");
      return;
    }
    
    user.twoFactorEnabled = !user.twoFactorEnabled;
    saveUsersToStorage(users);
    
    showToast(`2FA for '${username}' has been ${user.twoFactorEnabled ? 'enabled' : 'disabled'}.`, "success");
    renderAdminUsers();
  } catch (err) {
    console.error("Error toggling user 2FA:", err);
    showToast("Failed to toggle 2FA.", "error");
  }
};

// Admin panel: trigger Edit User modal
window.triggerEditUser = function(username) {
  const users = getUsersFromStorage();
  const user = users.find(u => u.username === username);
  if (!user) {
    showToast("User not found.", "error");
    return;
  }
  
  document.getElementById("edit-user-original-username").value = username;
  document.getElementById("edit-user-username").value = user.username;
  document.getElementById("edit-user-email").value = user.email;
  
  openModal("edit-user-modal");
};

// Admin panel: handle Edit User Form submit
function handleEditUserSubmit(e) {
  e.preventDefault();
  try {
    const originalUsername = document.getElementById("edit-user-original-username").value;
    const newUsername = document.getElementById("edit-user-username").value.trim();
    const newEmail = document.getElementById("edit-user-email").value.trim();

    if (newUsername.length < 3) {
      showToast("Username must be at least 3 characters long.", "warning");
      return;
    }

    const alphaNumericRegex = /^[a-zA-Z0-9_]+$/;
    if (!alphaNumericRegex.test(newUsername)) {
      showToast("Username must only contain letters, numbers, and underscores.", "warning");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      showToast("Please enter a valid email address.", "warning");
      return;
    }

    const users = getUsersFromStorage();
    const exists = users.some(u => u.username.toLowerCase() === newUsername.toLowerCase() && u.username.toLowerCase() !== originalUsername.toLowerCase());
    if (exists) {
      showToast("Username is already taken by another account.", "warning");
      return;
    }

    const user = users.find(u => u.username === originalUsername);
    if (!user) {
      showToast("User not found.", "error");
      return;
    }

    // Update username/email in storage
    user.username = newUsername;
    user.email = newEmail;
    saveUsersToStorage(users);

    // Helper to migrate namespace data keys in localStorage
    const migrateKey = (oldPfx, newPfx) => {
      const data = localStorage.getItem(oldPfx);
      if (data !== null) {
        localStorage.setItem(newPfx, data);
        localStorage.removeItem(oldPfx);
      }
    };

    // Migrate namespace data for the modified user
    if (originalUsername !== newUsername) {
      migrateKey(`gv_inventory_${originalUsername}`, `gv_inventory_${newUsername}`);
      migrateKey(`gv_sales_${originalUsername}`, `gv_sales_${newUsername}`);
      migrateKey(`gv_suppliers_${originalUsername}`, `gv_suppliers_${newUsername}`);
      migrateKey(`gv_platforms_${originalUsername}`, `gv_platforms_${newUsername}`);
      migrateKey(`gv_recycle_bin_${originalUsername}`, `gv_recycle_bin_${newUsername}`);
      migrateKey(`gv_payouts_${originalUsername}`, `gv_payouts_${newUsername}`);
      migrateKey(`gv_expense_categories_${originalUsername}`, `gv_expense_categories_${newUsername}`);
    }

    // If this is the current active session user, update session state!
    if (originalUsername === state.currentUser) {
      localStorage.setItem("gv_active_user", newUsername);
      state.currentUser = newUsername;
      
      // Update sidebar display name
      const nameDisplay = document.getElementById("user-display-name");
      if (nameDisplay) nameDisplay.textContent = newUsername;
    }

    closeModal("edit-user-modal");
    showToast(`User account updated successfully!`, "success");
    updateUI();
  } catch (err) {
    console.error("Failed to edit user account:", err);
    showToast("An error occurred while updating the user account.", "error");
  }
}

// Admin panel: render list of registered users
function renderAdminUsers() {
  const list = document.getElementById("admin-users-list");
  if (!list) return;
  list.innerHTML = "";

  const users = getUsersFromStorage();
  if (users.length === 0) {
    list.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--text-muted);">No users found.</td></tr>`;
    return;
  }

  users.forEach(u => {
    const tr = document.createElement("tr");
    const isCurrent = u.username === state.currentUser;
    
    // Create actions HTML
    let actionsHtml = "";
    if (isCurrent) {
      actionsHtml = `
        <div style="display: flex; gap: 8px; align-items: center; justify-content: flex-start; flex-wrap: wrap;">
          <button class="btn btn-sm btn-outline" style="font-size: 0.75rem; padding: 4px 8px; width: auto; display: inline-flex; align-items: center;" onclick="triggerEditUser('${u.username}')">
            <i class="fa-solid fa-pen-to-square" style="margin-right: 4px;"></i> Edit
          </button>
          <button class="btn btn-sm btn-outline" style="font-size: 0.75rem; padding: 4px 8px; width: auto; display: inline-flex; align-items: center;" onclick="toggleUser2FA('${u.username}')">
            <i class="fa-solid fa-shield-halved" style="margin-right: 4px;"></i> Toggle 2FA
          </button>
          <span style="color: var(--accent-purple); font-weight: 600; font-size: 0.8rem;">Current Session</span>
        </div>
      `;
    } else {
      actionsHtml = `
        <div style="display: flex; gap: 8px; align-items: center; justify-content: flex-start; flex-wrap: wrap;">
          <button class="btn btn-sm btn-outline" style="font-size: 0.75rem; padding: 4px 8px; width: auto; display: inline-flex; align-items: center;" onclick="triggerEditUser('${u.username}')">
            <i class="fa-solid fa-pen-to-square" style="margin-right: 4px;"></i> Edit
          </button>
          <button class="btn btn-sm btn-outline" style="font-size: 0.75rem; padding: 4px 8px; width: auto; display: inline-flex; align-items: center;" onclick="toggleUser2FA('${u.username}')">
            <i class="fa-solid fa-shield-halved" style="margin-right: 4px;"></i> Toggle 2FA
          </button>
          <button class="btn btn-sm btn-outline" style="background-color: var(--accent-danger)12; border-color: var(--accent-danger)25; color: var(--accent-danger); font-size: 0.75rem; padding: 4px 8px; width: auto; display: inline-flex; align-items: center;" onclick="deleteUser('${u.username}')">
            <i class="fa-solid fa-trash" style="margin-right: 4px;"></i> Delete
          </button>
        </div>
      `;
    }

    const twofaStatus = u.twoFactorEnabled 
      ? `<span class="badge" style="background-color: hsla(270, 85%, 60%, 0.1); border: 1px solid hsla(270, 85%, 60%, 0.2); color: var(--accent-purple); font-size: 0.7rem; font-weight: 600; padding: 2px 6px;">2FA Enabled</span>` 
      : `<span style="color: var(--text-muted); font-size: 0.75rem;">Disabled</span>`;

    tr.innerHTML = `
      <td><strong>${u.username}</strong></td>
      <td>${u.email}</td>
      <td>${twofaStatus}</td>
      <td>${actionsHtml}</td>
    `;
    list.appendChild(tr);
  });
}

// Perform logout
window.handleLogout = function() {
  localStorage.removeItem("gv_active_user");
  sessionStorage.removeItem("gv_active_user");
  localStorage.setItem("gv_local_logout", "true");
  
  state.currentUser = null;
  state.inventory = [];
  state.sales = [];
  state.suppliers = [];
  
  // Show auth view, hide app container
  const appContainer = document.getElementById("app-container");
  const authContainer = document.getElementById("auth-container");
  const logoutBtn = document.getElementById("btn-logout");

  if (appContainer) appContainer.classList.add("hidden");
  if (authContainer) authContainer.classList.remove("hidden");
  if (logoutBtn) logoutBtn.classList.add("hidden");
  
  // Reset fields in auth views
  const loginForm = document.getElementById("login-form");
  if (loginForm) loginForm.reset();
  const registerForm = document.getElementById("register-form");
  if (registerForm) registerForm.reset();
  
  showToast("Logged out successfully.", "info");
};

// Apply Theme to DOM
// Apply Theme to DOM
function applyTheme(mode, color) {
  console.log("applyTheme executing with mode:", mode, "color:", color);
  const root = document.documentElement;
  
  root.setAttribute("data-theme-mode", mode || "dark");
  root.setAttribute("data-theme-color", color || "classic");
  
  // Keep legacy toggle elements safe if they exist
  const toggleIcon = document.getElementById("theme-toggle-icon");
  const btnToggle = document.getElementById("btn-theme-toggle");
  if (mode === "light") {
    if (toggleIcon) toggleIcon.className = "fa-solid fa-moon";
    if (btnToggle) btnToggle.setAttribute("title", "Toggle Dark Mode");
  } else {
    if (toggleIcon) toggleIcon.className = "fa-solid fa-sun";
    if (btnToggle) btnToggle.setAttribute("title", "Toggle Light Mode");
  }
}

// Apply Font Size to HTML element
function applyFontSize(size) {
  document.documentElement.style.fontSize = size + "px";
  const label = document.getElementById("font-size-label");
  if (label) {
    label.textContent = `Font Size: ${size}px${size === 16 ? " (Default)" : ""}`;
  }
  const slider = document.getElementById("settings-font-size");
  if (slider) {
    slider.value = size;
  }
}

// Apply Date Format to Settings Dropdown
function applyDateFormat(format) {
  const dateFormatSelect = document.getElementById("settings-date-format");
  if (dateFormatSelect) {
    dateFormatSelect.value = format;
  }
}

// Format a date string (YYYY-MM-DD) based on active state format setting
function formatDate(dateStr) {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length !== 3) return dateStr;
  const year = parts[0];
  const month = parts[1];
  const day = parts[2];
  if (state.dateFormat === "MM/DD/YYYY") {
    return `${month}/${day}/${year}`;
  } else if (state.dateFormat === "DD/MM/YYYY") {
    return `${day}/${month}/${year}`;
  } else if (state.dateFormat === "Month DD, YYYY") {
    const months = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];
    const monthIndex = parseInt(month, 10) - 1;
    const monthName = (monthIndex >= 0 && monthIndex < 12) ? months[monthIndex] : month;
    return `${monthName} ${day}, ${year}`;
  }
  return dateStr;
}

// Apply Sidebar Icons dynamically
function applyMenuIcons() {
  renderSidebarMenu();
}

// Apply Sidebar Titles dynamically
function applyMenuTitles() {
  renderSidebarMenu();
}

// Render Settings sidebar customization panel (icons and titles)
function renderSidebarCustomizationSettings() {
  const listContainer = document.getElementById("settings-menu-icons-list");
  if (!listContainer) return;

  listContainer.innerHTML = "";

  const defaultMenus = {
    dashboard: { label: "Dashboard" },
    inventory: { label: "Inventory" },
    sales: { label: "Sales Ledger" },
    finance: { label: "Finance" },
    suppliers: { label: "Suppliers" },
    platforms: { label: "Platforms" },
    entries: { label: "Entries" },
    recycle: { label: "Recycle Bin" },
    settings: { label: "Settings" }
  };

  const availableIcons = [
    { value: "fa-gauge", label: "Gauge" },
    { value: "fa-house", label: "House" },
    { value: "fa-chart-line", label: "Chart Line" },
    { value: "fa-chart-pie", label: "Chart Pie" },
    { value: "fa-boxes-stacked", label: "Boxes Stacked" },
    { value: "fa-key", label: "Key" },
    { value: "fa-gamepad", label: "Gamepad" },
    { value: "fa-database", label: "Database" },
    { value: "fa-receipt", label: "Receipt" },
    { value: "fa-cart-shopping", label: "Cart" },
    { value: "fa-hand-holding-dollar", label: "Dollar Hand" },
    { value: "fa-coins", label: "Coins" },
    { value: "fa-wallet", label: "Wallet" },
    { value: "fa-truck-ramp-box", label: "Truck" },
    { value: "fa-shop", label: "Shop" },
    { value: "fa-building", label: "Building" },
    { value: "fa-users", label: "Users" },
    { value: "fa-tags", label: "Tags" },
    { value: "fa-list", label: "List" },
    { value: "fa-bookmark", label: "Bookmark" },
    { value: "fa-calculator", label: "Calculator" },
    { value: "fa-percent", label: "Percent" },
    { value: "fa-gear", label: "Gear" },
    { value: "fa-sliders", label: "Sliders" },
    { value: "fa-wrench", label: "Wrench" },
    { value: "fa-user-gear", label: "User Gear" },
    { value: "fa-envelope", label: "Envelope" },
    { value: "fa-circle-question", label: "Question" }
  ];

  state.menuOrder.forEach((key, idx) => {
    const m = defaultMenus[key];
    if (!m) return;

    const rowDiv = document.createElement("div");
    rowDiv.className = "menu-icon-row";
    rowDiv.setAttribute("draggable", "true");
    rowDiv.setAttribute("data-key", key);
    rowDiv.setAttribute("data-index", idx);

    const currentIcon = state.menuIcons[key] || "fa-gear";
    const currentTitle = state.menuTitles[key] || m.label;

    const optionsHtml = availableIcons.map(icon => 
      `<button type="button" class="icon-option ${icon.value === currentIcon ? 'selected' : ''}" data-icon="${icon.value}" title="${icon.label}"><i class="fa-solid ${icon.value}"></i></button>`
    ).join("");

    rowDiv.innerHTML = `
      <div class="menu-icon-drag-handle" title="Drag to reorder">
        <i class="fa-solid fa-grip-vertical"></i>
      </div>
      <div class="icon-picker-dropdown">
        <button type="button" class="btn-icon-picker" id="picker-btn-${key}" title="Change Icon">
          <i class="fa-solid ${currentIcon}"></i>
          <i class="fa-solid fa-chevron-down icon-picker-chevron"></i>
        </button>
        <div class="icon-picker-menu" id="picker-menu-${key}">
          ${optionsHtml}
        </div>
      </div>
      <input type="text" class="form-control form-control-sm menu-title-input" data-menu="${key}" value="${currentTitle}" placeholder="${m.label}" style="background-color: var(--bg-card); font-weight: 500; flex: 1; min-width: 0;">
      
      <div style="display: flex; align-items: center; margin-left: 8px; margin-right: 4px; flex-shrink: 0;" title="${key === 'settings' ? 'Settings visibility cannot be disabled' : 'Toggle Visibility'}">
        <label class="switch-toggle" style="position: relative; display: inline-block; width: 44px; height: 24px; cursor: ${key === 'settings' ? 'not-allowed' : 'pointer'}; margin: 0; ${key === 'settings' ? 'opacity: 0.5;' : ''}">
          <input type="checkbox" class="menu-visibility-toggle" data-menu="${key}" style="opacity: 0; width: 0; height: 0;" ${state.menuVisibility[key] !== false ? 'checked' : ''} ${key === 'settings' ? 'disabled' : ''}>
          <span class="switch-slider" style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; background-color: hsla(0, 0%, 100%, 0.1); border-radius: 34px; transition: 0.3s ease;"></span>
        </label>
      </div>

      <div class="menu-reorder-btn-group">
        <button type="button" class="btn-reorder btn-reorder-up" title="Move Up" ${idx === 0 ? 'disabled' : ''}>
          <i class="fa-solid fa-chevron-up"></i>
        </button>
        <button type="button" class="btn-reorder btn-reorder-down" title="Move Down" ${idx === state.menuOrder.length - 1 ? 'disabled' : ''}>
          <i class="fa-solid fa-chevron-down"></i>
        </button>
      </div>
    `;

    // HTML5 Drag and Drop Event Listeners
    rowDiv.addEventListener("dragstart", (e) => {
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", idx);
      rowDiv.classList.add("dragging");
    });

    rowDiv.addEventListener("dragend", () => {
      rowDiv.classList.remove("dragging");
      listContainer.querySelectorAll(".menu-icon-row").forEach(row => {
        row.classList.remove("drag-over");
      });
    });

    rowDiv.addEventListener("dragover", (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
    });

    rowDiv.addEventListener("dragenter", () => {
      if (!rowDiv.classList.contains("dragging")) {
        rowDiv.classList.add("drag-over");
      }
    });

    rowDiv.addEventListener("dragleave", () => {
      rowDiv.classList.remove("drag-over");
    });

    rowDiv.addEventListener("drop", (e) => {
      e.preventDefault();
      rowDiv.classList.remove("drag-over");
      
      const fromIndex = parseInt(e.dataTransfer.getData("text/plain"), 10);
      const toIndex = idx;
      
      if (isNaN(fromIndex) || fromIndex === toIndex) return;

      const tempOrder = [...state.menuOrder];
      const draggedKey = tempOrder[fromIndex];
      tempOrder.splice(fromIndex, 1);
      tempOrder.splice(toIndex, 0, draggedKey);
      
      state.menuOrder = tempOrder;
      saveStateToStorage();
      
      renderSidebarMenu();
      renderSidebarCustomizationSettings();
      
      showToast("Sidebar menu order updated.", "success");
      
      if (window.supabaseClient) {
        dbSaveSettings("menuOrder", state.menuOrder);
      }
    });

    // Icon Picker Event Listeners
    const pickerBtn = rowDiv.querySelector(".btn-icon-picker");
    const pickerMenu = rowDiv.querySelector(".icon-picker-menu");
    
    pickerBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      document.querySelectorAll(".icon-picker-menu").forEach(menu => {
        if (menu !== pickerMenu) menu.classList.remove("active");
      });
      pickerMenu.classList.toggle("active");
    });

    const iconOptions = rowDiv.querySelectorAll(".icon-option");
    iconOptions.forEach(opt => {
      opt.addEventListener("click", (e) => {
        e.stopPropagation();
        const newIcon = opt.getAttribute("data-icon");
        state.menuIcons[key] = newIcon;
        saveStateToStorage();

        // Update selected class
        iconOptions.forEach(o => o.classList.remove("selected"));
        opt.classList.add("selected");

        // Update picker button icon
        const btnIcon = pickerBtn.querySelector(".fa-solid:first-child");
        if (btnIcon) {
          btnIcon.className = `fa-solid ${newIcon}`;
        }

        // Update sidebar icon
        const sidebarIcon = document.getElementById(`sidebar-icon-${key}`);
        if (sidebarIcon) {
          sidebarIcon.className = `fa-solid ${newIcon}`;
        }

        // Close menu
        pickerMenu.classList.remove("active");

        showToast(`Updated icon for "${state.menuTitles[key] || m.label}".`, "success");
        if (window.supabaseClient) {
          dbSaveCustomization(key, state.menuTitles[key] || m.label, newIcon);
        }
      });
    });

    // Input element event listener (title change)
    const inputEl = rowDiv.querySelector("input.menu-title-input");
    inputEl.addEventListener("input", (e) => {
      const newTitle = e.target.value.trim() || m.label;
      state.menuTitles[key] = newTitle;
      saveStateToStorage();

      const sidebarText = document.getElementById(`sidebar-text-${key}`);
      if (sidebarText) {
        sidebarText.textContent = newTitle;
      }
      if (window.supabaseClient) {
        dbSaveCustomization(key, newTitle, state.menuIcons[key] || "fa-gear");
      }
    });

    // Visibility toggle event listener
    const toggleEl = rowDiv.querySelector(".menu-visibility-toggle");
    if (toggleEl) {
      toggleEl.addEventListener("change", (e) => {
        const isVisible = e.target.checked;
        state.menuVisibility[key] = isVisible;
        
        // Sync legacy showSalesLedger if the menu is 'sales'
        if (key === "sales") {
          state.showSalesLedger = isVisible;
          applySalesLedgerVisibility(isVisible);
          if (window.supabaseClient) {
            dbSaveSettings("showSalesLedger", isVisible);
          }
        }
        
        saveStateToStorage();
        renderSidebarMenu();
        
        showToast(`${isVisible ? 'Shown' : 'Hidden'} "${state.menuTitles[key] || m.label}" in the sidebar.`, "success");
        if (window.supabaseClient) {
          dbSaveSettings("menuVisibility", state.menuVisibility);
        }
      });
    }

    // Up / Down Button Event Listeners
    const btnUp = rowDiv.querySelector(".btn-reorder-up");
    if (btnUp) {
      btnUp.addEventListener("click", () => {
        if (idx === 0) return;
        const tempOrder = [...state.menuOrder];
        const temp = tempOrder[idx];
        tempOrder[idx] = tempOrder[idx - 1];
        tempOrder[idx - 1] = temp;
        
        state.menuOrder = tempOrder;
        saveStateToStorage();
        
        renderSidebarMenu();
        renderSidebarCustomizationSettings();
        
        showToast("Moved menu item up.", "success");
        if (window.supabaseClient) {
          dbSaveSettings("menuOrder", state.menuOrder);
        }
      });
    }

    const btnDown = rowDiv.querySelector(".btn-reorder-down");
    if (btnDown) {
      btnDown.addEventListener("click", () => {
        if (idx === state.menuOrder.length - 1) return;
        const tempOrder = [...state.menuOrder];
        const temp = tempOrder[idx];
        tempOrder[idx] = tempOrder[idx + 1];
        tempOrder[idx + 1] = temp;
        
        state.menuOrder = tempOrder;
        saveStateToStorage();
        
        renderSidebarMenu();
        renderSidebarCustomizationSettings();
        
        showToast("Moved menu item down.", "success");
        if (window.supabaseClient) {
          dbSaveSettings("menuOrder", state.menuOrder);
        }
      });
    }

    listContainer.appendChild(rowDiv);
  });
}

// Wrapper function to satisfy validator scripts
function renderMenuIconsSettings() {
  renderSidebarCustomizationSettings();
}

// ==========================================================================
// DYNAMIC SIDEBAR MENU
// ==========================================================================
function renderSidebarMenu() {
  const menuList = document.getElementById("sidebar-menu-list");
  if (!menuList) return;

  const currentHash = window.location.hash || "#dashboard";
  const activeKey = currentHash.replace("#", "");

  // If the active menu is hidden, redirect to the first visible one
  if (state.menuVisibility[activeKey] === false) {
    const firstVisible = state.menuOrder.find(k => state.menuVisibility[k] !== false);
    if (firstVisible) {
      window.location.hash = `#${firstVisible}`;
      setTimeout(() => {
        const link = document.getElementById(`nav-${firstVisible}`);
        if (link) link.click();
      }, 0);
      return;
    }
  }

  let html = "";

  state.menuOrder.forEach(key => {
    if (state.menuVisibility[key] === false) return;

    const iconClass = state.menuIcons[key] || "fa-gear";
    const titleText = state.menuTitles[key] || key;
    const isActive = (currentHash === `#${key}`);
    const activeClass = isActive ? "active" : "";

    html += `
      <li>
        <a href="#${key}" class="nav-link ${activeClass}" id="nav-${key}">
          <i class="fa-solid ${iconClass}" id="sidebar-icon-${key}"></i>
          <span id="sidebar-text-${key}">${titleText}</span>
        </a>
      </li>
    `;
  });

  // Append Collapse Menu at the end
  const isCollapsed = state.sidebarCollapsed;
  const collapseTitle = isCollapsed ? "Expand Sidebar" : "Collapse Sidebar";
  const collapseIcon = isCollapsed ? "fa-circle-chevron-right" : "fa-circle-chevron-left";
  html += `
    <li>
      <a href="#" class="nav-link" id="nav-collapse-sidebar" title="${collapseTitle}">
        <i class="fa-solid ${collapseIcon}" id="collapse-icon"></i>
        <span>Collapse Menu</span>
      </a>
    </li>
  `;

  menuList.innerHTML = html;
  bindSidebarEvents();
  
  // Re-apply visibility settings
  if (typeof applySalesLedgerVisibility === "function") {
    applySalesLedgerVisibility(state.showSalesLedger);
  }
  if (typeof applySidebarState === "function") {
    applySidebarState(state.sidebarCollapsed);
  }
}

function bindSidebarEvents() {
  const navLinks = document.querySelectorAll(".nav-link");
  const views = document.querySelectorAll(".content-view");
  const sidebar = document.getElementById("app-sidebar");

  navLinks.forEach(link => {
    link.addEventListener("click", (e) => {
      if (link.id === "nav-collapse-sidebar") {
        e.preventDefault();
        state.sidebarCollapsed = !state.sidebarCollapsed;
        saveStateToStorage();
        applySidebarState(state.sidebarCollapsed);
        return;
      }
      e.preventDefault();
      
      const targetHash = link.getAttribute("href");
      
      // Update Nav active states
      navLinks.forEach(l => l.classList.remove("active"));
      link.classList.add("active");

      // Switch views
      views.forEach(view => {
        view.classList.remove("active");
        if (`#${view.id.replace("-view", "")}` === targetHash) {
          view.classList.add("active");
        }
      });

      // Close mobile sidebar on link click
      if (sidebar && sidebar.classList.contains("active")) {
        sidebar.classList.remove("active");
      }

      // Update hash in URL
      window.location.hash = targetHash;

      // Trigger target route rendering sequence
      try {
        if (targetHash === "#inventory") {
          renderInventoryTable(getFilteredInventory());
        } else if (targetHash === "#sales") {
          renderSalesTable(getFilteredSales());
        } else if (targetHash === "#entries") {
          renderEntries();
        } else if (targetHash === "#suppliers") {
          renderSuppliers();
        } else if (targetHash === "#platforms") {
          renderPlatforms();
        } else if (targetHash === "#finance") {
          renderFinanceView();
        } else if (targetHash === "#recycle") {
          renderRecycleBin();
        } else if (targetHash === "#dashboard") {
          updateUI();
        } else if (targetHash === "#settings") {
          renderSidebarCustomizationSettings();
        }
      } catch (err) {
        console.error("Error rendering view on navigation:", err);
      }
    });
  });
}

// ==========================================================================
// NAVIGATION & GENERAL ROUTING
// ==========================================================================
function initNavigation() {
  // Render sidebar menu dynamically on launch
  renderSidebarMenu();

  // Query elements now that they are rendered
  const sidebar = document.getElementById("app-sidebar");
  const sidebarToggle = document.getElementById("sidebar-toggle");

  // Mobile sidebar toggle
  if (sidebarToggle && sidebar) {
    sidebarToggle.addEventListener("click", () => {
      sidebar.classList.toggle("active");
    });
  }

  // Handle date filters on Dashboard
  const periodButtons = document.querySelectorAll(".date-filter-group:not(#sup-date-filter-group) button");
  const customInputs = document.getElementById("custom-date-inputs");
  const startDateInput = document.getElementById("db-start-date");
  const endDateInput = document.getElementById("db-end-date");

  periodButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      periodButtons.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      const period = btn.getAttribute("data-period");
      state.activePeriod = period;
      
      if (period === "custom") {
        if (customInputs) customInputs.classList.remove("hidden");
      } else {
        if (customInputs) customInputs.classList.add("hidden");
        state.customStartDate = "";
        state.customEndDate = "";
        if (startDateInput) startDateInput.value = "";
        if (endDateInput) endDateInput.value = "";
      }
      updateUI(); // Re-render numbers and charts based on date filter
    });
  });

  if (startDateInput) {
    startDateInput.addEventListener("change", (e) => {
      state.customStartDate = e.target.value;
      if (state.activePeriod === "custom") {
        updateUI();
      }
    });
  }
  if (endDateInput) {
    endDateInput.addEventListener("change", (e) => {
      state.customEndDate = e.target.value;
      if (state.activePeriod === "custom") {
        updateUI();
      }
    });
  }

  // Trigger initial routing check based on URL hash if present
  try {
    const navLinks = document.querySelectorAll(".nav-link");
    const currentHash = window.location.hash || "#dashboard";
    const matchedLink = Array.from(navLinks).find(l => l.getAttribute("href") === currentHash);
    if (matchedLink) {
      console.log("initNavigation matching initial hash route:", currentHash);
      matchedLink.click();
    } else {
      const defaultDashboard = document.getElementById("nav-dashboard");
      if (defaultDashboard) defaultDashboard.click();
    }
  } catch (err) {
    console.error("Error in initial hash routing:", err);
  }
}

function startClock() {
  const clockElement = document.getElementById("current-time");
  setInterval(() => {
    const now = new Date();
    clockElement.textContent = now.toTimeString().split(" ")[0];
  }, 1000);
}

// ==========================================================================
// EVENT HANDLERS & MODALS
// ==========================================================================
function initEventHandlers() {
  // Undo/Redo click listeners
  const btnUndo = document.getElementById("btn-undo");
  const btnRedo = document.getElementById("btn-redo");
  if (btnUndo) btnUndo.addEventListener("click", window.handleUndo);
  if (btnRedo) btnRedo.addEventListener("click", window.handleRedo);

  // Undo/Redo keyboard shortcuts
  document.addEventListener("keydown", (e) => {
    const activeEl = document.activeElement;
    if (activeEl && (activeEl.tagName === "INPUT" || activeEl.tagName === "TEXTAREA" || activeEl.isContentEditable)) {
      return;
    }
    if (e.ctrlKey || e.metaKey) {
      if (e.key === "z" || e.key === "Z") {
        e.preventDefault();
        if (e.shiftKey) {
          window.handleRedo();
        } else {
          window.handleUndo();
        }
      } else if (e.key === "y" || e.key === "Y") {
        e.preventDefault();
        window.handleRedo();
      }
    }
  });

  // Modal opening buttons
  document.getElementById("btn-add-game-modal").addEventListener("click", () => openModal("add-game-modal"));
  const btnCreateSupplier = document.getElementById("btn-create-supplier");
  if (btnCreateSupplier) {
    btnCreateSupplier.addEventListener("click", () => openModal("add-supplier-modal"));
  }

  // Modal closing buttons (via data attribute)
  document.querySelectorAll("[data-close-modal]").forEach(btn => {
    btn.addEventListener("click", () => {
      const modalId = btn.getAttribute("data-close-modal");
      closeModal(modalId);
    });
  });

  // Close modals when clicking backdrop
  document.querySelectorAll(".modal-backdrop").forEach(backdrop => {
    backdrop.addEventListener("click", (e) => {
      if (e.target === backdrop) {
        closeModal(backdrop.id);
      }
    });
  });

  // Add Game Key Form Submission
  document.getElementById("add-game-form").addEventListener("submit", handleAddGameSubmit);



  // Sell Game Form Submission
  document.getElementById("sell-game-form").addEventListener("submit", handleSellGameSubmit);

  // Sell Game Autocomplete Search
  const sellGameSearchInput = document.getElementById("sell-game-search");
  const sellAutocompleteList = document.getElementById("sell-autocomplete-list");
  if (sellGameSearchInput && sellAutocompleteList) {
    sellGameSearchInput.addEventListener("input", (e) => {
      const q = e.target.value.toLowerCase().trim();
      if (!q) {
        sellAutocompleteList.style.display = "none";
        return;
      }
      
      const matches = state.inventory.filter(item => 
        item.status === "Available" && 
        ((item.title || "").toLowerCase().includes(q) || (item.key || "").toLowerCase().includes(q))
      );
      
      if (matches.length === 0) {
        sellAutocompleteList.innerHTML = `<div style="padding: 8px 12px; font-size: 0.8rem; color: var(--text-muted);">No in-stock keys found matching "${escapeHTML(q)}"</div>`;
        sellAutocompleteList.style.display = "block";
        return;
      }
      
      sellAutocompleteList.innerHTML = "";
      matches.slice(0, 30).forEach(item => {
        const itemEl = document.createElement("div");
        itemEl.className = "autocomplete-item";
        itemEl.style.padding = "8px 12px";
        itemEl.style.cursor = "pointer";
        itemEl.style.borderBottom = "1px solid var(--border-color)";
        itemEl.style.display = "flex";
        itemEl.style.flexDirection = "column";
        itemEl.style.gap = "2px";
        itemEl.innerHTML = `
          <div style="font-weight: 600; font-size: 0.85rem; color: #fff;">${escapeHTML(item.title)}</div>
          <div style="font-size: 0.75rem; color: var(--text-muted); display: flex; justify-content: space-between; align-items: center; gap: 10px;">
            <span>Platform: ${escapeHTML(item.platform)} | Cost: ${formatCurrency(item.cost)}</span>
            <code style="font-size: 0.7rem; color: var(--accent-purple); font-family: monospace;">${escapeHTML((item.key || "").slice(0, 10))}...</code>
          </div>
        `;
        
        itemEl.addEventListener("mouseenter", () => {
          itemEl.style.background = "var(--border-color)";
        });
        itemEl.addEventListener("mouseleave", () => {
          itemEl.style.background = "";
        });
        
        itemEl.addEventListener("click", () => {
          document.getElementById("sell-game-id").value = item.id;
          sellGameSearchInput.value = item.title;
          
          document.getElementById("sell-modal-title").textContent = item.title;
          document.getElementById("sell-modal-platform").textContent = item.platform;
          document.getElementById("sell-modal-cost").textContent = formatCurrency(item.cost);
          document.getElementById("sell-modal-key").textContent = item.key || "-";
          document.getElementById("sell-selected-game-card").style.display = "block";
          sellAutocompleteList.style.display = "none";
          
          // Auto fill sell price with default markup
          let defaultSalePrice;
          if (item.sellPrice !== undefined && item.sellPrice > 0) {
            defaultSalePrice = item.sellPrice.toFixed(2);
          } else if (state.defaultMarkupType === "percent") {
            defaultSalePrice = (item.cost * (1 + state.defaultMarkupValue / 100)).toFixed(2);
          } else {
            defaultSalePrice = (item.cost + state.defaultMarkupValue).toFixed(2);
          }
          document.getElementById("sale-price").value = defaultSalePrice;
        });
        
        sellAutocompleteList.appendChild(itemEl);
      });
      sellAutocompleteList.style.display = "block";
    });
    
    // Close list on clicking outside
    document.addEventListener("click", (e) => {
      if (!e.target.closest("#sell-search-container")) {
        sellAutocompleteList.style.display = "none";
      }
    });
  }

  // Edit Game Form Submission
  document.getElementById("edit-game-form").addEventListener("submit", handleEditGameSubmit);

  // Edit Catalog Entry Form Submission
  const editCatalogForm = document.getElementById("edit-catalog-entry-form");
  if (editCatalogForm) {
    editCatalogForm.addEventListener("submit", handleEditCatalogEntrySubmit);
  }

  // Add Supplier Form Submission
  document.getElementById("add-supplier-form").addEventListener("submit", handleAddSupplierSubmit);

  // Supplier Logo File Inputs visual feedback
  const supplierLogoFileInput = document.getElementById("supplier-logo-file-input");
  if (supplierLogoFileInput) {
    supplierLogoFileInput.addEventListener("change", (e) => {
      const label = supplierLogoFileInput.closest(".file-upload-label");
      if (label && e.target.files && e.target.files[0]) {
        label.innerHTML = `<i class="fa-solid fa-check"></i> ${e.target.files[0].name}`;
      }
    });
  }

  const editSupplierLogoFileInput = document.getElementById("edit-supplier-logo-file");
  if (editSupplierLogoFileInput) {
    editSupplierLogoFileInput.addEventListener("change", (e) => {
      const label = editSupplierLogoFileInput.closest(".file-upload-label");
      if (label && e.target.files && e.target.files[0]) {
        label.innerHTML = `<i class="fa-solid fa-check"></i> ${e.target.files[0].name}`;
      }
    });
  }

  // Platform Logo File Inputs visual feedback
  const platformLogoFileInput = document.getElementById("platform-logo-file-input");
  if (platformLogoFileInput) {
    platformLogoFileInput.addEventListener("change", (e) => {
      const label = platformLogoFileInput.closest(".file-upload-label");
      if (label && e.target.files && e.target.files[0]) {
        label.innerHTML = `<i class="fa-solid fa-check"></i> ${e.target.files[0].name}`;
      }
    });
  }

  const editPlatformLogoFileInput = document.getElementById("edit-platform-logo-file");
  if (editPlatformLogoFileInput) {
    editPlatformLogoFileInput.addEventListener("change", (e) => {
      const label = editPlatformLogoFileInput.closest(".file-upload-label");
      if (label && e.target.files && e.target.files[0]) {
        label.innerHTML = `<i class="fa-solid fa-check"></i> ${e.target.files[0].name}`;
      }
    });
  }



  // Toggle Visibility in View Key Modal
  const btnToggleKey = document.getElementById("btn-toggle-view-key");
  const viewKeyInput = document.getElementById("view-modal-key-input");
  const toggleEyeIcon = document.getElementById("toggle-key-eye-icon");

  btnToggleKey.addEventListener("click", () => {
    if (viewKeyInput.type === "password") {
      viewKeyInput.type = "text";
      toggleEyeIcon.classList.remove("fa-eye");
      toggleEyeIcon.classList.add("fa-eye-slash");
    } else {
      viewKeyInput.type = "password";
      toggleEyeIcon.classList.remove("fa-eye-slash");
      toggleEyeIcon.classList.add("fa-eye");
    }
  });

  // Copy Key in View Key Modal
  document.getElementById("btn-copy-view-key").addEventListener("click", () => {
    navigator.clipboard.writeText(viewKeyInput.value)
      .then(() => showToast("Activation key copied to clipboard!", "success"))
      .catch(() => showToast("Failed to copy key.", "error"));
  });



  // Filters Event Listeners for Inventory
  const handleInventoryFilterChange = () => {
    state.inventoryCurrentPage = 1;
    renderInventoryTable(getFilteredInventory());
  };

  document.getElementById("inv-filter-platform").addEventListener("change", handleInventoryFilterChange);
  document.getElementById("inv-filter-status").addEventListener("change", handleInventoryFilterChange);
  document.getElementById("inv-filter-supplier").addEventListener("change", handleInventoryFilterChange);
  const invFilterAging = document.getElementById("inv-filter-aging");
  if (invFilterAging) {
    invFilterAging.addEventListener("change", handleInventoryFilterChange);
  }
  const supplierDisplayInput = document.getElementById("settings-supplier-display");
  if (supplierDisplayInput) {
    supplierDisplayInput.addEventListener("change", (e) => {
      state.supplierDisplayMode = e.target.value;
      saveStateToStorage();
      if (window.supabaseClient && state.syncMode === "realtime") {
        dbSaveSettings("supplierDisplayMode", state.supplierDisplayMode);
      } else if (state.syncMode === "manual") {
        setUnsyncedChanges(true);
      }
      handleInventoryFilterChange();
    });
  }



  const invSortBySelect = document.getElementById("inv-sort-by");
  if (invSortBySelect) {
    invSortBySelect.addEventListener("change", (e) => {
      state.inventorySortBy = e.target.value;
      saveStateToStorage();
      if (window.supabaseClient && state.syncMode === "realtime") {
        dbSaveSettings("inventorySortBy", state.inventorySortBy);
      } else if (state.syncMode === "manual") {
        setUnsyncedChanges(true);
      }
      handleInventoryFilterChange();
    });
  }
  const debouncedInventorySearch = debounce(handleInventoryFilterChange, 150);
  document.getElementById("inv-search-input").addEventListener("input", debouncedInventorySearch);

  // Page Size Selector
  const invPageSizeSelect = document.getElementById("inv-page-size");
  if (invPageSizeSelect) {
    invPageSizeSelect.value = state.inventoryPageSize >= 100000 ? "virtual" : state.inventoryPageSize.toString();
    invPageSizeSelect.addEventListener("change", (e) => {
      state.inventoryPageSize = e.target.value === "virtual" ? 100000 : (parseInt(e.target.value) || 25);
      state.inventoryCurrentPage = 1;
      saveStateToStorage();
      if (window.supabaseClient && state.syncMode === "realtime") {
        dbSaveSettings("inventoryPageSize", state.inventoryPageSize);
      } else if (state.syncMode === "manual") {
        setUnsyncedChanges(true);
      }
      renderInventoryTable(getFilteredInventory());
    });
  }

  // Sales Page Size Selector
  const salesPageSizeSelect = document.getElementById("sales-page-size");
  if (salesPageSizeSelect) {
    salesPageSizeSelect.value = state.salesPageSize >= 100000 ? "virtual" : state.salesPageSize.toString();
    salesPageSizeSelect.addEventListener("change", (e) => {
      state.salesPageSize = e.target.value === "virtual" ? 100000 : (parseInt(e.target.value) || 25);
      state.salesCurrentPage = 1;
      saveStateToStorage();
      if (window.supabaseClient && state.syncMode === "realtime") {
        dbSaveSettings("salesPageSize", state.salesPageSize);
      } else if (state.syncMode === "manual") {
        setUnsyncedChanges(true);
      }
      updateUI();
    });
  }

  // Entries Page Size Selector
  const entriesPageSizeSelect = document.getElementById("entries-page-size");
  if (entriesPageSizeSelect) {
    entriesPageSizeSelect.value = state.entriesPageSize.toString();
    entriesPageSizeSelect.addEventListener("change", (e) => {
      state.entriesPageSize = parseInt(e.target.value) || 25;
      state.entriesCurrentPage = 1;
      saveStateToStorage();
      if (window.supabaseClient && state.syncMode === "realtime") {
        dbSaveSettings("entriesPageSize", state.entriesPageSize);
      } else if (state.syncMode === "manual") {
        setUnsyncedChanges(true);
      }
      updateUI();
    });
  }

  // Catalog Keys Page Size Selector
  const catalogKeysPageSizeSelect = document.getElementById("catalog-keys-page-size");
  if (catalogKeysPageSizeSelect) {
    catalogKeysPageSizeSelect.value = state.catalogKeysPageSize.toString();
    catalogKeysPageSizeSelect.addEventListener("change", (e) => {
      state.catalogKeysPageSize = parseInt(e.target.value) || 25;
      state.catalogKeysCurrentPage = 1;
      saveStateToStorage();
      if (window.supabaseClient && state.syncMode === "realtime") {
        dbSaveSettings("catalogKeysPageSize", state.catalogKeysPageSize);
      } else if (state.syncMode === "manual") {
        setUnsyncedChanges(true);
      }
      // Re-render the active catalog keys modal table
      if (state.activeCatalogKeysTitle) {
        triggerViewCatalogKeys(state.activeCatalogKeysTitle, false);
      }
    });
  }

  document.getElementById("btn-reset-inventory-filters").addEventListener("click", () => {
    document.getElementById("inv-filter-platform").value = "all";
    document.getElementById("inv-filter-status").value = "all";
    document.getElementById("inv-filter-supplier").value = "all";
    const agingFilterEl = document.getElementById("inv-filter-aging");
    if (agingFilterEl) agingFilterEl.value = "all";
    document.getElementById("inv-search-input").value = "";
    state.inventoryCurrentPage = 1;
    updateUI();
    showToast("Inventory filters reset.", "info");
  });

  // Filters Event Listeners for Sales
  document.getElementById("sales-filter-platform").addEventListener("change", updateUI);
  const debouncedSalesSearch = debounce(updateUI, 150);
  document.getElementById("sales-search-input").addEventListener("input", debouncedSalesSearch);
  
  // Dashboard Supplier Filter Event Listener
  const dbSupplierSelect = document.getElementById("db-filter-supplier");
  if (dbSupplierSelect) {
    dbSupplierSelect.addEventListener("change", updateUI);
  }

  // Suppliers view Filter Event Listeners
  const supSupplierSelect = document.getElementById("sup-filter-supplier");
  if (supSupplierSelect) {
    supSupplierSelect.addEventListener("change", updateUI);
  }

  const leaderboardSelect = document.getElementById("leaderboard-metric-select");
  if (leaderboardSelect) {
    leaderboardSelect.addEventListener("change", () => {
      renderSupplierAnalytics();
    });
  }

  const supPeriodButtons = document.querySelectorAll("#sup-date-filter-group button");
  supPeriodButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      supPeriodButtons.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      state.supActivePeriod = btn.getAttribute("data-sup-period");
      updateUI();
    });
  });
  document.getElementById("btn-reset-sales-filters").addEventListener("click", () => {
    document.getElementById("sales-filter-platform").value = "all";
    document.getElementById("sales-search-input").value = "";
    updateUI();
    showToast("Sales ledger filters reset.", "info");
  });

  // Global Search bar on top bar
  const handleGlobalSearchInput = () => {
    const val = document.getElementById("global-search").value.toLowerCase().trim();
    // If not on inventory, sales, or entries views, redirect user to inventory to view search results
    const activeView = document.querySelector(".content-view.active");
    if (activeView.id !== "inventory-view" && activeView.id !== "sales-view" && activeView.id !== "entries-view") {
      document.getElementById("nav-inventory").click();
    }
    
    const currentActiveView = document.querySelector(".content-view.active");
    if (currentActiveView.id === "inventory-view") {
      document.getElementById("inv-search-input").value = val;
    } else if (currentActiveView.id === "sales-view") {
      document.getElementById("sales-search-input").value = val;
    } else if (currentActiveView.id === "entries-view") {
      document.getElementById("entries-search-input").value = val;
    }
    updateUI();
  };
  document.getElementById("global-search").addEventListener("input", debounce(handleGlobalSearchInput, 150));

  // Entries search input listener
  const entriesSearch = document.getElementById("entries-search-input");
  if (entriesSearch) {
    const debouncedEntriesSearch = debounce(() => {
      state.entriesCurrentPage = 1;
      renderEntries();
    }, 150);
    entriesSearch.addEventListener("input", debouncedEntriesSearch);
  }

  // Entries Favorites toggle filter listener
  const btnFavFilter = document.getElementById("btn-entries-fav-filter");
  if (btnFavFilter) {
    btnFavFilter.addEventListener("click", () => {
      state.entriesFilterFav = !state.entriesFilterFav;
      const icon = document.getElementById("entries-fav-filter-icon");
      if (state.entriesFilterFav) {
        btnFavFilter.classList.add("btn-fav-active");
        btnFavFilter.classList.remove("btn-outline");
        if (icon) {
          icon.className = "fa-solid fa-star";
        }
      } else {
        btnFavFilter.classList.add("btn-outline");
        btnFavFilter.classList.remove("btn-fav-active");
        if (icon) {
          icon.className = "fa-regular fa-star";
        }
      }
      state.entriesCurrentPage = 1;
      renderEntries();
    });
  }

  // Suppliers Sort Listener
  const suppliersSort = document.getElementById("suppliers-sort");
  if (suppliersSort) {
    suppliersSort.addEventListener("change", renderSuppliers);
  }

  // Platforms Sort Listener
  const platformsSort = document.getElementById("platforms-sort");
  if (platformsSort) {
    platformsSort.addEventListener("change", renderPlatforms);
  }

  // Inventory Layout Toggle Listeners
  const btnList = document.getElementById("btn-layout-list");
  const btnGrid = document.getElementById("btn-layout-grid");
  const btnGallery = document.getElementById("btn-layout-gallery");
  
  // Make setInvLayout global so inline onclick handlers in index.html work reliably
  window.setInvLayout = (layout) => {
    try {
      console.log("setInvLayout called with layout:", layout);
      state.inventoryLayout = layout;
      saveStateToStorage();
      
      // Update toggle buttons active state
      const btnList = document.getElementById("btn-layout-list");
      const btnGrid = document.getElementById("btn-layout-grid");
      const btnGallery = document.getElementById("btn-layout-gallery");
      
      if (btnList && btnGrid && btnGallery) {
        btnList.classList.remove("active");
        btnGrid.classList.remove("active");
        btnGallery.classList.remove("active");
        
        if (layout === "list") btnList.classList.add("active");
        if (layout === "grid") btnGrid.classList.add("active");
        if (layout === "gallery") btnGallery.classList.add("active");
      }
      
      // Re-render inventory only
      const filtered = getFilteredInventory();
      console.log("setInvLayout filtering complete, item count:", filtered.length);
      renderInventoryTable(filtered);
    } catch (err) {
      console.error("Error in setInvLayout:", err);
    }
  };

  // Keep event listeners on DOM elements as an additional backup binding
  if (btnList && btnGrid && btnGallery) {
    btnList.addEventListener("click", () => window.setInvLayout("list"));
    btnGrid.addEventListener("click", () => window.setInvLayout("grid"));
    btnGallery.addEventListener("click", () => window.setInvLayout("gallery"));
  }

  // Settings Page - Appearance Mode Click Listeners
  const modes = [
    { key: "dark", name: "Dark Mode" },
    { key: "light", name: "Light Mode" }
  ];
  modes.forEach(m => {
    const el = document.getElementById(`mode-opt-${m.key}`);
    if (el) {
      el.addEventListener("click", () => {
        console.log(`${m.name} clicked. Current state.themeMode:`, state.themeMode);
        if (state.themeMode !== m.key) {
          state.themeMode = m.key;
          saveStateToStorage();
          applyTheme(state.themeMode, state.themeColor);
          updateThemeSelectionCards(state.themeMode, state.themeColor);
          if (window.supabaseClient) {
            dbSaveSettings("themeMode", state.themeMode);
          }
          updateUI();
          showToast(`Switched to ${m.name}`, "info");
        }
      });
    }
  });

  // Settings Page - Color Palette Click Listeners
  const colors = [
    { key: "classic", name: "Classic Palette" },
    { key: "ocean", name: "Midnight Ocean Palette" },
    { key: "cyberpunk", name: "Cyberpunk Neon Palette" },
    { key: "emerald", name: "Forest Emerald Palette" },
    { key: "amber", name: "Amber Gold Palette" }
  ];
  colors.forEach(c => {
    const el = document.getElementById(`color-opt-${c.key}`);
    if (el) {
      el.addEventListener("click", () => {
        console.log(`${c.name} clicked. Current state.themeColor:`, state.themeColor);
        if (state.themeColor !== c.key) {
          state.themeColor = c.key;
          saveStateToStorage();
          applyTheme(state.themeMode, state.themeColor);
          updateThemeSelectionCards(state.themeMode, state.themeColor);
          if (window.supabaseClient) {
            dbSaveSettings("themeColor", state.themeColor);
          }
          updateUI();
          showToast(`Switched to ${c.name}`, "info");
        }
      });
    }
  });

  // Settings Page - Currency Option Click Listeners
  const currEur = document.getElementById("curr-opt-eur");
  const currUsd = document.getElementById("curr-opt-usd");
  
  if (currEur) {
    currEur.addEventListener("click", () => {
      if (state.currency !== "EUR") {
        state.currency = "EUR";
        saveStateToStorage();
        updateCurrencySymbols();
        updateCurrencySelectionCards("EUR");
        if (window.supabaseClient && state.syncMode === "realtime") {
          dbSaveSettings("currency", state.currency);
        } else if (state.syncMode === "manual") {
          setUnsyncedChanges(true);
        }
        
        // Update advanced settings icons/renders
        const markupIcon = document.getElementById("markup-value-icon");
        if (markupIcon && state.defaultMarkupType === "flat") {
          markupIcon.className = "fa-solid fa-euro-sign";
        }
        renderPlatformFeePresetsSettings();
        
        updateUI();
        showToast("Switched currency notation to Euro (€)", "info");
      }
    });
  }

  if (currUsd) {
    currUsd.addEventListener("click", () => {
      if (state.currency !== "USD") {
        state.currency = "USD";
        saveStateToStorage();
        updateCurrencySymbols();
        updateCurrencySelectionCards("USD");
        if (window.supabaseClient && state.syncMode === "realtime") {
          dbSaveSettings("currency", state.currency);
        } else if (state.syncMode === "manual") {
          setUnsyncedChanges(true);
        }
        
        // Update advanced settings icons/renders
        const markupIcon = document.getElementById("markup-value-icon");
        if (markupIcon && state.defaultMarkupType === "flat") {
          markupIcon.className = "fa-solid fa-dollar-sign";
        }
        renderPlatformFeePresetsSettings();
        
        updateUI();
        showToast("Switched currency notation to US Dollar ($)", "info");
      }
    });
  }

  // Settings Page - Font Size Slider Listener
  const fontSizeSlider = document.getElementById("settings-font-size");
  if (fontSizeSlider) {
    fontSizeSlider.addEventListener("input", (e) => {
      const size = parseInt(e.target.value);
      state.fontSize = size;
      saveStateToStorage();
      applyFontSize(size);
    });
    fontSizeSlider.addEventListener("change", (e) => {
      if (window.supabaseClient) {
        dbSaveSettings("fontSize", state.fontSize);
      }
    });
  }

  // Settings Page - Date Format Selector Listener
  const dateFormatSelect = document.getElementById("settings-date-format");
  if (dateFormatSelect) {
    dateFormatSelect.addEventListener("change", (e) => {
      const format = e.target.value;
      state.dateFormat = format;
      saveStateToStorage();
      if (window.supabaseClient) {
        dbSaveSettings("dateFormat", state.dateFormat);
      }
      updateUI();
      showToast(`Switched date format to ${format}`, "info");
    });
  }

  // Settings Page - Custom Logo Event Listeners
  const logoFileInput = document.getElementById("settings-logo-file");
  const logoUrlInput = document.getElementById("settings-logo-url");
  const btnSaveBrand = document.getElementById("btn-save-brand");
  const btnResetLogo = document.getElementById("btn-reset-logo");

  if (logoFileInput) {
    logoFileInput.addEventListener("change", async (e) => {
      if (e.target.files && e.target.files[0]) {
        try {
          const base64 = await getBase64(e.target.files[0]);
          if (logoUrlInput) logoUrlInput.value = "";
          
          const previewDefault = document.getElementById("preview-logo-default");
          const previewCustom = document.getElementById("preview-logo-custom");
          if (previewDefault) previewDefault.classList.add("hidden");
          if (previewCustom) {
            previewCustom.src = base64;
            previewCustom.classList.remove("hidden");
          }
        } catch (err) {
          showToast("Failed to process logo file.", "error");
        }
      }
    });
  }

  if (logoUrlInput) {
    logoUrlInput.addEventListener("input", (e) => {
      const url = e.target.value.trim();
      if (url) {
        if (logoFileInput) logoFileInput.value = "";
        
        const previewDefault = document.getElementById("preview-logo-default");
        const previewCustom = document.getElementById("preview-logo-custom");
        if (previewDefault) previewDefault.classList.add("hidden");
        if (previewCustom) {
          previewCustom.src = url;
          previewCustom.classList.remove("hidden");
        }
      }
    });
  }

  if (btnSaveBrand) {
    btnSaveBrand.addEventListener("click", async () => {
      const urlVal = logoUrlInput ? logoUrlInput.value.trim() : "";
      const file = logoFileInput && logoFileInput.files && logoFileInput.files[0];
      
      if (file) {
        try {
          const base64 = await getBase64(file);
          state.customLogo = base64;
          saveStateToStorage();
          applyLogo(state.customLogo);
          if (window.supabaseClient) {
            await dbSaveSettings("customLogo", state.customLogo);
          }
          showToast("Brand logo updated successfully!", "success");
        } catch (err) {
          showToast("Failed to convert image file.", "error");
        }
      } else if (urlVal) {
        state.customLogo = urlVal;
        saveStateToStorage();
        applyLogo(state.customLogo);
        if (window.supabaseClient) {
          await dbSaveSettings("customLogo", state.customLogo);
        }
        showToast("Brand logo updated successfully!", "success");
      } else {
        showToast("Please select an image file or enter a URL first.", "warning");
      }
    });
  }

  if (btnResetLogo) {
    btnResetLogo.addEventListener("click", async () => {
      state.customLogo = null;
      saveStateToStorage();
      applyLogo(null);
      if (logoUrlInput) logoUrlInput.value = "";
      if (logoFileInput) logoFileInput.value = "";
      if (window.supabaseClient) {
        await dbSaveSettings("customLogo", null);
      }
      showToast("Reset to default brand logo.", "info");
    });
  }

  // CSV Import/Export Buttons

  document.getElementById("btn-export-inventory").addEventListener("click", exportInventoryToCSV);
  const btnExportAgingReport = document.getElementById("btn-export-aging-report");
  if (btnExportAgingReport) {
    btnExportAgingReport.addEventListener("click", exportAgingReportToCSV);
  }
  const btnGoToRecycle = document.getElementById("btn-go-to-recycle");
  if (btnGoToRecycle) {
    btnGoToRecycle.addEventListener("click", () => {
      const navRecycle = document.getElementById("nav-recycle");
      if (navRecycle) navRecycle.click();
    });
  }
  document.getElementById("btn-export-sales").addEventListener("click", exportSalesToCSV);
  const btnExportFinance = document.getElementById("btn-export-finance");
  if (btnExportFinance) {
    btnExportFinance.addEventListener("click", exportFinanceToCSV);
  }
  const financeBreakdownSelect = document.getElementById("finance-breakdown-type");
  if (financeBreakdownSelect) {
    financeBreakdownSelect.addEventListener("change", () => {
      renderFinanceView();
    });
  }
  const financeYearFilter = document.getElementById("finance-breakdown-year-filter");
  if (financeYearFilter) {
    financeYearFilter.addEventListener("change", () => {
      renderFinanceView();
    });
  }
  const financeChartBreakdownSelect = document.getElementById("finance-chart-breakdown-type");
  if (financeChartBreakdownSelect) {
    financeChartBreakdownSelect.addEventListener("change", () => {
      renderFinanceView();
    });
  }

  const financeSortBtn = document.getElementById("finance-breakdown-sort-order");
  if (financeSortBtn) {
    financeSortBtn.addEventListener("click", () => {
      state.financeSortOrder = state.financeSortOrder === "desc" ? "asc" : "desc";
      localStorage.setItem("gv_finance_sort_order", state.financeSortOrder);
      renderFinanceView();
    });
  }

  // Finance Layout Toggles
  const layoutButtons = document.querySelectorAll(".btn-toggle-layout");
  layoutButtons.forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      const style = btn.getAttribute("data-style");
      state.financeLayoutStyle = style;
      localStorage.setItem("gv_finance_layout_style", style);
      
      layoutButtons.forEach(b => {
        b.classList.toggle("active", b.getAttribute("data-style") === style);
      });
      
      renderFinanceView();
    });
  });

  // Auto-fill existing artwork from catalog titles on focus loss or selection
  const gameTitleInput = document.getElementById("game-title");
  const suggestionsContainer = document.getElementById("game-title-suggestions");

  if (gameTitleInput && suggestionsContainer) {
    let activeIndex = -1;

    // Filter unique matching titles from inventory
    gameTitleInput.addEventListener("input", (e) => {
      const query = e.target.value.trim().toLowerCase();
      activeIndex = -1;

      if (!query) {
        suggestionsContainer.innerHTML = "";
        suggestionsContainer.style.display = "none";
        return;
      }

      const matchesMap = new Map();
      state.inventory.forEach(item => {
        const title = item.title.trim();
        if (title.toLowerCase().includes(query)) {
          if (!matchesMap.has(title) || (!matchesMap.get(title).imageUrl && item.imageUrl)) {
            matchesMap.set(title, {
              title: title,
              imageUrl: item.imageUrl || "",
              platform: item.platform || "",
              cost: item.cost || 0,
              source: item.source || ""
            });
          }
        }
      });

      const matches = Array.from(matchesMap.values()).slice(0, 8);

      if (matches.length === 0) {
        suggestionsContainer.innerHTML = "";
        suggestionsContainer.style.display = "none";
        return;
      }

      suggestionsContainer.innerHTML = "";
      matches.forEach((match, idx) => {
        const itemDiv = document.createElement("div");
        itemDiv.className = "autocomplete-suggestion-item";
        itemDiv.dataset.index = idx;

        const imgHtml = match.imageUrl 
          ? `<img src="${match.imageUrl}" alt="${match.title}">` 
          : `<div class="game-thumbnail-placeholder" style="width: 24px; height: 24px; font-size: 0.65rem; border-radius: 4px; display: flex; align-items: center; justify-content: center;">${match.title.charAt(0)}</div>`;

        itemDiv.innerHTML = `
          ${imgHtml}
          <strong>${match.title}</strong>
          <span class="suggestion-platform">${match.platform}</span>
        `;

        itemDiv.addEventListener("click", () => {
          selectSuggestion(match);
        });

        suggestionsContainer.appendChild(itemDiv);
      });

      suggestionsContainer.style.display = "block";
    });

    function selectSuggestion(match) {
      gameTitleInput.value = match.title;
      suggestionsContainer.innerHTML = "";
      suggestionsContainer.style.display = "none";

      const imageUrlInput = document.getElementById("game-image-url");
      const platformSelect = document.getElementById("game-platform");
      const costInput = document.getElementById("game-cost");
      const sourceSelect = document.getElementById("game-source");

      if (imageUrlInput && match.imageUrl) {
        imageUrlInput.value = match.imageUrl;
      }
      if (platformSelect && match.platform) {
        platformSelect.value = match.platform;
      }
      if (costInput && match.cost) {
        costInput.value = match.cost;
      }
      if (sourceSelect && match.source) {
        sourceSelect.value = match.source;
      }

      showToast(`Selected "${match.title}" and auto-filled templates from inventory.`, "success");
    }

    gameTitleInput.addEventListener("keydown", (e) => {
      const items = suggestionsContainer.querySelectorAll(".autocomplete-suggestion-item");
      if (suggestionsContainer.style.display !== "block" || items.length === 0) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        if (activeIndex < items.length - 1) {
          if (activeIndex >= 0) items[activeIndex].classList.remove("active");
          activeIndex++;
          items[activeIndex].classList.add("active");
          items[activeIndex].scrollIntoView({ block: "nearest" });
        }
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        if (activeIndex > 0) {
          items[activeIndex].classList.remove("active");
          activeIndex--;
          items[activeIndex].classList.add("active");
          items[activeIndex].scrollIntoView({ block: "nearest" });
        }
      } else if (e.key === "Enter") {
        if (activeIndex >= 0) {
          e.preventDefault();
          items[activeIndex].click();
        }
      } else if (e.key === "Escape") {
        suggestionsContainer.innerHTML = "";
        suggestionsContainer.style.display = "none";
      }
    });

    document.addEventListener("click", (e) => {
      if (!gameTitleInput.contains(e.target) && !suggestionsContainer.contains(e.target)) {
        suggestionsContainer.innerHTML = "";
        suggestionsContainer.style.display = "none";
      }
    });
  }

  // Fallback blur handler for inputs typed without clicking suggestions
  if (gameTitleInput) {
    gameTitleInput.addEventListener("blur", () => {
      setTimeout(() => {
        const title = gameTitleInput.value.trim();
        const imageUrlInput = document.getElementById("game-image-url");
        if (title && imageUrlInput && !imageUrlInput.value.trim()) {
          const match = state.inventory.find(item => item.title.trim().toLowerCase() === title.toLowerCase() && item.imageUrl);
          if (match) {
            imageUrlInput.value = match.imageUrl;
            showToast(`Inherited cover artwork for "${match.title}" from catalog database.`, "info");
          }
        }
      }, 200);
    });
  }

  const editGameTitleInput = document.getElementById("edit-game-title");
  if (editGameTitleInput) {
    editGameTitleInput.addEventListener("blur", () => {
      const title = editGameTitleInput.value.trim();
      const imageUrlInput = document.getElementById("edit-game-image-url");
      if (title && imageUrlInput && !imageUrlInput.value.trim()) {
        const match = state.inventory.find(item => item.title.trim().toLowerCase() === title.toLowerCase() && item.imageUrl);
        if (match) {
          imageUrlInput.value = match.imageUrl;
          showToast(`Inherited cover artwork for "${match.title}" from catalog database.`, "info");
        }
      }
    });
  }

  // Sidebar collapse is now dynamically handled inside bindSidebarEvents()

  // Metrics Customizer Event Listeners
  const btnToggleMetrics = document.getElementById("btn-toggle-metrics-panel");
  const metricsPanel = document.getElementById("metrics-customize-panel");
  
  if (btnToggleMetrics && metricsPanel) {
    btnToggleMetrics.addEventListener("click", (e) => {
      e.stopPropagation();
      metricsPanel.classList.toggle("active");
    });
    
    // Close panel on clicking outside
    document.addEventListener("click", (e) => {
      const container = document.getElementById("metrics-customize-dropdown");
      if (container && !container.contains(e.target)) {
        metricsPanel.classList.remove("active");
      }
    });
    
    // Bind metric checkboxes
    const metricKeys = ["profit", "cost", "revenue", "roi", "stock", "velocity", "str", "unitProfit"];
    metricKeys.forEach(key => {
      const checkbox = document.getElementById(`toggle-metric-${key}`);
      if (checkbox) {
        checkbox.addEventListener("change", (e) => {
          state.visibleMetrics[key] = e.target.checked;
          saveStateToStorage();
          applyMetricsVisibility();
          if (window.supabaseClient) {
            dbSaveSettings("visibleMetrics", state.visibleMetrics);
          }
        });
      }
    });
  }

  // Suppliers Metrics Customizer Event Listeners
  const btnToggleSupMetrics = document.getElementById("btn-toggle-sup-metrics-panel");
  const supMetricsPanel = document.getElementById("sup-metrics-customize-panel");
  
  if (btnToggleSupMetrics && supMetricsPanel) {
    btnToggleSupMetrics.addEventListener("click", (e) => {
      e.stopPropagation();
      supMetricsPanel.classList.toggle("active");
    });
    
    // Close panel on clicking outside
    document.addEventListener("click", (e) => {
      const container = document.getElementById("sup-metrics-customize-dropdown");
      if (container && !container.contains(e.target)) {
        supMetricsPanel.classList.remove("active");
      }
    });
    
    // Bind supplier metric checkboxes
    const supMetricKeys = ["profit", "cost", "revenue", "roi", "stock", "velocity", "str", "unitProfit"];
    supMetricKeys.forEach(key => {
      const checkbox = document.getElementById(`toggle-sup-metric-${key}`);
      if (checkbox) {
        checkbox.addEventListener("change", (e) => {
          state.supVisibleMetrics[key] = e.target.checked;
          saveStateToStorage();
          applySupplierMetricsVisibility();
          if (window.supabaseClient) {
            dbSaveSettings("supVisibleMetrics", state.supVisibleMetrics);
          }
        });
      }
    });
  }

  // Figures Customizer Event Listeners (Removed - replaced by Widget Gallery)

  // Bestsellers Customizer Event Listeners
  const bestsellersLimitSelect = document.getElementById("bestsellers-limit-select");
  const bestsellersMetricSelect = document.getElementById("bestsellers-metric-select");
  if (bestsellersLimitSelect && bestsellersMetricSelect) {
    bestsellersLimitSelect.value = state.bestsellersLimit;
    bestsellersMetricSelect.value = state.bestsellersMetric;
    
    const handleBestsellersChange = () => {
      state.bestsellersLimit = parseInt(bestsellersLimitSelect.value) || 5;
      state.bestsellersMetric = bestsellersMetricSelect.value || "profit";
      saveStateToStorage();
      updateUI();
    };
    
    bestsellersLimitSelect.addEventListener("change", handleBestsellersChange);
    bestsellersMetricSelect.addEventListener("change", handleBestsellersChange);
  }

  // Event delegation for inventory checkbox selections
  document.addEventListener("change", (e) => {
    if (e.target.classList.contains("inv-row-select")) {
      const id = e.target.getAttribute("data-id");
      if (e.target.checked) {
        if (!state.selectedInventoryIds.includes(id)) {
          state.selectedInventoryIds.push(id);
        }
      } else {
        state.selectedInventoryIds = state.selectedInventoryIds.filter(x => x !== id);
      }
      updateBulkActionsBar();
    }
    if (e.target.id === "inv-select-all") {
      const checked = e.target.checked;
      const activeItems = state._activeRenderedItems || [];
      if (checked) {
        state.selectedInventoryIds = activeItems.map(item => item.id);
      } else {
        state.selectedInventoryIds = [];
      }
      document.querySelectorAll(".inv-row-select").forEach(cb => {
        const id = cb.getAttribute("data-id");
        cb.checked = state.selectedInventoryIds.includes(id);
      });
      updateBulkActionsBar();
    }
  });

  // Bulk delete action button listener
  const btnBulkDelete = document.getElementById("btn-bulk-delete");
  if (btnBulkDelete) {
    btnBulkDelete.addEventListener("click", () => {
      const selectedIds = state.selectedInventoryIds || [];
      if (selectedIds.length === 0) return;

      const confirmMsg = `Are you sure you want to move the ${selectedIds.length} selected key(s) to the Recycle Bin?`;
      if (confirm(confirmMsg)) {
        pushToUndoStack();
        // Backup the items we are about to delete
        const deletedInventory = state.inventory.filter(item => selectedIds.includes(item.id));
        const deletedSales = state.sales.filter(sale => selectedIds.includes(sale.inventoryId));

        // Move to recycle bin
        state.recycleBin.inventory.push(...deletedInventory);
        state.recycleBin.sales.push(...deletedSales);

        // Perform deletion from active state
        state.inventory = state.inventory.filter(item => !selectedIds.includes(item.id));
        state.sales = state.sales.filter(sale => !selectedIds.includes(sale.inventoryId));

        // Clear selections
        state.selectedInventoryIds = [];

        // Save changes
        saveStateToStorage();
        
        // Supabase sync
        if (window.supabaseClient) {
          deletedInventory.forEach(item => {
            dbDeleteInventory(item.id);
          });
          deletedSales.forEach(sale => {
            dbDeleteSale(sale.id);
          });
        } else if (state.syncMode === "manual") {
          setUnsyncedChanges(true);
        }

        // Refresh UI
        updateUI();

        showToast(`Moved ${selectedIds.length} key(s) to the Recycle Bin.`, "info");
      }
    });
  }

  // Recycle bin select all listener
  const recycleSelectAll = document.getElementById("recycle-select-all");
  if (recycleSelectAll) {
    recycleSelectAll.addEventListener("change", (e) => {
      const checked = e.target.checked;
      document.querySelectorAll(".recycle-row-select").forEach(cb => {
        cb.checked = checked;
      });
      updateRecycleBulkActionsBar();
    });
  }

  // Recycle bulk actions - Restore Selected
  const btnRecycleRestore = document.getElementById("btn-recycle-bulk-restore");
  if (btnRecycleRestore) {
    btnRecycleRestore.addEventListener("click", async () => {
      const checkedBoxes = document.querySelectorAll(".recycle-row-select:checked");
      const ids = Array.from(checkedBoxes).map(cb => cb.getAttribute("data-id"));
      if (ids.length === 0) return;

      if (confirm(`Are you sure you want to restore the ${ids.length} selected item(s) back to active inventory?`)) {
        pushToUndoStack();
        const restoredGames = [];
        const restoredSales = [];

        ids.forEach(id => {
          const gameIndex = state.recycleBin.inventory.findIndex(item => item.id === id);
          if (gameIndex !== -1) {
            const game = state.recycleBin.inventory[gameIndex];
            state.recycleBin.inventory.splice(gameIndex, 1);
            state.inventory.push(game);
            restoredGames.push(game);

            // Restore associated sale if any
            const saleIndex = state.recycleBin.sales.findIndex(s => s.inventoryId === id);
            if (saleIndex !== -1) {
              const sale = state.recycleBin.sales[saleIndex];
              state.recycleBin.sales.splice(saleIndex, 1);
              state.sales.push(sale);
              restoredSales.push(sale);
            }
          }
        });

        saveStateToStorage();

        // Supabase sync
        if (window.supabaseClient) {
          if (state.syncMode === "manual") {
            setUnsyncedChanges(true);
          } else {
            try {
              await Promise.all([
                ...restoredGames.map(game => dbSaveInventory(game)),
                ...restoredSales.map(sale => dbSaveSale(sale))
              ]);
            } catch (err) {
              console.error("Error syncing restored items to Supabase:", err);
            }
          }
        } else if (state.syncMode === "manual") {
          setUnsyncedChanges(true);
        }

        updateUI();
        showToast(`Successfully restored ${ids.length} item(s).`, "success");
      }
    });
  }

  // Recycle bulk actions - Delete Permanently Selected
  const btnRecyclePurge = document.getElementById("btn-recycle-bulk-purge");
  if (btnRecyclePurge) {
    btnRecyclePurge.addEventListener("click", () => {
      const checkedBoxes = document.querySelectorAll(".recycle-row-select:checked");
      const ids = Array.from(checkedBoxes).map(cb => cb.getAttribute("data-id"));
      if (ids.length === 0) return;

      if (confirm(`Are you sure you want to permanently delete the ${ids.length} selected item(s)? This action cannot be undone.`)) {
        pushToUndoStack();
        state.recycleBin.inventory = state.recycleBin.inventory.filter(item => !ids.includes(item.id));
        state.recycleBin.sales = state.recycleBin.sales.filter(sale => !ids.includes(sale.inventoryId));

        saveStateToStorage();
        updateUI();
        showToast(`Permanently deleted ${ids.length} item(s).`, "success");
      }
    });
  }

  // Empty Recycle Bin
  const btnEmptyRecycle = document.getElementById("btn-empty-recycle");
  if (btnEmptyRecycle) {
    btnEmptyRecycle.addEventListener("click", () => {
      if (state.recycleBin.inventory.length === 0) {
        showToast("Recycle Bin is already empty.", "info");
        return;
      }
      if (confirm("Are you sure you want to permanently empty the Recycle Bin? All items will be permanently deleted and cannot be restored.")) {
        pushToUndoStack();
        state.recycleBin.inventory = [];
        state.recycleBin.sales = [];

        saveStateToStorage();
        updateUI();
        showToast("Recycle Bin successfully emptied.", "success");
      }
    });
  }

  // Suppliers/Publishers Tab Toggle
  const supplierTabButtons = document.querySelectorAll(".btn-supplier-tab-toggle");
  supplierTabButtons.forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      const tab = btn.getAttribute("data-tab");
      state.suppliersActiveTab = tab;
      
      supplierTabButtons.forEach(b => {
        b.classList.toggle("active", b.getAttribute("data-tab") === tab);
        if (b.getAttribute("data-tab") === tab) {
          b.style.color = "var(--text-primary)";
        } else {
          b.style.color = "var(--text-secondary)";
        }
      });
      
      updateUI();
    });
  });

  // Excel/CSV Bulk Import Event Handlers
  const importDropZone = document.getElementById("import-drop-zone");
  const importFileInput = document.getElementById("settings-import-file");
  const btnImportSheet = document.getElementById("btn-import-sheet");
  const importFileName = document.getElementById("import-file-name");

  if (importDropZone && importFileInput && btnImportSheet) {
    let selectedFileForImport = null;

    importDropZone.addEventListener("click", () => {
      importFileInput.click();
    });

    importFileInput.addEventListener("change", (e) => {
      if (e.target.files && e.target.files[0]) {
        selectedFileForImport = e.target.files[0];
        if (importFileName) importFileName.textContent = selectedFileForImport.name;
        btnImportSheet.disabled = false;
        showToast("File selected. Click 'Start Import' to begin.", "info");
      }
    });

    // Drag and drop events
    importDropZone.addEventListener("dragover", (e) => {
      e.preventDefault();
      importDropZone.style.borderColor = "var(--accent-emerald)";
      importDropZone.style.background = "hsla(145, 85%, 48%, 0.03)";
    });

    importDropZone.addEventListener("dragleave", () => {
      importDropZone.style.borderColor = "var(--border-color)";
      importDropZone.style.background = "hsla(0, 0%, 100%, 0.01)";
    });

    importDropZone.addEventListener("drop", (e) => {
      e.preventDefault();
      importDropZone.style.borderColor = "var(--border-color)";
      importDropZone.style.background = "hsla(0, 0%, 100%, 0.01)";
      
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        selectedFileForImport = e.dataTransfer.files[0];
        if (importFileName) importFileName.textContent = selectedFileForImport.name;
        btnImportSheet.disabled = false;
        showToast("File dropped. Click 'Start Import' to begin.", "info");
      }
    });

    btnImportSheet.addEventListener("click", () => {
      if (selectedFileForImport) {
        if (selectedFileForImport.name.toLowerCase().endsWith(".csv")) {
          importInventoryFromCSV(selectedFileForImport);
        } else {
          importStateFromSpreadsheet(selectedFileForImport);
        }
      }
    });
  }
  
  if (typeof initCSVImportWizard === "function") {
    initCSVImportWizard();
  }

  // Dashboard tabs click listener
  document.querySelectorAll(".dashboard-tab-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const tabName = btn.getAttribute("data-tab");
      
      // Update active tab button style
      document.querySelectorAll(".dashboard-tab-btn").forEach(b => {
        b.classList.remove("active");
        b.style.color = "var(--text-muted)";
        b.style.borderBottomColor = "transparent";
      });
      btn.classList.add("active");
      btn.style.color = "var(--text-main)";
      btn.style.borderBottomColor = "var(--accent-cyan)";
      
      // Update active panel visibility
      const panels = document.querySelectorAll(".dashboard-tab-content .tab-panel");
      panels.forEach(panel => {
        if (panel.id === `tab-panel-${tabName}`) {
          panel.style.display = "block";
          panel.classList.add("active");
        } else {
          panel.style.display = "none";
          panel.classList.remove("active");
        }
      });
    });
  });
}

// Update the floating bulk actions bar visibility and selection counters
function updateBulkActionsBar() {
  const count = state.selectedInventoryIds ? state.selectedInventoryIds.length : 0;
  const bar = document.getElementById("bulk-actions-bar");
  const countText = document.getElementById("bulk-select-count");
  
  if (bar && countText) {
    if (count > 0) {
      countText.textContent = `${count} key${count === 1 ? '' : 's'} selected`;
      bar.classList.remove("hidden");
    } else {
      bar.classList.add("hidden");
    }
  }

  const selectAllCheckbox = document.getElementById("inv-select-all");
  if (selectAllCheckbox) {
    const activeItems = state._activeRenderedItems || [];
    selectAllCheckbox.checked = activeItems.length > 0 && activeItems.every(item => state.selectedInventoryIds.includes(item.id));
  }
}

// Navigation helper to switch views programmatically
function navigateToHash(targetHash) {
  const navLinks = document.querySelectorAll(".nav-link");
  const views = document.querySelectorAll(".content-view");
  const sidebar = document.getElementById("app-sidebar");

  let matchedLink = null;
  navLinks.forEach(link => {
    if (link.getAttribute("href") === targetHash) {
      matchedLink = link;
    }
  });

  if (matchedLink) {
    navLinks.forEach(l => l.classList.remove("active"));
    matchedLink.classList.add("active");
  }

  views.forEach(view => {
    view.classList.remove("active");
    if (`#${view.id.replace("-view", "")}` === targetHash) {
      view.classList.add("active");
    }
  });

  if (sidebar && sidebar.classList.contains("active")) {
    sidebar.classList.remove("active");
  }

  try {
    if (targetHash === "#inventory") {
      renderInventoryTable(getFilteredInventory());
    } else if (targetHash === "#sales") {
      renderSalesTable(getFilteredSales());
    } else if (targetHash === "#entries") {
      renderEntries();
    } else if (targetHash === "#suppliers") {
      renderSuppliers();
    } else if (targetHash === "#platforms") {
      renderPlatforms();
    } else if (targetHash === "#finance") {
      renderFinanceView();
    } else if (targetHash === "#recycle") {
      renderRecycleBin();
    } else if (targetHash === "#dashboard") {
      updateUI();
    }
  } catch (err) {
    console.error("Error rendering view on programmatic navigation:", err);
  }
}



// Initialize Bulk Actions dropdowns and button event listeners
function initBulkActionsToolbar() {
  const btnClear = document.getElementById("btn-bulk-clear");
  if (btnClear) {
    btnClear.addEventListener("click", () => {
      state.selectedInventoryIds = [];
      updateUI();
    });
  }

  const statusToggle = document.getElementById("btn-bulk-status-toggle");
  const supplierToggle = document.getElementById("btn-bulk-supplier-toggle");
  const platformToggle = document.getElementById("btn-bulk-platform-toggle");

  const statusMenu = document.getElementById("bulk-status-menu");
  const supplierMenu = document.getElementById("bulk-supplier-menu");
  const platformMenu = document.getElementById("bulk-platform-menu");

  const closeAllBulkMenus = () => {
    if (statusMenu) statusMenu.classList.remove("show");
    if (supplierMenu) supplierMenu.classList.remove("show");
    if (platformMenu) platformMenu.classList.remove("show");
  };

  if (statusToggle && statusMenu) {
    statusToggle.addEventListener("click", (e) => {
      e.stopPropagation();
      const show = !statusMenu.classList.contains("show");
      closeAllBulkMenus();
      if (show) statusMenu.classList.add("show");
    });
  }

  if (supplierToggle && supplierMenu) {
    supplierToggle.addEventListener("click", (e) => {
      e.stopPropagation();
      const show = !supplierMenu.classList.contains("show");
      closeAllBulkMenus();
      if (show) {
        supplierMenu.innerHTML = "";
        state.suppliers.forEach(sup => {
          if (!sup || sup.enabled === false) return;
          const btn = document.createElement("button");
          btn.type = "button";
          btn.className = "bulk-menu-item";
          btn.textContent = sup.name;
          btn.addEventListener("click", () => {
            applyBulkSupplier(sup.name);
            closeAllBulkMenus();
          });
          supplierMenu.appendChild(btn);
        });
        if (supplierMenu.children.length === 0) {
          supplierMenu.innerHTML = `<span style="padding: 8px 12px; font-size: 0.75rem; color: var(--text-muted);">No active suppliers</span>`;
        }
        supplierMenu.classList.add("show");
      }
    });
  }

  if (platformToggle && platformMenu) {
    platformToggle.addEventListener("click", (e) => {
      e.stopPropagation();
      const show = !platformMenu.classList.contains("show");
      closeAllBulkMenus();
      if (show) {
        platformMenu.innerHTML = "";
        state.platforms.forEach(plat => {
          if (!plat || plat.enabled === false) return;
          const btn = document.createElement("button");
          btn.type = "button";
          btn.className = "bulk-menu-item";
          btn.textContent = plat.name;
          btn.addEventListener("click", () => {
            applyBulkPlatform(plat.name);
            closeAllBulkMenus();
          });
          platformMenu.appendChild(btn);
        });
        if (platformMenu.children.length === 0) {
          platformMenu.innerHTML = `<span style="padding: 8px 12px; font-size: 0.75rem; color: var(--text-muted);">No active platforms</span>`;
        }
        platformMenu.classList.add("show");
      }
    });
  }

  const statusItems = document.querySelectorAll("#bulk-status-menu .bulk-menu-item");
  statusItems.forEach(item => {
    item.addEventListener("click", () => {
      const status = item.getAttribute("data-status");
      if (status) {
        applyBulkStatus(status);
        closeAllBulkMenus();
      }
    });
  });

  const btnBulkPrice = document.getElementById("btn-bulk-price");
  if (btnBulkPrice) {
    btnBulkPrice.addEventListener("click", () => {
      const count = state.selectedInventoryIds ? state.selectedInventoryIds.length : 0;
      const countLabel = document.getElementById("bulk-adjust-count-label");
      if (countLabel) countLabel.textContent = count;
      
      document.getElementById("bulk-cost-action").value = "none";
      document.getElementById("bulk-cost-value-row").style.display = "none";
      document.getElementById("bulk-cost-value").value = "";
      document.getElementById("bulk-cost-percent").checked = false;

      document.getElementById("bulk-sell-action").value = "none";
      document.getElementById("bulk-sell-value-row").style.display = "none";
      document.getElementById("bulk-sell-value").value = "";
      document.getElementById("bulk-sell-percent").checked = false;

      openModal("bulk-price-adjust-modal");
    });
  }

  const btnBulkExport = document.getElementById("btn-bulk-export");
  if (btnBulkExport) {
    btnBulkExport.addEventListener("click", () => {
      exportBulkInventoryToCSV();
    });
  }

  document.addEventListener("click", () => {
    closeAllBulkMenus();
  });
}

// Initialize Bulk Price Adjust Modal form event listeners
function initBulkPriceAdjustModalForm() {
  const costAction = document.getElementById("bulk-cost-action");
  const costValRow = document.getElementById("bulk-cost-value-row");
  if (costAction && costValRow) {
    costAction.addEventListener("change", (e) => {
      if (e.target.value === "none") {
        costValRow.style.display = "none";
      } else {
        costValRow.style.display = "flex";
      }
    });
  }

  const sellAction = document.getElementById("bulk-sell-action");
  const sellValRow = document.getElementById("bulk-sell-value-row");
  if (sellAction && sellValRow) {
    sellAction.addEventListener("change", (e) => {
      if (e.target.value === "none") {
        sellValRow.style.display = "none";
      } else {
        sellValRow.style.display = "flex";
      }
    });
  }

  const form = document.getElementById("bulk-price-adjust-form");
  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      
      const cAction = document.getElementById("bulk-cost-action").value;
      const cVal = document.getElementById("bulk-cost-value").value;
      const cPercent = document.getElementById("bulk-cost-percent").checked;

      const sAction = document.getElementById("bulk-sell-action").value;
      const sVal = document.getElementById("bulk-sell-value").value;
      const sPercent = document.getElementById("bulk-sell-percent").checked;

      if (cAction === "none" && sAction === "none") {
        showToast("No modifications selected.", "warning");
        closeModal("bulk-price-adjust-modal");
        return;
      }

      applyBulkPriceAdjustment(cAction, cVal, cPercent, sAction, sVal, sPercent);
      closeModal("bulk-price-adjust-modal");
    });
  }
}

// Bulk status change helper
function applyBulkStatus(newStatus) {
  const selectedIds = state.selectedInventoryIds || [];
  if (selectedIds.length === 0) return;

  pushToUndoStack();

  let modifiedCount = 0;
  state.inventory.forEach(item => {
    if (selectedIds.includes(item.id)) {
      item.status = newStatus;
      modifiedCount++;
      if (window.supabaseClient && state.syncMode === "realtime") {
        dbSaveInventory(item);
      }
    }
  });

  if (modifiedCount > 0) {
    if (!window.supabaseClient && state.syncMode === "manual") {
      setUnsyncedChanges(true);
    }
    saveStateToStorage();
    state.selectedInventoryIds = [];
    updateUI();
    showToast(`Successfully updated status to "${newStatus}" for ${modifiedCount} item(s).`, "success");
  }
}

// Bulk supplier change helper
function applyBulkSupplier(newSupplier) {
  const selectedIds = state.selectedInventoryIds || [];
  if (selectedIds.length === 0) return;

  pushToUndoStack();

  let modifiedCount = 0;
  state.inventory.forEach(item => {
    if (selectedIds.includes(item.id)) {
      item.source = newSupplier;
      modifiedCount++;
      if (window.supabaseClient && state.syncMode === "realtime") {
        dbSaveInventory(item);
      }
    }
  });

  if (modifiedCount > 0) {
    if (!window.supabaseClient && state.syncMode === "manual") {
      setUnsyncedChanges(true);
    }
    saveStateToStorage();
    state.selectedInventoryIds = [];
    updateUI();
    showToast(`Successfully updated supplier to "${newSupplier}" for ${modifiedCount} item(s).`, "success");
  }
}

// Bulk platform change helper
function applyBulkPlatform(newPlatform) {
  const selectedIds = state.selectedInventoryIds || [];
  if (selectedIds.length === 0) return;

  pushToUndoStack();

  let modifiedCount = 0;
  state.inventory.forEach(item => {
    if (selectedIds.includes(item.id)) {
      item.platform = newPlatform;
      modifiedCount++;
      if (window.supabaseClient && state.syncMode === "realtime") {
        dbSaveInventory(item);
      }
    }
  });

  if (modifiedCount > 0) {
    if (!window.supabaseClient && state.syncMode === "manual") {
      setUnsyncedChanges(true);
    }
    saveStateToStorage();
    state.selectedInventoryIds = [];
    updateUI();
    showToast(`Successfully updated platform to "${newPlatform}" for ${modifiedCount} item(s).`, "success");
  }
}

// Bulk selection CSV exporter
function exportBulkInventoryToCSV() {
  const selectedIds = state.selectedInventoryIds || [];
  if (selectedIds.length === 0) {
    showToast("No items selected for export.", "warning");
    return;
  }

  const selectedItems = state.inventory.filter(item => selectedIds.includes(item.id));
  if (selectedItems.length === 0) return;

  const csvRows = [];
  csvRows.push(["ID", "Game Title", "Platform", "Digital Key", "Acquisition Cost", "Source", "Date Added", "Status", "Notes"]);

  selectedItems.forEach(item => {
    csvRows.push([
      item.id,
      `"${item.title.replace(/"/g, '""')}"`,
      item.platform,
      item.key,
      item.cost.toFixed(2),
      `"${item.source.replace(/"/g, '""')}"`,
      item.purchaseDate,
      item.status,
      `"${(item.notes || "").replace(/"/g, '""')}"`
    ]);
  });

  downloadCSV(csvRows.join("\n"), "GameVault_Inventory_Selection_Export.csv");
  showToast(`Exported ${selectedItems.length} selected key(s) to CSV!`, "success");
}

// Bulk price adjustment helper
function applyBulkPriceAdjustment(costAction, costVal, costIsPercent, sellAction, sellVal, sellIsPercent) {
  const selectedIds = state.selectedInventoryIds || [];
  if (selectedIds.length === 0) return;

  pushToUndoStack();

  let modifiedCount = 0;
  state.inventory.forEach(item => {
    if (selectedIds.includes(item.id)) {
      let changed = false;

      // 1. Cost adjustment
      if (costAction === "set") {
        item.cost = Math.max(0, parseFloat(costVal) || 0);
        changed = true;
      } else if (costAction === "adjust") {
        const val = parseFloat(costVal) || 0;
        if (costIsPercent) {
          item.cost = Math.max(0, item.cost * (1 + val / 100));
        } else {
          item.cost = Math.max(0, item.cost + val);
        }
        item.cost = Math.round(item.cost * 100) / 100;
        changed = true;
      }

      // 2. Target Sell Price adjustment
      if (sellAction === "set") {
        item.sellPrice = Math.max(0, parseFloat(sellVal) || 0);
        changed = true;
      } else if (sellAction === "adjust") {
        const val = parseFloat(sellVal) || 0;
        const currentSell = parseFloat(item.sellPrice) || 0;
        if (sellIsPercent) {
          item.sellPrice = Math.max(0, currentSell * (1 + val / 100));
        } else {
          item.sellPrice = Math.max(0, currentSell + val);
        }
        item.sellPrice = Math.round(item.sellPrice * 100) / 100;
        changed = true;
      }

      if (changed) {
        modifiedCount++;
        if (window.supabaseClient && state.syncMode === "realtime") {
          dbSaveInventory(item);
        }
      }
    }
  });

  if (modifiedCount > 0) {
    if (!window.supabaseClient && state.syncMode === "manual") {
      setUnsyncedChanges(true);
    }
    saveStateToStorage();
    state.selectedInventoryIds = [];
    updateUI();
    showToast(`Successfully adjusted prices for ${modifiedCount} item(s).`, "success");
  }
}

// Modal helper functions
function openModal(id) {
  const modal = DOM[id] || document.getElementById(id);
  if (modal) {
    modal.classList.add("active");
  } else {
    console.warn(`openModal: Element with ID "${id}" not found.`);
  }
}

function closeModal(id) {
  const modal = DOM[id] || document.getElementById(id);
  if (modal) {
    modal.classList.remove("active");
    
    // Custom reset for view key modal security
    if (id === "view-key-modal") {
      const pswInput = document.getElementById("view-modal-key-input");
      if (pswInput) pswInput.type = "password";
      const eyeIcon = document.getElementById("toggle-key-eye-icon");
      if (eyeIcon) eyeIcon.className = "fa-solid fa-eye";
    }
  } else {
    console.warn(`closeModal: Element with ID "${id}" not found.`);
  }
}

// Toast Notifications helper
function showToast(message, type = "success", actionCallback = null) {
  const container = document.getElementById("toast-container");
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  if (actionCallback) {
    toast.classList.add("toast-actionable");
  }
  
  let iconClass = "fa-circle-check";
  if (type === "error") iconClass = "fa-circle-xmark";
  if (type === "info") iconClass = "fa-circle-info";

  toast.innerHTML = `
    <i class="fa-solid ${iconClass}"></i>
    <span>${message}</span>
  `;

  if (actionCallback) {
    const actionBtn = document.createElement("button");
    actionBtn.className = "toast-action-btn";
    actionBtn.textContent = "Undo";
    actionBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      actionCallback();
      toast.remove();
    });
    toast.appendChild(actionBtn);
  }

  container.appendChild(toast);
  
  // Remove toast after animation completes (8 seconds if actionable, 3 seconds otherwise)
  const duration = actionCallback ? 8000 : 3000;
  setTimeout(() => {
    if (toast.parentNode) {
      toast.remove();
    }
  }, duration);
}

// ==========================================================================
// FORM SUBMISSIONS LOGIC (CRUD operations)
// ==========================================================================
function getBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
  });
}

async function handleAddGameSubmit(e) {
  e.preventDefault();
  
  const title = document.getElementById("game-title").value.trim();
  const platform = document.getElementById("game-platform").value;
  const cost = parseFloat(document.getElementById("game-cost").value) || 0;
  const keyInput = document.getElementById("game-key").value.trim();
  const source = document.getElementById("game-source").value.trim() || "Direct";
  const purchaseDate = document.getElementById("game-purchase-date").value;
  const notes = document.getElementById("game-notes").value.trim();
  const publisherInput = document.getElementById("game-publisher");
  const publisher = publisherInput ? publisherInput.value.trim() : "";

  // Split and filter keys
  const keys = keyInput.split(/[\n,;]+/).map(k => k.trim()).filter(k => k.length > 0);
  if (keys.length === 0) {
    showToast("Please enter at least one digital game key.", "error");
    return;
  }

  // Check for duplicate keys in inventory
  const duplicateKeys = keys.filter(k => state.inventory.some(item => item.key.trim().toLowerCase() === k.toLowerCase()));
  if (duplicateKeys.length > 0) {
    const proceed = confirm(`Warning: The following keys already exist in your inventory:\n${duplicateKeys.join("\n")}\n\nAre you sure you want to add them anyway?`);
    if (!proceed) return;
  }

  // Artwork Cover Image Handling
  let imageUrl = document.getElementById("game-image-url").value.trim();
  const fileInput = document.getElementById("game-image-file");
  if (fileInput.files && fileInput.files[0]) {
    try {
      imageUrl = await getBase64(fileInput.files[0]);
    } catch (err) {
      showToast("Failed to process cover image file.", "error");
    }
  }

  // Fallback to existing cover artwork if title already exists in inventory
  if (!imageUrl) {
    const match = state.inventory.find(item => item.title.trim().toLowerCase() === title.toLowerCase() && item.imageUrl);
    if (match) {
      imageUrl = match.imageUrl;
    }
  }

  const baseTime = Date.now();
  const addedGames = [];

  pushToUndoStack();
  keys.forEach((key, index) => {
    const uniqueId = "inv_" + (baseTime + index) + "_" + Math.random().toString(36).substr(2, 5);
    const newGame = {
      id: uniqueId,
      title,
      platform,
      key,
      cost,
      source,
      purchaseDate,
      status: "Available",
      notes,
      imageUrl,
      publisher
    };
    state.inventory.push(newGame);
    addedGames.push(newGame);
  });

  saveStateToStorage();

  // Supabase sync
  if (window.supabaseClient) {
    if (state.syncMode === "manual") {
      setUnsyncedChanges(true);
    } else {
      try {
        await Promise.all(addedGames.map(item => dbSaveInventory(item)));
      } catch (err) {
        console.error("Error syncing new keys to Supabase:", err);
      }
    }
  } else if (state.syncMode === "manual") {
    setUnsyncedChanges(true);
  }

  updateUI();
  closeModal("add-game-modal");
  
  // Reset form
  document.getElementById("add-game-form").reset();
  document.getElementById("game-purchase-date").valueAsDate = new Date();
  
  if (keys.length === 1) {
    showToast(`Successfully added game key: ${title}`, "success");
  } else {
    showToast(`Successfully added ${keys.length} game keys for: ${title}`, "success");
  }
}

async function handleSellGameSubmit(e) {
  e.preventDefault();

  const gameId = document.getElementById("sell-game-id").value;
  if (!gameId) {
    showToast("Please search and select an in-stock game from the autocomplete dropdown list.", "error");
    return;
  }
  const sellPrice = parseFloat(document.getElementById("sale-price").value) || 0;
  const platformSold = document.getElementById("sale-platform").value;
  const fees = parseFloat(document.getElementById("sale-fees").value) || 0;
  const saleDate = document.getElementById("sale-date").value;
  const notes = document.getElementById("sale-notes").value.trim();

  // Find game in inventory
  const gameIndex = state.inventory.findIndex(item => item.id === gameId);
  if (gameIndex === -1) {
    showToast("Game item not found in stock.", "error");
    return;
  }

  const game = state.inventory[gameIndex];
  
  pushToUndoStack();
  // Update inventory status
  game.status = "Sold";

  // Calculate Net Profit
  const profit = sellPrice - game.cost - fees;

  const newSale = {
    id: "sale_" + Date.now(),
    inventoryId: gameId,
    title: game.title,
    platform: game.platform,
    cost: game.cost,
    sellPrice,
    platformSold,
    fees,
    profit,
    saleDate,
    notes
  };

  state.sales.push(newSale);
  saveStateToStorage();
  if (window.supabaseClient) {
    await dbSaveInventory(game);
    await dbSaveSale(newSale);
  }
  updateUI();
  closeModal("sell-game-modal");

  // Reset form
  document.getElementById("sell-game-form").reset();
  document.getElementById("sale-date").valueAsDate = new Date();

  showToast(`Recorded sale for: ${game.title} (${profit >= 0 ? '+' : ''}${formatCurrency(profit)} net)`, "success");
}

// Action triggers from Table Lists
window.triggerSellGameManual = function() {
  document.getElementById("sell-game-id").value = "";
  document.getElementById("sell-game-search").value = "";
  document.getElementById("sell-game-search").placeholder = "Type game title or key...";
  document.getElementById("sell-selected-game-card").style.display = "none";
  document.getElementById("sale-price").value = "";
  document.getElementById("sale-fees").value = "0.00";
  document.getElementById("sell-autocomplete-list").style.display = "none";
  
  openModal("sell-game-modal");
};

window.triggerSellGame = function(gameId) {
  const game = state.inventory.find(item => item.id === gameId);
  if (!game) return;

  document.getElementById("sell-game-id").value = game.id;
  document.getElementById("sell-game-search").value = game.title;
  document.getElementById("sell-modal-title").textContent = game.title;
  document.getElementById("sell-modal-platform").textContent = game.platform;
  document.getElementById("sell-modal-cost").textContent = formatCurrency(game.cost);
  document.getElementById("sell-modal-key").textContent = game.key || "-";
  document.getElementById("sell-selected-game-card").style.display = "block";
  document.getElementById("sell-autocomplete-list").style.display = "none";

  // Default values
  let defaultSalePrice;
  if (game.sellPrice !== undefined && game.sellPrice > 0) {
    defaultSalePrice = game.sellPrice.toFixed(2);
  } else if (state.defaultMarkupType === "percent") {
    defaultSalePrice = (game.cost * (1 + state.defaultMarkupValue / 100)).toFixed(2);
  } else {
    defaultSalePrice = (game.cost + state.defaultMarkupValue).toFixed(2);
  }
  document.getElementById("sale-price").value = defaultSalePrice;

  document.getElementById("sale-fees").value = "0.00";

  openModal("sell-game-modal");
};

window.triggerViewKey = function(gameId) {
  const game = state.inventory.find(item => item.id === gameId);
  if (!game) return;

  const artworkRow = document.getElementById("view-modal-artwork-row");
  const initials = game.title.split(" ").map(w => w[0]).join("").slice(0, 3);
  if (game.imageUrl) {
    artworkRow.innerHTML = `
      <img src="${escapeHTML(game.imageUrl)}" class="view-modal-thumbnail" alt="${escapeHTML(game.title)}">
      <div>
        <span class="key-label" style="margin-bottom: 2px;">Game Title</span>
        <h4 id="view-modal-title" style="font-size: 1.15rem; color: #fff;">${escapeHTML(game.title)}</h4>
      </div>
    `;
  } else {
    artworkRow.innerHTML = `
      <div class="view-modal-thumbnail-placeholder">${escapeHTML(initials)}</div>
      <div>
        <span class="key-label" style="margin-bottom: 2px;">Game Title</span>
        <h4 id="view-modal-title" style="font-size: 1.15rem; color: #fff;">${escapeHTML(game.title)}</h4>
      </div>
    `;
  }

  document.getElementById("view-modal-platform").textContent = game.platform;
  
  const supplierObj = state.suppliers.find(s => s.name === game.source);
  const colorName = supplierObj ? (supplierObj.color || getSupplierColorName(game.source)) : getSupplierColorName(game.source);
  const colorPreset = SUPPLIER_COLORS.find(c => c.name === colorName) || SUPPLIER_COLORS[0];
  const viewModalSource = document.getElementById("view-modal-source");
  if (viewModalSource) {
    viewModalSource.innerHTML = `
      <span class="supplier-tag" style="background-color: ${colorPreset.value}12; border-color: ${colorPreset.value}25; color: ${colorPreset.value}; padding: 2px 8px; border-radius: 4px; font-size: 0.75rem; display: inline-flex; align-items: center; gap: 4px; vertical-align: middle;">
        <span class="supplier-dot" style="background-color: ${colorPreset.value}; width: 6px; height: 6px;"></span>
        ${escapeHTML(game.source)}
      </span>
    `;
  }

  document.getElementById("view-modal-cost").textContent = formatCurrency(game.cost);
  document.getElementById("view-modal-date").textContent = formatDate(game.purchaseDate);
  document.getElementById("view-modal-notes").textContent = game.notes || "No additional notes logged.";
  
  // Set activation key value
  document.getElementById("view-modal-key-input").value = game.key;
  
  openModal("view-key-modal");
};

window.triggerDeleteGame = async function(gameId) {
  const game = state.inventory.find(item => item.id === gameId);
  if (!game) return;

  if (confirm(`Are you sure you want to move "${game.title}" to the Recycle Bin?`)) {
    pushToUndoStack();
    // Move game
    state.inventory = state.inventory.filter(item => item.id !== gameId);
    state.recycleBin.inventory.push(game);

    // If it was sold, we should also move its sale from ledger (to balance accounts)
    const associatedSaleIndex = state.sales.findIndex(sale => sale.inventoryId === gameId);
    let sale = null;
    if (associatedSaleIndex !== -1) {
      sale = state.sales[associatedSaleIndex];
      state.sales.splice(associatedSaleIndex, 1);
      state.recycleBin.sales.push(sale);
    }

    saveStateToStorage();
    if (window.supabaseClient) {
      await dbDeleteInventory(gameId);
      if (sale) {
        await dbDeleteSale(sale.id);
      }
    } else if (state.syncMode === "manual") {
      setUnsyncedChanges(true);
    }
    updateUI();
    showToast(`Moved "${game.title}" to the Recycle Bin.`, "info");
  }
};

window.triggerDeleteAllInventory = async function() {
  if (state.inventory.length === 0) {
    showToast("Inventory is already empty.", "info");
    return;
  }

  const confirmPrompt = prompt('WARNING: You are about to delete ALL inventory items and their associated sales records. To confirm, type "DELETE":');
  if (confirmPrompt !== "DELETE") {
    showToast("Deletion cancelled.", "info");
    return;
  }

  try {
    pushToUndoStack();
    const gamesToMove = [...state.inventory];
    const ids = gamesToMove.map(item => item.id);
    
    // Find all sales corresponding to these inventory items
    const salesToMove = state.sales.filter(sale => ids.includes(sale.inventoryId));
    const saleIds = salesToMove.map(s => s.id);

    // Push to recycle bin
    state.recycleBin.inventory.push(...gamesToMove);
    state.recycleBin.sales.push(...salesToMove);

    // Clear main arrays
    state.inventory = [];
    state.sales = state.sales.filter(sale => !ids.includes(sale.inventoryId));

    saveStateToStorage();

    if (window.supabaseClient) {
      if (state.syncMode === "manual") {
        ids.forEach(id => {
          if (!state.pendingDeletes.inventory.includes(id)) {
            state.pendingDeletes.inventory.push(id);
          }
        });
        salesToMove.forEach(sale => {
          if (!state.pendingDeletes.sales.includes(sale.id)) {
            state.pendingDeletes.sales.push(sale.id);
          }
        });
        saveStateToStorage();
        setUnsyncedChanges(true);
      } else {
        showToast("Deleting items from cloud database...", "info");
        const deleteBatchSize = 200;
        
        // Delete inventory items in batches to avoid URL length limit errors
        for (let j = 0; j < ids.length; j += deleteBatchSize) {
          const batch = ids.slice(j, j + deleteBatchSize);
          const { error: invErr } = await window.supabaseClient.from('inventory').delete().in('id', batch);
          if (invErr) throw invErr;
        }

        // Delete sales items in batches to avoid URL length limit errors
        for (let j = 0; j < saleIds.length; j += deleteBatchSize) {
          const batch = saleIds.slice(j, j + deleteBatchSize);
          const { error: saleErr } = await window.supabaseClient.from('sales').delete().in('id', batch);
          if (saleErr) throw saleErr;
        }
      }
    } else if (state.syncMode === "manual") {
      setUnsyncedChanges(true);
    }

    updateUI();
    showToast(`Moved ${gamesToMove.length} items to the Recycle Bin.`, "success");
  } catch (err) {
    console.error("Error deleting all inventory items:", err);
    showToast("Failed to delete some items from cloud.", "error");
  }
};

window.triggerCancelSale = async function(saleId) {
  const sale = state.sales.find(item => item.id === saleId);
  if (!sale) return;

  if (confirm(`Do you want to cancel the sale of "${sale.title}"? This will return the game key back to "Available" inventory.`)) {
    pushToUndoStack();
    // Return game back to Available status
    const game = state.inventory.find(item => item.id === sale.inventoryId);
    if (game) {
      game.status = "Available";
    }

    // Remove from sales ledger
    state.sales = state.sales.filter(item => item.id !== saleId);

    saveStateToStorage();
    if (window.supabaseClient) {
      if (game) await dbSaveInventory(game);
      await dbDeleteSale(saleId);
    }
    updateUI();
    showToast(`Cancelled sale of "${sale.title}". Key returned to stock.`, "info");
  }
};

window.triggerDisputeSale = async function(saleId) {
  const sale = state.sales.find(item => item.id === saleId);
  if (!sale) return;
  
  if (confirm(`Are you sure you want to flag the sale of "${sale.title}" as Disputed/Refunded?\n\nThis will:\n- Zero out the sale revenue.\n- Adjust net profit to record a capital loss of -${formatCurrency(sale.cost)}.\n- Mark the activation key status as "Disputed".`)) {
    pushToUndoStack();
    sale.disputed = true;
    
    // Find matching inventory item
    const item = state.inventory.find(i => i.id === sale.inventoryId);
    if (item) {
      item.status = "Disputed";
    }
    
    saveStateToStorage();
    if (window.supabaseClient) {
      let success = true;
      if (item) {
        success = await dbSaveInventory(item);
      }
      if (success) {
        await dbSaveSale(sale);
      }
    }
    updateUI();
    showToast(`Flagged "${sale.title}" sale as Disputed/Refunded.`, "warning");
  }
};

window.triggerResolveDispute = async function(saleId) {
  const sale = state.sales.find(item => item.id === saleId);
  if (!sale) return;
  
  if (confirm(`Resolve dispute for "${sale.title}" and restore the original sale transaction?`)) {
    pushToUndoStack();
    sale.disputed = false;
    
    // Find matching inventory item
    const item = state.inventory.find(i => i.id === sale.inventoryId);
    if (item) {
      item.status = "Sold";
    }
    
    saveStateToStorage();
    if (window.supabaseClient) {
      let success = true;
      if (item) {
        success = await dbSaveInventory(item);
      }
      if (success) {
        await dbSaveSale(sale);
      }
    }
    updateUI();
    showToast(`Resolved dispute for "${sale.title}". Sale restored.`, "success");
  }
};

window.triggerEditGame = function(gameId) {
  const game = state.inventory.find(item => item.id === gameId);
  if (!game) return;

  // Make sure current game's source is populated in the dropdown even if disabled
  const editSelect = document.getElementById("edit-game-source");
  if (editSelect) {
    const dropdownSuppliers = [...state.suppliers].sort((a, b) => a.name.localeCompare(b.name));
    const editDropdownSuppliers = dropdownSuppliers.filter(s => s.enabled !== false || s.name === game.source);
    editSelect.innerHTML = editDropdownSuppliers.map(s => `<option value="${s.name}">${s.name}</option>`).join("");
  }

  document.getElementById("edit-game-id").value = game.id;
  document.getElementById("edit-game-title").value = game.title;
  document.getElementById("edit-game-platform").value = game.platform;
  document.getElementById("edit-game-cost").value = game.cost;
  document.getElementById("edit-game-key").value = game.key;
  document.getElementById("edit-game-source").value = game.source;
  document.getElementById("edit-game-purchase-date").value = game.purchaseDate;
  document.getElementById("edit-game-notes").value = game.notes || "";
  document.getElementById("edit-game-image-url").value = game.imageUrl || "";
  document.getElementById("edit-game-image-file").value = ""; // Reset file upload
  document.getElementById("edit-game-status").value = game.status; // Set current status
  
  const editPubInput = document.getElementById("edit-game-publisher");
  if (editPubInput) {
    editPubInput.value = game.publisher || "";
  }

  openModal("edit-game-modal");
};

async function handleEditGameSubmit(e) {
  e.preventDefault();

  const gameId = document.getElementById("edit-game-id").value;
  const title = document.getElementById("edit-game-title").value.trim();
  const platform = document.getElementById("edit-game-platform").value;
  const cost = parseFloat(document.getElementById("edit-game-cost").value) || 0;
  const key = document.getElementById("edit-game-key").value.trim();
  const source = document.getElementById("edit-game-source").value.trim() || "Direct";
  const purchaseDate = document.getElementById("edit-game-purchase-date").value;
  const notes = document.getElementById("edit-game-notes").value.trim();
  const status = document.getElementById("edit-game-status").value;
  const publisherInput = document.getElementById("edit-game-publisher");
  const publisher = publisherInput ? publisherInput.value.trim() : "";

  const gameIndex = state.inventory.findIndex(item => item.id === gameId);
  if (gameIndex === -1) {
    showToast("Game not found.", "error");
    return;
  }

  // Check if edited key exists on another game item
  const currentKey = state.inventory[gameIndex].key;
  if (key && key.toLowerCase() !== currentKey.toLowerCase()) {
    const isDuplicate = state.inventory.some(item => item.id !== gameId && item.key.trim().toLowerCase() === key.toLowerCase());
    if (isDuplicate) {
      const proceed = confirm(`Warning: The key "${key}" already exists in your inventory for another game.\n\nAre you sure you want to save this key?`);
      if (!proceed) return;
    }
  }

  const oldStatus = state.inventory[gameIndex].status;

  // Artwork Cover Image Handling
  let imageUrl = document.getElementById("edit-game-image-url").value.trim();
  const fileInput = document.getElementById("edit-game-image-file");
  if (fileInput.files && fileInput.files[0]) {
    try {
      imageUrl = await getBase64(fileInput.files[0]);
    } catch (err) {
      showToast("Failed to process cover image file.", "error");
    }
  }

  // Fallback to existing cover artwork if title already exists in inventory
  if (!imageUrl) {
    const match = state.inventory.find(item => item.title.trim().toLowerCase() === title.toLowerCase() && item.imageUrl);
    if (match) {
      imageUrl = match.imageUrl;
    }
  }

  pushToUndoStack();
  // Update inventory item
  state.inventory[gameIndex] = {
    ...state.inventory[gameIndex],
    title,
    platform,
    cost,
    key,
    source,
    purchaseDate,
    notes,
    imageUrl,
    status,
    publisher
  };

  // Handle status change side-effects
  if (oldStatus === "Sold" && status !== "Sold") {
    // Item was transitioned back: delete its sale from sales ledger
    state.sales = state.sales.filter(s => s.inventoryId !== gameId);
  } else if (oldStatus !== "Sold" && status === "Sold") {
    // Item was transitioned to Sold manually: create a placeholder sale record if none exists
    const existingSale = state.sales.find(s => s.inventoryId === gameId);
    if (!existingSale) {
      state.sales.push({
        id: "sale_" + Date.now(),
        inventoryId: gameId,
        title: title,
        platform: platform,
        cost: cost,
        sellPrice: cost, // Default to cost (0 profit)
        platformSold: "Other",
        fees: 0,
        profit: 0,
        saleDate: new Date().toISOString().split("T")[0],
        notes: "Marked Sold manually via Edit modal."
      });
    }
  }

  // Sync title & metadata inside sales ledger if the game remains sold
  state.sales.forEach(sale => {
    if (sale.inventoryId === gameId) {
      sale.title = title;
      sale.platform = platform;
      sale.cost = cost;
      sale.profit = sale.sellPrice - cost - sale.fees;
    }
  });

  saveStateToStorage();
  if (window.supabaseClient) {
    const game = state.inventory[gameIndex];
    await dbSaveInventory(game);
    if (oldStatus === "Sold" && status !== "Sold") {
      await window.supabaseClient.from('sales').delete().eq('inventoryId', gameId);
    } else {
      const sale = state.sales.find(s => s.inventoryId === gameId);
      if (sale) {
        await dbSaveSale(sale);
      }
    }
  }
  updateUI();
  closeModal("edit-game-modal");

  showToast(`Updated game metadata for "${title}"`, "success");
}

window.toggleFavoriteGame = function(gameTitle) {
  if (!state.favoriteGames) state.favoriteGames = [];
  const idx = state.favoriteGames.indexOf(gameTitle);
  if (idx > -1) {
    state.favoriteGames.splice(idx, 1);
    showToast(`Removed "${gameTitle}" from Favorites.`, "info");
  } else {
    state.favoriteGames.push(gameTitle);
    showToast(`Added "${gameTitle}" to Favorites.`, "success");
  }
  saveStateToStorage();
  renderEntries();
  if (window.supabaseClient) {
    dbSaveSettings("favoriteGames", state.favoriteGames);
  }
};

window.triggerEditCatalogEntry = function(title) {
  const invMatch = state.inventory.find(item => item.title.trim().toLowerCase() === title.trim().toLowerCase());
  const saleMatch = state.sales.find(item => item.title.trim().toLowerCase() === title.trim().toLowerCase());
  
  const currentTitle = invMatch ? invMatch.title : (saleMatch ? saleMatch.title : title);
  const currentImgUrl = invMatch ? invMatch.imageUrl : (saleMatch ? saleMatch.imageUrl : "");

  // Find current publisher for this game
  const matchWithPublisher = state.inventory.find(item => 
    item.title.trim().toLowerCase() === title.trim().toLowerCase() && 
    item.publisher
  );
  const currentPublisher = matchWithPublisher ? String(matchWithPublisher.publisher).trim() : "";

  // Populate unique publishers datalist
  const publishers = new Set();
  state.inventory.forEach(item => {
    if (item.publisher) {
      publishers.add(String(item.publisher).trim());
    }
  });

  const datalist = document.getElementById("edit-entry-publisher-list");
  if (datalist) {
    datalist.innerHTML = "";
    Array.from(publishers).sort().forEach(pub => {
      const option = document.createElement("option");
      option.value = pub;
      datalist.appendChild(option);
    });
  }

  document.getElementById("edit-entry-old-title").value = currentTitle;
  document.getElementById("edit-entry-title").value = currentTitle;
  document.getElementById("edit-entry-publisher").value = currentPublisher;
  document.getElementById("edit-entry-image-url").value = currentImgUrl || "";
  document.getElementById("edit-entry-image-file").value = "";

  openModal("edit-catalog-entry-modal");
};

window.triggerDeleteCatalogEntry = async function(title) {
  const titleLower = title.trim().toLowerCase();
  const itemsToDelete = state.inventory.filter(item => item.title.trim().toLowerCase() === titleLower);
  const salesToDelete = state.sales.filter(sale => sale.title.trim().toLowerCase() === titleLower);
  
  const totalKeys = itemsToDelete.length;
  const soldKeys = itemsToDelete.filter(i => i.status === "Sold").length;
  const availableKeys = totalKeys - soldKeys;
  const totalSales = salesToDelete.length;

  if (totalKeys === 0 && totalSales === 0) {
    showToast(`No records found for game title "${title}".`, "error");
    return;
  }

  if (confirm(`Are you sure you want to delete the catalog entry "${title}"?\n\nThis will move:\n- ${availableKeys} available key(s) to the Recycle Bin\n- ${soldKeys} sold key(s) and their ${totalSales} sales ledger records to the Recycle Bin.`)) {
    // Move matching inventory items to Recycle Bin
    itemsToDelete.forEach(item => {
      state.recycleBin.inventory.push(item);
    });
    
    // Filter out matching items from inventory
    state.inventory = state.inventory.filter(item => item.title.trim().toLowerCase() !== titleLower);
    
    // Move matching sales records to Recycle Bin
    salesToDelete.forEach(sale => {
      state.recycleBin.sales.push(sale);
    });
    
    // Filter out matching sales from sales ledger
    state.sales = state.sales.filter(sale => sale.title.trim().toLowerCase() !== titleLower);
    
    saveStateToStorage();
    
    // Cloud sync mutations
    if (window.supabaseClient) {
      for (const item of itemsToDelete) {
        await dbDeleteInventory(item.id);
      }
      for (const sale of salesToDelete) {
        await dbDeleteSale(sale.id);
      }
    } else if (state.syncMode === "manual") {
      setUnsyncedChanges(true);
    }
    
    updateUI();
    showToast(`Catalog entry "${title}" and all associated keys/sales moved to the Recycle Bin.`, "info");
  }
};

window.copyTextToClipboard = function(text, message) {
  navigator.clipboard.writeText(text).then(() => {
    showToast(message || "Copied to clipboard!", "success");
  }).catch(err => {
    showToast("Failed to copy to clipboard.", "error");
  });
};

window.triggerViewCatalogKeys = function(title, openModalFlag = true) {
  state.activeCatalogKeysTitle = title;
  const titleLower = title.trim().toLowerCase();
  
  if (openModalFlag) {
    state.catalogKeysCurrentPage = 1;
    const sizeSelect = document.getElementById("catalog-keys-page-size");
    if (sizeSelect) {
      sizeSelect.value = state.catalogKeysPageSize.toString();
    }
  }

  document.getElementById("catalog-keys-modal-title").textContent = `Keys list for "${title}"`;
  
  const tbody = document.getElementById("catalog-keys-table-body");
  if (!tbody) return;
  tbody.innerHTML = "";
  
  // Find all matching keys in inventory (both available and sold/reserved)
  const matchingKeys = state.inventory.filter(item => item.title.trim().toLowerCase() === titleLower);
  
  if (matchingKeys.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center" style="text-align: center; padding: 30px; color: var(--text-muted);">No keys found for this game.</td></tr>`;
    document.getElementById("catalog-keys-count-text").textContent = "Showing 0 keys";
    const paginationContainer = document.getElementById("catalog-keys-pagination");
    if (paginationContainer) paginationContainer.innerHTML = "";
    if (openModalFlag) openModal("catalog-keys-modal");
    return;
  }
  
  // Sort: Available first, then Reserved, then Sold; inside each status sort by purchase date (newest first)
  matchingKeys.sort((a, b) => {
    const statusOrder = { "Available": 1, "Reserved": 2, "Sold": 3 };
    const orderA = statusOrder[a.status] || 99;
    const orderB = statusOrder[b.status] || 99;
    if (orderA !== orderB) return orderA - orderB;
    return new Date(b.purchaseDate) - new Date(a.purchaseDate);
  });

  // Pagination Logic for Catalog Keys
  const totalPages = Math.ceil(matchingKeys.length / state.catalogKeysPageSize) || 1;
  if (state.catalogKeysCurrentPage > totalPages) {
    state.catalogKeysCurrentPage = totalPages;
  }
  if (state.catalogKeysCurrentPage < 1) {
    state.catalogKeysCurrentPage = 1;
  }

  const startIndex = (state.catalogKeysCurrentPage - 1) * state.catalogKeysPageSize;
  const endIndex = startIndex + state.catalogKeysPageSize;
  const paginatedKeys = matchingKeys.slice(startIndex, endIndex);

  paginatedKeys.forEach(item => {
    const tr = document.createElement("tr");
    
    // Find associated sale if sold
    const sale = state.sales.find(s => s.inventoryId === item.id);
    const salePriceText = sale ? formatCurrency(sale.sellPrice) : "—";
    const sellPlatformText = sale ? sale.platform : "—";
    
    const maskedKey = `${item.key.slice(0, 4)}-****-****-${item.key.slice(-4)}`;
    
    let badgeClass = "badge-available";
    if (item.status === "Sold") badgeClass = "badge-sold";
    else if (item.status === "Reserved") badgeClass = "badge-reserved";
    else if (item.status === "Rejected") badgeClass = "badge-rejected";
    else if (item.status === "Disputed") badgeClass = "badge-disputed";
    
    // Action buttons inside modal row
    let actionsHtml = `
      <div class="table-actions" style="justify-content: flex-end;">
        <button class="btn-action btn-action-view" onclick="closeModal('catalog-keys-modal'); triggerViewKey('${item.id}')" title="View Secure Key Details">
          <i class="fa-solid fa-eye"></i>
        </button>
        <button class="btn-action btn-action-edit" onclick="closeModal('catalog-keys-modal'); copyTextToClipboard('${item.key.replace(/'/g, "\\'")}', 'Key copied to clipboard!')" title="Copy Key">
          <i class="fa-solid fa-copy"></i>
        </button>
    `;
    
    if (item.status === "Available") {
      actionsHtml += `
        <button class="btn-action btn-action-sell" onclick="closeModal('catalog-keys-modal'); triggerSellGame('${item.id}')" title="Record Key Sale">
          <i class="fa-solid fa-euro-sign"></i>
        </button>
      `;
    }
    
    actionsHtml += `
        <button class="btn-action btn-action-delete" onclick="closeModal('catalog-keys-modal'); triggerDeleteGame('${item.id}')" title="Delete Key">
          <i class="fa-solid fa-trash"></i>
        </button>
      </div>
    `;
    
    tr.innerHTML = `
      <td><span style="font-weight: 600;">${item.platform}</span></td>
      <td><div class="secured-key"><code>${maskedKey}</code></div></td>
      <td>${formatCurrency(item.cost)}</td>
      <td>${salePriceText}</td>
      <td>${sellPlatformText}</td>
      <td><span class="badge ${badgeClass}">${item.status}</span></td>
      <td style="text-align: right;">${actionsHtml}</td>
    `;
    tbody.appendChild(tr);
  });
  
  const showingStart = matchingKeys.length === 0 ? 0 : startIndex + 1;
  const showingEnd = Math.min(endIndex, matchingKeys.length);
  document.getElementById("catalog-keys-count-text").textContent = `Showing ${showingStart}-${showingEnd} of ${matchingKeys.length} keys`;

  // Render pagination buttons
  renderCatalogKeysPagination(matchingKeys.length);

  if (openModalFlag) openModal("catalog-keys-modal");
};

// Render dynamic pagination controls for the Catalog Keys Details modal
function renderCatalogKeysPagination(totalItems) {
  const container = document.getElementById("catalog-keys-pagination");
  if (!container) return;
  container.innerHTML = "";

  const totalPages = Math.ceil(totalItems / state.catalogKeysPageSize) || 1;
  if (totalPages <= 1) {
    container.style.display = "none";
    return;
  }
  container.style.display = "flex";

  // Helper to create page buttons
  const createBtn = (label, targetPage, disabled = false, isActive = false) => {
    const btn = document.createElement("button");
    btn.className = "pagination-btn";
    if (isActive) btn.classList.add("active");
    btn.disabled = disabled;
    btn.innerHTML = label;
    if (!disabled && !isActive) {
      btn.addEventListener("click", () => {
        state.catalogKeysCurrentPage = targetPage;
        if (state.activeCatalogKeysTitle) {
          triggerViewCatalogKeys(state.activeCatalogKeysTitle, false);
        }
      });
    }
    return btn;
  };

  // Prev Button
  container.appendChild(createBtn('<i class="fa-solid fa-angle-left"></i>', state.catalogKeysCurrentPage - 1, state.catalogKeysCurrentPage === 1));

  // Page Numbers with sliding window
  const maxButtons = 5;
  let startPage = Math.max(1, state.catalogKeysCurrentPage - Math.floor(maxButtons / 2));
  let endPage = startPage + maxButtons - 1;

  if (endPage > totalPages) {
    endPage = totalPages;
    startPage = Math.max(1, endPage - maxButtons + 1);
  }

  if (startPage > 1) {
    container.appendChild(createBtn("1", 1));
    if (startPage > 2) {
      const dots = document.createElement("span");
      dots.className = "pagination-dots";
      dots.textContent = "...";
      container.appendChild(dots);
    }
  }

  for (let i = startPage; i <= endPage; i++) {
    container.appendChild(createBtn(i.toString(), i, false, i === state.catalogKeysCurrentPage));
  }

  if (endPage < totalPages) {
    if (endPage < totalPages - 1) {
      const dots = document.createElement("span");
      dots.className = "pagination-dots";
      dots.textContent = "...";
      container.appendChild(dots);
    }
    container.appendChild(createBtn(totalPages.toString(), totalPages));
  }

  // Next Button
  container.appendChild(createBtn('<i class="fa-solid fa-angle-right"></i>', state.catalogKeysCurrentPage + 1, state.catalogKeysCurrentPage === totalPages));
}

async function handleEditCatalogEntrySubmit(e) {
  e.preventDefault();

  const oldTitle = document.getElementById("edit-entry-old-title").value.trim();
  const newTitle = document.getElementById("edit-entry-title").value.trim();
  const newPublisher = document.getElementById("edit-entry-publisher").value.trim();
  let imageUrl = document.getElementById("edit-entry-image-url").value.trim();
  const fileInput = document.getElementById("edit-entry-image-file");

  if (!newTitle) {
    showToast("Game title is required.", "error");
    return;
  }

  if (fileInput && fileInput.files && fileInput.files[0]) {
    try {
      imageUrl = await getBase64(fileInput.files[0]);
    } catch (err) {
      showToast("Failed to process cover image file.", "error");
    }
  }

  let updatedCount = 0;
  state.inventory.forEach(item => {
    if (item.title.trim().toLowerCase() === oldTitle.toLowerCase()) {
      item.title = newTitle;
      if (imageUrl !== undefined && imageUrl !== "") {
        item.imageUrl = imageUrl;
      }
      item.publisher = newPublisher;
      updatedCount++;
    }
  });

  state.sales.forEach(sale => {
    if (sale.title.trim().toLowerCase() === oldTitle.toLowerCase()) {
      sale.title = newTitle;
      sale.profit = sale.sellPrice - sale.cost - sale.fees;
    }
  });

  saveStateToStorage();
  if (window.supabaseClient) {
    const updatedInventory = state.inventory.filter(item => item.title === newTitle);
    for (const item of updatedInventory) {
      await dbSaveInventory(item);
    }
    const updatedSales = state.sales.filter(sale => sale.title === newTitle);
    for (const sale of updatedSales) {
      await dbSaveSale(sale);
    }
  }
  updateUI();
  closeModal("edit-catalog-entry-modal");
  showToast(`Updated "${oldTitle}" to "${newTitle}" across ${updatedCount} keys.`, "success");
}

// ==========================================================================
// RENDER & UI DYNAMIC UPDATES
// ==========================================================================
function updateUI() {
  // 1. Get filtered data
  const filteredSales = getFilteredSales();
  const filteredInventory = getFilteredInventory();

  // 1b. Dashboard specific supplier filtering
  const dbSupplierSelect = document.getElementById("db-filter-supplier");
  const dbSupplier = dbSupplierSelect ? dbSupplierSelect.value : "all";
  
  let dbFilteredSales = filteredSales;
  let dbFilteredInventory = state.inventory;
  
  if (dbSupplier !== "all") {
    const inventoryMap = new Map();
    state.inventory.forEach(item => {
      inventoryMap.set(item.id, item);
    });
    dbFilteredSales = filteredSales.filter(sale => {
      const game = inventoryMap.get(sale.inventoryId);
      return game && game.source === dbSupplier;
    });
    dbFilteredInventory = state.inventory.filter(item => item.source === dbSupplier);
  }

  // 2. Render Metrics Cards based on filtered period and supplier
  calculateMetrics(dbFilteredSales, dbFilteredInventory);
  calculateSupplierMetrics();
  renderPeriodSummary(dbFilteredSales, dbFilteredInventory);

  // 2b. Apply figures visibility first so that shown canvases have layout dimensions
  renderDashboardCardsOrder();
  applyFiguresVisibility();
  applyDashboardSpans();

  // 3. Render Charts
  renderSalesTrendChart(dbFilteredSales);
  renderPlatformSplitChart(dbFilteredSales);
  renderCostRevenueChart(dbFilteredSales);
  renderSupplierSplitChart(dbFilteredInventory);
  renderTopBestsellersChart(dbFilteredSales);
  renderDailyProfitMonthChart(dbFilteredSales);
  renderStockSpeedChart(dbFilteredInventory, dbFilteredSales);
  renderSalesFeedWidget(dbFilteredSales);
  renderFinanceTrackerWidget(dbFilteredSales);
  renderMarkupAnalysisChart(dbFilteredInventory);
  renderStockTurnoverChart(dbFilteredInventory, dbFilteredSales);

  // 4. Render Tables
  renderInventoryTable(filteredInventory);
  renderSalesTable(filteredSales);
  
  // 5. Render Dashboard Summary Sections
  renderDashboardDetails(dbFilteredSales, dbFilteredInventory);

  // 7. Render Suppliers and populate dropdown lists
  if (state.suppliersActiveTab === "publisher") {
    document.getElementById("suppliers-tab-content")?.classList.add("hidden");
    document.getElementById("publishers-tab-content")?.classList.remove("hidden");
    renderPublishersTab();
  } else {
    document.getElementById("suppliers-tab-content")?.classList.remove("hidden");
    document.getElementById("publishers-tab-content")?.classList.add("hidden");
    renderSuppliers();
  }

  // 7b. Render Platforms and populate dropdown lists
  renderPlatforms();

  // 8. Render Game catalog entries
  renderEntries();

  // 9. Render Finance view data
  renderFinanceView();

  // 9b. Render Recycle Bin data
  renderRecycleBin();

  // 10. Reset bulk actions bar and select-all checkbox
  const selectAllCheckbox = document.getElementById("inv-select-all");
  if (selectAllCheckbox) selectAllCheckbox.checked = false;
  
  const bulkBar = document.getElementById("bulk-actions-bar");
  if (bulkBar) bulkBar.classList.add("hidden");

  // 10b. Reset Recycle Bin select-all and actions bar
  const recycleSelectAll = document.getElementById("recycle-select-all");
  if (recycleSelectAll) recycleSelectAll.checked = false;
  
  const recycleBulkBar = document.getElementById("recycle-bulk-actions");
  if (recycleBulkBar) recycleBulkBar.classList.add("hidden");
  
  const recycleInfoText = document.getElementById("recycle-info-text");
  if (recycleInfoText) recycleInfoText.classList.remove("hidden");

  // 11. Render admin users
  renderAdminUsers();

  // 12. Sync and Render operational expense categories & ledger
  populateCategoryDropdown();
  renderPayoutsLedger();
}

function renderSuppliers() {
  const tbody = DOM["suppliers-table-body"] || document.getElementById("suppliers-table-body");
  if (!tbody) return;
  tbody.innerHTML = "";

  if (state.suppliers.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--text-muted); padding: 20px;">No suppliers registered.</td></tr>`;
  } else {
    // Sort suppliers list based on user selection
    const sortVal = document.getElementById("suppliers-sort")?.value || "date-desc";
    let sortedSuppliers = [...state.suppliers];
    
    if (sortVal === "date-desc") {
      sortedSuppliers.sort((a, b) => b.dateAdded - a.dateAdded);
    } else if (sortVal === "date-asc") {
      sortedSuppliers.sort((a, b) => a.dateAdded - b.dateAdded);
    } else if (sortVal === "name-asc") {
      sortedSuppliers.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortVal === "name-desc") {
      sortedSuppliers.sort((a, b) => b.name.localeCompare(a.name));
    }

    // Pre-index inventory by ID for O(1) lookups
    const inventoryMap = new Map();
    state.inventory.forEach(item => {
      inventoryMap.set(item.id, item);
    });

    // Group inventory metrics by supplier name in a single pass O(N)
    const supplierInventoryStats = new Map();
    state.inventory.forEach(item => {
      const sup = item.source || "";
      if (!supplierInventoryStats.has(sup)) {
        supplierInventoryStats.set(sup, { totalPurchases: 0, inStock: 0, costOfInStock: 0 });
      }
      const stats = supplierInventoryStats.get(sup);
      stats.totalPurchases++;
      if (item.status !== "Sold") {
        stats.inStock++;
        stats.costOfInStock += item.cost;
      }
    });

    // Group sales metrics by supplier name in a single pass O(M)
    const supplierSalesStats = new Map();
    state.sales.forEach(sale => {
      const game = inventoryMap.get(sale.inventoryId);
      if (game) {
        const sup = game.source || "";
        if (!supplierSalesStats.has(sup)) {
          supplierSalesStats.set(sup, { revenue: 0, costOfSold: 0, netProfit: 0 });
        }
        const stats = supplierSalesStats.get(sup);
        stats.revenue += sale.sellPrice;
        stats.costOfSold += sale.cost;
        stats.netProfit += sale.profit;
      }
    });

    sortedSuppliers.forEach(supplierObj => {
      const supplierName = supplierObj.name;
      
      const stats = supplierInventoryStats.get(supplierName) || { totalPurchases: 0, inStock: 0, costOfInStock: 0 };
      const salesStats = supplierSalesStats.get(supplierName) || { revenue: 0, costOfSold: 0, netProfit: 0 };
      
      const totalPurchases = stats.totalPurchases;
      const inStock = stats.inStock;
      const costOfInStock = stats.costOfInStock;
      
      const revenue = salesStats.revenue;
      const costOfSold = salesStats.costOfSold;
      const netProfit = salesStats.netProfit;
      
      const colorName = supplierObj.color || getSupplierColorName(supplierName);
      const colorPreset = SUPPLIER_COLORS.find(c => c.name === colorName) || SUPPLIER_COLORS[0];
      const isEnabled = supplierObj.enabled !== false;
      
      const escapedNameForJS = supplierName.replace(/'/g, "\\'").replace(/"/g, "&quot;");
      const statusBtn = `
        <button class="btn" 
                onclick="triggerToggleSupplier('${escapeHTML(escapedNameForJS)}')" 
                style="padding: 4px 10px; font-size: 0.75rem; border-radius: var(--radius-sm); font-weight: 600; cursor: pointer; transition: all 0.2s ease; ${
                  isEnabled 
                    ? 'background-color: hsla(175, 90%, 48%, 0.1); border: 1px solid var(--accent-teal); color: var(--accent-teal);' 
                    : 'background-color: hsla(355, 85%, 55%, 0.1); border: 1px solid var(--accent-danger); color: var(--accent-danger);'
                }">
          <i class="${isEnabled ? 'fa-solid fa-circle-check' : 'fa-solid fa-circle-xmark'}" style="margin-right: 4px;"></i>
          ${isEnabled ? 'Enabled' : 'Disabled'}
        </button>
      `;

      const logoHtml = supplierObj.logo
        ? `<img src="${escapeHTML(supplierObj.logo)}" class="supplier-logo-thumbnail" alt="${escapeHTML(supplierName)}">`
        : `<div class="supplier-logo-placeholder" style="background-color: ${colorPreset.value}20; color: ${colorPreset.value}; border: 1px solid ${colorPreset.value}40;"><i class="fa-solid fa-truck-ramp-box"></i></div>`;

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>
          <div style="display: flex; align-items: center; gap: 12px;">
            ${logoHtml}
            <div style="display: flex; flex-direction: column;">
              <strong>${escapeHTML(supplierName)}</strong>
              <span style="font-size: 0.72rem; color: var(--text-muted);">Added: ${new Date(supplierObj.dateAdded).toLocaleDateString(undefined, { dateStyle: 'medium' })}</span>
            </div>
          </div>
        </td>
        <td>
          <span class="supplier-tag" style="background-color: ${colorPreset.value}15; border-color: ${colorPreset.value}30; color: ${colorPreset.value}; font-weight: 600;">
            ${totalPurchases} keys
          </span>
        </td>
        <td>
          <span class="badge ${inStock > 0 ? 'badge-available' : 'badge-sold'}">
            ${inStock} in stock
          </span>
        </td>
        <td>
          <span style="font-weight: 500; color: var(--text-secondary);">${formatCurrency(costOfInStock)}</span>
        </td>
        <td>
          <span style="font-weight: 500; color: var(--text-secondary);">${formatCurrency(costOfSold)}</span>
        </td>
        <td>
          <span style="font-weight: 500; color: var(--text-secondary);">${formatCurrency(revenue)}</span>
        </td>
        <td>
          <span style="font-weight: 600; color: ${netProfit >= 0 ? 'var(--accent-teal)' : 'var(--accent-danger)'};">
            ${netProfit >= 0 ? '+' : ''}${formatCurrency(netProfit)}
          </span>
        </td>
        <td>
          ${statusBtn}
        </td>
        <td style="text-align: right;">
          <button class="btn-action btn-action-edit" onclick="triggerEditSupplier('${escapeHTML(escapedNameForJS)}')" title="Edit Supplier">
            <i class="fa-solid fa-pen"></i>
          </button>
          <button class="btn-action btn-action-delete" onclick="triggerDeleteSupplier('${escapeHTML(escapedNameForJS)}')" title="Delete Supplier">
            <i class="fa-solid fa-trash"></i>
          </button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  // Populate dynamic select dropdowns
  const addSelect = document.getElementById("game-source");
  const editSelect = document.getElementById("edit-game-source");
  const filterSelect = document.getElementById("inv-filter-supplier");
  
  if (addSelect && editSelect) {
    // Retain selected values if any
    const prevAddVal = addSelect.value;
    const prevEditVal = editSelect.value;

    // Dropdowns are always sorted alphabetically (A-Z) for clean UX
    const dropdownSuppliers = [...state.suppliers].sort((a, b) => a.name.localeCompare(b.name));
    
    // For adding keys, only show enabled suppliers
    const addDropdownSuppliers = dropdownSuppliers.filter(s => s.enabled !== false);

    addSelect.innerHTML = `<option value="" disabled ${!prevAddVal ? 'selected' : ''}>Select Supplier</option>` + 
      addDropdownSuppliers.map(s => `<option value="${s.name}">${s.name}</option>`).join("");
      
    // For editing keys, show all enabled suppliers initially (triggerEditGame handles current disabled source)
    editSelect.innerHTML = dropdownSuppliers.filter(s => s.enabled !== false).map(s => `<option value="${s.name}">${s.name}</option>`).join("");
    
    // Restore previous selection if it still exists in the list
    if (prevAddVal && state.suppliers.some(s => s.name === prevAddVal)) addSelect.value = prevAddVal;
    if (prevEditVal && state.suppliers.some(s => s.name === prevEditVal)) editSelect.value = prevEditVal;

    // Populate inventory filter dropdown as well
    if (filterSelect) {
      const prevFilterVal = filterSelect.value;
      // Show all suppliers in filter dropdown, but label disabled ones
      filterSelect.innerHTML = '<option value="all">All Suppliers</option>' +
        dropdownSuppliers.map(s => `<option value="${s.name}">${s.name}${s.enabled === false ? ' (Disabled)' : ''}</option>`).join("");
      
      if (prevFilterVal && (prevFilterVal === "all" || state.suppliers.some(s => s.name === prevFilterVal))) {
        filterSelect.value = prevFilterVal;
      } else {
        filterSelect.value = "all";
      }
    }

    // Populate dashboard filter dropdown as well
    const dbFilterSelect = document.getElementById("db-filter-supplier");
    if (dbFilterSelect) {
      const prevDbFilterVal = dbFilterSelect.value;
      dbFilterSelect.innerHTML = '<option value="all">All Suppliers</option>' +
        dropdownSuppliers.map(s => `<option value="${s.name}">${s.name}${s.enabled === false ? ' (Disabled)' : ''}</option>`).join("");
      
      if (prevDbFilterVal && (prevDbFilterVal === "all" || state.suppliers.some(s => s.name === prevDbFilterVal))) {
        dbFilterSelect.value = prevDbFilterVal;
      } else {
        dbFilterSelect.value = "all";
      }
    }

    // Populate suppliers view filter dropdown as well
    const supFilterSelect = document.getElementById("sup-filter-supplier");
    if (supFilterSelect) {
      const prevSupFilterVal = supFilterSelect.value;
      supFilterSelect.innerHTML = '<option value="all">All Suppliers</option>' +
        dropdownSuppliers.map(s => `<option value="${s.name}">${s.name}${s.enabled === false ? ' (Disabled)' : ''}</option>`).join("");
      
      if (prevSupFilterVal && (prevSupFilterVal === "all" || state.suppliers.some(s => s.name === prevSupFilterVal))) {
        supFilterSelect.value = prevSupFilterVal;
      } else {
        supFilterSelect.value = "all";
      }
    }

    // Render the leaderboard and ROI matrix
    renderSupplierAnalytics();
  }
}

// Render Supplier Analytics: Leaderboard & ROI Matrix Scatter Chart
function renderSupplierAnalytics() {
  const container = document.getElementById("supplier-leaderboard-container");
  if (!container) return;
  container.innerHTML = "";

  // Pre-index inventory by ID for O(1) lookups
  const inventoryMap = new Map();
  state.inventory.forEach(item => {
    inventoryMap.set(item.id, item);
  });

  // Aggregate stats per supplier
  const supplierStats = {};
  
  // Initialize with all suppliers
  state.suppliers.forEach(sup => {
    supplierStats[sup.name] = {
      name: sup.name,
      logo: sup.logo,
      color: sup.color || getSupplierColorName(sup.name),
      purchasedCount: 0,
      inStockCount: 0,
      soldCount: 0,
      costOfSold: 0,
      revenue: 0,
      netProfit: 0
    };
  });

  // Process inventory
  state.inventory.forEach(item => {
    const sup = item.source || "";
    if (!supplierStats[sup]) {
      supplierStats[sup] = {
        name: sup,
        logo: null,
        color: getSupplierColorName(sup),
        purchasedCount: 0,
        inStockCount: 0,
        soldCount: 0,
        costOfSold: 0,
        revenue: 0,
        netProfit: 0
      };
    }
    const s = supplierStats[sup];
    s.purchasedCount++;
    if (item.status !== "Sold") {
      s.inStockCount++;
    }
  });

  // Process sales
  state.sales.forEach(sale => {
    const game = inventoryMap.get(sale.inventoryId);
    if (game) {
      const sup = game.source || "";
      if (!supplierStats[sup]) {
        supplierStats[sup] = {
          name: sup,
          logo: null,
          color: getSupplierColorName(sup),
          purchasedCount: 0,
          inStockCount: 0,
          soldCount: 0,
          costOfSold: 0,
          revenue: 0,
          netProfit: 0
        };
      }
      const s = supplierStats[sup];
      s.soldCount++;
      s.costOfSold += sale.cost;
      s.revenue += sale.sellPrice;
      s.netProfit += sale.profit;
    }
  });

  const suppliersList = Object.values(supplierStats);

  // Compute ROI and STR
  suppliersList.forEach(s => {
    s.roi = s.costOfSold > 0 ? (s.netProfit / s.costOfSold) * 100 : 0;
    const totalKeys = s.soldCount + s.inStockCount;
    s.sellThrough = totalKeys > 0 ? (s.soldCount / totalKeys) * 100 : 0;
  });

  // Get active ranking metric
  const metricSelect = document.getElementById("leaderboard-metric-select");
  const selectedMetric = metricSelect ? metricSelect.value : "profit";

  // Sort list
  if (selectedMetric === "profit") {
    suppliersList.sort((a, b) => b.netProfit - a.netProfit);
  } else if (selectedMetric === "roi") {
    suppliersList.sort((a, b) => b.roi - a.roi);
  } else if (selectedMetric === "volume") {
    suppliersList.sort((a, b) => b.soldCount - a.soldCount);
  } else if (selectedMetric === "sellthrough") {
    suppliersList.sort((a, b) => b.sellThrough - a.sellThrough);
  }

  // Take top 5 with positive volume/purchases
  const activeSuppliers = suppliersList.filter(s => s.purchasedCount > 0 || s.soldCount > 0);
  const topSuppliers = activeSuppliers.slice(0, 5);

  if (topSuppliers.length === 0) {
    container.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 40px 0; font-size: 0.9rem;">Add suppliers and keys to view the leaderboard.</div>`;
  } else {
    // Find max value to scale progress bars
    let maxValue = 1;
    if (selectedMetric === "profit") {
      maxValue = Math.max(...topSuppliers.map(s => s.netProfit), 1);
    } else if (selectedMetric === "roi") {
      maxValue = Math.max(...topSuppliers.map(s => s.roi), 1);
    } else if (selectedMetric === "volume") {
      maxValue = Math.max(...topSuppliers.map(s => s.soldCount), 1);
    } else if (selectedMetric === "sellthrough") {
      maxValue = Math.max(...topSuppliers.map(s => s.sellThrough), 1);
    }

    topSuppliers.forEach((sup, index) => {
      const colorPreset = SUPPLIER_COLORS.find(c => c.name === sup.color) || SUPPLIER_COLORS[0];
      
      // Calculate display value
      let displayVal = "";
      let rawVal = 0;
      if (selectedMetric === "profit") {
        displayVal = formatCurrency(sup.netProfit);
        rawVal = sup.netProfit;
      } else if (selectedMetric === "roi") {
        displayVal = `${sup.roi.toFixed(1)}%`;
        rawVal = sup.roi;
      } else if (selectedMetric === "volume") {
        displayVal = `${sup.soldCount} sold`;
        rawVal = sup.soldCount;
      } else if (selectedMetric === "sellthrough") {
        displayVal = `${sup.sellThrough.toFixed(1)}% STR`;
        rawVal = sup.sellThrough;
      }

      const percent = Math.max(0, Math.min(100, (rawVal / maxValue) * 100));

      // Rank circle styling
      let rankBadge = "";
      if (index === 0) {
        rankBadge = `<span style="background: linear-gradient(135deg, #ffd700, #ffa500); color: #000; width: 22px; height: 22px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: bold; box-shadow: 0 0 10px rgba(255, 215, 0, 0.4);">1</span>`;
      } else if (index === 1) {
        rankBadge = `<span style="background: linear-gradient(135deg, #c0c0c0, #a9a9a9); color: #000; width: 22px; height: 22px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: bold; box-shadow: 0 0 10px rgba(192, 192, 192, 0.3);">2</span>`;
      } else if (index === 2) {
        rankBadge = `<span style="background: linear-gradient(135deg, #cd7f32, #8b4513); color: #fff; width: 22px; height: 22px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: bold; box-shadow: 0 0 10px rgba(205, 127, 50, 0.3);">3</span>`;
      } else {
        rankBadge = `<span style="background: var(--bg-input); border: 1px solid var(--border-color); color: var(--text-secondary); width: 22px; height: 22px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: bold;">${index + 1}</span>`;
      }

      // Logo or placeholder circle
      const logoHtml = sup.logo
        ? `<img src="${sup.logo}" style="width: 24px; height: 24px; border-radius: 4px; object-fit: contain; background: var(--bg-card); border: 1px solid var(--border-color); padding: 1px;">`
        : `<span style="background-color: ${colorPreset.value}20; color: ${colorPreset.value}; width: 24px; height: 24px; border-radius: 4px; border: 1px solid ${colorPreset.value}40; display: inline-flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: bold;">${sup.name.charAt(0).toUpperCase()}</span>`;

      const row = document.createElement("div");
      row.style.display = "flex";
      row.style.flexDirection = "column";
      row.style.gap = "6px";
      row.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: space-between; gap: 10px;">
          <div style="display: flex; align-items: center; gap: 8px;">
            ${rankBadge}
            ${logoHtml}
            <span style="font-size: 0.85rem; font-weight: 600; color: var(--text-main);">${sup.name}</span>
          </div>
          <span style="font-size: 0.85rem; font-weight: 700; color: ${colorPreset.value};">${displayVal}</span>
        </div>
        <div style="background-color: var(--bg-input); height: 6px; border-radius: 3px; overflow: hidden; position: relative;">
          <div style="background-color: ${colorPreset.value}; width: ${percent}%; height: 100%; border-radius: 3px; transition: width 0.6s cubic-bezier(0.1, 0.8, 0.25, 1);"></div>
        </div>
      `;
      container.appendChild(row);
    });
  }

  // Now, render the ROI matrix chart!
  renderRoiMatrixChart(activeSuppliers);
}

// Render Supplier ROI & Velocity Matrix Scatter Chart
function renderRoiMatrixChart(activeSuppliers) {
  if (supplierRoiMatrixChartInstance) {
    try {
      supplierRoiMatrixChartInstance.destroy();
    } catch (e) {
      console.error("Error destroying supplierRoiMatrixChartInstance:", e);
    }
    supplierRoiMatrixChartInstance = null;
  }

  const canvas = document.getElementById("supplier-roi-matrix-chart");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");

  // Retrieve theme CSS variables
  const rootStyle = getComputedStyle(document.documentElement);
  const textSecondaryColor = rootStyle.getPropertyValue("--text-secondary").trim() || "hsl(215, 15%, 60%)";
  const borderColor = rootStyle.getPropertyValue("--border-color").trim() || "hsl(215, 15%, 15%)";

  // Prepare scatter datasets
  const scatterData = activeSuppliers.map(sup => {
    return {
      x: parseFloat(sup.sellThrough.toFixed(1)),
      y: parseFloat(sup.roi.toFixed(1)),
      label: sup.name,
      color: (SUPPLIER_COLORS.find(c => c.name === sup.color) || SUPPLIER_COLORS[0]).value
    };
  });

  supplierRoiMatrixChartInstance = new Chart(ctx, {
    type: 'scatter',
    data: {
      datasets: [{
        label: 'Suppliers',
        data: scatterData,
        backgroundColor: scatterData.map(d => d.color),
        borderColor: scatterData.map(d => d.color),
        pointRadius: 8,
        pointHoverRadius: 10
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          min: 0,
          max: 100,
          grid: { color: borderColor },
          ticks: { color: textSecondaryColor, font: { family: 'Inter', size: 10 } },
          title: {
            display: true,
            text: 'Sell-Through Rate (%)',
            color: textSecondaryColor,
            font: { family: 'Inter', size: 10, weight: 'bold' }
          }
        },
        y: {
          min: 0,
          grid: { color: borderColor },
          ticks: { color: textSecondaryColor, font: { family: 'Inter', size: 10 } },
          title: {
            display: true,
            text: 'Return on Investment (ROI %)',
            color: textSecondaryColor,
            font: { family: 'Inter', size: 10, weight: 'bold' }
          }
        }
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: function(context) {
              const pt = context.raw;
              return `${pt.label}: STR = ${pt.x}%, ROI = ${pt.y}%`;
            }
          }
        }
      }
    }
  });
}

// Initialize color swatches in Add and Edit Supplier forms
function initColorPickers() {
  const addGrid = document.getElementById("add-supplier-color-grid");
  const editGrid = document.getElementById("edit-supplier-color-grid");
  
  if (addGrid) {
    addGrid.innerHTML = SUPPLIER_COLORS.map(c => `
      <div class="color-swatch" data-color="${c.name}" style="background-color: ${c.value};" title="${c.name}"></div>
    `).join("");
    
    // Set purple as active by default
    const firstSwatch = addGrid.querySelector(`.color-swatch[data-color="purple"]`);
    if (firstSwatch) firstSwatch.classList.add("active");
    
    addGrid.addEventListener("click", (e) => {
      const swatch = e.target.closest(".color-swatch");
      if (!swatch) return;
      
      addGrid.querySelectorAll(".color-swatch").forEach(s => s.classList.remove("active"));
      swatch.classList.add("active");
      
      const colorInput = document.getElementById("add-supplier-color-input");
      if (colorInput) colorInput.value = swatch.getAttribute("data-color");
    });
  }
  
  if (editGrid) {
    editGrid.innerHTML = SUPPLIER_COLORS.map(c => `
      <div class="color-swatch" data-color="${c.name}" style="background-color: ${c.value};" title="${c.name}"></div>
    `).join("");
    
    editGrid.addEventListener("click", (e) => {
      const swatch = e.target.closest(".color-swatch");
      if (!swatch) return;
      
      editGrid.querySelectorAll(".color-swatch").forEach(s => s.classList.remove("active"));
      swatch.classList.add("active");
      
      const colorInput = document.getElementById("edit-supplier-color-input");
      if (colorInput) colorInput.value = swatch.getAttribute("data-color");
    });
  }
}

async function handleAddSupplierSubmit(e) {
  e.preventDefault();
  const input = document.getElementById("supplier-name-input");
  const name = input.value.trim();
  if (!name) return;

  if (state.suppliers.some(s => s.name.toLowerCase() === name.toLowerCase())) {
    showToast("Supplier name already exists.", "error");
    return;
  }

  const colorInput = document.getElementById("add-supplier-color-input");
  const color = colorInput ? colorInput.value : "purple";

  const logoUrlInput = document.getElementById("supplier-logo-url-input");
  let logo = logoUrlInput ? logoUrlInput.value.trim() : "";
  const logoFileInput = document.getElementById("supplier-logo-file-input");

  if (logoFileInput && logoFileInput.files && logoFileInput.files[0]) {
    try {
      logo = await getBase64(logoFileInput.files[0]);
    } catch (err) {
      console.error("Error reading logo file:", err);
      showToast("Failed to process logo image file.", "error");
    }
  }

  const newSupplier = { name: name, dateAdded: Date.now(), color: color, enabled: true, logo: logo || null };
  state.suppliers.push(newSupplier);
  saveStateToStorage();
  if (window.supabaseClient) {
    await dbSaveSupplier(newSupplier);
  }
  updateUI();
  
  input.value = "";
  if (logoUrlInput) logoUrlInput.value = "";
  if (logoFileInput) logoFileInput.value = "";
  
  const addLogoLabel = document.querySelector("#add-supplier-form .file-upload-label");
  if (addLogoLabel) {
    addLogoLabel.innerHTML = `<i class="fa-solid fa-upload"></i> Upload Logo`;
  }
  
  // Reset color picker to purple
  const addGrid = document.getElementById("add-supplier-color-grid");
  if (addGrid) {
    addGrid.querySelectorAll(".color-swatch").forEach(s => s.classList.remove("active"));
    const firstSwatch = addGrid.querySelector(`.color-swatch[data-color="purple"]`);
    if (firstSwatch) firstSwatch.classList.add("active");
  }
  if (colorInput) colorInput.value = "purple";

  showToast(`Successfully registered supplier: ${name}`, "success");
  closeModal("add-supplier-modal");
}

window.triggerEditSupplier = function(oldName) {
  const supplierObj = state.suppliers.find(s => s.name === oldName);
  if (!supplierObj) return;

  document.getElementById("edit-supplier-old-name").value = oldName;
  document.getElementById("edit-supplier-name").value = oldName;
  
  const color = supplierObj.color || getSupplierColorName(oldName);
  const colorInput = document.getElementById("edit-supplier-color-input");
  if (colorInput) colorInput.value = color;
  
  const editGrid = document.getElementById("edit-supplier-color-grid");
  if (editGrid) {
    editGrid.querySelectorAll(".color-swatch").forEach(s => s.classList.remove("active"));
    const activeSwatch = editGrid.querySelector(`.color-swatch[data-color="${color}"]`);
    if (activeSwatch) activeSwatch.classList.add("active");
  }

  const logoUrl = supplierObj.logo || "";
  const editLogoUrlInput = document.getElementById("edit-supplier-logo-url");
  if (editLogoUrlInput) editLogoUrlInput.value = logoUrl;
  
  const editLogoFileInput = document.getElementById("edit-supplier-logo-file");
  if (editLogoFileInput) editLogoFileInput.value = "";

  const editLogoLabel = document.querySelector("#edit-supplier-form .file-upload-label");
  if (editLogoLabel) {
    editLogoLabel.innerHTML = `<i class="fa-solid fa-upload"></i> Upload Logo`;
  }

  openModal("edit-supplier-modal");
};

async function handleEditSupplierSubmit(e) {
  e.preventDefault();
  
  const oldName = document.getElementById("edit-supplier-old-name").value;
  const newName = document.getElementById("edit-supplier-name").value.trim();
  const color = document.getElementById("edit-supplier-color-input").value;
  
  if (!newName) {
    showToast("Supplier name cannot be empty.", "error");
    return;
  }
  
  if (newName.toLowerCase() !== oldName.toLowerCase()) {
    if (state.suppliers.some(s => s.name.toLowerCase() === newName.toLowerCase())) {
      showToast("Supplier name already exists.", "error");
      return;
    }
  }
  
  const editLogoUrlInput = document.getElementById("edit-supplier-logo-url");
  let logo = editLogoUrlInput ? editLogoUrlInput.value.trim() : "";
  const editLogoFileInput = document.getElementById("edit-supplier-logo-file");

  if (editLogoFileInput && editLogoFileInput.files && editLogoFileInput.files[0]) {
    try {
      logo = await getBase64(editLogoFileInput.files[0]);
    } catch (err) {
      console.error("Error reading logo file:", err);
      showToast("Failed to process logo image file.", "error");
    }
  }

  const supplierObj = state.suppliers.find(s => s.name === oldName);
  if (supplierObj) {
    supplierObj.name = newName;
    supplierObj.color = color;
    supplierObj.logo = logo || null;
  }
  
  let updateCount = 0;
  if (newName !== oldName) {
    state.inventory.forEach(item => {
      if (item.source === oldName) {
        item.source = newName;
        updateCount++;
      }
    });
  }
  
  saveStateToStorage();
  if (window.supabaseClient) {
    if (newName !== oldName) {
      await dbSaveSupplier({ name: newName, dateAdded: supplierObj.dateAdded, color: color, enabled: supplierObj.enabled !== false });
      const itemsToUpdate = state.inventory.filter(item => item.source === newName);
      for (const item of itemsToUpdate) {
        await dbSaveInventory(item);
      }
      await dbDeleteSupplier(oldName);
    } else {
      await dbSaveSupplier(supplierObj);
    }
  }
  updateUI();
  closeModal("edit-supplier-modal");
  
  if (newName !== oldName) {
    showToast(`Renamed "${oldName}" to "${newName}" (synced ${updateCount} games)`, "success");
  } else {
    showToast(`Updated color for supplier "${newName}"`, "success");
  }
}

window.triggerDeleteSupplier = async function(name) {
  // Check if supplier is in use
  const countInUse = state.inventory.filter(item => item.source === name).length;
  
  let msg = `Are you sure you want to delete supplier "${name}"?`;
  if (countInUse > 0) {
    msg = `WARNING: "${name}" is currently assigned to ${countInUse} game key(s) in your stock.\n\nDeleting this supplier will leave those items without a dynamic supplier reference. Are you sure you want to proceed?`;
  }
  
  if (confirm(msg)) {
    state.suppliers = state.suppliers.filter(s => s.name !== name);
    saveStateToStorage();
    if (window.supabaseClient) {
      await dbDeleteSupplier(name);
    }
    updateUI();
    showToast(`Removed supplier: ${name}`, "info");
  }
};

window.triggerToggleSupplier = async function(name) {
  const supplierObj = state.suppliers.find(s => s.name === name);
  if (!supplierObj) return;

  supplierObj.enabled = !(supplierObj.enabled !== false);
  saveStateToStorage();
  if (window.supabaseClient) {
    await dbSaveSupplier(supplierObj);
  }
  updateUI();
  
  const statusStr = supplierObj.enabled !== false ? "Enabled" : "Disabled";
  showToast(`Supplier "${name}" is now ${statusStr}.`, "success");
};

window.triggerEditPublisher = function(name) {
  const modal = document.getElementById("edit-publisher-modal");
  const oldNameInput = document.getElementById("edit-publisher-old-name");
  const newNameInput = document.getElementById("edit-publisher-new-name");
  
  if (modal && oldNameInput && newNameInput) {
    oldNameInput.value = name;
    newNameInput.value = name;
    openModal("edit-publisher-modal");
  }
};

function renderPlatforms() {
  const tbody = DOM["platforms-table-body"] || document.getElementById("platforms-table-body");
  if (!tbody) return;
  tbody.innerHTML = "";

  if (state.platforms.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 20px;">No platforms registered.</td></tr>`;
  } else {
    const sortVal = document.getElementById("platforms-sort")?.value || "date-desc";
    let sortedPlatforms = [...state.platforms];
    
    if (sortVal === "date-desc") {
      sortedPlatforms.sort((a, b) => b.dateAdded - a.dateAdded);
    } else if (sortVal === "date-asc") {
      sortedPlatforms.sort((a, b) => a.dateAdded - b.dateAdded);
    } else if (sortVal === "name-asc") {
      sortedPlatforms.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortVal === "name-desc") {
      sortedPlatforms.sort((a, b) => b.name.localeCompare(a.name));
    }

    // Group inventory metrics by platform name in a single pass O(N)
    const platformInventoryStats = new Map();
    state.inventory.forEach(item => {
      const plat = item.platform || "";
      if (!platformInventoryStats.has(plat)) {
        platformInventoryStats.set(plat, { totalPurchases: 0, inStock: 0 });
      }
      const stats = platformInventoryStats.get(plat);
      stats.totalPurchases++;
      if (item.status !== "Sold") {
        stats.inStock++;
      }
    });

    sortedPlatforms.forEach(platformObj => {
      const platformName = platformObj.name;
      const stats = platformInventoryStats.get(platformName) || { totalPurchases: 0, inStock: 0 };
      const totalPurchases = stats.totalPurchases;
      const inStock = stats.inStock;
      
      const isEnabled = platformObj.enabled !== false;
      
      const escapedNameForJS = platformName.replace(/'/g, "\\'").replace(/"/g, "&quot;");
      const statusBtn = `
        <button class="btn" 
                onclick="triggerTogglePlatform('${escapeHTML(escapedNameForJS)}')" 
                style="padding: 4px 10px; font-size: 0.75rem; border-radius: var(--radius-sm); font-weight: 600; cursor: pointer; transition: all 0.2s ease; ${
                  isEnabled 
                    ? 'background-color: hsla(175, 90%, 48%, 0.1); border: 1px solid var(--accent-teal); color: var(--accent-teal);' 
                    : 'background-color: hsla(355, 85%, 55%, 0.1); border: 1px solid var(--accent-danger); color: var(--accent-danger);'
                }">
          <i class="${isEnabled ? 'fa-solid fa-circle-check' : 'fa-solid fa-circle-xmark'}" style="margin-right: 4px;"></i>
          ${isEnabled ? 'Enabled' : 'Disabled'}
        </button>
      `;

      const logoHtml = platformObj.logo
        ? `<img src="${escapeHTML(platformObj.logo)}" class="supplier-logo-thumbnail" alt="${escapeHTML(platformName)}">`
        : `<div class="supplier-logo-placeholder" style="background-color: var(--border-color); color: var(--text-secondary); border: 1px solid var(--border-color);"><i class="fa-solid fa-gamepad"></i></div>`;

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>
          <div style="display: flex; align-items: center; gap: 12px;">
            ${logoHtml}
            <div style="display: flex; flex-direction: column;">
              <strong>${escapeHTML(platformName)}</strong>
              <span style="font-size: 0.72rem; color: var(--text-muted);">Added: ${new Date(platformObj.dateAdded).toLocaleDateString(undefined, { dateStyle: 'medium' })}</span>
            </div>
          </div>
        </td>
        <td>
          <span class="supplier-tag" style="background-color: var(--border-color); color: var(--text-primary); font-weight: 600; border: 1px solid var(--border-color);">
            ${totalPurchases} keys
          </span>
        </td>
        <td>
          <span class="badge ${inStock > 0 ? 'badge-available' : 'badge-sold'}">
            ${inStock} in stock
          </span>
        </td>
        <td>
          ${statusBtn}
        </td>
        <td style="text-align: right;">
          <button class="btn-action btn-action-edit" onclick="triggerEditPlatform('${escapeHTML(escapedNameForJS)}')" title="Edit Platform">
            <i class="fa-solid fa-pen"></i>
          </button>
          <button class="btn-action btn-action-delete" onclick="triggerDeletePlatform('${escapeHTML(escapedNameForJS)}')" title="Delete Platform">
            <i class="fa-solid fa-trash"></i>
          </button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  // Populate dynamic select dropdowns
  const addSelect = document.getElementById("game-platform");
  const editSelect = document.getElementById("edit-game-platform");
  const filterSelect = document.getElementById("inv-filter-platform");

  if (addSelect && editSelect) {
    const prevAddVal = addSelect.value;
    const prevEditVal = editSelect.value;

    const dropdownPlatforms = [...state.platforms].sort((a, b) => a.name.localeCompare(b.name));
    const addDropdownPlatforms = dropdownPlatforms.filter(p => p.enabled !== false);

    addSelect.innerHTML = `<option value="" disabled ${!prevAddVal ? 'selected' : ''}>Select Platform</option>` + 
      addDropdownPlatforms.map(p => `<option value="${p.name}">${p.name}</option>`).join("");
      
    editSelect.innerHTML = dropdownPlatforms.filter(p => p.enabled !== false).map(p => `<option value="${p.name}">${p.name}</option>`).join("");

    if (prevAddVal && state.platforms.some(p => p.name === prevAddVal)) addSelect.value = prevAddVal;
    if (prevEditVal && state.platforms.some(p => p.name === prevEditVal)) editSelect.value = prevEditVal;
  }

  if (filterSelect) {
    const prevFilterVal = filterSelect.value;
    const dropdownPlatforms = [...state.platforms].sort((a, b) => a.name.localeCompare(b.name));
    filterSelect.innerHTML = '<option value="all">All Platforms</option>' +
      dropdownPlatforms.map(p => `<option value="${p.name}">${p.name}${p.enabled === false ? ' (Disabled)' : ''}</option>`).join("");
    
    if (prevFilterVal && (prevFilterVal === "all" || state.platforms.some(p => p.name === prevFilterVal))) {
      filterSelect.value = prevFilterVal;
    } else {
      filterSelect.value = "all";
    }
  }
}

async function handleAddPlatformSubmit(e) {
  e.preventDefault();
  const input = document.getElementById("platform-name-input");
  const name = input.value.trim();
  if (!name) return;

  if (state.platforms.some(p => p.name.toLowerCase() === name.toLowerCase())) {
    showToast("Platform name already exists.", "error");
    return;
  }

  const logoUrlInput = document.getElementById("platform-logo-url-input");
  let logo = logoUrlInput ? logoUrlInput.value.trim() : "";
  const logoFileInput = document.getElementById("platform-logo-file-input");

  if (logoFileInput && logoFileInput.files && logoFileInput.files[0]) {
    try {
      logo = await getBase64(logoFileInput.files[0]);
    } catch (err) {
      console.error("Error reading platform logo file:", err);
      showToast("Failed to process logo image file.", "error");
    }
  }

  const newPlatform = { name: name, dateAdded: Date.now(), enabled: true, logo: logo || null };
  state.platforms.push(newPlatform);
  saveStateToStorage();
  if (window.supabaseClient) {
    await dbSavePlatform(newPlatform);
  }
  updateUI();
  
  input.value = "";
  if (logoUrlInput) logoUrlInput.value = "";
  if (logoFileInput) logoFileInput.value = "";
  
  const addLogoLabel = document.querySelector("#add-platform-form .file-upload-label");
  if (addLogoLabel) {
    addLogoLabel.innerHTML = `<i class="fa-solid fa-upload"></i> Upload Logo`;
  }
  
  showToast(`Successfully registered platform: ${name}`, "success");
}

window.triggerEditPlatform = function(oldName) {
  const platformObj = state.platforms.find(p => p.name === oldName);
  if (!platformObj) return;

  document.getElementById("edit-platform-old-name").value = oldName;
  document.getElementById("edit-platform-name").value = oldName;

  const logoUrl = platformObj.logo || "";
  const editLogoUrlInput = document.getElementById("edit-platform-logo-url");
  if (editLogoUrlInput) editLogoUrlInput.value = logoUrl;
  
  const editLogoFileInput = document.getElementById("edit-platform-logo-file");
  if (editLogoFileInput) editLogoFileInput.value = "";

  const editLogoLabel = document.querySelector("#edit-platform-modal .file-upload-label");
  if (editLogoLabel) {
    editLogoLabel.innerHTML = `<i class="fa-solid fa-upload"></i> Upload Logo`;
  }

  openModal("edit-platform-modal");
};

async function handleEditPlatformSubmit(e) {
  e.preventDefault();
  
  const oldName = document.getElementById("edit-platform-old-name").value;
  const newName = document.getElementById("edit-platform-name").value.trim();
  
  if (!newName) {
    showToast("Platform name cannot be empty.", "error");
    return;
  }
  
  if (newName.toLowerCase() !== oldName.toLowerCase()) {
    if (state.platforms.some(p => p.name.toLowerCase() === newName.toLowerCase())) {
      showToast("Platform name already exists.", "error");
      return;
    }
  }

  const editLogoUrlInput = document.getElementById("edit-platform-logo-url");
  let logo = editLogoUrlInput ? editLogoUrlInput.value.trim() : "";
  const editLogoFileInput = document.getElementById("edit-platform-logo-file");

  if (editLogoFileInput && editLogoFileInput.files && editLogoFileInput.files[0]) {
    try {
      logo = await getBase64(editLogoFileInput.files[0]);
    } catch (err) {
      console.error("Error reading logo file:", err);
      showToast("Failed to process logo image file.", "error");
    }
  }
  
  const platformObj = state.platforms.find(p => p.name === oldName);
  if (platformObj) {
    platformObj.name = newName;
    platformObj.logo = logo || null;
  }
  
  let inventoryUpdateCount = 0;
  let salesUpdateCount = 0;
  
  if (newName !== oldName) {
    state.inventory.forEach(item => {
      if (item.platform === oldName) {
        item.platform = newName;
        inventoryUpdateCount++;
      }
    });
    
    state.sales.forEach(sale => {
      if (sale.platform === oldName) {
        sale.platform = newName;
        salesUpdateCount++;
      }
    });
  }
  
  saveStateToStorage();
  
  if (window.supabaseClient) {
    if (newName !== oldName) {
      await dbSavePlatform({ name: newName, dateAdded: platformObj.dateAdded, enabled: platformObj.enabled !== false, logo: platformObj.logo });
      
      const itemsToUpdate = state.inventory.filter(item => item.platform === newName);
      for (const item of itemsToUpdate) {
        await dbSaveInventory(item);
      }
      
      const salesToUpdate = state.sales.filter(sale => sale.platform === newName);
      for (const sale of salesToUpdate) {
        await dbSaveSale(sale);
      }
      
      await dbDeletePlatform(oldName);
    } else {
      await dbSavePlatform(platformObj);
    }
  }
  
  updateUI();
  closeModal("edit-platform-modal");
  
  if (newName !== oldName) {
    showToast(`Renamed "${oldName}" to "${newName}" (updated ${inventoryUpdateCount} inventory, ${salesUpdateCount} sales)`, "success");
  } else {
    showToast(`Updated platform info`, "success");
  }
}

async function handleEditPublisherSubmit(e) {
  e.preventDefault();
  
  const oldName = document.getElementById("edit-publisher-old-name").value;
  const newName = document.getElementById("edit-publisher-new-name").value.trim();
  
  if (!newName) {
    showToast("Publisher name cannot be empty.", "error");
    return;
  }
  
  if (oldName === newName) {
    closeModal("edit-publisher-modal");
    return;
  }

  pushToUndoStack();
  
  // Update all inventory items matching the old publisher name
  let inventoryUpdateCount = 0;
  state.inventory.forEach(item => {
    if (String(item.publisher || "").trim() === oldName) {
      item.publisher = newName;
      inventoryUpdateCount++;
    }
  });

  saveStateToStorage();
  
  // Sync to Supabase in a single batch upsert
  if (window.supabaseClient && state.syncMode === "realtime") {
    try {
      const updatedItems = state.inventory.filter(item => item.publisher === newName);
      const upsertData = updatedItems.map(item => ({
        id: item.id,
        title: item.title,
        platform: item.platform,
        key: item.key,
        cost: item.cost,
        source: item.source,
        purchaseDate: item.purchaseDate,
        imageUrl: item.imageUrl || null,
        status: item.status,
        notes: item.notes || null,
        publisher: item.publisher || null
      }));
      
      if (upsertData.length > 0) {
        const { error } = await window.supabaseClient
          .from('inventory')
          .upsert(upsertData);
        if (error) throw error;
      }
    } catch (err) {
      console.error("Error syncing renamed publisher keys to Supabase:", err);
      showToast("Publisher renamed locally, but cloud sync failed.", "warning");
    }
  } else if (state.syncMode === "manual" || window.supabaseClient) {
    setUnsyncedChanges(true);
  }

  updateUI();
  closeModal("edit-publisher-modal");
  
  showToast(`Renamed publisher "${oldName}" to "${newName}" across ${inventoryUpdateCount} key(s)`, "success");
}

window.triggerDeletePlatform = async function(name) {
  const countInventory = state.inventory.filter(item => item.platform === name).length;
  const countSales = state.sales.filter(sale => sale.platform === name).length;
  const countInUse = countInventory + countSales;
  
  let msg = `Are you sure you want to delete platform "${name}"?`;
  if (countInUse > 0) {
    msg = `WARNING: "${name}" is currently assigned to ${countInventory} game key(s) in inventory and ${countSales} sale(s).\n\nDeleting this platform will leave those items without a platform reference. Are you sure you want to proceed?`;
  }
  
  if (confirm(msg)) {
    state.platforms = state.platforms.filter(p => p.name !== name);
    saveStateToStorage();
    if (window.supabaseClient) {
      await dbDeletePlatform(name);
    }
    updateUI();
    showToast(`Removed platform: ${name}`, "info");
  }
};

window.triggerTogglePlatform = async function(name) {
  const platformObj = state.platforms.find(p => p.name === name);
  if (!platformObj) return;

  platformObj.enabled = !(platformObj.enabled !== false);
  saveStateToStorage();
  if (window.supabaseClient) {
    await dbSavePlatform(platformObj);
  }
  updateUI();
  
  const statusStr = platformObj.enabled !== false ? "Enabled" : "Disabled";
  showToast(`Platform "${name}" is now ${statusStr}.`, "success");
};

// Filters sales database based on date button selection & search inputs
function getFilteredSales() {
  let list = [...state.sales];
  const now = new Date();

  // A. Date Range Period Filter
  if (state.activePeriod === "month") {
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    list = list.filter(item => new Date(item.saleDate) >= startOfMonth);
  } else if (state.activePeriod === "week") {
    const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay())); // Sunday
    list = list.filter(item => new Date(item.saleDate) >= startOfWeek);
  } else if (state.activePeriod === "today") {
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const todayStr = `${year}-${month}-${day}`;
    list = list.filter(item => item.saleDate === todayStr);
  } else if (state.activePeriod === "custom") {
    if (state.customStartDate) {
      const start = new Date(state.customStartDate);
      start.setHours(0, 0, 0, 0);
      list = list.filter(item => {
        if (!item.saleDate) return false;
        const d = new Date(item.saleDate);
        d.setHours(0, 0, 0, 0);
        return d >= start;
      });
    }
    if (state.customEndDate) {
      const end = new Date(state.customEndDate);
      end.setHours(23, 59, 59, 999);
      list = list.filter(item => {
        if (!item.saleDate) return false;
        const d = new Date(item.saleDate);
        d.setHours(0, 0, 0, 0);
        return d <= end;
      });
    }
  }

  // B. Specific Page Filter: Platform
  const platformFilter = document.getElementById("sales-filter-platform").value;
  if (platformFilter !== "all") {
    list = list.filter(item => item.platformSold.toLowerCase() === platformFilter.toLowerCase());
  }

  // C. Search Input Filter
  const searchInput = document.getElementById("sales-search-input").value.toLowerCase().trim();
  if (searchInput) {
    list = list.filter(item => 
      item.title.toLowerCase().includes(searchInput) ||
      item.platform.toLowerCase().includes(searchInput) ||
      item.platformSold.toLowerCase().includes(searchInput) ||
      (item.notes && item.notes.toLowerCase().includes(searchInput))
    );
  }

  return list.sort((a, b) => new Date(b.saleDate) - new Date(a.saleDate)); // newest sales first
}

// Filters inventory database based on filter controls
function getFilteredInventory() {
  let list = [...state.inventory];

  // A. Platform filter
  const platform = document.getElementById("inv-filter-platform").value;
  if (platform !== "all") {
    list = list.filter(item => item.platform === platform);
  }

  // B. Status filter
  const status = document.getElementById("inv-filter-status").value;
  if (status !== "all") {
    list = list.filter(item => item.status === status);
  }

  // C. Supplier filter
  const supplierFilter = document.getElementById("inv-filter-supplier").value;
  if (supplierFilter !== "all") {
    list = list.filter(item => item.source === supplierFilter);
  }

  // E. Aging category filter
  const agingFilterEl = document.getElementById("inv-filter-aging");
  const agingFilter = agingFilterEl ? agingFilterEl.value : "all";
  if (agingFilter !== "all") {
    list = list.filter(item => {
      const category = getAgingCategory(item.purchaseDate).name;
      return category === agingFilter;
    });
  }

  // D. Search input
  const search = document.getElementById("inv-search-input").value.toLowerCase().trim();
  if (search) {
    list = list.filter(item => 
      item.title.toLowerCase().includes(search) ||
      item.key.toLowerCase().includes(search) ||
      item.source.toLowerCase().includes(search) ||
      (item.notes && item.notes.toLowerCase().includes(search))
    );
  }

  // Optimize Sorting
  const sortBy = state.inventorySortBy || "date-desc";
  
  if (sortBy.startsWith("title-")) {
    if (sortBy === "title-asc") {
      list.sort((a, b) => a.title.localeCompare(b.title));
    } else {
      list.sort((a, b) => b.title.localeCompare(a.title));
    }
  } else if (sortBy.startsWith("date-")) {
    // Pre-calculate timestamps to avoid millions of Date instantiations in quicksort
    const mapped = list.map((item, index) => {
      const time = item.purchaseDate ? new Date(item.purchaseDate).getTime() : 0;
      return { index, time };
    });
    
    if (sortBy === "date-desc") {
      mapped.sort((a, b) => b.time - a.time);
    } else {
      mapped.sort((a, b) => a.time - b.time);
    }
    
    list = mapped.map(el => list[el.index]);
  } else if (sortBy.startsWith("duration-")) {
    // Pre-map sales to inventory IDs for O(1) lookups
    const salesMap = new Map();
    state.sales.forEach(sale => {
      salesMap.set(sale.inventoryId, sale);
    });
    
    const nowTime = new Date().setHours(0, 0, 0, 0);
    
    // Pre-calculate duration for each item
    const mapped = list.map((item, index) => {
      let duration = 0;
      if (item.purchaseDate) {
        const start = new Date(item.purchaseDate);
        start.setHours(0, 0, 0, 0);
        const startTime = start.getTime();
        
        const saleItem = salesMap.get(item.id);
        let endTime = nowTime;
        if (saleItem && saleItem.saleDate) {
          const end = new Date(saleItem.saleDate);
          end.setHours(0, 0, 0, 0);
          endTime = end.getTime();
        }
        
        const diffTime = Math.max(0, endTime - startTime);
        duration = Math.round(diffTime / (1000 * 60 * 60 * 24));
      }
      return { index, duration };
    });
    
    if (sortBy === "duration-desc") {
      mapped.sort((a, b) => b.duration - a.duration);
    } else {
      mapped.sort((a, b) => a.duration - b.duration);
    }
    
    list = mapped.map(el => list[el.index]);
  } else if (sortBy.startsWith("age-")) {
    const nowTime = new Date().setHours(0, 0, 0, 0);
    const mapped = list.map((item, index) => {
      let age = 0;
      if (item.purchaseDate) {
        const start = new Date(item.purchaseDate);
        start.setHours(0, 0, 0, 0);
        age = Math.max(0, Math.round((nowTime - start.getTime()) / (1000 * 60 * 60 * 24)));
      }
      return { index, age };
    });
    
    if (sortBy === "age-desc") {
      mapped.sort((a, b) => b.age - a.age);
    } else {
      mapped.sort((a, b) => a.age - b.age);
    }
    
    list = mapped.map(el => list[el.index]);
  }

  return list;
}

// Recalculates metrics panel widgets
function calculateMetrics(filteredSalesList, filteredInventoryList) {
  // Revenue and net profit
  let totalRevenue = 0;
  let totalCostOfSales = 0;
  let totalFees = 0;
  let totalNetProfit = 0;
  let totalSellDays = 0;
  let soldWithDurationCount = 0;

  // Index state.inventory by ID for O(1) lookups
  const inventoryMap = new Map();
  state.inventory.forEach(item => {
    inventoryMap.set(item.id, item);
  });

  let activeSalesCount = 0;
  filteredSalesList.forEach(sale => {
    if (sale.disputed === true) {
      totalCostOfSales += sale.cost;
      totalNetProfit -= sale.cost;
      return;
    }
    
    activeSalesCount++;
    totalRevenue += sale.sellPrice;
    totalCostOfSales += sale.cost;
    totalFees += sale.fees;
    totalNetProfit += sale.profit;

    // Retrieve corresponding inventory purchaseDate
    const invItem = inventoryMap.get(sale.inventoryId);
    if (invItem && invItem.purchaseDate && sale.saleDate) {
      const start = new Date(invItem.purchaseDate);
      const end = new Date(sale.saleDate);
      start.setHours(0, 0, 0, 0);
      end.setHours(0, 0, 0, 0);
      const diffTime = Math.max(0, end - start);
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
      totalSellDays += diffDays;
      soldWithDurationCount++;
    }
  });

  // Inventory value (cost of unsold stock)
  let totalUnsoldCost = 0;
  let totalUnsoldCount = 0;
  filteredInventoryList.forEach(item => {
    if (item.status !== "Sold") {
      totalUnsoldCost += item.cost;
      totalUnsoldCount++;
    }
  });

  // Calculate percentages and metrics
  const marginPercentage = totalRevenue > 0 ? (totalNetProfit / totalRevenue) * 100 : 0;
  const roiPercentage = totalCostOfSales > 0 ? (totalNetProfit / totalCostOfSales) * 100 : 0;
  const avgDaysToSell = soldWithDurationCount > 0 ? (totalSellDays / soldWithDurationCount) : 0;
  const totalKeysInSubset = filteredSalesList.length + totalUnsoldCount;
  const sellThroughRate = totalKeysInSubset > 0 ? (activeSalesCount / totalKeysInSubset) * 100 : 0;
  const avgProfitPerKey = activeSalesCount > 0 ? (totalNetProfit / activeSalesCount) : 0;

  // Render values to DOM
  const metricProfitEl = document.getElementById("metric-profit");
  if (metricProfitEl) {
    metricProfitEl.textContent = formatCurrency(totalNetProfit);
  }
  
  const metricProfitChangeEl = document.getElementById("metric-profit-change");
  if (metricProfitChangeEl) {
    metricProfitChangeEl.innerHTML = `
      <i class="fa-solid ${marginPercentage >= 0 ? 'fa-arrow-trend-up' : 'fa-arrow-trend-down'}"></i> 
      ${marginPercentage.toFixed(1)}% margin
    `;
    metricProfitChangeEl.className = `metric-subtext ${marginPercentage >= 0 ? 'positive' : 'negative'}`;
  }

  const metricInvCostEl = document.getElementById("metric-inventory-cost");
  if (metricInvCostEl) {
    metricInvCostEl.textContent = formatCurrency(totalUnsoldCost);
  }
  const metricUnsoldKeysEl = document.getElementById("metric-unsold-keys");
  if (metricUnsoldKeysEl) {
    metricUnsoldKeysEl.textContent = `${totalUnsoldCount} keys in stock`;
  }

  const metricRevenueEl = document.getElementById("metric-revenue");
  if (metricRevenueEl) {
    metricRevenueEl.textContent = formatCurrency(totalRevenue);
  }
  const metricSoldKeysEl = document.getElementById("metric-sold-keys");
  if (metricSoldKeysEl) {
    metricSoldKeysEl.textContent = `${filteredSalesList.length} keys sold`;
  }

  const metricRoiEl = document.getElementById("metric-roi");
  if (metricRoiEl) {
    metricRoiEl.textContent = `${roiPercentage.toFixed(1)}%`;
  }
  const roiSubtextEl = document.getElementById("metric-roi-subtext");
  if (roiSubtextEl) {
    roiSubtextEl.textContent = `Cost of sales: ${formatCurrency(totalCostOfSales)}`;
  }

  const metricStockCountEl = document.getElementById("metric-stock-keys-count");
  if (metricStockCountEl) {
    metricStockCountEl.textContent = `${totalUnsoldCount} keys`;
  }

  // Render new metrics
  const metricVelocityEl = document.getElementById("metric-sales-velocity");
  if (metricVelocityEl) {
    metricVelocityEl.textContent = `${avgDaysToSell.toFixed(1)} days`;
  }
  const metricVelocitySubEl = document.getElementById("metric-velocity-subtext");
  if (metricVelocitySubEl) {
    metricVelocitySubEl.textContent = `${soldWithDurationCount} sales tracked`;
  }

  const metricStrEl = document.getElementById("metric-sell-through");
  if (metricStrEl) {
    metricStrEl.textContent = `${sellThroughRate.toFixed(1)}%`;
  }
  const metricStrSubEl = document.getElementById("metric-str-subtext");
  if (metricStrSubEl) {
    metricStrSubEl.textContent = `${filteredSalesList.length} sold / ${totalKeysInSubset} total`;
  }

  const metricAvgProfitKeyEl = document.getElementById("metric-avg-profit-key");
  if (metricAvgProfitKeyEl) {
    metricAvgProfitKeyEl.textContent = formatCurrency(avgProfitPerKey);
  }
  const metricAvgProfitSubEl = document.getElementById("metric-avg-profit-subtext");
  if (metricAvgProfitSubEl) {
    metricAvgProfitSubEl.textContent = `Based on ${filteredSalesList.length} sales`;
  }
}

// Renders the dashboard active period summary card (Option A)
function renderPeriodSummary(dbFilteredSales, dbFilteredInventory) {
  // 1. Calculate metrics from the pre-filtered sales list
  const soldCount = dbFilteredSales.length;
  let totalRevenue = 0;
  let totalCost = 0;
  let totalProfit = 0;

  dbFilteredSales.forEach(sale => {
    totalRevenue += sale.sellPrice || 0;
    totalCost += sale.cost || 0;
    totalProfit += sale.profit || 0;
  });

  const marginVal = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

  // 2. Update the Title based on the active period
  const titleEl = document.getElementById("period-summary-title");
  if (titleEl) {
    const periodLabels = {
      "today": "Today",
      "week": "This Week",
      "month": "This Month",
      "all": "All Time"
    };
    const activePeriod = state.activePeriod || "all";
    let activeLabel = periodLabels[activePeriod];
    if (activePeriod === "custom") {
      if (state.customStartDate && state.customEndDate) {
        activeLabel = `${state.customStartDate} to ${state.customEndDate}`;
      } else if (state.customStartDate) {
        activeLabel = `Since ${state.customStartDate}`;
      } else if (state.customEndDate) {
        activeLabel = `Until ${state.customEndDate}`;
      } else {
        activeLabel = "Custom Range";
      }
    }
    activeLabel = activeLabel || "All Time";
    titleEl.textContent = `Performance Summary: ${activeLabel}`;
  }

  // 3. Render metrics to DOM
  const soldEl = document.getElementById("summary-metric-sold");
  const availableEl = document.getElementById("summary-metric-available");
  const revEl = document.getElementById("summary-metric-revenue");
  const spendEl = document.getElementById("summary-metric-spending");
  const profitEl = document.getElementById("summary-metric-profit");
  const marginEl = document.getElementById("summary-metric-margin");

  if (soldEl) soldEl.textContent = soldCount;
  
  if (availableEl) {
    const availableKeys = dbFilteredInventory ? dbFilteredInventory.filter(item => item.status === "Available") : [];
    availableEl.textContent = availableKeys.length;
    
    const reservedEl = document.getElementById("summary-metric-reserved");
    if (reservedEl) {
      const reservedKeys = dbFilteredInventory ? dbFilteredInventory.filter(item => item.status === "Reserved") : [];
      reservedEl.textContent = reservedKeys.length;
    }
    
    const stockCostEl = document.getElementById("summary-metric-stock-cost");
    if (stockCostEl) {
      const unsoldKeys = dbFilteredInventory ? dbFilteredInventory.filter(item => item.status !== "Sold") : [];
      const inventoryCost = unsoldKeys.reduce((sum, item) => sum + (item.cost || 0), 0);
      stockCostEl.textContent = formatCurrency(inventoryCost);
    }
  }
  
  if (revEl) revEl.textContent = formatCurrency(totalRevenue);
  if (spendEl) spendEl.textContent = formatCurrency(totalCost);
  
  if (profitEl) {
    const prefixSign = totalProfit >= 0 ? "+" : "";
    profitEl.textContent = `${prefixSign}${formatCurrency(totalProfit)}`;
    profitEl.className = totalProfit >= 0 ? 'text-success-neon' : 'text-danger-soft';
  }

  if (marginEl) {
    marginEl.textContent = `${marginVal.toFixed(1)}%`;
    marginEl.className = marginVal >= 0 ? 'text-success-neon' : 'text-danger-soft';
  }

  // 4. Calculate & Render Advanced Metrics (Efficiency & Potential Card)
  const roiEl = document.getElementById("summary-metric-roi");
  const avgProfitEl = document.getElementById("summary-metric-avg-profit");
  const potentialProfitEl = document.getElementById("summary-metric-potential-profit");
  const velocityEl = document.getElementById("summary-metric-velocity");

  const roiVal = totalCost > 0 ? (totalProfit / totalCost) * 100 : 0;
  const avgProfitVal = soldCount > 0 ? (totalProfit / soldCount) : 0;

  // Potential Profit calculation using current subset avg profit per key, or global average if subset is 0
  const availableKeysList = dbFilteredInventory ? dbFilteredInventory.filter(item => item.status === "Available") : [];
  const globalAvgProfit = state.sales.length > 0 ? (state.sales.reduce((sum, s) => sum + (s.profit || 0), 0) / state.sales.length) : 0;
  const currentAvgProfit = soldCount > 0 ? avgProfitVal : globalAvgProfit;
  const profitPotentialVal = availableKeysList.length * currentAvgProfit;

  // Days to Sell calculation for the sold keys in this period
  let totalSellDays = 0;
  let soldWithDurationCount = 0;
  dbFilteredSales.forEach(sale => {
    const invItem = state.inventory.find(i => i.id === sale.inventoryId);
    if (invItem && invItem.purchaseDate && sale.saleDate) {
      const start = new Date(invItem.purchaseDate);
      const end = new Date(sale.saleDate);
      start.setHours(0, 0, 0, 0);
      end.setHours(0, 0, 0, 0);
      const diffDays = Math.round(Math.max(0, end - start) / (1000 * 60 * 60 * 24));
      totalSellDays += diffDays;
      soldWithDurationCount++;
    }
  });
  const avgDaysToSell = soldWithDurationCount > 0 ? (totalSellDays / soldWithDurationCount) : 0;

  if (roiEl) {
    roiEl.textContent = `${roiVal.toFixed(1)}%`;
    roiEl.className = roiVal >= 0 ? 'text-success-neon' : 'text-danger-soft';
  }
  if (avgProfitEl) {
    avgProfitEl.textContent = formatCurrency(avgProfitVal);
    avgProfitEl.className = avgProfitVal >= 0 ? 'text-success-neon' : 'text-danger-soft';
  }
  if (potentialProfitEl) {
    potentialProfitEl.textContent = formatCurrency(profitPotentialVal);
  }
  if (velocityEl) {
    velocityEl.textContent = `${avgDaysToSell.toFixed(1)} days`;
  }
}

// Recalculates metrics specifically for the Suppliers view
function calculateSupplierMetrics() {
  const supSupplierSelect = document.getElementById("sup-filter-supplier");
  const selectedSupplier = supSupplierSelect ? supSupplierSelect.value : "all";
  
  const now = new Date();
  
  // Pre-index state.inventory by ID for O(1) lookups
  const inventoryMap = new Map();
  state.inventory.forEach(item => {
    inventoryMap.set(item.id, item);
  });
  
  // 1. Filter Sales by Date Period and Supplier
  let filteredSales = [...state.sales];
  
  // A. Date Filter
  const activePeriod = state.supActivePeriod || "all";
  if (activePeriod === "month") {
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    filteredSales = filteredSales.filter(item => new Date(item.saleDate) >= startOfMonth);
  } else if (activePeriod === "week") {
    const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay())); // Sunday
    filteredSales = filteredSales.filter(item => new Date(item.saleDate) >= startOfWeek);
  } else if (activePeriod === "today") {
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const todayStr = `${year}-${month}-${day}`;
    filteredSales = filteredSales.filter(item => item.saleDate === todayStr);
  }
  
  // B. Supplier Filter
  if (selectedSupplier !== "all") {
    filteredSales = filteredSales.filter(sale => {
      const game = inventoryMap.get(sale.inventoryId);
      return game && game.source === selectedSupplier;
    });
  }
  
  // 2. Filter Inventory by Supplier
  let filteredInventory = [...state.inventory];
  if (selectedSupplier !== "all") {
    filteredInventory = filteredInventory.filter(item => item.source === selectedSupplier);
  }
  
  // 3. Compute Metrics
  let totalRevenue = 0;
  let totalCostOfSales = 0;
  let totalFees = 0;
  let totalNetProfit = 0;
  let totalSellDays = 0;
  let soldWithDurationCount = 0;

  filteredSales.forEach(sale => {
    totalRevenue += sale.sellPrice;
    totalCostOfSales += sale.cost;
    totalFees += sale.fees;
    totalNetProfit += sale.profit;

    // Retrieve corresponding inventory purchaseDate
    const invItem = inventoryMap.get(sale.inventoryId);
    if (invItem && invItem.purchaseDate && sale.saleDate) {
      const start = new Date(invItem.purchaseDate);
      const end = new Date(sale.saleDate);
      start.setHours(0, 0, 0, 0);
      end.setHours(0, 0, 0, 0);
      const diffTime = Math.max(0, end - start);
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
      totalSellDays += diffDays;
      soldWithDurationCount++;
    }
  });

  // Inventory value (cost of unsold stock)
  let totalUnsoldCost = 0;
  let totalUnsoldCount = 0;
  filteredInventory.forEach(item => {
    if (item.status !== "Sold") {
      totalUnsoldCost += item.cost;
      totalUnsoldCount++;
    }
  });

  // Calculate percentages and metrics
  const marginPercentage = totalRevenue > 0 ? (totalNetProfit / totalRevenue) * 100 : 0;
  const roiPercentage = totalCostOfSales > 0 ? (totalNetProfit / totalCostOfSales) * 100 : 0;
  const avgDaysToSell = soldWithDurationCount > 0 ? (totalSellDays / soldWithDurationCount) : 0;
  const totalKeysInSubset = filteredSales.length + totalUnsoldCount;
  const sellThroughRate = totalKeysInSubset > 0 ? (filteredSales.length / totalKeysInSubset) * 100 : 0;
  const avgProfitPerKey = filteredSales.length > 0 ? (totalNetProfit / filteredSales.length) : 0;

  // Render to DOM
  const profitEl = document.getElementById("sup-metric-profit");
  if (profitEl) profitEl.textContent = formatCurrency(totalNetProfit);
  
  const profitChangeEl = document.getElementById("sup-metric-profit-change");
  if (profitChangeEl) {
    profitChangeEl.innerHTML = `
      <i class="fa-solid ${marginPercentage >= 0 ? 'fa-arrow-trend-up' : 'fa-arrow-trend-down'}"></i> 
      ${marginPercentage.toFixed(1)}% margin
    `;
    profitChangeEl.className = `metric-subtext ${marginPercentage >= 0 ? 'positive' : 'negative'}`;
  }

  const costEl = document.getElementById("sup-metric-cost");
  if (costEl) costEl.textContent = formatCurrency(totalUnsoldCost);
  
  const unsoldKeysEl = document.getElementById("sup-metric-unsold-keys");
  if (unsoldKeysEl) unsoldKeysEl.textContent = `${totalUnsoldCount} keys in stock`;

  const revenueEl = document.getElementById("sup-metric-revenue");
  if (revenueEl) revenueEl.textContent = formatCurrency(totalRevenue);
  
  const soldKeysEl = document.getElementById("sup-metric-sold-keys");
  if (soldKeysEl) soldKeysEl.textContent = `${filteredSales.length} keys sold`;

  const roiEl = document.getElementById("sup-metric-roi");
  if (roiEl) roiEl.textContent = `${roiPercentage.toFixed(1)}%`;
  
  const roiSubtextEl = document.getElementById("sup-metric-roi-subtext");
  if (roiSubtextEl) roiSubtextEl.textContent = `Cost of sales: ${formatCurrency(totalCostOfSales)}`;

  const stockKeysCountEl = document.getElementById("sup-metric-stock-keys-count");
  if (stockKeysCountEl) stockKeysCountEl.textContent = `${totalUnsoldCount} keys`;

  const salesVelocityEl = document.getElementById("sup-metric-sales-velocity");
  if (salesVelocityEl) salesVelocityEl.textContent = `${avgDaysToSell.toFixed(1)} days`;
  
  const velocitySubtextEl = document.getElementById("sup-metric-velocity-subtext");
  if (velocitySubtextEl) velocitySubtextEl.textContent = `${soldWithDurationCount} sales tracked`;

  const sellThroughEl = document.getElementById("sup-metric-sell-through");
  if (sellThroughEl) sellThroughEl.textContent = `${sellThroughRate.toFixed(1)}%`;
  
  const strSubtextEl = document.getElementById("sup-metric-str-subtext");
  if (strSubtextEl) strSubtextEl.textContent = `${filteredSales.length} sold / ${totalKeysInSubset} total`;

  const avgProfitKeyEl = document.getElementById("sup-metric-avg-profit-key");
  if (avgProfitKeyEl) avgProfitKeyEl.textContent = formatCurrency(avgProfitPerKey);
  
  const avgProfitSubtextEl = document.getElementById("sup-metric-avg-profit-subtext");
  if (avgProfitSubtextEl) avgProfitSubtextEl.textContent = `Based on ${filteredSales.length} sales`;
}

// Render Table: Inventory Stock List Router
function renderInventoryTable(itemsList) {
  try {
    state._activeRenderedItems = itemsList;
    console.log("renderInventoryTable called with items count:", itemsList.length, "layout mode:", state.inventoryLayout);
    // Update inventory layout containers visibility
    const tableContainer = document.getElementById("inventory-table-container");
    const gridContainer = document.getElementById("inventory-grid-container");
    const galleryContainer = document.getElementById("inventory-gallery-container");
    
    // Clean up containers
    if (tableContainer) tableContainer.style.display = "none";
    if (gridContainer) gridContainer.style.display = "none";
    if (galleryContainer) galleryContainer.style.display = "none";
    
    // Set active buttons in toggle group (just in case they are out of sync)
    const btnList = document.getElementById("btn-layout-list");
    const btnGrid = document.getElementById("btn-layout-grid");
    const btnGallery = document.getElementById("btn-layout-gallery");
    if (btnList && btnGrid && btnGallery) {
      btnList.classList.toggle("active", state.inventoryLayout === "list");
      btnGrid.classList.toggle("active", state.inventoryLayout === "grid");
      btnGallery.classList.toggle("active", state.inventoryLayout === "gallery");
    }

    // Pagination Logic
    const totalPages = Math.ceil(itemsList.length / state.inventoryPageSize) || 1;
    if (state.inventoryCurrentPage > totalPages) {
      state.inventoryCurrentPage = totalPages;
    }
    if (state.inventoryCurrentPage < 1) {
      state.inventoryCurrentPage = 1;
    }

    const startIndex = (state.inventoryCurrentPage - 1) * state.inventoryPageSize;
    const endIndex = startIndex + state.inventoryPageSize;
    const paginatedItemsList = itemsList.slice(startIndex, endIndex);

    console.log("Rendering layout:", state.inventoryLayout, "with", paginatedItemsList.length, "paginated items");

    if (state.inventoryLayout === "list") {
      if (tableContainer) tableContainer.style.display = "block";
      renderInventoryListLayout(paginatedItemsList);
    } else if (state.inventoryLayout === "grid") {
      if (gridContainer) gridContainer.style.display = "grid";
      renderInventoryGridLayout(paginatedItemsList);
    } else if (state.inventoryLayout === "gallery") {
      if (galleryContainer) galleryContainer.style.display = "grid";
      renderInventoryGalleryLayout(paginatedItemsList);
    }
    
    // Update footer text count
    const showingStart = itemsList.length === 0 ? 0 : startIndex + 1;
    const showingEnd = Math.min(endIndex, itemsList.length);
    document.getElementById("inventory-count-text").textContent = `Showing ${showingStart}-${showingEnd} of ${itemsList.length} total inventory keys`;

    // Render pagination controls
    renderInventoryPagination(itemsList.length);
    console.log("renderInventoryTable rendering finished successfully.");
  } catch (err) {
    console.error("Error inside renderInventoryTable:", err);
  }
}

// Render dynamic pagination controls for the inventory
function renderInventoryPagination(totalItems) {
  const container = document.getElementById("inventory-pagination");
  if (!container) return;
  container.innerHTML = "";

  const totalPages = Math.ceil(totalItems / state.inventoryPageSize) || 1;
  if (totalPages <= 1) {
    container.style.display = "none";
    return;
  }
  container.style.display = "flex";

  // Helper to create page buttons
  const createBtn = (label, targetPage, disabled = false, isActive = false) => {
    const btn = document.createElement("button");
    btn.className = "pagination-btn";
    if (isActive) btn.classList.add("active");
    btn.disabled = disabled;
    btn.innerHTML = label;
    if (!disabled && !isActive) {
      btn.addEventListener("click", () => {
        state.inventoryCurrentPage = targetPage;
        renderInventoryTable(getFilteredInventory());
        const invView = document.getElementById("inventory-view");
        if (invView) {
          invView.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      });
    }
    return btn;
  };

  // Prev Button
  container.appendChild(createBtn('<i class="fa-solid fa-angle-left"></i>', state.inventoryCurrentPage - 1, state.inventoryCurrentPage === 1));

  // Page Numbers with sliding window
  const maxButtons = 5;
  let startPage = Math.max(1, state.inventoryCurrentPage - Math.floor(maxButtons / 2));
  let endPage = startPage + maxButtons - 1;

  if (endPage > totalPages) {
    endPage = totalPages;
    startPage = Math.max(1, endPage - maxButtons + 1);
  }

  if (startPage > 1) {
    container.appendChild(createBtn("1", 1));
    if (startPage > 2) {
      const dots = document.createElement("span");
      dots.className = "pagination-dots";
      dots.textContent = "...";
      container.appendChild(dots);
    }
  }

  for (let i = startPage; i <= endPage; i++) {
    container.appendChild(createBtn(i.toString(), i, false, i === state.inventoryCurrentPage));
  }

  if (endPage < totalPages) {
    if (endPage < totalPages - 1) {
      const dots = document.createElement("span");
      dots.className = "pagination-dots";
      dots.textContent = "...";
      container.appendChild(dots);
    }
    container.appendChild(createBtn(totalPages.toString(), totalPages));
  }

  // Next Button
  container.appendChild(createBtn('<i class="fa-solid fa-angle-right"></i>', state.inventoryCurrentPage + 1, state.inventoryCurrentPage === totalPages));
}

// Helper to format date to dd/mm/year (DD/MM/YYYY) without timezone shifts
function formatToDDMMYYYY(dateVal) {
  if (!dateVal) return "-";
  // If it's a number (timestamp), convert to Date first
  if (typeof dateVal === 'number' || !isNaN(dateVal)) {
    const d = new Date(Number(dateVal));
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  }
  // If it's a string in YYYY-MM-DD format (possibly with time)
  const match = String(dateVal).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    return `${match[3]}/${match[2]}/${match[1]}`;
  }
  // Fallback to Date object parsing
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return "-";
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

// Render layout format A: List (Table)
function buildInventoryRowHTML(item, salesMap) {
  // Mask key structure safely
  const keyStr = String(item.key || "");
  const maskedKey = keyStr.length >= 8 
    ? `${keyStr.slice(0, 4)}-****-****-${keyStr.slice(-4)}`
    : keyStr || "—";

  // Status classes
  let statusClass = "badge-available";
  if (item.status === "Reserved") statusClass = "badge-reserved";
  if (item.status === "Sold") statusClass = "badge-sold";
  if (item.status === "Rejected") statusClass = "badge-rejected";
  if (item.status === "Disputed") statusClass = "badge-disputed";

  // Action buttons based on stock status
  let actionButtons = "";
  if (item.status === "Available") {
    actionButtons = `
      <button class="btn-action btn-action-sell" onclick="triggerSellGame('${item.id}')" title="Mark as Sold"><i class="fa-solid fa-euro-sign"></i></button>
    `;
  }
  actionButtons += `
    <button class="btn-action btn-action-edit" onclick="triggerEditGame('${item.id}')" title="Edit Game"><i class="fa-solid fa-pen"></i></button>
    <button class="btn-action btn-action-view" onclick="triggerViewKey('${item.id}')" title="Secure View"><i class="fa-solid fa-eye"></i></button>
    <button class="btn-action btn-action-delete" onclick="triggerDeleteGame('${item.id}')" title="Delete"><i class="fa-solid fa-trash"></i></button>
  `;

  const titleStr = String(item.title || "Untitled Game");
  const initials = titleStr.split(" ").map(w => w ? w[0] : "").join("").slice(0, 3) || "???";
  const titleCell = item.imageUrl 
    ? `<div class="game-title-cell"><img src="${escapeHTML(item.imageUrl)}" class="game-thumbnail" alt="${escapeHTML(titleStr)}"><strong>${escapeHTML(titleStr)}</strong></div>`
    : `<div class="game-title-cell"><div class="game-thumbnail-placeholder">${escapeHTML(initials)}</div><strong>${escapeHTML(titleStr)}</strong></div>`;

  // Retrieve closing date if sold
  const saleItem = salesMap.get(item.id);
  const dateClosedCell = saleItem ? formatToDDMMYYYY(saleItem.saleDate) : `<span style="color: var(--text-muted); font-size: 0.8rem;">-</span>`;

  // Calculate duration in days
  let durationCell = "";
  if (item.purchaseDate) {
    const start = new Date(item.purchaseDate);
    const end = saleItem ? new Date(saleItem.saleDate) : new Date();
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    const diffTime = Math.max(0, end - start);
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    
    if (saleItem) {
      durationCell = `<span class="duration-days text-success-neon" style="font-weight: 600;">${diffDays} day${diffDays === 1 ? '' : 's'}</span>`;
    } else {
      const agingCat = getAgingCategory(item.purchaseDate);
      durationCell = `
        <div style="display: flex; flex-direction: column; gap: 4px;">
          <span style="color: var(--text-secondary); font-size: 0.85rem; font-weight: 500;">${diffDays} day${diffDays === 1 ? '' : 's'}</span>
          <span class="badge ${agingCat.class}" style="font-size: 0.65rem; padding: 2px 6px; width: fit-content; text-transform: uppercase; line-height: 1;">${agingCat.name}</span>
        </div>
      `;
    }
  } else {
    durationCell = `<span style="color: var(--text-muted); font-size: 0.8rem;">-</span>`;
  }

  const sourceStr = String(item.source || "Direct");
  const supplierObj = state.suppliers.find(s => s.name === sourceStr);
  const colorName = supplierObj ? (supplierObj.color || getSupplierColorName(sourceStr)) : getSupplierColorName(sourceStr);
  const colorPreset = SUPPLIER_COLORS.find(c => c.name === colorName) || SUPPLIER_COLORS[0];
  
  let supplierBadge = "";
  if (state.supplierDisplayMode === "logo") {
    if (supplierObj && supplierObj.logo) {
      supplierBadge = `<img src="${escapeHTML(supplierObj.logo)}" class="supplier-logo-thumbnail" style="width: 28px; height: 28px; vertical-align: middle; border-radius: 4px; object-fit: contain; background-color: var(--bg-card); border: 1px solid var(--border-color); padding: 1px;" title="${escapeHTML(sourceStr)}" alt="${escapeHTML(sourceStr)}">`;
    } else {
      supplierBadge = `
        <div class="supplier-logo-placeholder" style="width: 28px; height: 28px; border-radius: 4px; background-color: ${colorPreset.value}20; color: ${colorPreset.value}; border: 1px solid ${colorPreset.value}40; display: inline-flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: bold; vertical-align: middle;" title="${escapeHTML(sourceStr)}">
          ${escapeHTML(sourceStr.charAt(0).toUpperCase())}
        </div>
      `;
    }
  } else {
    supplierBadge = `
      <span class="supplier-tag" style="background-color: ${colorPreset.value}12; border-color: ${colorPreset.value}25; color: ${colorPreset.value}; padding: 3px 8px; border-radius: 4px; font-size: 0.75rem; display: inline-flex; align-items: center; gap: 4px; vertical-align: middle;">
        <span class="supplier-dot" style="background-color: ${colorPreset.value}; width: 6px; height: 6px;"></span>
        ${escapeHTML(sourceStr)}
      </span>
    `;
  }
  let profitCell = `<span style="color: var(--text-muted); font-size: 0.8rem;">-</span>`;
  if (saleItem) {
    const margin = saleItem.sellPrice > 0 ? (saleItem.profit / saleItem.sellPrice) * 100 : 0;
    const profitClass = saleItem.profit >= 0 ? "text-success-neon" : "text-danger-soft";
    const profitSign = saleItem.profit >= 0 ? "+" : "";
    profitCell = `<span class="${profitClass}">${profitSign}${formatCurrency(saleItem.profit)} <span style="font-size: 0.75rem; opacity: 0.75; font-weight: normal; margin-left: 4px;">(${margin.toFixed(1)}%)</span></span>`;
  }

  const isChecked = state.selectedInventoryIds && state.selectedInventoryIds.includes(item.id) ? "checked" : "";

  return `
    <tr>
      <td style="text-align: center; vertical-align: middle;">
        <input type="checkbox" class="inv-row-select" data-id="${item.id}" ${isChecked} style="cursor: pointer;">
      </td>
      <td>${titleCell}</td>
      <td><div class="secured-key"><code>${maskedKey}</code></div></td>
      <td>${formatCurrency(item.cost)}</td>
      <td>${saleItem ? formatCurrency(saleItem.sellPrice) : `<span style="color: var(--text-muted); font-size: 0.8rem;">-</span>`}</td>
      <td>${profitCell}</td>
      <td style="text-align: center;">${supplierBadge}</td>
      <td>${formatToDDMMYYYY(item.purchaseDate)}</td>
      <td>${dateClosedCell}</td>
      <td>${durationCell}</td>
      <td><span class="badge ${statusClass}">${item.status || "Available"}</span></td>
      <td><div class="table-actions">${actionButtons}</div></td>
    </tr>
  `;
}

function renderInventoryListLayout(itemsList) {
  try {
    const tbody = document.getElementById("inventory-table-body");
    if (!tbody) return;
    tbody.innerHTML = "";

    if (itemsList.length === 0) {
      tbody.innerHTML = `<tr><td colspan="12" class="text-center" style="text-align: center; padding: 30px; color: var(--text-muted);">No matching inventory keys in stock.</td></tr>`;
      return;
    }

    const tableContainer = document.getElementById("inventory-table-container");
    const isVirtual = state.inventoryPageSize >= 100000;

    const salesMap = new Map();
    state.sales.forEach(sale => {
      if (sale && sale.inventoryId) {
        salesMap.set(sale.inventoryId, sale);
      }
    });

    if (tableContainer && tableContainer._scrollListener) {
      tableContainer.removeEventListener("scroll", tableContainer._scrollListener);
      tableContainer._scrollListener = null;
    }

    if (isVirtual && tableContainer) {
      const rowHeight = 55;
      const containerHeight = tableContainer.clientHeight || 500;

      const renderSlice = () => {
        const scrollTop = tableContainer.scrollTop;
        const totalItems = itemsList.length;

        let startIndex = Math.floor(scrollTop / rowHeight);
        let endIndex = Math.ceil((scrollTop + containerHeight) / rowHeight);

        startIndex = Math.max(0, startIndex - 5);
        endIndex = Math.min(totalItems, endIndex + 5);

        const topSpacerHeight = startIndex * rowHeight;
        const bottomSpacerHeight = (totalItems - endIndex) * rowHeight;

        let tbodyContent = "";

        if (topSpacerHeight > 0) {
          tbodyContent += `<tr style="height: ${topSpacerHeight}px;"><td colspan="12" style="padding: 0; border: none; height: ${topSpacerHeight}px;"></td></tr>`;
        }

        const slicedItems = itemsList.slice(startIndex, endIndex);
        slicedItems.forEach(item => {
          if (!item) return;
          tbodyContent += buildInventoryRowHTML(item, salesMap);
        });

        if (bottomSpacerHeight > 0) {
          tbodyContent += `<tr style="height: ${bottomSpacerHeight}px;"><td colspan="12" style="padding: 0; border: none; height: ${bottomSpacerHeight}px;"></td></tr>`;
        }

        tbody.innerHTML = tbodyContent;

        // Sync header select all checkbox
        const selectAllCheckbox = document.getElementById("inv-select-all");
        if (selectAllCheckbox) {
          selectAllCheckbox.checked = itemsList.length > 0 && itemsList.every(item => state.selectedInventoryIds.includes(item.id));
        }
      };

      const onScroll = () => {
        requestAnimationFrame(renderSlice);
      };

      tableContainer.addEventListener("scroll", onScroll);
      tableContainer._scrollListener = onScroll;

      tableContainer.style.maxHeight = "65vh";
      tableContainer.style.overflowY = "auto";
      tableContainer.style.position = "relative";

      renderSlice();
    } else {
      let tbodyContent = "";
      itemsList.forEach(item => {
        if (!item) return;
        tbodyContent += buildInventoryRowHTML(item, salesMap);
      });
      tbody.innerHTML = tbodyContent;

      if (tableContainer) {
        tableContainer.style.maxHeight = "";
        tableContainer.style.overflowY = "";
      }
    }
  } catch (err) {
    console.error("Error in renderInventoryListLayout:", err);
  }
}

// Render layout format B: Grid (Cards)
function renderInventoryGridLayout(itemsList) {
  try {
    const container = document.getElementById("inventory-grid-container");
    if (!container) return;
    container.innerHTML = "";

    if (itemsList.length === 0) {
      container.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-muted);">No matching inventory keys in stock.</div>`;
      return;
    }

    const salesMap = new Map();
    state.sales.forEach(sale => {
      if (sale && sale.inventoryId) {
        salesMap.set(sale.inventoryId, sale);
      }
    });

    itemsList.forEach(item => {
      if (!item) return;
      const card = document.createElement("div");
      card.className = "grid-card";

      const sourceStr = String(item.source || "Direct");
      const supplierObj = state.suppliers.find(s => s.name === sourceStr);
      const colorName = supplierObj ? (supplierObj.color || getSupplierColorName(sourceStr)) : getSupplierColorName(sourceStr);
      const colorPreset = SUPPLIER_COLORS.find(c => c.name === colorName) || SUPPLIER_COLORS[0];
      
      const supplierBadge = `
        <strong style="color: ${colorPreset.value}; display: inline-flex; align-items: center; gap: 5px;">
          <span class="supplier-dot" style="background-color: ${colorPreset.value}; width: 6px; height: 6px;"></span>
          ${escapeHTML(sourceStr)}
        </strong>
      `;

      const titleStr = String(item.title || "Untitled Game");
      const initials = titleStr.split(" ").map(w => w ? w[0] : "").join("").slice(0, 3) || "???";
      const bannerHtml = item.imageUrl
        ? `<img src="${escapeHTML(item.imageUrl)}" class="grid-card-img" alt="${escapeHTML(titleStr)}" loading="lazy" onload="this.classList.add('loaded'); this.parentElement.classList.remove('loading');" onerror="this.parentElement.classList.remove('loading');">`
        : `<div class="grid-card-placeholder">${escapeHTML(initials)}</div>`;
      const bannerClass = item.imageUrl ? "grid-card-banner loading" : "grid-card-banner";

      // Platform icon classes
      const platformStr = String(item.platform || "PC");
      let platformIcon = "fa-solid fa-gamepad";
      if (platformStr.includes("Steam")) platformIcon = "fa-brands fa-steam";
      if (platformStr.includes("PlayStation")) platformIcon = "fa-brands fa-playstation";
      if (platformStr.includes("Xbox")) platformIcon = "fa-brands fa-xbox";

      // Status classes
      let statusClass = "badge-available";
      if (item.status === "Reserved") statusClass = "badge-reserved";
      if (item.status === "Sold") statusClass = "badge-sold";
      if (item.status === "Rejected") statusClass = "badge-rejected";
      if (item.status === "Disputed") statusClass = "badge-disputed";

      // Mask key structure safely
      const keyStr = String(item.key || "");
      const maskedKey = keyStr.length >= 8 
        ? `${keyStr.slice(0, 4)}-****-****-${keyStr.slice(-4)}`
        : keyStr || "—";

      // Action buttons based on status
      let actionButton = "";
      if (item.status === "Available") {
        actionButton = `
          <button class="btn-action btn-action-sell" onclick="triggerSellGame('${item.id}')" title="Mark as Sold"><i class="fa-solid fa-euro-sign"></i></button>
        `;
      }

      const saleItem = salesMap.get(item.id);
      const dateClosedRow = saleItem 
        ? `<span>Closed: ${formatToDDMMYYYY(saleItem.saleDate)}</span>` 
        : "";

      let durationRow = "";
      if (item.purchaseDate) {
        const start = new Date(item.purchaseDate);
        const end = saleItem ? new Date(saleItem.saleDate) : new Date();
        start.setHours(0, 0, 0, 0);
        end.setHours(0, 0, 0, 0);
        const diffTime = Math.max(0, end - start);
        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
        if (saleItem) {
          durationRow = `<span style="color: var(--accent-cyan); font-weight: 500;">Duration: ${diffDays} day${diffDays === 1 ? '' : 's'}</span>`;
        } else {
          const agingCat = getAgingCategory(item.purchaseDate);
          durationRow = `
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="color: var(--text-secondary);">Active: ${diffDays} day${diffDays === 1 ? '' : 's'}</span>
              <span class="badge ${agingCat.class}" style="font-size: 0.62rem; padding: 1px 6px; text-transform: uppercase;">${agingCat.name}</span>
            </div>
          `;
        }
      }
      
      let metaBlockHtml = "";
      if (item.status === "Sold" && saleItem) {
        const roi = item.cost > 0 ? (saleItem.profit / item.cost) * 100 : 0;
        const margin = saleItem.sellPrice > 0 ? (saleItem.profit / saleItem.sellPrice) * 100 : 0;
        const profitClass = saleItem.profit >= 0 ? "text-success-neon" : "text-danger-soft";
        const profitSign = saleItem.profit > 0 ? "+" : "";
        const roiSign = roi > 0 ? "+" : "";
        
        metaBlockHtml = `
          <div class="grid-card-meta" style="display: flex; flex-direction: column; gap: 10px; align-items: stretch;">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; width: 100%;">
              <div class="grid-card-cost">
                <span>Cost</span>
                <strong>${formatCurrency(item.cost)}</strong>
              </div>
              <div class="grid-card-profit">
                <span>Profit/Loss</span>
                <strong class="${profitClass}">${profitSign}${formatCurrency(saleItem.profit)} <span style="font-size: 0.75rem; opacity: 0.8; font-weight: 500;">(${margin.toFixed(1)}%)</span></strong>
              </div>
              <div class="grid-card-sold">
                <span>Sold</span>
                <strong class="text-revenue-pink" style="font-size: 1.1rem;">${formatCurrency(saleItem.sellPrice)}</strong>
              </div>
              <div class="grid-card-roi">
                <span>% Diff</span>
                <strong class="${profitClass}">${roiSign}${roi.toFixed(1)}%</strong>
              </div>
            </div>
            <div style="border-top: 1px solid var(--border-color); padding-top: 8px; margin-top: 2px; display: flex; justify-content: space-between; align-items: center; width: 100%;">
              <span style="font-size: 0.65rem; color: var(--text-muted); text-transform: uppercase; font-weight: 700; letter-spacing: 0.05em;">Supplier</span>
              ${supplierBadge}
            </div>
          </div>
        `;
      } else {
        metaBlockHtml = `
          <div class="grid-card-meta">
            <div class="grid-card-cost">
              <span>Cost</span>
              <strong>${formatCurrency(item.cost)}</strong>
            </div>
            <div class="grid-card-supplier">
              <span>Supplier</span>
              ${supplierBadge}
            </div>
          </div>
        `;
      }

      card.innerHTML = `
        <div class="${bannerClass}">
          ${bannerHtml}
          <span class="grid-card-platform"><i class="${platformIcon}"></i> ${escapeHTML(platformStr)}</span>
          <span class="badge ${statusClass} grid-card-status">${item.status || "Available"}</span>
        </div>
        <div class="grid-card-body">
          <h4 class="grid-card-title" title="${escapeHTML(titleStr)}">${escapeHTML(titleStr)}</h4>
          ${metaBlockHtml}
          <div class="grid-card-key">
            <div class="secured-key" style="justify-content: center; width: 100%;">
              <code>${maskedKey}</code>
            </div>
          </div>
          <div class="grid-card-actions">
            <div class="grid-card-dates">
              <span>Added: ${formatToDDMMYYYY(item.purchaseDate)}</span>
              ${dateClosedRow}
              ${durationRow}
            </div>
            <div class="table-actions">
              ${actionButton}
              <button class="btn-action btn-action-edit" onclick="triggerEditGame('${item.id}')" title="Edit Game"><i class="fa-solid fa-pen"></i></button>
              <button class="btn-action btn-action-view" onclick="triggerViewKey('${item.id}')" title="Secure View"><i class="fa-solid fa-eye"></i></button>
              <button class="btn-action btn-action-delete" onclick="triggerDeleteGame('${item.id}')" title="Delete"><i class="fa-solid fa-trash"></i></button>
            </div>
          </div>
        </div>
      `;
      container.appendChild(card);
    });
  } catch (err) {
    console.error("Error in renderInventoryGridLayout:", err);
  }
}

// Render layout format C: Gallery (Poster cards)
// Render layout format C: Gallery (Poster cards)
function renderInventoryGalleryLayout(itemsList) {
  try {
    const container = document.getElementById("inventory-gallery-container");
    if (!container) return;
    container.innerHTML = "";

    if (itemsList.length === 0) {
      container.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-muted);">No matching inventory keys in stock.</div>`;
      return;
    }

    const salesMap = new Map();
    state.sales.forEach(sale => {
      if (sale && sale.inventoryId) {
        salesMap.set(sale.inventoryId, sale);
      }
    });

    itemsList.forEach(item => {
      if (!item) return;
      const card = document.createElement("div");
      card.className = "gallery-card";

      const sourceStr = String(item.source || "Direct");
      const supplierObj = state.suppliers.find(s => s.name === sourceStr);
      const colorName = supplierObj ? (supplierObj.color || getSupplierColorName(sourceStr)) : getSupplierColorName(sourceStr);
      const colorPreset = SUPPLIER_COLORS.find(c => c.name === colorName) || SUPPLIER_COLORS[0];
      
      const supplierBadge = `
        <strong style="color: ${colorPreset.value}; display: inline-flex; align-items: center; gap: 5px;">
          <span class="supplier-dot" style="background-color: ${colorPreset.value}; width: 6px; height: 6px;"></span>
          ${escapeHTML(sourceStr)}
        </strong>
      `;

      const titleStr = String(item.title || "Untitled Game");
      const initials = titleStr.split(" ").map(w => w ? w[0] : "").join("").slice(0, 3) || "???";
      const imageHtml = item.imageUrl
        ? `<img src="${escapeHTML(item.imageUrl)}" class="gallery-card-img" alt="${escapeHTML(titleStr)}">`
        : `<div class="gallery-card-placeholder">${escapeHTML(initials)}</div>`;

      // Platform icon classes
      const platformStr = String(item.platform || "PC");
      let platformIcon = "fa-solid fa-gamepad";
      if (platformStr.includes("Steam")) platformIcon = "fa-brands fa-steam";
      if (platformStr.includes("PlayStation")) platformIcon = "fa-brands fa-playstation";
      if (platformStr.includes("Xbox")) platformIcon = "fa-brands fa-xbox";

      // Status classes
      let statusClass = "badge-available";
      if (item.status === "Reserved") statusClass = "badge-reserved";
      if (item.status === "Sold") statusClass = "badge-sold";
      if (item.status === "Rejected") statusClass = "badge-rejected";
      if (item.status === "Disputed") statusClass = "badge-disputed";

      // Mask key structure safely
      const keyStr = String(item.key || "");
      const maskedKey = keyStr.length >= 8 
        ? `${keyStr.slice(0, 4)}-****-****-${keyStr.slice(-4)}`
        : keyStr || "—";

      // Action buttons based on status
      let actionButton = "";
      if (item.status === "Available") {
        actionButton = `
          <button class="btn-action btn-action-sell" onclick="triggerSellGame('${item.id}')" title="Mark as Sold"><i class="fa-solid fa-euro-sign"></i></button>
        `;
      }

      const saleItem = salesMap.get(item.id);
      const dateClosedMeta = saleItem 
        ? `<div class="gallery-card-hover-meta-item"><span>Closed:</span><strong>${formatToDDMMYYYY(saleItem.saleDate)}</strong></div>`
        : "";
      const soldPriceMeta = saleItem 
        ? `<div class="gallery-card-hover-meta-item"><span>Sold:</span><strong class="text-success-neon">${formatCurrency(saleItem.sellPrice)}</strong></div>`
        : "";

      let profitMeta = "";
      if (saleItem) {
        const margin = saleItem.sellPrice > 0 ? (saleItem.profit / saleItem.sellPrice) * 100 : 0;
        const profitClass = saleItem.profit >= 0 ? "text-success-neon" : "text-danger-soft";
        const profitSign = saleItem.profit >= 0 ? "+" : "";
        profitMeta = `<div class="gallery-card-hover-meta-item"><span>Profit:</span><strong class="${profitClass}">${profitSign}${formatCurrency(saleItem.profit)} <span style="font-size: 0.75rem; opacity: 0.75; font-weight: normal; margin-left: 2px;">(${margin.toFixed(1)}%)</span></strong></div>`;
      }

      let durationMeta = "";
      if (item.purchaseDate) {
        const start = new Date(item.purchaseDate);
        const end = saleItem ? new Date(saleItem.saleDate) : new Date();
        start.setHours(0, 0, 0, 0);
        end.setHours(0, 0, 0, 0);
        const diffTime = Math.max(0, end - start);
        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
        if (saleItem) {
          durationMeta = `<div class="gallery-card-hover-meta-item"><span>Duration:</span><strong class="text-success-neon">${diffDays} day${diffDays === 1 ? '' : 's'}</strong></div>`;
        } else {
          const agingCat = getAgingCategory(item.purchaseDate);
          durationMeta = `<div class="gallery-card-hover-meta-item"><span>Active:</span><strong>${diffDays} day${diffDays === 1 ? '' : 's'} <span class="badge ${agingCat.class}" style="font-size: 0.6rem; padding: 1px 5px; text-transform: uppercase; margin-left: 6px; line-height: 1; vertical-align: middle;">${agingCat.name}</span></strong></div>`;
        }
      }

      card.innerHTML = `
        <div class="gallery-card-img-container">
          ${imageHtml}
        </div>
        <div class="gallery-card-overlay">
          <h4 class="gallery-card-title" title="${escapeHTML(titleStr)}">${escapeHTML(titleStr)}</h4>
          <div class="gallery-card-subtitle">
            <span><i class="${platformIcon}"></i> ${escapeHTML(platformStr)}</span>
            <span class="badge ${statusClass}">${item.status || "Available"}</span>
          </div>
        </div>
        <div class="gallery-card-hover-details">
          <div class="gallery-card-hover-header">
            <h4 title="${escapeHTML(titleStr)}">${escapeHTML(titleStr)}</h4>
            <span class="badge ${statusClass}">${item.status || "Available"}</span>
          </div>
          <div class="gallery-card-hover-meta">
            <div class="gallery-card-hover-meta-item">
              <span>Platform:</span>
              <strong>${escapeHTML(platformStr)}</strong>
            </div>
            <div class="gallery-card-hover-meta-item">
              <span>Cost:</span>
              <strong>${formatCurrency(item.cost)}</strong>
            </div>
            ${soldPriceMeta}
            ${profitMeta}
            <div class="gallery-card-hover-meta-item">
              <span>Supplier:</span>
              ${supplierBadge}
            </div>
            <div class="gallery-card-hover-meta-item">
              <span>Added:</span>
              <strong>${formatToDDMMYYYY(item.purchaseDate)}</strong>
            </div>
            ${dateClosedMeta}
            ${durationMeta}
          </div>
          <div class="gallery-card-hover-key">
            <span class="key-label" style="margin-bottom: 4px; font-size: 0.65rem;">Key</span>
            <div class="secured-key" style="width: 100%; justify-content: center;">
              <code style="font-size: 0.75rem; padding: 2px 4px;">${maskedKey}</code>
            </div>
          </div>
          <div class="gallery-card-hover-actions">
            ${actionButton}
            <button class="btn-action btn-action-edit" onclick="triggerEditGame('${item.id}')" title="Edit Game"><i class="fa-solid fa-pen"></i></button>
            <button class="btn-action btn-action-view" onclick="triggerViewKey('${item.id}')" title="Secure View"><i class="fa-solid fa-eye"></i></button>
            <button class="btn-action btn-action-delete" onclick="triggerDeleteGame('${item.id}')" title="Delete"><i class="fa-solid fa-trash"></i></button>
          </div>
        </div>
      `;

      // Click card body (except interactive buttons) to trigger inspect Secure View modal
      card.addEventListener("click", (e) => {
        if (e.target.closest("button") || e.target.closest("a") || e.target.closest("code")) {
          return;
        }
        triggerViewKey(item.id);
      });

      container.appendChild(card);
    });
  } catch (err) {
    console.error("Error in renderInventoryGalleryLayout:", err);
  }
}

// Render Table: Sales ledger list
function buildSalesRowHTML(sale, inventoryMap) {
  const initials = sale.title.split(" ").map(w => w[0]).join("").slice(0, 3);
  const gameInInv = inventoryMap.get(sale.inventoryId);
  const saleImgUrl = gameInInv ? gameInInv.imageUrl : null;
  const titleCell = saleImgUrl 
    ? `<div class="game-title-cell"><img src="${escapeHTML(saleImgUrl)}" class="game-thumbnail" alt="${escapeHTML(sale.title)}"><strong>${escapeHTML(sale.title)}</strong></div>`
    : `<div class="game-title-cell"><div class="game-thumbnail-placeholder">${escapeHTML(initials)}</div><strong>${escapeHTML(sale.title)}</strong></div>`;

  const isDisputed = sale.disputed === true;
  const rowStyle = isDisputed ? 'style="background-color: hsla(40, 95%, 55%, 0.04) !important; border-left: 3px solid var(--accent-warning);"' : '';
  const profitClass = isDisputed ? 'text-danger-soft' : 'text-success-neon';
  const profitSign = isDisputed ? '-' : '';
  const profitStr = isDisputed ? formatCurrency(sale.cost) : formatCurrency(sale.profit);
  const sellPriceCell = isDisputed 
    ? `<s>${formatCurrency(sale.sellPrice)}</s> <span style="font-size: 0.65rem; color: var(--accent-warning); font-weight: 700; display: block; margin-top: 2px; letter-spacing: 0.05em;">REFUNDED</span>`
    : `<strong>${formatCurrency(sale.sellPrice)}</strong>`;
  
  const disputeBtn = isDisputed
    ? `<button class="btn-action" onclick="triggerResolveDispute('${sale.id}')" title="Resolve Dispute (Restore Sale)" style="color: var(--accent-teal); border-color: var(--accent-teal);"><i class="fa-solid fa-circle-check"></i></button>`
    : `<button class="btn-action" onclick="triggerDisputeSale('${sale.id}')" title="Flag as Disputed / Refunded" style="color: var(--accent-warning); border-color: var(--accent-warning);"><i class="fa-solid fa-triangle-exclamation"></i></button>`;

  const keyStr = gameInInv ? (gameInInv.key || "") : "";
  const maskedKey = keyStr && keyStr.length >= 8 
    ? keyStr.substr(0, 4) + "..." + keyStr.substr(keyStr.length - 4) 
    : keyStr;
  
  const keyCell = keyStr 
    ? `<div class="secured-key" style="justify-content: flex-start;"><code style="font-size: 0.75rem; padding: 2px 6px; color: var(--text-color);">${escapeHTML(maskedKey)}</code><button class="btn-copy-key" onclick="navigator.clipboard.writeText('${escapeHTML(keyStr)}'); showToast('Key copied!', 'success')" title="Copy Key" style="background: none; border: none; padding: 2px; margin-left: 6px; cursor: pointer; color: var(--text-muted);"><i class="fa-regular fa-copy" style="font-size: 0.75rem;"></i></button></div>`
    : `<span style="color: var(--text-muted)">-</span>`;

  return `
    <tr ${rowStyle}>
      <td>${titleCell}</td>
      <td><span class="platform-indicator"><i class="fa-solid fa-gamepad" style="font-size: 0.8rem; margin-right: 6px;"></i> ${escapeHTML(sale.platform)}</span></td>
      <td>${keyCell}</td>
      <td>${formatCurrency(sale.cost)}</td>
      <td>${sellPriceCell}</td>
      <td><span class="tag-platform-sold" style="background-color: hsla(270, 85%, 60%, 0.1); border: 1px solid hsla(270, 85%, 60%, 0.2); color: var(--accent-purple); padding: 2px 8px; border-radius: 4px; font-size: 0.75rem; font-weight:600;">${escapeHTML(sale.platformSold)}</span></td>
      <td class="${profitClass}"><strong>${profitSign}${profitStr}</strong></td>
      <td>${formatDate(sale.saleDate)}</td>
      <td style="max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${escapeHTML(sale.notes || '')}">${sale.notes ? escapeHTML(sale.notes) : '<span style="color: var(--text-muted)">-</span>'}</td>
      <td>
        <div class="table-actions">
          ${disputeBtn}
          <button class="btn-action btn-action-delete" onclick="triggerCancelSale('${sale.id}')" title="Cancel Sale (Return key to stock)"><i class="fa-solid fa-rotate-left"></i></button>
        </div>
      </td>
    </tr>
  `;
}

function renderSalesTable(salesList) {
  const tbody = document.getElementById("sales-table-body");
  if (!tbody) return;
  tbody.innerHTML = "";

  if (salesList.length === 0) {
    tbody.innerHTML = `<tr><td colspan="10" class="text-center" style="text-align: center; padding: 30px; color: var(--text-muted);">No sales recorded in this period.</td></tr>`;
    document.getElementById("sales-count-text").textContent = `Showing 0 sales`;
    const container = document.getElementById("sales-pagination");
    if (container) container.innerHTML = "";
    return;
  }

  // Pre-index state.inventory by ID for O(1) lookups
  const inventoryMap = new Map();
  state.inventory.forEach(item => {
    inventoryMap.set(item.id, item);
  });

  const tableContainer = document.getElementById("sales-table-container");
  const isVirtual = state.salesPageSize >= 100000;

  if (tableContainer && tableContainer._scrollListener) {
    tableContainer.removeEventListener("scroll", tableContainer._scrollListener);
    tableContainer._scrollListener = null;
  }

  if (isVirtual && tableContainer) {
    const rowHeight = 55;
    const containerHeight = tableContainer.clientHeight || 500;

    const renderSlice = () => {
      const scrollTop = tableContainer.scrollTop;
      const totalItems = salesList.length;

      let startIndex = Math.floor(scrollTop / rowHeight);
      let endIndex = Math.ceil((scrollTop + containerHeight) / rowHeight);

      startIndex = Math.max(0, startIndex - 5);
      endIndex = Math.min(totalItems, endIndex + 5);

      const topSpacerHeight = startIndex * rowHeight;
      const bottomSpacerHeight = (totalItems - endIndex) * rowHeight;

      let tbodyContent = "";

      if (topSpacerHeight > 0) {
        tbodyContent += `<tr style="height: ${topSpacerHeight}px;"><td colspan="10" style="padding: 0; border: none; height: ${topSpacerHeight}px;"></td></tr>`;
      }

      const slicedItems = salesList.slice(startIndex, endIndex);
      slicedItems.forEach(sale => {
        if (!sale) return;
        tbodyContent += buildSalesRowHTML(sale, inventoryMap);
      });

      if (bottomSpacerHeight > 0) {
        tbodyContent += `<tr style="height: ${bottomSpacerHeight}px;"><td colspan="10" style="padding: 0; border: none; height: ${bottomSpacerHeight}px;"></td></tr>`;
      }

      tbody.innerHTML = tbodyContent;
    };

    const onScroll = () => {
      requestAnimationFrame(renderSlice);
    };

    tableContainer.addEventListener("scroll", onScroll);
    tableContainer._scrollListener = onScroll;

    tableContainer.style.maxHeight = "65vh";
    tableContainer.style.overflowY = "auto";
    tableContainer.style.position = "relative";

    renderSlice();

    document.getElementById("sales-count-text").textContent = `Showing all ${salesList.length} sales transactions (virtual scroll)`;
    const container = document.getElementById("sales-pagination");
    if (container) container.innerHTML = "";
  } else {
    // Pagination Logic
    const totalPages = Math.ceil(salesList.length / state.salesPageSize) || 1;
    if (state.salesCurrentPage > totalPages) {
      state.salesCurrentPage = totalPages;
    }
    if (state.salesCurrentPage < 1) {
      state.salesCurrentPage = 1;
    }

    const startIndex = (state.salesCurrentPage - 1) * state.salesPageSize;
    const endIndex = startIndex + state.salesPageSize;
    const paginatedSalesList = salesList.slice(startIndex, endIndex);

    let tbodyContent = "";
    paginatedSalesList.forEach(sale => {
      if (!sale) return;
      tbodyContent += buildSalesRowHTML(sale, inventoryMap);
    });
    tbody.innerHTML = tbodyContent;

    if (tableContainer) {
      tableContainer.style.maxHeight = "";
      tableContainer.style.overflowY = "";
    }

    const showingStart = salesList.length === 0 ? 0 : startIndex + 1;
    const showingEnd = Math.min(endIndex, salesList.length);
    document.getElementById("sales-count-text").textContent = `Showing ${showingStart}-${showingEnd} of ${salesList.length} sales transactions`;

    // Render pagination buttons
    renderSalesPagination(salesList.length);
  }
}

// Render dynamic pagination controls for the sales ledger
function renderSalesPagination(totalItems) {
  const container = document.getElementById("sales-pagination");
  if (!container) return;
  container.innerHTML = "";

  const totalPages = Math.ceil(totalItems / state.salesPageSize) || 1;
  if (totalPages <= 1) {
    container.style.display = "none";
    return;
  }
  container.style.display = "flex";

  const createBtn = (text, targetPage, disabled = false, active = false) => {
    const btn = document.createElement("button");
    btn.className = `btn btn-sm ${active ? 'btn-primary' : 'btn-outline'}`;
    btn.innerHTML = text;
    btn.disabled = disabled;
    if (!disabled && !active) {
      btn.addEventListener("click", () => {
        state.salesCurrentPage = targetPage;
        updateUI();
      });
    }
    return btn;
  };

  container.appendChild(createBtn('<i class="fa-solid fa-angle-left"></i>', state.salesCurrentPage - 1, state.salesCurrentPage === 1));

  const maxButtons = 5;
  let startPage = Math.max(1, state.salesCurrentPage - Math.floor(maxButtons / 2));
  let endPage = startPage + maxButtons - 1;

  if (endPage > totalPages) {
    endPage = totalPages;
    startPage = Math.max(1, endPage - maxButtons + 1);
  }

  if (startPage > 1) {
    container.appendChild(createBtn("1", 1));
    if (startPage > 2) {
      const dot = document.createElement("span");
      dot.className = "pagination-dots";
      dot.textContent = "...";
      container.appendChild(dot);
    }
  }

  for (let i = startPage; i <= endPage; i++) {
    container.appendChild(createBtn(i.toString(), i, false, i === state.salesCurrentPage));
  }

  if (endPage < totalPages) {
    if (endPage < totalPages - 1) {
      const dot = document.createElement("span");
      dot.className = "pagination-dots";
      dot.textContent = "...";
      container.appendChild(dot);
    }
    container.appendChild(createBtn(totalPages.toString(), totalPages));
  }

  container.appendChild(createBtn('<i class="fa-solid fa-angle-right"></i>', state.salesCurrentPage + 1, state.salesCurrentPage === totalPages));
}

// Calculates age category for an inventory item
function getAgingCategory(purchaseDate) {
  if (!purchaseDate) {
    return { name: "Fresh", class: "badge-age-fresh", days: 0 };
  }
  const start = new Date(purchaseDate);
  const end = new Date();
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  const diffTime = Math.max(0, end - start);
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays < 30) {
    return { name: "Fresh", class: "badge-age-fresh", days: diffDays };
  } else if (diffDays <= 60) {
    return { name: "Aging", class: "badge-age-aging", days: diffDays };
  } else if (diffDays <= 90) {
    return { name: "Stale", class: "badge-age-stale", days: diffDays };
  } else {
    return { name: "Very Stale", class: "badge-age-verystale", days: diffDays };
  }
}

// Render dashboard secondary panels
function renderDashboardDetails(filteredSalesList, filteredInventoryList) {
  // Recent transactions table (limit to 5)
  const recentSalesTbody = document.querySelector("#recent-sales-table tbody");
  recentSalesTbody.innerHTML = "";

  const recentSales = filteredSalesList.slice(0, 5);
  if (recentSales.length === 0) {
    recentSalesTbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 15px;">No transactions logged yet.</td></tr>`;
  } else {
    recentSales.forEach(sale => {
      const tr = document.createElement("tr");
      const initials = sale.title.split(" ").map(w => w[0]).join("").slice(0, 3);
      const gameInInv = state.inventory.find(i => i.id === sale.inventoryId);
      const saleImgUrl = gameInInv ? gameInInv.imageUrl : null;
      const titleCell = saleImgUrl 
        ? `<div class="game-title-cell"><img src="${saleImgUrl}" class="game-thumbnail" alt="${sale.title}"><strong>${sale.title}</strong></div>`
        : `<div class="game-title-cell"><div class="game-thumbnail-placeholder">${initials}</div><strong>${sale.title}</strong></div>`;

      tr.innerHTML = `
        <td>${titleCell}</td>
        <td>${sale.platform}</td>
        <td>${formatCurrency(sale.cost)}</td>
        <td>${formatCurrency(sale.sellPrice)}</td>
        <td class="${sale.profit >= 0 ? 'text-success-neon' : 'text-danger-soft'}">${sale.profit >= 0 ? '+' : ''}${formatCurrency(sale.profit)}</td>
        <td><span class="badge badge-sold">Sold</span></td>
      `;
      recentSalesTbody.appendChild(tr);
    });
  }



  // Inventory Aging Summary calculation
  const agingStats = {
    Fresh: { count: 0, cost: 0 },
    Aging: { count: 0, cost: 0 },
    Stale: { count: 0, cost: 0 },
    "Very Stale": { count: 0, cost: 0 }
  };

  let totalActiveAging = 0;
  filteredInventoryList.forEach(item => {
    if (item.status !== "Sold") {
      const cat = getAgingCategory(item.purchaseDate);
      if (agingStats[cat.name]) {
        agingStats[cat.name].count++;
        agingStats[cat.name].cost += (item.cost || 0);
        totalActiveAging++;
      }
    }
  });

  // Render segments to DOM
  const updateAgingRow = (idCount, idVal, keyName) => {
    const countEl = document.getElementById(idCount);
    const valEl = document.getElementById(idVal);
    const stats = agingStats[keyName];
    if (countEl) countEl.textContent = stats.count;
    if (valEl) valEl.textContent = formatCurrency(stats.cost);
  };

  updateAgingRow("aging-count-fresh", "aging-val-fresh", "Fresh");
  updateAgingRow("aging-count-aging", "aging-val-aging", "Aging");
  updateAgingRow("aging-count-stale", "aging-val-stale", "Stale");
  updateAgingRow("aging-count-verystale", "aging-val-verystale", "Very Stale");
}

// ==========================================================================
// CHART.JS GRAPH RENDERING
// ==========================================================================
function renderSalesTrendChart(filteredSalesList) {
  if (typeof Chart === 'undefined') {
    console.warn("Chart.js is not loaded. Skipping sales trend chart rendering.");
    return;
  }
  const canvas = document.getElementById("salesProfitChart");
  if (!canvas) {
    console.warn("salesProfitChart canvas not found. Skipping chart rendering.");
    return;
  }
  const ctx = canvas.getContext("2d");

  // Destroy previous instance to avoid hover flickering errors
  if (salesProfitChartInstance) {
    try {
      salesProfitChartInstance.destroy();
    } catch (e) {
      console.error("Error destroying salesProfitChartInstance:", e);
    }
  }

  const wSales = getWidgetFilteredSales("salesProfit", filteredSalesList);

  // Group sales by Date
  const salesByDate = {};
  wSales.forEach(sale => {
    const dateStr = sale.saleDate;
    if (!salesByDate[dateStr]) {
      salesByDate[dateStr] = { revenue: 0, profit: 0 };
    }
    salesByDate[dateStr].revenue += sale.sellPrice;
    salesByDate[dateStr].profit += sale.profit;
  });

  // Sort dates chronological
  const sortedDates = Object.keys(salesByDate).sort((a, b) => new Date(a) - new Date(b));
  
  // Format labels & values
  const labels = sortedDates.map(d => {
    const opt = { month: 'short', day: 'numeric' };
    return new Date(d).toLocaleDateString('en-US', opt);
  });
  const revenueData = sortedDates.map(d => salesByDate[d].revenue);
  const profitData = sortedDates.map(d => salesByDate[d].profit);

  // If empty, fill with placeholder visuals
  if (sortedDates.length === 0) {
    labels.push("No Sales Data");
    revenueData.push(0);
    profitData.push(0);
  }

  const rootStyle = getComputedStyle(document.documentElement);
  const textSecondaryColor = rootStyle.getPropertyValue('--text-secondary').trim() || 'hsl(220, 12%, 65%)';
  const borderColor = rootStyle.getPropertyValue('--border-color').trim() || 'hsla(224, 20%, 25%, 0.15)';
  const tooltipBg = rootStyle.getPropertyValue('--bg-sidebar').trim() || 'hsl(224, 25%, 10%)';

  const accentPink = rootStyle.getPropertyValue('--accent-pink').trim() || 'hsl(330, 95%, 60%)';
  const accentPinkGlow = rootStyle.getPropertyValue('--accent-pink-glow').trim() || 'hsla(330, 95%, 60%, 0.1)';
  const accentTeal = rootStyle.getPropertyValue('--accent-teal').trim() || 'hsl(175, 90%, 48%)';
  const accentTealGlow = rootStyle.getPropertyValue('--accent-teal-glow').trim() || 'hsla(175, 90%, 48%, 0.1)';

  const wType = (state.widgetSettings && state.widgetSettings.salesProfit && state.widgetSettings.salesProfit.chartType) || 'line';
  salesProfitChartInstance = new Chart(ctx, {
    type: wType,
    data: {
      labels: labels,
      datasets: [
        {
          label: `Total Revenue (${state.currency === 'USD' ? '$' : '€'})`,
          data: revenueData,
          borderColor: accentPink,
          backgroundColor: accentPinkGlow,
          borderWidth: 3,
          fill: true,
          tension: 0.35,
          pointBackgroundColor: accentPink,
          pointHoverRadius: 6
        },
        {
          label: `Net Profit (${state.currency === 'USD' ? '$' : '€'})`,
          data: profitData,
          borderColor: accentTeal,
          backgroundColor: accentTealGlow,
          borderWidth: 3,
          fill: true,
          tension: 0.35,
          pointBackgroundColor: accentTeal,
          pointHoverRadius: 6
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: {
            color: textSecondaryColor,
            font: { family: 'Inter', size: 12 }
          }
        },
        tooltip: {
          backgroundColor: tooltipBg,
          titleColor: state.theme !== "light" ? "#fff" : "#000",
          bodyColor: state.theme !== "light" ? "#fff" : "#000",
          borderColor: borderColor,
          borderWidth: 1
        }
      },
      scales: {
        x: {
          grid: { color: borderColor },
          ticks: { 
            color: textSecondaryColor,
            autoSkip: true,
            maxTicksLimit: 8
          }
        },
        y: {
          grid: { color: borderColor },
          ticks: { color: textSecondaryColor }
        }
      }
    }
  });
}

function renderDailyProfitMonthChart(filteredSalesList) {
  if (typeof Chart === 'undefined') {
    console.warn("Chart.js is not loaded. Skipping daily profit month chart rendering.");
    return;
  }
  const canvas = document.getElementById("dailyProfitMonthChart");
  if (!canvas) {
    console.warn("dailyProfitMonthChart canvas not found. Skipping chart rendering.");
    return;
  }
  const ctx = canvas.getContext("2d");

  // Destroy previous instance to avoid hover flickering errors
  if (dailyProfitMonthChartInstance) {
    try {
      dailyProfitMonthChartInstance.destroy();
    } catch (e) {
      console.error("Error destroying dailyProfitMonthChartInstance:", e);
    }
  }

  const wSales = getWidgetFilteredSales("dailyProfitMonth", filteredSalesList);

  // Determine current/active month and year
  let year = new Date().getFullYear();
  let month = new Date().getMonth(); // 0-indexed

  if (wSales.length > 0) {
    // Find the month of the most recent sale in the list
    let mostRecentDate = new Date(0);
    wSales.forEach(s => {
      if (s.saleDate) {
        const d = new Date(s.saleDate);
        if (d > mostRecentDate) mostRecentDate = d;
      }
    });
    if (mostRecentDate.getTime() > 0) {
      year = mostRecentDate.getFullYear();
      month = mostRecentDate.getMonth();
    }
  }

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const monthName = months[month];

  // Update card title
  const titleEl = document.querySelector("#card-chart-dailyProfitMonth h4");
  if (titleEl) {
    titleEl.textContent = `Daily Profit — ${monthName} ${year}`;
  }

  // Calculate days in the month
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const labels = [];
  const dailyProfitMap = {};
  for (let i = 1; i <= daysInMonth; i++) {
    labels.push(`${i}`);
    dailyProfitMap[i] = 0;
  }

  // Aggregate profits timezone-safely using string splitting
  wSales.forEach(sale => {
    if (!sale.saleDate) return;
    const parts = sale.saleDate.split("-");
    if (parts.length === 3) {
      const sYear = parseInt(parts[0], 10);
      const sMonth = parseInt(parts[1], 10) - 1; // Convert 1-12 to 0-11
      const sDay = parseInt(parts[2], 10);
      
      if (sYear === year && sMonth === month) {
        dailyProfitMap[sDay] += sale.profit;
      }
    }
  });

  const profitData = [];
  for (let i = 1; i <= daysInMonth; i++) {
    profitData.push(dailyProfitMap[i]);
  }

  const rootStyle = getComputedStyle(document.documentElement);
  const textSecondaryColor = rootStyle.getPropertyValue('--text-secondary').trim() || 'hsl(220, 12%, 65%)';
  const borderColor = rootStyle.getPropertyValue('--border-color').trim() || 'hsla(224, 20%, 25%, 0.15)';
  const tooltipBg = rootStyle.getPropertyValue('--bg-sidebar').trim() || 'hsl(224, 25%, 10%)';

  const accentTeal = rootStyle.getPropertyValue('--accent-teal').trim() || 'hsl(175, 90%, 48%)';
  const accentTealGlow = rootStyle.getPropertyValue('--accent-teal-glow').trim() || 'hsla(175, 90%, 48%, 0.2)';

  const wType = (state.widgetSettings && state.widgetSettings.dailyProfitMonth && state.widgetSettings.dailyProfitMonth.chartType) || 'bar';
  dailyProfitMonthChartInstance = new Chart(ctx, {
    type: wType,
    data: {
      labels: labels,
      datasets: [
        {
          label: `Daily Profit (${state.currency === 'USD' ? '$' : '€'})`,
          data: profitData,
          backgroundColor: accentTealGlow,
          borderColor: accentTeal,
          borderWidth: 1.5,
          borderRadius: 4,
          hoverBackgroundColor: accentTeal
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          backgroundColor: tooltipBg,
          titleColor: state.theme !== "light" ? "#fff" : "#000",
          bodyColor: state.theme !== "light" ? "#fff" : "#000",
          borderColor: borderColor,
          borderWidth: 1,
          callbacks: {
            title: function(context) {
              return `${monthName} ${context[0].label}, ${year}`;
            }
          }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { 
            color: textSecondaryColor,
            autoSkip: true,
            maxTicksLimit: 8
          }
        },
        y: {
          grid: { color: borderColor },
          ticks: { color: textSecondaryColor }
        }
      }
    }
  });
}

function renderPlatformSplitChart(filteredSalesList) {
  if (typeof Chart === 'undefined') {
    console.warn("Chart.js is not loaded. Skipping platform split chart rendering.");
    return;
  }
  const canvas = document.getElementById("platformSplitChart");
  if (!canvas) {
    console.warn("platformSplitChart canvas not found. Skipping chart rendering.");
    return;
  }
  const ctx = canvas.getContext("2d");

  if (platformSplitChartInstance) {
    try {
      platformSplitChartInstance.destroy();
    } catch (e) {
      console.error("Error destroying platformSplitChartInstance:", e);
    }
  }

  const wSales = getWidgetFilteredSales("platformSplit", filteredSalesList);

  // Count sales per selling platform
  const platformCounts = {};
  wSales.forEach(sale => {
    const platform = sale.platformSold;
    platformCounts[platform] = (platformCounts[platform] || 0) + 1;
  });

  const labels = Object.keys(platformCounts);
  const data = Object.values(platformCounts);

  // If empty, fill default
  if (labels.length === 0) {
    labels.push("No Sales");
    data.push(1);
  }

  const rootStyle = getComputedStyle(document.documentElement);
  const textSecondaryColor = rootStyle.getPropertyValue('--text-secondary').trim() || 'hsl(220, 12%, 65%)';
  const bgCardColor = rootStyle.getPropertyValue('--bg-card').trim() || 'hsl(224, 22%, 12%)';
  const borderColor = rootStyle.getPropertyValue('--border-color').trim() || 'hsla(224, 20%, 30%, 0.5)';
  const tooltipBg = rootStyle.getPropertyValue('--bg-sidebar').trim() || 'hsl(224, 25%, 10%)';

  const accentPurple = rootStyle.getPropertyValue('--accent-purple').trim() || 'hsl(270, 85%, 60%)';
  const accentCyan = rootStyle.getPropertyValue('--accent-cyan').trim() || 'hsl(195, 90%, 50%)';
  const accentPink = rootStyle.getPropertyValue('--accent-pink').trim() || 'hsl(330, 95%, 60%)';
  const accentTeal = rootStyle.getPropertyValue('--accent-teal').trim() || 'hsl(175, 90%, 48%)';
  const accentWarning = rootStyle.getPropertyValue('--accent-warning').trim() || 'hsl(40, 95%, 55%)';
  const accentDanger = rootStyle.getPropertyValue('--accent-danger').trim() || 'hsl(355, 85%, 55%)';

  const backgroundColors = [
    accentPurple,
    accentCyan,
    accentPink,
    accentTeal,
    accentWarning,
    accentDanger
  ];

  const wType = (state.widgetSettings && state.widgetSettings.platformSplit && state.widgetSettings.platformSplit.chartType) || 'doughnut';

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          color: textSecondaryColor,
          font: { family: 'Inter', size: 10 },
          boxWidth: 12
        }
      },
      tooltip: {
        backgroundColor: tooltipBg,
        titleColor: state.theme !== "light" ? "#fff" : "#000",
        bodyColor: state.theme !== "light" ? "#fff" : "#000",
        borderColor: borderColor,
        borderWidth: 1
      }
    }
  };

  if (wType === 'bar') {
    options.scales = {
      x: { grid: { display: false }, ticks: { color: textSecondaryColor } },
      y: { grid: { color: borderColor }, ticks: { color: textSecondaryColor, beginAtZero: true } }
    };
  }

  platformSplitChartInstance = new Chart(ctx, {
    type: wType,
    data: {
      labels: labels,
      datasets: [{
        data: data,
        backgroundColor: backgroundColors.slice(0, labels.length),
        borderWidth: 2,
        borderColor: bgCardColor,
        hoverOffset: 4
      }]
    },
    options: options
  });
}

// Render Cost vs Revenue chart
function renderCostRevenueChart(filteredSalesList) {
  if (typeof Chart === 'undefined') {
    console.warn("Chart.js is not loaded. Skipping cost vs revenue chart rendering.");
    return;
  }
  const canvas = document.getElementById("costRevenueChart");
  if (!canvas) {
    console.warn("costRevenueChart canvas not found. Skipping chart rendering.");
    return;
  }
  const ctx = canvas.getContext("2d");

  if (costRevenueChartInstance) {
    try {
      costRevenueChartInstance.destroy();
    } catch (e) {
      console.error("Error destroying costRevenueChartInstance:", e);
    }
  }

  const wSales = getWidgetFilteredSales("costRevenue", filteredSalesList);

  // Group sales by Date
  const salesByDate = {};
  wSales.forEach(sale => {
    const dateStr = sale.saleDate;
    if (!salesByDate[dateStr]) {
      salesByDate[dateStr] = { revenue: 0, cost: 0 };
    }
    salesByDate[dateStr].revenue += sale.sellPrice;
    salesByDate[dateStr].cost += sale.cost;
  });

  const sortedDates = Object.keys(salesByDate).sort((a, b) => new Date(a) - new Date(b));
  
  const labels = sortedDates.map(d => {
    const opt = { month: 'short', day: 'numeric' };
    return new Date(d).toLocaleDateString('en-US', opt);
  });
  const revenueData = sortedDates.map(d => salesByDate[d].revenue);
  const costData = sortedDates.map(d => salesByDate[d].cost);

  if (sortedDates.length === 0) {
    labels.push("No Sales Data");
    revenueData.push(0);
    costData.push(0);
  }

  const rootStyle = getComputedStyle(document.documentElement);
  const textSecondaryColor = rootStyle.getPropertyValue('--text-secondary').trim() || 'hsl(220, 12%, 65%)';
  const borderColor = rootStyle.getPropertyValue('--border-color').trim() || 'hsla(224, 20%, 25%, 0.15)';
  const tooltipBg = rootStyle.getPropertyValue('--bg-sidebar').trim() || 'hsl(224, 25%, 10%)';

  const accentPink = rootStyle.getPropertyValue('--accent-pink').trim() || 'hsl(330, 95%, 60%)';
  const accentCyan = rootStyle.getPropertyValue('--accent-cyan').trim() || 'hsl(195, 90%, 50%)';

  const wType = (state.widgetSettings && state.widgetSettings.costRevenue && state.widgetSettings.costRevenue.chartType) || 'bar';
  costRevenueChartInstance = new Chart(ctx, {
    type: wType,
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Acquisition Cost',
          data: costData,
          backgroundColor: accentCyan,
          borderRadius: 4
        },
        {
          label: 'Revenue',
          data: revenueData,
          backgroundColor: accentPink,
          borderRadius: 4
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          grid: { display: false },
          ticks: { 
            color: textSecondaryColor, 
            font: { family: 'Inter', size: 10 },
            autoSkip: true,
            maxTicksLimit: 8
          }
        },
        y: {
          grid: { color: borderColor },
          ticks: { color: textSecondaryColor, font: { family: 'Inter', size: 10 } }
        }
      },
      plugins: {
        legend: {
          position: 'bottom',
          labels: { color: textSecondaryColor, font: { family: 'Inter', size: 10 }, boxWidth: 12 }
        },
        tooltip: {
          backgroundColor: tooltipBg,
          titleColor: state.themeMode !== "light" ? "#fff" : "#000",
          bodyColor: state.themeMode !== "light" ? "#fff" : "#000",
          borderColor: borderColor,
          borderWidth: 1
        }
      }
    }
  });
}

// Render Supplier stock distribution chart
function renderSupplierSplitChart(filteredInventoryList) {
  if (typeof Chart === 'undefined') {
    console.warn("Chart.js is not loaded. Skipping supplier split chart rendering.");
    return;
  }
  const canvas = document.getElementById("supplierSplitChart");
  if (!canvas) {
    console.warn("supplierSplitChart canvas not found. Skipping chart rendering.");
    return;
  }
  const ctx = canvas.getContext("2d");

  if (supplierSplitChartInstance) {
    try {
      supplierSplitChartInstance.destroy();
    } catch (e) {
      console.error("Error destroying supplierSplitChartInstance:", e);
    }
  }

  const wInventory = getWidgetFilteredInventory("supplierSplit", filteredInventoryList);

  // Count unsold stock per supplier
  const supplierCounts = {};
  wInventory.forEach(item => {
    if (item.status !== "Sold") {
      const supplier = item.source || "Unknown";
      supplierCounts[supplier] = (supplierCounts[supplier] || 0) + 1;
    }
  });

  const labels = Object.keys(supplierCounts);
  const data = Object.values(supplierCounts);

  if (labels.length === 0) {
    labels.push("No Available Stock");
    data.push(1);
  }

  const rootStyle = getComputedStyle(document.documentElement);
  const textSecondaryColor = rootStyle.getPropertyValue('--text-secondary').trim() || 'hsl(220, 12%, 65%)';
  const bgCardColor = rootStyle.getPropertyValue('--bg-card').trim() || 'hsl(224, 22%, 12%)';
  const borderColor = rootStyle.getPropertyValue('--border-color').trim() || 'hsla(224, 20%, 30%, 0.5)';
  const tooltipBg = rootStyle.getPropertyValue('--bg-sidebar').trim() || 'hsl(224, 25%, 10%)';

  const accentPurple = rootStyle.getPropertyValue('--accent-purple').trim() || 'hsl(270, 85%, 60%)';
  const accentCyan = rootStyle.getPropertyValue('--accent-cyan').trim() || 'hsl(195, 90%, 50%)';
  const accentTeal = rootStyle.getPropertyValue('--accent-teal').trim() || 'hsl(175, 90%, 48%)';
  const accentWarning = rootStyle.getPropertyValue('--accent-warning').trim() || 'hsl(40, 95%, 55%)';
  const accentPink = rootStyle.getPropertyValue('--accent-pink').trim() || 'hsl(330, 95%, 60%)';
  const accentDanger = rootStyle.getPropertyValue('--accent-danger').trim() || 'hsl(355, 85%, 55%)';

  const backgroundColors = [
    accentPurple,
    accentCyan,
    accentTeal,
    accentWarning,
    accentPink,
    accentDanger
  ];

  const wType = (state.widgetSettings && state.widgetSettings.supplierSplit && state.widgetSettings.supplierSplit.chartType) || 'doughnut';

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          color: textSecondaryColor,
          font: { family: 'Inter', size: 10 },
          boxWidth: 12
        }
      },
      tooltip: {
        backgroundColor: tooltipBg,
        titleColor: state.themeMode !== "light" ? "#fff" : "#000",
        bodyColor: state.themeMode !== "light" ? "#fff" : "#000",
        borderColor: borderColor,
        borderWidth: 1
      }
    }
  };

  if (wType === 'bar') {
    options.scales = {
      x: { grid: { display: false }, ticks: { color: textSecondaryColor } },
      y: { grid: { color: borderColor }, ticks: { color: textSecondaryColor, beginAtZero: true } }
    };
  }

  supplierSplitChartInstance = new Chart(ctx, {
    type: wType,
    data: {
      labels: labels,
      datasets: [{
        data: data,
        backgroundColor: backgroundColors.slice(0, labels.length),
        borderWidth: 2,
        borderColor: bgCardColor,
        hoverOffset: 4
      }]
    },
    options: options
  });
}

// Render top bestselling games horizontal bar chart
function renderTopBestsellersChart(filteredSalesList) {
  const container = document.getElementById("top-bestsellers-list");
  if (!container) {
    console.warn("top-bestsellers-list container not found. Skipping list rendering.");
    return;
  }

  // Get current configurations
  const cfg = state.widgetSettings ? state.widgetSettings.topBestsellers : null;
  const metric = cfg ? cfg.metric : (state.bestsellersMetric || "profit");
  const limit = cfg ? cfg.limit : (state.bestsellersLimit || 5);

  const wSales = getWidgetFilteredSales("topBestsellers", filteredSalesList);

  // Build lookup maps for images from inventory
  const imgUrlByTitle = {};
  const imgUrlById = {};
  if (state.inventory && Array.isArray(state.inventory)) {
    state.inventory.forEach(item => {
      if (item.imageUrl) {
        if (item.id) imgUrlById[item.id] = item.imageUrl;
        if (item.title) imgUrlByTitle[item.title.trim().toLowerCase()] = item.imageUrl;
      }
    });
  }

  // Calculate metrics per game title
  const gameMetrics = {};
  wSales.forEach(sale => {
    const title = sale.title || "Unknown Game";
    if (!gameMetrics[title]) {
      gameMetrics[title] = { profit: 0, revenue: 0, sales: 0, imageUrl: null };
    }
    gameMetrics[title].profit += sale.profit || 0;
    gameMetrics[title].revenue += sale.sellPrice || 0;
    gameMetrics[title].sales += 1;

    // Assign imageUrl if not already set
    if (!gameMetrics[title].imageUrl) {
      if (sale.inventoryId && imgUrlById[sale.inventoryId]) {
        gameMetrics[title].imageUrl = imgUrlById[sale.inventoryId];
      } else if (imgUrlByTitle[title.trim().toLowerCase()]) {
        gameMetrics[title].imageUrl = imgUrlByTitle[title.trim().toLowerCase()];
      }
    }
  });

  // Sort and pick top N
  const sortedGames = Object.keys(gameMetrics)
    .map(title => {
      const salesCount = gameMetrics[title].sales;
      const totalProfit = gameMetrics[title].profit;
      const totalRevenue = gameMetrics[title].revenue;
      const avgProfit = salesCount > 0 ? (totalProfit / salesCount) : 0;
      const avgMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
      return {
        title: title,
        value: gameMetrics[title][metric],
        imageUrl: gameMetrics[title].imageUrl,
        salesCount: salesCount,
        avgProfit: avgProfit,
        avgMargin: avgMargin
      };
    })
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);

  // Update card header title dynamically
  const cardTitle = document.getElementById("bestsellers-chart-title");
  if (cardTitle) {
    const metricLabel = metric === 'profit' ? 'Net Profit' : (metric === 'revenue' ? 'Revenue' : 'Sales Volume');
    cardTitle.textContent = `Top ${limit} Bestselling Games by ${metricLabel}`;
  }

  if (sortedGames.length === 0) {
    container.innerHTML = `<div class="text-muted text-center" style="padding: 24px;">No sales recorded for the selected filters.</div>`;
    return;
  }

  const maxVal = sortedGames[0].value || 1; // Prevent division by zero

  // Color the progress bars based on the metric
  let barColor = 'var(--accent-purple)';
  let valueFormatter = (val) => `€${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  if (metric === 'revenue') {
    barColor = 'var(--accent-cyan)';
  } else if (metric === 'sales') {
    barColor = 'var(--accent-emerald)';
    valueFormatter = (val) => `${val} unit${val === 1 ? '' : 's'}`;
  }

  let html = '';
  sortedGames.forEach((game, index) => {
    const rank = index + 1;
    let rankClass = '';
    if (rank === 1) rankClass = 'rank-1';
    else if (rank === 2) rankClass = 'rank-2';
    else if (rank === 3) rankClass = 'rank-3';

    // Calculate percentage relative to the best game
    const pct = Math.max(2, Math.round((game.value / maxVal) * 100));

    // Generate initials for placeholder
    const initials = game.title.split(" ").map(w => w[0]).join("").slice(0, 3).toUpperCase();
    const imageHTML = game.imageUrl 
      ? `<img src="${game.imageUrl}" class="game-thumbnail" alt="${game.title}" style="width: 32px; height: 32px; min-width: 32px; border-radius: var(--radius-sm); object-fit: cover; border: 1px solid var(--border-color); background-color: var(--bg-input);">`
      : `<div class="game-thumbnail-placeholder" style="width: 32px; height: 32px; min-width: 32px; border-radius: var(--radius-sm); font-size: 0.75rem; background: linear-gradient(135deg, var(--accent-purple), var(--accent-cyan)); display: flex; align-items: center; justify-content: center; font-weight: 700; color: #fff;">${initials}</div>`;

    html += `
      <div class="bestseller-item">
        <!-- Left Side: Rank, Logo/Placeholder, and Title -->
        <div style="display: flex; align-items: center; gap: 12px; min-width: 0; flex: 1;">
          <div class="bestseller-rank-badge ${rankClass}">
            ${rank <= 3 ? `<i class="fa-solid fa-trophy" style="font-size: 0.75rem;"></i>` : rank}
          </div>
          ${imageHTML}
          <div class="bestseller-title-wrap" style="min-width: 0; display: flex; flex-direction: column; gap: 2px;">
            <span class="bestseller-title" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: block;" title="${game.title}">${game.title}</span>
            <div class="bestseller-labels-container">
              <span class="bestseller-label bestseller-label-sales">
                <i class="fa-solid fa-cart-shopping" style="font-size: 0.65rem;"></i>
                ${game.salesCount} sold
              </span>
              <span class="bestseller-label bestseller-label-profit">
                <i class="fa-solid fa-coins" style="font-size: 0.65rem;"></i>
                Avg. Profit: €${game.avgProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span class="bestseller-label bestseller-label-margin">
                <i class="fa-solid fa-chart-line" style="font-size: 0.65rem;"></i>
                Margin: ${game.avgMargin.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>

        <!-- Right Side: Progress Bar and Value -->
        <div class="bestseller-progress-container" style="flex-shrink: 0; display: flex; align-items: center; gap: 12px;">
          <div class="bestseller-progress-bg">
            <div class="bestseller-progress-fill" style="width: ${pct}%; background-color: ${barColor};"></div>
          </div>
          <span class="bestseller-metric-val">${valueFormatter(game.value)}</span>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

function renderStockSpeedChart(filteredInventoryList, filteredSalesList) {
  if (typeof Chart === 'undefined') return;
  const canvas = document.getElementById("stockSpeedChart");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  if (stockSpeedChartInstance) {
    try { stockSpeedChartInstance.destroy(); } catch (e) { console.error(e); }
  }

  const wSales = getWidgetFilteredSales("stockSpeed", filteredSalesList);

  // Group sold items by how fast they sold
  const invMap = new Map();
  state.inventory.forEach(item => {
    if (item.id) invMap.set(item.id, item.purchaseDate);
  });

  let fast = 0; // < 7 days
  let moderate = 0; // 7-30 days
  let slow = 0; // 30-90 days
  let stale = 0; // 90+ days

  wSales.forEach(sale => {
    const purchaseDateStr = invMap.get(sale.inventoryId);
    if (purchaseDateStr && sale.saleDate) {
      const pDate = new Date(purchaseDateStr);
      const sDate = new Date(sale.saleDate);
      pDate.setHours(0,0,0,0);
      sDate.setHours(0,0,0,0);
      const diffTime = Math.max(0, sDate - pDate);
      const days = Math.round(diffTime / (1000 * 60 * 60 * 24));
      if (days < 7) fast++;
      else if (days <= 30) moderate++;
      else if (days <= 90) slow++;
      else stale++;
    }
  });

  const labels = ["Fast (< 7 days)", "Moderate (7-30 days)", "Slow (30-90 days)", "Stale (90+ days)"];
  const data = [fast, moderate, slow, stale];

  const rootStyle = getComputedStyle(document.documentElement);
  const textSecondaryColor = rootStyle.getPropertyValue('--text-secondary').trim() || 'hsl(220, 12%, 65%)';
  const bgCardColor = rootStyle.getPropertyValue('--bg-card').trim() || 'hsl(224, 22%, 12%)';
  const borderColor = rootStyle.getPropertyValue('--border-color').trim() || 'hsla(224, 20%, 30%, 0.5)';
  const tooltipBg = rootStyle.getPropertyValue('--bg-sidebar').trim() || 'hsl(224, 25%, 10%)';

  const accentTeal = rootStyle.getPropertyValue('--accent-teal').trim() || 'hsl(175, 90%, 48%)';
  const accentCyan = rootStyle.getPropertyValue('--accent-cyan').trim() || 'hsl(195, 90%, 50%)';
  const accentWarning = rootStyle.getPropertyValue('--accent-warning').trim() || 'hsl(40, 95%, 55%)';
  const accentDanger = rootStyle.getPropertyValue('--accent-danger').trim() || 'hsl(355, 85%, 55%)';

  const backgroundColors = [accentTeal, accentCyan, accentWarning, accentDanger];

  const wType = (state.widgetSettings && state.widgetSettings.stockSpeed && state.widgetSettings.stockSpeed.chartType) || 'doughnut';

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          color: textSecondaryColor,
          font: { family: 'Inter', size: 10 },
          boxWidth: 12
        }
      },
      tooltip: {
        backgroundColor: tooltipBg,
        titleColor: state.themeMode !== "light" ? "#fff" : "#000",
        bodyColor: state.themeMode !== "light" ? "#fff" : "#000",
        borderColor: borderColor,
        borderWidth: 1
      }
    }
  };

  if (wType === 'bar') {
    options.scales = {
      x: { grid: { display: false }, ticks: { color: textSecondaryColor } },
      y: { grid: { color: borderColor }, ticks: { color: textSecondaryColor, beginAtZero: true } }
    };
  }

  stockSpeedChartInstance = new Chart(ctx, {
    type: wType,
    data: {
      labels: labels,
      datasets: [{
        data: data,
        backgroundColor: backgroundColors,
        borderWidth: 2,
        borderColor: bgCardColor,
        hoverOffset: 4
      }]
    },
    options: options
  });
}

function renderSalesFeedWidget(filteredSalesList) {
  const container = document.getElementById("sales-feed-list");
  if (!container) return;

  const cfg = state.widgetSettings ? state.widgetSettings.salesFeed : null;
  const limit = cfg ? parseInt(cfg.limit) : 5;
  const wSales = getWidgetFilteredSales("salesFeed", filteredSalesList);

  const sortedSales = [...wSales].sort((a, b) => new Date(b.saleDate || 0) - new Date(a.saleDate || 0)).slice(0, limit);

  if (sortedSales.length === 0) {
    container.innerHTML = `<div class="text-muted text-center" style="padding: 24px;">No recent sales transactions.</div>`;
    return;
  }

  const imgUrlByTitle = {};
  state.inventory.forEach(item => {
    if (item.imageUrl && item.title) {
      imgUrlByTitle[item.title.trim().toLowerCase()] = item.imageUrl;
    }
  });

  let html = '';
  sortedSales.forEach(sale => {
    const title = sale.title || "Unknown Game";
    const imageUrl = sale.imageUrl || imgUrlByTitle[title.trim().toLowerCase()];
    const profitStr = formatCurrency(sale.profit);
    const profitClass = sale.profit >= 0 ? "text-success-neon" : "text-danger-soft";
    
    const initials = title.split(" ").map(w => w[0]).join("").slice(0, 3).toUpperCase();
    const thumbHTML = imageUrl
      ? `<img src="${escapeHTML(imageUrl)}" class="sales-feed-thumb" alt="${escapeHTML(title)}">`
      : `<div class="sales-feed-thumb-placeholder">${escapeHTML(initials)}</div>`;

    const formattedDate = sale.saleDate ? new Date(sale.saleDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : "-";

    html += `
      <div class="sales-feed-item">
        ${thumbHTML}
        <div class="sales-feed-info">
          <span class="sales-feed-title" title="${escapeHTML(title)}">${escapeHTML(title)}</span>
          <div class="sales-feed-meta">
            <span class="sales-feed-platform"><i class="fa-solid fa-gamepad"></i> ${escapeHTML(sale.platformSold || "Store")}</span>
            <span>•</span>
            <span>${formattedDate}</span>
          </div>
        </div>
        <div class="sales-feed-pricing">
          <span class="sales-feed-price">${formatCurrency(sale.sellPrice)}</span>
          <span class="sales-feed-profit ${profitClass}">${sale.profit >= 0 ? '+' : ''}${profitStr}</span>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

function renderFinanceTrackerWidget(filteredSalesList) {
  const container = document.getElementById("finance-tracker-card");
  if (!container) return;

  const wSales = getWidgetFilteredSales("financeTracker", filteredSalesList);

  const now = new Date();
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  
  const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonthStr = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, '0')}`;

  let curRevenue = 0, curCost = 0, curProfit = 0, curSales = 0;
  let prevRevenue = 0, prevCost = 0, prevProfit = 0, prevSales = 0;

  wSales.forEach(sale => {
    if (!sale.saleDate) return;
    const month = sale.saleDate.substring(0, 7);
    if (month === currentMonthStr) {
      curRevenue += sale.sellPrice;
      curCost += sale.cost;
      curProfit += sale.profit;
      curSales++;
    } else if (month === prevMonthStr) {
      prevRevenue += sale.sellPrice;
      prevCost += sale.cost;
      prevProfit += sale.profit;
      prevSales++;
    }
  });

  let curPayouts = 0;
  let prevPayouts = 0;
  if (state.payouts && Array.isArray(state.payouts)) {
    state.payouts.forEach(p => {
      if (!p.date) return;
      const month = p.date.substring(0, 7);
      const amt = parseFloat(p.amount) || 0;
      if (month === currentMonthStr) {
        curPayouts += amt;
      } else if (month === prevMonthStr) {
        prevPayouts += amt;
      }
    });
  }

  let curExpenses = curCost;
  let prevExpenses = prevCost;
  
  if (state.expenses && Array.isArray(state.expenses)) {
    state.expenses.forEach(e => {
      if (!e.date) return;
      const month = e.date.substring(0, 7);
      const amt = parseFloat(e.amount) || 0;
      if (month === currentMonthStr) {
        curExpenses += amt;
        curProfit -= amt;
      } else if (month === prevMonthStr) {
        prevExpenses += amt;
        prevProfit -= amt;
      }
    });
  }

  const curMargin = curRevenue > 0 ? (curProfit / curRevenue) * 100 : 0;
  const prevMargin = prevRevenue > 0 ? (prevProfit / prevRevenue) * 100 : 0;

  const formatTrend = (cur, prev, isCurrency = true) => {
    const diff = cur - prev;
    if (diff === 0) return `<span class="finance-trend-indicator text-muted">-</span>`;
    const label = isCurrency ? formatCurrency(Math.abs(diff)) : `${Math.abs(diff).toFixed(1)}%`;
    if (diff > 0) {
      return `<span class="finance-trend-indicator finance-trend-up"><i class="fa-solid fa-arrow-up"></i> ${label}</span>`;
    } else {
      return `<span class="finance-trend-indicator finance-trend-down"><i class="fa-solid fa-arrow-down"></i> ${label}</span>`;
    }
  };

  const currentMonthName = now.toLocaleString('en-US', { month: 'long' });

  container.innerHTML = `
    <table class="finance-tracker-table">
      <thead>
        <tr>
          <th>Metric (${now.getFullYear()})</th>
          <th>${currentMonthName.slice(0,3)}</th>
          <th>Trend vs Prev</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>Gross Revenue</strong></td>
          <td>${formatCurrency(curRevenue)}</td>
          <td>${formatTrend(curRevenue, prevRevenue)}</td>
        </tr>
        <tr>
          <td><strong>Total Costs/Fees</strong></td>
          <td>${formatCurrency(curExpenses)}</td>
          <td>${formatTrend(curExpenses, prevExpenses)}</td>
        </tr>
        <tr>
          <td><strong>Net Net Profit</strong></td>
          <td class="${curProfit >= 0 ? 'text-success-neon' : 'text-danger-soft'}"><strong>${formatCurrency(curProfit)}</strong></td>
          <td>${formatTrend(curProfit, prevProfit)}</td>
        </tr>
        <tr>
          <td><strong>Net Margin %</strong></td>
          <td><span class="finance-margin-badge">${curMargin.toFixed(1)}%</span></td>
          <td>${formatTrend(curMargin, prevMargin, false)}</td>
        </tr>
        <tr>
          <td><strong>Payouts Collected</strong></td>
          <td>${formatCurrency(curPayouts)}</td>
          <td>${formatTrend(curPayouts, prevPayouts)}</td>
        </tr>
      </tbody>
    </table>
  `;
}

function renderMarkupAnalysisChart(filteredInventoryList) {
  if (typeof Chart === 'undefined') return;
  const canvas = document.getElementById("markupAnalysisChart");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  if (markupAnalysisChartInstance) {
    try { markupAnalysisChartInstance.destroy(); } catch (e) { console.error(e); }
  }

  const wInventory = getWidgetFilteredInventory("markupAnalysis", filteredInventoryList);

  const cfg = state.widgetSettings ? state.widgetSettings.markupAnalysis : null;
  const groupBy = cfg ? cfg.groupBy : "publisher";

  const groups = {};

  const salesMap = new Map();
  state.sales.forEach(sale => {
    if (sale.inventoryId) {
      salesMap.set(sale.inventoryId, sale.sellPrice);
    }
  });

  wInventory.forEach(item => {
    const keyVal = (groupBy === "publisher" ? (item.publisher || "No Publisher") : (item.source || "No Supplier")).trim();
    if (!groups[keyVal]) {
      groups[keyVal] = { totalCost: 0, totalSell: 0, count: 0 };
    }

    const cost = item.cost || 0;
    const sellPrice = salesMap.has(item.id) ? salesMap.get(item.id) : (cost * 1.3);

    groups[keyVal].totalCost += cost;
    groups[keyVal].totalSell += sellPrice;
    groups[keyVal].count++;
  });

  const sortedKeys = Object.keys(groups)
    .sort((a, b) => groups[b].count - groups[a].count)
    .slice(0, 6);

  const labels = [];
  const avgCostData = [];
  const avgSellData = [];
  const avgMarkupData = [];

  sortedKeys.forEach(k => {
    const g = groups[k];
    const avgCost = g.count > 0 ? (g.totalCost / g.count) : 0;
    const avgSell = g.count > 0 ? (g.totalSell / g.count) : 0;
    const markup = avgCost > 0 ? ((avgSell - avgCost) / avgCost) * 100 : 0;

    labels.push(k.length > 15 ? k.slice(0, 15) + "..." : k);
    avgCostData.push(avgCost);
    avgSellData.push(avgSell);
    avgMarkupData.push(markup);
  });

  if (labels.length === 0) {
    labels.push("No Data");
    avgCostData.push(0);
    avgSellData.push(0);
    avgMarkupData.push(0);
  }

  const rootStyle = getComputedStyle(document.documentElement);
  const textSecondaryColor = rootStyle.getPropertyValue('--text-secondary').trim() || 'hsl(220, 12%, 65%)';
  const borderColor = rootStyle.getPropertyValue('--border-color').trim() || 'hsla(224, 20%, 25%, 0.15)';
  const tooltipBg = rootStyle.getPropertyValue('--bg-sidebar').trim() || 'hsl(224, 25%, 10%)';

  const accentPink = rootStyle.getPropertyValue('--accent-pink').trim() || 'hsl(330, 95%, 60%)';
  const accentTeal = rootStyle.getPropertyValue('--accent-teal').trim() || 'hsl(175, 90%, 48%)';
  const accentCyan = rootStyle.getPropertyValue('--accent-cyan').trim() || 'hsl(195, 90%, 50%)';

  const wType = (cfg && cfg.chartType) || "bar";

  markupAnalysisChartInstance = new Chart(ctx, {
    type: wType,
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Avg. Cost',
          data: avgCostData,
          backgroundColor: 'hsla(330, 95%, 60%, 0.25)',
          borderColor: accentPink,
          borderWidth: 1.5,
          yAxisID: 'y'
        },
        {
          label: 'Avg. List Price',
          data: avgSellData,
          backgroundColor: 'hsla(175, 90%, 48%, 0.25)',
          borderColor: accentTeal,
          borderWidth: 1.5,
          yAxisID: 'y'
        },
        {
          label: 'Avg. Markup %',
          data: avgMarkupData,
          backgroundColor: 'hsla(195, 90%, 50%, 0.1)',
          borderColor: accentCyan,
          borderWidth: 2,
          type: 'line',
          tension: 0.3,
          yAxisID: 'yPercentage'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: { color: textSecondaryColor, font: { family: 'Inter', size: 10 } }
        },
        tooltip: {
          backgroundColor: tooltipBg,
          titleColor: state.themeMode !== "light" ? "#fff" : "#000",
          bodyColor: state.themeMode !== "light" ? "#fff" : "#000",
          borderColor: borderColor,
          borderWidth: 1
        }
      },
      scales: {
        x: { grid: { display: false }, ticks: { color: textSecondaryColor } },
        y: {
          position: 'left',
          grid: { color: borderColor },
          ticks: {
            color: textSecondaryColor,
            callback: function(value) { return (state.currency === 'USD' ? '$' : '€') + value; }
          }
        },
        yPercentage: {
          position: 'right',
          grid: { drawOnChartArea: false },
          ticks: {
            color: textSecondaryColor,
            callback: function(value) { return value + '%'; }
          }
        }
      }
    }
  });
}

function renderStockTurnoverChart(filteredInventoryList, filteredSalesList) {
  if (typeof Chart === 'undefined') return;
  const canvas = document.getElementById("stockTurnoverChart");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  if (stockTurnoverChartInstance) {
    try { stockTurnoverChartInstance.destroy(); } catch (e) { console.error(e); }
  }

  const wSales = getWidgetFilteredSales("stockTurnover", filteredSalesList);
  const wInventory = getWidgetFilteredInventory("stockTurnover", filteredInventoryList);

  const activityByDate = {};

  wInventory.forEach(item => {
    if (!item.dateAdded) return;
    const dateStr = item.dateAdded.substring(0, 10);
    if (!activityByDate[dateStr]) {
      activityByDate[dateStr] = { bought: 0, sold: 0 };
    }
    activityByDate[dateStr].bought++;
  });

  wSales.forEach(sale => {
    if (!sale.saleDate) return;
    const dateStr = sale.saleDate.substring(0, 10);
    if (!activityByDate[dateStr]) {
      activityByDate[dateStr] = { bought: 0, sold: 0 };
    }
    activityByDate[dateStr].sold++;
  });

  const sortedDates = Object.keys(activityByDate).sort((a, b) => new Date(a) - new Date(b));

  const labels = sortedDates.map(d => {
    const opt = { month: 'short', day: 'numeric' };
    return new Date(d).toLocaleDateString('en-US', opt);
  });
  const boughtData = sortedDates.map(d => activityByDate[d].bought);
  const soldData = sortedDates.map(d => activityByDate[d].sold);

  if (sortedDates.length === 0) {
    labels.push("No Activity");
    boughtData.push(0);
    soldData.push(0);
  }

  const rootStyle = getComputedStyle(document.documentElement);
  const textSecondaryColor = rootStyle.getPropertyValue('--text-secondary').trim() || 'hsl(220, 12%, 65%)';
  const borderColor = rootStyle.getPropertyValue('--border-color').trim() || 'hsla(224, 20%, 25%, 0.15)';
  const tooltipBg = rootStyle.getPropertyValue('--bg-sidebar').trim() || 'hsl(224, 25%, 10%)';

  const accentCyan = rootStyle.getPropertyValue('--accent-cyan').trim() || 'hsl(195, 90%, 50%)';
  const accentTeal = rootStyle.getPropertyValue('--accent-teal').trim() || 'hsl(175, 90%, 48%)';

  const wType = (state.widgetSettings && state.widgetSettings.stockTurnover && state.widgetSettings.stockTurnover.chartType) || 'line';

  stockTurnoverChartInstance = new Chart(ctx, {
    type: wType,
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Keys Purchased',
          data: boughtData,
          borderColor: accentCyan,
          backgroundColor: 'hsla(195, 90%, 50%, 0.15)',
          borderWidth: 2.5,
          tension: 0.35,
          fill: true
        },
        {
          label: 'Keys Sold',
          data: soldData,
          borderColor: accentTeal,
          backgroundColor: 'hsla(175, 90%, 48%, 0.15)',
          borderWidth: 2.5,
          tension: 0.35,
          fill: true
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: { color: textSecondaryColor, font: { family: 'Inter', size: 10 } }
        },
        tooltip: {
          backgroundColor: tooltipBg,
          titleColor: state.themeMode !== "light" ? "#fff" : "#000",
          bodyColor: state.themeMode !== "light" ? "#fff" : "#000",
          borderColor: borderColor,
          borderWidth: 1
        }
      },
      scales: {
        x: { grid: { display: false }, ticks: { color: textSecondaryColor } },
        y: {
          grid: { color: borderColor },
          ticks: { color: textSecondaryColor, stepSize: 1, beginAtZero: true }
        }
      }
    }
  });
}

// ==========================================================================
// IMPORT & EXPORT DATA UTILITIES
// ==========================================================================

// Quote-aware CSV line parser
function parseCSVLine(text) {
  let p = '', r = [];
  let q = false;
  for (let i = 0; i < text.length; i++) {
    let c = text[i];
    if (c === '"') {
      if (q && text[i+1] === '"') {
        p += '"'; i++;
      } else {
        q = !q;
      }
    } else if (c === ',' && !q) {
      r.push(p.trim());
      p = '';
    } else if ((c === '\r' || c === '\n') && !q) {
      // Skip newlines
    } else {
      p += c;
    }
  }
  r.push(p.trim());
  return r;
}

// CSV Import Wizard State
let wizardFile = null;
let wizardHeaders = [];
let wizardLines = [];
let wizardStep = 1;
let wizardMappings = {};

const DB_FIELDS = [
  { key: 'title', label: 'Game Title', required: true, desc: 'Title of the game' },
  { key: 'key', label: 'Digital Key', required: true, desc: 'Unique digital activation key' },
  { key: 'platform', label: 'Platform', required: false, defaultValue: 'Steam', desc: 'e.g. Steam, GOG, PS5' },
  { key: 'cost', label: 'Acquisition Cost', required: false, defaultValue: '0.00', desc: 'Price paid for the key' },
  { key: 'source', label: 'Supplier / Vendor', required: false, defaultValue: 'Direct', desc: 'Where the key was bought' },
  { key: 'purchaseDate', label: 'Purchase Date', required: false, defaultValue: 'Today', desc: 'Acquisition date' },
  { key: 'status', label: 'Status', required: false, defaultValue: 'Available', desc: 'e.g. Available, Sold, Rejected' },
  { key: 'publisher', label: 'Publisher', required: false, defaultValue: '', desc: 'Publisher of the game' },
  { key: 'notes', label: 'Notes', required: false, defaultValue: '', desc: 'Additional notes or comments' }
];

function initCSVImportWizard() {
  const resetWizard = () => {
    wizardFile = null;
    wizardHeaders = [];
    wizardLines = [];
    wizardStep = 1;
    wizardMappings = {};
    
    // UI resets
    const fileInput = document.getElementById("csv-wizard-file-input");
    if (fileInput) fileInput.value = "";
    
    const fileInfo = document.getElementById("csv-file-info");
    if (fileInfo) fileInfo.style.display = "none";
    
    const dropZone = document.getElementById("csv-drop-zone");
    if (dropZone) dropZone.style.display = "block";
    
    const backBtn = document.getElementById("btn-import-wizard-back");
    if (backBtn) backBtn.style.visibility = "hidden";
    
    const nextBtn = document.getElementById("btn-import-wizard-next");
    if (nextBtn) {
      nextBtn.textContent = "Next";
      nextBtn.disabled = true;
    }
    
    // Show step 1, hide others
    const s1 = document.getElementById("import-wizard-section-1");
    if (s1) s1.style.display = "block";
    
    const s2 = document.getElementById("import-wizard-section-2");
    if (s2) s2.style.display = "none";
    
    const s3 = document.getElementById("import-wizard-section-3");
    if (s3) s3.style.display = "none";
    
    updateStepIndicators(1);
  };

  const updateStepIndicators = (step) => {
    for (let i = 1; i <= 3; i++) {
      const ind = document.getElementById(`import-step-${i}-indicator`);
      if (ind) {
        const num = ind.querySelector(".step-num");
        if (i === step) {
          ind.style.color = "var(--accent-purple)";
          if (num) {
            num.style.background = "var(--accent-purple)";
            num.style.color = "white";
          }
          ind.style.fontWeight = "600";
        } else if (i < step) {
          ind.style.color = "var(--text-teal)";
          if (num) {
            num.style.background = "var(--text-teal)";
            num.style.color = "white";
          }
          ind.style.fontWeight = "500";
        } else {
          ind.style.color = "var(--text-muted)";
          if (num) {
            num.style.background = "var(--border-color)";
            num.style.color = "var(--text-muted)";
          }
          ind.style.fontWeight = "500";
        }
      }
    }
  };

  // Bind trigger on inventory view import button
  const btnImport = document.getElementById("btn-import-inventory");
  if (btnImport) {
    btnImport.addEventListener("click", () => {
      resetWizard();
      openModal("csv-import-wizard-modal");
    });
  }

  // File selection / drag drop handlers
  const fileInput = document.getElementById("csv-wizard-file-input");
  const dropZone = document.getElementById("csv-drop-zone");
  const browseBtn = document.getElementById("btn-browse-csv");
  const removeBtn = document.getElementById("btn-remove-csv");

  if (browseBtn && fileInput) {
    browseBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      fileInput.click();
    });
  }

  if (dropZone && fileInput) {
    dropZone.addEventListener("click", () => {
      fileInput.click();
    });
    dropZone.addEventListener("dragover", (e) => {
      e.preventDefault();
      dropZone.style.borderColor = "var(--accent-purple)";
      dropZone.style.background = "rgba(139, 92, 246, 0.05)";
    });
    dropZone.addEventListener("dragleave", () => {
      dropZone.style.borderColor = "var(--border-color)";
      dropZone.style.background = "var(--bg-card)";
    });
    dropZone.addEventListener("drop", (e) => {
      e.preventDefault();
      dropZone.style.borderColor = "var(--border-color)";
      dropZone.style.background = "var(--bg-card)";
      if (e.dataTransfer.files.length > 0) {
        handleFileSelected(e.dataTransfer.files[0]);
      }
    });
  }

  if (fileInput) {
    fileInput.addEventListener("change", (e) => {
      if (e.target.files.length > 0) {
        handleFileSelected(e.target.files[0]);
      }
    });
  }

  if (removeBtn) {
    removeBtn.addEventListener("click", () => {
      resetWizard();
    });
  }

  const handleFileSelected = (file) => {
    if (!file.name.endsWith(".csv")) {
      showToast("Only CSV files are supported.", "error");
      return;
    }
    wizardFile = file;
    const fName = document.getElementById("csv-file-name");
    const fSize = document.getElementById("csv-file-size");
    const drop = document.getElementById("csv-drop-zone");
    const info = document.getElementById("csv-file-info");
    const nextBtn = document.getElementById("btn-import-wizard-next");

    if (fName) fName.textContent = file.name;
    if (fSize) fSize.textContent = (file.size / 1024).toFixed(2) + " KB";
    if (drop) drop.style.display = "none";
    if (info) info.style.display = "flex";
    
    // Read headers
    const reader = new FileReader();
    reader.onload = function(e) {
      const text = e.target.result;
      wizardLines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l !== "");
      if (wizardLines.length < 2) {
        showToast("CSV file is empty or lacks data rows.", "error");
        resetWizard();
        return;
      }
      wizardHeaders = parseCSVLine(wizardLines[0]);
      if (nextBtn) nextBtn.disabled = false;
    };
    reader.readAsText(file);
  };

  const buildMappingUI = () => {
    const tbody = document.getElementById("csv-mapping-tbody");
    if (!tbody) return;
    tbody.innerHTML = "";
    
    DB_FIELDS.forEach(field => {
      const tr = document.createElement("tr");
      
      // DB Field Name cell
      const tdLabel = document.createElement("td");
      tdLabel.style.verticalAlign = "middle";
      tdLabel.innerHTML = `<strong style="color: var(--text-main);">${field.label}</strong> ${field.required ? '<span class="text-danger">*</span>' : ''}<br><small style="color: var(--text-muted); font-size: 0.75rem;">${field.desc}</small>`;
      
      // Dropdown cell
      const tdSelect = document.createElement("td");
      tdSelect.style.verticalAlign = "middle";
      
      const select = document.createElement("select");
      select.className = "form-control form-control-sm select-csv-map";
      select.setAttribute("data-db-field", field.key);
      select.style.background = "var(--bg-input)";
      select.style.color = "var(--text-main)";
      select.style.borderColor = "var(--border-color)";
      
      // Unmapped Option
      const optDefault = document.createElement("option");
      optDefault.value = "";
      optDefault.textContent = field.required ? "-- Select CSV Column --" : "[Don't Import / Set Default]";
      select.appendChild(optDefault);
      
      // CSV Column Options
      let autoSelectIndex = -1;
      wizardHeaders.forEach((header, idx) => {
        const opt = document.createElement("option");
        opt.value = idx;
        opt.textContent = `${header} (Col ${idx + 1})`;
        select.appendChild(opt);
        
        // Auto-mapping check
        const hClean = header.trim().toLowerCase();
        const fKey = field.key.toLowerCase();
        const fLabel = field.label.toLowerCase();
        
        if (hClean === fKey || hClean === fLabel) {
          autoSelectIndex = idx;
        } else if (fKey === "title" && (hClean === "game title" || hClean === "game" || hClean === "name")) {
          autoSelectIndex = idx;
        } else if (fKey === "key" && (hClean === "digital key" || hClean === "game key" || hClean === "serial" || hClean === "code")) {
          autoSelectIndex = idx;
        } else if (fKey === "purchasedate" && (hClean === "date added" || hClean === "purchase date" || hClean === "date" || hClean === "entry date")) {
          autoSelectIndex = idx;
        } else if (fKey === "cost" && (hClean === "acquisition cost" || hClean === "price" || hClean === "buy price")) {
          autoSelectIndex = idx;
        } else if (fKey === "source" && (hClean === "vendor" || hClean === "supplier")) {
          autoSelectIndex = idx;
        }
      });
      
      if (autoSelectIndex !== -1) {
        select.value = autoSelectIndex;
      }
      
      tdSelect.appendChild(select);
      
      // Default Value cell
      const tdDefault = document.createElement("td");
      tdDefault.style.verticalAlign = "middle";
      if (field.required) {
        tdDefault.innerHTML = `<span style="font-size: 0.8rem; color: var(--text-muted);">Required Field</span>`;
      } else {
        tdDefault.innerHTML = `<input type="text" class="form-control form-control-sm input-csv-default" data-db-field="${field.key}" value="${field.defaultValue}" style="max-width: 150px; background: var(--bg-input); color: var(--text-main); border-color: var(--border-color);">`;
      }
      
      tr.appendChild(tdLabel);
      tr.appendChild(tdSelect);
      tr.appendChild(tdDefault);
      tbody.appendChild(tr);
    });

    // Add event listener to check mapping validation
    document.querySelectorAll(".select-csv-map").forEach(sel => {
      sel.addEventListener("change", validateMapping);
    });
    
    validateMapping();
  };

  const validateMapping = () => {
    let titleMapped = false;
    let keyMapped = false;
    
    document.querySelectorAll(".select-csv-map").forEach(sel => {
      const dbField = sel.getAttribute("data-db-field");
      if (dbField === "title" && sel.value !== "") titleMapped = true;
      if (dbField === "key" && sel.value !== "") keyMapped = true;
    });
    
    const warning = document.getElementById("csv-mapping-warning");
    const nextBtn = document.getElementById("btn-import-wizard-next");
    
    if (titleMapped && keyMapped) {
      if (warning) warning.style.display = "none";
      if (nextBtn) nextBtn.disabled = false;
    } else {
      if (warning) warning.style.display = "block";
      if (nextBtn) nextBtn.disabled = true;
    }
  };

  const buildPreviewUI = () => {
    // Read current mappings from select elements
    wizardMappings = {};
    document.querySelectorAll(".select-csv-map").forEach(sel => {
      const dbField = sel.getAttribute("data-db-field");
      wizardMappings[dbField] = sel.value === "" ? -1 : parseInt(sel.value);
    });
    
    // Read default values
    const defaultValues = {};
    document.querySelectorAll(".input-csv-default").forEach(inp => {
      const dbField = inp.getAttribute("data-db-field");
      defaultValues[dbField] = inp.value.trim();
    });
    
    // Build Headers in preview table
    const thead = document.getElementById("csv-preview-thead");
    if (!thead) return;
    thead.innerHTML = "";
    const trHead = document.createElement("tr");
    
    const activeFields = DB_FIELDS.filter(f => wizardMappings[f.key] !== -1);
    
    activeFields.forEach(field => {
      const th = document.createElement("th");
      th.textContent = field.label;
      trHead.appendChild(th);
    });
    thead.appendChild(trHead);
    
    // Build Rows in preview table
    const tbody = document.getElementById("csv-preview-tbody");
    if (!tbody) return;
    tbody.innerHTML = "";
    
    // Show first 5 rows
    const previewRowsCount = Math.min(5, wizardLines.length - 1);
    for (let i = 1; i <= previewRowsCount; i++) {
      const values = parseCSVLine(wizardLines[i]);
      const tr = document.createElement("tr");
      
      activeFields.forEach(field => {
        const td = document.createElement("td");
        const mappedIdx = wizardMappings[field.key];
        let val = values[mappedIdx]?.trim() || "";
        if (!val && !field.required) {
          val = defaultValues[field.key] || "";
        }
        td.textContent = val;
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    }
    
    const totalCountText = document.getElementById("csv-total-rows-count");
    if (totalCountText) totalCountText.textContent = (wizardLines.length - 1).toString();
  };

  const executeImport = async () => {
    // Read mappings
    wizardMappings = {};
    document.querySelectorAll(".select-csv-map").forEach(sel => {
      const dbField = sel.getAttribute("data-db-field");
      wizardMappings[dbField] = sel.value === "" ? -1 : parseInt(sel.value);
    });
    
    // Read default values
    const defaultValues = {};
    document.querySelectorAll(".input-csv-default").forEach(inp => {
      const dbField = inp.getAttribute("data-db-field");
      defaultValues[dbField] = inp.value.trim();
    });

    const importedItems = [];
    const newSuppliers = [];
    const currentSupplierNames = new Set(state.suppliers.map(s => s.name.toLowerCase()));
    const currentPlatformNames = new Set(state.platforms.map(p => p.name.toLowerCase()));
    
    showToast("Processing import...", "info");
    
    for (let i = 1; i < wizardLines.length; i++) {
      const line = wizardLines[i].trim();
      if (!line) continue;
      
      const values = parseCSVLine(line);
      
      const titleIdx = wizardMappings['title'];
      const keyIdx = wizardMappings['key'];
      
      if (values.length < Math.max(titleIdx, keyIdx) + 1) continue;
      
      const title = values[titleIdx]?.trim() || "";
      const key = values[keyIdx]?.trim() || "";
      
      if (!title || !key) continue;
      
      // Extract other mapped values, otherwise fall back to defaults
      const pIdx = wizardMappings['platform'];
      const platform = pIdx !== -1 ? (values[pIdx]?.trim() || defaultValues['platform']) : defaultValues['platform'];
      
      const cIdx = wizardMappings['cost'];
      const costVal = cIdx !== -1 ? values[cIdx] : null;
      const cost = costVal !== null ? (parseFloat(costVal) || 0) : (parseFloat(defaultValues['cost']) || 0);
      
      const sIdx = wizardMappings['source'];
      const source = sIdx !== -1 ? (values[sIdx]?.trim() || defaultValues['source']) : defaultValues['source'];
      
      // Date Added
      const dIdx = wizardMappings['purchaseDate'];
      let purchaseDate = new Date().toISOString().split("T")[0]; // default today
      let dateVal = dIdx !== -1 ? values[dIdx]?.trim() : "";
      if (dateVal) {
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateVal)) {
          purchaseDate = dateVal;
        } else {
          try {
            const parsed = new Date(dateVal);
            if (!isNaN(parsed.getTime())) {
              purchaseDate = parsed.toISOString().split("T")[0];
            }
          } catch(err) {}
        }
      }
      
      const stIdx = wizardMappings['status'];
      const status = stIdx !== -1 ? (values[stIdx]?.trim() || defaultValues['status']) : defaultValues['status'];
      
      const pubIdx = wizardMappings['publisher'];
      const publisher = pubIdx !== -1 ? (values[pubIdx]?.trim() || defaultValues['publisher']) : defaultValues['publisher'];
      
      const nIdx = wizardMappings['notes'];
      const notes = nIdx !== -1 ? (values[nIdx]?.trim() || defaultValues['notes']) : defaultValues['notes'];
      
      const id = "inv_" + Date.now() + "_" + Math.floor(Math.random() * 10000) + "_" + i;
      
      // Check if key already exists to avoid duplicates
      const duplicateIndex = state.inventory.findIndex(item => item.key === key && item.key !== "");
      
      const newItem = {
        id: duplicateIndex !== -1 ? state.inventory[duplicateIndex].id : id,
        title,
        platform,
        key,
        cost,
        source,
        purchaseDate,
        status,
        publisher,
        notes,
        imageUrl: duplicateIndex !== -1 ? (state.inventory[duplicateIndex].imageUrl || "") : ""
      };
      
      if (duplicateIndex !== -1) {
        state.inventory[duplicateIndex] = newItem;
      } else {
        state.inventory.push(newItem);
      }
      importedItems.push(newItem);
      
      // Auto-add new supplier
      const sourceKey = source.toLowerCase();
      if (source && !currentSupplierNames.has(sourceKey)) {
        const newSup = { name: source, dateAdded: Date.now(), color: "purple", enabled: true };
        state.suppliers.push(newSup);
        currentSupplierNames.add(sourceKey);
        newSuppliers.push(newSup);
      }
      
      // Auto-add new platform
      const platKey = platform.toLowerCase();
      if (platform && !currentPlatformNames.has(platKey)) {
        const newPlat = { name: platform, dateAdded: Date.now(), enabled: true };
        state.platforms.push(newPlat);
        currentPlatformNames.add(platKey);
      }
    }
    
    if (importedItems.length === 0) {
      showToast("No valid inventory rows imported.", "warning");
      return;
    }
    
    // Clean up empty database rows
    cleanupEmptyDatabaseRows();
    saveStateToStorage();
    
    // Sync with Supabase
    if (window.supabaseClient) {
      try {
        showToast("Synchronizing imported entries to cloud...", "info");
        // Save suppliers
        for (const s of newSuppliers) {
          await window.supabaseClient.from('suppliers').upsert({
            name: s.name,
            dateAdded: s.dateAdded,
            color: s.color,
            enabled: s.enabled
          });
        }
        // Save inventory
        for (const item of importedItems) {
          await dbSaveInventory(item);
        }
        showToast("Synchronized successfully to cloud!", "success");
      } catch (err) {
        console.error("Error syncing import to Supabase:", err);
        showToast("Imported locally. Failed to sync to cloud database.", "warning");
      }
    }
    
    // Refresh UI
    updateUI();
    closeModal("csv-import-wizard-modal");
    showToast(`Successfully imported ${importedItems.length} items!`, "success");
  };

  const backBtn = document.getElementById("btn-import-wizard-back");
  const nextBtn = document.getElementById("btn-import-wizard-next");

  if (backBtn) {
    // Remove existing listeners
    const newBackBtn = backBtn.cloneNode(true);
    backBtn.parentNode.replaceChild(newBackBtn, backBtn);
    newBackBtn.addEventListener("click", () => {
      if (wizardStep === 2) {
        wizardStep = 1;
        document.getElementById("import-wizard-section-1").style.display = "block";
        document.getElementById("import-wizard-section-2").style.display = "none";
        newBackBtn.style.visibility = "hidden";
        updateStepIndicators(1);
      } else if (wizardStep === 3) {
        wizardStep = 2;
        document.getElementById("import-wizard-section-2").style.display = "block";
        document.getElementById("import-wizard-section-3").style.display = "none";
        if (nextBtn) nextBtn.textContent = "Next";
        updateStepIndicators(2);
      }
    });
  }

  if (nextBtn) {
    // Remove existing listeners
    const newNextBtn = nextBtn.cloneNode(true);
    nextBtn.parentNode.replaceChild(newNextBtn, nextBtn);
    newNextBtn.addEventListener("click", () => {
      const back = document.getElementById("btn-import-wizard-back");
      if (wizardStep === 1) {
        wizardStep = 2;
        document.getElementById("import-wizard-section-1").style.display = "none";
        document.getElementById("import-wizard-section-2").style.display = "block";
        if (back) back.style.visibility = "visible";
        
        buildMappingUI();
        updateStepIndicators(2);
      } else if (wizardStep === 2) {
        wizardStep = 3;
        document.getElementById("import-wizard-section-2").style.display = "none";
        document.getElementById("import-wizard-section-3").style.display = "block";
        newNextBtn.textContent = "Confirm Import";
        
        buildPreviewUI();
        updateStepIndicators(3);
      } else if (wizardStep === 3) {
        executeImport();
      }
    });
  }
}

// Backwards compatible wrapper for direct spreadsheet import
async function importInventoryFromCSV(file) {
  openModal("csv-import-wizard-modal");
  if (typeof initCSVImportWizard === "function") {
    initCSVImportWizard();
  }
  const fileInput = document.getElementById("csv-wizard-file-input");
  if (fileInput) {
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    fileInput.files = dataTransfer.files;
    const event = new Event('change', { bubbles: true });
    fileInput.dispatchEvent(event);
  }
}

function exportAgingReportToCSV() {
  const unsoldKeys = state.inventory.filter(item => item.status !== "Sold");
  if (unsoldKeys.length === 0) {
    showToast("No active inventory stock to run aging reports.", "error");
    return;
  }

  const csvRows = [];
  // Header row
  csvRows.push(["ID", "Game Title", "Platform", "Digital Key", "Acquisition Cost", "Source", "Date Added", "Status", "Age (Days)", "Aging Category"]);

  const nowTime = new Date().setHours(0, 0, 0, 0);

  unsoldKeys.forEach(item => {
    let diffDays = 0;
    if (item.purchaseDate) {
      const start = new Date(item.purchaseDate);
      start.setHours(0, 0, 0, 0);
      diffDays = Math.max(0, Math.round((nowTime - start.getTime()) / (1000 * 60 * 60 * 24)));
    }
    const category = getAgingCategory(item.purchaseDate).name;

    csvRows.push([
      item.id,
      `"${item.title.replace(/"/g, '""')}"`,
      item.platform,
      item.key,
      item.cost.toFixed(2),
      `"${item.source.replace(/"/g, '""')}"`,
      item.purchaseDate,
      item.status,
      diffDays,
      category
    ]);
  });

  downloadCSV(csvRows.join("\n"), "GameVault_Inventory_Aging_Report.csv");
  showToast("Inventory aging report exported to CSV!", "success");
}

function exportInventoryToCSV() {
  if (state.inventory.length === 0) {
    showToast("No stock data to export.", "error");
    return;
  }

  const csvRows = [];
  // Header row
  csvRows.push(["ID", "Game Title", "Platform", "Digital Key", "Acquisition Cost", "Source", "Date Added", "Status", "Notes"]);

  state.inventory.forEach(item => {
    csvRows.push([
      item.id,
      `"${item.title.replace(/"/g, '""')}"`,
      item.platform,
      item.key,
      item.cost.toFixed(2),
      `"${item.source.replace(/"/g, '""')}"`,
      item.purchaseDate,
      item.status,
      `"${(item.notes || "").replace(/"/g, '""')}"`
    ]);
  });

  downloadCSV(csvRows.join("\n"), "GameVault_Inventory_Export.csv");
  showToast("Inventory exported to CSV!", "success");
}

function exportSalesToCSV() {
  if (state.sales.length === 0) {
    showToast("No sales transactions to export.", "error");
    return;
  }

  const csvRows = [];
  // Header row
  csvRows.push(["ID", "Game Title", "Platform", "Cost", "Sale Price", "Platform Sold On", "Net Profit", "Sale Date", "Notes"]);

  state.sales.forEach(sale => {
    csvRows.push([
      sale.id,
      `"${sale.title.replace(/"/g, '""')}"`,
      sale.platform,
      sale.cost.toFixed(2),
      sale.sellPrice.toFixed(2),
      sale.platformSold,
      sale.profit.toFixed(2),
      sale.saleDate,
      `"${(sale.notes || "").replace(/"/g, '""')}"`
    ]);
  });

  downloadCSV(csvRows.join("\n"), "GameVault_SalesLedger_Export.csv");
  showToast("Sales ledger exported to CSV!", "success");
}

function downloadCSV(csvContent, filename) {
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Settings Page Helpers
function applyLogo(logoData) {
  const brandDefault = document.getElementById("brand-logo-default");
  const brandCustom = document.getElementById("brand-logo-custom");
  const brandContainer = document.getElementById("brand-logo-container");
  
  const previewDefault = document.getElementById("preview-logo-default");
  const previewCustom = document.getElementById("preview-logo-custom");

  if (logoData) {
    if (brandDefault) brandDefault.classList.add("hidden");
    if (brandCustom) {
      brandCustom.src = logoData;
      brandCustom.classList.remove("hidden");
    }
    if (brandContainer) {
      brandContainer.style.background = "none";
      brandContainer.style.boxShadow = "none";
    }

    if (previewDefault) previewDefault.classList.add("hidden");
    if (previewCustom) {
      previewCustom.src = logoData;
      previewCustom.classList.remove("hidden");
    }
  } else {
    if (brandDefault) brandDefault.classList.remove("hidden");
    if (brandCustom) {
      brandCustom.src = "";
      brandCustom.classList.add("hidden");
    }
    if (brandContainer) {
      brandContainer.style.background = "linear-gradient(135deg, var(--accent-purple), var(--accent-teal))";
      brandContainer.style.boxShadow = "0 0 15px rgba(270, 85, 60, 0.4)";
    }

    if (previewDefault) previewDefault.classList.remove("hidden");
    if (previewCustom) {
      previewCustom.src = "";
      previewCustom.classList.add("hidden");
    }
  }
}

function updateThemeSelectionCards(mode, color) {
  const modes = ["dark", "light"];
  modes.forEach(m => {
    const el = document.getElementById(`mode-opt-${m}`);
    if (el) {
      el.classList.toggle("active", mode === m);
    }
  });
  
  const colors = ["classic", "ocean", "cyberpunk", "emerald", "amber"];
  colors.forEach(c => {
    const el = document.getElementById(`color-opt-${c}`);
    if (el) {
      el.classList.toggle("active", color === c);
    }
  });
}

// Regional Currency Formatting and UI Sync Helpers
function formatCurrency(value) {
  const val = parseFloat(value) || 0;
  const symbol = state.currency === "USD" ? "$" : "€";
  const sign = val < 0 ? "-" : "";
  const locale = state.currency === "USD" ? "en-US" : "de-DE";
  const formatted = Math.abs(val).toLocaleString(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  return `${sign}${symbol}${formatted}`;
}

function updateCurrencySymbols() {
  const symbols = document.querySelectorAll(".currency-symbol");
  const currencyText = state.currency === "USD" ? "$" : "€";
  symbols.forEach(span => {
    span.textContent = currencyText;
  });

  const icons = document.querySelectorAll(".currency-icon");
  icons.forEach(i => {
    if (state.currency === "USD") {
      i.classList.remove("fa-euro-sign");
      i.classList.add("fa-dollar-sign");
    } else {
      i.classList.remove("fa-dollar-sign");
      i.classList.add("fa-euro-sign");
    }
  });


}

function updateCurrencySelectionCards(curr) {
  const currEur = document.getElementById("curr-opt-eur");
  const currUsd = document.getElementById("curr-opt-usd");
  if (currEur && currUsd) {
    currEur.classList.toggle("active", curr === "EUR");
    currUsd.classList.toggle("active", curr === "USD");
  }
}

// Render dynamic Game Catalog Entries View
function renderEntries() {
  const tbody = DOM["entries-table-body"] || document.getElementById("entries-table-body");
  if (!tbody) return;
  tbody.innerHTML = "";

  // Sync Favorite Filter Button UI state
  const btnFavFilter = document.getElementById("btn-entries-fav-filter");
  const favIcon = document.getElementById("entries-fav-filter-icon");
  if (btnFavFilter) {
    if (state.entriesFilterFav) {
      btnFavFilter.classList.add("btn-fav-active");
      btnFavFilter.classList.remove("btn-outline");
      if (favIcon) favIcon.className = "fa-solid fa-star";
    } else {
      btnFavFilter.classList.add("btn-outline");
      btnFavFilter.classList.remove("btn-fav-active");
      if (favIcon) favIcon.className = "fa-regular fa-star";
    }
  }

  // Get search filter value
  const searchInput = document.getElementById("entries-search-input")?.value.toLowerCase().trim() || "";

  // Pre-index inventory by ID for O(1) lookup
  const inventoryMap = new Map();
  state.inventory.forEach(item => {
    inventoryMap.set(item.id, item);
  });

  // Group inventory and sales by unique game title
  const titleGroups = {};

  // Group inventory data
  state.inventory.forEach(item => {
    const titleKey = item.title.trim().toLowerCase();
    if (!titleGroups[titleKey]) {
      titleGroups[titleKey] = {
        title: item.title.trim(),
        totalAdded: 0,
        availableStock: 0,
        totalSold: 0,
        totalRevenue: 0,
        totalCostOfSold: 0,
        profit: 0,
        imageUrl: item.imageUrl || null,
        publisher: null,
        sellDurations: []
      };
    }
    titleGroups[titleKey].totalAdded++;
    if (item.status === "Available" || item.status === "Reserved") {
      titleGroups[titleKey].availableStock++;
    }
    // Update artwork to latest available image
    if (item.imageUrl) {
      titleGroups[titleKey].imageUrl = item.imageUrl;
    }
    // Track publisher
    if (item.publisher && !titleGroups[titleKey].publisher) {
      titleGroups[titleKey].publisher = String(item.publisher).trim();
    }
  });

  // Group sales data
  state.sales.forEach(sale => {
    const titleKey = sale.title.trim().toLowerCase();
    if (!titleGroups[titleKey]) {
      titleGroups[titleKey] = {
        title: sale.title.trim(),
        totalAdded: 0,
        availableStock: 0,
        totalSold: 0,
        totalRevenue: 0,
        totalCostOfSold: 0,
        profit: 0,
        imageUrl: null,
        publisher: null,
        sellDurations: []
      };
    }
    if (!titleGroups[titleKey].sellDurations) {
      titleGroups[titleKey].sellDurations = [];
    }
    titleGroups[titleKey].totalSold++;
    titleGroups[titleKey].totalRevenue += sale.sellPrice;
    titleGroups[titleKey].totalCostOfSold += sale.cost;
    titleGroups[titleKey].profit += sale.profit;

    // Retrieve corresponding inventory purchaseDate & publisher
    const invItem = inventoryMap.get(sale.inventoryId);
    if (invItem) {
      if (invItem.publisher && !titleGroups[titleKey].publisher) {
        titleGroups[titleKey].publisher = String(invItem.publisher).trim();
      }
      if (invItem.purchaseDate && sale.saleDate) {
        const start = new Date(invItem.purchaseDate);
        const end = new Date(sale.saleDate);
        start.setHours(0, 0, 0, 0);
        end.setHours(0, 0, 0, 0);
        const diffTime = Math.max(0, end - start);
        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
        titleGroups[titleKey].sellDurations.push(diffDays);
      }
    }
  });

  // Convert map to filterable array list
  let entriesList = Object.values(titleGroups);

  // Search filtering
  if (searchInput) {
    entriesList = entriesList.filter(entry => 
      entry.title.toLowerCase().includes(searchInput) ||
      String(entry.publisher || "").toLowerCase().includes(searchInput)
    );
  }

  // Favorites filtering
  if (state.entriesFilterFav) {
    entriesList = entriesList.filter(entry => 
      state.favoriteGames && state.favoriteGames.includes(entry.title)
    );
  }

  // Sort alphabetically (prioritize favorites to the top)
  entriesList.sort((a, b) => {
    const aFav = state.favoriteGames && state.favoriteGames.includes(a.title);
    const bFav = state.favoriteGames && state.favoriteGames.includes(b.title);
    if (aFav && !bFav) return -1;
    if (!aFav && bFav) return 1;
    return a.title.localeCompare(b.title);
  });

  // Pagination Logic for Entries
  const totalPages = Math.ceil(entriesList.length / state.entriesPageSize) || 1;
  if (state.entriesCurrentPage > totalPages) {
    state.entriesCurrentPage = totalPages;
  }
  if (state.entriesCurrentPage < 1) {
    state.entriesCurrentPage = 1;
  }

  const startIndex = (state.entriesCurrentPage - 1) * state.entriesPageSize;
  const endIndex = startIndex + state.entriesPageSize;
  const paginatedEntriesList = entriesList.slice(startIndex, endIndex);

  // Draw entries rows
  paginatedEntriesList.forEach(entry => {
    const tr = document.createElement("tr");
    tr.style.cursor = "pointer";
    tr.setAttribute("title", "Double-click to view all keys for this game");
    tr.addEventListener("dblclick", () => {
      triggerViewCatalogKeys(entry.title);
    });

    // ROI = Net Profit / Cost of Sold Keys * 100
    const roiPercentage = entry.totalCostOfSold > 0 ? (entry.profit / entry.totalCostOfSold) * 100 : 0;
    const marginPercentage = entry.totalRevenue > 0 ? (entry.profit / entry.totalRevenue) * 100 : 0;

    const initials = entry.title.split(" ").map(w => w[0]).join("").slice(0, 3);
    
    const publisherSubtitle = entry.publisher 
      ? `<div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 2px;"><i class="fa-solid fa-building" style="font-size: 0.7rem; opacity: 0.7; margin-right: 4px;"></i>${escapeHTML(entry.publisher)}</div>` 
      : `<div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 2px; font-style: italic;"><i class="fa-solid fa-building" style="font-size: 0.7rem; opacity: 0.5; margin-right: 4px;"></i>No Publisher</div>`;

    const safeTitle = entry.title.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '&quot;');
    const isFav = state.favoriteGames && state.favoriteGames.includes(entry.title);
    const starColor = isFav ? "var(--accent-warning)" : "var(--text-muted)";
    const starIconClass = isFav ? "fa-solid fa-star" : "fa-regular fa-star";
    const starBtn = `
      <button class="btn-fav" onclick="event.stopPropagation(); toggleFavoriteGame('${safeTitle}')" style="background: none; border: none; cursor: pointer; color: ${starColor}; font-size: 0.9rem; padding: 2px 4px; display: inline-flex; align-items: center; justify-content: center; transition: transform 0.15s ease;" title="${isFav ? 'Remove from Favorites' : 'Add to Favorites'}">
        <i class="${starIconClass}"></i>
      </button>
    `;

    const titleCell = entry.imageUrl
      ? `<div class="game-title-cell"><img src="${escapeHTML(entry.imageUrl)}" class="game-thumbnail" alt="${escapeHTML(entry.title)}"><div><div style="display: flex; align-items: center; gap: 4px;"><strong>${escapeHTML(entry.title)}</strong>${starBtn}</div>${publisherSubtitle}</div></div>`
      : `<div class="game-title-cell"><div class="game-thumbnail-placeholder">${escapeHTML(initials)}</div><div><div style="display: flex; align-items: center; gap: 4px;"><strong>${escapeHTML(entry.title)}</strong>${starBtn}</div>${publisherSubtitle}</div></div>`;

    // Calculate Average Days to Sell
    const durations = entry.sellDurations || [];
    let avgDaysCell = "";
    if (durations.length > 0) {
      const totalDays = durations.reduce((sum, d) => sum + d, 0);
      const avgDays = Math.round(totalDays / durations.length);
      avgDaysCell = `<span style="font-weight: 600; color: var(--accent-cyan);">${avgDays} day${avgDays === 1 ? '' : 's'}</span>`;
    } else {
      avgDaysCell = `<span style="color: var(--text-muted); font-size: 0.8rem;">-</span>`;
    }

    let badgeClass = "badge-available";
    let badgeText = `${entry.availableStock} in stock`;
    if (entry.availableStock === 0) {
      badgeClass = "badge-sold";
      badgeText = "0 in stock";
    } else if (entry.availableStock <= state.lowStockThreshold) {
      badgeClass = "badge-low-stock";
      badgeText = `${entry.availableStock} in stock (Low)`;
    }

    tr.innerHTML = `
      <td>${titleCell}</td>
      <td><span style="font-weight: 600;">${entry.totalAdded}</span> keys</td>
      <td><span class="badge ${badgeClass}">${badgeText}</span></td>
      <td><span style="font-weight: 600;">${entry.totalSold}</span> sold</td>
      <td>${avgDaysCell}</td>
      <td>${formatCurrency(entry.totalRevenue)}</td>
      <td class="${entry.profit >= 0 ? 'text-success-neon' : 'text-danger-soft'}"><strong>${formatCurrency(entry.profit)}</strong></td>
      <td class="${roiPercentage >= 0 ? 'text-success-neon' : 'text-danger-soft'}">${roiPercentage.toFixed(1)}%</td>
      <td class="${marginPercentage >= 0 ? 'text-success-neon' : 'text-danger-soft'}">${marginPercentage.toFixed(1)}%</td>
      <td style="text-align: right;">
        <div style="display: inline-flex; gap: 8px; justify-content: flex-end; width: 100%;">
          <button class="btn btn-outline btn-sm" onclick="triggerEditCatalogEntry('${escapeHTML(safeTitle)}')" title="Edit Catalog Entry">
            <i class="fa-solid fa-pen"></i> Edit
          </button>
          <button class="btn btn-outline btn-sm" onclick="triggerDeleteCatalogEntry('${escapeHTML(safeTitle)}')" title="Delete Catalog Entry" style="color: var(--accent-danger); border-color: var(--accent-danger);">
            <i class="fa-solid fa-trash"></i> Delete
          </button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });

  const showingStart = entriesList.length === 0 ? 0 : startIndex + 1;
  const showingEnd = Math.min(endIndex, entriesList.length);
  document.getElementById("entries-count-text").textContent = `Showing ${showingStart}-${showingEnd} of ${entriesList.length} unique game titles`;

  // Render pagination controls
  renderEntriesPagination(entriesList.length);
}

// Render dynamic pagination controls for the Entries view
function renderEntriesPagination(totalItems) {
  const container = document.getElementById("entries-pagination");
  if (!container) return;
  container.innerHTML = "";

  const totalPages = Math.ceil(totalItems / state.entriesPageSize) || 1;
  if (totalPages <= 1) {
    container.style.display = "none";
    return;
  }
  container.style.display = "flex";

  // Helper to create page buttons
  const createBtn = (label, targetPage, disabled = false, isActive = false) => {
    const btn = document.createElement("button");
    btn.className = "pagination-btn";
    if (isActive) btn.classList.add("active");
    btn.disabled = disabled;
    btn.innerHTML = label;
    if (!disabled && !isActive) {
      btn.addEventListener("click", () => {
        state.entriesCurrentPage = targetPage;
        updateUI();
        const entriesView = document.getElementById("entries-view");
        if (entriesView) {
          entriesView.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      });
    }
    return btn;
  };

  // Prev Button
  container.appendChild(createBtn('<i class="fa-solid fa-angle-left"></i>', state.entriesCurrentPage - 1, state.entriesCurrentPage === 1));

  // Page Numbers with sliding window
  const maxButtons = 5;
  let startPage = Math.max(1, state.entriesCurrentPage - Math.floor(maxButtons / 2));
  let endPage = startPage + maxButtons - 1;

  if (endPage > totalPages) {
    endPage = totalPages;
    startPage = Math.max(1, endPage - maxButtons + 1);
  }

  if (startPage > 1) {
    container.appendChild(createBtn("1", 1));
    if (startPage > 2) {
      const dots = document.createElement("span");
      dots.className = "pagination-dots";
      dots.textContent = "...";
      container.appendChild(dots);
    }
  }

  for (let i = startPage; i <= endPage; i++) {
    container.appendChild(createBtn(i.toString(), i, false, i === state.entriesCurrentPage));
  }

  if (endPage < totalPages) {
    if (endPage < totalPages - 1) {
      const dots = document.createElement("span");
      dots.className = "pagination-dots";
      dots.textContent = "...";
      container.appendChild(dots);
    }
    container.appendChild(createBtn(totalPages.toString(), totalPages));
  }

  // Next Button
  container.appendChild(createBtn('<i class="fa-solid fa-angle-right"></i>', state.entriesCurrentPage + 1, state.entriesCurrentPage === totalPages));
}

function applySidebarState(isCollapsed) {
  const container = document.getElementById("app-container");
  const icon = document.getElementById("collapse-icon");
  const link = document.getElementById("nav-collapse-sidebar");
  
  if (container) {
    if (isCollapsed) {
      container.classList.add("sidebar-collapsed");
      if (icon) {
        icon.className = "fa-solid fa-circle-chevron-right";
      }
      if (link) {
        link.setAttribute("title", "Expand Sidebar");
      }
    } else {
      container.classList.remove("sidebar-collapsed");
      if (icon) {
        icon.className = "fa-solid fa-circle-chevron-left";
      }
      if (link) {
        link.setAttribute("title", "Collapse Sidebar");
      }
    }
  }
}



function applySalesLedgerVisibility(show) {
  const salesLink = document.getElementById("nav-sales");
  if (salesLink) {
    const parentLi = salesLink.closest("li");
    if (parentLi) {
      parentLi.style.display = show ? "" : "none";
    }
  }
  
  // Redirect if active and hidden
  if (!show && window.location.hash === "#sales") {
    window.location.hash = "#dashboard";
    const dashboardLink = document.getElementById("nav-dashboard");
    if (dashboardLink) dashboardLink.click();
  }
}

function applyMetricsVisibility() {
  const cards = {
    profit: document.getElementById("card-net-profit"),
    cost: document.getElementById("card-inventory-cost"),
    revenue: document.getElementById("card-total-revenue"),
    roi: document.getElementById("card-roi"),
    stock: document.getElementById("card-available-stock"),
    velocity: document.getElementById("card-sales-velocity"),
    str: document.getElementById("card-sell-through-rate"),
    unitProfit: document.getElementById("card-avg-profit-key")
  };
  
  Object.keys(cards).forEach(key => {
    const cardEl = cards[key];
    if (cardEl) {
      if (state.visibleMetrics && state.visibleMetrics[key]) {
        cardEl.classList.remove("hidden");
      } else {
        cardEl.classList.add("hidden");
      }
    }
    
    // Also update checkbox state in the dropdown panel
    const checkbox = document.getElementById(`toggle-metric-${key}`);
    if (checkbox) {
      checkbox.checked = !!(state.visibleMetrics && state.visibleMetrics[key]);
    }
  });
}

function applySupplierMetricsVisibility() {
  const cards = {
    profit: document.getElementById("sup-card-net-profit"),
    cost: document.getElementById("sup-card-inventory-cost"),
    revenue: document.getElementById("sup-card-total-revenue"),
    roi: document.getElementById("sup-card-roi"),
    stock: document.getElementById("sup-card-available-stock"),
    velocity: document.getElementById("sup-card-sales-velocity"),
    str: document.getElementById("sup-card-sell-through-rate"),
    unitProfit: document.getElementById("sup-card-avg-profit-key")
  };
  
  Object.keys(cards).forEach(key => {
    const cardEl = cards[key];
    if (cardEl) {
      if (state.supVisibleMetrics && state.supVisibleMetrics[key]) {
        cardEl.classList.remove("hidden");
      } else {
        cardEl.classList.add("hidden");
      }
    }
    
    // Also update checkbox state in the dropdown panel
    const checkbox = document.getElementById(`toggle-sup-metric-${key}`);
    if (checkbox) {
      checkbox.checked = !!(state.supVisibleMetrics && state.supVisibleMetrics[key]);
    }
  });
}

function applyFiguresVisibility() {
  const cards = {
    salesProfit: document.getElementById("card-chart-salesProfit"),
    platformSplit: document.getElementById("card-chart-platformSplit"),
    costRevenue: document.getElementById("card-chart-costRevenue"),
    supplierSplit: document.getElementById("card-chart-supplierSplit"),
    topBestsellers: document.getElementById("card-chart-topBestsellers"),
    dailyProfitMonth: document.getElementById("card-chart-dailyProfitMonth")
  };
  
  Object.keys(cards).forEach(key => {
    const cardEl = cards[key];
    if (cardEl) {
      if (state.visibleFigures && state.visibleFigures[key]) {
        cardEl.style.display = "";
      } else {
        cardEl.style.display = "none";
      }
    }
    
    // Also update checkbox state (Removed - replaced by Widget Gallery)
  });
}

function renderDashboardCardsOrder() {
  const container = document.getElementById("dashboard-charts-container");
  if (!container) return;
  
  state.dashboardOrder.forEach(key => {
    const card = document.getElementById(`card-chart-${key}`);
    if (card) {
      container.appendChild(card);
    }
  });
}

function bindDashboardDragAndDrop() {
  const container = document.getElementById("dashboard-charts-container");
  if (!container) return;
  
  const cards = container.querySelectorAll(".chart-card");
  
  cards.forEach(card => {
    const header = card.querySelector(".chart-card-header");
    if (!header) return;
    
    // Set headers draggable
    header.setAttribute("draggable", "true");
    
    header.addEventListener("dragstart", (e) => {
      const figureKey = card.getAttribute("data-figure");
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", figureKey);
      card.classList.add("dragging");
    });
    
    header.addEventListener("dragend", () => {
      card.classList.remove("dragging");
      cards.forEach(c => c.classList.remove("drag-over"));
    });
    
    card.addEventListener("dragover", (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
    });
    
    card.addEventListener("dragenter", (e) => {
      const draggingCard = container.querySelector(".chart-card.dragging");
      if (draggingCard && draggingCard !== card) {
        card.classList.add("drag-over");
      }
    });
    
    card.addEventListener("dragleave", () => {
      card.classList.remove("drag-over");
    });
    
    card.addEventListener("drop", (e) => {
      e.preventDefault();
      card.classList.remove("drag-over");
      
      const fromKey = e.dataTransfer.getData("text/plain");
      const toKey = card.getAttribute("data-figure");
      
      if (!fromKey || !toKey || fromKey === toKey) return;
      
      const fromIndex = state.dashboardOrder.indexOf(fromKey);
      const toIndex = state.dashboardOrder.indexOf(toKey);
      
      if (fromIndex !== -1 && toIndex !== -1) {
        // Swap visual and state order
        state.dashboardOrder[fromIndex] = toKey;
        state.dashboardOrder[toIndex] = fromKey;
        
        saveStateToStorage();
        renderDashboardCardsOrder();
        
        showToast("Rearranged dashboard figures layout.", "success");
        
        if (window.supabaseClient) {
          dbSaveSettings("dashboardOrder", state.dashboardOrder);
        }
      }
    });
  });
}

function applyDashboardSpans() {
  const container = document.getElementById("dashboard-charts-container");
  if (!container) return;
  
  Object.keys(state.dashboardSpans).forEach(key => {
    const card = document.getElementById(`card-chart-${key}`);
    if (card) {
      card.classList.remove("span-1", "span-2", "span-3");
      const spanVal = state.dashboardSpans[key] || 1;
      card.classList.add(`span-${spanVal}`);
      
      const menu = card.querySelector(".card-actions-menu");
      if (menu) {
        const items = menu.querySelectorAll(".card-actions-item");
        items.forEach(item => {
          const dataSpan = parseInt(item.getAttribute("data-span"));
          if (dataSpan === spanVal) {
            item.classList.add("selected");
          } else {
            item.classList.remove("selected");
          }
        });
      }
    }
  });
}

function bindDashboardCardActions() {
  const container = document.getElementById("dashboard-charts-container");
  const overlay = document.getElementById("widget-fullscreen-overlay");
  if (!container) return;
  
  // Close menus when clicking outside
  document.addEventListener("click", (e) => {
    const dropdown = e.target.closest(".card-actions-dropdown");
    if (!dropdown) {
      const menus = document.querySelectorAll(".card-actions-menu");
      menus.forEach(m => m.classList.remove("active"));
    }
  });
  
  const handleCardActionClick = (e) => {
    const btn = e.target.closest(".btn-card-actions");
    if (btn) {
      e.stopPropagation();
      const dropdown = btn.closest(".card-actions-dropdown");
      const menu = dropdown ? dropdown.querySelector(".card-actions-menu") : null;
      
      const allMenus = document.querySelectorAll(".card-actions-menu");
      allMenus.forEach(m => {
        if (m !== menu) m.classList.remove("active");
      });
      
      if (menu) {
        menu.classList.toggle("active");
      }
      return;
    }
    
    const item = e.target.closest(".card-actions-item");
    if (item) {
      e.stopPropagation();
      const card = item.closest(".chart-card");
      const figureKey = card ? card.getAttribute("data-figure") : null;
      const spanVal = parseInt(item.getAttribute("data-span"));
      
      if (figureKey && !isNaN(spanVal)) {
        state.dashboardSpans[figureKey] = spanVal;
        saveStateToStorage();
        applyDashboardSpans();
        
        const menu = item.closest(".card-actions-menu");
        if (menu) menu.classList.remove("active");
        
        showToast("Adjusted card width.", "success");
        window.dispatchEvent(new Event("resize"));
        
        if (window.supabaseClient) {
          dbSaveSettings("dashboardSpans", state.dashboardSpans);
        }
      }
    }
  };

  container.addEventListener("click", handleCardActionClick);
  if (overlay) {
    overlay.addEventListener("click", handleCardActionClick);
  }
}

function getWidgetFilteredSales(widgetKey, globalSalesList) {
  const cfg = state.widgetSettings ? state.widgetSettings[widgetKey] : null;
  if (!cfg || cfg.timeframe === "global") {
    return globalSalesList;
  }
  
  const now = new Date();
  let cutoffDate = null;
  
  if (cfg.timeframe === "30") {
    cutoffDate = new Date();
    cutoffDate.setDate(now.getDate() - 30);
  } else if (cfg.timeframe === "90") {
    cutoffDate = new Date();
    cutoffDate.setDate(now.getDate() - 90);
  } else if (cfg.timeframe === "year") {
    cutoffDate = new Date(now.getFullYear(), 0, 1);
  }
  
  if (!cutoffDate) return globalSalesList;
  
  return state.sales.filter(sale => {
    if (!sale.saleDate) return false;
    const sDate = new Date(sale.saleDate);
    return sDate >= cutoffDate;
  });
}

function getWidgetFilteredInventory(widgetKey, globalInventoryList) {
  const cfg = state.widgetSettings ? state.widgetSettings[widgetKey] : null;
  if (!cfg || cfg.timeframe === "global") {
    return globalInventoryList;
  }
  
  const now = new Date();
  let cutoffDate = null;
  
  if (cfg.timeframe === "30") {
    cutoffDate = new Date();
    cutoffDate.setDate(now.getDate() - 30);
  } else if (cfg.timeframe === "90") {
    cutoffDate = new Date();
    cutoffDate.setDate(now.getDate() - 90);
  } else if (cfg.timeframe === "year") {
    cutoffDate = new Date(now.getFullYear(), 0, 1);
  }
  
  if (!cutoffDate) return globalInventoryList;
  
  return state.inventory.filter(item => {
    if (!item.dateAdded) return false;
    const iDate = new Date(item.dateAdded);
    return iDate >= cutoffDate;
  });
}

let fullscreenOriginalParent = null;
let fullscreenOriginalSibling = null;

function enterWidgetFullscreen(cardElement) {
  const overlay = document.getElementById("widget-fullscreen-overlay");
  if (!overlay || !cardElement) return;
  
  fullscreenOriginalParent = cardElement.parentNode;
  fullscreenOriginalSibling = cardElement.nextSibling;
  
  cardElement.classList.remove("flipped");
  
  overlay.appendChild(cardElement);
  overlay.classList.add("active");
  document.body.style.overflow = "hidden";
  
  const maxIcon = cardElement.querySelector(".btn-widget-maximize");
  if (maxIcon) {
    maxIcon.className = "fa-solid fa-compress btn-widget-maximize";
    maxIcon.title = "Exit fullscreen";
  }
  
  window.dispatchEvent(new Event("resize"));
}

function exitWidgetFullscreen() {
  const overlay = document.getElementById("widget-fullscreen-overlay");
  if (!overlay) return;
  
  const cardElement = overlay.querySelector(".chart-card");
  if (cardElement && fullscreenOriginalParent) {
    if (fullscreenOriginalSibling) {
      fullscreenOriginalParent.insertBefore(cardElement, fullscreenOriginalSibling);
    } else {
      fullscreenOriginalParent.appendChild(cardElement);
    }
    
    const maxIcon = cardElement.querySelector(".btn-widget-maximize");
    if (maxIcon) {
      maxIcon.className = "fa-solid fa-expand btn-widget-maximize";
      maxIcon.title = "Maximize widget";
    }
  }
  
  overlay.classList.remove("active");
  document.body.style.overflow = "";
  window.dispatchEvent(new Event("resize"));
}

function applyWidgetVisibility() {
  Object.keys(state.widgetSettings).forEach(key => {
    const card = document.getElementById(`card-chart-${key}`);
    if (card) {
      const cfg = state.widgetSettings[key];
      if (cfg.visible) {
        card.style.display = "";
      } else {
        card.style.setProperty("display", "none", "important");
      }
      
      // Synchronize checkbox state (Removed - replaced by Widget Gallery)
      if (state.visibleFigures) {
        state.visibleFigures[key] = !!cfg.visible;
      }
      
      if (cfg.collapsed) {
        card.classList.add("minimized");
        const icon = card.querySelector(".btn-widget-minimize");
        if (icon) {
          icon.className = "fa-solid fa-chevron-up btn-widget-minimize";
          icon.title = "Expand widget";
        }
      } else {
        card.classList.remove("minimized");
        const icon = card.querySelector(".btn-widget-minimize");
        if (icon) {
          icon.className = "fa-solid fa-chevron-down btn-widget-minimize";
          icon.title = "Minimize widget";
        }
      }
    }
  });
}

function renderWidgetGallery() {
  const galleryList = document.getElementById("widget-gallery-list");
  if (!galleryList) return;
  
  const widgetMeta = {
    salesProfit: { title: "Sales vs Profit Trend", desc: "Line/Bar chart showing net sales vs profit over time." },
    platformSplit: { title: "Platform Sales Split", desc: "Doughnut/Pie chart illustrating sales distribution by platform." },
    costRevenue: { title: "Cost vs Revenue Comparison", desc: "Comparison of key purchase cost vs sales revenue." },
    supplierSplit: { title: "Supplier Stock Distribution", desc: "Stock count distribution mapped by supplier source." },
    topBestsellers: { title: "Top Bestselling Games", desc: "Leaderboard listing top grossing games by metrics." },
    dailyProfitMonth: { title: "Daily Profit of the Month", desc: "Daily net profit tracking bar chart for active month." },
    stockSpeed: { title: "Stock Speed & Aging Analytics", desc: "Doughnut/Pie/Bar chart tracking shelf-life of sold keys." },
    salesFeed: { title: "Recent Sales Activity Feed", desc: "Visual feed of the latest game key sales transactions." },
    financeTracker: { title: "Monthly Finance & Payouts", desc: "Ledger comparison table of revenue, margins, and payouts." },
    markupAnalysis: { title: "Markup & Pricing Analysis", desc: "Cost vs price vs markup comparison grouped by publisher/supplier." },
    stockTurnover: { title: "Stock Turnover Timeline", desc: "Dual timeline chart of key purchases vs keys sold over time." }
  };
  
  let html = "";
  let inactiveCount = 0;
  
  Object.keys(state.widgetSettings).forEach(key => {
    const cfg = state.widgetSettings[key];
    if (!cfg.visible) {
      inactiveCount++;
      const meta = widgetMeta[key];
      html += `
        <div class="gallery-item" data-widget="${key}">
          <div class="gallery-item-info">
            <span class="gallery-item-title">${meta.title}</span>
            <span class="gallery-item-desc">${meta.desc}</span>
          </div>
          <i class="fa-solid fa-circle-plus gallery-item-add-btn" title="Add to dashboard"></i>
        </div>
      `;
    }
  });
  
  if (inactiveCount === 0) {
    html = `<div class="text-muted text-center" style="padding: 24px; font-size: 0.85rem;">All widgets are currently active on your dashboard!</div>`;
  }
  
  galleryList.innerHTML = html;
}

function bindWidgetControls() {
  const btnOpenGallery = document.getElementById("btn-open-widget-gallery");
  const drawer = document.getElementById("widget-gallery-drawer");
  const btnCloseDrawer = document.getElementById("btn-close-widget-gallery-drawer");
  
  if (btnOpenGallery && drawer) {
    btnOpenGallery.addEventListener("click", () => {
      renderWidgetGallery();
      drawer.classList.add("open");
    });
  }
  if (btnCloseDrawer && drawer) {
    btnCloseDrawer.addEventListener("click", () => {
      drawer.classList.remove("open");
    });
  }
  
  const galleryList = document.getElementById("widget-gallery-list");
  if (galleryList && drawer) {
    galleryList.addEventListener("click", (e) => {
      const item = e.target.closest(".gallery-item");
      if (item) {
        const widgetKey = item.getAttribute("data-widget");
        if (widgetKey && state.widgetSettings[widgetKey]) {
          state.widgetSettings[widgetKey].visible = true;
          saveStateToStorage();
          applyWidgetVisibility();
          renderWidgetGallery();
          updateUI();
          showToast("Added widget to dashboard.", "success");
          
          if (window.supabaseClient) {
            dbSaveSettings("widgetSettings", state.widgetSettings);
          }
        }
      }
    });
  }
  
  const overlay = document.getElementById("widget-fullscreen-overlay");
  if (overlay) {
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) {
        exitWidgetFullscreen();
      }
    });
  }
  
  const container = document.getElementById("dashboard-charts-container");
  if (!container) return;
  
  const populateFormConfig = (widgetKey) => {
    const card = document.getElementById(`card-chart-${widgetKey}`);
    if (!card) return;
    const cfg = state.widgetSettings[widgetKey];
    
    const selectChart = document.getElementById(`config-${widgetKey}-chartType`);
    if (selectChart) selectChart.value = cfg.chartType || selectChart.options[0].value;
    
    const selectTime = document.getElementById(`config-${widgetKey}-timeframe`);
    if (selectTime) selectTime.value = cfg.timeframe || "global";
    
    if (widgetKey === "topBestsellers") {
      const selectLimit = document.getElementById("config-topBestsellers-limit");
      if (selectLimit) selectLimit.value = cfg.limit || 5;
      const selectMetric = document.getElementById("config-topBestsellers-metric");
      if (selectMetric) selectMetric.value = cfg.metric || "profit";
    } else if (widgetKey === "salesFeed") {
      const selectLimit = document.getElementById("config-salesFeed-limit");
      if (selectLimit) selectLimit.value = cfg.limit || 5;
    } else if (widgetKey === "markupAnalysis") {
      const selectGroupBy = document.getElementById("config-markupAnalysis-groupBy");
      if (selectGroupBy) selectGroupBy.value = cfg.groupBy || "publisher";
    }
  };
  
  const handleWidgetClick = (e) => {
    const btnMinimize = e.target.closest(".btn-widget-minimize");
    if (btnMinimize) {
      e.stopPropagation();
      const card = btnMinimize.closest(".chart-card");
      const key = card ? card.getAttribute("data-figure") : null;
      if (key && state.widgetSettings[key]) {
        const cfg = state.widgetSettings[key];
        cfg.collapsed = !cfg.collapsed;
        
        // If minimized while inside fullscreen overlay, exit fullscreen first
        const isOverlay = card.parentNode.id === "widget-fullscreen-overlay";
        if (isOverlay && cfg.collapsed) {
          exitWidgetFullscreen();
        }
        
        saveStateToStorage();
        applyWidgetVisibility();
        if (!cfg.collapsed) {
          window.dispatchEvent(new Event("resize"));
        }
        if (window.supabaseClient) {
          dbSaveSettings("widgetSettings", state.widgetSettings);
        }
      }
      return;
    }
    
    const btnMaximize = e.target.closest(".btn-widget-maximize");
    if (btnMaximize) {
      e.stopPropagation();
      const card = btnMaximize.closest(".chart-card");
      if (card) {
        const isOverlay = card.parentNode.id === "widget-fullscreen-overlay";
        if (isOverlay) {
          exitWidgetFullscreen();
        } else {
          enterWidgetFullscreen(card);
        }
      }
      return;
    }
    
    const btnConfig = e.target.closest(".btn-widget-configure");
    if (btnConfig) {
      e.stopPropagation();
      const card = btnConfig.closest(".chart-card");
      const key = card ? card.getAttribute("data-figure") : null;
      if (card && key) {
        populateFormConfig(key);
        card.classList.add("flipped");
        
        const menu = btnConfig.closest(".card-actions-menu");
        if (menu) menu.classList.remove("active");
      }
      return;
    }
    
    const btnCancelFlip = e.target.closest(".btn-widget-flip-cancel");
    if (btnCancelFlip) {
      e.stopPropagation();
      const card = btnCancelFlip.closest(".chart-card");
      if (card) {
        card.classList.remove("flipped");
      }
      return;
    }
    
    const btnRemove = e.target.closest(".btn-widget-remove");
    if (btnRemove) {
      e.stopPropagation();
      const card = btnRemove.closest(".chart-card");
      const key = card ? card.getAttribute("data-figure") : null;
      if (key && state.widgetSettings[key]) {
        // Exit fullscreen if removing from fullscreen
        const isOverlay = card.parentNode.id === "widget-fullscreen-overlay";
        if (isOverlay) {
          exitWidgetFullscreen();
        }
        
        state.widgetSettings[key].visible = false;
        saveStateToStorage();
        applyWidgetVisibility();
        showToast("Removed widget from dashboard.", "info");
        
        const menu = btnRemove.closest(".card-actions-menu");
        if (menu) menu.classList.remove("active");
        
        if (window.supabaseClient) {
          dbSaveSettings("widgetSettings", state.widgetSettings);
        }
      }
      return;
    }
  };
  
  const handleWidgetSubmit = (e) => {
    const form = e.target.closest(".widget-config-form");
    if (form) {
      e.preventDefault();
      const widgetKey = form.getAttribute("data-widget");
      const card = form.closest(".chart-card");
      if (widgetKey && state.widgetSettings[widgetKey] && card) {
        const cfg = state.widgetSettings[widgetKey];
        
        const selectChart = document.getElementById(`config-${widgetKey}-chartType`);
        if (selectChart) cfg.chartType = selectChart.value;
        
        const selectTime = document.getElementById(`config-${widgetKey}-timeframe`);
        if (selectTime) cfg.timeframe = selectTime.value;
        
        if (widgetKey === "topBestsellers") {
          const selectLimit = document.getElementById("config-topBestsellers-limit");
          if (selectLimit) cfg.limit = parseInt(selectLimit.value);
          const selectMetric = document.getElementById("config-topBestsellers-metric");
          if (selectMetric) cfg.metric = selectMetric.value;
        } else if (widgetKey === "salesFeed") {
          const selectLimit = document.getElementById("config-salesFeed-limit");
          if (selectLimit) cfg.limit = parseInt(selectLimit.value);
        } else if (widgetKey === "markupAnalysis") {
          const selectGroupBy = document.getElementById("config-markupAnalysis-groupBy");
          if (selectGroupBy) cfg.groupBy = selectGroupBy.value;
        }
        
        saveStateToStorage();
        card.classList.remove("flipped");
        updateUI();
        showToast("Widget settings saved.", "success");
        
        if (window.supabaseClient) {
          dbSaveSettings("widgetSettings", state.widgetSettings);
        }
      }
    }
  };

  container.addEventListener("click", handleWidgetClick);
  container.addEventListener("submit", handleWidgetSubmit);
  if (overlay) {
    overlay.addEventListener("click", handleWidgetClick);
    overlay.addEventListener("submit", handleWidgetSubmit);
  }
}

function applyMetricOrder() {
  const grid = document.querySelector("#dashboard-view .metrics-grid");
  if (!grid) return;
  
  const defaultOrder = [
    "card-net-profit",
    "card-inventory-cost",
    "card-total-revenue",
    "card-roi",
    "card-available-stock",
    "card-sales-velocity",
    "card-sell-through-rate",
    "card-avg-profit-key"
  ];
  
  const order = state.metricOrder && state.metricOrder.length === defaultOrder.length
    ? state.metricOrder
    : defaultOrder;
    
  order.forEach(id => {
    const card = document.getElementById(id);
    if (card && card.parentNode === grid) {
      grid.appendChild(card);
    }
  });
}

function saveMetricOrder() {
  const grid = document.querySelector("#dashboard-view .metrics-grid");
  if (!grid) return;
  const children = Array.from(grid.children);
  const order = children.map(child => child.id);
  state.metricOrder = order;
  saveStateToStorage();
  if (window.supabaseClient) {
    dbSaveSettings("metricOrder", state.metricOrder);
  }
}

function applySupplierMetricOrder() {
  const grid = document.getElementById("suppliers-metrics-grid");
  if (!grid) return;
  
  const defaultOrder = [
    "sup-card-net-profit",
    "sup-card-inventory-cost",
    "sup-card-total-revenue",
    "sup-card-roi",
    "sup-card-available-stock",
    "sup-card-sales-velocity",
    "sup-card-sell-through-rate",
    "sup-card-avg-profit-key"
  ];
  
  const order = state.supMetricOrder && state.supMetricOrder.length === defaultOrder.length
    ? state.supMetricOrder
    : defaultOrder;
    
  order.forEach(id => {
    const card = document.getElementById(id);
    if (card && card.parentNode === grid) {
      grid.appendChild(card);
    }
  });
}

function saveSupplierMetricOrder() {
  const grid = document.getElementById("suppliers-metrics-grid");
  if (!grid) return;
  const children = Array.from(grid.children);
  const order = children.map(child => child.id);
  state.supMetricOrder = order;
  saveStateToStorage();
  if (window.supabaseClient) {
    dbSaveSettings("supMetricOrder", state.supMetricOrder);
  }
}

let dragSource = null;

function initDragAndDrop() {
  const grids = document.querySelectorAll(".metrics-grid");
  grids.forEach(grid => {
    const cards = grid.querySelectorAll(".metric-card");
    cards.forEach(card => {
      card.setAttribute("draggable", "true");
      
      card.addEventListener("dragstart", (e) => {
        dragSource = card;
        card.classList.add("dragging");
        e.dataTransfer.effectAllowed = "move";
      });
      
      card.addEventListener("dragend", () => {
        dragSource = null;
        card.classList.remove("dragging");
        grid.querySelectorAll(".metric-card").forEach(c => c.classList.remove("drag-over"));
        if (grid.id === "suppliers-metrics-grid") {
          saveSupplierMetricOrder();
        } else {
          saveMetricOrder();
        }
      });
      
      card.addEventListener("dragover", (e) => {
        e.preventDefault();
        if (card === dragSource) return;
        if (card.parentNode !== dragSource.parentNode) return;
        card.classList.add("drag-over");
      });
      
      card.addEventListener("dragleave", () => {
        card.classList.remove("drag-over");
      });
      
      card.addEventListener("drop", (e) => {
        e.preventDefault();
        card.classList.remove("drag-over");
        if (card === dragSource) return;
        if (card.parentNode !== dragSource.parentNode) return;
        
        const children = Array.from(grid.children);
        const srcIndex = children.indexOf(dragSource);
        const targetIndex = children.indexOf(card);
        
        if (srcIndex < targetIndex) {
          grid.insertBefore(dragSource, card.nextSibling);
        } else {
          grid.insertBefore(dragSource, card);
        }
      });
    });
  });
}

function renderFinanceView() {
  const metricsContainer = document.getElementById("finance-metrics-grid");
  const detailContent = document.getElementById("finance-detail-content");
  const canvas = document.getElementById("financeMonthlyChart");
  const breakdownSelect = document.getElementById("finance-breakdown-type");
  const breakdownTitle = document.getElementById("finance-breakdown-title");
  const chartBreakdownSelect = document.getElementById("finance-chart-breakdown-type");
  const chartTitle = document.getElementById("finance-chart-title");
  
  if (!metricsContainer || !detailContent || !canvas) return;

  const breakdownType = breakdownSelect ? breakdownSelect.value : "month";
  const chartBreakdownType = chartBreakdownSelect ? chartBreakdownSelect.value : "month";

  // Populate the Year Filter dropdown if it exists
  const yearFilter = document.getElementById("finance-breakdown-year-filter");
  let selectedYear = "all";
  if (yearFilter) {
    if (breakdownType === "month") {
      yearFilter.classList.remove("hidden");
      
      // Get unique years from sales
      const years = new Set();
      state.sales.forEach(sale => {
        if (sale.saleDate && sale.saleDate.length >= 4) {
          const y = sale.saleDate.substring(0, 4);
          if (/^\d{4}$/.test(y)) years.add(y);
        }
      });
      
      const sortedYears = Array.from(years).sort((a, b) => b.localeCompare(a));
      const currentSelected = yearFilter.value || "all";
      
      yearFilter.innerHTML = `<option value="all">All Years</option>`;
      sortedYears.forEach(y => {
        yearFilter.innerHTML += `<option value="${y}">${y}</option>`;
      });
      
      // Restore selected year if still valid
      if (currentSelected === "all" || sortedYears.includes(currentSelected)) {
        yearFilter.value = currentSelected;
      } else {
        yearFilter.value = "all";
      }
      selectedYear = yearFilter.value;
    } else {
      yearFilter.classList.add("hidden");
    }
  }

  // Update layout toggle buttons active state
  const layoutButtons = document.querySelectorAll(".btn-toggle-layout");
  layoutButtons.forEach(b => {
    b.classList.toggle("active", b.getAttribute("data-style") === state.financeLayoutStyle);
    // Remove inline style overrides so they follow classes in styles.css
    b.style.color = "";
    b.style.background = "";
  });

  // Update chart header text dynamically
  if (chartTitle) {
    if (chartBreakdownType === "month") chartTitle.textContent = "Monthly Financial Trend";
    else if (chartBreakdownType === "year") chartTitle.textContent = "Yearly Financial Trend";
    else chartTitle.textContent = "All-Time Cumulative Financial Trend";
  }

  // Update card header text dynamically
  if (breakdownTitle) {
    if (breakdownType === "month") {
      breakdownTitle.textContent = selectedYear === "all" ? "Monthly Ledger Breakdown" : `Monthly Ledger Breakdown (${selectedYear})`;
    } else if (breakdownType === "year") {
      breakdownTitle.textContent = "Yearly Ledger Breakdown";
    } else {
      breakdownTitle.textContent = "All-Time Ledger Summary";
    }
  }

  metricsContainer.innerHTML = "";
  detailContent.innerHTML = "";

  // Group data based on selector: Month, Year, All-Time
  const groupedData = {};
  
  // Total Lifetime Statistics
  let totalRevenue = 0;
  let totalCost = 0;
  let totalProfit = 0;
  let totalKeysSold = 0;

  state.sales.forEach(sale => {
    totalRevenue += sale.sellPrice;
    totalCost += sale.cost;
    totalProfit += sale.profit;
    totalKeysSold += 1;

    let key = "All Time";
    if (breakdownType === "month") {
      const year = sale.saleDate.substring(0, 4);
      if (selectedYear !== "all" && year !== selectedYear) {
        return; // Skip if year filter doesn't match
      }
      key = sale.saleDate.substring(0, 7); // e.g. "2026-06"
    } else if (breakdownType === "year") {
      key = sale.saleDate.substring(0, 4); // e.g. "2026"
    }

    if (!groupedData[key]) {
      groupedData[key] = { revenue: 0, cost: 0, profit: 0, count: 0, totalSellDays: 0, durationCount: 0, payoutFees: 0 };
    }
    groupedData[key].revenue += sale.sellPrice;
    groupedData[key].cost += sale.cost;
    groupedData[key].profit += sale.profit;
    groupedData[key].count += 1;

    // Retrieve corresponding inventory purchaseDate
    const invItem = state.inventory.find(i => i.id === sale.inventoryId);
    if (invItem && invItem.purchaseDate && sale.saleDate) {
      const start = new Date(invItem.purchaseDate);
      const end = new Date(sale.saleDate);
      start.setHours(0, 0, 0, 0);
      end.setHours(0, 0, 0, 0);
      const diffTime = Math.max(0, end - start);
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
      groupedData[key].totalSellDays += diffDays;
      groupedData[key].durationCount += 1;
    }
  });

  // Calculate and aggregate Payouts / Fees
  let totalPayouts = 0;
  state.payouts = state.payouts || [];
  state.payouts.forEach(p => {
    const amt = parseFloat(p.amount) || 0;
    totalPayouts += amt;

    let key = "All Time";
    if (breakdownType === "month") {
      const year = p.date.substring(0, 4);
      if (selectedYear !== "all" && year !== selectedYear) {
        return;
      }
      key = p.date.substring(0, 7);
    } else if (breakdownType === "year") {
      key = p.date.substring(0, 4);
    }

    if (!groupedData[key]) {
      groupedData[key] = { revenue: 0, cost: 0, profit: 0, count: 0, totalSellDays: 0, durationCount: 0, payoutFees: 0 };
    }
    if (groupedData[key].payoutFees === undefined) {
      groupedData[key].payoutFees = 0;
    }
    groupedData[key].payoutFees += amt;
  });

  // Factor payout fees into period expenses and profits
  Object.keys(groupedData).forEach(k => {
    const stats = groupedData[k];
    const fees = stats.payoutFees || 0;
    stats.cost += fees;
    stats.profit -= fees;
  });

  // Factor lifetime payout fees into lifetime expenses and profits
  totalCost += totalPayouts;
  totalProfit -= totalPayouts;

  const lifetimeRoi = totalCost > 0 ? (totalProfit / totalCost) * 100 : 0;

  // Render summary metrics grid
  metricsContainer.innerHTML = `
    <div class="metric-card bg-gradient-pink">
      <div class="metric-info">
        <span class="metric-label">Lifetime Revenue</span>
        <h3 class="metric-value">${formatCurrency(totalRevenue)}</h3>
        <span class="metric-subtext">${totalKeysSold} keys sold in total</span>
      </div>
      <div class="metric-icon">
        <i class="fa-solid fa-receipt"></i>
      </div>
    </div>
    <div class="metric-card bg-gradient-cyan">
      <div class="metric-info">
        <span class="metric-label">Lifetime Expenses</span>
        <h3 class="metric-value">${formatCurrency(totalCost)}</h3>
        <span class="metric-subtext">Total key acquisitions cost</span>
      </div>
      <div class="metric-icon">
        <i class="fa-solid fa-tags"></i>
      </div>
    </div>
    <div class="metric-card bg-gradient-purple">
      <div class="metric-info">
        <span class="metric-label">Lifetime Net Profit</span>
        <h3 class="metric-value">${formatCurrency(totalProfit)}</h3>
        <span class="metric-subtext positive"><i class="fa-solid fa-arrow-trend-up"></i> ${lifetimeRoi.toFixed(1)}% lifetime ROI</span>
      </div>
      <div class="metric-icon">
        <i class="fa-solid fa-wallet"></i>
      </div>
    </div>
    <div class="metric-card bg-gradient-emerald">
      <div class="metric-info">
        <span class="metric-label">Average Profit / Key</span>
        <h3 class="metric-value">${formatCurrency(totalKeysSold > 0 ? totalProfit / totalKeysSold : 0)}</h3>
        <span class="metric-subtext">Net margin per individual sale</span>
      </div>
      <div class="metric-icon">
        <i class="fa-solid fa-coins"></i>
      </div>
    </div>
  `;

  // Sort keys chronologically or reverse-chronologically
  const sortedKeys = Object.keys(groupedData).sort();
  if (state.financeSortOrder === "desc") {
    sortedKeys.reverse();
  }

  // Update sort button icon dynamically
  const sortBtn = document.getElementById("finance-breakdown-sort-order");
  if (sortBtn) {
    const icon = sortBtn.querySelector("i");
    if (icon) {
      icon.className = state.financeSortOrder === "desc" 
        ? "fa-solid fa-arrow-down-wide-short" 
        : "fa-solid fa-arrow-up-wide-short";
    }
  }

  if (state.financeLayoutStyle === "transposed") {
    if (sortedKeys.length === 0) {
      detailContent.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 25px;">No sales logged yet. Financial statistics are empty.</div>`;
    } else {
      const tableResponsive = document.createElement("div");
      tableResponsive.className = "table-responsive";
      
      const table = document.createElement("table");
      table.className = "table";
      table.style.width = "100%";
      
      const periodHeaders = sortedKeys.map(k => {
        return `<th style="text-align: right; min-width: 110px;">${breakdownType === "month" ? formatMonthKey(k) : k}</th>`;
      }).join("");

      table.innerHTML = `
        <thead>
          <tr>
            <th style="min-width: 160px; position: sticky; left: 0; background: var(--bg-input); z-index: 3; border-right: 1px solid var(--border-color);">Metric</th>
            ${periodHeaders}
          </tr>
        </thead>
        <tbody>
          <tr style="border-bottom: 1px solid var(--border-color);">
            <td style="position: sticky; left: 0; background: var(--bg-input); z-index: 1; font-weight: 600; border-right: 1px solid var(--border-color); color: var(--accent-cyan);">Sold Items</td>
            ${sortedKeys.map(k => `<td style="text-align: right; color: var(--accent-cyan); font-weight: 500;">${groupedData[k].count} keys</td>`).join("")}
          </tr>
          <tr style="border-bottom: 1px solid var(--border-color);">
            <td style="position: sticky; left: 0; background: var(--bg-input); z-index: 1; font-weight: 600; border-right: 1px solid var(--border-color); color: var(--accent-emerald);">Revenue</td>
            ${sortedKeys.map(k => `<td style="text-align: right; color: var(--accent-emerald); font-weight: 600;">${formatCurrency(groupedData[k].revenue)}</td>`).join("")}
          </tr>
          <tr style="border-bottom: 1px solid var(--border-color);">
            <td style="position: sticky; left: 0; background: var(--bg-input); z-index: 1; font-weight: 600; border-right: 1px solid var(--border-color); color: var(--accent-amber);">Expenses (Cost)</td>
            ${sortedKeys.map(k => `<td style="text-align: right; color: var(--accent-amber); font-weight: 500;">${formatCurrency(groupedData[k].cost)}</td>`).join("")}
          </tr>
          <tr style="font-weight: 700; background: hsla(270, 85%, 60%, 0.05); border-top: 1.5px solid var(--border-color); border-bottom: 1.5px solid var(--border-color);">
            <td style="position: sticky; left: 0; background: var(--bg-input); z-index: 1; font-weight: 700; color: var(--accent-purple); border-right: 1px solid var(--border-color);">Profit</td>
            ${sortedKeys.map(k => {
              const stats = groupedData[k];
              return `<td class="${stats.profit >= 0 ? 'text-success-neon' : 'text-danger-soft'}" style="text-align: right; font-weight: 700;">${stats.profit >= 0 ? '+' : ''}${formatCurrency(stats.profit)}</td>`;
            }).join("")}
          </tr>
          <tr style="border-bottom: 1px solid var(--border-color);">
            <td style="position: sticky; left: 0; background: var(--bg-input); z-index: 1; font-weight: 600; border-right: 1px solid var(--border-color); color: var(--text-primary);">~Sold Price</td>
            ${sortedKeys.map(k => {
              const stats = groupedData[k];
              const avgPrice = stats.count > 0 ? stats.revenue / stats.count : 0;
              return `<td style="text-align: right; color: var(--text-primary);">${formatCurrency(avgPrice)}</td>`;
            }).join("")}
          </tr>
          <tr style="border-bottom: 1px solid var(--border-color);">
            <td style="position: sticky; left: 0; background: var(--bg-input); z-index: 1; font-weight: 600; border-right: 1px solid var(--border-color); color: var(--text-success-neon);">~Profit</td>
            ${sortedKeys.map(k => {
              const stats = groupedData[k];
              const avgProfit = stats.count > 0 ? stats.profit / stats.count : 0;
              return `<td class="${avgProfit >= 0 ? 'text-success-neon' : 'text-danger-soft'}" style="text-align: right; font-weight: 600;">${avgProfit >= 0 ? '+' : ''}${formatCurrency(avgProfit)}</td>`;
            }).join("")}
          </tr>
          <tr style="border-bottom: 1px solid var(--border-color);">
            <td style="position: sticky; left: 0; background: var(--bg-input); z-index: 1; font-weight: 600; border-right: 1px solid var(--border-color); color: var(--accent-pink);">~Margin %</td>
            ${sortedKeys.map(k => {
              const stats = groupedData[k];
              const avgPrice = stats.count > 0 ? stats.revenue / stats.count : 0;
              const avgProfit = stats.count > 0 ? stats.profit / stats.count : 0;
              const avgMargin = avgPrice > 0 ? (avgProfit / avgPrice) * 100 : 0;
              return `<td style="text-align: right; color: var(--accent-pink); font-weight: 600;">${avgMargin.toFixed(2)}</td>`;
            }).join("")}
          </tr>
          <tr style="border-bottom: 1px solid var(--border-color);">
            <td style="position: sticky; left: 0; background: var(--bg-input); z-index: 1; font-weight: 600; border-right: 1px solid var(--border-color); color: var(--text-secondary);">~Duration</td>
            ${sortedKeys.map(k => {
              const stats = groupedData[k];
              const avgDuration = stats.durationCount > 0 ? stats.totalSellDays / stats.durationCount : 0;
              return `<td style="text-align: right; color: var(--text-secondary);">${avgDuration.toFixed(2)} days</td>`;
            }).join("")}
          </tr>
          <tr>
            <td style="position: sticky; left: 0; background: var(--bg-input); z-index: 1; font-weight: 600; border-right: 1px solid var(--border-color); color: var(--accent-purple);">ROI</td>
            ${sortedKeys.map(k => {
              const stats = groupedData[k];
              const roi = stats.cost > 0 ? (stats.profit / stats.cost) * 100 : 0;
              return `<td style="text-align: right;"><span class="badge ${roi >= 0 ? 'badge-available' : 'badge-sold'}">${roi.toFixed(1)}%</span></td>`;
            }).join("")}
          </tr>
        </tbody>
      `;
      tableResponsive.appendChild(table);
      detailContent.appendChild(tableResponsive);
    }
  }
  else if (state.financeLayoutStyle === "grid") {
    if (sortedKeys.length === 0) {
      detailContent.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 25px;">No sales logged yet. Financial statistics are empty.</div>`;
    } else {
      const gridContainer = document.createElement("div");
      gridContainer.className = "finance-grid-cards";
      gridContainer.style.display = "grid";
      gridContainer.style.gridTemplateColumns = "repeat(auto-fill, minmax(250px, 1fr))";
      gridContainer.style.gap = "16px";
      
      sortedKeys.forEach(k => {
        const stats = groupedData[k];
        const roi = stats.cost > 0 ? (stats.profit / stats.cost) * 100 : 0;
        const avgPrice = stats.count > 0 ? stats.revenue / stats.count : 0;
        const avgProfit = stats.count > 0 ? stats.profit / stats.count : 0;
        const avgMargin = avgPrice > 0 ? (avgProfit / avgPrice) * 100 : 0;
        const avgDuration = stats.durationCount > 0 ? stats.totalSellDays / stats.durationCount : 0;
        const periodLabel = breakdownType === "month" ? formatMonthKey(k) : k;

        const card = document.createElement("div");
        card.className = "finance-period-card glass-panel";
        card.style.background = "var(--bg-card)";
        card.style.border = "1px solid var(--border-color)";
        card.style.borderRadius = "12px";
        card.style.padding = "16px";
        card.style.display = "flex";
        card.style.flexDirection = "column";
        card.style.gap = "12px";

        card.innerHTML = `
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-color); padding-bottom: 8px;">
            <span style="font-weight: 700; font-size: 1.05rem; color: var(--text-primary);">${periodLabel}</span>
            <span class="badge badge-available">${stats.count} sold</span>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; font-size: 0.9rem;">
            <div>
              <div style="color: var(--text-muted); font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.5px;">Totals</div>
              <div style="margin-top: 4px;">Rev: <strong>${formatCurrency(stats.revenue)}</strong></div>
              <div>Cost: <span style="color: var(--text-muted);">${formatCurrency(stats.cost)}</span></div>
              <div class="${stats.profit >= 0 ? 'text-success-neon' : 'text-danger-soft'}" style="font-weight: 600; margin-top: 2px;">
                Prof: ${stats.profit >= 0 ? '+' : ''}${formatCurrency(stats.profit)}
              </div>
            </div>
            <div>
              <div style="color: var(--text-muted); font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.5px;">Averages</div>
              <div style="margin-top: 4px;">Price: <strong>${formatCurrency(avgPrice)}</strong></div>
              <div class="text-success-neon" style="font-weight: 600;">Margin: ${avgMargin.toFixed(1)}%</div>
              <div>Time: <span style="font-weight: 500;">${avgDuration.toFixed(1)}d</span></div>
            </div>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center; background: var(--bg-input); padding: 6px 12px; border-radius: 6px; font-size: 0.8rem; border: 1px solid var(--border-color);">
            <span style="color: var(--text-secondary);">ROI:</span>
            <strong style="color: var(--accent-purple);">${roi.toFixed(1)}%</strong>
          </div>
        `;
        gridContainer.appendChild(card);
      });
      detailContent.appendChild(gridContainer);
    }
  }
  else if (state.financeLayoutStyle === "expandable") {
    if (sortedKeys.length === 0) {
      detailContent.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 25px;">No sales logged yet. Financial statistics are empty.</div>`;
    } else {
      const tableResponsive = document.createElement("div");
      tableResponsive.className = "table-responsive";
      
      const table = document.createElement("table");
      table.className = "table";
      table.style.width = "100%";
      table.innerHTML = `
        <thead>
          <tr>
            <th>${breakdownType === "month" ? "Month" : (breakdownType === "year" ? "Year" : "Period")}</th>
            <th>Sold</th>
            <th>Net Profit</th>
            <th style="width: 40px; text-align: center;"></th>
          </tr>
        </thead>
        <tbody></tbody>
      `;
      
      const tbody = table.querySelector("tbody");
      sortedKeys.forEach(k => {
        const stats = groupedData[k];
        const roi = stats.cost > 0 ? (stats.profit / stats.cost) * 100 : 0;
        const avgPrice = stats.count > 0 ? stats.revenue / stats.count : 0;
        const avgProfit = stats.count > 0 ? stats.profit / stats.count : 0;
        const avgMargin = avgPrice > 0 ? (avgProfit / avgPrice) * 100 : 0;
        const avgDuration = stats.durationCount > 0 ? stats.totalSellDays / stats.durationCount : 0;
        const periodLabel = breakdownType === "month" ? formatMonthKey(k) : k;

        const mainTr = document.createElement("tr");
        mainTr.style.cursor = "pointer";
        mainTr.innerHTML = `
          <td><strong>${periodLabel}</strong></td>
          <td>${stats.count} keys</td>
          <td class="${stats.profit >= 0 ? 'text-success-neon' : 'text-danger-soft'}"><strong>${stats.profit >= 0 ? '+' : ''}${formatCurrency(stats.profit)}</strong></td>
          <td style="text-align: center;"><i class="fa-solid fa-chevron-down toggle-icon" style="transition: transform 0.2s; color: var(--text-muted);"></i></td>
        `;
        
        const detailsTr = document.createElement("tr");
        detailsTr.className = "details-row hidden";
        detailsTr.style.background = "var(--bg-card-hover)";
        detailsTr.innerHTML = `
          <td colspan="4" style="padding: 16px; border-top: none;">
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 16px;">
              <div>
                <span style="color: var(--text-muted); font-size: 0.75rem; display: block; text-transform: uppercase; letter-spacing: 0.5px;">Totals</span>
                <span style="font-weight: 600; display: block; margin-top: 4px;">Rev: ${formatCurrency(stats.revenue)}</span>
                <span style="display: block; color: var(--text-secondary);">Cost: ${formatCurrency(stats.cost)}</span>
              </div>
              <div>
                <span style="color: var(--text-muted); font-size: 0.75rem; display: block; text-transform: uppercase; letter-spacing: 0.5px;">Averages</span>
                <span style="display: block; margin-top: 4px;">Price: <strong>${formatCurrency(avgPrice)}</strong></span>
                <span style="display: block; color: var(--text-secondary);">Profit: ${formatCurrency(avgProfit)}</span>
              </div>
              <div>
                <span style="color: var(--text-muted); font-size: 0.75rem; display: block; text-transform: uppercase; letter-spacing: 0.5px;">Margin & ROI</span>
                <span class="text-success-neon" style="font-weight: 600; display: block; margin-top: 4px;">Margin: ${avgMargin.toFixed(1)}%</span>
                <span style="display: block; color: var(--text-secondary);">ROI: ${roi.toFixed(1)}%</span>
              </div>
              <div>
                <span style="color: var(--text-muted); font-size: 0.75rem; display: block; text-transform: uppercase; letter-spacing: 0.5px;">Duration</span>
                <span style="display: block; margin-top: 4px;">Avg Speed:</span>
                <strong style="font-size: 0.95rem;">${avgDuration.toFixed(1)} days</strong>
              </div>
            </div>
          </td>
        `;
        
        mainTr.addEventListener("click", () => {
          const isHidden = detailsTr.classList.contains("hidden");
          detailsTr.classList.toggle("hidden", !isHidden);
          const icon = mainTr.querySelector(".toggle-icon");
          if (icon) {
            icon.style.transform = isHidden ? "rotate(180deg)" : "rotate(0deg)";
            icon.style.color = isHidden ? "var(--text-primary)" : "var(--text-muted)";
          }
        });
        
        tbody.appendChild(mainTr);
        tbody.appendChild(detailsTr);
      });
      tableResponsive.appendChild(table);
      detailContent.appendChild(tableResponsive);
    }
  }
  else if (state.financeLayoutStyle === "tabbed") {
    if (sortedKeys.length === 0) {
      detailContent.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 25px;">No sales logged yet. Financial statistics are empty.</div>`;
    } else {
      const tabHeader = document.createElement("div");
      tabHeader.style.display = "flex";
      tabHeader.style.borderBottom = "1px solid var(--border-color)";
      tabHeader.style.marginBottom = "16px";
      tabHeader.style.gap = "16px";
      tabHeader.innerHTML = `
        <button class="finance-tab active" data-tab="totals" style="background: none; border: none; border-bottom: 2px solid var(--accent-purple); padding: 8px 4px; color: var(--text-primary); cursor: pointer; font-weight: 600; font-size: 0.9rem;">Totals & ROI</button>
        <button class="finance-tab" data-tab="averages" style="background: none; border: none; border-bottom: 2px solid transparent; padding: 8px 4px; color: var(--text-secondary); cursor: pointer; font-weight: 500; font-size: 0.9rem;">Averages & Margin</button>
      `;
      
      const tabContentContainer = document.createElement("div");
      tabContentContainer.className = "table-responsive";
      
      let activeTab = "totals";
      
      const renderTabTable = (tab) => {
        tabContentContainer.innerHTML = "";
        const table = document.createElement("table");
        table.className = "table";
        table.style.width = "100%";
        
        const periodHeader = breakdownType === "month" ? "Month" : (breakdownType === "year" ? "Year" : "Period");
        
        if (tab === "totals") {
          table.innerHTML = `
            <thead>
              <tr>
                <th>${periodHeader}</th>
                <th>Sold Keys</th>
                <th>Revenue</th>
                <th>Expenses</th>
                <th>Net Profit</th>
                <th>ROI</th>
              </tr>
            </thead>
            <tbody></tbody>
          `;
          const tbody = table.querySelector("tbody");
          sortedKeys.forEach(k => {
            const stats = groupedData[k];
            const roi = stats.cost > 0 ? (stats.profit / stats.cost) * 100 : 0;
            const periodLabel = breakdownType === "month" ? formatMonthKey(k) : k;
            
            const tr = document.createElement("tr");
            tr.innerHTML = `
              <td><strong>${periodLabel}</strong></td>
              <td>${stats.count} keys</td>
              <td>${formatCurrency(stats.revenue)}</td>
              <td>${formatCurrency(stats.cost)}</td>
              <td class="${stats.profit >= 0 ? 'text-success-neon' : 'text-danger-soft'}">${stats.profit >= 0 ? '+' : ''}${formatCurrency(stats.profit)}</td>
              <td><span class="badge ${roi >= 0 ? 'badge-available' : 'badge-sold'}">${roi.toFixed(1)}%</span></td>
            `;
            tbody.appendChild(tr);
          });
        } else {
          table.innerHTML = `
            <thead>
              <tr>
                <th>${periodHeader}</th>
                <th>Sold Keys</th>
                <th>Avg Price</th>
                <th>Avg Profit</th>
                <th>Avg Margin %</th>
                <th>Avg Duration</th>
              </tr>
            </thead>
            <tbody></tbody>
          `;
          const tbody = table.querySelector("tbody");
          sortedKeys.forEach(k => {
            const stats = groupedData[k];
            const avgPrice = stats.count > 0 ? stats.revenue / stats.count : 0;
            const avgProfit = stats.count > 0 ? stats.profit / stats.count : 0;
            const avgMargin = avgPrice > 0 ? (avgProfit / avgPrice) * 100 : 0;
            const avgDuration = stats.durationCount > 0 ? stats.totalSellDays / stats.durationCount : 0;
            const periodLabel = breakdownType === "month" ? formatMonthKey(k) : k;
            
            const tr = document.createElement("tr");
            tr.innerHTML = `
              <td><strong>${periodLabel}</strong></td>
              <td>${stats.count} keys</td>
              <td>${formatCurrency(avgPrice)}</td>
              <td class="${avgProfit >= 0 ? 'text-success-neon' : 'text-danger-soft'}">${avgProfit >= 0 ? '+' : ''}${formatCurrency(avgProfit)}</td>
              <td>${avgMargin.toFixed(1)}%</td>
              <td>${avgDuration.toFixed(1)} days</td>
            `;
            tbody.appendChild(tr);
          });
        }
        tabContentContainer.appendChild(table);
      };
      
      const tabBtns = tabHeader.querySelectorAll(".finance-tab");
      tabBtns.forEach(btn => {
        btn.addEventListener("click", () => {
          activeTab = btn.getAttribute("data-tab");
          tabBtns.forEach(b => {
            b.classList.toggle("active", b.getAttribute("data-tab") === activeTab);
            b.style.borderBottomColor = b.getAttribute("data-tab") === activeTab ? "var(--accent-purple)" : "transparent";
            b.style.color = b.getAttribute("data-tab") === activeTab ? "var(--text-primary)" : "var(--text-secondary)";
            b.style.fontWeight = b.getAttribute("data-tab") === activeTab ? "600" : "500";
          });
          renderTabTable(activeTab);
        });
      });
      
      detailContent.appendChild(tabHeader);
      detailContent.appendChild(tabContentContainer);
      renderTabTable(activeTab);
    }
  }
  else {
    if (sortedKeys.length === 0) {
      detailContent.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 25px;">No sales logged yet. Financial statistics are empty.</div>`;
    } else {
      const tableResponsive = document.createElement("div");
      tableResponsive.className = "table-responsive";
      
      const table = document.createElement("table");
      table.className = "table";
      table.style.width = "100%";
      const periodHeader = breakdownType === "month" ? "Month" : (breakdownType === "year" ? "Year" : "Period");
      
      table.innerHTML = `
        <thead>
          <tr>
            <th>${periodHeader}</th>
            <th>Sold Keys</th>
            <th>Revenue</th>
            <th>Expenses (Cost)</th>
            <th>Net Profit</th>
            <th>Avg Price</th>
            <th>Avg Profit</th>
            <th>Avg Margin %</th>
            <th>Avg Duration</th>
            <th>ROI</th>
          </tr>
        </thead>
        <tbody></tbody>
      `;
      
      const tbody = table.querySelector("tbody");
      sortedKeys.forEach(k => {
        const stats = groupedData[k];
        const roi = stats.cost > 0 ? (stats.profit / stats.cost) * 100 : 0;
        const avgPrice = stats.count > 0 ? stats.revenue / stats.count : 0;
        const avgProfit = stats.count > 0 ? stats.profit / stats.count : 0;
        const avgMargin = avgPrice > 0 ? (avgProfit / avgPrice) * 100 : 0;
        const avgDuration = stats.durationCount > 0 ? stats.totalSellDays / stats.durationCount : 0;
        const periodLabel = breakdownType === "month" ? formatMonthKey(k) : k;

        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td><strong>${periodLabel}</strong></td>
          <td>${stats.count} keys</td>
          <td>${formatCurrency(stats.revenue)}</td>
          <td>${formatCurrency(stats.cost)}</td>
          <td class="${stats.profit >= 0 ? 'text-success-neon' : 'text-danger-soft'}">${stats.profit >= 0 ? '+' : ''}${formatCurrency(stats.profit)}</td>
          <td>${formatCurrency(avgPrice)}</td>
          <td class="${avgProfit >= 0 ? 'text-success-neon' : 'text-danger-soft'}">${avgProfit >= 0 ? '+' : ''}${formatCurrency(avgProfit)}</td>
          <td>${avgMargin.toFixed(1)}%</td>
          <td>${avgDuration.toFixed(1)} days</td>
          <td><span class="badge ${roi >= 0 ? 'badge-available' : 'badge-sold'}">${roi.toFixed(1)}%</span></td>
        `;
        tbody.appendChild(tr);
      });
      tableResponsive.appendChild(table);
      detailContent.appendChild(tableResponsive);
    }
  }

  // Render trend chart
  if (typeof Chart === 'undefined') {
    console.warn("Chart.js is not loaded. Skipping trend chart.");
    return;
  }
  const ctx = canvas.getContext("2d");

  if (financeMonthlyChartInstance) {
    try {
      financeMonthlyChartInstance.destroy();
    } catch (e) {
      console.error("Error destroying financeMonthlyChartInstance:", e);
    }
  }

  // Group and format chart data based on chartBreakdownType: Month, Year, All-Time (Cumulative)
  let chartKeys = [];
  let revenueData = [];
  let costData = [];
  let profitData = [];

  if (chartBreakdownType === "month") {
    const monthlyData = {};
    state.sales.forEach(sale => {
      const m = sale.saleDate.substring(0, 7); // e.g. "2026-06"
      if (!monthlyData[m]) {
        monthlyData[m] = { revenue: 0, cost: 0, profit: 0 };
      }
      monthlyData[m].revenue += sale.sellPrice;
      monthlyData[m].cost += sale.cost;
      monthlyData[m].profit += sale.profit;
    });
    chartKeys = Object.keys(monthlyData).sort();
    revenueData = chartKeys.map(k => monthlyData[k].revenue);
    costData = chartKeys.map(k => monthlyData[k].cost);
    profitData = chartKeys.map(k => monthlyData[k].profit);
  } else if (chartBreakdownType === "year") {
    const yearlyData = {};
    state.sales.forEach(sale => {
      const y = sale.saleDate.substring(0, 4); // e.g. "2026"
      if (!yearlyData[y]) {
        yearlyData[y] = { revenue: 0, cost: 0, profit: 0 };
      }
      yearlyData[y].revenue += sale.sellPrice;
      yearlyData[y].cost += sale.cost;
      yearlyData[y].profit += sale.profit;
    });
    chartKeys = Object.keys(yearlyData).sort();
    revenueData = chartKeys.map(k => yearlyData[k].revenue);
    costData = chartKeys.map(k => yearlyData[k].cost);
    profitData = chartKeys.map(k => yearlyData[k].profit);
  } else { // "all" -> All-Time Cumulative Trend
    const monthlyData = {};
    state.sales.forEach(sale => {
      const m = sale.saleDate.substring(0, 7);
      if (!monthlyData[m]) {
        monthlyData[m] = { revenue: 0, cost: 0, profit: 0 };
      }
      monthlyData[m].revenue += sale.sellPrice;
      monthlyData[m].cost += sale.cost;
      monthlyData[m].profit += sale.profit;
    });
    chartKeys = Object.keys(monthlyData).sort();
    
    // Now compute running cumulative sums
    let runRev = 0, runCost = 0, runProf = 0;
    chartKeys.forEach(k => {
      runRev += monthlyData[k].revenue;
      runCost += monthlyData[k].cost;
      runProf += monthlyData[k].profit;
      revenueData.push(runRev);
      costData.push(runCost);
      profitData.push(runProf);
    });
  }

  const chartLabels = chartBreakdownType === "year" 
    ? chartKeys 
    : (chartKeys.length > 0 ? chartKeys.map(m => formatMonthKey(m)) : [formatMonthKey(new Date().toISOString().substring(0, 7))]);

  const rootStyle = getComputedStyle(document.documentElement);
  const textSecondaryColor = rootStyle.getPropertyValue('--text-secondary').trim() || 'hsl(220, 12%, 65%)';
  const borderColor = rootStyle.getPropertyValue('--border-color').trim() || 'hsla(224, 20%, 25%, 0.15)';
  const tooltipBg = rootStyle.getPropertyValue('--bg-sidebar').trim() || 'hsl(224, 25%, 10%)';

  financeMonthlyChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: chartLabels,
      datasets: [
        {
          label: `Revenue`,
          data: revenueData,
          borderColor: 'hsl(330, 95%, 60%)', // Pink
          backgroundColor: 'hsla(330, 95%, 60%, 0.05)',
          borderWidth: 3,
          fill: true,
          tension: 0.35,
          pointBackgroundColor: 'hsl(330, 95%, 60%)',
          pointHoverRadius: 6
        },
        {
          label: `Cost (Expenses)`,
          data: costData,
          borderColor: 'hsl(195, 90%, 50%)', // Cyan
          backgroundColor: 'hsla(195, 90%, 50%, 0.05)',
          borderWidth: 3,
          fill: true,
          tension: 0.35,
          pointBackgroundColor: 'hsl(195, 90%, 50%)',
          pointHoverRadius: 6
        },
        {
          label: `Net Profit`,
          data: profitData,
          borderColor: 'hsl(175, 90%, 48%)', // Teal
          backgroundColor: 'hsla(175, 90%, 48%, 0.05)',
          borderWidth: 3,
          fill: true,
          tension: 0.35,
          pointBackgroundColor: 'hsl(175, 90%, 48%)',
          pointHoverRadius: 6
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: {
            color: textSecondaryColor,
            font: { family: 'Inter', size: 12 }
          }
        },
        tooltip: {
          backgroundColor: tooltipBg,
          titleColor: state.theme !== "light" ? "#fff" : "#000",
          bodyColor: state.theme !== "light" ? "#fff" : "#000",
          borderColor: borderColor,
          borderWidth: 1
        }
      },
      scales: {
        x: {
          grid: { color: borderColor },
          ticks: { color: textSecondaryColor }
        },
        y: {
          grid: { color: borderColor },
          ticks: { color: textSecondaryColor }
        }
      }
    }
  });
}

// Initialize Payouts & Fees Ledger Controls
function initPayouts() {
  let form = document.getElementById("form-add-payout");
  if (form) {
    const newForm = form.cloneNode(true);
    form.parentNode.replaceChild(newForm, form);
    form = newForm;
  }

  const dateInput = document.getElementById("payout-date");
  if (dateInput) {
    dateInput.value = new Date().toISOString().slice(0, 10);
  }

  // Populate category dropdown
  populateCategoryDropdown();

  // Bind Manage Categories button
  const btnManageCategories = document.getElementById("btn-manage-categories");
  if (btnManageCategories) {
    btnManageCategories.addEventListener("click", () => {
      renderPayoutCategoriesList();
      openModal("payout-categories-modal");
    });
  }

  // Bind Add Category form
  const formAddCategory = document.getElementById("form-add-payout-category");
  if (formAddCategory) {
    const newFormAddCategory = formAddCategory.cloneNode(true);
    formAddCategory.parentNode.replaceChild(newFormAddCategory, formAddCategory);
    newFormAddCategory.addEventListener("submit", (e) => {
      e.preventDefault();
      const input = document.getElementById("new-payout-category-name");
      const name = input ? input.value.trim() : "";
      if (!name) return;

      if (state.expenseCategories.some(c => c.toLowerCase() === name.toLowerCase())) {
        showToast("Category name already exists.", "error");
        return;
      }

      pushToUndoStack();
      state.expenseCategories.push(name);
      saveStateToStorage();
      input.value = "";
      renderPayoutCategoriesList();
      populateCategoryDropdown();
      showToast("Category created successfully!", "success");
    });
  }

  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      
      const date = document.getElementById("payout-date").value;
      const category = document.getElementById("payout-category").value;
      const description = document.getElementById("payout-description").value.trim();
      const amount = parseFloat(document.getElementById("payout-amount").value);
      
      if (!date || !category || isNaN(amount) || amount < 0) {
        showToast("Please enter valid details.", "error");
        return;
      }
      
      const newPayout = {
        id: "payout_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9),
        date,
        category,
        description,
        amount
      };
      
      pushToUndoStack();
      state.payouts = state.payouts || [];
      state.payouts.push(newPayout);
      
      saveStateToStorage();
      
      // Update DB if Supabase is active
      if (window.supabaseClient) {
        localStorage.setItem("gv_unsynced_changes", "true");
        const syncIndicator = document.getElementById("sync-pending-indicator");
        if (syncIndicator) syncIndicator.classList.remove("hidden");
      }
      
      // Reset description and amount
      document.getElementById("payout-description").value = "";
      document.getElementById("payout-amount").value = "";
      
      renderPayoutsLedger();
      renderFinanceView();
      showToast("Expense/Fee logged successfully!", "success");
    });
  }

  const ledgerBody = document.getElementById("payouts-ledger-body");
  if (ledgerBody) {
    const newLedgerBody = ledgerBody.cloneNode(true);
    ledgerBody.parentNode.replaceChild(newLedgerBody, ledgerBody);
    DOM["payouts-ledger-body"] = newLedgerBody;
    newLedgerBody.addEventListener("click", (e) => {
      const btn = e.target.closest(".btn-delete-payout");
      if (btn) {
        const id = btn.getAttribute("data-id");
        if (!confirm("Are you sure you want to delete this record?")) {
          return;
        }
        
        state.payouts = state.payouts || [];
        state.payouts = state.payouts.filter(p => p.id !== id);
        
        saveStateToStorage();
        
        if (window.supabaseClient) {
          localStorage.setItem("gv_unsynced_changes", "true");
          const syncIndicator = document.getElementById("sync-pending-indicator");
          if (syncIndicator) syncIndicator.classList.remove("hidden");
        }
        
        renderPayoutsLedger();
        renderFinanceView();
        showToast("Expense record deleted.", "success");
      }
    });
  }

  renderPayoutsLedger();
}

// Populate the Category dropdown in form
function populateCategoryDropdown() {
  const dropdown = document.getElementById("payout-category");
  if (!dropdown) return;
  
  const currentVal = dropdown.value;
  dropdown.innerHTML = "";
  
  state.expenseCategories.forEach(cat => {
    const opt = document.createElement("option");
    opt.value = cat;
    opt.textContent = cat;
    dropdown.appendChild(opt);
  });
  
  if (state.expenseCategories.includes(currentVal)) {
    dropdown.value = currentVal;
  }
}

// Render categories manage list inside modal
function renderPayoutCategoriesList() {
  const listContainer = document.getElementById("payout-categories-list");
  if (!listContainer) return;
  
  listContainer.innerHTML = "";
  
  state.expenseCategories.forEach((cat, index) => {
    const li = document.createElement("li");
    li.style.display = "flex";
    li.style.alignItems = "center";
    li.style.justifyContent = "space-between";
    li.style.padding = "10px 14px";
    li.style.borderBottom = index < state.expenseCategories.length - 1 ? "1px solid var(--border-color)" : "none";
    
    li.innerHTML = `
      <div class="category-display-mode" style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
        <span class="category-name-text" style="font-weight: 500; color: var(--text-main);">${escapeHTML(cat)}</span>
        <div style="display: flex; gap: 8px;">
          <button type="button" class="btn btn-outline btn-xs btn-edit-category" data-index="${index}" style="padding: 2px 6px; font-size: 0.75rem;"><i class="fa-solid fa-pen"></i></button>
          <button type="button" class="btn btn-outline btn-xs btn-delete-category" data-index="${index}" style="padding: 2px 6px; font-size: 0.75rem; color: var(--accent-danger); border-color: var(--accent-danger);"><i class="fa-solid fa-trash"></i></button>
        </div>
      </div>
      <div class="category-edit-mode hidden" style="display: flex; align-items: center; gap: 8px; width: 100%;">
        <input type="text" class="form-control edit-category-input" value="${escapeHTML(cat)}" style="flex-grow: 1; padding: 4px 8px; font-size: 0.85rem;">
        <button type="button" class="btn btn-success btn-xs btn-save-category" data-index="${index}" style="padding: 4px 8px; font-size: 0.75rem;"><i class="fa-solid fa-check"></i></button>
        <button type="button" class="btn btn-outline btn-xs btn-cancel-category" style="padding: 4px 8px; font-size: 0.75rem;"><i class="fa-solid fa-xmark"></i></button>
      </div>
    `;
    
    // Bind inline edit/save/cancel events
    const displayDiv = li.querySelector(".category-display-mode");
    const editDiv = li.querySelector(".category-edit-mode");
    const editInput = li.querySelector(".edit-category-input");
    
    li.querySelector(".btn-edit-category").addEventListener("click", () => {
      displayDiv.classList.add("hidden");
      editDiv.classList.remove("hidden");
      editInput.focus();
    });
    
    li.querySelector(".btn-cancel-category").addEventListener("click", () => {
      displayDiv.classList.remove("hidden");
      editDiv.classList.add("hidden");
      editInput.value = cat;
    });
    
    li.querySelector(".btn-save-category").addEventListener("click", () => {
      const newName = editInput.value.trim();
      if (!newName) {
        showToast("Category name cannot be empty.", "error");
        return;
      }
      if (newName.toLowerCase() !== cat.toLowerCase() && state.expenseCategories.some(c => c.toLowerCase() === newName.toLowerCase())) {
        showToast("Category already exists.", "error");
        return;
      }
      
      pushToUndoStack();
      const oldName = state.expenseCategories[index];
      state.expenseCategories[index] = newName;
      
      // Update existing payouts' categories
      state.payouts.forEach(p => {
        if (p.category === oldName) p.category = newName;
      });
      
      saveStateToStorage();
      renderPayoutCategoriesList();
      populateCategoryDropdown();
      renderPayoutsLedger();
      updateUI();
      showToast("Category updated successfully!", "success");
    });
    
    li.querySelector(".btn-delete-category").addEventListener("click", () => {
      if (state.expenseCategories.length <= 1) {
        showToast("You must keep at least one category.", "error");
        return;
      }
      
      const oldName = state.expenseCategories[index];
      const count = state.payouts.filter(p => p.category === oldName).length;
      let confirmMsg = `Are you sure you want to delete category "${oldName}"?`;
      if (count > 0) {
        confirmMsg = `Category "${oldName}" is currently used by ${count} logged expense record(s). Deleting it will re-assign them to miscellaneous expenses. Continue?`;
      }
      
      if (confirm(confirmMsg)) {
        pushToUndoStack();
        state.expenseCategories.splice(index, 1);
        
        // Re-assign category to fallback
        const fallback = state.expenseCategories[0];
        state.payouts.forEach(p => {
          if (p.category === oldName) p.category = fallback;
        });
        
        saveStateToStorage();
        renderPayoutCategoriesList();
        populateCategoryDropdown();
        renderPayoutsLedger();
        updateUI();
        showToast("Category deleted.", "success");
      }
    });
    
    listContainer.appendChild(li);
  });
}

// Render the registered payouts list table
function renderPayoutsLedger() {
  const ledgerBody = document.getElementById("payouts-ledger-body");
  if (!ledgerBody) return;
  
  state.payouts = state.payouts || [];
  
  if (state.payouts.length === 0) {
    ledgerBody.innerHTML = `
      <tr>
        <td colspan="5" style="text-align: center; color: var(--text-muted); padding: 16px;">
          No operational expenses or fees recorded yet.
        </td>
      </tr>
    `;
    return;
  }
  
  // Sort payouts by date descending
  const sorted = [...state.payouts].sort((a, b) => {
    const dateA = a && typeof a.date === "string" ? a.date : "";
    const dateB = b && typeof b.date === "string" ? b.date : "";
    return dateB.localeCompare(dateA);
  });
  
  ledgerBody.innerHTML = sorted.map(p => {
    const categoryLabel = p.category 
      ? `<span class="badge" style="background-color: var(--bg-mini-metric); border: 1px solid var(--border-color); color: var(--text-secondary); font-size: 0.72rem; padding: 2px 6px; border-radius: 4px;">${escapeHTML(p.category)}</span>` 
      : `<span class="badge" style="background-color: var(--bg-mini-metric); border: 1px solid var(--border-color); color: var(--text-muted); font-size: 0.72rem; padding: 2px 6px; border-radius: 4px;">Uncategorized</span>`;
    return `
      <tr style="border-bottom: 1px solid var(--border-color);">
        <td style="font-size: 0.85rem; font-weight: 500; white-space: nowrap;">${p.date}</td>
        <td style="font-size: 0.85rem;">${categoryLabel}</td>
        <td style="font-size: 0.85rem; color: var(--text-main); font-weight: 500;">${escapeHTML(p.description || "-")}</td>
        <td style="font-size: 0.85rem; font-weight: 600; text-align: right; color: var(--accent-pink);">${formatCurrency(p.amount)}</td>
        <td style="text-align: center;">
          <button type="button" class="btn btn-outline btn-xs btn-delete-payout" data-id="${p.id}" style="padding: 2px 6px; color: var(--accent-danger); border-color: var(--accent-danger); cursor: pointer;" title="Delete Record">
            <i class="fa-solid fa-trash-can"></i>
          </button>
        </td>
      </tr>
    `;
  }).join("");
}

function formatMonthKey(monthKey) {
  const [year, month] = monthKey.split("-");
  const date = new Date(year, parseInt(month) - 1, 1);
  return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

function exportFinanceToCSV() {
  if (state.sales.length === 0) {
    showToast("No data to export.", "error");
    return;
  }

  const breakdownSelect = document.getElementById("finance-breakdown-type");
  const breakdownType = breakdownSelect ? breakdownSelect.value : "month";

  const groupedData = {};
  state.sales.forEach(sale => {
    let key = "All Time";
    if (breakdownType === "month") {
      key = sale.saleDate.substring(0, 7);
    } else if (breakdownType === "year") {
      key = sale.saleDate.substring(0, 4);
    }

    if (!groupedData[key]) {
      groupedData[key] = { revenue: 0, cost: 0, profit: 0, count: 0, totalSellDays: 0, durationCount: 0, payoutFees: 0 };
    }
    groupedData[key].revenue += sale.sellPrice;
    groupedData[key].cost += sale.cost;
    groupedData[key].profit += sale.profit;
    groupedData[key].count += 1;

    // Retrieve corresponding inventory purchaseDate
    const invItem = state.inventory.find(i => i.id === sale.inventoryId);
    if (invItem && invItem.purchaseDate && sale.saleDate) {
      const start = new Date(invItem.purchaseDate);
      const end = new Date(sale.saleDate);
      start.setHours(0, 0, 0, 0);
      end.setHours(0, 0, 0, 0);
      const diffTime = Math.max(0, end - start);
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
      groupedData[key].totalSellDays += diffDays;
      groupedData[key].durationCount += 1;
    }
  });

  // Calculate and aggregate Payouts / Fees for CSV
  state.payouts = state.payouts || [];
  state.payouts.forEach(p => {
    const amt = parseFloat(p.amount) || 0;
    
    let key = "All Time";
    if (breakdownType === "month") {
      key = p.date.substring(0, 7);
    } else if (breakdownType === "year") {
      key = p.date.substring(0, 4);
    }

    if (!groupedData[key]) {
      groupedData[key] = { revenue: 0, cost: 0, profit: 0, count: 0, totalSellDays: 0, durationCount: 0, payoutFees: 0 };
    }
    if (groupedData[key].payoutFees === undefined) {
      groupedData[key].payoutFees = 0;
    }
    groupedData[key].payoutFees += amt;
  });

  // Factor payout fees into period expenses and profits
  Object.keys(groupedData).forEach(k => {
    const stats = groupedData[k];
    const fees = stats.payoutFees || 0;
    stats.cost += fees;
    stats.profit -= fees;
  });

  const sortedKeys = Object.keys(groupedData).sort();
  
  const periodHeader = breakdownType === "month" ? "Month" : (breakdownType === "year" ? "Year" : "Period");
  const csvRows = [[periodHeader, "Sold Keys", "Revenue", "Cost/Expenses", "Net Profit", "Avg Sold Price", "Avg Profit", "Avg Margin (%)", "Avg Duration (Days)", "ROI (%)"]];

  sortedKeys.forEach(k => {
    const stats = groupedData[k];
    const roi = stats.cost > 0 ? (stats.profit / stats.cost) * 100 : 0;
    const avgPrice = stats.count > 0 ? stats.revenue / stats.count : 0;
    const avgProfit = stats.count > 0 ? stats.profit / stats.count : 0;
    const avgMargin = avgPrice > 0 ? (avgProfit / avgPrice) * 100 : 0;
    const avgDuration = stats.durationCount > 0 ? stats.totalSellDays / stats.durationCount : 0;
    const periodLabel = breakdownType === "month" ? formatMonthKey(k) : k;
    
    csvRows.push([
      periodLabel,
      stats.count,
      stats.revenue.toFixed(2),
      stats.cost.toFixed(2),
      stats.profit.toFixed(2),
      avgPrice.toFixed(2),
      avgProfit.toFixed(2),
      avgMargin.toFixed(1),
      avgDuration.toFixed(1),
      roi.toFixed(1)
    ]);
  });

  const filename = `GameVault_Finance_${breakdownType.toUpperCase()}_Export.csv`;
  downloadCSV(csvRows.join("\n"), filename);
  showToast(`Finance data aggregated by ${breakdownType} exported!`, "success");
}

// ==========================================================================
// SUPABASE CLOUD DATABASE SYNC SERVICES
// ==========================================================================

// Initialize Supabase Connection
function initSupabaseConnection() {
  const url = localStorage.getItem("gv_supabase_url") || "";
  const key = localStorage.getItem("gv_supabase_key") || "";
  
  const urlInput = document.getElementById("settings-supabase-url");
  const keyInput = document.getElementById("settings-supabase-key");
  const statusBadge = document.getElementById("db-connection-status");
  
  if (urlInput) urlInput.value = url;
  if (keyInput) keyInput.value = key;
  
  if (url && key && window.supabase) {
    try {
      window.supabaseClient = window.supabase.createClient(url, key);
      if (statusBadge) {
        statusBadge.textContent = "Connected";
        statusBadge.className = "badge badge-available";
      }
      dbLoadState();
    } catch (e) {
      console.error("Supabase initialization error:", e);
      window.supabaseClient = null;
      if (statusBadge) {
        statusBadge.textContent = "Error";
        statusBadge.className = "badge badge-sold";
      }
    }
  } else {
    window.supabaseClient = null;
    if (statusBadge) {
      statusBadge.textContent = "Not Connected";
      statusBadge.className = "badge badge-sold";
    }
  }
}

const SUPABASE_SETUP_SQL = `-- ==========================================================================
-- GAMEVAULT DATABASE SETUP SCHEMA
-- Copy and run this script in your Supabase SQL Editor.
-- ==========================================================================

-- 1. Create suppliers table
CREATE TABLE IF NOT EXISTS suppliers (
  name TEXT PRIMARY KEY,
  "dateAdded" NUMERIC NOT NULL,
  color TEXT,
  enabled BOOLEAN NOT NULL DEFAULT true
);

-- 2. Create platforms table
CREATE TABLE IF NOT EXISTS platforms (
  name TEXT PRIMARY KEY,
  "dateAdded" NUMERIC NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true
);

-- 3. Create inventory table
CREATE TABLE IF NOT EXISTS inventory (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  platform TEXT NOT NULL,
  key TEXT NOT NULL,
  cost NUMERIC(10, 2) NOT NULL,
  source TEXT NOT NULL,
  "purchaseDate" TEXT NOT NULL,
  "imageUrl" TEXT,
  status TEXT NOT NULL DEFAULT 'Available',
  notes TEXT,
  publisher TEXT
);

-- 4. Create sales table
CREATE TABLE IF NOT EXISTS sales (
  id TEXT PRIMARY KEY,
  "inventoryId" TEXT NOT NULL REFERENCES inventory(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  platform TEXT NOT NULL,
  cost NUMERIC(10, 2) NOT NULL,
  "sellPrice" NUMERIC(10, 2) NOT NULL,
  "platformSold" TEXT NOT NULL,
  fees NUMERIC(10, 2) NOT NULL DEFAULT 0,
  profit NUMERIC(10, 2) NOT NULL,
  "saleDate" TEXT NOT NULL,
  notes TEXT,
  disputed BOOLEAN NOT NULL DEFAULT false
);

-- 5. Create menu_customization table
CREATE TABLE IF NOT EXISTS menu_customization (
  key TEXT PRIMARY KEY,
  icon TEXT NOT NULL,
  title TEXT NOT NULL
);

-- 6. Create app_settings table
CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL
);

-- ==========================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Ensures public anon access if RLS is enabled in your database settings.
-- ==========================================================================

-- Enable RLS & create policies for suppliers
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anon Select" ON suppliers;
CREATE POLICY "Anon Select" ON suppliers FOR SELECT USING (true);
DROP POLICY IF EXISTS "Anon Insert" ON suppliers;
CREATE POLICY "Anon Insert" ON suppliers FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Anon Update" ON suppliers;
CREATE POLICY "Anon Update" ON suppliers FOR UPDATE USING (true);
DROP POLICY IF EXISTS "Anon Delete" ON suppliers;
CREATE POLICY "Anon Delete" ON suppliers FOR DELETE USING (true);

-- Enable RLS & create policies for platforms
ALTER TABLE platforms ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anon Select" ON platforms;
CREATE POLICY "Anon Select" ON platforms FOR SELECT USING (true);
DROP POLICY IF EXISTS "Anon Insert" ON platforms;
CREATE POLICY "Anon Insert" ON platforms FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Anon Update" ON platforms;
CREATE POLICY "Anon Update" ON platforms FOR UPDATE USING (true);
DROP POLICY IF EXISTS "Anon Delete" ON platforms;
CREATE POLICY "Anon Delete" ON platforms FOR DELETE USING (true);

-- Enable RLS & create policies for inventory
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anon Select" ON inventory;
CREATE POLICY "Anon Select" ON inventory FOR SELECT USING (true);
DROP POLICY IF EXISTS "Anon Insert" ON inventory;
CREATE POLICY "Anon Insert" ON inventory FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Anon Update" ON inventory;
CREATE POLICY "Anon Update" ON inventory FOR UPDATE USING (true);
DROP POLICY IF EXISTS "Anon Delete" ON inventory;
CREATE POLICY "Anon Delete" ON inventory FOR DELETE USING (true);

-- Enable RLS & create policies for sales
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anon Select" ON sales;
CREATE POLICY "Anon Select" ON sales FOR SELECT USING (true);
DROP POLICY IF EXISTS "Anon Insert" ON sales;
CREATE POLICY "Anon Insert" ON sales FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Anon Update" ON sales;
CREATE POLICY "Anon Update" ON sales FOR UPDATE USING (true);
DROP POLICY IF EXISTS "Anon Delete" ON sales;
CREATE POLICY "Anon Delete" ON sales FOR DELETE USING (true);

-- Enable RLS & create policies for menu_customization
ALTER TABLE menu_customization ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anon Select" ON menu_customization;
CREATE POLICY "Anon Select" ON menu_customization FOR SELECT USING (true);
DROP POLICY IF EXISTS "Anon Insert" ON menu_customization;
CREATE POLICY "Anon Insert" ON menu_customization FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Anon Update" ON menu_customization;
CREATE POLICY "Anon Update" ON menu_customization FOR UPDATE USING (true);
DROP POLICY IF EXISTS "Anon Delete" ON menu_customization;
CREATE POLICY "Anon Delete" ON menu_customization FOR DELETE USING (true);

-- Enable RLS & create policies for app_settings
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anon Select" ON app_settings;
CREATE POLICY "Anon Select" ON app_settings FOR SELECT USING (true);
DROP POLICY IF EXISTS "Anon Insert" ON app_settings;
CREATE POLICY "Anon Insert" ON app_settings FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Anon Update" ON app_settings;
CREATE POLICY "Anon Update" ON app_settings FOR UPDATE USING (true);
DROP POLICY IF EXISTS "Anon Delete" ON app_settings;
CREATE POLICY "Anon Delete" ON app_settings FOR DELETE USING (true);
`;

window.copySupabaseSQL = function() {
  copyTextToClipboard(SUPABASE_SETUP_SQL, "Supabase schema SQL copied to clipboard!");
};

window.downloadSupabaseSQL = function() {
  const blob = new Blob([SUPABASE_SETUP_SQL], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "supabase_schema.sql";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast("Downloaded supabase_schema.sql. Copy its contents into Supabase SQL Editor.", "success");
};

window.runSupabaseDiagnostics = async function() {
  if (!window.supabaseClient) {
    showToast("Please connect to Supabase first before running diagnostics.", "error");
    return;
  }
  
  showToast("Running connection diagnostics...", "info");
  const report = [];
  const tables = ["suppliers", "platforms", "inventory", "sales", "menu_customization", "app_settings"];
  let successCount = 0;
  
  for (const t of tables) {
    try {
      const { data, error } = await window.supabaseClient.from(t).select('*').limit(1);
      if (error) {
        report.push(`<span style="color: var(--accent-danger); font-weight: 500;">✗ Table "${t}" check failed: ${error.message}</span>`);
      } else {
        report.push(`<span style="color: var(--accent-teal); font-weight: 500;">✓ Table "${t}" exists and is readable</span>`);
        successCount++;
      }
    } catch (e) {
      report.push(`<span style="color: var(--accent-danger); font-weight: 500;">✗ Table "${t}" connection error</span>`);
    }
  }
  
  const diagOutput = document.getElementById("supabase-diag-output");
  if (diagOutput) {
    diagOutput.innerHTML = report.join("<br>");
    diagOutput.classList.remove("hidden");
  }
  
  if (successCount === tables.length) {
    showToast("Diagnostics complete: All tables exist and are connected!", "success");
  } else {
    showToast(`Diagnostics complete: ${tables.length - successCount} tables are missing or misconfigured.`, "warning");
  }
};

// Bind Database Connection Settings Controls
function bindSupabaseSettingsControls() {
  const btnConnect = document.getElementById("btn-connect-supabase");
  if (btnConnect) {
    const newBtnConnect = btnConnect.cloneNode(true);
    btnConnect.parentNode.replaceChild(newBtnConnect, btnConnect);
    newBtnConnect.addEventListener("click", async () => {
      const url = document.getElementById("settings-supabase-url")?.value.trim() || "";
      const key = document.getElementById("settings-supabase-key")?.value.trim() || "";
      
      if (!url || !key) {
        showToast("Please enter both Supabase URL and Anon Key.", "error");
        return;
      }
      
      localStorage.setItem("gv_supabase_url", url);
      localStorage.setItem("gv_supabase_key", key);
      
      showToast("Connecting and synchronizing database...", "info");
      initSupabaseConnection();
    });
  }

  const btnDisconnect = document.getElementById("btn-disconnect-supabase");
  if (btnDisconnect) {
    const newBtnDisconnect = btnDisconnect.cloneNode(true);
    btnDisconnect.parentNode.replaceChild(newBtnDisconnect, btnDisconnect);
    newBtnDisconnect.addEventListener("click", () => {
      localStorage.removeItem("gv_supabase_url");
      localStorage.removeItem("gv_supabase_key");
      
      const urlInput = document.getElementById("settings-supabase-url");
      const keyInput = document.getElementById("settings-supabase-key");
      if (urlInput) urlInput.value = "";
      if (keyInput) keyInput.value = "";
      
      initSupabaseConnection();
      
      // Load local state back
      loadStateFromStorage();
      updateUI();
      
      showToast("Disconnected from Supabase. Switched to LocalStorage.", "success");
    });
  }
}

// Initialize Firebase Connection
function initFirebaseConnection() {
  const apiKey = localStorage.getItem("gv_firebase_apikey") || "";
  const projectId = localStorage.getItem("gv_firebase_projectid") || "";
  const authDomain = localStorage.getItem("gv_firebase_authdomain") || "";
  const appId = localStorage.getItem("gv_firebase_appid") || "";

  const apiKeyInput = document.getElementById("settings-firebase-apikey");
  const projectIdInput = document.getElementById("settings-firebase-projectid");
  const authDomainInput = document.getElementById("settings-firebase-authdomain");
  const appIdInput = document.getElementById("settings-firebase-appid");
  const statusBadge = document.getElementById("firebase-connection-status");

  if (apiKeyInput) apiKeyInput.value = apiKey;
  if (projectIdInput) projectIdInput.value = projectId;
  if (authDomainInput) authDomainInput.value = authDomain;
  if (appIdInput) appIdInput.value = appId;

  if (apiKey && projectId && window.firebase) {
    try {
      if (window.firebase.apps.length === 0) {
        window.firebaseApp = window.firebase.initializeApp({
          apiKey,
          authDomain,
          projectId,
          appId
        });
      } else {
        window.firebaseApp = window.firebase.app();
      }
      
      if (statusBadge) {
        statusBadge.textContent = "Connected";
        statusBadge.className = "badge badge-available";
      }
    } catch (e) {
      console.error("Firebase initialization error:", e);
      window.firebaseApp = null;
      if (statusBadge) {
        statusBadge.textContent = "Error";
        statusBadge.className = "badge badge-sold";
      }
    }
  } else {
    window.firebaseApp = null;
    if (statusBadge) {
      statusBadge.textContent = "Not Connected";
      statusBadge.className = "badge badge-sold";
    }
  }
}

// Bind Firebase Connection Settings Controls
function bindFirebaseSettingsControls() {
  const btnConnect = document.getElementById("btn-connect-firebase");
  if (btnConnect) {
    const newBtnConnect = btnConnect.cloneNode(true);
    btnConnect.parentNode.replaceChild(newBtnConnect, btnConnect);
    newBtnConnect.addEventListener("click", () => {
      const apiKey = document.getElementById("settings-firebase-apikey")?.value.trim() || "";
      const projectId = document.getElementById("settings-firebase-projectid")?.value.trim() || "";
      const authDomain = document.getElementById("settings-firebase-authdomain")?.value.trim() || "";
      const appId = document.getElementById("settings-firebase-appid")?.value.trim() || "";

      if (!apiKey || !projectId) {
        showToast("Please enter at least API Key and Project ID.", "error");
        return;
      }

      localStorage.setItem("gv_firebase_apikey", apiKey);
      localStorage.setItem("gv_firebase_projectid", projectId);
      localStorage.setItem("gv_firebase_authdomain", authDomain);
      localStorage.setItem("gv_firebase_appid", appId);

      showToast("Connecting to Firebase...", "info");
      initFirebaseConnection();
      if (window.firebaseApp) {
        showToast("Connected to Firebase successfully!", "success");
      }
    });
  }

  const btnDisconnect = document.getElementById("btn-disconnect-firebase");
  if (btnDisconnect) {
    const newBtnDisconnect = btnDisconnect.cloneNode(true);
    btnDisconnect.parentNode.replaceChild(newBtnDisconnect, btnDisconnect);
    newBtnDisconnect.addEventListener("click", () => {
      localStorage.removeItem("gv_firebase_apikey");
      localStorage.removeItem("gv_firebase_projectid");
      localStorage.removeItem("gv_firebase_authdomain");
      localStorage.removeItem("gv_firebase_appid");

      const apiKeyInput = document.getElementById("settings-firebase-apikey");
      const projectIdInput = document.getElementById("settings-firebase-projectid");
      const authDomainInput = document.getElementById("settings-firebase-authdomain");
      const appIdInput = document.getElementById("settings-firebase-appid");

      if (apiKeyInput) apiKeyInput.value = "";
      if (projectIdInput) projectIdInput.value = "";
      if (authDomainInput) authDomainInput.value = "";
      if (appIdInput) appIdInput.value = "";

      if (window.firebase && window.firebase.apps.length > 0) {
        window.firebase.apps.forEach(app => app.delete());
      }
      window.firebaseApp = null;

      initFirebaseConnection();
      showToast("Disconnected from Firebase.", "success");
    });
  }
}

// ==========================================================================
// GITHUB SYNC SERVICES
// ==========================================================================

// Helper for Base64 encode supporting Unicode
function safeBase64Encode(str) {
  return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, function(match, p1) {
    return String.fromCharCode(parseInt(p1, 16));
  }));
}

// Helper for Base64 decode supporting Unicode
function safeBase64Decode(str) {
  return decodeURIComponent(Array.prototype.map.call(atob(str), function(c) {
    return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
  }).join(''));
}

// Initialize GitHub Connection Settings
function initGitHubConnection() {
  const token = localStorage.getItem("gv_github_token") || "";
  const repo = localStorage.getItem("gv_github_repo") || "";
  const branch = localStorage.getItem("gv_github_branch") || "main";
  const path = localStorage.getItem("gv_github_path") || "gamevault_backup.json";

  const tokenInput = document.getElementById("settings-github-token");
  const repoInput = document.getElementById("settings-github-repo");
  const branchInput = document.getElementById("settings-github-branch");
  const pathInput = document.getElementById("settings-github-path");
  const statusBadge = document.getElementById("github-connection-status");
  const actionsRow = document.getElementById("github-actions-row");

  if (tokenInput) tokenInput.value = token;
  if (repoInput) repoInput.value = repo;
  if (branchInput) branchInput.value = branch;
  if (pathInput) pathInput.value = path;

  if (token && repo) {
    if (statusBadge) {
      statusBadge.textContent = "Connected";
      statusBadge.className = "badge badge-available";
    }
    if (actionsRow) actionsRow.classList.remove("hidden");
  } else {
    if (statusBadge) {
      statusBadge.textContent = "Not Connected";
      statusBadge.className = "badge badge-sold";
    }
    if (actionsRow) actionsRow.classList.add("hidden");
  }
}

// Bind GitHub Settings Controls
function bindGitHubSettingsControls() {
  const btnConnect = document.getElementById("btn-connect-github");
  if (btnConnect) {
    const newBtnConnect = btnConnect.cloneNode(true);
    btnConnect.parentNode.replaceChild(newBtnConnect, btnConnect);
    newBtnConnect.addEventListener("click", () => {
      const token = document.getElementById("settings-github-token")?.value.trim() || "";
      const repo = document.getElementById("settings-github-repo")?.value.trim() || "";
      let branch = document.getElementById("settings-github-branch")?.value.trim() || "main";
      let path = document.getElementById("settings-github-path")?.value.trim() || "gamevault_backup.json";

      if (!token || !repo) {
        showToast("Please enter at least GitHub PAT Token and Repository name.", "error");
        return;
      }

      localStorage.setItem("gv_github_token", token);
      localStorage.setItem("gv_github_repo", repo);
      localStorage.setItem("gv_github_branch", branch);
      localStorage.setItem("gv_github_path", path);

      showToast("Configuring GitHub connection...", "info");
      initGitHubConnection();
      showToast("GitHub configured successfully!", "success");
    });
  }

  const btnDisconnect = document.getElementById("btn-disconnect-github");
  if (btnDisconnect) {
    const newBtnDisconnect = btnDisconnect.cloneNode(true);
    btnDisconnect.parentNode.replaceChild(newBtnDisconnect, btnDisconnect);
    newBtnDisconnect.addEventListener("click", () => {
      localStorage.removeItem("gv_github_token");
      localStorage.removeItem("gv_github_repo");
      localStorage.removeItem("gv_github_branch");
      localStorage.removeItem("gv_github_path");

      const tokenInput = document.getElementById("settings-github-token");
      const repoInput = document.getElementById("settings-github-repo");
      const branchInput = document.getElementById("settings-github-branch");
      const pathInput = document.getElementById("settings-github-path");

      if (tokenInput) tokenInput.value = "";
      if (repoInput) repoInput.value = "";
      if (branchInput) branchInput.value = "main";
      if (pathInput) pathInput.value = "gamevault_backup.json";

      initGitHubConnection();
      showToast("GitHub integration disconnected.", "success");
    });
  }

  const btnPush = document.getElementById("btn-github-push");
  if (btnPush) {
    const newBtnPush = btnPush.cloneNode(true);
    btnPush.parentNode.replaceChild(newBtnPush, btnPush);
    newBtnPush.addEventListener("click", syncToGitHub);
  }

  const btnPull = document.getElementById("btn-github-pull");
  if (btnPull) {
    const newBtnPull = btnPull.cloneNode(true);
    btnPull.parentNode.replaceChild(newBtnPull, btnPull);
    newBtnPull.addEventListener("click", syncFromGitHub);
  }
}

// Push local backup state to GitHub repository
async function syncToGitHub(isBackground = false) {
  const token = localStorage.getItem("gv_github_token") || "";
  const repo = localStorage.getItem("gv_github_repo") || "";
  const branch = localStorage.getItem("gv_github_branch") || "main";
  const path = localStorage.getItem("gv_github_path") || "gamevault_backup.json";

  if (!token || !repo) {
    if (!isBackground) showToast("GitHub configuration is missing.", "error");
    return;
  }

  if (!isBackground) showToast("Preparing state upload...", "info");
  const backupContent = getBackupPayloadJSON();
  const url = `https://api.github.com/repos/${repo}/contents/${path}`;

  try {
    // 1. Check if file already exists to get its SHA
    let sha;
    const checkRes = await fetch(`${url}?ref=${branch}`, {
      method: "GET",
      headers: {
        "Authorization": `token ${token}`,
        "Accept": "application/vnd.github.v3+json"
      }
    });

    if (checkRes.status === 200) {
      const fileData = await checkRes.json();
      sha = fileData.sha;
    }

    // 2. Put the file contents
    const putBody = {
      message: `Automatic database sync: ${new Date().toISOString()}`,
      content: safeBase64Encode(backupContent),
      branch: branch
    };
    if (sha) {
      putBody.sha = sha;
    }

    const putRes = await fetch(url, {
      method: "PUT",
      headers: {
        "Authorization": `token ${token}`,
        "Content-Type": "application/json",
        "Accept": "application/vnd.github.v3+json"
      },
      body: JSON.stringify(putBody)
    });

    if (putRes.status === 200 || putRes.status === 201) {
      showToast(isBackground ? "Auto-sync: database backed up to GitHub!" : "Successfully backed up database state to GitHub!", "success");
    } else {
      const errData = await putRes.json();
      throw new Error(errData.message || `HTTP ${putRes.status}`);
    }
  } catch (e) {
    console.error("GitHub push error:", e);
    showToast(`GitHub Push Failed: ${e.message}`, "error");
  }
}

// Pull backup state from GitHub repository and restore
async function syncFromGitHub(isBackground = false) {
  const token = localStorage.getItem("gv_github_token") || "";
  const repo = localStorage.getItem("gv_github_repo") || "";
  const branch = localStorage.getItem("gv_github_branch") || "main";
  const path = localStorage.getItem("gv_github_path") || "gamevault_backup.json";

  if (!token || !repo) {
    if (!isBackground) showToast("GitHub configuration is missing.", "error");
    return;
  }

  if (isBackground) {
    showToast("Auto-sync: Fetching backup file from GitHub...", "info");
  } else {
    showToast("Fetching backup file from GitHub...", "info");
  }
  const url = `https://api.github.com/repos/${repo}/contents/${path}?ref=${branch}`;

  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        "Authorization": `token ${token}`,
        "Accept": "application/vnd.github.v3+json"
      }
    });

    if (res.status === 200) {
      const fileData = await res.json();
      const encodedContent = fileData.content.replace(/\s/g, ""); // Strip newlines
      const backupJSONStr = safeBase64Decode(encodedContent);
      const data = JSON.parse(backupJSONStr);

      if (!data.gv_inventory || !data.gv_sales) {
        showToast("Invalid file structure. Pull object is not a valid GameVault backup.", "error");
        return;
      }

      if (!isBackground) {
        if (!confirm("Are you sure you want to restore the backup from GitHub? All current local records and settings will be overwritten.")) {
          return;
        }
      }

      // To prevent sync loop, set a flag so we don't trigger auto-push during pull loading
      state._isRestoring = true;

      Object.keys(data).forEach(k => {
        localStorage.setItem(k, data[k]);
      });

      showToast("Database state successfully pulled and restored! Reloading...", "success");
      
      if (window.supabaseClient) {
        localStorage.setItem("gv_unsynced_changes", "true");
      }

      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } else if (res.status === 404) {
      if (!isBackground) {
        showToast(`GitHub Pull Failed: File not found at path "${path}" in branch "${branch}".`, "error");
      }
    } else {
      const errData = await res.json();
      throw new Error(errData.message || `HTTP ${res.status}`);
    }
  } catch (e) {
    console.error("GitHub pull error:", e);
    if (!isBackground) {
      showToast(`GitHub Pull Failed: ${e.message}`, "error");
    }
  }
}

// Fetch all database state from Supabase
async function dbLoadState() {
  if (!window.supabaseClient) return;
  
  try {
    const { data: inventoryData, error: invError } = await window.supabaseClient
      .from('inventory')
      .select('*');
    if (invError) throw invError;
    
    const { data: salesData, error: salesError } = await window.supabaseClient
      .from('sales')
      .select('*');
    if (salesError) throw salesError;

    const { data: suppliersData, error: suppliersError } = await window.supabaseClient
      .from('suppliers')
      .select('*');
    if (suppliersError) throw suppliersError;

    const { data: customData, error: customError } = await window.supabaseClient
      .from('menu_customization')
      .select('*');
    if (customError) throw customError;

    const { data: settingsData, error: settingsError } = await window.supabaseClient
      .from('app_settings')
      .select('*');
    if (settingsError) throw settingsError;

    let platformsData = null;
    try {
      const { data, error } = await window.supabaseClient
        .from('platforms')
        .select('*');
      if (error) {
        console.warn("Supabase platforms table error (might not exist):", error);
      } else {
        platformsData = data;
      }
    } catch (e) {
      console.warn("Error querying platforms from Supabase:", e);
    }

    // Seed database if empty
    if ((!inventoryData || inventoryData.length === 0) && 
        (!salesData || salesData.length === 0) && 
        (!suppliersData || suppliersData.length === 0)) {
      showToast("Syncing: Cloud database is empty. Seeding with initial data...", "info");
      await dbSeedDatabase();
      return;
    }

    state.inventory = inventoryData || [];
    state.sales = salesData || [];
    
    if (suppliersData && suppliersData.length > 0) {
      state.suppliers = suppliersData.map(s => ({
        name: s.name,
        dateAdded: Number(s.dateAdded),
        color: s.color,
        enabled: s.enabled !== false,
        logo: s.logo || null
      }));
    }

    if (platformsData && platformsData.length > 0) {
      state.platforms = platformsData.map(p => ({
        name: p.name,
        dateAdded: Number(p.dateAdded),
        enabled: p.enabled !== false,
        logo: p.logo || null
      }));
    }

    if (customData && customData.length > 0) {
      customData.forEach(c => {
        if (c.icon) state.menuIcons[c.key] = c.icon;
        if (c.title) state.menuTitles[c.key] = c.title;
      });
    }

    if (settingsData && settingsData.length > 0) {
      settingsData.forEach(s => {
        if (s.key === "themeMode") {
          state.themeMode = s.value;
          applyTheme(state.themeMode, state.themeColor);
          updateThemeSelectionCards(state.themeMode, state.themeColor);
        } else if (s.key === "themeColor") {
          state.themeColor = s.value;
          applyTheme(state.themeMode, state.themeColor);
          updateThemeSelectionCards(state.themeMode, state.themeColor);
        } else if (s.key === "theme") {
          // Handle legacy remote theme load
          const val = s.value;
          if (val === "light") {
            state.themeMode = "light";
            state.themeColor = "classic";
          } else {
            state.themeMode = "dark";
            state.themeColor = val === "dark" ? "classic" : val;
          }
          applyTheme(state.themeMode, state.themeColor);
          updateThemeSelectionCards(state.themeMode, state.themeColor);
        } else if (s.key === "currency") {
          state.currency = s.value;
          updateCurrencySymbols();
          updateCurrencySelectionCards(state.currency);
        } else if (s.key === "dateFormat") {
          state.dateFormat = s.value;
          applyDateFormat(state.dateFormat);
        } else if (s.key === "fontSize") {
          state.fontSize = s.value;
          applyFontSize(state.fontSize);

        } else if (s.key === "showSalesLedger") {
          state.showSalesLedger = s.value;
          applySalesLedgerVisibility(state.showSalesLedger);
          const toggleSales = document.getElementById("toggle-show-sales-ledger");
          if (toggleSales) toggleSales.checked = state.showSalesLedger;
        } else if (s.key === "menuVisibility") {
          try {
            state.menuVisibility = typeof s.value === 'string' ? JSON.parse(s.value) : s.value;
            if (state.menuVisibility.sales !== undefined) {
              state.showSalesLedger = state.menuVisibility.sales;
              applySalesLedgerVisibility(state.showSalesLedger);
            }
            renderSidebarMenu();
            renderSidebarCustomizationSettings();
          } catch (e) {
            console.error("Error parsing menuVisibility from database sync:", e);
          }

        } else if (s.key === "visibleMetrics") {
          try {
            state.visibleMetrics = typeof s.value === 'string' ? JSON.parse(s.value) : s.value;
          } catch(e) {
            console.error("Error parsing visibleMetrics:", e);
            state.visibleMetrics = s.value;
          }
          applyMetricsVisibility();
        } else if (s.key === "supVisibleMetrics") {
          try {
            state.supVisibleMetrics = typeof s.value === 'string' ? JSON.parse(s.value) : s.value;
          } catch(e) {
            console.error("Error parsing supVisibleMetrics:", e);
            state.supVisibleMetrics = s.value;
          }
          applySupplierMetricsVisibility();
        } else if (s.key === "visibleFigures") {
          try {
            state.visibleFigures = typeof s.value === 'string' ? JSON.parse(s.value) : s.value;
          } catch(e) {
            console.error("Error parsing visibleFigures:", e);
            state.visibleFigures = s.value;
          }
          applyFiguresVisibility();
        } else if (s.key === "metricOrder") {
          try {
            state.metricOrder = typeof s.value === 'string' ? JSON.parse(s.value) : s.value;
          } catch(e) {
            console.error("Error parsing metricOrder:", e);
            state.metricOrder = s.value;
          }
          applyMetricOrder();
        } else if (s.key === "dashboardOrder") {
          try {
            state.dashboardOrder = typeof s.value === 'string' ? JSON.parse(s.value) : s.value;
            const expectedKeys = ["salesProfit", "platformSplit", "costRevenue", "supplierSplit", "topBestsellers", "dailyProfitMonth"];
            state.dashboardOrder = state.dashboardOrder.filter(k => expectedKeys.includes(k));
            expectedKeys.forEach(k => {
              if (!state.dashboardOrder.includes(k)) {
                state.dashboardOrder.push(k);
              }
            });
            renderDashboardCardsOrder();
          } catch(e) {
            console.error("Error parsing dashboardOrder:", e);
          }
        } else if (s.key === "dashboardSpans") {
          try {
            state.dashboardSpans = typeof s.value === 'string' ? JSON.parse(s.value) : s.value;
            applyDashboardSpans();
          } catch(e) {
            console.error("Error parsing dashboardSpans from database sync:", e);
          }
        } else if (s.key === "widgetSettings") {
          try {
            state.widgetSettings = typeof s.value === 'string' ? JSON.parse(s.value) : s.value;
            applyWidgetVisibility();
            applyDashboardSpans();
          } catch(e) {
            console.error("Error parsing widgetSettings from database sync:", e);
          }
        } else if (s.key === "favoriteGames") {
          try {
            state.favoriteGames = typeof s.value === 'string' ? JSON.parse(s.value) : s.value;
            if (!Array.isArray(state.favoriteGames)) state.favoriteGames = [];
          } catch(e) {
            console.error("Error parsing favoriteGames from database sync:", e);
          }
        } else if (s.key === "supMetricOrder") {
          try {
            state.supMetricOrder = typeof s.value === 'string' ? JSON.parse(s.value) : s.value;
          } catch(e) {
            console.error("Error parsing supMetricOrder:", e);
            state.supMetricOrder = s.value;
          }
          applySupplierMetricOrder();
        } else if (s.key === "customLogo") {
          state.customLogo = s.value;
          applyLogo(state.customLogo);
        } else if (s.key === "supplierDisplayMode") {
          state.supplierDisplayMode = s.value;
          const supplierDisplayInput = document.getElementById("settings-supplier-display");
          if (supplierDisplayInput) {
            supplierDisplayInput.value = state.supplierDisplayMode || "name";
          }
        } else if (s.key === "platformDisplayMode") {
          state.platformDisplayMode = s.value;
        } else if (s.key === "inventorySortBy") {
          state.inventorySortBy = s.value;
          const invSortInput = document.getElementById("inv-sort-by");
          if (invSortInput) {
            invSortInput.value = state.inventorySortBy || "date-desc";
          }
        }
      });
    }

    applyMenuIcons();
    applyMenuTitles();
    renderSidebarCustomizationSettings();
    updateUI();
    showToast("Cloud database synchronized successfully.", "success");
  } catch (err) {
    console.error("Error loading state from Supabase:", err);
    showToast("Failed to sync cloud database. Check project tables.", "error");
  }
}

// Seed Database with current mock data
async function dbSeedDatabase() {
  if (!window.supabaseClient) return;
  try {
    if (state.suppliers.length > 0) {
      await window.supabaseClient
        .from('suppliers')
        .insert(state.suppliers.map(s => ({
          name: s.name,
          dateAdded: s.dateAdded,
          color: s.color,
          enabled: s.enabled !== false
        })));
    }

    if (state.platforms.length > 0) {
      try {
        await window.supabaseClient
          .from('platforms')
          .insert(state.platforms.map(p => ({
            name: p.name,
            dateAdded: p.dateAdded,
            enabled: p.enabled !== false
          })));
      } catch (err) {
        console.warn("Could not seed platforms table in Supabase. It might not exist:", err);
      }
    }
    
    if (state.inventory.length > 0) {
      await window.supabaseClient
        .from('inventory')
        .insert(state.inventory.map(item => ({
          id: item.id,
          title: item.title,
          platform: item.platform,
          key: item.key,
          cost: item.cost,
          source: item.source,
          purchaseDate: item.purchaseDate,
          imageUrl: item.imageUrl || null,
          status: item.status,
          notes: item.notes || null
        })));
    }

    if (state.sales.length > 0) {
      await window.supabaseClient
        .from('sales')
        .insert(state.sales.map(sale => ({
          id: sale.id,
          inventoryId: sale.inventoryId,
          title: sale.title,
          platform: sale.platform,
          cost: sale.cost,
          sellPrice: sale.sellPrice,
          platformSold: sale.platformSold,
          fees: sale.fees,
          profit: sale.profit,
          saleDate: sale.saleDate,
          notes: sale.notes || null,
          disputed: sale.disputed === true
        })));
    }

    const menus = ["dashboard", "inventory", "sales", "finance", "suppliers", "entries", "settings"];
    const customData = menus.map(m => ({
      key: m,
      icon: state.menuIcons[m] || "fa-gear",
      title: state.menuTitles[m] || m
    }));
    await window.supabaseClient
      .from('menu_customization')
      .insert(customData);

    const settings = [
      { key: "themeMode", value: state.themeMode },
      { key: "themeColor", value: state.themeColor },
      { key: "theme", value: state.themeMode === "light" ? "light" : state.themeColor },
      { key: "currency", value: state.currency },
      { key: "dateFormat", value: state.dateFormat },
      { key: "fontSize", value: state.fontSize },
      { key: "showSalesLedger", value: state.showSalesLedger },
      { key: "visibleMetrics", value: state.visibleMetrics },
      { key: "supVisibleMetrics", value: state.supVisibleMetrics },
      { key: "visibleFigures", value: state.visibleFigures },
      { key: "metricOrder", value: state.metricOrder },
      { key: "supMetricOrder", value: state.supMetricOrder },
      { key: "customLogo", value: state.customLogo },
      { key: "lowStockThreshold", value: state.lowStockThreshold },
      { key: "defaultMarkupType", value: state.defaultMarkupType },
      { key: "defaultMarkupValue", value: state.defaultMarkupValue },
      { key: "syncMode", value: state.syncMode },
      { key: "supplierDisplayMode", value: state.supplierDisplayMode },
      { key: "platformDisplayMode", value: state.platformDisplayMode },
      { key: "dashboardOrder", value: state.dashboardOrder },
      { key: "dashboardSpans", value: state.dashboardSpans },
      { key: "widgetSettings", value: state.widgetSettings }
    ];
    
    for (const s of settings) {
      await window.supabaseClient
        .from('app_settings')
        .insert({ key: s.key, value: s.value });
    }

    showToast("Cloud seeding completed.", "success");
    await dbLoadState();
  } catch (err) {
    console.error("Error seeding cloud database:", err);
    showToast("Failed to seed cloud database. Check tables/keys.", "error");
  }
}

// Database Mutators
async function dbSaveInventory(item) {
  if (!window.supabaseClient) return false;
  if (state.syncMode === "manual") {
    setUnsyncedChanges(true);
    return true;
  }
  try {
    const { error } = await window.supabaseClient
      .from('inventory')
      .upsert({
        id: item.id,
        title: item.title,
        platform: item.platform,
        key: item.key,
        cost: item.cost,
        source: item.source,
        purchaseDate: item.purchaseDate,
        imageUrl: item.imageUrl || null,
        status: item.status,
        notes: item.notes || null,
        publisher: item.publisher || null
      });
    if (error) throw error;
    return true;
  } catch (err) {
    console.error("Error saving inventory item to Supabase:", err);
    if (err && (err.code === '22P02' || (err.message && err.message.includes('invalid input syntax for type uuid')))) {
      showToast("Sync failed: Database UUID schema mismatch. Check developer console.", "error");
      console.error("CRITICAL SCHEMA ERROR: Your Supabase sales/inventory table columns are type UUID, but GameVault uses custom text string IDs. Please run the migration script in your Supabase SQL Editor to alter columns to TEXT:\n\nALTER TABLE sales DROP CONSTRAINT IF EXISTS sales_id_fkey;\nALTER TABLE inventory ALTER COLUMN id TYPE TEXT;\nALTER TABLE sales ALTER COLUMN id TYPE TEXT;\nALTER TABLE sales ALTER COLUMN \"inventoryId\" TYPE TEXT;\nALTER TABLE sales ADD CONSTRAINT sales_id_fkey FOREIGN KEY (id) REFERENCES inventory(id) ON DELETE CASCADE;");
    } else {
      showToast("Failed to save changes: " + (err.message || "Unknown error"), "error");
    }
    return false;
  }
}

async function dbDeleteInventory(id) {
  if (!window.supabaseClient) return;
  if (state.syncMode === "manual") {
    if (!state.pendingDeletes.inventory.includes(id)) {
      state.pendingDeletes.inventory.push(id);
      saveStateToStorage();
    }
    setUnsyncedChanges(true);
    return;
  }
  try {
    const { error } = await window.supabaseClient
      .from('inventory')
      .delete()
      .eq('id', id);
    if (error) throw error;
  } catch (err) {
    console.error("Error deleting inventory item from Supabase:", err);
    showToast("Failed to delete item from cloud.", "error");
  }
}

async function dbSaveSale(sale) {
  if (!window.supabaseClient) return false;
  if (state.syncMode === "manual") {
    setUnsyncedChanges(true);
    return true;
  }
  try {
    const payload = {
      id: sale.id,
      inventoryId: sale.inventoryId,
      title: sale.title,
      platform: sale.platform,
      cost: sale.cost,
      sellPrice: sale.sellPrice,
      platformSold: sale.platformSold,
      fees: sale.fees,
      profit: sale.profit,
      saleDate: sale.saleDate,
      notes: sale.notes || null,
      disputed: sale.disputed === true
    };
    
    const { error } = await window.supabaseClient
      .from('sales')
      .upsert(payload);
      
    if (error) {
      if (error.message && error.message.includes('column "disputed" of relation "sales" does not exist')) {
        console.warn("Supabase relation 'sales' is missing the 'disputed' column. Retrying without disputed property. Please update database schema using settings setup wizard.");
        delete payload.disputed;
        const { error: retryError } = await window.supabaseClient
          .from('sales')
          .upsert(payload);
        if (retryError) throw retryError;
      } else {
        throw error;
      }
    }
    return true;
  } catch (err) {
    console.error("Error saving sale to Supabase:", err);
    if (err && (err.code === '22P02' || (err.message && err.message.includes('invalid input syntax for type uuid')))) {
      showToast("Sync failed: Database UUID schema mismatch. Check developer console.", "error");
      console.error("CRITICAL SCHEMA ERROR: Your Supabase sales/inventory table columns are type UUID, but GameVault uses custom text string IDs. Please run the migration script in your Supabase SQL Editor to alter columns to TEXT:\n\nALTER TABLE sales DROP CONSTRAINT IF EXISTS sales_id_fkey;\nALTER TABLE inventory ALTER COLUMN id TYPE TEXT;\nALTER TABLE sales ALTER COLUMN id TYPE TEXT;\nALTER TABLE sales ALTER COLUMN \"inventoryId\" TYPE TEXT;\nALTER TABLE sales ADD CONSTRAINT sales_id_fkey FOREIGN KEY (id) REFERENCES inventory(id) ON DELETE CASCADE;");
    } else {
      showToast("Failed to save transaction: " + (err.message || "Unknown error"), "error");
    }
    return false;
  }
}

async function dbDeleteSale(id) {
  if (!window.supabaseClient) return;
  if (state.syncMode === "manual") {
    if (!state.pendingDeletes.sales.includes(id)) {
      state.pendingDeletes.sales.push(id);
      saveStateToStorage();
    }
    setUnsyncedChanges(true);
    return;
  }
  try {
    const { error } = await window.supabaseClient
      .from('sales')
      .delete()
      .eq('id', id);
    if (error) throw error;
  } catch (err) {
    console.error("Error deleting sale from Supabase:", err);
    showToast("Failed to delete transaction from cloud.", "error");
  }
}

async function dbSaveSupplier(supplier) {
  if (!window.supabaseClient) return;
  if (state.syncMode === "manual") {
    setUnsyncedChanges(true);
    return;
  }
  try {
    const { error } = await window.supabaseClient
      .from('suppliers')
      .upsert({
        name: supplier.name,
        dateAdded: supplier.dateAdded,
        color: supplier.color,
        enabled: supplier.enabled !== false,
        logo: supplier.logo || null
      });
    if (error) {
      if (error.message && error.message.includes('column "logo" of relation "suppliers" does not exist')) {
        console.warn("Supabase relation 'suppliers' is missing the 'logo' column. Falling back to upsert without logo.");
        const { error: fallbackErr } = await window.supabaseClient
          .from('suppliers')
          .upsert({
            name: supplier.name,
            dateAdded: supplier.dateAdded,
            color: supplier.color,
            enabled: supplier.enabled !== false
          });
        if (fallbackErr) throw fallbackErr;
      } else {
        throw error;
      }
    }
  } catch (err) {
    console.error("Error saving supplier to Supabase:", err);
    showToast("Failed to save supplier to cloud.", "error");
  }
}

async function dbDeleteSupplier(name) {
  if (!window.supabaseClient) return;
  if (state.syncMode === "manual") {
    if (!state.pendingDeletes.suppliers.includes(name)) {
      state.pendingDeletes.suppliers.push(name);
      saveStateToStorage();
    }
    setUnsyncedChanges(true);
    return;
  }
  try {
    const { error } = await window.supabaseClient
      .from('suppliers')
      .delete()
      .eq('name', name);
    if (error) throw error;
  } catch (err) {
    console.error("Error deleting supplier from Supabase:", err);
    showToast("Failed to delete supplier from cloud.", "error");
  }
}

async function dbSaveCustomization(key, title, icon) {
  if (!window.supabaseClient) return;
  if (state.syncMode === "manual") {
    setUnsyncedChanges(true);
    return;
  }
  try {
    const { error } = await window.supabaseClient
      .from('menu_customization')
      .upsert({ key, title, icon });
    if (error) throw error;
  } catch (err) {
    console.error("Error saving menu customization to Supabase:", err);
  }
}

async function dbSaveSettings(key, value) {
  if (!window.supabaseClient) return;
  if (state.syncMode === "manual") {
    setUnsyncedChanges(true);
    return;
  }
  try {
    const { error } = await window.supabaseClient
      .from('app_settings')
      .upsert({ key, value });
    if (error) throw error;
  } catch (err) {
    console.error(`Error saving app setting "${key}" to Supabase:`, err);
  }
}

async function dbSavePlatform(platform) {
  if (!window.supabaseClient) return;
  if (state.syncMode === "manual") {
    setUnsyncedChanges(true);
    return;
  }
  try {
    const { error } = await window.supabaseClient
      .from('platforms')
      .upsert({
        name: platform.name,
        dateAdded: platform.dateAdded,
        enabled: platform.enabled !== false,
        logo: platform.logo || null
      });
    if (error) {
      if (error.message && error.message.includes('column "logo" of relation "platforms" does not exist')) {
        console.warn("Supabase relation 'platforms' is missing the 'logo' column. Falling back to upsert without logo.");
        const { error: fallbackErr } = await window.supabaseClient
          .from('platforms')
          .upsert({
            name: platform.name,
            dateAdded: platform.dateAdded,
            enabled: platform.enabled !== false
          });
        if (fallbackErr) throw fallbackErr;
      } else {
        throw error;
      }
    }
  } catch (err) {
    console.error("Error saving platform to Supabase:", err);
  }
}

async function dbDeletePlatform(name) {
  if (!window.supabaseClient) return;
  if (state.syncMode === "manual") {
    if (!state.pendingDeletes.platforms.includes(name)) {
      state.pendingDeletes.platforms.push(name);
      saveStateToStorage();
    }
    setUnsyncedChanges(true);
    return;
  }
  try {
    const { error } = await window.supabaseClient
      .from('platforms')
      .delete()
      .eq('name', name);
    if (error) throw error;
  } catch (err) {
    console.error("Error deleting platform from Supabase:", err);
  }
}

// Auto-Sync schedules background variables and runners
let autoSyncIntervalTimer = null;
let autoSyncCountdownTimer = null;
let autoSyncNextRunTime = null;
let gitHubPushTimeout = null;

function triggerDebouncedGitHubPush() {
  if (gitHubPushTimeout) {
    clearTimeout(gitHubPushTimeout);
  }
  gitHubPushTimeout = setTimeout(() => {
    console.log("Triggering auto-scheduled background GitHub push...");
    syncToGitHub(true);
  }, 2000);
}

function setupAutoSyncTimer() {
  if (autoSyncIntervalTimer) {
    clearInterval(autoSyncIntervalTimer);
    autoSyncIntervalTimer = null;
  }
  if (autoSyncCountdownTimer) {
    clearInterval(autoSyncCountdownTimer);
    autoSyncCountdownTimer = null;
  }

  if (state.autoSyncInterval === "off") {
    autoSyncNextRunTime = null;
    return;
  }

  const intervalMinutes = parseInt(state.autoSyncInterval);
  if (isNaN(intervalMinutes)) return;

  const intervalMs = intervalMinutes * 60 * 1000;
  autoSyncNextRunTime = Date.now() + intervalMs;

  autoSyncIntervalTimer = setInterval(() => {
    triggerScheduledSync();
    autoSyncNextRunTime = Date.now() + intervalMs;
  }, intervalMs);

  autoSyncCountdownTimer = setInterval(() => {
    updateAutoSyncCountdown();
  }, 1000);
}

function triggerScheduledSync() {
  console.log("Auto-Sync Scheduled trigger executing...");
  if (window.supabaseClient) {
    synchronizeCloudDatabase();
  }
  const token = localStorage.getItem("gv_github_token") || "";
  const repo = localStorage.getItem("gv_github_repo") || "";
  if (token && repo) {
    syncToGitHub(true);
  }
}

function updateAutoSyncCountdown() {
  const countdownEl = document.getElementById("auto-sync-timer-countdown");
  if (!countdownEl || !autoSyncNextRunTime) return;

  const diff = autoSyncNextRunTime - Date.now();
  if (diff <= 0) {
    countdownEl.textContent = "00:00";
    return;
  }

  const totalSecs = Math.floor(diff / 1000);
  const mins = Math.floor(totalSecs / 60);
  const secs = totalSecs % 60;
  
  const displayMins = mins < 10 ? "0" + mins : mins;
  const displaySecs = secs < 10 ? "0" + secs : secs;

  countdownEl.textContent = `${displayMins}:${displaySecs}`;
}

function updateAutoSyncUI() {
  const statusBadge = document.getElementById("auto-sync-status-badge");
  const nextRunContainer = document.getElementById("auto-sync-next-run");
  
  if (state.autoSyncInterval === "off") {
    if (statusBadge) {
      statusBadge.textContent = "Inactive";
      statusBadge.className = "badge badge-sold";
    }
    if (nextRunContainer) nextRunContainer.classList.add("hidden");
  } else {
    if (statusBadge) {
      statusBadge.textContent = "Active";
      statusBadge.className = "badge badge-available";
    }
    if (nextRunContainer) nextRunContainer.classList.remove("hidden");
  }
}

// ==========================================================================
// ADVANCED CONFIGURATION CONTROLS
// ==========================================================================

// Initialize advanced settings UI elements
function initAdvancedSettings() {
  // Low Stock Alert Level
  const lowStockSlider = document.getElementById("settings-low-stock-threshold");
  const lowStockLabel = document.getElementById("low-stock-label");
  if (lowStockSlider) {
    lowStockSlider.value = state.lowStockThreshold;
  }
  if (lowStockLabel) {
    lowStockLabel.textContent = `${state.lowStockThreshold} keys`;
  }

  // Target Markup presets
  const markupTypeSelect = document.getElementById("settings-markup-type");
  const markupValueInput = document.getElementById("settings-markup-value");
  const markupIcon = document.getElementById("markup-value-icon");
  if (markupTypeSelect) {
    markupTypeSelect.value = state.defaultMarkupType;
  }
  if (markupValueInput) {
    markupValueInput.value = state.defaultMarkupValue;
  }
  if (markupIcon) {
    markupIcon.className = state.defaultMarkupType === "percent" ? "fa-solid fa-percent" : `fa-solid ${state.currency === "USD" ? 'fa-dollar-sign' : 'fa-euro-sign'}`;
  }

  // Sync Mode
  const syncModeSelect = document.getElementById("settings-sync-mode");
  if (syncModeSelect) {
    syncModeSelect.value = state.syncMode;
  }
  updateSyncPendingIndicator();

  // Auto-Sync schedules
  const autoSyncIntervalSelect = document.getElementById("settings-auto-sync-interval");
  if (autoSyncIntervalSelect) {
    autoSyncIntervalSelect.value = state.autoSyncInterval;
  }
  const autoPushCheck = document.getElementById("settings-auto-push-github");
  if (autoPushCheck) {
    autoPushCheck.checked = state.autoPushGitHub;
  }
  const autoPullCheck = document.getElementById("settings-auto-pull-github");
  if (autoPullCheck) {
    autoPullCheck.checked = state.autoPullGitHub;
  }
  updateAutoSyncUI();
  setupAutoSyncTimer();




}

// Update Sync Pending Indicator visual state
function updateSyncPendingIndicator() {
  const indicator = document.getElementById("sync-pending-indicator");
  if (!indicator) return;
  
  if (state.syncMode === "manual" && hasUnsyncedChanges()) {
    indicator.classList.remove("hidden");
  } else {
    indicator.classList.add("hidden");
  }
}

// Check if there are unsynced changes in localStorage
function hasUnsyncedChanges() {
  return localStorage.getItem("gv_unsynced_changes") === "true";
}

// Mark unsynced changes state
function setUnsyncedChanges(val) {
  if (val) {
    localStorage.setItem("gv_unsynced_changes", "true");
  } else {
    localStorage.removeItem("gv_unsynced_changes");
  }
  updateSyncPendingIndicator();
}





// Bind advanced setting event listeners
function bindAdvancedSettingsControls() {
  const lowStockSlider = document.getElementById("settings-low-stock-threshold");
  const lowStockLabel = document.getElementById("low-stock-label");
  if (lowStockSlider) {
    lowStockSlider.addEventListener("input", (e) => {
      state.lowStockThreshold = parseInt(e.target.value);
      if (lowStockLabel) {
        lowStockLabel.textContent = `${state.lowStockThreshold} keys`;
      }
    });
    lowStockSlider.addEventListener("change", (e) => {
      saveStateToStorage();
      if (window.supabaseClient && state.syncMode === "realtime") {
        dbSaveSettings("lowStockThreshold", state.lowStockThreshold);
      } else if (state.syncMode === "manual") {
        setUnsyncedChanges(true);
      }
      updateUI();
    });
  }

  const markupTypeSelect = document.getElementById("settings-markup-type");
  const markupValueInput = document.getElementById("settings-markup-value");
  
  if (markupTypeSelect) {
    markupTypeSelect.addEventListener("change", (e) => {
      state.defaultMarkupType = e.target.value;
      const markupIcon = document.getElementById("markup-value-icon");
      if (markupIcon) {
        markupIcon.className = state.defaultMarkupType === "percent" ? "fa-solid fa-percent" : `fa-solid ${state.currency === "USD" ? 'fa-dollar-sign' : 'fa-euro-sign'}`;
      }
      saveStateToStorage();
      if (window.supabaseClient && state.syncMode === "realtime") {
        dbSaveSettings("defaultMarkupType", state.defaultMarkupType);
      } else if (state.syncMode === "manual") {
        setUnsyncedChanges(true);
      }

    });
  }
  
  if (markupValueInput) {
    markupValueInput.addEventListener("input", (e) => {
      state.defaultMarkupValue = parseFloat(e.target.value) || 0;
      saveStateToStorage();
      if (window.supabaseClient && state.syncMode === "realtime") {
        dbSaveSettings("defaultMarkupValue", state.defaultMarkupValue);
      } else if (state.syncMode === "manual") {
        setUnsyncedChanges(true);
      }

    });
  }



  const syncModeSelect = document.getElementById("settings-sync-mode");
  if (syncModeSelect) {
    syncModeSelect.addEventListener("change", (e) => {
      state.syncMode = e.target.value;
      saveStateToStorage();
      if (state.syncMode === "realtime") {
        synchronizeCloudDatabase();
      }
      updateSyncPendingIndicator();
      showToast(`Sync strategy set to: ${state.syncMode === 'realtime' ? 'Real-time' : 'Manual'}`, "info");
    });
  }

  const btnSyncNow = document.getElementById("btn-sync-now");
  if (btnSyncNow) {
    btnSyncNow.addEventListener("click", () => {
      synchronizeCloudDatabase();
    });
  }

  const autoSyncIntervalSelect = document.getElementById("settings-auto-sync-interval");
  if (autoSyncIntervalSelect) {
    autoSyncIntervalSelect.addEventListener("change", (e) => {
      state.autoSyncInterval = e.target.value;
      saveStateToStorage();
      setupAutoSyncTimer();
      updateAutoSyncUI();
      showToast(`Auto-sync interval set to: ${state.autoSyncInterval === 'off' ? 'Off' : state.autoSyncInterval + ' minutes'}`, "info");
    });
  }

  const autoPushCheck = document.getElementById("settings-auto-push-github");
  if (autoPushCheck) {
    autoPushCheck.addEventListener("change", (e) => {
      state.autoPushGitHub = e.target.checked;
      saveStateToStorage();
      showToast(`GitHub Auto-Push on change is now ${state.autoPushGitHub ? 'Enabled' : 'Disabled'}`, "info");
    });
  }

  const autoPullCheck = document.getElementById("settings-auto-pull-github");
  if (autoPullCheck) {
    autoPullCheck.addEventListener("change", (e) => {
      state.autoPullGitHub = e.target.checked;
      saveStateToStorage();
      showToast(`GitHub Auto-Pull on startup is now ${state.autoPullGitHub ? 'Enabled' : 'Disabled'}`, "info");
    });
  }

  const btnExportBackup = document.getElementById("btn-export-backup");
  if (btnExportBackup) {
    btnExportBackup.addEventListener("click", exportStateBackupJSON);
  }

  const btnRestoreBackup = document.getElementById("btn-restore-backup");
  const backupFileInput = document.getElementById("settings-backup-file");
  if (btnRestoreBackup && backupFileInput) {
    btnRestoreBackup.addEventListener("click", () => {
      backupFileInput.click();
    });
    backupFileInput.addEventListener("change", (e) => {
      if (e.target.files && e.target.files[0]) {
        importStateBackupJSON(e.target.files[0]);
      }
    });
  }

  const btnDeleteAll = document.getElementById("btn-delete-all-inventory");
  if (btnDeleteAll) {
    btnDeleteAll.addEventListener("click", () => {
      window.triggerDeleteAllInventory();
    });
  }
}

// Get state backup JSON payload
function getBackupPayloadJSON() {
  const backupData = {};
  const keys = [
    "gv_inventory", "gv_sales", "gv_suppliers", "gv_platforms",
    "gv_inv_layout", "gv_supplier_display_mode", "gv_platform_display_mode", "gv_inventory_sort_by", "gv_inv_page_size", "gv_entries_page_size", "gv_catalog_keys_page_size", "gv_theme", "gv_theme_mode", "gv_theme_color", "gv_currency", "gv_date_format",
    "gv_sidebar_collapsed", "gv_show_sales_ledger",
    "gv_visible_metrics", "gv_sup_visible_metrics", "gv_visible_figures", "gv_metric_order", "gv_sup_metric_order", "gv_menu_order", "gv_font_size", "gv_menu_icons",
    "gv_menu_titles", "gv_menu_visibility", "gv_dashboard_order", "gv_dashboard_spans", "gv_widget_settings", "gv_custom_logo", "gv_low_stock_threshold",
    "gv_default_markup_type", "gv_default_markup_value",
    "gv_platform_fee_presets", "gv_sync_mode", "gv_recycle_bin", "gv_payouts", "gv_expense_categories"
  ];
  
  keys.forEach(k => {
    const val = localStorage.getItem(k);
    if (val !== null) {
      backupData[k] = val;
    }
  });
  
  return JSON.stringify(backupData, null, 2);
}

// Export state backup as JSON file download
function exportStateBackupJSON() {
  const jsonStr = getBackupPayloadJSON();
  const blob = new Blob([jsonStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement("a");
  const date = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `gamevault_backup_${date}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  
  showToast("Database backup file downloaded successfully.", "success");
}

// Restore state backup from JSON upload
function importStateBackupJSON(file) {
  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const data = JSON.parse(e.target.result);
      
      if (!data.gv_inventory || !data.gv_sales) {
        showToast("Invalid backup file structure. Missing inventory/sales data.", "error");
        return;
      }
      
      if (!confirm("Are you sure you want to restore this backup? All current local records and customizations will be overwritten.")) {
        return;
      }
      
      Object.keys(data).forEach(k => {
        localStorage.setItem(k, data[k]);
      });
      
      showToast("Data backup restored successfully! Reloading...", "success");
      
      if (window.supabaseClient) {
        localStorage.setItem("gv_unsynced_changes", "true");
      }
      
      setTimeout(() => {
        window.location.reload();
      }, 1500);
      
    } catch (err) {
      console.error("Error reading JSON backup file:", err);
      showToast("Failed to parse backup file. Please check if file is a valid JSON.", "error");
    }
  };
  reader.readAsText(file);
}

// Full database manual synchronization push/pull
async function synchronizeCloudDatabase() {
  if (!window.supabaseClient) {
    showToast("Database not connected. Configure Supabase settings first.", "error");
    return;
  }
  
  const btn = document.getElementById("btn-sync-now");
  const originalHtml = btn ? btn.innerHTML : "";
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Syncing...`;
  }
  
  showToast("Starting cloud database sync...", "info");
  
  try {
    // 1. Process pending deletions
    if (state.pendingDeletes.inventory.length > 0) {
      const { error } = await window.supabaseClient
        .from('inventory')
        .delete()
        .in('id', state.pendingDeletes.inventory);
      if (error) console.error("Error syncing inventory deletes:", error);
    }
    
    if (state.pendingDeletes.sales.length > 0) {
      const { error } = await window.supabaseClient
        .from('sales')
        .delete()
        .in('id', state.pendingDeletes.sales);
      if (error) console.error("Error syncing sales deletes:", error);
    }
    
    if (state.pendingDeletes.suppliers.length > 0) {
      const { error } = await window.supabaseClient
        .from('suppliers')
        .delete()
        .in('name', state.pendingDeletes.suppliers);
      if (error) console.error("Error syncing suppliers deletes:", error);
    }
    
    if (state.pendingDeletes.platforms.length > 0) {
      const { error } = await window.supabaseClient
        .from('platforms')
        .delete()
        .in('name', state.pendingDeletes.platforms);
      if (error) console.error("Error syncing platforms deletes:", error);
    }
    
    state.pendingDeletes = { inventory: [], sales: [], suppliers: [], platforms: [] };
    localStorage.setItem("gv_pending_deletes", JSON.stringify(state.pendingDeletes));
    
    // 2. Upsert current active lists
    if (state.inventory.length > 0) {
      const { error } = await window.supabaseClient
        .from('inventory')
        .upsert(state.inventory.map(item => ({
          id: item.id,
          title: item.title,
          platform: item.platform,
          key: item.key,
          cost: item.cost,
          source: item.source,
          purchaseDate: item.purchaseDate,
          imageUrl: item.imageUrl || null,
          status: item.status,
          notes: item.notes || null
        })));
      if (error) throw error;
    }
    
    if (state.sales.length > 0) {
      const { error } = await window.supabaseClient
        .from('sales')
        .upsert(state.sales.map(sale => ({
          id: sale.id,
          inventoryId: sale.inventoryId,
          title: sale.title,
          platform: sale.platform,
          cost: sale.cost,
          sellPrice: sale.sellPrice,
          platformSold: sale.platformSold,
          fees: sale.fees,
          profit: sale.profit,
          saleDate: sale.saleDate,
          notes: sale.notes || null
        })));
      if (error) throw error;
    }
    
    if (state.suppliers.length > 0) {
      const { error } = await window.supabaseClient
        .from('suppliers')
        .upsert(state.suppliers.map(s => ({
          name: s.name,
          dateAdded: s.dateAdded,
          color: s.color,
          enabled: s.enabled !== false,
          logo: s.logo || null
        })));
      if (error) {
        if (error.message && error.message.includes('column "logo" of relation "suppliers" does not exist')) {
          console.warn("Supabase relation 'suppliers' is missing the 'logo' column. Falling back to sync without logo.");
          const { error: fallbackErr } = await window.supabaseClient
            .from('suppliers')
            .upsert(state.suppliers.map(s => ({
              name: s.name,
              dateAdded: s.dateAdded,
              color: s.color,
              enabled: s.enabled !== false
            })));
          if (fallbackErr) throw fallbackErr;
        } else {
          throw error;
        }
      }
    }
    
    if (state.platforms.length > 0) {
      try {
        const { error } = await window.supabaseClient
          .from('platforms')
          .upsert(state.platforms.map(p => ({
            name: p.name,
            dateAdded: p.dateAdded,
            enabled: p.enabled !== false,
            logo: p.logo || null
          })));
        if (error) {
          if (error.message && error.message.includes('column "logo" of relation "platforms" does not exist')) {
            console.warn("Supabase relation 'platforms' is missing the 'logo' column. Falling back to sync without logo.");
            const { error: fallbackErr } = await window.supabaseClient
              .from('platforms')
              .upsert(state.platforms.map(p => ({
                name: p.name,
                dateAdded: p.dateAdded,
                enabled: p.enabled !== false
              })));
            if (fallbackErr) console.warn("Platforms sync fallback warning:", fallbackErr);
          } else {
            console.warn("Supabase platforms upsert warning:", error);
          }
        }
      } catch (err) {
        console.warn("Could not upsert platforms in Supabase:", err);
      }
    }
    
    // 3. Sync customizations
    const menus = ["dashboard", "inventory", "sales", "finance", "suppliers", "entries", "settings"];
    const customData = menus.map(m => ({
      key: m,
      icon: state.menuIcons[m] || "fa-gear",
      title: state.menuTitles[m] || m
    }));
    const { error: customErr } = await window.supabaseClient
      .from('menu_customization')
      .upsert(customData);
    if (customErr) throw customErr;
    
    // 4. Sync settings
    const settings = [
      { key: "themeMode", value: state.themeMode },
      { key: "themeColor", value: state.themeColor },
      { key: "theme", value: state.themeMode === "light" ? "light" : state.themeColor },
      { key: "currency", value: state.currency },
      { key: "dateFormat", value: state.dateFormat },
      { key: "fontSize", value: state.fontSize },
      { key: "showSalesLedger", value: state.showSalesLedger },
      { key: "visibleMetrics", value: state.visibleMetrics },
      { key: "supVisibleMetrics", value: state.supVisibleMetrics },
      { key: "visibleFigures", value: state.visibleFigures },
      { key: "metricOrder", value: state.metricOrder },
      { key: "supMetricOrder", value: state.supMetricOrder },
      { key: "customLogo", value: state.customLogo },
      { key: "lowStockThreshold", value: state.lowStockThreshold },
      { key: "defaultMarkupType", value: state.defaultMarkupType },
      { key: "defaultMarkupValue", value: state.defaultMarkupValue },
      { key: "syncMode", value: state.syncMode },
      { key: "supplierDisplayMode", value: state.supplierDisplayMode },
      { key: "platformDisplayMode", value: state.platformDisplayMode },
      { key: "inventorySortBy", value: state.inventorySortBy },
      { key: "platformFeePresets", value: PLATFORM_FEE_PRESETS }
    ];
    
    for (const s of settings) {
      await window.supabaseClient
        .from('app_settings')
        .upsert({ key: s.key, value: s.value });
    }
    
    setUnsyncedChanges(false);
    showToast("Cloud database successfully synchronized!", "success");
  } catch (err) {
    console.error("Cloud database synchronization failed:", err);
    showToast("Sync failed. Check database schemas and connections.", "error");
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = originalHtml;
    }
  }
}

// ==========================================================================
// RECYCLE BIN VIEW RENDERERS & MUTATORS
// ==========================================================================
function escapeHTML(str) {
  if (!str) return "";
  return str.toString()
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function renderRecycleBin() {
  const tbody = DOM["recycle-table-body"] || document.getElementById("recycle-table-body");
  if (!tbody) return;
  tbody.innerHTML = "";

  if (!state.recycleBin || !state.recycleBin.inventory || state.recycleBin.inventory.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" class="text-center" style="text-align: center; padding: 30px; color: var(--text-muted);">Recycle Bin is empty.</td></tr>`;
    const selectAllCheckbox = document.getElementById("recycle-select-all");
    if (selectAllCheckbox) selectAllCheckbox.checked = false;
    updateRecycleBulkActionsBar();
    return;
  }

  state.recycleBin.inventory.forEach(item => {
    const tr = document.createElement("tr");
    const maskedKey = `${item.key.slice(0, 4)}-****-****-${item.key.slice(-4)}`;

    const supplierObj = state.suppliers.find(s => s.name === item.source);
    const colorName = supplierObj ? (supplierObj.color || getSupplierColorName(item.source)) : getSupplierColorName(item.source);
    const colorPreset = SUPPLIER_COLORS.find(c => c.name === colorName) || SUPPLIER_COLORS[0];
    const supplierBadge = `
      <span class="supplier-tag" style="background-color: ${colorPreset.value}12; border-color: ${colorPreset.value}25; color: ${colorPreset.value}; padding: 3px 8px; border-radius: 4px; font-size: 0.75rem; display: inline-flex; align-items: center; gap: 4px; vertical-align: middle;">
        <span class="supplier-dot" style="background-color: ${colorPreset.value}; width: 6px; height: 6px;"></span>
        ${item.source}
      </span>
    `;

    tr.innerHTML = `
      <td style="text-align: center; vertical-align: middle;">
        <input type="checkbox" class="recycle-row-select" data-id="${item.id}" style="cursor: pointer;">
      </td>
      <td><strong>${escapeHTML(item.title)}</strong></td>
      <td><span class="platform-indicator"><i class="fa-solid fa-gamepad" style="font-size: 0.8rem; margin-right: 6px;"></i> ${escapeHTML(item.platform)}</span></td>
      <td><div class="secured-key"><code>${maskedKey}</code></div></td>
      <td>${formatCurrency(item.cost)}</td>
      <td style="text-align: center;">${supplierBadge}</td>
      <td>${formatDate(item.purchaseDate)}</td>
      <td><span class="badge ${item.status === 'Sold' ? 'badge-sold' : 'badge-available'}">${item.status}</span></td>
      <td>
        <div class="table-actions">
          <button class="btn-action btn-action-edit" onclick="triggerRestoreGame('${item.id}')" title="Restore Key" style="color: var(--accent-cyan); border-color: var(--accent-cyan);"><i class="fa-solid fa-trash-arrow-up"></i></button>
          <button class="btn-action btn-action-delete" onclick="triggerPurgeGame('${item.id}')" title="Delete Permanently"><i class="fa-solid fa-trash"></i></button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });

  // Bind change listeners to checkboxes
  document.querySelectorAll(".recycle-row-select").forEach(cb => {
    cb.addEventListener("change", () => {
      updateRecycleBulkActionsBar();
    });
  });
}

function updateRecycleBulkActionsBar() {
  const selectedCheckboxes = document.querySelectorAll(".recycle-row-select:checked");
  const count = selectedCheckboxes.length;
  const bar = document.getElementById("recycle-bulk-actions");
  const infoText = document.getElementById("recycle-info-text");
  const countText = document.getElementById("recycle-select-count");
  
  if (bar && infoText && countText) {
    if (count > 0) {
      countText.textContent = `${count} item${count === 1 ? '' : 's'} selected`;
      bar.classList.remove("hidden");
      infoText.classList.add("hidden");
    } else {
      bar.classList.add("hidden");
      infoText.classList.remove("hidden");
    }
  }

  const selectAllCheckbox = document.getElementById("recycle-select-all");
  if (selectAllCheckbox) {
    const allCheckboxes = document.querySelectorAll(".recycle-row-select");
    selectAllCheckbox.checked = allCheckboxes.length > 0 && Array.from(allCheckboxes).every(cb => cb.checked);
  }
}

window.triggerRestoreGame = async function(gameId) {
  const game = state.recycleBin.inventory.find(item => item.id === gameId);
  if (!game) return;

  // Restore game
  state.recycleBin.inventory = state.recycleBin.inventory.filter(item => item.id !== gameId);
  state.inventory.push(game);

  // Restore associated sale if any
  const associatedSaleIndex = state.recycleBin.sales.findIndex(sale => sale.inventoryId === gameId);
  let sale = null;
  if (associatedSaleIndex !== -1) {
    sale = state.recycleBin.sales[associatedSaleIndex];
    state.recycleBin.sales.splice(associatedSaleIndex, 1);
    state.sales.push(sale);
  }

  // Optimize: remove from pending deletes if it is in manual sync queue
  if (state.pendingDeletes.inventory.includes(gameId)) {
    state.pendingDeletes.inventory = state.pendingDeletes.inventory.filter(id => id !== gameId);
  }
  if (sale && state.pendingDeletes.sales.includes(sale.id)) {
    state.pendingDeletes.sales = state.pendingDeletes.sales.filter(id => id !== sale.id);
  }

  saveStateToStorage();
  
  if (window.supabaseClient) {
    await dbSaveInventory(game);
    if (sale) {
      await dbSaveSale(sale);
    }
  } else if (state.syncMode === "manual") {
    setUnsyncedChanges(true);
  }

  updateUI();
  showToast(`Restored "${game.title}" to active inventory.`, "success");
};

window.triggerPurgeGame = async function(gameId) {
  const game = state.recycleBin.inventory.find(item => item.id === gameId);
  if (!game) return;

  if (confirm(`Are you sure you want to permanently delete "${game.title}"? This action cannot be undone.`)) {
    state.recycleBin.inventory = state.recycleBin.inventory.filter(item => item.id !== gameId);
    state.recycleBin.sales = state.recycleBin.sales.filter(sale => sale.inventoryId !== gameId);

    saveStateToStorage();
    updateUI();
    showToast(`Permanently deleted "${game.title}".`, "success");
  }
};

function renderPublishersTab() {
  const tbody = DOM["publishers-table-body"] || document.getElementById("publishers-table-body");
  if (!tbody) return;
  tbody.innerHTML = "";

  // Pre-index sales by inventoryId for O(1) lookups
  const salesMap = new Map();
  state.sales.forEach(sale => {
    salesMap.set(sale.inventoryId, sale);
  });

  // Group inventory by publisher
  const publishersMap = {};
  state.inventory.forEach(item => {
    const pub = String(item.publisher || "").trim() || "No Publisher";
    if (!publishersMap[pub]) {
      publishersMap[pub] = {
        name: pub,
        purchased: 0,
        sold: 0,
        inStock: 0,
        totalSpent: 0,
        totalRevenue: 0,
        totalCostOfSales: 0,
        totalNetProfit: 0,
        totalDuration: 0,
        durationCount: 0
      };
    }
    
    const stats = publishersMap[pub];
    stats.purchased++;
    stats.totalSpent += item.cost;
    
    if (item.status === "Sold") {
      stats.sold++;
      const sale = salesMap.get(item.id);
      if (sale) {
        stats.totalRevenue += sale.sellPrice;
        stats.totalCostOfSales += sale.cost;
        stats.totalNetProfit += sale.profit;
        
        if (item.purchaseDate && sale.saleDate) {
          const start = new Date(item.purchaseDate);
          const end = new Date(sale.saleDate);
          start.setHours(0, 0, 0, 0);
          end.setHours(0, 0, 0, 0);
          const diff = Math.max(0, end - start);
          const days = Math.round(diff / (1000 * 60 * 60 * 24));
          stats.totalDuration += days;
          stats.durationCount++;
        }
      }
    } else if (item.status !== "Rejected") {
      stats.inStock++;
    }
  });

  const publishersList = Object.values(publishersMap).sort((a, b) => b.purchased - a.purchased);

  if (publishersList.length === 0) {
    tbody.innerHTML = `<tr><td colspan="10" style="text-align: center; color: var(--text-muted); padding: 20px;">No publishers data available.</td></tr>`;
    return;
  }

  publishersList.forEach(pub => {
    const tr = document.createElement("tr");
    
    const roi = pub.totalCostOfSales > 0 ? (pub.totalNetProfit / pub.totalCostOfSales) * 100 : 0;
    const avgDuration = pub.durationCount > 0 ? (pub.totalDuration / pub.durationCount).toFixed(1) : "—";
    const profitClass = pub.totalNetProfit >= 0 ? "text-success-neon" : "text-danger-soft";
    const profitSign = pub.totalNetProfit > 0 ? "+" : "";

    const isNoPublisher = pub.name === "No Publisher";
    const escapedPubName = pub.name.replace(/'/g, "\\'").replace(/"/g, "&quot;");
    const editBtnHtml = isNoPublisher 
      ? "" 
      : `<button class="btn btn-outline btn-xs" onclick="triggerEditPublisher('${escapeHTML(escapedPubName)}')" style="padding: 2px 6px; font-size: 0.75rem;"><i class="fa-solid fa-pen-to-square"></i> Edit</button>`;

    tr.innerHTML = `
      <td><strong>${escapeHTML(pub.name)}</strong></td>
      <td>${pub.purchased}</td>
      <td>${pub.sold}</td>
      <td>${pub.inStock}</td>
      <td>${formatCurrency(pub.totalSpent)}</td>
      <td>${formatCurrency(pub.totalRevenue)}</td>
      <td class="${profitClass}"><strong>${profitSign}${formatCurrency(pub.totalNetProfit)}</strong></td>
      <td class="${profitClass}">${roi.toFixed(1)}%</td>
      <td>${avgDuration} ${pub.durationCount > 0 ? 'days' : ''}</td>
      <td style="text-align: right;">${editBtnHtml}</td>
    `;
    tbody.appendChild(tr);
  });
}

function ensureSheetJS(onSuccess, onError) {
  if (window.XLSX) {
    onSuccess();
    return;
  }
  
  showToast("Loading Excel parsing engine...", "info");
  const script = document.createElement("script");
  script.src = "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js";
  script.onload = () => {
    showToast("Excel engine loaded successfully!", "success");
    onSuccess();
  };
  script.onerror = () => {
    showToast("Failed to load Excel parsing engine. Please check your internet connection.", "danger");
    if (onError) onError();
  };
  document.head.appendChild(script);
}

async function importStateFromSpreadsheet(file) {
  const progressContainer = document.getElementById("import-progress-container");
  const progressBar = document.getElementById("import-progress-bar");
  const progressPercent = document.getElementById("import-progress-percent");
  const progressStatus = document.getElementById("import-progress-status");
  const btnImportSheet = document.getElementById("btn-import-sheet");

  ensureSheetJS(
    () => {
      const reader = new FileReader();
      
      reader.onload = async function(e) {
        try {
          if (progressStatus) progressStatus.textContent = "Parsing workbook data...";
          if (progressPercent) progressPercent.textContent = "5%";
          if (progressBar) progressBar.style.width = "5%";

          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, {type: 'array', cellDates: true});
          
          const sheetName = workbook.SheetNames.find(name => name.toLowerCase() === 'inventory') || workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const rows = XLSX.utils.sheet_to_json(worksheet, {defval: ""});

          const currentSuppliers = new Set(state.suppliers.map(s => s.name.toLowerCase()));
          const currentPlatforms = new Set(state.platforms.map(p => p.name.toLowerCase()));
          const existingKeys = new Set(state.inventory.map(item => item.key.trim().toLowerCase()).filter(k => k.length > 0));
          let duplicateKeysCount = 0;
          
          const importedGames = [];
          const importedSales = [];
          
          pushToUndoStack();

          let rowIndex = 0;
          const batchSize = 100;
          
          async function processBatch() {
            const end = Math.min(rowIndex + batchSize, rows.length);
            
            for (let i = rowIndex; i < end; i++) {
              const row = rows[i];
              
              const title = (row["Name"] || row["Game Title"] || row["Title"] || "").toString().trim();
              if (!title) continue;
              
              const key = (row["Key"] || "").toString().trim();
              if (key) {
                const keyLower = key.toLowerCase();
                if (existingKeys.has(keyLower)) {
                  duplicateKeysCount++;
                } else {
                  existingKeys.add(keyLower);
                }
              }
              const vendor = (row["Vendor"] || row["Source"] || row["Supplier"] || "Other").toString().trim();
              const platform = (row["Platform"] || "Other").toString().trim();
              const cost = parseFloat(row["Cost"] || row["Buy Price"] || 0) || 0;
              const sellPrice = parseFloat(row["Sell"] || row["Sell Price"] || 0) || 0;
              
              let purchaseDate = row["Entry Date"] || row["Purchase Date"] || "";
              if (purchaseDate instanceof Date) {
                purchaseDate = formatLocalDateWithoutShifts(purchaseDate);
              } else if (purchaseDate) {
                purchaseDate = parseExcelDate(purchaseDate.toString());
              } else {
                purchaseDate = formatLocalDateWithoutShifts(new Date());
              }
              
              let saleDate = row["Closed Date"] || row["Sale Date"] || "";
              const rawClosedDateVal = saleDate;
              if (saleDate instanceof Date) {
                saleDate = formatLocalDateWithoutShifts(saleDate);
              } else if (saleDate) {
                saleDate = parseExcelDate(saleDate.toString());
              }
              if (title.toLowerCase().includes("dead by daylight")) {
                console.log(`[Diagnostic] Row ${i} Dead by Daylight: Closed Date raw =`, rawClosedDateVal, `type =`, (rawClosedDateVal instanceof Date ? 'Date' : typeof rawClosedDateVal), `parsed saleDate =`, saleDate);
              }
              
              let status = (row["Status"] || "").toString().trim();
              if (status.toLowerCase() === "closed" || status.toLowerCase() === "sold") {
                status = "Sold";
              } else if (status.toLowerCase() === "rejected") {
                status = "Rejected";
              } else if (status.toLowerCase() === "reserved") {
                status = "Reserved";
              } else {
                status = "Available";
              }
              
              const notes = (row["Notes"] || "").toString().trim();
              const imageUrl = (row["Img"] || row["ImageUrl"] || "").toString().trim();
              const publisher = (row["Publisher"] || "").toString().trim();
              
              const gameId = "game_imported_" + i + "_" + Math.random().toString(36).substr(2, 5);
              
              if (vendor && !currentSuppliers.has(vendor.toLowerCase())) {
                state.suppliers.push({
                  name: vendor,
                  color: getSupplierColorName(vendor),
                  logo: null,
                  enabled: true,
                  dateAdded: Date.now()
                });
                currentSuppliers.add(vendor.toLowerCase());
              }
              
              if (!currentPlatforms.has(platform.toLowerCase())) {
                state.platforms.push({
                  name: platform,
                  logo: null,
                  enabled: true,
                  dateAdded: Date.now()
                });
                currentPlatforms.add(platform.toLowerCase());
              }
              
              const gameItem = {
                id: gameId,
                title,
                platform,
                key: key || "NO-KEY-PROVIDED",
                cost,
                source: vendor,
                purchaseDate,
                status,
                notes,
                imageUrl,
                publisher,
                sellPrice: sellPrice || 0
              };
              
              importedGames.push(gameItem);
              
              if (status === "Sold") {
                const saleId = "sale_imported_" + i + "_" + Math.random().toString(36).substr(2, 5);
                const profit = sellPrice - cost;
                importedSales.push({
                  id: saleId,
                  inventoryId: gameId,
                  title,
                  platform,
                  cost,
                  sellPrice,
                  platformSold: "Other",
                  fees: 0,
                  profit,
                  saleDate: saleDate || purchaseDate,
                  notes: "Imported from spreadsheet."
                });
              }
            }
            
            rowIndex = end;
            
            const percent = Math.round(10 + (rowIndex / rows.length) * 80);
            if (progressStatus) progressStatus.textContent = `Imported ${rowIndex} / ${rows.length} rows...`;
            if (progressPercent) progressPercent.textContent = `${percent}%`;
            if (progressBar) progressBar.style.width = `${percent}%`;
            
            if (rowIndex < rows.length) {
              setTimeout(processBatch, 0);
            } else {
              completeImport();
            }
          }
          
          async function completeImport() {
            if (progressStatus) progressStatus.textContent = "Saving imported data locally...";
            
            state.inventory.push(...importedGames);
            state.sales.push(...importedSales);
            
            saveStateToStorage();
            
            if (window.supabaseClient && state.syncMode !== "manual") {
              if (progressStatus) progressStatus.textContent = "Syncing with cloud database (upserting batches)...";
              try {
                const syncBatchSize = 1000;
                for (let j = 0; j < importedGames.length; j += syncBatchSize) {
                  const batch = importedGames.slice(j, j + syncBatchSize).map(item => ({
                    id: item.id,
                    title: item.title,
                    platform: item.platform,
                    key: item.key,
                    cost: item.cost,
                    source: item.source,
                    purchaseDate: item.purchaseDate,
                    imageUrl: item.imageUrl || null,
                    status: item.status,
                    notes: item.notes || null,
                    publisher: item.publisher || null
                  }));
                  const { error } = await window.supabaseClient.from('inventory').upsert(batch);
                  if (error) throw error;
                }
                
                for (let j = 0; j < importedSales.length; j += syncBatchSize) {
                  const batch = importedSales.slice(j, j + syncBatchSize).map(sale => ({
                    id: sale.id,
                    inventoryId: sale.inventoryId,
                    title: sale.title,
                    platform: sale.platform,
                    cost: sale.cost,
                    sellPrice: sale.sellPrice,
                    platformSold: sale.platformSold,
                    fees: sale.fees,
                    profit: sale.profit,
                    saleDate: sale.saleDate,
                    notes: sale.notes || null
                  }));
                  const { error } = await window.supabaseClient.from('sales').upsert(batch);
                  if (error) throw error;
                }
              } catch (syncErr) {
                console.error("Supabase bulk sync failed:", syncErr);
                showToast("Imported successfully, but cloud database sync failed.", "warning");
              }
            } else if (state.syncMode === "manual" || window.supabaseClient) {
              setUnsyncedChanges(true);
            }
            
            if (progressStatus) progressStatus.textContent = "Import complete!";
            if (progressPercent) progressPercent.textContent = "100%";
            if (progressBar) progressBar.style.width = "100%";
            
            setTimeout(() => {
              if (progressContainer) progressContainer.classList.add("hidden");
              if (btnImportSheet) btnImportSheet.disabled = false;
              document.getElementById("settings-import-file").value = "";
              document.getElementById("import-file-name").textContent = "Drag & drop your file here, or click to browse";
            }, 1500);
            
            updateUI();
            if (duplicateKeysCount > 0) {
              showToast(`Import complete! ${importedGames.length} items imported. Note: ${duplicateKeysCount} keys already existed in your inventory.`, "warning");
            } else {
              showToast(`Successfully imported ${importedGames.length} inventory keys from sheet!`, "success");
            }
          }
          
          setTimeout(processBatch, 0);

        } catch (err) {
          console.error("Error reading file:", err);
          showToast("Failed to parse the file. Please ensure it's a valid Excel or CSV file.", "error");
          if (progressContainer) progressContainer.classList.add("hidden");
          if (btnImportSheet) btnImportSheet.disabled = false;
        }
      };
      
      reader.onerror = function() {
        showToast("Error reading file.", "error");
        if (progressContainer) progressContainer.classList.add("hidden");
        if (btnImportSheet) btnImportSheet.disabled = false;
      };
      
      reader.readAsArrayBuffer(file);
    },
    () => {
      if (progressContainer) progressContainer.classList.add("hidden");
      if (btnImportSheet) btnImportSheet.disabled = false;
    }
  );
}

function formatLocalDateWithoutShifts(dateObj) {
  if (!(dateObj instanceof Date) || isNaN(dateObj.getTime())) return "";
  // Shift by 12 hours (12 * 60 * 60 * 1000 ms) to safely skip any LMT/GMT timezone shifts that cross midnight
  const shifted = new Date(dateObj.getTime() + 12 * 60 * 60 * 1000);
  const yr = shifted.getFullYear();
  const mo = String(shifted.getMonth() + 1).padStart(2, '0');
  const dy = String(shifted.getDate()).padStart(2, '0');
  return `${yr}-${mo}-${dy}`;
}

function parseExcelDate(val) {
  if (!val) return "";
  if (val instanceof Date) {
    return formatLocalDateWithoutShifts(val);
  }
  if (typeof val === 'number') {
    const date = new Date(Math.round((val - 25569) * 86400 * 1000));
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
  }
  if (typeof val === 'string') {
    val = val.trim();
    // 1. Check if it matches D-M-YYYY or DD-MM-YYYY format (e.g. 15-6-2026, 2-7-2026)
    const dmYMatch = val.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})$/);
    if (dmYMatch) {
      const day = dmYMatch[1].padStart(2, '0');
      const month = dmYMatch[2].padStart(2, '0');
      const year = dmYMatch[3];
      return `${year}-${month}-${day}`;
    }
    
    // 2. Check if it matches YYYY-MM-DD or YYYY-M-D format
    const yMdaMatch = val.match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})$/);
    if (yMdaMatch) {
      const year = yMdaMatch[1];
      const month = yMdaMatch[2].padStart(2, '0');
      const day = yMdaMatch[3].padStart(2, '0');
      return `${year}-${month}-${day}`;
    }

    // 3. Fallback to standard JS parsing
    const d = new Date(val);
    return formatLocalDateWithoutShifts(d);
  }
  return "";
}

// Close custom icon picker menus when clicking outside
document.addEventListener("click", (e) => {
  if (!e.target.closest(".icon-picker-dropdown")) {
    document.querySelectorAll(".icon-picker-menu").forEach(menu => {
      menu.classList.remove("active");
    });
  }
});

// Auto fetch game cover image from Steam Web Store API via CheapShark CORS-friendly API
window.triggerAutoFetchSteamCover = async function(titleInputId, targetInputId, buttonId) {
  const titleInput = document.getElementById(titleInputId);
  const targetInput = document.getElementById(targetInputId);
  const btn = document.getElementById(buttonId);
  
  if (!titleInput || !targetInput || !btn) return;
  
  const title = titleInput.value.trim();
  if (!title) {
    showToast("Please enter a game title first.", "error");
    return;
  }
  
  const originalText = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Fetching...`;
  
  try {
    const response = await fetch(`https://www.cheapshark.com/api/1.0/games?title=${encodeURIComponent(title)}`);
    if (!response.ok) throw new Error("CheapShark API request failed");
    
    const matches = await response.json();
    if (matches && matches.length > 0) {
      // Find the first match with a valid Steam App ID if possible, otherwise use the first match
      const match = matches.find(m => m.steamAppID) || matches[0];
      let imageUrl = "";
      
      if (match.steamAppID) {
        imageUrl = `https://cdn.akamai.steamstatic.com/steam/apps/${match.steamAppID}/header.jpg`;
      } else if (match.thumb) {
        imageUrl = match.thumb;
      }
      
      if (imageUrl) {
        targetInput.value = imageUrl;
        targetInput.dispatchEvent(new Event("input", { bubbles: true }));
        showToast(`Successfully fetched artwork for: "${match.external}"`, "success");
      } else {
        showToast(`No artwork found for "${title}".`, "warning");
      }
    } else {
      showToast(`No matches found on Steam/CheapShark for "${title}".`, "warning");
    }
  } catch (err) {
    console.error("Artwork auto-fetch error:", err);
    showToast("Failed to fetch from Steam API. Try pasting a cover link manually.", "error");
  } finally {
    btn.disabled = false;
    btn.innerHTML = originalText;
  }
};
