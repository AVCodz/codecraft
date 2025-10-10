import { signOutUser } from '@/lib/appwrite/auth';

export async function POST() {
  try {
    const result = await signOutUser();

    if (!result.success) {
      return Response.json(
        { error: result.error || 'Failed to sign out' },
        { status: 400 }
      );
    }

    return Response.json(
      { 
        success: true, 
        message: 'Signed out successfully'
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in logout API:', error);
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
