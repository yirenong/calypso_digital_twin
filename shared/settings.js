export const settingKeys = [
  ...['profile', 'workorders', 'tenants', 'tenant-samples', 'tenant-selection', 'integration', 'air', 'ac-control', 'dashboard-metrics'].map(section => `calypso.powerplus.${section}.v1`),
  'calypso.dashboard.v1', 'calypso.favorites.v1', 'calypso.thresholds.v1',
  'calypso.notifications.v1', 'calypso.notification-timers.v1',
  'calypso.twin.active-screen', 'calypso.twin.free-layout.v1',
  'calypso.twin.navigation-visible', 'calypso.twin.favorites.v1',
  'calypso.twin.layout.v1', 'calypso.twin.layout.v2', 'calypso.workspace.v1',
  ...['energy', 'water', 'building', 'security'].map(screen => `calypso.twin.screen.${screen}.v1`),
]
