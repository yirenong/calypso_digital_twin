// Unity names are case-sensitive. Multiple physical assets currently share system readings.
export const twinAssets = {
  'HVAC Pump System - Level 1': 'hvac-pump-level_1',
  'HVAC Pump System 002 - Level 1': 'hvac-pump-level_1',
  'Water Supply System - Level 1': 'water-supply-level_1',
  'Water Supply System - Level 2': 'water-supply-level_2',
  'Water Supply System - Level 3': 'water-supply-level_3',
  'Chiller Plant System 001 - Level 1': 'chiller-plant-level_1',
  'Cooling Tower System - Level 4': 'cooling-tower-level_4',
  'HVAC System - Level 1': 'hvac-level_1',
  'HVAC System - Level 2': 'hvac-level_2',
  'HVAC System - Level 3': 'hvac-level_3',
  'Air Duct System - Level 1': 'air-duct-level_1',
  'Air Duct System - Level 2': 'air-duct-level_2',
  'Air Duct System - Level 3': 'air-duct-level_3',
  'Air Duct System 001 - Level 3': 'air-duct-level_3',
  'Air Duct System 002 - Level 3': 'air-duct-level_3',
}
export function unityAssetName(id) { return Object.keys(twinAssets).find(name => twinAssets[name] === id) }
