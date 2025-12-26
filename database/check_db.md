# How to Connect to PostgreSQL and Check Database State

## Quick Connection Commands

### 1. Connect to PostgreSQL (using your system username)
```bash
psql -U yanisdillon -d postgres
```

If that doesn't work, try:
```bash
psql postgres
```

### 2. Connect to Your App Database (if it exists)
```bash
psql -U yanisdillon -d personal_trainer_app
```

Or:
```bash
psql personal_trainer_app
```

## Useful Commands Once Connected

### Check Current User
```sql
SELECT current_user;
```

### List All Databases
```sql
\l
```

### Connect to a Database
```sql
\c personal_trainer_app
```

### List All Tables in Current Database
```sql
\dt
```

### List All Tables with Details
```sql
\dt+
```

### Check if a Specific Table Exists
```sql
SELECT EXISTS (
   SELECT FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND table_name = 'client_nutrition_profiles'
);
```

### Check All Tables Related to Nutrition
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE '%nutrition%';
```

### Check Table Structure
```sql
\d client_nutrition_profiles
```

### Check All Users/Roles
```sql
\du
```

### Count Rows in a Table
```sql
SELECT COUNT(*) FROM client_nutrition_profiles;
```

### View Table Data (first 10 rows)
```sql
SELECT * FROM client_nutrition_profiles LIMIT 10;
```

### Exit psql
```sql
\q
```

## Check Database Connection Info

### From Terminal (without connecting)
```bash
# Check if PostgreSQL is running
pg_isready

# Check what user you're connecting as
whoami

# List databases (without connecting)
psql -U yanisdillon -d postgres -l
```

## Troubleshooting

### If "role does not exist" error:
```bash
# Connect as superuser (if you have one)
psql -U postgres -d postgres

# Or create the role
psql -U yanisdillon -d postgres -c "CREATE ROLE postgres WITH LOGIN SUPERUSER;"
```

### If "database does not exist":
```sql
-- Connect to postgres database first
psql -U yanisdillon -d postgres

-- Then create the database
CREATE DATABASE personal_trainer_app;

-- Exit and reconnect to new database
\c personal_trainer_app
```

## Quick Check Script

Run this to check everything at once:
```bash
psql -U yanisdillon -d postgres -c "
SELECT 
    'Database: ' || datname as info
FROM pg_database 
WHERE datname = 'personal_trainer_app'
UNION ALL
SELECT 
    'User: ' || current_user;
"
```

