/**
 * Component Tests - ProviderSelectionModal
 * Story 6.11: NASA Web Scraping MCP Server & Pipeline Integration
 *
 * Tests for ProviderSelectionModal component including:
 * - Loading state display
 * - Provider list rendering
 * - Provider filtering by enabled status
 * - Provider sorting by priority
 * - Selection callback handling
 * - Modal close behavior
 * - API error fallback
 *
 * Test IDs: TEST-AC-6.11-COMP-001 to TEST-AC-6.11-COMP-015
 * Priority: P0 (Critical)
 *
 * @module tests/components/provider-selection-modal.test
 */

import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProviderSelectionModal } from '@/components/features/channel-intelligence/ProviderSelectionModal';
import type { VideoProvider } from '@/components/features/channel-intelligence/ProviderSelectionModal';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('[P0] ProviderSelectionModal Component - Story 6.11', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onSelectProvider: vi.fn(),
    isLoading: false,
  };

  const mockProviders: VideoProvider[] = [
    {
      id: 'dvids',
      name: 'DVIDS Military Videos',
      description: 'Military and defense footage from DVIDS',
      priority: 1,
      enabled: true,
      status: 'online',
    },
    {
      id: 'nasa',
      name: 'NASA Space Videos',
      description: 'Authentic space footage from NASA',
      priority: 2,
      enabled: true,
      status: 'online',
    },
    {
      id: 'youtube',
      name: 'YouTube',
      description: 'Largest video library with extensive content',
      priority: 3,
      enabled: true,
      status: 'online',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockClear();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  /**
   * [TEST-AC-6.11-COMP-001] Loading State Display
   */
  describe('[P0] TEST-AC-6.11-COMP-001: Loading State', () => {
    test('should display loading spinner when fetching providers', async () => {
      // Given: Modal opens without external providers
      // When: Component mounts and fetches providers
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ providers: mockProviders }),
      });

      render(<ProviderSelectionModal {...defaultProps} />);

      // Then: Should show loading state initially
      expect(screen.getByText(/loading providers/i)).toBeInTheDocument();
    });

    test('should show loading spinner with loader icon', () => {
      // Given: Modal is opening
      mockFetch.mockImplementation(() => new Promise(() => {})); // Never resolves

      // When: Rendering modal
      render(<ProviderSelectionModal {...defaultProps} />);

      // Then: Should display loading spinner
      const loader = screen.getByText(/loading providers/i).previousElementSibling;
      expect(loader).toHaveClass('animate-spin');
    });

    test('should hide loading state after providers load', async () => {
      // Given: Mock successful API response
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ providers: mockProviders }),
      });

      // When: Rendering modal
      render(<ProviderSelectionModal {...defaultProps} />);

      // Then: Loading should disappear after data loads
      await waitFor(() => {
        expect(screen.queryByText(/loading providers/i)).not.toBeInTheDocument();
      });
    });
  });

  /**
   * [TEST-AC-6.11-COMP-002] Provider List Display
   */
  describe('[P0] TEST-AC-6.11-COMP-002: Provider List Rendering', () => {
    test('should display all enabled providers after successful fetch', async () => {
      // Given: Mock API response with providers
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ providers: mockProviders }),
      });

      // When: Rendering modal
      render(<ProviderSelectionModal {...defaultProps} />);

      // Then: Should display all providers
      await waitFor(() => {
        expect(screen.getByText('DVIDS Military Videos')).toBeInTheDocument();
        expect(screen.getByText('NASA Space Videos')).toBeInTheDocument();
        expect(screen.getByText('YouTube')).toBeInTheDocument();
      });
    });

    test('should display DVIDS provider with correct details', async () => {
      // Given: Mock API with DVIDS provider
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ providers: [mockProviders[0]] }),
      });

      // When: Rendering modal
      render(<ProviderSelectionModal {...defaultProps} />);

      // Then: Should show DVIDS with description and priority
      await waitFor(() => {
        expect(screen.getByText('DVIDS Military Videos')).toBeInTheDocument();
        expect(screen.getByText(/Military and defense footage/i)).toBeInTheDocument();
        expect(screen.getByText(/Priority: 1/i)).toBeInTheDocument();
      });
    });

    test('should display NASA provider with correct details', async () => {
      // Given: Mock API with NASA provider
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ providers: [mockProviders[1]] }),
      });

      // When: Rendering modal
      render(<ProviderSelectionModal {...defaultProps} />);

      // Then: Should show NASA with description and priority
      await waitFor(() => {
        expect(screen.getByText('NASA Space Videos')).toBeInTheDocument();
        expect(screen.getByText(/Authentic space footage/i)).toBeInTheDocument();
        expect(screen.getByText(/Priority: 2/i)).toBeInTheDocument();
      });
    });

    test('should display YouTube provider with correct details', async () => {
      // Given: Mock API with YouTube provider
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ providers: [mockProviders[2]] }),
      });

      // When: Rendering modal
      render(<ProviderSelectionModal {...defaultProps} />);

      // Then: Should show YouTube with description and priority
      await waitFor(() => {
        expect(screen.getByText('YouTube')).toBeInTheDocument();
        expect(screen.getByText(/Largest video library/i)).toBeInTheDocument();
        expect(screen.getByText(/Priority: 3/i)).toBeInTheDocument();
      });
    });
  });

  /**
   * [TEST-AC-6.11-COMP-003] Provider Priority Sorting
   */
  describe('[P0] TEST-AC-6.11-COMP-003: Provider Sorting by Priority', () => {
    test('should display providers sorted by priority (1, 2, 3)', async () => {
      // Given: Mock API with providers in random order
      const unsortedProviders = [
        mockProviders[2], // YouTube - priority 3
        mockProviders[0], // DVIDS - priority 1
        mockProviders[1], // NASA - priority 2
      ];

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ providers: unsortedProviders }),
      });

      // When: Rendering modal
      render(<ProviderSelectionModal {...defaultProps} />);

      // Then: Providers should be displayed in priority order
      await waitFor(() => {
        const providerButtons = screen.getAllByRole('button');
        const visibleProviders = providerButtons.filter(btn =>
          btn.textContent?.includes('Military') ||
          btn.textContent?.includes('NASA') ||
          btn.textContent?.includes('YouTube')
        );

        // First should be DVIDS (priority 1)
        expect(visibleProviders[0].textContent).toContain('DVIDS');
        // Second should be NASA (priority 2)
        expect(visibleProviders[1].textContent).toContain('NASA');
        // Third should be YouTube (priority 3)
        expect(visibleProviders[2].textContent).toContain('YouTube');
      });
    });

    test('should show priority number for each provider', async () => {
      // Given: Mock API response
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ providers: mockProviders }),
      });

      // When: Rendering modal
      render(<ProviderSelectionModal {...defaultProps} />);

      // Then: Each provider should display priority
      await waitFor(() => {
        expect(screen.getByText(/Priority: 1/i)).toBeInTheDocument();
        expect(screen.getByText(/Priority: 2/i)).toBeInTheDocument();
        expect(screen.getByText(/Priority: 3/i)).toBeInTheDocument();
      });
    });
  });

  /**
   * [TEST-AC-6.11-COMP-004] Disabled Provider Filtering
   */
  describe('[P0] TEST-AC-6.11-COMP-004: Disabled Provider Filtering', () => {
    test('should not display disabled providers', async () => {
      // Given: Mock API with mixed enabled/disabled providers
      const mixedProviders = [
        ...mockProviders,
        {
          id: 'disabled-provider',
          name: 'Disabled Provider',
          description: 'This should not be shown',
          priority: 4,
          enabled: false,
          status: 'offline' as const,
        },
      ];

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ providers: mixedProviders }),
      });

      // When: Rendering modal
      render(<ProviderSelectionModal {...defaultProps} />);

      // Then: Disabled provider should not be displayed
      await waitFor(() => {
        expect(screen.queryByText('Disabled Provider')).not.toBeInTheDocument();
      });
    });

    test('should only show providers with enabled: true', async () => {
      // Given: Mock API with all providers disabled
      const allDisabled = mockProviders.map(p => ({ ...p, enabled: false }));

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ providers: allDisabled }),
      });

      // When: Rendering modal
      render(<ProviderSelectionModal {...defaultProps} />);

      // Then: Should show "no providers available" or empty state
      await waitFor(() => {
        expect(screen.queryByText('DVIDS Military Videos')).not.toBeInTheDocument();
        expect(screen.queryByText('NASA Space Videos')).not.toBeInTheDocument();
        expect(screen.queryByText('YouTube')).not.toBeInTheDocument();
      });
    });
  });

  /**
   * [TEST-AC-6.11-COMP-005] Provider Selection Callback
   */
  describe('[P0] TEST-AC-6.11-COMP-005: Selection Callback Handling', () => {
    test('should fire onSelectProvider callback when Select Provider clicked', async () => {
      // Given: Modal with loaded providers
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ providers: mockProviders }),
      });

      const handleSelect = vi.fn();
      render(<ProviderSelectionModal {...defaultProps} onSelectProvider={handleSelect} />);

      // When: Clicking on a provider and then Select Provider
      await waitFor(() => {
        fireEvent.click(screen.getByText('DVIDS Military Videos'));
      });

      const selectButton = screen.getByRole('button', { name: /select provider/i });
      fireEvent.click(selectButton);

      // Then: Callback should be called with provider ID
      expect(handleSelect).toHaveBeenCalledTimes(1);
      expect(handleSelect).toHaveBeenCalledWith('dvids');
    });

    test('should pass selected provider ID to callback', async () => {
      // Given: Modal with providers
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ providers: mockProviders }),
      });

      const handleSelect = vi.fn();
      render(<ProviderSelectionModal {...defaultProps} onSelectProvider={handleSelect} />);

      // When: Selecting different providers
      await waitFor(() => {
        fireEvent.click(screen.getByText('NASA Space Videos'));
      });

      fireEvent.click(screen.getByRole('button', { name: /select provider/i }));

      // Then: Should pass NASA ID
      expect(handleSelect).toHaveBeenCalledWith('nasa');
    });

    test('should highlight selected provider visually', async () => {
      // Given: Modal with providers
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ providers: mockProviders }),
      });

      // When: Clicking on a provider
      render(<ProviderSelectionModal {...defaultProps} />);

      await waitFor(() => {
        fireEvent.click(screen.getByText('YouTube'));
      });

      // Then: Provider should be visually selected
      const youtubeButton = screen.getByText('YouTube').closest('button');
      expect(youtubeButton).toHaveClass('border-indigo-500');
    });
  });

  /**
   * [TEST-AC-6.11-COMP-006] Modal Close Behavior
   */
  describe('[P0] TEST-AC-6.11-COMP-006: Modal Close Handling', () => {
    test('should call onClose when Cancel button clicked', async () => {
      // Given: Modal is open
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ providers: mockProviders }),
      });

      const handleClose = vi.fn();
      render(<ProviderSelectionModal {...defaultProps} onClose={handleClose} />);

      // When: Clicking Cancel
      await waitFor(() => {
        const cancelButton = screen.getByRole('button', { name: /cancel/i });
        fireEvent.click(cancelButton);
      });

      // Then: onClose callback should be called
      expect(handleClose).toHaveBeenCalledTimes(1);
    });

    test('should call onClose after successful provider selection', async () => {
      // Given: Modal with providers
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ providers: mockProviders }),
      });

      const handleClose = vi.fn();
      const handleSelect = vi.fn();
      render(
        <ProviderSelectionModal
          {...defaultProps}
          onClose={handleClose}
          onSelectProvider={handleSelect}
        />
      );

      // When: Selecting a provider
      await waitFor(() => {
        fireEvent.click(screen.getByText('DVIDS Military Videos'));
      });

      fireEvent.click(screen.getByRole('button', { name: /select provider/i }));

      // Then: Both callbacks should be called
      expect(handleSelect).toHaveBeenCalled();
      expect(handleClose).toHaveBeenCalled();
    });

    test('should not close when clicking outside modal if isLoading is true', async () => {
      // Given: Modal in loading state
      mockFetch.mockImplementation(() => new Promise(() => {}));

      const handleClose = vi.fn();
      render(
        <ProviderSelectionModal {...defaultProps} onClose={handleClose} isLoading={true} />
      );

      // When: Attempting to close
      const dialogContent = screen.getByText(/select video provider/i).closest('[role="dialog"]');
      if (dialogContent) {
        fireEvent.click(dialogContent);
      }

      // Then: Should not call onClose
      expect(handleClose).not.toHaveBeenCalled();
    });
  });

  /**
   * [TEST-AC-6.11-COMP-007] API Error Fallback
   */
  describe('[P1] TEST-AC-6.11-COMP-007: API Error Handling', () => {
    test('should load fallback defaults when API fails', async () => {
      // Given: API returns error
      mockFetch.mockRejectedValue(new Error('Network error'));

      // When: Rendering modal
      render(<ProviderSelectionModal {...defaultProps} />);

      // Then: Should show fallback providers
      await waitFor(() => {
        expect(screen.getByText('YouTube')).toBeInTheDocument();
        expect(screen.getByText(/Largest video library/i)).toBeInTheDocument();
      });
    });

    test('should display YouTube as fallback with priority 3', async () => {
      // Given: API failure
      mockFetch.mockRejectedValue(new Error('API unavailable'));

      // When: Loading fails
      render(<ProviderSelectionModal {...defaultProps} />);

      // Then: Fallback YouTube should be shown
      await waitFor(() => {
        expect(screen.getByText('YouTube')).toBeInTheDocument();
        expect(screen.getByText(/Priority: 3/i)).toBeInTheDocument();
      });
    });

    test('should display NASA as fallback with priority 2', async () => {
      // Given: API failure
      mockFetch.mockRejectedValue(new Error('API unavailable'));

      // When: Loading fails
      render(<ProviderSelectionModal {...defaultProps} />);

      // Then: Fallback NASA should be shown
      await waitFor(() => {
        expect(screen.getByText('NASA Space Videos')).toBeInTheDocument();
        expect(screen.getByText(/Priority: 2/i)).toBeInTheDocument();
      });
    });

    test('should display DVIDS as fallback with priority 1', async () => {
      // Given: API failure
      mockFetch.mockRejectedValue(new Error('API unavailable'));

      // When: Loading fails
      render(<ProviderSelectionModal {...defaultProps} />);

      // Then: Fallback DVIDS should be shown
      await waitFor(() => {
        expect(screen.getByText('DVIDS Military Videos')).toBeInTheDocument();
        expect(screen.getByText(/Priority: 1/i)).toBeInTheDocument();
      });
    });

    test('should log error to console when API fails', async () => {
      // Given: API error
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockFetch.mockRejectedValue(new Error('Failed to fetch'));

      // When: Rendering modal
      render(<ProviderSelectionModal {...defaultProps} />);

      // Then: Should log error
      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          'Failed to load providers:',
          expect.any(Error)
        );
      });

      consoleSpy.mockRestore();
    });
  });

  /**
   * [TEST-AC-6.11-COMP-008] External Providers Prop
   */
  describe('[P1] TEST-AC-6.11-COMP-008: External Providers Prop', () => {
    test('should use external providers when provided', async () => {
      // Given: External providers prop
      const customProviders: VideoProvider[] = [
        {
          id: 'custom',
          name: 'Custom Provider',
          description: 'A custom video source',
          priority: 1,
          enabled: true,
          status: 'online',
        },
      ];

      // When: Rendering with external providers
      render(
        <ProviderSelectionModal
          {...defaultProps}
          providers={customProviders}
        />
      );

      // Then: Should display external providers without fetching
      await waitFor(() => {
        expect(screen.getByText('Custom Provider')).toBeInTheDocument();
        expect(screen.getByText(/A custom video source/i)).toBeInTheDocument();
      });

      // Should NOT call fetch
      expect(mockFetch).not.toHaveBeenCalled();
    });

    test('should not fetch from API when external providers provided', async () => {
      // Given: External providers
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ providers: mockProviders }),
      });

      // When: Rendering with external providers
      render(
        <ProviderSelectionModal
          {...defaultProps}
          providers={mockProviders}
        />
      );

      // Then: Fetch should not be called
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  /**
   * [TEST-AC-6.11-COMP-009] Provider Status Indicators
   */
  describe('[P1] TEST-AC-6.11-COMP-009: Provider Status Display', () => {
    test('should show "Available" status for online providers', async () => {
      // Given: Provider with online status
      const onlineProvider = [{
        ...mockProviders[0],
        status: 'online' as const,
      }];

      // When: Rendering modal with external providers (bypasses API which overrides status)
      render(
        <ProviderSelectionModal
          {...defaultProps}
          providers={onlineProvider}
        />
      );

      // Then: Should show available status text
      await waitFor(() => {
        expect(screen.getByText('Available')).toBeInTheDocument();
      });
    });

    test('should show "Unavailable" status for offline providers', async () => {
      // Given: Provider with offline status
      const offlineProvider = [{
        ...mockProviders[0],
        status: 'offline' as const,
      }];

      // When: Rendering modal with external providers (bypasses API which overrides status)
      render(
        <ProviderSelectionModal
          {...defaultProps}
          providers={offlineProvider}
        />
      );

      // Then: Should show unavailable status text
      await waitFor(() => {
        expect(screen.getByText('Unavailable')).toBeInTheDocument();
      });
    });

    test('should show "Checking..." status for checking providers', async () => {
      // Given: Provider with checking status
      const checkingProvider = [{
        ...mockProviders[1],
        status: 'checking' as const,
      }];

      // When: Rendering modal with external providers (bypasses API which overrides status)
      render(
        <ProviderSelectionModal
          {...defaultProps}
          providers={checkingProvider}
        />
      );

      // Then: Should show checking status text
      await waitFor(() => {
        expect(screen.getByText('Checking...')).toBeInTheDocument();
      });
    });

    test('should disable clicking on offline providers', async () => {
      // Given: Offline provider
      const offlineProvider = [{
        ...mockProviders[0],
        status: 'offline' as const,
      }];

      // When: Rendering modal with external providers (bypasses API which overrides status)
      render(
        <ProviderSelectionModal
          {...defaultProps}
          providers={offlineProvider}
        />
      );

      // Then: Offline provider button should be disabled
      await waitFor(() => {
        const offlineButton = screen.getByText('DVIDS Military Videos').closest('button');
        expect(offlineButton).toBeDisabled();
      });
    });
  });

  /**
   * [TEST-AC-6.11-COMP-010] Provider Icons
   */
  describe('[P2] TEST-AC-6.11-COMP-010: Provider Icon Display', () => {
    test('should show Rocket icon for NASA provider', async () => {
      // Given: NASA provider
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ providers: [mockProviders[1]] }),
      });

      // When: Rendering modal
      render(<ProviderSelectionModal {...defaultProps} />);

      // Then: Should display rocket icon with lucide-rocket class
      await waitFor(() => {
        expect(screen.getByText('NASA Space Videos')).toBeInTheDocument();
        const rocketIcon = document.querySelector('.lucide-rocket');
        expect(rocketIcon).toBeInTheDocument();
      });
    });

    test('should show Shield icon for DVIDS provider', async () => {
      // Given: DVIDS provider
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ providers: [mockProviders[0]] }),
      });

      // When: Rendering modal
      render(<ProviderSelectionModal {...defaultProps} />);

      // Then: Should display shield icon with lucide-shield class
      await waitFor(() => {
        expect(screen.getByText('DVIDS Military Videos')).toBeInTheDocument();
        const shieldIcon = document.querySelector('.lucide-shield');
        expect(shieldIcon).toBeInTheDocument();
      });
    });

    test('should show Video icon for YouTube provider', async () => {
      // Given: YouTube provider
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ providers: [mockProviders[2]] }),
      });

      // When: Rendering modal
      render(<ProviderSelectionModal {...defaultProps} />);

      // Then: Should display video icon with lucide-video class
      await waitFor(() => {
        expect(screen.getByText('YouTube')).toBeInTheDocument();
        const videoIcon = document.querySelector('.lucide-video');
        expect(videoIcon).toBeInTheDocument();
      });
    });
  });

  /**
   * [TEST-AC-6.11-COMP-011] Initial Provider Selection
   */
  describe('[P2] TEST-AC-6.11-COMP-011: Current Provider Handling', () => {
    test('should pre-select provider when currentProvider prop is provided', async () => {
      // Given: currentProvider prop
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ providers: mockProviders }),
      });

      // When: Rendering with currentProvider
      render(
        <ProviderSelectionModal
          {...defaultProps}
          currentProvider="nasa"
        />
      );

      // Then: NASA should be visually selected
      await waitFor(() => {
        const nasaButton = screen.getByText('NASA Space Videos').closest('button');
        expect(nasaButton).toHaveClass('border-indigo-500');
      });
    });

    test('should default to YouTube when no currentProvider provided', async () => {
      // Given: No currentProvider prop
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ providers: mockProviders }),
      });

      // When: Rendering modal
      render(<ProviderSelectionModal {...defaultProps} />);

      // Then: YouTube should be selected
      await waitFor(() => {
        const youtubeButton = screen.getByText('YouTube').closest('button');
        expect(youtubeButton).toHaveClass('border-indigo-500');
      });
    });
  });

  /**
   * [TEST-AC-6.11-COMP-012] Modal Title and Description
   */
  describe('[P2] TEST-AC-6.11-COMP-012: Modal Content', () => {
    test('should display correct modal title', async () => {
      // Given: Modal is open
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ providers: mockProviders }),
      });

      // When: Rendering modal
      render(<ProviderSelectionModal {...defaultProps} />);

      // Then: Should show title
      expect(screen.getByText('Select Video Provider')).toBeInTheDocument();
    });

    test('should display provider priority explanation', async () => {
      // Given: Modal is open
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ providers: mockProviders }),
      });

      // When: Rendering modal
      render(<ProviderSelectionModal {...defaultProps} />);

      // Then: Should show priority explanation
      await waitFor(() => {
        expect(screen.getByText(/Provider Priority:/i)).toBeInTheDocument();
        expect(screen.getByText(/system will try providers in order/i)).toBeInTheDocument();
      });
    });

    test('should show modal description', async () => {
      // Given: Modal is open
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ providers: mockProviders }),
      });

      // When: Rendering modal
      render(<ProviderSelectionModal {...defaultProps} />);

      // Then: Should show description
      expect(screen.getByText(/Choose your preferred video source/i)).toBeInTheDocument();
    });
  });

  /**
   * [TEST-AC-6.11-COMP-013] Loading State on Select
   */
  describe('[P2] TEST-AC-6.11-COMP-013: Submit Button Loading State', () => {
    test('should show loading spinner when isLoading prop is true', async () => {
      // Given: Modal in loading state
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ providers: mockProviders }),
      });

      // When: Rendering with isLoading=true
      render(<ProviderSelectionModal {...defaultProps} isLoading={true} />);

      // Then: Select button should show loading state
      await waitFor(() => {
        expect(screen.getByText(/Saving\.\.\./i)).toBeInTheDocument();
      });
    });

    test('should disable Select Provider button when isLoading is true', async () => {
      // Given: Modal in loading state
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ providers: mockProviders }),
      });

      // When: Rendering with isLoading=true
      render(<ProviderSelectionModal {...defaultProps} isLoading={true} />);

      // Then: Select button should be disabled
      await waitFor(() => {
        const selectButton = screen.getByRole('button', { name: /saving/i });
        expect(selectButton).toBeDisabled();
      });
    });

    test('should show "Select Provider" text when not loading', async () => {
      // Given: Modal not in loading state
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ providers: mockProviders }),
      });

      // When: Rendering with isLoading=false
      render(<ProviderSelectionModal {...defaultProps} isLoading={false} />);

      // Then: Should show normal button text
      await waitFor(() => {
        expect(screen.getByText(/Select Provider/i)).toBeInTheDocument();
      });
    });
  });

  /**
   * [TEST-AC-6.11-COMP-014] Empty Providers State
   */
  describe('[P2] TEST-AC-6.11-COMP-014: Edge Cases', () => {
    test('should handle empty providers array gracefully', async () => {
      // Given: API returns empty array
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ providers: [] }),
      });

      // When: Rendering modal
      render(<ProviderSelectionModal {...defaultProps} />);

      // Then: Should not show any providers
      await waitFor(() => {
        expect(screen.queryByText('DVIDS')).not.toBeInTheDocument();
        expect(screen.queryByText('NASA')).not.toBeInTheDocument();
        expect(screen.queryByText('YouTube')).not.toBeInTheDocument();
      });
    });

    test('should handle providers with missing description field', async () => {
      // Given: Provider without description
      const providerWithoutDescription = [{
        id: 'test',
        name: 'Test Provider',
        priority: 1,
        enabled: true,
        status: 'online' as const,
      }];

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ providers: providerWithoutDescription }),
      });

      // When: Rendering modal
      render(<ProviderSelectionModal {...defaultProps} />);

      // Then: Should use default description
      await waitFor(() => {
        expect(screen.getByText('Test Provider')).toBeInTheDocument();
        expect(screen.getByText(/Test Provider video content/i)).toBeInTheDocument();
      });
    });
  });

  /**
   * [TEST-AC-6.11-COMP-015] Keyboard Navigation
   */
  describe('[P2] TEST-AC-6.11-COMP-015: Accessibility', () => {
    test('should be keyboard navigable', async () => {
      // Given: Modal with providers
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ providers: mockProviders }),
      });

      // When: Rendering modal
      render(<ProviderSelectionModal {...defaultProps} />);

      // Then: Providers should be buttons (keyboard accessible)
      await waitFor(() => {
        const providerButtons = screen.getAllByRole('button');
        expect(providerButtons.length).toBeGreaterThan(0);
      });
    });

    test('should have proper ARIA labels', async () => {
      // Given: Modal is open
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ providers: mockProviders }),
      });

      // When: Rendering modal
      render(<ProviderSelectionModal {...defaultProps} />);

      // Then: Dialog should have proper role
      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();
    });
  });
});
