# GameVault — Key Merchant Pro

> High-performance digital game license inventory pipeline, sales ledger, and financial analytics platform designed for digital key merchants, distributors, and online publishers.

![Version](https://img.shields.io/badge/version-v2.1.3-cyan.svg)
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
  - `Overwhelmingly / Very Positive` (≥ 80%): Emerald highlight
  - `Mostly Positive` (70% - 79%): Cyan highlight
  - `Mixed` (40% - 69%): Amber highlight
  - `Negative` (< 40%): Coral highlight
- **Click-to-Store Navigation**: Direct one-click lookup to the official Steam Store for quick price/edition comparisons.
- **Direct Steam App ID Resolution**: Extracts App IDs directly from Akamai CDN artwork URLs to query deals and ratings in a single fast call.

### 2. Full-Catalog Enrichment Engine (A–Z)
- **Dedicated Steam Ratings Enricher**: Located in **Settings &rarr; Data Tools & Utilities**, processes all 1,270+ games across the entire catalog with real-time progress bars, title readouts, and cancellation controls.
- **Circuit Breaker Rate Limiting**: Enforces a safe 1,300ms inter-request interval (safely below CheapShark's 60 req/min limit) and automatically pauses for 65 seconds with live UI countdowns upon encountering HTTP 429 throttling.
- **Self-Healing Cache**: Automatic purge of empty/rate-limited placeholder records, plus a manual "Clean Cache" utility.

### 3. Multi-Metric Percentage Sorting & Filtering
- **Restock Decision Sorting**: Sort catalog listings by **Steam Rating %** (highest to lowest), **Profit Margin %**, or **ROI %**.
- **Percentage Range Filters**: Isolate high-yielding or top-rated games with minimum and maximum percentage thresholds.

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
- **Key Reassignment on Deletion**: Seamlessly transfer existing inventory keys and sales records to another designated supplier or platform when deleting a supplier or platform from your catalog.
- **Automated Logo Retrieval**: Automatically retrieve high-resolution company branding logos for both suppliers and publishers with a single click.
- **Dynamic Dropdown Synchronization**: Global alphabetical synchronization of supplier and platform dropdowns across all inventory modals and view filters.
- **Platform Analytics**: Summary metrics tracking channel counts, active inventory, top platform by volume, and top platform by profit.

### 7. AI Merchant Assistant (Gemini & OpenAI)
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

Current Release: **v2.1.3** (2026-09-21)
