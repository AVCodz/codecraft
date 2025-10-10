import { NextRequest } from 'next/server';
import { getProjectFiles, createFile, updateFile, deleteFile } from '@/lib/appwrite/database';
import { getCurrentUser } from '@/lib/appwrite/auth';
import { CreateFileData, UpdateFileData } from '@/lib/types';

// GET /api/projects/[id]/files - Get project files
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify user authentication
    const userResult = await getCurrentUser();
    if (!userResult.success || !userResult.user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: projectId } = await params;
    const files = await getProjectFiles(projectId);

    return Response.json({ success: true, files });
  } catch (error) {
    console.error('Error fetching project files:', error);
    return Response.json({ error: 'Failed to fetch project files' }, { status: 500 });
  }
}

// POST /api/projects/[id]/files - Create new file
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify user authentication
    const userResult = await getCurrentUser();
    if (!userResult.success || !userResult.user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: projectId } = await params;
    const data: CreateFileData = await req.json();

    // Validate required fields
    if (!data.path || data.path.trim().length === 0) {
      return Response.json({ error: 'File path is required' }, { status: 400 });
    }

    const file = await createFile({
      projectId,
      userId: userResult.user.$id,
      path: data.path.trim(),
      type: data.type || 'file',
      content: data.content,
      language: data.language,
    });

    return Response.json({ success: true, file }, { status: 201 });
  } catch (error) {
    console.error('Error creating file:', error);
    return Response.json({ error: 'Failed to create file' }, { status: 500 });
  }
}

// PUT /api/projects/[id]/files - Update file
export async function PUT(
  req: NextRequest,
  { params: _params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify user authentication
    const userResult = await getCurrentUser();
    if (!userResult.success || !userResult.user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const fileId = searchParams.get('fileId');

    if (!fileId) {
      return Response.json({ error: 'File ID is required' }, { status: 400 });
    }

    const data: UpdateFileData = await req.json();
    const file = await updateFile(fileId, data);

    return Response.json({ success: true, file });
  } catch (error) {
    console.error('Error updating file:', error);
    return Response.json({ error: 'Failed to update file' }, { status: 500 });
  }
}

// DELETE /api/projects/[id]/files - Delete file
export async function DELETE(
  req: NextRequest,
  { params: _params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify user authentication
    const userResult = await getCurrentUser();
    if (!userResult.success || !userResult.user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const fileId = searchParams.get('fileId');

    if (!fileId) {
      return Response.json({ error: 'File ID is required' }, { status: 400 });
    }

    await deleteFile(fileId);

    return Response.json({ success: true });
  } catch (error) {
    console.error('Error deleting file:', error);
    return Response.json({ error: 'Failed to delete file' }, { status: 500 });
  }
}
