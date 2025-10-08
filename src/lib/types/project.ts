export interface Project {
  $id: string;
  userId: string;
  title: string;
  slug: string;
  description?: string;
  status: 'active' | 'archived';
  framework?: 'react' | 'vue' | 'vanilla';
  summary?: string; // AI-generated summary of project state and progress
  lastMessageAt: string;
  $createdAt: string;
  $updatedAt: string;
}

export interface CreateProjectData {
  title: string;
  description?: string;
  framework?: 'react' | 'vue' | 'vanilla';
}

export interface UpdateProjectData {
  title?: string;
  description?: string;
  status?: 'active' | 'archived';
  framework?: 'react' | 'vue' | 'vanilla';
  summary?: string;
  lastMessageAt?: string;
}
