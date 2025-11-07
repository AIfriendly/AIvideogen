/**
 * Unit Tests for VoiceCard Component - Story 2.3
 *
 * Tests the VoiceCard UI component:
 * - Rendering with voice metadata
 * - Selection state visual styling
 * - Preview button callback
 * - Click handler triggers selection
 * - Accessibility (ARIA labels, keyboard navigation)
 *
 * GitHub Repository: https://github.com/bmad-dev/BMAD-METHOD
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { VoiceCard } from '@/components/ui/VoiceCard';
import type { VoiceProfile } from '@/lib/tts/provider';

describe('[P3] VoiceCard Component', () => {
  const mockVoice: VoiceProfile = {
    id: 'sarah',
    name: 'Sarah - American Female',
    gender: 'female',
    accent: 'american',
    tone: 'warm',
    previewUrl: '/audio/previews/sarah.mp3',
    modelId: 'af_sky',
    mvpVoice: true,
  };

  const mockOnSelect = vi.fn();
  const mockOnPreview = vi.fn();

  describe('[P3] Rendering', () => {
    it('[2.3-UNIT-001] should render voice name', () => {
      render(
        <VoiceCard
          voice={mockVoice}
          selected={false}
          onSelect={mockOnSelect}
          onPreview={mockOnPreview}
        />
      );

      expect(screen.getByText('Sarah - American Female')).toBeInTheDocument();
    });

    it('[2.3-UNIT-002] should render voice metadata (gender, accent, tone)', () => {
      render(
        <VoiceCard
          voice={mockVoice}
          selected={false}
          onSelect={mockOnSelect}
          onPreview={mockOnPreview}
        />
      );

      expect(screen.getByText('female')).toBeInTheDocument();
      expect(screen.getByText('american')).toBeInTheDocument();
      expect(screen.getByText('warm')).toBeInTheDocument();
    });

    it('[2.3-UNIT-003] should render preview button', () => {
      render(
        <VoiceCard
          voice={mockVoice}
          selected={false}
          onSelect={mockOnSelect}
          onPreview={mockOnPreview}
        />
      );

      const previewButton = screen.getByText('Preview Voice');
      expect(previewButton).toBeInTheDocument();
    });
  });

  describe('[P2] Selection State', () => {
    it('[2.3-UNIT-004] should apply selected styling when selected=true', () => {
      const { container } = render(
        <VoiceCard
          voice={mockVoice}
          selected={true}
          onSelect={mockOnSelect}
          onPreview={mockOnPreview}
        />
      );

      const card = container.firstChild as HTMLElement;
      expect(card).toHaveAttribute('aria-selected', 'true');
    });

    it('[2.3-UNIT-005] should show check icon when selected', () => {
      render(
        <VoiceCard
          voice={mockVoice}
          selected={true}
          onSelect={mockOnSelect}
          onPreview={mockOnPreview}
        />
      );

      // Check icon should be visible (lucide-react Check component)
      const card = screen.getByRole('button', { name: /Select Sarah/i });
      expect(card).toBeInTheDocument();
    });

    it('[2.3-UNIT-006] should not show check icon when not selected', () => {
      render(
        <VoiceCard
          voice={mockVoice}
          selected={false}
          onSelect={mockOnSelect}
          onPreview={mockOnPreview}
        />
      );

      const card = screen.getByRole('button', { name: /Select Sarah/i });
      expect(card).toHaveAttribute('aria-selected', 'false');
    });
  });

  describe('[P1] Click Handlers', () => {
    it('[2.3-UNIT-007] should call onSelect when card is clicked', () => {
      render(
        <VoiceCard
          voice={mockVoice}
          selected={false}
          onSelect={mockOnSelect}
          onPreview={mockOnPreview}
        />
      );

      const card = screen.getByRole('button', { name: /Select Sarah/i });
      fireEvent.click(card);

      expect(mockOnSelect).toHaveBeenCalledWith('sarah');
      expect(mockOnSelect).toHaveBeenCalledTimes(1);
    });

    it('[2.3-UNIT-008] should call onPreview when preview button is clicked', () => {
      render(
        <VoiceCard
          voice={mockVoice}
          selected={false}
          onSelect={mockOnSelect}
          onPreview={mockOnPreview}
        />
      );

      const previewButton = screen.getByText('Preview Voice');
      fireEvent.click(previewButton);

      expect(mockOnPreview).toHaveBeenCalledWith('sarah');
      expect(mockOnPreview).toHaveBeenCalledTimes(1);
    });

    it('[2.3-UNIT-009] should not call onSelect when preview button is clicked', () => {
      render(
        <VoiceCard
          voice={mockVoice}
          selected={false}
          onSelect={mockOnSelect}
          onPreview={mockOnPreview}
        />
      );

      const previewButton = screen.getByText('Preview Voice');
      fireEvent.click(previewButton);

      expect(mockOnSelect).not.toHaveBeenCalled();
    });
  });

  describe('[P2] Accessibility', () => {
    it('[2.3-UNIT-010] should have role="button" on card', () => {
      render(
        <VoiceCard
          voice={mockVoice}
          selected={false}
          onSelect={mockOnSelect}
          onPreview={mockOnPreview}
        />
      );

      const card = screen.getByRole('button', { name: /Select Sarah/i });
      expect(card).toBeInTheDocument();
    });

    it('[2.3-UNIT-011] should have aria-label with voice name', () => {
      render(
        <VoiceCard
          voice={mockVoice}
          selected={false}
          onSelect={mockOnSelect}
          onPreview={mockOnPreview}
        />
      );

      const card = screen.getByLabelText('Select Sarah - American Female');
      expect(card).toBeInTheDocument();
    });

    it('[2.3-UNIT-012] should have aria-selected attribute', () => {
      const { container } = render(
        <VoiceCard
          voice={mockVoice}
          selected={true}
          onSelect={mockOnSelect}
          onPreview={mockOnPreview}
        />
      );

      const card = container.firstChild as HTMLElement;
      expect(card).toHaveAttribute('aria-selected', 'true');
    });

    it('[2.3-UNIT-013] should have tabIndex for keyboard navigation', () => {
      const { container } = render(
        <VoiceCard
          voice={mockVoice}
          selected={false}
          onSelect={mockOnSelect}
          onPreview={mockOnPreview}
        />
      );

      const card = container.firstChild as HTMLElement;
      expect(card).toHaveAttribute('tabIndex', '0');
    });
  });

  describe('[P2] Keyboard Navigation', () => {
    it('[2.3-UNIT-014] should call onSelect when Enter key is pressed', () => {
      render(
        <VoiceCard
          voice={mockVoice}
          selected={false}
          onSelect={mockOnSelect}
          onPreview={mockOnPreview}
        />
      );

      const card = screen.getByRole('button', { name: /Select Sarah/i });
      fireEvent.keyDown(card, { key: 'Enter', code: 'Enter' });

      expect(mockOnSelect).toHaveBeenCalledWith('sarah');
    });

    it('[2.3-UNIT-015] should call onSelect when Space key is pressed', () => {
      render(
        <VoiceCard
          voice={mockVoice}
          selected={false}
          onSelect={mockOnSelect}
          onPreview={mockOnPreview}
        />
      );

      const card = screen.getByRole('button', { name: /Select Sarah/i });
      fireEvent.keyDown(card, { key: ' ', code: 'Space' });

      expect(mockOnSelect).toHaveBeenCalledWith('sarah');
    });

    it('[2.3-UNIT-016] should not call onSelect for other keys', () => {
      render(
        <VoiceCard
          voice={mockVoice}
          selected={false}
          onSelect={mockOnSelect}
          onPreview={mockOnPreview}
        />
      );

      const card = screen.getByRole('button', { name: /Select Sarah/i });
      fireEvent.keyDown(card, { key: 'a', code: 'KeyA' });

      expect(mockOnSelect).not.toHaveBeenCalled();
    });
  });

  describe('[P2] Preview Button Accessibility', () => {
    it('[2.3-UNIT-017] should have aria-label on preview button', () => {
      render(
        <VoiceCard
          voice={mockVoice}
          selected={false}
          onSelect={mockOnSelect}
          onPreview={mockOnPreview}
        />
      );

      const previewButton = screen.getByLabelText('Preview Sarah - American Female');
      expect(previewButton).toBeInTheDocument();
    });
  });
});
