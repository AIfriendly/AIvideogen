# Story 8.4: Add Connection Pooling for MCP Providers

**Epic:** 8 - DVIDS Video Provider API Integration
**Status:** done (completed during session 2026-01-25)
**Priority:** P2 (Medium - Performance optimization)
**Points:** 3
**Dependencies:** Epic 6 Story 6.9 (MCP Video Provider Client)
**Created:** 2026-01-25
**Updated:** 2026-01-25
**Developer:** TBD
**Completed:** 2026-01-25

---

## Story Description

Implement connection pooling and lifecycle management for MCP video provider servers to improve performance and resource efficiency. The current implementation spawns a new MCP server process for each request, which is inefficient. This story adds connection reuse, health checks, and proper cleanup.

**User Value:** Creators experience faster visual generation with reduced overhead from connection reuse. System resources are used more efficiently with proper connection lifecycle management.

---

## User Story

**As a** system,
**I want** to reuse MCP server connections across requests,
**So that** visual generation is faster and system resources are used efficiently.

**As a** developer,
**I want** proper connection lifecycle management with health checks,
**So that** stale connections are cleaned up and resources are not leaked.

---

## Acceptance Criteria

### AC-8.4.1: Connection Pool Implementation

**Given** multiple MCP tool calls may be made
**When** connections are needed
**Then** the system shall:
- Maintain `connections` Map to track active MCP server connections by provider ID
- Check for existing connection before spawning new server process
- Return existing connection if available (connection reuse)
- Spawn new connection only if not in `connections` map
- Store new connection in map after successful spawn
- Use Map key: provider ID (e.g., "dvids", "youtube", "nasa")

### AC-8.4.2: Connection Lifecycle Management

**Given** connections have a lifecycle
**When** managing connections
**Then** the system shall:
- Implement `ensureConnection(providerId)` function with connection reuse logic
- Implement `disconnectAll()` function to close all connections and clear map
- Add lifecycle logging for debugging: "[MCP] Connecting to dvids provider..."
- Log connection reuse: "[MCP] Reusing existing connection for dvids"
- Log disconnection: "[MCP] Disconnecting dvids provider..."
- Call `disconnectAll()` on process shutdown (SIGTERM, SIGINT signals)
- Ensure graceful shutdown (wait for connections to close before exit)

### AC-8.4.3: Connection Health Checks

**Given** connections may become stale over time
**When** reusing connections
**Then** the system shall:
- Implement health check function to detect stale connections
- Ping server with timeout (60 seconds default)
- Mark connection as unhealthy if no response within timeout
- Close and remove unhealthy connections from pool
- Spawn new connection when unhealthy connection detected
- Log health check results: "[MCP] Health check passed for dvids"
- Log health failures: "[MCP] Health check failed for dvids - reconnecting..."

### AC-8.4.4: Idle Connection Cleanup

**Given** unused connections consume resources
**When** connections are idle
**Then** the system shall:
- Track last used timestamp for each connection
- Implement idle timeout (5 minutes default)
- Close connections idle for >5 minutes automatically
- Log idle cleanup: "[MCP] Closing idle connection for nasa (last used 5m ago)"
- Remove closed connections from `connections` map
- Not close actively used connections (reset timestamp on each use)

### AC-8.4.5: Connection Statistics Tracking

**Given** monitoring connection pool health is important
**When** connections are used
**Then** the system shall:
- Track statistics: active connection count, reuse rate, failure count
- Log statistics on server shutdown: "MCP connections: 2 active, 15 reuse rate, 0 failures"
- Calculate reuse rate: `reusedCount / totalCount * 100`
- Track failure count: number of connection failures or health check failures
- Provide statistics function: `getConnectionStats()`
- Log statistics periodically (every 100 requests) or on demand

### AC-8.4.6: Client Integration

**Given** video provider client uses MCP connections
**When** making tool calls
**Then** the system shall:
- Update `video-provider-client.ts` to use `ensureConnection()` before tool calls
- Pass provider ID to `ensureConnection()` to check for existing connection
- Use returned connection for MCP tool calls
- Handle connection failures gracefully (log error, spawn new connection)
- Update all video provider integrations (DVIDS, YouTube, NASA)
- Maintain backward compatibility (existing code still works)

---

## Implementation Notes

### Connection Pool

```typescript
// File: src/lib/mcp/video-provider-client.ts

import { Logger } from 'winston';

interface MCPConnection {
  client: MCPClient;
  createdAt: Date;
  lastUsed: Date;
  healthStatus: 'healthy' | 'unhealthy';
}

class ConnectionPool {
  private connections = new Map<string, MCPConnection>();
  private stats = {
    created: 0,
    reused: 0,
    failures: 0
  };

  constructor(private logger: Logger) {
    // Register shutdown hooks
    process.on('SIGTERM', () => this.disconnectAll());
    process.on('SIGINT', () => this.disconnectAll());
  }

  async ensureConnection(providerId: string): Promise<MCPClient> {
    const existing = this.connections.get(providerId);

    if (existing) {
      // Check health
      if (await this.isHealthy(existing)) {
        this.stats.reused++;
        existing.lastUsed = new Date();
        this.logger.info(`[MCP] Reusing existing connection for ${providerId}`);
        return existing.client;
      } else {
        // Remove unhealthy connection
        this.connections.delete(providerId);
        await existing.client.close();
        this.logger.warn(`[MCP] Unhealthy connection for ${providerId} - reconnecting...`);
      }
    }

    // Spawn new connection
    this.logger.info(`[MCP] Connecting to ${providerId} provider...`);
    const client = await this.spawnMCPServer(providerId);
    this.connections.set(providerId, {
      client,
      createdAt: new Date(),
      lastUsed: new Date(),
      healthStatus: 'healthy'
    });
    this.stats.created++;
    return client;
  }

  async isHealthy(connection: MCPConnection): Promise<boolean> {
    try {
      // Ping server with timeout
      await Promise.race([
        connection.client.ping(),
        this.timeout(60000)  // 60 second timeout
      ]);
      return true;
    } catch (error) {
      this.logger.error(`[MCP] Health check failed: ${error}`);
      return false;
    }
  }

  private timeout(ms: number): Promise<never> {
    return new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Timeout')), ms)
    );
  }

  async disconnectAll(): Promise<void> {
    this.logger.info(`[MCP] Disconnecting all connections (${this.connections.size} active)...`);

    for (const [id, conn] of this.connections) {
      try {
        await conn.client.close();
        this.logger.info(`[MCP] Disconnected ${id}`);
      } catch (error) {
        this.logger.error(`[MCP] Error disconnecting ${id}: ${error}`);
      }
    }

    this.connections.clear();
    this.logStats();
  }

  async cleanupIdleConnections(): Promise<void> {
    const now = new Date();
    const idleTimeout = 5 * 60 * 1000;  // 5 minutes

    for (const [id, conn] of this.connections) {
      const idleTime = now.getTime() - conn.lastUsed.getTime();
      if (idleTime > idleTimeout) {
        this.logger.info(`[MCP] Closing idle connection for ${id} (last used ${Math.floor(idleTime / 60000)}m ago)`);
        await conn.client.close();
        this.connections.delete(id);
      }
    }
  }

  getStats() {
    const reuseRate = this.stats.reused / (this.stats.created + this.stats.reused) * 100;
    return {
      active: this.connections.size,
      created: this.stats.created,
      reused: this.stats.reused,
      failures: this.stats.failures,
      reuseRate: reuseRate.toFixed(1) + '%'
    };
  }

  private logStats(): void {
    const stats = this.getStats();
    this.logger.info(`[MCP] Connection stats: ${JSON.stringify(stats)}`);
  }
}

export const connectionPool = new ConnectionPool(logger);
```

### Client Integration

```typescript
// Update video provider client to use connection pool

class VideoProviderClient {
  async searchVideos(providerId: string, query: string): Promise<VideoSearchResult[]> {
    // Use connection pool
    const client = await connectionPool.ensureConnection(providerId);

    try {
      const results = await client.callTool('search_videos', { query });
      return results;
    } catch (error) {
      connectionPool.stats.failures++;
      throw error;
    }
  }

  async downloadVideo(providerId: string, videoId: string): Promise<string> {
    const client = await connectionPool.ensureConnection(providerId);
    // ... download logic
  }
}
```

### Background Cleanup

```typescript
// Run idle connection cleanup periodically

setInterval(
  () => connectionPool.cleanupIdleConnections(),
  60 * 1000  // Every minute
);
```

---

## Testing

### Unit Tests
- Mock MCP client for connection creation
- Test connection reuse logic
- Test health check with timeout
- Test idle cleanup with timestamps
- Test statistics tracking

### Integration Tests
- Spawn real MCP server and test connection reuse
- Test health check with real server ping
- Test idle cleanup with time delays
- Test shutdown hooks (SIGTERM, SIGINT)

### Test Scenarios
1. **Connection Reuse:** First request spawns new connection, second request reuses it
2. **Health Check Failure:** Unhealthy connection closed and new one spawned
3. **Idle Cleanup:** Connection idle for >5 minutes automatically closed
4. **Statistics:** After 10 requests (5 reused), log "50% reuse rate"
5. **Graceful Shutdown:** SIGTERM triggers `disconnectAll()` and closes all connections

---

## Definition of Done

- [ ] Connection pool implemented with Map-based tracking
- [ ] `ensureConnection()` function with reuse logic
- [ ] `disconnectAll()` function for cleanup
- [ ] Health check with 60-second timeout
- [ ] Idle connection cleanup (5-minute timeout)
- [ ] Statistics tracking and logging
- [ ] Client integration updated
- [ ] Shutdown hooks registered (SIGTERM, SIGINT)
- [ ] Unit tests pass (80%+ coverage)
- [ ] Integration tests pass with real MCP servers
- [ ] Code reviewed and approved

---

## References

- **Epic 8:** DVIDS Video Provider API Integration
- **Epic 6 Story 6.9:** MCP Video Provider Client (dependency)
- **MCP Protocol:** https://modelcontextprotocol.io/
- **Implementation File:** `src/lib/mcp/video-provider-client.ts`
- **Index File:** `src/lib/mcp/index.ts`
