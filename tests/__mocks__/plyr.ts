/**
 * Mock for Plyr video player library
 * Used in test environments to avoid module import issues
 */

import { vi } from 'vitest';

class PlyrMock {
  public paused: boolean = true;
  public currentTime: number = 0;
  public duration: number = 120;
  public volume: number = 1;
  public muted: boolean = false;
  public source: any = null;
  public elements: { container: HTMLElement | null } = { container: null };

  constructor(element: HTMLElement, options?: any) {
    this.elements.container = element;
  }

  play = vi.fn().mockResolvedValue(undefined);
  pause = vi.fn();
  togglePlay = vi.fn(() => {
    this.paused = !this.paused;
    if (!this.paused) {
      return this.play();
    }
    this.pause();
  });

  stop = vi.fn();
  restart = vi.fn();
  rewind = vi.fn();
  forward = vi.fn();

  destroy = vi.fn(() => {
    this.elements.container = null;
  });

  on = vi.fn((event: string, callback: Function) => {
    // Simulate 'ready' event immediately
    if (event === 'ready') {
      setTimeout(() => callback(), 0);
    }
  });

  off = vi.fn();

  increaseVolume = vi.fn();
  decreaseVolume = vi.fn();
  toggleMute = vi.fn();
  toggleCaptions = vi.fn();
  toggleFullscreen = vi.fn();
  togglePIP = vi.fn();
  toggleControls = vi.fn();

  fullscreen = {
    active: false,
    enabled: true,
    toggle: vi.fn(),
    enter: vi.fn(),
    exit: vi.fn(),
  };
}

export default PlyrMock;
export { PlyrMock as Plyr };