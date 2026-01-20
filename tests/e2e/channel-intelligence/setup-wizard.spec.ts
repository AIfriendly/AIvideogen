/**
 * Story 6.7: Channel Intelligence UI - Setup Wizard E2E Tests
 *
 * ATDD: Failing tests (RED phase) for setup wizard functionality.
 * Tests cover AC-6.7.1, AC-6.7.2, AC-6.7.3
 *
 * @see docs/stories/stories-epic-6/story-6.7.md
 */

import { test, expect } from '@playwright/test';

test.describe('Channel Intelligence Setup Wizard', () => {
  test.describe('AC-6.7.1: Setup Wizard Mode Selection', () => {
    test('6.7-E2E-001: should display setup wizard when RAG not configured', async ({ page }) => {
      // GIVEN: User has not configured RAG (rag_enabled = false/null)
      // Need to ensure no RAG config exists for test project

      // WHEN: User navigates to /settings/channel-intelligence
      await page.goto('/settings/channel-intelligence');

      // THEN: Setup wizard should be displayed
      await expect(page.getByTestId('setup-wizard')).toBeVisible();

      // AND: Two mode options should be visible
      await expect(page.getByTestId('mode-established-channel')).toBeVisible();
      await expect(page.getByTestId('mode-cold-start')).toBeVisible();

      // AND: Each mode shows a brief description
      await expect(page.getByTestId('mode-established-channel')).toContainText('Established Channel');
      await expect(page.getByTestId('mode-cold-start')).toContainText('Cold Start');
    });

    test('6.7-E2E-002: should allow selecting a mode and show descriptions', async ({ page }) => {
      // GIVEN: Setup wizard is displayed
      await page.goto('/settings/channel-intelligence');
      await expect(page.getByTestId('setup-wizard')).toBeVisible();

      // WHEN: User clicks on "Established Channel" mode card
      await page.getByTestId('mode-established-channel').click();

      // THEN: Card should show selected state
      await expect(page.getByTestId('mode-established-channel')).toHaveAttribute('data-selected', 'true');

      // AND: Continue button should be enabled
      await expect(page.getByTestId('wizard-continue-btn')).toBeEnabled();
    });
  });

  test.describe('AC-6.7.2: Established Channel Setup', () => {
    test('6.7-E2E-003: should validate YouTube channel URL/ID', async ({ page }) => {
      // GIVEN: User selected "Established Channel" mode
      await page.goto('/settings/channel-intelligence');
      await page.getByTestId('mode-established-channel').click();
      await page.getByTestId('wizard-continue-btn').click();

      // WHEN: User enters a valid YouTube channel URL
      await page.getByTestId('channel-url-input').fill('https://youtube.com/c/TechChannel');

      // AND: Clicks validate button
      await page.getByTestId('validate-channel-btn').click();

      // THEN: System should show validation loading state
      await expect(page.getByTestId('validation-loading')).toBeVisible();

      // AND: On success, validation status shows success
      await expect(page.getByTestId('validation-success')).toBeVisible({ timeout: 10000 });
    });

    test('6.7-E2E-004: should display channel preview after validation', async ({ page }) => {
      // GIVEN: User selected "Established Channel" mode
      await page.goto('/settings/channel-intelligence');
      await page.getByTestId('mode-established-channel').click();
      await page.getByTestId('wizard-continue-btn').click();

      // WHEN: User enters and validates a YouTube channel
      await page.getByTestId('channel-url-input').fill('https://youtube.com/@TestChannel');
      await page.getByTestId('validate-channel-btn').click();
      await expect(page.getByTestId('validation-success')).toBeVisible({ timeout: 10000 });

      // THEN: Channel preview should display name
      await expect(page.getByTestId('channel-preview-name')).toBeVisible();

      // AND: Channel thumbnail should be visible
      await expect(page.getByTestId('channel-preview-thumbnail')).toBeVisible();

      // AND: Video count should be displayed
      await expect(page.getByTestId('channel-preview-video-count')).toBeVisible();
    });

    test('6.7-E2E-005: should start initial sync on confirmation', async ({ page }) => {
      // GIVEN: User has validated their YouTube channel
      await page.goto('/settings/channel-intelligence');
      await page.getByTestId('mode-established-channel').click();
      await page.getByTestId('wizard-continue-btn').click();
      await page.getByTestId('channel-url-input').fill('https://youtube.com/@TestChannel');
      await page.getByTestId('validate-channel-btn').click();
      await expect(page.getByTestId('validation-success')).toBeVisible({ timeout: 10000 });

      // WHEN: User clicks "Confirm & Start Sync"
      await page.getByTestId('confirm-setup-btn').click();

      // THEN: RAG config should be saved (wizard disappears)
      await expect(page.getByTestId('setup-wizard')).not.toBeVisible({ timeout: 5000 });

      // AND: Sync progress should be displayed
      await expect(page.getByTestId('sync-progress')).toBeVisible();

      // AND: Dashboard should show sync status
      await expect(page.getByTestId('sync-status')).toBeVisible();
    });

    test('6.7-E2E-018: should show progress during initial sync', async ({ page }) => {
      // GIVEN: User completed Established Channel setup
      await page.goto('/settings/channel-intelligence');
      await page.getByTestId('mode-established-channel').click();
      await page.getByTestId('wizard-continue-btn').click();
      await page.getByTestId('channel-url-input').fill('https://youtube.com/@TestChannel');
      await page.getByTestId('validate-channel-btn').click();
      await expect(page.getByTestId('validation-success')).toBeVisible({ timeout: 10000 });
      await page.getByTestId('confirm-setup-btn').click();

      // WHEN: Initial sync is running
      // THEN: Progress indicator should show percentage
      await expect(page.getByTestId('sync-progress-bar')).toBeVisible();

      // AND: Current status message should be displayed
      await expect(page.getByTestId('sync-progress-message')).toBeVisible();
    });
  });

  test.describe('AC-6.7.3: Cold Start Setup', () => {
    test('6.7-E2E-006: should show suggested channels when niche selected', async ({ page }) => {
      // GIVEN: User selected "Cold Start" mode
      await page.goto('/settings/channel-intelligence');
      await page.getByTestId('mode-cold-start').click();
      await page.getByTestId('wizard-continue-btn').click();

      // WHEN: User selects "Military & Defense" from niche dropdown
      await page.getByTestId('niche-select').selectOption('military');

      // THEN: Top 5 suggested channels should be displayed
      await expect(page.getByTestId('suggested-channels')).toBeVisible();
      const channelCards = page.getByTestId('suggested-channel-card');
      await expect(channelCards).toHaveCount(5);

      // AND: Each channel shows name and thumbnail
      const firstChannel = channelCards.first();
      await expect(firstChannel.getByTestId('channel-name')).toBeVisible();
      await expect(firstChannel.getByTestId('channel-thumbnail')).toBeVisible();
    });

    test('6.7-E2E-008: should allow modifying suggested channel selection', async ({ page }) => {
      // GIVEN: User sees suggested channels for niche
      await page.goto('/settings/channel-intelligence');
      await page.getByTestId('mode-cold-start').click();
      await page.getByTestId('wizard-continue-btn').click();
      await page.getByTestId('niche-select').selectOption('military');
      await expect(page.getByTestId('suggested-channels')).toBeVisible();

      // WHEN: User removes one suggested channel
      const firstChannel = page.getByTestId('suggested-channel-card').first();
      await firstChannel.getByTestId('remove-channel-btn').click();

      // THEN: Channel list should update (4 channels)
      await expect(page.getByTestId('suggested-channel-card')).toHaveCount(4);

      // WHEN: User adds a custom channel URL
      await page.getByTestId('add-custom-channel-input').fill('https://youtube.com/@CustomChannel');
      await page.getByTestId('add-custom-channel-btn').click();

      // THEN: Channel list should have 5 channels again
      await expect(page.getByTestId('suggested-channel-card')).toHaveCount(5);
    });

    test('6.7-E2E-009: should start sync for all selected channels on confirmation', async ({ page }) => {
      // GIVEN: User has selected channels in Cold Start mode
      await page.goto('/settings/channel-intelligence');
      await page.getByTestId('mode-cold-start').click();
      await page.getByTestId('wizard-continue-btn').click();
      await page.getByTestId('niche-select').selectOption('military');
      await expect(page.getByTestId('suggested-channels')).toBeVisible();

      // WHEN: User clicks confirm
      await page.getByTestId('confirm-setup-btn').click();

      // THEN: Wizard should close
      await expect(page.getByTestId('setup-wizard')).not.toBeVisible({ timeout: 5000 });

      // AND: Sync status should show syncing multiple channels
      await expect(page.getByTestId('sync-status')).toBeVisible();
      await expect(page.getByTestId('sync-progress')).toBeVisible();
    });
  });
});
