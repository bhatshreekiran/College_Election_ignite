# Quick Start Guide

## 5-Minute Setup

### Step 1: Get Firebase Credentials (2 minutes)
1. Visit [Firebase Console](https://console.firebase.google.com)
2. Create a new project or use existing
3. Copy credentials from **Project Settings**
4. In v0 settings, click "Vars" and add:
   - `NEXT_PUBLIC_FIREBASE_API_KEY`
   - `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
   - `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
   - `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
   - `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
   - `NEXT_PUBLIC_FIREBASE_APP_ID`

### Step 2: Configure Firebase (2 minutes)
In Firebase Console:
1. **Firestore**: Enable Database → Start in Test Mode
2. **Storage**: Enable Storage → Start in Test Mode  
3. **Auth**: Enable Authentication → Email/Password method

### Step 3: Create an Admin User (1 minute)
In Firebase Console → Authentication:
- Click "Add user"
- Enter teacher email and password
- Click "Create user"

## Project URLs

- **Home**: http://localhost:3000
- **Student Portal**: http://localhost:3000/nominate
- **Admin Dashboard**: http://localhost:3000/admin

## Pages Overview

### Home (`/`)
Landing page with links to nomination and admin portals

### Nomination Portal (`/nominate`)
3-step form:
1. **Identity**: Email & name verification
2. **Posts**: Select up to 3 positions
3. **Details**: Candidate info & file uploads

Features:
- Email domain validation
- Real-time character counter
- Photo preview
- Resume upload (5MB limit)
- Duplicate prevention

### Admin Dashboard (`/admin`)
Teacher-only area:
- Real-time nomination table
- Filter by status & semester
- Approve/Reject nominations
- Export to PDF
- View photos & download resumes

## Default Configuration

**Available Positions**:
- President
- Vice President
- Treasurer
- Secretary
- Event Coordinator
- Social Media Manager
- Membership Officer
- General Member

**Email Domains**: `edu`, `gmail.com` (customize in code)

**File Limits**:
- Photos: 5MB max (JPG/PNG)
- Resumes: 5MB max (PDF)

## Common Tasks

### Change Available Positions
Edit `/app/nominate/page.tsx` line 29:
```typescript
const AVAILABLE_POSTS = ['Your', 'Positions', 'Here'];
```

### Change Email Domain Whitelist
Edit `/app/nominate/page.tsx` line 31:
```typescript
const ALLOWED_EMAIL_DOMAINS = ['your-domain.edu'];
```

### Customize Colors
Edit `/app/globals.css` to change design tokens, or edit Tailwind classes in components:
- Primary: `amber-500` → `blue-600` etc.
- Background: `slate-800` → `gray-900` etc.

### Send Confirmation Emails
1. Sign up at [EmailJS](https://emailjs.com)
2. Get Service ID, Template ID, Public Key
3. Add to environment variables
4. Uncomment email code in `/app/nominate/page.tsx`

## Deployment

### To Vercel (Recommended)
1. Push to GitHub
2. Visit vercel.com → New Project
3. Select your repo
4. Add same environment variables
5. Deploy!

### To Other Platforms
Works with any Node.js 18+ hosting (Railways, Render, etc.)

## Troubleshooting

**"404 Page not found"**
- Ensure Firebase env vars are set
- Restart dev server

**File upload fails**
- Check file size < 5MB
- Ensure correct file type
- Check Firebase Storage is enabled

**Admin login fails**
- Verify user in Firebase Authentication
- Check correct email & password
- Ensure Firebase Auth is enabled

**No nominations showing**
- Check Firestore Database exists
- Verify real-time listener connected
- Check browser console for errors

## Need Help?

- [Firebase Docs](https://firebase.google.com/docs)
- [Next.js Docs](https://nextjs.org/docs)  
- [Tailwind CSS](https://tailwindcss.com/docs)

---

**Ready?** Visit `/nominate` to test the student portal!
