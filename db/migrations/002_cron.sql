-- ============================================================
-- SiPrima - cron API untuk Google Apps Script
-- ============================================================

-- +migrate Up

CREATE TABLE cron_api_keys (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(120) NOT NULL,
  key_hash CHAR(64) NOT NULL,
  allowed_jobs JSON NULL,
  last_used_at DATETIME(3) NULL,
  last_used_ip VARCHAR(45) NOT NULL DEFAULT '',
  revoked_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_cron_api_keys_hash (key_hash),
  KEY idx_cron_api_keys_revoked (revoked_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE cron_jobs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  job_name VARCHAR(80) NOT NULL,
  enabled TINYINT(1) NOT NULL DEFAULT 1,
  schedule_note VARCHAR(200) NOT NULL DEFAULT '',
  config JSON NULL,
  last_run_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_cron_jobs_name (job_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE cron_runs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  run_id CHAR(36) NOT NULL,
  job_name VARCHAR(80) NOT NULL,
  status ENUM('queued','running','success','failed') NOT NULL DEFAULT 'queued',
  trigger_type ENUM('appscript','manual') NOT NULL DEFAULT 'appscript',
  started_at DATETIME(3) NULL,
  finished_at DATETIME(3) NULL,
  duration_ms INT UNSIGNED NULL,
  result JSON NULL,
  error_message TEXT NULL,
  caller_ip VARCHAR(45) NOT NULL DEFAULT '',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_cron_runs_run_id (run_id),
  KEY idx_cron_runs_job_time (job_name, created_at),
  KEY idx_cron_runs_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- +migrate Down

DROP TABLE IF EXISTS cron_runs;
DROP TABLE IF EXISTS cron_jobs;
DROP TABLE IF EXISTS cron_api_keys;
