# College Club Election Nomination System - Setup Guide

## Overview
This is a complete election nomination platform with a student nomination portal and teacher admin dashboard. The system uses Firebase for authentication, database storage, and file uploads.

## Features
✅ Multi-step nomination form (Identity → Post Selection → File Upload)
✅ Email domain validation
✅ Firebase Storage integration for photos & resumes (5MB limit each)
✅ Real-time nominations table in admin dashboard
✅ Filter and search capabilities
✅ PDF export of nominations
✅ Status management (Pending/Approved/Rejected)
✅ Mobile-responsive design

## Project Structure

```
/app
  /api
    /send-email/route.ts       # Email confirmation endpoint
  /nominate/page.tsx            # Student nomination portal
  /admin/page.tsx               # Teacher admin dashboard
  page.tsx                       # Home landing page
  layout.tsx                     # Root layout with metadata
  globals.css                    # Global styles

/public                          # Static assets (removed old HTML files)
  
.env.development.local          # Environment variables template
```

## Setup Instructions

### 1. Configure Firebase

#### Create Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Create a new project
3. Enable Firestore Database (Test mode for development)
4. Enable Firebase Storage
5. Enable Firebase Authentication (Email/Password method)

#### Get Firebase Credentials
1. In Firebase Console, go to Project Settings
2. Copy your configuration values:
   - API Key
   - Auth Domain
   - Project ID
   - Storage Bucket
   - Messaging Sender ID
   - App ID

#### Update Environment Variables
Add your Firebase credentials to `.env.development.local`:

```
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

### 2. Setup Firestore

The app will automatically create the `nominations` collection on first submission. Each nomination is stored with this structure:

```
{
  nominator_email: "student@university.edu",
  nominator_name: "John Student",
  candidate_name: "Jane Doe",
  candidate_email: "jane@university.edu",
  candidate_year: "Junior",
  nominated_positions: ["President", "Vice President"],
  nomination_reason: "Jane is a great leader...",
  photo_url: "gs://bucket/photos/...",
  resume_url: "gs://bucket/resumes/...",
  status: "pending",
  created_at: Timestamp,
  semester: "2024-Spring"
}
```

### 3. Setup Firebase Storage

Create two folders in Firebase Storage:
- `photos/` - for candidate photos (auto-created on first upload)
- `resumes/` - for candidate resumes (auto-created on first upload)

Files are validated for:
- Photo: JPG/PNG only, max 5MB
- Resume: PDF only, max 5MB

### 4. Create Admin Users

1. Go to Firebase Console → Authentication
2. Click "Add user"
3. Add teacher email addresses with secure passwords
4. Teachers will use these credentials to access `/admin`

### 5. Configure Email Domains (Optional)

Edit `app/nominate/page.tsx` and update the `ALLOWED_EMAIL_DOMAINS` array:

```typescript
const ALLOWED_EMAIL_DOMAINS = ['university.edu', 'college.edu'];
```

### 6. Setup Email Notifications (Optional)

To send confirmation emails on nomination submission:

#### Option A: EmailJS (Recommended)
1. Sign up at [EmailJS](https://www.emailjs.com)
2. Create a service and email template
3. Add credentials to `.env.development.local`:

```
NEXT_PUBLIC_EMAILJS_SERVICE_ID=service_xxx
NEXT_PUBLIC_EMAILJS_TEMPLATE_ID=template_xxx
NEXT_PUBLIC_EMAILJS_PUBLIC_KEY=public_key_xxx
```

4. Update the email sending logic in `app/nominate/page.tsx`

#### Option B: Your Email Service
Modify `app/api/send-email/route.ts` to integrate with SendGrid, Resend, or another service.

## Running the Application

```bash
npm run dev
# or
pnpm dev
# or
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

### For Students
1. Visit home page
2. Click "Submit Nomination"
3. Enter your email and name (identity verification)
4. Select up to 3 positions to nominate for
5. Fill in candidate details
6. Upload candidate photo and resume
7. Submit and receive confirmation

### For Teachers/Admins
1. Visit `/admin`
2. Login with your university email and password
3. View all nominations in real-time
4. Filter by status (Pending/Approved/Rejected) and semester
5. Approve or reject nominations
6. Download candidate photos and resumes
7. Export filtered nominations as PDF

## Security Features

✅ Email domain validation to prevent spam
✅ Firestore deduplication (one nomination per email)
✅ Firebase Authentication for admin access
✅ File size validation (5MB limit)
✅ XSS protection with HTML escaping
✅ Input validation on all forms
✅ Secure file storage in Firebase Storage

## Troubleshooting

### Firebase Not Configured Error
- Ensure all environment variables are set in `.env.development.local`
- Restart the development server after adding env vars
- Check Firebase Console for project creation

### File Upload Fails
- Ensure Firebase Storage bucket exists
- Check file size is under 5MB
- Verify file format (JPG/PNG for photos, PDF for resumes)
- Check Firebase Storage rules allow public uploads in test mode

### Admin Login Fails
- Ensure user exists in Firebase Authentication
- Verify email and password are correct
- Check Firebase Authentication is enabled in project

### Nominations Not Appearing in Admin Dashboard
- Ensure Firestore is enabled
- Check that nominations collection was created
- Verify real-time listener is connected (check browser console)

## Customization

### Change Available Positions
Edit `AVAILABLE_POSTS` in `app/nominate/page.tsx`:

```typescript
const AVAILABLE_POSTS = [
  'President',
  'Vice President',
  'Treasurer',
  // Add or modify positions
];
```

### Customize Styling
All styling uses Tailwind CSS. Modify colors in:
- `app/globals.css` - design tokens
- Component files - inline Tailwind classes

Primary colors:
- Primary: `bg-amber-500` (gold)
- Background: `bg-slate-800` (dark blue-gray)
- Accent: `text-amber-400`

### Update Email Domains
Edit `ALLOWED_EMAIL_DOMAINS` in `app/nominate/page.tsx` to match your institution's domain(s).

## Deployment to Vercel

1. Push code to GitHub repository
2. Go to [Vercel](https://vercel.com)
3. Click "New Project" and select your repository
4. Add environment variables in Settings → Environment Variables:
   - `NEXT_PUBLIC_FIREBASE_API_KEY`
   - `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
   - `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
   - `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
   - `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
   - `NEXT_PUBLIC_FIREBASE_APP_ID`
5. Deploy!

## Support

For Firebase documentation: https://firebase.google.com/docs
For Next.js documentation: https://nextjs.org/docs
For Tailwind CSS: https://tailwindcss.com

---

Built with Next.js 16, Firebase, and Tailwind CSS
