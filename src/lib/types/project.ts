export interface Project {
  $id: string;
  userId: string;
  title: string;
  slug: string;
  description?: string;
  status: 'active' | 'archived';
  framework?: 'react' | 'vue' | 'vanilla';
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
  lastMessageAt?: string;
}
