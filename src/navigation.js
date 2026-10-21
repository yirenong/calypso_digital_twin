export const navigation = [
  { id: 'dashboard', path: '/dashboard', label: 'Dashboard', icon: 'table-cells-large' },
  { id: 'building', path: '/building-management', label: 'BMS', icon: 'building' },
  { id: 'energy', path: '/energy-management', label: 'Energy Management', icon: 'bolt' },
  { id: 'water', path: '/water-management', label: 'Water Management', icon: 'droplet' },
  { id: 'security', path: '/security-cctv', label: 'Security and CCTV', icon: 'shield-halved' },
]

export const powerPlusNavigation = [
  { id: 'pp-air', path: '/adaptive-ac', label: 'Adaptive AC', icon: 'wind' },
  { id: 'pp-operational', path: '/building-operations', label: 'Building operations', icon: 'gauge-high', requirement: 'IN2.1 (iii) a' },
  { id: 'pp-managerial', path: '/powerplus/managerial', label: 'Managerial dashboard', icon: 'chart-line', requirement: 'IN2.1 (iii) b' },
  { id: 'pp-tenants', path: '/powerplus/tenant-energy', label: 'Tenant energy', icon: 'building-user', requirement: 'IN3.3 (i)' },
]

export const powerPlusSections = [
  { id: 'pp-open', path: '/building-management', label: 'Open BMS & assets', requirement: 'IN2.1 (iv), (vi)' },
  ...powerPlusNavigation,
]

export function navigationForAccount(account) {
  return account === 'PowerPlus-Admin' ? [...navigation, ...powerPlusNavigation] : navigation
}
