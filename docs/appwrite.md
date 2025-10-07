# CodeCraft AI - Appwrite Setup Guide

This guide provides detailed instructions for setting up Appwrite backend for the CodeCraft AI platform.

## 🚀 Initial Setup

1. **Create Appwrite Project**

   - Go to [Appwrite Cloud](https://cloud.appwrite.io) or your self-hosted instance
   - Create a new project named "CodeCraft AI"
   - Note down your Project ID

2. **Generate API Key (Optional)**
   - **Note**: API keys are only needed for server-side admin operations
   - For basic authentication and user operations, Appwrite handles this automatically
   - If you need server-side operations, go to Settings → API Keys
   - Create a new API key with the following scopes:
     - `databases.read`
     - `databases.write`
     - `users.read`
     - `users.write`
     - `files.read`
     - `files.write`
   - Note down the API key (keep it secure!)

## 📊 Database Setup

### Create Database

- **Database Name**: `codecraft_main`
- **Database ID**: `codecraft_main` (or auto-generated)

## 📋 Collections Setup

### 1. Users Profiles Collection

**Collection Details:**

- **Name**: `users_profiles`
- **Collection ID**: `users_profiles`
- **Document Security**: Enabled

**Attributes:**

```
userId (String)
- Size: 255
- Required: Yes
- Array: No
- Default: null
- Unique: Yes

name (String)
- Size: 255
- Required: Yes
- Array: No
- Default: null

email (String)
- Size: 255
- Required: Yes
- Array: No
- Default: null
- Unique: Yes

avatar (String)
- Size: 2048
- Required: No
- Array: No
- Default: null

preferences (String - JSON)
- Size: 4096
- Required: No
- Array: No
- Default: {"theme":"dark","fontSize":14,"editorTheme":"codecraft-dark","autoSave":true,"tabSize":2}

createdAt (DateTime)
- Required: Yes
- Array: No
- Default: null

updatedAt (DateTime)
- Required: Yes
- Array: No
- Default: null
```

**Indexes:**

- `userId_index`: userId (ASC)
- `email_index`: email (ASC)

**Permissions:**

- **Create**: `users`
- **Read**: `user:[USER_ID]`
- **Update**: `user:[USER_ID]`
- **Delete**: `user:[USER_ID]`

### 2. Projects Collection

**Collection Details:**

- **Name**: `projects`
- **Collection ID**: `projects`
- **Document Security**: Enabled

**Attributes:**

```
userId (String)
- Size: 255
- Required: Yes
- Array: No
- Default: null

title (String)
- Size: 255
- Required: Yes
- Array: No
- Default: null

slug (String)
- Size: 255
- Required: Yes
- Array: No
- Default: null
- Unique: Yes

description (String)
- Size: 2048
- Required: No
- Array: No
- Default: null

framework (String)
- Size: 50
- Required: Yes
- Array: No
- Default: "react"

status (String)
- Size: 50
- Required: Yes
- Array: No
- Default: "active"

lastMessageAt (DateTime)
- Required: No
- Array: No
- Default: null

createdAt (DateTime)
- Required: Yes
- Array: No
- Default: null

updatedAt (DateTime)
- Required: Yes
- Array: No
- Default: null
```

**Indexes:**

- `userId_index`: userId (ASC)
- `slug_index`: slug (ASC)
- `userId_createdAt_index`: userId (ASC), createdAt (DESC)

**Permissions:**

- **Create**: `users`
- **Read**: `user:[USER_ID]`
- **Update**: `user:[USER_ID]`
- **Delete**: `user:[USER_ID]`

### 3. Messages Collection

**Collection Details:**

- **Name**: `messages`
- **Collection ID**: `messages`
- **Document Security**: Enabled

**Attributes:**

```
projectId (String)
- Size: 255
- Required: Yes
- Array: No
- Default: null

userId (String)
- Size: 255
- Required: Yes
- Array: No
- Default: null

role (String)
- Size: 50
- Required: Yes
- Array: No
- Default: null

content (String)
- Size: 65536
- Required: Yes
- Array: No
- Default: null

metadata (String - JSON)
- Size: 8192
- Required: No
- Array: No
- Default: null

sequence (Integer)
- Required: Yes
- Array: No
- Default: 0
- Min: 0
- Max: 999999

createdAt (DateTime)
- Required: Yes
- Array: No
- Default: null

updatedAt (DateTime)
- Required: Yes
- Array: No
- Default: null
```

**Indexes:**

- `projectId_index`: projectId (ASC)
- `userId_index`: userId (ASC)
- `projectId_sequence_index`: projectId (ASC), sequence (ASC)
- `projectId_createdAt_index`: projectId (ASC), createdAt (ASC)

**Permissions:**

- **Create**: `users`
- **Read**: `user:[USER_ID]`
- **Update**: `user:[USER_ID]`
- **Delete**: `user:[USER_ID]`

### 4. Project Files Collection

**Collection Details:**

- **Name**: `project_files`
- **Collection ID**: `project_files`
- **Document Security**: Enabled

**Attributes:**

```
projectId (String)
- Size: 255
- Required: Yes
- Array: No
- Default: null

userId (String)
- Size: 255
- Required: Yes
- Array: No
- Default: null

path (String)
- Size: 1024
- Required: Yes
- Array: No
- Default: null

name (String)
- Size: 255
- Required: Yes
- Array: No
- Default: null

content (String)
- Size: 65536
- Required: No
- Array: No
- Default: null

type (String)
- Size: 50
- Required: Yes
- Array: No
- Default: "file"

size (Integer)
- Required: No
- Array: No
- Default: 0
- Min: 0
- Max: 10485760

language (String)
- Size: 50
- Required: No
- Array: No
- Default: null

createdAt (DateTime)
- Required: Yes
- Array: No
- Default: null

updatedAt (DateTime)
- Required: Yes
- Array: No
- Default: null
```

**Indexes:**

- `projectId_index`: projectId (ASC)
- `userId_index`: userId (ASC)
- `projectId_path_index`: projectId (ASC), path (ASC)
- `projectId_type_index`: projectId (ASC), type (ASC)

**Permissions:**

- **Create**: `users`
- **Read**: `user:[USER_ID]`
- **Update**: `user:[USER_ID]`
- **Delete**: `user:[USER_ID]`

## 🗂️ Storage Setup

### 1. Project Exports Bucket

**Bucket Details:**

- **Name**: `project-exports`
- **Bucket ID**: `project-exports`
- **File Security**: Enabled
- **Maximum File Size**: 50MB
- **Allowed File Extensions**: `zip`
- **Compression**: gzip
- **Encryption**: Enabled
- **Antivirus**: Enabled

**Permissions:**

- **Create**: `users`
- **Read**: `user:[USER_ID]`
- **Update**: `user:[USER_ID]`
- **Delete**: `user:[USER_ID]`

### 2. User Avatars Bucket

**Bucket Details:**

- **Name**: `user-avatars`
- **Bucket ID**: `user-avatars`
- **File Security**: Enabled
- **Maximum File Size**: 5MB
- **Allowed File Extensions**: `jpg, jpeg, png, gif, webp`
- **Compression**: gzip
- **Encryption**: Enabled
- **Antivirus**: Enabled

**Permissions:**

- **Create**: `users`
- **Read**: `any`
- **Update**: `user:[USER_ID]`
- **Delete**: `user:[USER_ID]`

## 🔐 Authentication Setup

### Authentication Methods

Enable the following authentication methods:

1. **Email/Password**

   - Enable email/password authentication
   - Set password policy:
     - Minimum length: 8 characters
     - Require uppercase: Yes
     - Require lowercase: Yes
     - Require numbers: Yes
     - Require symbols: No

2. **Email Verification** (Optional)
   - Enable email verification
   - Configure SMTP settings if needed

### Security Settings

- **Session Length**: 365 days
- **Password History**: 5 passwords
- **Account Lockout**: 5 failed attempts
- **Two-Factor Authentication**: Optional (can be enabled later)

## 🌐 Platform Settings

### CORS Settings

Add your domain to allowed origins:

- `http://localhost:3000` (for development)
- `https://your-domain.com` (for production)

### Webhooks (Optional)

You can set up webhooks for:

- User registration
- Project creation
- File uploads

## 📝 Environment Variables

After setting up Appwrite, update your `.env.local` file:

```env
# Appwrite Configuration
NEXT_PUBLIC_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
NEXT_PUBLIC_APPWRITE_PROJECT_ID=your-project-id
APPWRITE_API_KEY=your-api-key

# Database Configuration
NEXT_PUBLIC_DATABASE_ID=codecraft_main
NEXT_PUBLIC_USERS_COLLECTION_ID=users_profiles
NEXT_PUBLIC_PROJECTS_COLLECTION_ID=projects
NEXT_PUBLIC_MESSAGES_COLLECTION_ID=messages
NEXT_PUBLIC_FILES_COLLECTION_ID=project_files

# Storage Configuration
NEXT_PUBLIC_EXPORTS_BUCKET_ID=project-exports
NEXT_PUBLIC_AVATARS_BUCKET_ID=user-avatars

# OpenRouter Configuration
OPENROUTER_API_KEY=your-openrouter-key
```

## ✅ Verification Checklist

- [ ] Project created with correct name
- [ ] API key generated with all required scopes
- [ ] Database `codecraft_main` created
- [ ] All 4 collections created with correct attributes
- [ ] All indexes created for optimal performance
- [ ] Permissions set correctly for each collection
- [ ] Both storage buckets created with correct settings
- [ ] Authentication methods enabled
- [ ] CORS settings configured
- [ ] Environment variables updated

## 🚨 Important Notes

1. **Document Security**: All collections have document security enabled, meaning users can only access their own data.

2. **Unique Constraints**:

   - `users_profiles.userId` and `users_profiles.email` are unique
   - `projects.slug` is unique globally

3. **File Size Limits**:

   - Project files content is limited to ~64KB per document
   - For larger files, consider using storage buckets

4. **Indexes**: All necessary indexes are created for optimal query performance.

5. **Permissions**: Follow the principle of least privilege - users can only access their own data.

## 🔧 Testing Your Setup

After completing the setup, test your configuration by:

1. Starting your Next.js application
2. Registering a new user
3. Creating a project
4. Sending a chat message
5. Generating files through AI
6. Exporting a project

If any step fails, double-check the corresponding collection/bucket setup and permissions.
