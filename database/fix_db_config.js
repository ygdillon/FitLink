import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import os from 'os'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const envPath = path.join(__dirname, '../backend/.env')
const username = os.userInfo().username

console.log(`Your system username is: ${username}`)
console.log(`Checking .env file at: ${envPath}`)

// Read existing .env file
let envContent = ''
if (fs.existsSync(envPath)) {
  envContent = fs.readFileSync(envPath, 'utf8')
  console.log('\nCurrent .env content:')
  console.log(envContent)
} else {
  console.log('\n.env file does not exist. Creating new one...')
}

// Check if DB_USER is set
if (!envContent.includes('DB_USER=')) {
  console.log('\n⚠️  DB_USER not found in .env file')
  console.log(`\nAdding DB_USER=${username} to .env file...`)
  
  // Append DB config if it doesn't exist
  if (!envContent.includes('DB_HOST=')) {
    envContent += `\n# Database Configuration\n`
    envContent += `DB_HOST=localhost\n`
    envContent += `DB_PORT=5432\n`
    envContent += `DB_NAME=personal_trainer_app\n`
    envContent += `DB_USER=${username}\n`
    envContent += `DB_PASSWORD=\n`
  } else {
    // Add DB_USER after DB_NAME
    envContent = envContent.replace(
      /DB_NAME=.*/,
      `DB_NAME=personal_trainer_app\nDB_USER=${username}`
    )
  }
  
  fs.writeFileSync(envPath, envContent)
  console.log('✅ Updated .env file with DB_USER')
} else {
  // Check if it's set to postgres
  if (envContent.includes('DB_USER=postgres')) {
    console.log('\n⚠️  DB_USER is set to "postgres" but that role doesn\'t exist')
    console.log(`\nUpdating DB_USER to ${username}...`)
    envContent = envContent.replace(/DB_USER=postgres/g, `DB_USER=${username}`)
    fs.writeFileSync(envPath, envContent)
    console.log('✅ Updated DB_USER in .env file')
  } else {
    console.log('\n✅ DB_USER is already configured')
  }
}

console.log('\n📝 Next steps:')
console.log('1. Make sure PostgreSQL is running: brew services start postgresql@14')
console.log('2. Create the database if it doesn\'t exist:')
console.log(`   psql -U ${username} -d postgres -c "CREATE DATABASE personal_trainer_app;"`)
console.log('3. Run the migration: node database/migrate.js')
console.log('\nIf you still get errors, you may need to create the postgres role:')
console.log(`   psql -U ${username} -d postgres -c "CREATE ROLE postgres WITH LOGIN SUPERUSER;"`)

