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

describe('VoiceCard Component', () => {
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

  describe('Rendering', () => {
    it('should render voice name', () => {
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

    it('should render voice metadata (gender, accent, tone)', () => {
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

    it('should render preview button', () => {
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

  describe('Selection State', () => {
    it('should apply selected styling when selected=true', () => {
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

    it('should show check icon when selected', () => {
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

    it('should not show check icon when not selected', () => {
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

  describe('Click Handlers', () => {
    it('should call onSelect when card is clicked', () => {
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

    it('should call onPreview when preview button is clicked', () => {
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

    it('should not call onSelect when preview button is clicked', () => {
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

  describe('Accessibility', () => {
    it('should have role="button" on card', () => {
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

    it('should have aria-label with voice name', () => {
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

    it('should have aria-selected attribute', () => {
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

    it('should have tabIndex for keyboard navigation', () => {
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

  describe('Keyboard Navigation', () => {
    it('should call onSelect when Enter key is pressed', () => {
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

    it('should call onSelect when Space key is pressed', () => {
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

    it('should not call onSelect for other keys', () => {
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

  describe('Preview Button Accessibility', () => {
    it('should have aria-label on preview button', () => {
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
