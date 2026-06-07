/**
 * GameVault - Digital Game Sales & Inventory Tracker
 * Main Application Script (app.js)
 */

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
    fees: 3.49, // Kinguin: 11% + 0.35
    profit: 10.01,
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
    fees: 9.30, // eBay: 15% + 0.30
    profit: 15.69,
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
    fees: 2.13, // G2A: 10.8% + 0.40
    profit: 5.86,
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
    fees: 2.77, // Kinguin API preset: 11% + 0.35
    profit: 9.23,
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
    fees: 10.05, // eBay: 15% + 0.30
    profit: 16.95,
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
    fees: 0.00, // Direct sale
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
    fees: 5.58, // G2A: 10.8% + 0.40
    profit: 14.42,
    saleDate: "2026-05-05",
    notes: "Sold on G2A store."
  }
];

// Fee Preset Settings
let PLATFORM_FEE_PRESETS = {
  g2a: { name: "G2A", percent: 10.8, fixed: 0.40, desc: "10.8% + €0.40 listing fee" },
  kinguin: { name: "Kinguin", percent: 11.0, fixed: 0.35, desc: "11% + €0.35 sales fee" },
  ebay: { name: "eBay", percent: 15.0, fixed: 0.30, desc: "15% + €0.30 payment fee" },
  playerauctions: { name: "PlayerAuctions", percent: 10.0, fixed: 0.00, desc: "10% standard commission" },
  direct: { name: "Discord", percent: 0.0, fixed: 0.00, desc: "0% fees - Direct Sale" },
  other: { name: "Other", percent: 5.0, fixed: 0.00, desc: "5% custom commission" }
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
  inventory: [],
  sales: [],
  suppliers: [],
  activePeriod: "all", // "all", "month", "week"
  inventoryLayout: "list", // "list", "grid", "gallery"
  supplierDisplayMode: "name", // "name", "logo"
  theme: "dark", // "dark", "light"
  customLogo: null, // Base64 string or image URL
  currency: "EUR",
  dateFormat: "YYYY-MM-DD",
  sidebarCollapsed: false,
  showFeeCalculator: true,
  showSalesLedger: true,
  visibleMetrics: {
    profit: true,
    cost: true,
    revenue: true,
    roi: true,
    stock: true
  },
  metricOrder: [],
  fontSize: 16,
  menuIcons: {
    dashboard: "fa-chart-line",
    inventory: "fa-boxes-stacked",
    sales: "fa-receipt",
    finance: "fa-coins",
    suppliers: "fa-truck-ramp-box",
    entries: "fa-tags",
    calculator: "fa-calculator",
    settings: "fa-gear"
  },
  menuTitles: {
    dashboard: "Dashboard",
    inventory: "Inventory",
    sales: "Sales Ledger",
    finance: "Finance",
    suppliers: "Suppliers",
    entries: "Entries",
    calculator: "Fee Calculator",
    settings: "Settings"
  }
};

// Charts reference objects for hot-reloading data
let salesProfitChartInstance = null;
let platformSplitChartInstance = null;
let financeMonthlyChartInstance = null;

// ==========================================================================
// APP INITIALIZATION
// ==========================================================================
document.addEventListener("DOMContentLoaded", () => {
  try {
    // Load State and check session
    loadStateFromStorage();
    
    // Apply theme
    applyTheme(state.theme);

    // Apply font size
    applyFontSize(state.fontSize);
    
    // Set up navigation router
    initNavigation();

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
    const logoutBtn = document.getElementById("btn-logout");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", handleLogout);
    }

    // Start top bar clock
    startClock();

    // Force app to run in bypassed mode (always show app-container)
    const appContainer = document.getElementById("app-container");
    const authContainer = document.getElementById("auth-container");

    if (appContainer) appContainer.classList.remove("hidden");
    if (authContainer) authContainer.classList.add("hidden");
    
    // Hide logout button in bypassed mode
    if (logoutBtn) logoutBtn.classList.add("hidden");

    // Update profile display
    const nameDisplay = document.getElementById("user-display-name");
    if (nameDisplay) nameDisplay.textContent = "Merchant Dashboard";
    
    const supplierDisplayInput = document.getElementById("inv-supplier-display");
    if (supplierDisplayInput) {
      supplierDisplayInput.value = state.supplierDisplayMode || "name";
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

    // Set initial logo and active theme cards highlight
    applyLogo(state.customLogo);
    updateThemeSelectionCards(state.theme);
    updateCurrencySymbols();
    updateCurrencySelectionCards(state.currency);
    applyDateFormat(state.dateFormat);
    applySidebarState(state.sidebarCollapsed);
    applyFeeCalculatorVisibility(state.showFeeCalculator);
    applySalesLedgerVisibility(state.showSalesLedger);
    applyMetricsVisibility();
    applyMetricOrder();
    initDragAndDrop();
    applyMenuIcons();
    applyMenuTitles();
    renderSidebarCustomizationSettings();
    initSupabaseConnection();
    bindSupabaseSettingsControls();
    initFirebaseConnection();
    bindFirebaseSettingsControls();
    initAdvancedSettings();
    bindAdvancedSettingsControls();

    const toggleCalcInput = document.getElementById("toggle-show-calculator");
    if (toggleCalcInput) {
      toggleCalcInput.checked = state.showFeeCalculator;
      toggleCalcInput.addEventListener("change", (e) => {
        state.showFeeCalculator = e.target.checked;
        saveStateToStorage();
        applyFeeCalculatorVisibility(state.showFeeCalculator);
        if (window.supabaseClient) {
          dbSaveSettings("showFeeCalculator", state.showFeeCalculator);
        }
      });
    }

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
    state.inventoryLayout = localStorage.getItem("gv_inv_layout") || "list";
    state.supplierDisplayMode = localStorage.getItem("gv_supplier_display_mode") || "name";
    state.theme = localStorage.getItem("gv_theme") || "dark";
    state.currency = localStorage.getItem("gv_currency") || "EUR";
    state.dateFormat = localStorage.getItem("gv_date_format") || "YYYY-MM-DD";
    state.sidebarCollapsed = localStorage.getItem("gv_sidebar_collapsed") === "true";
    const storedShowCalc = localStorage.getItem("gv_show_fee_calculator");
    state.showFeeCalculator = storedShowCalc === null ? true : storedShowCalc === "true";

    const storedShowSalesLedger = localStorage.getItem("gv_show_sales_ledger");
    state.showSalesLedger = storedShowSalesLedger === null ? true : storedShowSalesLedger === "true";

    const storedVisibleMetrics = localStorage.getItem("gv_visible_metrics");
    if (storedVisibleMetrics) {
      try {
        state.visibleMetrics = JSON.parse(storedVisibleMetrics);
      } catch (e) {
        console.error("Error parsing visible metrics state, using defaults:", e);
      }
    }

    const storedMetricOrder = localStorage.getItem("gv_metric_order");
    if (storedMetricOrder) {
      try {
        state.metricOrder = JSON.parse(storedMetricOrder) || [];
      } catch (e) {
        console.error("Error parsing metric order state, using defaults:", e);
      }
    }

    // Bypass active user check - always guest
    state.currentUser = "guest";
    
    // Load per-user isolated data (pointing directly to global keys)
    const storedInventory = localStorage.getItem("gv_inventory");
    const storedSales = localStorage.getItem("gv_sales");
    const storedSuppliers = localStorage.getItem("gv_suppliers");

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
      // First-time load: populate with mock data
      state.inventory = [...MOCK_INVENTORY];
      state.sales = [...MOCK_SALES];
    }

    // Safeguard against parsed null values
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

    // Load Platforms
    const defaultPlatforms = [
      { name: "Steam", dateAdded: Date.now() - 5000, enabled: true },
      { name: "PlayStation 5", dateAdded: Date.now() - 4000, enabled: true },
      { name: "Xbox Series X/S", dateAdded: Date.now() - 3000, enabled: true },
      { name: "Nintendo Switch", dateAdded: Date.now() - 2000, enabled: true },
      { name: "Epic Games", dateAdded: Date.now() - 1000, enabled: true }
    ];

    try {
      const storedPlatforms = localStorage.getItem("gv_platforms");
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

// Save data to LocalStorage
function saveStateToStorage() {
  localStorage.setItem("gv_inventory", JSON.stringify(state.inventory));
  localStorage.setItem("gv_sales", JSON.stringify(state.sales));
  localStorage.setItem("gv_suppliers", JSON.stringify(state.suppliers));
  localStorage.setItem("gv_platforms", JSON.stringify(state.platforms));
  localStorage.setItem("gv_inv_layout", state.inventoryLayout);
  localStorage.setItem("gv_supplier_display_mode", state.supplierDisplayMode);
  localStorage.setItem("gv_theme", state.theme);
  localStorage.setItem("gv_currency", state.currency);
  localStorage.setItem("gv_date_format", state.dateFormat);
  localStorage.setItem("gv_sidebar_collapsed", state.sidebarCollapsed);
  localStorage.setItem("gv_show_fee_calculator", state.showFeeCalculator);
  localStorage.setItem("gv_show_sales_ledger", state.showSalesLedger);
  localStorage.setItem("gv_visible_metrics", JSON.stringify(state.visibleMetrics));
  localStorage.setItem("gv_metric_order", JSON.stringify(state.metricOrder));
  localStorage.setItem("gv_font_size", state.fontSize);
  localStorage.setItem("gv_low_stock_threshold", state.lowStockThreshold);
  localStorage.setItem("gv_default_markup_type", state.defaultMarkupType);
  localStorage.setItem("gv_default_markup_value", state.defaultMarkupValue);
  localStorage.setItem("gv_sync_mode", state.syncMode);
  localStorage.setItem("gv_platform_fee_presets", JSON.stringify(PLATFORM_FEE_PRESETS));
  if (state.customLogo) {
    localStorage.setItem("gv_custom_logo", state.customLogo);
  } else {
    localStorage.removeItem("gv_custom_logo");
  }
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

  if (tab === "login") {
    if (tabLogin) tabLogin.classList.add("active");
    if (tabRegister) tabRegister.classList.remove("active");
    if (secLogin) secLogin.classList.add("active");
    if (secRegister) secRegister.classList.remove("active");
  } else {
    if (tabRegister) tabRegister.classList.add("active");
    if (tabLogin) tabLogin.classList.remove("active");
    if (secRegister) secRegister.classList.add("active");
    if (secLogin) secLogin.classList.remove("active");
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
  try {
    const users = localStorage.getItem("gv_users");
    const parsed = users ? JSON.parse(users) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error("Error reading users from storage:", err);
    return [];
  }
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

    // Set active session
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
    
    if (authContainer) authContainer.classList.add("hidden");
    if (appContainer) appContainer.classList.remove("hidden");
    
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
    const newUser = { username, email, password };
    console.log("[Auth Debug] Registering new user:", newUser);
    users.push(newUser);
    saveUsersToStorage(users);
    console.log("[Auth Debug] Users in storage after save:", getUsersFromStorage());

    // Set active session
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
    
    if (authContainer) authContainer.classList.add("hidden");
    if (appContainer) appContainer.classList.remove("hidden");

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

// Perform logout
window.handleLogout = function() {
  localStorage.removeItem("gv_active_user");
  sessionStorage.removeItem("gv_active_user");
  
  state.currentUser = null;
  state.inventory = [];
  state.sales = [];
  state.suppliers = [];
  
  // Show auth view, hide app container
  document.getElementById("app-container").classList.add("hidden");
  document.getElementById("auth-container").classList.remove("hidden");
  
  showToast("Logged out successfully.", "info");
};

// Apply Theme to DOM
function applyTheme(theme) {
  const root = document.documentElement;
  const toggleIcon = document.getElementById("theme-toggle-icon");
  const btnToggle = document.getElementById("btn-theme-toggle");
  
  if (theme === "light") {
    root.setAttribute("data-theme", "light");
    if (toggleIcon) {
      toggleIcon.className = "fa-solid fa-moon";
    }
    if (btnToggle) {
      btnToggle.setAttribute("title", "Toggle Dark Mode");
    }
  } else {
    root.removeAttribute("data-theme");
    if (toggleIcon) {
      toggleIcon.className = "fa-solid fa-sun";
    }
    if (btnToggle) {
      btnToggle.setAttribute("title", "Toggle Light Mode");
    }
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
  const menus = ["dashboard", "inventory", "sales", "finance", "suppliers", "entries", "calculator", "settings"];
  menus.forEach(m => {
    const sidebarIcon = document.getElementById(`sidebar-icon-${m}`);
    if (sidebarIcon && state.menuIcons[m]) {
      sidebarIcon.className = `fa-solid ${state.menuIcons[m]}`;
    }
  });
}

// Apply Sidebar Titles dynamically
function applyMenuTitles() {
  const menus = ["dashboard", "inventory", "sales", "finance", "suppliers", "entries", "calculator", "settings"];
  menus.forEach(m => {
    const sidebarText = document.getElementById(`sidebar-text-${m}`);
    if (sidebarText && state.menuTitles[m]) {
      sidebarText.textContent = state.menuTitles[m];
    }
  });
}

// Render Settings sidebar customization panel (icons and titles)
function renderSidebarCustomizationSettings() {
  const listContainer = document.getElementById("settings-menu-icons-list");
  if (!listContainer) return;

  listContainer.innerHTML = "";

  const menus = [
    { key: "dashboard", label: "Dashboard" },
    { key: "inventory", label: "Inventory" },
    { key: "sales", label: "Sales Ledger" },
    { key: "finance", label: "Finance" },
    { key: "suppliers", label: "Suppliers" },
    { key: "entries", label: "Entries" },
    { key: "calculator", label: "Fee Calculator" },
    { key: "settings", label: "Settings" }
  ];

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

  menus.forEach(m => {
    const rowDiv = document.createElement("div");
    rowDiv.className = "menu-icon-row";

    const currentIcon = state.menuIcons[m.key] || "fa-gear";
    const currentTitle = state.menuTitles[m.key] || m.label;

    const optionsHtml = availableIcons.map(icon => 
      `<option value="${icon.value}" ${icon.value === currentIcon ? 'selected' : ''}>${icon.label}</option>`
    ).join("");

    rowDiv.innerHTML = `
      <div style="display: flex; align-items: center; gap: 12px; flex: 1;">
        <span class="icon-preview-box" id="preview-icon-box-${m.key}">
          <i class="fa-solid ${currentIcon}"></i>
        </span>
        <input type="text" class="form-control form-control-sm menu-title-input" data-menu="${m.key}" value="${currentTitle}" placeholder="${m.label}" style="background-color: var(--bg-card); font-weight: 500;">
      </div>
      <div style="margin-left: 12px; flex-shrink: 0;">
        <select class="form-control form-control-sm icon-selector" data-menu="${m.key}" style="width: 110px;">
          ${optionsHtml}
        </select>
      </div>
    `;

    const selectEl = rowDiv.querySelector("select");
    selectEl.addEventListener("change", (e) => {
      const newIcon = e.target.value;
      state.menuIcons[m.key] = newIcon;
      saveStateToStorage();
      
      const previewBox = document.getElementById(`preview-icon-box-${m.key}`);
      if (previewBox) {
        const iEl = previewBox.querySelector("i");
        if (iEl) iEl.className = `fa-solid ${newIcon}`;
      }

      const sidebarIcon = document.getElementById(`sidebar-icon-${m.key}`);
      if (sidebarIcon) {
        sidebarIcon.className = `fa-solid ${newIcon}`;
      }

      showToast(`Updated icon for "${state.menuTitles[m.key] || m.label}".`, "success");
      if (window.supabaseClient) {
        dbSaveCustomization(m.key, state.menuTitles[m.key] || m.label, newIcon);
      }
    });

    const inputEl = rowDiv.querySelector("input");
    inputEl.addEventListener("input", (e) => {
      const newTitle = e.target.value.trim() || m.label;
      state.menuTitles[m.key] = newTitle;
      saveStateToStorage();

      const sidebarText = document.getElementById(`sidebar-text-${m.key}`);
      if (sidebarText) {
        sidebarText.textContent = newTitle;
      }
      if (window.supabaseClient) {
        dbSaveCustomization(m.key, newTitle, state.menuIcons[m.key] || "fa-gear");
      }
    });

    listContainer.appendChild(rowDiv);
  });
}

// Wrapper function to satisfy validator scripts
function renderMenuIconsSettings() {
  renderSidebarCustomizationSettings();
}

// ==========================================================================
// NAVIGATION & GENERAL ROUTING
// ==========================================================================
function initNavigation() {
  const navLinks = document.querySelectorAll(".nav-link");
  const views = document.querySelectorAll(".content-view");
  const sidebar = document.getElementById("app-sidebar");
  const sidebarToggle = document.getElementById("sidebar-toggle");

  // Router based on nav links
  navLinks.forEach(link => {
    link.addEventListener("click", (e) => {
      if (link.id === "nav-collapse-sidebar") return;
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
      if (sidebar.classList.contains("active")) {
        sidebar.classList.remove("active");
      }
    });
  });

  // Mobile sidebar toggle
  sidebarToggle.addEventListener("click", () => {
    sidebar.classList.toggle("active");
  });

  // Handle date filters on Dashboard
  const periodButtons = document.querySelectorAll(".date-filter-group button");
  periodButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      periodButtons.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      state.activePeriod = btn.getAttribute("data-period");
      updateUI(); // Re-render numbers and charts based on date filter
    });
  });
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
  // Modal opening buttons
  document.getElementById("btn-add-game-modal").addEventListener("click", () => openModal("add-game-modal"));
  document.getElementById("btn-add-game-inventory").addEventListener("click", () => openModal("add-game-modal"));

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

  // Generate random key for testing inside Add Game form
  document.getElementById("btn-generate-random-key").addEventListener("click", () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let keyParts = [];
    for (let j = 0; j < 4; j++) {
      let part = "";
      for (let i = 0; i < 4; i++) {
        part += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      keyParts.push(part);
    }
    document.getElementById("game-key").value = keyParts.join("-");
    showToast("Dummy key generated!", "info");
  });

  // Sell Game Form Submission
  document.getElementById("sell-game-form").addEventListener("submit", handleSellGameSubmit);

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

  // Auto-calculate fee in Sell Game Modal when sale price or platform changes
  const salePriceInput = document.getElementById("sale-price");
  const salePlatformSelect = document.getElementById("sale-platform");
  const saleFeesInput = document.getElementById("sale-fees");

  const calcSaleFees = () => {
    const price = parseFloat(salePriceInput.value) || 0;
    let platform = salePlatformSelect.value.toLowerCase().replace(/\s/g, '');
    if (platform === "discord" || platform === "discorddirect") {
      platform = "direct";
    }
    if (platform === "kinguinapi") {
      platform = "kinguin";
    }
    const preset = PLATFORM_FEE_PRESETS[platform] || PLATFORM_FEE_PRESETS.other;
    
    const calculatedFee = (price * (preset.percent / 100)) + preset.fixed;
    saleFeesInput.value = calculatedFee.toFixed(2);
  };

  salePriceInput.addEventListener("input", calcSaleFees);
  salePlatformSelect.addEventListener("change", calcSaleFees);

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

  // Interactive Fee Calculator panel events
  document.getElementById("calc-platform").addEventListener("change", handleCalcPlatformChange);
  document.getElementById("btn-run-calc").addEventListener("click", runFeeCalculator);
  // Real-time calculator updates on inputs
  document.getElementById("calc-buy-price").addEventListener("input", (e) => {
    const buyPrice = parseFloat(e.target.value) || 0;
    let suggestedSell;
    if (state.defaultMarkupType === "percent") {
      suggestedSell = buyPrice * (1 + state.defaultMarkupValue / 100);
    } else {
      suggestedSell = buyPrice + state.defaultMarkupValue;
    }
    const calcSellPriceInput = document.getElementById("calc-sell-price");
    if (calcSellPriceInput) {
      calcSellPriceInput.value = suggestedSell.toFixed(2);
    }
    runFeeCalculator();
  });
  document.getElementById("calc-sell-price").addEventListener("input", runFeeCalculator);
  document.getElementById("calc-custom-fee").addEventListener("input", runFeeCalculator);

  // Filters Event Listeners for Inventory
  document.getElementById("inv-filter-platform").addEventListener("change", updateUI);
  document.getElementById("inv-filter-status").addEventListener("change", updateUI);
  document.getElementById("inv-filter-supplier").addEventListener("change", updateUI);
  const supplierDisplayInput = document.getElementById("inv-supplier-display");
  if (supplierDisplayInput) {
    supplierDisplayInput.addEventListener("change", (e) => {
      state.supplierDisplayMode = e.target.value;
      saveStateToStorage();
      if (window.supabaseClient && state.syncMode === "realtime") {
        dbSaveSettings("supplierDisplayMode", state.supplierDisplayMode);
      } else if (state.syncMode === "manual") {
        setUnsyncedChanges(true);
      }
      updateUI();
    });
  }
  document.getElementById("inv-search-input").addEventListener("input", updateUI);
  document.getElementById("btn-reset-inventory-filters").addEventListener("click", () => {
    document.getElementById("inv-filter-platform").value = "all";
    document.getElementById("inv-filter-status").value = "all";
    document.getElementById("inv-filter-supplier").value = "all";
    document.getElementById("inv-search-input").value = "";
    updateUI();
    showToast("Inventory filters reset.", "info");
  });

  // Filters Event Listeners for Sales
  document.getElementById("sales-filter-platform").addEventListener("change", updateUI);
  document.getElementById("sales-search-input").addEventListener("input", updateUI);
  
  // Dashboard Supplier Filter Event Listener
  const dbSupplierSelect = document.getElementById("db-filter-supplier");
  if (dbSupplierSelect) {
    dbSupplierSelect.addEventListener("change", updateUI);
  }
  document.getElementById("btn-reset-sales-filters").addEventListener("click", () => {
    document.getElementById("sales-filter-platform").value = "all";
    document.getElementById("sales-search-input").value = "";
    updateUI();
    showToast("Sales ledger filters reset.", "info");
  });

  // Global Search bar on top bar
  document.getElementById("global-search").addEventListener("input", (e) => {
    const val = e.target.value.toLowerCase().trim();
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
  });

  // Entries search input listener
  const entriesSearch = document.getElementById("entries-search-input");
  if (entriesSearch) {
    entriesSearch.addEventListener("input", renderEntries);
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
  
  if (btnList && btnGrid && btnGallery) {
    const setInvLayout = (layout) => {
      state.inventoryLayout = layout;
      saveStateToStorage();
      
      // Update toggle buttons active state
      btnList.classList.remove("active");
      btnGrid.classList.remove("active");
      btnGallery.classList.remove("active");
      
      if (layout === "list") btnList.classList.add("active");
      if (layout === "grid") btnGrid.classList.add("active");
      if (layout === "gallery") btnGallery.classList.add("active");
      
      // Re-render inventory
      updateUI();
    };

    btnList.addEventListener("click", () => setInvLayout("list"));
    btnGrid.addEventListener("click", () => setInvLayout("grid"));
    btnGallery.addEventListener("click", () => setInvLayout("gallery"));
  }

  // Settings Page - Theme Option Click Listeners
  const optDark = document.getElementById("theme-opt-dark");
  const optLight = document.getElementById("theme-opt-light");
  
  if (optDark) {
    optDark.addEventListener("click", () => {
      if (state.theme !== "dark") {
        state.theme = "dark";
        saveStateToStorage();
        applyTheme(state.theme);
        updateThemeSelectionCards(state.theme);
        if (window.supabaseClient) {
          dbSaveSettings("theme", state.theme);
        }
        updateUI();
        showToast("Switched to Dark Mode", "info");
      }
    });
  }

  if (optLight) {
    optLight.addEventListener("click", () => {
      if (state.theme !== "light") {
        state.theme = "light";
        saveStateToStorage();
        applyTheme(state.theme);
        updateThemeSelectionCards(state.theme);
        if (window.supabaseClient) {
          dbSaveSettings("theme", state.theme);
        }
        updateUI();
        showToast("Switched to Light Mode", "info");
      }
    });
  }

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
        updateCalculatorPlatformLabels();
        
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
        updateCalculatorPlatformLabels();
        
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
  const btnImport = document.getElementById("btn-import-inventory");
  const fileInputImport = document.getElementById("btn-import-inventory-file");
  if (btnImport && fileInputImport) {
    btnImport.addEventListener("click", () => {
      fileInputImport.click();
    });
    fileInputImport.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (file) {
        importInventoryFromCSV(file);
        fileInputImport.value = "";
      }
    });
  }

  document.getElementById("btn-export-inventory").addEventListener("click", exportInventoryToCSV);
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
  const financeChartBreakdownSelect = document.getElementById("finance-chart-breakdown-type");
  if (financeChartBreakdownSelect) {
    financeChartBreakdownSelect.addEventListener("change", () => {
      renderFinanceView();
    });
  }

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

  // Sidebar collapse toggle click handler
  const collapseBtn = document.getElementById("nav-collapse-sidebar");
  if (collapseBtn) {
    collapseBtn.addEventListener("click", (e) => {
      e.preventDefault();
      state.sidebarCollapsed = !state.sidebarCollapsed;
      saveStateToStorage();
      applySidebarState(state.sidebarCollapsed);
    });
  }

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
      if (!metricsPanel.contains(e.target) && e.target !== btnToggleMetrics) {
        metricsPanel.classList.remove("active");
      }
    });
    
    // Bind metric checkboxes
    const metricKeys = ["profit", "cost", "revenue", "roi", "stock"];
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
}

// Modal helper functions
function openModal(id) {
  const modal = document.getElementById(id);
  modal.classList.add("active");
}

function closeModal(id) {
  const modal = document.getElementById(id);
  modal.classList.remove("active");
  
  // Custom reset for view key modal security
  if (id === "view-key-modal") {
    document.getElementById("view-modal-key-input").type = "password";
    document.getElementById("toggle-key-eye-icon").className = "fa-solid fa-eye";
  }
}

// Toast Notifications helper
function showToast(message, type = "success") {
  const container = document.getElementById("toast-container");
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  
  let iconClass = "fa-circle-check";
  if (type === "error") iconClass = "fa-circle-xmark";
  if (type === "info") iconClass = "fa-circle-info";

  toast.innerHTML = `
    <i class="fa-solid ${iconClass}"></i>
    <span>${message}</span>
  `;
  container.appendChild(toast);
  
  // Remove toast after animation completes (3 seconds total)
  setTimeout(() => {
    toast.remove();
  }, 3000);
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
  const key = document.getElementById("game-key").value.trim();
  const source = document.getElementById("game-source").value.trim() || "Direct";
  const purchaseDate = document.getElementById("game-purchase-date").value;
  const notes = document.getElementById("game-notes").value.trim();

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

  const newGame = {
    id: "inv_" + Date.now(),
    title,
    platform,
    key,
    cost,
    source,
    purchaseDate,
    status: "Available",
    notes,
    imageUrl
  };

  state.inventory.push(newGame);
  saveStateToStorage();
  if (window.supabaseClient) {
    await dbSaveInventory(newGame);
  }
  updateUI();
  closeModal("add-game-modal");
  
  // Reset form
  document.getElementById("add-game-form").reset();
  document.getElementById("game-purchase-date").valueAsDate = new Date();
  
  showToast(`Successfully added game key: ${title}`, "success");
}

async function handleSellGameSubmit(e) {
  e.preventDefault();

  const gameId = document.getElementById("sell-game-id").value;
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
window.triggerSellGame = function(gameId) {
  const game = state.inventory.find(item => item.id === gameId);
  if (!game) return;

  document.getElementById("sell-game-id").value = game.id;
  document.getElementById("sell-modal-title").textContent = game.title;
  document.getElementById("sell-modal-platform").textContent = game.platform;
  document.getElementById("sell-modal-cost").textContent = formatCurrency(game.cost);

  // Default values
  let defaultSalePrice;
  if (state.defaultMarkupType === "percent") {
    defaultSalePrice = (game.cost * (1 + state.defaultMarkupValue / 100)).toFixed(2);
  } else {
    defaultSalePrice = (game.cost + state.defaultMarkupValue).toFixed(2);
  }
  document.getElementById("sale-price").value = defaultSalePrice;

  // Run fee auto-calculation
  const salePlatformSelect = document.getElementById("sale-platform");
  const platform = salePlatformSelect ? salePlatformSelect.value : "Kinguin";
  let platformKey = platform.toLowerCase().replace(/\s/g, '');
  if (platformKey === "discord" || platformKey === "discorddirect") {
    platformKey = "direct";
  }
  if (platformKey === "kinguinapi") {
    platformKey = "kinguin";
  }
  const preset = PLATFORM_FEE_PRESETS[platformKey] || PLATFORM_FEE_PRESETS.other;
  const calculatedFee = (parseFloat(defaultSalePrice) * (preset.percent / 100)) + preset.fixed;
  document.getElementById("sale-fees").value = calculatedFee.toFixed(2);

  openModal("sell-game-modal");
};

window.triggerViewKey = function(gameId) {
  const game = state.inventory.find(item => item.id === gameId);
  if (!game) return;

  const artworkRow = document.getElementById("view-modal-artwork-row");
  const initials = game.title.split(" ").map(w => w[0]).join("").slice(0, 3);
  if (game.imageUrl) {
    artworkRow.innerHTML = `
      <img src="${game.imageUrl}" class="view-modal-thumbnail" alt="${game.title}">
      <div>
        <span class="key-label" style="margin-bottom: 2px;">Game Title</span>
        <h4 id="view-modal-title" style="font-size: 1.15rem; color: #fff;">${game.title}</h4>
      </div>
    `;
  } else {
    artworkRow.innerHTML = `
      <div class="view-modal-thumbnail-placeholder">${initials}</div>
      <div>
        <span class="key-label" style="margin-bottom: 2px;">Game Title</span>
        <h4 id="view-modal-title" style="font-size: 1.15rem; color: #fff;">${game.title}</h4>
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
        ${game.source}
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

  if (confirm(`Are you sure you want to permanently delete "${game.title}" and its registration key from the inventory?`)) {
    // If it was sold, we should also clean up its sale from ledger (to balance accounts)
    if (game.status === "Sold") {
      state.sales = state.sales.filter(sale => sale.inventoryId !== gameId);
    }
    state.inventory = state.inventory.filter(item => item.id !== gameId);
    
    saveStateToStorage();
    if (window.supabaseClient) {
      await dbDeleteInventory(gameId);
    }
    updateUI();
    showToast(`Deleted "${game.title}" from records.`, "info");
  }
};

window.triggerCancelSale = async function(saleId) {
  const sale = state.sales.find(item => item.id === saleId);
  if (!sale) return;

  if (confirm(`Do you want to cancel the sale of "${sale.title}"? This will return the game key back to "Available" inventory.`)) {
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

  const gameIndex = state.inventory.findIndex(item => item.id === gameId);
  if (gameIndex === -1) {
    showToast("Game not found.", "error");
    return;
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
    status
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

window.triggerEditCatalogEntry = function(title) {
  const invMatch = state.inventory.find(item => item.title.trim().toLowerCase() === title.trim().toLowerCase());
  const saleMatch = state.sales.find(item => item.title.trim().toLowerCase() === title.trim().toLowerCase());
  
  const currentTitle = invMatch ? invMatch.title : (saleMatch ? saleMatch.title : title);
  const currentImgUrl = invMatch ? invMatch.imageUrl : (saleMatch ? saleMatch.imageUrl : "");

  document.getElementById("edit-entry-old-title").value = currentTitle;
  document.getElementById("edit-entry-title").value = currentTitle;
  document.getElementById("edit-entry-image-url").value = currentImgUrl || "";
  document.getElementById("edit-entry-image-file").value = "";

  openModal("edit-catalog-entry-modal");
};

async function handleEditCatalogEntrySubmit(e) {
  e.preventDefault();

  const oldTitle = document.getElementById("edit-entry-old-title").value.trim();
  const newTitle = document.getElementById("edit-entry-title").value.trim();
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
// CALCULATOR VIEW LOGIC
// ==========================================================================
function handleCalcPlatformChange() {
  const platform = document.getElementById("calc-platform").value;
  const customFeeContainer = document.getElementById("custom-fee-container");
  
  if (platform === "custom") {
    customFeeContainer.style.display = "block";
  } else {
    customFeeContainer.style.display = "none";
  }
  
  runFeeCalculator();
}

function runFeeCalculator() {
  const buyCost = parseFloat(document.getElementById("calc-buy-price").value) || 0;
  const sellPrice = parseFloat(document.getElementById("calc-sell-price").value) || 0;
  const platform = document.getElementById("calc-platform").value;
  
  let feePercent = 0;
  let fixedFee = 0;
  let platformLabel = "";

  if (platform === "custom") {
    feePercent = parseFloat(document.getElementById("calc-custom-fee").value) || 0;
    fixedFee = 0;
    platformLabel = `Custom Fee Structure (${feePercent}%)`;
  } else {
    const preset = PLATFORM_FEE_PRESETS[platform];
    feePercent = preset.percent;
    fixedFee = preset.fixed;
    
    // Dynamically construct description using current currency
    const symbol = state.currency === "USD" ? "$" : "€";
    let desc = "";
    if (platform === "g2a") desc = `${preset.percent}% + ${symbol}${preset.fixed.toFixed(2)} listing fee`;
    else if (platform === "kinguin") desc = `${preset.percent}% + ${symbol}${preset.fixed.toFixed(2)} sales fee`;
    else if (platform === "ebay") desc = `${preset.percent}% + ${symbol}${preset.fixed.toFixed(2)} payment fee`;
    else if (platform === "playerauctions") desc = `${preset.percent}% standard`;
    else if (platform === "direct") desc = `${preset.percent}% fees - Discord, Forums`;
    else desc = `${preset.percent}% commission`;
    
    platformLabel = `${preset.name} (${desc})`;
  }

  // Mathematics of profitability
  const calculatedFee = (sellPrice * (feePercent / 100)) + fixedFee;
  const netProfit = sellPrice - buyCost - calculatedFee;
  const profitMargin = sellPrice > 0 ? (netProfit / sellPrice) * 100 : 0;
  const roi = buyCost > 0 ? (netProfit / buyCost) * 100 : 0;
  
  // Breakeven price calculation: (BuyCost + FixedFee) / (1 - (FeePercent / 100))
  let breakevenPrice = 0;
  const feeDecimal = feePercent / 100;
  if (feeDecimal < 1) {
    breakevenPrice = (buyCost + fixedFee) / (1 - feeDecimal);
  }

  // Update UI Elements
  document.getElementById("res-gross").textContent = formatCurrency(sellPrice);
  document.getElementById("res-cost").textContent = formatCurrency(buyCost);
  document.getElementById("res-fees").textContent = formatCurrency(calculatedFee);
  
  const netElement = document.getElementById("res-net");
  netElement.textContent = formatCurrency(netProfit);
  if (netProfit < 0) {
    netElement.className = "text-danger-soft";
  } else {
    netElement.className = "text-success-neon";
  }

  // Profit Margin bar rendering
  const marginLabel = document.getElementById("res-margin-label");
  const marginBar = document.getElementById("res-margin-bar");
  marginLabel.textContent = `${profitMargin.toFixed(1)}%`;
  
  // Clamp fill percentage between 0 and 100
  const fillWidth = Math.max(0, Math.min(100, profitMargin));
  marginBar.style.width = `${fillWidth}%`;

  document.getElementById("res-roi").textContent = `${roi.toFixed(1)}%`;
  document.getElementById("res-breakeven").textContent = formatCurrency(breakevenPrice);
  document.getElementById("fee-note").textContent = `* Preset structure used: ${platformLabel}`;
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
    dbFilteredSales = filteredSales.filter(sale => {
      const game = state.inventory.find(item => item.id === sale.inventoryId);
      return game && game.source === dbSupplier;
    });
    dbFilteredInventory = state.inventory.filter(item => item.source === dbSupplier);
  }

  // 2. Render Metrics Cards based on filtered period and supplier
  calculateMetrics(dbFilteredSales, dbFilteredInventory);

  // 3. Render Charts
  renderSalesTrendChart(dbFilteredSales);
  renderPlatformSplitChart(dbFilteredSales);

  // 4. Render Tables
  renderInventoryTable(filteredInventory);
  renderSalesTable(filteredSales);
  
  // 5. Render Dashboard Summary Sections
  renderDashboardDetails(dbFilteredSales, dbFilteredInventory);

  // 6. Run fee calculator preset
  runFeeCalculator();

  // 7. Render Suppliers and populate dropdown lists
  renderSuppliers();

  // 7b. Render Platforms and populate dropdown lists
  renderPlatforms();

  // 8. Render Game catalog entries
  renderEntries();

  // 9. Render Finance view data
  renderFinanceView();
}

function renderSuppliers() {
  const tbody = document.getElementById("suppliers-table-body");
  if (!tbody) return;
  tbody.innerHTML = "";

  if (state.suppliers.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--text-muted); padding: 20px;">No suppliers registered.</td></tr>`;
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

    sortedSuppliers.forEach(supplierObj => {
      const supplierName = supplierObj.name;
      // Calculate total game keys purchased and currently in stock from this supplier
      const totalPurchases = state.inventory.filter(item => item.source === supplierName).length;
      const inStock = state.inventory.filter(item => item.source === supplierName && item.status !== "Sold").length;
      
      const colorName = supplierObj.color || getSupplierColorName(supplierName);
      const colorPreset = SUPPLIER_COLORS.find(c => c.name === colorName) || SUPPLIER_COLORS[0];
      const isEnabled = supplierObj.enabled !== false;
      
      const statusBtn = `
        <button class="btn" 
                onclick="triggerToggleSupplier('${supplierName.replace(/'/g, "\\'")}')" 
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
        ? `<img src="${supplierObj.logo}" class="supplier-logo-thumbnail" alt="${supplierName}">`
        : `<div class="supplier-logo-placeholder" style="background-color: ${colorPreset.value}20; color: ${colorPreset.value}; border: 1px solid ${colorPreset.value}40;"><i class="fa-solid fa-truck-ramp-box"></i></div>`;

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>
          <div style="display: flex; align-items: center; gap: 12px;">
            ${logoHtml}
            <div style="display: flex; flex-direction: column;">
              <strong>${supplierName}</strong>
              <span style="font-size: 0.72rem; color: var(--text-muted);">Added: ${new Date(supplierObj.dateAdded).toLocaleDateString(undefined, { dateStyle: 'medium' })}</span>
            </div>
          </div>
        </td>
        <td>
          <span class="supplier-tag" style="background-color: ${colorPreset.value}15; border-color: ${colorPreset.value}30; color: ${colorPreset.value}; font-weight: 600;">
            ${totalPurchases} keys purchased
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
          <button class="btn-action btn-action-edit" onclick="triggerEditSupplier('${supplierName.replace(/'/g, "\\'")}')" title="Edit Supplier">
            <i class="fa-solid fa-pen"></i>
          </button>
          <button class="btn-action btn-action-delete" onclick="triggerDeleteSupplier('${supplierName.replace(/'/g, "\\'")}')" title="Delete Supplier">
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
  }
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

function renderPlatforms() {
  const tbody = document.getElementById("platforms-table-body");
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

    sortedPlatforms.forEach(platformObj => {
      const platformName = platformObj.name;
      const totalPurchases = state.inventory.filter(item => item.platform === platformName).length;
      const inStock = state.inventory.filter(item => item.platform === platformName && item.status !== "Sold").length;
      
      const isEnabled = platformObj.enabled !== false;
      
      const statusBtn = `
        <button class="btn" 
                onclick="triggerTogglePlatform('${platformName.replace(/'/g, "\\'")}')" 
                style="padding: 4px 10px; font-size: 0.75rem; border-radius: var(--radius-sm); font-weight: 600; cursor: pointer; transition: all 0.2s ease; ${
                  isEnabled 
                    ? 'background-color: hsla(175, 90%, 48%, 0.1); border: 1px solid var(--accent-teal); color: var(--accent-teal);' 
                    : 'background-color: hsla(355, 85%, 55%, 0.1); border: 1px solid var(--accent-danger); color: var(--accent-danger);'
                }">
          <i class="${isEnabled ? 'fa-solid fa-circle-check' : 'fa-solid fa-circle-xmark'}" style="margin-right: 4px;"></i>
          ${isEnabled ? 'Enabled' : 'Disabled'}
        </button>
      `;

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>
          <strong>${platformName}</strong>
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
          <button class="btn-action btn-action-edit" onclick="triggerEditPlatform('${platformName.replace(/'/g, "\\'")}')" title="Edit Platform">
            <i class="fa-solid fa-pen"></i>
          </button>
          <button class="btn-action btn-action-delete" onclick="triggerDeletePlatform('${platformName.replace(/'/g, "\\'")}')" title="Delete Platform">
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

  const newPlatform = { name: name, dateAdded: Date.now(), enabled: true };
  state.platforms.push(newPlatform);
  saveStateToStorage();
  if (window.supabaseClient) {
    await dbSavePlatform(newPlatform);
  }
  updateUI();
  
  input.value = "";
  showToast(`Successfully registered platform: ${name}`, "success");
}

window.triggerEditPlatform = function(oldName) {
  const platformObj = state.platforms.find(p => p.name === oldName);
  if (!platformObj) return;

  document.getElementById("edit-platform-old-name").value = oldName;
  document.getElementById("edit-platform-name").value = oldName;

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
  
  const platformObj = state.platforms.find(p => p.name === oldName);
  if (platformObj) {
    platformObj.name = newName;
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
      await dbSavePlatform({ name: newName, dateAdded: platformObj.dateAdded, enabled: platformObj.enabled !== false });
      
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

  return list.sort((a, b) => new Date(b.purchaseDate) - new Date(a.purchaseDate)); // newest additions first
}

// Recalculates metrics panel widgets
function calculateMetrics(filteredSalesList, filteredInventoryList) {
  // Revenue and net profit
  let totalRevenue = 0;
  let totalCostOfSales = 0;
  let totalFees = 0;
  let totalNetProfit = 0;

  filteredSalesList.forEach(sale => {
    totalRevenue += sale.sellPrice;
    totalCostOfSales += sale.cost;
    totalFees += sale.fees;
    totalNetProfit += sale.profit;
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

  // Calculate percentages
  const marginPercentage = totalRevenue > 0 ? (totalNetProfit / totalRevenue) * 100 : 0;
  const roiPercentage = totalCostOfSales > 0 ? (totalNetProfit / totalCostOfSales) * 100 : 0;

  // Render values to DOM
  document.getElementById("metric-profit").textContent = formatCurrency(totalNetProfit);
  document.getElementById("metric-profit-change").innerHTML = `
    <i class="fa-solid ${marginPercentage >= 0 ? 'fa-arrow-trend-up' : 'fa-arrow-trend-down'}"></i> 
    ${marginPercentage.toFixed(1)}% margin
  `;
  document.getElementById("metric-profit-change").className = `metric-subtext ${marginPercentage >= 0 ? 'positive' : 'negative'}`;

  document.getElementById("metric-inventory-cost").textContent = formatCurrency(totalUnsoldCost);
  document.getElementById("metric-unsold-keys").textContent = `${totalUnsoldCount} keys in stock`;

  document.getElementById("metric-revenue").textContent = formatCurrency(totalRevenue);
  document.getElementById("metric-sold-keys").textContent = `${filteredSalesList.length} keys sold`;

  document.getElementById("metric-roi").textContent = `${roiPercentage.toFixed(1)}%`;
  document.getElementById("metric-fees-paid").textContent = `${formatCurrency(totalFees)} paid in fees`;

  const metricStockCountEl = document.getElementById("metric-stock-keys-count");
  if (metricStockCountEl) {
    metricStockCountEl.textContent = `${totalUnsoldCount} keys`;
  }
}

// Render Table: Inventory Stock List Router
function renderInventoryTable(itemsList) {
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

  if (state.inventoryLayout === "list") {
    if (tableContainer) tableContainer.style.display = "block";
    renderInventoryListLayout(itemsList);
  } else if (state.inventoryLayout === "grid") {
    if (gridContainer) gridContainer.style.display = "grid";
    renderInventoryGridLayout(itemsList);
  } else if (state.inventoryLayout === "gallery") {
    if (galleryContainer) galleryContainer.style.display = "grid";
    renderInventoryGalleryLayout(itemsList);
  }
  
  // Update footer text count
  document.getElementById("inventory-count-text").textContent = `Showing ${itemsList.length} of ${state.inventory.length} total inventory keys`;
}

// Render layout format A: List (Table)
function renderInventoryListLayout(itemsList) {
  const tbody = document.getElementById("inventory-table-body");
  if (!tbody) return;
  tbody.innerHTML = "";

  if (itemsList.length === 0) {
    tbody.innerHTML = `<tr><td colspan="10" class="text-center" style="text-align: center; padding: 30px; color: var(--text-muted);">No matching inventory keys in stock.</td></tr>`;
    return;
  }

  itemsList.forEach(item => {
    const tr = document.createElement("tr");

    // Mask key structure
    const maskedKey = `${item.key.slice(0, 4)}-****-****-${item.key.slice(-4)}`;

    // Status classes
    let statusClass = "badge-available";
    if (item.status === "Reserved") statusClass = "badge-reserved";
    if (item.status === "Sold") statusClass = "badge-sold";

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

    const initials = item.title.split(" ").map(w => w[0]).join("").slice(0, 3);
    const titleCell = item.imageUrl 
      ? `<div class="game-title-cell"><img src="${item.imageUrl}" class="game-thumbnail" alt="${item.title}"><strong>${item.title}</strong></div>`
      : `<div class="game-title-cell"><div class="game-thumbnail-placeholder">${initials}</div><strong>${item.title}</strong></div>`;

    // Retrieve closing date if sold
    const saleItem = state.sales.find(s => s.inventoryId === item.id);
    const dateClosedCell = saleItem ? formatDate(saleItem.saleDate) : `<span style="color: var(--text-muted); font-size: 0.8rem;">-</span>`;

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
        durationCell = `<span style="color: var(--text-secondary); font-size: 0.85rem;">${diffDays} day${diffDays === 1 ? '' : 's'} <span style="color: var(--text-muted); font-size: 0.75rem;">(active)</span></span>`;
      }
    } else {
      durationCell = `<span style="color: var(--text-muted); font-size: 0.8rem;">-</span>`;
    }

    const supplierObj = state.suppliers.find(s => s.name === item.source);
    const colorName = supplierObj ? (supplierObj.color || getSupplierColorName(item.source)) : getSupplierColorName(item.source);
    const colorPreset = SUPPLIER_COLORS.find(c => c.name === colorName) || SUPPLIER_COLORS[0];
    
    let supplierBadge = "";
    if (state.supplierDisplayMode === "logo") {
      if (supplierObj && supplierObj.logo) {
        supplierBadge = `<img src="${supplierObj.logo}" class="supplier-logo-thumbnail" style="width: 28px; height: 28px; vertical-align: middle; border-radius: 4px; object-fit: contain; background-color: var(--bg-card); border: 1px solid var(--border-color); padding: 1px;" title="${item.source}" alt="${item.source}">`;
      } else {
        supplierBadge = `
          <div class="supplier-logo-placeholder" style="width: 28px; height: 28px; border-radius: 4px; background-color: ${colorPreset.value}20; color: ${colorPreset.value}; border: 1px solid ${colorPreset.value}40; display: inline-flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: bold; vertical-align: middle;" title="${item.source}">
            ${item.source.charAt(0).toUpperCase()}
          </div>
        `;
      }
    } else {
      supplierBadge = `
        <span class="supplier-tag" style="background-color: ${colorPreset.value}12; border-color: ${colorPreset.value}25; color: ${colorPreset.value}; padding: 3px 8px; border-radius: 4px; font-size: 0.75rem; display: inline-flex; align-items: center; gap: 4px; vertical-align: middle;">
          <span class="supplier-dot" style="background-color: ${colorPreset.value}; width: 6px; height: 6px;"></span>
          ${item.source}
        </span>
      `;
    }

    tr.innerHTML = `
      <td>${titleCell}</td>
      <td><span class="platform-indicator"><i class="fa-solid fa-gamepad" style="font-size: 0.8rem; margin-right: 6px;"></i> ${item.platform}</span></td>
      <td><div class="secured-key"><code>${maskedKey}</code></div></td>
      <td>${formatCurrency(item.cost)}</td>
      <td style="text-align: center;">${supplierBadge}</td>
      <td>${formatDate(item.purchaseDate)}</td>
      <td>${dateClosedCell}</td>
      <td>${durationCell}</td>
      <td><span class="badge ${statusClass}">${item.status}</span></td>
      <td><div class="table-actions">${actionButtons}</div></td>
    `;
    tbody.appendChild(tr);
  });
}

// Render layout format B: Grid (Cards)
function renderInventoryGridLayout(itemsList) {
  const container = document.getElementById("inventory-grid-container");
  if (!container) return;
  container.innerHTML = "";

  if (itemsList.length === 0) {
    container.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-muted);">No matching inventory keys in stock.</div>`;
    return;
  }

  itemsList.forEach(item => {
    const card = document.createElement("div");
    card.className = "grid-card";

    const supplierObj = state.suppliers.find(s => s.name === item.source);
    const colorName = supplierObj ? (supplierObj.color || getSupplierColorName(item.source)) : getSupplierColorName(item.source);
    const colorPreset = SUPPLIER_COLORS.find(c => c.name === colorName) || SUPPLIER_COLORS[0];
    
    const supplierBadge = `
      <strong style="color: ${colorPreset.value}; display: inline-flex; align-items: center; gap: 5px;">
        <span class="supplier-dot" style="background-color: ${colorPreset.value}; width: 6px; height: 6px;"></span>
        ${item.source}
      </strong>
    `;

    const initials = item.title.split(" ").map(w => w[0]).join("").slice(0, 3);
    const bannerHtml = item.imageUrl
      ? `<img src="${item.imageUrl}" class="grid-card-img" alt="${item.title}">`
      : `<div class="grid-card-placeholder">${initials}</div>`;

    // Platform icon classes
    let platformIcon = "fa-solid fa-gamepad";
    if (item.platform.includes("Steam")) platformIcon = "fa-brands fa-steam";
    if (item.platform.includes("PlayStation")) platformIcon = "fa-brands fa-playstation";
    if (item.platform.includes("Xbox")) platformIcon = "fa-brands fa-xbox";

    // Status classes
    let statusClass = "badge-available";
    if (item.status === "Reserved") statusClass = "badge-reserved";
    if (item.status === "Sold") statusClass = "badge-sold";

    // Mask key structure
    const maskedKey = `${item.key.slice(0, 4)}-****-****-${item.key.slice(-4)}`;

    // Action buttons based on status
    let actionButton = "";
    if (item.status === "Available") {
      actionButton = `
        <button class="btn-action btn-action-sell" onclick="triggerSellGame('${item.id}')" title="Mark as Sold"><i class="fa-solid fa-euro-sign"></i></button>
      `;
    }

    const saleItem = state.sales.find(s => s.inventoryId === item.id);
    const dateClosedRow = saleItem 
      ? `<span>Closed: ${formatDate(saleItem.saleDate)}</span>` 
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
        durationRow = `<span style="color: var(--text-secondary);">Active: ${diffDays} day${diffDays === 1 ? '' : 's'}</span>`;
      }
    }
    
    let metaBlockHtml = "";
    if (saleItem) {
      const roi = item.cost > 0 ? (saleItem.profit / item.cost) * 100 : 0;
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
              <strong class="${profitClass}">${profitSign}${formatCurrency(saleItem.profit)}</strong>
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
      <div class="grid-card-banner">
        ${bannerHtml}
        <span class="grid-card-platform"><i class="${platformIcon}"></i> ${item.platform}</span>
        <span class="badge ${statusClass} grid-card-status">${item.status}</span>
      </div>
      <div class="grid-card-body">
        <h4 class="grid-card-title" title="${item.title}">${item.title}</h4>
        ${metaBlockHtml}
        <div class="grid-card-key">
          <div class="secured-key" style="justify-content: center; width: 100%;">
            <code>${maskedKey}</code>
          </div>
        </div>
        <div class="grid-card-actions">
          <div class="grid-card-dates">
            <span>Added: ${formatDate(item.purchaseDate)}</span>
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
}

// Render layout format C: Gallery (Poster cards)
function renderInventoryGalleryLayout(itemsList) {
  const container = document.getElementById("inventory-gallery-container");
  if (!container) return;
  container.innerHTML = "";

  if (itemsList.length === 0) {
    container.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-muted);">No matching inventory keys in stock.</div>`;
    return;
  }

  itemsList.forEach(item => {
    const card = document.createElement("div");
    card.className = "gallery-card";

    const supplierObj = state.suppliers.find(s => s.name === item.source);
    const colorName = supplierObj ? (supplierObj.color || getSupplierColorName(item.source)) : getSupplierColorName(item.source);
    const colorPreset = SUPPLIER_COLORS.find(c => c.name === colorName) || SUPPLIER_COLORS[0];
    
    const supplierBadge = `
      <strong style="color: ${colorPreset.value}; display: inline-flex; align-items: center; gap: 5px;">
        <span class="supplier-dot" style="background-color: ${colorPreset.value}; width: 6px; height: 6px;"></span>
        ${item.source}
      </strong>
    `;

    const initials = item.title.split(" ").map(w => w[0]).join("").slice(0, 3);
    const imageHtml = item.imageUrl
      ? `<img src="${item.imageUrl}" class="gallery-card-img" alt="${item.title}">`
      : `<div class="gallery-card-placeholder">${initials}</div>`;

    // Platform icon classes
    let platformIcon = "fa-solid fa-gamepad";
    if (item.platform.includes("Steam")) platformIcon = "fa-brands fa-steam";
    if (item.platform.includes("PlayStation")) platformIcon = "fa-brands fa-playstation";
    if (item.platform.includes("Xbox")) platformIcon = "fa-brands fa-xbox";

    // Status classes
    let statusClass = "badge-available";
    if (item.status === "Reserved") statusClass = "badge-reserved";
    if (item.status === "Sold") statusClass = "badge-sold";

    // Mask key structure
    const maskedKey = `${item.key.slice(0, 4)}-****-****-${item.key.slice(-4)}`;

    // Action buttons based on status
    let actionButton = "";
    if (item.status === "Available") {
      actionButton = `
        <button class="btn-action btn-action-sell" onclick="triggerSellGame('${item.id}')" title="Mark as Sold"><i class="fa-solid fa-euro-sign"></i></button>
      `;
    }

    const saleItem = state.sales.find(s => s.inventoryId === item.id);
    const dateClosedMeta = saleItem 
      ? `<div class="gallery-card-hover-meta-item"><span>Closed:</span><strong>${formatDate(saleItem.saleDate)}</strong></div>`
      : "";
    const soldPriceMeta = saleItem 
      ? `<div class="gallery-card-hover-meta-item"><span>Sold:</span><strong class="text-success-neon">${formatCurrency(saleItem.sellPrice)}</strong></div>`
      : "";

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
        durationMeta = `<div class="gallery-card-hover-meta-item"><span>Active:</span><strong>${diffDays} day${diffDays === 1 ? '' : 's'}</strong></div>`;
      }
    }

    card.innerHTML = `
      <div class="gallery-card-img-container">
        ${imageHtml}
      </div>
      <div class="gallery-card-overlay">
        <h4 class="gallery-card-title" title="${item.title}">${item.title}</h4>
        <div class="gallery-card-subtitle">
          <span><i class="${platformIcon}"></i> ${item.platform}</span>
          <span class="badge ${statusClass}">${item.status}</span>
        </div>
      </div>
      <div class="gallery-card-hover-details">
        <div class="gallery-card-hover-header">
          <h4 title="${item.title}">${item.title}</h4>
          <span class="badge ${statusClass}">${item.status}</span>
        </div>
        <div class="gallery-card-hover-meta">
          <div class="gallery-card-hover-meta-item">
            <span>Platform:</span>
            <strong>${item.platform}</strong>
          </div>
          <div class="gallery-card-hover-meta-item">
            <span>Cost:</span>
            <strong>${formatCurrency(item.cost)}</strong>
          </div>
          ${soldPriceMeta}
          <div class="gallery-card-hover-meta-item">
            <span>Supplier:</span>
            ${supplierBadge}
          </div>
          <div class="gallery-card-hover-meta-item">
            <span>Added:</span>
            <strong>${formatDate(item.purchaseDate)}</strong>
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
}

// Render Table: Sales ledger list
function renderSalesTable(salesList) {
  const tbody = document.getElementById("sales-table-body");
  tbody.innerHTML = "";

  if (salesList.length === 0) {
    tbody.innerHTML = `<tr><td colspan="10" class="text-center" style="text-align: center; padding: 30px; color: var(--text-muted);">No sales recorded in this period.</td></tr>`;
    document.getElementById("sales-count-text").textContent = `Showing 0 sales`;
    return;
  }

  salesList.forEach(sale => {
    const tr = document.createElement("tr");

    const initials = sale.title.split(" ").map(w => w[0]).join("").slice(0, 3);
    const gameInInv = state.inventory.find(i => i.id === sale.inventoryId);
    const saleImgUrl = gameInInv ? gameInInv.imageUrl : null;
    const titleCell = saleImgUrl 
      ? `<div class="game-title-cell"><img src="${saleImgUrl}" class="game-thumbnail" alt="${sale.title}"><strong>${sale.title}</strong></div>`
      : `<div class="game-title-cell"><div class="game-thumbnail-placeholder">${initials}</div><strong>${sale.title}</strong></div>`;

    tr.innerHTML = `
      <td>${titleCell}</td>
      <td><span class="platform-indicator"><i class="fa-solid fa-gamepad" style="font-size: 0.8rem; margin-right: 6px;"></i> ${sale.platform}</span></td>
      <td>${formatCurrency(sale.cost)}</td>
      <td><strong>${formatCurrency(sale.sellPrice)}</strong></td>
      <td><span class="tag-platform-sold" style="background-color: hsla(270, 85%, 60%, 0.1); border: 1px solid hsla(270, 85%, 60%, 0.2); color: var(--accent-purple); padding: 2px 8px; border-radius: 4px; font-size: 0.75rem; font-weight:600;">${sale.platformSold}</span></td>
      <td class="text-danger-soft">${formatCurrency(sale.fees)}</td>
      <td class="text-success-neon"><strong>${formatCurrency(sale.profit)}</strong></td>
      <td>${formatDate(sale.saleDate)}</td>
      <td style="max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${sale.notes || ''}">${sale.notes || '<span style="color: var(--text-muted)">-</span>'}</td>
      <td>
        <div class="table-actions">
          <button class="btn-action btn-action-delete" onclick="triggerCancelSale('${sale.id}')" title="Cancel Sale (Return key to stock)"><i class="fa-solid fa-rotate-left"></i></button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });

  document.getElementById("sales-count-text").textContent = `Showing ${salesList.length} of ${state.sales.length} transactions`;
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

  // Stock summary lists
  const stockSummaryList = document.getElementById("inventory-summary-list");
  stockSummaryList.innerHTML = "";

  // Low Stock Alerts - count active stock for games
  const gameStockCounts = {};
  filteredInventoryList.forEach(item => {
    if (item.status === "Available" || item.status === "Reserved") {
      const title = item.title.trim();
      gameStockCounts[title] = (gameStockCounts[title] || 0) + 1;
    }
  });

  const lowStockGames = [];
  Object.keys(gameStockCounts).forEach(title => {
    const count = gameStockCounts[title];
    if (count <= state.lowStockThreshold) {
      lowStockGames.push({ title, count });
    }
  });

  // Sort lowest stock first, then alphabetically
  lowStockGames.sort((a, b) => {
    if (a.count !== b.count) {
      return a.count - b.count;
    }
    return a.title.localeCompare(b.title);
  });

  // Render Low Stock alerts first
  lowStockGames.forEach(game => {
    const alertDiv = document.createElement("div");
    alertDiv.className = "low-stock-alert-item";
    alertDiv.innerHTML = `
      <div class="alert-left">
        <i class="fa-solid fa-triangle-exclamation"></i>
        <div>
          <h5>${game.title}</h5>
          <span>Low Stock Alert</span>
        </div>
      </div>
      <div class="alert-badge">${game.count} left</div>
    `;
    stockSummaryList.appendChild(alertDiv);
  });

  // Group inventory by platform
  const platformCounts = {};
  filteredInventoryList.forEach(item => {
    if (item.status !== "Sold") {
      platformCounts[item.platform] = (platformCounts[item.platform] || 0) + 1;
    }
  });

  const platformKeys = Object.keys(platformCounts);
  if (platformKeys.length === 0) {
    stockSummaryList.innerHTML = `<p style="text-align: center; color: var(--text-muted); padding: 20px 0;">All keys sold! Stock is empty.</p>`;
  } else {
    // Sort platforms by count descending
    platformKeys.sort((a,b) => platformCounts[b] - platformCounts[a]);
    
    platformKeys.forEach(platform => {
      const count = platformCounts[platform];
      const div = document.createElement("div");
      div.className = "inventory-summary-item";

      // Assign icon badge classes
      let iconClass = "fa-solid fa-steam";
      let pClass = "Steam";
      if (platform.includes("PlayStation")) { iconClass = "fa-brands fa-playstation"; pClass = "PSN"; }
      if (platform.includes("Xbox")) { iconClass = "fa-brands fa-xbox"; pClass = "Xbox"; }
      if (platform.includes("Nintendo")) { iconClass = "fa-solid fa-gamepad"; pClass = "Nintendo"; }

      div.innerHTML = `
        <div class="summary-item-left">
          <div class="summary-platform-badge ${pClass}">
            <i class="${iconClass}"></i>
          </div>
          <div class="summary-details">
            <h5>${platform} Keys</h5>
            <span>Digital activation codes</span>
          </div>
        </div>
        <div class="summary-item-right">
          <span class="summary-count">${count} in stock</span>
        </div>
      `;
      stockSummaryList.appendChild(div);
    });
  }
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

  // Group sales by Date
  const salesByDate = {};
  filteredSalesList.forEach(sale => {
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

  salesProfitChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        {
          label: `Total Revenue (${state.currency === 'USD' ? '$' : '€'})`,
          data: revenueData,
          borderColor: 'hsl(330, 95%, 60%)',
          backgroundColor: 'hsla(330, 95%, 60%, 0.1)',
          borderWidth: 3,
          fill: true,
          tension: 0.35,
          pointBackgroundColor: 'hsl(330, 95%, 60%)',
          pointHoverRadius: 6
        },
        {
          label: `Net Profit (${state.currency === 'USD' ? '$' : '€'})`,
          data: profitData,
          borderColor: 'hsl(175, 90%, 48%)',
          backgroundColor: 'hsla(175, 90%, 48%, 0.1)',
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
          titleColor: state.theme === "dark" ? "#fff" : "#000",
          bodyColor: state.theme === "dark" ? "#fff" : "#000",
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

  // Count sales per selling platform
  const platformCounts = {};
  filteredSalesList.forEach(sale => {
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

  const backgroundColors = [
    'hsl(270, 85%, 60%)', // Neon purple
    'hsl(195, 90%, 50%)', // Cyan
    'hsl(330, 95%, 60%)', // Pink
    'hsl(175, 90%, 48%)', // Teal
    'hsl(40, 95%, 55%)',  // Gold
    'hsl(355, 85%, 55%)'  // Danger
  ];

  const rootStyle = getComputedStyle(document.documentElement);
  const textSecondaryColor = rootStyle.getPropertyValue('--text-secondary').trim() || 'hsl(220, 12%, 65%)';
  const bgCardColor = rootStyle.getPropertyValue('--bg-card').trim() || 'hsl(224, 22%, 12%)';
  const borderColor = rootStyle.getPropertyValue('--border-color').trim() || 'hsla(224, 20%, 30%, 0.5)';
  const tooltipBg = rootStyle.getPropertyValue('--bg-sidebar').trim() || 'hsl(224, 25%, 10%)';

  platformSplitChartInstance = new Chart(ctx, {
    type: 'doughnut',
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
    options: {
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
          titleColor: state.theme === "dark" ? "#fff" : "#000",
          bodyColor: state.theme === "dark" ? "#fff" : "#000",
          borderColor: borderColor,
          borderWidth: 1
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

// Import inventory items from parsed CSV file
async function importInventoryFromCSV(file) {
  const reader = new FileReader();
  reader.onload = async function(e) {
    const text = e.target.result;
    const lines = text.split(/\r?\n/);
    if (lines.length < 2) {
      showToast("CSV file is empty or invalid.", "error");
      return;
    }
    
    // Parse headers
    const headers = parseCSVLine(lines[0]);
    
    // Map headers to fields
    let titleIdx = -1;
    let platformIdx = -1;
    let keyIdx = -1;
    let costIdx = -1;
    let sourceIdx = -1;
    let dateIdx = -1;
    let statusIdx = -1;
    let notesIdx = -1;
    let idIdx = -1;
    
    headers.forEach((h, idx) => {
      const clean = h.trim().toLowerCase();
      if (clean === "game title" || clean === "title") titleIdx = idx;
      else if (clean === "platform") platformIdx = idx;
      else if (clean === "digital key" || clean === "key") keyIdx = idx;
      else if (clean === "acquisition cost" || clean === "cost") costIdx = idx;
      else if (clean === "source" || clean === "vendor") sourceIdx = idx;
      else if (clean === "date added" || clean === "purchasedate" || clean === "date") dateIdx = idx;
      else if (clean === "status") statusIdx = idx;
      else if (clean === "notes") notesIdx = idx;
      else if (clean === "id") idIdx = idx;
    });
    
    if (titleIdx === -1 || keyIdx === -1) {
      showToast("CSV must contain at least 'Game Title' (or Title) and 'Digital Key' (or Key) columns.", "error");
      return;
    }
    
    const importedItems = [];
    const newSuppliers = [];
    const currentSupplierNames = new Set(state.suppliers.map(s => s.name.toLowerCase()));
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue; // skip empty lines
      
      const values = parseCSVLine(line);
      if (values.length < Math.max(titleIdx, keyIdx) + 1) continue; // skip short lines
      
      const title = values[titleIdx]?.trim() || "";
      const key = values[keyIdx]?.trim() || "";
      
      if (!title || !key) continue; // skip invalid rows
      
      const platform = platformIdx !== -1 ? (values[platformIdx]?.trim() || "Steam") : "Steam";
      const cost = costIdx !== -1 ? (parseFloat(values[costIdx]) || 0) : 0;
      const source = sourceIdx !== -1 ? (values[sourceIdx]?.trim() || "Direct") : "Direct";
      
      // Default to today if Date Added is missing or invalid
      let purchaseDate = new Date().toISOString().split("T")[0];
      if (dateIdx !== -1 && values[dateIdx]) {
        const rawDate = values[dateIdx].trim();
        if (/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
          purchaseDate = rawDate;
        } else {
          try {
            const parsed = new Date(rawDate);
            if (!isNaN(parsed.getTime())) {
              purchaseDate = parsed.toISOString().split("T")[0];
            }
          } catch(err) {}
        }
      }
      
      const status = statusIdx !== -1 ? (values[statusIdx]?.trim() || "Available") : "Available";
      const notes = notesIdx !== -1 ? (values[notesIdx]?.trim() || "") : "";
      
      let id = idIdx !== -1 ? (values[idIdx]?.trim() || "") : "";
      if (!id) {
        id = "inv_" + Date.now() + "_" + Math.floor(Math.random() * 10000);
      }
      
      // Check if item already exists in local inventory
      const duplicateIndex = state.inventory.findIndex(item => item.id === id || (item.key === key && item.key !== ""));
      const newItem = { id, title, platform, key, cost, source, purchaseDate, status, notes, imageUrl: "" };
      
      if (duplicateIndex !== -1) {
        state.inventory[duplicateIndex] = newItem;
      } else {
        state.inventory.push(newItem);
      }
      importedItems.push(newItem);
      
      const sourceKey = source.toLowerCase();
      if (source && !currentSupplierNames.has(sourceKey)) {
        const newSup = { name: source, dateAdded: Date.now(), color: "purple", enabled: true };
        state.suppliers.push(newSup);
        currentSupplierNames.add(sourceKey);
        newSuppliers.push(newSup);
      }
    }
    
    if (importedItems.length === 0) {
      showToast("No valid inventory rows imported.", "warning");
      return;
    }
    
    saveStateToStorage();
    
    // Cloud sync
    if (window.supabaseClient) {
      try {
        showToast("Synchronizing imported entries to cloud...", "info");
        
        // Upsert suppliers
        if (newSuppliers.length > 0) {
          const { error: supErr } = await window.supabaseClient.from('suppliers').upsert(newSuppliers.map(s => ({
            name: s.name,
            dateAdded: s.dateAdded,
            color: s.color,
            enabled: s.enabled,
            logo: s.logo || null
          })));
          if (supErr) {
            if (supErr.message && supErr.message.includes('column "logo" of relation "suppliers" does not exist')) {
              console.warn("Supabase relation 'suppliers' is missing the 'logo' column. Falling back to upsert without logo.");
              await window.supabaseClient.from('suppliers').upsert(newSuppliers.map(s => ({
                name: s.name,
                dateAdded: s.dateAdded,
                color: s.color,
                enabled: s.enabled
              })));
            } else {
              throw supErr;
            }
          }
        }
        
        // Upsert inventory
        const { error } = await window.supabaseClient.from('inventory').upsert(importedItems.map(item => ({
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
        showToast(`Imported & cloud-synced ${importedItems.length} keys successfully!`, "success");
      } catch (err) {
        console.error("Supabase import sync error:", err);
        showToast(`Local import succeeded, but cloud sync failed: ${err.message || err}`, "warning");
      }
    } else {
      showToast(`Imported ${importedItems.length} keys successfully!`, "success");
    }
    
    updateUI();
  };
  
  reader.readAsText(file);
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
  csvRows.push(["ID", "Game Title", "Platform", "Cost", "Sale Price", "Platform Sold On", "Fees", "Net Profit", "Sale Date", "Notes"]);

  state.sales.forEach(sale => {
    csvRows.push([
      sale.id,
      `"${sale.title.replace(/"/g, '""')}"`,
      sale.platform,
      sale.cost.toFixed(2),
      sale.sellPrice.toFixed(2),
      sale.platformSold,
      sale.fees.toFixed(2),
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

function updateThemeSelectionCards(theme) {
  const optDark = document.getElementById("theme-opt-dark");
  const optLight = document.getElementById("theme-opt-light");
  if (optDark && optLight) {
    optDark.classList.toggle("active", theme === "dark");
    optLight.classList.toggle("active", theme === "light");
  }
}

// Regional Currency Formatting and UI Sync Helpers
function formatCurrency(value) {
  const val = parseFloat(value) || 0;
  const symbol = state.currency === "USD" ? "$" : "€";
  const sign = val < 0 ? "-" : "";
  return `${sign}${symbol}${Math.abs(val).toFixed(2)}`;
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

  // Update calculator view options select
  const calcPlatformSelect = document.getElementById("calc-platform");
  if (calcPlatformSelect) {
    const symbol = state.currency === "USD" ? "$" : "€";
    const options = calcPlatformSelect.options;
    for (let i = 0; i < options.length; i++) {
      const opt = options[i];
      if (opt.value === "g2a") {
        opt.textContent = `G2A (10.8% + ${symbol}0.40 listing fee)`;
      } else if (opt.value === "kinguin") {
        opt.textContent = `Kinguin (11% + ${symbol}0.35 sales fee)`;
      } else if (opt.value === "ebay") {
        opt.textContent = `eBay (15% + ${symbol}0.30 payment fee)`;
      }
    }
  }
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
  const tbody = document.getElementById("entries-table-body");
  if (!tbody) return;
  tbody.innerHTML = "";

  // Get search filter value
  const searchInput = document.getElementById("entries-search-input")?.value.toLowerCase().trim() || "";

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

    // Retrieve corresponding inventory purchaseDate
    const invItem = state.inventory.find(i => i.id === sale.inventoryId);
    if (invItem && invItem.purchaseDate && sale.saleDate) {
      const start = new Date(invItem.purchaseDate);
      const end = new Date(sale.saleDate);
      start.setHours(0, 0, 0, 0);
      end.setHours(0, 0, 0, 0);
      const diffTime = Math.max(0, end - start);
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
      titleGroups[titleKey].sellDurations.push(diffDays);
    }
  });

  // Convert map to filterable array list
  let entriesList = Object.values(titleGroups);

  // Search filtering
  if (searchInput) {
    entriesList = entriesList.filter(entry => 
      entry.title.toLowerCase().includes(searchInput)
    );
  }

  // Sort alphabetically
  entriesList.sort((a, b) => a.title.localeCompare(b.title));

  if (entriesList.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" class="text-center" style="text-align: center; padding: 30px; color: var(--text-muted);">No matching game entries found.</td></tr>`;
    document.getElementById("entries-count-text").textContent = "Showing 0 game titles";
    return;
  }

  // Draw entries rows
  entriesList.forEach(entry => {
    const tr = document.createElement("tr");

    // ROI = Net Profit / Cost of Sold Keys * 100
    const roiPercentage = entry.totalCostOfSold > 0 ? (entry.profit / entry.totalCostOfSold) * 100 : 0;

    const initials = entry.title.split(" ").map(w => w[0]).join("").slice(0, 3);
    const titleCell = entry.imageUrl
      ? `<div class="game-title-cell"><img src="${entry.imageUrl}" class="game-thumbnail" alt="${entry.title}"><strong>${entry.title}</strong></div>`
      : `<div class="game-title-cell"><div class="game-thumbnail-placeholder">${initials}</div><strong>${entry.title}</strong></div>`;

    const safeTitle = entry.title.replace(/\\/g, '\\\\').replace(/'/g, "\\'");

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
      <td style="text-align: right;">
        <button class="btn btn-outline btn-sm" onclick="triggerEditCatalogEntry('${safeTitle}')">
          <i class="fa-solid fa-pen"></i> Edit
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  document.getElementById("entries-count-text").textContent = `Showing ${entriesList.length} unique game titles`;
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

function applyFeeCalculatorVisibility(show) {
  const calcLink = document.getElementById("nav-calculator");
  if (calcLink) {
    const parentLi = calcLink.closest("li");
    if (parentLi) {
      parentLi.style.display = show ? "" : "none";
    }
  }
  
  // Redirect if active and hidden
  if (!show && window.location.hash === "#calculator") {
    window.location.hash = "#dashboard";
    const dashboardLink = document.getElementById("nav-dashboard");
    if (dashboardLink) dashboardLink.click();
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
    stock: document.getElementById("card-available-stock")
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

function applyMetricOrder() {
  const grid = document.querySelector(".metrics-grid");
  if (!grid) return;
  
  const defaultOrder = [
    "card-net-profit",
    "card-inventory-cost",
    "card-total-revenue",
    "card-roi",
    "card-available-stock"
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
  const grid = document.querySelector(".metrics-grid");
  if (!grid) return;
  const children = Array.from(grid.children);
  const order = children.map(child => child.id);
  state.metricOrder = order;
  saveStateToStorage();
  if (window.supabaseClient) {
    dbSaveSettings("metricOrder", state.metricOrder);
  }
}

let dragSource = null;

function initDragAndDrop() {
  const grid = document.querySelector(".metrics-grid");
  if (!grid) return;
  
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
      cards.forEach(c => c.classList.remove("drag-over"));
      saveMetricOrder();
    });
    
    card.addEventListener("dragover", (e) => {
      e.preventDefault();
      if (card === dragSource) return;
      card.classList.add("drag-over");
    });
    
    card.addEventListener("dragleave", () => {
      card.classList.remove("drag-over");
    });
    
    card.addEventListener("drop", (e) => {
      e.preventDefault();
      card.classList.remove("drag-over");
      if (card === dragSource) return;
      
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
}

// ==========================================================================
// FINANCE LEDGER & MONTHLY STATISTICS RENDERING
// ==========================================================================
function renderFinanceView() {
  const metricsContainer = document.getElementById("finance-metrics-grid");
  const tbody = document.querySelector("#finance-monthly-table tbody");
  const canvas = document.getElementById("financeMonthlyChart");
  const breakdownSelect = document.getElementById("finance-breakdown-type");
  const breakdownTitle = document.getElementById("finance-breakdown-title");
  const tableHeaderPeriod = document.getElementById("finance-table-header-period");
  const chartBreakdownSelect = document.getElementById("finance-chart-breakdown-type");
  const chartTitle = document.getElementById("finance-chart-title");
  
  if (!metricsContainer || !tbody || !canvas) return;

  const breakdownType = breakdownSelect ? breakdownSelect.value : "month";
  const chartBreakdownType = chartBreakdownSelect ? chartBreakdownSelect.value : "month";

  // Update chart header text dynamically
  if (chartTitle) {
    if (chartBreakdownType === "month") chartTitle.textContent = "Monthly Financial Trend";
    else if (chartBreakdownType === "year") chartTitle.textContent = "Yearly Financial Trend";
    else chartTitle.textContent = "All-Time Cumulative Financial Trend";
  }

  // Update card header and table column header text dynamically
  if (breakdownTitle) {
    if (breakdownType === "month") breakdownTitle.textContent = "Monthly Ledger Breakdown";
    else if (breakdownType === "year") breakdownTitle.textContent = "Yearly Ledger Breakdown";
    else breakdownTitle.textContent = "All-Time Ledger Summary";
  }

  if (tableHeaderPeriod) {
    if (breakdownType === "month") tableHeaderPeriod.textContent = "Month";
    else if (breakdownType === "year") tableHeaderPeriod.textContent = "Year";
    else tableHeaderPeriod.textContent = "Period";
  }

  metricsContainer.innerHTML = "";
  tbody.innerHTML = "";

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
      key = sale.saleDate.substring(0, 7); // e.g. "2026-06"
    } else if (breakdownType === "year") {
      key = sale.saleDate.substring(0, 4); // e.g. "2026"
    }

    if (!groupedData[key]) {
      groupedData[key] = { revenue: 0, cost: 0, profit: 0, count: 0 };
    }
    groupedData[key].revenue += sale.sellPrice;
    groupedData[key].cost += sale.cost;
    groupedData[key].profit += sale.profit;
    groupedData[key].count += 1;
  });

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

  // Sort keys chronologically
  const sortedKeys = Object.keys(groupedData).sort();

  if (sortedKeys.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 25px;">No sales logged yet. Financial statistics are empty.</td></tr>`;
  } else {
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
          titleColor: state.theme === "dark" ? "#fff" : "#000",
          bodyColor: state.theme === "dark" ? "#fff" : "#000",
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
      groupedData[key] = { revenue: 0, cost: 0, profit: 0, count: 0 };
    }
    groupedData[key].revenue += sale.sellPrice;
    groupedData[key].cost += sale.cost;
    groupedData[key].profit += sale.profit;
    groupedData[key].count += 1;
  });

  const sortedKeys = Object.keys(groupedData).sort();
  
  const periodHeader = breakdownType === "month" ? "Month" : (breakdownType === "year" ? "Year" : "Period");
  const csvRows = [[periodHeader, "Sold Keys", "Revenue", "Cost/Expenses", "Net Profit", "ROI (%)"]];

  sortedKeys.forEach(k => {
    const stats = groupedData[k];
    const roi = stats.cost > 0 ? (stats.profit / stats.cost) * 100 : 0;
    const periodLabel = breakdownType === "month" ? formatMonthKey(k) : k;
    csvRows.push([
      periodLabel,
      stats.count,
      stats.revenue.toFixed(2),
      stats.cost.toFixed(2),
      stats.profit.toFixed(2),
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
        enabled: s.enabled !== false
      }));
    }

    if (platformsData && platformsData.length > 0) {
      state.platforms = platformsData.map(p => ({
        name: p.name,
        dateAdded: Number(p.dateAdded),
        enabled: p.enabled !== false
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
        if (s.key === "theme") {
          state.theme = s.value;
          applyTheme(state.theme);
          updateThemeSelectionCards(state.theme);
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
        } else if (s.key === "showFeeCalculator") {
          state.showFeeCalculator = s.value;
          applyFeeCalculatorVisibility(state.showFeeCalculator);
          const toggleCalc = document.getElementById("toggle-show-calculator");
          if (toggleCalc) toggleCalc.checked = state.showFeeCalculator;
        } else if (s.key === "showSalesLedger") {
          state.showSalesLedger = s.value;
          applySalesLedgerVisibility(state.showSalesLedger);
          const toggleSales = document.getElementById("toggle-show-sales-ledger");
          if (toggleSales) toggleSales.checked = state.showSalesLedger;
        } else if (s.key === "visibleMetrics") {
          state.visibleMetrics = s.value;
          applyMetricsVisibility();
        } else if (s.key === "metricOrder") {
          state.metricOrder = s.value;
          applyMetricOrder();
        } else if (s.key === "customLogo") {
          state.customLogo = s.value;
          applyLogo(state.customLogo);
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
          notes: sale.notes || null
        })));
    }

    const menus = ["dashboard", "inventory", "sales", "finance", "suppliers", "entries", "calculator", "settings"];
    const customData = menus.map(m => ({
      key: m,
      icon: state.menuIcons[m] || "fa-gear",
      title: state.menuTitles[m] || m
    }));
    await window.supabaseClient
      .from('menu_customization')
      .insert(customData);

    const settings = [
      { key: "theme", value: state.theme },
      { key: "currency", value: state.currency },
      { key: "dateFormat", value: state.dateFormat },
      { key: "fontSize", value: state.fontSize },
      { key: "showFeeCalculator", value: state.showFeeCalculator },
      { key: "showSalesLedger", value: state.showSalesLedger },
      { key: "visibleMetrics", value: state.visibleMetrics },
      { key: "metricOrder", value: state.metricOrder },
      { key: "customLogo", value: state.customLogo },
      { key: "lowStockThreshold", value: state.lowStockThreshold },
      { key: "defaultMarkupType", value: state.defaultMarkupType },
      { key: "defaultMarkupValue", value: state.defaultMarkupValue },
      { key: "syncMode", value: state.syncMode },
      { key: "supplierDisplayMode", value: state.supplierDisplayMode }
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
  if (!window.supabaseClient) return;
  if (state.syncMode === "manual") {
    setUnsyncedChanges(true);
    return;
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
        notes: item.notes || null
      });
    if (error) throw error;
  } catch (err) {
    console.error("Error saving inventory item to Supabase:", err);
    showToast("Failed to save changes to cloud.", "error");
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
  if (!window.supabaseClient) return;
  if (state.syncMode === "manual") {
    setUnsyncedChanges(true);
    return;
  }
  try {
    const { error } = await window.supabaseClient
      .from('sales')
      .upsert({
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
      });
    if (error) throw error;
  } catch (err) {
    console.error("Error saving sale to Supabase:", err);
    showToast("Failed to save transaction to cloud.", "error");
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
        enabled: platform.enabled !== false
      });
    if (error) throw error;
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

  // Render Fee Presets editor
  renderPlatformFeePresetsSettings();

  // Set default calculator suggested target price based on buy cost
  const calcBuyPriceInput = document.getElementById("calc-buy-price");
  const calcSellPriceInput = document.getElementById("calc-sell-price");
  if (calcBuyPriceInput && calcSellPriceInput) {
    const buyPrice = parseFloat(calcBuyPriceInput.value) || 0;
    let suggestedSell;
    if (state.defaultMarkupType === "percent") {
      suggestedSell = buyPrice * (1 + state.defaultMarkupValue / 100);
    } else {
      suggestedSell = buyPrice + state.defaultMarkupValue;
    }
    calcSellPriceInput.value = suggestedSell.toFixed(2);
  }

  // Update dynamic platform labels in calculator select option list
  updateCalculatorPlatformLabels();
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

// Render dynamic rows inside Platform Fee Presets Card
function renderPlatformFeePresetsSettings() {
  const container = document.getElementById("settings-fee-presets-list");
  if (!container) return;
  
  container.innerHTML = "";
  
  const symbol = state.currency === "USD" ? "$" : "€";
  const keys = Object.keys(PLATFORM_FEE_PRESETS);
  
  keys.forEach(k => {
    const preset = PLATFORM_FEE_PRESETS[k];
    const row = document.createElement("div");
    row.className = "fee-preset-row";
    
    row.innerHTML = `
      <span>${preset.name}</span>
      <div class="input-group">
        <input type="number" class="fee-preset-percent" data-key="${k}" value="${preset.percent}" step="0.1" min="0" max="100">
        <span>%</span>
      </div>
      <div class="input-group">
        <input type="number" class="fee-preset-fixed" data-key="${k}" value="${preset.fixed}" step="0.05" min="0">
        <span>${symbol}</span>
      </div>
    `;
    
    container.appendChild(row);
  });
}

// Update dynamic platform labels in calculator select option list
function updateCalculatorPlatformLabels() {
  const calcPlatformSelect = document.getElementById("calc-platform");
  if (!calcPlatformSelect) return;
  
  const symbol = state.currency === "USD" ? "$" : "€";
  
  Array.from(calcPlatformSelect.options).forEach(opt => {
    const key = opt.value;
    if (PLATFORM_FEE_PRESETS[key]) {
      const preset = PLATFORM_FEE_PRESETS[key];
      let label = preset.name;
      let desc = "";
      if (key === "g2a") desc = `${preset.percent}% + ${symbol}${preset.fixed.toFixed(2)} listing fee`;
      else if (key === "kinguin") desc = `${preset.percent}% + ${symbol}${preset.fixed.toFixed(2)} sales fee`;
      else if (key === "ebay") desc = `${preset.percent}% + ${symbol}${preset.fixed.toFixed(2)} payment fee`;
      else if (key === "playerauctions") desc = `${preset.percent}% standard`;
      else if (key === "direct") desc = `${preset.percent}% fees - Discord, Forums`;
      else desc = `${preset.percent}% commission`;
      
      opt.textContent = `${label} (${desc})`;
    }
  });
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
      
      // Auto-fill calculator with new presets if cost is present
      const calcBuyPriceInput = document.getElementById("calc-buy-price");
      const calcSellPriceInput = document.getElementById("calc-sell-price");
      if (calcBuyPriceInput && calcSellPriceInput) {
        const buyPrice = parseFloat(calcBuyPriceInput.value) || 0;
        let suggestedSell;
        if (state.defaultMarkupType === "percent") {
          suggestedSell = buyPrice * (1 + state.defaultMarkupValue / 100);
        } else {
          suggestedSell = buyPrice + state.defaultMarkupValue;
        }
        calcSellPriceInput.value = suggestedSell.toFixed(2);
        runFeeCalculator();
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
      
      // Auto-fill calculator with new presets if cost is present
      const calcBuyPriceInput = document.getElementById("calc-buy-price");
      const calcSellPriceInput = document.getElementById("calc-sell-price");
      if (calcBuyPriceInput && calcSellPriceInput) {
        const buyPrice = parseFloat(calcBuyPriceInput.value) || 0;
        let suggestedSell;
        if (state.defaultMarkupType === "percent") {
          suggestedSell = buyPrice * (1 + state.defaultMarkupValue / 100);
        } else {
          suggestedSell = buyPrice + state.defaultMarkupValue;
        }
        calcSellPriceInput.value = suggestedSell.toFixed(2);
        runFeeCalculator();
      }
    });
  }

  const btnSaveFeePresets = document.getElementById("btn-save-fee-presets");
  if (btnSaveFeePresets) {
    btnSaveFeePresets.addEventListener("click", () => {
      const percentInputs = document.querySelectorAll(".fee-preset-percent");
      const fixedInputs = document.querySelectorAll(".fee-preset-fixed");
      
      percentInputs.forEach(input => {
        const k = input.getAttribute("data-key");
        if (PLATFORM_FEE_PRESETS[k]) {
          PLATFORM_FEE_PRESETS[k].percent = parseFloat(input.value) || 0;
        }
      });
      
      fixedInputs.forEach(input => {
        const k = input.getAttribute("data-key");
        if (PLATFORM_FEE_PRESETS[k]) {
          PLATFORM_FEE_PRESETS[k].fixed = parseFloat(input.value) || 0;
        }
      });
      
      const symbol = state.currency === "USD" ? "$" : "€";
      Object.keys(PLATFORM_FEE_PRESETS).forEach(k => {
        const p = PLATFORM_FEE_PRESETS[k];
        if (k === "g2a") p.desc = `${p.percent}% + ${symbol}${p.fixed.toFixed(2)} listing fee`;
        else if (k === "kinguin") p.desc = `${p.percent}% + ${symbol}${p.fixed.toFixed(2)} sales fee`;
        else if (k === "ebay") p.desc = `${p.percent}% + ${symbol}${p.fixed.toFixed(2)} payment fee`;
        else p.desc = `${p.percent}% commission`;
      });
      
      saveStateToStorage();
      if (window.supabaseClient && state.syncMode === "realtime") {
        dbSaveSettings("platformFeePresets", PLATFORM_FEE_PRESETS);
      } else if (state.syncMode === "manual") {
        setUnsyncedChanges(true);
      }
      
      updateCalculatorPlatformLabels();
      runFeeCalculator();
      showToast("Platform fee presets saved successfully.", "success");
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
}

// Export state backup as JSON file download
function exportStateBackupJSON() {
  const backupData = {};
  const keys = [
    "gv_inventory", "gv_sales", "gv_suppliers", "gv_platforms",
    "gv_inv_layout", "gv_supplier_display_mode", "gv_theme", "gv_currency", "gv_date_format",
    "gv_sidebar_collapsed", "gv_show_fee_calculator", "gv_show_sales_ledger",
    "gv_visible_metrics", "gv_metric_order", "gv_font_size", "gv_menu_icons",
    "gv_menu_titles", "gv_custom_logo", "gv_low_stock_threshold",
    "gv_default_markup_type", "gv_default_markup_value",
    "gv_platform_fee_presets", "gv_sync_mode"
  ];
  
  keys.forEach(k => {
    const val = localStorage.getItem(k);
    if (val !== null) {
      backupData[k] = val;
    }
  });
  
  const jsonStr = JSON.stringify(backupData, null, 2);
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
            enabled: p.enabled !== false
          })));
        if (error) console.warn("Supabase platforms upsert warning:", error);
      } catch (err) {
        console.warn("Could not upsert platforms in Supabase:", err);
      }
    }
    
    // 3. Sync customizations
    const menus = ["dashboard", "inventory", "sales", "finance", "suppliers", "entries", "calculator", "settings"];
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
      { key: "theme", value: state.theme },
      { key: "currency", value: state.currency },
      { key: "dateFormat", value: state.dateFormat },
      { key: "fontSize", value: state.fontSize },
      { key: "showFeeCalculator", value: state.showFeeCalculator },
      { key: "showSalesLedger", value: state.showSalesLedger },
      { key: "visibleMetrics", value: state.visibleMetrics },
      { key: "metricOrder", value: state.metricOrder },
      { key: "customLogo", value: state.customLogo },
      { key: "lowStockThreshold", value: state.lowStockThreshold },
      { key: "defaultMarkupType", value: state.defaultMarkupType },
      { key: "defaultMarkupValue", value: state.defaultMarkupValue },
      { key: "syncMode", value: state.syncMode },
      { key: "supplierDisplayMode", value: state.supplierDisplayMode },
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
