/**
 * GameVault - Settings, Appearance & Advanced Config (src/ui/settings.js)
 * Handles theme modes, font sizing, menu customization, settings tab switching, and advanced options.
 */

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


// Settings tab switcher
window.switchSettingsTab = function(tabId) {
  if (!tabId) return;
  const validTabs = [
    "settings-tab-apis",
    "settings-tab-appearance",
    "settings-tab-inventory",
    "settings-tab-data",
    "settings-tab-profile"
  ];
  if (!validTabs.includes(tabId)) {
    tabId = "settings-tab-apis";
  }

  // Update tab buttons
  const buttons = document.querySelectorAll(".settings-tab-btn");
  buttons.forEach(btn => {
    const btnTab = btn.getAttribute("data-settings-tab") || btn.getAttribute("data-tab");
    if (btnTab === tabId) {
      btn.classList.add("active");
    } else {
      btn.classList.remove("active");
    }
  });

  // Update tab panes
  const panes = document.querySelectorAll(".settings-tab-pane");
  panes.forEach(pane => {
    if (pane.id === tabId) {
      pane.classList.add("active");
      pane.style.display = "block";
    } else {
      pane.classList.remove("active");
      pane.style.display = "none";
    }
  });

  try {
    localStorage.setItem("gv_active_settings_tab", tabId);
  } catch (e) {
    console.warn("Could not save active settings tab to localStorage:", e);
  }
};

window.restoreSettingsTab = function() {
  let savedTab = "settings-tab-apis";
  try {
    savedTab = localStorage.getItem("gv_active_settings_tab") || "settings-tab-apis";
  } catch (e) {}
  window.switchSettingsTab(savedTab);
};

// Global settings tab switching handler via delegation
document.addEventListener("click", (e) => {
  const tabBtn = e.target.closest(".settings-tab-btn");
  if (tabBtn) {
    const tabId = tabBtn.getAttribute("data-settings-tab") || tabBtn.getAttribute("data-tab");
    if (tabId && typeof window.switchSettingsTab === "function") {
      window.switchSettingsTab(tabId);
    }
  }
});




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

  const btnExportRawExcel = document.getElementById("btn-export-raw-inventory-excel");
  if (btnExportRawExcel) {
    btnExportRawExcel.addEventListener("click", () => {
      if (typeof exportRawInventoryToExcel === "function") {
        exportRawInventoryToExcel();
      }
    });
  }

  const btnExportRawCsv = document.getElementById("btn-export-raw-inventory-csv");
  if (btnExportRawCsv) {
    btnExportRawCsv.addEventListener("click", () => {
      if (typeof exportRawInventoryToCSV === "function") {
        exportRawInventoryToCSV();
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

  // Steam Ratings Enricher buttons
  const btnFetchAllReviews = document.getElementById("btn-fetch-all-reviews");
  if (btnFetchAllReviews) {
    btnFetchAllReviews.addEventListener("click", () => {
      if (typeof window.triggerBatchFetchReviews === "function") {
        window.triggerBatchFetchReviews();
      }
    });
  }

  const btnCancelReviews = document.getElementById("btn-cancel-review-fetch");
  if (btnCancelReviews) {
    btnCancelReviews.addEventListener("click", () => {
      window.batchReviewFetchCancelled = true;
      btnCancelReviews.disabled = true;
      btnCancelReviews.textContent = "Stopping...";
    });
  }

  const btnCleanReviews = document.getElementById("btn-clean-unrated-cache");
  if (btnCleanReviews) {
    btnCleanReviews.addEventListener("click", () => {
      if (typeof window.cleanupPoisonedReviewsCache === "function") {
        const cleaned = window.cleanupPoisonedReviewsCache();
        if (typeof showToast === "function") {
          showToast(`Cleaned ${cleaned} unrated/empty review cache entries.`, "success");
        }
      }
    });
  }

  if (typeof window.updateSteamReviewsStats === "function") {
    window.updateSteamReviewsStats();
  }

  // Bind Profile settings controls
  bindProfileSettingsControls();
}
