# Video Processing Pipeline

### FFmpeg Operations

**1. Trim Video to Audio Duration:**
```typescript
// lib/video/ffmpeg.ts
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function trimVideoToAudio(
  videoPath: string,
  audioPath: string,
  outputPath: string
): Promise<void> {
  // Get audio duration
  const { stdout: durationStr } = await execAsync(
    `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${audioPath}"`
  );
  const duration = parseFloat(durationStr.trim());

  // Trim video
  await execAsync(
    `ffmpeg -i "${videoPath}" -t ${duration} -c copy "${outputPath}"`
  );
}
```

**2. Overlay Audio on Video:**
```typescript
export async function overlayAudio(
  videoPath: string,
  audioPath: string,
  outputPath: string
): Promise<void> {
  await execAsync(
    `ffmpeg -i "${videoPath}" -i "${audioPath}" -c:v copy -map 0:v:0 -map 1:a:0 -shortest "${outputPath}"`
  );
}
```

**3. Concatenate Videos:**
```typescript
export async function concatenateVideos(
  videoPaths: string[],
  outputPath: string
): Promise<void> {
  // Create concat file list
  const listPath = path.join(os.tmpdir(), 'concat-list.txt');
  const listContent = videoPaths.map(p => `file '${p}'`).join('\n');
  await writeFile(listPath, listContent);

  // Concatenate
  await execAsync(
    `ffmpeg -f concat -safe 0 -i "${listPath}" -c copy "${outputPath}"`
  );

  // Cleanup
  await unlink(listPath);
}
```

**4. Generate Thumbnail:**
```typescript
export async function generateThumbnail(
  videoPath: string,
  outputPath: string,
  timestamp: number = 1.0
): Promise<void> {
  // Extract frame at timestamp
  await execAsync(
    `ffmpeg -i "${videoPath}" -ss ${timestamp} -vframes 1 "${outputPath}"`
  );
}
```

### Complete Assembly Pipeline

```typescript
// lib/video/assembler.ts
export async function assembleVideo(
  projectId: string,
  scenes: Array<{ videoPath: string; audioPath: string }>
): Promise<string> {
  const outputDir = path.join('.cache', 'projects', projectId);
  await mkdir(outputDir, { recursive: true });

  const processedScenes: string[] = [];

  // Step 1: Process each scene
  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];
    const trimmedPath = path.join(outputDir, `scene-${i}-trimmed.mp4`);
    const finalPath = path.join(outputDir, `scene-${i}-final.mp4`);

    // Trim video to audio duration
    await trimVideoToAudio(scene.videoPath, scene.audioPath, trimmedPath);

    // Overlay audio
    await overlayAudio(trimmedPath, scene.audioPath, finalPath);

    processedScenes.push(finalPath);
  }

  // Step 2: Concatenate all scenes
  const finalOutputPath = path.join('.cache', 'output', `${projectId}.mp4`);
  await concatenateVideos(processedScenes, finalOutputPath);

  // Step 3: Generate thumbnail
  const thumbnailPath = path.join('.cache', 'output', `${projectId}-thumb.jpg`);
  await generateThumbnail(finalOutputPath, thumbnailPath);

  return finalOutputPath;
}
```

---
