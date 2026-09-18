# Discord OAuth Registration Fix - Summary

## Problem Identified

The Discord OAuth registration was failing because of incorrect session handling. The user was being redirected to the login page instead of being automatically logged in after Discord authorization.

## Root Causes

### 1. **Using Service Role Client for Session Creation**
- The code was using `supabase.auth.signInWithPassword()` on the service role client (admin client)
- The service role client bypasses Row Level Security (RLS) and should NOT be used for creating user sessions
- This caused a mismatch between the session created and the cookies being set

### 2. **Session/Cookie Mismatch**
- Session was created on one client instance (service role with service key)
- Cookies were being set on a different client instance (SSR client with anon key)
- These two sessions were not synchronized, causing the user to not be logged in

### 3. **Incorrect Client Pattern**
- After creating a user with `admin.createUser()`, the code should use the regular anon client to sign in
- Using the admin client for sign-in bypasses proper session management

## Fixes Applied

### File: `app/api/auth/discord/register/route.ts`

1. **Renamed the admin client** (line 7):
   - Changed from `supabase` to `supabaseAdmin` to clearly distinguish it from the regular client
   - This prevents accidental use of the admin client for user operations

2. **Fixed session creation flow** (lines 144-180):
   - Create the `NextResponse` redirect object first
   - Create the SSR client with proper cookie handling
   - Use the SSR client (with anon key) to call `signInWithPassword()`
   - Removed the manual `setSession()` call since `signInWithPassword()` automatically sets the session cookies
   - This ensures the session and cookies are properly synchronized

3. **Added comprehensive logging**:
   - Added console logs at each critical step to help with debugging
   - Logs Discord user info
   - Logs when user is created in auth
   - Logs when user is created in public.users table
   - Logs when session is created
   - Added detailed error logging with JSON.stringify for better error diagnosis

### File: `app/auth/register/page.tsx`

1. **Fixed redirect URI configuration** (line 59):
   - Changed from hardcoded `https://www.thedulcandesign.com/api/auth/discord/register`
   - Now uses environment variable `NEXT_PUBLIC_DISCORD_REDIRECT_URI` with fallback
   - This ensures consistency between frontend and backend redirect URIs

## What You Need to Check

### 1. **Vercel Environment Variables**
Ensure these variables are set in your Vercel project settings:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
NEXT_PUBLIC_DISCORD_CLIENT_ID=your_discord_client_id
DISCORD_CLIENT_SECRET=your_discord_client_secret
NEXT_PUBLIC_DISCORD_REDIRECT_URI=https://www.thedulcandesign.com/api/auth/discord/register
```

### 2. **Discord Developer Portal Configuration**
In your Discord Application settings:

1. Go to **OAuth2** → **Redirects**
2. Ensure this redirect URI is added:
   ```
   https://www.thedulcandesign.com/api/auth/discord/register
   ```
3. Under **OAuth2** → **Scopes**, ensure these are selected:
   - `identify`
   - `email`
4. Make sure the application is **Public** (not in developer mode) if you want it to work for all users

### 3. **Check Vercel Logs**
After deploying, check the Vercel logs for the new console.log statements:

1. Go to your Vercel project
2. Click on the deployment
3. Click on **Logs**
4. Try the Discord OAuth registration flow
5. Look for these log messages:
   - `Discord user info:` - Shows if Discord user data is received
   - `Auth user created successfully:` - Shows if Supabase Auth user creation succeeded
   - `User created in public.users table successfully` - Shows if database user creation succeeded
   - `Session created successfully, redirecting to /perfil` - Shows if session creation succeeded
   - Any error messages with detailed JSON

### 4. **Check Browser Console**
Open your browser's developer console (F12) and check for:
- Any JavaScript errors
- Network tab failures
- Cookie-related errors

## Expected Flow After Fix

1. User clicks "Registrarse con Discord" on the registration page
2. User is redirected to Discord authorization page
3. User authorizes the application
4. Discord redirects back to `/api/auth/discord/register` with authorization code
5. Backend exchanges code for access token
6. Backend fetches Discord user info
7. Backend checks if user already exists (by Discord ID or email)
8. If new user:
   - Creates user in Supabase Auth using admin client
   - Creates user in `public.users` table using admin client
   - Creates session using SSR client with anon key
   - Sets session cookies automatically
9. User is redirected to `/perfil` and is automatically logged in

## Troubleshooting

If it still doesn't work after these fixes:

1. **Check the error parameter in the URL** - After redirect, check if there's an error parameter:
   - `?error=no_code` - Discord didn't return an authorization code
   - `?error=token_error` - Failed to exchange code for access token
   - `?error=create_error` - Failed to create user in Supabase
   - `?error=oauth_error` - General OAuth error

2. **Verify Discord email scope** - If Discord doesn't provide an email, the user will be created with a temporary email. This is handled but check if this is causing issues.

3. **Check Supabase Auth settings** - Ensure email confirmation is properly configured in Supabase.

4. **Test with a new Discord account** - Sometimes existing accounts may have conflicts.

## Additional Notes

- The temporary password is generated randomly and is only used internally for the initial sign-in
- The user never sees this password
- After registration, the user can log in with their Discord OAuth in the future
- The redirect to `/auth/login?discord_linked=true` is intentional for existing users who are just linking their Discord account
