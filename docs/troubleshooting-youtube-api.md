# YouTube API Troubleshooting Guide

This guide provides solutions for common issues with the YouTube Data API v3 integration.

## Table of Contents

1. [API Key Issues](#api-key-issues)
2. [Quota Management](#quota-management)
3. [Rate Limiting](#rate-limiting)
4. [Network and Connectivity](#network-and-connectivity)
5. [Search Results](#search-results)
6. [Testing and Debugging](#testing-and-debugging)

## API Key Issues

### Error: YOUTUBE_API_KEY_NOT_CONFIGURED

**Symptom:**
```
YouTube API key not configured. Add YOUTUBE_API_KEY to .env.local
```

**Solution:**
1. Ensure `.env.local` file exists in `ai-video-generator/` directory
2. Add your API key:
   ```bash
   YOUTUBE_API_KEY=AIzaSy...your_key_here
   ```
3. Restart the application
4. Verify with: `npm run validate:env`

### Error: YOUTUBE_API_KEY_INVALID

**Symptom:**
```
YouTube API key is invalid. Verify key in Google Cloud Console.
```

**Common Causes:**
- API key is incorrect or was regenerated
- API key restrictions block the request
- YouTube Data API v3 not enabled for project
- API key quota exceeded

**Solution:**
1. Go to [Google Cloud Console - Credentials](https://console.cloud.google.com/apis/credentials)
2. Verify API key exists and is active
3. Check API restrictions:
   - Should allow "YouTube Data API v3"
   - Remove other API restrictions if present
4. Check application restrictions (for development, use "None")
5. Try regenerating the API key if issues persist
6. Update `.env.local` with new key

### Warning: Invalid API Key Format

**Symptom:**
```
⚠️ YOUTUBE_API_KEY format appears invalid (expected 39+ alphanumeric characters)
```

**Solution:**
- Verify API key was copied completely (no truncation)
- Remove any extra spaces before/after key in `.env.local`
- Ensure key is on a single line
- Check for hidden/invisible characters (re-type manually if needed)

## Quota Management

### Understanding Quotas

- **Free Tier Limit:** 10,000 units per day
- **Search Cost:** 100 units per search
- **Max Searches:** ~100 searches per day
- **Reset Time:** Midnight Pacific Time (daily)

### Error: YOUTUBE_QUOTA_EXCEEDED

**Symptom:**
```
YouTube API daily quota exceeded (10,000 units). Quota resets at midnight PT.
```

**Immediate Solutions:**
- Wait until midnight Pacific Time for automatic quota reset
- Check current usage: `npm run test:youtube:quota`
- Review quota cache: `.cache/youtube-quota.json`

**Long-term Solutions:**
1. **Optimize Search Queries:**
   - Reduce number of scenes processed
   - Use more targeted search queries
   - Implement result caching (future enhancement)

2. **Request Quota Increase:**
   - Go to Google Cloud Console
   - Navigate to APIs & Services > YouTube Data API v3
   - Click "Quotas" tab
   - Request quota increase (requires justification)

3. **Monitor Usage:**
   - Check quota regularly: `npm run test:youtube:quota`
   - Set up alerts at 80% usage (automatic warning in logs)

### Quota Not Resetting

**Symptom:**
Quota shows as exhausted even after midnight PT.

**Solution:**
1. Check system time is correct
2. Delete quota cache: `rm .cache/youtube-quota.json`
3. Restart application
4. Verify reset time matches midnight PT timezone

## Rate Limiting

### Error: YOUTUBE_RATE_LIMITED

**Symptom:**
```
YouTube API rate limit reached (100 requests per 100 seconds).
```

**What Happens:**
- Application automatically queues requests
- Requests delayed to respect rate limit
- No action needed from user
- May take a few seconds to process

**If Rate Limiting Persists:**
1. Reduce concurrent visual sourcing operations
2. Avoid rapid sequential searches
3. Check for infinite loops in code
4. Monitor rate limit status in logs

### Queue Full Error

**Symptom:**
```
Rate limit queue full (100 pending requests). Please try again later.
```

**Solution:**
- Too many concurrent requests
- Wait for queue to process (30-60 seconds)
- Retry operation after delay
- Check for runaway request loops

## Network and Connectivity

### Error: YOUTUBE_NETWORK_ERROR

**Symptom:**
```
Failed to connect to YouTube API. Check internet connection.
```

**Checklist:**
1. ✅ Internet connection active
2. ✅ Can access https://www.googleapis.com/youtube/v3/ in browser
3. ✅ Firewall allows HTTPS to googleapis.com
4. ✅ No proxy/VPN interfering with requests
5. ✅ Corporate firewall not blocking Google APIs

**Test Connectivity:**
```bash
# Test DNS resolution
nslookup www.googleapis.com

# Test HTTPS connectivity (Linux/Mac)
curl -I https://www.googleapis.com/youtube/v3/

# Test HTTPS connectivity (Windows PowerShell)
Invoke-WebRequest -Uri "https://www.googleapis.com/youtube/v3/" -UseBasicParsing
```

### Timeout Errors

**Symptom:**
Request times out after 30 seconds.

**Solution:**
- Check internet connection speed
- Verify no network congestion
- Try again (automatic retry with exponential backoff)
- Increase timeout in `.env.local`:
  ```bash
  YOUTUBE_API_TIMEOUT=60000  # 60 seconds
  ```

## Search Results

### No Results Found

**Symptom:**
Search returns 0 results for query.

**Common Causes:**
- Query too specific or contains typos
- Content not available on YouTube
- Search filters too restrictive

**Solution:**
1. Try broader search terms
2. Remove special characters from query
3. Test query directly on YouTube.com
4. Check `videoEmbeddable` filter (default: true)
5. Try different `order` option (relevance, date, viewCount)

### Irrelevant Results

**Symptom:**
Search returns videos unrelated to scene content.

**Solution:**
1. Refine search query (more specific keywords)
2. Use `videoDuration` filter if appropriate
3. Implement content filtering (Epic 3 Story 3.4)
4. Try multiple search queries and combine results

### Missing Thumbnails or Metadata

**Symptom:**
Some video results missing thumbnails or descriptions.

**Cause:**
YouTube API doesn't guarantee all fields for all videos.

**Solution:**
- Application handles missing fields gracefully
- Uses fallback values (empty string, default thumbnail)
- Filter out videos with missing critical fields in Story 3.4

## Testing and Debugging

### Test Authentication

```bash
npm run test:youtube:auth
```

**Expected Output:**
```
✅ Client initialized successfully
✅ Test search successful
📊 Quota Status:
   Used: 100/10000 units
   Remaining: 9900 units
```

### Test Search

```bash
npm run test:youtube -- --search "your query here"
```

**Example:**
```bash
npm run test:youtube -- --search "nature documentary"
```

### Check Quota Usage

```bash
npm run test:youtube:quota
```

**Output:**
```
📊 YouTube API Quota Status

Used:      500 / 10000 units (5%)
Remaining: 9500 units
Resets:    11/15/2025, 12:00:00 AM
```

### Stress Test Rate Limiting

```bash
npm run test:youtube -- --stress-test
```

Tests 20 concurrent requests to verify rate limiting works correctly.

### Enable Debug Logging

Add to `.env.local`:
```bash
YOUTUBE_LOG_LEVEL=DEBUG
NODE_ENV=development
```

Restart application to see detailed logs of all YouTube API operations.

### Clear Quota Cache

If quota tracking seems incorrect:

```bash
# Delete cache file
rm ai-video-generator/.cache/youtube-quota.json

# Restart application - quota will be recalculated
npm run dev
```

## Circuit Breaker

### What is Circuit Breaker?

After 5 consecutive failures, the system temporarily stops making requests to prevent cascading failures.

**Symptom:**
```
Circuit breaker open due to consecutive failures. Try again in X seconds.
```

**Solution:**
- Wait 60 seconds for automatic reset
- Fix underlying issue (API key, network, etc.)
- Restart application to manually reset

## Getting Help

If issues persist:

1. **Check Logs:** Look in console for detailed error messages
2. **Verify Setup:** Run `npm run validate:env`
3. **Test Endpoint:** Visit http://localhost:3000/api/youtube/test
4. **Review Docs:** See `/docs/setup-guide.md#youtube-api-setup-epic-3`
5. **GitHub Issues:** https://github.com/AIfriendly/AIvideogen/issues

## Common Error Reference

| Error Code | HTTP Status | Retry? | User Action |
|------------|-------------|--------|-------------|
| API_KEY_NOT_CONFIGURED | 503 | No | Add API key to .env.local |
| API_KEY_INVALID | 401 | No | Fix API key in Cloud Console |
| QUOTA_EXCEEDED | 429 | No | Wait for midnight PT reset |
| RATE_LIMITED | 429 | Yes | Automatic retry, wait |
| NETWORK_ERROR | 503 | Yes | Check internet connection |
| SERVICE_UNAVAILABLE | 503 | Yes | Wait and retry |
| INVALID_REQUEST | 400 | No | Fix request parameters |
