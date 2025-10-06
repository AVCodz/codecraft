🚀 MVP Project Prompt for AI Code Generator

Project Overview

Project Name: CodeCraft AI (or your preferred name)

Description: Build a browser-based AI-powered code generation platform similar to Lovable.dev and Bolt.new. Users can describe their desired application in natural language, and the AI generates a complete, working project with live preview, code editor, terminal, and the ability to download the project as a ZIP file.

Target: MVP (Minimum Viable Product) - Core features only, production-ready foundation

🎯 Core Features (MVP Scope)

1. Authentication System

User registration and login

Session management

Protected routes

User profile

2. Project Management

Create new project

List user's projects

Open existing project

Delete project

Auto-save project state

3. AI Chat Interface

Chat with AI to describe desired application

Stream AI responses in real-time

Display AI thinking process

Message history

Regenerate responses

4. Code Generation

AI generates files based on user prompts

Support for multiple file types (JS, TS, HTML, CSS, JSON, etc.)

Automatic file structure creation

Real-time file updates

5. Code Editor

Syntax highlighting

Multi-file editing

File tree navigation

Create/delete/rename files

Auto-save changes

6. Live Preview

Real-time preview of generated application

Support for React/Vue/vanilla JS projects

Auto-refresh on file changes

Responsive preview modes

7. Terminal (Basic)

Display command outputs

Show build logs

Error messages

8. Export Functionality

Download project as ZIP

Include all files and dependencies

🛠️ Tech Stack

Frontend Framework

Next.js 14+ (App Router)

Server Components

API Routes

Server Actions

Streaming

Styling

Tailwind CSS - Utility-first CSS

Framer Motion - Animations and transitions

Lucide React - Icon library

State Management

Zustand - Lightweight state management

Project state

Editor state

Chat state

UI state

Backend & Database

Appwrite (Cloud or Self-hosted)

Authentication

Database (Collections)

Storage (File uploads)

Realtime subscriptions

AI Integration

OpenRouter API - LLM provider

Vercel AI SDK - Streaming and tool calls

ai package for streaming

@ai-sdk/openai for OpenRouter compatibility

Code Editor

Monaco Editor (@monaco-editor/react)

VS Code-like experience

Multi-language support

IntelliSense

Diff viewer

Terminal

XTerm.js (@xterm/xterm)

Terminal emulator UI

Addons: fit, web-links

File Management

JSZip - Create ZIP archives

file-saver - Download files client-side

Utilities

date-fns - Date formatting

clsx - Conditional classnames

zod - Schema validation

📊 Appwrite Database Structure

Database Name: codecraft_db

Collection 1: users_profiles

Field

Type

Required

Indexed

Attributes

userId

String

✅

✅ (unique)

Appwrite Auth User ID

displayName

String

❌

❌

User's display name

avatar

String

❌

❌

Avatar URL

preferences

JSON

❌

❌

{ theme, fontSize, editorTheme }

createdAt

DateTime

✅

✅

Auto-generated

updatedAt

DateTime

✅

❌

Auto-updated

Permissions:

Read: user:{userId}

Write: user:{userId}

Delete: user:{userId}

Collection 2: projects

Field

Type

Required

Indexed

Attributes

userId

String

✅

✅

Owner's user ID

title

String

✅

✅

Project name

slug

String

✅

✅ (unique)

URL-friendly ID

description

String

❌

❌

Project description

status

String

✅

✅

active, archived

framework

String

❌

✅

react, vue, vanilla

lastMessageAt

DateTime

✅

✅

For sorting

createdAt

DateTime

✅

✅

Auto-generated

updatedAt

DateTime

✅

❌

Auto-updated

Permissions:

Read: user:{userId}

Write: user:{userId}

Delete: user:{userId}

Indexes:

userId_status (compound): userId + status

userId_lastMessageAt (compound): userId + lastMessageAt

Collection 3: messages

Field

Type

Required

Indexed

Attributes

projectId

String

✅

✅

Parent project

userId

String

✅

✅

Message author

role

String

✅

✅

user, assistant, system

content

String

✅

❌

Message text

metadata

JSON

❌

❌

{ model, tokens, duration }

sequence

Integer

✅

✅

Message order

createdAt

DateTime

✅

✅

Auto-generated

Permissions:

Read: user:{userId}

Write: user:{userId}

Delete: user:{userId}

Indexes:

projectId_sequence (compound): projectId + sequence

Collection 4: project_files

Field

Type

Required

Indexed

Attributes

projectId

String

✅

✅

Parent project

path

String

✅

✅

File path (e.g., /src/App.tsx)

type

String

✅

✅

file or folder

content

String

❌

❌

File content (text files)

language

String

❌

❌

typescript, javascript, etc.

size

Integer

❌

❌

File size in bytes

createdAt

DateTime

✅

❌

Auto-generated

updatedAt

DateTime

✅

❌

Auto-updated

Permissions:

Read: user:{userId} (via projectId)

Write: user:{userId}

Delete: user:{userId}

Indexes:

projectId_path (compound, unique): projectId + path

Appwrite Storage Buckets

Bucket 1: project-exports

Purpose: Store generated ZIP files

Max Size: 50MB

Permissions: User-specific

Bucket 2: user-avatars

Purpose: User profile pictures

Max Size: 5MB

Permissions: Public read, user write

🏗️ Project Architecture

Directory Structure

codecraft-ai/
├── app/
│ ├── (auth)/
│ │ ├── login/
│ │ │ └── page.tsx
│ │ └── register/
│ │ └── page.tsx
│ ├── (dashboard)/
│ │ ├── layout.tsx
│ │ ├── page.tsx # Projects list
│ │ └── project/
│ │ └── [slug]/
│ │ └── page.tsx # Main IDE interface
│ ├── api/
│ │ ├── chat/
│ │ │ └── route.ts # AI chat endpoint
│ │ ├── projects/
│ │ │ ├── route.ts # CRUD operations
│ │ │ └── [id]/
│ │ │ ├── files/
│ │ │ │ └── route.ts # File operations
│ │ │ └── export/
│ │ │ └── route.ts # ZIP export
│ │ └── preview/
│ │ └── [projectId]/
│ │ └── route.ts # Preview server
│ ├── layout.tsx
│ └── globals.css
├── components/
│ ├── auth/
│ │ ├── LoginForm.tsx
│ │ └── RegisterForm.tsx
│ ├── chat/
│ │ ├── ChatInterface.tsx
│ │ ├── MessageList.tsx
│ │ ├── MessageInput.tsx
│ │ └── StreamingMessage.tsx
│ ├── editor/
│ │ ├── CodeEditor.tsx # Monaco wrapper
│ │ ├── FileTree.tsx
│ │ └── FileTreeNode.tsx
│ ├── preview/
│ │ ├── Preview.tsx
│ │ └── PreviewToolbar.tsx
│ ├── terminal/
│ │ └── Terminal.tsx # XTerm wrapper
│ ├── layout/
│ │ ├── Header.tsx
│ │ ├── Sidebar.tsx
│ │ └── IDELayout.tsx
│ └── ui/
│ ├── Button.tsx
│ ├── Input.tsx
│ ├── Dialog.tsx
│ └── ... (Radix UI components)
├── lib/
│ ├── appwrite/
│ │ ├── config.ts # Appwrite client setup
│ │ ├── auth.ts # Auth helpers
│ │ ├── database.ts # Database operations
│ │ └── storage.ts # Storage operations
│ ├── ai/
│ │ ├── openrouter.ts # OpenRouter client
│ │ ├── prompts.ts # System prompts
│ │ └── tools.ts # AI tool definitions
│ ├── stores/
│ │ ├── projectStore.ts # Zustand store
│ │ ├── editorStore.ts
│ │ ├── chatStore.ts
│ │ └── uiStore.ts
│ ├── utils/
│ │ ├── fileSystem.ts # Virtual file system
│ │ ├── zipExport.ts # ZIP generation
│ │ └── helpers.ts
│ └── types/
│ ├── project.ts
│ ├── message.ts
│ └── file.ts
├── public/
│ └── preview-script.js # Injected into preview iframe
├── .env.local
├── .env.example
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
└── package.json

🔧 Implementation Requirements

1. Authentication Flow

// lib/appwrite/auth.ts
import { Client, Account } from 'node-appwrite';

export async function signUp(email: string, password: string, name: string) {
const account = new Account(client);
const user = await account.create('unique()', email, password, name);

// Create user profile
await databases.createDocument('users_profiles', {
userId: user.$id,
displayName: name,
preferences: { theme: 'dark' },
});

return user;
}

export async function signIn(email: string, password: string) {
const account = new Account(client);
return await account.createEmailSession(email, password);
}

2. AI Chat with Tool Calls

// app/api/chat/route.ts
import { streamText } from 'ai';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';

const openrouter = createOpenRouter({
apiKey: process.env.OPENROUTER_API_KEY,
});

export async function POST(req: Request) {
const { messages, projectId } = await req.json();

const result = await streamText({
model: openrouter('anthropic/claude-3.5-sonnet'),
messages,
tools: {
create_file: {
description: 'Create a new file in the project',
parameters: z.object({
path: z.string(),
content: z.string(),
}),
execute: async ({ path, content }) => {
await createFile(projectId, path, content);
return { success: true };
},
},
update_file: {
description: 'Update an existing file',
parameters: z.object({
path: z.string(),
content: z.string(),
}),
execute: async ({ path, content }) => {
await updateFile(projectId, path, content);
return { success: true };
},
},
},
system: SYSTEM_PROMPT,
});

return result.toAIStreamResponse();
}

3. System Prompt for AI

// lib/ai/prompts.ts
export const SYSTEM_PROMPT = `
You are an expert full-stack developer AI assistant. Your role is to help users build web applications by generating complete, working code.

CAPABILITIES:

- Create files using the create_file tool
- Update files using the update_file tool
- Generate React, Vue, or vanilla JavaScript applications
- Write clean, production-ready code
- Follow best practices and modern patterns

GUIDELINES:

1. Always create a complete project structure (package.json, src/, public/, etc.)
2. Use modern JavaScript/TypeScript syntax
3. Include proper error handling
4. Add helpful comments
5. Generate responsive, accessible UI
6. Use Tailwind CSS for styling when applicable

WORKFLOW:

1. Understand user requirements
2. Plan the project structure
3. Generate files one by one using tools
4. Explain what you're creating
5. Provide usage instructions

When creating files, use proper paths:

- /package.json
- /src/App.tsx
- /src/components/Button.tsx
- /public/index.html

Always start with package.json and essential configuration files.
`;

4. Zustand Stores

// lib/stores/projectStore.ts
import { create } from 'zustand';

interface ProjectStore {
currentProject: Project | null;
files: FileNode[];
selectedFile: string | null;

setCurrentProject: (project: Project) => void;
setFiles: (files: FileNode[]) => void;
selectFile: (path: string) => void;
updateFileContent: (path: string, content: string) => void;
}

export const useProjectStore = create<ProjectStore>((set) => ({
currentProject: null,
files: [],
selectedFile: null,

setCurrentProject: (project) => set({ currentProject: project }),
setFiles: (files) => set({ files }),
selectFile: (path) => set({ selectedFile: path }),
updateFileContent: (path, content) => set((state) => ({
files: updateFileInTree(state.files, path, content),
})),
}));

5. Monaco Editor Integration

// components/editor/CodeEditor.tsx
'use client';

import Editor from '@monaco-editor/react';
import { useProjectStore } from '@/lib/stores/projectStore';

export function CodeEditor() {
const { selectedFile, files, updateFileContent } = useProjectStore();

const currentFile = files.find(f => f.path === selectedFile);

if (!currentFile) {
return <div>Select a file to edit</div>;
}

return (
<Editor
height="100%"
language={getLanguageFromPath(currentFile.path)}
value={currentFile.content}
theme="vs-dark"
onChange={(value) => updateFileContent(currentFile.path, value || '')}
options={{
        minimap: { enabled: false },
        fontSize: 14,
        lineNumbers: 'on',
        automaticLayout: true,
        tabSize: 2,
      }}
/>
);
}

6. Preview Component

// components/preview/Preview.tsx
'use client';

import { useEffect, useState } from 'react';
import { useProjectStore } from '@/lib/stores/projectStore';

export function Preview() {
const { currentProject, files } = useProjectStore();
const [previewHtml, setPreviewHtml] = useState('');

useEffect(() => {
// Generate preview HTML from files
const html = generatePreviewHTML(files);
setPreviewHtml(html);
}, [files]);

return (
<div className="h-full w-full bg-white">
<iframe
        srcDoc={previewHtml}
        className="w-full h-full border-0"
        sandbox="allow-scripts allow-same-origin"
        title="Preview"
      />
</div>
);
}

function generatePreviewHTML(files: FileNode[]): string {
const htmlFile = files.find(f => f.path.endsWith('.html'));
const cssFile = files.find(f => f.path.endsWith('.css'));
const jsFile = files.find(f => f.path.endsWith('.js'));

return `    <!DOCTYPE html>
    <html>
      <head>
        <style>${cssFile?.content || ''}</style>
      </head>
      <body>
        ${htmlFile?.content || '<div id="root"></div>'}
        <script>${jsFile?.content || ''}</script>
      </body>
    </html>
 `;
}

7. ZIP Export

// lib/utils/zipExport.ts
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

export async function exportProjectAsZip(projectId: string) {
const zip = new JSZip();

// Fetch files from Appwrite
const files = await getProjectFiles(projectId);

// Add files to ZIP
for (const file of files) {
if (file.type === 'file') {
zip.file(file.path.replace(/^\//, ''), file.content);
}
}

// Generate and download
const blob = await zip.generateAsync({ type: 'blob' });
saveAs(blob, `project-${projectId}.zip`);
}

8. Terminal Component

// components/terminal/Terminal.tsx
'use client';

import { useEffect, useRef } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';

export function Terminal() {
const terminalRef = useRef<HTMLDivElement>(null);
const xtermRef = useRef<XTerm | null>(null);

useEffect(() => {
if (!terminalRef.current) return;

    const terminal = new XTerm({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: 'Menlo, Monaco, monospace',
      theme: {
        background: '#1e1e1e',
        foreground: '#d4d4d4',
      },
    });

    const fitAddon = new FitAddon();
    terminal.loadAddon(fitAddon);
    terminal.open(terminalRef.current);
    fitAddon.fit();

    terminal.writeln('Welcome to CodeCraft AI Terminal');
    terminal.writeln('');

    xtermRef.current = terminal;

    return () => {
      terminal.dispose();
    };

}, []);

return <div ref={terminalRef} className="h-full w-full" />;
}

📦 Package.json Dependencies

{
"name": "codecraft-ai",
"version": "0.1.0",
"private": true,
"scripts": {
"dev": "next dev",
"build": "next build",
"start": "next start",
"lint": "next lint"
},
"dependencies": {
"next": "^14.2.0",
"react": "^18.3.0",
"react-dom": "^18.3.0",

    "@monaco-editor/react": "^4.6.0",
    "@xterm/xterm": "^5.5.0",
    "@xterm/addon-fit": "^0.10.0",
    "@xterm/addon-web-links": "^0.11.0",

    "node-appwrite": "^13.0.0",
    "ai": "^3.3.0",
    "@openrouter/ai-sdk-provider": "^0.0.5",

    "zustand": "^4.5.0",
    "framer-motion": "^11.5.0",

    "jszip": "^3.10.1",
    "file-saver": "^2.0.5",

    "lucide-react": "^0.400.0",
    "@radix-ui/react-dialog": "^1.1.0",
    "@radix-ui/react-dropdown-menu": "^2.1.0",
    "@radix-ui/react-tabs": "^1.1.0",

    "tailwindcss": "^3.4.0",
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.4.0",

    "zod": "^3.23.0",
    "date-fns": "^3.6.0"

},
"devDependencies": {
"@types/node": "^20",
"@types/react": "^18",
"@types/react-dom": "^18",
"@types/file-saver": "^2.0.7",
"typescript": "^5",
"eslint": "^8",
"eslint-config-next": "14.2.0",
"autoprefixer": "^10.4.0",
"postcss": "^8.4.0"
}
}

🎨 UI Design Guidelines

Color Scheme

/_ Dark Theme (Primary) _/
--background: #0a0a0a;
--foreground: #ededed;
--card: #1a1a1a;
--card-foreground: #ededed;
--primary: #3b82f6;
--primary-foreground: #ffffff;
--secondary: #27272a;
--accent: #8b5cf6;
--border: #27272a;

Layout

Header: 60px height, fixed top

Sidebar: 250px width, collapsible

Editor: 60% width (resizable)

Preview: 40% width (resizable)

Terminal: 200px height (collapsible)

Animations (Framer Motion)

// Fade in animation
const fadeIn = {
initial: { opacity: 0, y: 20 },
animate: { opacity: 1, y: 0 },
transition: { duration: 0.3 },
};

// Slide in from left
const slideIn = {
initial: { x: -100, opacity: 0 },
animate: { x: 0, opacity: 1 },
transition: { type: 'spring', stiffness: 100 },
};

🔐 Environment Variables

# .env.local

# Appwrite

NEXT_PUBLIC_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
NEXT_PUBLIC_APPWRITE_PROJECT_ID=your_project_id
APPWRITE_API_KEY=your_api_key

# OpenRouter

OPENROUTER_API_KEY=your_openrouter_key

# App

NEXT_PUBLIC_APP_URL=http://localhost:3000

✅ MVP Acceptance Criteria

Must Have:

✅ User can register and login

✅ User can create a new project

✅ User can chat with AI to describe their app

✅ AI generates files based on user input

✅ User can see generated files in file tree

✅ User can edit files in Monaco editor

✅ User can see live preview of their app

✅ User can download project as ZIP

✅ Projects are saved and can be reopened

✅ Responsive UI that works on desktop

Nice to Have (Post-MVP):

Real terminal with command execution

Multiple project templates

Collaboration features

Git integration

Deployment to Vercel/Netlify

Dark/light theme toggle

Keyboard shortcuts

🚀 Development Phases

Phase 1: Foundation (Week 1)

Set up Next.js project

Configure Appwrite

Implement authentication

Create basic UI layout

Phase 2: Core Features (Week 2)

Implement project CRUD

Integrate OpenRouter AI

Build chat interface

Add file generation

Phase 3: Editor & Preview (Week 3)

Integrate Monaco Editor

Build file tree component

Implement preview system

Add ZIP export

Phase 4: Polish & Deploy (Week 4)

Add animations

Improve UX

Bug fixes

Deploy to production

📝 Additional Notes

AI Tool Call Format

{
"name": "create_file",
"arguments": {
"path": "/src/App.tsx",
"content": "import React from 'react';\n\nexport default function App() {\n return <div>Hello World</div>;\n}"
}
}

File Structure Convention

All paths start with /

Use forward slashes

Common structure:

/package.json
/src/
/src/App.tsx
/src/components/
/public/
/public/index.html

Error Handling

Wrap all Appwrite calls in try-catch

Show user-friendly error messages

Log errors for debugging

Implement retry logic for failed operations

🎯 Success Metrics

User can generate a working app in < 5 minutes

Preview updates in < 2 seconds after file change

ZIP export completes in < 10 seconds

95%+ uptime

< 3 second page load time

🔗 Resources

Next.js Docs: https://nextjs.org/docs

Appwrite Docs: https://appwrite.io/docs

OpenRouter Docs: https://openrouter.ai/docs

Monaco Editor: https://microsoft.github.io/monaco-editor/

XTerm.js: https://xtermjs.org/

Vercel AI SDK: https://sdk.vercel.ai/docs
