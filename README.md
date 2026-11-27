# GameVault — Key Merchant Pro

> High-performance digital game license inventory pipeline, sales ledger, and financial analytics platform designed for digital key merchants, distributors, and online publishers.

![Version](https://img.shields.io/badge/version-v3.4.4-cyan.svg)
![Status](https://img.shields.io/badge/status-active-emerald.svg)
![Platform](https://img.shields.io/badge/platform-Web%20SPA-purple.svg)

---

## Overview

**GameVault** (Key Merchant Pro) provides end-to-end tooling for managing digital software and activation key supply chains across platforms such as Steam, Epic Games, GOG, Ubisoft, and EA.

From real-time digital game deal sourcing and Kinguin arbitrage analytics to bulk spreadsheet imports, financial margin auditing, dispute reconciliation, and automated Steam rating intelligence, GameVault equips digital merchants with the insights needed to optimize pricing and restock strategies.

---

## Key Features

### 1. Sourcing & Kinguin Arbitrage Radar
- **Live Multi-Store Deal Scanning**: Direct integration with CheapShark's deals REST API scanning across recognized digital retailers (Steam, Fanatical, Humble Bundle, GreenManGaming, GOG, Epic Games Store, GamersGate, Gamesplanet, GameBillet, DreamGame, WinGameStore, IndieGala, Uplay).
- **Starred Favorites as Watchlist**: Reuses the merchant's starred Favorite Games (`state.favoriteGames`) as an automatic sourcing watchlist with zero duplicate list management.
- **Automated Kinguin Arbitrage Engine**:
  - Dynamically calculates net Kinguin payout after sales fees (configurable percentage, default 11% + €0.10 flat fee).
  - Automatically derives benchmarks from historical Kinguin sales, catalog markup (+35%), or manual price overrides.
  - Computes real-time Net Profit (€) and projected ROI (%) for every watched game.
- **Hybrid Suppliers & Radar Synchronization**:
  - Manage Suppliers table features interactive **`[Scanning ON/OFF]`** toggle buttons for recognized retailers and **`Manual / Keyshop`** badges for offline sources.
  - 1-click **`[My Suppliers]`** filter inside Sourcing Radar instantly restricts queries to the merchant's active registered vendors.
  - Instant navigation shortcuts connecting the Suppliers view and the Sourcing Radar.
- **1-Click Aggregator & Keyshop Launchers**:
  - Direct `[Buy Deal ↗]` links to the cheapest authorized retailer.
  - Rapid shortcuts to `gg.deals`, `Allkeyshop`, and `Kinguin` for instant price cross-checks without bot-blocking risk.
  - 1-click `[+]` button to pre-fill the "Add Game Key" modal with the acquired game details for instant stock logging.

### 2. Direct Kinguin Merchant API Integration & CORS Relay
- **B2B Merchant API Gateway**: Direct connection to Kinguin's eCommerce B2B API gateway using merchant API keys (`X-Api-Key`) and configurable store identification (`GameVault`).
- **Live Market Resale Benchmarks**: Queries live competing market prices and upgrades the radar benchmark to **Live Kinguin Market Price** with a distinctive **`👑 Live Kinguin`** crown badge.
- **Cloudflare Worker CORS Relay**: Customizable CORS proxy / relay URL setting enables seamless browser API access, bypassing browser cross-origin limitations.
- **Diagnostic Connection Validator**: Interactive "Test Connection" tool in Settings verifies live API connectivity with instant catalog lookup diagnostics.

### 3. Action Center & Dedicated Price Radar Notifications
- **Segmented Notification Streams**: Separate tabs inside the Action Center dropdown (`#notification-dropdown`):
  - **`[⚡ Price Radar]`**: Real-time arbitrage opportunities, price drops, and scan summaries with 1-click modal navigation.
  - **`[📋 Actions]`**: Standard ledger audit actions (inventory edits, sales recorded, undo/redo, bulk adjustments).
  - **`[All]`**: Unified chronological event feed.
- **Real-Time Badge Counters & Contextual Clear**:
  - Header counters show exact alert volume per tab.
  - Contextual clearing cleans only the active tab's items while preserving other history.
- **Automated Background Deal Monitoring**:
  - Automatic scan on application startup for stale deal caches.
  - Background periodic re-scanning every 60 minutes with configurable topbar alert toggles.

### 4. Steam Rating Intelligence & Sentiment Metrics
- **Interactive Rating Pills**: Real-time Steam review scores and sentiment classification embedded directly in game cards and catalog tables.
- **Color-Coded Sentiment Tiers**:
  - `Overwhelmingly / Very Positive` (≥ 80%): Vivid Emerald highlight
  - `Mostly Positive` (70% - 79%): Royal Steam Blue highlight
  - `Mixed` (40% - 69%): Amber highlight
  - `Negative` (< 40%): Coral highlight
- **Click-to-Store Navigation**: Direct one-click lookup to the official Steam Store for quick price/edition comparisons.
- **Direct Steam App ID Resolution**: Extracts App IDs directly from Akamai CDN artwork URLs to query deals and ratings in a single fast call.

### 5. Full-Catalog Enrichment Engine (A–Z)
- **Dedicated Steam Ratings Enricher**: Located in **Settings &rarr; Data Tools & Utilities**, processes all 1,270+ games across the entire catalog with real-time progress bars, title readouts, and cancellation controls.
- **Circuit Breaker Rate Limiting**: Enforces a safe 1,300ms inter-request interval (safely below CheapShark's 60 req/min limit) and automatically pauses for 65 seconds with live UI countdowns upon encountering HTTP 429 throttling.
- **Self-Healing Cache**: Automatic purge of empty/rate-limited placeholder records, plus a manual "Clean Cache" utility.

### 6. Multi-Metric Catalog Filtering & Sorting
- **Dedicated Available Stock Filter**: Filter catalog titles instantly by **All Stock**, **In Stock (> 0)**, **Low Stock (≤ threshold)**, **Out of Stock (0)**, or **High Stock (> threshold)** with live alert threshold synchronization.
- **Steam Rating Sentiment Filter**: Isolate games by rating tiers (&ge; 80% Positive, &ge; 70% Mostly Positive, 40%–69% Mixed, &lt; 40% Negative, or Unrated).
- **Restock Decision Sorting**: Sort catalog listings by **Steam Rating %** (highest to lowest), **Profit Margin %**, **ROI %**, **Available Stock** (low restock priority or highest), or **Total Sold**.

### 7. Inventory & Sales Pipeline
- **Quick Status Filter Pills**: Interactive status pills (`All`, `Available`, `Sold`, `Reserved`, `Rejected`) positioned right above the inventory controls with dynamic count badges recalculating in real-time across active platform, supplier, aging, and search filters.
- **Clean Sale Registration**: Dedicated "Record Key Sale" modal with blank price entry for rapid, error-free transaction logging.
- **Activation State Tracking**: Available, Sold, Reserved, and Rejected keys.
- **Holding Duration & Stock Aging**: Automatic holding duration (days from acquisition to sale) on sold grid cards, plus aging badges: Fresh (<30d), Aging (30-90d), Stale (90-180d), and Very Stale (180d+).
- **Dispute & Refund Reconciliation**: Amber dispute flagging, revenue recalculation, supplier refund tracking, and pulsing sidebar alert counters.

### 8. Financial Ledger & Outflow Allocation
- **Monthly & Yearly Ledger Breakdown**: Aggregated financial metrics across 3 streamlined layouts (Spreadsheet View, Grid Cards View, and Full-Width Table View).
- **Spreadsheet Mode**: Contained horizontal scrolling with a sticky frozen "Metric" column.
- **Outflow Allocation**: Allocation doughnut chart breaking down acquisition costs vs operational payouts.
- **Ending Inventory Valuation**: Automatic asset valuation of unsold keys on period closing dates.

### 9. Supplier, Publisher & Platform Management
- **Dynamic Supplier & Period Metrics**: All 8 top-level supplier metrics cards (Net Profit, Inventory Cost, Total Revenue, ROI %, Available Stock, Sales Velocity, Sell-Through Rate, and Avg Profit/Key) dynamically recalculate based on active supplier dropdown selection and date period filters ("All Time", "This Month", "This Week", "Today").
- **Timezone-Resilient Date Engine**: Midnight-aligned date boundary parsing (`parseDateMidnight`) eliminates timezone skew and date object mutations.
- **Key Reassignment on Deletion**: Seamlessly transfer existing inventory keys and sales records to another designated supplier or platform when deleting a supplier or platform from your catalog.
- **Automated Logo Retrieval**: Automatically retrieve high-resolution company branding logos for both suppliers and publishers with a single click.
- **Dynamic Dropdown Synchronization**: Global alphabetical synchronization of supplier and platform dropdowns across all inventory modals and view filters.
- **Platform Analytics**: Summary metrics tracking channel counts, active inventory, top platform by volume, and top platform by profit.

### 10. Dashboard Bestsellers Intelligence & Cover Banners
- **Smart Base-Title Grouping**: Optional "Group Region & Edition Variants" toggle consolidates regional variants (`[EU]`, `(ROW)`) and edition releases (`Deluxe Edition`, `Total Conflict Edition`, etc.) into a single canonical base title, aggregating metrics and live unsold stock.
- **High-Resolution Cover Artwork**: Complete cover banner repository with 917+ verified Steam header images (`460×215` aspect ratio) ensuring full logo visibility without edge cropping.
- **Extended Analytics Widgets**: Includes dedicated widgets for Net Profit, Revenue, Sales Volume, Highest Profit Achieved (peak profit per title), and Entries with Highest Average Profit.
- **Artwork Display Modes**: Toggle between wide "Cover Banner" and "Compact Thumbnail (56px)" display via card-back configuration or the 3-dots card actions dropdown menu.
- **Live Key Inventory Counter**: Direct remaining unsold keys stock badges (`X keys in stock`) with color-coded alerts for depleted items (`0 keys in stock` in soft red) and low stock (`X keys left (Low)` in amber).
- **Interactive Catalog Keys Drill-Down**: 1-click inspection from any bestseller item directly to the Catalog Keys modal.

### 11. WCAG High-Contrast Theme System
- **Optimized Light & Dark Themes**: High-contrast typography featuring deep, rich teal (`hsl(180, 100%, 25%)`) and azure cyan (`hsl(198, 100%, 32%)`) on light mode surfaces (delivering 6:1+ contrast ratios conforming to WCAG AA/AAA standards).
- **Dynamic Chart Adaptation**: Chart.js financial and outflow visualizations adapt their stroke and fill colors dynamically to the active appearance mode.
- **5 Theme Color Palettes**: Classic, Ocean, Cyberpunk, Emerald, and Amber.

### 12. AI Merchant Assistant (Gemini & OpenAI)
- **Built-in Strategic AI Advisor**: Slide-over drawer powered by Google Gemini 2.5 Flash and OpenAI for margin audits, restock prioritization, and inventory analytics.
- **Live Business Context**: Feeds real-time sales and stock metrics into queries for contextual guidance.

### 13. Executive Dashboard Overview Row & Drag-and-Drop Reordering
- **Triple Executive Overview Cards**: Prominently highlights **Performance Summary** (dynamic time period metrics), **Inventory Status** (available, reserved, unique titles, and stock valuation), and **Daily Profit of the Month** (daily tracking bar chart).
- **Intuitive Reordering**: Integrated drag handles (`overview-drag-handle`) and directional chevron nudge buttons (`←` / `→`) enable effortless visual re-positioning across the top overview row.
- **Persistent Layout State**: Custom visual order and per-container visibility persist automatically via dedicated local storage and bidirectional Supabase cloud database synchronization (`dashboardOverviewOrder`).
- **Responsive Symmetry**: Built in standard document-flow layout with single-column responsive collapse on tablets and mobile devices (< 768px).

### 14. High-Performance Persistence & Filter Engine
- **Granular Storage Layer**: Dedicated writers (`saveSettingsToStorage()`, `saveInventoryToStorage()`, `saveSalesToStorage()`) isolate UI state updates from full data arrays, eliminating CPU overhead and multi-megabyte JSON re-serialization when toggling preferences.
- **Unified Single-Pass Filtering**: Combined multi-criteria search, date, supplier, platform, status, and aging filters in `getFilteredInventory()` and `getFilteredSales()` into single-pass predicates with early exit, removing intermediate array allocations and garbage collection pressure.
- **Optimized Sorting**: Direct lexicographical ISO date-string comparison replaces thousands of temporary `Date` object instantiations during transaction sorting.
- **Lazy View Computation**: Table and ledger filtering executes strictly on-demand for active views inside `updateUI()`.

### 15. Mobile-First Responsive Design System
- **Viewport-Aware Grid Collapse**: Automatic transition from multi-column executive layouts to clean single-column cards on viewports under 768px.
- **Container Overflow Protection**: Robust `min-width: 0` constraints, fluid chart height clamping (`160px` mobile target), and text ellipsis (`text-overflow: ellipsis`) prevent card data or axes from spilling beyond screen boundaries on narrow mobile displays (down to 320px).
- **Touch-Friendly Controls**: Touch-optimized action buttons and navigation menus with hidden labels and enlarged tap targets on mobile viewports.

---

## Technical Architecture

GameVault is engineered as a modular client-side Single Page Application (SPA) designed to run both online (hosted on web servers or GitHub Pages) and offline:

```
game-sales-tracker/
├── index.html                 # Core application shell, topbar & dashboard markup
├── landing.html               # Public product landing page
├── config.js                  # Global configuration & environment endpoints (v3.2.3)
├── app.js                     # Application entry point & boot sequence
├── styles.css                 # Comprehensive design system & animations
├── CHANGELOG.md               # Version progress & milestone documentation
├── README.md                  # Project documentation
├── templates/
│   ├── modals.html            # Static dialog boxes & transaction forms
│   └── help-modal.html        # Help documentation center & manual
└── src/
    ├── state.js               # Reactive application state, storage & notification filters
    ├── api.js                 # Cloud database synchronization (Supabase), Kinguin & GG.deals API
    ├── charts.js              # Chart.js visualization wrappers & widgets
    ├── ui.js                  # UI renderers, tables, filters, sourcing radar & enricher
    ├── ai.js                  # AI assistant integration (Gemini / OpenAI)
    └── importer.js            # Excel / XLSX multi-sheet import engine
```

---

## Getting Started

### Local Usage
1. Clone or download the repository.
2. Open `index.html` in any modern web browser (Edge, Chrome, Opera, Firefox).
3. The application will boot in **Dev Mode** if accessed via `http://localhost` or `http://127.0.0.1`, virtualizing local storage to protect live datasets.

### Cloud Synchronization
1. Navigate to **Settings &rarr; Database & Cloud Sync**.
2. Enter your **Supabase Project URL** and **Anon API Key** (or use the pre-configured deployment defaults in `config.js`).
3. Click **Connect & Sync** to enable bidirectional cloud syncing across all sessions and devices.

### Kinguin, GG.deals & G2A API Setup
1. **Kinguin API**: Navigate to **Settings &rarr; Kinguin Merchant API**. Enter your store API Key and store name. Configure your Cloudflare Worker relay in **CORS Proxy / Relay URL** to enable browser queries. Benchmark filters (`[x] Exclude Game Accounts` and `[x] Exclude DLCs & Expansions`) ensure live benchmarks only evaluate genuine base game CD Keys. Click **Test Kinguin Connection** to verify live catalog search capability.
2. **GG.deals API**: Navigate to **Settings &rarr; GG.deals API**. Paste your personal token from [gg.deals/api/](https://gg.deals/api/). Select your preferred currency/region (EUR, USD, GBP, etc.). Click **Test GG.deals Connection** to verify live pricing. (Automatically reuses your Kinguin CORS relay proxy).
3. **G2A Merchant API**: Navigate to **Settings &rarr; G2A Merchant API**. Enter your G2A Client ID and Client Secret from your G2A API Integration dashboard. Configure your CORS Proxy URL (or reuse your Kinguin Cloudflare Worker proxy via `cloudflare-cors-worker.js` in the repo root) to bypass browser origin limits. Supports both Production (`https://api.g2a.com`) and Sandbox. Powers live dual-marketplace arbitrage (`Target: G2A` vs `Target: Kinguin`).

---

## Version History

See [CHANGELOG.md](CHANGELOG.md) for full release notes and development milestones.

Current Release: **v3.4.4** (2026-11-27)
