-- Add project_ids column to invoices table
-- This column stores an array of project IDs as JSON
ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS project_ids TEXT NULL AFTER project_id;

