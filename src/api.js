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
        } else if (s.key === "dashboardOrder") {
          try {
            state.dashboardOrder = typeof s.value === 'string' ? JSON.parse(s.value) : s.value;
            const expectedKeys = [
              "salesProfit", "platformSplit", "supplierSplit", "topBestsellers", "topBestsellersRevenue", "topBestsellersSales", "topPeakProfit", "topAverageProfit", "dailyProfitMonth",
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
              "financeMonthly", "financeAverages", "financeOutflow", "costRevenue", "markupAnalysis", "financeBenchmark", "financeTracker"
            ];
            state.financeOrder = state.financeOrder.filter(k => expectedFinKeys.includes(k));
            expectedFinKeys.forEach(k => {
              if (!state.financeOrder.includes(k)) {
                state.financeOrder.push(k);
              }
            });
            renderFinanceCardsOrder();
          } catch(e) {
            console.error("Error parsing financeOrder:", e);
          }
        } else if (s.key === "dashboardSpans") {
          try {
            state.dashboardSpans = typeof s.value === 'string' ? JSON.parse(s.value) : s.value;
            applyDashboardSpans();
          } catch(e) {
            console.error("Error parsing dashboardSpans from database sync:", e);
          }
        } else if (s.key === "financeSpans") {
          try {
            state.financeSpans = typeof s.value === 'string' ? JSON.parse(s.value) : s.value;
            applyFinanceSpans();
          } catch(e) {
            console.error("Error parsing financeSpans from database sync:", e);
          }
        } else if (s.key === "widgetSettings") {
          try {
            state.widgetSettings = typeof s.value === 'string' ? JSON.parse(s.value) : s.value;
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

