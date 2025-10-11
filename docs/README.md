# CodeCraft AI Documentation

Welcome to the CodeCraft AI documentation. This folder contains comprehensive technical documentation for the project architecture.

## 📚 Core Architecture Documentation

### 1. [State Management Architecture](./STATE_MANAGEMENT.md)
**How Zustand + LocalDB + Appwrite Realtime + UI work together**

Learn about our three-tier state management system that provides:
- Instant UI updates via Zustand
- Offline capability via LocalDB (browser localStorage)
- Real-time collaboration via Appwrite WebSocket
- Reliable persistence across all layers

**Key Topics:**
- The three tiers: Zustand, LocalDB, Appwrite
- Data flow patterns (Initial load, CRUD operations, Realtime sync)
- Per-project state isolation
- Sync metadata tracking
- Common patterns and troubleshooting

**Read this if you want to understand:**
- How data flows from database to UI
- How offline mode works
- How real-time updates are handled
- How to add new stores or modify existing ones

---

### 2. [Tool Calling Flow](./TOOL_CALLING_FLOW.md)
**How AI tool calling works from user message to final response**

Complete guide to our AI-powered code generation system using OpenRouter's manual tool calling loop.

**Key Topics:**
- Complete flow: User → API → OpenRouter → Tool Loop → Response
- Tool calling loop (max 50 iterations)
- Tool executors (create_file, update_file, etc.)
- Conversation examples
- Data sync after tool execution
- Error handling and debugging

**Read this if you want to understand:**
- How AI generates and modifies files
- How the tool calling loop prevents infinite loops
- How tool results are fed back to the AI
- How to add new tools or modify existing ones
- How streaming responses work

---

### 3. [Authentication Flow](./AUTHENTICATION_FLOW.md)
**How authentication, cookies, and session management work**

Detailed explanation of our multi-layer authentication system using Appwrite + Cookies + LocalDB + Zustand.

**Key Topics:**
- Three-layer session persistence
- User registration flow
- User login flow
- App initialization (session restoration)
- Protected route access
- User logout flow
- Cookie configuration and security

**Read this if you want to understand:**
- How sessions are persisted across page refreshes
- How the cookie backup system works
- How AuthGuard protects routes
- How to modify authentication behavior
- Security considerations

---

## 🎯 Quick Start Guide

### For New Developers
1. Start with [State Management](./STATE_MANAGEMENT.md) to understand data flow
2. Read [Authentication](./AUTHENTICATION_FLOW.md) to understand user sessions
3. Review [Tool Calling](./TOOL_CALLING_FLOW.md) to understand AI features

### For Contributing Features
- **Adding a new store?** → See State Management patterns
- **Adding a new tool?** → See Tool Calling executors
- **Modifying auth?** → See Authentication flows

### For Debugging
- **State not updating?** → State Management troubleshooting
- **AI not executing tools?** → Tool Calling debugging section
- **User logged out randomly?** → Authentication troubleshooting

---

## 📂 Additional Documentation

### Other Files in This Directory:

- **`idea.md`** - Original project concept and feature ideas
- **`database.md`** - Database schema and Appwrite collections
- **`MULTI_PROJECT_CACHE.md`** - Multi-project caching strategy
- **`PREVIEW_OPTIMIZATIONS.md`** - WebContainer preview performance
- **`PREVIEW_PERFORMANCE_GUIDE.md`** - Preview optimization guide
- **`OPENROUTER_STREAMING_FIX.md`** - OpenRouter streaming implementation

### Subdirectories:

- **`auth/`** - Authentication architecture diagrams
- **`LocalDB and appwrite/`** - Database sync architecture
- **`Realtime architecture/`** - WebSocket realtime documentation
- **`tool calling/`** - Tool calling architecture diagrams

---

## 🏗️ System Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                         USER                                │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────────────┐
│                    REACT UI LAYER                           │
│  Components subscribe to Zustand stores                     │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────────────┐
│               ZUSTAND STATE MANAGEMENT                      │
│  In-memory state with React subscriptions                   │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────────────┐
│         LOCALDB (Browser localStorage Cache)                │
│  Instant load + offline capability                          │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────────────┐
│        APPWRITE (Remote Database + Auth + Realtime)         │
│  Source of truth + WebSocket collaboration                  │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔄 Data Flow Summary

### Read Operations (Fast)
```
LocalDB (1ms) → Zustand → UI
    ↓ (Background)
Appwrite sync → Update LocalDB → Update Zustand → UI refresh
```

### Write Operations (Reliable)
```
User Action → Appwrite API → Zustand update → UI refresh
                           → LocalDB cache update
                           → Realtime broadcast to other clients
```

### Realtime Updates (Collaborative)
```
Other Client → Appwrite → WebSocket → 
    → Zustand update → UI refresh
    → LocalDB cache update
```

---

## 🛠️ Technology Stack

### Frontend
- **React 18** - UI framework
- **Next.js 15** - App framework with Turbopack
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Zustand** - State management
- **Monaco Editor** - Code editor

### Backend/Services
- **Appwrite** - Database, Auth, Realtime
- **OpenRouter** - AI API (Gemini 2.0 Flash)
- **WebContainer** - Browser-based Node.js runtime

### Development
- **ESLint** - Linting
- **TypeScript** - Type checking
- **Turbopack** - Fast bundling

---

## 📖 Code Documentation

All component and library files include header comments:

```typescript
/**
 * ComponentName - Brief description
 * Detailed purpose explanation
 * Features: Key capabilities listed
 * Used in: Where this is used in the app
 */
```

**Documented Folders:**
- ✅ `src/components/auth/` - Authentication components
- ✅ `src/components/chat/` - Chat interface components
- ✅ `src/components/editor/` - Code editor components
- ✅ `src/components/preview/` - Preview components
- ✅ `src/components/project/` - Project management
- ✅ `src/components/terminal/` - Terminal emulator
- ✅ `src/components/ui/` - UI primitives
- ✅ `src/lib/appwrite/` - Appwrite services
- ✅ `src/lib/stores/` - Zustand stores
- ✅ `src/lib/utils/` - Utility functions
- ✅ `src/lib/ai/` - AI services
- ✅ `src/lib/types/` - TypeScript types

---

## 🤝 Contributing

When contributing to this project:

1. **Read relevant architecture docs first**
2. **Follow existing patterns** (see code comments)
3. **Update documentation** if changing architecture
4. **Add header comments** to new files
5. **Test thoroughly** (especially realtime sync)

---

## 🐛 Common Issues & Solutions

### Issue: State not syncing
**Solution**: Check STATE_MANAGEMENT.md → Troubleshooting section

### Issue: AI not executing tools correctly
**Solution**: Check TOOL_CALLING_FLOW.md → Debugging section

### Issue: User logged out on refresh
**Solution**: Check AUTHENTICATION_FLOW.md → Troubleshooting section

### Issue: Realtime updates not working
**Solution**: Check STATE_MANAGEMENT.md → Realtime Service Architecture

---

## 📞 Support

For questions or issues:
1. Check relevant documentation above
2. Search existing issues in repository
3. Review code comments in related files
4. Create detailed issue with reproduction steps

---

## 🔗 Quick Links

- [Main README](../README.md)
- [State Management](./STATE_MANAGEMENT.md)
- [Tool Calling Flow](./TOOL_CALLING_FLOW.md)
- [Authentication Flow](./AUTHENTICATION_FLOW.md)
- [Database Schema](./database.md)

---

**Last Updated**: January 2025  
**Documentation Version**: 1.0.0
