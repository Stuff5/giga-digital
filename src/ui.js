/**
 * GameVault - User Interface Renderers & Routers (ui.js)
 */

// Asynchronously loads external HTML templates and injects them into placeholder containers
window.loadHTMLTemplates = async () => {
  const templates = [
    { url: "templates/modals.html", targetId: "modals-placeholder" },
    { url: "templates/help-modal.html", targetId: "help-modal-placeholder" }
  ];
  
  await Promise.all(templates.map(async t => {
    try {
      // Use version and timestamp cache-busting to ensure fresh HTML templates are loaded
      const ver = window.APP_VERSION || "v1.8.1";
      const res = await fetch(`${t.url}?v=${ver}&t=${Date.now()}`);
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const html = await res.text();
      const placeholder = document.getElementById(t.targetId);
      if (placeholder) {
        placeholder.innerHTML = html;
      }
    } catch (err) {
      console.error(`Failed to load template ${t.url}:`, err);
      // Fallback placeholder content in case of local file CORS blocks
      const placeholder = document.getElementById(t.targetId);
      if (placeholder && !placeholder.innerHTML.trim()) {
        placeholder.innerHTML = `<div style="padding: 20px; color: var(--accent-danger); text-align: center; border: 1px dashed var(--border-color); border-radius: 8px; margin: 10px;">Offline Local CORS Alert: Failed to load ${t.url}. If running locally, please run a web server (e.g. using VSCode Live Server or python -m http.server) or upload to GitHub Pages.</div>`;
      }
    }
  }));
};

// Generate unique dynamic gradient background based on string characters
window.getHashGradient = function(str) {
  if (!str) return 'linear-gradient(135deg, var(--accent-purple), var(--accent-cyan))';
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h1 = Math.abs(hash % 360);
  const h2 = (h1 + 45) % 360;
  return `linear-gradient(135deg, hsl(${h1}, 70%, 40%) 0%, hsl(${h2}, 75%, 30%) 100%)`;
};

// Generate horizontal mini progress bar visualizer for percentage values (ROI/Margin)
window.getMiniMarginBar = function(val) {
  const capVal = Math.min(100, Math.max(-100, val));
  const isPositive = capVal >= 0;
  const barColor = isPositive ? 'var(--accent-emerald, #10b981)' : 'var(--accent-danger, #ff4d4d)';
  const widthPercent = Math.abs(capVal);
  
  return `
    <div style="font-size: 0.8rem; display: flex; flex-direction: column; gap: 4px; width: 100%; min-width: 75px;">
      <div style="display: flex; justify-content: space-between; align-items: center; line-height: 1;">
        <span class="${isPositive ? 'text-success-neon' : 'text-danger-soft'}" style="font-weight: 600;">${isPositive ? '+' : ''}${val.toFixed(1)}%</span>
      </div>
      <div style="height: 3px; width: 100%; background: rgba(255,255,255,0.06); border-radius: 2px; overflow: hidden; position: relative;">
        <div style="height: 100%; width: ${widthPercent}%; background: ${barColor}; border-radius: 2px; margin-left: ${isPositive ? '0' : 'auto'};"></div>
      </div>
    </div>
  `;
};

// Load data from LocalStorage
function cleanupEmptyDatabaseRows() {
  try {
    const initialInvLength = state.inventory.length;
    
    // An item is invalid if it has no title or title is completely blank (key is optional)
    state.inventory = state.inventory.filter(item => {
      if (!item) return false;
      const title = String(item.title || "").trim();
      // Keep rows that have a title (key can be blank/optional)
      if (title === "") return false;
      if (!item.key) item.key = "NO-KEY";
      return true;
    });

    const initialSalesLength = state.sales.length;
    // Keep valid sales (either associated with an existing inventory item or with a valid title)
    const validInvIds = new Set(state.inventory.map(item => item.id));
    state.sales = state.sales.filter(sale => {
      if (!sale) return false;
      if (!sale.title || String(sale.title).trim() === "") return false;
      return sale.inventoryId ? validInvIds.has(sale.inventoryId) : true;
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
  logActionNotification("Undid last action");
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
  logActionNotification("Redid last action");
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
  const secRecovery = document.getElementById("auth-recovery-section");

  if (tab === "login") {
    if (tabLogin) tabLogin.classList.add("active");
    if (tabRegister) tabRegister.classList.remove("active");
    if (secLogin) secLogin.classList.add("active");
    if (secRegister) secRegister.classList.remove("active");
    if (sec2fa) sec2fa.classList.remove("active");
    if (secRecovery) secRecovery.classList.remove("active");
  } else if (tab === "register") {
    if (tabRegister) tabRegister.classList.add("active");
    if (tabLogin) tabLogin.classList.remove("active");
    if (secRegister) secRegister.classList.add("active");
    if (secLogin) secLogin.classList.remove("active");
    if (sec2fa) sec2fa.classList.remove("active");
    if (secRecovery) secRecovery.classList.remove("active");
  } else if (tab === "2fa") {
    if (tabLogin) tabLogin.classList.remove("active");
    if (tabRegister) tabRegister.classList.remove("active");
    if (secLogin) secLogin.classList.remove("active");
    if (secRegister) secRegister.classList.remove("active");
    if (sec2fa) sec2fa.classList.add("active");
    if (secRecovery) secRecovery.classList.remove("active");
  } else if (tab === "recovery") {
    if (tabLogin) tabLogin.classList.remove("active");
    if (tabRegister) tabRegister.classList.remove("active");
    if (secLogin) secLogin.classList.remove("active");
    if (secRegister) secRegister.classList.remove("active");
    if (sec2fa) sec2fa.classList.remove("active");
    if (secRecovery) secRecovery.classList.add("active");
  }
};

window.handleForgotPassword = async function(e) {
  e.preventDefault();
  const username = document.getElementById("login-username").value.trim();
  if (!username) {
    showToast("Please enter your username first to retrieve your password.", "warning");
    return;
  }

  const email = getUserEmail(username);

  if (window.supabaseClient) {
    showToast("Sending Supabase recovery link...", "info");
    const { error } = await window.supabaseClient.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin
    });
    if (error) {
      showToast(`Supabase Recovery Failed: ${error.message}`, "error");
      window.logAuditAction("Recovery Failed", `Failed Supabase password reset request for '${username}': ${error.message}`);
    } else {
      showToast(`Password reset link sent to your email address: ${email}!`, "success");
      window.logAuditAction("Recovery Request", `Supabase password reset requested for '${username}'`);
    }
  } else if (window.firebaseApp && window.firebaseApp.auth) {
    showToast("Sending Firebase recovery link...", "info");
    try {
      await window.firebaseApp.auth().sendPasswordResetEmail(email);
      showToast(`Password reset link sent to your email address: ${email}!`, "success");
      window.logAuditAction("Recovery Request", `Firebase password reset requested for '${username}'`);
    } catch (error) {
      showToast(`Firebase Recovery Failed: ${error.message}`, "error");
      window.logAuditAction("Recovery Failed", `Failed Firebase password reset request for '${username}': ${error.message}`);
    }
  } else {
    // Local Fallback Simulation
    const users = getUsersFromStorage();
    const matchedUser = users.find(u => u.username.toLowerCase() === username.toLowerCase());
    if (!matchedUser) {
      showToast("Username not found.", "error");
      return;
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    state.pendingRecovery = {
      username: matchedUser.username,
      code: code
    };

    document.getElementById("recovery-username").value = matchedUser.username;
    switchAuthTab("recovery");
    showToast(`Recovery Code: ${code} (Sent to ${matchedUser.email})`, "info", 15000);
  }
};

window.handleRecoverySubmit = function(e) {
  e.preventDefault();
  try {
    const username = document.getElementById("recovery-username").value;
    const code = document.getElementById("recovery-code").value.trim();
    const newPassword = document.getElementById("recovery-new-password").value;
    const confirmPassword = document.getElementById("recovery-confirm-password").value;

    if (!state.pendingRecovery || state.pendingRecovery.username !== username) {
      showToast("Session expired. Please request recovery again.", "error");
      switchAuthTab("login");
      return;
    }

    if (code !== state.pendingRecovery.code) {
      showToast("Invalid verification code.", "error");
      return;
    }

    if (newPassword.length < 6) {
      showToast("Password must be at least 6 characters long.", "warning");
      return;
    }

    if (newPassword !== confirmPassword) {
      showToast("Passwords do not match.", "error");
      return;
    }

    const users = getUsersFromStorage();
    const user = users.find(u => u.username === username);
    if (!user) {
      showToast("User not found.", "error");
      return;
    }

    user.password = newPassword;
    saveUsersToStorage(users);

    state.pendingRecovery = null;
    document.getElementById("recovery-form").reset();

    window.logAuditAction("Password Reset", `Password reset completed for '${username}'`);

    showToast("Password reset successfully! Please sign in with your new password.", "success");
    switchAuthTab("login");
  } catch (err) {
    console.error("Password recovery failed:", err);
    showToast("An error occurred during password reset.", "error");
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
      role: "admin",
      twoFactorEnabled: false
    };
    arr.push(defaultAdmin);
  }

  // Ensure all users have a role assigned
  let needsSave = false;
  arr.forEach(u => {
    if (!u.role) {
      u.role = u.username.toLowerCase() === "admin" ? "admin" : "merchant";
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
    const hasCurrent = arr.some(u => u.username.toLowerCase() === state.currentUser.toLowerCase());
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

function getUserEmail(username) {
  if (username.includes("@")) {
    return username;
  }
  const users = getUsersFromStorage();
  const matchedUser = users.find(u => u.username.toLowerCase() === username.toLowerCase());
  if (matchedUser && matchedUser.email) {
    return matchedUser.email;
  }
  return `${username}@gamevault.local`;
}

// Helper to save users list
async function handleLoginSubmit(e) {
  e.preventDefault();
  try {
    const username = document.getElementById("login-username").value.trim();
    const password = document.getElementById("login-password").value;
    const remember = document.getElementById("login-remember").checked;

    if (!username || !password) {
      showToast("Please fill in all required fields.", "warning");
      return;
    }

    let authenticatedUser = null;
    let authMethod = "Local";

    if (window.supabaseClient) {
      // Supabase Auth
      const email = getUserEmail(username);
      showToast("Signing in via Supabase...", "info");
      const { data, error } = await window.supabaseClient.auth.signInWithPassword({
        email: email,
        password: password
      });
      if (error) {
        // Fallback to local auth check!
        const users = getUsersFromStorage();
        const matchedUser = users.find(u => u.username.toLowerCase() === username.toLowerCase());
        if (matchedUser && matchedUser.password === password) {
          authenticatedUser = matchedUser.username;
          authMethod = "Local (Supabase Auth Failed/Bypassed)";
          
          // Check if local user has 2FA enabled
          if (matchedUser.twoFactorEnabled) {
            const code = Math.floor(100000 + Math.random() * 900000).toString();
            state.pending2FA = {
              username: matchedUser.username,
              code: code,
              remember: remember
            };
            switchAuthTab("2fa");
            showToast(`2FA Required! Code: ${code} (Simulating SMS/App)`, "info", 15000);
            document.getElementById("login-password").value = "";
            return;
          }
        } else {
          showToast(`Supabase Auth Failed: ${error.message}`, "error");
          window.logAuditAction("Login Failed", `Failed Supabase sign in for '${username}': ${error.message}`);
          return;
        }
      } else {
        authenticatedUser = data.user.email.split("@")[0];
        authMethod = "Supabase";
      }
    } else if (window.firebaseApp && window.firebaseApp.auth) {
      // Firebase Auth
      const email = getUserEmail(username);
      showToast("Signing in via Firebase...", "info");
      try {
        const userCredential = await window.firebaseApp.auth().signInWithEmailAndPassword(email, password);
        authenticatedUser = userCredential.user.email.split("@")[0];
        authMethod = "Firebase";
      } catch (error) {
        // Fallback to local auth check!
        const users = getUsersFromStorage();
        const matchedUser = users.find(u => u.username.toLowerCase() === username.toLowerCase());
        if (matchedUser && matchedUser.password === password) {
          authenticatedUser = matchedUser.username;
          authMethod = "Local (Firebase Auth Failed/Bypassed)";
          
          // Check if local user has 2FA enabled
          if (matchedUser.twoFactorEnabled) {
            const code = Math.floor(100000 + Math.random() * 900000).toString();
            state.pending2FA = {
              username: matchedUser.username,
              code: code,
              remember: remember
            };
            switchAuthTab("2fa");
            showToast(`2FA Required! Code: ${code} (Simulating SMS/App)`, "info", 15000);
            document.getElementById("login-password").value = "";
            return;
          }
        } else {
          showToast(`Firebase Auth Failed: ${error.message}`, "error");
          window.logAuditAction("Login Failed", `Failed Firebase sign in for '${username}': ${error.message}`);
          return;
        }
      }
    } else {
      // Local Auth Fallback
      const users = getUsersFromStorage();
      const matchedUser = users.find(u => u.username.toLowerCase() === username.toLowerCase());

      if (!matchedUser || matchedUser.password !== password) {
        showToast("Invalid username or password.", "error");
        window.logAuditAction("Login Failed", `Failed local sign in attempt for username '${username}'`);
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
        document.getElementById("login-password").value = "";
        return;
      }
      authenticatedUser = matchedUser.username;
    }

    // Ensure the authenticated user has a local profile in gv_users
    const allUsers = getUsersFromStorage();
    let localUserObj = allUsers.find(u => u.username.toLowerCase() === authenticatedUser.toLowerCase());
    if (!localUserObj) {
      let emailVal = `${authenticatedUser}@gamevault.local`;
      if (authMethod === "Supabase" && typeof data !== "undefined" && data && data.user) {
        emailVal = data.user.email;
      } else if (authMethod === "Firebase" && typeof userCredential !== "undefined" && userCredential && userCredential.user) {
        emailVal = userCredential.user.email;
      }
      localUserObj = {
        username: authenticatedUser,
        email: emailVal,
        password: "", // Cloud-managed
        role: authenticatedUser.toLowerCase() === "admin" ? "admin" : "merchant",
        twoFactorEnabled: false
      };
      allUsers.push(localUserObj);
      localStorage.setItem("gv_users", JSON.stringify(allUsers));
    }

    // Set active session
    window.localStorage.removeItem("gv_local_logout");
    window.localStorage.setItem("gv_active_user", authenticatedUser);
    window.localStorage.setItem("gv_last_active_user", authenticatedUser);
    window.sessionStorage.removeItem("gv_active_user");

    // Set state and load data
    state.currentUser = authenticatedUser;
    loadStateFromStorage();
    
    // Re-initialize database connection for the authenticated user session
    if (typeof initSupabaseConnection === "function") initSupabaseConnection();
    if (typeof initFirebaseConnection === "function") initFirebaseConnection();
    
    window.logAuditAction("User Login", `Sign in succeeded for '${authenticatedUser}' via ${authMethod}`);

    // Transition to main dashboard
    const authContainer = document.getElementById("auth-container");
    const appContainer = document.getElementById("app-container");
    const logoutBtn = document.getElementById("btn-logout");

    if (authContainer) authContainer.classList.add("hidden");
    if (appContainer) appContainer.classList.remove("hidden");
    if (logoutBtn) logoutBtn.classList.remove("hidden");

    // Update sidebar display name
    const nameDisplay = document.getElementById("user-display-name");
    if (nameDisplay) nameDisplay.textContent = authenticatedUser;

    // Clear form inputs and any browser autofill values in search bars
    const loginForm = document.getElementById("login-form");
    if (loginForm) loginForm.reset();

    const globalSearch = document.getElementById("global-search");
    if (globalSearch) globalSearch.value = "";
    const invSearch = document.getElementById("inv-search-input");
    if (invSearch) invSearch.value = "";
    const salesSearch = document.getElementById("sales-search-input");
    if (salesSearch) salesSearch.value = "";
    const entriesSearch = document.getElementById("entries-search-input");
    if (entriesSearch) entriesSearch.value = "";

    // Draw UI & charts
    updateUI();
    showToast(`Welcome back, ${authenticatedUser}!`, "success");
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
      window.logAuditAction("2FA Failed", `Failed 2FA verification for '${username}'`);
      return;
    }

    const username = state.pending2FA.username;
    const remember = state.pending2FA.remember;

    // Set active session
    window.localStorage.removeItem("gv_local_logout");
    window.localStorage.setItem("gv_active_user", username);
    window.sessionStorage.removeItem("gv_active_user");

    // Clear pending state
    state.pending2FA = null;

    // Set state and load data
    state.currentUser = username;
    loadStateFromStorage();
    
    // Re-initialize database connection for the authenticated user session
    if (typeof initSupabaseConnection === "function") initSupabaseConnection();
    if (typeof initFirebaseConnection === "function") initFirebaseConnection();
    
    window.logAuditAction("User Login (2FA)", `Sign in (2FA passed) for '${username}'`);
    
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
    window.localStorage.removeItem("gv_local_logout");
    window.localStorage.setItem("gv_active_user", username);
    
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
async function handleAdminCreateUser(e) {
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
    const role = document.getElementById("admin-new-role")?.value || "merchant";

    // Attempt backend registration if connected
    if (window.supabaseClient) {
      showToast("Creating user credentials in Supabase...", "info");
      const { error } = await window.supabaseClient.auth.signUp({
        email: email,
        password: password,
        options: {
          data: { role: role }
        }
      });
      if (error) {
        showToast(`Warning: Supabase registration skipped: ${error.message}`, "warning");
      }
    } else if (window.firebaseApp && window.firebaseApp.auth) {
      showToast("Creating user credentials in Firebase...", "info");
      try {
        await window.firebaseApp.auth().createUserWithEmailAndPassword(email, password);
      } catch (error) {
        showToast(`Warning: Firebase registration skipped: ${error.message}`, "warning");
      }
    }

    const newUser = { username, email, password, role, twoFactorEnabled };
    users.push(newUser);
    saveUsersToStorage(users);
    window.logAuditAction("Create User", `Created account '${username}' with role '${role}'`);

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
    window.logAuditAction("Delete User", `Deleted account '${username}'`);
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
    window.logAuditAction("Toggle 2FA (Admin)", `Toggled 2FA for '${username}' to ${user.twoFactorEnabled ? 'Enabled' : 'Disabled'}`);
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
  const roleSelect = document.getElementById("edit-user-role");
  if (roleSelect) roleSelect.value = user.role || "merchant";
  
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

    const newRole = document.getElementById("edit-user-role")?.value || "merchant";

    // Update username/email/role in storage
    user.username = newUsername;
    user.email = newEmail;
    user.role = newRole;
    saveUsersToStorage(users);
    window.logAuditAction("Edit User", `Updated account details for '${newUsername}' (Role: ${newRole})`);

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
      window.localStorage.setItem("gv_active_user", newUsername);
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
  window.logAuditAction("User Logout", `Signed out session`);
  window.localStorage.removeItem("gv_active_user");
  window.sessionStorage.removeItem("gv_active_user");
  window.localStorage.setItem("gv_local_logout", "true");
  
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

    let badgeHtml = "";
    if (key === "sales") {
      const disputeCount = state.sales.filter(s => s.disputed === true).length;
      if (disputeCount > 0) {
        badgeHtml = `<span class="sidebar-dispute-badge badge-pulse" title="${disputeCount} active sales disputes">${disputeCount}</span>`;
      }
    }

    html += `
      <li>
        <a href="#${key}" class="nav-link ${activeClass}" id="nav-${key}" style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <i class="fa-solid ${iconClass}" id="sidebar-icon-${key}"></i>
            <span id="sidebar-text-${key}">${titleText}</span>
          </div>
          ${badgeHtml}
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
      <a href="#" class="nav-link" id="nav-collapse-sidebar" title="${collapseTitle}" style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <i class="fa-solid ${collapseIcon}" id="collapse-icon"></i>
          <span>Collapse Menu</span>
        </div>
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

  // Bind click listeners for general view-all links (like the Dashboard View Ledger link)
  document.querySelectorAll(".view-all-link").forEach(link => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const targetHash = link.getAttribute("href");
      const navLink = document.querySelector(`.nav-link[href="${targetHash}"]`);
      if (navLink) {
        navLink.click();
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
    state.filterDuplicatesOnly = false;
    if (typeof window.updateDuplicateFilterButtonState === "function") {
      window.updateDuplicateFilterButtonState();
    }
    state.inventoryCurrentPage = 1;
    updateUI();
    showToast("Inventory filters reset.", "info");
  });

  const btnToggleDuplicates = document.getElementById("btn-toggle-duplicate-keys");
  if (btnToggleDuplicates) {
    btnToggleDuplicates.addEventListener("click", () => {
      state.filterDuplicatesOnly = !state.filterDuplicatesOnly;
      state.inventoryCurrentPage = 1;
      if (typeof window.updateDuplicateFilterButtonState === "function") {
        window.updateDuplicateFilterButtonState();
      }
      updateUI();
      if (state.filterDuplicatesOnly) {
        const dupMap = window.getDuplicateKeyMap();
        let count = 0;
        dupMap.forEach(items => { if (items.length > 1) count += items.length; });
        if (count === 0) {
          showToast("No duplicate keys found in inventory.", "info");
        } else {
          showToast(`Filtered to ${count} duplicate items.`, "warning");
        }
      } else {
        showToast("Showing all inventory keys.", "info");
      }
    });
  }

  const btnOpenDuplicates = document.getElementById("btn-open-duplicates-inspector");
  if (btnOpenDuplicates) {
    btnOpenDuplicates.addEventListener("click", () => {
      if (typeof window.openDuplicateKeysModal === "function") {
        window.openDuplicateKeysModal();
      }
    });
  }

  const btnDupFilterTable = document.getElementById("btn-dup-filter-table");
  if (btnDupFilterTable) {
    btnDupFilterTable.addEventListener("click", () => {
      if (typeof closeModal === "function") closeModal("duplicate-keys-modal");
      state.filterDuplicatesOnly = true;
      state.inventoryCurrentPage = 1;
      if (typeof window.updateDuplicateFilterButtonState === "function") {
        window.updateDuplicateFilterButtonState();
      }
      updateUI();
      showToast("Filtered inventory table to duplicate keys.", "warning");
    });
  }

  // Filters Event Listeners for Sales
  document.getElementById("sales-filter-platform").addEventListener("change", () => {
    state.salesCurrentPage = 1;
    updateUI();
  });
  document.getElementById("sales-filter-supplier").addEventListener("change", () => {
    state.salesCurrentPage = 1;
    updateUI();
  });
  const debouncedSalesSearch = debounce(() => {
    state.salesCurrentPage = 1;
    updateUI();
  }, 150);
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
    const salesFilterSup = document.getElementById("sales-filter-supplier");
    if (salesFilterSup) salesFilterSup.value = "all";
    document.getElementById("sales-search-input").value = "";
    state.salesCurrentPage = 1;
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

  // Entries Sort Listener
  const entriesSort = document.getElementById("entries-sort-by");
  if (entriesSort) {
    entriesSort.value = state.entriesSortBy || "rating-desc";
    entriesSort.addEventListener("change", (e) => {
      state.entriesSortBy = e.target.value;
      localStorage.setItem("gv_entries_sort_by", state.entriesSortBy);
      state.entriesCurrentPage = 1;
      renderEntries();
    });
  }

  // Entries Rating / Percentage Filter Listener
  const entriesRatingFilter = document.getElementById("entries-rating-filter");
  if (entriesRatingFilter) {
    entriesRatingFilter.value = state.entriesRatingFilter || "all";
    entriesRatingFilter.addEventListener("change", (e) => {
      state.entriesRatingFilter = e.target.value;
      localStorage.setItem("gv_entries_rating_filter", state.entriesRatingFilter);
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
  
  // Make setInvLayout global so inline onclick handlers in index.html work reliably
  window.setInvLayout = (layout) => {
    try {
      console.log("setInvLayout called with layout:", layout);
      if (layout === "gallery") layout = "list";
      state.inventoryLayout = layout;
      saveStateToStorage();
      
      // Update toggle buttons active state
      const btnList = document.getElementById("btn-layout-list");
      const btnGrid = document.getElementById("btn-layout-grid");
      
      if (btnList && btnGrid) {
        btnList.classList.remove("active");
        btnGrid.classList.remove("active");
        
        if (layout === "list") btnList.classList.add("active");
        if (layout === "grid") btnGrid.classList.add("active");
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
  if (btnList && btnGrid) {
    btnList.addEventListener("click", () => window.setInvLayout("list"));
    btnGrid.addEventListener("click", () => window.setInvLayout("grid"));
  }

  // Catalog Entries Layout Toggle Setup
  window.setEntriesLayout = (layout) => {
    try {
      console.log("setEntriesLayout called with layout:", layout);
      state.entriesLayout = layout;
      saveStateToStorage();

      // Update Catalog toggle buttons active state
      const btnTable = document.getElementById("btn-entries-layout-table");
      const btnGallery = document.getElementById("btn-entries-layout-gallery");

      if (btnTable && btnGallery) {
        btnTable.classList.remove("active");
        btnGallery.classList.remove("active");

        if (layout === "table") btnTable.classList.add("active");
        if (layout === "gallery") btnGallery.classList.add("active");
      }

      renderEntries();
    } catch (err) {
      console.error("Error in setEntriesLayout:", err);
    }
  };

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

  const financeChartYearFilter = document.getElementById("finance-chart-year-filter");
  if (financeChartYearFilter) {
    financeChartYearFilter.addEventListener("change", () => {
      renderFinanceView();
    });
  }

  const financeChartComparePrior = document.getElementById("finance-chart-compare-prior");
  if (financeChartComparePrior) {
    financeChartComparePrior.addEventListener("change", () => {
      renderFinanceView();
    });
  }

  const benchmarkMode = document.getElementById("benchmark-mode");
  if (benchmarkMode) {
    benchmarkMode.addEventListener("change", () => {
      state.benchmarkMode = benchmarkMode.value;
      saveStateToStorage();
      renderFinanceBenchmark();
    });
  }

  const benchmarkYearA = document.getElementById("benchmark-year-a");
  if (benchmarkYearA) {
    benchmarkYearA.addEventListener("change", () => {
      renderFinanceBenchmark();
    });
  }

  const benchmarkYearB = document.getElementById("benchmark-year-b");
  if (benchmarkYearB) {
    benchmarkYearB.addEventListener("change", () => {
      renderFinanceBenchmark();
    });
  }

  const financeAvgChartMetricType = document.getElementById("finance-avg-chart-metric-type");
  if (financeAvgChartMetricType) {
    financeAvgChartMetricType.addEventListener("change", () => {
      renderFinanceView();
    });
  }

  const financeAvgChartYearFilter = document.getElementById("finance-avg-chart-year-filter");
  if (financeAvgChartYearFilter) {
    financeAvgChartYearFilter.addEventListener("change", () => {
      renderFinanceView();
    });
  }

  const financeOutflowChartYearFilter = document.getElementById("finance-outflow-chart-year-filter");
  if (financeOutflowChartYearFilter) {
    financeOutflowChartYearFilter.addEventListener("change", () => {
      renderFinanceView();
    });
  }

  const fsCostRevenueChartType = document.getElementById("finance-costRevenue-chartType");
  if (fsCostRevenueChartType) {
    fsCostRevenueChartType.addEventListener("change", (e) => {
      if (state.widgetSettings.costRevenue) {
        state.widgetSettings.costRevenue.chartType = e.target.value;
        saveStateToStorage();
        if (window.supabaseClient) {
          dbSaveSettings("widgetSettings", state.widgetSettings);
        }
        renderCostRevenueChart(state.sales);
      }
    });
  }

  const fsCostRevenueTimeframe = document.getElementById("finance-costRevenue-timeframe");
  if (fsCostRevenueTimeframe) {
    fsCostRevenueTimeframe.addEventListener("change", (e) => {
      if (state.widgetSettings.costRevenue) {
        state.widgetSettings.costRevenue.timeframe = e.target.value;
        saveStateToStorage();
        if (window.supabaseClient) {
          dbSaveSettings("widgetSettings", state.widgetSettings);
        }
        renderCostRevenueChart(state.sales);
      }
    });
  }

  const fsMarkupAnalysisChartType = document.getElementById("finance-markupAnalysis-chartType");
  if (fsMarkupAnalysisChartType) {
    fsMarkupAnalysisChartType.addEventListener("change", (e) => {
      if (state.widgetSettings.markupAnalysis) {
        state.widgetSettings.markupAnalysis.chartType = e.target.value;
        saveStateToStorage();
        if (window.supabaseClient) {
          dbSaveSettings("widgetSettings", state.widgetSettings);
        }
        renderMarkupAnalysisChart(state.inventory);
      }
    });
  }

  const fsMarkupAnalysisGroupBy = document.getElementById("finance-markupAnalysis-groupBy");
  if (fsMarkupAnalysisGroupBy) {
    fsMarkupAnalysisGroupBy.addEventListener("change", (e) => {
      if (state.widgetSettings.markupAnalysis) {
        state.widgetSettings.markupAnalysis.groupBy = e.target.value;
        saveStateToStorage();
        if (window.supabaseClient) {
          dbSaveSettings("widgetSettings", state.widgetSettings);
        }
        renderMarkupAnalysisChart(state.inventory);
      }
    });
  }

  const fsMarkupAnalysisTimeframe = document.getElementById("finance-markupAnalysis-timeframe");
  if (fsMarkupAnalysisTimeframe) {
    fsMarkupAnalysisTimeframe.addEventListener("change", (e) => {
      if (state.widgetSettings.markupAnalysis) {
        state.widgetSettings.markupAnalysis.timeframe = e.target.value;
        saveStateToStorage();
        if (window.supabaseClient) {
          dbSaveSettings("widgetSettings", state.widgetSettings);
        }
        renderMarkupAnalysisChart(state.inventory);
      }
    });
  }

  const fsFinanceTrackerTimeframe = document.getElementById("finance-financeTracker-timeframe");
  if (fsFinanceTrackerTimeframe) {
    fsFinanceTrackerTimeframe.addEventListener("change", (e) => {
      if (state.widgetSettings.financeTracker) {
        state.widgetSettings.financeTracker.timeframe = e.target.value;
        saveStateToStorage();
        if (window.supabaseClient) {
          dbSaveSettings("widgetSettings", state.widgetSettings);
        }
        renderFinanceTrackerWidget(state.sales);
      }
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

  // Monthly Ledger Breakdown Collapse / Expand toggle
  const btnToggleBreakdown = document.getElementById("btn-toggle-finance-breakdown");
  const titleBreakdown = document.getElementById("finance-breakdown-title");
  const toggleBreakdownHandler = (e) => {
    if (e) e.stopPropagation();
    state.financeBreakdownCollapsed = !state.financeBreakdownCollapsed;
    localStorage.setItem("gv_finance_breakdown_collapsed", state.financeBreakdownCollapsed ? "true" : "false");
    updateFinanceBreakdownCollapseUI();
  };

  if (btnToggleBreakdown) {
    btnToggleBreakdown.addEventListener("click", toggleBreakdownHandler);
  }
  if (titleBreakdown) {
    titleBreakdown.addEventListener("click", toggleBreakdownHandler);
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
        logActionNotification(`Moved ${selectedIds.length} key(s) to Recycle Bin`);
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
        logActionNotification(`Restored ${ids.length} item(s) from Recycle Bin`);
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
        logActionNotification(`Permanently deleted ${ids.length} item(s) from Recycle Bin`);
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
        logActionNotification("Emptied Recycle Bin");
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
    logActionNotification(`Bulk adjusted prices for ${modifiedCount} item(s)`);
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

  // Split and filter keys (defaults to "NO-KEY" if left blank)
  let keys = keyInput.split(/[\n,;]+/).map(k => k.trim()).filter(k => k.length > 0);
  if (keys.length === 0) {
    keys = ["NO-KEY"];
  }

  // Check for duplicate keys in inventory (ignoring NO-KEY placeholders)
  const duplicateKeys = keys.filter(k => k !== "NO-KEY" && state.inventory.some(item => item.key && item.key !== "NO-KEY" && item.key.trim().toLowerCase() === k.toLowerCase()));
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
    logActionNotification(`Added game key: ${title}`);
  } else {
    showToast(`Successfully added ${keys.length} game keys for: ${title}`, "success");
    logActionNotification(`Added ${keys.length} game keys for: ${title}`);
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
  logActionNotification(`Recorded sale for: ${game.title} (${formatCurrency(sellPrice)})`);
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
    logActionNotification(`Moved "${game.title}" key to Recycle Bin`);
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
        
        // Delete sales items first in batches to satisfy foreign key constraints
        for (let j = 0; j < saleIds.length; j += deleteBatchSize) {
          const batch = saleIds.slice(j, j + deleteBatchSize);
          const { error: saleErr } = await window.supabaseClient.from('sales').delete().in('id', batch);
          if (saleErr) throw saleErr;
        }

        // Delete inventory items in batches to avoid URL length limit errors
        for (let j = 0; j < ids.length; j += deleteBatchSize) {
          const batch = ids.slice(j, j + deleteBatchSize);
          const { error: invErr } = await window.supabaseClient.from('inventory').delete().in('id', batch);
          if (invErr) throw invErr;
        }
      }
    } else if (state.syncMode === "manual") {
      setUnsyncedChanges(true);
    }

    updateUI();
    showToast(`Moved ${gamesToMove.length} items to the Recycle Bin.`, "success");
    logActionNotification(`Moved all inventory (${gamesToMove.length} keys) to Recycle Bin`);
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
    logActionNotification(`Cancelled sale: "${sale.title}"`);
  }
};

window.triggerDisputeSale = function(saleId) {
  const sale = state.sales.find(item => item.id === saleId);
  if (!sale) return;
  
  const idInput = document.getElementById("dispute-sale-id");
  const titleLabel = document.getElementById("dispute-sale-title-label");
  const costLabel = document.getElementById("dispute-sale-cost-label");
  const checkbox = document.getElementById("dispute-cost-refunded");
  
  if (idInput) idInput.value = saleId;
  if (titleLabel) titleLabel.textContent = `"${sale.title}"`;
  if (costLabel) costLabel.textContent = formatCurrency(sale.cost);
  if (checkbox) checkbox.checked = false;
  
  openModal("dispute-sale-modal");
};

window.triggerResolveDispute = async function(saleId) {
  const sale = state.sales.find(item => item.id === saleId);
  if (!sale) return;
  
  if (confirm(`Resolve dispute for "${sale.title}" and restore the original sale transaction?`)) {
    pushToUndoStack();
    sale.disputed = false;
    sale.supplierRefunded = false;
    
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
    logActionNotification(`Resolved dispute: "${sale.title}"`);
  }
};

async function handleDisputeSaleSubmit(e) {
  e.preventDefault();
  
  const saleId = document.getElementById("dispute-sale-id")?.value;
  if (!saleId) return;
  
  const sale = state.sales.find(item => item.id === saleId);
  if (!sale) return;
  
  const supplierRefunded = document.getElementById("dispute-cost-refunded")?.checked === true;
  
  closeModal("dispute-sale-modal");
  
  pushToUndoStack();
  sale.disputed = true;
  sale.supplierRefunded = supplierRefunded;
  
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
  const profitImpact = supplierRefunded ? "0.00 (refunded by supplier)" : `-${formatCurrency(sale.cost)} (loss)`;
  showToast(`Flagged "${sale.title}" sale as Disputed/Refunded. Net profit impact: ${profitImpact}.`, "warning");
  logActionNotification(`Flagged dispute: "${sale.title}" (Supplier Refunded: ${supplierRefunded ? 'Yes' : 'No'})`);
}

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
  const key = document.getElementById("edit-game-key").value.trim() || "NO-KEY";
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

  // Check if edited key exists on another game item (ignoring NO-KEY placeholders)
  const currentKey = state.inventory[gameIndex].key || "NO-KEY";
  if (key && key !== "NO-KEY" && key.toLowerCase() !== currentKey.toLowerCase()) {
    const isDuplicate = state.inventory.some(item => item.id !== gameId && item.key && item.key !== "NO-KEY" && item.key.trim().toLowerCase() === key.toLowerCase());
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
  logActionNotification(`Edited game: "${title}"`);
}

window.toggleFavoriteGame = function(gameTitle) {
  if (!state.favoriteGames) state.favoriteGames = [];
  const idx = state.favoriteGames.indexOf(gameTitle);
  if (idx > -1) {
    state.favoriteGames.splice(idx, 1);
    showToast(`Removed "${gameTitle}" from Favorites.`, "info");
    logActionNotification(`Removed "${gameTitle}" from favorites`);
  } else {
    state.favoriteGames.push(gameTitle);
    showToast(`Added "${gameTitle}" to Favorites.`, "success");
    logActionNotification(`Added "${gameTitle}" to favorites`);
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
    logActionNotification(`Deleted catalog entry: "${title}"`);
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
    
    const keyStr = String(item.key || "");
    const maskedKey = keyStr.length >= 8 
      ? `${keyStr.slice(0, 4)}-****-****-${keyStr.slice(-4)}`
      : keyStr || "—";
    
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
        <button class="btn-action btn-action-edit" onclick="closeModal('catalog-keys-modal'); copyTextToClipboard('${escapeHTML(keyStr).replace(/'/g, "\\'")}', 'Key copied to clipboard!')" title="Copy Key">
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
    if (item.title && item.title.trim().toLowerCase() === oldTitle.toLowerCase()) {
      item.title = newTitle;
      if (imageUrl !== undefined && imageUrl !== "") {
        item.imageUrl = imageUrl;
      }
      item.publisher = newPublisher;
      updatedCount++;
    }
  });

  state.sales.forEach(sale => {
    if (sale.title && sale.title.trim().toLowerCase() === oldTitle.toLowerCase()) {
      sale.title = newTitle;
      if (imageUrl !== undefined && imageUrl !== "") {
        sale.imageUrl = imageUrl;
      }
      sale.profit = sale.sellPrice - sale.cost - sale.fees;
    }
  });

  if (imageUrl !== undefined && imageUrl !== "") {
    if (oldTitle.toLowerCase() !== newTitle.toLowerCase()) {
      window.setCatalogArtwork(oldTitle, null);
    }
    window.setCatalogArtwork(newTitle, imageUrl);
  }

  saveStateToStorage();
  if (window.supabaseClient) {
    const updatedInventory = state.inventory.filter(item => item.title === newTitle);
    for (const item of updatedInventory) {
      await dbSaveInventory(item);
    }
    if (oldTitle.toLowerCase() !== newTitle.toLowerCase()) {
      const updatedSales = state.sales.filter(sale => sale.title === newTitle);
      for (const sale of updatedSales) {
        await dbSaveSale(sale);
      }
    }
  }
  updateUI();
  closeModal("edit-catalog-entry-modal");
  if (updatedCount > 0) {
    showToast(`Updated "${oldTitle}" to "${newTitle}" across ${updatedCount} keys.`, "success");
  } else {
    showToast(`Updated catalog entry metadata for "${newTitle}".`, "success");
  }
  logActionNotification(`Edited catalog: "${oldTitle}" to "${newTitle}"`);
}

// ==========================================================================
// RENDER & UI DYNAMIC UPDATES
// ==========================================================================
function updateUI() {
  const activeView = document.querySelector(".content-view.active");
  const activeViewId = activeView ? activeView.id : "dashboard-view";

  // Update Storage Status Badge
  const storageBadge = document.getElementById("storage-status-badge");
  if (storageBadge) {
    if (window.supabaseClient) {
      const invCount = (state.inventory || []).length;
      const salesCount = (state.sales || []).length;
      storageBadge.innerHTML = `<i class="fa-solid fa-cloud-check" style="color: #000;"></i> Cloud (${salesCount.toLocaleString()} sales)`;
      storageBadge.className = "badge badge-available";
      storageBadge.style.background = "var(--accent-emerald, #10b981)";
      storageBadge.style.color = "#000";
      storageBadge.style.border = "none";
      storageBadge.title = `Cloud Sync Active: ${salesCount.toLocaleString()} sales and ${invCount.toLocaleString()} inventory items verified in memory. Click to open settings.`;
    } else {
      storageBadge.innerHTML = `<i class="fa-solid fa-hdd"></i> Local Storage`;
      storageBadge.className = "badge";
      storageBadge.style.background = "rgba(255, 255, 255, 0.04)";
      storageBadge.style.color = "var(--text-secondary)";
      storageBadge.style.border = "1px solid var(--border-color)";
    }
  }

  applyRoleBasedAccessControls();
  if (typeof window.updateDuplicateKeysBadge === "function") {
    window.updateDuplicateKeysBadge();
  }
  if (typeof window.updateDuplicateFilterButtonState === "function") {
    window.updateDuplicateFilterButtonState();
  }

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

  // ONLY execute rendering logic relevant to the active view
  if (activeViewId === "dashboard-view") {
    calculateMetrics(dbFilteredSales, dbFilteredInventory);
    calculateSupplierMetrics();
    renderPeriodSummary(dbFilteredSales, dbFilteredInventory);

    renderDashboardCardsOrder();
    applyFiguresVisibility();
    applyDashboardSpans();

    renderSalesTrendChart(dbFilteredSales);
    renderPlatformSplitChart(dbFilteredSales);
    renderSupplierSplitChart(dbFilteredInventory);
    renderTopBestsellersChart("topBestsellers", "top-bestsellers-list", "bestsellers-chart-title", dbFilteredSales);
    renderTopBestsellersChart("topBestsellersRevenue", "top-bestsellers-revenue-list", "bestsellers-revenue-chart-title", dbFilteredSales);
    renderTopBestsellersChart("topBestsellersSales", "top-bestsellers-sales-list", "bestsellers-sales-chart-title", dbFilteredSales);
    renderDailyProfitMonthChart(dbFilteredSales);
    renderStockSpeedChart(dbFilteredInventory, dbFilteredSales);
    renderSalesFeedWidget(dbFilteredSales);
    renderStockTurnoverChart(dbFilteredInventory, dbFilteredSales);
    renderStockAgingChart(dbFilteredInventory);

    renderDashboardDetails(dbFilteredSales, dbFilteredInventory);
  } 
  else if (activeViewId === "inventory-view") {
    renderInventoryTable(filteredInventory);
  } 
  else if (activeViewId === "sales-view") {
    renderSalesTable(filteredSales);
  } 
  else if (activeViewId === "suppliers-view") {
    if (state.suppliersActiveTab === "publisher") {
      document.getElementById("suppliers-tab-content")?.classList.add("hidden");
      document.getElementById("publishers-tab-content")?.classList.remove("hidden");
      renderPublishersTab();
    } else {
      document.getElementById("suppliers-tab-content")?.classList.remove("hidden");
      document.getElementById("publishers-tab-content")?.classList.add("hidden");
      renderSuppliers();
    }
  } 
  else if (activeViewId === "platforms-view") {
    renderPlatforms();
  } 
  else if (activeViewId === "entries-view") {
    renderEntries();
  } 
  else if (activeViewId === "finance-view") {
    renderFinanceCardsOrder();
    applyFinanceSpans();
    applyWidgetVisibility();
    renderFinanceView();
    populateCategoryDropdown();
    renderPayoutsLedger();
  } 
  else if (activeViewId === "recycle-view") {
    renderRecycleBin();
  } 
  else if (activeViewId === "settings-view") {
    applyRoleBasedAccessControls();
    renderSidebarCustomizationSettings();
    renderAdminUsers();
    renderAuditLogs();
    
    // Bind profile values
    const users = getUsersFromStorage();
    const currentUserObj = users.find(u => u.username.toLowerCase() === state.currentUser?.toLowerCase());
    if (currentUserObj) {
      const emailInput = document.getElementById("profile-email-input");
      const tfaInput = document.getElementById("profile-2fa-input");
      const usernameDisplay = document.getElementById("profile-username-display");
      const roleDisplay = document.getElementById("profile-role-display");
      const profileAvatar = document.getElementById("profile-avatar");
      
      if (emailInput && !emailInput.value) emailInput.value = currentUserObj.email || "";
      if (tfaInput) tfaInput.checked = currentUserObj.twoFactorEnabled || false;
      if (usernameDisplay) usernameDisplay.textContent = state.currentUser;
      if (roleDisplay) roleDisplay.textContent = currentUserObj.role || "merchant";
      if (profileAvatar && state.currentUser) {
        profileAvatar.textContent = state.currentUser.substring(0, 2).toUpperCase();
      }
    }
  }

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

  if (typeof updateAIContextBadge === "function") {
    updateAIContextBadge();
  }
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
          <button class="btn-action btn-action-logo" onclick="triggerRetrieveSupplierLogo('${escapeHTML(escapedNameForJS)}')" title="Retrieve Supplier Logo">
            <i class="fa-solid fa-cloud-arrow-down"></i>
          </button>
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

    // Populate inventory & sales filter dropdowns as well
    if (filterSelect) {
      const prevFilterVal = filterSelect.value;
      const salesFilterSelect = document.getElementById("sales-filter-supplier");
      const prevSalesFilterVal = salesFilterSelect ? salesFilterSelect.value : "all";

      const optionsHTML = '<option value="all">All Suppliers</option>' +
        dropdownSuppliers.map(s => `<option value="${s.name}">${s.name}${s.enabled === false ? ' (Disabled)' : ''}</option>`).join("");
      
      filterSelect.innerHTML = optionsHTML;
      if (salesFilterSelect) salesFilterSelect.innerHTML = optionsHTML;
      
      if (prevFilterVal && (prevFilterVal === "all" || state.suppliers.some(s => s.name === prevFilterVal))) {
        filterSelect.value = prevFilterVal;
      } else {
        filterSelect.value = "all";
      }

      if (salesFilterSelect) {
        if (prevSalesFilterVal && (prevSalesFilterVal === "all" || state.suppliers.some(s => s.name === prevSalesFilterVal))) {
          salesFilterSelect.value = prevSalesFilterVal;
        } else {
          salesFilterSelect.value = "all";
        }
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

  // Filter lists based on the selected timeframe
  let filteredSales = [...state.sales];
  let filteredInventory = [...state.inventory];
  const activePeriod = state.supActivePeriod || "all";
  const now = new Date();

  if (activePeriod !== "all") {
    if (activePeriod === "month") {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      filteredSales = filteredSales.filter(item => new Date(item.saleDate) >= startOfMonth);
      filteredInventory = filteredInventory.filter(item => item.purchaseDate && new Date(item.purchaseDate) >= startOfMonth);
    } else if (activePeriod === "week") {
      const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay())); // Sunday
      filteredSales = filteredSales.filter(item => new Date(item.saleDate) >= startOfWeek);
      filteredInventory = filteredInventory.filter(item => item.purchaseDate && new Date(item.purchaseDate) >= startOfWeek);
    } else if (activePeriod === "today") {
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const todayStr = `${year}-${month}-${day}`;
      filteredSales = filteredSales.filter(item => item.saleDate === todayStr);
      filteredInventory = filteredInventory.filter(item => item.purchaseDate && item.purchaseDate.startsWith(todayStr));
    }
  }

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

  // Process filtered inventory
  filteredInventory.forEach(item => {
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

  // Process filtered sales
  filteredSales.forEach(sale => {
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

// ==========================================================================
// SUPPLIER LOGO RETRIEVAL & LOOKUP ENGINE
// ==========================================================================

const SUPPLIER_KNOWN_DOMAINS = {
  "humble bundle": "humblebundle.com",
  "humble": "humblebundle.com",
  "humblebundle": "humblebundle.com",
  "fanatical": "fanatical.com",
  "bundle stars": "fanatical.com",
  "cdkeys": "cdkeys.com",
  "cdkeys.com": "cdkeys.com",
  "kinguin": "kinguin.net",
  "eneba": "eneba.com",
  "gamivo": "gamivo.com",
  "g2a": "g2a.com",
  "gamestop": "gamestop.com",
  "green man gaming": "greenmangaming.com",
  "gmg": "greenmangaming.com",
  "instant gaming": "instant-gaming.com",
  "steam": "store.steampowered.com",
  "valve": "valvesoftware.com",
  "gog": "gog.com",
  "gog.com": "gog.com",
  "good old games": "gog.com",
  "epic games": "epicgames.com",
  "epic": "epicgames.com",
  "indiegala": "indiegala.com",
  "voidu": "voidu.com",
  "2game": "2game.com",
  "loaded": "loaded.com",
  "hrk": "hrkgame.com",
  "hrk game": "hrkgame.com",
  "yuplay": "yuplay.com",
  "gamesplanet": "gamesplanet.com",
  "allyouplay": "allyouplay.com",
  "wingamestore": "wingamestore.com",
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
  "target": "target.com",
  "walmart": "walmart.com",
  "ebay": "ebay.com",
  "playerauctions": "playerauctions.com"
};

function resolveSupplierDomain(supplierName) {
  if (!supplierName) return "";
  const clean = supplierName.toLowerCase().trim();
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

function getSupplierLogoCandidates(domain) {
  if (!domain) return [];
  const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/\/.*$/, '').trim();
  if (!cleanDomain) return [];

  return [
    {
      label: "Google Icon HD",
      sublabel: "128px Clean Icon",
      url: `https://www.google.com/s2/favicons?domain=${encodeURIComponent(cleanDomain)}&sz=128`
    },
    {
      label: "Clearbit Logo",
      sublabel: "Brand Vector/PNG",
      url: `https://logo.clearbit.com/${encodeURIComponent(cleanDomain)}`
    },
    {
      label: "DuckDuckGo",
      sublabel: "Official Favicon",
      url: `https://icons.duckduckgo.com/ip3/${encodeURIComponent(cleanDomain)}.ico`
    },
    {
      label: "Unavatar",
      sublabel: "Multi-Source Icon",
      url: `https://unavatar.io/${encodeURIComponent(cleanDomain)}`
    }
  ];
}

function selectCandidateCard(card, url) {
  const grid = document.getElementById("retrieve-supplier-candidates-grid");
  const selectedUrlHidden = document.getElementById("retrieve-supplier-selected-url");
  const customUrlInput = document.getElementById("retrieve-supplier-custom-url");

  if (grid) {
    grid.querySelectorAll(".logo-candidate-card").forEach(c => c.classList.remove("selected"));
  }
  if (card) {
    card.classList.add("selected");
  }
  if (selectedUrlHidden) selectedUrlHidden.value = url;
  if (customUrlInput) customUrlInput.value = url;
}

function renderSupplierLogoCandidates(domain, preselectedUrl = "") {
  const grid = document.getElementById("retrieve-supplier-candidates-grid");
  const noCandidatesMsg = document.getElementById("retrieve-supplier-no-candidates");
  const selectedUrlHidden = document.getElementById("retrieve-supplier-selected-url");
  if (!grid) return;

  grid.innerHTML = "";
  const candidates = getSupplierLogoCandidates(domain);

  if (candidates.length === 0) {
    if (noCandidatesMsg) noCandidatesMsg.style.display = "block";
    return;
  }
  if (noCandidatesMsg) noCandidatesMsg.style.display = "none";

  let hasSelected = false;

  candidates.forEach(cand => {
    const card = document.createElement("div");
    card.className = "logo-candidate-card";
    card.setAttribute("data-url", cand.url);

    card.innerHTML = `
      <div class="logo-candidate-check"><i class="fa-solid fa-check"></i></div>
      <div class="logo-candidate-img-box">
        <img src="${escapeHTML(cand.url)}" alt="${escapeHTML(cand.label)}" loading="lazy">
      </div>
      <div class="logo-candidate-label">${escapeHTML(cand.label)}</div>
      <div style="font-size: 0.65rem; color: var(--text-muted);">${escapeHTML(cand.sublabel)}</div>
    `;

    const img = card.querySelector("img");
    img.onerror = () => {
      card.style.display = "none";
      const visibleCards = grid.querySelectorAll('.logo-candidate-card:not([style*="display: none"])');
      if (visibleCards.length === 0 && noCandidatesMsg) {
        noCandidatesMsg.style.display = "block";
      }
    };

    img.onload = () => {
      if (!hasSelected) {
        if (!selectedUrlHidden.value || preselectedUrl === cand.url || !preselectedUrl) {
          hasSelected = true;
          selectCandidateCard(card, cand.url);
        }
      }
    };

    card.addEventListener("click", () => {
      selectCandidateCard(card, cand.url);
    });

    grid.appendChild(card);
  });
}

window.triggerRetrieveSupplierLogo = function(supplierName) {
  initRetrieveSupplierLogoHandlers();

  const supplierObj = state.suppliers.find(s => s.name === supplierName);
  if (!supplierObj) {
    showToast(`Supplier "${supplierName}" not found.`, "error");
    return;
  }

  const nameHidden = document.getElementById("retrieve-supplier-name-hidden");
  const nameDisplay = document.getElementById("retrieve-supplier-name-display");
  const statusBadge = document.getElementById("retrieve-supplier-status-badge");
  const previewBox = document.getElementById("retrieve-supplier-current-preview");
  const domainInput = document.getElementById("retrieve-supplier-domain-input");
  const customUrlInput = document.getElementById("retrieve-supplier-custom-url");
  const selectedUrlHidden = document.getElementById("retrieve-supplier-selected-url");
  const btnRemove = document.getElementById("btn-remove-supplier-logo");

  if (nameHidden) nameHidden.value = supplierName;
  if (nameDisplay) nameDisplay.textContent = supplierName;

  const colorName = supplierObj.color || getSupplierColorName(supplierName);
  const colorPreset = SUPPLIER_COLORS.find(c => c.name === colorName) || SUPPLIER_COLORS[0];

  if (supplierObj.logo) {
    if (previewBox) {
      previewBox.innerHTML = `<img src="${escapeHTML(supplierObj.logo)}" class="supplier-logo-thumbnail" style="width: 40px; height: 40px;" alt="${escapeHTML(supplierName)}">`;
    }
    if (statusBadge) statusBadge.innerHTML = `<span style="color: var(--accent-teal);"><i class="fa-solid fa-check"></i> Custom Logo Active</span>`;
    if (btnRemove) btnRemove.style.display = "inline-flex";
  } else {
    if (previewBox) {
      previewBox.innerHTML = `<div class="supplier-logo-placeholder" style="width: 40px; height: 40px; background-color: ${colorPreset.value}20; color: ${colorPreset.value}; border: 1px solid ${colorPreset.value}40;"><i class="fa-solid fa-truck-ramp-box"></i></div>`;
    }
    if (statusBadge) statusBadge.innerHTML = `<span style="color: var(--text-muted);">No custom logo set (using tag badge)</span>`;
    if (btnRemove) btnRemove.style.display = "none";
  }

  const detectedDomain = resolveSupplierDomain(supplierName);
  if (domainInput) domainInput.value = detectedDomain;
  if (customUrlInput) customUrlInput.value = supplierObj.logo || "";
  if (selectedUrlHidden) selectedUrlHidden.value = supplierObj.logo || "";

  renderSupplierLogoCandidates(detectedDomain, supplierObj.logo || "");
  openModal("retrieve-supplier-logo-modal");
};

let retrieveSupplierLogoInitialized = false;
function initRetrieveSupplierLogoHandlers() {
  if (retrieveSupplierLogoInitialized) return;
  
  const form = document.getElementById("retrieve-supplier-logo-form");
  if (!form) return; // Template not yet loaded into DOM
  retrieveSupplierLogoInitialized = true;

  const btnSearch = document.getElementById("btn-fetch-supplier-logo-candidates");
  const domainInput = document.getElementById("retrieve-supplier-domain-input");
  const customUrlInput = document.getElementById("retrieve-supplier-custom-url");
  const selectedUrlHidden = document.getElementById("retrieve-supplier-selected-url");
  const btnRemove = document.getElementById("btn-remove-supplier-logo");

  if (btnSearch && domainInput) {
    const doSearch = () => {
      const d = domainInput.value.trim();
      if (!d) {
        showToast("Please enter a website or domain to search.", "warning");
        return;
      }
      renderSupplierLogoCandidates(d);
    };

    btnSearch.addEventListener("click", doSearch);
    domainInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        doSearch();
      }
    });
  }

  if (customUrlInput) {
    customUrlInput.addEventListener("input", (e) => {
      const val = e.target.value.trim();
      if (selectedUrlHidden) selectedUrlHidden.value = val;
      const grid = document.getElementById("retrieve-supplier-candidates-grid");
      if (grid) {
        grid.querySelectorAll(".logo-candidate-card").forEach(c => c.classList.remove("selected"));
      }
    });
  }

  if (btnRemove) {
    btnRemove.addEventListener("click", async () => {
      const supName = document.getElementById("retrieve-supplier-name-hidden")?.value;
      if (!supName) return;
      const supplierObj = state.suppliers.find(s => s.name === supName);
      if (supplierObj) {
        supplierObj.logo = null;
        saveStateToStorage();
        if (window.supabaseClient) {
          await dbSaveSupplier(supplierObj);
        }
        updateUI();
        closeModal("retrieve-supplier-logo-modal");
        showToast(`Removed custom logo for "${supName}".`, "info");
      }
    });
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const supName = document.getElementById("retrieve-supplier-name-hidden")?.value;
    if (!supName) return;

    const supplierObj = state.suppliers.find(s => s.name === supName);
    if (!supplierObj) return;

    const chosenUrl = (selectedUrlHidden?.value || customUrlInput?.value || "").trim();
    supplierObj.logo = chosenUrl || null;

    saveStateToStorage();
    if (window.supabaseClient) {
      await dbSaveSupplier(supplierObj);
    }

    updateUI();
    closeModal("retrieve-supplier-logo-modal");

    if (chosenUrl) {
      showToast(`Updated logo for "${supName}"!`, "success");
    } else {
      showToast(`No logo applied for "${supName}".`, "info");
    }
  });

  // Quick auto-retrieve in Edit Supplier Modal
  const btnEditAutofetch = document.getElementById("btn-edit-supplier-autofetch-logo");
  if (btnEditAutofetch) {
    btnEditAutofetch.addEventListener("click", () => {
      const nameInput = document.getElementById("edit-supplier-name");
      const urlInput = document.getElementById("edit-supplier-logo-url");
      const name = nameInput ? nameInput.value.trim() : "";
      if (!name) {
        showToast("Please enter a supplier name first.", "warning");
        return;
      }
      const domain = resolveSupplierDomain(name);
      if (domain) {
        const logoUrl = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128`;
        if (urlInput) urlInput.value = logoUrl;
        showToast(`Auto-retrieved logo for "${name}"!`, "success");
      } else {
        showToast(`Could not determine website for "${name}".`, "warning");
      }
    });
  }

  // Quick auto-retrieve in Add Supplier Modal
  const btnAddAutofetch = document.getElementById("btn-add-supplier-autofetch-logo");
  if (btnAddAutofetch) {
    btnAddAutofetch.addEventListener("click", () => {
      const nameInput = document.getElementById("supplier-name-input");
      const urlInput = document.getElementById("supplier-logo-url-input");
      const name = nameInput ? nameInput.value.trim() : "";
      if (!name) {
        showToast("Please enter a supplier name first.", "warning");
        return;
      }
      const domain = resolveSupplierDomain(name);
      if (domain) {
        const logoUrl = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128`;
        if (urlInput) urlInput.value = logoUrl;
        showToast(`Auto-retrieved logo for "${name}"!`, "success");
      } else {
        showToast(`Could not determine website for "${name}".`, "warning");
      }
    });
  }
}
window.initRetrieveSupplierLogoHandlers = initRetrieveSupplierLogoHandlers;

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

function renderPlatformMetrics() {
  const metricsGrid = document.getElementById("platforms-metrics-grid");
  if (!metricsGrid) return;
  
  const totalPlatforms = state.platforms.length;
  
  // Calculate keys by platform
  const platformStats = new Map();
  let totalKeysInStock = 0;
  
  state.inventory.forEach(item => {
    const plat = item.platform || "";
    if (!platformStats.has(plat)) {
      platformStats.set(plat, { total: 0, inStock: 0 });
    }
    const stats = platformStats.get(plat);
    stats.total++;
    if (item.status !== "Sold") {
      stats.inStock++;
      totalKeysInStock++;
    }
  });
  
  // Find top platform by volume (registered keys)
  let topPlatformName = "None";
  let topPlatformVolume = 0;
  platformStats.forEach((stats, name) => {
    if (stats.total > topPlatformVolume && name) {
      topPlatformVolume = stats.total;
      topPlatformName = name;
    }
  });
  
  // Find top platform by sales profit
  const platformSales = new Map();
  state.sales.forEach(sale => {
    const plat = sale.platform || "";
    if (plat) {
      platformSales.set(plat, (platformSales.get(plat) || 0) + (sale.profit || 0));
    }
  });
  
  let topSalesPlatName = "None";
  let topSalesPlatProfit = 0;
  platformSales.forEach((profit, name) => {
    if (profit > topSalesPlatProfit) {
      topSalesPlatProfit = profit;
      topSalesPlatName = name;
    }
  });
  
  metricsGrid.innerHTML = `
    <!-- Metric 1: Total Platforms -->
    <div class="metric-card">
      <div class="metric-content">
        <span class="metric-label">Total Platforms</span>
        <strong class="metric-value">${totalPlatforms}</strong>
        <span class="metric-trend text-neutral" style="font-size: 0.72rem; margin-top: 4px; display: inline-block;">
          <i class="fa-solid fa-gamepad"></i> Configured channels
        </span>
      </div>
      <div class="metric-icon" style="background-color: hsla(270, 85%, 55%, 0.15); color: var(--accent-purple);">
        <i class="fa-solid fa-gamepad"></i>
      </div>
    </div>
    
    <!-- Metric 2: Active Keys in Stock -->
    <div class="metric-card">
      <div class="metric-content">
        <span class="metric-label">Total In Stock Keys</span>
        <strong class="metric-value">${totalKeysInStock}</strong>
        <span class="metric-trend text-neutral" style="font-size: 0.72rem; margin-top: 4px; display: inline-block;">
          <i class="fa-solid fa-key"></i> Available for sale
        </span>
      </div>
      <div class="metric-icon" style="background-color: hsla(175, 90%, 48%, 0.15); color: var(--accent-teal);">
        <i class="fa-solid fa-key"></i>
      </div>
    </div>
    
    <!-- Metric 3: Top Volume Platform -->
    <div class="metric-card">
      <div class="metric-content">
        <span class="metric-label">Top Platform (Keys)</span>
        <strong class="metric-value" style="font-size: 1.25rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 170px;" title="${escapeHTML(topPlatformName)}">${escapeHTML(topPlatformName)}</strong>
        <span class="metric-trend text-neutral" style="font-size: 0.72rem; margin-top: 4px; display: inline-block;">
          <i class="fa-solid fa-boxes-stacked"></i> ${topPlatformVolume} registered
        </span>
      </div>
      <div class="metric-icon" style="background-color: hsla(195, 90%, 50%, 0.15); color: var(--accent-cyan);">
        <i class="fa-solid fa-boxes-stacked"></i>
      </div>
    </div>
    
    <!-- Metric 4: Top Profit Platform -->
    <div class="metric-card">
      <div class="metric-content">
        <span class="metric-label">Top Profit Platform</span>
        <strong class="metric-value" style="font-size: 1.25rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 170px;" title="${escapeHTML(topSalesPlatName)}">${escapeHTML(topSalesPlatName)}</strong>
        <span class="metric-trend text-neutral" style="font-size: 0.72rem; margin-top: 4px; display: inline-block;">
          <i class="fa-solid fa-wallet"></i> ${formatCurrency(topSalesPlatProfit)} profit
        </span>
      </div>
      <div class="metric-icon" style="background-color: hsla(40, 95%, 55%, 0.15); color: var(--accent-warning);">
        <i class="fa-solid fa-wallet"></i>
      </div>
    </div>
  `;
}

function bindPlatformPreview() {
  const addUrlInput = document.getElementById("platform-logo-url-input");
  const addFileInput = document.getElementById("platform-logo-file-input");
  const addPreview = document.getElementById("add-platform-logo-preview");
  
  const updateAddPreview = (src) => {
    if (src) {
      addPreview.innerHTML = `<img src="${src}" style="width: 100%; height: 100%; object-fit: cover;">`;
      addPreview.style.borderStyle = "solid";
    } else {
      addPreview.innerHTML = `<i class="fa-solid fa-gamepad"></i>`;
      addPreview.style.borderStyle = "dashed";
    }
  };
  
  if (addUrlInput) {
    addUrlInput.addEventListener("input", (e) => {
      updateAddPreview(e.target.value.trim());
    });
  }
  
  if (addFileInput) {
    addFileInput.addEventListener("change", async (e) => {
      if (e.target.files && e.target.files[0]) {
        try {
          const base64 = await getBase64(e.target.files[0]);
          updateAddPreview(base64);
        } catch (err) {
          console.error(err);
        }
      } else {
        updateAddPreview(addUrlInput ? addUrlInput.value.trim() : "");
      }
    });
  }
  
  // Edit Preview
  const editUrlInput = document.getElementById("edit-platform-logo-url");
  const editFileInput = document.getElementById("edit-platform-logo-file");
  const editPreview = document.getElementById("edit-platform-logo-preview");
  
  const updateEditPreview = (src) => {
    if (src) {
      editPreview.innerHTML = `<img src="${src}" style="width: 100%; height: 100%; object-fit: cover;">`;
      editPreview.style.borderStyle = "solid";
    } else {
      editPreview.innerHTML = `<i class="fa-solid fa-gamepad"></i>`;
      editPreview.style.borderStyle = "dashed";
    }
  };
  
  if (editUrlInput) {
    editUrlInput.addEventListener("input", (e) => {
      updateEditPreview(e.target.value.trim());
    });
  }
  
  if (editFileInput) {
    editFileInput.addEventListener("change", async (e) => {
      if (e.target.files && e.target.files[0]) {
        try {
          const base64 = await getBase64(e.target.files[0]);
          updateEditPreview(base64);
        } catch (err) {
          console.error(err);
        }
      } else {
        updateEditPreview(editUrlInput ? editUrlInput.value.trim() : "");
      }
    });
  }
}

function renderPlatforms() {
  renderPlatformMetrics();
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

  const addPreview = document.getElementById("add-platform-logo-preview");
  if (addPreview) {
    addPreview.innerHTML = `<i class="fa-solid fa-gamepad"></i>`;
    addPreview.style.borderStyle = "dashed";
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

  const editPreview = document.getElementById("edit-platform-logo-preview");
  if (editPreview) {
    if (logoUrl) {
      editPreview.innerHTML = `<img src="${logoUrl}" style="width: 100%; height: 100%; object-fit: cover;">`;
      editPreview.style.borderStyle = "solid";
    } else {
      editPreview.innerHTML = `<i class="fa-solid fa-gamepad"></i>`;
      editPreview.style.borderStyle = "dashed";
    }
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

  const editPreview = document.getElementById("edit-platform-logo-preview");
  if (editPreview) {
    editPreview.innerHTML = `<i class="fa-solid fa-gamepad"></i>`;
    editPreview.style.borderStyle = "dashed";
  }
  
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

  // B2. Specific Page Filter: Supplier
  const supplierFilterEl = document.getElementById("sales-filter-supplier");
  const supplierFilter = supplierFilterEl ? supplierFilterEl.value : "all";
  if (supplierFilter !== "all") {
    list = list.filter(item => item.source === supplierFilter);
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

  // F. Duplicate Keys filter
  if (state.filterDuplicatesOnly && typeof window.getDuplicateKeyMap === "function") {
    const dupMap = window.getDuplicateKeyMap();
    list = list.filter(item => {
      if (!item.key) return false;
      const k = item.key.trim().toLowerCase();
      return dupMap.has(k) && dupMap.get(k).length > 1;
    });
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
      if (sale.supplierRefunded === true) {
        // Cost is refunded by supplier: net profit impact is 0, cost is not added to cost of sales
        return;
      }
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
    
    // Clean up containers
    if (tableContainer) tableContainer.style.display = "none";
    if (gridContainer) gridContainer.style.display = "none";
    
    // Set active buttons in toggle group (just in case they are out of sync)
    const btnList = document.getElementById("btn-layout-list");
    const btnGrid = document.getElementById("btn-layout-grid");
    if (btnList && btnGrid) {
      btnList.classList.toggle("active", state.inventoryLayout === "list");
      btnGrid.classList.toggle("active", state.inventoryLayout === "grid");
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
function buildInventoryRowHTML(item, salesMap, dupMap) {
  if (!dupMap && typeof window.getDuplicateKeyMap === "function") {
    dupMap = window.getDuplicateKeyMap();
  }
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
    : `<div class="game-title-cell"><div class="game-thumbnail-placeholder" style="background: ${getHashGradient(titleStr)};">${escapeHTML(initials)}</div><strong>${escapeHTML(titleStr)}</strong></div>`;

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

  const dupCount = (dupMap && item.key) ? (dupMap.get(item.key.trim().toLowerCase())?.length || 0) : 0;
  const dupBadge = dupCount > 1 ? `
    <div style="margin-top: 3px;">
      <span class="badge badge-danger" style="font-size: 0.62rem; padding: 2px 6px; cursor: pointer; display: inline-flex; align-items: center; gap: 3px;" onclick="openDuplicateKeysModal('${escapeHTML(item.key)}')" title="Duplicate Key: appears ${dupCount} times. Click to inspect.">
        <i class="fa-solid fa-clone"></i> Duplicate (${dupCount}x)
      </span>
    </div>` : "";

  return `
    <tr>
      <td style="text-align: center; vertical-align: middle;">
        <input type="checkbox" class="inv-row-select" data-id="${item.id}" ${isChecked} style="cursor: pointer;">
      </td>
      <td>${titleCell}</td>
      <td><div class="secured-key"><code>${maskedKey}</code></div>${dupBadge}</td>
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

    const dupMap = typeof window.getDuplicateKeyMap === "function" ? window.getDuplicateKeyMap() : new Map();

    if (tableContainer && tableContainer._scrollListener) {
      tableContainer.removeEventListener("scroll", tableContainer._scrollListener);
      tableContainer._scrollListener = null;
    }

    if (isVirtual && tableContainer) {
      const rowHeight = 65;
      const containerHeight = tableContainer.clientHeight || 600;

      const renderSlice = () => {
        const scrollTop = tableContainer.scrollTop;
        const totalItems = itemsList.length;

        let startIndex = Math.floor(scrollTop / rowHeight);
        let endIndex = Math.ceil((scrollTop + containerHeight) / rowHeight);

        startIndex = Math.max(0, startIndex - 8);
        endIndex = Math.min(totalItems, endIndex + 8);

        if (startIndex <= 5) startIndex = 0;
        if (endIndex >= totalItems - 5) endIndex = totalItems;

        const topSpacerHeight = startIndex * rowHeight;
        const bottomSpacerHeight = (totalItems - endIndex) * rowHeight;

        let tbodyContent = "";

        if (topSpacerHeight > 0) {
          tbodyContent += `<tr style="height: ${topSpacerHeight}px; line-height: 0; font-size: 0;"><td colspan="12" style="padding: 0; border: none; height: ${topSpacerHeight}px; line-height: 0; font-size: 0;"></td></tr>`;
        }

        const slicedItems = itemsList.slice(startIndex, endIndex);
        slicedItems.forEach(item => {
          if (!item) return;
          tbodyContent += buildInventoryRowHTML(item, salesMap, dupMap);
        });

        if (bottomSpacerHeight > 0) {
          tbodyContent += `<tr style="height: ${bottomSpacerHeight}px; line-height: 0; font-size: 0;"><td colspan="12" style="padding: 0; border: none; height: ${bottomSpacerHeight}px; line-height: 0; font-size: 0;"></td></tr>`;
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

      tableContainer.style.maxHeight = "calc(100vh - 290px)";
      tableContainer.style.overflowY = "auto";
      tableContainer.style.position = "relative";

      renderSlice();
    } else {
      let tbodyContent = "";
      itemsList.forEach(item => {
        if (!item) return;
        tbodyContent += buildInventoryRowHTML(item, salesMap, dupMap);
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

    const dupMap = typeof window.getDuplicateKeyMap === "function" ? window.getDuplicateKeyMap() : new Map();

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

      const dupCount = (dupMap && item.key) ? (dupMap.get(item.key.trim().toLowerCase())?.length || 0) : 0;
      const dupBadge = dupCount > 1 ? `
        <div style="margin-top: 5px; text-align: center;">
          <span class="badge badge-danger" style="font-size: 0.65rem; padding: 2px 7px; cursor: pointer; display: inline-flex; align-items: center; gap: 4px;" onclick="openDuplicateKeysModal('${escapeHTML(item.key)}')" title="Duplicate Key: appears ${dupCount} times. Click to inspect.">
            <i class="fa-solid fa-clone"></i> Duplicate (${dupCount}x)
          </span>
        </div>` : "";

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
            ${dupBadge}
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

// Render Catalog entries in Gallery View format
function renderEntriesGalleryLayout(entriesList) {
  try {
    const container = document.getElementById("entries-gallery-container");
    if (!container) return;
    container.innerHTML = "";

    if (entriesList.length === 0) {
      container.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-muted);">No matching game entries in catalog.</div>`;
      return;
    }

    entriesList.forEach(entry => {
      if (!entry) return;
      const card = document.createElement("div");
      card.className = "gallery-card";

      // Double-click action on card
      card.style.cursor = "pointer";
      card.setAttribute("title", "Double-click to view all keys for this game");
      card.addEventListener("dblclick", () => {
        triggerViewCatalogKeys(entry.title);
      });

      const titleStr = String(entry.title || "Untitled Game");
      const initials = titleStr.split(" ").map(w => w ? w[0] : "").join("").slice(0, 3) || "???";
      
      // Cover art rendering
      const imageHtml = entry.imageUrl
        ? `<img src="${escapeHTML(entry.imageUrl)}" class="gallery-card-img" alt="${escapeHTML(titleStr)}">`
        : `<div class="gallery-card-placeholder" style="background: ${getHashGradient(titleStr)};">${escapeHTML(initials)}</div>`;

      // Favorite status & star icon
      const safeTitle = entry.title.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '&quot;');
      const isFav = state.favoriteGames && state.favoriteGames.includes(entry.title);
      const starColor = isFav ? "var(--accent-warning)" : "rgba(255,255,255,0.4)";
      const starIconClass = isFav ? "fa-solid fa-star" : "fa-regular fa-star";
      const starBtn = `
        <button onclick="event.stopPropagation(); toggleFavoriteGame('${safeTitle}')" style="position: absolute; top: 12px; right: 12px; z-index: 10; background: rgba(0,0,0,0.6); border: none; border-radius: 50%; cursor: pointer; color: ${starColor}; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; transition: var(--transition-smooth); backdrop-filter: blur(4px);" title="${isFav ? 'Remove from Favorites' : 'Add to Favorites'}">
          <i class="${starIconClass}" style="font-size: 0.85rem;"></i>
        </button>
      `;

      // Available stock badge
      let badgeClass = "badge-available";
      let badgeText = `${entry.availableStock} in stock`;
      if (entry.availableStock === 0) {
        badgeClass = "badge-sold";
        badgeText = "0 in stock";
      } else if (entry.availableStock <= state.lowStockThreshold) {
        badgeClass = "badge-low-stock badge-pulse-warning";
        badgeText = `${entry.availableStock} in stock (Low)`;
      }

      // Calculations
      const roiPercentage = entry.totalCostOfSold > 0 ? (entry.profit / entry.totalCostOfSold) * 100 : 0;
      const marginPercentage = entry.totalRevenue > 0 ? (entry.profit / entry.totalRevenue) * 100 : 0;

      // Avg duration
      const durations = entry.sellDurations || [];
      let avgDurationStr = "—";
      if (durations.length > 0) {
        const totalDays = durations.reduce((sum, d) => sum + d, 0);
        const avgDays = Math.round(totalDays / durations.length);
        avgDurationStr = `${avgDays} day${avgDays === 1 ? '' : 's'}`;
      }

      const publisherStr = entry.publisher 
        ? `<span style="font-size: 0.8rem; color: var(--text-muted);"><i class="fa-solid fa-building" style="margin-right: 4px; font-size: 0.75rem; opacity: 0.8;"></i>${escapeHTML(entry.publisher)}</span>`
        : `<span style="font-style: italic; font-size: 0.8rem; color: var(--text-muted);"><i class="fa-solid fa-building" style="margin-right: 4px; font-size: 0.75rem; opacity: 0.5;"></i>No Publisher</span>`;

      const titleLower = entry.title.trim().toLowerCase();
      const ratingPill = typeof window.renderSteamRatingPill === "function" 
        ? window.renderSteamRatingPill(entry.title, { imageUrl: entry.imageUrl, steamAppID: window.extractSteamAppId?.(entry.imageUrl) })
        : "";
      const pillSlot = ratingPill || `<span class="steam-pill-slot" data-title="${escapeHTML(titleLower)}"></span>`;

      // Front card overlay
      const frontOverlay = `
        <div class="gallery-card-overlay">
          <h4 class="gallery-card-title" title="${escapeHTML(titleStr)}">${escapeHTML(titleStr)}</h4>
          <div class="gallery-card-subtitle" style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
            ${publisherStr}
            <span class="badge ${badgeClass}">${badgeText}</span>
            ${pillSlot}
          </div>
        </div>
      `;

      // Hover overlay details
      const hoverOverlay = `
        <div class="gallery-card-hover-details">
          <div class="gallery-card-hover-header">
            <h4 title="${escapeHTML(titleStr)}" style="margin: 0; font-size: 0.95rem; font-weight: 700; color: var(--text-main); display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; line-height: 1.3;">${escapeHTML(titleStr)}</h4>
            <div style="display: flex; align-items: center; gap: 6px; margin-top: 4px; flex-wrap: wrap;">
              <span class="badge ${badgeClass}">${badgeText}</span>
              ${pillSlot}
            </div>
          </div>
          <div class="gallery-card-hover-meta" style="flex: 1; display: flex; flex-direction: column; gap: 8px; margin-top: 12px; font-size: 0.8rem;">
            <div class="gallery-card-hover-meta-item">
              <span>Steam Rating:</span>
              <div style="display: flex; align-items: center; justify-content: flex-end;">${pillSlot || '<span style="color: var(--text-muted); font-size: 0.8rem;">—</span>'}</div>
            </div>
            <div class="gallery-card-hover-meta-item">
              <span>Added Keys:</span>
              <strong>${entry.totalAdded} keys</strong>
            </div>
            <div class="gallery-card-hover-meta-item">
              <span>Sold Keys:</span>
              <strong>${entry.totalSold} sold</strong>
            </div>
            <div class="gallery-card-hover-meta-item">
              <span>Revenue:</span>
              <strong>${formatCurrency(entry.totalRevenue)}</strong>
            </div>
            <div class="gallery-card-hover-meta-item">
              <span>Net Profit:</span>
              <strong class="${entry.profit >= 0 ? 'text-success-neon' : 'text-danger-soft'}">${formatCurrency(entry.profit)}</strong>
            </div>
            <div class="gallery-card-hover-meta-item">
              <span>ROI:</span>
              <strong class="${roiPercentage >= 0 ? 'text-success-neon' : 'text-danger-soft'}">${roiPercentage.toFixed(1)}%</strong>
            </div>
            <div class="gallery-card-hover-meta-item">
              <span>Margin:</span>
              <strong class="${marginPercentage >= 0 ? 'text-success-neon' : 'text-danger-soft'}">${marginPercentage.toFixed(1)}%</strong>
            </div>
            <div class="gallery-card-hover-meta-item">
              <span>Lowest Sold:</span>
              <strong style="color: var(--text-main);">${entry.lowestSoldPrice !== null ? formatCurrency(entry.lowestSoldPrice) : '—'}</strong>
            </div>
            <div class="gallery-card-hover-meta-item">
              <span>Avg Speed:</span>
              <strong style="color: var(--accent-cyan);">${avgDurationStr}</strong>
            </div>
          </div>
          <div class="gallery-card-hover-actions" style="margin-top: auto; display: flex; gap: 8px; width: 100%;">
            <button class="btn btn-outline btn-sm" onclick="event.stopPropagation(); triggerEditCatalogEntry('${escapeHTML(safeTitle)}')" title="Edit Catalog Entry" style="flex: 1; padding: 4px; font-size: 0.75rem; height: 28px;">
              <i class="fa-solid fa-pen" style="margin-right: 3px;"></i> Edit
            </button>
            <button class="btn btn-outline btn-sm" onclick="event.stopPropagation(); triggerDeleteCatalogEntry('${escapeHTML(safeTitle)}')" title="Delete Catalog Entry" style="flex: 1; padding: 4px; font-size: 0.75rem; height: 28px; color: var(--accent-danger); border-color: var(--accent-danger);">
              <i class="fa-solid fa-trash" style="margin-right: 3px;"></i> Delete
            </button>
          </div>
        </div>
      `;

      card.innerHTML = `
        ${starBtn}
        <div class="gallery-card-img-container">
          ${imageHtml}
        </div>
        ${frontOverlay}
        ${hoverOverlay}
      `;

      container.appendChild(card);
    });
  } catch (err) {
    console.error("Error in renderEntriesGalleryLayout:", err);
  }
}

// Render Table: Sales ledger list
function buildSalesRowHTML(sale, inventoryMap) {
  const initials = sale.title.split(" ").map(w => w[0]).join("").slice(0, 3);
  const gameInInv = inventoryMap.get(sale.inventoryId);
  const saleImgUrl = gameInInv ? gameInInv.imageUrl : null;
  const titleCell = saleImgUrl 
    ? `<div class="game-title-cell"><img src="${escapeHTML(saleImgUrl)}" class="game-thumbnail" alt="${escapeHTML(sale.title)}"><strong>${escapeHTML(sale.title)}</strong></div>`
    : `<div class="game-title-cell"><div class="game-thumbnail-placeholder" style="background: ${getHashGradient(sale.title)};">${escapeHTML(initials)}</div><strong>${escapeHTML(sale.title)}</strong></div>`;

  const isDisputed = sale.disputed === true;
  const isSupplierRefunded = sale.supplierRefunded === true;
  const rowStyle = isDisputed ? 'style="background-color: hsla(40, 95%, 55%, 0.04) !important; border-left: 3px solid var(--accent-warning);"' : '';
  
  let profitClass = 'text-success-neon';
  let profitSign = '';
  let profitStr = formatCurrency(sale.profit);
  
  if (isDisputed) {
    if (isSupplierRefunded) {
      profitClass = 'text-muted';
      profitSign = '';
      profitStr = formatCurrency(0);
    } else {
      profitClass = 'text-danger-soft';
      profitSign = '-';
      profitStr = formatCurrency(sale.cost);
    }
  }

  const sellPriceCell = isDisputed 
    ? `<s>${formatCurrency(sale.sellPrice)}</s> <span style="font-size: 0.65rem; color: var(--accent-warning); font-weight: 700; display: block; margin-top: 2px; letter-spacing: 0.05em;">REFUNDED</span>`
    : `<strong>${formatCurrency(sale.sellPrice)}</strong>`;

  const costCell = isDisputed && isSupplierRefunded
    ? `<s>${formatCurrency(sale.cost)}</s> <span style="font-size: 0.65rem; color: var(--accent-cyan); font-weight: 700; display: block; margin-top: 2px; letter-spacing: 0.05em;">REFUNDED</span>`
    : `<strong>${formatCurrency(sale.cost)}</strong>`;
  
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
      <td>${costCell}</td>
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

function updateSalesLedgerSummary(salesList) {
  const summaryEl = document.getElementById("sales-ledger-summary");
  if (!summaryEl) return;

  if (salesList.length === 0) {
    summaryEl.innerHTML = "";
    return;
  }

  let totalRevenue = 0;
  let totalCost = 0;
  let totalProfit = 0;
  
  salesList.forEach(sale => {
    const isDisputed = sale.disputed === true;
    const isSupplierRefunded = sale.supplierRefunded === true;
    
    const rev = isDisputed ? 0 : Number(sale.sellPrice || 0);
    const cost = (isDisputed && isSupplierRefunded) ? 0 : Number(sale.cost || 0);
    
    totalRevenue += rev;
    totalCost += cost;
    
    let resolvedProfit = Number(sale.profit || 0);
    if (isDisputed) {
      if (isSupplierRefunded) {
        resolvedProfit = 0;
      } else {
        resolvedProfit = -Number(sale.cost || 0);
      }
    }
    totalProfit += resolvedProfit;
  });

  const margin = totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100) : 0;

  summaryEl.innerHTML = `
    <div style="display: flex; gap: 16px; flex-wrap: wrap; margin-bottom: 16px; padding: 12px 16px; background: var(--bg-sidebar); border: 1px solid var(--border-color); border-radius: var(--radius-md); width: 100%;">
      <div style="display: flex; align-items: center; gap: 6px; font-size: 0.8rem;">
        <span style="color: var(--text-muted); font-weight: 500;">Total Revenue:</span>
        <span style="color: var(--text-main); font-weight: 700;">${formatCurrency(totalRevenue)}</span>
      </div>
      <div style="display: flex; align-items: center; gap: 6px; font-size: 0.8rem; border-left: 1px solid var(--border-color); padding-left: 16px;">
        <span style="color: var(--text-muted); font-weight: 500;">Total Cost:</span>
        <span style="color: var(--text-main); font-weight: 700;">${formatCurrency(totalCost)}</span>
      </div>
      <div style="display: flex; align-items: center; gap: 6px; font-size: 0.8rem; border-left: 1px solid var(--border-color); padding-left: 16px;">
        <span style="color: var(--text-muted); font-weight: 500;">Net Profit:</span>
        <span style="color: ${totalProfit >= 0 ? 'var(--accent-emerald)' : 'var(--accent-danger)'}; font-weight: 700;">${formatCurrency(totalProfit)}</span>
      </div>
      <div style="display: flex; align-items: center; gap: 6px; font-size: 0.8rem; border-left: 1px solid var(--border-color); padding-left: 16px;">
        <span style="color: var(--text-muted); font-weight: 500;">Profit Margin:</span>
        <span style="color: ${margin >= 0 ? 'var(--accent-cyan)' : 'var(--accent-danger)'}; font-weight: 700;">${margin.toFixed(1)}%</span>
      </div>
    </div>
  `;
}

function renderSalesTable(salesList) {
  const tbody = document.getElementById("sales-table-body");
  if (!tbody) return;
  tbody.innerHTML = "";

  // Update filtered summary statistics
  updateSalesLedgerSummary(salesList);

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
    const rowHeight = 65;
    const containerHeight = tableContainer.clientHeight || 600;

    const renderSlice = () => {
      const scrollTop = tableContainer.scrollTop;
      const totalItems = salesList.length;

      let startIndex = Math.floor(scrollTop / rowHeight);
      let endIndex = Math.ceil((scrollTop + containerHeight) / rowHeight);

      startIndex = Math.max(0, startIndex - 8);
      endIndex = Math.min(totalItems, endIndex + 8);

      if (startIndex <= 5) startIndex = 0;
      if (endIndex >= totalItems - 5) endIndex = totalItems;

      const topSpacerHeight = startIndex * rowHeight;
      const bottomSpacerHeight = (totalItems - endIndex) * rowHeight;

      let tbodyContent = "";

      if (topSpacerHeight > 0) {
        tbodyContent += `<tr style="height: ${topSpacerHeight}px; line-height: 0; font-size: 0;"><td colspan="10" style="padding: 0; border: none; height: ${topSpacerHeight}px; line-height: 0; font-size: 0;"></td></tr>`;
      }

      const slicedItems = salesList.slice(startIndex, endIndex);
      slicedItems.forEach(sale => {
        if (!sale) return;
        tbodyContent += buildSalesRowHTML(sale, inventoryMap);
      });

      if (bottomSpacerHeight > 0) {
        tbodyContent += `<tr style="height: ${bottomSpacerHeight}px; line-height: 0; font-size: 0;"><td colspan="10" style="padding: 0; border: none; height: ${bottomSpacerHeight}px; line-height: 0; font-size: 0;"></td></tr>`;
      }

      tbody.innerHTML = tbodyContent;
    };

    const onScroll = () => {
      requestAnimationFrame(renderSlice);
    };

    tableContainer.addEventListener("scroll", onScroll);
    tableContainer._scrollListener = onScroll;

    tableContainer.style.maxHeight = "calc(100vh - 350px)";
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
        : `<div class="game-title-cell"><div class="game-thumbnail-placeholder" style="background: ${getHashGradient(sale.title)};">${initials}</div><strong>${sale.title}</strong></div>`;

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
// ==========================================================================
// IMPORT & EXPORT DATA UTILITIES
// ==========================================================================

// Quote-aware CSV line parser
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

window.updateEntriesHeaderIcons = function(sortBy) {
  const iconMap = {
    "title": "entries-th-title-icon",
    "stock": "entries-th-stock-icon",
    "sold": "entries-th-sold-icon",
    "profit": "entries-th-profit-icon",
    "roi": "entries-th-roi-icon",
    "margin": "entries-th-margin-icon"
  };

  Object.values(iconMap).forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.className = "fa-solid fa-sort";
      el.style.color = "";
      el.style.opacity = "0.6";
    }
  });

  const parts = (sortBy || "").split("-");
  const field = parts[0];
  const dir = parts[1];
  const targetId = iconMap[field];
  if (targetId) {
    const targetEl = document.getElementById(targetId);
    if (targetEl) {
      targetEl.className = dir === "asc" ? "fa-solid fa-sort-up" : "fa-solid fa-sort-down";
      targetEl.style.color = "var(--accent-cyan)";
      targetEl.style.opacity = "1";
    }
  }
};

window.toggleEntriesSort = function(col) {
  const current = state.entriesSortBy || "rating-desc";
  let next = "";
  if (col === "title") {
    next = current === "title-asc" ? "title-desc" : "title-asc";
  } else if (col === "stock") {
    next = current === "stock-asc" ? "stock-desc" : "stock-asc";
  } else if (col === "sold") {
    next = current === "sold-desc" ? "sold-asc" : "sold-desc";
  } else if (col === "profit") {
    next = current === "profit-desc" ? "profit-asc" : "profit-desc";
  } else if (col === "roi") {
    next = current === "roi-desc" ? "roi-asc" : "roi-desc";
  } else if (col === "margin") {
    next = current === "margin-desc" ? "margin-asc" : "margin-desc";
  } else if (col === "rating") {
    next = current === "rating-desc" ? "rating-asc" : "rating-desc";
  } else {
    next = "rating-desc";
  }

  state.entriesSortBy = next;
  localStorage.setItem("gv_entries_sort_by", next);
  const sortSelect = document.getElementById("entries-sort-by");
  if (sortSelect) sortSelect.value = next;
  state.entriesCurrentPage = 1;
  renderEntries();
};

// Render dynamic Game Catalog Entries View
function renderEntries() {
  const tbody = DOM["entries-table-body"] || document.getElementById("entries-table-body");
  if (!tbody) return;
  tbody.innerHTML = "";

  // Sync layout buttons active class states
  const btnTable = document.getElementById("btn-entries-layout-table");
  const btnGallery = document.getElementById("btn-entries-layout-gallery");
  if (btnTable && btnGallery) {
    btnTable.classList.toggle("active", state.entriesLayout === "table");
    btnGallery.classList.toggle("active", state.entriesLayout === "gallery");
  }

  // Manage visibility of the two layout view containers
  const tableContainer = document.querySelector("#entries-view .table-responsive");
  const galleryContainer = document.getElementById("entries-gallery-container");
  if (tableContainer) tableContainer.style.display = "none";
  if (galleryContainer) galleryContainer.style.display = "none";

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

  // Sync Sort and Rating filter select states
  const sortSelect = document.getElementById("entries-sort-by");
  if (sortSelect && sortSelect.value !== (state.entriesSortBy || "rating-desc")) {
    sortSelect.value = state.entriesSortBy || "rating-desc";
  }
  const ratingSelect = document.getElementById("entries-rating-filter");
  if (ratingSelect && ratingSelect.value !== (state.entriesRatingFilter || "all")) {
    ratingSelect.value = state.entriesRatingFilter || "all";
  }
  if (typeof window.updateEntriesHeaderIcons === "function") {
    window.updateEntriesHeaderIcons(state.entriesSortBy || "rating-desc");
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
        sellDurations: [],
        lowestSoldPrice: null
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
    if (!sale || !sale.title) return;
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
        imageUrl: sale.imageUrl || null,
        publisher: null,
        sellDurations: [],
        lowestSoldPrice: null
      };
    }
    if (sale.imageUrl && !titleGroups[titleKey].imageUrl) {
      titleGroups[titleKey].imageUrl = sale.imageUrl;
    }
    if (!titleGroups[titleKey].sellDurations) {
      titleGroups[titleKey].sellDurations = [];
    }
    titleGroups[titleKey].totalSold++;
    titleGroups[titleKey].totalRevenue += sale.sellPrice;
    titleGroups[titleKey].totalCostOfSold += sale.cost;
    titleGroups[titleKey].profit += sale.profit;
    if (titleGroups[titleKey].lowestSoldPrice === null || sale.sellPrice < titleGroups[titleKey].lowestSoldPrice) {
      titleGroups[titleKey].lowestSoldPrice = sale.sellPrice;
    }

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

  // Check catalog artwork cache fallback & enrich review data
  const catalogArtMap = typeof window.getCatalogArtworkMap === "function" ? window.getCatalogArtworkMap() : (state.catalogArtwork || {});
  const reviewsMap = typeof window.getCatalogReviewsMap === "function" ? window.getCatalogReviewsMap() : (state.catalogReviews || {});

  Object.keys(titleGroups).forEach(tk => {
    if (!titleGroups[tk].imageUrl && catalogArtMap[tk]) {
      titleGroups[tk].imageUrl = catalogArtMap[tk];
    }
    const rev = reviewsMap[tk];
    titleGroups[tk].steamRatingPercent = (rev && rev.percent !== undefined && rev.percent !== null && Number(rev.percent) > 0) ? Number(rev.percent) : null;
    titleGroups[tk].steamReviewCount = (rev && rev.count !== undefined && rev.count !== null) ? Number(rev.count) : 0;
    titleGroups[tk].roiPercentage = titleGroups[tk].totalCostOfSold > 0 ? (titleGroups[tk].profit / titleGroups[tk].totalCostOfSold) * 100 : 0;
    titleGroups[tk].marginPercentage = titleGroups[tk].totalRevenue > 0 ? (titleGroups[tk].profit / titleGroups[tk].totalRevenue) * 100 : 0;
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

  // Percentage / Rating Filter
  const ratingFilter = state.entriesRatingFilter || "all";
  if (ratingFilter !== "all") {
    if (ratingFilter === "80plus") {
      entriesList = entriesList.filter(entry => entry.steamRatingPercent !== null && entry.steamRatingPercent >= 80);
    } else if (ratingFilter === "70plus") {
      entriesList = entriesList.filter(entry => entry.steamRatingPercent !== null && entry.steamRatingPercent >= 70);
    } else if (ratingFilter === "40to69") {
      entriesList = entriesList.filter(entry => entry.steamRatingPercent !== null && entry.steamRatingPercent >= 40 && entry.steamRatingPercent < 70);
    } else if (ratingFilter === "under40") {
      entriesList = entriesList.filter(entry => entry.steamRatingPercent !== null && entry.steamRatingPercent < 40);
    } else if (ratingFilter === "unrated") {
      entriesList = entriesList.filter(entry => entry.steamRatingPercent === null || entry.steamRatingPercent === undefined);
    }
  }

  // Sorting (Percentage & Performance metrics)
  const sortBy = state.entriesSortBy || "rating-desc";
  entriesList.sort((a, b) => {
    // Keep favorites pinned to top
    const aFav = state.favoriteGames && state.favoriteGames.includes(a.title);
    const bFav = state.favoriteGames && state.favoriteGames.includes(b.title);
    if (aFav && !bFav) return -1;
    if (!aFav && bFav) return 1;

    switch (sortBy) {
      case "rating-desc": {
        const aR = a.steamRatingPercent !== null ? a.steamRatingPercent : -1;
        const bR = b.steamRatingPercent !== null ? b.steamRatingPercent : -1;
        if (bR !== aR) return bR - aR;
        return (b.steamReviewCount || 0) - (a.steamReviewCount || 0);
      }
      case "rating-asc": {
        const aR = a.steamRatingPercent !== null ? a.steamRatingPercent : 999;
        const bR = b.steamRatingPercent !== null ? b.steamRatingPercent : 999;
        if (aR !== bR) return aR - bR;
        return (a.steamReviewCount || 0) - (b.steamReviewCount || 0);
      }
      case "margin-desc":
        return (b.marginPercentage || 0) - (a.marginPercentage || 0);
      case "margin-asc":
        return (a.marginPercentage || 0) - (b.marginPercentage || 0);
      case "roi-desc":
        return (b.roiPercentage || 0) - (a.roiPercentage || 0);
      case "roi-asc":
        return (a.roiPercentage || 0) - (b.roiPercentage || 0);
      case "stock-asc":
        return (a.availableStock || 0) - (b.availableStock || 0);
      case "stock-desc":
        return (b.availableStock || 0) - (a.availableStock || 0);
      case "sold-desc":
        return (b.totalSold || 0) - (a.totalSold || 0);
      case "profit-desc":
        return (b.profit || 0) - (a.profit || 0);
      case "title-desc":
        return b.title.localeCompare(a.title);
      case "title-asc":
      default:
        return a.title.localeCompare(b.title);
    }
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

  if (state.entriesLayout === "table") {
    if (tableContainer) tableContainer.style.display = "block";
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

      const titleLower = entry.title.trim().toLowerCase();
      const ratingPill = typeof window.renderSteamRatingPill === "function" 
        ? window.renderSteamRatingPill(entry.title, { imageUrl: entry.imageUrl, steamAppID: window.extractSteamAppId?.(entry.imageUrl) })
        : "";
      const pillSlot = ratingPill || `<span class="steam-pill-slot" data-title="${escapeHTML(titleLower)}"></span>`;

      const titleCell = entry.imageUrl
        ? `<div class="game-title-cell"><img src="${escapeHTML(entry.imageUrl)}" class="game-thumbnail" alt="${escapeHTML(entry.title)}"><div><div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;"><strong>${escapeHTML(entry.title)}</strong>${starBtn}${pillSlot}</div>${publisherSubtitle}</div></div>`
        : `<div class="game-title-cell"><div class="game-thumbnail-placeholder" style="background: ${getHashGradient(entry.title)};">${escapeHTML(initials)}</div><div><div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;"><strong>${escapeHTML(entry.title)}</strong>${starBtn}${pillSlot}</div>${publisherSubtitle}</div></div>`;

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
        badgeClass = "badge-low-stock badge-pulse-warning";
        badgeText = `${entry.availableStock} in stock (Low)`;
      }

      tr.innerHTML = `
        <td>${titleCell}</td>
        <td><span style="font-weight: 600;">${entry.totalAdded}</span> keys</td>
        <td><span class="badge ${badgeClass}">${badgeText}</span></td>
        <td><span style="font-weight: 600;">${entry.totalSold}</span> sold</td>
        <td>${avgDaysCell}</td>
        <td>${entry.lowestSoldPrice !== null ? formatCurrency(entry.lowestSoldPrice) : '<span class="text-muted">—</span>'}</td>
        <td>${formatCurrency(entry.totalRevenue)}</td>
        <td class="${entry.profit >= 0 ? 'text-success-neon' : 'text-danger-soft'}"><strong>${formatCurrency(entry.profit)}</strong></td>
        <td>${getMiniMarginBar(roiPercentage)}</td>
        <td>${getMiniMarginBar(marginPercentage)}</td>
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
  } else if (state.entriesLayout === "gallery") {
    if (galleryContainer) galleryContainer.style.display = "grid";
    renderEntriesGalleryLayout(paginatedEntriesList);
  }

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
    topBestsellersRevenue: document.getElementById("card-chart-topBestsellersRevenue"),
    topBestsellersSales: document.getElementById("card-chart-topBestsellersSales"),
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

function bindFinanceDragAndDrop() {
  const container = document.getElementById("finance-charts-container");
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
      
      const fromIndex = state.financeOrder.indexOf(fromKey);
      const toIndex = state.financeOrder.indexOf(toKey);
      
      if (fromIndex !== -1 && toIndex !== -1) {
        // Swap visual and state order
        state.financeOrder[fromIndex] = toKey;
        state.financeOrder[toIndex] = fromKey;
        
        saveStateToStorage();
        renderFinanceCardsOrder();
        
        showToast("Rearranged finances layout.", "success");
        
        if (window.supabaseClient) {
          dbSaveSettings("financeOrder", state.financeOrder);
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

function applyFinanceSpans() {
  const container = document.getElementById("finance-charts-container");
  if (!container) return;
  
  Object.keys(state.financeSpans).forEach(key => {
    const card = container.querySelector(`[data-figure="${key}"]`);
    if (card) {
      card.classList.remove("span-1", "span-2", "span-3");
      const spanVal = state.financeSpans[key] || 1;
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
  const finContainer = document.getElementById("finance-charts-container");
  const overlay = document.getElementById("widget-fullscreen-overlay");
  
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
        const isFinance = card.closest(".finance-charts-grid") !== null;
        if (isFinance) {
          state.financeSpans[figureKey] = spanVal;
          saveStateToStorage();
          applyFinanceSpans();
          if (window.supabaseClient) {
            dbSaveSettings("financeSpans", state.financeSpans);
          }
        } else {
          state.dashboardSpans[figureKey] = spanVal;
          saveStateToStorage();
          applyDashboardSpans();
          if (window.supabaseClient) {
            dbSaveSettings("dashboardSpans", state.dashboardSpans);
          }
        }
        
        const menu = item.closest(".card-actions-menu");
        if (menu) menu.classList.remove("active");
        
        showToast("Adjusted card width.", "success");
        window.dispatchEvent(new Event("resize"));
      }
    }
  };

  if (container) {
    container.addEventListener("click", handleCardActionClick);
  }
  if (finContainer) {
    finContainer.addEventListener("click", handleCardActionClick);
  }
  if (overlay) {
    overlay.addEventListener("click", handleCardActionClick);
  }
}

let fullscreenOriginalParent = null;
let fullscreenOriginalSibling = null;

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

let dragSource = null;

function getPeriodStockStatus(key, breakdownType, precomputedSaleMap = null) {
  let endMs = Infinity;
  if (key !== "All Time") {
    if (breakdownType === "month") {
      const year = parseInt(key.substring(0, 4), 10);
      const month = parseInt(key.substring(5, 7), 10);
      const end = new Date(year, month, 0, 23, 59, 59, 999);
      endMs = end.getTime();
    } else if (breakdownType === "year") {
      const year = parseInt(key, 10);
      const end = new Date(year, 12, 0, 23, 59, 59, 999);
      endMs = end.getTime();
    }
  }

  let saleMap = precomputedSaleMap;
  if (!saleMap) {
    saleMap = {};
    if (state.sales && Array.isArray(state.sales)) {
      state.sales.forEach(sale => {
        if (sale.inventoryId) {
          saleMap[sale.inventoryId] = sale;
        }
      });
    }
  }

  let openCount = 0;
  let openCost = 0;

  if (state.inventory && Array.isArray(state.inventory)) {
    state.inventory.forEach(item => {
      if (!item.purchaseDate) return;
      const pTime = new Date(item.purchaseDate).getTime();
      if (pTime <= endMs) {
        const sale = saleMap[item.id];
        if (sale && sale.saleDate) {
          const sTime = new Date(sale.saleDate).getTime();
          if (sTime > endMs) {
            openCount++;
            openCost += (parseFloat(item.cost) || 0);
          }
        } else {
          if (item.status !== "sold") {
            openCount++;
            openCost += (parseFloat(item.cost) || 0);
          }
        }
      }
    });
  }

  return { count: openCount, cost: openCost };
}

function updateFinanceBreakdownCollapseUI() {
  const card = document.getElementById("finance-detail-card");
  const icon = document.getElementById("finance-breakdown-collapse-icon");
  const text = document.getElementById("finance-breakdown-collapse-text");
  const btn = document.getElementById("btn-toggle-finance-breakdown");
  const hint = document.getElementById("finance-breakdown-collapsed-hint");
  const controls = document.getElementById("finance-breakdown-controls");
  const content = document.getElementById("finance-detail-content");
  const isCollapsed = !!state.financeBreakdownCollapsed;

  if (card) {
    card.classList.toggle("is-collapsed", isCollapsed);
  }
  if (icon) {
    icon.className = isCollapsed ? "fa-solid fa-chevron-down" : "fa-solid fa-chevron-up";
  }
  if (text) {
    text.textContent = isCollapsed ? "Expand" : "Collapse";
  }
  if (btn) {
    btn.title = isCollapsed ? "Expand Monthly Ledger Breakdown" : "Collapse Monthly Ledger Breakdown";
    if (isCollapsed) {
      btn.classList.add("collapsed");
    } else {
      btn.classList.remove("collapsed");
    }
  }
  if (hint) {
    hint.style.display = isCollapsed ? "inline-flex" : "none";
  }
  if (controls) {
    controls.style.display = isCollapsed ? "none" : "flex";
  }
  if (content) {
    content.style.display = isCollapsed ? "none" : "block";
  }
}
window.updateFinanceBreakdownCollapseUI = updateFinanceBreakdownCollapseUI;

function renderFinanceView() {
  const metricsContainer = document.getElementById("finance-metrics-grid");
  const detailContent = document.getElementById("finance-detail-content");
  const canvas = document.getElementById("financeMonthlyChart");
  const breakdownSelect = document.getElementById("finance-breakdown-type");
  const breakdownTitle = document.getElementById("finance-breakdown-title");
  const chartBreakdownSelect = document.getElementById("finance-chart-breakdown-type");
  const chartTitle = document.getElementById("finance-chart-title");
  
  if (!metricsContainer || !detailContent || !canvas) return;

  updateFinanceBreakdownCollapseUI();

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

  // Populate the Chart Year Filter dropdown if it exists
  const chartYearFilter = document.getElementById("finance-chart-year-filter");
  let selectedChartYear = "all";
  if (chartYearFilter) {
    if (chartBreakdownType === "month") {
      chartYearFilter.style.display = "";
      
      // Get unique years from sales
      const years = new Set();
      state.sales.forEach(sale => {
        if (sale.saleDate && sale.saleDate.length >= 4) {
          const y = sale.saleDate.substring(0, 4);
          if (/^\d{4}$/.test(y)) years.add(y);
        }
      });
      
      const sortedYears = Array.from(years).sort((a, b) => b.localeCompare(a));
      const currentSelected = chartYearFilter.value || "all";
      
      chartYearFilter.innerHTML = `<option value="all">All Years</option>`;
      sortedYears.forEach(y => {
        chartYearFilter.innerHTML += `<option value="${y}">${y}</option>`;
      });
      
      // Restore selected year if still valid
      if (currentSelected === "all" || sortedYears.includes(currentSelected)) {
        chartYearFilter.value = currentSelected;
      } else {
        chartYearFilter.value = "all";
      }
      selectedChartYear = chartYearFilter.value;
    } else {
      chartYearFilter.style.display = "none";
    }
  }

  // Toggle dynamic visibility of Compare Prior Year checkbox
  const compareLabel = document.getElementById("finance-chart-compare-label");
  const compareCheckbox = document.getElementById("finance-chart-compare-prior");
  let shouldComparePrior = false;
  
  if (compareLabel && compareCheckbox) {
    if (chartBreakdownType === "month" && selectedChartYear !== "all") {
      compareLabel.style.display = "flex";
      shouldComparePrior = compareCheckbox.checked;
    } else {
      compareLabel.style.display = "none";
      compareCheckbox.checked = false;
    }
  }

  // Populate the Averages Chart Year Filter dropdown if it exists
  const avgChartYearFilter = document.getElementById("finance-avg-chart-year-filter");
  let selectedAvgChartYear = "all";
  if (avgChartYearFilter) {
    // Get unique years from sales
    const years = new Set();
    state.sales.forEach(sale => {
      if (sale.saleDate && sale.saleDate.length >= 4) {
        const y = sale.saleDate.substring(0, 4);
        if (/^\d{4}$/.test(y)) years.add(y);
      }
    });
    
    const sortedYears = Array.from(years).sort((a, b) => b.localeCompare(a));
    const currentSelected = avgChartYearFilter.value || "all";
    
    avgChartYearFilter.innerHTML = `<option value="all">All Years</option>`;
    sortedYears.forEach(y => {
      avgChartYearFilter.innerHTML += `<option value="${y}">${y}</option>`;
    });
    
    // Restore selected year if still valid
    if (currentSelected === "all" || sortedYears.includes(currentSelected)) {
      avgChartYearFilter.value = currentSelected;
    } else {
      avgChartYearFilter.value = "all";
    }
    selectedAvgChartYear = avgChartYearFilter.value;
  }

  // Populate the Outflow Chart Year Filter dropdown if it exists
  const outflowChartYearFilter = document.getElementById("finance-outflow-chart-year-filter");
  let selectedOutflowYear = "all";
  if (outflowChartYearFilter) {
    const years = new Set();
    state.inventory.forEach(item => {
      if (item.purchaseDate && item.purchaseDate.length >= 4) {
        const y = item.purchaseDate.substring(0, 4);
        if (/^\d{4}$/.test(y)) years.add(y);
      }
    });
    state.payouts.forEach(p => {
      if (p.date && p.date.length >= 4) {
        const y = p.date.substring(0, 4);
        if (/^\d{4}$/.test(y)) years.add(y);
      }
    });
    
    const sortedYears = Array.from(years).sort((a, b) => b.localeCompare(a));
    const currentSelected = outflowChartYearFilter.value || "all";
    
    outflowChartYearFilter.innerHTML = `<option value="all">All Years</option>`;
    sortedYears.forEach(y => {
      outflowChartYearFilter.innerHTML += `<option value="${y}">${y}</option>`;
    });
    
    if (currentSelected === "all" || sortedYears.includes(currentSelected)) {
      outflowChartYearFilter.value = currentSelected;
    } else {
      outflowChartYearFilter.value = "all";
    }
    selectedOutflowYear = outflowChartYearFilter.value;
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
    if (chartBreakdownType === "month") {
      if (shouldComparePrior && selectedChartYear !== "all") {
        const prevYear = (parseInt(selectedChartYear, 10) - 1).toString();
        chartTitle.textContent = `Monthly Financial Trend (${selectedChartYear} vs ${prevYear})`;
      } else {
        chartTitle.textContent = selectedChartYear === "all" ? "Monthly Financial Trend" : `Monthly Financial Trend (${selectedChartYear})`;
      }
    }
    else if (chartBreakdownType === "year") chartTitle.textContent = "Yearly Financial Trend";
    else chartTitle.textContent = "All-Time Cumulative Financial Trend";
  }

  const avgChartTitle = document.getElementById("finance-avg-chart-title");
  const avgMetricSelect = document.getElementById("finance-avg-chart-metric-type");
  const avgMetricType = avgMetricSelect ? avgMetricSelect.value : "financial";

  if (avgChartTitle) {
    const yrSuffix = selectedAvgChartYear === "all" ? "" : ` (${selectedAvgChartYear})`;
    if (avgMetricType === "financial") {
      avgChartTitle.textContent = `Unit Performance Averages${yrSuffix}`;
    } else if (avgMetricType === "duration") {
      avgChartTitle.textContent = `Average Shelf Duration (Days)${yrSuffix}`;
    } else {
      avgChartTitle.textContent = `Average Profit Margin (%)${yrSuffix}`;
    }
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

  // Precompute inventoryId -> sale map once for high performance across all period lookups
  const financeSaleMap = {};
  if (state.sales && Array.isArray(state.sales)) {
    state.sales.forEach(sale => {
      if (sale.inventoryId) {
        financeSaleMap[sale.inventoryId] = sale;
      }
    });
  }

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
      tableResponsive.style.border = "1px solid var(--border-color)";
      tableResponsive.style.borderRadius = "var(--radius-md)";
      tableResponsive.style.overflowX = "auto";
      
      const table = document.createElement("table");
      table.className = "table table-spreadsheet";
      table.style.width = "100%";
      
      const periodHeaders = sortedKeys.map(k => {
        return `<th style="text-align: right; min-width: 110px;">${breakdownType === "month" ? formatMonthKey(k) : k}</th>`;
      }).join("");

      table.innerHTML = `
        <thead>
          <tr>
            <th class="sticky-col" style="min-width: 170px;">Metric</th>
            ${periodHeaders}
          </tr>
        </thead>
        <tbody>
          <tr style="border-bottom: 1px solid var(--border-color);">
            <td class="sticky-col" style="font-weight: 600; color: var(--accent-cyan);">Sold Items</td>
            ${sortedKeys.map(k => `<td style="text-align: right; color: var(--accent-cyan); font-weight: 500;">${groupedData[k].count} keys</td>`).join("")}
          </tr>
          <tr style="border-bottom: 1px solid var(--border-color);">
            <td class="sticky-col" style="font-weight: 600; color: var(--accent-cyan);">Unsold Stock (Qty)</td>
            ${sortedKeys.map(k => {
              const stock = getPeriodStockStatus(k, breakdownType, financeSaleMap);
              return `<td style="text-align: right; color: var(--accent-cyan); font-weight: 500;">${stock.count} keys</td>`;
            }).join("")}
          </tr>
          <tr style="border-bottom: 1px solid var(--border-color);">
            <td class="sticky-col" style="font-weight: 600; color: var(--accent-emerald);">Revenue</td>
            ${sortedKeys.map(k => `<td style="text-align: right; color: var(--accent-emerald); font-weight: 600;">${formatCurrency(groupedData[k].revenue)}</td>`).join("")}
          </tr>
          <tr style="border-bottom: 1px solid var(--border-color);">
            <td class="sticky-col" style="font-weight: 600; color: var(--accent-amber);">Expenses (Cost)</td>
            ${sortedKeys.map(k => `<td style="text-align: right; color: var(--accent-amber); font-weight: 500;">${formatCurrency(groupedData[k].cost)}</td>`).join("")}
          </tr>
          <tr style="border-bottom: 1px solid var(--border-color);">
            <td class="sticky-col" style="font-weight: 600; color: var(--accent-amber);">Stock Valuation (Cost)</td>
            ${sortedKeys.map(k => {
              const stock = getPeriodStockStatus(k, breakdownType, financeSaleMap);
              return `<td style="text-align: right; color: var(--accent-amber); font-weight: 500;">${formatCurrency(stock.cost)}</td>`;
            }).join("")}
          </tr>
          <tr style="font-weight: 700; background: hsla(270, 85%, 60%, 0.05); border-top: 1.5px solid var(--border-color); border-bottom: 1.5px solid var(--border-color);">
            <td class="sticky-col" style="font-weight: 700; color: var(--accent-purple);">Profit</td>
            ${sortedKeys.map(k => {
              const stats = groupedData[k];
              return `<td class="${stats.profit >= 0 ? 'text-success-neon' : 'text-danger-soft'}" style="text-align: right; font-weight: 700;">${stats.profit >= 0 ? '+' : ''}${formatCurrency(stats.profit)}</td>`;
            }).join("")}
          </tr>
          <tr style="border-bottom: 1px solid var(--border-color);">
            <td class="sticky-col" style="font-weight: 600; color: var(--text-primary);">~Sold Price</td>
            ${sortedKeys.map(k => {
              const stats = groupedData[k];
              const avgPrice = stats.count > 0 ? stats.revenue / stats.count : 0;
              return `<td style="text-align: right; color: var(--text-primary);">${formatCurrency(avgPrice)}</td>`;
            }).join("")}
          </tr>
          <tr style="border-bottom: 1px solid var(--border-color);">
            <td class="sticky-col" style="font-weight: 600; color: var(--text-success-neon);">~Profit</td>
            ${sortedKeys.map(k => {
              const stats = groupedData[k];
              const avgProfit = stats.count > 0 ? stats.profit / stats.count : 0;
              return `<td class="${avgProfit >= 0 ? 'text-success-neon' : 'text-danger-soft'}" style="text-align: right; font-weight: 600;">${avgProfit >= 0 ? '+' : ''}${formatCurrency(avgProfit)}</td>`;
            }).join("")}
          </tr>
          <tr style="border-bottom: 1px solid var(--border-color);">
            <td class="sticky-col" style="font-weight: 600; color: var(--accent-pink);">~Margin %</td>
            ${sortedKeys.map(k => {
              const stats = groupedData[k];
              const avgPrice = stats.count > 0 ? stats.revenue / stats.count : 0;
              const avgProfit = stats.count > 0 ? stats.profit / stats.count : 0;
              const avgMargin = avgPrice > 0 ? (avgProfit / avgPrice) * 100 : 0;
              return `<td style="text-align: right; color: var(--accent-pink); font-weight: 600;">${avgMargin.toFixed(2)}</td>`;
            }).join("")}
          </tr>
          <tr style="border-bottom: 1px solid var(--border-color);">
            <td class="sticky-col" style="font-weight: 600; color: var(--text-secondary);">~Duration</td>
            ${sortedKeys.map(k => {
              const stats = groupedData[k];
              const avgDuration = stats.durationCount > 0 ? stats.totalSellDays / stats.durationCount : 0;
              return `<td style="text-align: right; color: var(--text-secondary);">${avgDuration.toFixed(2)} days</td>`;
            }).join("")}
          </tr>
          <tr>
            <td class="sticky-col" style="font-weight: 600; color: var(--accent-purple);">ROI</td>
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
        const stock = getPeriodStockStatus(k, breakdownType, financeSaleMap);
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
            <span style="color: var(--text-secondary);">Ending Stock:</span>
            <strong style="color: var(--accent-cyan);">${stock.count} keys (${formatCurrency(stock.cost)})</strong>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center; background: var(--bg-input); padding: 6px 12px; border-radius: 6px; font-size: 0.8rem; border: 1px solid var(--border-color); margin-top: -6px;">
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
            <th style="width: 80px; text-align: center;">
              <button type="button" class="btn btn-xs btn-outline btn-toggle-all-expandable" style="font-size: 0.7rem; padding: 2px 6px; border-radius: 4px; cursor: pointer; white-space: nowrap;" title="Expand or collapse all period details">Expand All</button>
            </th>
          </tr>
        </thead>
        <tbody></tbody>
      `;
      
      const tbody = table.querySelector("tbody");
      const btnToggleAll = table.querySelector(".btn-toggle-all-expandable");
      let allExpanded = false;
      if (btnToggleAll) {
        btnToggleAll.addEventListener("click", (e) => {
          e.stopPropagation();
          allExpanded = !allExpanded;
          btnToggleAll.textContent = allExpanded ? "Collapse All" : "Expand All";
          const allDetails = tbody.querySelectorAll(".details-row");
          const allIcons = tbody.querySelectorAll(".toggle-icon");
          allDetails.forEach(row => {
            row.classList.toggle("hidden", !allExpanded);
          });
          allIcons.forEach(icon => {
            icon.style.transform = allExpanded ? "rotate(180deg)" : "rotate(0deg)";
            icon.style.color = allExpanded ? "var(--text-primary)" : "var(--text-muted)";
          });
        });
      }
      sortedKeys.forEach(k => {
        const stats = groupedData[k];
        const stock = getPeriodStockStatus(k, breakdownType, financeSaleMap);
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
                <span style="color: var(--text-muted); font-size: 0.75rem; display: block; text-transform: uppercase; letter-spacing: 0.5px;">Ending Stock</span>
                <span style="font-weight: 600; display: block; margin-top: 4px;">Unsold: ${stock.count} keys</span>
                <span style="display: block; color: var(--text-secondary);">Value: ${formatCurrency(stock.cost)}</span>
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
                <th>Ending Stock</th>
                <th>Stock Cost</th>
                <th>ROI</th>
              </tr>
            </thead>
            <tbody></tbody>
          `;
          const tbody = table.querySelector("tbody");
          sortedKeys.forEach(k => {
            const stats = groupedData[k];
            const stock = getPeriodStockStatus(k, breakdownType, financeSaleMap);
            const roi = stats.cost > 0 ? (stats.profit / stats.cost) * 100 : 0;
            const periodLabel = breakdownType === "month" ? formatMonthKey(k) : k;
            
            const tr = document.createElement("tr");
            tr.innerHTML = `
              <td><strong>${periodLabel}</strong></td>
              <td>${stats.count} keys</td>
              <td>${formatCurrency(stats.revenue)}</td>
              <td>${formatCurrency(stats.cost)}</td>
              <td class="${stats.profit >= 0 ? 'text-success-neon' : 'text-danger-soft'}">${stats.profit >= 0 ? '+' : ''}${formatCurrency(stats.profit)}</td>
              <td>${stock.count} keys</td>
              <td>${formatCurrency(stock.cost)}</td>
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
            <th>Ending Stock</th>
            <th>Stock Cost</th>
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
        const stock = getPeriodStockStatus(k, breakdownType, financeSaleMap);
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
          <td>${stock.count} keys</td>
          <td>${formatCurrency(stock.cost)}</td>
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

  let compRevenueData = [];
  let compProfitData = [];
  let activeBaseYear = selectedChartYear;
  let activeCompareYear = "";
  if (selectedChartYear !== "all") {
    activeCompareYear = (parseInt(selectedChartYear, 10) - 1).toString();
  }

  if (chartBreakdownType === "month") {
    if (shouldComparePrior && selectedChartYear !== "all") {
      const baseMonthly = Array(12).fill(0).map(() => ({ revenue: 0, profit: 0 }));
      const compareMonthly = Array(12).fill(0).map(() => ({ revenue: 0, profit: 0 }));

      state.sales.forEach(sale => {
        if (!sale.saleDate || sale.saleDate.length < 7) return;
        const year = sale.saleDate.substring(0, 4);
        const monthIdx = parseInt(sale.saleDate.substring(5, 7), 10) - 1;
        if (monthIdx < 0 || monthIdx > 11) return;

        if (year === activeBaseYear) {
          baseMonthly[monthIdx].revenue += sale.sellPrice;
          baseMonthly[monthIdx].profit += sale.profit;
        } else if (year === activeCompareYear) {
          compareMonthly[monthIdx].revenue += sale.sellPrice;
          compareMonthly[monthIdx].profit += sale.profit;
        }
      });

      chartKeys = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      revenueData = baseMonthly.map(m => m.revenue);
      profitData = baseMonthly.map(m => m.profit);
      compRevenueData = compareMonthly.map(m => m.revenue);
      compProfitData = compareMonthly.map(m => m.profit);
    } else {
      const monthlyData = {};
      state.sales.forEach(sale => {
        const year = sale.saleDate.substring(0, 4);
        if (selectedChartYear !== "all" && year !== selectedChartYear) {
          return;
        }
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
    }
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

  const chartLabels = (chartBreakdownType === "year" || (chartBreakdownType === "month" && shouldComparePrior && selectedChartYear !== "all"))
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
      datasets: (chartBreakdownType === "month" && shouldComparePrior && selectedChartYear !== "all") ? [
        {
          label: `Revenue (${activeBaseYear})`,
          data: revenueData,
          borderColor: 'hsl(330, 95%, 60%)', // Solid Pink
          backgroundColor: 'transparent',
          borderWidth: 3,
          fill: false,
          tension: 0.35,
          pointBackgroundColor: 'hsl(330, 95%, 60%)',
          pointHoverRadius: 6
        },
        {
          label: `Revenue (${activeCompareYear})`,
          data: compRevenueData,
          borderColor: 'hsla(330, 95%, 60%, 0.45)', // Lighter/transparent Pink
          backgroundColor: 'transparent',
          borderWidth: 2,
          borderDash: [5, 5],
          fill: false,
          tension: 0.35,
          pointBackgroundColor: 'hsla(330, 95%, 60%, 0.5)',
          pointHoverRadius: 6
        },
        {
          label: `Profit (${activeBaseYear})`,
          data: profitData,
          borderColor: 'hsl(175, 90%, 48%)', // Solid Teal
          backgroundColor: 'transparent',
          borderWidth: 3,
          fill: false,
          tension: 0.35,
          pointBackgroundColor: 'hsl(175, 90%, 48%)',
          pointHoverRadius: 6
        },
        {
          label: `Profit (${activeCompareYear})`,
          data: compProfitData,
          borderColor: 'hsla(175, 90%, 48%, 0.45)', // Lighter/transparent Teal
          backgroundColor: 'transparent',
          borderWidth: 2,
          borderDash: [5, 5],
          fill: false,
          tension: 0.35,
          pointBackgroundColor: 'hsla(175, 90%, 48%, 0.5)',
          pointHoverRadius: 6
        }
      ] : [
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

  // Render averages trend chart
  const avgCanvas = document.getElementById("financeAveragesChart");
  if (avgCanvas) {
    const avgCtx = avgCanvas.getContext("2d");

    if (financeAveragesChartInstance) {
      try {
        financeAveragesChartInstance.destroy();
      } catch (e) {
        console.error("Error destroying financeAveragesChartInstance:", e);
      }
    }

    // Group and format averages data
    let avgChartKeys = [];
    let avgRevenueData = [];
    let avgCostData = [];
    let avgProfitData = [];
    let avgDurationData = [];
    let avgMarginData = [];

    const avgMonthlyData = {};
    state.sales.forEach(sale => {
      const year = sale.saleDate.substring(0, 4);
      if (selectedAvgChartYear !== "all" && year !== selectedAvgChartYear) {
        return;
      }
      const m = sale.saleDate.substring(0, 7); // e.g. "2026-06"
      if (!avgMonthlyData[m]) {
        avgMonthlyData[m] = { revenue: 0, cost: 0, profit: 0, count: 0, totalSellDays: 0, durationCount: 0 };
      }
      avgMonthlyData[m].revenue += sale.sellPrice;
      avgMonthlyData[m].cost += sale.cost;
      avgMonthlyData[m].profit += sale.profit;
      avgMonthlyData[m].count += 1;

      const invItem = state.inventory.find(i => i.id === sale.inventoryId);
      if (invItem && invItem.purchaseDate && sale.saleDate) {
        const start = new Date(invItem.purchaseDate);
        const end = new Date(sale.saleDate);
        start.setHours(0, 0, 0, 0);
        end.setHours(0, 0, 0, 0);
        const diffTime = Math.max(0, end - start);
        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
        avgMonthlyData[m].totalSellDays += diffDays;
        avgMonthlyData[m].durationCount += 1;
      }
    });

    avgChartKeys = Object.keys(avgMonthlyData).sort();

    if (avgMetricType === "financial") {
      avgRevenueData = avgChartKeys.map(k => avgMonthlyData[k].count > 0 ? avgMonthlyData[k].revenue / avgMonthlyData[k].count : 0);
      avgCostData = avgChartKeys.map(k => avgMonthlyData[k].count > 0 ? avgMonthlyData[k].cost / avgMonthlyData[k].count : 0);
      avgProfitData = avgChartKeys.map(k => avgMonthlyData[k].count > 0 ? avgMonthlyData[k].profit / avgMonthlyData[k].count : 0);
    } else if (avgMetricType === "duration") {
      avgDurationData = avgChartKeys.map(k => avgMonthlyData[k].durationCount > 0 ? avgMonthlyData[k].totalSellDays / avgMonthlyData[k].durationCount : 0);
    } else { // "margin"
      avgMarginData = avgChartKeys.map(k => avgMonthlyData[k].revenue > 0 ? (avgMonthlyData[k].profit / avgMonthlyData[k].revenue) * 100 : 0);
    }

    const avgChartLabels = avgChartKeys.length > 0 ? avgChartKeys.map(m => formatMonthKey(m)) : [formatMonthKey(new Date().toISOString().substring(0, 7))];

    let avgDatasets = [];
    if (avgMetricType === "financial") {
      avgDatasets = [
        {
          label: `Avg Sell Price`,
          data: avgRevenueData,
          borderColor: 'hsl(145, 80%, 45%)',
          backgroundColor: 'hsla(145, 80%, 45%, 0.05)',
          borderWidth: 3,
          fill: true,
          tension: 0.35,
          pointBackgroundColor: 'hsl(145, 80%, 45%)',
          pointHoverRadius: 6
        },
        {
          label: `Avg Unit Cost`,
          data: avgCostData,
          borderColor: 'hsl(35, 90%, 55%)',
          backgroundColor: 'hsla(35, 90%, 55%, 0.05)',
          borderWidth: 3,
          fill: true,
          tension: 0.35,
          pointBackgroundColor: 'hsl(35, 90%, 55%)',
          pointHoverRadius: 6
        },
        {
          label: `Avg Profit`,
          data: avgProfitData,
          borderColor: 'hsl(185, 90%, 45%)',
          backgroundColor: 'hsla(185, 90%, 45%, 0.05)',
          borderWidth: 3,
          fill: true,
          tension: 0.35,
          pointBackgroundColor: 'hsl(185, 90%, 45%)',
          pointHoverRadius: 6
        }
      ];
    } else if (avgMetricType === "duration") {
      avgDatasets = [
        {
          label: `Avg Shelf Duration (Days)`,
          data: avgDurationData,
          borderColor: 'hsl(260, 85%, 65%)',
          backgroundColor: 'hsla(260, 85%, 65%, 0.05)',
          borderWidth: 3,
          fill: true,
          tension: 0.35,
          pointBackgroundColor: 'hsl(260, 85%, 65%)',
          pointHoverRadius: 6
        }
      ];
    } else { // "margin"
      avgDatasets = [
        {
          label: `Avg Profit Margin (%)`,
          data: avgMarginData,
          borderColor: 'hsl(175, 90%, 48%)',
          backgroundColor: 'hsla(175, 90%, 48%, 0.05)',
          borderWidth: 3,
          fill: true,
          tension: 0.35,
          pointBackgroundColor: 'hsl(175, 90%, 48%)',
          pointHoverRadius: 6
        }
      ];
    }

    financeAveragesChartInstance = new Chart(avgCtx, {
      type: 'line',
      data: {
        labels: avgChartLabels,
        datasets: avgDatasets
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
            borderWidth: 1,
            callbacks: {
              label: function(context) {
                let label = context.dataset.label || '';
                if (label) {
                  label += ': ';
                }
                if (context.parsed.y !== null) {
                  if (avgMetricType === "financial") {
                    label += formatCurrency(context.parsed.y);
                  } else if (avgMetricType === "duration") {
                    label += context.parsed.y.toFixed(1) + ' days';
                  } else {
                    label += context.parsed.y.toFixed(1) + '%';
                  }
                }
                return label;
              }
            }
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

  // Render outflow & expense allocation doughnut chart
  const outflowCanvas = document.getElementById("financeOutflowChart");
  if (outflowCanvas) {
    const outflowCtx = outflowCanvas.getContext("2d");

    if (financeOutflowChartInstance) {
      try {
        financeOutflowChartInstance.destroy();
      } catch (e) {
        console.error("Error destroying financeOutflowChartInstance:", e);
      }
    }

    // Group and format outflow data
    const outflowAllocation = {};

    // 1. Calculate Supplier Key Purchases outflow
    let supplierOutflow = 0;
    state.inventory.forEach(item => {
      if (item.recycleBin) return;
      const year = item.purchaseDate ? item.purchaseDate.substring(0, 4) : "";
      if (selectedOutflowYear !== "all" && year !== selectedOutflowYear) {
        return;
      }
      supplierOutflow += parseFloat(item.cost) || 0;
    });

    if (supplierOutflow > 0) {
      outflowAllocation["Key Purchases (Supplier)"] = supplierOutflow;
    }

    // 2. Add Payouts/Expenses outflow by category
    state.payouts.forEach(p => {
      const year = p.date ? p.date.substring(0, 4) : "";
      if (selectedOutflowYear !== "all" && year !== selectedOutflowYear) {
        return;
      }
      const cat = p.category || "Miscellaneous Expense";
      const amt = parseFloat(p.amount) || 0;
      if (amt > 0) {
        if (!outflowAllocation[cat]) {
          outflowAllocation[cat] = 0;
        }
        outflowAllocation[cat] += amt;
      }
    });

    const outflowLabels = Object.keys(outflowAllocation);
    const outflowData = outflowLabels.map(cat => outflowAllocation[cat]);

    // Update outflow chart header text dynamically
    const outflowTitle = document.getElementById("finance-outflow-chart-title");
    if (outflowTitle) {
      outflowTitle.textContent = selectedOutflowYear === "all" ? "Outflow & Expense Allocation" : `Outflow & Expense Allocation (${selectedOutflowYear})`;
    }

    // Modern color palette for categories
    const outflowPalette = [
      'hsl(330, 95%, 60%)', // Key purchases (Pink/Rose)
      'hsl(195, 90%, 50%)', // Cyan
      'hsl(260, 85%, 65%)', // Purple
      'hsl(35, 90%, 55%)',  // Amber
      'hsl(145, 80%, 45%)', // Green
      'hsl(350, 85%, 55%)', // Red
      'hsl(175, 90%, 48%)', // Teal
      'hsl(220, 12%, 65%)'  // Gray
    ];

    if (outflowLabels.length === 0) {
      outflowLabels.push("No recorded outflow");
      outflowData.push(0);
    }

    financeOutflowChartInstance = new Chart(outflowCtx, {
      type: 'doughnut',
      data: {
        labels: outflowLabels,
        datasets: [{
          data: outflowData,
          backgroundColor: outflowPalette.slice(0, outflowLabels.length),
          borderWidth: 0
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
              font: { family: 'Inter', size: 10 }
            }
          },
          tooltip: {
            backgroundColor: tooltipBg,
            titleColor: state.theme !== "light" ? "#fff" : "#000",
            bodyColor: state.theme !== "light" ? "#fff" : "#000",
            borderColor: borderColor,
            borderWidth: 1,
            callbacks: {
              label: function(context) {
                const label = context.label || '';
                const val = context.parsed || 0;
                // Calculate percentage
                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                const percent = total > 0 ? ((val / total) * 100).toFixed(1) + '%' : '0%';
                return ` ${label}: ${formatCurrency(val)} (${percent})`;
              }
            }
          }
        }
      }
    });
  }

  // Initialize values of select elements for transferred widgets
  const fsCostRevenueChartType = document.getElementById("finance-costRevenue-chartType");
  const fsCostRevenueTimeframe = document.getElementById("finance-costRevenue-timeframe");
  const fsMarkupAnalysisChartType = document.getElementById("finance-markupAnalysis-chartType");
  const fsMarkupAnalysisGroupBy = document.getElementById("finance-markupAnalysis-groupBy");
  const fsMarkupAnalysisTimeframe = document.getElementById("finance-markupAnalysis-timeframe");
  const fsFinanceTrackerTimeframe = document.getElementById("finance-financeTracker-timeframe");

  if (fsCostRevenueChartType && state.widgetSettings.costRevenue) {
    fsCostRevenueChartType.value = state.widgetSettings.costRevenue.chartType || "bar";
  }
  if (fsCostRevenueTimeframe && state.widgetSettings.costRevenue) {
    fsCostRevenueTimeframe.value = state.widgetSettings.costRevenue.timeframe || "global";
  }
  if (fsMarkupAnalysisChartType && state.widgetSettings.markupAnalysis) {
    fsMarkupAnalysisChartType.value = state.widgetSettings.markupAnalysis.chartType || "bar";
  }
  if (fsMarkupAnalysisGroupBy && state.widgetSettings.markupAnalysis) {
    fsMarkupAnalysisGroupBy.value = state.widgetSettings.markupAnalysis.groupBy || "publisher";
  }
  if (fsMarkupAnalysisTimeframe && state.widgetSettings.markupAnalysis) {
    fsMarkupAnalysisTimeframe.value = state.widgetSettings.markupAnalysis.timeframe || "global";
  }
  if (fsFinanceTrackerTimeframe && state.widgetSettings.financeTracker) {
    fsFinanceTrackerTimeframe.value = state.widgetSettings.financeTracker.timeframe || "global";
  }

  // Render the transferred widgets inside the Finances view
  renderCostRevenueChart(state.sales);
  renderMarkupAnalysisChart(state.inventory);
  renderFinanceTrackerWidget(state.sales);

  // Apply column spans for all Finance tab chart cards
  applyFinanceSpans();
  renderFinanceBenchmark();
}

function renderFinanceBenchmark() {
  const benchmarkList = document.getElementById("finance-benchmark-list");
  if (!benchmarkList) return;

  const selectA = document.getElementById("benchmark-year-a");
  const selectB = document.getElementById("benchmark-year-b");
  if (!selectA || !selectB) return;

  const selectMode = document.getElementById("benchmark-mode");
  if (selectMode && !selectMode.dataset.initialized) {
    selectMode.value = state.benchmarkMode;
    selectMode.dataset.initialized = "true";
  }
  const isAverages = selectMode ? (selectMode.value === "averages") : (state.benchmarkMode === "averages");

  // Get unique sorted years from sales
  const yearsSet = new Set();
  state.sales.forEach(sale => {
    if (sale.saleDate && sale.saleDate.length >= 4) {
      const y = sale.saleDate.substring(0, 4);
      if (/^\d{4}$/.test(y)) yearsSet.add(y);
    }
  });
  const yearsList = Array.from(yearsSet).sort((a, b) => b.localeCompare(a));

  if (yearsList.length === 0) {
    benchmarkList.innerHTML = `<div style="color: var(--text-secondary); text-align: center; padding: 20px;">No sales data available for comparison.</div>`;
    return;
  }

  // Populate selectors dynamically
  const prevValA = selectA.value;
  const prevValB = selectB.value;

  selectA.innerHTML = "";
  selectB.innerHTML = "";
  yearsList.forEach(y => {
    selectA.innerHTML += `<option value="${y}">${y}</option>`;
    selectB.innerHTML += `<option value="${y}">${y}</option>`;
  });

  if (prevValA && yearsList.includes(prevValA)) {
    selectA.value = prevValA;
  } else {
    selectA.value = yearsList[0];
  }

  if (prevValB && yearsList.includes(prevValB)) {
    selectB.value = prevValB;
  } else {
    selectB.value = yearsList[1] || yearsList[0];
  }

  const yearA = selectA.value;
  const yearB = selectB.value;

  // Calculate metrics for both years
  const metricsA = { revenue: 0, cost: 0, profit: 0, count: 0 };
  const metricsB = { revenue: 0, cost: 0, profit: 0, count: 0 };
  const monthsSetA = new Set();
  const monthsSetB = new Set();

  state.sales.forEach(sale => {
    if (!sale.saleDate || sale.saleDate.length < 4) return;
    const y = sale.saleDate.substring(0, 4);
    if (sale.saleDate.length >= 7) {
      const ym = sale.saleDate.substring(0, 7);
      if (y === yearA) monthsSetA.add(ym);
      if (y === yearB) monthsSetB.add(ym);
    }
    if (y === yearA) {
      metricsA.revenue += sale.sellPrice;
      metricsA.cost += sale.cost;
      metricsA.profit += sale.profit;
      metricsA.count += 1;
    }
    if (y === yearB) {
      metricsB.revenue += sale.sellPrice;
      metricsB.cost += sale.cost;
      metricsB.profit += sale.profit;
      metricsB.count += 1;
    }
  });

  const monthsA = monthsSetA.size || 1;
  const monthsB = monthsSetB.size || 1;

  const avgMonthlyRevA = metricsA.revenue / monthsA;
  const avgMonthlyRevB = metricsB.revenue / monthsB;
  const avgMonthlyCostA = metricsA.cost / monthsA;
  const avgMonthlyCostB = metricsB.cost / monthsB;
  const avgMonthlyProfitA = metricsA.profit / monthsA;
  const avgMonthlyProfitB = metricsB.profit / monthsB;
  const avgMonthlyKeysA = metricsA.count / monthsA;
  const avgMonthlyKeysB = metricsB.count / monthsB;

  const marginA = metricsA.revenue > 0 ? (metricsA.profit / metricsA.revenue) * 100 : 0;
  const marginB = metricsB.revenue > 0 ? (metricsB.profit / metricsB.revenue) * 100 : 0;

  const avgPriceA = metricsA.count > 0 ? metricsA.revenue / metricsA.count : 0;
  const avgPriceB = metricsB.count > 0 ? metricsB.revenue / metricsB.count : 0;

  // Helper to build rows
  function createRow(title, valA, valB, formatType) {
    let formattedA = "";
    let formattedB = "";
    let delta = 0;
    let isBetter = null;

    if (formatType === "currency") {
      formattedA = formatCurrency(valA);
      formattedB = formatCurrency(valB);
      delta = valB > 0 ? ((valA - valB) / valB) * 100 : 0;
    } else if (formatType === "percent") {
      formattedA = valA.toFixed(1) + "%";
      formattedB = valB.toFixed(1) + "%";
      delta = valB > 0 ? valA - valB : 0;
    } else if (formatType === "float") {
      formattedA = valA.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
      formattedB = valB.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
      delta = valB > 0 ? ((valA - valB) / valB) * 100 : 0;
    } else {
      formattedA = Math.round(valA).toLocaleString();
      formattedB = Math.round(valB).toLocaleString();
      delta = valB > 0 ? ((valA - valB) / valB) * 100 : 0;
    }

    const isCost = title.toLowerCase().includes("cost") || title.toLowerCase().includes("outflow");
    if (valA !== valB) {
      if (isCost) {
        isBetter = valA < valB ? "A" : "B";
      } else {
        isBetter = valA > valB ? "A" : "B";
      }
    }

    const colorA = isBetter === "A" ? "var(--accent-emerald)" : "var(--text-main)";
    const colorB = isBetter === "B" ? "var(--accent-emerald)" : "var(--text-main)";

    let deltaText = "";
    if (valA !== valB && valB > 0) {
      const sign = delta > 0 ? "+" : "";
      const percentSign = formatType === "percent" ? " pp" : "%";
      deltaText = `(${sign}${delta.toFixed(1)}${percentSign} vs ${yearB})`;
    }

    const sum = valA + valB;
    let pctA = 50;
    let pctB = 50;
    if (sum > 0) {
      pctA = (valA / sum) * 100;
      pctB = (valB / sum) * 100;
    }

    return `
      <div class="benchmark-row">
        <div style="display: flex; justify-content: space-between; font-size: 0.825rem; font-weight: 600; margin-bottom: 4px;">
          <span style="color: var(--text-main); font-weight: 700;">${title}</span>
          <span style="color: var(--text-muted); font-size: 0.72rem;">${deltaText}</span>
        </div>
        <div style="display: flex; align-items: center; gap: 16px;">
          <div style="width: 100px; text-align: left; font-size: 0.95rem; font-weight: 700; color: ${colorA}; display: flex; align-items: center; gap: 4px;">
            ${isBetter === "A" ? '<i class="fa-solid fa-trophy" style="color: var(--accent-amber); font-size: 0.8rem;"></i>' : ''}
            <span>${formattedA}</span>
          </div>
          <div style="flex-grow: 1;">
            <div class="benchmark-progress-track">
              <div class="benchmark-progress-midline"></div>
              <div class="benchmark-progress-bar-a" style="width: ${pctA}%;"></div>
              <div class="benchmark-progress-bar-b" style="width: ${pctB}%;"></div>
            </div>
          </div>
          <div style="width: 100px; text-align: right; font-size: 0.95rem; font-weight: 700; color: ${colorB}; display: flex; align-items: center; justify-content: flex-end; gap: 4px;">
            <span>${formattedB}</span>
            ${isBetter === "B" ? '<i class="fa-solid fa-trophy" style="color: var(--accent-amber); font-size: 0.8rem;"></i>' : ''}
          </div>
        </div>
      </div>
    `;
  }

  let html = "";
  if (isAverages) {
    html += createRow("Avg Monthly Revenue", avgMonthlyRevA, avgMonthlyRevB, "currency");
    html += createRow("Avg Monthly Cost", avgMonthlyCostA, avgMonthlyCostB, "currency");
    html += createRow("Avg Monthly Net Profit", avgMonthlyProfitA, avgMonthlyProfitB, "currency");
    html += createRow("Profit Margin", marginA, marginB, "percent");
    html += createRow("Avg Monthly Keys Sold", avgMonthlyKeysA, avgMonthlyKeysB, "float");
    html += createRow("Avg Sell Price", avgPriceA, avgPriceB, "currency");
  } else {
    html += createRow("Total Revenue", metricsA.revenue, metricsB.revenue, "currency");
    html += createRow("Acquisition Costs", metricsA.cost, metricsB.cost, "currency");
    html += createRow("Net Profit", metricsA.profit, metricsB.profit, "currency");
    html += createRow("Profit Margin", marginA, marginB, "percent");
    html += createRow("Keys Sold", metricsA.count, metricsB.count, "int");
    html += createRow("Avg Sell Price", avgPriceA, avgPriceB, "currency");
  }

  benchmarkList.innerHTML = html;
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

// ==========================================================================
// SUPABASE CLOUD DATABASE SYNC SERVICES
// ==========================================================================

// Initialize Supabase Connection
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
  disputed BOOLEAN NOT NULL DEFAULT false,
  "supplierRefunded" BOOLEAN NOT NULL DEFAULT false
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

-- 7. Ensure modern columns exist on existing tables
ALTER TABLE sales ADD COLUMN IF NOT EXISTS "supplierRefunded" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS disputed BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS "imageUrl" TEXT;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS publisher TEXT;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS logo TEXT;
ALTER TABLE platforms ADD COLUMN IF NOT EXISTS logo TEXT;

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
let autoSyncIntervalTimer = null;
let autoSyncCountdownTimer = null;
let autoSyncNextRunTime = null;
let gitHubPushTimeout = null;

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
  if (typeof window.updateArtworkSkippedBadge === "function") {
    window.updateArtworkSkippedBadge();
  }
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

  const btnFetchAllArtworks = document.getElementById("btn-fetch-all-artworks");
  if (btnFetchAllArtworks) {
    btnFetchAllArtworks.addEventListener("click", () => {
      window.triggerBatchFetchArtworks();
    });
  }

  const btnCancelArtwork = document.getElementById("btn-cancel-artwork-fetch");
  if (btnCancelArtwork) {
    btnCancelArtwork.addEventListener("click", () => {
      window.artworkFetchCancelled = true;
      btnCancelArtwork.disabled = true;
      btnCancelArtwork.textContent = "Stopping...";
    });
  }

  const btnClearSkipped = document.getElementById("btn-clear-artwork-skipped");
  if (btnClearSkipped) {
    btnClearSkipped.addEventListener("click", () => {
      if (typeof window.clearArtworkNotFoundCache === "function") {
        window.clearArtworkNotFoundCache();
      }
    });
  }
  if (typeof window.updateArtworkSkippedBadge === "function") {
    window.updateArtworkSkippedBadge();
  }

  // Bind Profile settings controls
  bindProfileSettingsControls();
}

// Get state backup JSON payload
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
    const keyStr = String(item.key || "");
    const maskedKey = keyStr.length >= 8 
      ? `${keyStr.slice(0, 4)}-****-****-${keyStr.slice(-4)}`
      : keyStr || "—";

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
  logActionNotification(`Restored game: "${game.title}"`);
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
    logActionNotification(`Permanently deleted game: "${game.title}"`);
  }
};

// Module-level variable to persist expanded states
let activeExpandedPublishers = new Set();

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
    tr.style.cursor = "pointer";
    tr.setAttribute("title", "Click to view games breakdown");

    const isExpanded = activeExpandedPublishers.has(pub.name);
    const chevronIcon = `<i class="fa-solid fa-chevron-${isExpanded ? 'down' : 'right'}" style="margin-right: 8px; color: var(--accent-purple); width: 12px; display: inline-block; transition: transform 0.2s ease;"></i>`;

    const roi = pub.totalCostOfSales > 0 ? (pub.totalNetProfit / pub.totalCostOfSales) * 100 : 0;
    const avgDuration = pub.durationCount > 0 ? (pub.totalDuration / pub.durationCount).toFixed(1) : "—";
    const profitClass = pub.totalNetProfit >= 0 ? "text-success-neon" : "text-danger-soft";
    const profitSign = pub.totalNetProfit > 0 ? "+" : "";

    const isNoPublisher = pub.name === "No Publisher";
    const escapedPubName = pub.name.replace(/'/g, "\\'").replace(/"/g, "&quot;");
    const editBtnHtml = isNoPublisher 
      ? "" 
      : `<button class="btn btn-outline btn-xs" onclick="event.stopPropagation(); triggerEditPublisher('${escapeHTML(escapedPubName)}')" style="padding: 2px 6px; font-size: 0.75rem;"><i class="fa-solid fa-pen-to-square"></i> Edit</button>`;

    tr.innerHTML = `
      <td><span style="display: inline-flex; align-items: center;">${chevronIcon}<strong>${escapeHTML(pub.name)}</strong></span></td>
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

    // Row Click toggle listener (excluding interactive buttons)
    tr.addEventListener("click", (e) => {
      if (e.target.closest("button") || e.target.closest("a")) return;
      if (activeExpandedPublishers.has(pub.name)) {
        activeExpandedPublishers.delete(pub.name);
      } else {
        activeExpandedPublishers.add(pub.name);
      }
      renderPublishersTab();
    });

    tbody.appendChild(tr);

    // Render detailed nested games sub-table if expanded
    if (isExpanded) {
      const trDetail = document.createElement("tr");
      trDetail.className = "publisher-games-detail-row";
      
      // Extract all inventory entries matching this publisher name
      const publisherItems = state.inventory.filter(item => {
        const pubNameStr = String(item.publisher || "").trim() || "No Publisher";
        return pubNameStr === pub.name;
      });

      // Group keys by game title
      const gamesGroup = {};
      publisherItems.forEach(item => {
        const title = item.title.trim();
        if (!gamesGroup[title]) {
          gamesGroup[title] = {
            title: title,
            purchased: 0,
            sold: 0,
            inStock: 0,
            totalSpent: 0,
            totalRevenue: 0,
            totalCostOfSales: 0,
            totalNetProfit: 0,
            imageUrl: item.imageUrl || null
          };
        }
        const g = gamesGroup[title];
        g.purchased++;
        g.totalSpent += item.cost;
        
        if (item.status === "Sold") {
          g.sold++;
          const sale = salesMap.get(item.id);
          if (sale) {
            g.totalRevenue += sale.sellPrice;
            g.totalCostOfSales += sale.cost;
            g.totalNetProfit += sale.profit;
          }
        } else if (item.status !== "Rejected") {
          g.inStock++;
        }
      });

      const gamesList = Object.values(gamesGroup).sort((a, b) => a.title.localeCompare(b.title));

      let gamesRowsHtml = "";
      if (gamesList.length === 0) {
        gamesRowsHtml = `<tr><td colspan="8" style="text-align: center; color: var(--text-muted);">No game details resolved.</td></tr>`;
      } else {
        gamesList.forEach(g => {
          const gRoi = g.totalCostOfSales > 0 ? (g.totalNetProfit / g.totalCostOfSales) * 100 : 0;
          const gProfitClass = g.totalNetProfit >= 0 ? "text-success-neon" : "text-danger-soft";
          const gProfitSign = g.totalNetProfit > 0 ? "+" : "";
          const gameInitials = g.title.split(" ").map(w => w ? w[0] : "").join("").slice(0, 3) || "???";
          
          const titleCell = g.imageUrl
            ? `<div class="game-title-cell" style="gap: 8px;"><img src="${escapeHTML(g.imageUrl)}" class="game-thumbnail" style="width: 24px; height: 32px; border-radius: 4px; object-fit: cover;" alt="${escapeHTML(g.title)}"><strong>${escapeHTML(g.title)}</strong></div>`
            : `<div class="game-title-cell" style="gap: 8px;"><div class="game-thumbnail-placeholder" style="width: 24px; height: 32px; font-size: 0.65rem; border-radius: 4px; display: flex; align-items: center; justify-content: center; background: ${getHashGradient(g.title)}; color: #fff;">${escapeHTML(gameInitials)}</div><strong>${escapeHTML(g.title)}</strong></div>`;

          gamesRowsHtml += `
            <tr style="border-bottom: 1px solid rgba(255, 255, 255, 0.03);">
              <td style="padding: 6px 12px; font-size: 0.8rem;">${titleCell}</td>
              <td style="padding: 6px 12px; font-size: 0.8rem;">${g.purchased} keys</td>
              <td style="padding: 6px 12px; font-size: 0.8rem;"><span class="badge ${g.inStock > 0 ? 'badge-available' : 'badge-sold'}" style="font-size: 0.7rem; padding: 2px 6px;">${g.inStock} in stock</span></td>
              <td style="padding: 6px 12px; font-size: 0.8rem;">${g.sold} sold</td>
              <td style="padding: 6px 12px; font-size: 0.8rem;">${formatCurrency(g.totalSpent)}</td>
              <td style="padding: 6px 12px; font-size: 0.8rem;">${formatCurrency(g.totalRevenue)}</td>
              <td style="padding: 6px 12px; font-size: 0.8rem;" class="${gProfitClass}"><strong>${gProfitSign}${formatCurrency(g.totalNetProfit)}</strong></td>
              <td style="padding: 6px 12px; font-size: 0.8rem;">${getMiniMarginBar(gRoi)}</td>
            </tr>
          `;
        });
      }

      trDetail.innerHTML = `
        <td colspan="10" style="padding: 12px 24px; background: rgba(0, 0, 0, 0.18);">
          <div style="border-left: 3px solid var(--accent-purple); padding-left: 16px; margin: 4px 0;">
            <h5 style="margin: 0 0 10px 0; font-size: 0.8rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: var(--accent-purple);">
              <i class="fa-solid fa-gamepad" style="margin-right: 6px;"></i> Games Breakdown for ${escapeHTML(pub.name)}
            </h5>
            <div class="table-responsive" style="margin: 0; background: var(--bg-card); border-radius: var(--radius-md); border: 1px solid var(--border-color); box-shadow: inset 0 2px 8px rgba(0,0,0,0.2);">
              <table class="table" style="font-size: 0.8rem; margin: 0; width: 100%;">
                <thead>
                  <tr style="background: rgba(255,255,255,0.02); border-bottom: 1px solid var(--border-color);">
                    <th style="padding: 8px 12px;">Game Title</th>
                    <th style="padding: 8px 12px;">Purchased</th>
                    <th style="padding: 8px 12px;">Stock</th>
                    <th style="padding: 8px 12px;">Sold</th>
                    <th style="padding: 8px 12px;">Spent</th>
                    <th style="padding: 8px 12px;">Revenue</th>
                    <th style="padding: 8px 12px;">Profit</th>
                    <th style="padding: 8px 12px;">ROI %</th>
                  </tr>
                </thead>
                <tbody>
                  ${gamesRowsHtml}
                </tbody>
              </table>
            </div>
          </div>
        </td>
      `;
      tbody.appendChild(trDetail);
    }
  });
}

document.addEventListener("click", (e) => {
  if (!e.target.closest(".icon-picker-dropdown")) {
    document.querySelectorAll(".icon-picker-menu").forEach(menu => {
      menu.classList.remove("active");
    });
  }
});

// ==========================================================================
// DUPLICATE KEYS FINDER & INSPECTOR
// ==========================================================================
window.getDuplicateKeyMap = function() {
  const map = new Map();
  if (!state.inventory || !Array.isArray(state.inventory)) return map;
  state.inventory.forEach(item => {
    if (item && item.key) {
      const cleanKey = item.key.trim();
      const upper = cleanKey.toUpperCase();
      if (cleanKey !== "" && upper !== "NO-KEY" && upper !== "NO-KEY-PROVIDED" && upper !== "-" && upper !== "NONE") {
        const k = cleanKey.toLowerCase();
        if (!map.has(k)) {
          map.set(k, []);
        }
        map.get(k).push(item);
      }
    }
  });
  return map;
};

window.updateDuplicateKeysBadge = function() {
  const badge = document.getElementById("badge-duplicates-count");
  if (!badge) return;
  const map = window.getDuplicateKeyMap();
  let duplicateItemsCount = 0;
  map.forEach(items => {
    if (items.length > 1) {
      duplicateItemsCount += items.length;
    }
  });
  
  if (duplicateItemsCount > 0) {
    badge.textContent = duplicateItemsCount.toString();
    badge.classList.remove("hidden");
  } else {
    badge.textContent = "0";
    badge.classList.add("hidden");
  }
};

window.updateDuplicateFilterButtonState = function() {
  const btn = document.getElementById("btn-toggle-duplicate-keys");
  if (!btn) return;
  if (state.filterDuplicatesOnly) {
    btn.classList.remove("btn-outline");
    btn.classList.add("btn-danger");
    btn.style.borderColor = "var(--accent-danger, #ef4444)";
    btn.style.boxShadow = "0 0 10px rgba(239, 68, 68, 0.25)";
  } else {
    btn.classList.add("btn-outline");
    btn.classList.remove("btn-danger");
    btn.style.borderColor = "";
    btn.style.boxShadow = "";
  }
};

window.openDuplicateKeysModal = function(filterKey = null) {
  const container = document.getElementById("duplicate-keys-container");
  const keysCountEl = document.getElementById("dup-summary-keys-count");
  const itemsCountEl = document.getElementById("dup-summary-items-count");
  if (!container) return;

  container.innerHTML = "";
  const dupMap = window.getDuplicateKeyMap();
  
  // Filter only keys with > 1 occurrences
  const duplicateEntries = [];
  dupMap.forEach((items, keyLower) => {
    if (items.length > 1) {
      duplicateEntries.push({ key: items[0].key, keyLower, items });
    }
  });

  // Sort by count descending, then key alphabetically
  duplicateEntries.sort((a, b) => b.items.length - a.items.length || a.key.localeCompare(b.key));

  let totalAffectedItems = 0;
  duplicateEntries.forEach(e => totalAffectedItems += e.items.length);

  if (keysCountEl) keysCountEl.textContent = duplicateEntries.length.toString();
  if (itemsCountEl) itemsCountEl.textContent = totalAffectedItems.toString();

  if (duplicateEntries.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 40px 20px; color: var(--text-muted);">
        <i class="fa-solid fa-circle-check" style="font-size: 2.5rem; color: var(--accent-success, #10b981); margin-bottom: 12px; display: block;"></i>
        <h4 style="color: var(--text-main); margin-bottom: 6px;">No Duplicate Keys Found</h4>
        <p style="font-size: 0.82rem; margin: 0;">Every digital key in your inventory catalog is unique.</p>
      </div>
    `;
    openModal("duplicate-keys-modal");
    return;
  }

  duplicateEntries.forEach(group => {
    const isTarget = filterKey && group.key.trim().toLowerCase() === filterKey.trim().toLowerCase();
    
    const card = document.createElement("div");
    card.className = "card";
    card.style.border = isTarget ? "1px solid var(--accent-danger, #ef4444)" : "1px solid var(--border-color)";
    card.style.borderRadius = "var(--radius-md)";
    card.style.background = "var(--bg-card)";
    card.style.overflow = "hidden";

    const header = `
      <div style="background: var(--bg-input); padding: 10px 16px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-color);">
        <div style="display: flex; align-items: center; gap: 10px;">
          <span style="font-family: monospace; font-size: 0.88rem; font-weight: 700; color: var(--text-main); letter-spacing: 0.05em;">
            ${escapeHTML(group.key)}
          </span>
          <button type="button" class="btn btn-outline btn-sm btn-icon" onclick="copyToClipboard('${escapeHTML(group.key)}'); showToast('Key copied to clipboard', 'info');" title="Copy key to clipboard" style="width: 24px; height: 24px; font-size: 0.7rem; padding: 0;">
            <i class="fa-solid fa-copy"></i>
          </button>
        </div>
        <span class="badge badge-danger" style="font-size: 0.72rem; padding: 3px 8px; font-weight: 600;">
          <i class="fa-solid fa-clone"></i> ${group.items.length} copies
        </span>
      </div>
    `;

    let itemsHtml = `<div style="display: flex; flex-direction: column;">`;
    group.items.forEach((item, itemIdx) => {
      const statusClass = item.status === "Available" ? "badge-available" : (item.status === "Sold" ? "badge-sold" : "badge-low-stock");
      itemsHtml += `
        <div style="padding: 12px 16px; display: flex; align-items: center; justify-content: space-between; gap: 12px; border-bottom: ${itemIdx < group.items.length - 1 ? '1px solid var(--border-color)' : 'none'};">
          <div style="display: flex; align-items: center; gap: 12px; flex: 1; min-width: 0;">
            ${item.imageUrl ? `<img src="${escapeHTML(item.imageUrl)}" style="width: 38px; height: 38px; border-radius: 6px; object-fit: cover; flex-shrink: 0;" alt="Game Cover">` : `<div style="width: 38px; height: 38px; border-radius: 6px; background: var(--bg-input); display: flex; align-items: center; justify-content: center; color: var(--text-muted); flex-shrink: 0;"><i class="fa-solid fa-gamepad"></i></div>`}
            <div style="min-width: 0; flex: 1;">
              <div style="font-weight: 600; font-size: 0.88rem; color: var(--text-main); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escapeHTML(item.title)}</div>
              <div style="display: flex; gap: 8px; align-items: center; font-size: 0.72rem; color: var(--text-secondary); margin-top: 2px;">
                <span><i class="fa-solid fa-gamepad"></i> ${escapeHTML(item.platform || "PC")}</span>
                <span>•</span>
                <span><i class="fa-solid fa-truck"></i> ${escapeHTML(item.source || "Direct")}</span>
                <span>•</span>
                <span>Cost: ${formatCurrency(item.cost)}</span>
                <span>•</span>
                <span>Added: ${formatToDDMMYYYY(item.purchaseDate)}</span>
              </div>
            </div>
          </div>
          <div style="display: flex; align-items: center; gap: 8px; flex-shrink: 0;">
            <span class="badge ${statusClass}" style="font-size: 0.7rem;">${escapeHTML(item.status || "Available")}</span>
            <button type="button" class="btn btn-outline btn-sm" onclick="closeModal('duplicate-keys-modal'); triggerEditGame('${item.id}');" style="font-size: 0.72rem; padding: 4px 8px; display: inline-flex; align-items: center; gap: 4px;" title="Edit game or change key">
              <i class="fa-solid fa-pen"></i> Edit
            </button>
            <button type="button" class="btn btn-danger btn-sm" onclick="deleteDuplicateGameItem('${item.id}', '${escapeHTML(group.key)}');" style="font-size: 0.72rem; padding: 4px 8px; display: inline-flex; align-items: center; gap: 4px;" title="Delete this duplicate copy">
              <i class="fa-solid fa-trash"></i>
            </button>
          </div>
        </div>
      `;
    });
    itemsHtml += `</div>`;

    card.innerHTML = header + itemsHtml;
    container.appendChild(card);
  });

  openModal("duplicate-keys-modal");
};

window.deleteDuplicateGameItem = function(id, key) {
  const item = state.inventory.find(i => i.id === id);
  if (!item) return;
  if (!confirm(`Are you sure you want to delete "${item.title}" with key "${key}"? It will be moved to the Recycle Bin.`)) return;

  moveToRecycleBin([id]);
  showToast(`Moved duplicate "${item.title}" to Recycle Bin.`, "success");
  window.updateDuplicateKeysBadge();
  window.openDuplicateKeysModal();
  updateUI();
};

// ==========================================================================
// CATALOG ARTWORK UTILITIES - CACHE & STATE HELPERS
// ==========================================================================
window.getCatalogArtworkMap = function() {
  try {
    const raw = localStorage.getItem("gv_catalog_artwork");
    return raw ? JSON.parse(raw) : (state.catalogArtwork || {});
  } catch (e) {
    return state.catalogArtwork || {};
  }
};

window.setCatalogArtwork = function(title, imageUrl) {
  if (!title) return;
  if (!state.catalogArtwork) state.catalogArtwork = {};
  const t = title.trim().toLowerCase();
  if (imageUrl) {
    state.catalogArtwork[t] = imageUrl;
  } else {
    delete state.catalogArtwork[t];
  }
  try {
    localStorage.setItem("gv_catalog_artwork", JSON.stringify(state.catalogArtwork));
  } catch (e) {
    console.warn("Could not save catalog artwork to localStorage:", e);
  }
  if (window.supabaseClient && typeof dbSaveSettings === "function") {
    dbSaveSettings("catalogArtwork", state.catalogArtwork).catch(() => {});
  }
};

window.getArtworkNotFoundCache = function() {
  try {
    const raw = localStorage.getItem("gv_artwork_not_found");
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch (e) {
    return new Set();
  }
};

window.saveArtworkNotFoundCache = function(set) {
  try {
    localStorage.setItem("gv_artwork_not_found", JSON.stringify(Array.from(set)));
  } catch (e) {
    console.warn("Could not save artwork not-found cache:", e);
  }
};

window.updateArtworkSkippedBadge = function() {
  const countEl = document.getElementById("artwork-skipped-count");
  if (countEl) {
    const cache = window.getArtworkNotFoundCache();
    countEl.textContent = cache.size.toString();
  }
};

window.clearArtworkNotFoundCache = function() {
  localStorage.removeItem("gv_artwork_not_found");
  window.updateArtworkSkippedBadge();
  if (typeof showToast === "function") {
    showToast("Cleared skipped games cache. All catalog games will be checked again.", "info");
  }
};

// ==========================================================================
// CATALOG STEAM REVIEWS & RATINGS UTILITIES
// ==========================================================================
window.getCatalogReviewsMap = function() {
  try {
    const raw = localStorage.getItem("gv_catalog_reviews");
    return raw ? JSON.parse(raw) : (state.catalogReviews || {});
  } catch (e) {
    return state.catalogReviews || {};
  }
};

window.setCatalogReview = function(title, reviewData) {
  if (!title) return;
  if (!state.catalogReviews) state.catalogReviews = {};
  const t = title.trim().toLowerCase();
  if (reviewData) {
    state.catalogReviews[t] = {
      ...reviewData,
      updatedAt: Date.now()
    };
  } else {
    delete state.catalogReviews[t];
  }
  try {
    localStorage.setItem("gv_catalog_reviews", JSON.stringify(state.catalogReviews));
  } catch (e) {
    console.warn("Could not save catalog reviews to localStorage:", e);
  }
  if (window.supabaseClient && typeof dbSaveSettings === "function") {
    dbSaveSettings("catalogReviews", state.catalogReviews).catch(() => {});
  }

  // Live update matching pill slots in DOM
  window.updateSteamPillSlots(title);
};

window.formatReviewCount = function(count) {
  const num = parseInt(count) || 0;
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1).replace(/\.0$/, "") + "M";
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1).replace(/\.0$/, "") + "k";
  }
  return num.toString();
};

window.getSteamSentimentClass = function(percent) {
  const pct = parseInt(percent) || 0;
  if (pct >= 80) return "rating-positive";
  if (pct >= 70) return "rating-mostly-positive";
  if (pct >= 40) return "rating-mixed";
  return "rating-negative";
};

window.extractSteamAppId = function(url) {
  if (!url || typeof url !== "string") return null;
  const match = url.match(/\/apps\/(\d+)/);
  return match ? match[1] : null;
};

window.updateSteamPillSlots = function(title) {
  if (!title) return;
  const safeKey = title.trim().toLowerCase();
  const safeSelector = (window.CSS && CSS.escape) ? CSS.escape(safeKey) : safeKey.replace(/(["\\])/g, '\\$1');
  const slots = document.querySelectorAll(`.steam-pill-slot[data-title="${safeSelector}"]`);
  if (slots.length > 0) {
    const pillHtml = window.renderSteamRatingPill(title, { autoFetch: false });
    if (pillHtml) {
      slots.forEach(slot => {
        const temp = document.createElement("span");
        temp.innerHTML = pillHtml;
        const newEl = temp.firstElementChild;
        if (newEl && slot.parentNode) {
          slot.parentNode.replaceChild(newEl, slot);
        }
      });
    }
  }
};

window.renderSteamRatingPill = function(title, options = {}) {
  if (!title) return "";
  const t = title.trim().toLowerCase();
  const reviewsMap = typeof window.getCatalogReviewsMap === "function" ? window.getCatalogReviewsMap() : (state.catalogReviews || {});
  let data = reviewsMap[t];

  // If review data exists in cache and has valid percent
  if (data && data.percent !== undefined && data.percent !== null && Number(data.percent) > 0) {
    const pct = parseInt(data.percent) || 0;
    const count = parseInt(data.count) || 0;
    const shortCount = window.formatReviewCount(count);
    const fullCount = count.toLocaleString();
    const sentimentClass = window.getSteamSentimentClass(pct);
    const desc = data.text || (pct >= 80 ? "Very Positive" : pct >= 70 ? "Mostly Positive" : pct >= 40 ? "Mixed" : "Negative");
    const appId = data.steamAppID || options.steamAppID || null;
    
    const steamUrl = appId 
      ? `https://store.steampowered.com/app/${appId}/`
      : `https://store.steampowered.com/search/?term=${encodeURIComponent(title)}`;

    const tooltip = `${desc} • ${pct}% positive from ${fullCount} reviews on Steam (Click to open Steam Store)`;

    return `
      <a href="${steamUrl}" target="_blank" rel="noopener noreferrer" class="steam-rating-pill ${sentimentClass}" title="${escapeHTML(tooltip)}" onclick="event.stopPropagation();">
        <i class="fa-brands fa-steam"></i>
        <span class="rating-pct">${pct}%</span>
        <span class="review-qty">(${shortCount})</span>
      </a>
    `.trim();
  }

  // If not yet fetched, schedule background lookup if autoFetch is allowed
  if (options.autoFetch !== false) {
    window.scheduleSteamReviewFetch(title, options.steamAppID || options.imageUrl);
  }

  return "";
};

window.pendingReviewFetches = window.pendingReviewFetches || new Set();
window.reviewFetchQueue = window.reviewFetchQueue || [];
let isProcessingReviewQueue = false;

window.scheduleSteamReviewFetch = function(title, hintAppIdOrUrl) {
  if (!title) return;
  const t = title.trim().toLowerCase();
  if (window.pendingReviewFetches.has(t)) return;
  window.pendingReviewFetches.add(t);
  
  let steamAppID = null;
  if (hintAppIdOrUrl) {
    if (/^\d+$/.test(String(hintAppIdOrUrl).trim())) {
      steamAppID = String(hintAppIdOrUrl).trim();
    } else {
      steamAppID = window.extractSteamAppId(hintAppIdOrUrl);
    }
  }

  window.reviewFetchQueue.push({ title, steamAppID });
  processReviewFetchQueue();
};

async function processReviewFetchQueue() {
  if (isProcessingReviewQueue) return;
  isProcessingReviewQueue = true;

  while (window.reviewFetchQueue.length > 0) {
    const item = window.reviewFetchQueue.shift();
    try {
      await window.fetchSteamReviewData(item.title, item.steamAppID);
    } catch (e) {
      console.warn("Background review fetch error for:", item.title, e);
    }
    // Respect rate limits with 400ms delay between calls
    await new Promise(r => setTimeout(r, 400));
  }

  isProcessingReviewQueue = false;
}

window.fetchSteamReviewData = async function(title, steamAppID) {
  if (!title) return null;
  const t = title.trim().toLowerCase();

  const cleanTitle = (str) => {
    if (!str) return "";
    let clean = str.replace(/\([^)]*\)/g, " ").replace(/\[[^\]]*\]/g, " ");
    const terms = [
      /\bpc\b/i, /\bsteam\b/i, /\bkey\b/i, /\bglobal\b/i, /\bcd-key\b/i, /\bcdkey\b/i, 
      /\bgog\b/i, /\borigin\b/i, /\buplay\b/i, /\bepic\b/i, /\bconnect\b/i, /\bedition\b/i,
      /\bstandard\b/i, /\bdeluxe\b/i, /\bultimate\b/i, /\bpremium\b/i, /\brow\b/i, /\bfree\b/i,
      /\bregion\b/i, /\bdownload\b/i, /\bcode\b/i, /\bactivation\b/i, /\bdigital\b/i
    ];
    terms.forEach(regex => { clean = clean.replace(regex, " "); });
    clean = clean.replace(/[\u2122\u00ae\u00a9]/g, "").replace(/\s+/g, " ").trim();
    return clean || str;
  };

  try {
    // 1. If steamAppID is provided, query CheapShark deals by steamAppID directly
    if (steamAppID && steamAppID !== "0") {
      try {
        const res = await fetch(`https://www.cheapshark.com/api/1.0/deals?steamAppID=${encodeURIComponent(steamAppID)}`);
        if (res.ok) {
          const deals = await res.json();
          if (Array.isArray(deals) && deals.length > 0) {
            const deal = deals[0];
            if (deal.steamRatingPercent && parseInt(deal.steamRatingPercent) > 0) {
              const reviewData = {
                percent: parseInt(deal.steamRatingPercent),
                count: parseInt(deal.steamRatingCount) || 0,
                text: deal.steamRatingText || "Positive",
                steamAppID: deal.steamAppID || steamAppID
              };
              window.setCatalogReview(title, reviewData);
              return reviewData;
            }
          }
        }
      } catch (e) {
        console.warn(`CheapShark steamAppID lookup failed for ${title}:`, e);
      }
    }

    // 2. Query CheapShark deals by title
    const cleaned = cleanTitle(title);
    try {
      const res = await fetch(`https://www.cheapshark.com/api/1.0/deals?title=${encodeURIComponent(cleaned)}&exact=0&pageSize=3`);
      if (res.ok) {
        const deals = await res.json();
        if (Array.isArray(deals) && deals.length > 0) {
          const matchingDeal = deals.find(d => d.steamRatingPercent && parseInt(d.steamRatingPercent) > 0);
          if (matchingDeal) {
            const reviewData = {
              percent: parseInt(matchingDeal.steamRatingPercent),
              count: parseInt(matchingDeal.steamRatingCount) || 0,
              text: matchingDeal.steamRatingText || "Positive",
              steamAppID: matchingDeal.steamAppID || steamAppID || null
            };
            window.setCatalogReview(title, reviewData);
            return reviewData;
          }
        }
      }
    } catch (e) {
      console.warn(`CheapShark deals by title failed for ${title}:`, e);
    }

    // 3. Fallback: Query CheapShark games endpoint
    try {
      const gRes = await fetch(`https://www.cheapshark.com/api/1.0/games?title=${encodeURIComponent(cleaned)}`);
      if (gRes.ok) {
        const games = await gRes.json();
        if (Array.isArray(games) && games.length > 0) {
          const game = games[0];
          if (game.cheapestDealID) {
            const dRes = await fetch(`https://www.cheapshark.com/api/1.0/deals?id=${game.cheapestDealID}`);
            if (dRes.ok) {
              const deal = await dRes.json();
              const info = deal.gameInfo;
              if (info && info.steamRatingPercent && parseInt(info.steamRatingPercent) > 0) {
                const reviewData = {
                  percent: parseInt(info.steamRatingPercent),
                  count: parseInt(info.steamRatingCount) || 0,
                  text: info.steamRatingText || "Positive",
                  steamAppID: info.steamAppID || game.steamAppID || steamAppID || null
                };
                window.setCatalogReview(title, reviewData);
                return reviewData;
              }
            }
          }
        }
      }
    } catch (e) {
      console.warn(`CheapShark games fallback failed for ${title}:`, e);
    }

    // Record empty record to avoid infinite loop
    window.setCatalogReview(title, { percent: null, count: 0, text: "No Reviews", steamAppID: steamAppID || null });
    return null;
  } catch (err) {
    console.error(`Error fetching Steam review data for "${title}":`, err);
    return null;
  }
};

// Auto fetch game cover image from Steam Web Store API via CheapShark or Steam Search fallback
window.triggerBatchFetchArtworks = async function() {
  window.artworkFetchCancelled = false;
  const btnCancel = document.getElementById("btn-cancel-artwork-fetch");
  if (btnCancel) {
    btnCancel.disabled = false;
    btnCancel.textContent = "Stop";
  }

  const overwrite = document.getElementById("settings-artwork-overwrite")?.checked === true;
  const skipFailed = document.getElementById("settings-artwork-skip-failed")?.checked !== false;
  const notFoundCache = window.getArtworkNotFoundCache();
  
  // Find all unique game titles across inventory and sales
  const uniqueTitles = new Set();
  state.inventory.forEach(item => {
    if (item && item.title && item.title.trim()) {
      uniqueTitles.add(item.title.trim());
    }
  });
  state.sales.forEach(sale => {
    if (sale && sale.title && sale.title.trim()) {
      uniqueTitles.add(sale.title.trim());
    }
  });
  
  // Find which titles already have cover images
  const titleHasImage = new Set();
  state.inventory.forEach(item => {
    if (item && item.title && item.imageUrl && item.imageUrl.trim() !== "") {
      titleHasImage.add(item.title.trim().toLowerCase());
    }
  });
  state.sales.forEach(sale => {
    if (sale && sale.title && sale.imageUrl && sale.imageUrl.trim() !== "") {
      titleHasImage.add(sale.title.trim().toLowerCase());
    }
  });
  const catalogArtMap = typeof window.getCatalogArtworkMap === "function" ? window.getCatalogArtworkMap() : (state.catalogArtwork || {});
  Object.keys(catalogArtMap).forEach(k => {
    if (catalogArtMap[k]) titleHasImage.add(k.toLowerCase());
  });

  const titlesToFetch = [];
  uniqueTitles.forEach(title => {
    const lower = title.toLowerCase();
    const hasImg = titleHasImage.has(lower);
    const isUnfound = notFoundCache.has(lower);

    if (hasImg && !overwrite) {
      return; // Skip: already has artwork
    }
    if (isUnfound && skipFailed && !overwrite) {
      return; // Skip: previously checked and no artwork found on Steam/CheapShark
    }

    titlesToFetch.push(title);
  });

  // Sort titles alphabetically (case-insensitive, natural alphanumeric order)
  titlesToFetch.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base', numeric: true }));

  const progressContainer = document.getElementById("artwork-fetch-progress-container");
  const progressStatus = document.getElementById("artwork-fetch-progress-status");
  const progressPercent = document.getElementById("artwork-fetch-progress-percent");
  const progressBar = document.getElementById("artwork-fetch-progress-bar");
  const progressDetail = document.getElementById("artwork-fetch-detail-status");
  const btnFetch = document.getElementById("btn-fetch-all-artworks");

  if (titlesToFetch.length === 0) {
    const skippedCount = notFoundCache.size;
    let msg = "No games found requiring artwork update.";
    if (skippedCount > 0 && skipFailed && !overwrite) {
      msg += ` (${skippedCount} previously unmatchable titles skipped; click 'Reset skipped' to re-check them).`;
    }
    showToast(msg, "info");
    return;
  }

  // Process in batches of 100 to prevent browser hangs, API throttling, and long wait states
  const limitCount = 100;
  const isSliced = titlesToFetch.length > limitCount;
  const batchTitles = titlesToFetch.slice(0, limitCount);

  if (progressContainer) progressContainer.classList.remove("hidden");
  if (btnFetch) btnFetch.disabled = true;

  let processedCount = 0;
  let successCount = 0;
  const total = batchTitles.length;
  const batchRange = total > 1 ? `"${batchTitles[0]}" to "${batchTitles[total - 1]}"` : `"${batchTitles[0]}"`;

  const modifiedInventoryItems = [];

  // Title cleaner helper
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

  // Inform user about batch slicing
  if (isSliced && progressStatus) {
    progressStatus.textContent = `A-Z Batch (1-100 of ${titlesToFetch.length} remaining): ${batchRange}...`;
  }

  for (let i = 0; i < total; i++) {
    // Check cancellation
    if (window.artworkFetchCancelled) {
      if (progressStatus) progressStatus.textContent = "Stopping fetcher and saving progress...";
      break;
    }

    const title = batchTitles[i];
    const searchTerm = cleanTitle(title);
    if (progressStatus) progressStatus.textContent = `[${i + 1}/${total}] Fetching: "${title}"...`;
    
    // Update progress bar
    const pct = Math.round((processedCount / total) * 100);
    if (progressPercent) progressPercent.textContent = `${pct}%`;
    if (progressBar) progressBar.style.width = `${pct}%`;
    if (progressDetail) progressDetail.textContent = `${processedCount} of ${total} games processed (${successCount} successful)`;

    let retries = 0;
    let requestSuccess = false;
    let baseDelay = 1000; // 1s base delay to comply with 1 request per second CheapShark limit

    while (retries < 3 && !requestSuccess && !window.artworkFetchCancelled) {
      try {
        await new Promise(resolve => setTimeout(resolve, baseDelay));
        let matches = [];
        let fetchedFromCheapShark = false;

        // Try CheapShark first
        try {
          const response = await fetch(`https://www.cheapshark.com/api/1.0/games?title=${encodeURIComponent(searchTerm)}`);
          if (response.status === 429) {
            retries++;
            const backoff = retries * 5000;
            if (progressStatus) progressStatus.textContent = `Rate limited. Retrying "${title}" in ${backoff / 1000}s...`;
            await new Promise(resolve => setTimeout(resolve, backoff));
            continue;
          }
          if (response.ok) {
            matches = await response.json();
            fetchedFromCheapShark = true;
          }
        } catch (csErr) {
          console.warn(`CheapShark failed for "${title}", trying Steam direct fallback:`, csErr);
        }

        // Try colon/dash splitting fallback on CheapShark
        if (fetchedFromCheapShark && (!matches || matches.length === 0) && (searchTerm.includes(":") || searchTerm.includes("-"))) {
          let fallbackTerm = "";
          if (searchTerm.includes(":")) {
            fallbackTerm = searchTerm.split(":")[0].trim();
          } else if (searchTerm.includes("-")) {
            fallbackTerm = searchTerm.split("-")[0].trim();
          }
          if (fallbackTerm && fallbackTerm.length > 2) {
            try {
              await new Promise(resolve => setTimeout(resolve, baseDelay));
              const response = await fetch(`https://www.cheapshark.com/api/1.0/games?title=${encodeURIComponent(fallbackTerm)}`);
              if (response.ok) {
                matches = await response.json();
              }
            } catch (csFbErr) {
              console.warn(`CheapShark fallback failed:`, csFbErr);
            }
          }
        }

        // Try Steam Search via corsproxy.io if CheapShark returned no matches or failed
        if (!matches || matches.length === 0) {
          try {
            const steamUrl = `https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(searchTerm)}&l=english&cc=US`;
            const steamResponse = await fetch(`https://corsproxy.io/?${steamUrl}`);
            if (steamResponse.ok) {
              const data = await steamResponse.json();
              if (data && data.items && data.items.length > 0) {
                matches = data.items.map(item => ({
                  steamAppID: item.id ? item.id.toString() : null,
                  external: item.name,
                  thumb: item.tiny_image
                }));
              }
            }
          } catch (steamErr) {
            console.warn(`Steam fallback failed for "${title}":`, steamErr);
          }
        }

        // Try Steam Search with colon/dash split fallback
        if ((!matches || matches.length === 0) && (searchTerm.includes(":") || searchTerm.includes("-"))) {
          let fallbackTerm = "";
          if (searchTerm.includes(":")) {
            fallbackTerm = searchTerm.split(":")[0].trim();
          } else if (searchTerm.includes("-")) {
            fallbackTerm = searchTerm.split("-")[0].trim();
          }
          if (fallbackTerm && fallbackTerm.length > 2) {
            try {
              const steamUrl = `https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(fallbackTerm)}&l=english&cc=US`;
              const steamResponse = await fetch(`https://corsproxy.io/?${steamUrl}`);
              if (steamResponse.ok) {
                const data = await steamResponse.json();
                if (data && data.items && data.items.length > 0) {
                  matches = data.items.map(item => ({
                    steamAppID: item.id ? item.id.toString() : null,
                    external: item.name,
                    thumb: item.tiny_image
                  }));
                }
              }
            } catch (steamFbErr) {
              console.warn(`Steam fallback split failed for "${title}":`, steamFbErr);
            }
          }
        }

        // Process resolved matches
        if (matches && matches.length > 0) {
          const match = matches.find(m => m.steamAppID && m.steamAppID !== "0") || matches[0];
          let imageUrl = "";
          if (match.steamAppID && match.steamAppID !== "0") {
            imageUrl = `https://cdn.akamai.steamstatic.com/steam/apps/${match.steamAppID}/header.jpg`;
          } else if (match.thumb) {
            imageUrl = match.thumb;
          }

          if (imageUrl) {
            // Update all matching items in inventory
            state.inventory.forEach(item => {
              if (item && item.title && item.title.trim().toLowerCase() === title.toLowerCase()) {
                item.imageUrl = imageUrl;
                if (!item.key) item.key = "NO-KEY";
                if (!modifiedInventoryItems.includes(item)) {
                  modifiedInventoryItems.push(item);
                }
              }
            });
            // Update all matching sales items
            state.sales.forEach(sale => {
              if (sale && sale.title && sale.title.trim().toLowerCase() === title.toLowerCase()) {
                sale.imageUrl = imageUrl;
              }
            });
            // Update persistent catalog artwork map
            window.setCatalogArtwork(title, imageUrl);
            if (typeof window.scheduleSteamReviewFetch === "function") {
              window.scheduleSteamReviewFetch(title, match.steamAppID || imageUrl);
            }
            successCount++;
            notFoundCache.delete(title.toLowerCase());
          } else {
            notFoundCache.add(title.toLowerCase());
          }
          requestSuccess = true;
        } else {
          // No matches found on any source, don't keep retrying this title
          notFoundCache.add(title.toLowerCase());
          requestSuccess = true;
        }
      } catch (err) {
        console.error(`Failed loop execution for "${title}" (attempt ${retries + 1}):`, err);
        retries++;
      }
    }

    processedCount++;
  }

  // Persist skipped unmatchable titles cache to avoid re-querying on future runs
  window.saveArtworkNotFoundCache(notFoundCache);
  window.updateArtworkSkippedBadge();

  // Update progress bar to final status
  const finalPct = window.artworkFetchCancelled ? Math.round((processedCount / total) * 100) : 100;
  if (progressPercent) progressPercent.textContent = `${finalPct}%`;
  if (progressBar) progressBar.style.width = `${finalPct}%`;
  if (progressDetail) progressDetail.textContent = `${processedCount} of ${total} games processed (${successCount} successful)`;
  if (progressStatus) progressStatus.textContent = window.artworkFetchCancelled ? "Save complete. Stopped." : "Save complete. Finished.";

  // Save changes
  if (successCount > 0 || modifiedInventoryItems.length > 0) {
    pushToUndoStack();
    saveStateToStorage();
    
    // Sync to Supabase in batches of 200
    if (window.supabaseClient && state.syncMode !== "manual" && modifiedInventoryItems.length > 0) {
      try {
        const syncBatchSize = 200;
        for (let j = 0; j < modifiedInventoryItems.length; j += syncBatchSize) {
          const batch = modifiedInventoryItems.slice(j, j + syncBatchSize).map(item => ({
            id: item.id,
            title: item.title || "Untitled Game",
            platform: item.platform || "PC",
            key: (item.key && String(item.key).trim()) ? String(item.key).trim() : "NO-KEY",
            cost: item.cost !== undefined ? item.cost : 0,
            source: item.source || "Direct",
            purchaseDate: item.purchaseDate || new Date().toISOString().split("T")[0],
            imageUrl: item.imageUrl || null,
            status: item.status || "Available",
            notes: item.notes || null,
            publisher: item.publisher || null
          }));
          const { error } = await window.supabaseClient.from('inventory').upsert(batch);
          if (error) throw error;
        }
      } catch (dbErr) {
        console.error("Failed to sync batch cover updates to Supabase:", dbErr);
        showToast("Local updates saved, but database synchronization failed.", "warning");
      }
    }
    
    updateUI();
    const finalMsg = window.artworkFetchCancelled 
      ? `Stopped. Successfully updated covers for ${successCount} games.`
      : `Finished alphabetical batch. Updated covers for ${successCount} games.${isSliced ? ` (${titlesToFetch.length - limitCount} remaining in catalog - click again for next batch)` : ''}`;
    showToast(finalMsg, "success");
    logActionNotification(`Batch fetched cover artworks: ${successCount} games updated (crashed/stopped: ${window.artworkFetchCancelled ? 'Yes' : 'No'})`);
  } else {
    showToast(window.artworkFetchCancelled ? "Stopped. No new covers were resolved." : `Completed batch. No new covers were resolved.${isSliced ? ` (${titlesToFetch.length - limitCount} remaining in catalog - click again for next batch)` : ''}`, "info");
  }

  // Hide progress bar container after 4 seconds
  setTimeout(() => {
    if (progressContainer) progressContainer.classList.add("hidden");
    if (btnFetch) btnFetch.disabled = false;
    if (btnCancel) {
      btnCancel.disabled = false;
      btnCancel.textContent = "Stop";
    }
  }, 4000);
};

function applyRoleBasedAccessControls() {
  const users = getUsersFromStorage();
  const currentUserObj = users.find(u => u.username.toLowerCase() === state.currentUser?.toLowerCase());
  const role = currentUserObj ? (currentUserObj.role || "merchant") : "merchant";
  
  const userMgmtCard = document.getElementById("settings-user-mgmt-card");
  const auditLogCard = document.getElementById("settings-audit-log-card");
  const btnDeleteAll = document.getElementById("btn-delete-all-inventory");
  
  if (role === "admin") {
    if (userMgmtCard) userMgmtCard.classList.remove("hidden");
    if (auditLogCard) auditLogCard.classList.remove("hidden");
    if (btnDeleteAll) {
      btnDeleteAll.disabled = false;
      btnDeleteAll.style.opacity = "1";
      btnDeleteAll.style.cursor = "pointer";
      btnDeleteAll.title = "Delete all keys from local and cloud storage";
    }
  } else {
    // Merchant role
    if (userMgmtCard) userMgmtCard.classList.add("hidden");
    if (auditLogCard) auditLogCard.classList.add("hidden");
    if (btnDeleteAll) {
      btnDeleteAll.disabled = true;
      btnDeleteAll.style.opacity = "0.5";
      btnDeleteAll.style.cursor = "not-allowed";
      btnDeleteAll.title = "Delete All Inventory is restricted to Administrators only.";
    }
  }
}

function renderAuditLogs() {
  const list = document.getElementById("admin-audit-log-list");
  if (!list) return;
  list.innerHTML = "";
  
  const logs = state.auditLogs || [];
  if (logs.length === 0) {
    list.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--text-muted); padding: 15px;">No activity logs found.</td></tr>`;
    return;
  }
  
  logs.forEach(log => {
    const tr = document.createElement("tr");
    let dateStr = "";
    try {
      dateStr = new Date(log.timestamp).toLocaleString();
    } catch (e) {
      dateStr = log.timestamp;
    }
    
    tr.innerHTML = `
      <td style="color: var(--text-secondary); font-family: monospace;">${dateStr}</td>
      <td><strong style="color: var(--accent-cyan);">${log.user}</strong></td>
      <td><span class="badge" style="font-size: 0.72rem; padding: 2px 6px; background-color: var(--bg-input); border: 1px solid var(--border-color); color: var(--text-main); font-weight: 600; text-transform: uppercase;">${log.action}</span></td>
      <td style="color: var(--text-secondary); max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${escapeHTML(log.details || '')}">${escapeHTML(log.details || '')}</td>
    `;
    list.appendChild(tr);
  });
}

window.clearAuditLogs = function() {
  if (!confirm("Are you sure you want to clear all audit logs? This action is irreversible.")) return;
  state.auditLogs = [];
  localStorage.setItem("gv_audit_logs", JSON.stringify([]));
  renderAuditLogs();
  showToast("Activity audit logs cleared.", "success");
};

function bindProfileSettingsControls() {
  const form = document.getElementById("profile-update-form");
  if (!form) return;
  
  const users = getUsersFromStorage();
  const currentUserObj = users.find(u => u.username.toLowerCase() === state.currentUser?.toLowerCase());
  
  const profileAvatar = document.getElementById("profile-avatar");
  const usernameDisplay = document.getElementById("profile-username-display");
  const roleDisplay = document.getElementById("profile-role-display");
  const emailInput = document.getElementById("profile-email-input");
  const tfaInput = document.getElementById("profile-2fa-input");
  
  if (profileAvatar && state.currentUser) {
    profileAvatar.textContent = state.currentUser.substring(0, 2).toUpperCase();
  }
  if (usernameDisplay) usernameDisplay.textContent = state.currentUser;
  if (roleDisplay && currentUserObj) {
    roleDisplay.textContent = currentUserObj.role || "merchant";
  }
  
  if (currentUserObj) {
    if (emailInput && !emailInput.value) emailInput.value = currentUserObj.email || "";
    if (tfaInput) tfaInput.checked = currentUserObj.twoFactorEnabled || false;
  }
  
  const newForm = form.cloneNode(true);
  form.parentNode.replaceChild(newForm, form);
  
  newForm.addEventListener("submit", (e) => {
    e.preventDefault();
    try {
      const usersList = getUsersFromStorage();
      const userObj = usersList.find(u => u.username.toLowerCase() === state.currentUser?.toLowerCase());
      if (!userObj) {
        showToast("User session mismatch.", "error");
        return;
      }
      
      const newEmail = document.getElementById("profile-email-input").value.trim();
      const newPassword = document.getElementById("profile-password-input").value;
      const confirmPassword = document.getElementById("profile-confirm-password-input").value;
      const enable2FA = document.getElementById("profile-2fa-input").checked;
      
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(newEmail)) {
        showToast("Please enter a valid email address.", "warning");
        return;
      }
      
      if (newPassword) {
        if (newPassword.length < 6) {
          showToast("New password must be at least 6 characters long.", "warning");
          return;
        }
        if (newPassword !== confirmPassword) {
          showToast("Passwords do not match.", "error");
          return;
        }
        userObj.password = newPassword;
        window.logAuditAction("Change Password", "User updated password");
      }
      
      const emailChanged = userObj.email !== newEmail;
      const tfaChanged = userObj.twoFactorEnabled !== enable2FA;
      
      userObj.email = newEmail;
      userObj.twoFactorEnabled = enable2FA;
      
      saveUsersToStorage(usersList);
      
      if (emailChanged) window.logAuditAction("Update Email", `Email updated to ${newEmail}`);
      if (tfaChanged) window.logAuditAction("Toggle 2FA", `Toggled 2FA to ${enable2FA ? "Enabled" : "Disabled"}`);
      
      // Clear password inputs
      document.getElementById("profile-password-input").value = "";
      document.getElementById("profile-confirm-password-input").value = "";
      
      showToast("Profile settings updated successfully!", "success");
      renderAdminUsers();
      updateUI();
    } catch (err) {
      console.error("Profile update failed:", err);
      showToast("An error occurred while updating profile.", "error");
    }
  });
}
