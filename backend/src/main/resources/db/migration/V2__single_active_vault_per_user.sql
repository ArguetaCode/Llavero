WITH ranked_vaults AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY updated_at DESC, created_at DESC) AS position
  FROM remote_vaults
  WHERE deleted_at IS NULL
)
UPDATE remote_vaults
SET deleted_at = NOW()
FROM ranked_vaults
WHERE remote_vaults.id = ranked_vaults.id
  AND ranked_vaults.position > 1;

CREATE UNIQUE INDEX uq_remote_vaults_one_active_per_user
  ON remote_vaults(user_id)
  WHERE deleted_at IS NULL;
