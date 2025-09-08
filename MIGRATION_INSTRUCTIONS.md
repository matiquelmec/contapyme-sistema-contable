# ContaPyme Database Migration Instructions

## 🎯 Objective
Fix the application errors by creating the missing database tables:
- `Could not find the table 'public.employees' in the schema cache`
- `Could not find the table 'public.payroll_settings' in the schema cache`

## 📊 Current Status

### ✅ Existing Tables (Working)
- `companies`
- `users` 
- `company_settings`
- `chart_of_accounts`
- `journal_entries`
- `journal_entry_lines`

### ❌ Missing Critical Tables (Causing Errors)
- `employees` - **CRITICAL - Required for HR/Payroll module**
- `payroll_liquidations` - **CRITICAL - Required for Payroll calculations**

### 📋 Additional Missing Tables
- `f29_analyses`
- `f29_line_items`
- `employment_contracts`
- `contract_modifications`
- `economic_indicators`
- `digital_signatures`
- `signature_verifications`
- `rcv_entities`
- `fixed_assets`
- `audit_logs`

## 🚀 Migration Steps

### Step 1: Execute SQL Migration
Since the automatic API migration failed, you need to execute the SQL manually:

1. **Open Supabase Dashboard**
   - Go to: https://supabase.com/dashboard/project/lccdxfqrasizigmehotk
   - Login with your credentials

2. **Navigate to SQL Editor**
   - Click on "SQL Editor" in the left sidebar
   - Or go to: https://supabase.com/dashboard/project/lccdxfqrasizigmehotk/sql

3. **Execute the Migration SQL**
   - Open the file: `missing_tables_migration.sql`
   - Copy the entire content (4000+ lines)
   - Paste it into the SQL Editor
   - Click "Run" to execute

### Step 2: Verify Migration Success

Run the verification script:
```bash
cd "C:\Users\Matías Riquelme\Desktop\Contapyme Final"
node scripts/verify_migration_complete.js
```

### Step 3: Restart Application

If tables are created successfully:
```bash
# Stop current dev server (Ctrl+C)
# Then restart:
npm run dev
```

## 🔧 Alternative Manual Steps

If the SQL Editor approach doesn't work, you can create tables individually:

### Critical Tables First

1. **Create employees table:**
```sql
CREATE TABLE employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    employee_code VARCHAR(50),
    rut VARCHAR(20) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(20),
    address TEXT,
    hire_date DATE NOT NULL,
    termination_date DATE,
    birth_date DATE,
    current_position VARCHAR(255),
    current_department VARCHAR(255),
    employment_status VARCHAR(20) CHECK (employment_status IN ('active', 'inactive', 'terminated')) DEFAULT 'active',
    bank_name VARCHAR(100),
    bank_account_type VARCHAR(20),
    bank_account_number VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    UNIQUE(company_id, rut),
    UNIQUE(company_id, employee_code)
);
```

2. **Create payroll_liquidations table:**
```sql
CREATE TABLE payroll_liquidations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
    period_year INTEGER NOT NULL,
    period_month INTEGER NOT NULL,
    base_salary DECIMAL(10,2) NOT NULL,
    worked_days INTEGER DEFAULT 30,
    worked_hours DECIMAL(6,2) DEFAULT 0,
    overtime_hours DECIMAL(6,2) DEFAULT 0,
    gross_salary DECIMAL(10,2) NOT NULL,
    overtime_amount DECIMAL(10,2) DEFAULT 0,
    bonuses JSONB DEFAULT '{}',
    allowances JSONB DEFAULT '{}',
    legal_gratification DECIMAL(10,2) DEFAULT 0,
    afp_contribution DECIMAL(10,2) DEFAULT 0,
    health_contribution DECIMAL(10,2) DEFAULT 0,
    unemployment_insurance DECIMAL(10,2) DEFAULT 0,
    income_tax DECIMAL(10,2) DEFAULT 0,
    other_deductions JSONB DEFAULT '{}',
    advances DECIMAL(10,2) DEFAULT 0,
    loans DECIMAL(10,2) DEFAULT 0,
    net_salary DECIMAL(10,2) NOT NULL,
    status VARCHAR(20) CHECK (status IN ('draft', 'calculated', 'approved', 'paid')) DEFAULT 'draft',
    calculation_details JSONB,
    created_by UUID REFERENCES users(id),
    approved_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(employee_id, period_year, period_month)
);
```

## 📁 Generated Files

This migration process created the following files:

### 🔧 Migration Scripts
- `missing_tables_migration.sql` - **Main SQL file to execute**
- `scripts/check_existing_tables.js` - Initial diagnosis
- `scripts/verify_migration_complete.js` - Post-migration verification
- `scripts/create_tables_manual.js` - Alternative programmatic approach

### 📋 Documentation
- `MIGRATION_INSTRUCTIONS.md` - This file with complete instructions

## 🎯 Expected Results

After successful migration:

### ✅ Application Should Work
- No more "Could not find table" errors
- Employees module accessible
- Payroll/HR functionality enabled
- All database operations working

### 📊 Database State
- 18 total tables created
- All foreign key relationships established
- Row Level Security (RLS) enabled
- Proper indexes for performance
- Audit trails configured

## 🚨 Troubleshooting

### If Migration Fails
1. Check Supabase logs in Dashboard
2. Verify service role key permissions
3. Ensure no syntax errors in SQL
4. Try creating tables one by one

### If Application Still Has Errors
1. Clear browser cache
2. Restart development server
3. Check for typos in table names
4. Verify RLS policies are not blocking access

### If Tables Exist But Not Accessible
- Problem is likely RLS (Row Level Security)
- Tables exist but policies block access
- Check Supabase Dashboard > Authentication > Policies

## 📞 Support

If you encounter issues:

1. **Check generated log files** from the scripts
2. **Verify in Supabase Dashboard** that tables were created
3. **Run verification script** to get detailed status
4. **Check application logs** for specific error messages

## 🎉 Success Indicators

You'll know the migration succeeded when:

- ✅ Verification script reports all critical tables exist
- ✅ Application starts without schema cache errors
- ✅ Employee management pages load without errors
- ✅ Payroll functionality is accessible
- ✅ No "Could not find table" messages in console

---

**Next Steps After Success:**
1. Test employee creation/management
2. Test payroll calculations
3. Configure any additional business rules
4. Set up proper user permissions
5. Add sample data if needed