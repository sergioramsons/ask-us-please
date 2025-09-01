-- Add group_id column to assignment_rules table
ALTER TABLE assignment_rules ADD COLUMN group_id UUID REFERENCES groups(id);