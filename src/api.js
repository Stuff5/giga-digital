/**
 * GameVault - API & Database Integrations (api.js)
 */

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
    availableEl.textContent = availableKeys.length.toLocaleString();
    
    const reservedEl = document.getElementById("summary-metric-reserved");
    const reservedKeys = dbFilteredInventory ? dbFilteredInventory.filter(item => item.status === "Reserved") : [];
    if (reservedEl) {
      reservedEl.textContent = reservedKeys.length.toLocaleString();
    }

    const totalStockEl = document.getElementById("summary-metric-total-stock");
    const totalStockCount = availableKeys.length + reservedKeys.length;
    if (totalStockEl) {
      totalStockEl.textContent = totalStockCount.toLocaleString();
    }
    const availableTotalSub = document.getElementById("summary-metric-available-total-sub");
    if (availableTotalSub) {
      availableTotalSub.textContent = `Total: ${totalStockCount.toLocaleString()} keys`;
    }

    const uniqueTitlesEl = document.getElementById("summary-metric-unique-titles");
    if (uniqueTitlesEl) {
      const titlesSet = new Set();
      const allCatalogTitlesSet = new Set();
      if (Array.isArray(dbFilteredInventory)) {
        dbFilteredInventory.forEach(item => {
          const t = (item.title || item.gameTitle || "").trim();
          if (t) allCatalogTitlesSet.add(t.toLowerCase());
          const isSold = item.status === "Sold" || item.sold === true;
          const isRejected = item.status === "Rejected";
          const isRecycled = item.recycleBin === true;
          if (!isSold && !isRejected && !isRecycled) {
            if (t) titlesSet.add(t.toLowerCase());
          }
        });
      }
      uniqueTitlesEl.textContent = titlesSet.size.toLocaleString();
      const pctEl = document.getElementById("summary-metric-unique-titles-pct");
      if (pctEl) {
        const pct = allCatalogTitlesSet.size > 0 ? Math.round((titlesSet.size / allCatalogTitlesSet.size) * 100) : 0;
        pctEl.textContent = `${pct}% of catalog`;
      }
    }
    
    const unsoldKeys = dbFilteredInventory ? dbFilteredInventory.filter(item => {
      const isSold = item.status === "Sold" || item.sold === true;
      const isRejected = item.status === "Rejected";
      const isRecycled = item.recycleBin === true;
      return !isSold && !isRejected && !isRecycled;
    }) : [];

    const stockCostEl = document.getElementById("summary-metric-stock-cost");
    const inventoryCost = unsoldKeys.reduce((sum, item) => sum + (parseFloat(item.cost) || 0), 0);
    if (stockCostEl) {
      stockCostEl.textContent = formatCurrency(inventoryCost);
    }

    const avgCostEl = document.getElementById("summary-metric-avg-cost");
    if (avgCostEl) {
      const avgCost = totalStockCount > 0 ? (inventoryCost / totalStockCount) : 0;
      avgCostEl.textContent = formatCurrency(avgCost);
    }

    const avgAgeEl = document.getElementById("summary-metric-avg-age");
    if (avgAgeEl) {
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      let totalAgeDays = 0;
      let countWithDate = 0;
      unsoldKeys.forEach(item => {
        if (item.purchaseDate) {
          const pDate = new Date(item.purchaseDate);
          pDate.setHours(0, 0, 0, 0);
          if (!isNaN(pDate.getTime())) {
            const age = Math.max(0, Math.round((now - pDate) / (1000 * 60 * 60 * 24)));
            totalAgeDays += age;
            countWithDate++;
          }
        }
      });
      const avgDays = countWithDate > 0 ? Math.round(totalAgeDays / countWithDate) : 0;
      avgAgeEl.textContent = `${avgDays}d`;
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

  // 4. Calculate & Render Advanced Metrics (if present in DOM)
  const roiEl = document.getElementById("summary-metric-roi");
  const avgProfitEl = document.getElementById("summary-metric-avg-profit");
  const potentialProfitEl = document.getElementById("summary-metric-potential-profit");
  const velocityEl = document.getElementById("summary-metric-velocity");

  if (roiEl || avgProfitEl || potentialProfitEl || velocityEl) {
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
}

window.logAuditAction = function(action, details = "") {
  const activeUser = state.currentUser || "system";
  const logEntry = {
    id: 'log_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
    timestamp: new Date().toISOString(),
    user: activeUser,
    action: action,
    details: details
  };
  
  if (!state.auditLogs) state.auditLogs = [];
  state.auditLogs.unshift(logEntry);
  
  // Cap at 1000 logs
  if (state.auditLogs.length > 1000) {
    state.auditLogs = state.auditLogs.slice(0, 1000);
  }
  
  try {
    localStorage.setItem("gv_audit_logs", JSON.stringify(state.auditLogs));
  } catch (e) {
    console.error("Failed to persist audit logs:", e);
  }
  
  // Trigger table render if active
  if (typeof renderAuditLogs === "function") {
    renderAuditLogs();
  }
};

// Recalculates metrics specifically for the Suppliers view
async function initSupabaseConnection() {
  let activeUser = state.currentUser;
  if (!activeUser) {
    activeUser = localStorage.getItem("gv_last_active_user") || "";
  }
  const userSuffix = (activeUser && activeUser !== "guest") ? `_${activeUser}` : "";
  let url = localStorage.getItem("gv_supabase_url" + userSuffix);
  let key = localStorage.getItem("gv_supabase_key" + userSuffix);
  
  // Migration fallback
  if (url === null && key === null) {
    const globalUrl = localStorage.getItem("gv_supabase_url");
    const globalKey = localStorage.getItem("gv_supabase_key");
    if (globalUrl || globalKey) {
      url = globalUrl || "";
      key = globalKey || "";
      localStorage.setItem("gv_supabase_url" + userSuffix, url);
      localStorage.setItem("gv_supabase_key" + userSuffix, key);
    }
  }
  
  // Fallback to GV_CONFIG if empty (especially for initial load on new devices or GitHub Pages)
  if (!url && !key && window.GV_CONFIG && window.GV_CONFIG.supabaseUrl) {
    url = window.GV_CONFIG.supabaseUrl;
    key = window.GV_CONFIG.supabaseKey;
  }
  
  url = url || "";
  key = key || "";
  
  const urlInput = document.getElementById("settings-supabase-url");
  const keyInput = document.getElementById("settings-supabase-key");
  const statusBadge = document.getElementById("db-connection-status");
  const storageBadge = document.getElementById("storage-status-badge");
  
  if (urlInput) urlInput.value = url;
  if (keyInput) keyInput.value = key;
  
  if (url && key && window.supabase) {
    try {
      window.supabaseClient = window.supabase.createClient(url, key);
      if (statusBadge) {
        statusBadge.textContent = "Connected";
        statusBadge.className = "badge badge-available";
      }
      if (storageBadge) {
        storageBadge.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Connecting...`;
        storageBadge.className = "badge badge-low-stock";
        storageBadge.style.background = "var(--accent-warning, #f59e0b)";
        storageBadge.style.color = "#000";
        storageBadge.style.border = "none";
      }
      await dbLoadState();
      logActionNotification("Connected to Supabase");
    } catch (e) {
      console.error("Supabase initialization error:", e);
      window.supabaseClient = null;
      if (statusBadge) {
        statusBadge.textContent = "Error";
        statusBadge.className = "badge badge-sold";
      }
      if (storageBadge) {
        storageBadge.innerHTML = `<i class="fa-solid fa-hdd"></i> Local Storage`;
        storageBadge.className = "badge";
        storageBadge.style.background = "rgba(255, 255, 255, 0.04)";
        storageBadge.style.color = "var(--text-secondary)";
        storageBadge.style.border = "1px solid var(--border-color)";
      }
    }
  } else {
    window.supabaseClient = null;
    if (statusBadge) {
      statusBadge.textContent = "Not Connected";
      statusBadge.className = "badge badge-sold";
    }
    if (storageBadge) {
      storageBadge.innerHTML = `<i class="fa-solid fa-hdd"></i> Local Storage`;
      storageBadge.className = "badge";
      storageBadge.style.background = "rgba(255, 255, 255, 0.04)";
      storageBadge.style.color = "var(--text-secondary)";
      storageBadge.style.border = "1px solid var(--border-color)";
    }
  }
}

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
  const tables = ["inventory", "sales", "suppliers", "platforms", "menu_customization", "app_settings"];
  let successCount = 0;
  
  for (const t of tables) {
    try {
      const { count, error } = await window.supabaseClient.from(t).select('*', { count: 'exact', head: true });
      if (error) {
        report.push(`<span style="color: var(--accent-danger); font-weight: 500;">✗ Table "${t}" check failed: ${error.message}</span>`);
      } else {
        const rowCount = count !== null && count !== undefined ? count : 0;
        let memoryCount = null;
        if (t === "inventory") memoryCount = (state.inventory || []).length;
        if (t === "sales") memoryCount = (state.sales || []).length;
        if (t === "suppliers") memoryCount = (state.suppliers || []).length;
        if (t === "platforms") memoryCount = (state.platforms || []).length;

        const countText = memoryCount !== null 
          ? `${rowCount.toLocaleString()} rows in database (all ${memoryCount.toLocaleString()} verified in memory)`
          : `${rowCount.toLocaleString()} rows`;
        report.push(`<span style="color: var(--accent-teal); font-weight: 500;">✓ Table "${t}": ${countText}</span>`);
        successCount++;
      }
    } catch (e) {
      report.push(`<span style="color: var(--accent-danger); font-weight: 500;">✗ Table "${t}" connection error: ${e.message}</span>`);
    }
  }

  // Check modern logo columns
  try {
    const { error: supColErr } = await window.supabaseClient.from('suppliers').select('logo').limit(1);
    if (supColErr && isMissingColumnError(supColErr, 'logo')) {
      report.push(`<span style="color: var(--accent-warning); font-weight: 500;">⚠ Column "logo" in "suppliers" missing (cloud app_settings fallback active). Run: <code>ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS logo TEXT;</code></span>`);
    } else if (!supColErr) {
      report.push(`<span style="color: var(--accent-teal); font-weight: 500;">✓ Column "suppliers.logo" verified native.</span>`);
    }
  } catch (e) {}

  try {
    const { error: platColErr } = await window.supabaseClient.from('platforms').select('logo').limit(1);
    if (platColErr && isMissingColumnError(platColErr, 'logo')) {
      report.push(`<span style="color: var(--accent-warning); font-weight: 500;">⚠ Column "logo" in "platforms" missing (cloud app_settings fallback active). Run: <code>ALTER TABLE platforms ADD COLUMN IF NOT EXISTS logo TEXT;</code></span>`);
    } else if (!platColErr) {
      report.push(`<span style="color: var(--accent-teal); font-weight: 500;">✓ Column "platforms.logo" verified native.</span>`);
    }
  } catch (e) {}
  
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
      
      const userSuffix = (state.currentUser && state.currentUser !== "guest") ? `_${state.currentUser}` : "";
      localStorage.setItem("gv_supabase_url" + userSuffix, url);
      localStorage.setItem("gv_supabase_key" + userSuffix, key);
      
      showToast("Connecting and synchronizing database...", "info");
      window.logAuditAction("Connect Supabase", `URL: ${url}`);
      initSupabaseConnection();
    });
  }

  const btnDisconnect = document.getElementById("btn-disconnect-supabase");
  if (btnDisconnect) {
    const newBtnDisconnect = btnDisconnect.cloneNode(true);
    btnDisconnect.parentNode.replaceChild(newBtnDisconnect, btnDisconnect);
    newBtnDisconnect.addEventListener("click", () => {
      const userSuffix = (state.currentUser && state.currentUser !== "guest") ? `_${state.currentUser}` : "";
      localStorage.removeItem("gv_supabase_url" + userSuffix);
      localStorage.removeItem("gv_supabase_key" + userSuffix);
      
      const urlInput = document.getElementById("settings-supabase-url");
      const keyInput = document.getElementById("settings-supabase-key");
      if (urlInput) urlInput.value = "";
      if (keyInput) keyInput.value = "";
      
      initSupabaseConnection();
      
      // Load local state back
      loadStateFromStorage();
      updateUI();
      
      showToast("Disconnected from Supabase. Switched to LocalStorage.", "success");
      window.logAuditAction("Disconnect Supabase");
      logActionNotification("Disconnected from Supabase");
    });
  }
}

// Firestore Security Rules configuration payload
const FIREBASE_RULES_TXT = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true; // Allows local testing and quick connection checks
    }
  }
}`;

window.copyFirebaseRules = function() {
  copyTextToClipboard(FIREBASE_RULES_TXT, "Firestore Security Rules copied to clipboard!");
};

window.downloadFirebaseRules = function() {
  const blob = new Blob([FIREBASE_RULES_TXT], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "firestore.rules";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast("Downloaded firestore.rules file.", "success");
};

window.runFirebaseDiagnostics = async function() {
  if (!window.firebaseApp) {
    showToast("Please connect to Firebase first before running diagnostics.", "error");
    return;
  }
  
  showToast("Running Firebase Firestore diagnostics...", "info");
  const report = [];
  let success = false;
  
  try {
    report.push(`<span style="color: var(--text-secondary);">Initializing Firestore client...</span>`);
    const db = window.firebaseApp.firestore();
    report.push(`<span style="color: var(--accent-teal);">✓ Firestore client initialized successfully</span>`);
    
    report.push(`<span style="color: var(--text-secondary);">Attempting write operation on "diagnostics" collection...</span>`);
    const docRef = await db.collection("diagnostics").add({
      test: true,
      timestamp: Date.now()
    });
    report.push(`<span style="color: var(--accent-teal);">✓ Write operation passed (Doc ID: ${docRef.id})</span>`);
    
    report.push(`<span style="color: var(--text-secondary);">Attempting read operation on the written document...</span>`);
    const docSnap = await docRef.get();
    if (docSnap.exists) {
      report.push(`<span style="color: var(--accent-teal);">✓ Read operation passed (Data: ${JSON.stringify(docSnap.data())})</span>`);
      
      report.push(`<span style="color: var(--text-secondary);">Attempting delete cleanup operation...</span>`);
      await docRef.delete();
      report.push(`<span style="color: var(--accent-teal);">✓ Delete cleanup operation passed</span>`);
      success = true;
    } else {
      report.push(`<span style="color: var(--accent-danger);">✗ Document not found in read test</span>`);
    }
  } catch (err) {
    console.error("Firebase diagnostics failed:", err);
    report.push(`<span style="color: var(--accent-danger); font-weight: 500;">✗ Operation failed: ${err.message}</span>`);
    if (err.code === "permission-denied") {
      report.push(`<span style="color: var(--accent-warning); font-size: 0.68rem;">Suggestion: Please check your Firestore security rules in the Firebase console. By default, write permissions might be locked.</span>`);
    }
  }
  
  const diagOutput = document.getElementById("firebase-diag-output");
  if (diagOutput) {
    diagOutput.innerHTML = report.join("<br>");
    diagOutput.classList.remove("hidden");
  }
  
  if (success) {
    showToast("Firebase diagnostics complete: Connection is fully active!", "success");
  } else {
    showToast("Firebase diagnostics failed. Check configuration and rules.", "error");
  }
};

// Initialize Firebase Connection
function initFirebaseConnection() {
  let activeUser = state.currentUser;
  if (!activeUser) {
    activeUser = localStorage.getItem("gv_last_active_user") || "";
  }
  const userSuffix = (activeUser && activeUser !== "guest") ? `_${activeUser}` : "";
  let apiKey = localStorage.getItem("gv_firebase_apikey" + userSuffix);
  let projectId = localStorage.getItem("gv_firebase_projectid" + userSuffix);
  let authDomain = localStorage.getItem("gv_firebase_authdomain" + userSuffix);
  let appId = localStorage.getItem("gv_firebase_appid" + userSuffix);
  
  // Migration fallback
  if (apiKey === null && projectId === null) {
    apiKey = localStorage.getItem("gv_firebase_apikey") || "";
    projectId = localStorage.getItem("gv_firebase_projectid") || "";
    authDomain = localStorage.getItem("gv_firebase_authdomain") || "";
    appId = localStorage.getItem("gv_firebase_appid") || "";
    if (apiKey || projectId) {
      localStorage.setItem("gv_firebase_apikey" + userSuffix, apiKey);
      localStorage.setItem("gv_firebase_projectid" + userSuffix, projectId);
      localStorage.setItem("gv_firebase_authdomain" + userSuffix, authDomain);
      localStorage.setItem("gv_firebase_appid" + userSuffix, appId);
    }
  }

  // Fallback to GV_CONFIG if empty (especially for initial load on new devices or GitHub Pages)
  if (!apiKey && !projectId && window.GV_CONFIG && window.GV_CONFIG.firebaseConfig) {
    apiKey = window.GV_CONFIG.firebaseConfig.apiKey || "";
    projectId = window.GV_CONFIG.firebaseConfig.projectId || "";
    authDomain = window.GV_CONFIG.firebaseConfig.authDomain || "";
    appId = window.GV_CONFIG.firebaseConfig.appId || "";
  }

  apiKey = apiKey || "";
  projectId = projectId || "";
  authDomain = authDomain || "";
  appId = appId || "";

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

      const userSuffix = (state.currentUser && state.currentUser !== "guest") ? `_${state.currentUser}` : "";
      localStorage.setItem("gv_firebase_apikey" + userSuffix, apiKey);
      localStorage.setItem("gv_firebase_projectid" + userSuffix, projectId);
      localStorage.setItem("gv_firebase_authdomain" + userSuffix, authDomain);
      localStorage.setItem("gv_firebase_appid" + userSuffix, appId);

      showToast("Connecting to Firebase...", "info");
      window.logAuditAction("Connect Firebase", `Project: ${projectId}`);
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
      const userSuffix = (state.currentUser && state.currentUser !== "guest") ? `_${state.currentUser}` : "";
      localStorage.removeItem("gv_firebase_apikey" + userSuffix);
      localStorage.removeItem("gv_firebase_projectid" + userSuffix);
      localStorage.removeItem("gv_firebase_authdomain" + userSuffix);
      localStorage.removeItem("gv_firebase_appid" + userSuffix);

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
      window.logAuditAction("Disconnect Firebase");
    });
  }
}

function initGitHubConnection() {
  const userSuffix = (state.currentUser && state.currentUser !== "guest") ? `_${state.currentUser}` : "";
  let token = localStorage.getItem("gv_github_token" + userSuffix);
  let repo = localStorage.getItem("gv_github_repo" + userSuffix);
  let branch = localStorage.getItem("gv_github_branch" + userSuffix);
  let path = localStorage.getItem("gv_github_path" + userSuffix);

  // Migration fallback
  if (token === null && repo === null) {
    token = localStorage.getItem("gv_github_token") || "";
    repo = localStorage.getItem("gv_github_repo") || "";
    branch = localStorage.getItem("gv_github_branch") || "main";
    path = localStorage.getItem("gv_github_path") || "gamevault_backup.json";
    if (token || repo) {
      localStorage.setItem("gv_github_token" + userSuffix, token);
      localStorage.setItem("gv_github_repo" + userSuffix, repo);
      localStorage.setItem("gv_github_branch" + userSuffix, branch);
      localStorage.setItem("gv_github_path" + userSuffix, path);
    }
  }
  token = token || "";
  repo = repo || "";
  branch = branch || "main";
  path = path || "gamevault_backup.json";

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

      const userSuffix = (state.currentUser && state.currentUser !== "guest") ? `_${state.currentUser}` : "";
      localStorage.setItem("gv_github_token" + userSuffix, token);
      localStorage.setItem("gv_github_repo" + userSuffix, repo);
      localStorage.setItem("gv_github_branch" + userSuffix, branch);
      localStorage.setItem("gv_github_path" + userSuffix, path);

      showToast("Configuring GitHub connection...", "info");
      window.logAuditAction("Connect GitHub", `Repo: ${repo}`);
      initGitHubConnection();
      showToast("GitHub configured successfully!", "success");
    });
  }

  const btnDisconnect = document.getElementById("btn-disconnect-github");
  if (btnDisconnect) {
    const newBtnDisconnect = btnDisconnect.cloneNode(true);
    btnDisconnect.parentNode.replaceChild(newBtnDisconnect, btnDisconnect);
    newBtnDisconnect.addEventListener("click", () => {
      const userSuffix = (state.currentUser && state.currentUser !== "guest") ? `_${state.currentUser}` : "";
      localStorage.removeItem("gv_github_token" + userSuffix);
      localStorage.removeItem("gv_github_repo" + userSuffix);
      localStorage.removeItem("gv_github_branch" + userSuffix);
      localStorage.removeItem("gv_github_path" + userSuffix);

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
      window.logAuditAction("Disconnect GitHub");
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

/**
 * Paged fetching helper for Supabase with exact count integrity verification.
 * Fetches all records from a table in batches of pageSize using .range(from, to).
 */
async function supabaseFetchAll(tableName, selectColumns = '*') {
  if (!window.supabaseClient) return [];
  const pageSize = 1000;
  let allData = [];
  let from = 0;
  let expectedTotal = null;
  
  while (true) {
    const to = from + pageSize - 1;
    const query = from === 0 
      ? window.supabaseClient.from(tableName).select(selectColumns, { count: 'exact' })
      : window.supabaseClient.from(tableName).select(selectColumns);

    const { data, count, error } = await query.range(from, to);
      
    if (error) {
      console.error(`Error in supabaseFetchAll for ${tableName} (range ${from}-${to}):`, error);
      throw error;
    }
    
    if (from === 0 && count !== null && count !== undefined) {
      expectedTotal = count;
    }
    
    if (!data || data.length === 0) {
      break;
    }
    
    allData.push(...data);
    from += pageSize;
    
    if (data.length < pageSize) {
      break;
    }
  }

  // Integrity Verification: guarantee 100% of rows were loaded
  if (expectedTotal !== null) {
    if (allData.length !== expectedTotal) {
      console.warn(`[Data Integrity Warning] ${tableName}: Fetched ${allData.length} records, but database reports ${expectedTotal} total!`);
      if (typeof showToast === "function") {
        showToast(`Sync warning: loaded ${allData.length} of ${expectedTotal} ${tableName}.`, "warning");
      }
    } else {
      console.log(`[Data Integrity Verified] ${tableName}: All ${allData.length} / ${expectedTotal} records loaded successfully.`);
    }
  }
  
  return allData;
}
window.supabaseFetchAll = supabaseFetchAll;

// Fetch all database state from Supabase
async function dbLoadState() {
  if (!window.supabaseClient) return;
  
  try {
    const [inventoryData, salesData, suppliersData, customData, settingsData] = await Promise.all([
      supabaseFetchAll('inventory'),
      supabaseFetchAll('sales'),
      supabaseFetchAll('suppliers'),
      supabaseFetchAll('menu_customization'),
      supabaseFetchAll('app_settings')
    ]);

    let platformsData = null;
    try {
      platformsData = await supabaseFetchAll('platforms');
    } catch (e) {
      console.warn("Error querying platforms from Supabase:", e);
    }

    state.inventory = inventoryData || [];
    state.sales = salesData || [];
    
    // First inspect settingsData for cloud logo backups
    let cloudSupplierLogos = null;
    let cloudPlatformLogos = null;
    let cloudPublisherLogos = null;
    if (settingsData && settingsData.length > 0) {
      const supLogosItem = settingsData.find(s => s.key === "supplierLogos");
      if (supLogosItem && supLogosItem.value) {
        try {
          cloudSupplierLogos = typeof supLogosItem.value === 'string' ? JSON.parse(supLogosItem.value) : supLogosItem.value;
          state.supplierLogos = { ...(window.DEFAULT_SUPPLIER_LOGOS || {}), ...(state.supplierLogos || {}), ...(cloudSupplierLogos || {}) };
        } catch (e) {
          console.error("Error parsing supplierLogos from Supabase:", e);
        }
      }
      const platLogosItem = settingsData.find(s => s.key === "platformLogos");
      if (platLogosItem && platLogosItem.value) {
        try {
          cloudPlatformLogos = typeof platLogosItem.value === 'string' ? JSON.parse(platLogosItem.value) : platLogosItem.value;
          state.platformLogos = { ...(window.DEFAULT_PLATFORM_LOGOS || {}), ...(state.platformLogos || {}), ...(cloudPlatformLogos || {}) };
        } catch (e) {
          console.error("Error parsing platformLogos from Supabase:", e);
        }
      }
      const pubLogosItem = settingsData.find(s => s.key === "publisherLogos");
      if (pubLogosItem && pubLogosItem.value) {
        try {
          cloudPublisherLogos = typeof pubLogosItem.value === 'string' ? JSON.parse(pubLogosItem.value) : pubLogosItem.value;
          state.publisherLogos = { ...(window.DEFAULT_PUBLISHER_LOGOS || {}), ...(state.publisherLogos || {}), ...(cloudPublisherLogos || {}) };
        } catch (e) {
          console.error("Error parsing publisherLogos from Supabase:", e);
        }
      }
    }

    // Ensure state.supplierLogos, state.platformLogos, and state.publisherLogos check local storage and merge with cloud
    try {
      const userSuffix = (state.currentUser && state.currentUser !== "guest") ? `_${state.currentUser}` : "";
      const storage = window.safeStorage || window.localStorage;
      const fallbackLogos = storage.getItem("gv_supplier_logos" + userSuffix) || storage.getItem("gv_supplier_logos");
      if (fallbackLogos) {
        const parsed = JSON.parse(fallbackLogos) || {};
        state.supplierLogos = { ...parsed, ...(state.supplierLogos || {}) };
      }
    } catch (e) {}

    try {
      const userSuffix = (state.currentUser && state.currentUser !== "guest") ? `_${state.currentUser}` : "";
      const storage = window.safeStorage || window.localStorage;
      const fallbackPlatLogos = storage.getItem("gv_platform_logos" + userSuffix) || storage.getItem("gv_platform_logos");
      if (fallbackPlatLogos) {
        const parsedPlat = JSON.parse(fallbackPlatLogos) || {};
        state.platformLogos = { ...parsedPlat, ...(state.platformLogos || {}) };
      }
    } catch (e) {}

    try {
      const userSuffix = (state.currentUser && state.currentUser !== "guest") ? `_${state.currentUser}` : "";
      const storage = window.safeStorage || window.localStorage;
      const fallbackPubLogos = storage.getItem("gv_publisher_logos" + userSuffix) || storage.getItem("gv_publisher_logos");
      if (fallbackPubLogos) {
        const parsedPub = JSON.parse(fallbackPubLogos) || {};
        state.publisherLogos = { ...parsedPub, ...(state.publisherLogos || {}) };
      }
    } catch (e) {}

    const resolveEntityLogo = (logosMap, name, fallbackLogo) => {
      if (fallbackLogo) return fallbackLogo;
      if (!logosMap || !name) return null;
      const trimmed = String(name).trim();
      if (logosMap[trimmed]) return logosMap[trimmed];
      if (typeof window.getSupplierLogoCaseInsensitive === "function") {
        return window.getSupplierLogoCaseInsensitive(logosMap, trimmed);
      }
      const lower = trimmed.toLowerCase();
      for (const [k, v] of Object.entries(logosMap)) {
        if (k && k.trim().toLowerCase() === lower && v) return v;
      }
      return null;
    };

    if (suppliersData && suppliersData.length > 0) {
      const existingLocalMap = new Map((state.suppliers || []).map(ls => [(ls.name || "").trim().toLowerCase(), ls]));
      state.suppliers = suppliersData.map(s => {
        const supName = (s.name || "").trim();
        const localSup = existingLocalMap.get(supName.toLowerCase());
        const autoLogo = (typeof window.getSupplierAutoLogo === "function" ? window.getSupplierAutoLogo(supName) : null);
        const resolvedLogo = resolveEntityLogo(state.supplierLogos, supName, s.logo) || (localSup ? localSup.logo : null) || autoLogo || null;
        if (resolvedLogo && state.supplierLogos) {
          state.supplierLogos[supName] = resolvedLogo;
        }
        return {
          name: supName,
          dateAdded: Number(s.dateAdded),
          color: s.color,
          enabled: s.enabled !== false,
          logo: resolvedLogo
        };
      });
    }

    if (platformsData && platformsData.length > 0) {
      const existingLocalPlatMap = new Map((state.platforms || []).map(lp => [(lp.name || "").trim().toLowerCase(), lp]));
      state.platforms = platformsData.map(p => {
        const platName = (p.name || "").trim();
        const localPlat = existingLocalPlatMap.get(platName.toLowerCase());
        const autoPlatLogo = (typeof window.getPlatformAutoLogo === "function" ? window.getPlatformAutoLogo(platName) : null);
        const resolvedLogo = resolveEntityLogo(state.platformLogos, platName, p.logo) || (localPlat ? localPlat.logo : null) || autoPlatLogo || null;
        if (resolvedLogo && state.platformLogos) {
          state.platformLogos[platName] = resolvedLogo;
        }
        return {
          name: platName,
          dateAdded: Number(p.dateAdded),
          enabled: p.enabled !== false,
          logo: resolvedLogo
        };
      });
    }

    // Persist resolved logos to app_settings so cloud always has the current state
    if (state.supplierLogos && Object.keys(state.supplierLogos).length > 0) {
      await dbSaveSettings("supplierLogos", state.supplierLogos);
    }
    if (state.platformLogos && Object.keys(state.platformLogos).length > 0) {
      await dbSaveSettings("platformLogos", state.platformLogos);
    }
    if (state.publisherLogos && Object.keys(state.publisherLogos).length > 0) {
      await dbSaveSettings("publisherLogos", state.publisherLogos);
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
          if (state.widgetSettings && state.visibleFigures) {
            Object.keys(state.visibleFigures).forEach(key => {
              if (state.visibleFigures[key] === false && state.widgetSettings[key]) {
                state.widgetSettings[key].visible = false;
              }
            });
          }
          applyFiguresVisibility();
          applyWidgetVisibility();
        } else if (s.key === "metricOrder") {
          try {
            state.metricOrder = typeof s.value === 'string' ? JSON.parse(s.value) : s.value;
          } catch(e) {
            console.error("Error parsing metricOrder:", e);
            state.metricOrder = s.value;
          }
          applyMetricOrder();
        } else if (s.key === "dashboardOverviewOrder") {
          try {
            state.dashboardOverviewOrder = typeof s.value === 'string' ? JSON.parse(s.value) : s.value;
            const expectedOverview = ["performance", "inventory", "dailyProfitMonth"];
            if (Array.isArray(state.dashboardOverviewOrder)) {
              const filtered = state.dashboardOverviewOrder.filter(k => expectedOverview.includes(k));
              expectedOverview.forEach(k => {
                if (!filtered.includes(k)) filtered.push(k);
              });
              state.dashboardOverviewOrder = filtered;
            }
            if (typeof renderDashboardOverviewCardsOrder === "function") {
              renderDashboardOverviewCardsOrder();
            }
          } catch(e) {
            console.error("Error parsing dashboardOverviewOrder:", e);
          }
        } else if (s.key === "dashboardOverviewVisibility") {
          try {
            const remoteOverviewVis = typeof s.value === 'string' ? JSON.parse(s.value) : s.value;
            state.dashboardOverviewVisibility = { ...state.dashboardOverviewVisibility, ...remoteOverviewVis };
            if (typeof renderDashboardOverviewCardsOrder === "function") {
              renderDashboardOverviewCardsOrder();
            }
          } catch(e) {
            console.error("Error parsing dashboardOverviewVisibility:", e);
          }
        } else if (s.key === "dashboardOrder") {
          try {
            state.dashboardOrder = typeof s.value === 'string' ? JSON.parse(s.value) : s.value;
            const expectedKeys = [
              "salesProfit", "platformSplit", "supplierSplit", "topBestsellers", "topBestsellersRevenue", "topBestsellersSales", "topPeakProfit", "topAverageProfit", "dailyProfitMonth", "dayOfWeek",
              "stockSpeed", "salesFeed", "stockTurnover", "stockAging"
            ];
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
        } else if (s.key === "financeOrder") {
          try {
            state.financeOrder = typeof s.value === 'string' ? JSON.parse(s.value) : s.value;
            const expectedFinKeys = [
              "financeMatrix", "financeMonthly", "financeAverages", "financeOutflow", "costRevenue", "markupAnalysis", "financeBenchmark", "financeTracker"
            ];
            state.financeOrder = state.financeOrder.filter(k => expectedFinKeys.includes(k));
            expectedFinKeys.forEach(k => {
              if (!state.financeOrder.includes(k)) {
                if (k === "financeMatrix") {
                  state.financeOrder.unshift(k);
                } else {
                  state.financeOrder.push(k);
                }
              }
            });
            renderFinanceCardsOrder();
          } catch(e) {
            console.error("Error parsing financeOrder:", e);
          }
        } else if (s.key === "dashboardSpans") {
          try {
            const remoteSpans = typeof s.value === 'string' ? JSON.parse(s.value) : s.value;
            state.dashboardSpans = { ...state.dashboardSpans, ...remoteSpans };
            if (!state.dashboardSpans.dayOfWeek) state.dashboardSpans.dayOfWeek = 3;
            applyDashboardSpans();
          } catch(e) {
            console.error("Error parsing dashboardSpans from database sync:", e);
          }
        } else if (s.key === "financeSpans") {
          try {
            const remoteFinSpans = typeof s.value === 'string' ? JSON.parse(s.value) : s.value;
            state.financeSpans = { ...state.financeSpans, ...remoteFinSpans };
            if (!state.financeSpans.financeMatrix) state.financeSpans.financeMatrix = 3;
            applyFinanceSpans();
          } catch(e) {
            console.error("Error parsing financeSpans from database sync:", e);
          }
        } else if (s.key === "widgetSettings") {
          try {
            const remoteWidgetSettings = typeof s.value === 'string' ? JSON.parse(s.value) : s.value;
            state.widgetSettings = { ...state.widgetSettings, ...remoteWidgetSettings };
            if (!state.widgetSettings.dayOfWeek) {
              state.widgetSettings.dayOfWeek = { visible: true, collapsed: false, chartType: 'bar', metric: 'profit', timeframe: 'global' };
            }
            if (!state.widgetSettings.financeMatrix) {
              state.widgetSettings.financeMatrix = { visible: true, collapsed: false, metric: 'profit', mode: 'totals', sortOrder: 'asc' };
            }
            if (state.widgetSettings && state.visibleFigures) {
              Object.keys(state.widgetSettings).forEach(key => {
                if (state.widgetSettings[key] && state.widgetSettings[key].visible === false) {
                  state.visibleFigures[key] = false;
                }
              });
            }
            applyWidgetVisibility();
            applyDashboardSpans();
          } catch(e) {
            console.error("Error parsing widgetSettings from database sync:", e);
          }
        } else if (s.key === "aiSettings") {
          try {
            state.aiSettings = typeof s.value === 'string' ? JSON.parse(s.value) : s.value;
            if (typeof syncAISettingsUI === "function") syncAISettingsUI();
          } catch(e) {
            console.error("Error parsing aiSettings from database sync:", e);
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
        } else if (s.key === "catalogArtwork") {
          try {
            state.catalogArtwork = typeof s.value === 'string' ? JSON.parse(s.value) : s.value;
            localStorage.setItem("gv_catalog_artwork", JSON.stringify(state.catalogArtwork || {}));
            if (typeof window.syncInventoryArtworkWithCatalog === "function") {
              window.syncInventoryArtworkWithCatalog(false);
            }
          } catch(e) {
            console.error("Error parsing catalogArtwork from database sync:", e);
          }
        } else if (s.key === "catalogReviews") {
          try {
            state.catalogReviews = typeof s.value === 'string' ? JSON.parse(s.value) : s.value;
            localStorage.setItem("gv_catalog_reviews", JSON.stringify(state.catalogReviews || {}));
          } catch(e) {
            console.error("Error parsing catalogReviews from database sync:", e);
          }
        } else if (s.key === "supplierLogos") {
          try {
            const parsed = typeof s.value === 'string' ? JSON.parse(s.value) : s.value;
            state.supplierLogos = { ...(state.supplierLogos || {}), ...(parsed || {}) };
          } catch(e) {
            console.error("Error parsing supplierLogos from database sync:", e);
          }
        } else if (s.key === "platformLogos") {
          try {
            const parsed = typeof s.value === 'string' ? JSON.parse(s.value) : s.value;
            state.platformLogos = { ...(state.platformLogos || {}), ...(parsed || {}) };
          } catch(e) {
            console.error("Error parsing platformLogos from database sync:", e);
          }
        } else if (s.key === "publisherLogos") {
          try {
            const parsed = typeof s.value === 'string' ? JSON.parse(s.value) : s.value;
            state.publisherLogos = { ...(state.publisherLogos || {}), ...(parsed || {}) };
          } catch(e) {
            console.error("Error parsing publisherLogos from database sync:", e);
          }
        } else if (s.key === "appUsers") {
          try {
            const cloudUsers = typeof s.value === 'string' ? JSON.parse(s.value) : s.value;
            if (Array.isArray(cloudUsers) && cloudUsers.length > 0) {
              const localUsers = (typeof window.getUsersFromStorage === "function") ? window.getUsersFromStorage() : (typeof getUsersFromStorage === "function" ? getUsersFromStorage() : []);
              const mergeFn = window.mergeUsers || (typeof mergeUsers === "function" ? mergeUsers : null);
              const merged = mergeFn ? mergeFn(localUsers, cloudUsers) : cloudUsers;
              localStorage.setItem("gv_users", JSON.stringify(merged));
            }
          } catch(e) {
            console.error("Error parsing appUsers from database sync:", e);
          }
        }
      });
    }

    applyMenuIcons();
    applyMenuTitles();
    renderSidebarCustomizationSettings();
    if (typeof window.syncInventoryArtworkWithCatalog === "function") {
      window.syncInventoryArtworkWithCatalog(false);
    }
    saveStateToStorage();
    updateUI();
    showToast("Cloud database synchronized successfully.", "success");
  } catch (err) {
    console.error("Error loading state from Supabase:", err);
    showToast("Failed to sync cloud database. Check project tables.", "error");
    const storageBadge = document.getElementById("storage-status-badge");
    if (storageBadge) {
      storageBadge.innerHTML = `<i class="fa-solid fa-hdd"></i> Local Storage`;
      storageBadge.className = "badge";
      storageBadge.style.background = "rgba(255, 255, 255, 0.04)";
      storageBadge.style.color = "var(--text-secondary)";
      storageBadge.style.border = "1px solid var(--border-color)";
    }
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
      { key: "supplierLogos", value: state.supplierLogos || {} },
      { key: "platformLogos", value: state.platformLogos || {} },
      { key: "publisherLogos", value: state.publisherLogos || {} },
      { key: "lowStockThreshold", value: state.lowStockThreshold },
      { key: "defaultMarkupType", value: state.defaultMarkupType },
      { key: "defaultMarkupValue", value: state.defaultMarkupValue },
      { key: "syncMode", value: state.syncMode },
      { key: "supplierDisplayMode", value: state.supplierDisplayMode },
      { key: "platformDisplayMode", value: state.platformDisplayMode },
      { key: "dashboardOverviewOrder", value: state.dashboardOverviewOrder },
      { key: "dashboardOverviewVisibility", value: state.dashboardOverviewVisibility },
      { key: "dashboardOrder", value: state.dashboardOrder },
      { key: "financeOrder", value: state.financeOrder },
      { key: "dashboardSpans", value: state.dashboardSpans },
      { key: "financeSpans", value: state.financeSpans },
      { key: "widgetSettings", value: state.widgetSettings },
      { key: "aiSettings", value: state.aiSettings },
      { key: "catalogReviews", value: state.catalogReviews }
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
// Helper to detect if a Supabase error is caused by a missing table column
// Handles both PostgREST schema cache errors and raw PostgreSQL errors
function isMissingColumnError(error, columnName) {
  if (!error || !error.message) return false;
  const msg = error.message.toLowerCase();
  const col = String(columnName).toLowerCase();
  
  // PostgREST: "Could not find the 'supplierRefunded' column of 'sales' in the schema cache"
  if (msg.includes(`'${col}' column`) || msg.includes(`"${col}" column`) || msg.includes(`column '${col}'`) || msg.includes(`column "${col}"`)) {
    return true;
  }
  // PostgreSQL: 'column "supplierRefunded" of relation "sales" does not exist'
  if (msg.includes(`"${col}"`) && msg.includes("does not exist")) {
    return true;
  }
  if (msg.includes(`'${col}'`) && msg.includes("does not exist")) {
    return true;
  }
  // Generic PGRST204 or 42703 check containing the column name
  if (msg.includes(col) && (msg.includes("schema cache") || msg.includes("does not exist") || error.code === "PGRST204" || error.code === "42703")) {
    return true;
  }
  return false;
}
window.isMissingColumnError = isMissingColumnError;

async function dbSaveInventory(item) {
  if (!window.supabaseClient) return false;
  if (state.syncMode === "manual") {
    setUnsyncedChanges(true);
    return true;
  }
  try {
    if (!state.dbMissingColumns) state.dbMissingColumns = {};

    const payload = {
      id: item.id,
      title: item.title || "Untitled Game",
      platform: item.platform || "PC",
      key: (item.key && String(item.key).trim()) ? String(item.key).trim() : "NO-KEY",
      cost: item.cost !== undefined ? item.cost : 0,
      source: item.source || "Direct",
      purchaseDate: item.purchaseDate || new Date().toISOString().split("T")[0],
      status: item.status || "Available",
      notes: item.notes || null
    };

    if (!state.dbMissingColumns["inventory.imageUrl"]) {
      payload.imageUrl = item.imageUrl || null;
    }
    if (!state.dbMissingColumns["inventory.publisher"]) {
      payload.publisher = item.publisher || null;
    }

    let { error } = await window.supabaseClient
      .from('inventory')
      .upsert(payload);

    if (error) {
      if (isMissingColumnError(error, 'imageUrl')) {
        console.warn("Supabase relation 'inventory' is missing the 'imageUrl' column. Caching and retrying without it.");
        state.dbMissingColumns["inventory.imageUrl"] = true;
        delete payload.imageUrl;
        const res = await window.supabaseClient.from('inventory').upsert(payload);
        error = res.error;
      }
      if (error && isMissingColumnError(error, 'publisher')) {
        console.warn("Supabase relation 'inventory' is missing the 'publisher' column. Caching and retrying without it.");
        state.dbMissingColumns["inventory.publisher"] = true;
        delete payload.publisher;
        const res = await window.supabaseClient.from('inventory').upsert(payload);
        error = res.error;
      }
      if (error) throw error;
    }
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
    if (!state.dbMissingColumns) state.dbMissingColumns = {};

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
      notes: sale.notes || null
    };

    if (!state.dbMissingColumns["sales.disputed"]) {
      payload.disputed = sale.disputed === true;
    }
    if (!state.dbMissingColumns["sales.supplierRefunded"]) {
      payload.supplierRefunded = sale.supplierRefunded === true;
    }
    
    let { error } = await window.supabaseClient
      .from('sales')
      .upsert(payload);
      
    if (error) {
      if (isMissingColumnError(error, 'supplierRefunded')) {
        console.warn("Supabase relation 'sales' is missing the 'supplierRefunded' column. Caching and retrying without it.");
        state.dbMissingColumns["sales.supplierRefunded"] = true;
        delete payload.supplierRefunded;
        const res = await window.supabaseClient.from('sales').upsert(payload);
        error = res.error;
      }
      if (error && isMissingColumnError(error, 'disputed')) {
        console.warn("Supabase relation 'sales' is missing the 'disputed' column. Caching and retrying without it.");
        state.dbMissingColumns["sales.disputed"] = true;
        delete payload.disputed;
        const res = await window.supabaseClient.from('sales').upsert(payload);
        error = res.error;
      }
      if (error) throw error;
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
    if (!state.dbMissingColumns) state.dbMissingColumns = {};
    if (!state.supplierLogos) state.supplierLogos = {};

    if (supplier.logo) {
      state.supplierLogos[supplier.name] = supplier.logo;
    } else {
      delete state.supplierLogos[supplier.name];
    }

    // Always persist supplierLogos to app_settings first so cloud persistence is guaranteed
    await dbSaveSettings("supplierLogos", state.supplierLogos);

    const payload = {
      name: supplier.name,
      dateAdded: supplier.dateAdded,
      color: supplier.color,
      enabled: supplier.enabled !== false
    };

    if (!state.dbMissingColumns["suppliers.logo"]) {
      payload.logo = supplier.logo || null;
    }

    let { error } = await window.supabaseClient
      .from('suppliers')
      .upsert(payload);

    if (error) {
      if (isMissingColumnError(error, 'logo')) {
        console.warn("Supabase relation 'suppliers' is missing the 'logo' column. Falling back to upsert without logo.");
        state.dbMissingColumns["suppliers.logo"] = true;
        delete payload.logo;
        const { error: fallbackErr } = await window.supabaseClient
          .from('suppliers')
          .upsert(payload);
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
  if (state.supplierLogos && state.supplierLogos[name]) {
    delete state.supplierLogos[name];
    if (window.supabaseClient && state.syncMode !== "manual") {
      dbSaveSettings("supplierLogos", state.supplierLogos).catch(e => console.warn(e));
    }
  }
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

async function dbReassignSupplier(oldName, newName) {
  if (!window.supabaseClient) return;
  if (state.syncMode === "manual") {
    setUnsyncedChanges(true);
    return;
  }
  try {
    const { error } = await window.supabaseClient
      .from('inventory')
      .update({ source: newName })
      .eq('source', oldName);
    if (error) throw error;
  } catch (err) {
    console.error("Error reassigning supplier keys in Supabase:", err);
  }
}
window.dbReassignSupplier = dbReassignSupplier;

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

async function dbSaveSettings(key, value, bypassManualSync = false) {
  if (!window.supabaseClient) return;
  if (!bypassManualSync && state.syncMode === "manual" && key !== "appUsers") {
    setUnsyncedChanges(true);
    return;
  }
  try {
    const { error } = await window.supabaseClient
      .from('app_settings')
      .upsert({ key, value }, { onConflict: 'key' });
    if (error) throw error;
  } catch (err) {
    console.error(`Error saving app setting "${key}" to Supabase:`, err);
  }
}
window.dbSaveSettings = dbSaveSettings;

async function syncUsersFromCloud() {
  if (!window.supabaseClient) {
    // If supabaseClient is not yet set, attempt to initialize it if credentials exist
    if (window.supabase) {
      let activeUser = (typeof state !== "undefined" && state.currentUser) || localStorage.getItem("gv_last_active_user") || "";
      const userSuffix = (activeUser && activeUser !== "guest") ? `_${activeUser}` : "";
      let url = localStorage.getItem("gv_supabase_url" + userSuffix) || localStorage.getItem("gv_supabase_url");
      let key = localStorage.getItem("gv_supabase_key" + userSuffix) || localStorage.getItem("gv_supabase_key");
      if (!url && !key && window.GV_CONFIG && window.GV_CONFIG.supabaseUrl) {
        url = window.GV_CONFIG.supabaseUrl;
        key = window.GV_CONFIG.supabaseKey;
      }
      if (url && key) {
        try {
          window.supabaseClient = window.supabase.createClient(url, key);
        } catch (e) {
          console.warn("Could not create supabaseClient in syncUsersFromCloud:", e);
        }
      }
    }
  }

  if (!window.supabaseClient) return null;

  try {
    const { data, error } = await window.supabaseClient
      .from('app_settings')
      .select('value')
      .eq('key', 'appUsers')
      .maybeSingle();

    if (error) {
      console.warn("Error fetching appUsers from Supabase:", error);
      return null;
    }

    if (data && data.value) {
      const cloudUsers = typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
      if (Array.isArray(cloudUsers) && cloudUsers.length > 0) {
        const localUsers = (typeof window.getUsersFromStorage === "function") ? window.getUsersFromStorage() : (typeof getUsersFromStorage === "function" ? getUsersFromStorage() : []);
        const mergeFn = window.mergeUsers || (typeof mergeUsers === "function" ? mergeUsers : null);
        const merged = mergeFn ? mergeFn(localUsers, cloudUsers) : cloudUsers;
        localStorage.setItem("gv_users", JSON.stringify(merged));
        return merged;
      }
    }
  } catch (err) {
    console.warn("Exception in syncUsersFromCloud:", err);
  }
  return null;
}
window.syncUsersFromCloud = syncUsersFromCloud;

async function dbSavePlatform(platform) {
  if (!window.supabaseClient) return;
  if (state.syncMode === "manual") {
    setUnsyncedChanges(true);
    return;
  }
  try {
    if (!state.dbMissingColumns) state.dbMissingColumns = {};
    if (!state.platformLogos) state.platformLogos = {};

    if (platform.logo) {
      state.platformLogos[platform.name] = platform.logo;
    } else {
      delete state.platformLogos[platform.name];
    }

    // Always persist platformLogos to app_settings first so cloud persistence is guaranteed
    await dbSaveSettings("platformLogos", state.platformLogos);

    const payload = {
      name: platform.name,
      dateAdded: platform.dateAdded,
      enabled: platform.enabled !== false
    };

    if (!state.dbMissingColumns["platforms.logo"]) {
      payload.logo = platform.logo || null;
    }

    let { error } = await window.supabaseClient
      .from('platforms')
      .upsert(payload);

    if (error) {
      if (isMissingColumnError(error, 'logo')) {
        console.warn("Supabase relation 'platforms' is missing the 'logo' column. Falling back to upsert without logo.");
        state.dbMissingColumns["platforms.logo"] = true;
        delete payload.logo;
        const { error: fallbackErr } = await window.supabaseClient
          .from('platforms')
          .upsert(payload);
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
  if (state.platformLogos && state.platformLogos[name]) {
    delete state.platformLogos[name];
    if (window.supabaseClient && state.syncMode !== "manual") {
      dbSaveSettings("platformLogos", state.platformLogos).catch(e => console.warn(e));
    }
  }
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

async function dbReassignPlatform(oldName, newName) {
  if (!window.supabaseClient) return;
  if (state.syncMode === "manual") {
    setUnsyncedChanges(true);
    return;
  }
  try {
    const { error: invErr } = await window.supabaseClient
      .from('inventory')
      .update({ platform: newName })
      .eq('platform', oldName);
    if (invErr) console.error("Error reassigning platform in inventory Supabase:", invErr);

    const { error: salesErr } = await window.supabaseClient
      .from('sales')
      .update({ platform: newName })
      .eq('platform', oldName);
    if (salesErr) console.error("Error reassigning platform in sales Supabase:", salesErr);
  } catch (err) {
    console.error("Error reassigning platform in Supabase:", err);
  }
}
window.dbReassignPlatform = dbReassignPlatform;

// Auto-Sync schedules background variables and runners
function triggerDebouncedGitHubPush() {
  if (gitHubPushTimeout) {
    clearTimeout(gitHubPushTimeout);
  }
  gitHubPushTimeout = setTimeout(() => {
    console.log("Triggering auto-scheduled background GitHub push...");
    syncToGitHub(true);
  }, 2000);
}

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

  // Clean title helper
  const cleanTitle = (t) => {
    if (!t) return "";
    let clean = t.replace(/\([^)]*\)/g, " ");
    clean = clean.replace(/\[[^\]]*\]/g, " ");
    const terms = [
      /\bpc\b/i, /\bsteam\b/i, /\bkey\b/i, /\bglobal\b/i, /\bcd-key\b/i, /\bcdkey\b/i, 
      /\bgog\b/i, /\borigin\b/i, /\buplay\b/i, /\bepic\b/i, /\bconnect\b/i, /\bedition\b/i,
      /\bstandard\b/i, /\bdeluxe\b/i, /\bultimate\b/i, /\bpremium\b/i, /\brow\b/i, /\bfree\b/i,
      /\bregion\b/i, /\bdownload\b/i, /\bcode\b/i, /\bactivation\b/i, /\bdigital\b/i
    ];
    terms.forEach(regex => {
      clean = clean.replace(regex, " ");
    });
    clean = clean.replace(/[\u2122\u00ae\u00a9]/g, "");
    clean = clean.replace(/\s+/g, " ").trim();
    return clean || t;
  };

  const searchTerm = cleanTitle(title);
  
  try {
    let matches = [];
    
    // Attempt 1: CheapShark API
    try {
      const response = await fetch(`https://www.cheapshark.com/api/1.0/games?title=${encodeURIComponent(searchTerm)}`);
      if (response.ok && response.status !== 429) {
        matches = await response.json();
      }
    } catch (err) {
      console.warn("CheapShark fetch failed, trying fallback:", err);
    }
    
    // Attempt 2 Fallback: Colon/dash subtitle split on CheapShark
    if ((!matches || matches.length === 0) && (searchTerm.includes(":") || searchTerm.includes("-"))) {
      let fallbackTerm = searchTerm.includes(":") ? searchTerm.split(":")[0].trim() : searchTerm.split("-")[0].trim();
      if (fallbackTerm && fallbackTerm.length > 2) {
        try {
          const response = await fetch(`https://www.cheapshark.com/api/1.0/games?title=${encodeURIComponent(fallbackTerm)}`);
          if (response.ok && response.status !== 429) {
            matches = await response.json();
          }
        } catch (err) {
          console.warn("CheapShark fallback fetch failed:", err);
        }
      }
    }
    
    if (matches && matches.length > 0) {
      let match = matches.find(m => m.external && m.external.toLowerCase() === title.toLowerCase() && m.steamAppID && m.steamAppID !== "0");
      if (!match) {
        match = matches.find(m => m.external && m.external.toLowerCase() === searchTerm.toLowerCase() && m.steamAppID && m.steamAppID !== "0");
      }
      if (!match) {
        match = matches.find(m => m.steamAppID && m.steamAppID !== "0") || matches[0];
      }
      let imageUrl = "";
      
      if (match.steamAppID && match.steamAppID !== "0") {
        imageUrl = `https://cdn.akamai.steamstatic.com/steam/apps/${match.steamAppID}/header.jpg`;
      } else if (match.thumb) {
        imageUrl = match.thumb;
      }
      
      if (imageUrl) {
        targetInput.value = imageUrl;
        targetInput.dispatchEvent(new Event("input", { bubbles: true }));
        if (typeof window.scheduleSteamReviewFetch === "function") {
          window.scheduleSteamReviewFetch(title, match.steamAppID || imageUrl);
        }
        showToast(`Successfully fetched artwork for: "${match.external}"`, "success");
      } else {
        showToast(`No artwork found for "${title}".`, "warning");
      }
    } else {
      showToast(`No matches found on Steam for "${title}".`, "warning");
    }
  } catch (err) {
    console.error("Artwork auto-fetch error:", err);
    showToast("Failed to fetch from Steam API. Try pasting a cover link manually.", "error");
  } finally {
    btn.disabled = false;
    btn.innerHTML = originalText;
  }
};

// ==========================================================================
// KINGUIN MERCHANT API INTEGRATION (GAMEVAULT STORE)
// ==========================================================================

/**
 * Formats request URL through an optional CORS relay proxy if configured.
 */
function getKinguinRequestUrl(targetUrl, customProxyUrl) {
  const proxy = customProxyUrl !== undefined ? customProxyUrl.trim() : (state.sourcingSettings?.kinguinProxyUrl || "").trim();
  if (!proxy) return targetUrl;
  if (proxy.includes("?url=") || proxy.endsWith("?url=")) {
    return proxy + encodeURIComponent(targetUrl);
  }
  if (proxy.endsWith("/")) {
    return proxy + targetUrl;
  }
  return proxy + "/" + targetUrl;
}

/**
 * Checks whether a product listing (from Kinguin, CheapShark, GG.deals, or any supplier)
 * represents a Game Account, shared profile, or offline account rather than a genuine redeemable CD Key / serial.
 */
window.isKinguinAccountListing = function(item) {
  if (!item) return false;

  // 1. Explicit API fields if provided
  if (item.isAccount === true || item.is_account === true) return true;
  if (typeof item.deliveryType === "string" && item.deliveryType.trim().toLowerCase() === "account") return true;
  if (typeof item.type === "string" && item.type.trim().toLowerCase() === "account") return true;

  const name = (item.name || item.title || item.external || "").toLowerCase();

  // 2. Specific multi-word account identifiers common across keyshops and suppliers
  const accountPhrases = [
    "steam account",
    "offline account",
    "shared account",
    "shared profile",
    "shared access",
    "family share",
    "family sharing",
    "psn account",
    "playstation account",
    "ps4 account",
    "ps5 account",
    "xbox account",
    "primary account",
    "secondary account",
    "nintendo account",
    "switch account",
    "epic games account",
    "epic account",
    "uplay account",
    "ubisoft account",
    "origin account",
    "ea app account",
    "ea account",
    "battlenet account",
    "battle.net account",
    "gog account",
    "alter gift",
    "steam gift"
  ];

  if (accountPhrases.some(phrase => name.includes(phrase))) {
    return true;
  }

  // 3. Word-boundary regex check for standalone account words (e.g., "(Account)", "Account EU", "[Account]")
  if (/\b(accounts?|acc)\b/i.test(name)) {
    return true;
  }

  // 4. Tags / categories check
  if (Array.isArray(item.tags) && item.tags.some(t => typeof t === "string" && /\baccount\b/i.test(t))) {
    return true;
  }

  return false;
};
window.isGameAccountListing = window.isKinguinAccountListing;

/**
 * Checks whether a product listing (from Kinguin, CheapShark, GG.deals, or any supplier)
 * is a DLC, expansion, season pass, or add-on rather than the full base game.
 */
window.isKinguinDlcListing = function(item, queryCleanTitle) {
  if (!item) return false;

  const name = (item.name || item.title || item.external || "").toLowerCase();
  const queryLower = (queryCleanTitle || "").toLowerCase();

  const dlcPatterns = [
    /\bdlc\b/i,
    /\bexpansion(\s*pack)?\b/i,
    /\bseason\s*pass\b/i,
    /\bexpansion\s*pass\b/i,
    /\bbattle\s*pass\b/i,
    /\bsoundtrack\b/i,
    /\bost\b/i,
    /\bartbook\b/i,
    /\bcosmetics?\b/i,
    /\bskin(\s*pack)?\b/i,
    /\bupgrade\s*pack\b/i,
    /\bbonus(\s*pack|\s*content)?\b/i,
    /\bcontent\s*pack\b/i,
    /\bcharacter\s*pack\b/i,
    /\bcostume\s*pack\b/i,
    /\bweapon\s*pack\b/i,
    /\bstarter\s*pack\b/i,
    /\bbooster\s*pack\b/i,
    /\bcar\s*pass\b/i,
    /\badd-?on\b/i,
    /\bin-?game\s*currency\b/i,
    /\bminecoins\b/i,
    /\bpoints\b/i,
    /\bcoins\b/i,
    /\bcredits\b/i
  ];

  for (const regex of dlcPatterns) {
    if (regex.test(name)) {
      // If the user's queried title didn't contain this DLC keyword, this listing is an add-on
      if (!regex.test(queryLower)) {
        return true;
      }
    }
  }

  // Detect un-labeled expansions and add-on subtitles after ':' or '-'
  // e.g. 'Cyberpunk 2077: Phantom Liberty', 'The Witcher 3: Wild Hunt - Blood and Wine'
  const cleanQ = queryLower.replace(/[\:\-\_]/g, " ").replace(/\s+/g, " ").trim();
  const cleanN = name.replace(/[\:\-\_]/g, " ").replace(/\s+/g, " ").trim();

  if (cleanN.startsWith(cleanQ)) {
    const trailing = cleanN.slice(cleanQ.length).trim();
    if (trailing.length > 2) {
      const editionOrKeyRegex = /\b(edition|goty|game of the year|complete|deluxe|gold|ultimate|standard|premium|definitive|special|enhanced|remastered?|directors? cut|collection|trilogy|saga|cd key|steam key|key|code|download|global|eu|na|row|pc|steam|gog|epic|xbox|ps4|ps5)\b/i;
      if (!editionOrKeyRegex.test(trailing)) {
        return true; // Unrecognized subtitle -> Expansion / DLC!
      }
    }
  }

  if (typeof item.type === "string" && item.type.trim().toLowerCase() === "dlc") {
    if (!/\bdlc\b/i.test(queryLower)) return true;
  }

  return false;
};
window.isGameDlcListing = window.isKinguinDlcListing;

/**
 * Evaluates match quality between a clean search title and a candidate product
 * across Kinguin, CheapShark, GG.deals, and supplier catalogs.
 * Returns a score > 0 if valid match, or -1 if irrelevant.
 */
window.scoreKinguinProductMatch = function(item, cleanTitle) {
  if (!item) return -1;
  const itemName = (item.name || item.title || item.external || "").toLowerCase();
  if (!itemName) return -1;

  const stopWords = new Set(["the", "and", "for", "with", "edition", "game", "pc", "steam", "global", "eu", "na", "row", "digital"]);
  const queryWords = cleanTitle
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter(w => w.length > 1 && !stopWords.has(w));

  if (queryWords.length === 0) {
    return itemName.includes(cleanTitle.toLowerCase()) ? 50 : -1;
  }

  let matchedCount = 0;
  for (const w of queryWords) {
    if (itemName.includes(w)) {
      matchedCount++;
    }
  }

  const matchRatio = matchedCount / queryWords.length;
  const minRequiredRatio = queryWords.length <= 2 ? 1.0 : 0.60;
  if (matchRatio < minRequiredRatio) {
    return -1;
  }

  let score = Math.round(matchRatio * 50);

  // CD Key bonuses
  if (/\b(cd\s*key|steam\s*key|key|download\s*code|digital\s*download)\b/i.test(itemName)) {
    score += 15;
  }

  // Base game bonus
  if (!/\b(dlc|pack|pass|bundle)\b/i.test(itemName)) {
    score += 10;
  }

  // In-stock bonus
  const qty = Number(item.qty ?? item.textQty ?? 0);
  if (qty > 0) {
    score += 5;
  }

  return score;
};
window.scoreGameProductMatch = window.scoreKinguinProductMatch;

/**
 * Queries Kinguin eCommerce API for a specific game's lowest market price.
 * Strictly filters out Game Accounts and DLCs/Expansions by default so benchmarks
 * accurately represent legitimate Full Base Game CD Keys.
 */
window.fetchKinguinLiveProduct = async function(title, customApiKey) {
  const key = customApiKey || state.sourcingSettings?.kinguinApiKey;
  if (!key) return null;

  // Clean title for search: strip brackets, editions, etc.
  const clean = title.replace(/\s*[\(\[].*?[\)\]]/g, "").trim();
  if (!clean) return null;

  const excludeAccounts = state.sourcingSettings?.kinguinExcludeAccounts !== false;
  const excludeDlcs = state.sourcingSettings?.kinguinExcludeDlcs !== false;

  // Query up to 20 products to ensure ample valid base keys remain after filtering accounts & DLCs
  const rawUrl = `https://gateway.kinguin.net/esa/api/v1/products?name=${encodeURIComponent(clean)}&page=1&limit=20`;
  const requestUrl = getKinguinRequestUrl(rawUrl);
  const headers = { "X-Api-Key": key.trim() };

  try {
    const res = await fetch(requestUrl, { headers });
    if (!res.ok) return null;
    const rawData = await res.json();

    let items = [];
    if (Array.isArray(rawData)) items = rawData;
    else if (Array.isArray(rawData.results)) items = rawData.results;
    else if (Array.isArray(rawData.data)) items = rawData.data;
    else if (rawData.price !== undefined) items = [rawData];

    if (items.length === 0) return null;

    // Filter out accounts & DLCs, and score candidates
    const validCandidates = [];
    for (const it of items) {
      const p = Number(it.price);
      if (!(p > 0)) continue;

      if (excludeAccounts && window.isKinguinAccountListing(it)) {
        continue;
      }

      if (excludeDlcs && window.isKinguinDlcListing(it, clean)) {
        continue;
      }

      const matchScore = window.scoreKinguinProductMatch(it, clean);
      if (matchScore <= 0) {
        continue;
      }

      validCandidates.push({
        item: it,
        price: p,
        score: matchScore
      });
    }

    if (validCandidates.length === 0) {
      // Fallback: If strict filtering rejected everything, never return an account if excludeAccounts is active
      const nonAccounts = items.filter(it => Number(it.price) > 0 && (!excludeAccounts || !window.isKinguinAccountListing(it)));
      if (nonAccounts.length === 0) return null;

      nonAccounts.sort((a, b) => Number(a.price) - Number(b.price));
      const fallbackBest = nonAccounts[0];
      return {
        kinguinId: fallbackBest.kinguinId,
        productId: fallbackBest.productId,
        name: fallbackBest.name,
        price: Number(fallbackBest.price),
        qty: Number(fallbackBest.qty ?? fallbackBest.textQty ?? 0),
        fetchedAt: Date.now()
      };
    }

    // Sort valid candidates by price ascending among strong title matches
    const highConfidence = validCandidates.filter(c => c.score >= 40);
    const pool = highConfidence.length > 0 ? highConfidence : validCandidates;
    pool.sort((a, b) => a.price - b.price);

    const best = pool[0].item;

    return {
      kinguinId: best.kinguinId,
      productId: best.productId,
      name: best.name,
      price: Number(best.price),
      qty: Number(best.qty ?? best.textQty ?? 0),
      fetchedAt: Date.now()
    };
  } catch (err) {
    console.warn(`[Kinguin API] Fetch error for "${title}":`, err.message);
    return null;
  }
};

/**
 * Validates a Kinguin API key against the live Kinguin gateway.
 */
window.testKinguinConnection = async function(customApiKey, customProxyUrl) {
  const key = (customApiKey || state.sourcingSettings?.kinguinApiKey || "").trim();
  if (!key) {
    return { success: false, message: "Please provide a Kinguin API key." };
  }

  const rawUrl = `https://gateway.kinguin.net/esa/api/v1/products?name=Minecraft&page=1&limit=1`;
  const proxyUrl = customProxyUrl !== undefined ? customProxyUrl.trim() : (state.sourcingSettings?.kinguinProxyUrl || "").trim();
  const requestUrl = getKinguinRequestUrl(rawUrl, proxyUrl);
  const headers = { "X-Api-Key": key };

  try {
    const res = await fetch(requestUrl, { headers });
    if (res.ok) {
      const data = await res.json();
      let sampleTitle = "catalog product";
      if (Array.isArray(data.results) && data.results[0]?.name) {
        sampleTitle = `"${data.results[0].name}" (€${Number(data.results[0].price).toFixed(2)})`;
      }
      return {
        success: true,
        message: `Connected successfully to Kinguin eCommerce API! Verified access via live lookup of ${sampleTitle}.`
      };
    }

    if (res.status === 401 || res.status === 403) {
      return {
        success: false,
        message: "Authentication failed (401/403). Please ensure your Kinguin Store API Key is copied correctly from Kinguin Merchant Dashboard > API > STORES."
      };
    }

    return { success: false, message: `Kinguin API returned unexpected HTTP status: ${res.status}.` };
  } catch (err) {
    if (!proxyUrl) {
      return {
        success: false,
        isCorsError: true,
        message: "Browser CORS Restriction: Kinguin B2B Gateway blocks direct browser calls ('Failed to fetch'). A CORS relay proxy is required. <a href='javascript:void(0)' onclick='window.openCorsGuideModal && window.openCorsGuideModal()' style='color: #ff5000; text-decoration: underline; font-weight: 600; margin-left: 4px;'>Setup Free Cloudflare Proxy (2 mins) &rarr;</a>"
      };
    }
    return {
      success: false,
      message: `Proxy request failed: ${err.message}. Please verify your CORS Proxy URL.`
    };
  }
};

/**
 * Initializes Kinguin API UI states in Settings and Sourcing Radar.
 */
window.initKinguinConnection = function() {
  const key = state.sourcingSettings?.kinguinApiKey || "";
  const storeName = state.sourcingSettings?.kinguinStoreName || "GameVault";
  const proxyUrl = state.sourcingSettings?.kinguinProxyUrl || "";

  const keyInput = document.getElementById("settings-kinguin-apikey");
  const storeInput = document.getElementById("settings-kinguin-storename");
  const proxyInput = document.getElementById("settings-kinguin-proxyurl");
  const statusBadge = document.getElementById("kinguin-connection-status");
  const radarBadge = document.getElementById("sourcing-kinguin-api-badge");
  const radarLabel = document.getElementById("sourcing-kinguin-api-label");
  const excludeAccountsCheckbox = document.getElementById("settings-kinguin-exclude-accounts");
  const excludeDlcsCheckbox = document.getElementById("settings-kinguin-exclude-dlcs");

  if (keyInput && !keyInput.value) keyInput.value = key;
  if (storeInput && !storeInput.value) storeInput.value = storeName;
  if (proxyInput && !proxyInput.value) proxyInput.value = proxyUrl;
  if (excludeAccountsCheckbox) {
    excludeAccountsCheckbox.checked = state.sourcingSettings?.kinguinExcludeAccounts !== false;
  }
  if (excludeDlcsCheckbox) {
    excludeDlcsCheckbox.checked = state.sourcingSettings?.kinguinExcludeDlcs !== false;
  }

  if (statusBadge) {
    if (key) {
      statusBadge.textContent = "Configured";
      statusBadge.className = "badge badge-in-stock";
      statusBadge.style.backgroundColor = "var(--accent-emerald, #10b981)";
    } else {
      statusBadge.textContent = "Not Configured";
      statusBadge.className = "badge badge-sold";
      statusBadge.style.backgroundColor = "";
    }
  }

  if (radarBadge && radarLabel) {
    if (key) {
      radarBadge.style.background = "rgba(16, 185, 129, 0.15)";
      radarBadge.style.color = "var(--accent-emerald)";
      radarBadge.style.borderColor = "rgba(16, 185, 129, 0.35)";
      radarBadge.title = `Live Kinguin API Connected (${storeName})`;
      radarLabel.textContent = "Kinguin Live API Active";
    } else {
      radarBadge.style.background = "rgba(255, 153, 0, 0.12)";
      radarBadge.style.color = "#ff9900";
      radarBadge.style.borderColor = "rgba(255, 153, 0, 0.4)";
      radarBadge.title = "Click to configure Kinguin Merchant API";
      radarLabel.textContent = "Connect Kinguin API";
    }
  }
};

/**
 * Binds event listeners for Kinguin Settings controls.
 */
window.bindKinguinSettingsControls = function() {
  const btnToggleVis = document.getElementById("btn-toggle-kinguin-key-vis");
  const keyInput = document.getElementById("settings-kinguin-apikey");
  const storeInput = document.getElementById("settings-kinguin-storename");
  const proxyInput = document.getElementById("settings-kinguin-proxyurl");
  const excludeAccountsCheckbox = document.getElementById("settings-kinguin-exclude-accounts");
  const excludeDlcsCheckbox = document.getElementById("settings-kinguin-exclude-dlcs");
  const btnSave = document.getElementById("btn-save-kinguin-api");
  const btnTest = document.getElementById("btn-test-kinguin-api");
  const feedback = document.getElementById("kinguin-test-feedback");
  const statusBadge = document.getElementById("kinguin-connection-status");

  // Toggle API key visibility
  if (btnToggleVis && keyInput) {
    btnToggleVis.addEventListener("click", () => {
      const isPass = keyInput.type === "password";
      keyInput.type = isPass ? "text" : "password";
      btnToggleVis.innerHTML = isPass ? `<i class="fa-regular fa-eye-slash"></i>` : `<i class="fa-regular fa-eye"></i>`;
    });
  }

  // Save Kinguin Settings
  if (btnSave) {
    btnSave.addEventListener("click", async () => {
      const keyVal = keyInput ? keyInput.value.trim() : "";
      const storeVal = storeInput ? storeInput.value.trim() : "GameVault";
      const proxyVal = proxyInput ? proxyInput.value.trim() : "";
      const excludeAccounts = excludeAccountsCheckbox ? excludeAccountsCheckbox.checked : true;
      const excludeDlcs = excludeDlcsCheckbox ? excludeDlcsCheckbox.checked : true;

      if (!state.sourcingSettings) state.sourcingSettings = {};
      state.sourcingSettings.kinguinApiKey = keyVal;
      state.sourcingSettings.kinguinStoreName = storeVal || "GameVault";
      state.sourcingSettings.kinguinProxyUrl = proxyVal;
      state.sourcingSettings.excludeAccounts = excludeAccounts;
      state.sourcingSettings.excludeDlcs = excludeDlcs;
      state.sourcingSettings.kinguinExcludeAccounts = excludeAccounts;
      state.sourcingSettings.kinguinExcludeDlcs = excludeDlcs;

      if (typeof saveSecondaryTablesToStorage === "function") saveSecondaryTablesToStorage();
      if (window.supabaseClient && typeof dbSaveSettings === "function") {
        await dbSaveSettings("sourcingSettings", state.sourcingSettings);
      }

      if (typeof showToast === "function") {
        showToast("Kinguin Merchant API settings saved!", "success");
      }
      if (typeof logActionNotification === "function") {
        logActionNotification(keyVal ? `Configured Kinguin API Key for store "${storeVal}"` : "Cleared Kinguin API Key");
      }

      window.initKinguinConnection();
    });
  }

  // Test Kinguin Connection
  if (btnTest) {
    btnTest.addEventListener("click", async () => {
      const keyVal = keyInput ? keyInput.value.trim() : "";
      const proxyVal = proxyInput ? proxyInput.value.trim() : "";

      if (!keyVal) {
        if (typeof showToast === "function") showToast("Please paste your Kinguin API key first.", "warning");
        if (feedback) {
          feedback.style.display = "block";
          feedback.style.background = "rgba(255, 153, 0, 0.1)";
          feedback.style.border = "1px solid var(--accent-warning)";
          feedback.style.color = "var(--text-main)";
          feedback.innerHTML = `<i class="fa-solid fa-triangle-exclamation" style="color: var(--accent-warning); margin-right: 6px;"></i> Please enter an API key to test.`;
        }
        return;
      }

      const originalBtnText = btnTest.innerHTML;
      btnTest.disabled = true;
      btnTest.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Testing Kinguin API...`;

      if (feedback) {
        feedback.style.display = "block";
        feedback.style.background = "rgba(0, 212, 255, 0.08)";
        feedback.style.border = "1px solid var(--accent-cyan)";
        feedback.style.color = "var(--text-main)";
        feedback.innerHTML = `<i class="fa-solid fa-arrows-rotate fa-spin" style="color: var(--accent-cyan); margin-right: 6px;"></i> Querying Kinguin eCommerce Gateway...`;
      }

      try {
        const result = await window.testKinguinConnection(keyVal, proxyVal);
        if (result.success) {
          if (feedback) {
            feedback.style.background = "rgba(16, 185, 129, 0.12)";
            feedback.style.border = "1px solid var(--accent-emerald)";
            feedback.style.color = "var(--text-main)";
            feedback.innerHTML = `<i class="fa-solid fa-circle-check" style="color: var(--accent-emerald); margin-right: 6px;"></i> ${result.message}`;
          }
          if (statusBadge) {
            statusBadge.textContent = "Connected";
            statusBadge.className = "badge badge-in-stock";
            statusBadge.style.backgroundColor = "var(--accent-emerald, #10b981)";
          }
          if (typeof showToast === "function") showToast("Kinguin API Connection Verified!", "success");
        } else {
          if (feedback) {
            feedback.style.background = result.isCorsError ? "rgba(255, 153, 0, 0.12)" : "rgba(244, 67, 54, 0.12)";
            feedback.style.border = result.isCorsError ? "1px solid var(--accent-warning)" : "1px solid var(--accent-danger)";
            feedback.style.color = "var(--text-main)";
            feedback.innerHTML = `<i class="fa-solid ${result.isCorsError ? 'fa-triangle-exclamation text-warning' : 'fa-circle-xmark text-danger'}" style="margin-right: 6px;"></i> ${result.message}`;
          }
          if (statusBadge) {
            statusBadge.textContent = result.isCorsError ? "CORS Required" : "Error";
            statusBadge.className = "badge badge-sold";
            statusBadge.style.backgroundColor = result.isCorsError ? "var(--accent-warning, #ff9900)" : "var(--accent-danger, #f44336)";
          }
          if (typeof showToast === "function") showToast(result.isCorsError ? "Browser CORS proxy required." : "Kinguin API Connection Failed.", result.isCorsError ? "warning" : "error");
        }
      } catch (ex) {
        if (feedback) {
          feedback.style.background = "rgba(244, 67, 54, 0.12)";
          feedback.style.border = "1px solid var(--accent-danger)";
          feedback.innerHTML = `<i class="fa-solid fa-circle-xmark" style="color: var(--accent-danger); margin-right: 6px;"></i> Test error: ${ex.message}`;
        }
      } finally {
        btnTest.disabled = false;
        btnTest.innerHTML = originalBtnText;
      }
    });
  }
};

// ==========================================================================
// GG.DEALS API INTEGRATION (MULTI-KEYSHOP & STORE BENCHMARK)
// ==========================================================================

/**
 * Formats request URL through an optional CORS relay proxy for GG.deals calls.
 * Falls back to Kinguin proxy if no specific GG.deals proxy is specified.
 */
function getGGDealsRequestUrl(targetUrl, customProxyUrl) {
  const proxy = (customProxyUrl && customProxyUrl.trim()) 
    ? customProxyUrl.trim() 
    : (state.sourcingSettings?.ggdealsProxyUrl || state.sourcingSettings?.kinguinProxyUrl || "").trim();
  if (!proxy) return targetUrl;
  if (proxy.includes("?url=") || proxy.endsWith("?url=")) {
    return proxy + encodeURIComponent(targetUrl);
  }
  if (proxy.endsWith("/")) {
    return proxy + targetUrl;
  }
  return proxy + "/" + targetUrl;
}

/**
 * Fetches live retail and keyshop prices from GG.deals for one or more Steam App IDs.
 * Supports array of IDs or single ID. Batches in chunks of up to 50 IDs.
 */
window.fetchGGDealsLivePrices = async function(steamAppIds, customToken, customRegion, customProxyUrl) {
  const token = (customToken || state.sourcingSettings?.ggdealsToken || "").trim();
  if (!token) return {};

  const idList = (Array.isArray(steamAppIds) ? steamAppIds : [steamAppIds])
    .map(id => String(id).trim())
    .filter(id => id && /^\d+$/.test(id));

  if (idList.length === 0) return {};

  const region = (customRegion || state.sourcingSettings?.ggdealsRegion || "us").toLowerCase();
  const proxyUrl = customProxyUrl !== undefined ? customProxyUrl : (state.sourcingSettings?.ggdealsProxyUrl || state.sourcingSettings?.kinguinProxyUrl || "");
  const results = {};

  // Batch in chunks of 50 IDs
  const chunkSize = 50;
  for (let i = 0; i < idList.length; i += chunkSize) {
    const chunk = idList.slice(i, i + chunkSize);
    const rawUrl = `https://api.gg.deals/v1/prices/by-steam-app-id/?ids=${chunk.join(",")}&key=${encodeURIComponent(token)}&region=${encodeURIComponent(region)}`;
    const requestUrl = getGGDealsRequestUrl(rawUrl, proxyUrl);

    try {
      const res = await fetch(requestUrl);
      if (!res.ok) {
        console.warn(`[GG.deals API] HTTP status ${res.status} for chunk:`, chunk);
        continue;
      }
      const json = await res.json();
      if (json && json.success && json.data) {
        Object.keys(json.data).forEach(appId => {
          const item = json.data[appId];
          if (!item) return;
          const normalized = {
            appId: appId,
            title: item.title || "",
            url: item.url || "",
            currentRetail: item.prices?.currentRetail !== null && item.prices?.currentRetail !== undefined && item.prices?.currentRetail !== "" ? Number(item.prices.currentRetail) : null,
            currentKeyshops: item.prices?.currentKeyshops !== null && item.prices?.currentKeyshops !== undefined && item.prices?.currentKeyshops !== "" ? Number(item.prices.currentKeyshops) : null,
            historicalRetail: item.prices?.historicalRetail !== null && item.prices?.historicalRetail !== undefined && item.prices?.historicalRetail !== "" ? Number(item.prices.historicalRetail) : null,
            historicalKeyshops: item.prices?.historicalKeyshops !== null && item.prices?.historicalKeyshops !== undefined && item.prices?.historicalKeyshops !== "" ? Number(item.prices.historicalKeyshops) : null,
            currency: item.prices?.currency || (region === "eu" ? "EUR" : "USD"),
            fetchedAt: Date.now()
          };
          results[appId] = normalized;

          if (!state.sourcingSettings.liveGGDealsPrices) state.sourcingSettings.liveGGDealsPrices = {};
          state.sourcingSettings.liveGGDealsPrices[appId] = normalized;
        });
      }
    } catch (err) {
      console.warn(`[GG.deals API] Fetch error for chunk ${chunk.join(",")}:`, err.message);
    }
  }

  return results;
};

/**
 * Validates a GG.deals API token by querying a live benchmark game (Cyberpunk 2077).
 */
window.testGGDealsConnection = async function(customToken, customRegion, customProxyUrl) {
  const token = (customToken || state.sourcingSettings?.ggdealsToken || "").trim();
  if (!token) {
    return { success: false, message: "Please provide a GG.deals API token." };
  }

  const region = (customRegion || state.sourcingSettings?.ggdealsRegion || "us").toLowerCase();
  const proxyUrl = (customProxyUrl && customProxyUrl.trim()) ? customProxyUrl.trim() : (state.sourcingSettings?.ggdealsProxyUrl || state.sourcingSettings?.kinguinProxyUrl || "").trim();
  const rawUrl = `https://api.gg.deals/v1/prices/by-steam-app-id/?ids=1091500&key=${encodeURIComponent(token)}&region=${encodeURIComponent(region)}`;
  const requestUrl = getGGDealsRequestUrl(rawUrl, proxyUrl);

  try {
    const res = await fetch(requestUrl);
    if (res.ok) {
      const json = await res.json();
      if (json && json.success && json.data && json.data["1091500"]) {
        const item = json.data["1091500"];
        const curr = item.prices?.currency || (region === "eu" ? "EUR" : "USD");
        const currSym = curr === "EUR" ? "€" : (curr === "GBP" ? "£" : "$");
        const keyshopStr = item.prices?.currentKeyshops ? `${currSym}${item.prices.currentKeyshops}` : "N/A";
        const retailStr = item.prices?.currentRetail ? `${currSym}${item.prices.currentRetail}` : "N/A";

        return {
          success: true,
          message: `Connected successfully to GG.deals API! Verified live lookup of "${item.title}": Lowest Keyshops: ${keyshopStr} | Official Retail: ${retailStr} (${curr}).`,
          data: item
        };
      }
      return { success: false, message: "GG.deals returned a valid response but no sample game data was found." };
    }

    if (res.status === 400) {
      return {
        success: false,
        message: "Authentication failed (400 Invalid Token). Please ensure your personal token from gg.deals/api/ is copied correctly."
      };
    }

    if (res.status === 429) {
      return {
        success: false,
        message: "Rate limit exceeded (429). Standard GG.deals community API limits are 1,000 requests per hour."
      };
    }

    return { success: false, message: `GG.deals API returned unexpected HTTP status: ${res.status}.` };
  } catch (err) {
    if (!proxyUrl) {
      return {
        success: false,
        isCorsError: true,
        message: "Browser CORS Restriction: GG.deals direct API gateway blocks browser origins ('Failed to fetch'). A CORS relay is required. You can reuse your Cloudflare Worker relay proxy configured in Kinguin Settings, or enter one above."
      };
    }
    return {
      success: false,
      message: `Proxy request failed: ${err.message}. Please verify your CORS Proxy URL.`
    };
  }
};

/**
 * Initializes GG.deals UI states in Settings and Sourcing Radar.
 */
window.initGGDealsConnection = function() {
  const token = state.sourcingSettings?.ggdealsToken || "";
  const region = state.sourcingSettings?.ggdealsRegion || "us";
  const proxyUrl = state.sourcingSettings?.ggdealsProxyUrl || "";

  const tokenInput = document.getElementById("settings-ggdeals-token");
  const regionSelect = document.getElementById("settings-ggdeals-region");
  const proxyInput = document.getElementById("settings-ggdeals-proxyurl");
  const statusBadge = document.getElementById("ggdeals-connection-status");
  const radarBadge = document.getElementById("sourcing-ggdeals-api-badge");
  const radarLabel = document.getElementById("sourcing-ggdeals-api-label");

  if (tokenInput && !tokenInput.value) tokenInput.value = token;
  if (regionSelect) regionSelect.value = region;
  if (proxyInput && !proxyInput.value) proxyInput.value = proxyUrl;

  if (statusBadge) {
    if (token) {
      statusBadge.textContent = "Configured";
      statusBadge.className = "badge badge-in-stock";
      statusBadge.style.backgroundColor = "var(--accent-emerald, #10b981)";
    } else {
      statusBadge.textContent = "Not Configured";
      statusBadge.className = "badge badge-sold";
      statusBadge.style.backgroundColor = "";
    }
  }

  if (radarBadge && radarLabel) {
    if (token) {
      radarBadge.style.background = "rgba(34, 197, 94, 0.15)";
      radarBadge.style.color = "#22c55e";
      radarBadge.style.borderColor = "rgba(34, 197, 94, 0.4)";
      radarBadge.title = `Live GG.deals API Connected (${region.toUpperCase()})`;
      radarLabel.textContent = `GG.deals Live API Active (${region.toUpperCase()})`;
    } else {
      radarBadge.style.background = "rgba(34, 197, 94, 0.08)";
      radarBadge.style.color = "var(--text-muted)";
      radarBadge.style.borderColor = "rgba(255, 255, 255, 0.15)";
      radarBadge.title = "Click to configure GG.deals API in Settings";
      radarLabel.textContent = "Connect GG.deals API";
    }
  }
};

/**
 * Binds event listeners for GG.deals Settings controls.
 */
window.bindGGDealsSettingsControls = function() {
  const btnToggleVis = document.getElementById("btn-toggle-ggdeals-key-vis");
  const tokenInput = document.getElementById("settings-ggdeals-token");
  const regionSelect = document.getElementById("settings-ggdeals-region");
  const proxyInput = document.getElementById("settings-ggdeals-proxyurl");
  const btnSave = document.getElementById("btn-save-ggdeals-api");
  const btnTest = document.getElementById("btn-test-ggdeals-api");
  const feedback = document.getElementById("ggdeals-test-feedback");
  const statusBadge = document.getElementById("ggdeals-connection-status");

  // Toggle token visibility
  if (btnToggleVis && tokenInput) {
    btnToggleVis.addEventListener("click", () => {
      const isPass = tokenInput.type === "password";
      tokenInput.type = isPass ? "text" : "password";
      btnToggleVis.innerHTML = isPass ? `<i class="fa-regular fa-eye-slash"></i>` : `<i class="fa-regular fa-eye"></i>`;
    });
  }

  // Save GG.deals Settings
  if (btnSave) {
    btnSave.addEventListener("click", async () => {
      const tokenVal = tokenInput ? tokenInput.value.trim() : "";
      const regionVal = regionSelect ? regionSelect.value : "us";
      const proxyVal = proxyInput ? proxyInput.value.trim() : "";

      if (!state.sourcingSettings) state.sourcingSettings = {};
      state.sourcingSettings.ggdealsToken = tokenVal;
      state.sourcingSettings.ggdealsRegion = regionVal;
      state.sourcingSettings.ggdealsProxyUrl = proxyVal;

      if (typeof saveSecondaryTablesToStorage === "function") saveSecondaryTablesToStorage();
      if (window.supabaseClient && typeof dbSaveSettings === "function") {
        await dbSaveSettings("sourcingSettings", state.sourcingSettings);
      }

      if (typeof showToast === "function") {
        showToast("GG.deals API settings saved!", "success");
      }
      if (typeof logActionNotification === "function") {
        logActionNotification(tokenVal ? `Configured GG.deals API token (${regionVal.toUpperCase()})` : "Cleared GG.deals API token");
      }

      window.initGGDealsConnection();
    });
  }

  // Test GG.deals Connection
  if (btnTest) {
    btnTest.addEventListener("click", async () => {
      const tokenVal = tokenInput ? tokenInput.value.trim() : "";
      const regionVal = regionSelect ? regionSelect.value : "us";
      const proxyVal = proxyInput ? proxyInput.value.trim() : "";

      if (!tokenVal) {
        if (typeof showToast === "function") showToast("Please paste your GG.deals API token first.", "warning");
        if (feedback) {
          feedback.style.display = "block";
          feedback.style.background = "rgba(255, 153, 0, 0.1)";
          feedback.style.border = "1px solid var(--accent-warning)";
          feedback.style.color = "var(--text-main)";
          feedback.innerHTML = `<i class="fa-solid fa-triangle-exclamation" style="color: var(--accent-warning); margin-right: 6px;"></i> Please enter an API token to test.`;
        }
        return;
      }

      const originalBtnText = btnTest.innerHTML;
      btnTest.disabled = true;
      btnTest.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Testing GG.deals API...`;

      if (feedback) {
        feedback.style.display = "block";
        feedback.style.background = "rgba(34, 197, 94, 0.08)";
        feedback.style.border = "1px solid rgba(34, 197, 94, 0.4)";
        feedback.style.color = "var(--text-main)";
        feedback.innerHTML = `<i class="fa-solid fa-arrows-rotate fa-spin" style="color: #22c55e; margin-right: 6px;"></i> Querying GG.deals API Gateway...`;
      }

      try {
        const result = await window.testGGDealsConnection(tokenVal, regionVal, proxyVal);
        if (result.success) {
          if (feedback) {
            feedback.style.background = "rgba(16, 185, 129, 0.12)";
            feedback.style.border = "1px solid var(--accent-emerald)";
            feedback.style.color = "var(--text-main)";
            feedback.innerHTML = `<i class="fa-solid fa-circle-check" style="color: var(--accent-emerald); margin-right: 6px;"></i> ${result.message}`;
          }
          if (statusBadge) {
            statusBadge.textContent = "Connected";
            statusBadge.className = "badge badge-in-stock";
            statusBadge.style.backgroundColor = "var(--accent-emerald, #10b981)";
          }
          if (typeof showToast === "function") showToast("GG.deals API Connection Verified!", "success");
        } else {
          if (feedback) {
            feedback.style.background = result.isCorsError ? "rgba(255, 153, 0, 0.12)" : "rgba(244, 67, 54, 0.12)";
            feedback.style.border = result.isCorsError ? "1px solid var(--accent-warning)" : "1px solid var(--accent-danger)";
            feedback.style.color = "var(--text-main)";
            feedback.innerHTML = `<i class="fa-solid ${result.isCorsError ? 'fa-triangle-exclamation text-warning' : 'fa-circle-xmark text-danger'}" style="margin-right: 6px;"></i> ${result.message}`;
          }
          if (statusBadge) {
            statusBadge.textContent = result.isCorsError ? "CORS Required" : "Error";
            statusBadge.className = "badge badge-sold";
            statusBadge.style.backgroundColor = result.isCorsError ? "var(--accent-warning, #ff9900)" : "var(--accent-danger, #f44336)";
          }
          if (typeof showToast === "function") showToast(result.isCorsError ? "Browser CORS proxy required." : "GG.deals Connection Failed.", result.isCorsError ? "warning" : "error");
        }
      } catch (ex) {
        if (feedback) {
          feedback.style.background = "rgba(244, 67, 54, 0.12)";
          feedback.style.border = "1px solid var(--accent-danger)";
          feedback.innerHTML = `<i class="fa-solid fa-circle-xmark" style="color: var(--accent-danger); margin-right: 6px;"></i> Test error: ${ex.message}`;
        }
      } finally {
        btnTest.disabled = false;
        btnTest.innerHTML = originalBtnText;
      }
    });
  }
};

// ==========================================================================
// G2A MERCHANT API INTEGRATION (DIRECT MARKETPLACE & DUAL ARBITRAGE)
// ==========================================================================

/**
 * Formats request URL through an optional CORS relay proxy for G2A calls.
 * Falls back to Kinguin/GG.deals proxy if no specific G2A proxy is set.
 */
function getG2ARequestUrl(targetUrl, customProxyUrl) {
  const proxy = (customProxyUrl && customProxyUrl.trim()) 
    ? customProxyUrl.trim() 
    : (state.sourcingSettings?.g2aProxyUrl || state.sourcingSettings?.kinguinProxyUrl || "").trim();
  if (!proxy) return targetUrl;
  if (proxy.includes("?url=") || proxy.endsWith("?url=")) {
    return proxy + encodeURIComponent(targetUrl);
  }
  if (proxy.endsWith("/")) {
    return proxy + targetUrl;
  }
  return proxy + "/" + targetUrl;
}

/**
 * Retrieves an OAuth2 Bearer token from G2A using client credentials grant.
 * Caches token in memory until expiration.
 */
window.getG2AAccessToken = async function(customClientId, customClientSecret, customApiUrl, customProxyUrl) {
  const clientId = (customClientId || state.sourcingSettings?.g2aClientId || "").trim();
  const clientSecret = (customClientSecret || state.sourcingSettings?.g2aClientSecret || "").trim();
  const apiUrl = (customApiUrl || state.sourcingSettings?.g2aApiUrl || "https://api.g2a.com").trim().replace(/\/+$/, "");

  if (!clientId || !clientSecret) return null;

  // Check cached token
  const cached = state.sourcingSettings?._g2aTokenCache;
  if (cached && cached.token && cached.expiresAt && Date.now() < cached.expiresAt) {
    return cached.token;
  }

  const rawTokenUrl = `${apiUrl}/oauth/token`;
  const requestUrl = getG2ARequestUrl(rawTokenUrl, customProxyUrl);
  const bodyParams = new URLSearchParams();
  bodyParams.append("grant_type", "client_credentials");
  bodyParams.append("client_id", clientId);
  bodyParams.append("client_secret", clientSecret);

  try {
    const res = await fetch(requestUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: bodyParams.toString()
    });

    if (!res.ok) {
      console.warn(`[G2A API] OAuth token request failed with status: ${res.status}`);
      return null;
    }

    const data = await res.json();
    if (data && data.access_token) {
      const expiresIn = Number(data.expires_in) || 3600;
      if (!state.sourcingSettings) state.sourcingSettings = {};
      state.sourcingSettings._g2aTokenCache = {
        token: data.access_token,
        expiresAt: Date.now() + (expiresIn - 60) * 1000
      };
      return data.access_token;
    }
    return null;
  } catch (err) {
    console.error("[G2A API] Error requesting OAuth token:", err);
    throw err;
  }
};

/**
 * Validates G2A Client ID & Client Secret by obtaining an OAuth2 Bearer token
 * and querying a catalog verification endpoint.
 */
window.testG2AConnection = async function(customClientId, customClientSecret, customApiUrl, customProxyUrl) {
  const clientId = (customClientId || state.sourcingSettings?.g2aClientId || "").trim();
  const clientSecret = (customClientSecret || state.sourcingSettings?.g2aClientSecret || "").trim();
  const apiUrl = (customApiUrl || state.sourcingSettings?.g2aApiUrl || "https://api.g2a.com").trim().replace(/\/+$/, "");
  const proxyUrl = (customProxyUrl && customProxyUrl.trim()) ? customProxyUrl.trim() : (state.sourcingSettings?.g2aProxyUrl || state.sourcingSettings?.kinguinProxyUrl || "").trim();

  if (!clientId || !clientSecret) {
    return { success: false, message: "Please provide both G2A Client ID and Client Secret." };
  }

  try {
    // Step 1: OAuth2 Token Exchange
    const rawTokenUrl = `${apiUrl}/oauth/token`;
    const tokenRequestUrl = getG2ARequestUrl(rawTokenUrl, proxyUrl);
    const bodyParams = new URLSearchParams();
    bodyParams.append("grant_type", "client_credentials");
    bodyParams.append("client_id", clientId);
    bodyParams.append("client_secret", clientSecret);

    const tokenRes = await fetch(tokenRequestUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: bodyParams.toString()
    });

    if (tokenRes.status === 401 || tokenRes.status === 400) {
      return {
        success: false,
        message: "Authentication failed (400/401 Invalid Client). Please ensure your G2A Client ID and Client Secret are copied correctly from G2A API Integration panel."
      };
    }

    if (!tokenRes.ok) {
      return {
        success: false,
        message: `G2A OAuth token endpoint returned HTTP status: ${tokenRes.status}.`
      };
    }

    const tokenData = await tokenRes.json();
    const token = tokenData.access_token;
    if (!token) {
      return { success: false, message: "G2A did not return an access_token in the OAuth response." };
    }

    // Cache valid token
    if (!state.sourcingSettings) state.sourcingSettings = {};
    state.sourcingSettings._g2aTokenCache = {
      token: token,
      expiresAt: Date.now() + ((Number(tokenData.expires_in) || 3600) - 60) * 1000
    };

    // Step 2: Test query catalog or products
    const rawCatalogUrl = `${apiUrl}/export/v1/products?page=1`;
    const catalogRequestUrl = getG2ARequestUrl(rawCatalogUrl, proxyUrl);
    const catalogRes = await fetch(catalogRequestUrl, {
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      }
    });

    let extraInfo = "";
    if (catalogRes.ok) {
      const catalogData = await catalogRes.json();
      if (catalogData && catalogData.total !== undefined) {
        extraInfo = ` Access verified across ${Number(catalogData.total).toLocaleString()} products.`;
      }
    }

    return {
      success: true,
      message: `Connected successfully to G2A API! OAuth2 Client Credentials verified.${extraInfo} Environment: ${apiUrl}.`
    };
  } catch (err) {
    if (!proxyUrl) {
      return {
        success: false,
        isCorsError: true,
        message: "Browser CORS Restriction: G2A API blocks browser direct origins ('Failed to fetch'). A CORS relay proxy is required. <a href='javascript:void(0)' onclick='window.openCorsGuideModal && window.openCorsGuideModal()' style='color: #0070d2; text-decoration: underline; font-weight: 600; margin-left: 4px;'>Setup Free Cloudflare Proxy (2 mins) &rarr;</a>"
      };
    }
    return {
      success: false,
      message: `Proxy request failed: ${err.message}. Please verify your CORS Proxy URL and G2A API URL.`
    };
  }
};

/**
 * Initializes G2A API UI states in Settings and Sourcing Radar.
 */
window.initG2AConnection = function() {
  const clientId = state.sourcingSettings?.g2aClientId || "";
  const clientSecret = state.sourcingSettings?.g2aClientSecret || "";
  const apiUrl = state.sourcingSettings?.g2aApiUrl || "https://api.g2a.com";
  const proxyUrl = state.sourcingSettings?.g2aProxyUrl || "";

  const idInput = document.getElementById("settings-g2a-clientid");
  const secretInput = document.getElementById("settings-g2a-clientsecret");
  const urlSelect = document.getElementById("settings-g2a-apiurl");
  const proxyInput = document.getElementById("settings-g2a-proxyurl");
  const statusBadge = document.getElementById("g2a-connection-status");
  const radarBadge = document.getElementById("sourcing-g2a-api-badge");
  const radarLabel = document.getElementById("sourcing-g2a-api-label");

  if (idInput && !idInput.value) idInput.value = clientId;
  if (secretInput && !secretInput.value) secretInput.value = clientSecret;
  if (urlSelect) urlSelect.value = apiUrl;
  if (proxyInput && !proxyInput.value) proxyInput.value = proxyUrl;

  const isConfigured = !!(clientId && clientSecret);

  if (statusBadge) {
    if (isConfigured) {
      statusBadge.textContent = "Configured";
      statusBadge.className = "badge badge-in-stock";
      statusBadge.style.backgroundColor = "var(--accent-emerald, #10b981)";
    } else {
      statusBadge.textContent = "Not Configured";
      statusBadge.className = "badge badge-sold";
      statusBadge.style.backgroundColor = "";
    }
  }

  if (radarBadge && radarLabel) {
    if (isConfigured) {
      radarBadge.style.background = "rgba(0, 112, 210, 0.15)";
      radarBadge.style.color = "#0070d2";
      radarBadge.style.borderColor = "rgba(0, 112, 210, 0.4)";
      radarBadge.title = `Live G2A API Connected (${apiUrl.includes('sandbox') ? 'Sandbox' : 'Production'})`;
      radarLabel.textContent = "G2A Live API Active";
    } else {
      radarBadge.style.background = "rgba(0, 112, 210, 0.12)";
      radarBadge.style.color = "#0070d2";
      radarBadge.style.borderColor = "rgba(0, 112, 210, 0.35)";
      radarBadge.title = "Click to configure G2A Merchant API";
      radarLabel.textContent = "Connect G2A API";
    }
  }
};

/**
 * Binds event listeners for G2A Settings controls.
 */
window.bindG2ASettingsControls = function() {
  const btnToggleVis = document.getElementById("btn-toggle-g2a-secret-vis");
  const idInput = document.getElementById("settings-g2a-clientid");
  const secretInput = document.getElementById("settings-g2a-clientsecret");
  const urlSelect = document.getElementById("settings-g2a-apiurl");
  const proxyInput = document.getElementById("settings-g2a-proxyurl");
  const btnSave = document.getElementById("btn-save-g2a-api");
  const btnTest = document.getElementById("btn-test-g2a-api");
  const feedback = document.getElementById("g2a-test-feedback");
  const statusBadge = document.getElementById("g2a-connection-status");

  // Toggle secret visibility
  if (btnToggleVis && secretInput) {
    btnToggleVis.addEventListener("click", () => {
      const isPass = secretInput.type === "password";
      secretInput.type = isPass ? "text" : "password";
      btnToggleVis.innerHTML = isPass ? `<i class="fa-regular fa-eye-slash"></i>` : `<i class="fa-regular fa-eye"></i>`;
    });
  }

  // Save G2A Settings
  if (btnSave) {
    btnSave.addEventListener("click", async () => {
      const idVal = idInput ? idInput.value.trim() : "";
      const secretVal = secretInput ? secretInput.value.trim() : "";
      const urlVal = urlSelect ? urlSelect.value.trim() : "https://api.g2a.com";
      const proxyVal = proxyInput ? proxyInput.value.trim() : "";

      if (!state.sourcingSettings) state.sourcingSettings = {};
      state.sourcingSettings.g2aClientId = idVal;
      state.sourcingSettings.g2aClientSecret = secretVal;
      state.sourcingSettings.g2aApiUrl = urlVal;
      state.sourcingSettings.g2aProxyUrl = proxyVal;
      // Invalidate cached token when credentials change
      delete state.sourcingSettings._g2aTokenCache;

      if (typeof saveSecondaryTablesToStorage === "function") saveSecondaryTablesToStorage();
      if (window.supabaseClient && typeof dbSaveSettings === "function") {
        await dbSaveSettings("sourcingSettings", state.sourcingSettings);
      }

      if (typeof showToast === "function") {
        showToast("G2A Merchant API settings saved!", "success");
      }
      if (typeof logActionNotification === "function") {
        logActionNotification(idVal ? `Configured G2A API Credentials (Client ID: ${idVal})` : "Cleared G2A API Credentials");
      }

      window.initG2AConnection();
    });
  }

  // Test G2A Connection
  if (btnTest) {
    btnTest.addEventListener("click", async () => {
      const idVal = idInput ? idInput.value.trim() : "";
      const secretVal = secretInput ? secretInput.value.trim() : "";
      const urlVal = urlSelect ? urlSelect.value.trim() : "https://api.g2a.com";
      const proxyVal = proxyInput ? proxyInput.value.trim() : "";

      if (!idVal || !secretVal) {
        if (typeof showToast === "function") showToast("Please enter both Client ID and Client Secret.", "warning");
        if (feedback) {
          feedback.style.display = "block";
          feedback.style.background = "rgba(255, 153, 0, 0.1)";
          feedback.style.border = "1px solid var(--accent-warning)";
          feedback.style.color = "var(--text-main)";
          feedback.innerHTML = `<i class="fa-solid fa-triangle-exclamation" style="color: var(--accent-warning); margin-right: 6px;"></i> Please enter both Client ID and Client Secret to test.`;
        }
        return;
      }

      const originalBtnText = btnTest.innerHTML;
      btnTest.disabled = true;
      btnTest.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Testing G2A API...`;

      if (feedback) {
        feedback.style.display = "block";
        feedback.style.background = "rgba(0, 112, 210, 0.08)";
        feedback.style.border = "1px solid rgba(0, 112, 210, 0.4)";
        feedback.style.color = "var(--text-main)";
        feedback.innerHTML = `<i class="fa-solid fa-arrows-rotate fa-spin" style="color: #0070d2; margin-right: 6px;"></i> Querying G2A OAuth2 Gateway...`;
      }

      try {
        const result = await window.testG2AConnection(idVal, secretVal, urlVal, proxyVal);
        if (result.success) {
          if (feedback) {
            feedback.style.background = "rgba(16, 185, 129, 0.12)";
            feedback.style.border = "1px solid var(--accent-emerald)";
            feedback.style.color = "var(--text-main)";
            feedback.innerHTML = `<i class="fa-solid fa-circle-check" style="color: var(--accent-emerald); margin-right: 6px;"></i> ${result.message}`;
          }
          if (statusBadge) {
            statusBadge.textContent = "Connected";
            statusBadge.className = "badge badge-in-stock";
            statusBadge.style.backgroundColor = "var(--accent-emerald, #10b981)";
          }
          if (typeof showToast === "function") showToast("G2A API Connection Verified!", "success");
        } else {
          if (feedback) {
            feedback.style.background = result.isCorsError ? "rgba(255, 153, 0, 0.12)" : "rgba(244, 67, 54, 0.12)";
            feedback.style.border = result.isCorsError ? "1px solid var(--accent-warning)" : "1px solid var(--accent-danger)";
            feedback.style.color = "var(--text-main)";
            feedback.innerHTML = `<i class="fa-solid ${result.isCorsError ? 'fa-triangle-exclamation text-warning' : 'fa-circle-xmark text-danger'}" style="margin-right: 6px;"></i> ${result.message}`;
          }
          if (statusBadge) {
            statusBadge.textContent = result.isCorsError ? "CORS Required" : "Error";
            statusBadge.className = "badge badge-sold";
            statusBadge.style.backgroundColor = result.isCorsError ? "var(--accent-warning, #ff9900)" : "var(--accent-danger, #f44336)";
          }
          if (typeof showToast === "function") showToast(result.isCorsError ? "Browser CORS proxy required." : "G2A Connection Failed.", result.isCorsError ? "warning" : "error");
        }
      } catch (ex) {
        if (feedback) {
          feedback.style.background = "rgba(244, 67, 54, 0.12)";
          feedback.style.border = "1px solid var(--accent-danger)";
          feedback.innerHTML = `<i class="fa-solid fa-circle-xmark" style="color: var(--accent-danger); margin-right: 6px;"></i> Test error: ${ex.message}`;
        }
      } finally {
        btnTest.disabled = false;
        btnTest.innerHTML = originalBtnText;
      }
    });
  }
};

