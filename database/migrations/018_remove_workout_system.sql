-- Migration: Remove Old Workout System
-- This migration removes the old workout system since we're now using programs and program_workouts
-- It removes all workout assignments, logs, and drops the workout-related tables

-- Step 1: Remove all workout assignments from clients (if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'workout_assignments') THEN
        DELETE FROM workout_assignments;
    END IF;
END $$;

-- Step 2: Remove all workout logs (if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'workout_logs') THEN
        DELETE FROM workout_logs;
    END IF;
END $$;

-- Step 3: Remove workout_id references from sessions (set to NULL)
-- Sessions now use program_workout_id and program_id instead
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sessions' 
        AND column_name = 'workout_id'
    ) THEN
        UPDATE sessions SET workout_id = NULL WHERE workout_id IS NOT NULL;
    END IF;
END $$;

-- Step 4: Drop foreign key constraint on sessions.workout_id if it exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'sessions_workout_id_fkey' 
        AND table_name = 'sessions'
    ) THEN
        ALTER TABLE sessions DROP CONSTRAINT sessions_workout_id_fkey;
    END IF;
END $$;

-- Step 5: Drop the workout_id column from sessions table
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sessions' 
        AND column_name = 'workout_id'
    ) THEN
        ALTER TABLE sessions DROP COLUMN workout_id;
    END IF;
END $$;

-- Step 6: Drop indexes related to workouts
DROP INDEX IF EXISTS idx_workouts_trainer_id;
DROP INDEX IF EXISTS idx_workout_exercises_workout_id;
DROP INDEX IF EXISTS idx_workout_assignments_client_id;
DROP INDEX IF EXISTS idx_workout_assignments_workout_id;
DROP INDEX IF EXISTS idx_workout_logs_client_id;

-- Step 7: Drop triggers related to workouts
DROP TRIGGER IF EXISTS update_workouts_updated_at ON workouts;
DROP TRIGGER IF EXISTS update_workout_assignments_updated_at ON workout_assignments;

-- Step 8: Drop workout-related tables in correct order (respecting foreign key dependencies)
DROP TABLE IF EXISTS workout_exercises CASCADE;
DROP TABLE IF EXISTS workout_assignments CASCADE;
DROP TABLE IF EXISTS workout_logs CASCADE;
DROP TABLE IF EXISTS workouts CASCADE;

