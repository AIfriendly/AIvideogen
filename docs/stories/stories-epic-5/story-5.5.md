# Story 5.5: Export UI & Download Workflow

**Epic:** 5 - Video Assembly & Output
**Story ID:** 5.5
**Status:** done
**Priority:** High
**Created:** 2025-11-28
**Implements:** FR-7.06, FR-8.05

---

## Story Contract (Parallel Execution)

> **CRITICAL:** This story is designed for parallel execution. Follow this contract strictly to prevent conflicts with other stories.

### File Ownership

**Files I Create (exclusive_create):**
- `src/app/projects/[id]/export/page.tsx` - Export page route component
- `src/app/projects/[id]/export/export-client.tsx` - Export page client component
- `src/components/assembly/AssemblyProgress.tsx` - Assembly progress indicator component
- `src/components/assembly/VideoDownload.tsx` - Video download button component
- `src/components/assembly/ThumbnailPreview.tsx` - Thumbnail preview display
- `src/components/assembly/ExportSummary.tsx` - Project completion summary
- `src/app/api/projects/[id]/export/route.ts` - GET endpoint for export metadata
- `src/stores/export-store.ts` - Zustand store for export page state
- `tests/unit/components/export.test.tsx` - Export component tests

**Files I Modify (exclusive_modify):**
- `src/lib/db/queries.ts` - Add `getExportData` query function

**Files I Import From (read_only):**
- `src/lib/video/constants.ts` - Import `VIDEO_ASSEMBLY_CONFIG`
- `src/types/assembly.ts` - Import `AssemblyJob`, `AssemblyResult`
- `src/lib/db/client.ts` - Import `db`
- `src/components/ui/button.tsx` - Import `Button`
- `src/components/ui/card.tsx` - Import `Card`

### Naming Conventions

- **File prefix:** `export-`
- **Component prefix:** `Export`
- **CSS class prefix:** `exp-`
- **Test prefix:** `export.`

### Database Ownership

- **Tables I create:** None
- **Columns I add:** None
- **Tables I read:** `assembly_jobs`, `projects`, `scenes`
- **Tables I update:** `projects` (current_step to 'export')

### Interface Dependencies

**I Consume (from Story 5.1):**
- `GET /api/projects/[id]/assembly-status` - Poll job status
- `AssemblyJob` interface for status tracking

**I Consume (from Story 5.4):**
- `thumbnail_path` from projects table

**I Implement:**
- `GET /api/projects/[id]/export` - Export metadata endpoint
- `ExportStore` - Zustand store for client state
- `ExportClient` - Main export page component
- `VideoDownload` - Download button with sanitized filenames
- `ThumbnailPreview` - Thumbnail display with download
- `ExportSummary` - Metadata display component
- `AssemblyProgress` - Progress indicator for assembly status

### Merge Order

- **Position:** 5 of 5 (final story)
- **Merges after:** Story 5.4 (Automated Thumbnail Generation)
- **Merges before:** None (last in Epic 5)

---

## User Story

**As a** video creator,
**I want** to see my completed video with download options,
**So that** I can download and share my creation easily.

---

## Description

This story implements the Export UI that displays after video assembly completes. It provides:

1. **Video Player:** Large video player showcasing the final assembled video
2. **Thumbnail Preview:** Sidebar showing the auto-generated thumbnail with download option
3. **Download Buttons:** Primary button to download video, secondary for thumbnail
4. **Metadata Display:** Duration, file size, resolution, topic, and scene count
5. **Navigation:** "Create New Video" and "Back to Curation" buttons
6. **Celebration:** Header with party popper emoji to celebrate completion

The export page serves as the satisfying conclusion to the video creation workflow, making it easy for users to access their final outputs.

---

## Acceptance Criteria

### AC1: Export Page Route
**Given** a project with a completed assembly job (status = 'complete')
**When** user navigates to `/projects/[id]/export`
**Then** the export page displays with video player, thumbnail, and metadata

### AC2: Video Player Display
**Given** the export page is loaded
**When** the video player renders
**Then** it shows the final assembled video with native HTML5 controls (play, pause, progress, volume, fullscreen)

### AC3: Thumbnail Preview
**Given** the export page is loaded
**When** the thumbnail section renders
**Then** it displays the generated thumbnail at 16:9 aspect ratio with "Download Thumbnail" button

### AC4: Video Download
**Given** user clicks "Download Video" button
**When** download initiates
**Then** MP4 file saves to user's Downloads with sanitized filename (e.g., "mars-colonization.mp4")

### AC5: Thumbnail Download
**Given** user clicks "Download Thumbnail" button
**When** download initiates
**Then** JPEG file saves with sanitized filename (e.g., "mars-colonization-thumbnail.jpg")

### AC6: Metadata Display
**Given** the export page is loaded
**When** metadata section renders
**Then** it shows: Duration (mm:ss), File Size (MB), Resolution (1280x720), Topic, Scene Count

### AC7: Create New Video Navigation
**Given** user clicks "Create New Video" button
**When** navigation completes
**Then** user is taken to home page to start a new project

### AC8: Back to Curation Navigation
**Given** user clicks "Back to Curation" button
**When** navigation completes
**Then** user returns to the Visual Curation page for that project

### AC9: Export API Endpoint
**Given** a project with completed video
**When** GET /api/projects/[id]/export is called
**Then** response includes: video_path, thumbnail_path, duration, file_size, scene_count, title

### AC10: Project Step Update
**Given** export page is viewed for the first time
**When** page loads successfully
**Then** project's current_step is updated to 'export' (final workflow step)

### AC11: Loading State
**Given** assembly is still in progress
**When** user navigates to export page
**Then** show assembly progress indicator with current stage and percentage

### AC12: Error State
**Given** assembly failed (status = 'error')
**When** user navigates to export page
**Then** show error message with retry option

---

## Technical Implementation

### Architecture

```
src/app/projects/[id]/export/
├── page.tsx              # Server component (route)
└── export-client.tsx     # Client component (main UI)

src/components/assembly/
├── AssemblyProgress.tsx  # Progress bar with stage info
├── VideoDownload.tsx     # Download button component
├── ThumbnailPreview.tsx  # Thumbnail with download
└── ExportSummary.tsx     # Metadata display

src/app/api/projects/[id]/export/
└── route.ts              # Export metadata API

src/stores/
└── export-store.ts       # Zustand state management

tests/unit/components/
└── export.test.tsx       # Component tests
```

### Key Components

#### 1. Export Page Server Component (page.tsx)

```typescript
// src/app/projects/[id]/export/page.tsx
import { ExportClient } from './export-client';

interface ExportPageProps {
  params: Promise<{ id: string }>;
}

export default async function ExportPage({ params }: ExportPageProps) {
  const { id } = await params;
  return <ExportClient projectId={id} />;
}
```

#### 2. Export Client Component (export-client.tsx)

```typescript
// src/app/projects/[id]/export/export-client.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { VideoDownload } from '@/components/assembly/VideoDownload';
import { ThumbnailPreview } from '@/components/assembly/ThumbnailPreview';
import { ExportSummary } from '@/components/assembly/ExportSummary';
import { AssemblyProgress } from '@/components/assembly/AssemblyProgress';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface ExportData {
  video_path: string;
  thumbnail_path: string;
  duration: number;
  file_size: number;
  scene_count: number;
  title: string;
  resolution: string;
}

interface AssemblyStatus {
  status: 'pending' | 'processing' | 'complete' | 'error';
  progress: number;
  current_stage: string;
  error_message?: string;
}

export function ExportClient({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [exportData, setExportData] = useState<ExportData | null>(null);
  const [assemblyStatus, setAssemblyStatus] = useState<AssemblyStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Check assembly status first
        const statusRes = await fetch(`/api/projects/${projectId}/assembly-status`);
        const statusData = await statusRes.json();
        setAssemblyStatus(statusData);

        if (statusData.status === 'complete') {
          // Fetch export data
          const exportRes = await fetch(`/api/projects/${projectId}/export`);
          if (!exportRes.ok) throw new Error('Failed to fetch export data');
          const data = await exportRes.json();
          setExportData(data);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // Poll if still processing
    const interval = setInterval(() => {
      if (assemblyStatus?.status === 'processing') {
        fetchData();
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [projectId, assemblyStatus?.status]);

  if (loading) {
    return <div className="exp-loading">Loading...</div>;
  }

  if (assemblyStatus?.status === 'processing') {
    return <AssemblyProgress status={assemblyStatus} />;
  }

  if (assemblyStatus?.status === 'error') {
    return (
      <div className="exp-error">
        <h2>Assembly Failed</h2>
        <p>{assemblyStatus.error_message}</p>
        <Button onClick={() => router.push(`/projects/${projectId}/assembly`)}>
          Retry Assembly
        </Button>
      </div>
    );
  }

  if (!exportData) {
    return <div className="exp-error">No export data available</div>;
  }

  return (
    <div className="exp-container max-w-[1200px] mx-auto p-8">
      {/* Header */}
      <h1 className="exp-header text-2xl font-semibold text-slate-50 mb-6">
        🎉 Your Video is Ready!
      </h1>

      {/* Main Content Grid */}
      <div className="exp-content grid grid-cols-[2fr_1fr] gap-6 mb-6">
        {/* Video Player */}
        <div className="exp-video-section">
          <video
            className="exp-video w-full aspect-video rounded-xl bg-black shadow-lg"
            controls
            poster={exportData.thumbnail_path}
          >
            <source src={exportData.video_path} type="video/mp4" />
          </video>

          {/* Primary Download Button */}
          <VideoDownload
            videoPath={exportData.video_path}
            title={exportData.title}
            className="mt-4"
          />
        </div>

        {/* Thumbnail Preview */}
        <ThumbnailPreview
          thumbnailPath={exportData.thumbnail_path}
          title={exportData.title}
        />
      </div>

      {/* Metadata Card */}
      <ExportSummary
        duration={exportData.duration}
        fileSize={exportData.file_size}
        resolution={exportData.resolution}
        title={exportData.title}
        sceneCount={exportData.scene_count}
      />

      {/* Action Buttons */}
      <div className="exp-actions flex justify-between mt-8">
        <Button
          onClick={() => router.push('/')}
          className="bg-indigo-500 hover:bg-indigo-600"
        >
          + Create New Video
        </Button>
        <Button
          variant="ghost"
          onClick={() => router.push(`/projects/${projectId}/curation`)}
          className="text-slate-300"
        >
          ← Back to Curation
        </Button>
      </div>
    </div>
  );
}
```

#### 3. Export API Endpoint

```typescript
// src/app/api/projects/[id]/export/route.ts
import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db/client';
import { stat } from 'fs/promises';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;

    // Get project data
    const project = db.prepare(`
      SELECT id, name, topic, video_path, thumbnail_path, total_duration, video_file_size
      FROM projects
      WHERE id = ?
    `).get(projectId) as {
      id: string;
      name: string | null;
      topic: string | null;
      video_path: string | null;
      thumbnail_path: string | null;
      total_duration: number | null;
      video_file_size: number | null;
    } | undefined;

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found', code: 'PROJECT_NOT_FOUND' },
        { status: 404 }
      );
    }

    if (!project.video_path) {
      return NextResponse.json(
        { error: 'No video available', code: 'FILE_NOT_FOUND' },
        { status: 400 }
      );
    }

    // Get scene count
    const sceneResult = db.prepare(`
      SELECT COUNT(*) as count FROM scenes WHERE project_id = ?
    `).get(projectId) as { count: number };

    // Get file size if not stored
    let fileSize = project.video_file_size;
    if (!fileSize) {
      try {
        const stats = await stat(project.video_path);
        fileSize = stats.size;
      } catch {
        fileSize = 0;
      }
    }

    // Update current_step to 'export' on first view (final workflow step)
    db.prepare(`
      UPDATE projects SET current_step = 'export' WHERE id = ? AND current_step != 'export'
    `).run(projectId);

    const title = project.topic || project.name || 'Untitled Video';

    return NextResponse.json({
      video_path: project.video_path.replace('public/', '/'),
      thumbnail_path: project.thumbnail_path?.replace('public/', '/') || null,
      duration: project.total_duration || 0,
      file_size: fileSize,
      scene_count: sceneResult.count,
      title,
      resolution: '1280x720',
    });
  } catch (error) {
    console.error('[export] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
```

#### 4. VideoDownload Component

```typescript
// src/components/assembly/VideoDownload.tsx
'use client';

import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

interface VideoDownloadProps {
  videoPath: string;
  title: string;
  className?: string;
}

function sanitizeFilename(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .substring(0, 50);
}

export function VideoDownload({ videoPath, title, className }: VideoDownloadProps) {
  const handleDownload = () => {
    const filename = sanitizeFilename(title) + '.mp4';
    const link = document.createElement('a');
    link.href = videoPath;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Button
      onClick={handleDownload}
      className={`exp-download-video w-full bg-indigo-500 hover:bg-indigo-600 text-white py-3 px-6 rounded-lg font-semibold shadow-lg ${className}`}
    >
      <Download className="w-5 h-5 mr-2" />
      Download Video
    </Button>
  );
}
```

#### 5. ThumbnailPreview Component

```typescript
// src/components/assembly/ThumbnailPreview.tsx
'use client';

import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

interface ThumbnailPreviewProps {
  thumbnailPath: string;
  title: string;
}

function sanitizeFilename(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .substring(0, 50);
}

export function ThumbnailPreview({ thumbnailPath, title }: ThumbnailPreviewProps) {
  const handleDownload = () => {
    const filename = sanitizeFilename(title) + '-thumbnail.jpg';
    const link = document.createElement('a');
    link.href = thumbnailPath;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="exp-thumbnail bg-slate-800 border border-slate-700 rounded-xl p-4 flex flex-col">
      <span className="exp-thumbnail-label text-sm font-semibold text-slate-300 mb-3">
        Thumbnail
      </span>

      <img
        src={thumbnailPath}
        alt={`Thumbnail for ${title}`}
        className="exp-thumbnail-image aspect-video rounded-lg object-cover shadow-md"
      />

      <Button
        onClick={handleDownload}
        variant="outline"
        className="mt-3 w-full border-indigo-500 text-indigo-500 hover:bg-slate-700/30"
      >
        <Download className="w-4 h-4 mr-2" />
        Download Thumbnail
      </Button>
    </div>
  );
}
```

#### 6. ExportSummary Component

```typescript
// src/components/assembly/ExportSummary.tsx
interface ExportSummaryProps {
  duration: number;
  fileSize: number;
  resolution: string;
  title: string;
  sceneCount: number;
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function formatFileSize(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(1)} MB`;
}

export function ExportSummary({
  duration,
  fileSize,
  resolution,
  title,
  sceneCount,
}: ExportSummaryProps) {
  return (
    <div className="exp-summary bg-slate-800 border border-slate-700 rounded-lg p-4 flex flex-wrap justify-center gap-6">
      <div className="exp-summary-item text-sm">
        <span className="text-slate-400">⏱ Duration: </span>
        <span className="text-slate-50">{formatDuration(duration)}</span>
      </div>
      <div className="exp-summary-item text-sm">
        <span className="text-slate-400">📁 Size: </span>
        <span className="text-slate-50">{formatFileSize(fileSize)}</span>
      </div>
      <div className="exp-summary-item text-sm">
        <span className="text-slate-400">🖥 Resolution: </span>
        <span className="text-slate-50">{resolution}</span>
      </div>
      <div className="exp-summary-item text-sm">
        <span className="text-slate-400">📝 Topic: </span>
        <span className="text-slate-50">{title}</span>
      </div>
      <div className="exp-summary-item text-sm">
        <span className="text-slate-400">🎬 Scenes: </span>
        <span className="text-slate-50">{sceneCount}</span>
      </div>
    </div>
  );
}
```

#### 7. AssemblyProgress Component

```typescript
// src/components/assembly/AssemblyProgress.tsx
interface AssemblyProgressProps {
  status: {
    status: string;
    progress: number;
    current_stage: string;
    current_scene?: number;
    total_scenes?: number;
  };
}

const stageLabels: Record<string, string> = {
  trimming: 'Trimming scenes',
  concatenating: 'Joining scenes',
  audio_overlay: 'Adding voiceover',
  thumbnail: 'Generating thumbnail',
  finalizing: 'Finalizing video',
};

export function AssemblyProgress({ status }: AssemblyProgressProps) {
  const stageLabel = stageLabels[status.current_stage] || status.current_stage;

  return (
    <div className="exp-progress flex flex-col items-center justify-center min-h-[400px] p-8">
      <h2 className="text-xl font-semibold text-slate-50 mb-4">
        Assembling Your Video...
      </h2>

      <div className="w-full max-w-md bg-slate-700 rounded-full h-4 mb-4">
        <div
          className="bg-indigo-500 h-4 rounded-full transition-all duration-300"
          style={{ width: `${status.progress}%` }}
          role="progressbar"
          aria-valuenow={status.progress}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>

      <p className="text-slate-300 text-center">
        {stageLabel}
        {status.current_scene && status.total_scenes && (
          <span> ({status.current_scene}/{status.total_scenes})</span>
        )}
      </p>

      <p className="text-slate-400 text-sm mt-2">
        {status.progress}% complete
      </p>
    </div>
  );
}
```

---

## Tasks

### Task 1: Create Export Page Route and Client Components

**Subtasks:**
1.1. Create `src/app/projects/[id]/export/page.tsx` server component
1.2. Create `src/app/projects/[id]/export/export-client.tsx` client component
1.3. Implement video player with HTML5 native controls
1.4. Implement thumbnail preview section
1.5. Add grid layout (2fr 1fr) per UX spec
1.6. Style with Tailwind using slate/indigo color scheme

**Contract Compliance:** Creates only files in exclusive_create

---

### Task 2: Create Export API Endpoint

**Subtasks:**
2.1. Create `src/app/api/projects/[id]/export/route.ts`
2.2. Query project for video_path, thumbnail_path, duration, file_size
2.3. Query scenes count
2.4. Update current_step to 'export' on first view (final workflow step)
2.5. Return sanitized response with video/thumbnail paths
2.6. Handle 404 for missing project/video

**Contract Compliance:** Creates only `route.ts` in exclusive_create

---

### Task 3: Create Assembly UI Components

**Subtasks:**
3.1. Create `src/components/assembly/VideoDownload.tsx` with sanitized filename
3.2. Create `src/components/assembly/ThumbnailPreview.tsx` with download
3.3. Create `src/components/assembly/ExportSummary.tsx` for metadata display
3.4. Create `src/components/assembly/AssemblyProgress.tsx` for loading state
3.5. Implement formatDuration() and formatFileSize() utilities

**Contract Compliance:** Creates only files in exclusive_create

---

### Task 4: Implement Download Functionality

**Subtasks:**
4.1. Implement sanitizeFilename() function
4.2. Create download trigger using anchor element with download attribute
4.3. Set correct filename for video ({title}.mp4)
4.4. Set correct filename for thumbnail ({title}-thumbnail.jpg)
4.5. Handle download errors gracefully

**Contract Compliance:** No new files created

---

### Task 5: Add Navigation and Actions

**Subtasks:**
5.1. Add "Create New Video" button linking to home
5.2. Add "Back to Curation" button linking to /projects/[id]/curation
5.3. Style buttons per UX spec (primary indigo, ghost for secondary)
5.4. Ensure proper router navigation

**Contract Compliance:** Modifications within existing components

---

### Task 6: Add Export Store (Optional)

**Subtasks:**
6.1. Create `src/stores/export-store.ts` with Zustand
6.2. Add state: jobStatus, videoPath, thumbnailPath
6.3. Add actions: setJobStatus, setVideoPath, setThumbnailPath, reset
6.4. Integrate with ExportClient component

**Contract Compliance:** Creates only `export-store.ts`

---

### Task 7: Create Unit Tests

**Subtasks:**
7.1. Create `tests/unit/components/export.test.tsx`
7.2. Test ExportClient rendering with mock data
7.3. Test VideoDownload click handler
7.4. Test ThumbnailPreview rendering
7.5. Test ExportSummary with various metadata values
7.6. Test AssemblyProgress with different stages
7.7. Test sanitizeFilename with edge cases

**Contract Compliance:** Creates only test file in exclusive_create

---

## Dev Notes

### Contract Enforcement

**ONLY touch files listed in ownership:**
- Create: `page.tsx`, `export-client.tsx`, `AssemblyProgress.tsx`, `VideoDownload.tsx`, `ThumbnailPreview.tsx`, `ExportSummary.tsx`, `route.ts`, `export-store.ts`, `export.test.tsx`
- Modify: `src/lib/db/queries.ts` (optional - add getExportData function)

**Use ONLY the naming prefixes specified:**
- Components: `Export*`
- CSS classes: `exp-*`
- Test files: `export.*`

### Critical Implementation Notes

1. **Video Path Handling:**
   - Videos are stored in `public/videos/{projectId}/final.mp4`
   - Serve via `/videos/{projectId}/final.mp4` (Next.js public folder)
   - Do NOT use `/api/videos/` route (was causing 404 issues)

2. **Thumbnail Path Handling:**
   - Thumbnails at `public/videos/{projectId}/thumbnail.jpg`
   - Serve via `/videos/{projectId}/thumbnail.jpg`

3. **Download Attribute:**
   - Use `<a download="filename.mp4">` for browser downloads
   - Sanitize filenames to remove special characters

4. **Polling Strategy:**
   - Poll `/api/projects/[id]/assembly-status` every 2 seconds while processing
   - Stop polling when status is 'complete' or 'error'

### UX Specification Compliance

- **Container:** max-width 1200px, centered, 32px padding
- **Background:** Slate 900 (#0f172a)
- **Header:** 24px font, semi-bold, Slate 50, party popper emoji
- **Grid:** 2fr 1fr columns, 24px gap
- **Video Player:** 16:9 aspect ratio, black background, 12px border radius
- **Primary Button:** Indigo 500, white text, 14px/32px padding, 8px radius
- **Secondary Button:** Transparent, Indigo border, Indigo text
- **Ghost Button:** Transparent, Slate 300 text

---

## Test Scenarios

### Positive Tests

1. **Page Load:** Export page renders with video and thumbnail
2. **Video Playback:** Video plays with native controls
3. **Video Download:** File downloads with sanitized name
4. **Thumbnail Download:** JPEG downloads correctly
5. **Metadata Display:** All metadata fields show correct values
6. **Navigation:** Both action buttons navigate correctly

### Edge Cases

1. **Long Title:** Title >50 chars truncated in filename
2. **Special Characters:** Symbols removed from filename
3. **Missing Thumbnail:** Graceful fallback if no thumbnail
4. **Zero Duration:** Handle 0:00 duration display

### Error States

1. **Assembly In Progress:** Show progress indicator
2. **Assembly Failed:** Show error message with retry
3. **Missing Project:** 404 page
4. **Missing Video:** Error state with message

---

## Definition of Done

- [x] All acceptance criteria met and tested
- [x] Export page displays video player with controls
- [x] Thumbnail preview displays correctly
- [x] Video download works with sanitized filename
- [x] Thumbnail download works with sanitized filename
- [x] Metadata displays: duration, size, resolution, topic, scenes
- [x] "Create New Video" navigates to home
- [x] "Back to Curation" navigates correctly
- [x] Loading state shows assembly progress
- [x] Error state shows with retry option
- [x] API endpoint returns correct data
- [x] Project current_step updated to 'export' (final workflow step)
- [x] Code follows contract boundaries exactly
- [x] No files outside exclusive_create/modify touched
- [x] Build passes without errors
- [x] Unit tests pass (53 tests passing)

---

## Post-Completion Notes

### Bug Fix: Absolute Path Handling (2025-11-28)

**Issue:** Thumbnail and video paths were stored as absolute Windows paths in the database (e.g., `D:\BMAD video generator\ai-video-generator\public\videos\xxx\thumbnail.jpg`), but the export API expected relative paths starting with `public/`.

**Fix:** Updated path transformation logic in `src/app/api/projects/[id]/export/route.ts` to:
1. Find the `public` segment in any path (absolute or relative)
2. Extract the web-servable portion from that point
3. Handle Windows backslashes by converting to forward slashes

**Result:** Thumbnails now display correctly on the Export page.

---

### Bug Fix: CHECK Constraint Violation on current_step (2025-11-29)

**Issue:** Export API was trying to set `current_step = 'complete'` when a user views the export page, but the database schema has a CHECK constraint that only allows these values: `topic`, `voice`, `script-generation`, `voiceover`, `visual-sourcing`, `visual-curation`, `editing`, `export`.

**Error Message:**
```
CHECK constraint failed: current_step IN ('topic', 'voice', 'script-generation', 'voiceover', 'visual-sourcing', 'visual-curation', 'editing', 'export')
```

**Root Cause:** The export API comment and code stated "Update current_step to 'complete'" but `'complete'` was never added to the allowed values in the database schema.

**Fix:** Changed `current_step = 'complete'` to `current_step = 'export'` in `src/app/api/projects/[id]/export/route.ts:91-93`. The `'export'` step is the final step in the workflow and already exists in the schema.

**Files Modified:**
- `src/app/api/projects/[id]/export/route.ts` - Line 89-93

**Code Change:**
```typescript
// Before:
if (project.current_step !== 'complete') {
  db.prepare(`UPDATE projects SET current_step = 'complete' WHERE id = ?`).run(projectId);
}

// After:
if (project.current_step !== 'export') {
  db.prepare(`UPDATE projects SET current_step = 'export' WHERE id = ?`).run(projectId);
}
```

**Result:** Export page and Assembly page now load correctly without database constraint errors.

---

## References

- PRD Feature 1.7 AC2 (Download Availability) lines 366-369
- PRD Feature 1.8 AC1 (Thumbnail Generation) lines 384-393
- UX Design Specification Section 7.7 (Export Page UI)
- Epic 5 Parallel Spec Story 5.5 Contract
- Architecture Document Section Story 5.5
- Story 5.4 (Automated Thumbnail Generation)
- Epic 4 Story 4.5 (Assembly trigger flow)
