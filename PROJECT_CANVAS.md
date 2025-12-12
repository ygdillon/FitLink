# Personal Trainer App - Project Canvas

## 📋 Project Overview
A comprehensive personal trainer application that connects trainers with clients, manages workouts, tracks progress, and facilitates communication.

---

## 🎯 Core Objectives
- [ ] Enable trainers to create and manage client programs
- [ ] Allow clients to access workouts and track progress
- [ ] Facilitate communication between trainers and clients
- [ ] Track fitness metrics and progress over time
- [ ] Provide a professional, user-friendly experience
- [ ] **Build trusted trainer-client ecosystem with verifiable reputation** (via blockchain)
- [ ] **Deliver smooth consumer experience with blockchain transparently in background**
- [ ] **Ensure scalability and consistent architecture for future extensions**
- [ ] **Enable peer-to-peer payments with zero platform fees** (direct trainer-client transactions)
- [ ] **Remove centralized payment intermediaries** (trainers receive 100% of payments)

---

## 👥 User Personas

### Primary Users
1. **Personal Trainer**
   - Creates workout programs
   - Manages multiple clients
   - Tracks client progress
   - Communicates with clients
   - Sets goals and milestones

2. **Client/User**
   - Views assigned workouts
   - Logs workout completion
   - Tracks personal metrics
   - Communicates with trainer
   - Views progress over time

---

## 🏗️ Architecture & Tech Stack
*Based on CampusCuts Foundation - Hybrid Web2/Web3 Architecture*

### Frontend
- **Framework**: React
- **State Management**: [To be determined - Redux? Zustand? Context API?]
- **UI Library**: [Material-UI? Tailwind?]
- **Navigation**: [React Router?]

### Backend
- **Framework**: Node.js
- **Database**: PostgreSQL
- **Authentication**: [Custom implementation]
- **API**: REST API

### Payments (P2P - Zero Platform Fees)
- **Payment Processing**: Stripe Connect (for direct trainer-client payments)
- **Architecture**: Peer-to-peer payments with no platform cut
- **Payment Types**:
  - Subscription payments (monthly/weekly training programs)
  - One-time payments (single sessions, program purchases)
  - Escrow payments (blockchain-verified, released on milestone completion)
- **Blockchain Escrow**: Aptos smart contracts for secure, trustless payments
- **Fee Structure**: 0% platform fee - trainers receive 100% of payments (only Stripe processing fees apply)

### Blockchain (Web3 Layer)
- **Blockchain**: Aptos
- **Use Cases**:
  - Trainer reputation & reviews (immutable, verifiable)
  - Progress milestone verification
  - Achievement/token rewards (optional)
  - Program completion verification
  - Client commitment tracking
  - **Payment escrow** (secure P2P payments, released on completion)
  - **Payment verification** (immutable payment records)

### Additional Services
- **File Storage**: [AWS S3?]
- **Push Notifications**: [To be determined]
- **Analytics**: [To be determined]

### Architecture Philosophy
- **Modular Design**: Intentionally modular for easy extension and replication
- **Hybrid Approach**: Web2 for smooth UX, Web3 for trust and verification
- **Transparent Blockchain**: Blockchain operates in background, not overtly visible to users

---

## 📱 Core Features & Modules

### 1. Authentication & Onboarding
- [ ] User registration (Trainer/Client)
- [ ] Login/Logout
- [ ] Profile setup
- [ ] Role selection
- [ ] Onboarding flow

### 2. Trainer Dashboard
- [ ] Client list/management
- [ ] Create workout programs
- [ ] View client progress
- [ ] Schedule management
- [ ] Communication hub
- [ ] Analytics/Insights

### 3. Client Dashboard
- [ ] View assigned workouts
- [ ] Workout calendar
- [ ] Progress tracking
- [ ] Communication with trainer
- [ ] Personal metrics dashboard

### 4. Workout Management
- [ ] Exercise library
- [ ] Create custom exercises
- [ ] Build workout templates
- [ ] Assign workouts to clients
- [ ] Workout history
- [ ] Exercise instructions (text/video)

### 5. Progress Tracking
- [ ] Body measurements
- [ ] Weight tracking
- [ ] Workout completion logs
- [ ] Photos (before/after)
- [ ] Performance metrics (PRs, improvements)
- [ ] Progress charts/graphs

### 6. Communication
- [ ] In-app messaging
- [ ] Push notifications
- [ ] Workout reminders
- [ ] Goal updates
- [ ] Feedback system

### 7. Nutrition (Optional for MVP)
- [ ] Meal plans
- [ ] Calorie tracking
- [ ] Macro tracking
- [ ] Food diary

---

## 🔄 User Flows

### Trainer Flow
1. Register/Login → Onboarding → Connect Stripe Account → Dashboard
2. Add Client → Create Profile → Set Pricing → Assign Program
3. Create Workout → Add Exercises → Set Parameters → Assign to Client
4. View Client Progress → Analyze Data → Adjust Program
5. Communicate with Client → Send Messages → Provide Feedback
6. Receive Payments → View Payment History → Manage Subscriptions

### Client Flow
1. Register/Login → Onboarding → Connect with Trainer → Add Payment Method
2. View Dashboard → See Assigned Workouts → Subscribe/Pay for Programs
3. Start Workout → Follow Exercises → Log Completion
4. Track Progress → Log Metrics → View History
5. Communicate with Trainer → Ask Questions → Receive Feedback
6. Manage Payments → View Subscription Status → Update Payment Methods

---

## 📊 Data Models (Initial Sketch)
*PostgreSQL Schema - Following CampusCuts Patterns*

### User (Core - Similar to CampusCuts)
- id, email, name, role (trainer/client), profile_image, created_at, updated_at
- blockchain_address (for Aptos integration)
- verification_status

### Trainer (Provider Profile - Adapted from CampusCuts Provider Model)
- user_id, bio, certifications[], specialties[], hourly_rate, subscription_tiers[]
- total_clients, active_clients, blockchain_reputation_score
- verified_certifications (on-chain)

### Client (User Profile - Adapted from CampusCuts Student Model)
- user_id, trainer_id, goals[], start_date, subscription_status, subscription_tier
- blockchain_progress_tokens (achievements on-chain)

### Workout (Service Template - Adapted from CampusCuts Service Model)
- id, trainer_id, name, description, exercises[], duration, difficulty, created_at
- is_template, category, tags[]

### Workout Assignment (Booking/Transaction - Similar to CampusCuts Booking)
- id, workout_id, client_id, assigned_date, due_date, status, completed_date
- blockchain_verification_hash (for completion verification)

### Exercise (Service Item - New for Trainer App)
- id, name, description, muscle_groups[], equipment[], instructions, video_url, image_url
- difficulty_level, estimated_duration

### Workout Log (Transaction Record - Similar to CampusCuts Service Completion)
- id, client_id, workout_id, completed_date, exercises_completed[], notes, duration
- blockchain_hash (immutable record)

### Progress Entry (New for Trainer App)
- id, client_id, date, weight, body_fat, measurements{}, photos[], notes
- blockchain_milestone_hash (for major achievements)

### Message (Communication - Similar to CampusCuts Messaging)
- id, sender_id, receiver_id, content, timestamp, read_status

### Review (Blockchain-Verified - Core to CampusCuts Model)
- id, trainer_id, client_id, rating, comment, timestamp
- blockchain_hash (immutable on Aptos)
- verified_status

### Payment (P2P Payment Records)
- id, trainer_id, client_id, amount, currency, payment_type (subscription/one-time/escrow)
- stripe_payment_intent_id, stripe_connect_account_id
- status (pending/completed/failed/refunded)
- subscription_id (if subscription), billing_cycle
- blockchain_escrow_hash (if using blockchain escrow)
- created_at, completed_at

### Subscription (Recurring Payments)
- id, trainer_id, client_id, amount, currency, billing_cycle (monthly/weekly)
- stripe_subscription_id, stripe_customer_id
- status (active/cancelled/past_due)
- current_period_start, current_period_end
- created_at, cancelled_at

---

## 🎨 UI/UX Considerations

### Design Principles
- Clean, modern interface
- Intuitive navigation
- Mobile-first approach
- Accessibility compliance
- Fast loading times

### Key Screens
- [ ] Login/Register
- [ ] Onboarding
- [ ] Dashboard (Trainer/Client)
- [ ] Client List (Trainer)
- [ ] Workout Builder
- [ ] Workout View/Execution
- [ ] Progress Tracking
- [ ] Messaging
- [ ] Profile Settings

### Color Scheme & Branding
- [To be defined based on professional input]

---

## 🔐 Security & Privacy
- [ ] Secure authentication
- [ ] Data encryption
- [ ] HIPAA compliance considerations (if applicable)
- [ ] Privacy settings
- [ ] Data backup & recovery

---

## 📈 MVP Scope (Phase 1)

### Must Have (Core Functionality)
- [ ] User authentication (Trainer/Client roles)
- [ ] Trainer profile creation (with certifications)
- [ ] Client profile & trainer connection
- [ ] Basic workout creation & exercise library
- [ ] Workout assignment to clients
- [ ] Workout logging & completion tracking
- [ ] Basic progress tracking (weight, measurements)
- [ ] Simple messaging system
- [ ] **Blockchain integration**: Trainer reputation/reviews on Aptos
- [ ] **P2P Payment integration**: Stripe Connect for direct trainer-client payments (0% platform fee)
- [ ] **Subscription management**: Recurring payments for training programs
- [ ] **Payment history**: View all transactions for trainers and clients

### Nice to Have (Phase 2)
- [ ] Advanced analytics & insights
- [ ] Video exercise library
- [ ] Nutrition tracking & meal plans
- [ ] Calendar/scheduling system
- [ ] Group training features
- [ ] Achievement system (blockchain tokens)
- [ ] Social features & community
- [ ] Advanced progress visualization
- [ ] Program templates marketplace

---

## 🧪 Testing Strategy
- [ ] Unit tests
- [ ] Integration tests
- [ ] E2E tests
- [ ] User acceptance testing
- [ ] Performance testing

---

## 📦 Deployment
- [ ] Development environment
- [ ] Staging environment
- [ ] Production environment
- [ ] CI/CD pipeline
- [ ] Monitoring & logging

---

## 📝 Questions to Answer (Based on Professional Input)
*[To be filled after reviewing trainer responses]*

1. What are the most critical features trainers need?
2. How do trainers typically structure workout programs?
3. What metrics are most important to track?
4. How do trainers communicate with clients?
5. What pain points exist in current solutions?
6. What makes a trainer-client relationship successful?
7. How do trainers handle program adjustments?
8. What reporting/analytics are most valuable?

---

## 🚀 Next Steps
1. ✅ Review professional trainer responses (PDF)
2. [ ] Refine feature list based on professional input
3. [ ] Finalize tech stack
4. [ ] Create detailed wireframes
5. [ ] Set up project structure
6. [ ] Begin development

---

## 🔧 Foundation & Structure (From CampusCuts Project)

### Architecture Pattern
- **Hybrid Web2/Web3 Architecture**
- **Frontend/Backend Separation**: React frontend, Node.js backend
- **Database**: PostgreSQL for relational data
- **Blockchain Integration**: Aptos for trust layer (reputation, reviews, verification)
- **Modular Design**: Built for replication and extension to new service verticals

### Key Components to Reuse/Adapt

#### From CampusCuts → Personal Trainer App Mapping:
- **Students ↔ Clients**: User discovery and connection
- **Student Providers ↔ Trainers**: Service provider profiles and management
- **Service Bookings ↔ Workout Assignments**: Scheduling and program delivery
- **Reviews & Reputation (Blockchain) ↔ Trainer Reviews & Progress Verification**: Immutable reputation system
- **Escrow (Blockchain) ↔ Subscription/Payment Verification**: Trust layer for payments
- **Multi-campus Scalability ↔ Multi-trainer/Multi-client Scalability**: Architecture supports growth

#### Components to Reuse:
- [x] **Authentication System**: User registration, login, role management (Trainer/Client)
- [x] **Database Schema Patterns**: PostgreSQL structure for users, relationships, transactions
- [x] **UI Component Library**: React components (adapt for fitness context)
- [x] **Navigation Structure**: React routing patterns
- [x] **API Conventions**: REST API structure and patterns
- [x] **Blockchain Integration Layer**: Aptos smart contracts for reputation/reviews
- [x] **Payment Integration**: Stripe payment processing
- [x] **Modular Service Architecture**: Easy to extend with new features

### Architecture Benefits
- **Trust & Verification**: Blockchain ensures trainer credentials and client progress are verifiable
- **Smooth UX**: Web2 layer handles all user interactions seamlessly
- **Scalability**: Modular design allows easy addition of features (nutrition, group training, etc.)
- **Reputation System**: Immutable reviews and ratings build trust in trainer marketplace

### Adaptations Needed
- **Service Model**: CampusCuts is booking-based → Trainer app is program/relationship-based
- **Data Models**: Adapt from service bookings to workout programs, progress tracking
- **Blockchain Use Cases**: 
  - CampusCuts: Escrow for service payments
  - Trainer App: Reputation, progress verification, achievement tracking
- **UI/UX**: Adapt from service discovery to workout/program management focus

---

## 📌 Notes
- **Foundation**: CampusCuts System Architecture & Replication Framework
- **Tech Stack Confirmed**: React (Frontend), Node.js (Backend), PostgreSQL (Database), Stripe (Payments), Aptos (Blockchain)
- **Architecture**: Hybrid Web2/Web3 - Modular design for extensibility
- **Professional insights**: [Awaiting PDF from trainer friend]
- **Additional requirements**: [To be added based on professional input]

