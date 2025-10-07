// Cookie utility for session management

interface CookieOptions {
  days?: number;
  path?: string;
  secure?: boolean;
  sameSite?: 'Strict' | 'Lax' | 'None';
}

export const cookies = {
  // Set a cookie
  set(name: string, value: string, options: CookieOptions = {}): void {
    if (typeof window === 'undefined') return;

    const {
      days = 365, // Default 1 year
      path = '/',
      secure = true,
      sameSite = 'Lax'
    } = options;

    let cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}`;

    // Add expiry
    if (days) {
      const date = new Date();
      date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
      cookie += `; expires=${date.toUTCString()}`;
    }

    // Add path
    cookie += `; path=${path}`;

    // Add secure flag (HTTPS only)
    if (secure) {
      cookie += '; secure';
    }

    // Add sameSite
    cookie += `; samesite=${sameSite}`;

    document.cookie = cookie;
  },

  // Get a cookie
  get(name: string): string | null {
    if (typeof window === 'undefined') return null;

    const nameEQ = encodeURIComponent(name) + '=';
    const cookies = document.cookie.split(';');

    for (let cookie of cookies) {
      cookie = cookie.trim();
      if (cookie.startsWith(nameEQ)) {
        return decodeURIComponent(cookie.substring(nameEQ.length));
      }
    }

    return null;
  },

  // Delete a cookie
  delete(name: string, path: string = '/'): void {
    if (typeof window === 'undefined') return;

    document.cookie = `${encodeURIComponent(name)}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=${path}`;
  },

  // Check if cookie exists
  exists(name: string): boolean {
    return this.get(name) !== null;
  },

  // Get all cookies
  getAll(): Record<string, string> {
    if (typeof window === 'undefined') return {};

    const cookies: Record<string, string> = {};
    const cookieStrings = document.cookie.split(';');

    for (let cookie of cookieStrings) {
      cookie = cookie.trim();
      const [name, value] = cookie.split('=');
      if (name && value) {
        cookies[decodeURIComponent(name)] = decodeURIComponent(value);
      }
    }

    return cookies;
  }
};
