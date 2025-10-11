/**
 * Client Session Helper - Browser-side session utilities
 * Provides client-side session verification and retrieval
 * Features: Current session check, session ID retrieval
 * Used in: Client components for authentication status checks
 */
import { createClientSideClient } from './config';

export async function getClientSession(): Promise<string | null> {
  try {
    const { account } = createClientSideClient();
    const session = await account.getSession('current');
    return session.$id;
  } catch {
    return null;
  }
}
