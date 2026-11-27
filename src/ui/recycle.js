/**
 * GameVault - Recycle Bin & Duplicate Keys Inspector (src/ui/recycle.js)
 * Manages deleted item staging, restoration, permanent purge, and duplicate inventory key resolution.
 */

// ==========================================================================
// RECYCLE BIN VIEW RENDERERS & MUTATORS
// ==========================================================================
const escapeHTML = (typeof window !== "undefined" && window.escapeHTML) ? window.escapeHTML : function(str) {
  if (!str) return "";
  return str.toString()
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

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

window.renderPublishersTab = renderPublishersTab;
window.handlePublishersSortChange = function(val) {
  state.publishersSortBy = val;
  localStorage.setItem("gv_publishers_sort_by", val);
  const sortSelect = document.getElementById("publishers-sort");
  if (sortSelect && sortSelect.value !== val) {
    sortSelect.value = val;
  }
  renderPublishersTab();
};

window.togglePublishersSort = function(col) {
  const current = state.publishersSortBy || "purchased-desc";
  let next = "";
  if (col === "name") {
    next = current === "name-asc" ? "name-desc" : "name-asc";
  } else if (col === "titles") {
    next = current === "titles-desc" ? "titles-asc" : "titles-desc";
  } else if (col === "purchased") {
    next = current === "purchased-asc" ? "purchased-desc" : "purchased-asc";
  } else if (col === "sold") {
    next = current === "sold-asc" ? "sold-desc" : "sold-asc";
  } else if (col === "stock") {
    next = current === "stock-asc" ? "stock-desc" : "stock-asc";
  } else if (col === "spent") {
    next = current === "spent-asc" ? "spent-desc" : "spent-asc";
  } else if (col === "revenue") {
    next = current === "revenue-asc" ? "revenue-desc" : "revenue-asc";
  } else if (col === "profit") {
    next = current === "profit-asc" ? "profit-desc" : "profit-asc";
  } else if (col === "roi") {
    next = current === "roi-asc" ? "roi-desc" : "roi-asc";
  } else if (col === "avg-duration") {
    next = current === "avg-duration-asc" ? "avg-duration-desc" : "avg-duration-asc";
  } else {
    next = "purchased-desc";
  }

  window.handlePublishersSortChange(next);
};

window.updatePublishersHeaderIcons = function(sortBy) {
  const iconMap = {
    "name": "publishers-th-name-icon",
    "titles": "publishers-th-titles-icon",
    "purchased": "publishers-th-purchased-icon",
    "sold": "publishers-th-sold-icon",
    "stock": "publishers-th-stock-icon",
    "spent": "publishers-th-spent-icon",
    "revenue": "publishers-th-revenue-icon",
    "profit": "publishers-th-profit-icon",
    "roi": "publishers-th-roi-icon",
    "avg-duration": "publishers-th-avg-duration-icon"
  };

  const isAsc = (sortBy || "").endsWith("-asc");
  const field = (sortBy || "").replace(/-(asc|desc)$/, "");

  Object.entries(iconMap).forEach(([key, id]) => {
    const el = document.getElementById(id);
    if (!el) return;
    if (key === field) {
      el.className = isAsc ? "fa-solid fa-sort-up" : "fa-solid fa-sort-down";
      el.style.color = "var(--accent-purple)";
      el.style.opacity = "1";
    } else {
      el.className = "fa-solid fa-sort";
      el.style.color = "";
      el.style.opacity = "0.4";
    }
  });
};

function renderPublishersTab() {
  calculateSupplierMetrics();

  if (typeof initRetrievePublisherLogoHandlers === "function") {
    initRetrievePublisherLogoHandlers();
  }

  const tbody = DOM["publishers-table-body"] || document.getElementById("publishers-table-body");
  if (!tbody) return;
  tbody.innerHTML = "";

  const supSupplierSelect = document.getElementById("sup-filter-supplier");
  const selectedSupplier = supSupplierSelect ? supSupplierSelect.value : (state.supFilterSupplier || "all");

  // Pre-index sales by inventoryId for O(1) lookups
  const salesMap = new Map();
  state.sales.forEach(sale => {
    salesMap.set(sale.inventoryId, sale);
  });

  // Group inventory by publisher
  const publishersMap = {};
  let pubInventory = state.inventory;
  if (selectedSupplier !== "all") {
    pubInventory = pubInventory.filter(item => (item.source || "").trim().toLowerCase() === selectedSupplier.trim().toLowerCase());
  }
  pubInventory.forEach(item => {
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
        durationCount: 0,
        titlesSet: new Set()
      };
    }
    
    const stats = publishersMap[pub];
    const itemTitle = String(item.title || "").trim();
    if (itemTitle) {
      stats.titlesSet.add(itemTitle);
    }
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

  Object.values(publishersMap).forEach(pub => {
    pub.titlesCount = pub.titlesSet ? pub.titlesSet.size : 0;
  });

  const sortBy = state.publishersSortBy || "purchased-desc";
  const publishersList = Object.values(publishersMap).sort((a, b) => {
    switch (sortBy) {
      case "name-asc":
        return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
      case "name-desc":
        return b.name.localeCompare(a.name, undefined, { sensitivity: 'base' });
      case "titles-asc":
        return a.titlesCount - b.titlesCount || a.purchased - b.purchased;
      case "titles-desc":
        return b.titlesCount - a.titlesCount || b.purchased - a.purchased;
      case "purchased-asc":
        return a.purchased - b.purchased || a.name.localeCompare(b.name);
      case "purchased-desc":
        return b.purchased - a.purchased || a.name.localeCompare(b.name);
      case "sold-asc":
        return a.sold - b.sold || a.purchased - b.purchased;
      case "sold-desc":
        return b.sold - a.sold || b.purchased - a.purchased;
      case "stock-asc":
        return a.inStock - b.inStock || a.purchased - b.purchased;
      case "stock-desc":
        return b.inStock - a.inStock || b.purchased - a.purchased;
      case "spent-asc":
        return a.totalSpent - b.totalSpent || a.purchased - b.purchased;
      case "spent-desc":
        return b.totalSpent - a.totalSpent || b.purchased - a.purchased;
      case "revenue-asc":
        return a.totalRevenue - b.totalRevenue || a.purchased - b.purchased;
      case "revenue-desc":
        return b.totalRevenue - a.totalRevenue || b.purchased - a.purchased;
      case "profit-asc":
        return a.totalNetProfit - b.totalNetProfit || a.purchased - b.purchased;
      case "profit-desc":
        return b.totalNetProfit - a.totalNetProfit || b.purchased - a.purchased;
      case "roi-asc": {
        const aRoi = a.totalCostOfSales > 0 ? (a.totalNetProfit / a.totalCostOfSales) : -Infinity;
        const bRoi = b.totalCostOfSales > 0 ? (b.totalNetProfit / b.totalCostOfSales) : -Infinity;
        return aRoi - bRoi || a.purchased - b.purchased;
      }
      case "roi-desc": {
        const aRoi = a.totalCostOfSales > 0 ? (a.totalNetProfit / a.totalCostOfSales) : -Infinity;
        const bRoi = b.totalCostOfSales > 0 ? (b.totalNetProfit / b.totalCostOfSales) : -Infinity;
        return bRoi - aRoi || b.purchased - a.purchased;
      }
      case "avg-duration-asc": {
        const aDur = a.durationCount > 0 ? a.totalDuration / a.durationCount : null;
        const bDur = b.durationCount > 0 ? b.totalDuration / b.durationCount : null;
        if (aDur === null && bDur === null) return 0;
        if (aDur === null) return 1;
        if (bDur === null) return -1;
        return aDur - bDur || a.purchased - b.purchased;
      }
      case "avg-duration-desc": {
        const aDur = a.durationCount > 0 ? a.totalDuration / a.durationCount : null;
        const bDur = b.durationCount > 0 ? b.totalDuration / b.durationCount : null;
        if (aDur === null && bDur === null) return 0;
        if (aDur === null) return 1;
        if (bDur === null) return -1;
        return bDur - aDur || b.purchased - a.purchased;
      }
      default:
        return b.purchased - a.purchased;
    }
  });

  const sortSelect = document.getElementById("publishers-sort");
  if (sortSelect && sortSelect.value !== sortBy) {
    sortSelect.value = sortBy;
  }
  if (typeof window.updatePublishersHeaderIcons === "function") {
    window.updatePublishersHeaderIcons(sortBy);
  }

  if (publishersList.length === 0) {
    tbody.innerHTML = `<tr><td colspan="11" style="text-align: center; color: var(--text-muted); padding: 20px;">No publishers data available.</td></tr>`;
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

    const resolvedPubLogo = !isNoPublisher ? (
      (state.publisherLogos && (state.publisherLogos[pub.name] || (typeof getPublisherLogoCaseInsensitive === "function" && getPublisherLogoCaseInsensitive(state.publisherLogos, pub.name))))
      || (typeof getPublisherAutoLogo === "function" ? getPublisherAutoLogo(pub.name) : null)
    ) : null;

    const pubLogoHtml = isNoPublisher ? '' : (
      resolvedPubLogo
        ? `<img src="${escapeHTML(resolvedPubLogo)}" class="supplier-logo-thumbnail" alt="${escapeHTML(pub.name)}" style="width: 24px; height: 24px; border-radius: 4px; object-fit: contain; margin-right: 8px; flex-shrink: 0; background: var(--bg-card); border: 1px solid var(--border-color); padding: 1px;" onerror="if(!this.dataset.ddTried){this.dataset.ddTried='1';const d=window.resolvePublisherDomain?window.resolvePublisherDomain('${escapeHTML(escapedPubName)}'):'';if(d){this.src='https://icons.duckduckgo.com/ip3/'+encodeURIComponent(d)+'.ico';return;}}this.style.display='none';if(this.nextElementSibling)this.nextElementSibling.style.display='inline-flex';"><div class="supplier-logo-placeholder" style="display: none; width: 24px; height: 24px; font-size: 0.7rem; margin-right: 8px; flex-shrink: 0;"><i class="fa-solid fa-building"></i></div>`
        : `<div class="supplier-logo-placeholder" style="width: 24px; height: 24px; font-size: 0.7rem; margin-right: 8px; flex-shrink: 0;"><i class="fa-solid fa-building"></i></div>`
    );

    const retrieveLogoBtnHtml = isNoPublisher
      ? ""
      : `<button class="btn btn-outline btn-xs" onclick="event.stopPropagation(); triggerRetrievePublisherLogo('${escapeHTML(escapedPubName)}')" title="Retrieve Publisher Logo" style="padding: 2px 6px; font-size: 0.75rem; margin-right: 6px;"><i class="fa-solid fa-cloud-arrow-down text-purple"></i> Logo</button>`;

    const editBtnHtml = isNoPublisher 
      ? "" 
      : `<button class="btn btn-outline btn-xs" onclick="event.stopPropagation(); triggerEditPublisher('${escapeHTML(escapedPubName)}')" style="padding: 2px 6px; font-size: 0.75rem;"><i class="fa-solid fa-pen-to-square"></i> Edit</button>`;

    tr.innerHTML = `
      <td><span style="display: inline-flex; align-items: center;">${chevronIcon}${pubLogoHtml}<strong>${escapeHTML(pub.name)}</strong></span></td>
      <td><span class="badge" style="background: rgba(168, 85, 247, 0.12); color: var(--accent-purple); font-weight: 600; border: 1px solid rgba(168, 85, 247, 0.25); border-radius: 12px; padding: 2px 8px; font-size: 0.78rem;">${pub.titlesCount}</span></td>
      <td>${pub.purchased}</td>
      <td>${pub.sold}</td>
      <td>${pub.inStock}</td>
      <td>${formatCurrency(pub.totalSpent)}</td>
      <td>${formatCurrency(pub.totalRevenue)}</td>
      <td class="${profitClass}"><strong>${profitSign}${formatCurrency(pub.totalNetProfit)}</strong></td>
      <td class="${profitClass}">${roi.toFixed(1)}%</td>
      <td>${avgDuration} ${pub.durationCount > 0 ? 'days' : ''}</td>
      <td style="text-align: right; white-space: nowrap;">${retrieveLogoBtnHtml}${editBtnHtml}</td>
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
        <td colspan="11" style="padding: 12px 24px; background: rgba(0, 0, 0, 0.18);">
          <div style="border-left: 3px solid var(--accent-purple); padding-left: 16px; margin: 4px 0;">
            <h5 style="margin: 0 0 10px 0; font-size: 0.8rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: var(--accent-purple);">
              <i class="fa-solid fa-gamepad" style="margin-right: 6px;"></i> Games Breakdown for ${escapeHTML(pub.name)} (${pub.titlesCount} ${pub.titlesCount === 1 ? 'Title' : 'Titles'})
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
