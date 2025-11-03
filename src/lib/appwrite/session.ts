/**
 * Session Helper - Server-side session utilities
 * Extracts and validates Appwrite session from Next.js cookies
 * Features: Cookie parsing, session token extraction
 * Used in: Server components and API routes for authentication
 */
import { cookies } from 'next/headers';

export async function getSessionFromCookies(): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    const allCookies = cookieStore.getAll();

    // Try to find Appwrite's native session cookie first
    const appwriteSessionCookie = allCookies.find(c =>
      c.name.startsWith('a_session_') && c.name.includes(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || '')
    );

    if (appwriteSessionCookie) {
      return appwriteSessionCookie.value;
    }

    // Fallback: Try custom session cookie
    const customSessionCookie = allCookies.find(c => c.name === 'codecraft_session');

    if (customSessionCookie) {
      console.log('[Session] Using custom session cookie');
      return customSessionCookie.value;
    }

    console.error('[Session] No session cookie found');
    console.error('[Session] Available cookies:', allCookies.map(c => c.name));
    console.error('[Session] Looking for prefix: a_session_' + process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID);

    return null;
  } catch (error) {
    console.error('[Session] Error getting session from cookies:', error);
    return null;
  }
}
