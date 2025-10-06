export interface UserProfile {
  $id: string;
  userId: string;
  displayName?: string;
  avatar?: string;
  preferences: {
    theme?: 'light' | 'dark';
    fontSize?: number;
    editorTheme?: string;
    autoSave?: boolean;
    tabSize?: number;
  };
  $createdAt: string;
  $updatedAt: string;
}

export interface CreateUserProfileData {
  userId: string;
  displayName?: string;
  avatar?: string;
  preferences?: UserProfile['preferences'];
}

export interface UpdateUserProfileData {
  displayName?: string;
  avatar?: string;
  preferences?: Partial<UserProfile['preferences']>;
}

export interface AuthUser {
  $id: string;
  name: string;
  email: string;
  emailVerification: boolean;
  status: boolean;
  $createdAt: string;
  $updatedAt: string;
}
