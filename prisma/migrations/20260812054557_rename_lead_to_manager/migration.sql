-- Rename the LEAD role to MANAGER. Postgres tracks enum values by OID, not by
-- label text, so this updates the label in place: existing rows and the
-- User.role default both keep referring to the same value and now read
-- "MANAGER" instead of "LEAD". No data migration needed.
ALTER TYPE "Role" RENAME VALUE 'LEAD' TO 'MANAGER';
