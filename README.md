# Calypso Digital Twin

A standalone Vue 3 + Vite project based on the Cavill/Calypso demo's navy sidebar, dark dashboard, KPI cards and charts. The original demo remains untouched.

## Run

```sh
npm install
npm run dev
```

Open http://127.0.0.1:5175. Use `npm run build` for production, `npm run preview` to preview that build, and `npm test` for the data contract and saved-layout checks.

`npm run test:ui` runs browser checks for saved layouts, cancellation, filtering, shared data updates, the blank twin tab, and responsive layouts. It uses installed Google Chrome; alternatively install Playwright Chromium and remove `channel: 'chrome'` from `playwright.config.js`.

## Included

- Dashboard tabs: **My dashboard** and an intentionally blank **Digital Twin** panel.
- Customize: drag cards to any grid position, resize width/height from the lower-right corner, or use **Size** to enter exact column, row, width and height. Neighboring cards move aside automatically. Use **Undo**, **Redo**, **Tidy layout**, **Reset layout**, **Cancel**, and **Save dashboard**. **Find widgets** still opens the searchable library with favorites first. Saved layouts belong to this browser and origin; changes remain drafts until Save is clicked.
- The dashboard uses a 12-column grid with 32px row units and minimum sizes that keep each widget usable. Drag handles support arrow keys; Ctrl/Cmd+Z and Ctrl/Cmd+Shift+Z (or Ctrl+Y) undo/redo outside text fields. Tidy closes gaps; free placement otherwise keeps intentional empty spaces. Small screens use a stacked view and preserve the desktop arrangement on save. Old saved widget lists migrate to positions automatically. System pages retain fixed layouts.
- Dragging/resizing keeps the same grid instance. Neighboring cards transition into position; the active card follows the pointer without a transition. Layout history records once on release, and charts use their existing canvas as a lightweight resize preview before redrawing at the final dimensions.
- Adding cards during customization appends them below the current arrangement. Existing positions and sizes stay intact at desktop, tablet and mobile widths; adding/removing widgets does not reload or rescale the whole grid.
- Sidebar: Dashboard, BMS, Energy Management, Water Management, Security and CCTV.
- Management pages use fixed widget layouts. Star any KPI, chart or equipment table at its top right to favorite it locally. On the dashboard, **Find widgets** opens the library with favorites first; search by title/system or filter to **Favorites**. Existing dashboard widgets show **Added** and cannot be duplicated. Adding a widget starts a draft; click **Save dashboard** to keep it. Unfavoriting a widget does not remove it from the dashboard.
- Three illustrative blocks, a small equipment inventory, per-block filters, line/bar charts and a block table.
- Compact KPI cards and separate chart rows on fixed management pages. Every chart has independent Hourly, Daily, Weekly, Monthly and Yearly controls, period totals, date ranges and unit labels. Block comparison bars use totals from the selected history window.
- Energy Management includes today's consumption, month-to-date energy, peak demand (highest hourly average in kW) and average daily energy. These cards respect the block filter and can be favorited/added to the dashboard.
- Every chart has **From**/**To** and **Apply** controls. Hourly uses date/time at whole hours; Daily uses dates; Weekly uses ISO weeks starting Monday; Monthly uses months; Yearly uses years. Both endpoints are inclusive. Selections are retained per period while that chart is mounted. Invalid ranges keep the last applied chart; ranges without records display an empty state. **Reset** restores all available data for the active period. Available sample-history bounds are shown beneath the inputs. KPI cards remain independent of individual chart ranges.
- Responsive navigation and a light/dark theme toggle. Local development supports demo sign-in; production uses the account backend described below.

## Separate pages

Each section has its own Vue page component in `src/pages` and a Vue Router address:

| Page | URL |
| --- | --- |
| Dashboard | `/dashboard` |
| Digital Twin (blank for now) | `/dashboard/digital-twin` |
| BMS | `/building-management` |
| Energy Management | `/energy-management` |
| Water Management | `/water-management` |
| Security and CCTV | `/security-cctv` |

Direct links, refresh, and browser Back/Forward work locally. The root URL redirects to Dashboard. For production hosting, configure your server to serve `index.html` for application routes; static media paths should serve their actual files. The sidebar and shared data/settings remain common to all pages.

## CCTV demo

Security and CCTV includes a full-width **CCTV monitor**: local animated lobby and car-park clips, camera selection, play/pause, fullscreen, and a sample offline camera. The viewer respects the block filter and can be starred and added to the dashboard. All footage is visibly labeled as simulated demo footage.

The bundled clips are `public/media/cctv-lobby.webm` and `public/media/cctv-parking.webm`; no internet media service is required. `scripts/generate-cctv-demo.mjs` generates these silent eight-second illustrations with Playwright/Chrome (`node scripts/generate-cctv-demo.mjs`). Camera definitions are in `projectData.cameras` inside `public/calypso-data.js`. Change `source` to your own browser-playable WebM/MP4 URL to supply different demo footage. Production camera protocols such as RTSP need a browser-compatible streaming bridge. The four preview entries are a small sample inventory; building KPI counts include additional cameras.

## System reports

Click **Generate report** on BMS, Energy Management, Water Management, or Security and CCTV. Choose a block scope, enter a title and optional analyst notes, then generate a local report preview. Energy/Water support all five intervals with inclusive From/To filters and optional detailed readings. Changing settings disables exports until the report is regenerated, so downloaded output always matches the preview settings.

- **Energy / Water:** executive metrics, consumption profile chart, block shares and rankings, peak intervals, previous same-count interval comparison when earlier data exists, hourly operating/overnight groupings, interval tables, findings and recommended follow-up.
- **BMS:** temperature and occupancy snapshots, building-level readings, sample equipment status exceptions and inventory, with the limits of the available data stated explicitly.
- **Security/CCTV:** current online/offline counts, snapshot availability, block-level breakdown, sample camera-view status and CCTV equipment inventory. Preview camera counts are a subset of building camera totals; no historical uptime or incidents are inferred from demo clips.

Use **Download PDF** for a direct, paginated A4 report with the consumption chart, tables and page numbers, or **Download Excel** for a formatted `.xlsx` workbook with three consolidated worksheets: Report summary (KPIs and a snapshot chart), Detailed data (filterable tables), and Review and methodology (findings, actions, notes and coverage). Numeric values remain numeric, and table sheets have filters and frozen headers. Both exports run locally and load their export libraries only when needed.

Every system report includes interval and From/To controls. The selected endpoints appear explicitly in the preview, PDF, Excel overview, and downloaded filenames. Energy/Water exports always include every requested interval, location readings, and an adjacent-interval comparison table with absolute and percentage changes. Both endpoints are inclusive; missing data and zero-baseline percentage changes remain unavailable. Weekly rows include the ISO week and its Monday start date. Energy/Water data is filtered to that range. BMS/Security record it as a requested reporting window and clearly label their values as current snapshots until historical readings/events are connected.

Download **HTML** (a self-contained report with charts), **CSV** (report metadata and data tables), or **JSON** (structured report snapshot). **Print / Save PDF** also remains available for browser printing. Reports are not automatically stored; download them to retain a copy. Generation timestamps are shown in Singapore time; sample consumption buckets use UTC.

Report calculations and export formatting live in `src/reports.js`; the generator UI is `src/components/SystemReport.vue`. All findings are deterministic calculations or explicitly labeled follow-up suggestions based on the currently connected demo data. Cost, emissions, normalized building intensity, historical occupancy/temperature, incidents and retention require additional actual data before those sections can be reported.

## Connect your 3D project

The standalone ES module is **public/calypso-data.js**. Vite serves it at `/calypso-data.js` and copies it to the production output. You can copy/import the same module in a separate project. Edit the sample values and rename `modelNode` to match your actual 3D scene nodes. Block `id` and asset `id` are stable integration keys; assets link to blocks with `blockId`.

```js
import { projectData, getBlock, updateBlock, subscribeData } from '/calypso-data.js'

const block = getBlock('block-a')
const object = scene.getObjectByName(block.modelNode) // e.g. Three.js
if (object) object.userData.telemetry = { ...block }

// Feed readings from your own API or sensor connection.
updateBlock('block-a', { energyKwh: 1300, temperatureC: 24.1 })

const unsubscribe = subscribeData(data => {
  for (const block of data.blocks) {
    const object = scene.getObjectByName(block.modelNode)
    if (object) object.userData.telemetry = { ...block }
  }
})
// Call unsubscribe() when your viewer is destroyed.
```

`updateBlock` validates numeric readings and notifies Vue immediately when both viewer and dashboard import the same module URL in the same page. Separate pages/apps have separate memory; use your own API, WebSocket, or postMessage bridge and call `updateBlock` in each app. Telemetry updates are in memory; only dashboard layouts are stored locally. Sample chart histories are in `projectData.trends`, grouped by block ID, and can be replaced with actual histories before publishing. The demo does not simulate live sensor readings or play CCTV streams.

Chart histories now live in `projectData.trends.periods.hourly` (and `daily`, `weekly`, `monthly`, `yearly`). Each period has `labels`, `rangeLabel`, `bucketLabel`, `note`, and `energy`/`water` arrays keyed by block ID. Labels use ISO hour/day/week-start/month/year keys. Demo data is anchored to **12 October 2026**: 24 hourly samples for that day, daily totals for the month to date, 12 Monday-based weekly totals, monthly totals for the year to date, and five annual totals. Partial periods are labeled. `public/calypso-data.js` builds deterministic samples and exports `aggregateRecords(records, period)` for UTC grouping. Replace the samples with actual readings aggregated for your site's timezone.

Use `updateTrendPeriod('daily', { labels, energy, water, rangeLabel, note })` from `calypso-data.js` to replace history and update charts immediately. Each block must have one numeric value per label in both energy and water; updates are validated before applying. `updateBlock` updates current KPIs separately from historical series. Legacy `trends.labels`, `trends.energy`, and `trends.water` remain available for existing integrations; charts use the new period data.

Widget definitions are in `src/dashboard.js`. Add a KPI entry with a numeric `field`, or a chart with a `series` matching the shared period data. No large source-demo data exports or databases were copied.

Water Management includes eight KPI cards, a date-filtered block consumption chart, current pressure/tank/meter readings and a sample communication alert. These fields are in public/calypso-data.js and can be updated through updateBlock for the 3D integration. Water reports export current operational readings separately from date-filtered consumption history.

Thresholds and notifications
Each overview has a Thresholds & alerts link to its own routed page; Dashboard offers all system rules. Rules are checked per block, with strict above/below limits, and are disabled initially. Settings and the latest 100 notification records save in browser localStorage. A fresh breach creates an in-app alert immediately; active breaches repeat at the configured reminder interval, defaulting to three minutes. Cooldown timestamps persist locally across refresh, and each active breach resumes its remaining wait. Monitoring runs while the app is open and responds to the shared calypso-data.js updateBlock API.
Sound uses a synthesized Web Audio chime and requires activation after refresh; Test notification previews it. Sound preference applies across systems. Desktop notifications are optional, need browser permission, and are enabled per session. No backend monitoring or closed-browser delivery is provided.

Individual sensor pages
Energy and Water overviews link to /energy-management/sensors and /water-management/sensors. The demo includes six energy meters and eleven water meters. Search, block and health filters support individual inspection, consumption today, current usage rate, cumulative totalizer, last communication, fault diagnostics and date-filtered histories for all five periods. Offline/faulty current rates are unavailable; retained demo consumption is marked last recorded. Sensor health is independent of configured block thresholds.
Sensor history is explicitly allocated from block demo history, not measured telemetry. Current health does not erase historical samples. Individual sensors measure usage; generation and production are not supplied. getSensor(id), updateSensor(id, readings) and updateSensorHistory(id, period, { labels, values, rangeLabel, note }) are exported from public/calypso-data.js. updateSensor accepts rate (or null), today, cumulative, expectedMaxRate, online, faultCode (or null), faultDetail and lastSeen (ISO timestamp with timezone). These calls notify subscribed UI and 3D consumers without overwriting block aggregates; update block summaries separately through updateBlock.

Individual sensor thresholds
Threshold pages now use aligned rows and separate Block thresholds / Sensor thresholds tabs. Energy, Water and Dashboard allow adding per-meter rules for current rate, day-to-date consumption, offline state and reported fault state. Each sensor can have one rule per metric, with independent limit, comparison and enable switch. State values are 0 (connected/no reported fault) and 1 (offline/reported fault); Above 0 alerts on that condition. Existing block settings are retained. Sensor rules are saved in the same local settings and participate in notification history, sound and interval-based reminders. Unavailable or retained offline/faulty usage readings do not trigger numeric consumption/rate alerts; configure state rules to monitor those conditions.

Notification reminder interval
Thresholds & alerts > Notification delivery includes a global 1-60 minute setting (default 3). Save thresholds applies it. Each block/sensor breach alerts immediately the first time, then repeats while active. The most recent notification timestamp is stored separately from history so refresh and Clear history do not reset the cooldown. Recovery stops reminders; a recurrence within the cooldown waits for the existing deadline. A refresh after the interval has elapsed sends one current reminder, without replaying missed reminders. Changing the interval recalculates deadlines from the latest alert. Sound follows the same reminders and still requires browser activation after refresh. Monitoring runs while the workspace is open; browser background throttling may delay reminders.

Configured site systems and locations
The supplied site hierarchy is Levels 1-5 plus Landscape. public/calypso-data.js is the authoritative editable configuration: Air Duct and HVAC on Levels 1-3; Chiller Plant and HVAC Pump on Level 1; Cooling Tower on Level 4; Waste water and Water Supply on Levels 1-3. No systems are assigned to Level 5 or Landscape. Energy equipment and BMS inventories show these assignments, and sensor pages can filter by location and system. Numeric readings and meter counts are demo examples, not supplied site telemetry.
The demo now has nine energy meters and twelve water meters. Sensor names are editable in public/calypso-data.js or through updateSensor(id, { name: 'New name' }). System IDs, locationIds, systemName and modelNode are included for 3D integration. The public blocks/blockId APIs retain legacy names for compatibility; block-a, block-b and block-c now refer to Level 1, Level 2 and Level 3 respectively. Remaining location IDs are level-4, level-5 and landscape. Public projectData.locations contains all six locations; projectData.systems contains exact system assignments. Null readings mean unavailable; Energy/Water reports exclude unconfigured locations rather than inventing consumption.

All project data is now consolidated in public/calypso-data.js: locations, system assignments, sensor definitions, camera sources, demo readings, history generation and integration APIs. It has no imports or dependencies on other local data modules. Import that single URL in your 3D project. Existing exports remain available.
# Local Unity visualiser

The exported build in `src/components/Visualiser` is served at `/visualiser/index.html`.
`visualiser-plugin.js` serves it in Vite development/preview and copies its `index.html`,
`Build`, and optional `StreamingAssets` folders into `dist/visualiser` during builds.
The Python/batch server helpers are not published. Gzip and WebAssembly headers are
configured for both local serving and Vercel in `vercel.json`.
Replace the exported files in that source folder and rebuild to update Unity.
The dashboard iframe, new-tab link, and command origin use the local deployment URL.


## Accounts and backend storage

Both **ST-Admin** and **PowerPlus-Admin** have all current pages and items. Vercel production builds require server sign-in; browser session values cannot grant backend access. Each account has its own dashboard layout, Digital Twin layouts and selected screen, favorites, thresholds, reminder interval, notification history/timers, theme and location filter. Building telemetry remains shared demo data.

Favorites and workspace selections sync automatically. Layout drafts sync after **Save dashboard** / **Save layout**; thresholds sync after **Save thresholds**. The header shows **Saving to account?**, **Saved to account**, or a connection error. Failed writes stay queued in the current browser and retry automatically (or click the status). Sign-out waits for queued changes. Saved preferences load before the workspace renders on every sign-in or refresh, including on a new device. If two devices edit the same setting, the last successful save wins; refresh to load another device's latest changes. Notification delivery still runs while the workspace is open; browser permissions and audio activation remain device-specific.

Existing browser settings are imported only for settings absent from that account's backend. Existing unprefixed settings belong to ST-Admin. Once a server value exists, it takes precedence over an unchanged local cache. Browser storage holds a cache and a retry queue; the database is the persistent account store. A backend loading error shows a Retry screen rather than loading stale defaults.

### Vercel deployment

The backend consists of Node functions at `/api/auth` and `/api/settings` and Postgres on Neon. Vercel serves the existing Vue/Vite frontend and the API functions together. Functions and the database are configured in Singapore. The API rewrite is excluded from the SPA fallback.

1. In your Vercel project's **Settings ? Environment Variables**, add **DATABASE_URL**, using the pooled connection from your local `.env.backend.local`. Set it for the production environment and redeploy this code. Preview environments should use a separate Neon branch and its own DATABASE_URL. Never prefix database credentials with VITE_.
2. The Calypso database has already been provisioned and initialized. Account passwords are generated separately and stored in the Git-ignored local file `.env.account-credentials`. Production does **not** accept the demo password `admin`.
3. After deployment, sign in, save a favorite or layout, then sign in from another browser to confirm restoration. No database credential belongs in the browser bundle.

No Vercel deployment was performed from this workspace. The local environment and credential files are ignored by Git and must not be committed.

### Local development

- `npm run dev`: browser-only demo mode on port 5175. Both usernames use password `admin` in this mode only.
- `npm run dev:backend`: the real API and database on port 5176, using `.env.backend.local` and the generated account passwords.
- New database setup: copy `.env.example` to `.env.backend.local`, set the pooled DATABASE_URL and optional direct DATABASE_URL_DIRECT, then run `npm run backend:setup`. This applies `migrations/001-account-settings.sql` and creates missing accounts with scrypt password hashes. Existing accounts are preserved. New credentials are written once using exclusive file creation to avoid overwriting credentials.
- `npm test` checks data contracts, authentication helpers, and account storage separation.
- `npm run test:backend` and `npm run test:backend:ui` use a separate test branch. Configure its URL in `.env.backend-test.local` with `VITE_ACCOUNT_BACKEND=true` and `CALYPSO_TEST_DATABASE=true`. These tests clear the test branch's Calypso settings, sessions and rate limits. Never point them at production.

Sessions use random, database-backed tokens in HttpOnly, SameSite cookies, with a seven-day expiry and revocation on sign-out. API writes check request origin, restrict accepted setting keys and payload sizes, and derive the account from the session. Sign-in throttling is stored in Postgres so it works across function instances. The app uses node-postgres pooling with Vercel's connection lifecycle helper, following the [Neon Vercel connection guide](https://neon.com/docs/guides/vercel-connection-methods).

## PowerPlus sustainability workspace

The eight-page NTU One-North BMS requirements supplied by the user are applied to **PowerPlus-Admin only**. All original pages remain available to both accounts. ST-Admin cannot open the PowerPlus routes, write PowerPlus settings, or access its read-only building-data API. New PowerPlus forms use the existing account sync service and require the Vercel backend deployment described above for cross-device saving.

| PDF section | PowerPlus page | Implemented behavior / remaining connection |
| --- | --- | --- |
| IN2.1 (iii) a | /dashboard | Available sample energy by system and electricity profile; assigned work orders with status and timestamp history. TSE uses 24 synchronized backend demo samples, with component power, cooling load, chilled-water flow and temperatures. |
| IN2.1 (iii) b | /powerplus/managerial | GFA/NLA profile, sample annual EUI, electricity/water history and MTTR from resolved failure records. Partial-year EUI is labeled YTD. MTBF and fallback MTTR use a labeled demo reliability sample until operational failure records are available. |
| IN3.1 (ii) | /energy-management (Adaptive AC section) | Environmental sample inputs, landlord area and adaptive coverage, performance targets, contract reference and M&V plan. At least 85% coverage is shown as the PDF target. No equipment control or adaptive optimization is commissioned. |
| IN3.3 (i) | /powerplus/tenant-energy | Tenant/meter assignments, unique meter ownership, NLA coverage, allocated sample histories, adjacent-period comparisons and tenant report downloads. At least 50% NLA is shown as the PDF target. Separate tenant identities, live meters and verified baselines are not connected. |
| IN2.1 (iv), (vi) | /building-management (Open BMS & assets section) | Protocol/gateway configuration register, searchable proposed point names, equipment relationship export, read-only authenticated JSON API and handover/training document links. Protocol adapters, controller/register schedules, validated Brick/Haystack/RealEstateCore mappings and contractual owner access require source information. |

These pages support configuration and workflow review; they do not certify the building against the PDF or claim live control. All building telemetry remains the existing illustrative Calypso dataset, with NTU One-North as the PowerPlus profile label until actual site data is supplied. Feedback, work orders and bookings begin empty. Three illustrative tenants (Demo tenant A, B and C) are created once using healthy energy meters from Levels 1?3, with sample floor areas. Existing meter assignments are preserved; deleting demo tenants does not recreate them on refresh.

The read-only API at /api/powerplus documents its resources at the base URL. GET ?resource=assets returns the relationship draft and GET ?resource=points returns point metadata. Both require a PowerPlus server session; sample metadata is static on the server and does not mirror browser-only telemetry mutations.

PowerPlus Dashboard opens the customizable widget layout at `/dashboard`, with exactly two tabs: Dashboard and Digital Twin. Building operations and ACMV details are available at `/building-operations`. Cards across the management pages can be starred, found with the Favorites filter in the widget library, and added to a saved Dashboard layout. The legacy `/dashboard/widgets` address redirects to `/dashboard`; the Digital Twin remains at `/dashboard/digital-twin`. Adaptive AC is integrated into Energy Management, and Open BMS & assets into BMS. The previous three standalone addresses redirect to those pages. Data disclosure has been removed, including its menu entry, route, UI and export helper.

## PowerPlus backend demo telemetry

`npm run backend:seed-demo` applies `migrations/002-powerplus-demo-datasets.sql` and stores the PowerPlus-only simulated dataset in `calypso_demo_datasets`. It preserves existing telemetry and adds the full building snapshot only when absent. The database now contains the locations, systems, equipment, all 21 energy/water sensors, their histories, cameras, and 24 synchronized ACMV samples. Production PowerPlus loads this snapshot through authenticated `GET /api/powerplus?resource=telemetry` before rendering. A backend error is shown with a Retry action; production does not silently replace unavailable backend readings with local fixtures. ST cannot access this dataset.

The latest ACMV snapshot is 12 October 2026, 18:00 SGT: chillers 125 kW, chilled-water pumps 18 kW, condenser-water pumps 12 kW, cooling towers 10 kW and air distribution 15 kW. Total electrical power is 180 kW, cooling load is 250 RT, and instantaneous TSE is **0.72 kW/RT**. Every component and cooling reading has the same timestamp. Cooling is consistent with 6.5 ?C supply, 12 ?C return and the stored water flow. The period metric uses total kWh divided by total RTh, rather than an arithmetic mean of ratios. Missing components, invalid quality, mismatched timestamps and zero cooling load cannot produce a valid efficiency. The water-plus-air calculation follows [BCA energy technical guidance](https://www1.bca.gov.sg/docs/default-source/docs-corp-buildsg/sustainability/20240827_energy-technical-guide_r2-1.pdf?sfvrsn=d8b931ea_0); the numbers are generated examples, not a compliance result.

The dataset also supplies editable demo defaults: 16,000 m? GFA, 10,000 m? NLA, 12,000 m? landlord AC area with 10,800 m? adaptive coverage, CO?/humidity/outdoor-weather values and control setpoints. Reliability examples use 1,000 operating hours, two failures and repairs of three/five hours, producing 500 h MTBF and 4 h MTTR. Existing saved nonempty configuration values are preserved, and real resolved failure records take precedence for MTTR. All examples remain clearly labeled as simulated; no live equipment control is connected.

The existing Calypso historical consumption and ACMV sample window are separate illustrative profiles; the ACMV window ends at 18:00 SGT and is explicitly labeled. Deployment still requires the Vercel setup above. For a new database, run `npm run backend:setup` followed by `npm run backend:seed-demo`. Before backend integration tests, run the seed script with `.env.backend-test.local` so only the isolated test branch is initialized.

Feedback/service and Community pages, navigation and active settings have been removed from PowerPlus. Existing stored records are retained in the database but have no active UI. Both account sidebars display the official BCA Green Mark artwork in a non-clickable badge showing only **Green Mark Certification**, without a status line. The JPEG is sourced from https://file.go.gov.sg/green-mark-logo-jpeg-format.jpg and is stored locally as public/green-mark-logo.jpg.

Visible demo wording is removed across both accounts, including login, headers, sensors, CCTV, charts, reports and PowerPlus pages. Legacy fixture labels from saved preferences or backend snapshots are cleaned for display without changing identifiers. The Green Mark badge has no approval/status text and no link.

## PowerPlus monitoring and AC controls

PowerPlus defaults include customizable cards for Total System Efficiency (TSE), total electricity, total water, waste, rooftop renewable generation, ACMV electricity, lighting electricity and lifts/escalators electricity. Existing layouts receive these cards once, preserving other positions; the camera KPI is replaced with TSE where present. Further customizations remain saved, including removal of a card. Reset layout restores the PowerPlus defaults. ST retains its existing default layout and widget library.

The persisted sustainability snapshot reports 3,280 kWh electricity, 92.1 m3 water, 185 kg waste and 420 kWh rooftop solar for 12 October 2026. End uses reconcile to electricity: ACMV 2,296 kWh, lighting 656 kWh and lifts/escalators 328 kWh. Solar generation is separate from consumption. Location filters scope these snapshot cards; TSE is explicitly site-wide. Missing collection measurements remain unavailable, rather than being fabricated as zero. The seed command adds this snapshot only if absent.

Energy Management includes the Adaptive AC Control System. Apply controls changes a simulated plant immediately; one modeled minute advances every five seconds while running. Controls cover on/off, Adaptive/Manual mode, zone temperature (20?28 C), manual fan speed (20?100%), fresh-air damper (10?100%), CO2 target (600?1,200 ppm), occupancy (0?100%) and outdoor temperature (20?40 C). Adaptive fan demand responds to temperature and CO2; modeled cooling load responds to occupancy, weather and zone setpoint. Fan electrical demand follows a cubic speed approximation. Off means zero plant power/cooling and no defined kW/RT ratio. Pause, resume and reset controls are available. The current simulated TSE is shared with the dashboard card. Applied settings persist through the existing account backend and restore on another device; evolving simulation readings are session-local and do not operate real equipment.

Tenant Energy no longer exposes the participating-tenant form. Existing tenant assignments feed demand, current-day consumption, hourly peak demand, area-normalized intensity, matched-window baseline comparison and an insight message. Charts show the continuously updated simulated demand, interval consumption history and recent versus preceding daily averages. The baseline uses equal-length windows (up to seven days each) and avoids presenting a partial month as an equivalent full month. Offline/faulty meter assignments stop valid live monitoring. Tenant selection and history interval remain available.
