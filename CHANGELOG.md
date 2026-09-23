# Changelog

All notable changes to GameVault (Key Merchant Pro) will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [v2.2.6] - 2026-09-23

### Added & Improved
- **Live Keys Stock Indicator on Top Bestsellers Widgets**:
  - Added real-time remaining key stock counting and badge indicators to all items in the Dashboard Top 20 Bestselling widgets (Net Profit, Revenue, and Sales Volume).
  - Inspects live inventory state for all available/reserved (unsold and unrejected) keys.
  - Formatted badge indicators with `<i class="fa-solid fa-key"></i>`:
    - Depleted / Zero Stock: highlighted with soft red alert styling (`0 keys in stock`).
    - Low Stock Warning: highlighted with amber warning styling (`X key(s) left (Low)`) when at or below the user-configured low-stock threshold (`state.lowStockThreshold`).
    - Available Stock: formatted with cyan/blue styling (`X key(s) in stock`).
  - Implemented multi-tier smart title matching (exact normalized match, platform/edition tag stripping like `[Steam]` and `(PC)`, and clean prefix matching).
  - High-contrast color overrides added for both Light and Dark theme modes.

---

## [v2.2.5] - 2026-09-23

### Added & Improved
- **Dashboard Top Bestsellers Cover Banner Display**:
  - Upgraded game artwork display across all Top Bestselling games widgets (Net Profit, Revenue, and Sales Volume) from small 64px square crops to high-resolution horizontal cover banners (matching Steam's official 460&times;215 aspect ratio, 150px&times;70px desktop).
  - Preserved complete game logos and titles without edge-clipping or distortion.
  - Added artwork resolution cascade checking sales, inventory, and catalog caches so every game with available artwork renders its cover banner.
  - Added smooth interactive hover zoom on cover images and unique hashed gradient fallback placeholders.
- **Configurable Artwork Style Option**:
  - Added an "Artwork Display" configuration selector in the card-back flip settings of each top bestsellers widget, allowing users to toggle between "Cover Banner (Wide & Clear)" and "Compact Thumbnail (Square 56px)".
  - Added a "Toggle Cover / Thumbnail" action in the 3-dots card actions dropdown menu for immediate 1-click toggling.
- **Direct Catalog Keys Access**:
  - Clicking any bestseller leaderboard item now opens the game's Catalog Keys modal directly from the Dashboard.

---

## [v2.2.4] - 2026-09-22

### Added & Improved
- **Dynamic Supplier Metrics Cards**:
  - Wired all 8 top-level metrics cards in the Suppliers menu (`#suppliers-metrics-grid`: Net Profit, Inventory Cost Value, Total Revenue, ROI %, Available Stock, Sales Velocity, Sell-Through Rate, and Avg Profit per Key) to dynamically recalculate and re-render in real time according to active filters.
  - Added full support for the Date Period Filter button group (`#sup-date-filter-group`: "All Time", "This Month", "This Week", "Today") with robust midnight-aligned date boundary parsing (`parseDateMidnight`) avoiding timezone skew and date object mutations.
  - Added dynamic supplier filtering (`#sup-filter-supplier`) across metrics, the active supplier directory table, and publisher inventory tab breakdowns.
  - Correctly wired `updateUI()` and routing lifecycle hooks so switching to or refreshing the Suppliers view automatically triggers `calculateSupplierMetrics()`.

---

## [v2.2.3] - 2026-09-21

### Fixed
- **Changelog & Help Modal Dismissal**: Resolved an issue where clicking the version number in the sidebar footer opened the changelog modal, but the modal could not be closed using the header `&times;` button, the footer "Got it!" button, or by clicking the backdrop.
- **Multi-Tier Event Delegation**: Added global event delegation in `src/ui.js` for `[data-close-modal]` buttons and modal backdrop clicks so that lazily loaded HTML templates (`templates/help-modal.html`) automatically bind close listeners when dynamically injected into the DOM.
- **Dedicated Modal Handlers**: Enhanced `bindHelpModalEvents()` in `app.js` to explicitly register close listeners and update the `DOM["help-modal"]` element cache upon lazy template insertion, supplemented with direct inline `onclick` handlers on close triggers.
- **Universal Escape Shortcut**: Extended the global <kbd>Escape</kbd> key handler to dismiss all active dialog backdrops promptly.

---

## [v2.2.2] - 2026-09-21

### Added
- **Horizontal Game Cover Banner**: Added a horizontal panoramic cover image banner at the top of the Catalog Keys modal when double-clicking a game entry in the Entries menu (or clicking the dedicated "Keys" action button).
- **Self-Healing Modal DOM Structure**: Added automatic DOM reconciliation for the cover banner container and status badges to guarantee display even if older cached HTML templates are present.

---

## [v2.2.0] - 2026-09-21

### Optimized & Performance
- **Instant Startup (&lt;150ms Boot Time)**: Converted cloud initialization into a non-blocking background task adhering to the modern Stale-While-Revalidate pattern. Cached data from IndexedDB/localStorage renders immediately upon DOM load, dismissing the `#app-loading-screen` instantly without blocking the user on remote Supabase network queries.
- **1.4 MB+ Initial Bundle Elimination**: Removed synchronous SheetJS (`xlsx.full.min.js`, ~1.1 MB) from `<head>` and created an asynchronous on-demand dynamic loader (`ensureSheetJS`). The heavy library is now fetched over CDN only when the user explicitly triggers an Excel export or import. Moved external script tags to the bottom of the body to guarantee non-blocking HTML parsing and instant first paint.
- **O(1) In-Memory Artwork Resolution &amp; Memoization**:
  - Memoized `getCatalogArtworkMap()` in JavaScript heap memory, eliminating thousands of redundant, synchronous `localStorage.getItem` and `JSON.parse` operations during inventory table renders.
  - Replaced quadratic array scans with an in-memory resolution cache (`_resolvedArtCache`) and single-pass $O(N)$ index mapping in `syncInventoryArtworkWithCatalog()`.
  - Removed redundant `syncInventoryArtworkWithCatalog()` execution from `renderInventoryTable()`, completely eliminating typing lag and UI stutter when filtering or searching through large inventory datasets.
  - Pre-indexed supplier lookups in inventory table and grid layout rendering for instant constant-time lookups.
- **Lazy-Loaded Documentation Modal**: Deferred fetching of `templates/help-modal.html` (78 KB) until the user opens the Help center or Changelog, prefetching it during browser idle (`requestIdleCallback`) to optimize initial network transfer while keeping help access instant.
- **Chart.js & Canvas Execution Optimization**: Skipped chart computations and canvas recreations for widgets marked as hidden in `state.widgetSettings`.

---

## [v2.1.6] - 2026-09-21

### Fixed
- **Persistent AI Merchant Assistant Verification**: Resolved an issue where the "AI Merchant Assistant Setup" configuration card in the Settings menu always displayed "Not Verified" after a page reload or hard refresh despite having previously connected.
- **Dynamic Verification State Synchronization**: Added comprehensive status synchronization in `syncAISettingsUI()`, correctly evaluating and restoring the `ai-test-status-badge` and authenticated connection banner on app boot, storage reloads, settings navigation, and cloud database updates.
- **Backward-Compatible Self-Healing**: Existing valid configured API keys automatically self-heal and display verified active status without requiring re-testing, while preserving explicit connection results in persistent storage (`localStorage` & Supabase `app_settings`).
- **Reactive Key Input & Provider Switch Listeners**: Live status feedback immediately reflects key changes, clearing stale verification when keys are edited and restoring active verification status if a verified key or provider is selected.

---

## [v2.1.5] - 2026-09-21

### Fixed
- **Missing Game Cover Images in Inventory View**: Resolved an issue where game keys in the Inventory Table and Grid Card layouts displayed letter initial placeholders instead of fetched game covers. Inventory items now dynamically fall back to the catalog artwork cache (`state.catalogArtwork` / `gv_catalog_artwork`), ensuring complete visual parity with the Entries menu.
- **Smart Multi-Stage Artwork Resolution Cascade**: Introduced `resolveGameArtwork()` to seamlessly identify cover artwork across multiple variations: exact title match, normalized title match (removing brackets, editions, store tags like `[Steam]`, and `(PC)`), prefix match (titles with subtitles before `:` or `-`), and peer key matches from other inventory or sales records.
- **Universal Inventory Artwork Auto-Healing**: Implemented `syncInventoryArtworkWithCatalog()` which runs on application boot, cloud database sync, text list imports, spreadsheet imports, and batch artwork fetches to automatically backfill missing `imageUrl` properties across inventory items.
- **Graceful Image Fallback Handling**: Added native `onerror` fallbacks across table rows, grid cards, modals, and charts, preventing broken image placeholders and cleanly falling back to vibrant initials gradients if an external image CDN fails to load.

---

## [v2.1.4] - 2026-09-21

### Fixed
- **Cross-Browser Password & Credential Synchronization**: Resolved an issue where updating passwords in "My Profile Settings" did not take effect when logging in from another browser or device. User accounts and profile settings are now persistently synchronized to Supabase (`app_settings` with key `"appUsers"`) as well as the active Supabase Auth session.
- **Multi-Device Login Hydration**: Added proactive cloud user synchronization (`syncUsersFromCloud`) on application boot and during login submissions, ensuring secondary browsers and incognito sessions fetch and merge the latest cloud passwords before authenticating.
- **Universal User Storage Sync**: Enhanced `saveUsersToStorage` to automatically replicate user additions, modifications, role assignments, and password recoveries to cloud database storage immediately.

---

## [v2.1.3] - 2026-09-21

### Added
- **Dedicated Raw Inventory Export in Data Tools & Utilities**: Promoted Raw Inventory Export to a prominent standalone card in **Settings &rarr; Data Tools & Utilities** (Section A) alongside Bulk Import, Catalog Artwork Utilities, and Steam Ratings Enricher.
- **Excel (.xlsx) and CSV (.csv) Raw Inventory Downloads**: Integrated SheetJS (`xlsx.full.min.js`) with auto-sized column widths, RFC 4180 CSV generation with UTF-8 BOM encoding for seamless Microsoft Excel compatibility, exporting complete item keys, purchase costs, vendors, platforms, sale prices, and timestamps.
- **Dual Export Access**: Provided access to Raw Inventory Exports in both the primary Data Tools & Utilities grid and the Database Maintenance & Data Exports section.

---

## [v2.1.2] - 2026-09-19

### Enhanced
- **Steam Ratings Enricher Normalization**: Implemented smart multi-stage title normalization in `window.fetchSteamReviewData` that strips regional indicators (`EU`, `RoW`, `NA`, `EMEA`), edition variations (`Anniversary`, `Definitive`, `Reboot`, `Enhanced`, `GOTY`), and punctuation separators, paired with prefix title fallbacks to reliably resolve catalog games.
- **Multi-Candidate Deals & Games Search**: Upgraded CheapShark API lookup from single-candidate inspection (`games[0]`) to multi-candidate evaluation (top 8 candidates), extracting Steam App IDs from candidate objects and directly retrieving authentic Steam rating percentages, counts, and sentiment tiers.
- **Cache Un-Poisoning & Batch Filter Fix**: Resolved the unrated filter trap in `window.triggerBatchFetchReviews` so that "Fetch only unrated games" re-evaluates all games lacking a valid rating (including previously failed ones), accompanied by automatic unrated cache purging (`gv_cleaned_poisoned_reviews_v2`) to allow instant re-enrichment of the entire catalog.

---

## [v2.1.1] - 2026-09-19

### Changed
- **Blank Purchased Price in "Add Digital Game Key" Modal**: Kept the purchase price field empty by default when opening the Add Digital Game Key modal and when selecting title suggestions via autocomplete, preventing accidental pre-filling of prices from previous inventory records and allowing direct manual entry.

---

## [v2.1.0] - 2026-09-19

### Added
- **Platform Key & Sales Reassignment Workflow**: When deleting a platform in the Platforms menu, merchants are now prompted with a dedicated reassignment dialog allowing all active inventory keys and sales records to be seamlessly transferred to another designated platform before deletion, preventing orphaned records and maintaining complete catalog integrity.

---

## [v2.0.1] - 2026-09-19

### Changed
- **Blank Sale Price in "Record Key Sale" Modal**: Kept the sale price field empty by default in the Record Key Sale modal (when launched directly from the Inventory list or selected via autocomplete search inside the dialog), eliminating confusing pre-filled markup calculations and facilitating clean, direct manual price entry.

---

## [v2.0.0] - 2026-09-19

### Added
- **Supplier Key Reassignment Workflow**: When deleting a supplier in the Suppliers view, the system now prompts the user with a dialog to reassign all existing inventory keys to another supplier, preventing orphaned keys and maintaining inventory data integrity.
- **Publisher & Supplier Logo Retrieval**: Added automatic high-resolution branding logo fetching for both suppliers and publishers in the "By Publisher" tab with fallback searches, domain resolutions, and instant previews.
- **App-Wide Dynamic Dropdown Synchronization**: Extracted centralized `populateSupplierDropdowns` and `populatePlatformDropdowns` functions to ensure all modals (Add Game Key, Edit Game) and view filters (Inventory, Sales, Dashboard, Suppliers) are consistently populated in alphabetical order across all views.
- **Catalog Artwork Utility Fixes**: Fixed batch artwork fetching across letters A–Z, resolved variable scope errors (`isSliced`), and enhanced reliability of artwork enrichment runs.

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
