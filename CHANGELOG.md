# Changelog

All notable changes to GameVault (Key Merchant Pro) will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [v1.9.0] - 2026-09-16

### Added
- **Official Steam Rating & Review Pills**: Compact sentiment rating pills embedded in game cards (Gallery mode) and table rows (Catalog Entries). Features color-coded sentiment tiers (Overwhelmingly/Very Positive, Mostly Positive, Mixed, Negative), positive percentage (e.g. `98%`), formatted review quantity (e.g. `(211k)`), and direct click-through to Steam Store pages.
- **Dedicated Steam Ratings Enricher Tool**: Batch enrichment utility in Settings &rarr; Data Tools & Utilities that processes all 1,271 catalog games from A to Z with real-time progress bars, title status, and statistics (Total, Rated, Missing).
- **Circuit Breaker & Rate Limit Engine**: Complies with CheapShark's strict 60 req/min rate limit via 1,300ms inter-request spacing and automatic 65-second cooldown pauses on HTTP 429 errors with live UI countdowns.
- **Automatic Poisoned Cache Purge**: Added startup migration (`gv_cleaned_poisoned_reviews_v1`) and a manual "Clean Cache" button to purge empty or throttled placeholder records (`percent: null`).
- **Direct Steam App ID Resolution**: Extracts App IDs directly from game artwork URLs (`/apps/(\d+)/`), enabling single-call precision review lookups.
- **Percentage Sorting & Filtering**: Added multi-metric sorting and range filtering in the Catalog Entries view by **Steam Rating %**, **Profit Margin %**, and **ROI %**.
- **Supplier Logo Retrieval Tool**: Added a one-click branding retrieval button for each supplier in the Suppliers view.
- **Continuous Catalog Artwork Fetcher**: Removed the 100-item batch limitation to allow full catalog artwork runs with responsive stop controls and backoff cooldowns.
- **Gemini 2.5 Flash Assistant Integration**: Added diagnostic model discovery and support for Google's `gemini-2.5-flash` model.

---

## [v1.8.1] - 2026-09-12

### Added
- **Full-Scale Cloud Pagination**: Implemented range-based chunked parallel querying in `supabaseFetchAll`, overcoming PostgREST's default 1,000-row limit to fetch complete sales and inventory datasets (restoring all 8,800+ transactions through 2026).
- **Database Row-Count Integrity Verification**: Automatic verification comparing received records against exact database header counts, accompanied by a real-time navbar cloud sync badge.
- **Spreadsheet View Layout Containment**: Fixed flexbox layout blowout in Finance &rarr; Monthly Ledger Breakdown spreadsheet mode, introducing contained horizontal scrolling and a sticky "Metric" column.
- **Precomputed Stock Indexing**: High-performance hash-indexed memoization for stock status lookups, ensuring instant rendering and smooth scrolling across 9,000+ catalog and sales entries.

---

## [v1.8.0] - 2026-09-08

### Added
- **Bidirectional Merge Cloud Sync**: Compares local and cloud items by ID, performs a non-destructive merge, and syncs updates in batch sizes of 200 to prevent payload limitations.
- **Persistent Login Sessions ("Remember Me")**: Replaced volatile sessions with localStorage sliding-window timestamps, allowing users to stay logged in permanently across page refreshes.
- **Anti-Flicker Asynchronous Startup**: Integrated an async page-loader screen that waits for cloud database sync to resolve before rendering the dashboard.
- **Auto-Seeding Removal & Shadow Profiles**: Disabled database auto-seeding on clean connections, and added automatic local profile mapping on cloud auth login.

---

## [v1.7.3] - 2026-08-30

### Added
- **Unique Hashed Gradients**: Dynamic gradient cover backgrounds computed from game title characters, colorizing empty image placeholders across all lists and gallery views.
- **Micro ROI & Margin Bars**: Thin, responsive horizontal visual indicators under ROI/Margin percentages in Catalog and Publishers tables.
- **Pulsing Low-Stock Alerts**: Soft warning pulsation animation highlighting product shortages requiring re-orders.
- **Sidebar Dispute Badge**: Pulsing dispute notification counter next to the Sales Ledger navigation link whenever active customer disputes exist.

---

## [v1.7.2] - 2026-08-25

### Changed
- **Javascript Codebase Splits**: Divided monolithic 18k lines of `app.js` into modular files under `src/` (`state.js`, `api.js`, `charts.js`, `ui.js`, `ai.js`, `importer.js`).
- **HTML Modals and Help Extraction**: Extracted static settings forms, manuals, and dialog boxes into external templates dynamically loaded and cached at startup.
- **Offline Fallback Systems**: Implemented CORS local file indicators warning users of local system loading constraints when loading from `file://` protocol.

---

## [v1.7.1] - 2026-08-18

### Added
- **Catalog Entries Gallery View**: Aggregated product-level poster card gallery layout inside the Catalog tab (Table vs Gallery toggle).
- **Ending Inventory Asset Valuations**: Automatically computes unsold stock counts and purchase cost values on period closing dates across all Monthly Ledger Breakdown layout views.
- **Dedicated Bestseller Widgets**: Replaced single legacy widget with three specialized widgets: *Top Bestselling Games (Net Profit)*, *Top Bestselling Games (Revenue)*, and *Top Bestselling Games (Sales Volume)*.
- **Yearly Benchmark Splits**: Mode toggle to compare total finance sums against monthly averages with dual gradient highlights.

---

## [v1.6.0] - 2026-08-01

### Added
- **Finance Grid Column Spanning**: Resize any of the 5 consolidated Finance view chart cards to span 1, 2, or 3 columns in the grid.
- **Platforms Metrics Summary**: Summary card row at top of Platforms tab tracking configured channel counts, keys in stock, top platform by volume, and top platform by profit.
- **Interactive Form Logo Previews**: Live preview boxes inside Add and Edit Platform forms rendering thumbnails instantly upon URL paste or file upload.

---

## [v1.5.0] - 2026-07-20

### Added
- **Inventory Stock Aging Widget**: Segments available unsold keys into four distinct age categories (Fresh, Aging, Stale, Very Stale).
- **Finances Outflow Allocation**: Allocation doughnut chart grouping key purchase costs and operational overhead payouts by category.
- **Turnover Timeline Enhancements**: Added "This Month" configuration timeframe filter.
