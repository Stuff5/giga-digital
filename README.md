# GameVault — Key Merchant Pro

> High-performance digital game license inventory pipeline, sales ledger, and financial analytics platform designed for digital key merchants, distributors, and online publishers.

![Version](https://img.shields.io/badge/version-v2.2.12-cyan.svg)
![Status](https://img.shields.io/badge/status-active-emerald.svg)
![Platform](https://img.shields.io/badge/platform-Web%20SPA-purple.svg)

---

## Overview

**GameVault** (Key Merchant Pro) provides end-to-end tooling for managing digital software and activation key supply chains across platforms such as Steam, Epic Games, GOG, Ubisoft, and EA.

From bulk spreadsheet imports and real-time inventory tracking to financial margin auditing, dispute reconciliation, and automated Steam rating intelligence, GameVault equips digital merchants with the insights needed to optimize pricing and restock strategies.

---

## Key Features

### 1. Steam Rating Intelligence & Sentiment Metrics
- **Interactive Rating Pills**: Real-time Steam review scores and sentiment classification embedded directly in game cards and catalog tables.
- **Color-Coded Sentiment Tiers**:
  - `Overwhelmingly / Very Positive` (≥ 80%): Vivid Emerald highlight
  - `Mostly Positive` (70% - 79%): Royal Steam Blue highlight
  - `Mixed` (40% - 69%): Amber highlight
  - `Negative` (< 40%): Coral highlight
- **Click-to-Store Navigation**: Direct one-click lookup to the official Steam Store for quick price/edition comparisons.
- **Direct Steam App ID Resolution**: Extracts App IDs directly from Akamai CDN artwork URLs to query deals and ratings in a single fast call.

### 2. Full-Catalog Enrichment Engine (A–Z)
- **Dedicated Steam Ratings Enricher**: Located in **Settings &rarr; Data Tools & Utilities**, processes all 1,270+ games across the entire catalog with real-time progress bars, title readouts, and cancellation controls.
- **Circuit Breaker Rate Limiting**: Enforces a safe 1,300ms inter-request interval (safely below CheapShark's 60 req/min limit) and automatically pauses for 65 seconds with live UI countdowns upon encountering HTTP 429 throttling.
- **Self-Healing Cache**: Automatic purge of empty/rate-limited placeholder records, plus a manual "Clean Cache" utility.

### 3. Multi-Metric Catalog Filtering & Sorting
- **Dedicated Available Stock Filter**: Filter catalog titles instantly by **All Stock**, **In Stock (> 0)**, **Low Stock (≤ threshold)**, **Out of Stock (0)**, or **High Stock (> threshold)** with live alert threshold synchronization.
- **Steam Rating Sentiment Filter**: Isolate games by rating tiers (&ge; 80% Positive, &ge; 70% Mostly Positive, 40%–69% Mixed, &lt; 40% Negative, or Unrated).
- **Restock Decision Sorting**: Sort catalog listings by **Steam Rating %** (highest to lowest), **Profit Margin %**, **ROI %**, **Available Stock** (low restock priority or highest), or **Total Sold**.

### 4. Inventory & Sales Pipeline
- **Clean Sale Registration**: Dedicated "Record Key Sale" modal with blank price entry for rapid, error-free transaction logging.
- **Activation State Tracking**: Available, Sold, Reserved, and Rejected keys.
- **Inventory Stock Aging Alerts**: Fresh (<30d), Aging (30-90d), Stale (90-180d), and Very Stale (180d+).
- **Dispute & Refund Reconciliation**: Amber dispute flagging, revenue recalculation, supplier refund tracking, and pulsing sidebar alert counters.

### 5. Financial Ledger & Outflow Allocation
- **Monthly Ledger Breakdown**: Aggregated financial metrics across 5 customizable layouts (Cards, Table, Compact, Summary, and Spreadsheet).
- **Spreadsheet Mode**: Contained horizontal scrolling with a sticky frozen "Metric" column.
- **Outflow Allocation**: Allocation doughnut chart breaking down acquisition costs vs operational payouts.
- **Ending Inventory Valuation**: Automatic asset valuation of unsold keys on period closing dates.

### 6. Supplier, Publisher & Platform Management
- **Dynamic Supplier & Period Metrics**: All 8 top-level supplier metrics cards (Net Profit, Inventory Cost, Total Revenue, ROI %, Available Stock, Sales Velocity, Sell-Through Rate, and Avg Profit/Key) dynamically recalculate based on active supplier dropdown selection and date period filters ("All Time", "This Month", "This Week", "Today").
- **Timezone-Resilient Date Engine**: Midnight-aligned date boundary parsing (`parseDateMidnight`) eliminates timezone skew and date object mutations.
- **Key Reassignment on Deletion**: Seamlessly transfer existing inventory keys and sales records to another designated supplier or platform when deleting a supplier or platform from your catalog.
- **Automated Logo Retrieval**: Automatically retrieve high-resolution company branding logos for both suppliers and publishers with a single click.
- **Dynamic Dropdown Synchronization**: Global alphabetical synchronization of supplier and platform dropdowns across all inventory modals and view filters.
- **Platform Analytics**: Summary metrics tracking channel counts, active inventory, top platform by volume, and top platform by profit.

### 7. Dashboard Bestsellers Intelligence & Cover Banners
- **Steam Header Aspect Ratio Display**: Top Bestselling games widgets (Net Profit, Revenue, and Sales Volume) display high-resolution horizontal cover banners (`460×215` aspect ratio) ensuring full logo visibility without edge cropping.
- **Artwork Display Modes**: Toggle between wide "Cover Banner" and "Compact Thumbnail (56px)" display via card-back configuration or the 3-dots card actions dropdown menu.
- **Live Key Inventory Counter**: Direct remaining unsold keys stock badges (`X keys in stock`) with color-coded alerts for depleted items (`0 keys in stock` in soft red) and low stock (`X keys left (Low)` in amber).
- **Interactive Catalog Keys Drill-Down**: 1-click inspection from any bestseller item directly to the Catalog Keys modal.

### 8. WCAG High-Contrast Theme System
- **Optimized Light & Dark Themes**: High-contrast typography featuring deep, rich teal (`hsl(180, 100%, 25%)`) and azure cyan (`hsl(198, 100%, 32%)`) on light mode surfaces (delivering 6:1+ contrast ratios conforming to WCAG AA/AAA standards).
- **Dynamic Chart Adaptation**: Chart.js financial and outflow visualizations adapt their stroke and fill colors dynamically to the active appearance mode.
- **5 Theme Color Palettes**: Classic, Ocean, Cyberpunk, Emerald, and Amber.

### 9. AI Merchant Assistant (Gemini & OpenAI)
- **Built-in Strategic AI Advisor**: Slide-over drawer powered by Google Gemini 2.5 Flash and OpenAI for margin audits, restock prioritization, and inventory analytics.
- **Live Business Context**: Feeds real-time sales and stock metrics into queries for contextual guidance.

---

## Technical Architecture

GameVault is engineered as a modular client-side Single Page Application (SPA) designed to run both online (hosted on web servers or GitHub Pages) and offline:

```
game-sales-tracker/
├── index.html                 # Core application shell & dashboard markup
├── landing.html               # Public product landing page
├── config.js                  # Global configuration & environment endpoints
├── app.js                     # Application entry point & boot sequence
├── styles.css                 # Comprehensive design system & animations
├── CHANGELOG.md               # Version progress & milestone documentation
├── README.md                  # Project documentation
├── templates/
│   ├── modals.html            # Static dialog boxes & transaction forms
│   └── help-modal.html        # Help documentation center & manual
└── src/
    ├── state.js               # Reactive application state & storage layer
    ├── api.js                 # Cloud database synchronization (Supabase)
    ├── charts.js              # Chart.js visualization wrappers & widgets
    ├── ui.js                  # UI renderers, tables, filters & enricher
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

---

## Version History

See [CHANGELOG.md](CHANGELOG.md) for full release notes and development milestones.

Current Release: **v2.2.9** (2026-09-23)
