import { NextRequest } from 'next/server';
import { databases, DATABASE_ID, COLLECTIONS } from '@/lib/appwrite/config';
import { getCurrentUser } from '@/lib/appwrite/auth';
import { getSessionFromCookies } from '@/lib/appwrite/session';
import { Query } from 'node-appwrite';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
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
    const identifier = params.id;

    let project;

    // First try to get by document ID
    try {
      project = await databases.getDocument(
        DATABASE_ID,
        COLLECTIONS.PROJECTS,
        identifier
      );
      
      // Verify user owns this project
      if (project.userId !== userId) {
        return Response.json({ error: 'Project not found' }, { status: 404 });
      }
    } catch (error) {
      // If not found by ID, try to find by slug
      const response = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.PROJECTS,
        [
          Query.equal('slug', identifier),
          Query.equal('userId', userId),
          Query.limit(1)
        ]
      );

      if (response.documents.length === 0) {
        return Response.json({ error: 'Project not found' }, { status: 404 });
      }

      project = response.documents[0];
    }

    return Response.json({ success: true, project });
  } catch (error) {
    console.error('Error fetching project:', error);
    return Response.json({ error: 'Project not found' }, { status: 404 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
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
    const projectId = params.id;
    const body = await req.json();

    // Get project and verify ownership
    const project = await databases.getDocument(
      DATABASE_ID,
      COLLECTIONS.PROJECTS,
      projectId
    );

    if (project.userId !== userId) {
      return Response.json({ error: 'Project not found' }, { status: 404 });
    }

    // Update project
    const updatedProject = await databases.updateDocument(
      DATABASE_ID,
      COLLECTIONS.PROJECTS,
      projectId,
      {
        ...body,
        updatedAt: new Date().toISOString(),
      }
    );

    return Response.json({ success: true, project: updatedProject });
  } catch (error) {
    console.error('Error updating project:', error);
    return Response.json({ error: 'Failed to update project' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
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
    const projectId = params.id;

    // Get project and verify ownership
    const project = await databases.getDocument(
      DATABASE_ID,
      COLLECTIONS.PROJECTS,
      projectId
    );

    if (project.userId !== userId) {
      return Response.json({ error: 'Project not found' }, { status: 404 });
    }

    // Delete all project files first
    const filesResponse = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.PROJECT_FILES,
      [Query.equal('projectId', projectId)]
    );

    for (const file of filesResponse.documents) {
      await databases.deleteDocument(
        DATABASE_ID,
        COLLECTIONS.PROJECT_FILES,
        file.$id
      );
    }

    // Delete all project messages
    const messagesResponse = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.MESSAGES,
      [Query.equal('projectId', projectId)]
    );

    for (const message of messagesResponse.documents) {
      await databases.deleteDocument(
        DATABASE_ID,
        COLLECTIONS.MESSAGES,
        message.$id
      );
    }

    // Finally delete the project
    await databases.deleteDocument(
      DATABASE_ID,
      COLLECTIONS.PROJECTS,
      projectId
    );

    return Response.json({ success: true });
  } catch (error) {
    console.error('Error deleting project:', error);
    return Response.json({ error: 'Failed to delete project' }, { status: 500 });
  }
}
