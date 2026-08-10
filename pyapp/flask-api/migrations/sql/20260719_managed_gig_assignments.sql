/* Managed Gig / Assignment System SQL Migration
   Target DB: MySQL / MariaDB
   Safe to run after the existing BitsHustle schema is present.
   This script creates/updates assignment workflow tables and seeds gig roles.

   IMPORTANT:
   Use this file as-is, preserving semicolons. Block comments are used so the
   script is safer when pasted into hosting control panels that collapse lines.
*/

START TRANSACTION;

/* -----------------------------------------------------------------------------
   1) Seed required roles
----------------------------------------------------------------------------- */
INSERT INTO role_types (id, name, display_name, description, sort_order, is_active, created_at, updated_at)
SELECT UUID(), 'CLIENT', 'Client', 'Submits managed gig assignments', 70, 1, UTC_TIMESTAMP(), UTC_TIMESTAMP()
WHERE NOT EXISTS (SELECT 1 FROM role_types WHERE name = 'CLIENT');

INSERT INTO role_types (id, name, display_name, description, sort_order, is_active, created_at, updated_at)
SELECT UUID(), 'ADMIN', 'Gig Admin', 'Reviews and assigns managed gig assignments', 80, 1, UTC_TIMESTAMP(), UTC_TIMESTAMP()
WHERE NOT EXISTS (SELECT 1 FROM role_types WHERE name = 'ADMIN');

INSERT INTO role_types (id, name, display_name, description, sort_order, is_active, created_at, updated_at)
SELECT UUID(), 'GIG_WORKER', 'Gig Worker', 'Completes assigned gig work', 90, 1, UTC_TIMESTAMP(), UTC_TIMESTAMP()
WHERE NOT EXISTS (SELECT 1 FROM role_types WHERE name = 'GIG_WORKER');

/* -----------------------------------------------------------------------------
   2) Assignments table
----------------------------------------------------------------------------- */
CREATE TABLE IF NOT EXISTS assignments (
  id VARCHAR(36) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  budget DOUBLE NOT NULL,
  deadline DATETIME NOT NULL,
  category VARCHAR(100) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'Pending Review',
  priority VARCHAR(20) NOT NULL DEFAULT 'Medium',
  client_id VARCHAR(36) NOT NULL,
  worker_id VARCHAR(36) NULL,
  assigned_by_id VARCHAR(36) NULL,
  assigned_at DATETIME NULL,
  reviewed_by_id VARCHAR(36) NULL,
  reviewed_at DATETIME NULL,
  admin_notes TEXT NULL,
  revision_notes TEXT NULL,
  files JSON NULL,
  timeline JSON NULL,
  created_at DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_assignments_client_id (client_id),
  INDEX idx_assignments_worker_id (worker_id),
  INDEX idx_assignments_status (status),
  INDEX idx_assignments_priority (priority),
  INDEX idx_assignments_deadline (deadline),
  CONSTRAINT fk_assignments_client_id_users FOREIGN KEY (client_id) REFERENCES users(id),
  CONSTRAINT fk_assignments_worker_id_users FOREIGN KEY (worker_id) REFERENCES users(id),
  CONSTRAINT fk_assignments_assigned_by_id_users FOREIGN KEY (assigned_by_id) REFERENCES users(id),
  CONSTRAINT fk_assignments_reviewed_by_id_users FOREIGN KEY (reviewed_by_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

/* Add columns for deployments where assignments already existed in partial form. */
SET @schema_name = DATABASE();

SET @sql = IF(
  EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = @schema_name AND table_name = 'assignments' AND column_name = 'assigned_by_id'),
  'SELECT 1',
  'ALTER TABLE assignments ADD COLUMN assigned_by_id VARCHAR(36) NULL, ADD INDEX idx_assignments_assigned_by_id (assigned_by_id), ADD CONSTRAINT fk_assignments_assigned_by_id_users FOREIGN KEY (assigned_by_id) REFERENCES users(id)'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = @schema_name AND table_name = 'assignments' AND column_name = 'assigned_at'),
  'SELECT 1',
  'ALTER TABLE assignments ADD COLUMN assigned_at DATETIME NULL'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = @schema_name AND table_name = 'assignments' AND column_name = 'reviewed_by_id'),
  'SELECT 1',
  'ALTER TABLE assignments ADD COLUMN reviewed_by_id VARCHAR(36) NULL, ADD INDEX idx_assignments_reviewed_by_id (reviewed_by_id), ADD CONSTRAINT fk_assignments_reviewed_by_id_users FOREIGN KEY (reviewed_by_id) REFERENCES users(id)'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = @schema_name AND table_name = 'assignments' AND column_name = 'reviewed_at'),
  'SELECT 1',
  'ALTER TABLE assignments ADD COLUMN reviewed_at DATETIME NULL'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = @schema_name AND table_name = 'assignments' AND column_name = 'revision_notes'),
  'SELECT 1',
  'ALTER TABLE assignments ADD COLUMN revision_notes TEXT NULL'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = @schema_name AND table_name = 'assignments' AND column_name = 'timeline'),
  'SELECT 1',
  'ALTER TABLE assignments ADD COLUMN timeline JSON NULL'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

/* -----------------------------------------------------------------------------
   3) Submissions table
----------------------------------------------------------------------------- */
CREATE TABLE IF NOT EXISTS submissions (
  id VARCHAR(36) NOT NULL,
  assignment_id VARCHAR(36) NOT NULL,
  worker_id VARCHAR(36) NOT NULL,
  deliverable_file TEXT NULL,
  deliverable_link TEXT NULL,
  submission_notes TEXT NULL,
  submitted_at DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
  status VARCHAR(50) NOT NULL DEFAULT 'Submitted for Review',
  review_notes TEXT NULL,
  PRIMARY KEY (id),
  INDEX idx_submissions_assignment_id (assignment_id),
  INDEX idx_submissions_worker_id (worker_id),
  INDEX idx_submissions_status (status),
  CONSTRAINT fk_submissions_assignment_id_assignments FOREIGN KEY (assignment_id) REFERENCES assignments(id),
  CONSTRAINT fk_submissions_worker_id_users FOREIGN KEY (worker_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

SET @sql = IF(
  EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = @schema_name AND table_name = 'submissions' AND column_name = 'review_notes'),
  'SELECT 1',
  'ALTER TABLE submissions ADD COLUMN review_notes TEXT NULL'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

/* -----------------------------------------------------------------------------
   4) Assignment messages table
----------------------------------------------------------------------------- */
CREATE TABLE IF NOT EXISTS assignment_messages (
  id VARCHAR(36) NOT NULL,
  assignment_id VARCHAR(36) NOT NULL,
  sender_id VARCHAR(36) NOT NULL,
  message TEXT NOT NULL,
  visibility VARCHAR(32) NOT NULL DEFAULT 'PARTICIPANTS',
  created_at DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_assignment_messages_assignment_id (assignment_id),
  INDEX idx_assignment_messages_sender_id (sender_id),
  INDEX idx_assignment_messages_created_at (created_at),
  CONSTRAINT fk_assignment_messages_assignment_id_assignments FOREIGN KEY (assignment_id) REFERENCES assignments(id) ON DELETE CASCADE,
  CONSTRAINT fk_assignment_messages_sender_id_users FOREIGN KEY (sender_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

/* -----------------------------------------------------------------------------
   5) Optional demo users for testing
   Password hashes are intentionally not inserted here because the app hash helper
   should generate them. Use seed.py for demo users, or create users in admin UI.
----------------------------------------------------------------------------- */

COMMIT;

