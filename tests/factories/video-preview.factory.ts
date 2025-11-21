/**
 * Test Factory: Video Preview Data
 * Story 4.3: Video Preview & Playback Functionality
 *
 * Factory functions for generating test data for video preview tests.
 * Provides consistent, realistic test data across all test suites.
 */

import { faker } from '@faker-js/faker';
import { vi } from 'vitest';
import type { VisualSuggestion } from '@/types/visual-suggestions';

/**
 * VideoPreviewPlayer component props factory
 */
export interface VideoPreviewPlayerProps {
  suggestionId: string;
  projectId: string;
  videoId: string;
  title: string;
  channelTitle: string;
  segmentPath: string | null;
  downloadStatus: 'pending' | 'downloading' | 'complete' | 'error';
  onClose: () => void;
}

/**
 * Create mock VideoPreviewPlayer props
 */
export function createMockVideoPreviewProps(
  overrides?: Partial<VideoPreviewPlayerProps>
): VideoPreviewPlayerProps {
  const projectId = overrides?.projectId || faker.string.uuid();
  const sceneNumber = faker.number.int({ min: 1, max: 10 });

  return {
    suggestionId: faker.string.uuid(),
    projectId,
    videoId: faker.string.alphanumeric(11), // YouTube ID format
    title: faker.lorem.sentence({ min: 3, max: 8 }),
    channelTitle: faker.company.name(),
    segmentPath: `.cache/videos/${projectId}/scene-${String(sceneNumber).padStart(2, '0')}-default.mp4`,
    downloadStatus: 'complete',
    onClose: () => {},
    ...overrides,
  };
}

/**
 * Create visual suggestion with complete download
 */
export function createCompleteDownloadSuggestion(
  overrides?: Partial<VisualSuggestion>
): VisualSuggestion {
  const videoId = faker.string.alphanumeric(11);
  const projectId = faker.string.uuid();
  const sceneNumber = faker.number.int({ min: 1, max: 10 });

  return {
    id: faker.string.uuid(),
    sceneId: faker.string.uuid(),
    videoId,
    title: `${faker.lorem.words(3)} - Complete Download`,
    thumbnailUrl: `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`,
    channelTitle: faker.company.name(),
    embedUrl: `https://youtube.com/embed/${videoId}`,
    rank: faker.number.int({ min: 1, max: 8 }),
    duration: faker.number.int({ min: 30, max: 300 }),
    defaultSegmentPath: `.cache/videos/${projectId}/scene-${String(sceneNumber).padStart(2, '0')}-default.mp4`,
    downloadStatus: 'complete',
    createdAt: faker.date.recent().toISOString(),
    ...overrides,
  };
}

/**
 * Create visual suggestion with error download
 */
export function createErrorDownloadSuggestion(
  overrides?: Partial<VisualSuggestion>
): VisualSuggestion {
  const videoId = faker.string.alphanumeric(11);

  return {
    id: faker.string.uuid(),
    sceneId: faker.string.uuid(),
    videoId,
    title: `${faker.lorem.words(3)} - Error Download`,
    thumbnailUrl: `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`,
    channelTitle: faker.company.name(),
    embedUrl: `https://youtube.com/embed/${videoId}`,
    rank: faker.number.int({ min: 1, max: 8 }),
    duration: faker.number.int({ min: 30, max: 300 }),
    defaultSegmentPath: undefined,
    downloadStatus: 'error',
    createdAt: faker.date.recent().toISOString(),
    ...overrides,
  };
}

/**
 * Create visual suggestion with pending download
 */
export function createPendingDownloadSuggestion(
  overrides?: Partial<VisualSuggestion>
): VisualSuggestion {
  return {
    ...createCompleteDownloadSuggestion(overrides),
    downloadStatus: 'pending',
    defaultSegmentPath: undefined,
    ...overrides,
  };
}

/**
 * Create a set of visual suggestions for a scene
 */
export function createSceneSuggestions(
  sceneId: string,
  count: number = 4
): VisualSuggestion[] {
  const suggestions: VisualSuggestion[] = [];

  for (let i = 0; i < count; i++) {
    const rank = i + 1;

    // Mix different download states
    if (i === 0) {
      // First is usually complete
      suggestions.push(
        createCompleteDownloadSuggestion({
          sceneId,
          rank,
        })
      );
    } else if (i === count - 1) {
      // Last might have error
      suggestions.push(
        createErrorDownloadSuggestion({
          sceneId,
          rank,
        })
      );
    } else {
      // Middle ones are complete
      suggestions.push(
        createCompleteDownloadSuggestion({
          sceneId,
          rank,
        })
      );
    }
  }

  return suggestions;
}

/**
 * Create mock video file data
 */
export interface MockVideoFile {
  path: string;
  content: Buffer;
  size: number;
  mimeType: string;
}

/**
 * Create mock MP4 video file
 */
export function createMockMp4File(sizeKb: number = 1024): MockVideoFile {
  // Valid MP4 file header (ftyp box)
  const header = Buffer.from([
    0x00, 0x00, 0x00, 0x20, // Box size (32 bytes)
    0x66, 0x74, 0x79, 0x70, // 'ftyp'
    0x69, 0x73, 0x6F, 0x6D, // 'isom'
    0x00, 0x00, 0x02, 0x00, // Minor version
    0x69, 0x73, 0x6F, 0x6D, // Compatible brand: isom
    0x69, 0x73, 0x6F, 0x32, // Compatible brand: iso2
    0x61, 0x76, 0x63, 0x31, // Compatible brand: avc1
    0x6D, 0x70, 0x34, 0x31, // Compatible brand: mp41
  ]);

  // Create buffer of requested size
  const totalSize = sizeKb * 1024;
  const content = Buffer.alloc(totalSize);

  // Copy header to beginning
  header.copy(content, 0);

  // Fill rest with video-like data
  for (let i = header.length; i < totalSize; i += 4) {
    content.writeUInt32BE(Math.floor(Math.random() * 0xFFFFFFFF), i);
  }

  return {
    path: `.cache/videos/test/scene-01-default.mp4`,
    content,
    size: totalSize,
    mimeType: 'video/mp4',
  };
}

/**
 * Create mock WebM video file
 */
export function createMockWebmFile(sizeKb: number = 1024): MockVideoFile {
  // Valid WebM file header
  const header = Buffer.from([
    0x1A, 0x45, 0xDF, 0xA3, // EBML header
    0x93, 0x42, 0x82, 0x88, // DocType
    0x6D, 0x61, 0x74, 0x72, // 'matr'
    0x6F, 0x73, 0x6B, 0x61, // 'oska'
  ]);

  const totalSize = sizeKb * 1024;
  const content = Buffer.alloc(totalSize);

  header.copy(content, 0);

  // Fill rest with data
  for (let i = header.length; i < totalSize; i++) {
    content[i] = Math.floor(Math.random() * 256);
  }

  return {
    path: `.cache/videos/test/scene-01.webm`,
    content,
    size: totalSize,
    mimeType: 'video/webm',
  };
}

/**
 * Create corrupted video file for error testing
 */
export function createCorruptedVideoFile(): MockVideoFile {
  return {
    path: `.cache/videos/test/corrupted.mp4`,
    content: Buffer.from([0xFF, 0xFF, 0xFF, 0xFF]), // Invalid header
    size: 4,
    mimeType: 'video/mp4',
  };
}

/**
 * Mock Plyr player instance
 */
export function createMockPlyrInstance() {
  return {
    play: vi.fn().mockResolvedValue(undefined),
    pause: vi.fn(),
    destroy: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
    currentTime: 0,
    duration: 120,
    volume: 1,
    muted: false,
    paused: true,
    ended: false,
    seeking: false,
    speed: 1,
    quality: null,
    loop: false,
    source: null,
    poster: null,
    previewThumbnails: null,
    fullscreen: {
      active: false,
      enabled: true,
    },
    pip: false,
    ratio: '16:9',
    storage: {
      enabled: true,
    },
    togglePlay: vi.fn(),
    stop: vi.fn(),
    restart: vi.fn(),
    rewind: vi.fn(),
    forward: vi.fn(),
    increaseVolume: vi.fn(),
    decreaseVolume: vi.fn(),
    toggleMute: vi.fn(),
    toggleCaptions: vi.fn(),
    toggleFullscreen: vi.fn(),
    togglePIP: vi.fn(),
    toggleControls: vi.fn(),
    ready: Promise.resolve(),
  };
}

/**
 * Create test video element with mock methods
 */
export function createMockVideoElement() {
  const video = document.createElement('video');

  Object.defineProperty(video, 'paused', {
    writable: true,
    value: true,
  });

  Object.defineProperty(video, 'currentTime', {
    writable: true,
    value: 0,
  });

  Object.defineProperty(video, 'duration', {
    writable: true,
    value: 120,
  });

  Object.defineProperty(video, 'buffered', {
    writable: true,
    value: {
      length: 1,
      start: () => 0,
      end: () => 60,
    },
  });

  video.play = vi.fn().mockResolvedValue(undefined);
  video.pause = vi.fn();
  video.load = vi.fn();

  return video;
}

/**
 * Path traversal attack payloads for security testing
 */
export const pathTraversalPayloads = [
  '../../../etc/passwd',
  '..\\..\\..\\windows\\system32\\config',
  '.cache/videos/../../../etc/shadow',
  'videos/../../.env',
  '%2E%2E%2F%2E%2E%2F%2E%2E%2Fetc%2Fpasswd',
  '%252E%252E%252F%252E%252E%252Fetc%252Fpasswd',
  '..%2F..%2F..%2Fetc%2Fpasswd',
  '../videos/../../config.json',
  'videos/./../../secrets.txt',
  'videos//../..//etc/passwd',
];

/**
 * SQL injection payloads for security testing
 */
export const sqlInjectionPayloads = [
  "'; DROP TABLE scenes; --",
  "' OR 1=1; --",
  "1' UNION SELECT * FROM projects; --",
  "admin'--",
  "' OR 'a'='a",
  "1'; DELETE FROM scenes WHERE 1=1; --",
];

/**
 * Create mock fetch response
 */
export function createMockFetchResponse(data: any, options?: {
  status?: number;
  headers?: Record<string, string>;
  ok?: boolean;
}) {
  return {
    ok: options?.ok ?? true,
    status: options?.status ?? 200,
    headers: new Headers(options?.headers ?? {}),
    json: vi.fn().mockResolvedValue(data),
    text: vi.fn().mockResolvedValue(JSON.stringify(data)),
    blob: vi.fn().mockResolvedValue(new Blob([JSON.stringify(data)])),
    arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(0)),
    clone: vi.fn().mockReturnThis(),
  };
}

/**
 * Create mock Next.js request
 */
export function createMockNextRequest(url: string, options?: {
  method?: string;
  headers?: Record<string, string>;
  body?: any;
}) {
  return {
    url,
    method: options?.method ?? 'GET',
    headers: new Headers(options?.headers ?? {}),
    body: options?.body,
    json: vi.fn().mockResolvedValue(options?.body),
    text: vi.fn().mockResolvedValue(JSON.stringify(options?.body)),
  };
}