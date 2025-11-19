# Manual Testing Guide

## Prerequisites
- PostgreSQL database running on `localhost:5432`
- Database `zent_erp_local` created
- Node.js and npm installed

## Step 1: Start Backend Server

Open a terminal and run:

```bash
cd backend
npm run dev
```

The backend should start on `http://localhost:3000`

You should see:
```
Server is running on port 3000
Environment: development
```

## Step 2: Start Frontend Server

Open a **new terminal** and run:

```bash
cd frontend
npm run dev
```

The frontend should start on `http://localhost:5173` (or another port if 5173 is busy)

You should see:
```
VITE v7.x.x  ready in xxx ms

➜  Local:   http://localhost:5173/
```

## Step 3: Login Credentials

### SuperAdmin Account
- **Email:** `admin@zent.com`
- **Password:** `admin123`
- **Role:** SUPERADMIN

This account was created when you ran the `createAdminUser.js` script.

## Step 4: Testing Steps

### 1. Login
1. Open browser and go to `http://localhost:5173`
2. You should be redirected to `/login`
3. Enter credentials:
   - Email: `admin@zent.com`
   - Password: `admin123`
4. Click "Sign in"
5. You should be redirected to the Dashboard

### 2. Test SuperAdmin Features

#### A. Tenant Management
1. Click on "Tenant Management" in the sidebar
2. You should see the tenant list (at least one tenant: "Zent ERP Solutions")
3. Click "Create New Tenant" button
4. Fill out the 4-step wizard:
   - **Step 1:** Basic Info
     - Name: `SkyTeck Aluminium`
     - Code: `SKYTECK`
     - Address: `Pune, India`
     - VAT Number: `VAT123`
   - **Step 2:** Production Stages
     - Keep default stages or add/remove as needed
   - **Step 3:** Settings
     - VAT %: `5`
     - Timezone: `Asia/Kolkata`
   - **Step 4:** Admin User
     - Name: `Admin User`
     - Email: `admin@skyteck.com`
     - Password: `Pass@123`
5. Click "Create Tenant"
6. You should see the new tenant in the list

#### B. View Tenant Details
1. Click "View" on any tenant
2. You should see tenant details including:
   - Tenant code
   - Address
   - Production stages
   - Settings
   - Statistics

### 3. Test User Management (as DIRECTOR)

To test user management, you need to login as a DIRECTOR. You can:

#### Option A: Create a new tenant and login as its DIRECTOR
1. Create a new tenant (as shown above)
2. Logout (click user menu → Sign out)
3. Login with the tenant's admin credentials:
   - Email: `admin@skyteck.com` (or the email you used)
   - Password: `Pass@123` (or the password you set)

#### Option B: Update existing user to DIRECTOR role
1. Use Prisma Studio to update a user:
   ```bash
   cd backend
   npm run prisma:studio
   ```
2. Open the User table
3. Find a user and change role to `DIRECTOR`
4. Login with that user

#### Test User Management Features:
1. Click "Users" in the sidebar
2. You should see the users list
3. Click "Create User" button
4. Fill the form:
   - Name: `Test User`
   - Email: `test@skyteck.com`
   - Password: `test123`
   - Role: `SALES`
   - Active: ✓
5. Click "Create User"
6. The new user should appear in the list
7. Click "Edit" on a user to update
8. Click "Delete" on a user to remove (can't delete yourself)

### 4. Test API Endpoints (Optional)

You can test the API directly using curl or Postman:

#### Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@zent.com","password":"admin123"}'
```

#### Get Users (requires token)
```bash
curl -X GET http://localhost:3000/api/users \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

#### Get Tenants (SuperAdmin only)
```bash
curl -X GET http://localhost:3000/api/tenants \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## Troubleshooting

### Backend won't start
- Check if PostgreSQL is running
- Verify DATABASE_URL in `backend/.env`
- Check if port 3000 is available

### Frontend won't start
- Check if port 5173 is available
- Try `npm install` in frontend directory
- Check for any build errors in terminal

### Login fails
- Verify the user exists in database
- Check backend logs for errors
- Verify JWT_SECRET is set in `.env`

### Can't access certain pages
- Check user role (must be DIRECTOR or IT_ADMIN for user management)
- Check if you're logged in
- Verify token is valid (try logging out and back in)

## Quick Test Checklist

- [ ] Backend server starts successfully
- [ ] Frontend server starts successfully
- [ ] Can login with SuperAdmin credentials
- [ ] Can see Dashboard after login
- [ ] Can access Tenant Management (SuperAdmin)
- [ ] Can create a new tenant
- [ ] Can view tenant details
- [ ] Can login as DIRECTOR (from new tenant)
- [ ] Can access Users page (DIRECTOR/IT_ADMIN)
- [ ] Can create a new user
- [ ] Can edit a user
- [ ] Can delete a user
- [ ] Sidebar navigation works
- [ ] Logout works

## Additional Notes

- The application uses JWT tokens stored in localStorage
- Tokens expire after 7 days (configurable in `.env`)
- All API calls automatically include the token
- Tenant context is automatically set from the logged-in user's tenantId

