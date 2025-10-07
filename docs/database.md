# CodeCraft Database Schema

## Database: `codecraft_db`

This document contains the complete schema definition for the CodeCraft database, including all tables, columns, data types, constraints, and default values.

---

## Table: `messages`

Stores chat messages between users within projects.

| Column Name  | Data Type | Size/Range          | Required | Default Value | Indexed | Description                                      |
| ------------ | --------- | ------------------- | -------- | ------------- | ------- | ------------------------------------------------ |
| `$id`        | ID        | -                   | Yes      | NULL          | No      | Unique identifier for the message                |
| `projectId`  | Text      | 255                 | Yes      | NULL          | No      | Reference to the project this message belongs to |
| `userId`     | Text      | 255                 | Yes      | NULL          | No      | Reference to the user who sent the message       |
| `role`       | Text      | 50                  | Yes      | NULL          | No      | Role of the message sender                       |
| `content`    | Text      | 1073741824          | Yes      | NULL          | No      | The actual message content                       |
| `metadata`   | Text      | 1073741824          | No       | NULL          | No      | Additional metadata for the message              |
| `sequence`   | Number    | Min: 0, Max: 999999 | No       | 0             | No      | Message sequence number                          |
| `createdAt`  | DateTime  | -                   | Yes      | NULL          | No      | Timestamp when the message was created           |
| `updatedAt`  | DateTime  | -                   | Yes      | NULL          | No      | Timestamp when the message was last updated      |
| `$createdAt` | DateTime  | -                   | No       | NULL          | No      | System creation timestamp                        |
| `$updatedAt` | DateTime  | -                   | No       | NULL          | No      | System update timestamp                          |

---

## Table: `projects`

Stores information about coding projects.

| Column Name     | Data Type | Size/Range | Required | Default Value | Indexed | Description                                  |
| --------------- | --------- | ---------- | -------- | ------------- | ------- | -------------------------------------------- |
| `$id`           | ID        | -          | Yes      | NULL          | No      | Unique identifier for the project            |
| `userId`        | Text      | 255        | Yes      | NULL          | No      | Reference to the user who owns the project   |
| `title`         | Text      | 255        | Yes      | NULL          | No      | Project title/name                           |
| `slug`          | Text      | 255        | Yes      | NULL          | No      | URL-friendly version of the title            |
| `description`   | Text      | 2048       | No       | NULL          | No      | Detailed description of the project          |
| `framework`     | Text      | 50         | Yes      | NULL          | No      | Framework/technology used in the project     |
| `status`        | Text      | 50         | No       | active        | No      | Current status of the project                |
| `lastMessageAt` | DateTime  | -          | No       | NULL          | No      | Timestamp of the last message in the project |
| `createdAt`     | DateTime  | -          | Yes      | NULL          | No      | Timestamp when the project was created       |
| `updatedAt`     | DateTime  | -          | Yes      | NULL          | No      | Timestamp when the project was last updated  |
| `$createdAt`    | DateTime  | -          | No       | NULL          | No      | System creation timestamp                    |
| `$updatedAt`    | DateTime  | -          | No       | NULL          | No      | System update timestamp                      |

---

## Table: `project_files`

Stores files associated with projects.

| Column Name  | Data Type | Size/Range            | Required | Default Value | Indexed | Description                                      |
| ------------ | --------- | --------------------- | -------- | ------------- | ------- | ------------------------------------------------ |
| `$id`        | ID        | -                     | Yes      | NULL          | No      | Unique identifier for the file                   |
| `projectId`  | Text      | 255                   | Yes      | NULL          | No      | Reference to the project this file belongs to    |
| `userId`     | Text      | 255                   | Yes      | NULL          | No      | Reference to the user who owns/uploaded the file |
| `path`       | Text      | 1024                  | Yes      | NULL          | No      | File path within the project structure           |
| `name`       | Text      | 255                   | Yes      | NULL          | No      | Name of the file                                 |
| `content`    | Text      | 1073741824            | No       | NULL          | No      | File content (for text files)                    |
| `type`       | Text      | 50                    | No       | file          | No      | Type of file (file, directory, etc.)             |
| `size`       | Number    | Min: 0, Max: 10485760 | No       | 0             | No      | Size of the file in bytes                        |
| `language`   | Text      | 50                    | No       | NULL          | No      | Programming language of the file                 |
| `createdAt`  | DateTime  | -                     | Yes      | NULL          | No      | Timestamp when the file was created              |
| `updatedAt`  | DateTime  | -                     | Yes      | NULL          | No      | Timestamp when the file was last updated         |
| `$createdAt` | DateTime  | -                     | No       | NULL          | No      | System creation timestamp                        |
| `$updatedAt` | DateTime  | -                     | No       | NULL          | No      | System update timestamp                          |

---

## Table: `users_profiles`

Stores user profile information.

| Column Name  | Data Type | Size/Range | Required | Default Value | Indexed | Description                            |
| ------------ | --------- | ---------- | -------- | ------------- | ------- | -------------------------------------- |
| `$id`        | ID        | -          | Yes      | NULL          | No      | Unique identifier for the user profile |
| `userId`     | Text      | 255        | Yes      | NULL          | No      | Reference to the user account          |
| `name`       | Text      | 255        | Yes      | NULL          | No      | Display name of the user               |
| `email`      | Text      | 255        | Yes      | NULL          | No      | Email address of the user              |
| `avatar`     | Text      | 2048       | No       | NULL          | No      | URL or path to user's avatar image     |
| `$createdAt` | DateTime  | -          | No       | NULL          | No      | System creation timestamp              |
| `$updatedAt` | DateTime  | -          | No       | NULL          | No      | System update timestamp                |

---

## Data Type Reference

- **ID**: Unique identifier type (auto-generated)
- **Text**: String/character data with specified maximum size
- **Number**: Numeric data with minimum and maximum range
- **DateTime**: Timestamp data type for date and time values

## Notes

1. **System Fields**: Fields prefixed with `$` (like `$id`, `$createdAt`, `$updatedAt`) are system-managed fields
2. **Size Limits**:
   - Standard text fields: 255 characters
   - Large text fields (content): 1073741824 characters (~1GB)
   - Medium text: 1024-2048 characters
3. **Required Fields**: Fields marked as "Yes" in the Required column must have a value when creating a record
4. **Indexes**: Currently, no custom indexes are defined on these tables
5. **Relationships**:
   - `messages.projectId` → `projects.$id`
   - `messages.userId` → `users_profiles.userId`
   - `projects.userId` → `users_profiles.userId`
   - `project_files.projectId` → `projects.$id`
   - `project_files.userId` → `users_profiles.userId`

---

_Last Updated: October 8, 2025_
