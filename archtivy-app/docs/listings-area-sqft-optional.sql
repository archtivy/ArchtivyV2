-- Make project area optional: allow NULL for area_sqft.
-- Safe to run: drops NOT NULL if present; does not remove column or change existing data.
-- Run in Supabase SQL Editor.

ALTER TABLE public.listings
  ALTER COLUMN area_sqft DROP NOT NULL;
