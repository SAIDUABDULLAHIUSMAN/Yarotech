# Yarotech Sales Management System

A comprehensive sales management and transaction tracking system built with React, TypeScript, and Supabase. Features role-based access control with admin and staff dashboards, product management, transaction monitoring, and detailed audit logging.

## Features

- **Role-Based Access Control**: Separate admin and staff dashboards with tailored functionality
- **Sales Management**: Create, track, and manage sales transactions with invoice generation
- **Product Management**: Admin panel for managing product inventory and pricing
- **Transaction Monitoring**: Real-time monitoring of all sales transactions
- **Audit Logging**: Complete audit trail of all system activities
- **Reports & Analytics**: Dashboard with key metrics and sales analytics
- **Email Notifications**: Configurable notification settings
- **Settings Management**: User profile and application settings

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **Styling**: Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **UI Components**: Lucide React icons, Recharts for visualizations
- **PDF Export**: jsPDF with autotable support
- **Date Handling**: date-fns

## Prerequisites

- Node.js 16+ and npm/yarn
- Supabase account (with project already created)
- Environment variables configured

## Installation

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Configure Environment Variables**

   The `.env` file already contains your Supabase credentials:
   ```
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

3. **Database Setup**

   The database schema is already set up with migrations. All tables and security policies are configured:
   - `users` - User accounts and roles
   - `products` - Product catalog
   - `sales` - Sales transactions
   - `sales_items` - Line items for each sale
   - `audit_log` - System activity tracking
   - `email_notification_settings` - User notification preferences

## Running Locally

### Development Server
```bash
npm run dev
```
Opens the app at `http://localhost:5173`

### Build for Production
```bash
npm run build
```

### Type Checking
```bash
npm typecheck
```

### Linting
```bash
npm run lint
```

### Preview Production Build
```bash
npm run preview
```

## Testing the Application

### Admin Account
- **Email**: demo@admin.com
- **Password**: [Check your database for configured admin users]
- **Access**: Full system including product management, transaction monitoring, audit logs, and reports

### Staff Account
- **Email**: demo@staff.com
- **Password**: [Check your database for configured staff users]
- **Access**: Sales entry, transaction history, and basic dashboard

### Key Features to Test

**Admin Dashboard:**
1. Navigate to Dashboard - view key metrics and sales overview
2. Go to Products - add, edit, and manage products
3. Check Sales History - view all staff sales transactions
4. View Transaction Monitoring - monitor all system transactions
5. Review Audit Log - see detailed activity history
6. Generate Reports - view analytics and metrics

**Staff Dashboard:**
1. Create Sales - record new sales with multiple items
2. View My Transactions - see personal transaction history
3. Generate Invoices - create and download PDF invoices

## Project Structure

```
src/
├── components/        # React components
│   ├── Admin/        # Admin-specific components
│   ├── Auth/         # Authentication components
│   ├── Dashboard/    # Dashboard components
│   ├── Layout/       # Layout components (Header, Sidebar)
│   ├── Reports/      # Reporting components
│   ├── Sales/        # Sales components
│   ├── Settings/     # Settings components
│   └── Staff/        # Staff-specific components
├── contexts/         # React contexts (AuthContext)
├── hooks/            # Custom hooks (useUserRole)
├── pages/            # Page components
├── lib/              # Library setup (Supabase client)
├── utils/            # Utility functions (invoiceGenerator)
├── App.tsx           # Main app component
└── main.tsx          # Entry point

supabase/
├── migrations/       # Database migrations
└── functions/        # Edge Functions
```

## Key Workflows

### Creating a Sale (Staff)
1. Click "Sales" in sidebar
2. Select customer and products
3. Adjust quantities and review pricing
4. Submit to create transaction
5. Download invoice as PDF

### Managing Products (Admin)
1. Click "Product Management"
2. Add new products with pricing
3. Edit or delete existing products
4. Changes reflect immediately in system

### Monitoring Activity (Admin)
1. Check "Transaction Monitoring" for all sales
2. Review "Audit Log" for system activities
3. Use "Reports" for analytics and trends

## Troubleshooting

**Login Issues**
- Verify credentials match your configured users
- Check browser console for error messages
- Ensure `.env` variables are correctly set

**Database Connection**
- Verify Supabase URL and API key in `.env`
- Check Supabase dashboard for project status
- Ensure Row Level Security (RLS) policies are enabled

**Sales Not Saving**
- Verify products exist in the database
- Check user role has permission to create sales
- Review audit log for error details

**Invoice Generation**
- Ensure sale has at least one item
- Check browser has PDF generation permissions
- Try different browser if issues persist

## Security

- All data access is protected by Row Level Security (RLS) policies
- Admin and staff roles are enforced at the database level
- Sensitive operations are logged in the audit trail
- User authentication managed through Supabase Auth

## Environment Variables

```
VITE_SUPABASE_URL        # Supabase project URL
VITE_SUPABASE_ANON_KEY   # Supabase anonymous key
```

These are pre-configured in your `.env` file.

## Support

For issues or questions:
1. Check the browser console for error messages
2. Review the audit log for activity history
3. Verify database connectivity in Supabase dashboard
4. Ensure all migrations have been applied
