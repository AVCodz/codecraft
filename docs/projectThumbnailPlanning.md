# Project Thumbnail Implementation Plan

## Overview

Implement automatic screenshot capture for project previews to display visual thumbnails on the landing page instead of the current animated DottedGlowBackground.

## Current State Analysis

### What We Have

- **ProjectCard Component**: Currently shows `DottedGlowBackground` with first letter avatar
- **Preview System**: Daytona sandbox with iframe preview in project page
- **Cloudinary Integration**: Already set up for file uploads (chat attachments)
- **Database**: Appwrite with projects collection (no thumbnail field yet)
- **Preview URL**: Available via `DaytonaContext` when sandbox is running

### What's Missing

- No thumbnail field in project schema
- No screenshot capture mechanism
- No automatic trigger system
- No UI for thumbnail display/refresh

---

## Technology Choice: capture-website

### Why capture-website?

- **Puppeteer-based**: Uses Chrome under the hood for accurate rendering
- **Flexible API**: Supports file, buffer, and base64 output
- **Rich Options**: Viewport size, quality, delays, element selection, etc.
- **Well-maintained**: By Sindre Sorhus, actively maintained
- **Server-side**: Runs in Node.js environment (Next.js API routes)

### Key Features We'll Use

- `captureWebsite.buffer()` - Capture to buffer for upload
- Viewport: 1280x800 (desktop size)
- Quality: 0.8 (balance between size and quality)
- Delay: 2-5 seconds after page load
- Timeout: 30 seconds max
- Disable animations for consistent captures

---

## Storage Strategy: Cloudinary

### Why Cloudinary?

✅ **Already Integrated**: Used for chat attachments  
✅ **Automatic Optimization**: Image compression and format conversion  
✅ **CDN Delivery**: Fast global access  
✅ **Transformations**: Can resize/crop on-the-fly  
✅ **No Database Bloat**: Store URL only, not binary data

### Storage Structure

```
Cloudinary Folder: project-thumbnails/
Naming: {projectId}-{timestamp}.png
Example: abc123-1234567890.png
```

### Alternative Considered

- **Appwrite Storage**: Would work but requires manual optimization
- **Base64 in DB**: Not recommended - bloats database, poor performance

---

## Database Schema Changes

### Projects Collection - New Fields

| Field Name            | Type     | Size | Required | Default | Description                                          |
| --------------------- | -------- | ---- | -------- | ------- | ---------------------------------------------------- |
| `thumbnailUrl`        | Text     | 2048 | No       | NULL    | Cloudinary URL of screenshot                         |
| `lastThumbnailUpdate` | DateTime | -    | No       | NULL    | When thumbnail was last captured                     |
| `thumbnailStatus`     | Text     | 50   | No       | NULL    | 'pending' \| 'processing' \| 'completed' \| 'failed' |

### TypeScript Interface Update

```typescript
export interface Project {
  // ... existing fields
  thumbnailUrl?: string;
  lastThumbnailUpdate?: string;
  thumbnailStatus?: "pending" | "processing" | "completed" | "failed";
}
```

---

## Trigger Mechanisms (Hybrid Approach)

### 1. Initial Capture (Automatic)

**When**: Preview URL becomes available for the first time  
**Delay**: 5 seconds after preview URL is ready  
**Purpose**: Capture initial state of the project

```typescript
// In DaytonaContext or project page
useEffect(() => {
  if (previewUrl && !project.thumbnailUrl) {
    setTimeout(() => {
      captureThumbnail(project.$id, previewUrl);
    }, 5000);
  }
}, [previewUrl]);
```

### 2. Smart Update Detection (Automatic with Debouncing)

**When**: Files are modified  
**Debounce**: 30 seconds after last file save  
**Conditions**:

- Preview is running
- Visual files changed (.tsx, .jsx, .css, .html)
- Not just README or config files

```typescript
// Pseudo-code
const visualFileExtensions = [".tsx", ".jsx", ".css", ".html", ".scss"];
const shouldCapture = (changedFiles) => {
  return changedFiles.some((file) =>
    visualFileExtensions.some((ext) => file.path.endsWith(ext))
  );
};
```

### 3. Manual Trigger (User-Initiated)

**Where**: ProjectCard dropdown menu  
**Button**: "Refresh Thumbnail"  
**Purpose**: User wants immediate update

### 4. Periodic Update (Future Enhancement)

**When**: Background job every 24 hours  
**Condition**: Project modified since last capture  
**Priority**: Low, runs during off-peak hours

---

## Implementation Architecture

### API Routes

#### POST `/api/projects/[id]/thumbnail`

**Purpose**: Capture and update project thumbnail  
**Flow**:

1. Validate user owns the project
2. Get preview URL from request or fetch from Daytona
3. Launch capture-website with Puppeteer
4. Navigate to preview URL (with auth token if needed)
5. Wait for page load + delay
6. Capture screenshot to buffer
7. Upload buffer to Cloudinary
8. Update project with thumbnailUrl and timestamp
9. Return success/failure

**Request Body**:

```typescript
{
  previewUrl?: string; // Optional, will fetch if not provided
  force?: boolean;     // Skip debounce check
}
```

**Response**:

```typescript
{
  success: boolean;
  thumbnailUrl?: string;
  error?: string;
}
```

#### DELETE `/api/projects/[id]/thumbnail`

**Purpose**: Remove thumbnail (cleanup)  
**Flow**:

1. Validate user owns the project
2. Delete from Cloudinary
3. Clear thumbnailUrl from project
4. Return success

---

### Services & Utilities

#### `lib/services/thumbnailService.ts`

```typescript
export async function captureThumbnail(
  previewUrl: string,
  projectId: string,
  options?: CaptureOptions
): Promise<CaptureResult>;

export async function uploadThumbnailToCloudinary(
  buffer: Buffer,
  projectId: string
): Promise<string>; // Returns Cloudinary URL

export async function deleteThumbnail(projectId: string): Promise<void>;

export function shouldUpdateThumbnail(
  project: Project,
  changedFiles: string[]
): boolean;
```

#### `lib/hooks/useThumbnailCapture.ts`

```typescript
export function useThumbnailCapture(projectId: string) {
  const [isCapturing, setIsCapturing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const capture = async (force = false) => {
    // Implementation
  };

  return { capture, isCapturing, error };
}
```

---

## Component Updates

### ProjectCard.tsx

**Changes**:

1. Display thumbnail image if available
2. Fallback to DottedGlowBackground if no thumbnail
3. Add "Refresh Thumbnail" option in dropdown
4. Show loading state during capture
5. Handle error states

```typescript
// Pseudo-code
<div className="aspect-video">
  {project.thumbnailUrl ? (
    <img
      src={project.thumbnailUrl}
      alt={project.title}
      className="w-full h-full object-cover"
    />
  ) : (
    <DottedGlowBackground {...props} />
  )}

  {isCapturing && <LoadingOverlay />}
</div>
```

### Dropdown Menu Addition

```typescript
<DropdownItem onClick={handleRefreshThumbnail}>
  <RefreshCw className="h-4 w-4" />
  Refresh Thumbnail
</DropdownItem>
```

---

## Capture Workflow

```
User creates/edits project
    ↓
Files are saved to Daytona
    ↓
DaytonaContext exposes preview URL
    ↓
[TRIGGER 1] Preview URL available → Capture after 5s delay
    ↓
File changes detected
    ↓
Debounce timer starts (30s)
    ↓
[TRIGGER 2] Timer expires → Check if should capture
    ↓
POST /api/projects/[id]/thumbnail
    ↓
Validate preview URL exists
    ↓
Launch Puppeteer with capture-website
    ↓
Navigate to preview URL (with Daytona token)
    ↓
Wait for page load + 2s delay
    ↓
Capture screenshot (1280x800, PNG, quality 0.8)
    ↓
Convert to buffer
    ↓
Upload to Cloudinary (folder: project-thumbnails)
    ↓
Update project.thumbnailUrl in Appwrite
    ↓
Update project.lastThumbnailUpdate timestamp
    ↓
Set project.thumbnailStatus = 'completed'
    ↓
Return success
    ↓
UI updates ProjectCard with new thumbnail
```

---

## Performance & Optimization

### Capture Optimization

- **Viewport**: 1280x800 (standard desktop)
- **Quality**: 0.8 (good balance)
- **Timeout**: 30 seconds max
- **Disable animations**: For consistent captures
- **Block ads**: Reduce load time
- **Network idle**: Wait for resources to load

### Concurrency Control

```typescript
import pLimit from "p-limit";

const captureLimit = pLimit(2); // Max 2 concurrent captures

export async function queueCapture(projectId: string, previewUrl: string) {
  return captureLimit(() => captureThumbnail(previewUrl, projectId));
}
```

### Caching Strategy

- Browser caches thumbnails (Cloudinary CDN)
- Don't re-capture if `lastThumbnailUpdate` < 5 minutes ago
- Skip capture if no visual files changed

### Resource Management

- Close Puppeteer browser after each capture
- Clean up old thumbnails on project deletion
- Monitor memory usage in production

---

## Error Handling

### Capture Failures

**Scenarios**:

1. **Preview URL not available**: Skip capture, keep old thumbnail
2. **Timeout (30s)**: Mark as failed, retry with exponential backoff
3. **Upload failure**: Retry 3 times, then mark as failed
4. **Invalid preview URL**: Log error, don't retry
5. **Puppeteer crash**: Restart browser, retry once

**Retry Strategy**:

```typescript
const retryWithBackoff = async (fn, maxRetries = 3) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await sleep(Math.pow(2, i) * 1000); // 1s, 2s, 4s
    }
  }
};
```

### User-Facing Errors

- Show toast notification on failure
- Display error icon in ProjectCard
- Provide "Retry" button
- Log detailed errors for debugging

---

## Edge Cases & Solutions

| Edge Case             | Solution                                        |
| --------------------- | ----------------------------------------------- |
| No preview URL yet    | Show DottedGlowBackground, capture when ready   |
| Preview URL changes   | Detect change, trigger new capture              |
| Auth required         | Pass Daytona token in headers                   |
| Slow loading pages    | Add 2-5s delay after page load                  |
| Dynamic content       | Accept variation, capture what's visible        |
| Mobile vs Desktop     | Start with desktop (1280x800), add mobile later |
| Dark mode             | Capture in light mode by default                |
| Multiple pages/routes | Capture homepage only initially                 |
| Failed captures       | Retry with exponential backoff, max 3 attempts  |
| Deleted projects      | Clean up thumbnails on project deletion         |
| Stale thumbnails      | Show age indicator, auto-refresh after 7 days   |

---

## UI/UX Design

### Project Card States

#### 1. No Thumbnail (Initial State)

```
┌─────────────────────┐
│                     │
│  DottedGlowBackground│
│                     │
└─────────────────────┘
```

#### 2. Thumbnail Loading

```
┌─────────────────────┐
│                     │
│   [Spinner Icon]    │
│  Generating...      │
└─────────────────────┘
```

#### 3. Thumbnail Loaded

```
┌─────────────────────┐
│                     │
│  [Screenshot Image] │
│                     │
└─────────────────────┘
Updated 5m ago
```

#### 4. Thumbnail Failed

```
┌─────────────────────┐
│                     │
│   [Error Icon]      │
│  [Retry Button]     │
└─────────────────────┘
```

### Dropdown Menu

```
┌─────────────────────┐
│ ✏️  Rename Project   │
│ 🔄 Refresh Thumbnail │ ← NEW
│ ─────────────────── │
│ 🗑️  Delete Project   │
└─────────────────────┘
```

---

## Dependencies

### NPM Packages to Install

```json
{
  "dependencies": {
    "capture-website": "^5.1.0",
    "p-limit": "^6.1.0"
  }
}
```

### Existing Dependencies (Already Available)

- `cloudinary`: For image upload
- `appwrite`: For database updates
- `next`: For API routes

---

## Configuration

### Environment Variables

```env
# Already exists
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# May need to add
THUMBNAIL_CAPTURE_TIMEOUT=30000
THUMBNAIL_DEBOUNCE_DELAY=30000
THUMBNAIL_MAX_RETRIES=3
```

### Capture Settings

```typescript
const CAPTURE_OPTIONS = {
  width: 1280,
  height: 800,
  type: "png",
  quality: 0.8,
  scaleFactor: 1,
  timeout: 30,
  delay: 2,
  disableAnimations: true,
  blockAds: true,
  waitForNetworkIdle: true,
};
```

---

## Testing Strategy

### Unit Tests

- `thumbnailService.ts` functions
- Change detection logic
- Retry mechanism
- URL validation

### Integration Tests

- API endpoint `/api/projects/[id]/thumbnail`
- Cloudinary upload flow
- Database updates
- Error handling

### E2E Tests

- Create project → Auto-capture thumbnail
- Edit files → Debounced capture
- Manual refresh → Immediate capture
- Delete project → Cleanup thumbnail

### Manual Testing Checklist

- [ ] Thumbnail displays correctly in ProjectCard
- [ ] Fallback works when no thumbnail
- [ ] Loading state shows during capture
- [ ] Error state shows on failure
- [ ] Retry button works
- [ ] Manual refresh works
- [ ] Auto-capture triggers on preview ready
- [ ] Debounced capture works on file changes
- [ ] Thumbnail updates in realtime
- [ ] Old thumbnails cleaned up on deletion

---

## Security Considerations

### Authentication

- Verify user owns project before capture
- Validate preview URL is from Daytona
- Pass Daytona token securely in headers

### Rate Limiting

- Limit captures per user (e.g., 10/hour)
- Prevent abuse of manual refresh
- Queue captures to prevent DoS

### Sandboxing

- Run Puppeteer with proper sandboxing
- Don't disable `--no-sandbox` in production
- Isolate capture process from main app

### Data Privacy

- Don't capture sensitive data in screenshots
- Respect user privacy settings
- Allow users to disable auto-capture

---

## Monitoring & Analytics

### Metrics to Track

- Capture success rate
- Average capture time
- Failed captures (with reasons)
- Cloudinary storage usage
- API endpoint latency

### Logging

```typescript
console.log("[Thumbnail] Capturing:", projectId);
console.log("[Thumbnail] Success:", thumbnailUrl);
console.error("[Thumbnail] Failed:", error);
```

### Alerts

- High failure rate (>10%)
- Slow captures (>30s)
- Cloudinary quota exceeded
- Puppeteer crashes

---

## Cost Estimation

### Cloudinary Free Tier

- 25 GB storage
- 25 GB bandwidth/month
- Assuming 200 KB per thumbnail
- ~125,000 thumbnails storage
- ~125,000 views/month

### Compute Costs

- Puppeteer: ~2-5s per capture
- Server resources: Minimal (Next.js API)
- Estimated: <$10/month for 1000 projects

---

## Migration Plan

### For Existing Projects

1. Run batch job to generate thumbnails
2. Process in batches of 10 (concurrency: 2)
3. Skip projects without preview URL
4. Retry failed captures after 1 hour
5. Monitor progress in admin dashboard

### Rollout Strategy

1. Deploy database schema changes
2. Deploy API endpoints (feature flag off)
3. Test with internal projects
4. Enable for 10% of users
5. Monitor for issues
6. Gradual rollout to 100%

---

## Success Criteria

### MVP Success

- ✅ Thumbnails display in ProjectCard
- ✅ Auto-capture on preview ready
- ✅ Manual refresh works
- ✅ Fallback to DottedGlowBackground
- ✅ <5% failure rate

### Full Success

- ✅ <2% failure rate
- ✅ <10s average capture time
- ✅ 95% user satisfaction
- ✅ No performance degradation
- ✅ Positive user feedback

---

## Future Considerations

### Advanced Features

- **Video Thumbnails**: Capture short GIF/video of interaction
- **Multiple Screenshots**: Capture different routes/pages
- **Thumbnail Gallery**: Show history of thumbnails
- **AI-Generated Thumbnails**: Use AI to create custom thumbnails
- **Thumbnail Templates**: Pre-designed templates for common frameworks

### Scalability

- **CDN**: Use Cloudinary's CDN for global delivery
- **Queue System**: Use Redis/BullMQ for capture queue
- **Microservice**: Separate thumbnail service
- **Serverless**: Use AWS Lambda for captures

---

## Conclusion

This implementation plan provides a comprehensive roadmap for adding project thumbnails to the landing page. The hybrid trigger approach balances automation with user control, while the phased implementation ensures a stable rollout.

**Key Takeaways**:

1. Use `capture-website` for reliable screenshot capture
2. Store thumbnails in Cloudinary for optimization and CDN
3. Implement smart triggers (auto + manual + debounced)
4. Focus on performance and error handling
5. Provide excellent UX with loading states and fallbacks

**Next Steps**:

1. Review and approve this plan
2. Set up development environment
3. Start Phase 1 implementation
4. Iterate based on feedback

---

**Document Version**: 1.0
**Last Updated**: 2025-01-06
**Author**: AI Assistant
**Status**: Planning Complete - Ready for Implementation
