ALTER TABLE calypso_accounts DROP CONSTRAINT IF EXISTS calypso_accounts_id_check;
ALTER TABLE calypso_accounts ADD CONSTRAINT calypso_accounts_id_check
  CHECK (id IN ('ST-Admin', 'PowerPlus-Admin', 'SMM-Midland-Admin'));
