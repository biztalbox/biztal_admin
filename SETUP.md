# Setup Instructions

## Prerequisites

1. Node.js 18+ installed
2. MySQL database running
3. Database schema created (use `database.sql` from parent directory)

## Installation

1. Navigate to the project directory:
```bash
cd biztal_admin
```

2. Install dependencies:
```bash
npm install
```

3. Copy environment variables:
```bash
cp .env.local.example .env.local
```

4. Update `.env.local` with your configuration:
   - Database credentials
   - JWT secret
   - Gmail SMTP credentials
   - WhatsApp Aisensy API credentials

5. Run database migrations:
   - Use the SQL files from the parent directory
   - `database.sql` - Main schema
   - `migration_add_projects.sql` - Projects table
   - `migration_add_reminder_history.sql` - Reminder history

6. Start the development server:
```bash
npm run dev
```

7. Open [http://localhost:3000](http://localhost:3000)

## Default Login

- Email: `admin@admin.com`
- Password: `admin123`

(You need to create this user in the database or run the setup script from parent directory)

## Project Structure

```
biztal_admin/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   │   ├── auth/          # Authentication endpoints
│   │   ├── clients/       # Client management
│   │   ├── employees/     # Employee management
│   │   └── dashboard/     # Dashboard data
│   ├── dashboard/         # Dashboard pages
│   │   ├── clients/       # Client pages
│   │   └── employees/     # Employee pages
│   ├── login/             # Login page
│   └── layout.tsx         # Root layout
├── lib/                   # Utilities and services
│   ├── db.ts             # Database connection
│   ├── auth.ts           # JWT authentication
│   ├── email.ts          # Email service
│   ├── whatsapp.ts       # WhatsApp service
│   ├── middleware.ts     # Auth middleware
│   └── utils.ts          # Utility functions
├── components/            # React components
│   └── DashboardLayout.tsx
└── types/                 # TypeScript types
    └── index.ts
```

## Features Implemented

✅ **Authentication**
- JWT-based authentication
- Login/Logout
- Protected routes

✅ **Dashboard**
- Statistics cards
- Recent clients
- Recent payments

✅ **Client Management**
- List clients with search and pagination
- View client details
- Send WhatsApp messages
- Send emails
- Delete clients

✅ **Employee Management**
- List employees with search and pagination
- View employee details
- Delete employees

✅ **Services**
- Gmail SMTP integration
- WhatsApp Aisensy API integration
- Database utilities

## Still To Be Implemented

- Create/Edit forms for clients and employees
- View pages for clients and employees
- Projects management (CRUD)
- Invoices management (CRUD)
- Payment reminder system
- Reminder history tracking
- Custom WhatsApp/Email message sending

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/check` - Check authentication

### Clients
- `GET /api/clients` - List clients (with pagination, search)
- `POST /api/clients` - Create client
- `GET /api/clients/[id]` - Get client
- `PUT /api/clients/[id]` - Update client
- `DELETE /api/clients/[id]` - Delete client
- `POST /api/clients/[id]/send-whatsapp` - Send WhatsApp
- `POST /api/clients/[id]/send-email` - Send email

### Employees
- `GET /api/employees` - List employees
- `POST /api/employees` - Create employee
- `GET /api/employees/[id]` - Get employee
- `PUT /api/employees/[id]` - Update employee
- `DELETE /api/employees/[id]` - Delete employee

### Dashboard
- `GET /api/dashboard` - Get dashboard statistics

## Notes

- All API routes require authentication (JWT token)
- Token is stored in localStorage and sent via Authorization header
- The app uses the same database as the PHP version
- All environment variables should be set in `.env.local`

