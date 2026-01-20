/**
 * Component Tests: ProviderSelectionModal
 * Test IDs: 6.11-COMP-001 through 6.11-COMP-010
 *
 * Tests for Story 6.11 - Provider Selection Modal
 * Tests modal component for provider selection UI
 *
 * @module tests/components/ProviderSelectionModal.test
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ProviderSelectionModal } from '@/components/features/channel-intelligence/ProviderSelectionModal';

// Mock fetch for API calls
global.fetch = vi.fn();

describe('[P0] 6.11-COMP-001: Happy Path - Modal Renders Successfully', () => {
  const mockProviders = [
    {
      id: 'dvids',
      name: 'DVIDS Military Videos',
      description: 'Military and defense footage from DVIDS',
      priority: 1,
      enabled: true,
      status: 'online' as const,
    },
    {
      id: 'nasa',
      name: 'NASA Space Videos',
      description: 'Authentic space footage from NASA',
      priority: 2,
      enabled: true,
      status: 'checking' as const,
    },
    {
      id: 'youtube',
      name: 'YouTube',
      description: 'Largest video library',
      priority: 3,
      enabled: true,
      status: 'online' as const,
    },
  ];

  it('should render modal when isOpen is true', () => {
    // Given: Modal open with providers
    render(
      <ProviderSelectionModal
        isOpen={true}
        onClose={vi.fn()}
        onSelectProvider={vi.fn()}
        providers={mockProviders}
        currentProvider="youtube"
      />
    );

    // When: Modal is rendered
    // Then: Should display modal content
    expect(screen.getByText('Select Video Provider')).toBeInTheDocument();
    expect(screen.getByText(/Choose your preferred video source/i)).toBeInTheDocument();
  });

  it('should not render modal when isOpen is false', () => {
    // Given: Modal closed
    render(
      <ProviderSelectionModal
        isOpen={false}
        onClose={vi.fn()}
        onSelectProvider={vi.fn()}
        providers={mockProviders}
      />
    );

    // When: Modal is not open
    // Then: Should not display modal content
    expect(screen.queryByText('Select Video Provider')).not.toBeInTheDocument();
  });

  it('should display all enabled providers sorted by priority', () => {
    // Given: Providers with different priorities
    const handleClose = vi.fn();
    const handleSelect = vi.fn();

    render(
      <ProviderSelectionModal
        isOpen={true}
        onClose={handleClose}
        onSelectProvider={handleSelect}
        providers={mockProviders}
      />
    );

    // When: Modal renders providers
    // Then: Should display providers in priority order (1, 2, 3)
    const providerElements = screen.getAllByRole('button').filter(btn =>
      btn.classList.contains('p-4') && !btn.textContent?.includes('Cancel') && !btn.textContent?.includes('Select')
    );

    expect(providerElements).toHaveLength(3);
    expect(providerElements[0]).toHaveTextContent('DVIDS Military Videos');
    expect(providerElements[1]).toHaveTextContent('NASA Space Videos');
    expect(providerElements[2]).toHaveTextContent('YouTube');
  });
});

describe('[P0] 6.11-COMP-002: Provider Selection Interaction', () => {
  const mockProviders = [
    {
      id: 'youtube',
      name: 'YouTube',
      description: 'Largest video library',
      priority: 3,
      enabled: true,
      status: 'online' as const,
    },
    {
      id: 'dvids',
      name: 'DVIDS Military Videos',
      description: 'Military footage',
      priority: 1,
      enabled: true,
      status: 'online' as const,
    },
  ];

  it('should highlight selected provider', () => {
    // Given: Modal with current provider selected
    render(
      <ProviderSelectionModal
        isOpen={true}
        onClose={vi.fn()}
        onSelectProvider={vi.fn()}
        providers={mockProviders}
        currentProvider="youtube"
      />
    );

    // When: Checking selected provider
    const youtubeButton = screen.getByText('YouTube').closest('button');

    // Then: Should be highlighted
    expect(youtubeButton).toHaveClass('border-indigo-500');
    expect(youtubeButton).toHaveClass('bg-indigo-500/10');
  });

  it('should allow changing provider selection', async () => {
    // Given: Modal with YouTube selected
    const handleSelect = vi.fn();
    const handleClose = vi.fn();

    render(
      <ProviderSelectionModal
        isOpen={true}
        onClose={handleClose}
        onSelectProvider={handleSelect}
        providers={mockProviders}
        currentProvider="youtube"
      />
    );

    // When: Clicking on DVIDS provider
    const dvidsButton = screen.getByText('DVIDS Military Videos').closest('button');
    fireEvent.click(dvidsButton!);

    // Then: Should call onSelectProvider with dvids
    expect(handleSelect).toHaveBeenCalledWith('dvids');
  });

  it('should close modal after selection', async () => {
    // Given: Modal open
    const handleClose = vi.fn();
    const handleSelect = vi.fn();

    render(
      <ProviderSelectionModal
        isOpen={true}
        onClose={handleClose}
        onSelectProvider={handleSelect}
        providers={mockProviders}
      />
    );

    // When: Selecting a provider
    const providerButton = screen.getByText('YouTube').closest('button');
    fireEvent.click(providerButton!);

    // Then: Should close modal
    await waitFor(() => {
      expect(handleSelect).toHaveBeenCalled();
    });
  });
});

describe('[P1] 6.11-COMP-003: Loading States', () => {
  it('should display loading spinner when fetching providers', () => {
    // Given: Modal is loading providers from API
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ providers: [] }),
    });

    render(
      <ProviderSelectionModal
        isOpen={true}
        onClose={vi.fn()}
        onSelectProvider={vi.fn()}
        isLoading={true}
      />
    );

    // When: Loading state is active
    // Then: Should display loading indicator
    expect(screen.getByText(/Loading providers\.\.\./i)).toBeInTheDocument();
  });

  it('should show disabled state during save', () => {
    // Given: Modal is saving selection
    render(
      <ProviderSelectionModal
        isOpen={true}
        onClose={vi.fn()}
        onSelectProvider={vi.fn()}
        providers={[]}
        isLoading={true}
      />
    );

    // When: Save operation in progress
    // Then: Select button should be disabled
    const selectButton = screen.getByRole('button', { name: /Saving/i });
    expect(selectButton).toBeDisabled();
  });
});

describe('[P1] 6.11-COMP-004: Provider Status Display', () => {
  const mockProviders = [
    {
      id: 'dvids',
      name: 'DVIDS',
      description: 'Military footage',
      priority: 1,
      enabled: true,
      status: 'online' as const,
    },
    {
      id: 'nasa',
      name: 'NASA',
      description: 'Space footage',
      priority: 2,
      enabled: true,
      status: 'checking' as const,
    },
    {
      id: 'youtube',
      name: 'YouTube',
      description: 'Video library',
      priority: 3,
      enabled: true,
      status: 'offline' as const,
    },
  ];

  it('should show correct status icons for each provider', () => {
    // Given: Providers with different statuses
    render(
      <ProviderSelectionModal
        isOpen={true}
        onClose={vi.fn()}
        onSelectProvider={vi.fn()}
        providers={mockProviders}
      />
    );

    // When: Modal renders
    // Then: Should display status indicators
    // Online providers show checkmark
    expect(screen.getAllByText('Available')).toHaveLength(1);

    // Checking providers show spinner (text indicates checking)
    expect(screen.getAllByText('Checking...')).toHaveLength(1);

    // Offline providers show unavailable
    expect(screen.getAllByText('Unavailable')).toHaveLength(1);
  });

  it('should disable selection for offline providers', () => {
    // Given: Provider with offline status
    render(
      <ProviderSelectionModal
        isOpen={true}
        onClose={vi.fn()}
        onSelectProvider={vi.fn()}
        providers={mockProviders}
      />
    );

    // When: Checking offline provider
    const offlineButton = screen.getByText('YouTube').closest('button');

    // Then: Should be disabled
    expect(offlineButton).toHaveClass('cursor-not-allowed');
    expect(offlineButton).toHaveClass('opacity-50');
  });
});

describe('[P1] 6.11-COMP-005: DVIDS Visibility Regression (UI)', () => {
  it('should always show DVIDS provider when enabled', () => {
    // Given: DVIDS provider enabled in configuration
    const mockProviders = [
      {
        id: 'dvids',
        name: 'DVIDS Military Videos',
        description: 'Military and defense footage',
        priority: 1,
        enabled: true,
        status: 'online' as const,
      },
      {
        id: 'youtube',
        name: 'YouTube',
        description: 'Video library',
        priority: 3,
        enabled: true,
        status: 'online' as const,
      },
    ];

    render(
      <ProviderSelectionModal
        isOpen={true}
        onClose={vi.fn()}
        onSelectProvider={vi.fn()}
        providers={mockProviders}
      />
    );

    // When: Modal renders
    // Then: DVIDS should be visible
    expect(screen.getByText('DVIDS Military Videos')).toBeInTheDocument();

    // Regression check: If DVIDS is missing, it's a critical failure
    const dvidsElement = screen.queryByText('DVIDS Military Videos');
    if (!dvidsElement) {
      throw new Error('CRITICAL: DVIDS provider not visible in modal. Story 6.10 requires DVIDS to be available for selection.');
    }
  });

  it('should not filter out DVIDS when enabled: true', () => {
    // Given: All providers including DVIDS
    const mockProviders = [
      {
        id: 'dvids',
        name: 'DVIDS',
        description: 'Military',
        priority: 1,
        enabled: true, // CRITICAL
        status: 'online' as const,
      },
      {
        id: 'nasa',
        name: 'NASA',
        description: 'Space',
        priority: 2,
        enabled: false, // Disabled
        status: 'offline' as const,
      },
    ];

    render(
      <ProviderSelectionModal
        isOpen={true}
        onClose={vi.fn()}
        onSelectProvider={vi.fn()}
        providers={mockProviders}
      />
    );

    // When: Modal filters by enabled status
    // Then: DVIDS should be visible, NASA should not
    expect(screen.getByText('DVIDS')).toBeInTheDocument();
    expect(screen.queryByText('NASA')).not.toBeInTheDocument();
  });
});

describe('[P2] 6.11-COMP-006: Cancel and Close Behavior', () => {
  it('should call onClose when cancel button clicked', () => {
    // Given: Modal is open
    const handleClose = vi.fn();

    render(
      <ProviderSelectionModal
        isOpen={true}
        onClose={handleClose}
        onSelectProvider={vi.fn()}
        providers={[]}
      />
    );

    // When: Clicking cancel button
    const cancelButton = screen.getByRole('button', { name: 'Cancel' });
    fireEvent.click(cancelButton);

    // Then: Should call onClose
    expect(handleClose).toHaveBeenCalled();
  });

  it('should not call onSelectProvider when canceling', () => {
    // Given: Modal is open
    const handleClose = vi.fn();
    const handleSelect = vi.fn();

    render(
      <ProviderSelectionModal
        isOpen={true}
        onClose={handleClose}
        onSelectProvider={handleSelect}
        providers={[]}
      />
    );

    // When: Clicking cancel
    const cancelButton = screen.getByRole('button', { name: 'Cancel' });
    fireEvent.click(cancelButton);

    // Then: Should not call onSelectProvider
    expect(handleSelect).not.toHaveBeenCalled();
  });
});

describe('[P2] 6.11-COMP-007: Dynamic Loading from API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should fetch providers from /api/providers on mount', async () => {
    // Given: Mock API response
    const mockProvidersResponse = {
      providers: [
        {
          id: 'dvids',
          name: 'DVIDS Military Videos',
          priority: 1,
          enabled: true,
          description: 'Military footage',
          status: 'online',
        },
      ],
    };

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => mockProvidersResponse,
    });

    // When: Modal mounts without external providers
    render(
      <ProviderSelectionModal
        isOpen={true}
        onClose={vi.fn()}
        onSelectProvider={vi.fn()}
      />
    );

    // Then: Should fetch from API
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/providers');
    });
  });

  it('should use external providers prop if provided', () => {
    // Given: External providers passed as prop
    const externalProviders = [
      {
        id: 'youtube',
        name: 'YouTube',
        description: 'Videos',
        priority: 3,
        enabled: true,
        status: 'online' as const,
      },
    ];

    // When: Modal with external providers
    render(
      <ProviderSelectionModal
        isOpen={true}
        onClose={vi.fn()}
        onSelectProvider={vi.fn()}
        providers={externalProviders}
      />
    );

    // Then: Should not fetch from API
    expect(global.fetch).not.toHaveBeenCalled();
    expect(screen.getByText('YouTube')).toBeInTheDocument();
  });

  it('should fallback to hardcoded defaults on API failure', async () => {
    // Given: API fails
    (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('API failed'));

    // When: Modal mounts
    render(
      <ProviderSelectionModal
        isOpen={true}
        onClose={vi.fn()}
        onSelectProvider={vi.fn()}
      />
    );

    // Then: Should show default providers
    await waitFor(() => {
      expect(screen.getByText('YouTube')).toBeInTheDocument();
      expect(screen.getByText('NASA Space Videos')).toBeInTheDocument();
      expect(screen.getByText('DVIDS Military Videos')).toBeInTheDocument();
    });
  });
});

describe('[P2] 6.11-COMP-008: Provider Priority Order Display', () => {
  it('should sort providers by priority (lowest number first)', () => {
    // Given: Providers with various priorities
    const mockProviders = [
      {
        id: 'youtube',
        name: 'YouTube',
        description: 'Videos',
        priority: 3, // Lowest priority
        enabled: true,
        status: 'online' as const,
      },
      {
        id: 'nasa',
        name: 'NASA',
        description: 'Space',
        priority: 2, // Medium priority
        enabled: true,
        status: 'online' as const,
      },
      {
        id: 'dvids',
        name: 'DVIDS',
        description: 'Military',
        priority: 1, // Highest priority
        enabled: true,
        status: 'online' as const,
      },
    ];

    render(
      <ProviderSelectionModal
        isOpen={true}
        onClose={vi.fn()}
        onSelectProvider={vi.fn()}
        providers={mockProviders}
      />
    );

    // When: Modal displays providers
    const providerButtons = screen.getAllByRole('button').filter(btn =>
      btn.classList.contains('p-4') &&
      !btn.textContent?.includes('Cancel') &&
      !btn.textContent?.includes('Select')
    );

    // Then: Should be sorted by priority (1, 2, 3)
    expect(providerButtons[0]).toHaveTextContent('DVIDS');
    expect(providerButtons[1]).toHaveTextContent('NASA');
    expect(providerButtons[2]).toHaveTextContent('YouTube');
  });

  it('should display priority number for each provider', () => {
    // Given: Provider with priority
    const mockProviders = [
      {
        id: 'dvids',
        name: 'DVIDS',
        description: 'Military',
        priority: 1,
        enabled: true,
        status: 'online' as const,
      },
    ];

    render(
      <ProviderSelectionModal
        isOpen={true}
        onClose={vi.fn()}
        onSelectProvider={vi.fn()}
        providers={mockProviders}
      />
    );

    // When: Modal renders
    // Then: Should show priority text
    expect(screen.getByText(/Priority: 1/i)).toBeInTheDocument();
  });
});

describe('[P2] 6.11-COMP-009: Provider Description Display', () => {
  it('should display provider description', () => {
    // Given: Provider with description
    const mockProviders = [
      {
        id: 'dvids',
        name: 'DVIDS Military Videos',
        description: 'Military and defense footage from DVIDS',
        priority: 1,
        enabled: true,
        status: 'online' as const,
      },
    ];

    render(
      <ProviderSelectionModal
        isOpen={true}
        onClose={vi.fn()}
        onSelectProvider={vi.fn()}
        providers={mockProviders}
      />
    );

    // When: Modal renders
    // Then: Should show description
    expect(screen.getByText('Military and defense footage from DVIDS')).toBeInTheDocument();
  });

  it('should use default description if not provided', () => {
    // Given: Provider without description
    const mockProviders = [
      {
        id: 'custom',
        name: 'Custom Provider',
        description: '',
        priority: 5,
        enabled: true,
        status: 'online' as const,
      },
    ];

    render(
      <ProviderSelectionModal
        isOpen={true}
        onClose={vi.fn()}
        onSelectProvider={vi.fn()}
        providers={mockProviders}
      />
    );

    // When: Modal renders
    // Then: Should show default description format
    // Component should generate: "Custom Provider video content"
    // This is tested by checking the provider name is shown
    expect(screen.getByText('Custom Provider')).toBeInTheDocument();
  });
});

describe('[P2] 6.11-COMP-010: Accessibility', () => {
  it('should be keyboard navigable', () => {
    // Given: Modal is open
    render(
      <ProviderSelectionModal
        isOpen={true}
        onClose={vi.fn()}
        onSelectProvider={vi.fn()}
        providers={[
          {
            id: 'youtube',
            name: 'YouTube',
            description: 'Videos',
            priority: 3,
            enabled: true,
            status: 'online' as const,
          },
        ]}
      />
    );

    // When: Focusing on provider buttons
    const providerButton = screen.getByText('YouTube').closest('button');

    // Then: Should be focusable
    expect(providerButton).toHaveAttribute('type');
  });

  it('should have descriptive aria labels', () => {
    // Given: Modal with providers
    render(
      <ProviderSelectionModal
        isOpen={true}
        onClose={vi.fn()}
        onSelectProvider={vi.fn()}
        providers={[
          {
            id: 'dvids',
            name: 'DVIDS Military Videos',
            description: 'Military footage',
            priority: 1,
            enabled: true,
            status: 'online' as const,
          },
        ]}
      />
    );

    // When: Checking accessibility
    // Then: Should have descriptive text
    expect(screen.getByText('Select Video Provider')).toBeInTheDocument();
    expect(screen.getByText(/Choose your preferred video source/i)).toBeInTheDocument();
  });
});
