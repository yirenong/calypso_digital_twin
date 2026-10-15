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
- Responsive navigation and a light/dark theme toggle. No backend or authentication is required.

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

Use **Download PDF** for a direct, paginated A4 report with the consumption chart, tables and page numbers, or **Download Excel** for a formatted `.xlsx` workbook with separate overview, KPI, findings, actions, details, methodology and notes worksheets. Numeric values remain numeric, and table sheets have filters and frozen headers. Both exports run locally and load their export libraries only when needed.

Every system report includes interval and From/To controls. The selected endpoints appear explicitly in the preview, PDF, Excel overview, and downloaded filenames. Energy/Water data is filtered to that range. BMS/Security record it as a requested reporting window and clearly label their values as current snapshots until historical readings/events are connected.

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
