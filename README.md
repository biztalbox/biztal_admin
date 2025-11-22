# Biztal Admin - Next.js Admin Panel

A modern admin panel built with Next.js, TypeScript, Tailwind CSS, MySQL, JWT authentication, Gmail SMTP, and WhatsApp Aisensy API.

## Features

- **Dashboard**: Statistics and recent activities
- **Client Management**: Full CRUD operations with search and pagination
- **Employee Management**: Full CRUD operations
- **Project Management**: Create and manage client projects
- **Invoice Management**: Create invoices, track payments, send reminders
- **Payment Reminders**: Automated reminder system via WhatsApp and Email
- **Email Integration**: Gmail SMTP for sending emails
- **WhatsApp Integration**: Aisensy API for WhatsApp messaging

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: MySQL
- **Authentication**: JWT
- **Email**: Nodemailer (Gmail SMTP)
- **WhatsApp**: Aisensy API
- **Icons**: Lucide React

## Setup

1. Install dependencies:
```bash
npm install
```

2. Copy environment variables:
```bash
cp .env.local.example .env.local
```

3. Update `.env.local` with your database and API credentials.

4. Run the database migrations (use the SQL files from the parent directory).

5. Start the development server:
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000)

## Default Login

- Email: `admin@admin.com`
- Password: `admin123`

## Project Structure

```
biztal_admin/
├── app/                    # Next.js App Router pages
│   ├── api/               # API routes
│   ├── dashboard/         # Dashboard pages
│   ├── login/             # Login page
│   └── layout.tsx         # Root layout
├── lib/                   # Utilities and services
│   ├── db.ts             # Database connection
│   ├── auth.ts           # JWT authentication
│   ├── email.ts          # Email service
│   └── whatsapp.ts       # WhatsApp service
├── components/            # React components
└── types/                 # TypeScript types
```

## API Routes

- `/api/auth/*` - Authentication endpoints
- `/api/clients/*` - Client management
- `/api/employees/*` - Employee management
- `/api/projects/*` - Project management
- `/api/invoices/*` - Invoice management
- `/api/dashboard` - Dashboard statistics
- `/api/reminders/*` - Reminder system

