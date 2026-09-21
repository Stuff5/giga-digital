# Changelog

All notable changes to GameVault (Key Merchant Pro) will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
