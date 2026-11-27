/**
 * GameVault - Sourcing & Multi-Marketplace Arbitrage Radar (src/ui/radar.js)
 * Manages CheapShark multi-retailer scanning, Kinguin and G2A fee simulation, and manual benchmark overrides.
 */

// ==========================================================================
// SOURCING & KINGUIN ARBITRAGE RADAR
// ==========================================================================

const CHEAPSHARK_STORES = {
  "1": "Steam",
  "2": "GamersGate",
  "3": "GreenManGaming",
  "7": "GOG",
  "11": "Humble Store",
  "13": "Ubisoft / Uplay",
  "15": "Fanatical",
  "21": "WinGameStore",
  "23": "GameBillet",
  "25": "Epic Games Store",
  "27": "Gamesplanet",
  "30": "IndieGala",
  "35": "DreamGame"
};

window.renderSourcingStoresDropdown = function() {
  const container = document.getElementById("sourcing-stores-checkboxes-list");
  const label = document.getElementById("sourcing-stores-btn-label");
  if (!container) return;

  const allStoreIds = Object.keys(CHEAPSHARK_STORES);
  const selected = state.sourcingSettings?.selectedStores || [];
  const isNone = selected.includes("none");
  const isAll = !isNone && (selected.length === 0 || selected.length === allStoreIds.length);

  // Update button label
  if (label) {
    if (isAll) {
      label.textContent = `All Stores (${allStoreIds.length})`;
    } else if (isNone || selected.length === 0) {
      label.textContent = `None (0)`;
    } else if (selected.length <= 2) {
      const names = selected.map(id => CHEAPSHARK_STORES[id] || id);
      label.textContent = names.join(", ");
    } else {
      label.textContent = `${selected.length} Stores`;
    }
  }

  container.innerHTML = allStoreIds.map(id => {
    const name = CHEAPSHARK_STORES[id];
    const isChecked = isAll || (!isNone && selected.includes(id));
    const matchingSupplier = (state.suppliers || []).find(s => {
      const supStoreId = typeof getRadarStoreIdForSupplier === "function" ? getRadarStoreIdForSupplier(s.name) : null;
      return supStoreId === id;
    });
    const isMySupplier = !!matchingSupplier;
    const isScanActive = isMySupplier && (matchingSupplier.radarScan !== false);

    return `
      <label class="sourcing-store-checkbox-row">
        <input type="checkbox" value="${id}" ${isChecked ? "checked" : ""} class="sourcing-store-checkbox" />
        <span class="store-name" title="${name}">${name}</span>
        ${isMySupplier ? `
          <span class="badge ${isScanActive ? 'badge-available' : 'badge-sold'} sourcing-store-supplier-badge" title="Matched with supplier '${escapeHTML(matchingSupplier.name)}' (${isScanActive ? 'Radar ON' : 'Radar OFF in Suppliers menu'})">
            <i class="fa-solid fa-truck-ramp-box" style="margin-right: 3px;"></i>${isScanActive ? 'My Supplier' : 'Suppliers (Off)'}
          </span>
        ` : ''}
      </label>
    `;
  }).join("");

  // Attach change listener to checkboxes
  container.querySelectorAll(".sourcing-store-checkbox").forEach(cb => {
    cb.addEventListener("change", () => {
      const checkedBoxes = Array.from(container.querySelectorAll(".sourcing-store-checkbox:checked")).map(c => c.value);
      if (checkedBoxes.length === allStoreIds.length) {
        state.sourcingSettings.selectedStores = [];
      } else if (checkedBoxes.length === 0) {
        state.sourcingSettings.selectedStores = ["none"];
      } else {
        state.sourcingSettings.selectedStores = checkedBoxes;
      }
      if (typeof saveSecondaryTablesToStorage === "function") saveSecondaryTablesToStorage();
      if (window.supabaseClient && typeof dbSaveSettings === "function") {
        dbSaveSettings("sourcingSettings", state.sourcingSettings);
      }
      window.renderSourcingStoresDropdown();
      window.renderSourcingRadarView();
    });
  });
};

window.updateSourcingBadge = function() {
  const badge = document.getElementById("sourcing-deals-count-badge");
  if (!badge) return;
  const favorites = state.favoriteGames || [];
  if (favorites.length === 0) {
    badge.style.display = "none";
    return;
  }
  const cached = state.sourcingSettings?.cachedDeals || {};
  let count = 0;
  favorites.forEach(title => {
    if (cached[title] && Number(cached[title].salePrice) > 0) {
      count++;
    }
  });
  if (count > 0) {
    badge.textContent = count;
    badge.style.display = "inline-block";
  } else {
    badge.style.display = "none";
  }
};

window.openSourcingRadarModal = async function() {
  let modal = document.getElementById("sourcing-radar-modal");
  if (!modal) {
    if (typeof loadHTMLTemplates === "function") {
      await loadHTMLTemplates();
      modal = document.getElementById("sourcing-radar-modal");
    }
  }
  if (!modal) {
    if (typeof showToast === "function") showToast("Loading Sourcing Radar template...", "info");
    return;
  }

  // Populate Kinguin fee inputs and alerts toggle from state
  if (state.sourcingSettings) {
    const feePctEl = document.getElementById("sourcing-kinguin-fee-pct");
    const fixedFeeEl = document.getElementById("sourcing-kinguin-fixed-fee");
    const g2aFeePctEl = document.getElementById("sourcing-g2a-fee-pct");
    const g2aFixedFeeEl = document.getElementById("sourcing-g2a-fixed-fee");
    const alertsToggle = document.getElementById("sourcing-toggle-topbar-alerts");
    if (feePctEl) feePctEl.value = state.sourcingSettings.kinguinFeePct ?? 11;
    if (fixedFeeEl) fixedFeeEl.value = state.sourcingSettings.kinguinFixedFee ?? 0.10;
    if (g2aFeePctEl) g2aFeePctEl.value = state.sourcingSettings.g2aFeePct ?? 10.4;
    if (g2aFixedFeeEl) g2aFixedFeeEl.value = state.sourcingSettings.g2aFixedFee ?? 0.35;
    if (alertsToggle) alertsToggle.checked = state.sourcingSettings.topbarAlerts !== false;
  }

  if (typeof window.initKinguinConnection === "function") {
    window.initKinguinConnection();
  }
  if (typeof window.initGGDealsConnection === "function") {
    window.initGGDealsConnection();
  }
  if (typeof window.initG2AConnection === "function") {
    window.initG2AConnection();
  }

  openModal("sourcing-radar-modal");
  window.renderSourcingStoresDropdown();
  window.renderSourcingRadarView();

  // If deals have never been cached and user has favorites, auto-fetch
  const cached = state.sourcingSettings?.cachedDeals;
  const hasDeals = cached && Object.keys(cached).length > 0;
  if (!hasDeals && (state.favoriteGames || []).length > 0) {
    window.refreshSourcingDeals();
  }
};

window.renderSourcingRadarView = function() {
  const container = document.getElementById("sourcing-radar-list");
  if (!container) return;

  if (typeof window.renderSourcingStoresDropdown === "function") {
    window.renderSourcingStoresDropdown();
  }

  const favorites = (state.favoriteGames || []).slice();
  const feePct = Number(state.sourcingSettings?.kinguinFeePct ?? 11);
  const fixedFee = Number(state.sourcingSettings?.kinguinFixedFee ?? 0.10);
  const g2aFeePct = Number(state.sourcingSettings?.g2aFeePct ?? 10.4);
  const g2aFixedFee = Number(state.sourcingSettings?.g2aFixedFee ?? 0.35);
  const filterSelect = document.getElementById("sourcing-filter-status");
  const filterVal = filterSelect ? filterSelect.value : "profitable";

  // KPI elements
  const kpiFavs = document.getElementById("sourcing-kpi-total-favs");
  const kpiDeals = document.getElementById("sourcing-kpi-active-deals");
  const kpiProfit = document.getElementById("sourcing-kpi-profitable");
  const kpiTopRoi = document.getElementById("sourcing-kpi-top-roi");
  const lastUpdatedEl = document.getElementById("sourcing-last-updated-text");

  if (kpiFavs) kpiFavs.textContent = favorites.length;

  if (lastUpdatedEl) {
    if (state.sourcingSettings?.lastChecked) {
      try {
        const d = new Date(state.sourcingSettings.lastChecked);
        const timeStr = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        lastUpdatedEl.innerHTML = `<i class="fa-regular fa-clock" style="margin-right: 4px;"></i>Updated ${timeStr}`;
      } catch (e) {
        lastUpdatedEl.innerHTML = `<i class="fa-regular fa-clock" style="margin-right: 4px;"></i>Cached`;
      }
    } else {
      lastUpdatedEl.innerHTML = `<i class="fa-regular fa-clock" style="margin-right: 4px;"></i>Not checked yet`;
    }
  }

  if (favorites.length === 0) {
    if (kpiDeals) kpiDeals.textContent = "0";
    if (kpiProfit) kpiProfit.textContent = "0";
    if (kpiTopRoi) kpiTopRoi.textContent = "0%";
    container.innerHTML = `
      <div style="text-align: center; padding: 48px 20px; background: var(--bg-card); border: 1px dashed var(--border-color); border-radius: var(--radius-md);">
        <i class="fa-solid fa-crosshairs" style="font-size: 2.8rem; color: var(--accent-purple); opacity: 0.5; margin-bottom: 14px;"></i>
        <h4 style="margin: 0 0 8px 0; font-size: 1.1rem; color: var(--text-main);">No Favorite Games Starred Yet</h4>
        <p style="font-size: 0.85rem; color: var(--text-secondary); max-width: 480px; margin: 0 auto 18px; line-height: 1.5;">
          Star games (<i class="fa-solid fa-star" style="color: #fbbf24;"></i>) in the <strong>Entries</strong> tab to automatically track price drops across official stores and calculate real-time Kinguin arbitrage profit!
        </p>
        <button type="button" class="btn btn-outline btn-sm" onclick="closeModal('sourcing-radar-modal'); if (typeof navigateTo === 'function') navigateTo('entries-view');">
          <i class="fa-solid fa-list-check" style="margin-right: 6px;"></i> Browse Entries &amp; Star Games
        </button>
      </div>
    `;
    window.updateSourcingBadge();
    return;
  }

  // Pre-index sales and inventory
  const salesByTitle = {};
  (state.sales || []).forEach(s => {
    if (!s.title) return;
    const t = s.title.trim().toLowerCase();
    if (!salesByTitle[t]) salesByTitle[t] = [];
    salesByTitle[t].push(s);
  });

  const invByTitle = {};
  (state.inventory || []).forEach(item => {
    if (!item.title) return;
    const t = item.title.trim().toLowerCase();
    if (!invByTitle[t]) invByTitle[t] = [];
    invByTitle[t].push(item);
  });

  let activeDealsCount = 0;
  let profitableCount = 0;
  let maxRoi = 0;

  const computedItems = favorites.map(title => {
    const key = title.trim().toLowerCase();
    const invItems = invByTitle[key] || [];
    const inStockCount = invItems.filter(i => i.status === "Available" || (!i.status && !i.isSold)).length;

    // Resolve Kinguin resale benchmark
    let benchmarkPrice = null;
    let benchmarkSource = "No Data";

    const manual = state.sourcingSettings?.manualBenchmarks?.[title];
    const liveKinguin = state.sourcingSettings?.liveKinguinPrices?.[title];

    if (manual !== undefined && manual !== null && manual !== "" && !isNaN(Number(manual)) && Number(manual) > 0) {
      benchmarkPrice = Number(manual);
      benchmarkSource = "Manual Override";
    } else if (liveKinguin && Number(liveKinguin.price) > 0) {
      // Discard stale or non-compliant cached quotes (altergift, console platform, or account)
      const isAltergift = window.isKinguinAltergiftListing && window.isKinguinAltergiftListing(liveKinguin, title);
      const isConsole = window.isKinguinPcPlatform && !window.isKinguinPcPlatform(liveKinguin, title);
      const isAccount = window.isKinguinAccountListing && window.isKinguinAccountListing(liveKinguin);

      if (isAltergift || isConsole || isAccount) {
        if (state.sourcingSettings?.liveKinguinPrices) {
          delete state.sourcingSettings.liveKinguinPrices[title];
        }
      } else {
        benchmarkPrice = Number(liveKinguin.price);
        benchmarkSource = "Live Kinguin API";
      }
    } else {
      const titleSales = salesByTitle[key] || [];
      const kinguinSales = titleSales.filter(s => s.platform && s.platform.trim().toLowerCase() === "kinguin" && Number(s.price) > 0);
      if (kinguinSales.length > 0) {
        // Most recent Kinguin sale price
        const lastSale = kinguinSales[kinguinSales.length - 1];
        benchmarkPrice = Number(lastSale.price);
        benchmarkSource = `Kinguin (${kinguinSales.length} sold)`;
      } else if (titleSales.length > 0) {
        const lastAny = titleSales[titleSales.length - 1];
        benchmarkPrice = Number(lastAny.price);
        benchmarkSource = `Last sold (${lastAny.platform || "Platform"})`;
      } else {
        const costItems = invItems.filter(i => Number(i.cost) > 0);
        if (costItems.length > 0) {
          const avgCost = costItems.reduce((acc, curr) => acc + Number(curr.cost), 0) / costItems.length;
          benchmarkPrice = Math.round(avgCost * 1.35 * 100) / 100;
          benchmarkSource = "Catalog Cost + 35%";
        }
      }
    }

    // Cached deal data with store/supplier filtering
    const allStoreIds = Object.keys(CHEAPSHARK_STORES);
    const selectedStores = state.sourcingSettings?.selectedStores || [];
    const isNoneStores = selectedStores.includes("none");
    const isAllStores = !isNoneStores && (selectedStores.length === 0 || selectedStores.length === allStoreIds.length);

    const cachedDeal = state.sourcingSettings?.cachedDeals?.[title];
    const isStoreEnabled = cachedDeal && !isNoneStores && (
      isAllStores || selectedStores.includes(String(cachedDeal.storeID))
    );

    const dealPrice = (isStoreEnabled && Number(cachedDeal.salePrice) > 0) ? Number(cachedDeal.salePrice) : null;
    const normalPrice = (isStoreEnabled && Number(cachedDeal.normalPrice) > 0) ? Number(cachedDeal.normalPrice) : null;
    const savings = isStoreEnabled ? Number(cachedDeal.savings || 0) : 0;
    const storeName = isStoreEnabled ? (cachedDeal.storeName || CHEAPSHARK_STORES[cachedDeal.storeID] || "Store") : null;
    const dealId = isStoreEnabled ? cachedDeal?.dealID || null : null;
    const thumbUrl = cachedDeal?.thumb || state.catalogArtwork?.[title] || "";

    if (dealPrice !== null && dealPrice > 0) {
      activeDealsCount++;
    }

    // Net Kinguin Payout & Profit
    let netPayout = null;
    let netProfit = null;
    let roiPct = null;

    if (benchmarkPrice !== null && benchmarkPrice > 0) {
      netPayout = Math.max(0, (benchmarkPrice * (1 - feePct / 100)) - fixedFee);
      if (dealPrice !== null && dealPrice > 0) {
        netProfit = netPayout - dealPrice;
        roiPct = (netProfit / dealPrice) * 100;
      }
    }

    if (netProfit !== null && netProfit > 0) {
      profitableCount++;
      if (roiPct !== null && roiPct > maxRoi) maxRoi = roiPct;
    }

    // Live GG.deals Pricing & Multi-keyshop benchmark
    const steamAppId = cachedDeal?.steamAppID;
    let ggData = null;
    if (steamAppId && state.sourcingSettings?.liveGGDealsPrices?.[steamAppId]) {
      ggData = state.sourcingSettings.liveGGDealsPrices[steamAppId];
    } else if (state.sourcingSettings?.liveGGDealsPrices) {
      const cleanLower = key.replace(/\s*[\(\[].*?[\)\]]/g, "").trim().toLowerCase();
      const match = Object.values(state.sourcingSettings.liveGGDealsPrices).find(g => 
        g.title && g.title.toLowerCase().includes(cleanLower) &&
        !window.isGameAccountListing?.(g) &&
        !window.isGameAltergiftListing?.(g, cleanLower) &&
        (window.isGamePcPlatform ? window.isGamePcPlatform(g, cleanLower) : true) &&
        !window.isGameDlcListing?.(g, cleanLower)
      );
      if (match) ggData = match;
    }

    const ggKeyshopPrice = (ggData && ggData.currentKeyshops !== null) ? Number(ggData.currentKeyshops) : null;
    const ggRetailPrice = (ggData && ggData.currentRetail !== null) ? Number(ggData.currentRetail) : null;
    const ggHistoricalKeyshop = (ggData && ggData.historicalKeyshops !== null) ? Number(ggData.historicalKeyshops) : null;
    const ggCurrency = ggData?.currency || (state.sourcingSettings?.ggdealsRegion === "eu" ? "EUR" : "USD");
    const ggUrl = ggData?.url || null;
    const ggTitle = ggData?.title || null;
    const dealTitle = isStoreEnabled ? (cachedDeal?.title || null) : null;

    return {
      title,
      inStockCount,
      benchmarkPrice,
      benchmarkSource,
      liveKinguinName: liveKinguin?.name || null,
      netPayout,
      dealPrice,
      normalPrice,
      savings,
      storeName,
      dealId,
      dealTitle,
      thumbUrl,
      netProfit,
      roiPct,
      steamAppId,
      ggKeyshopPrice,
      ggRetailPrice,
      ggHistoricalKeyshop,
      ggCurrency,
      ggUrl,
      ggTitle
    };
  });

  // Update KPI counters
  if (kpiDeals) kpiDeals.textContent = activeDealsCount;
  if (kpiProfit) kpiProfit.textContent = profitableCount;
  if (kpiTopRoi) kpiTopRoi.textContent = maxRoi > 0 ? `+${Math.round(maxRoi)}%` : "0%";

  // Apply Filter
  let filtered = computedItems;
  if (filterVal === "profitable") {
    filtered = computedItems.filter(item => item.bestNetProfit !== null && item.bestNetProfit > 0);
  } else if (filterVal === "high-margin") {
    filtered = computedItems.filter(item => item.bestRoi !== null && item.bestRoi >= 30);
  } else if (filterVal === "out-of-stock") {
    filtered = computedItems.filter(item => item.inStockCount === 0);
  }

  // Sort: highest profit first, then highest ROI, then title
  filtered.sort((a, b) => {
    const profitA = a.bestNetProfit !== null ? a.bestNetProfit : -9999;
    const profitB = b.bestNetProfit !== null ? b.bestNetProfit : -9999;
    if (profitB !== profitA) return profitB - profitA;
    return a.title.localeCompare(b.title);
  });

  if (filtered.length === 0) {
    let emptyMsg = "No games matched this filter.";
    if (filterVal === "profitable") {
      emptyMsg = "No profitable Kinguin arbitrage deals detected currently. Click <strong>Refresh Deals</strong> above or check gg.deals / Allkeyshop launchers below.";
    } else if (filterVal === "high-margin") {
      emptyMsg = "No watched games currently meet the &ge; 30% ROI threshold. Try checking <strong>All Favorites</strong>.";
    } else if (filterVal === "out-of-stock") {
      emptyMsg = "All watched favorite games currently have keys in stock!";
    }

    container.innerHTML = `
      <div style="text-align: center; padding: 36px 20px; background: var(--bg-card); border: 1px dashed var(--border-color); border-radius: var(--radius-md);">
        <i class="fa-solid fa-filter" style="font-size: 2rem; color: var(--text-muted); opacity: 0.6; margin-bottom: 10px;"></i>
        <h4 style="margin: 0 0 6px 0; font-size: 0.95rem; color: var(--text-secondary);">${emptyMsg}</h4>
        <button type="button" class="btn btn-outline btn-xs" style="margin-top: 10px;" onclick="document.getElementById('sourcing-filter-status').value = 'all'; window.renderSourcingRadarView();">
          Show All Favorites (${favorites.length})
        </button>
      </div>
    `;
    window.updateSourcingBadge();
    return;
  }

  const itemsHtml = filtered.map(item => {
    const isProfitable = item.bestNetProfit !== null && item.bestNetProfit > 0;
    const isLoss = item.bestNetProfit !== null && item.bestNetProfit <= 0;
    const itemClass = isProfitable ? "sourcing-item is-profitable" : (isLoss ? "sourcing-item is-loss" : "sourcing-item");

    const safeTitle = item.title.replace(/"/g, "&quot;");
    const encodedTitle = encodeURIComponent(item.title);

    let roiBadge = `<span class="sourcing-roi-badge sourcing-roi-low">-</span>`;
    if (item.bestRoi !== null) {
      const roundedRoi = Math.round(item.bestRoi);
      if (item.bestRoi >= 30) {
        roiBadge = `<span class="sourcing-roi-badge sourcing-roi-high"><i class="fa-solid fa-arrow-trend-up"></i> +${roundedRoi}% ROI</span>`;
      } else if (item.bestRoi > 0) {
        roiBadge = `<span class="sourcing-roi-badge sourcing-roi-med"><i class="fa-solid fa-arrow-trend-up"></i> +${roundedRoi}% ROI</span>`;
      } else {
        roiBadge = `<span class="sourcing-roi-badge sourcing-roi-low">${roundedRoi}% ROI</span>`;
      }
    }

    return `
      <div class="${itemClass}">
        ${item.thumbUrl ? `
          <img src="${item.thumbUrl}" alt="" class="sourcing-item-thumb" onerror="this.onerror=null; this.style.display='none'; this.nextElementSibling.style.display='flex';" />
          <div class="sourcing-item-thumb-placeholder" style="display: none; background: var(--accent-purple);">
            ${item.title.substring(0, 2).toUpperCase()}
          </div>
        ` : `
          <div class="sourcing-item-thumb-placeholder" style="background: var(--accent-purple);">
            ${item.title.substring(0, 2).toUpperCase()}
          </div>
        `}

        <div class="sourcing-item-main">
          <div class="sourcing-item-header">
            <span class="sourcing-item-title" title="${safeTitle}" onclick="window.triggerEditCatalogEntry('${item.title.replace(/'/g, "\\'")}')">
              ${safeTitle}
            </span>
            <div style="display: flex; align-items: center; gap: 6px;">
              <span class="badge ${item.inStockCount === 0 ? 'badge-out-of-stock' : 'badge-available'}" style="font-size: 0.7rem; padding: 2px 7px;">
                ${item.inStockCount} in stock
              </span>
            </div>
          </div>

          <div class="sourcing-item-grid">
            <!-- Kinguin Benchmark Column -->
            <div class="sourcing-stat-col">
              <span class="sourcing-stat-label" ${item.liveKinguinName ? `title="Matched: ${item.liveKinguinName.replace(/"/g, '&quot;')}"` : ''}>
                ${item.benchmarkSource === "Live Kinguin API" ? `<i class="fa-solid fa-crown" style="color: #ff9900;"></i> Live Kinguin` : `<i class="fa-solid fa-tag" style="color: #ff5000;"></i> Kinguin Resale`}
              </span>
              <div class="sourcing-stat-value" style="cursor: pointer;" title="Click to override Kinguin resale benchmark price" onclick="window.setSourcingManualBenchmark('${item.title.replace(/'/g, "\\'")}')">
                <span>${item.benchmarkPrice !== null ? `€${item.benchmarkPrice.toFixed(2)}` : `<span style="color: var(--text-muted); font-size: 0.8rem;">Set benchmark</span>`}</span>
                <i class="fa-solid fa-pen" style="font-size: 0.68rem; color: var(--text-muted); opacity: 0.7;"></i>
              </div>
              <span style="font-size: 0.7rem; color: var(--text-muted);" ${item.liveKinguinName ? `title="Kinguin item: ${item.liveKinguinName.replace(/"/g, '&quot;')}"` : ''}>
                Net: ${item.netPayout !== null ? `€${item.netPayout.toFixed(2)}` : "-"} (${item.benchmarkSource})
              </span>
            </div>



            <!-- Best Store Deal Column -->
            <div class="sourcing-stat-col">
              <span class="sourcing-stat-label" ${item.dealTitle ? `title="Supplier Match: ${item.dealTitle.replace(/"/g, '&quot;')}"` : ''}>
                <i class="fa-solid fa-store" style="color: var(--accent-cyan);"></i> Best Deal (${item.storeName || "Stores"})
              </span>
              <div class="sourcing-stat-value" ${item.dealTitle ? `title="Matched: ${item.dealTitle.replace(/"/g, '&quot;')}"` : ''}>
                <span>${item.dealPrice !== null ? `€${item.dealPrice.toFixed(2)}` : `<span style="color: var(--text-muted); font-size: 0.8rem;">No deal cached</span>`}</span>
                ${item.savings > 0 ? `<span class="badge badge-danger" style="font-size: 0.68rem; padding: 1px 5px;">-${item.savings}%</span>` : ""}
              </div>
              <span style="font-size: 0.7rem; color: var(--text-muted);" ${item.dealTitle ? `title="${item.dealTitle.replace(/"/g, '&quot;')}"` : ''}>
                ${item.normalPrice && item.normalPrice > item.dealPrice ? `Regular: €${item.normalPrice.toFixed(2)}` : "Official retailer deal"}
              </span>
            </div>

            <!-- GG.deals Keyshop Benchmark Column -->
            <div class="sourcing-stat-col">
              <span class="sourcing-stat-label" ${item.ggTitle ? `title="GG.deals Match: ${item.ggTitle.replace(/"/g, '&quot;')}"` : ''}>
                <i class="fa-solid fa-tags" style="color: #22c55e;"></i> GG.deals Keyshops
              </span>
              <div class="sourcing-stat-value" ${item.ggTitle ? `title="Matched: ${item.ggTitle.replace(/"/g, '&quot;')}"` : ''}>
                ${item.ggKeyshopPrice !== null ? `
                  <span style="color: #22c55e; font-weight: 700;">
                    ${item.ggCurrency === 'EUR' ? '€' : (item.ggCurrency === 'GBP' ? '£' : '$')}${item.ggKeyshopPrice.toFixed(2)}
                  </span>
                  ${item.ggHistoricalKeyshop && item.ggHistoricalKeyshop <= item.ggKeyshopPrice ? `
                    <span class="badge" style="background: rgba(34, 197, 94, 0.15); color: #22c55e; border: 1px solid rgba(34, 197, 94, 0.35); font-size: 0.65rem; padding: 1px 4px;" title="Historical Keyshop Low: ${item.ggCurrency === 'EUR' ? '€' : '$'}${item.ggHistoricalKeyshop.toFixed(2)}">
                      Low: ${item.ggHistoricalKeyshop.toFixed(2)}
                    </span>
                  ` : ''}
                ` : `<span style="color: var(--text-muted); font-size: 0.8rem;">${state.sourcingSettings?.ggdealsToken ? 'No keyshop data' : 'Not connected'}</span>`}
              </div>
              <span style="font-size: 0.7rem; color: var(--text-muted);" ${item.ggTitle ? `title="${item.ggTitle.replace(/"/g, '&quot;')}"` : ''}>
                ${item.ggRetailPrice ? `Retail: ${item.ggCurrency === 'EUR' ? '€' : '$'}${item.ggRetailPrice.toFixed(2)}` : 'Multi-keyshop low'}
              </span>
            </div>

            <!-- Net Profit & ROI Column -->
            <div class="sourcing-stat-col">
              <span class="sourcing-stat-label">
                <i class="fa-solid fa-calculator" style="color: var(--accent-emerald);"></i> Net Profit &amp; ROI
              </span>
              <div class="sourcing-stat-value">
                ${item.netProfit !== null ? `
                  <span style="color: ${item.netProfit > 0 ? 'var(--accent-emerald)' : 'var(--text-muted)'}; font-weight: 700;">
                    ${item.netProfit > 0 ? "+" : ""}€${item.netProfit.toFixed(2)}
                  </span>
                  ${roiBadge}
                ` : `<span style="color: var(--text-muted); font-size: 0.8rem;">-</span>`}
              </div>
              <span style="font-size: 0.7rem; color: var(--text-muted);">
                After ${feePct}% + €${fixedFee.toFixed(2)} Kinguin fee
              </span>
            </div>
          </div>
        </div>

        <!-- 1-Click Launchers Hub -->
        <div class="sourcing-actions-hub">
          ${item.dealId ? `
            <a href="https://www.cheapshark.com/redirect?dealID=${item.dealId}" target="_blank" rel="noopener noreferrer" class="btn-sourcing-launcher btn-sourcing-buy" title="Open ${item.storeName} deal in new tab">
              <i class="fa-solid fa-bolt"></i> Buy Deal
            </a>
          ` : ""}
          <a href="${item.ggUrl || `https://gg.deals/games/?type=1&title=${encodedTitle}`}" target="_blank" rel="noopener noreferrer" class="btn-sourcing-launcher" title="Check keyshops and stores on gg.deals (Base Games Only)">
            <span style="color: #22c55e; font-weight: 600;">gg.deals</span> <i class="fa-solid fa-arrow-up-right-from-square" style="font-size: 0.65rem;"></i>
          </a>
          <a href="https://www.allkeyshop.com/blog/?s=${encodeURIComponent(item.title + ' CD Key')}" target="_blank" rel="noopener noreferrer" class="btn-sourcing-launcher" title="Compare CD Keys on Allkeyshop">
            <span>Allkeyshop</span> <i class="fa-solid fa-arrow-up-right-from-square" style="font-size: 0.65rem;"></i>
          </a>
          <a href="https://www.kinguin.net/listing?active=1&hide_out_of_stock=1&phrase=${encodeURIComponent(item.title + ' CD Key')}" target="_blank" rel="noopener noreferrer" class="btn-sourcing-launcher" title="View active CD Key listings on Kinguin">
            <span style="color: #ff5000; font-weight: 700;">Kinguin</span> <i class="fa-solid fa-arrow-up-right-from-square" style="font-size: 0.65rem;"></i>
          </a>
          <a href="https://www.g2a.com/search?query=${encodeURIComponent(item.title + ' PC')}" target="_blank" rel="noopener noreferrer" class="btn-sourcing-launcher" title="View active listings on G2A">
            <span style="color: #0070d2; font-weight: 700;">G2A</span> <i class="fa-solid fa-arrow-up-right-from-square" style="font-size: 0.65rem;"></i>
          </a>
          <button type="button" class="btn btn-outline btn-xs" style="height: 28px; padding: 0 8px;" onclick="window.openAddGameModalWithTitle('${item.title.replace(/'/g, "\\'")}')" title="Log purchased keys into Inventory">
            <i class="fa-solid fa-plus text-emerald"></i>
          </button>
          <button type="button" class="btn btn-ghost btn-xs text-danger" style="height: 28px; padding: 0 6px;" onclick="window.removeFavoriteFromRadar('${item.title.replace(/'/g, "\\'")}')" title="Remove from Favorites Watchlist">
            <i class="fa-solid fa-star" style="color: #fbbf24;"></i>
          </button>
        </div>
      </div>
    `;
  }).join("");

  container.innerHTML = itemsHtml;
  window.updateSourcingBadge();
};

window.refreshSourcingDeals = async function() {
  const favorites = (state.favoriteGames || []).slice();
  if (favorites.length === 0) {
    if (typeof showToast === "function") showToast("No favorite games starred to refresh.", "warning");
    return;
  }

  const allStoreIds = Object.keys(CHEAPSHARK_STORES);
  const selectedStores = state.sourcingSettings?.selectedStores || [];
  const isNoneStores = selectedStores.includes("none");
  const isAllStores = !isNoneStores && (selectedStores.length === 0 || selectedStores.length === allStoreIds.length);

  if (isNoneStores) {
    if (typeof showToast === "function") showToast("No stores selected to scan. Please select at least one store from the Stores dropdown.", "warning");
    return;
  }

  const storeParam = (!isAllStores && selectedStores.length > 0)
    ? `&storeID=${selectedStores.join(',')}`
    : "";

  const refreshIcon = document.getElementById("sourcing-refresh-icon");
  const refreshBtn = document.getElementById("btn-refresh-sourcing-deals");
  if (refreshIcon) refreshIcon.classList.add("fa-spin");
  if (refreshBtn) refreshBtn.disabled = true;

  if (!state.sourcingSettings) state.sourcingSettings = {};
  if (!state.sourcingSettings.cachedDeals) state.sourcingSettings.cachedDeals = {};

  let updatedCount = 0;

  try {
    for (const title of favorites) {
      // Clean title for CheapShark search (strip suffixes like [Steam], (PC), etc.)
      const cleanTitle = title.replace(/\s*[\(\[].*?[\)\]]/g, "").trim();
      if (!cleanTitle) continue;

      try {
        // Query up to 20 candidate deals per favorite to ensure ample base game deals remain after filtering DLCs & accounts
        const url = `https://www.cheapshark.com/api/1.0/deals?title=${encodeURIComponent(cleanTitle)}${storeParam}&exact=0&pageSize=20`;
        const res = await fetch(url);
        if (res.ok) {
          const deals = await res.json();
          if (Array.isArray(deals) && deals.length > 0) {
            const excludeAccounts = state.sourcingSettings?.excludeAccounts !== false && state.sourcingSettings?.kinguinExcludeAccounts !== false;
            const excludeDlcs = state.sourcingSettings?.excludeDlcs !== false && state.sourcingSettings?.kinguinExcludeDlcs !== false;

            // Filter out DLCs, expansions, season passes, soundtracks, and game accounts
            const validDeals = [];
            for (const d of deals) {
              const sp = Number(d.salePrice);
              if (!(sp > 0)) continue;

              if (excludeAccounts && typeof window.isGameAccountListing === "function" && window.isGameAccountListing(d)) {
                continue;
              }

              if (excludeDlcs && typeof window.isGameDlcListing === "function" && window.isGameDlcListing(d, cleanTitle)) {
                continue;
              }

              const matchScore = typeof window.scoreGameProductMatch === "function"
                ? window.scoreGameProductMatch(d, cleanTitle)
                : 50;

              if (matchScore <= 0) continue;

              validDeals.push({
                deal: d,
                salePrice: sp,
                score: matchScore
              });
            }

            let bestDeal = null;
            if (validDeals.length > 0) {
              const highConf = validDeals.filter(v => v.score >= 40);
              const pool = highConf.length > 0 ? highConf : validDeals;
              pool.sort((a, b) => a.salePrice - b.salePrice);
              bestDeal = pool[0].deal;
            } else {
              // Fallback: If strict filtering rejected all candidates, never choose an account listing
              const fallback = deals.filter(d => Number(d.salePrice) > 0 && (!excludeAccounts || !window.isGameAccountListing?.(d)));
              if (fallback.length > 0) {
                fallback.sort((a, b) => Number(a.salePrice) - Number(b.salePrice));
                bestDeal = fallback[0];
              }
            }

            if (bestDeal) {
              state.sourcingSettings.cachedDeals[title] = {
                dealID: bestDeal.dealID,
                storeID: bestDeal.storeID,
                storeName: CHEAPSHARK_STORES[bestDeal.storeID] || "Partner Store",
                salePrice: Number(bestDeal.salePrice),
                normalPrice: Number(bestDeal.normalPrice),
                savings: Math.round(Number(bestDeal.savings || 0)),
                title: bestDeal.title,
                thumb: bestDeal.thumb,
                steamAppID: bestDeal.steamAppID || null,
                fetchedAt: Date.now()
              };
              updatedCount++;
            }
          }
        }
      } catch (err) {
        console.warn(`[Sourcing Radar] Deal fetch error for "${title}":`, err);
      }

      // If Kinguin API key is configured, also fetch live Kinguin competitor price
      const kinguinKey = state.sourcingSettings?.kinguinApiKey;
      if (kinguinKey && typeof window.fetchKinguinLiveProduct === "function") {
        try {
          const liveKinguin = await window.fetchKinguinLiveProduct(cleanTitle, kinguinKey);
          if (liveKinguin && liveKinguin.price > 0) {
            if (!state.sourcingSettings.liveKinguinPrices) state.sourcingSettings.liveKinguinPrices = {};
            state.sourcingSettings.liveKinguinPrices[title] = liveKinguin;
          }
        } catch (kErr) {
          console.warn(`[Kinguin API] Live lookup failed for "${title}":`, kErr);
        }
      }

      // Gentle throttle to avoid rate-limiting
      await new Promise(r => setTimeout(r, 120));
    }

    // If GG.deals token is configured, batch query live GG.deals prices
    const ggToken = state.sourcingSettings?.ggdealsToken;
    if (ggToken && typeof window.fetchGGDealsLivePrices === "function") {
      const steamAppIds = [];
      favorites.forEach(t => {
        let appId = state.sourcingSettings.cachedDeals?.[t]?.steamAppID;
        if (!appId) {
          const rev = state.catalogReviews?.[t] || state.catalogReviews?.[t.toLowerCase()];
          if (rev && rev.steamAppID && rev.steamAppID !== "0") {
            appId = rev.steamAppID;
          } else {
            const art = state.catalogArtwork?.[t] || state.catalogArtwork?.[t.toLowerCase()];
            if (art && typeof window.extractSteamAppId === "function") {
              appId = window.extractSteamAppId(art);
            }
          }
        }
        if (appId && /^\d+$/.test(String(appId).trim())) {
          steamAppIds.push(String(appId).trim());
        }
      });
      if (steamAppIds.length > 0) {
        try {
          await window.fetchGGDealsLivePrices(steamAppIds);
        } catch (gErr) {
          console.warn("[GG.deals API] Batch fetch failed:", gErr);
        }
      }
    }

    state.sourcingSettings.lastChecked = new Date().toISOString();
    if (typeof saveSecondaryTablesToStorage === "function") {
      saveSecondaryTablesToStorage();
    }
    if (window.supabaseClient && typeof dbSaveSettings === "function") {
      dbSaveSettings("sourcingSettings", state.sourcingSettings);
    }

    // Evaluate profitable arbitrage opportunities for Topbar Action Center Alerts
    const profitableDeals = [];
    const feePct = Number(state.sourcingSettings?.kinguinFeePct ?? 11);
    const fixedFee = Number(state.sourcingSettings?.kinguinFixedFee ?? 0.10);
    const cachedDeals = state.sourcingSettings?.cachedDeals || {};

    const salesByTitle = {};
    (state.sales || []).forEach(s => {
      if (!s.title) return;
      const t = s.title.trim().toLowerCase();
      if (!salesByTitle[t]) salesByTitle[t] = [];
      salesByTitle[t].push(s);
    });

    const invByTitle = {};
    (state.inventory || []).forEach(item => {
      if (!item.title) return;
      const t = item.title.trim().toLowerCase();
      if (!invByTitle[t]) invByTitle[t] = [];
      invByTitle[t].push(item);
    });

    favorites.forEach(title => {
      const deal = cachedDeals[title];
      if (!deal || !deal.salePrice || Number(deal.salePrice) <= 0) return;

      const key = title.trim().toLowerCase();
      let benchmarkPrice = null;

      const manual = state.sourcingSettings?.manualBenchmarks?.[title];
      const liveKinguin = state.sourcingSettings?.liveKinguinPrices?.[title];

      if (manual !== undefined && manual !== null && manual !== "" && !isNaN(Number(manual)) && Number(manual) > 0) {
        benchmarkPrice = Number(manual);
      } else if (liveKinguin && Number(liveKinguin.price) > 0) {
        benchmarkPrice = Number(liveKinguin.price);
      } else {
        const titleSales = salesByTitle[key] || [];
        const kinguinSales = titleSales.filter(s => s.platform && s.platform.trim().toLowerCase() === "kinguin" && Number(s.price) > 0);
        if (kinguinSales.length > 0) {
          benchmarkPrice = Number(kinguinSales[kinguinSales.length - 1].price);
        } else if (titleSales.length > 0) {
          benchmarkPrice = Number(titleSales[titleSales.length - 1].price);
        } else {
          const invItems = invByTitle[key] || [];
          const costItems = invItems.filter(i => Number(i.cost) > 0);
          if (costItems.length > 0) {
            const avgCost = costItems.reduce((acc, curr) => acc + Number(curr.cost), 0) / costItems.length;
            benchmarkPrice = Math.round(avgCost * 1.35 * 100) / 100;
          }
        }
      }

      if (benchmarkPrice !== null && benchmarkPrice > 0) {
        const netPayout = Math.max(0, (benchmarkPrice * (1 - feePct / 100)) - fixedFee);
        const salePrice = Number(deal.salePrice);
        const netProfit = netPayout - salePrice;
        const roiPct = (netProfit / salePrice) * 100;

        if (netProfit > 0) {
          profitableDeals.push({
            title: title,
            storeName: deal.storeName || CHEAPSHARK_STORES[deal.storeID] || "Partner Store",
            salePrice: salePrice,
            benchmarkPrice: benchmarkPrice,
            netPayout: netPayout,
            netProfit: netProfit,
            roiPct: roiPct
          });
        }
      }
    });

    // Check if Topbar alerts are enabled (defaults to true)
    const topbarAlertsEnabled = state.sourcingSettings?.topbarAlerts !== false;
    if (topbarAlertsEnabled && typeof logActionNotification === "function") {
      if (profitableDeals.length > 0) {
        // Sort opportunities by highest ROI %
        profitableDeals.sort((a, b) => b.roiPct - a.roiPct);
        const top = profitableDeals[0];
        const othersCount = profitableDeals.length - 1;
        const othersText = othersCount > 0 ? ` (+${othersCount} more)` : "";

        logActionNotification({
          title: `⚡ Arbitrage Alert (${profitableDeals.length} Profitable)`,
          text: `Top: "${top.title}" at ${top.storeName} for €${top.salePrice.toFixed(2)} → Kinguin €${top.benchmarkPrice.toFixed(2)} (+${Math.round(top.roiPct)}% ROI, +€${top.netProfit.toFixed(2)} profit)${othersText}`,
          icon: "⚡",
          category: "radar",
          action: "open_radar"
        });

        if (typeof showToast === "function") {
          showToast(`⚡ Found ${profitableDeals.length} profitable Kinguin deal${profitableDeals.length === 1 ? '' : 's'}! Alert logged to Notification Bell.`, "success");
        }
      } else if (updatedCount > 0) {
        logActionNotification({
          title: "Sourcing Radar Check",
          text: `Scanned ${updatedCount} favorite game${updatedCount === 1 ? '' : 's'}. All current store prices are near or above Kinguin benchmark.`,
          icon: "🔍",
          category: "radar",
          action: "open_radar"
        });
        if (typeof showToast === "function") {
          showToast(`Updated deals for ${updatedCount} favorite game${updatedCount === 1 ? '' : 's'}.`, "info");
        }
      } else {
        if (typeof showToast === "function") {
          showToast(`No live deals found for your starred games.`, "info");
        }
      }
    } else {
      if (typeof showToast === "function") {
        showToast(`Updated deals for ${updatedCount} favorite game${updatedCount === 1 ? '' : 's'}.`, "success");
      }
    }
  } catch (ex) {
    console.error("[Sourcing Radar] Refresh failed:", ex);
    if (typeof showToast === "function") showToast("Failed to refresh some deals.", "warning");
  } finally {
    if (refreshIcon) refreshIcon.classList.remove("fa-spin");
    if (refreshBtn) refreshBtn.disabled = false;
    window.renderSourcingRadarView();
    window.updateSourcingBadge();
  }
};

window.setSourcingManualBenchmark = function(title) {
  if (!state.sourcingSettings) state.sourcingSettings = {};
  if (!state.sourcingSettings.manualBenchmarks) state.sourcingSettings.manualBenchmarks = {};

  const current = state.sourcingSettings.manualBenchmarks[title] || "";
  const input = prompt(`Enter your target Kinguin selling price in € for:\n"${title}"\n(Leave empty to reset to automated historical price):`, current);
  if (input === null) return; // user cancelled

  const trimmed = input.trim();
  if (trimmed === "") {
    delete state.sourcingSettings.manualBenchmarks[title];
    if (typeof showToast === "function") showToast(`Reset benchmark for "${title}" to automated.`, "info");
  } else {
    const val = parseFloat(trimmed.replace(",", "."));
    if (isNaN(val) || val <= 0) {
      if (typeof showToast === "function") showToast("Please enter a valid positive euro price (e.g. 14.50).", "warning");
      return;
    }
    state.sourcingSettings.manualBenchmarks[title] = val;
    if (typeof showToast === "function") showToast(`Benchmark for "${title}" set to €${val.toFixed(2)}.`, "success");
  }

  if (typeof saveSecondaryTablesToStorage === "function") {
    saveSecondaryTablesToStorage();
  }
  if (window.supabaseClient && typeof dbSaveSettings === "function") {
    dbSaveSettings("sourcingSettings", state.sourcingSettings);
  }

  window.renderSourcingRadarView();
};

window.removeFavoriteFromRadar = function(title) {
  if (typeof window.toggleFavoriteGame === "function") {
    window.toggleFavoriteGame(title);
  }
  window.renderSourcingRadarView();
};
