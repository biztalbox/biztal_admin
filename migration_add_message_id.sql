-- Add message_id column to reminder_history table for email threading
-- This allows reminder emails to reply to the original invoice email
ALTER TABLE reminder_history 
ADD COLUMN IF NOT EXISTS message_id VARCHAR(255) NULL AFTER error_message;

-- Add index for faster lookups when finding previous emails to reply to
CREATE INDEX IF NOT EXISTS idx_reminder_history_message_id ON reminder_history(message_id);
CREATE INDEX IF NOT EXISTS idx_reminder_history_invoice_channel ON reminder_history(invoice_id, channel, reminder_type, status);

