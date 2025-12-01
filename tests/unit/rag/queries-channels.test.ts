/**
 * Channel Database Queries Tests
 *
 * Story 6.3 - YouTube Channel Sync & Caption Scraping
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock database client
vi.mock('@/lib/db/client', () => ({
  default: {
    prepare: vi.fn(() => ({
      run: vi.fn(() => ({ changes: 1 })),
      get: vi.fn(),
      all: vi.fn(() => [])
    }))
  }
}));

// Import after mocking
import {
  createChannel,
  getChannelById,
  getChannelByYouTubeId,
  getChannelsByNiche,
  getAllChannels,
  updateChannel,
  deleteChannel,
  upsertChannelVideo,
  getChannelVideoById,
  getChannelVideoByYouTubeId,
  getChannelVideos,
  getUnprocessedVideos,
  getVideosNeedingEmbedding,
  updateVideoTranscript,
  updateVideoEmbeddingStatus,
  getChannelVideoCount,
  getEmbeddedVideoCount,
  getLatestVideoDate
} from '@/lib/db/queries-channels';
import db from '@/lib/db/client';

describe('Channel Database Queries', () => {
  let mockPrepare: ReturnType<typeof vi.fn>;
  let mockRun: ReturnType<typeof vi.fn>;
  let mockGet: ReturnType<typeof vi.fn>;
  let mockAll: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockRun = vi.fn(() => ({ changes: 1 }));
    mockGet = vi.fn();
    mockAll = vi.fn(() => []);
    mockPrepare = vi.fn(() => ({
      run: mockRun,
      get: mockGet,
      all: mockAll
    }));

    (db.prepare as ReturnType<typeof vi.fn>) = mockPrepare;
  });

  describe('Channel Operations', () => {
    describe('createChannel', () => {
      it('should insert channel and return created record', () => {
        const mockChannel = {
          id: 'test-uuid',
          channel_id: 'UC_test',
          name: 'Test Channel',
          description: null,
          subscriber_count: 1000,
          video_count: 50,
          is_user_channel: 0,
          is_competitor: 1,
          niche: 'gaming',
          last_sync: null,
          sync_status: 'pending',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        };

        mockGet.mockReturnValue(mockChannel);

        const result = createChannel({
          channelId: 'UC_test',
          name: 'Test Channel',
          subscriberCount: 1000,
          videoCount: 50,
          isCompetitor: true,
          niche: 'gaming'
        });

        expect(mockPrepare).toHaveBeenCalled();
        expect(mockRun).toHaveBeenCalled();
        expect(result.channelId).toBe('UC_test');
        expect(result.isCompetitor).toBe(true);
      });
    });

    describe('getChannelById', () => {
      it('should return channel if found', () => {
        const mockChannel = {
          id: 'test-id',
          channel_id: 'UC_test',
          name: 'Test',
          sync_status: 'synced',
          is_user_channel: 1,
          is_competitor: 0,
          created_at: '2024-01-01',
          updated_at: '2024-01-01'
        };

        mockGet.mockReturnValue(mockChannel);

        const result = getChannelById('test-id');

        expect(result).not.toBeNull();
        expect(result?.id).toBe('test-id');
        expect(result?.isUserChannel).toBe(true);
      });

      it('should return null if not found', () => {
        mockGet.mockReturnValue(undefined);

        const result = getChannelById('nonexistent');

        expect(result).toBeNull();
      });
    });

    describe('getChannelByYouTubeId', () => {
      it('should return channel by YouTube ID', () => {
        const mockChannel = {
          id: 'test-id',
          channel_id: 'UC_youtube_id',
          name: 'YouTube Channel',
          sync_status: 'pending',
          is_user_channel: 0,
          is_competitor: 0,
          created_at: '2024-01-01',
          updated_at: '2024-01-01'
        };

        mockGet.mockReturnValue(mockChannel);

        const result = getChannelByYouTubeId('UC_youtube_id');

        expect(result?.channelId).toBe('UC_youtube_id');
      });
    });

    describe('getAllChannels', () => {
      it('should return all channels', () => {
        const mockChannels = [
          {
            id: '1', channel_id: 'UC_1', name: 'Channel 1',
            sync_status: 'synced', is_user_channel: 0, is_competitor: 0,
            created_at: '2024-01-01', updated_at: '2024-01-01'
          },
          {
            id: '2', channel_id: 'UC_2', name: 'Channel 2',
            sync_status: 'pending', is_user_channel: 0, is_competitor: 1,
            created_at: '2024-01-02', updated_at: '2024-01-02'
          }
        ];

        mockAll.mockReturnValue(mockChannels);

        const result = getAllChannels();

        expect(result).toHaveLength(2);
        expect(result[0].name).toBe('Channel 1');
        expect(result[1].name).toBe('Channel 2');
      });
    });

    describe('updateChannel', () => {
      it('should update channel fields', () => {
        const updatedChannel = {
          id: 'test-id',
          channel_id: 'UC_test',
          name: 'Updated Name',
          sync_status: 'synced',
          niche: 'tech',
          is_user_channel: 0,
          is_competitor: 0,
          created_at: '2024-01-01',
          updated_at: '2024-01-01'
        };

        mockGet.mockReturnValue(updatedChannel);

        const result = updateChannel('test-id', {
          name: 'Updated Name',
          syncStatus: 'synced',
          niche: 'tech'
        });

        expect(mockRun).toHaveBeenCalled();
        expect(result?.syncStatus).toBe('synced');
      });
    });

    describe('deleteChannel', () => {
      it('should return true if deleted', () => {
        mockRun.mockReturnValue({ changes: 1 });

        const result = deleteChannel('test-id');

        expect(result).toBe(true);
      });

      it('should return false if not found', () => {
        mockRun.mockReturnValue({ changes: 0 });

        const result = deleteChannel('nonexistent');

        expect(result).toBe(false);
      });
    });
  });

  describe('Channel Video Operations', () => {
    describe('upsertChannelVideo', () => {
      it('should create new video if not exists', () => {
        mockGet.mockReturnValueOnce(undefined); // Video doesn't exist
        mockGet.mockReturnValueOnce({
          id: 'new-video-id',
          channel_id: 'UC_test',
          video_id: 'vid123',
          title: 'New Video',
          embedding_status: 'pending',
          created_at: '2024-01-01'
        });

        const result = upsertChannelVideo({
          channelId: 'UC_test',
          videoId: 'vid123',
          title: 'New Video'
        });

        expect(result.videoId).toBe('vid123');
        expect(result.embeddingStatus).toBe('pending');
      });

      it('should update existing video', () => {
        const existingVideo = {
          id: 'existing-id',
          channel_id: 'UC_test',
          video_id: 'vid123',
          title: 'Old Title',
          embedding_status: 'pending',
          created_at: '2024-01-01'
        };

        mockGet.mockReturnValueOnce(existingVideo); // Video exists
        mockGet.mockReturnValueOnce({
          ...existingVideo,
          title: 'Updated Title'
        });

        const result = upsertChannelVideo({
          channelId: 'UC_test',
          videoId: 'vid123',
          title: 'Updated Title'
        });

        expect(result.title).toBe('Updated Title');
      });
    });

    describe('getUnprocessedVideos', () => {
      it('should return videos without transcripts', () => {
        const mockVideos = [
          {
            id: '1', channel_id: 'UC_test', video_id: 'vid1',
            title: 'Video 1', transcript: null, embedding_status: 'pending',
            created_at: '2024-01-01'
          }
        ];

        mockAll.mockReturnValue(mockVideos);

        const result = getUnprocessedVideos('UC_test');

        expect(result).toHaveLength(1);
        expect(result[0].transcript).toBeNull();
      });
    });

    describe('getVideosNeedingEmbedding', () => {
      it('should return videos with transcripts but no embeddings', () => {
        const mockVideos = [
          {
            id: '1', channel_id: 'UC_test', video_id: 'vid1',
            title: 'Video 1', transcript: 'Some text', embedding_status: 'pending',
            created_at: '2024-01-01'
          }
        ];

        mockAll.mockReturnValue(mockVideos);

        const result = getVideosNeedingEmbedding('UC_test');

        expect(result).toHaveLength(1);
        expect(result[0].transcript).toBe('Some text');
        expect(result[0].embeddingStatus).toBe('pending');
      });
    });

    describe('updateVideoTranscript', () => {
      it('should update video with transcript', () => {
        const updatedVideo = {
          id: '1', channel_id: 'UC_test', video_id: 'vid1',
          title: 'Video 1', transcript: 'Full transcript text',
          embedding_status: 'pending', created_at: '2024-01-01'
        };

        mockGet.mockReturnValue(updatedVideo);

        const result = updateVideoTranscript('vid1', 'Full transcript text');

        expect(mockRun).toHaveBeenCalled();
        expect(result?.transcript).toBe('Full transcript text');
      });
    });

    describe('updateVideoEmbeddingStatus', () => {
      it('should update embedding status', () => {
        const updatedVideo = {
          id: '1', channel_id: 'UC_test', video_id: 'vid1',
          title: 'Video 1', transcript: 'Text',
          embedding_id: 'emb123', embedding_status: 'embedded',
          created_at: '2024-01-01'
        };

        mockGet.mockReturnValue(updatedVideo);

        const result = updateVideoEmbeddingStatus('vid1', 'emb123', 'embedded');

        expect(result?.embeddingStatus).toBe('embedded');
        expect(result?.embeddingId).toBe('emb123');
      });
    });

    describe('getChannelVideoCount', () => {
      it('should return video count', () => {
        mockGet.mockReturnValue({ count: 42 });

        const result = getChannelVideoCount('UC_test');

        expect(result).toBe(42);
      });
    });

    describe('getEmbeddedVideoCount', () => {
      it('should return embedded video count', () => {
        mockGet.mockReturnValue({ count: 30 });

        const result = getEmbeddedVideoCount('UC_test');

        expect(result).toBe(30);
      });
    });

    describe('getLatestVideoDate', () => {
      it('should return latest publication date', () => {
        mockGet.mockReturnValue({ latest: '2024-06-15T12:00:00Z' });

        const result = getLatestVideoDate('UC_test');

        expect(result).toBe('2024-06-15T12:00:00Z');
      });

      it('should return null if no videos', () => {
        mockGet.mockReturnValue({ latest: null });

        const result = getLatestVideoDate('UC_test');

        expect(result).toBeNull();
      });
    });
  });
});
