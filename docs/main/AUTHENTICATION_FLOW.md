# Authentication Flow

## Overview

Our authentication system uses **Appwrite + Cookies + LocalDB + Zustand** to provide secure, persistent authentication with offline capability.

```
┌──────────────────┐
│  Appwrite Auth   │ ← Source of truth (email/password sessions)
└────────┬─────────┘
         │
         ↓
┌──────────────────┐
│  Session Cookie  │ ← Browser cookie (7 days, httpOnly-like)
└────────┬─────────┘
         │
         ↓
┌──────────────────┐
│  Appwrite LS     │ ← localStorage (Appwrite SDK auto-manages)
└────────┬─────────┘
         │
         ↓
┌──────────────────┐
│  Zustand Store   │ ← React state (persisted via zustand middleware)
└────────┬─────────┘
         │
         ↓
┌──────────────────┐
│      UI          │ ← Components read from store
└──────────────────┘
```

## Architecture Components

### 1. Appwrite Authentication
- **Service**: Appwrite Account API
- **Method**: Email/Password sessions
- **Location**: `src/lib/appwrite/auth.ts`

### 2. Session Manager
- **Purpose**: Cookie management and session restoration
- **Location**: `src/lib/appwrite/sessionManager.ts`
- **Storage**: Browser cookies + localStorage sync

### 3. Cookie Utilities
- **Purpose**: Browser cookie read/write/delete
- **Location**: `src/lib/utils/cookies.ts`
- **Features**: Secure, SameSite, expiry management

### 4. Auth Store (Zustand)
- **Purpose**: React state management for auth
- **Location**: `src/lib/stores/authStore.ts`
- **Features**: User state, loading states, persistence

### 5. Auth Components
- **LoginForm**: `src/components/auth/LoginForm.tsx`
- **RegisterForm**: `src/components/auth/RegisterForm.tsx`
- **AuthProvider**: `src/components/auth/AuthProvider.tsx`
- **AuthGuard**: `src/components/auth/AuthGuard.tsx`
- **SessionInitializer**: `src/components/auth/SessionInitializer.tsx`

## Authentication Flows

### Flow 1: User Registration

```
User Fills Form
      ↓
┌─────────────────────────────────────┐
│ 1. RegisterForm.handleSubmit()     │
│    - Validates email/password       │
│    - Checks password strength       │
└─────────────────────────────────────┘
      ↓
┌─────────────────────────────────────┐
│ 2. clientAuth.signUp()              │
│    - Appwrite API call              │
│    - Create account + session       │
└─────────────────────────────────────┘
      ↓
┌─────────────────────────────────────┐
│ 3. Appwrite SDK auto-saves          │
│    - localStorage: appwrite-PROJECT │
│    - Session data stored            │
└─────────────────────────────────────┘
      ↓
┌─────────────────────────────────────┐
│ 4. sessionManager.syncFromAppwrite()│
│    - Read from Appwrite localStorage│
│    - Save to custom cookie          │
└─────────────────────────────────────┘
      ↓
┌─────────────────────────────────────┐
│ 5. authStore.setUser()              │
│    - Update Zustand state           │
│    - Zustand persist → localStorage │
└─────────────────────────────────────┘
      ↓
┌─────────────────────────────────────┐
│ 6. Router redirect                  │
│    - Navigate to /dashboard         │
└─────────────────────────────────────┘
```

**Code Example** (`RegisterForm.tsx`):
```typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setError(null);
  setLoading(true);

  // 1. Validate inputs
  if (!isValidEmail(email)) {
    setError("Please enter a valid email address");
    setLoading(false);
    return;
  }

  const passwordCheck = validatePassword(password);
  if (!passwordCheck.isValid) {
    setError(passwordCheck.errors[0]);
    setLoading(false);
    return;
  }

  try {
    // 2. Call Appwrite API
    const result = await signUp(email, password, name);

    if (result.success) {
      // 3. Session auto-saved by Appwrite SDK
      
      // 4. Sync to cookie
      sessionManager.syncFromAppwrite();
      
      // 5. Update store (triggers persist)
      setUser(result.user);
      
      // 6. Redirect
      router.push("/dashboard");
    } else {
      setError(result.error || "Registration failed");
    }
  } catch (err) {
    setError("An unexpected error occurred");
  } finally {
    setLoading(false);
  }
};
```

### Flow 2: User Login

```
User Enters Credentials
      ↓
┌─────────────────────────────────────┐
│ 1. LoginForm.handleSubmit()        │
│    - Validates email format         │
└─────────────────────────────────────┘
      ↓
┌─────────────────────────────────────┐
│ 2. clientAuth.signIn()              │
│    - Appwrite createSession()       │
│    - Returns user + session         │
└─────────────────────────────────────┘
      ↓
┌─────────────────────────────────────┐
│ 3. Appwrite SDK auto-saves          │
│    - localStorage: appwrite-PROJECT │
└─────────────────────────────────────┘
      ↓
┌─────────────────────────────────────┐
│ 4. sessionManager.syncFromAppwrite()│
│    - Copy to cookie for persistence │
└─────────────────────────────────────┘
      ↓
┌─────────────────────────────────────┐
│ 5. authStore.setUser()              │
│    - Update React state             │
│    - Persist to localStorage        │
└─────────────────────────────────────┘
      ↓
┌─────────────────────────────────────┐
│ 6. Redirect to dashboard            │
└─────────────────────────────────────┘
```

**Code Example** (`LoginForm.tsx`):
```typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setError(null);
  setLoading(true);

  if (!isValidEmail(email)) {
    setError("Please enter a valid email address");
    setLoading(false);
    return;
  }

  try {
    // Login via Appwrite
    const result = await signIn(email, password);

    if (result.success && result.user) {
      // Sync session to cookie
      sessionManager.syncFromAppwrite();
      
      // Update Zustand store
      setUser(result.user);
      
      // Redirect
      router.push("/dashboard");
    } else {
      setError(result.error || "Login failed");
    }
  } catch (err) {
    setError("An unexpected error occurred");
  } finally {
    setLoading(false);
  }
};
```

### Flow 3: App Initialization (Restore Session)

**Happens on every app load**

```
App Starts
      ↓
┌─────────────────────────────────────┐
│ 1. SessionInitializer mounts        │
│    (in root layout)                 │
└─────────────────────────────────────┘
      ↓
┌─────────────────────────────────────┐
│ 2. sessionManager.initialize()      │
│    - Auto-called on import          │
└─────────────────────────────────────┘
      ↓
┌─────────────────────────────────────┐
│ 3. Check Appwrite localStorage      │
│    - Key: appwrite-{PROJECT_ID}     │
└─────────────────────────────────────┘
      ↓
   Has Session?
      ├─ NO ──────────────────────────┐
      │                                │
┌─────┴──────────────────────────┐   │
│ 4a. sessionManager.restoreSession()│
│     - Check cookie              │   │
│     - Copy to Appwrite LS       │   │
└─────────────────────────────────┘   │
      │                                │
      ↓                                ↓
┌─────────────────────────────────────┐
│ 5. AuthProvider.checkAuth()        │
│    - Call Appwrite API              │
│    - Verify session still valid     │
└─────────────────────────────────────┘
      ↓
   Valid Session?
      ├─ YES → Update authStore.setUser()
      └─ NO  → authStore.setUser(null)
```

**Code Example** (`SessionInitializer.tsx`):
```typescript
export function SessionInitializer() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // Restore session if needed
    sessionManager.restoreSession();
    
    console.log('[SessionInitializer] ✅ Session restored');
  }, []);

  return null; // No UI
}
```

**Code Example** (`sessionManager.ts`):
```typescript
export const sessionManager = {
  initialize(): void {
    if (typeof window === 'undefined') return;
    
    console.log('[SessionManager] 🚀 Initializing...');
    
    // Try to restore session if Appwrite localStorage is empty
    this.restoreSession();
    
    console.log('[SessionManager] ✅ Initialized');
  },
  
  restoreSession(): boolean {
    if (typeof window === 'undefined') return false;

    const session = this.getSession(); // From cookie
    if (!session) {
      console.log('[SessionManager] ℹ️ No session to restore');
      return false;
    }

    // Check if Appwrite already has session
    const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
    const appwriteKey = `appwrite-${projectId}`;
    const existing = localStorage.getItem(appwriteKey);

    if (existing) {
      console.log('[SessionManager] ℹ️ Appwrite session exists');
      return true;
    }

    // Restore to Appwrite localStorage
    localStorage.setItem(appwriteKey, session);
    console.log('[SessionManager] ✅ Session restored');
    return true;
  }
};

// Auto-initialize
if (typeof window !== 'undefined') {
  sessionManager.initialize();
}
```

### Flow 4: Protected Route Access

```
User Navigates to Protected Page
      ↓
┌─────────────────────────────────────┐
│ 1. AuthGuard component mounts       │
└─────────────────────────────────────┘
      ↓
┌─────────────────────────────────────┐
│ 2. Check authStore.isAuthenticated  │
└─────────────────────────────────────┘
      ↓
   Authenticated?
      ├─ YES → Render children
      │
      └─ NO
          ↓
┌─────────────────────────────────────┐
│ 3. authStore.checkAuth()            │
│    - Verify with Appwrite API       │
└─────────────────────────────────────┘
      ↓
   Valid Session?
      ├─ YES → Update store, render page
      │
      └─ NO
          ↓
┌─────────────────────────────────────┐
│ 4. Redirect to /login               │
│    - Clear all sessions             │
└─────────────────────────────────────┘
```

**Code Example** (`AuthGuard.tsx`):
```typescript
export function AuthGuard({ children }: AuthGuardProps) {
  const [isChecking, setIsChecking] = useState(true);
  const { user, isAuthenticated, checkAuth } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    const verify = async () => {
      if (!isAuthenticated) {
        // Try to restore session
        await checkAuth();
      }
      
      setIsChecking(false);
    };

    verify();
  }, [isAuthenticated, checkAuth]);

  useEffect(() => {
    if (!isChecking && !isAuthenticated) {
      // Redirect to login
      router.push('/login');
    }
  }, [isChecking, isAuthenticated, router]);

  // Show loading while checking
  if (isChecking) {
    return <div>Loading...</div>;
  }

  // Show nothing if not authenticated (redirecting)
  if (!isAuthenticated) {
    return null;
  }

  // Render protected content
  return <>{children}</>;
}
```

### Flow 5: User Logout

```
User Clicks Logout
      ↓
┌─────────────────────────────────────┐
│ 1. authStore.signOut()              │
└─────────────────────────────────────┘
      ↓
┌─────────────────────────────────────┐
│ 2. clientAuth.signOut()             │
│    - Appwrite deleteSession()       │
└─────────────────────────────────────┘
      ↓
┌─────────────────────────────────────┐
│ 3. sessionManager.clearSession()    │
│    - Delete cookie                  │
│    - Clear Appwrite localStorage    │
└─────────────────────────────────────┘
      ↓
┌─────────────────────────────────────┐
│ 4. authStore.setUser(null)          │
│    - Clear Zustand state            │
│    - Clear persist storage          │
└─────────────────────────────────────┘
      ↓
┌─────────────────────────────────────┐
│ 5. Redirect to /login               │
└─────────────────────────────────────┘
```

**Code Example** (`authStore.ts`):
```typescript
signOut: async () => {
  set({ isLoading: true, error: null });

  try {
    // 1. Call Appwrite API
    const result = await clientAuth.signOut();

    if (result.success) {
      // 2. Clear session cookie and localStorage
      sessionManager.clearSession();

      // 3. Clear Zustand state
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });

      return { success: true };
    } else {
      set({ isLoading: false, error: result.error });
      return { success: false, error: result.error };
    }
  } catch (error: unknown) {
    const errorMsg = error instanceof Error 
      ? error.message 
      : "Sign out failed";
    set({ isLoading: false, error: errorMsg });
    return { success: false, error: errorMsg };
  }
}
```

## Session Persistence Layers

### Layer 1: Appwrite localStorage
**Key**: `appwrite-{PROJECT_ID}`  
**Managed by**: Appwrite SDK (automatic)  
**Contains**: Session token, user ID, preferences  
**Lifetime**: Until manually cleared

### Layer 2: Custom Cookie
**Key**: `codecraft_session`  
**Managed by**: sessionManager  
**Contains**: Copy of Appwrite localStorage data  
**Lifetime**: 7 days  
**Purpose**: Backup if Appwrite localStorage is cleared

### Layer 3: Zustand Persist
**Key**: `auth-storage`  
**Managed by**: Zustand persistence middleware  
**Contains**: User object, isAuthenticated flag  
**Lifetime**: Until manually cleared  
**Purpose**: Fast React state restoration

## Cookie Configuration

**File**: `src/lib/utils/cookies.ts`

```typescript
interface CookieOptions {
  days?: number;        // Expiry (default: 7)
  secure?: boolean;     // HTTPS only
  sameSite?: 'Strict' | 'Lax' | 'None';
  path?: string;        // Cookie path (default: '/')
}

const cookies = {
  set(name: string, value: string, options: CookieOptions = {}) {
    const {
      days = 7,
      secure = window.location.protocol === 'https:',
      sameSite = 'Lax',
      path = '/'
    } = options;

    let cookieString = `${name}=${encodeURIComponent(value)}`;
    
    if (days) {
      const expires = new Date();
      expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
      cookieString += `; expires=${expires.toUTCString()}`;
    }
    
    cookieString += `; path=${path}`;
    cookieString += `; SameSite=${sameSite}`;
    
    if (secure) {
      cookieString += '; Secure';
    }
    
    document.cookie = cookieString;
  },
  
  get(name: string): string | null {
    const cookies = document.cookie.split('; ');
    const cookie = cookies.find(c => c.startsWith(`${name}=`));
    
    if (!cookie) return null;
    
    const value = cookie.split('=')[1];
    return decodeURIComponent(value);
  },
  
  delete(name: string) {
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
  }
};
```

## AuthStore (Zustand)

**File**: `src/lib/stores/authStore.ts`

```typescript
interface AuthState {
  // State
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  setUser: (user: User | null) => void;
  checkAuth: () => Promise<void>;
  signOut: () => Promise<{ success: boolean; error?: string }>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      setUser: (user) => {
        set({
          user,
          isAuthenticated: !!user,
          error: null,
        });
      },

      checkAuth: async () => {
        set({ isLoading: true, error: null });

        try {
          const result = await clientAuth.getCurrentUser();

          if (result.success && result.user) {
            set({
              user: result.user,
              isAuthenticated: true,
              isLoading: false,
            });
          } else {
            set({
              user: null,
              isAuthenticated: false,
              isLoading: false,
            });
          }
        } catch (error) {
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: 'Session verification failed',
          });
        }
      },

      signOut: async () => {
        // ... (see Flow 5 above)
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'auth-storage', // localStorage key
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
```

## Security Considerations

### 1. Cookie Security
```typescript
cookies.set('codecraft_session', sessionData, {
  secure: true,        // HTTPS only in production
  sameSite: 'Lax',     // CSRF protection
  days: 7              // Auto-expire after 7 days
});
```

### 2. Session Validation
Always verify with Appwrite API:
```typescript
// Don't trust localStorage alone
await clientAuth.getCurrentUser(); // API call
```

### 3. Automatic Session Cleanup
```typescript
sessionManager.clearSession(): void {
  // Clear ALL storage
  cookies.delete(SESSION_COOKIE);
  
  const keys = Object.keys(localStorage);
  keys.forEach(key => {
    if (key.includes('appwrite')) {
      localStorage.removeItem(key);
    }
  });
}
```

### 4. Route Protection
All protected routes wrapped with `<AuthGuard>`:
```typescript
<AuthGuard requireAuth redirectTo="/login">
  <DashboardPage />
</AuthGuard>
```

## Troubleshooting

### Issue: User Logged Out After Refresh

**Cause**: Appwrite localStorage cleared  
**Solution**: Cookie backup restores session
```typescript
sessionManager.restoreSession();
```

### Issue: Infinite Redirect Loop

**Cause**: `checkAuth()` failing repeatedly  
**Solution**: Check Appwrite API connectivity
```typescript
// Add timeout
const result = await Promise.race([
  clientAuth.getCurrentUser(),
  timeout(5000) // 5s timeout
]);
```

### Issue: Session Persists After Logout

**Cause**: Incomplete cleanup  
**Solution**: Clear all storage layers
```typescript
sessionManager.clearSession();
authStore.getState().signOut();
// Verify all cleared
console.log(localStorage.getItem('appwrite-*')); // null
console.log(cookies.get('codecraft_session')); // null
```

## Summary

**Three-Layer Persistence**:
1. **Appwrite localStorage** - Managed by SDK
2. **Custom cookie** - Backup for restoration
3. **Zustand persist** - React state cache

**Key Points**:
- SessionInitializer runs on app start
- Cookie provides backup if localStorage cleared
- AuthGuard verifies all protected routes
- API verification prevents stale sessions
- Complete cleanup on logout

**Flow**: Appwrite Auth → localStorage → Cookie → Zustand → UI

This architecture provides:
- **Fast** restoration (no API call on load)
- **Reliable** backup (cookie fallback)
- **Secure** validation (API verification)
- **Automatic** session management
