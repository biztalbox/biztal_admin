# Quick Start Guide

## 🚀 Getting Started

### 1. Install Dependencies
```bash
cd biztal_admin
npm install
```

### 2. Database Setup
Run the SQL migrations from `database_migrations.sql`:
- `employee_performance` table
- `employee_attendance` table

### 3. Environment Variables
Check `.env.local` file - all variables are already set with your values:
- Database configuration
- JWT secret
- Gmail SMTP
- Aisensy WhatsApp API
- Application settings

### 4. Start Development Server
```bash
npm run dev
```

The app will be available at `http://localhost:3000`

### 5. Login
- Use your existing admin credentials
- The app uses the same database as the PHP version

## 📋 Features Available

### Clients
- ✅ Create, Edit, View, Delete
- ✅ Send WhatsApp/Email messages
- ✅ View projects and invoices
- ✅ View reminder history

### Employees
- ✅ Create, Edit, View, Delete
- ✅ Performance tracking
- ✅ Send performance reports via email

### Projects
- ✅ Create, Edit, Delete
- ✅ Link to clients

### Invoices
- ✅ Create, Edit, Delete
- ✅ PDF export
- ✅ Payment reminders

### Payment Reminders
- ✅ Automated reminder system
- ✅ Reminder history tracking
- ✅ WhatsApp and Email reminders

## 🔧 Setting Up Cron Job

For automated payment reminders, set up a cron job to call:
```
POST http://localhost:3000/api/reminders/process
```

Daily at a specific time (e.g., 9 AM).

## 🎨 UI Features

- React Hot Toast for notifications
- Loading states on all buttons
- Responsive design
- Modern UI with Tailwind CSS
- Error handling with user-friendly messages

## 📝 Notes

- All API routes require JWT authentication
- Token is stored in localStorage
- The app uses the same database as the PHP version
- All CRUD operations are working
- Error handling is comprehensive
- Production-ready code

## 🐛 Troubleshooting

1. **Database Connection Issues**
   - Check `.env.local` database credentials
   - Ensure MySQL is running
   - Verify database exists

2. **Authentication Issues**
   - Clear localStorage
   - Check JWT_SECRET in `.env.local`
   - Verify token expiration

3. **API Errors**
   - Check browser console
   - Check server logs
   - Verify API routes are accessible

## ✨ Production Deployment

1. Build the application:
   ```bash
   npm run build
   ```

2. Start production server:
   ```bash
   npm start
   ```

3. Set up environment variables on your production server

4. Set up cron job for reminders

5. Configure reverse proxy (nginx/Apache) if needed

