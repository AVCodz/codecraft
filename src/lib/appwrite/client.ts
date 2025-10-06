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
