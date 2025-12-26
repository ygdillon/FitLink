-- Migration: Fix height_cm data type to accept decimals
-- Change from INTEGER to DECIMAL(6, 2)

ALTER TABLE client_nutrition_profiles 
ALTER COLUMN height_cm TYPE DECIMAL(6, 2);

