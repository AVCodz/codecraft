import { NextRequest } from 'next/server';
import { createProject, getUserProjects, deleteProject } from '@/lib/appwrite/database';
import { getCurrentUser } from '@/lib/appwrite/auth';
import { getSessionFromCookies } from '@/lib/appwrite/session';
import { CreateProjectData } from '@/lib/types';

export async function GET() {
  try {
    const session = await getSessionFromCookies();
    
    if (!session) {
      console.error('No session found in cookies');
      return Response.json({ error: 'Unauthorized - No session cookie' }, { status: 401 });
    }

    const userResult = await getCurrentUser(session);
    if (!userResult.success || !userResult.user) {
      console.error('Failed to get user:', userResult.error);
      return Response.json({ error: 'Unauthorized - Invalid session' }, { status: 401 });
    }

    const userId = userResult.user.$id;
    const projects = await getUserProjects(userId);

    return Response.json({ success: true, projects });
  } catch (error) {
    console.error('Error fetching projects:', error);
    return Response.json({ error: 'Failed to fetch projects' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionFromCookies();
    
    if (!session) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userResult = await getCurrentUser(session);
    if (!userResult.success || !userResult.user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = userResult.user.$id;
    const data: CreateProjectData = await req.json();

    if (!data.title || data.title.trim().length === 0) {
      return Response.json({ error: 'Project title is required' }, { status: 400 });
    }

    const project = await createProject(userId, {
      title: data.title.trim(),
      description: data.description?.trim(),
      framework: data.framework || 'react',
    });

    return Response.json({ success: true, project }, { status: 201 });
  } catch (error) {
    console.error('Error creating project:', error);
    return Response.json({ error: 'Failed to create project' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getSessionFromCookies();
    
    if (!session) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userResult = await getCurrentUser(session);
    if (!userResult.success || !userResult.user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('id');

    if (!projectId) {
      return Response.json({ error: 'Project ID is required' }, { status: 400 });
    }

    await deleteProject(projectId);

    return Response.json({ success: true });
  } catch (error) {
    console.error('Error deleting project:', error);
    return Response.json({ error: 'Failed to delete project' }, { status: 500 });
  }
}
