/**
 * GameVault - Excel / CSV Import Pipelines & Tools (importer.js)
 */

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
  logActionNotification("Exported database backup JSON file");
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
      logActionNotification("Restored database from JSON backup");
      
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
              logActionNotification(`Imported ${importedGames.length} keys from sheet (with duplicates)`);
            } else {
              showToast(`Successfully imported ${importedGames.length} inventory keys from sheet!`, "success");
              logActionNotification(`Imported ${importedGames.length} keys from sheet`);
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
