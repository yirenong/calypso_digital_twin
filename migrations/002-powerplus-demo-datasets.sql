CREATE TABLE IF NOT EXISTS calypso_demo_datasets (
  account_id text NOT NULL REFERENCES calypso_accounts(id) ON DELETE CASCADE,
  dataset_id text NOT NULL,
  payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (account_id, dataset_id)
);
