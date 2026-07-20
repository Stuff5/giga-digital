/**
 * GameVault - Main Application Entry (app.js)
 * This file boots the application after loading all modular dependencies.
 */

document.addEventListener("DOMContentLoaded", async () => {
  try {
    // Load HTML templates dynamically
    await loadHTMLTemplates();

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

    // Initialize notification center
    initNotificationCenter();

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
    const recoveryForm = document.getElementById("recovery-form");
    if (recoveryForm) {
      recoveryForm.addEventListener("submit", handleRecoverySubmit);
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
    let activeUser = localStorage.getItem("gv_active_user");
    const sessionExpiry = localStorage.getItem("gv_session_expiry");
    
    if (activeUser && sessionExpiry) {
      if (Date.now() > parseInt(sessionExpiry)) {
        // Session expired, clear and log out
        localStorage.removeItem("gv_active_user");
        localStorage.removeItem("gv_session_expiry");
        activeUser = null;
      } else {
        // Extend session sliding window (2 hours)
        localStorage.setItem("gv_session_expiry", (Date.now() + 2 * 60 * 60 * 1000).toString());
      }
    }

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

    // Register Dispute Sale submit handler
    const disputeSaleForm = document.getElementById("dispute-sale-form");
    if (disputeSaleForm) {
      disputeSaleForm.addEventListener("submit", handleDisputeSaleSubmit);
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
    bindFinanceDragAndDrop();
    bindDashboardCardActions();
    renderFinanceCardsOrder();
    applyWidgetVisibility();
    bindWidgetControls();
    bindPlatformPreview();
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

    // Bind Changelog Link in Sidebar Footer
    const linkChangelog = document.getElementById("link-show-changelog");
    if (linkChangelog) {
      linkChangelog.addEventListener("click", (e) => {
        e.preventDefault();
        // Clear search
        if (helpSearchInput) {
          helpSearchInput.value = "";
          helpTabs.forEach(t => t.style.display = "");
        }
        
        // Switch to the Changelog tab
        helpTabs.forEach(t => {
          if (t.getAttribute("data-help-tab") === "help-tab-changelog") {
            t.classList.add("active");
            t.style.backgroundColor = "var(--bg-input)";
            t.style.color = "var(--text-main)";
          } else {
            t.classList.remove("active");
            t.style.backgroundColor = "transparent";
            t.style.color = "var(--text-secondary)";
          }
        });
        
        helpPanes.forEach(p => {
          if (p.id === "help-tab-changelog") {
            p.classList.remove("hidden");
          } else {
            p.classList.add("hidden");
          }
        });
        
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
        logActionNotification(`Switched theme to ${nextMode === "light" ? "Light Mode" : "Dark Mode"}`);
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

    window.appInitialized = true;
    document.body.classList.remove("no-transition");

    // Fade out and remove the premium loader
    const loadingScreen = document.getElementById("app-loading-screen");
    if (loadingScreen) {
      loadingScreen.style.opacity = "0";
      loadingScreen.style.visibility = "hidden";
      setTimeout(() => {
        loadingScreen.remove();
      }, 400);
    }
  } catch (err) {
    console.error("Initialization Error:", err);
    document.body.classList.remove("no-transition");
    
    // Safety fallback: ensure loader is removed even if startup throws an exception
    const loadingScreen = document.getElementById("app-loading-screen");
    if (loadingScreen) {
      loadingScreen.style.opacity = "0";
      loadingScreen.style.visibility = "hidden";
      setTimeout(() => {
        loadingScreen.remove();
      }, 400);
    }
  }
});
