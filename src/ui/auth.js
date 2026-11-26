/**
 * GameVault - User Authentication & Account Management (src/ui/auth.js)
 * Manages login, registration, password recovery, session logout, and admin user tables.
 */

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
  if (typeof window !== "undefined" && typeof window.getUsersFromStorage === "function" && window.getUsersFromStorage !== getUsersFromStorage) {
    return window.getUsersFromStorage();
  }
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
  }
  const hasAdmin = arr.some(u => u && u.username && u.username.toLowerCase() === "admin");
  if (!hasAdmin) {
    arr.push({
      username: "admin",
      email: "admin@gamevault.local",
      password: "password",
      role: "admin",
      twoFactorEnabled: false
    });
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

    // Ensure database client is initialized if available
    if (!window.supabaseClient && typeof initSupabaseConnection === "function") {
      await initSupabaseConnection();
    }

    // Synchronize latest cloud users (passwords & emails) before authentication
    const syncFn = window.syncUsersFromCloud || (typeof syncUsersFromCloud === "function" ? syncUsersFromCloud : null);
    if (syncFn) {
      await syncFn();
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
        // Fallback to local auth check with cloud sync
        if (syncFn) {
          await syncFn();
        }
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
      if (syncFn) {
        await syncFn();
      }
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
