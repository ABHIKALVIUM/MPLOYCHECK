Secure Employment Verification Ledger Dashboard
A high-fidelity, full-stack Single Page Application (SPA) designed for MPloyChek. This platform streamlines and secures the employment background verification process by structuring credentials, permission models, and comprehensive audit trails over simulated blockchain collections.

🚀 Tech Stack & Core Libraries
Frontend (Single Page Application)
Framework: Angular 12.2.17 (Strict TypeScript enabled)

State Management: Reactive programming powered by RxJS streams (BehaviorSubject pipelines)

Form Management: Angular ReactiveFormsModule for strict client-side validation rules

Styling Engine: Tailwind CSS v2.2.19 embedded natively within the PostCSS compilation layer

Backend (Micro-API Layer)
Runtime Environment: Node.js v20.19.2

Server Framework: Express v4.22.2 (ES Modules standard)

Compilation Engine: tsx (TypeScript Execute) for rapid watching and zero-cache runtime evaluation

Data Tier: High-fidelity In-Memory Document Store implementing strict TypeScript interfaces to exactly simulate NoSQL collections (MongoDB/AWS DynamoDB document schemas).

🛠️ Project Architecture & Design Choices
The application enforces a clean Separation of Concerns (SoC) by separating the front-end interface and back-end logic into completely independent directories:

Plaintext
📁 mploychek-platform/
├── 📁 backend/                # Independent Node.js runtime environment
│   ├── server.ts              # Express core engine, endpoints & data collections
│   └── package.json           # Backend dependency configurations
├── 📁 frontend/               # Native Angular CLI workspace layer
│   ├── 📁 src/
│   │   ├── 📁 app/            # Modular application architecture
│   │   │   ├── 📁 core/       # Global services, route guards, and interceptors
│   │   │   ├── 📁 features/   # View modules (Login, Dashboard, Admin Console)
│   │   │   └── 📁 shared/     # Domain custom pipes and shared utilities
│   │   └── styles.css         # Global high-contrast brutalist stylesheet
│   ├── angular.json           # Angular framework compiler blueprint
│   ├── package.json           # Frontend framework dependencies
│   └── proxy.conf.json        # Reverse proxy server configuration map
└── .gitignore                 # Enforces environment exclusion boundaries
Key Engineering Features Built-In:
Asynchronous Latency Interceptor: Implemented an Angular HttpInterceptor that intercepts standard outgoing records traffic, reads user-configured latency inputs, and uses the RxJS delay() operator to artificially process requests. This displays high-fidelity loading skeleton modules in the UI.

Role-Based Access Control (RBAC): Built-in routing security via custom AuthGuard constraints. General users are restricted to viewing masked personal records, while Admins gain full data visibility and access to user CRUD controls.

Reverse Proxy Integration: Configured an Angular reverse proxy map to securely route frontend traffic (localhost:4200/api) directly to the backend API (localhost:3000), preventing cross-origin communication failures.

⚡ Setup & Execution Instructions
Follow these instructions to launch both server tiers locally. Ensure you use separate terminal windows for each directory.

1. Initialize the Express Backend
Open a terminal window and navigate to the backend directory:

Bash
cd backend
npm install
npm run dev
The server will initialize an in-memory database and run cleanly on: http://localhost:3000

2. Initialize the Angular Frontend
Open a second terminal window and navigate to the frontend directory:

Bash
cd frontend
npm install
npm start
The live development compiler will open an outbound connection proxy on: http://localhost:4200

🔐 Credentials for Local Testing
The database contains pre-configured records to help verify individual authorization permissions:

⚡ Administrator Clearance
User ID: admin

Password: Admin@123

Clearance: Gains complete read visibility over all global records, tracks system transaction telemetry via active audit trails, and unlocks full user addition, truncation, and modification rules.

👤 General User Clearance
User ID: alice (or bob)

Password: User@123

Clearance: Restricted solely to personal ledger histories. Attempting to access admin-only routes automatically triggers a fallback route redirect.
