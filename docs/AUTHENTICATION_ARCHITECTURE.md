# Authentication Architecture

> **A detailed guide to how authentication works in CodeCraft AI**

This document explains our multi-layered authentication system that ensures users stay logged in even after multiple page reloads, browser restarts, and across different sessions.

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [The Three-Layer System](#the-three-layer-system)
3. [How Login Works](#how-login-works)
4. [How Page Reload Works](#how-page-reload-works)
5. [Session Expiry & Cleanup](#session-expiry--cleanup)
6. [Code Implementation](#code-implementation)
7. [Debugging & Troubleshooting](#debugging--troubleshooting)

---

## Overview

### The Problem We're Solving

When a user logs in to our app, we need to:
- ✅ Keep them logged in even after closing and reopening the browser
- ✅ Work reliably across multiple page reloads (3-4 times or more)
- ✅ Handle cases where cookies might get cleared
- ✅ Automatically clean up expired sessions
- ✅ Sync authentication state across multiple tabs

### Our Solution: Three-Layer Cookie System

We use **three independent layers** of session storage:

1. **Main Cookie** (1 year expiry) - Primary authentication
2. **Fallback Cookie in LocalDB** (7 days expiry) - Backup authentication
3. **Appwrite's localStorage** - Direct SDK session storage

If one layer fails, the next layer takes over automatically!

---

## The Three-Layer System

### Layer 1: Main Cookie 🍪

**Location**: Browser cookies (`document.cookie`)
**Name**: `codecraft_auth_session`
**Expiry**: 1 year
**Purpose**: Primary authentication method

```javascript
// Stored in browser cookies
codecraft_auth_session = "eyJhbGciOiJI...token...xyz"
```

**Advantages:**
- Survives browser restarts
- Works across tabs automatically
- Long expiry (1 year)

**Disadvantages:**
- Can be cleared by user or browser extensions
- Some browsers limit cookie size

---

### Layer 2: Fallback Cookie in LocalDB 💾

**Location**: LocalStorage (`localStorage`)
**Key**: `codecraft_fallback_token`
**Expiry**: 7 days (auto-refresh on each use)
**Purpose**: Backup if main cookie is lost

```javascript
// Stored in localStorage
{
  "token": "eyJhbGciOiJI...token...xyz",
  "userId": "user_123",
  "email": "user@example.com",
  "createdAt": "2025-01-15T10:30:00.000Z",
  "expiresAt": "2025-01-22T10:30:00.000Z"  // 7 days from creation
}
```

**Advantages:**
- Larger storage capacity
- Contains user metadata (email, userId)
- Auto-refreshes on each successful auth check (extends 7 days)

**Disadvantages:**
- 7-day expiry (shorter than main cookie)
- Must be manually cleaned up when expired

---

### Layer 3: Appwrite localStorage 🔐

**Location**: LocalStorage (`localStorage`)
**Key**: `appwrite-{projectId}`
**Expiry**: Managed by Appwrite SDK
**Purpose**: Direct session used by Appwrite SDK

```javascript
// Stored in localStorage
appwrite-672d8e990027ae649890 = "session_token_here"
```

**Advantages:**
- Used directly by Appwrite SDK
- Automatically managed by SDK

**Disadvantages:**
- Can be lost if localStorage is cleared
- No built-in fallback mechanism

---

## How Login Works

### Step-by-Step Flow

```
User enters email & password
         ↓
    Click "Sign In"
         ↓
┌────────────────────────────────┐
│ 1. Call Appwrite API           │
│    account.createEmailPassword │
│    Session(email, password)    │
└────────────────────────────────┘
         ↓
┌────────────────────────────────┐
│ 2. Appwrite returns session    │
│    with secret token            │
└────────────────────────────────┘
         ↓
┌────────────────────────────────┐
│ 3. Get user info from Appwrite │
│    account.get()                │
└────────────────────────────────┘
         ↓
┌────────────────────────────────┐
│ 4. SAVE TO ALL THREE LAYERS:   │
│                                 │
│    Layer 1: Main Cookie         │
│    ├─ Set codecraft_auth_      │
│    │  session cookie            │
│    └─ Expiry: 1 year            │
│                                 │
│    Layer 2: Fallback in LocalDB │
│    ├─ Save token + user data   │
│    └─ Expiry: 7 days            │
│                                 │
│    Layer 3: Appwrite localStorage│
│    └─ appwrite-{projectId}     │
└────────────────────────────────┘
         ↓
┌────────────────────────────────┐
│ 5. User is logged in!           │
│    Redirect to dashboard        │
└────────────────────────────────┘
```

### Code Implementation (Login)

**File**: `src/lib/appwrite/auth.ts`

```javascript
async signIn(email: string, password: string) {
  // 1. Create Appwrite session
  const session = await account.createEmailPasswordSession(email, password);

  // 2. Get user info
  const user = await account.get();

  // 3. Extract session token
  const sessionToken = session.secret || session.$id;

  // 4. Save to all three layers
  sessionManager.saveAuthSession(sessionToken, {
    $id: user.$id,
    email: user.email
  });

  // This saves:
  // - Main cookie (Layer 1)
  // - Fallback in LocalDB (Layer 2)
  // - Appwrite localStorage (Layer 3)
}
```

---

## How Page Reload Works

### The Challenge

When a user reloads the page:
- All JavaScript state is lost
- React components remount
- We need to restore authentication from storage

### Step-by-Step Flow

```
User reloads page (F5 or Ctrl+R)
         ↓
┌────────────────────────────────┐
│ 1. SessionInitializer runs     │
│    (mounted in root layout)     │
└────────────────────────────────┘
         ↓
┌────────────────────────────────┐
│ 2. Try to restore session       │
│    Check layers in order:       │
│                                 │
│    ┌─ Layer 1: Main Cookie?    │
│    │  ✅ Found → Use it         │
│    │                            │
│    ├─ Layer 2: Fallback?       │
│    │  ✅ Found → Restore to L1  │
│    │                            │
│    └─ Layer 3: Appwrite?       │
│       ✅ Found → Sync to L1&L2  │
└────────────────────────────────┘
         ↓
┌────────────────────────────────┐
│ 3. Restore to Appwrite          │
│    localStorage                 │
│    (so SDK can use it)          │
└────────────────────────────────┘
         ↓
┌────────────────────────────────┐
│ 4. Call getCurrentUser()        │
│    Try to fetch user from       │
│    Appwrite API                 │
└────────────────────────────────┘
         ↓
    ┌───────┐
    │Success?│
    └───┬───┘
        │
    ✅ Yes ─────────────► User stays logged in
        │                 ├─ Refresh fallback (extend 7 days)
        │                 └─ Sync all layers
        │
    ❌ No ──────────────► Try fallback restore
                          └─ If fails → Redirect to login
```

### Code Implementation (Reload)

**File**: `src/components/auth/SessionInitializer.tsx`

```javascript
export function SessionInitializer() {
  useEffect(() => {
    // 1. Clean up any expired fallback tokens
    sessionManager.cleanupExpiredFallback();

    // 2. Restore session from cookies to Appwrite localStorage
    const restored = sessionManager.restoreAppwriteSession();

    // 3. Log status for debugging
    sessionManager.logSessionStatus();
  }, []);

  return null; // This component doesn't render anything
}
```

**File**: `src/lib/appwrite/auth.ts`

```javascript
async getCurrentUser() {
  try {
    // 1. Try to restore session from cookies/fallback
    sessionManager.restoreAppwriteSession();

    // 2. Try to get user from Appwrite
    const user = await account.get();

    // 3. If successful, sync everything
    const keys = Object.keys(localStorage);
    const sessionKey = keys.find(key => key.includes('appwrite'));
    if (sessionKey) {
      const sessionData = localStorage.getItem(sessionKey);
      sessionManager.saveAuthSession(sessionData, {
        $id: user.$id,
        email: user.email
      });
    }

    // 4. Refresh fallback token (extend 7 days)
    sessionManager.refreshFallbackToken();

    return { success: true, user };
  } catch (error) {
    // If failed, try fallback restore
    const fallback = sessionManager.getFallbackToken();
    if (fallback) {
      // Restore and retry...
    }
    return { success: false };
  }
}
```

---

## Session Expiry & Cleanup

### Main Cookie Expiry (1 Year)

The main cookie lasts for **1 year**:

```javascript
const MAIN_COOKIE_DAYS = 365; // 1 year

cookies.set('codecraft_auth_session', sessionToken, {
  days: 365,
  secure: true,
  sameSite: 'Lax',
  path: '/'
});
```

### Fallback Token Expiry (7 Days)

The fallback token lasts for **7 days** and is **auto-refreshed** on each successful auth check:

```javascript
const FALLBACK_TOKEN_DAYS = 7; // 7 days

// On every successful getCurrentUser():
sessionManager.refreshFallbackToken(); // Extends expiry by 7 days
```

### Automatic Cleanup

**When it runs:**
1. On page load (SessionInitializer)
2. Before every sync operation
3. Every 24 hours (periodic cleanup)

**What it does:**
- Checks if fallback token has expired
- If expired → Deletes it from LocalDB
- Logs cleanup action to console

```javascript
// Runs automatically
sessionManager.cleanupExpiredFallback();

// What it does:
const fallback = getFallbackToken();
if (fallback) {
  const now = new Date();
  const expiresAt = new Date(fallback.expiresAt);

  if (now > expiresAt) {
    console.log('🧹 Cleaning up expired fallback token (7 days passed)');
    localStorage.removeItem('codecraft_fallback_token');
  }
}
```

---

## Code Implementation

### File Structure

```
src/
├── lib/
│   ├── appwrite/
│   │   ├── auth.ts              # Authentication functions
│   │   └── sessionManager.ts    # Session management (3-layer system)
│   ├── utils/
│   │   └── cookies.ts           # Cookie utilities
│   └── stores/
│       └── authStore.ts         # Zustand auth state
└── components/
    └── auth/
        └── SessionInitializer.tsx  # Auto-restore on page load
```

### Key Functions

#### `sessionManager.saveAuthSession()`

Saves session token to all three layers:

```javascript
saveAuthSession(sessionToken: string, userData: { $id: string; email: string }) {
  // Layer 1: Main cookie (1 year)
  cookies.set('codecraft_auth_session', sessionToken, {
    days: 365,
    secure: true,
    sameSite: 'Lax',
    path: '/'
  });

  // Layer 2: Fallback in LocalDB (7 days)
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const fallbackToken = {
    token: sessionToken,
    userId: userData.$id,
    email: userData.email,
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString()
  };

  localStorage.setItem('codecraft_fallback_token', JSON.stringify(fallbackToken));

  console.log('✅ Session saved to all layers');
}
```

#### `sessionManager.getSession()`

Tries to get session from any layer:

```javascript
getSession(): string | null {
  // 1. Try main cookie first
  const mainSession = this.getMainSession();
  if (mainSession) return mainSession;

  // 2. Try fallback token from LocalDB
  const fallback = this.getFallbackToken();
  if (fallback) {
    // Restore main cookie from fallback
    this.restoreMainCookieFromFallback(fallback);
    return fallback.token;
  }

  // 3. Try Appwrite's localStorage as last resort
  const keys = Object.keys(localStorage);
  const sessionKey = keys.find(key =>
    key.includes('appwrite') &&
    (key.includes('session') || key.includes('cookie'))
  );

  if (sessionKey) {
    return localStorage.getItem(sessionKey);
  }

  return null;
}
```

#### `sessionManager.restoreAppwriteSession()`

Restores session from cookies to Appwrite localStorage:

```javascript
restoreAppwriteSession(): boolean {
  // 1. Clean up expired fallback first
  this.cleanupExpiredFallback();

  // 2. Get session from any layer
  const session = this.getSession();
  if (!session) {
    console.warn('❌ No session found to restore');
    return false;
  }

  // 3. Restore to Appwrite localStorage
  const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
  const sessionKey = `appwrite-${projectId}`;

  localStorage.setItem(sessionKey, session);
  console.log('✅ Appwrite session restored to localStorage');

  return true;
}
```

---

## Debugging & Troubleshooting

### Check Session Status

Run this in browser console to see all session layers:

```javascript
// In browser console
sessionManager.logSessionStatus();
```

**Example Output:**

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔍 Session Status Check
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Main Cookie (codecraft_auth_session):
   Status: ACTIVE (expires in 1 year)
   Token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI...

✅ Fallback Token (LocalDB):
   Status: ACTIVE
   User: user@example.com
   Expires in: 6 days
   Created: 1/15/2025, 10:30:00 AM

✅ Appwrite localStorage:
   - appwrite-672d8e990027ae649890

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Common Issues & Solutions

#### Issue 1: "Auth not persisting after reload"

**Symptoms:**
- User gets logged out after page reload
- Console shows "No session found to restore"

**Solution:**
1. Check if cookies are enabled in browser
2. Run `sessionManager.logSessionStatus()` to see which layers exist
3. Check browser console for any errors during login
4. Verify session is being saved on login (check console logs)

---

#### Issue 2: "Fallback token expired"

**Symptoms:**
- Console shows "Fallback token expired (7 days passed)"
- User needs to log in again

**Solution:**
- This is expected behavior after 7 days of inactivity
- User must log in again to create a new session
- To prevent this: Visit the app at least once every 7 days (auto-refreshes)

---

#### Issue 3: "Multiple duplicate auth checks"

**Symptoms:**
- Multiple "getCurrentUser" calls in console
- Performance issues on page load

**Solution:**
- Check for duplicate SessionInitializer components
- Ensure useEffect has empty dependency array `[]`
- Use React.StrictMode carefully (it runs effects twice in development)

---

### Console Logs Reference

Here are the key console logs you'll see:

#### Login Flow:
```
[ClientAuth] ✅ Session created with Appwrite
[ClientAuth] ✅ User verified: user@example.com
[ClientAuth] 💾 Saving session token directly
[SessionManager] ✅ Main auth cookie saved (expires in 1 year)
[SessionManager] ✅ Fallback token saved to LocalDB (expires in 7 days)
```

#### Page Reload Flow:
```
[SessionInitializer] 🚀 Initializing session restoration...
[SessionManager] 🔧 Creating new Appwrite session key
[SessionManager] ✅ Appwrite session restored to localStorage
[ClientAuth] ✅ Successfully retrieved user: user@example.com
[ClientAuth] 💾 Syncing session after successful user fetch...
[ClientAuth] ✅ Session synced to cookies
```

#### Cleanup Flow:
```
[SessionManager] 🧹 Running periodic cleanup...
[SessionManager] 🧹 Cleaning up expired fallback token (7 days passed)
```

---

## Summary

### Key Takeaways

1. **Three-Layer System**: Main cookie → Fallback → Appwrite localStorage
2. **Auto-Recovery**: If one layer fails, the next takes over
3. **Auto-Refresh**: Fallback token extends 7 days on each successful auth check
4. **Auto-Cleanup**: Expired tokens cleaned up automatically
5. **Full Logging**: Every operation logged to console for debugging

### Session Lifetimes

| Layer | Expiry | Auto-Refresh | Purpose |
|-------|--------|--------------|---------|
| Main Cookie | 1 year | No | Primary auth |
| Fallback Token | 7 days | Yes (on auth check) | Backup auth |
| Appwrite localStorage | SDK managed | By SDK | Direct SDK access |

### Flow Diagram

```
┌─────────────────────────────────────────────────┐
│                    USER LOGIN                    │
└───────────────────┬─────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────┐
│  SAVE TO ALL 3 LAYERS:                          │
│  ├─ Main Cookie (1 year)                        │
│  ├─ Fallback LocalDB (7 days)                   │
│  └─ Appwrite localStorage                       │
└───────────────────┬─────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────┐
│               USER RELOADS PAGE                  │
└───────────────────┬─────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────┐
│  TRY TO RESTORE (in order):                     │
│  1. Main Cookie → Found? ✅ Use it               │
│  2. Fallback → Found? ✅ Restore main & use      │
│  3. Appwrite → Found? ✅ Sync all & use          │
│  4. None found? ❌ Redirect to login             │
└───────────────────┬─────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────┐
│  AUTO-REFRESH FALLBACK TOKEN (extend 7 days)    │
└─────────────────────────────────────────────────┘
```

---

## Related Documentation

- [Data Synchronization Architecture](./DATA_SYNC_ARCHITECTURE.md)
- [Local Database Documentation](./STATE_MANAGEMENT_ARCHITECTURE.md)

---

**Last Updated**: January 2025
**Maintained By**: CodeCraft AI Team
