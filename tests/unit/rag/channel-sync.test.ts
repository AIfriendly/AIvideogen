/**
 * Channel Sync Service Tests
 *
 * Story 6.3 - YouTube Channel Sync & Caption Scraping
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock dependencies
vi.mock('@/lib/rag/ingestion/youtube-channel', () => ({
  getYouTubeChannelService: vi.fn(() => ({
    resolveChannel: vi.fn(),
    getChannelVideos: vi.fn()
  }))
}));

vi.mock('@/lib/rag/ingestion/python-bridge', () => ({
  scrapeVideoTranscripts: vi.fn()
}));

vi.mock('@/lib/db/queries-channels', () => ({
  createChannel: vi.fn(),
  getChannelById: vi.fn(),
  getChannelByYouTubeId: vi.fn(),
  updateChannel: vi.fn(),
  upsertChannelVideo: vi.fn(),
  getUnprocessedVideos: vi.fn(),
  getVideosNeedingEmbedding: vi.fn(),
  updateVideoTranscript: vi.fn(),
  updateVideoEmbeddingStatus: vi.fn(),
  getLatestVideoDate: vi.fn()
}));

vi.mock('@/lib/rag/vector-db/chroma-client', () => ({
  getChromaClient: vi.fn(() => Promise.resolve({
    addDocuments: vi.fn()
  }))
}));

vi.mock('@/lib/rag/embeddings/local-embeddings', () => ({
  generateEmbedding: vi.fn(() => Promise.resolve({
    embedding: new Array(384).fill(0.1),
    dimensions: 384,
    model: 'all-MiniLM-L6-v2'
  }))
}));

// Import after mocking
import { ChannelSyncService } from '@/lib/rag/ingestion/channel-sync';
import { getYouTubeChannelService } from '@/lib/rag/ingestion/youtube-channel';
import { scrapeVideoTranscripts } from '@/lib/rag/ingestion/python-bridge';
import * as channelQueries from '@/lib/db/queries-channels';

describe('ChannelSyncService', () => {
  let service: ChannelSyncService;
  let mockYouTubeService: {
    resolveChannel: ReturnType<typeof vi.fn>;
    getChannelVideos: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Set up mock YouTube service
    mockYouTubeService = {
      resolveChannel: vi.fn(),
      getChannelVideos: vi.fn()
    };
    (getYouTubeChannelService as ReturnType<typeof vi.fn>).mockReturnValue(mockYouTubeService);

    service = new ChannelSyncService();
  });

  describe('addChannel', () => {
    it('should create new channel from YouTube identifier', async () => {
      mockYouTubeService.resolveChannel.mockResolvedValue({
        channelId: 'UC_test_channel',
        name: 'Test Channel',
        description: 'A test channel',
        subscriberCount: 10000,
        videoCount: 100
      });

      (channelQueries.getChannelByYouTubeId as ReturnType<typeof vi.fn>).mockReturnValue(null);
      (channelQueries.createChannel as ReturnType<typeof vi.fn>).mockReturnValue({
        id: 'internal-id-1',
        channelId: 'UC_test_channel',
        name: 'Test Channel',
        syncStatus: 'pending'
      });

      const channel = await service.addChannel('@testchannel', {
        isUserChannel: true,
        niche: 'gaming'
      });

      expect(channel.channelId).toBe('UC_test_channel');
      expect(channelQueries.createChannel).toHaveBeenCalledWith(
        expect.objectContaining({
          channelId: 'UC_test_channel',
          name: 'Test Channel',
          isUserChannel: true,
          niche: 'gaming'
        })
      );
    });

    it('should update existing channel', async () => {
      mockYouTubeService.resolveChannel.mockResolvedValue({
        channelId: 'UC_existing_channel',
        name: 'Existing Channel',
        subscriberCount: 20000
      });

      (channelQueries.getChannelByYouTubeId as ReturnType<typeof vi.fn>).mockReturnValue({
        id: 'existing-id',
        channelId: 'UC_existing_channel',
        name: 'Old Name'
      });

      (channelQueries.updateChannel as ReturnType<typeof vi.fn>).mockReturnValue({
        id: 'existing-id',
        channelId: 'UC_existing_channel',
        name: 'Existing Channel'
      });

      const channel = await service.addChannel('UC_existing_channel');

      expect(channelQueries.updateChannel).toHaveBeenCalled();
      expect(channelQueries.createChannel).not.toHaveBeenCalled();
    });

    it('should throw if channel not found on YouTube', async () => {
      mockYouTubeService.resolveChannel.mockResolvedValue(null);

      await expect(service.addChannel('@nonexistent'))
        .rejects.toThrow('Channel not found');
    });
  });

  describe('syncChannel', () => {
    const mockChannel = {
      id: 'internal-id',
      channelId: 'UC_test_channel',
      name: 'Test Channel',
      syncStatus: 'pending'
    };

    beforeEach(() => {
      (channelQueries.getChannelById as ReturnType<typeof vi.fn>).mockReturnValue(mockChannel);
      (channelQueries.getLatestVideoDate as ReturnType<typeof vi.fn>).mockReturnValue(null);
      (channelQueries.updateChannel as ReturnType<typeof vi.fn>).mockReturnValue(mockChannel);
    });

    it('should fetch videos from YouTube', async () => {
      mockYouTubeService.getChannelVideos.mockResolvedValue([
        { videoId: 'vid1', channelId: 'UC_test_channel', title: 'Video 1' },
        { videoId: 'vid2', channelId: 'UC_test_channel', title: 'Video 2' }
      ]);

      (channelQueries.getUnprocessedVideos as ReturnType<typeof vi.fn>).mockReturnValue([]);
      (channelQueries.getVideosNeedingEmbedding as ReturnType<typeof vi.fn>).mockReturnValue([]);

      const result = await service.syncChannel('internal-id', {
        scrapeTranscripts: false,
        generateEmbeddings: false
      });

      expect(result.success).toBe(true);
      expect(result.videosFound).toBe(2);
      expect(result.videosSynced).toBe(2);
      expect(channelQueries.upsertChannelVideo).toHaveBeenCalledTimes(2);
    });

    it('should handle videos sync without transcript scraping', async () => {
      mockYouTubeService.getChannelVideos.mockResolvedValue([
        { videoId: 'vid1', channelId: 'UC_test_channel', title: 'Video 1' }
      ]);

      (channelQueries.getUnprocessedVideos as ReturnType<typeof vi.fn>).mockReturnValue([]);
      (channelQueries.getVideosNeedingEmbedding as ReturnType<typeof vi.fn>).mockReturnValue([]);

      const result = await service.syncChannel('internal-id', {
        scrapeTranscripts: false,
        generateEmbeddings: false
      });

      expect(result.videosFound).toBe(1);
      expect(result.videosSynced).toBe(1);
      expect(result.transcriptsScraped).toBe(0);
    });

    it('should sync videos and skip embedding if disabled', async () => {
      mockYouTubeService.getChannelVideos.mockResolvedValue([]);

      (channelQueries.getUnprocessedVideos as ReturnType<typeof vi.fn>).mockReturnValue([]);
      (channelQueries.getVideosNeedingEmbedding as ReturnType<typeof vi.fn>).mockReturnValue([]);

      const result = await service.syncChannel('internal-id', {
        scrapeTranscripts: false,
        generateEmbeddings: false
      });

      // Should complete successfully with no processing
      expect(result.success).toBe(true);
      expect(result.embeddingsGenerated).toBe(0);
    });

    it('should use incremental sync when enabled', async () => {
      (channelQueries.getLatestVideoDate as ReturnType<typeof vi.fn>).mockReturnValue('2024-01-01T00:00:00Z');
      mockYouTubeService.getChannelVideos.mockResolvedValue([]);
      (channelQueries.getUnprocessedVideos as ReturnType<typeof vi.fn>).mockReturnValue([]);
      (channelQueries.getVideosNeedingEmbedding as ReturnType<typeof vi.fn>).mockReturnValue([]);

      await service.syncChannel('internal-id', {
        incremental: true
      });

      expect(mockYouTubeService.getChannelVideos).toHaveBeenCalledWith(
        'UC_test_channel',
        expect.objectContaining({
          publishedAfter: '2024-01-01T00:00:00Z'
        })
      );
    });

    it('should update sync status on completion', async () => {
      mockYouTubeService.getChannelVideos.mockResolvedValue([]);
      (channelQueries.getUnprocessedVideos as ReturnType<typeof vi.fn>).mockReturnValue([]);
      (channelQueries.getVideosNeedingEmbedding as ReturnType<typeof vi.fn>).mockReturnValue([]);

      await service.syncChannel('internal-id');

      expect(channelQueries.updateChannel).toHaveBeenCalledWith(
        'internal-id',
        expect.objectContaining({
          syncStatus: 'synced'
        })
      );
    });

    it('should throw if channel not found', async () => {
      (channelQueries.getChannelById as ReturnType<typeof vi.fn>).mockReturnValue(null);

      await expect(service.syncChannel('nonexistent-id'))
        .rejects.toThrow('Channel not found');
    });
  });
});
