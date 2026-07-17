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
function initSupabaseConnection() {
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
      dbLoadState();
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
            renderDashboardCardsOrder();
          } catch(e) {
            console.error("Error parsing dashboardOrder:", e);
          }
        } else if (s.key === "financeOrder") {
          try {
            state.financeOrder = typeof s.value === 'string' ? JSON.parse(s.value) : s.value;
            const expectedFinKeys = [
              "financeMonthly", "financeAverages", "financeOutflow", "costRevenue", "markupAnalysis", "financeBenchmark"
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
      disputed: sale.disputed === true,
      supplierRefunded: sale.supplierRefunded === true
    };
    
    let { error } = await window.supabaseClient
      .from('sales')
      .upsert(payload);
      
    if (error) {
      if (error.message && error.message.includes('column "supplierRefunded" of relation "sales" does not exist')) {
        console.warn("Supabase relation 'sales' is missing the 'supplierRefunded' column. Retrying without it.");
        delete payload.supplierRefunded;
        const res = await window.supabaseClient.from('sales').upsert(payload);
        error = res.error;
      }
      if (error && error.message && error.message.includes('column "disputed" of relation "sales" does not exist')) {
        console.warn("Supabase relation 'sales' is missing the 'disputed' column. Retrying without it. Please update database schema using settings setup wizard.");
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
    
    // Attempt 2 Fallback: Steam Search via corsproxy.io
    if (!matches || matches.length === 0) {
      try {
        const steamUrl = `https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(searchTerm)}&l=english&cc=US`;
        const response = await fetch(`https://corsproxy.io/?${steamUrl}`);
        if (response.ok) {
          const data = await response.json();
          if (data && data.items && data.items.length > 0) {
            matches = data.items.map(item => ({
              steamAppID: item.id ? item.id.toString() : null,
              external: item.name,
              thumb: item.tiny_image
            }));
          }
        }
      } catch (err) {
        console.warn("Steam fallback fetch failed:", err);
      }
    }
    
    if (matches && matches.length > 0) {
      const match = matches.find(m => m.steamAppID && m.steamAppID !== "0") || matches[0];
      let imageUrl = "";
      
      if (match.steamAppID && match.steamAppID !== "0") {
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

