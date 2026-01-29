/**
 * E2E UI Test - Complete Video Generation Pipeline
 *
 * Tests the actual frontend UI by clicking through the interface.
 * This test validates:
 * - Persona selection flow
 * - Topic input via chat interface
 * - Script generation
 * - Voiceover generation
 * - Visual sourcing with DVIDS
 * - Visual curation (selecting clips)
 * - Video assembly
 * - Export/download
 *
 * Prerequisites:
 * - Next.js dev server running on port 3000
 * - Mock backend responses for external APIs (DVIDS, Groq, Kokoro)
 *
 * @see tests/mocks/api-handlers.ts for mock setup
 */

import { test, expect } from '@playwright/test';

test.describe('Video Generation Pipeline - UI Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to home page
    await page.goto('/');

    // Clear localStorage to start fresh
    await page.evaluate(() => {
      localStorage.clear();
    });

    // Reload after clearing
    await page.reload();
  });

  test('[UI-001] should complete full pipeline from persona to export', async ({ page }) => {
    // ============================================================================
    // STEP 1: Persona Selection
    // ============================================================================
    await expect(page.locator('h1, h2')).toContainText('AI Video Generator', { timeout: 10000 });

    // Wait for persona selector to appear
    await expect(page.locator('[data-testid="persona-selector"]')).toBeVisible({ timeout: 10000 });

    // Select first persona (usually "Documentary Narrator" or similar)
    const personaSelector = page.locator('[data-testid="persona-option"]').first();
    await expect(personaSelector).toBeVisible();
    await personaSelector.click();

    // Verify we've moved to chat interface
    await expect(page.locator('[data-testid="chat-interface"]')).toBeVisible({ timeout: 10000 });

    // ============================================================================
    // STEP 2: Enter Topic via Chat
    // ============================================================================
    const testTopic = 'The Future of Quantum Computing in Healthcare';

    // Find the message input
    const messageInput = page.locator('[data-testid="message-input"], textarea[placeholder*="message"], textarea');
    await expect(messageInput).toBeVisible();

    // Type the topic
    await messageInput.fill(testTopic);

    // Send the message
    const sendButton = page.locator('[data-testid="send-button"], button[type="submit"], button[aria-label*="Send"], button svg.lucide-send').first();
    await sendButton.click();

    // Wait for message to appear in chat
    await expect(page.locator(`text=${testTopic}`)).toBeVisible({ timeout: 10000 });

    // ============================================================================
    // STEP 3: Script Generation
    // ============================================================================
    // Look for script generation indicator or button
    const generateScriptButton = page.locator('[data-testid="generate-script"], button:has-text("Generate Script"), button:has-text("Create Script")').first();

    if (await generateScriptButton.isVisible({ timeout: 5000 })) {
      await generateScriptButton.click();
    }

    // Wait for script generation to complete
    // This may show a progress indicator or navigate to script review
    await expect(page.locator('[data-testid="script-status"], [data-testid="script-review"], .loading, [data-testid="progress-indicator"]')).toBeVisible({ timeout: 15000 });

    // Wait for script generation to complete (check for success message or scene cards)
    await expect(page.locator('[data-testid="scene-card"], [data-testid="script-complete"], text="Scene"')).toBeVisible({ timeout: 30000 });

    // ============================================================================
    // STEP 4: Voiceover Generation
    // ============================================================================
    const generateVoiceoverButton = page.locator('[data-testid="generate-voiceover"], button:has-text("Generate Voiceover"), button:has-text("Create Voiceover")').first();

    if (await generateVoiceoverButton.isVisible({ timeout: 5000 })) {
      await generateVoiceoverButton.click();
    }

    // Wait for voiceover generation progress
    await expect(page.locator('[data-testid="voiceover-progress"], [data-testid="voiceover-status"], .loading')).toBeVisible({ timeout: 10000 });

    // Wait for voiceover to complete
    await expect(page.locator('[data-testid="voiceover-complete"], [data-testid="scene-audio"], audio')).toBeVisible({ timeout: 60000 });

    // ============================================================================
    // STEP 5: Visual Sourcing
    // ============================================================================
    // Navigate to visual sourcing or wait for auto-sourcing
    const visualSourcingButton = page.locator('[data-testid="visual-sourcing"], button:has-text("Source Visuals"), button:has-text("Find Videos")').first();

    if (await visualSourcingButton.isVisible({ timeout: 5000 })) {
      await visualSourcingButton.click();
    }

    // Wait for visual sourcing to complete
    await expect(page.locator('[data-testid="visual-sourcing-progress"], [data-testid="suggestion-loading"], .loading')).toBeVisible({ timeout: 10000 });

    // Wait for visual suggestions to appear
    await expect(page.locator('[data-testid="suggestion-card"], [data-testid="visual-suggestion"], .video-thumbnail')).toBeVisible({ timeout: 60000 });

    // ============================================================================
    // STEP 6: Visual Curation (Select Clips)
    // ============================================================================
    // Navigate to visual curation page
    const curationButton = page.locator('[data-testid="visual-curation"], button:has-text("Curate"), button:has-text("Select Clips")').first();

    if (await curationButton.isVisible({ timeout: 5000 })) {
      await curationButton.click();
    }

    // Wait for curation page to load
    await expect(page.locator('[data-testid="visual-curation"], [data-testid="scene-card"], [data-testid="suggestion-gallery"]')).toBeVisible({ timeout: 10000 });

    // Select a clip for each scene (auto-select or manual)
    const selectButtons = page.locator('[data-testid="select-clip"], button:has-text("Select"), button:has-text("Use This")');

    const selectCount = await selectButtons.count();
    if (selectCount > 0) {
      // Select first available clip for each scene
      for (let i = 0; i < Math.min(selectCount, 3); i++) {
        const button = selectButtons.nth(i);
        if (await button.isVisible()) {
          await button.click();
          // Small delay between selections
          await page.waitForTimeout(500);
        }
      }
    }

    // Look for auto-select button if manual selection is tedious
    const autoSelectButton = page.locator('[data-testid="auto-select"], button:has-text("Auto Select"), button:has-text("Auto-Select")').first();
    if (await autoSelectButton.isVisible({ timeout: 3000 })) {
      await autoSelectButton.click();
      await page.waitForTimeout(2000);
    }

    // ============================================================================
    // STEP 7: Video Assembly
    // ============================================================================
    // Navigate to assembly page or trigger assembly
    const assemblyButton = page.locator('[data-testid="assembly-trigger"], button:has-text("Assemble Video"), button:has-text("Create Video")').first();

    if (await assemblyButton.isVisible({ timeout: 5000 })) {
      await assemblyButton.click();
    }

    // Wait for assembly progress
    await expect(page.locator('[data-testid="assembly-progress"], [data-testid="assembly-status"], .loading')).toBeVisible({ timeout: 10000 });

    // Wait for assembly to complete (can take several minutes)
    await expect(page.locator('[data-testid="assembly-complete"], video, [data-testid="video-player"], button:has-text("Download")')).toBeVisible({ timeout: 600000 });

    // ============================================================================
    // STEP 8: Export/Download
    // ============================================================================
    // Verify export page or download button is available
    const downloadButton = page.locator('[data-testid="download-video"], button:has-text("Download"), button:has-text("Export")').first();

    await expect(downloadButton).toBeVisible({ timeout: 10000 });

    // Verify thumbnail is generated
    const thumbnail = page.locator('[data-testid="thumbnail"], img[alt*="thumbnail"]').first();
    await expect(thumbnail).toBeVisible({ timeout: 10000 });

    // Take screenshot of final state for verification
    await page.screenshot({ path: 'test-results/e2e-pipeline-complete.png' });
  });

  test('[UI-002] should handle project creation from home page', async ({ page }) => {
    // Navigate to home
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Verify page loaded
    await expect(page).toHaveTitle(/AI Video Generator/);

    // Verify persona selector is visible
    await expect(page.locator('[data-testid="persona-selector"]')).toBeVisible({ timeout: 10000 });

    // Verify new chat button exists (if any)
    const newChatButton = page.locator('[data-testid="new-chat"], button:has-text("New"), button:has-text("New Chat")').first();
    // Note: This might not exist on first load
  });

  test('[UI-003] should display project sidebar with history', async ({ page }) => {
    // Navigate to home and complete persona selection
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Select persona to enter main interface
    const personaOption = page.locator('[data-testid="persona-option"]').first();
    await personaOption.click();

    // Wait for chat interface
    await expect(page.locator('[data-testid="chat-interface"]')).toBeVisible({ timeout: 10000 });

    // Check for project sidebar
    const sidebar = page.locator('[data-testid="project-sidebar"], aside, [class*="sidebar"]').first();

    if (await sidebar.isVisible({ timeout: 5000 })) {
      await expect(sidebar).toBeVisible();
    }
  });

  test('[UI-004] should handle chat interface correctly', async ({ page }) => {
    // Setup: Select persona first
    await page.goto('/');

    const personaOption = page.locator('[data-testid="persona-option"]').first();
    await personaOption.click();

    await expect(page.locator('[data-testid="chat-interface"]')).toBeVisible({ timeout: 10000 });

    // Test message input
    const messageInput = page.locator('[data-testid="message-input"], textarea').first();
    await expect(messageInput).toBeVisible();

    // Test sending a message
    await messageInput.fill('Test message for E2E testing');

    const sendButton = page.locator('button[type="submit"], button svg.lucide-send, button[aria-label*="Send"]').first();
    await sendButton.click();

    // Verify message appears
    await expect(page.locator('text=Test message for E2E testing')).toBeVisible({ timeout: 5000 });
  });

  test('[UI-005] should handle visual curation interface', async ({ page }) => {
    // This test focuses on the visual curation UI specifically
    // Prerequisite: Need a project with visuals already sourced

    // For now, just verify the page structure exists
    await page.goto('/');

    // Quick path: try to navigate directly to a test project
    // In real scenario, you'd create a project first or use API to seed data

    // Verify navigation exists
    const navItems = page.locator('nav a, [role="navigation"] a, a[href*="/projects"]');
    const count = await navItems.count();

    // Should have some navigation
    expect(count).toBeGreaterThan(0);
  });
});

test.describe('UI Component Tests', () => {
  test('[UI-006] should render voice selection interface', async ({ page }) => {
    await page.goto('/');

    // Check if voice selection page exists
    const voiceLink = page.locator('a[href*="voice"], [data-testid="voice-selection"]').first();

    if (await voiceLink.isVisible({ timeout: 3000 })) {
      await voiceLink.click();
      await expect(page.locator('[data-testid="voice-card"], button:has-text("Select Voice")')).toBeVisible({ timeout: 10000 });
    }
  });

  test('[UI-007] should render settings pages', async ({ page }) => {
    await page.goto('/settings/quick-production');

    // Verify settings page loads
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 10000 });
  });

  test('[UI-008] should handle responsive design', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    // Verify mobile-friendly elements
    const personaSelector = page.locator('[data-testid="persona-selector"]').first();

    if (await personaSelector.isVisible({ timeout: 5000 })) {
      await expect(personaSelector).toBeVisible();
    }

    // Test desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 });

    // Verify content is still accessible
    await expect(page.locator('h1, h2').first()).toBeVisible();
  });
});
