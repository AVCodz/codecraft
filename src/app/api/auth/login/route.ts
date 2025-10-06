import { NextRequest } from 'next/server';
import { signInUser } from '@/lib/appwrite/auth';
import { isValidEmail } from '@/lib/utils/helpers';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    // Validate input
    if (!email || !password) {
      return Response.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    if (!isValidEmail(email)) {
      return Response.json(
        { error: 'Invalid email address' },
        { status: 400 }
      );
    }

    // Sign in user
    const result = await signInUser(email.trim(), password);

    if (!result.success) {
      return Response.json(
        { error: result.error || 'Invalid credentials' },
        { status: 401 }
      );
    }

    return Response.json(
      { 
        success: true, 
        message: 'Signed in successfully',
        session: result.session ? {
          id: result.session.$id,
          userId: result.session.userId,
        } : null
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in login API:', error);
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
