import { cookies } from 'next/headers';

export async function getSessionFromCookies(): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    const allCookies = cookieStore.getAll();
    
    const sessionCookie = allCookies.find(c => 
      c.name.startsWith('a_session_') && c.name.includes(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || '')
    );
    
    if (sessionCookie) {
      return sessionCookie.value;
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
