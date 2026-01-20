/**
 * Story 6.7: Channel Intelligence UI - Dashboard E2E Tests
 *
 * ATDD: Failing tests (RED phase) for dashboard functionality.
 * Tests cover AC-6.7.4, AC-6.7.5, AC-6.7.6, AC-6.7.7, AC-6.7.8
 *
 * @see docs/stories/stories-epic-6/story-6.7.md
 */

import { test, expect } from '@playwright/test';

test.describe('Channel Intelligence Dashboard', () => {
  // Setup: Navigate to configured Channel Intelligence page
  test.beforeEach(async ({ page }) => {
    // TODO: Seed database with RAG config so wizard doesn't show
    // This would use API seeding in real implementation
    await page.goto('/settings/channel-intelligence');
  });

  test.describe('AC-6.7.4: Competitor Channel Management', () => {
    test('6.7-E2E-010: should add competitor channel with validation', async ({ page }) => {
      // GIVEN: User has completed initial RAG setup

      // WHEN: User enters competitor channel URL in the add form
      await page.getByTestId('add-competitor-input').fill('https://youtube.com/@CompetitorChannel');

      // AND: Clicks "Add Competitor"
      await page.getByTestId('add-competitor-btn').click();

      // THEN: System should validate the channel (loading state)
      await expect(page.getByTestId('competitor-validation-loading')).toBeVisible();

      // AND: Add it to competitor list
      await expect(page.getByTestId('competitor-channel-card')).toHaveCount(1, { timeout: 10000 });
    });

    test('6.7-E2E-011: should enforce 5-channel limit with message', async ({ page }) => {
      // GIVEN: User already has 5 competitor channels
      // (Test assumes seeded data with 5 competitors)

      // WHEN: User tries to add a 6th competitor
      await page.getByTestId('add-competitor-input').fill('https://youtube.com/@SixthChannel');
      await page.getByTestId('add-competitor-btn').click();

      // THEN: System should display limit message
      await expect(page.getByTestId('competitor-limit-message')).toBeVisible();
      await expect(page.getByTestId('competitor-limit-message')).toContainText('Maximum 5 competitor channels');

      // AND: Channel should not be added
      await expect(page.getByTestId('competitor-channel-card')).toHaveCount(5);
    });

    test('6.7-E2E-012: should remove competitor from list', async ({ page }) => {
      // GIVEN: User has at least one competitor channel
      await expect(page.getByTestId('competitor-channel-card')).toHaveCount(1);

      // WHEN: User clicks remove on a competitor
      await page.getByTestId('competitor-channel-card').first().getByTestId('remove-competitor-btn').click();

      // THEN: Competitor should be removed from list
      await expect(page.getByTestId('competitor-channel-card')).toHaveCount(0);
    });

    test('6.7-E2E-019: should trigger sync job when adding competitor', async ({ page }) => {
      // GIVEN: User has completed initial setup

      // WHEN: User adds a competitor channel
      await page.getByTestId('add-competitor-input').fill('https://youtube.com/@NewCompetitor');
      await page.getByTestId('add-competitor-btn').click();

      // AND: Channel is validated and added
      await expect(page.getByTestId('competitor-channel-card')).toHaveCount(1, { timeout: 10000 });

      // THEN: Sync job should be triggered (status shows syncing)
      const competitorCard = page.getByTestId('competitor-channel-card').first();
      await expect(competitorCard.getByTestId('competitor-sync-status')).toContainText(/syncing|pending/i);
    });
  });

  test.describe('AC-6.7.5: Sync Status Display', () => {
    test('6.7-E2E-007: should display sync status with last sync time and counts', async ({ page }) => {
      // GIVEN: RAG is configured for a project

      // WHEN: User views the Channel Intelligence page
      // (Already on page from beforeEach)

      // THEN: Sync status should display "Last synced: X hours ago"
      await expect(page.getByTestId('sync-status')).toBeVisible();
      await expect(page.getByTestId('last-sync-time')).toContainText(/Last synced:/);

      // AND: Show "Y videos indexed | Z news articles"
      await expect(page.getByTestId('videos-indexed-count')).toBeVisible();
      await expect(page.getByTestId('news-articles-count')).toBeVisible();
    });

    test('6.7-E2E-020: should update sync status when sync completes', async ({ page }) => {
      // GIVEN: User is viewing Channel Intelligence page

      // WHEN: A sync completes (trigger manual sync and wait)
      await page.getByTestId('sync-now-btn').click();

      // Wait for sync to complete
      await expect(page.getByTestId('sync-progress')).toBeVisible();
      await expect(page.getByTestId('sync-progress')).not.toBeVisible({ timeout: 60000 });

      // THEN: Sync status should update with new timestamp
      await expect(page.getByTestId('last-sync-time')).toContainText(/just now|seconds ago/i);
    });

    test('6.7-E2E-021: should display actionable error messages on sync failure', async ({ page }) => {
      // GIVEN: A sync job has failed (mock error condition)
      // This test requires mocking a failed sync state

      // WHEN: User views the Channel Intelligence page
      // (Page already loaded)

      // THEN: Sync status should display error message
      await expect(page.getByTestId('sync-error-message')).toBeVisible();

      // AND: Provide actionable troubleshooting steps
      await expect(page.getByTestId('sync-error-actions')).toBeVisible();
    });
  });

  test.describe('AC-6.7.6: Manual Sync Trigger', () => {
    test('6.7-E2E-013: should show loading state during manual sync', async ({ page }) => {
      // GIVEN: User is on Channel Intelligence page

      // WHEN: User clicks "Sync Now" button
      await page.getByTestId('sync-now-btn').click();

      // THEN: Button should show loading state
      await expect(page.getByTestId('sync-now-btn')).toHaveAttribute('data-loading', 'true');
      await expect(page.getByTestId('sync-now-btn')).toBeDisabled();

      // AND: Sync progress should be displayed
      await expect(page.getByTestId('sync-progress')).toBeVisible();
    });
  });

  test.describe('AC-6.7.7: RAG Health Status', () => {
    test('6.7-E2E-014: should display ChromaDB connection status', async ({ page }) => {
      // GIVEN: User is on Channel Intelligence page

      // WHEN: User expands RAG Health section
      await page.getByTestId('rag-health-expand').click();

      // THEN: ChromaDB status should show "Connected"
      await expect(page.getByTestId('chromadb-status')).toBeVisible();
      await expect(page.getByTestId('chromadb-status')).toContainText(/connected/i);
    });

    test('6.7-E2E-015: should show collection sizes', async ({ page }) => {
      // GIVEN: User is on Channel Intelligence page

      // WHEN: User expands RAG Health section
      await page.getByTestId('rag-health-expand').click();

      // THEN: Collection sizes should be displayed
      await expect(page.getByTestId('collection-videos-count')).toBeVisible();
      await expect(page.getByTestId('collection-news-count')).toBeVisible();
      await expect(page.getByTestId('collection-trends-count')).toBeVisible();
    });

    test('6.7-E2E-022: should show troubleshooting steps when disconnected', async ({ page }) => {
      // GIVEN: ChromaDB is not running (mock disconnected state)

      // WHEN: User expands RAG Health section
      await page.getByTestId('rag-health-expand').click();

      // THEN: Status should show "Disconnected"
      await expect(page.getByTestId('chromadb-status')).toContainText(/disconnected/i);

      // AND: Troubleshooting steps should be visible
      await expect(page.getByTestId('chromadb-troubleshooting')).toBeVisible();
    });
  });

  test.describe('AC-6.7.8: Topic Suggestions', () => {
    test('6.7-E2E-016: should generate and display topic suggestions', async ({ page }) => {
      // GIVEN: User has indexed content via RAG

      // WHEN: User clicks "Get Topic Suggestions"
      await page.getByTestId('get-topics-btn').click();

      // THEN: Loading state should appear
      await expect(page.getByTestId('topics-loading')).toBeVisible();

      // AND: 3-5 topic cards should be displayed
      await expect(page.getByTestId('topic-card')).toHaveCount({ min: 3, max: 5 }, { timeout: 30000 });

      // AND: Topics show descriptions
      const firstTopic = page.getByTestId('topic-card').first();
      await expect(firstTopic.getByTestId('topic-title')).toBeVisible();
      await expect(firstTopic.getByTestId('topic-description')).toBeVisible();
    });

    test('6.7-E2E-017: should navigate to new project when clicking topic', async ({ page }) => {
      // GIVEN: Topic suggestions are displayed
      await page.getByTestId('get-topics-btn').click();
      await expect(page.getByTestId('topic-card')).toHaveCount({ min: 3, max: 5 }, { timeout: 30000 });

      // WHEN: User clicks on a topic card
      const firstTopic = page.getByTestId('topic-card').first();
      const topicTitle = await firstTopic.getByTestId('topic-title').textContent();
      await firstTopic.getByTestId('create-project-btn').click();

      // THEN: Should navigate to new project creation
      await expect(page).toHaveURL(/\/projects\/new/);

      // AND: Topic field should be pre-populated
      await expect(page.getByTestId('topic-input')).toHaveValue(topicTitle || '');
    });

    test('6.7-E2E-023: should show loading state during topic generation', async ({ page }) => {
      // GIVEN: User is on Channel Intelligence page

      // WHEN: User clicks "Get Topic Suggestions"
      await page.getByTestId('get-topics-btn').click();

      // THEN: Loading spinner should be visible
      await expect(page.getByTestId('topics-loading')).toBeVisible();

      // AND: Button should be disabled
      await expect(page.getByTestId('get-topics-btn')).toBeDisabled();
    });
  });

  test.describe('Responsiveness and Accessibility', () => {
    test('6.7-E2E-024: should display correctly on tablet', async ({ page }) => {
      // Set tablet viewport
      await page.setViewportSize({ width: 768, height: 1024 });

      // GIVEN: User is on Channel Intelligence page
      await page.goto('/settings/channel-intelligence');

      // THEN: Page should be responsive
      await expect(page.getByTestId('channel-intelligence-page')).toBeVisible();

      // AND: All key elements should be accessible
      await expect(page.getByTestId('sync-status')).toBeVisible();
      await expect(page.getByTestId('sync-now-btn')).toBeVisible();
    });

    test('6.7-E2E-025: should support keyboard navigation through wizard', async ({ page }) => {
      // GIVEN: Setup wizard is displayed
      await page.goto('/settings/channel-intelligence');
      await expect(page.getByTestId('setup-wizard')).toBeVisible();

      // WHEN: User navigates with keyboard
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');

      // THEN: Focus should move through mode selection cards
      const establishedCard = page.getByTestId('mode-established-channel');
      const coldStartCard = page.getByTestId('mode-cold-start');

      // One of these should be focused
      const isFocusable = await establishedCard.evaluate(el => el.tabIndex >= 0) ||
                          await coldStartCard.evaluate(el => el.tabIndex >= 0);
      expect(isFocusable).toBe(true);

      // AND: Enter key should select
      await page.keyboard.press('Enter');
    });
  });
});
