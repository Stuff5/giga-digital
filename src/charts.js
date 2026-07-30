/**
 * GameVault - Dashboard Widgets & Chart.js Config (charts.js)
 */

function renderRoiMatrixChart(activeSuppliers) {
  if (supplierRoiMatrixChartInstance) {
    try {
      supplierRoiMatrixChartInstance.destroy();
    } catch (e) {
      console.error("Error destroying supplierRoiMatrixChartInstance:", e);
    }
    supplierRoiMatrixChartInstance = null;
  }

  const canvas = document.getElementById("supplier-roi-matrix-chart");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");

  // Retrieve theme CSS variables
  const rootStyle = getComputedStyle(document.documentElement);
  const textSecondaryColor = rootStyle.getPropertyValue("--text-secondary").trim() || "hsl(215, 15%, 60%)";
  const borderColor = rootStyle.getPropertyValue("--border-color").trim() || "hsl(215, 15%, 15%)";

  // Prepare scatter datasets
  const scatterData = activeSuppliers.map(sup => {
    return {
      x: parseFloat(sup.sellThrough.toFixed(1)),
      y: parseFloat(sup.roi.toFixed(1)),
      label: sup.name,
      color: (SUPPLIER_COLORS.find(c => c.name === sup.color) || SUPPLIER_COLORS[0]).value
    };
  });

  supplierRoiMatrixChartInstance = new Chart(ctx, {
    type: 'scatter',
    data: {
      datasets: [{
        label: 'Suppliers',
        data: scatterData,
        backgroundColor: scatterData.map(d => d.color),
        borderColor: scatterData.map(d => d.color),
        pointRadius: 8,
        pointHoverRadius: 10
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          min: 0,
          max: 100,
          grid: { color: borderColor },
          ticks: { color: textSecondaryColor, font: { family: 'Inter', size: 10 } },
          title: {
            display: true,
            text: 'Sell-Through Rate (%)',
            color: textSecondaryColor,
            font: { family: 'Inter', size: 10, weight: 'bold' }
          }
        },
        y: {
          min: 0,
          grid: { color: borderColor },
          ticks: { color: textSecondaryColor, font: { family: 'Inter', size: 10 } },
          title: {
            display: true,
            text: 'Return on Investment (ROI %)',
            color: textSecondaryColor,
            font: { family: 'Inter', size: 10, weight: 'bold' }
          }
        }
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: function(context) {
              const pt = context.raw;
              return `${pt.label}: STR = ${pt.x}%, ROI = ${pt.y}%`;
            }
          }
        }
      }
    }
  });
}

// Initialize color swatches in Add and Edit Supplier forms
function getAgingCategory(purchaseDate) {
  if (!purchaseDate) {
    return { name: "Fresh", class: "badge-age-fresh", days: 0 };
  }
  const start = new Date(purchaseDate);
  const end = new Date();
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  const diffTime = Math.max(0, end - start);
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays < 30) {
    return { name: "Fresh", class: "badge-age-fresh", days: diffDays };
  } else if (diffDays <= 60) {
    return { name: "Aging", class: "badge-age-aging", days: diffDays };
  } else if (diffDays <= 90) {
    return { name: "Stale", class: "badge-age-stale", days: diffDays };
  } else {
    return { name: "Very Stale", class: "badge-age-verystale", days: diffDays };
  }
}

// Render dashboard secondary panels
function renderSalesTrendChart(filteredSalesList) {
  if (typeof Chart === 'undefined') {
    console.warn("Chart.js is not loaded. Skipping sales trend chart rendering.");
    return;
  }
  const canvas = document.getElementById("salesProfitChart");
  if (!canvas) {
    console.warn("salesProfitChart canvas not found. Skipping chart rendering.");
    return;
  }
  const ctx = canvas.getContext("2d");

  // Destroy previous instance to avoid hover flickering errors
  if (salesProfitChartInstance) {
    try {
      salesProfitChartInstance.destroy();
    } catch (e) {
      console.error("Error destroying salesProfitChartInstance:", e);
    }
  }

  const wSales = getWidgetFilteredSales("salesProfit", filteredSalesList);

  // Group sales by Date
  const salesByDate = {};
  wSales.forEach(sale => {
    const dateStr = sale.saleDate;
    if (!salesByDate[dateStr]) {
      salesByDate[dateStr] = { revenue: 0, profit: 0 };
    }
    salesByDate[dateStr].revenue += sale.sellPrice;
    salesByDate[dateStr].profit += sale.profit;
  });

  // Sort dates chronological
  const sortedDates = Object.keys(salesByDate).sort((a, b) => new Date(a) - new Date(b));
  
  // Format labels & values
  const labels = sortedDates.map(d => {
    const opt = { month: 'short', day: 'numeric' };
    return new Date(d).toLocaleDateString('en-US', opt);
  });
  const revenueData = sortedDates.map(d => salesByDate[d].revenue);
  const profitData = sortedDates.map(d => salesByDate[d].profit);

  // If empty, fill with placeholder visuals
  if (sortedDates.length === 0) {
    labels.push("No Sales Data");
    revenueData.push(0);
    profitData.push(0);
  }

  const rootStyle = getComputedStyle(document.documentElement);
  const textSecondaryColor = rootStyle.getPropertyValue('--text-secondary').trim() || 'hsl(220, 12%, 65%)';
  const borderColor = rootStyle.getPropertyValue('--border-color').trim() || 'hsla(224, 20%, 25%, 0.15)';
  const tooltipBg = rootStyle.getPropertyValue('--bg-sidebar').trim() || 'hsl(224, 25%, 10%)';

  const accentPink = rootStyle.getPropertyValue('--accent-pink').trim() || 'hsl(330, 95%, 60%)';
  const accentPinkGlow = rootStyle.getPropertyValue('--accent-pink-glow').trim() || 'hsla(330, 95%, 60%, 0.1)';
  const accentTeal = rootStyle.getPropertyValue('--accent-teal').trim() || 'hsl(175, 90%, 48%)';
  const accentTealGlow = rootStyle.getPropertyValue('--accent-teal-glow').trim() || 'hsla(175, 90%, 48%, 0.1)';

  const wType = (state.widgetSettings && state.widgetSettings.salesProfit && state.widgetSettings.salesProfit.chartType) || 'line';
  salesProfitChartInstance = new Chart(ctx, {
    type: wType,
    data: {
      labels: labels,
      datasets: [
        {
          label: `Total Revenue (${state.currency === 'USD' ? '$' : '€'})`,
          data: revenueData,
          borderColor: accentPink,
          backgroundColor: accentPinkGlow,
          borderWidth: 3,
          fill: true,
          tension: 0.35,
          pointBackgroundColor: accentPink,
          pointHoverRadius: 6
        },
        {
          label: `Net Profit (${state.currency === 'USD' ? '$' : '€'})`,
          data: profitData,
          borderColor: accentTeal,
          backgroundColor: accentTealGlow,
          borderWidth: 3,
          fill: true,
          tension: 0.35,
          pointBackgroundColor: accentTeal,
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
          ticks: { 
            color: textSecondaryColor,
            autoSkip: true,
            maxTicksLimit: 8
          }
        },
        y: {
          grid: { color: borderColor },
          ticks: { color: textSecondaryColor }
        }
      }
    }
  });
}

function renderDailyProfitMonthChart(filteredSalesList) {
  if (typeof Chart === 'undefined') {
    console.warn("Chart.js is not loaded. Skipping daily profit month chart rendering.");
    return;
  }
  const canvas = document.getElementById("dailyProfitMonthChart");
  if (!canvas) {
    console.warn("dailyProfitMonthChart canvas not found. Skipping chart rendering.");
    return;
  }
  const ctx = canvas.getContext("2d");

  // Destroy previous instance to avoid hover flickering errors
  if (dailyProfitMonthChartInstance) {
    try {
      dailyProfitMonthChartInstance.destroy();
    } catch (e) {
      console.error("Error destroying dailyProfitMonthChartInstance:", e);
    }
  }

  const wSales = getWidgetFilteredSales("dailyProfitMonth", filteredSalesList);

  // Determine current/active month and year
  let year = new Date().getFullYear();
  let month = new Date().getMonth(); // 0-indexed

  if (wSales.length > 0) {
    // Find the month of the most recent sale in the list
    let mostRecentDate = new Date(0);
    wSales.forEach(s => {
      if (s.saleDate) {
        const d = new Date(s.saleDate);
        if (d > mostRecentDate) mostRecentDate = d;
      }
    });
    if (mostRecentDate.getTime() > 0) {
      year = mostRecentDate.getFullYear();
      month = mostRecentDate.getMonth();
    }
  }

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const monthName = months[month];

  // Update card title
  const titleEl = document.querySelector("#card-chart-dailyProfitMonth h4");
  if (titleEl) {
    titleEl.textContent = `Daily Profit — ${monthName} ${year}`;
  }

  // Calculate days in the month
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const labels = [];
  const dailyProfitMap = {};
  for (let i = 1; i <= daysInMonth; i++) {
    labels.push(`${i}`);
    dailyProfitMap[i] = 0;
  }

  // Aggregate profits timezone-safely using string splitting
  wSales.forEach(sale => {
    if (!sale.saleDate) return;
    const parts = sale.saleDate.split("-");
    if (parts.length === 3) {
      const sYear = parseInt(parts[0], 10);
      const sMonth = parseInt(parts[1], 10) - 1; // Convert 1-12 to 0-11
      const sDay = parseInt(parts[2], 10);
      
      if (sYear === year && sMonth === month) {
        dailyProfitMap[sDay] += sale.profit;
      }
    }
  });

  const profitData = [];
  for (let i = 1; i <= daysInMonth; i++) {
    profitData.push(dailyProfitMap[i]);
  }

  const rootStyle = getComputedStyle(document.documentElement);
  const textSecondaryColor = rootStyle.getPropertyValue('--text-secondary').trim() || 'hsl(220, 12%, 65%)';
  const borderColor = rootStyle.getPropertyValue('--border-color').trim() || 'hsla(224, 20%, 25%, 0.15)';
  const tooltipBg = rootStyle.getPropertyValue('--bg-sidebar').trim() || 'hsl(224, 25%, 10%)';

  const accentTeal = rootStyle.getPropertyValue('--accent-teal').trim() || 'hsl(175, 90%, 48%)';
  const accentTealGlow = rootStyle.getPropertyValue('--accent-teal-glow').trim() || 'hsla(175, 90%, 48%, 0.2)';

  const wType = (state.widgetSettings && state.widgetSettings.dailyProfitMonth && state.widgetSettings.dailyProfitMonth.chartType) || 'bar';
  dailyProfitMonthChartInstance = new Chart(ctx, {
    type: wType,
    data: {
      labels: labels,
      datasets: [
        {
          label: `Daily Profit (${state.currency === 'USD' ? '$' : '€'})`,
          data: profitData,
          backgroundColor: accentTealGlow,
          borderColor: accentTeal,
          borderWidth: 1.5,
          borderRadius: 4,
          hoverBackgroundColor: accentTeal
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          backgroundColor: tooltipBg,
          titleColor: state.theme !== "light" ? "#fff" : "#000",
          bodyColor: state.theme !== "light" ? "#fff" : "#000",
          borderColor: borderColor,
          borderWidth: 1,
          callbacks: {
            title: function(context) {
              return `${monthName} ${context[0].label}, ${year}`;
            }
          }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { 
            color: textSecondaryColor,
            autoSkip: true,
            maxTicksLimit: 8
          }
        },
        y: {
          grid: { color: borderColor },
          ticks: { color: textSecondaryColor }
        }
      }
    }
  });
}

function renderPlatformSplitChart(filteredSalesList) {
  if (typeof Chart === 'undefined') {
    console.warn("Chart.js is not loaded. Skipping platform split chart rendering.");
    return;
  }
  const canvas = document.getElementById("platformSplitChart");
  if (!canvas) {
    console.warn("platformSplitChart canvas not found. Skipping chart rendering.");
    return;
  }
  const ctx = canvas.getContext("2d");

  if (platformSplitChartInstance) {
    try {
      platformSplitChartInstance.destroy();
    } catch (e) {
      console.error("Error destroying platformSplitChartInstance:", e);
    }
  }

  const wSales = getWidgetFilteredSales("platformSplit", filteredSalesList);

  // Count sales per selling platform
  const platformCounts = {};
  wSales.forEach(sale => {
    const platform = sale.platformSold;
    platformCounts[platform] = (platformCounts[platform] || 0) + 1;
  });

  const labels = Object.keys(platformCounts);
  const data = Object.values(platformCounts);

  // If empty, fill default
  if (labels.length === 0) {
    labels.push("No Sales");
    data.push(1);
  }

  const rootStyle = getComputedStyle(document.documentElement);
  const textSecondaryColor = rootStyle.getPropertyValue('--text-secondary').trim() || 'hsl(220, 12%, 65%)';
  const bgCardColor = rootStyle.getPropertyValue('--bg-card').trim() || 'hsl(224, 22%, 12%)';
  const borderColor = rootStyle.getPropertyValue('--border-color').trim() || 'hsla(224, 20%, 30%, 0.5)';
  const tooltipBg = rootStyle.getPropertyValue('--bg-sidebar').trim() || 'hsl(224, 25%, 10%)';

  const accentPurple = rootStyle.getPropertyValue('--accent-purple').trim() || 'hsl(270, 85%, 60%)';
  const accentCyan = rootStyle.getPropertyValue('--accent-cyan').trim() || 'hsl(195, 90%, 50%)';
  const accentPink = rootStyle.getPropertyValue('--accent-pink').trim() || 'hsl(330, 95%, 60%)';
  const accentTeal = rootStyle.getPropertyValue('--accent-teal').trim() || 'hsl(175, 90%, 48%)';
  const accentWarning = rootStyle.getPropertyValue('--accent-warning').trim() || 'hsl(40, 95%, 55%)';
  const accentDanger = rootStyle.getPropertyValue('--accent-danger').trim() || 'hsl(355, 85%, 55%)';

  const backgroundColors = [
    accentPurple,
    accentCyan,
    accentPink,
    accentTeal,
    accentWarning,
    accentDanger
  ];

  const wType = (state.widgetSettings && state.widgetSettings.platformSplit && state.widgetSettings.platformSplit.chartType) || 'doughnut';

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          color: textSecondaryColor,
          font: { family: 'Inter', size: 10 },
          boxWidth: 12
        }
      },
      tooltip: {
        backgroundColor: tooltipBg,
        titleColor: state.theme !== "light" ? "#fff" : "#000",
        bodyColor: state.theme !== "light" ? "#fff" : "#000",
        borderColor: borderColor,
        borderWidth: 1
      }
    }
  };

  if (wType === 'bar') {
    options.scales = {
      x: { grid: { display: false }, ticks: { color: textSecondaryColor } },
      y: { grid: { color: borderColor }, ticks: { color: textSecondaryColor, beginAtZero: true } }
    };
  }

  platformSplitChartInstance = new Chart(ctx, {
    type: wType,
    data: {
      labels: labels,
      datasets: [{
        data: data,
        backgroundColor: backgroundColors.slice(0, labels.length),
        borderWidth: 2,
        borderColor: bgCardColor,
        hoverOffset: 4
      }]
    },
    options: options
  });
}

// Render Cost vs Revenue chart
function renderCostRevenueChart(filteredSalesList) {
  if (typeof Chart === 'undefined') {
    console.warn("Chart.js is not loaded. Skipping cost vs revenue chart rendering.");
    return;
  }
  const canvas = document.getElementById("costRevenueChart");
  if (!canvas) {
    console.warn("costRevenueChart canvas not found. Skipping chart rendering.");
    return;
  }
  const ctx = canvas.getContext("2d");

  if (costRevenueChartInstance) {
    try {
      costRevenueChartInstance.destroy();
    } catch (e) {
      console.error("Error destroying costRevenueChartInstance:", e);
    }
  }

  const wSales = getWidgetFilteredSales("costRevenue", filteredSalesList);

  // Group sales by Date
  const salesByDate = {};
  wSales.forEach(sale => {
    const dateStr = sale.saleDate;
    if (!salesByDate[dateStr]) {
      salesByDate[dateStr] = { revenue: 0, cost: 0 };
    }
    salesByDate[dateStr].revenue += sale.sellPrice;
    salesByDate[dateStr].cost += sale.cost;
  });

  const sortedDates = Object.keys(salesByDate).sort((a, b) => new Date(a) - new Date(b));
  
  const labels = sortedDates.map(d => {
    const opt = { month: 'short', day: 'numeric' };
    return new Date(d).toLocaleDateString('en-US', opt);
  });
  const revenueData = sortedDates.map(d => salesByDate[d].revenue);
  const costData = sortedDates.map(d => salesByDate[d].cost);

  if (sortedDates.length === 0) {
    labels.push("No Sales Data");
    revenueData.push(0);
    costData.push(0);
  }

  const rootStyle = getComputedStyle(document.documentElement);
  const textSecondaryColor = rootStyle.getPropertyValue('--text-secondary').trim() || 'hsl(220, 12%, 65%)';
  const borderColor = rootStyle.getPropertyValue('--border-color').trim() || 'hsla(224, 20%, 25%, 0.15)';
  const tooltipBg = rootStyle.getPropertyValue('--bg-sidebar').trim() || 'hsl(224, 25%, 10%)';

  const accentPink = rootStyle.getPropertyValue('--accent-pink').trim() || 'hsl(330, 95%, 60%)';
  const accentCyan = rootStyle.getPropertyValue('--accent-cyan').trim() || 'hsl(195, 90%, 50%)';

  const wType = (state.widgetSettings && state.widgetSettings.costRevenue && state.widgetSettings.costRevenue.chartType) || 'bar';
  costRevenueChartInstance = new Chart(ctx, {
    type: wType,
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Acquisition Cost',
          data: costData,
          backgroundColor: accentCyan,
          borderRadius: 4
        },
        {
          label: 'Revenue',
          data: revenueData,
          backgroundColor: accentPink,
          borderRadius: 4
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          grid: { display: false },
          ticks: { 
            color: textSecondaryColor, 
            font: { family: 'Inter', size: 10 },
            autoSkip: true,
            maxTicksLimit: 8
          }
        },
        y: {
          grid: { color: borderColor },
          ticks: { color: textSecondaryColor, font: { family: 'Inter', size: 10 } }
        }
      },
      plugins: {
        legend: {
          position: 'bottom',
          labels: { color: textSecondaryColor, font: { family: 'Inter', size: 10 }, boxWidth: 12 }
        },
        tooltip: {
          backgroundColor: tooltipBg,
          titleColor: state.themeMode !== "light" ? "#fff" : "#000",
          bodyColor: state.themeMode !== "light" ? "#fff" : "#000",
          borderColor: borderColor,
          borderWidth: 1
        }
      }
    }
  });
}

// Render Supplier stock distribution chart
function renderSupplierSplitChart(filteredInventoryList) {
  if (typeof Chart === 'undefined') {
    console.warn("Chart.js is not loaded. Skipping supplier split chart rendering.");
    return;
  }
  const canvas = document.getElementById("supplierSplitChart");
  if (!canvas) {
    console.warn("supplierSplitChart canvas not found. Skipping chart rendering.");
    return;
  }
  const ctx = canvas.getContext("2d");

  if (supplierSplitChartInstance) {
    try {
      supplierSplitChartInstance.destroy();
    } catch (e) {
      console.error("Error destroying supplierSplitChartInstance:", e);
    }
  }

  const wInventory = getWidgetFilteredInventory("supplierSplit", filteredInventoryList);

  // Count unsold stock per supplier
  const supplierCounts = {};
  wInventory.forEach(item => {
    if (item.status !== "Sold") {
      const supplier = item.source || "Unknown";
      supplierCounts[supplier] = (supplierCounts[supplier] || 0) + 1;
    }
  });

  const labels = Object.keys(supplierCounts);
  const data = Object.values(supplierCounts);

  if (labels.length === 0) {
    labels.push("No Available Stock");
    data.push(1);
  }

  const rootStyle = getComputedStyle(document.documentElement);
  const textSecondaryColor = rootStyle.getPropertyValue('--text-secondary').trim() || 'hsl(220, 12%, 65%)';
  const bgCardColor = rootStyle.getPropertyValue('--bg-card').trim() || 'hsl(224, 22%, 12%)';
  const borderColor = rootStyle.getPropertyValue('--border-color').trim() || 'hsla(224, 20%, 30%, 0.5)';
  const tooltipBg = rootStyle.getPropertyValue('--bg-sidebar').trim() || 'hsl(224, 25%, 10%)';

  const accentPurple = rootStyle.getPropertyValue('--accent-purple').trim() || 'hsl(270, 85%, 60%)';
  const accentCyan = rootStyle.getPropertyValue('--accent-cyan').trim() || 'hsl(195, 90%, 50%)';
  const accentTeal = rootStyle.getPropertyValue('--accent-teal').trim() || 'hsl(175, 90%, 48%)';
  const accentWarning = rootStyle.getPropertyValue('--accent-warning').trim() || 'hsl(40, 95%, 55%)';
  const accentPink = rootStyle.getPropertyValue('--accent-pink').trim() || 'hsl(330, 95%, 60%)';
  const accentDanger = rootStyle.getPropertyValue('--accent-danger').trim() || 'hsl(355, 85%, 55%)';

  const backgroundColors = [
    accentPurple,
    accentCyan,
    accentTeal,
    accentWarning,
    accentPink,
    accentDanger
  ];

  const wType = (state.widgetSettings && state.widgetSettings.supplierSplit && state.widgetSettings.supplierSplit.chartType) || 'doughnut';

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          color: textSecondaryColor,
          font: { family: 'Inter', size: 10 },
          boxWidth: 12
        }
      },
      tooltip: {
        backgroundColor: tooltipBg,
        titleColor: state.themeMode !== "light" ? "#fff" : "#000",
        bodyColor: state.themeMode !== "light" ? "#fff" : "#000",
        borderColor: borderColor,
        borderWidth: 1
      }
    }
  };

  if (wType === 'bar') {
    options.scales = {
      x: { grid: { display: false }, ticks: { color: textSecondaryColor } },
      y: { grid: { color: borderColor }, ticks: { color: textSecondaryColor, beginAtZero: true } }
    };
  }

  supplierSplitChartInstance = new Chart(ctx, {
    type: wType,
    data: {
      labels: labels,
      datasets: [{
        data: data,
        backgroundColor: backgroundColors.slice(0, labels.length),
        borderWidth: 2,
        borderColor: bgCardColor,
        hoverOffset: 4
      }]
    },
    options: options
  });
}

// Render top bestselling games horizontal bar chart
function renderTopBestsellersChart(widgetKey, listId, titleId, filteredSalesList) {
  const container = document.getElementById(listId);
  if (!container) {
    console.warn(`${listId} container not found. Skipping list rendering.`);
    return;
  }

  // Get current configurations
  const cfg = state.widgetSettings ? state.widgetSettings[widgetKey] : null;
  const metric = widgetKey === "topBestsellersRevenue" ? "revenue" : (widgetKey === "topBestsellersSales" ? "sales" : "profit");
  const limit = cfg ? cfg.limit : 5;

  const wSales = getWidgetFilteredSales(widgetKey, filteredSalesList);

  // Build lookup maps for images from inventory
  const imgUrlByTitle = {};
  const imgUrlById = {};
  if (state.inventory && Array.isArray(state.inventory)) {
    state.inventory.forEach(item => {
      if (item.imageUrl) {
        if (item.id) imgUrlById[item.id] = item.imageUrl;
        if (item.title) imgUrlByTitle[item.title.trim().toLowerCase()] = item.imageUrl;
      }
    });
  }

  // Calculate metrics per game title
  const gameMetrics = {};
  wSales.forEach(sale => {
    const title = sale.title || "Unknown Game";
    if (!gameMetrics[title]) {
      gameMetrics[title] = { profit: 0, revenue: 0, sales: 0, imageUrl: null };
    }
    gameMetrics[title].profit += sale.profit || 0;
    gameMetrics[title].revenue += sale.sellPrice || 0;
    gameMetrics[title].sales += 1;

    // Assign imageUrl if not already set
    if (!gameMetrics[title].imageUrl) {
      if (sale.inventoryId && imgUrlById[sale.inventoryId]) {
        gameMetrics[title].imageUrl = imgUrlById[sale.inventoryId];
      } else if (imgUrlByTitle[title.trim().toLowerCase()]) {
        gameMetrics[title].imageUrl = imgUrlByTitle[title.trim().toLowerCase()];
      }
    }
  });

  // Convert to array
  const gamesArray = Object.keys(gameMetrics).map(title => {
    const metrics = gameMetrics[title];
    let val = metrics.profit;
    if (metric === 'revenue') val = metrics.revenue;
    else if (metric === 'sales') val = metrics.sales;

    return {
      title: title,
      value: val,
      salesCount: metrics.sales,
      avgProfit: metrics.sales > 0 ? (metrics.profit / metrics.sales) : 0,
      avgMargin: metrics.revenue > 0 ? ((metrics.profit / metrics.revenue) * 100) : 0,
      imageUrl: metrics.imageUrl
    };
  });

  // Sort descending
  gamesArray.sort((a, b) => b.value - a.value);

  // Apply limit
  const sortedGames = gamesArray.slice(0, limit);

  // Update card header title dynamically
  const cardTitle = document.getElementById(titleId);
  if (cardTitle) {
    const metricLabel = metric === 'profit' ? 'Net Profit' : (metric === 'revenue' ? 'Revenue' : 'Sales Volume');
    cardTitle.textContent = `Top ${limit} Bestselling Games by ${metricLabel}`;
  }

  if (sortedGames.length === 0) {
    container.innerHTML = `<div class="text-muted text-center" style="padding: 24px;">No sales recorded for the selected filters.</div>`;
    return;
  }

  const maxVal = sortedGames[0].value || 1; // Prevent division by zero

  // Color the progress bars based on the metric
  let barColor = 'var(--accent-purple)';
  const currSym = state.currency === 'USD' ? '$' : '€';
  let valueFormatter = (val) => `${currSym}${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  if (metric === 'revenue') {
    barColor = 'var(--accent-cyan)';
  } else if (metric === 'sales') {
    barColor = 'var(--accent-emerald)';
    valueFormatter = (val) => `${val} unit${val === 1 ? '' : 's'}`;
  }



  let html = '';
  sortedGames.forEach((game, index) => {
    const rank = index + 1;
    let rankClass = '';
    if (rank === 1) rankClass = 'rank-1';
    else if (rank === 2) rankClass = 'rank-2';
    else if (rank === 3) rankClass = 'rank-3';

    // Calculate percentage relative to the best game
    const pct = Math.max(2, Math.round((game.value / maxVal) * 100));

    // Generate initials for placeholder
    const initials = game.title.split(" ").map(w => w[0]).join("").slice(0, 3).toUpperCase();
    const imageHTML = game.imageUrl 
      ? `<img src="${game.imageUrl}" class="game-thumbnail" alt="${game.title}" style="width: 64px; height: 64px; min-width: 64px; border-radius: var(--radius-sm); object-fit: cover; border: 1px solid var(--border-color); background-color: var(--bg-input);">`
      : `<div class="game-thumbnail-placeholder" style="width: 64px; height: 64px; min-width: 64px; border-radius: var(--radius-sm); font-size: 1.25rem; background: linear-gradient(135deg, var(--accent-purple), var(--accent-cyan)); display: flex; align-items: center; justify-content: center; font-weight: 700; color: #fff;">${initials}</div>`;

    html += `
      <div class="bestseller-item">
        <!-- Left Side: Rank, Logo/Placeholder, and Title -->
        <div style="display: flex; align-items: center; gap: 12px; min-width: 0; flex: 1;">
          <div class="bestseller-rank-badge ${rankClass}">
            ${rank <= 3 ? `<i class="fa-solid fa-trophy" style="font-size: 0.75rem;"></i>` : rank}
          </div>
          ${imageHTML}
          <div class="bestseller-title-wrap" style="min-width: 0; display: flex; flex-direction: column; gap: 2px;">
            <span class="bestseller-title" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: block;" title="${game.title}">${game.title}</span>
            <div class="bestseller-labels-container">
              <span class="bestseller-label bestseller-label-sales">
                <i class="fa-solid fa-cart-shopping" style="font-size: 0.65rem;"></i>
                ${game.salesCount} sold
              </span>
              <span class="bestseller-label bestseller-label-profit">
                <i class="fa-solid fa-coins" style="font-size: 0.65rem;"></i>
                Avg. Profit: ${currSym}${game.avgProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span class="bestseller-label bestseller-label-margin">
                <i class="fa-solid fa-chart-line" style="font-size: 0.65rem;"></i>
                Margin: ${game.avgMargin.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>

        <!-- Right Side: Progress Bar and Value -->
        <div class="bestseller-progress-container" style="flex-shrink: 0; display: flex; align-items: center; gap: 12px;">
          <div class="bestseller-progress-bg">
            <div class="bestseller-progress-fill" style="width: ${pct}%; background-color: ${barColor};"></div>
          </div>
          <span class="bestseller-metric-val">${valueFormatter(game.value)}</span>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

function renderStockSpeedChart(filteredInventoryList, filteredSalesList) {
  if (typeof Chart === 'undefined') return;
  const canvas = document.getElementById("stockSpeedChart");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  if (stockSpeedChartInstance) {
    try { stockSpeedChartInstance.destroy(); } catch (e) { console.error(e); }
  }

  const wSales = getWidgetFilteredSales("stockSpeed", filteredSalesList);

  // Group sold items by how fast they sold
  const invMap = new Map();
  state.inventory.forEach(item => {
    if (item.id) invMap.set(item.id, item.purchaseDate);
  });

  let fast = 0; // < 7 days
  let moderate = 0; // 7-30 days
  let slow = 0; // 30-90 days
  let stale = 0; // 90+ days

  wSales.forEach(sale => {
    const purchaseDateStr = invMap.get(sale.inventoryId);
    if (purchaseDateStr && sale.saleDate) {
      const pDate = new Date(purchaseDateStr);
      const sDate = new Date(sale.saleDate);
      pDate.setHours(0,0,0,0);
      sDate.setHours(0,0,0,0);
      const diffTime = Math.max(0, sDate - pDate);
      const days = Math.round(diffTime / (1000 * 60 * 60 * 24));
      if (days < 7) fast++;
      else if (days <= 30) moderate++;
      else if (days <= 90) slow++;
      else stale++;
    }
  });

  const labels = ["Fast (< 7 days)", "Moderate (7-30 days)", "Slow (30-90 days)", "Stale (90+ days)"];
  const data = [fast, moderate, slow, stale];

  const rootStyle = getComputedStyle(document.documentElement);
  const textSecondaryColor = rootStyle.getPropertyValue('--text-secondary').trim() || 'hsl(220, 12%, 65%)';
  const bgCardColor = rootStyle.getPropertyValue('--bg-card').trim() || 'hsl(224, 22%, 12%)';
  const borderColor = rootStyle.getPropertyValue('--border-color').trim() || 'hsla(224, 20%, 30%, 0.5)';
  const tooltipBg = rootStyle.getPropertyValue('--bg-sidebar').trim() || 'hsl(224, 25%, 10%)';

  const accentTeal = rootStyle.getPropertyValue('--accent-teal').trim() || 'hsl(175, 90%, 48%)';
  const accentCyan = rootStyle.getPropertyValue('--accent-cyan').trim() || 'hsl(195, 90%, 50%)';
  const accentWarning = rootStyle.getPropertyValue('--accent-warning').trim() || 'hsl(40, 95%, 55%)';
  const accentDanger = rootStyle.getPropertyValue('--accent-danger').trim() || 'hsl(355, 85%, 55%)';

  const backgroundColors = [accentTeal, accentCyan, accentWarning, accentDanger];

  const wType = (state.widgetSettings && state.widgetSettings.stockSpeed && state.widgetSettings.stockSpeed.chartType) || 'doughnut';

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          color: textSecondaryColor,
          font: { family: 'Inter', size: 10 },
          boxWidth: 12
        }
      },
      tooltip: {
        backgroundColor: tooltipBg,
        titleColor: state.themeMode !== "light" ? "#fff" : "#000",
        bodyColor: state.themeMode !== "light" ? "#fff" : "#000",
        borderColor: borderColor,
        borderWidth: 1
      }
    }
  };

  if (wType === 'bar') {
    options.scales = {
      x: { grid: { display: false }, ticks: { color: textSecondaryColor } },
      y: { grid: { color: borderColor }, ticks: { color: textSecondaryColor, beginAtZero: true } }
    };
  }

  stockSpeedChartInstance = new Chart(ctx, {
    type: wType,
    data: {
      labels: labels,
      datasets: [{
        data: data,
        backgroundColor: backgroundColors,
        borderWidth: 2,
        borderColor: bgCardColor,
        hoverOffset: 4
      }]
    },
    options: options
  });
}

function renderSalesFeedWidget(filteredSalesList) {
  const container = document.getElementById("sales-feed-list");
  if (!container) return;

  const cfg = state.widgetSettings ? state.widgetSettings.salesFeed : null;
  const limit = cfg ? parseInt(cfg.limit) : 5;
  const wSales = getWidgetFilteredSales("salesFeed", filteredSalesList);

  const sortedSales = [...wSales].sort((a, b) => new Date(b.saleDate || 0) - new Date(a.saleDate || 0)).slice(0, limit);

  if (sortedSales.length === 0) {
    container.innerHTML = `<div class="text-muted text-center" style="padding: 24px;">No recent sales transactions.</div>`;
    return;
  }

  const imgUrlByTitle = {};
  state.inventory.forEach(item => {
    if (item.imageUrl && item.title) {
      imgUrlByTitle[item.title.trim().toLowerCase()] = item.imageUrl;
    }
  });

  let html = '';
  sortedSales.forEach(sale => {
    const title = sale.title || "Unknown Game";
    const imageUrl = sale.imageUrl || imgUrlByTitle[title.trim().toLowerCase()];
    const profitStr = formatCurrency(sale.profit);
    const profitClass = sale.profit >= 0 ? "text-success-neon" : "text-danger-soft";
    
    const initials = title.split(" ").map(w => w[0]).join("").slice(0, 3).toUpperCase();
    const thumbHTML = imageUrl
      ? `<img src="${escapeHTML(imageUrl)}" class="sales-feed-thumb" alt="${escapeHTML(title)}">`
      : `<div class="sales-feed-thumb-placeholder">${escapeHTML(initials)}</div>`;

    const formattedDate = sale.saleDate ? new Date(sale.saleDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : "-";

    html += `
      <div class="sales-feed-item">
        ${thumbHTML}
        <div class="sales-feed-info">
          <span class="sales-feed-title" title="${escapeHTML(title)}">${escapeHTML(title)}</span>
          <div class="sales-feed-meta">
            <span class="sales-feed-platform"><i class="fa-solid fa-gamepad"></i> ${escapeHTML(sale.platformSold || "Store")}</span>
            <span>•</span>
            <span>${formattedDate}</span>
          </div>
        </div>
        <div class="sales-feed-pricing">
          <span class="sales-feed-price">${formatCurrency(sale.sellPrice)}</span>
          <span class="sales-feed-profit ${profitClass}">${sale.profit >= 0 ? '+' : ''}${profitStr}</span>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

function renderFinanceTrackerWidget(filteredSalesList) {
  const container = document.getElementById("finance-tracker-card");
  if (!container) return;

  const wSales = getWidgetFilteredSales("financeTracker", filteredSalesList);

  const now = new Date();
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  
  const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonthStr = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, '0')}`;

  let curRevenue = 0, curCost = 0, curProfit = 0, curSales = 0;
  let prevRevenue = 0, prevCost = 0, prevProfit = 0, prevSales = 0;

  wSales.forEach(sale => {
    if (!sale.saleDate) return;
    const month = sale.saleDate.substring(0, 7);
    if (month === currentMonthStr) {
      curRevenue += sale.sellPrice;
      curCost += sale.cost;
      curProfit += sale.profit;
      curSales++;
    } else if (month === prevMonthStr) {
      prevRevenue += sale.sellPrice;
      prevCost += sale.cost;
      prevProfit += sale.profit;
      prevSales++;
    }
  });

  let curPayouts = 0;
  let prevPayouts = 0;
  if (state.payouts && Array.isArray(state.payouts)) {
    state.payouts.forEach(p => {
      if (!p.date) return;
      const month = p.date.substring(0, 7);
      const amt = parseFloat(p.amount) || 0;
      if (month === currentMonthStr) {
        curPayouts += amt;
      } else if (month === prevMonthStr) {
        prevPayouts += amt;
      }
    });
  }

  let curExpenses = curCost;
  let prevExpenses = prevCost;
  
  if (state.expenses && Array.isArray(state.expenses)) {
    state.expenses.forEach(e => {
      if (!e.date) return;
      const month = e.date.substring(0, 7);
      const amt = parseFloat(e.amount) || 0;
      if (month === currentMonthStr) {
        curExpenses += amt;
        curProfit -= amt;
      } else if (month === prevMonthStr) {
        prevExpenses += amt;
        prevProfit -= amt;
      }
    });
  }

  const curMargin = curRevenue > 0 ? (curProfit / curRevenue) * 100 : 0;
  const prevMargin = prevRevenue > 0 ? (prevProfit / prevRevenue) * 100 : 0;

  const formatTrend = (cur, prev, isCurrency = true) => {
    const diff = cur - prev;
    if (diff === 0) return `<span class="finance-trend-indicator text-muted">-</span>`;
    const label = isCurrency ? formatCurrency(Math.abs(diff)) : `${Math.abs(diff).toFixed(1)}%`;
    if (diff > 0) {
      return `<span class="finance-trend-indicator finance-trend-up"><i class="fa-solid fa-arrow-up"></i> ${label}</span>`;
    } else {
      return `<span class="finance-trend-indicator finance-trend-down"><i class="fa-solid fa-arrow-down"></i> ${label}</span>`;
    }
  };

  const currentMonthName = now.toLocaleString('en-US', { month: 'long' });

  container.innerHTML = `
    <table class="finance-tracker-table">
      <thead>
        <tr>
          <th>Metric (${now.getFullYear()})</th>
          <th>${currentMonthName.slice(0,3)}</th>
          <th>Trend vs Prev</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>Gross Revenue</strong></td>
          <td>${formatCurrency(curRevenue)}</td>
          <td>${formatTrend(curRevenue, prevRevenue)}</td>
        </tr>
        <tr>
          <td><strong>Total Costs/Fees</strong></td>
          <td>${formatCurrency(curExpenses)}</td>
          <td>${formatTrend(curExpenses, prevExpenses)}</td>
        </tr>
        <tr>
          <td><strong>Net Net Profit</strong></td>
          <td class="${curProfit >= 0 ? 'text-success-neon' : 'text-danger-soft'}"><strong>${formatCurrency(curProfit)}</strong></td>
          <td>${formatTrend(curProfit, prevProfit)}</td>
        </tr>
        <tr>
          <td><strong>Net Margin %</strong></td>
          <td><span class="finance-margin-badge">${curMargin.toFixed(1)}%</span></td>
          <td>${formatTrend(curMargin, prevMargin, false)}</td>
        </tr>
        <tr>
          <td><strong>Payouts Collected</strong></td>
          <td>${formatCurrency(curPayouts)}</td>
          <td>${formatTrend(curPayouts, prevPayouts)}</td>
        </tr>
      </tbody>
    </table>
  `;
}

function renderMarkupAnalysisChart(filteredInventoryList) {
  if (typeof Chart === 'undefined') return;
  const canvas = document.getElementById("markupAnalysisChart");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  if (markupAnalysisChartInstance) {
    try { markupAnalysisChartInstance.destroy(); } catch (e) { console.error(e); }
  }

  const wInventory = getWidgetFilteredInventory("markupAnalysis", filteredInventoryList);

  const cfg = state.widgetSettings ? state.widgetSettings.markupAnalysis : null;
  const groupBy = cfg ? cfg.groupBy : "publisher";

  const groups = {};

  const salesMap = new Map();
  state.sales.forEach(sale => {
    if (sale.inventoryId) {
      salesMap.set(sale.inventoryId, sale.sellPrice);
    }
  });

  wInventory.forEach(item => {
    const keyVal = (groupBy === "publisher" ? (item.publisher || "No Publisher") : (item.source || "No Supplier")).trim();
    if (!groups[keyVal]) {
      groups[keyVal] = { totalCost: 0, totalSell: 0, count: 0 };
    }

    const cost = item.cost || 0;
    const sellPrice = salesMap.has(item.id) ? salesMap.get(item.id) : (cost * 1.3);

    groups[keyVal].totalCost += cost;
    groups[keyVal].totalSell += sellPrice;
    groups[keyVal].count++;
  });

  const sortedKeys = Object.keys(groups)
    .sort((a, b) => groups[b].count - groups[a].count)
    .slice(0, 6);

  const labels = [];
  const avgCostData = [];
  const avgSellData = [];
  const avgMarkupData = [];

  sortedKeys.forEach(k => {
    const g = groups[k];
    const avgCost = g.count > 0 ? (g.totalCost / g.count) : 0;
    const avgSell = g.count > 0 ? (g.totalSell / g.count) : 0;
    const markup = avgCost > 0 ? ((avgSell - avgCost) / avgCost) * 100 : 0;

    labels.push(k.length > 15 ? k.slice(0, 15) + "..." : k);
    avgCostData.push(avgCost);
    avgSellData.push(avgSell);
    avgMarkupData.push(markup);
  });

  if (labels.length === 0) {
    labels.push("No Data");
    avgCostData.push(0);
    avgSellData.push(0);
    avgMarkupData.push(0);
  }

  const rootStyle = getComputedStyle(document.documentElement);
  const textSecondaryColor = rootStyle.getPropertyValue('--text-secondary').trim() || 'hsl(220, 12%, 65%)';
  const borderColor = rootStyle.getPropertyValue('--border-color').trim() || 'hsla(224, 20%, 25%, 0.15)';
  const tooltipBg = rootStyle.getPropertyValue('--bg-sidebar').trim() || 'hsl(224, 25%, 10%)';

  const accentPink = rootStyle.getPropertyValue('--accent-pink').trim() || 'hsl(330, 95%, 60%)';
  const accentTeal = rootStyle.getPropertyValue('--accent-teal').trim() || 'hsl(175, 90%, 48%)';
  const accentCyan = rootStyle.getPropertyValue('--accent-cyan').trim() || 'hsl(195, 90%, 50%)';

  const wType = (cfg && cfg.chartType) || "bar";

  markupAnalysisChartInstance = new Chart(ctx, {
    type: wType,
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Avg. Cost',
          data: avgCostData,
          backgroundColor: 'hsla(330, 95%, 60%, 0.25)',
          borderColor: accentPink,
          borderWidth: 1.5,
          yAxisID: 'y'
        },
        {
          label: 'Avg. List Price',
          data: avgSellData,
          backgroundColor: 'hsla(175, 90%, 48%, 0.25)',
          borderColor: accentTeal,
          borderWidth: 1.5,
          yAxisID: 'y'
        },
        {
          label: 'Avg. Markup %',
          data: avgMarkupData,
          backgroundColor: 'hsla(195, 90%, 50%, 0.1)',
          borderColor: accentCyan,
          borderWidth: 2,
          type: 'line',
          tension: 0.3,
          yAxisID: 'yPercentage'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: { color: textSecondaryColor, font: { family: 'Inter', size: 10 } }
        },
        tooltip: {
          backgroundColor: tooltipBg,
          titleColor: state.themeMode !== "light" ? "#fff" : "#000",
          bodyColor: state.themeMode !== "light" ? "#fff" : "#000",
          borderColor: borderColor,
          borderWidth: 1
        }
      },
      scales: {
        x: { grid: { display: false }, ticks: { color: textSecondaryColor } },
        y: {
          position: 'left',
          grid: { color: borderColor },
          ticks: {
            color: textSecondaryColor,
            callback: function(value) { return (state.currency === 'USD' ? '$' : '€') + value; }
          }
        },
        yPercentage: {
          position: 'right',
          grid: { drawOnChartArea: false },
          ticks: {
            color: textSecondaryColor,
            callback: function(value) { return value + '%'; }
          }
        }
      }
    }
  });
}

function renderStockTurnoverChart(filteredInventoryList, filteredSalesList) {
  if (typeof Chart === 'undefined') return;
  const canvas = document.getElementById("stockTurnoverChart");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  if (stockTurnoverChartInstance) {
    try { stockTurnoverChartInstance.destroy(); } catch (e) { console.error(e); }
  }

  const wSales = getWidgetFilteredSales("stockTurnover", filteredSalesList);
  const wInventory = getWidgetFilteredInventory("stockTurnover", filteredInventoryList);

  const activityByDate = {};

  wInventory.forEach(item => {
    if (!item.purchaseDate) return;
    const dateStr = item.purchaseDate.substring(0, 10);
    if (!activityByDate[dateStr]) {
      activityByDate[dateStr] = { bought: 0, sold: 0 };
    }
    activityByDate[dateStr].bought++;
  });

  wSales.forEach(sale => {
    if (!sale.saleDate) return;
    const dateStr = sale.saleDate.substring(0, 10);
    if (!activityByDate[dateStr]) {
      activityByDate[dateStr] = { bought: 0, sold: 0 };
    }
    activityByDate[dateStr].sold++;
  });

  const sortedDates = Object.keys(activityByDate).sort((a, b) => new Date(a) - new Date(b));

  const labels = sortedDates.map(d => {
    const opt = { month: 'short', day: 'numeric' };
    return new Date(d).toLocaleDateString('en-US', opt);
  });
  const boughtData = sortedDates.map(d => activityByDate[d].bought);
  const soldData = sortedDates.map(d => activityByDate[d].sold);

  if (sortedDates.length === 0) {
    labels.push("No Activity");
    boughtData.push(0);
    soldData.push(0);
  }

  const rootStyle = getComputedStyle(document.documentElement);
  const textSecondaryColor = rootStyle.getPropertyValue('--text-secondary').trim() || 'hsl(220, 12%, 65%)';
  const borderColor = rootStyle.getPropertyValue('--border-color').trim() || 'hsla(224, 20%, 25%, 0.15)';
  const tooltipBg = rootStyle.getPropertyValue('--bg-sidebar').trim() || 'hsl(224, 25%, 10%)';

  const accentCyan = rootStyle.getPropertyValue('--accent-cyan').trim() || 'hsl(195, 90%, 50%)';
  const accentTeal = rootStyle.getPropertyValue('--accent-teal').trim() || 'hsl(175, 90%, 48%)';

  const wType = (state.widgetSettings && state.widgetSettings.stockTurnover && state.widgetSettings.stockTurnover.chartType) || 'line';

  stockTurnoverChartInstance = new Chart(ctx, {
    type: wType,
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Keys Purchased',
          data: boughtData,
          borderColor: accentCyan,
          backgroundColor: 'hsla(195, 90%, 50%, 0.15)',
          borderWidth: 2.5,
          tension: 0.35,
          fill: true
        },
        {
          label: 'Keys Sold',
          data: soldData,
          borderColor: accentTeal,
          backgroundColor: 'hsla(175, 90%, 48%, 0.15)',
          borderWidth: 2.5,
          tension: 0.35,
          fill: true
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: { color: textSecondaryColor, font: { family: 'Inter', size: 10 } }
        },
        tooltip: {
          backgroundColor: tooltipBg,
          titleColor: state.themeMode !== "light" ? "#fff" : "#000",
          bodyColor: state.themeMode !== "light" ? "#fff" : "#000",
          borderColor: borderColor,
          borderWidth: 1
        }
      },
      scales: {
        x: { grid: { display: false }, ticks: { color: textSecondaryColor } },
        y: {
          grid: { color: borderColor },
          ticks: { color: textSecondaryColor, stepSize: 1, beginAtZero: true }
        }
      }
    }
  });
}

function renderStockAgingChart(filteredInventoryList) {
  if (typeof Chart === 'undefined') return;
  const canvas = document.getElementById("stockAgingChart");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  if (stockAgingChartInstance) {
    try { stockAgingChartInstance.destroy(); } catch (e) { console.error(e); }
  }

  const cfg = state.widgetSettings ? state.widgetSettings.stockAging : null;
  const supplierFilter = cfg ? cfg.supplier : 'all';

  // Get unsold available keys (exclude sold and recycled keys)
  const unsoldKeys = state.inventory.filter(item => !item.sold && !item.recycleBin);
  const filteredUnsold = unsoldKeys.filter(item => {
    if (supplierFilter !== 'all' && item.source !== supplierFilter) return false;
    return true;
  });

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  let bracket1 = 0; // 0-7 days
  let bracket2 = 0; // 8-30 days
  let bracket3 = 0; // 31-90 days
  let bracket4 = 0; // 90+ days

  filteredUnsold.forEach(item => {
    if (!item.purchaseDate) return;
    const pDate = new Date(item.purchaseDate);
    pDate.setHours(0, 0, 0, 0);
    const diffTime = Math.max(0, now - pDate);
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays <= 7) bracket1++;
    else if (diffDays <= 30) bracket2++;
    else if (diffDays <= 90) bracket3++;
    else bracket4++;
  });

  const labels = ["0-7 Days (Fresh)", "8-30 Days (Recent)", "31-90 Days (Aging)", "90+ Days (Dead Stock)"];
  const data = [bracket1, bracket2, bracket3, bracket4];
  const chartType = (cfg && cfg.chartType) || "bar";

  const rootStyle = getComputedStyle(document.documentElement);
  const textSecondaryColor = rootStyle.getPropertyValue('--text-secondary').trim() || 'hsl(220, 12%, 65%)';
  const borderColor = rootStyle.getPropertyValue('--border-color').trim() || 'hsla(224, 20%, 25%, 0.15)';
  const tooltipBg = rootStyle.getPropertyValue('--bg-sidebar').trim() || 'hsl(224, 25%, 10%)';

  const colors = [
    'hsl(145, 80%, 45%)',  // Fresh
    'hsl(210, 85%, 55%)',  // Recent
    'hsl(35, 90%, 55%)',   // Aging
    'hsl(350, 85%, 55%)'   // Dead
  ];
  const bgColors = [
    'hsla(145, 80%, 45%, 0.2)',
    'hsla(210, 85%, 55%, 0.2)',
    'hsla(35, 90%, 55%, 0.2)',
    'hsla(350, 85%, 55%, 0.2)'
  ];

  stockAgingChartInstance = new Chart(ctx, {
    type: chartType,
    data: {
      labels: labels,
      datasets: [{
        label: 'Unsold Keys',
        data: data,
        backgroundColor: chartType === 'doughnut' ? colors : bgColors,
        borderColor: colors,
        borderWidth: chartType === 'doughnut' ? 0 : 2,
        borderRadius: chartType === 'doughnut' ? 0 : 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: chartType === 'doughnut',
          position: 'bottom',
          labels: { color: textSecondaryColor, font: { family: 'Inter', size: 10 } }
        },
        tooltip: {
          backgroundColor: tooltipBg,
          titleColor: state.theme !== "light" ? "#fff" : "#000",
          bodyColor: state.theme !== "light" ? "#fff" : "#000",
          borderColor: borderColor,
          borderWidth: 1
        }
      },
      scales: chartType === 'doughnut' ? {} : {
        x: { grid: { display: false }, ticks: { color: textSecondaryColor } },
        y: {
          grid: { color: borderColor },
          ticks: { color: textSecondaryColor, stepSize: 1, beginAtZero: true }
        }
      }
    }
  });
}

function exportAgingReportToCSV() {
  const unsoldKeys = state.inventory.filter(item => item.status !== "Sold");
  if (unsoldKeys.length === 0) {
    showToast("No active inventory stock to run aging reports.", "error");
    return;
  }

  const csvRows = [];
  // Header row
  csvRows.push(["ID", "Game Title", "Platform", "Digital Key", "Acquisition Cost", "Source", "Date Added", "Status", "Age (Days)", "Aging Category"]);

  const nowTime = new Date().setHours(0, 0, 0, 0);

  unsoldKeys.forEach(item => {
    let diffDays = 0;
    if (item.purchaseDate) {
      const start = new Date(item.purchaseDate);
      start.setHours(0, 0, 0, 0);
      diffDays = Math.max(0, Math.round((nowTime - start.getTime()) / (1000 * 60 * 60 * 24)));
    }
    const category = getAgingCategory(item.purchaseDate).name;

    csvRows.push([
      item.id,
      `"${item.title.replace(/"/g, '""')}"`,
      item.platform,
      item.key,
      item.cost.toFixed(2),
      `"${item.source.replace(/"/g, '""')}"`,
      item.purchaseDate,
      item.status,
      diffDays,
      category
    ]);
  });

  downloadCSV(csvRows.join("\n"), "GameVault_Inventory_Aging_Report.csv");
  showToast("Inventory aging report exported to CSV!", "success");
}

function renderDashboardCardsOrder() {
  const container = document.getElementById("dashboard-charts-container");
  if (!container) return;
  
  state.dashboardOrder.forEach(key => {
    const card = document.getElementById(`card-chart-${key}`);
    if (card) {
      container.appendChild(card);
    }
  });
}

function renderFinanceCardsOrder() {
  const container = document.getElementById("finance-charts-container");
  if (!container || !state.financeOrder) return;
  state.financeOrder.forEach(key => {
    const card = document.getElementById(`card-chart-${key}`);
    if (card) {
      container.appendChild(card);
    }
  });
}

function getWidgetFilteredSales(widgetKey, globalSalesList) {
  const cfg = state.widgetSettings ? state.widgetSettings[widgetKey] : null;
  if (!cfg || cfg.timeframe === "global") {
    return globalSalesList;
  }
  
  const now = new Date();
  let cutoffDate = null;
  
  if (cfg.timeframe === "month") {
    cutoffDate = new Date(now.getFullYear(), now.getMonth(), 1);
  } else if (cfg.timeframe === "30") {
    cutoffDate = new Date();
    cutoffDate.setDate(now.getDate() - 30);
  } else if (cfg.timeframe === "90") {
    cutoffDate = new Date();
    cutoffDate.setDate(now.getDate() - 90);
  } else if (cfg.timeframe === "year") {
    cutoffDate = new Date(now.getFullYear(), 0, 1);
  }
  
  if (!cutoffDate) return globalSalesList;
  
  return state.sales.filter(sale => {
    if (!sale.saleDate) return false;
    const sDate = new Date(sale.saleDate);
    return sDate >= cutoffDate;
  });
}

function getWidgetFilteredInventory(widgetKey, globalInventoryList) {
  const cfg = state.widgetSettings ? state.widgetSettings[widgetKey] : null;
  if (!cfg || cfg.timeframe === "global") {
    return globalInventoryList;
  }
  
  const now = new Date();
  let cutoffDate = null;
  
  if (cfg.timeframe === "month") {
    cutoffDate = new Date(now.getFullYear(), now.getMonth(), 1);
  } else if (cfg.timeframe === "30") {
    cutoffDate = new Date();
    cutoffDate.setDate(now.getDate() - 30);
  } else if (cfg.timeframe === "90") {
    cutoffDate = new Date();
    cutoffDate.setDate(now.getDate() - 90);
  } else if (cfg.timeframe === "year") {
    cutoffDate = new Date(now.getFullYear(), 0, 1);
  }
  
  if (!cutoffDate) return globalInventoryList;
  
  return state.inventory.filter(item => {
    if (!item.purchaseDate) return false;
    const iDate = new Date(item.purchaseDate);
    return iDate >= cutoffDate;
  });
}

function enterWidgetFullscreen(cardElement) {
  const overlay = document.getElementById("widget-fullscreen-overlay");
  if (!overlay || !cardElement) return;
  
  fullscreenOriginalParent = cardElement.parentNode;
  fullscreenOriginalSibling = cardElement.nextSibling;
  
  cardElement.classList.remove("flipped");
  
  overlay.appendChild(cardElement);
  overlay.classList.add("active");
  document.body.style.overflow = "hidden";
  
  const maxIcon = cardElement.querySelector(".btn-widget-maximize");
  if (maxIcon) {
    maxIcon.className = "fa-solid fa-compress btn-widget-maximize";
    maxIcon.title = "Exit fullscreen";
  }
  
  window.dispatchEvent(new Event("resize"));
}

function exitWidgetFullscreen() {
  const overlay = document.getElementById("widget-fullscreen-overlay");
  if (!overlay) return;
  
  const cardElement = overlay.querySelector(".chart-card");
  if (cardElement && fullscreenOriginalParent) {
    if (fullscreenOriginalSibling) {
      fullscreenOriginalParent.insertBefore(cardElement, fullscreenOriginalSibling);
    } else {
      fullscreenOriginalParent.appendChild(cardElement);
    }
    
    const maxIcon = cardElement.querySelector(".btn-widget-maximize");
    if (maxIcon) {
      maxIcon.className = "fa-solid fa-expand btn-widget-maximize";
      maxIcon.title = "Maximize widget";
    }
  }
  
  overlay.classList.remove("active");
  document.body.style.overflow = "";
  window.dispatchEvent(new Event("resize"));
}

function applyWidgetVisibility() {
  Object.keys(state.widgetSettings).forEach(key => {
    const card = document.getElementById(`card-chart-${key}`);
    if (card) {
      const cfg = state.widgetSettings[key];
      if (cfg.visible) {
        card.style.display = "";
      } else {
        card.style.setProperty("display", "none", "important");
      }
      
      // Synchronize checkbox state (Removed - replaced by Widget Gallery)
      if (state.visibleFigures) {
        state.visibleFigures[key] = !!cfg.visible;
      }
      
      if (cfg.collapsed) {
        card.classList.add("minimized");
        const icon = card.querySelector(".btn-widget-minimize");
        if (icon) {
          icon.className = "fa-solid fa-chevron-up btn-widget-minimize";
          icon.title = "Expand widget";
        }
      } else {
        card.classList.remove("minimized");
        const icon = card.querySelector(".btn-widget-minimize");
        if (icon) {
          icon.className = "fa-solid fa-chevron-down btn-widget-minimize";
          icon.title = "Minimize widget";
        }
      }
    }
  });
}

function renderWidgetGallery() {
  const galleryList = document.getElementById("widget-gallery-list");
  if (!galleryList) return;
  
  const widgetMeta = {
    salesProfit: { title: "Sales vs Profit Trend", desc: "Line/Bar chart showing net sales vs profit over time." },
    platformSplit: { title: "Platform Sales Split", desc: "Doughnut/Pie chart illustrating sales distribution by platform." },
    supplierSplit: { title: "Supplier Stock Distribution", desc: "Stock count distribution mapped by supplier source." },
    topBestsellers: { title: "Top Bestselling Games (Profit)", desc: "Leaderboard listing top grossing games by net profit." },
    topBestsellersRevenue: { title: "Top Bestselling Games (Revenue)", desc: "Leaderboard listing top grossing games by revenue." },
    topBestsellersSales: { title: "Top Bestselling Games (Sales Volume)", desc: "Leaderboard listing top grossing games by sales volume." },
    dailyProfitMonth: { title: "Daily Profit of the Month", desc: "Daily net profit tracking bar chart for active month." },
    stockSpeed: { title: "Stock Speed & Aging Analytics", desc: "Doughnut/Pie/Bar chart tracking shelf-life of sold keys." },
    salesFeed: { title: "Recent Sales Activity Feed", desc: "Visual feed of the latest game key sales transactions." },
    stockTurnover: { title: "Stock Turnover Timeline", desc: "Dual timeline chart of key purchases vs keys sold over time." },
    stockAging: { title: "Stock Aging Distribution", desc: "Segments available stock keys by age brackets." }
  };
  
  let html = "";
  let inactiveCount = 0;
  
  Object.keys(widgetMeta).forEach(key => {
    const cfg = state.widgetSettings[key];
    if (cfg && !cfg.visible) {
      inactiveCount++;
      const meta = widgetMeta[key];
      html += `
        <div class="gallery-item" data-widget="${key}">
          <div class="gallery-item-info">
            <span class="gallery-item-title">${meta.title}</span>
            <span class="gallery-item-desc">${meta.desc}</span>
          </div>
          <i class="fa-solid fa-circle-plus gallery-item-add-btn" title="Add to dashboard"></i>
        </div>
      `;
    }
  });
  
  if (inactiveCount === 0) {
    html = `<div class="text-muted text-center" style="padding: 24px; font-size: 0.85rem;">All widgets are currently active on your dashboard!</div>`;
  }
  
  galleryList.innerHTML = html;
}

function bindWidgetControls() {
  const btnOpenGallery = document.getElementById("btn-open-widget-gallery");
  const drawer = document.getElementById("widget-gallery-drawer");
  const btnCloseDrawer = document.getElementById("btn-close-widget-gallery-drawer");
  
  if (btnOpenGallery && drawer) {
    btnOpenGallery.addEventListener("click", () => {
      renderWidgetGallery();
      drawer.classList.add("open");
    });
  }
  if (btnCloseDrawer && drawer) {
    btnCloseDrawer.addEventListener("click", () => {
      drawer.classList.remove("open");
    });
  }
  
  const galleryList = document.getElementById("widget-gallery-list");
  if (galleryList && drawer) {
    galleryList.addEventListener("click", (e) => {
      const item = e.target.closest(".gallery-item");
      if (item) {
        const widgetKey = item.getAttribute("data-widget");
        if (widgetKey && state.widgetSettings[widgetKey]) {
          state.widgetSettings[widgetKey].visible = true;
          saveStateToStorage();
          applyWidgetVisibility();
          renderWidgetGallery();
          updateUI();
          showToast("Added widget to dashboard.", "success");
          
          if (window.supabaseClient) {
            dbSaveSettings("widgetSettings", state.widgetSettings);
          }
        }
      }
    });
  }
  
  const overlay = document.getElementById("widget-fullscreen-overlay");
  if (overlay) {
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) {
        exitWidgetFullscreen();
      }
    });
  }
  
  const container = document.getElementById("dashboard-charts-container");
  const finContainer = document.getElementById("finance-charts-container");
  if (!container && !finContainer) return;
  
  const populateFormConfig = (widgetKey) => {
    const card = document.getElementById(`card-chart-${widgetKey}`);
    if (!card) return;
    const cfg = state.widgetSettings[widgetKey];
    
    const selectChart = document.getElementById(`config-${widgetKey}-chartType`);
    if (selectChart) selectChart.value = cfg.chartType || selectChart.options[0].value;
    
    const selectTime = document.getElementById(`config-${widgetKey}-timeframe`);
    if (selectTime) selectTime.value = cfg.timeframe || "global";
    
    if (widgetKey === "topBestsellers" || widgetKey === "topBestsellersRevenue" || widgetKey === "topBestsellersSales") {
      const selectLimit = document.getElementById(`config-${widgetKey}-limit`);
      if (selectLimit) selectLimit.value = cfg.limit || 5;
    } else if (widgetKey === "salesFeed") {
      const selectLimit = document.getElementById("config-salesFeed-limit");
      if (selectLimit) selectLimit.value = cfg.limit || 5;
    } else if (widgetKey === "markupAnalysis") {
      const selectGroupBy = document.getElementById("config-markupAnalysis-groupBy");
      if (selectGroupBy) selectGroupBy.value = cfg.groupBy || "publisher";
    } else if (widgetKey === "stockAging") {
      const selectSupplier = document.getElementById("config-stockAging-supplier");
      if (selectSupplier) {
        const suppliers = new Set();
        state.inventory.forEach(item => {
          if (item.source) suppliers.add(item.source);
        });
        let selectHtml = `<option value="all">All Suppliers</option>`;
        Array.from(suppliers).sort().forEach(s => {
          selectHtml += `<option value="${s}">${s}</option>`;
        });
        selectSupplier.innerHTML = selectHtml;
        selectSupplier.value = cfg.supplier || "all";
      }
    }
  };
  
  const handleWidgetClick = (e) => {
    const btnMinimize = e.target.closest(".btn-widget-minimize");
    if (btnMinimize) {
      e.stopPropagation();
      const card = btnMinimize.closest(".chart-card");
      const key = card ? card.getAttribute("data-figure") : null;
      if (key && state.widgetSettings[key]) {
        const cfg = state.widgetSettings[key];
        cfg.collapsed = !cfg.collapsed;
        
        // If minimized while inside fullscreen overlay, exit fullscreen first
        const isOverlay = card.parentNode.id === "widget-fullscreen-overlay";
        if (isOverlay && cfg.collapsed) {
          exitWidgetFullscreen();
        }
        
        saveStateToStorage();
        applyWidgetVisibility();
        if (!cfg.collapsed) {
          window.dispatchEvent(new Event("resize"));
        }
        if (window.supabaseClient) {
          dbSaveSettings("widgetSettings", state.widgetSettings);
        }
      }
      return;
    }
    
    const btnMaximize = e.target.closest(".btn-widget-maximize");
    if (btnMaximize) {
      e.stopPropagation();
      const card = btnMaximize.closest(".chart-card");
      if (card) {
        const isOverlay = card.parentNode.id === "widget-fullscreen-overlay";
        if (isOverlay) {
          exitWidgetFullscreen();
        } else {
          enterWidgetFullscreen(card);
        }
      }
      return;
    }
    
    const btnConfig = e.target.closest(".btn-widget-configure");
    if (btnConfig) {
      e.stopPropagation();
      const card = btnConfig.closest(".chart-card");
      const key = card ? card.getAttribute("data-figure") : null;
      if (card && key) {
        populateFormConfig(key);
        card.classList.add("flipped");
        
        const menu = btnConfig.closest(".card-actions-menu");
        if (menu) menu.classList.remove("active");
      }
      return;
    }
    
    const btnCancelFlip = e.target.closest(".btn-widget-flip-cancel");
    if (btnCancelFlip) {
      e.stopPropagation();
      const card = btnCancelFlip.closest(".chart-card");
      if (card) {
        card.classList.remove("flipped");
      }
      return;
    }
    
    const btnRemove = e.target.closest(".btn-widget-remove");
    if (btnRemove) {
      e.stopPropagation();
      const card = btnRemove.closest(".chart-card");
      const key = card ? card.getAttribute("data-figure") : null;
      if (key && state.widgetSettings[key]) {
        // Exit fullscreen if removing from fullscreen
        const isOverlay = card.parentNode.id === "widget-fullscreen-overlay";
        if (isOverlay) {
          exitWidgetFullscreen();
        }
        
        state.widgetSettings[key].visible = false;
        saveStateToStorage();
        applyWidgetVisibility();
        showToast("Removed widget from dashboard.", "info");
        
        const menu = btnRemove.closest(".card-actions-menu");
        if (menu) menu.classList.remove("active");
        
        if (window.supabaseClient) {
          dbSaveSettings("widgetSettings", state.widgetSettings);
        }
      }
      return;
    }
  };
  
  const handleWidgetSubmit = (e) => {
    const form = e.target.closest(".widget-config-form");
    if (form) {
      e.preventDefault();
      const widgetKey = form.getAttribute("data-widget");
      const card = form.closest(".chart-card");
      if (widgetKey && state.widgetSettings[widgetKey] && card) {
        const cfg = state.widgetSettings[widgetKey];
        
        const selectChart = document.getElementById(`config-${widgetKey}-chartType`);
        if (selectChart) cfg.chartType = selectChart.value;
        
        const selectTime = document.getElementById(`config-${widgetKey}-timeframe`);
        if (selectTime) cfg.timeframe = selectTime.value;
        
        if (widgetKey === "topBestsellers" || widgetKey === "topBestsellersRevenue" || widgetKey === "topBestsellersSales") {
          const selectLimit = document.getElementById(`config-${widgetKey}-limit`);
          if (selectLimit) cfg.limit = parseInt(selectLimit.value);
        } else if (widgetKey === "salesFeed") {
          const selectLimit = document.getElementById("config-salesFeed-limit");
          if (selectLimit) cfg.limit = parseInt(selectLimit.value);
        } else if (widgetKey === "markupAnalysis") {
          const selectGroupBy = document.getElementById("config-markupAnalysis-groupBy");
          if (selectGroupBy) cfg.groupBy = selectGroupBy.value;
        } else if (widgetKey === "stockAging") {
          const selectSupplier = document.getElementById("config-stockAging-supplier");
          if (selectSupplier) cfg.supplier = selectSupplier.value;
        }
        
        saveStateToStorage();
        card.classList.remove("flipped");
        updateUI();
        showToast("Widget settings saved.", "success");
        
        if (window.supabaseClient) {
          dbSaveSettings("widgetSettings", state.widgetSettings);
        }
      }
    }
  };

  if (container) {
    container.addEventListener("click", handleWidgetClick);
    container.addEventListener("submit", handleWidgetSubmit);
  }
  if (finContainer) {
    finContainer.addEventListener("click", handleWidgetClick);
    finContainer.addEventListener("submit", handleWidgetSubmit);
  }
  if (overlay) {
    overlay.addEventListener("click", handleWidgetClick);
    overlay.addEventListener("submit", handleWidgetSubmit);
  }
}

function saveMetricOrder() {
  const grid = document.querySelector("#dashboard-view .metrics-grid");
  if (!grid) return;
  const children = Array.from(grid.children);
  const order = children.map(child => child.id);
  state.metricOrder = order;
  saveStateToStorage();
  if (window.supabaseClient) {
    dbSaveSettings("metricOrder", state.metricOrder);
  }
}

function saveSupplierMetricOrder() {
  const grid = document.getElementById("suppliers-metrics-grid");
  if (!grid) return;
  const children = Array.from(grid.children);
  const order = children.map(child => child.id);
  state.supMetricOrder = order;
  saveStateToStorage();
  if (window.supabaseClient) {
    dbSaveSettings("supMetricOrder", state.supMetricOrder);
  }
}

function initDragAndDrop() {
  const grids = document.querySelectorAll(".metrics-grid");
  grids.forEach(grid => {
    const cards = grid.querySelectorAll(".metric-card");
    cards.forEach(card => {
      card.setAttribute("draggable", "true");
      
      card.addEventListener("dragstart", (e) => {
        dragSource = card;
        card.classList.add("dragging");
        e.dataTransfer.effectAllowed = "move";
      });
      
      card.addEventListener("dragend", () => {
        dragSource = null;
        card.classList.remove("dragging");
        grid.querySelectorAll(".metric-card").forEach(c => c.classList.remove("drag-over"));
        if (grid.id === "suppliers-metrics-grid") {
          saveSupplierMetricOrder();
        } else {
          saveMetricOrder();
        }
      });
      
      card.addEventListener("dragover", (e) => {
        e.preventDefault();
        if (card === dragSource) return;
        if (card.parentNode !== dragSource.parentNode) return;
        card.classList.add("drag-over");
      });
      
      card.addEventListener("dragleave", () => {
        card.classList.remove("drag-over");
      });
      
      card.addEventListener("drop", (e) => {
        e.preventDefault();
        card.classList.remove("drag-over");
        if (card === dragSource) return;
        if (card.parentNode !== dragSource.parentNode) return;
        
        const children = Array.from(grid.children);
        const srcIndex = children.indexOf(dragSource);
        const targetIndex = children.indexOf(card);
        
        if (srcIndex < targetIndex) {
          grid.insertBefore(dragSource, card.nextSibling);
        } else {
          grid.insertBefore(dragSource, card);
        }
      });
    });
  });
}

