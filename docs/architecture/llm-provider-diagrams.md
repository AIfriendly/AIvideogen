# LLM Provider Architecture Diagrams

**Feature:** Pluggable Multi-Provider LLM Architecture (v2.0)
**Last Updated:** 2026-01-22
**Providers:** Ollama, Gemini, Groq

---

## 1. High-Level Component Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Application Layer                            │
│                                                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │   Script     │  │    Chat      │  │  Conversa-   │              │
│  │ Generation   │  │  Interface   │  │   tion       │              │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘              │
│         │                 │                 │                       │
│         └─────────────────┴─────────────────┘                       │
│                           │                                         │
│                           ▼                                         │
└─────────────────────────────────────────────────────────────────────┘
                           │
                           │ calls
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│                  LLM Provider Interface                             │
│                                                                      │
│  interface LLMProvider {                                           │
│    chat(messages: Message[], systemPrompt?: string): Promise    │
│  }                                                                 │
│                                                                      │
│  Benefits:                                                          │
│  ✓ Unified API signature across all providers                      │
│  ✓ Zero-code provider switching                                    │
│  ✓ Consistent error handling                                       │
│  ✓ Mockable for testing                                            │
└─────────────────────────────────────────────────────────────────────┘
                           │
                           │ factory pattern
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     Provider Factory                                │
│                                                                      │
│  createLLMProvider(userPreference?: string): LLMProvider            │
│                                                                      │
│  Priority:                                                          │
│  1. User preference from database (user_preferences table)         │
│  2. Environment variable (LLM_PROVIDER)                            │
│  3. Default: 'ollama'                                               │
└─────────────────────────────────────────────────────────────────────┘
                           │
         ┌─────────────────┼─────────────────┐
         │                 │                 │
         ▼                 ▼                 ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│ OllamaProvider  │ │ GeminiProvider  │ │  GroqProvider   │
│                 │ │                 │ │                 │
│ • Local LLM     │ │ • Google Cloud  │ │ • Groq Cloud    │
│ • No rate limit │ │ • 15 RPM limit  │ │ • 30 RPM limit  │
│ • llama3.2      │ │ • gemini-2.5    │ │ • llama-3.3-70b │
└─────────────────┘ └─────────────────┘ └─────────────────┘
```

---

## 2. Request Flow: Script Generation

```
┌──────────────┐
│    User      │  1. Generates script in UI
└──────┬───────┘
       │
       ▼
┌───────────────────────────────────────────────────────────────────┐
│  UI: Settings → AI Configuration                                  │
│                                                                   │
│  <Select value="groq" onChange={handleProviderChange}>           │
│    <option value="ollama">Ollama (Local)</option>                │
│    <option value="gemini">Gemini (Cloud)</option>                │
│    <option value="groq">Groq (Ultra-Fast Cloud)</option>         │
│  </Select>                                                        │
└───────────────────────────────┬───────────────────────────────────┘
                                │
                                │ 2. Save to database
                                ▼
┌───────────────────────────────────────────────────────────────────┐
│  Database: user_preferences                                      │
│                                                                   │
│  UPDATE user_preferences                                         │
│  SET default_llm_provider = 'groq',                              │
│      updated_at = datetime('now')                                │
│  WHERE id = 'default'                                            │
└───────────────────────────────┬───────────────────────────────────┘
                                │
                                │ 3. User clicks "Generate Script"
                                ▼
┌───────────────────────────────────────────────────────────────────┐
│  API Route: POST /api/script                                     │
│                                                                   │
│  const userProvider = getUserLLMProvider(); // Returns 'groq'     │
│  const llm = createLLMProvider(userProvider);                   │
│  const script = await llm.chat(messages, systemPrompt);         │
└───────────────────────────────┬───────────────────────────────────┘
                                │
                                │ 4. Factory creates provider
                                ▼
┌───────────────────────────────────────────────────────────────────┐
│  Provider Factory: switch(userPreference)                        │
│                                                                   │
│  case 'groq':                                                    │
│    return new GroqProvider(                                      │
│      process.env.GROQ_API_KEY,                                   │
│      process.env.GROQ_MODEL || 'llama-3.3-70b-versatile'        │
│    );                                                            │
└───────────────────────────────┬───────────────────────────────────┘
                                │
                                │ 5. Provider instance
                                ▼
┌───────────────────────────────────────────────────────────────────┐
│  GroqProvider.chat()                                              │
│                                                                   │
│  ┌─────────────────────────────────────────────────────┐        │
│  │ 5a. Rate Limiter Check                              │        │
│  │                                                      │        │
│  • Parse config: GROQ_RATE_LIMIT_REQUESTS_PER_MINUTE=2 │        │
│  • Check sliding window (60s)                          │        │
│  • If 2 requests in window: wait 30s                   │        │
│  │                                                      │        │
│  await rateLimiter.wait('groq', 2, true);              │        │
│  └─────────────────────────────────────────────────────┘        │
│                          │                                        │
│                          ▼                                        │
│  ┌─────────────────────────────────────────────────────┐        │
│  │ 5b. Groq API Call                                   │        │
│  │                                                      │        │
│  const response = await groq.chat.completions.create({ │        │
│    model: 'llama-3.3-70b-versatile',                   │        │
│    messages: groqMessages,                             │        │
│    temperature: 0.7                                    │        │
│  });                                                    │        │
│  └─────────────────────────────────────────────────────┘        │
│                          │                                        │
│                          ▼                                        │
│  ┌─────────────────────────────────────────────────────┐        │
│  │ 5c. Monitor Rate Limit Headers                      │        │
│  │                                                      │        │
│  x-ratelimit-remaining-requests: 998                   │        │
│  x-ratelimit-limit-requests: 1000                      │        │
│  retry-after: 30                                       │        │
│  │                                                      │        │
│  this.monitorRateLimits(response.headers);             │        │
│  └─────────────────────────────────────────────────────┘        │
└───────────────────────────────┬───────────────────────────────────┘
                                │
                                │ 6. Return script text
                                ▼
┌───────────────────────────────────────────────────────────────────┐
│  UI: Display Generated Script                                     │
│                                                                   │
│  { success: true, script: [...scenes] }                          │
└───────────────────────────────────────────────────────────────────┘
```

---

## 3. Rate Limiting Architecture

### Sliding Window Algorithm

```
┌───────────────────────────────────────────────────────────────────┐
│                    Rate Limiter: Sliding Window                   │
│                                                                      │
│  Time (seconds) →    0s    10s    20s    30s    40s    50s    60s   │
│                      │      │      │      │      │      │      │    │
│  Request Timeline:   R1     R2     R3                                  │
│                      │      │      │                                  │
│                      └──────┴──────┴────→ Sliding Window (60s)       │
│                                                                      │
│  Config: GROQ_RATE_LIMIT_REQUESTS_PER_MINUTE = 2                    │
│                                                                      │
│  State:                                                              │
│    timestamps = [t1, t2, t3]  // Request times                       │
│    window = 60000  // 60 seconds                                    │
│                                                                      │
│  Logic:                                                              │
│    1. Filter: Remove timestamps older than 60s                     │
│    2. Check: If count >= limit, wait for oldest to expire          │
│    3. Add: Push current timestamp                                  │
│                                                                      │
│  Example (Groq, 2 RPM):                                             │
│    • R1 at 0s    → Proceed (0/2 used)                              │
│    • R2 at 20s   → Proceed (2/2 used)                              │
│    • R3 at 30s   → WAIT 30s (until R1 expires at 60s)              │
│    • R4 at 95s   → Proceed (window slid, R1 expired)              │
└─────────────────────────────────────────────────────────────────────┘
```

### Per-Provider Rate Limits

```
┌─────────────────────────────────────────────────────────────────────┐
│                     Rate Limit Comparison                           │
│                                                                      │
│  ┌─────────────┬───────────┬───────────┬───────────┬─────────────┐ │
│  │   Provider  │   Local   │   Actual  │   Safety  │     Wait    │ │
│  │             │   Limit   │   Limit   │   Factor  │   Time (R2)  │ │
│  ├─────────────┼───────────┼───────────┼───────────┼─────────────┤ │
│  │   Ollama    │  Disabled │  Unlimited│     N/A   │      0s     │ │
│  │   Gemini    │    1 RPM  │   15 RPM  │    15x    │     60s     │ │
│  │   Groq      │    2 RPM  │   30 RPM  │    15x    │     30s     │ │
│  └─────────────┴───────────┴───────────┴───────────┴─────────────┘ │
│                                                                      │
│  Safety Factor: Conservative local limits prevent hitting quota     │
└─────────────────────────────────────────────────────────────────────┘
```

### Rate Limiter Flow

```
┌──────────────────┐
│  Provider.chat() │
└────────┬─────────┘
         │
         ▼
┌───────────────────────────────────────────────────────────────────┐
│  1. Parse Rate Limit Config                                       │
│                                                                   │
│  const config = parseRateLimitConfig(                            │
│    'GROQ_RATE_LIMIT_ENABLED',      // true                       │
│    'GROQ_RATE_LIMIT_REQUESTS_PER_MINUTE',  // 2                 │
│    true,  // default enabled                                    │
│    2      // default 2 RPM                                       │
│  );                                                              │
│                                                                   │
│  // Returns: { enabled: true, requestsPerMinute: 2 }            │
└───────────────────────────────┬───────────────────────────────────┘
                                │
                                ▼
┌───────────────────────────────────────────────────────────────────┐
│  2. Call Rate Limiter                                            │
│                                                                   │
│  await rateLimiter.wait(                                         │
│    'groq',           // provider ID                              │
│    2,                // requests per minute                      │
│    true              // enabled                                  │
│  );                                                              │
└───────────────────────────────┬───────────────────────────────────┘
                                │
                                ▼
┌───────────────────────────────────────────────────────────────────┐
│  3. Rate Limiter: Sliding Window Check                           │
│                                                                   │
│  const now = Date.now();                                         │
│  let timestamps = [t1, t2];  // Previous requests                │
│                                                                   │
│  // Remove timestamps older than 60s                             │
│  timestamps = timestamps.filter(ts => now - ts < 60000);         │
│                                                                   │
│  // Check if at limit                                             │
│  if (timestamps.length >= 2) {                                   │
│    const waitMs = timestamps[0] + 60000 - now;  // Wait for R1  │
│    await sleep(waitMs);  // Sleep 30s                            │
│  }                                                               │
│                                                                   │
│  // Add current timestamp                                        │
│  timestamps.push(now);                                           │
└───────────────────────────────┬───────────────────────────────────┘
                                │
                                ▼
┌───────────────────────────────────────────────────────────────────┐
│  4. Proceed to API Call                                           │
│                                                                   │
│  // Rate limit check passed, make API request                    │
│  const response = await groq.chat.completions.create({...});    │
└───────────────────────────────────────────────────────────────────┘
```

---

## 4. Database Schema: User Preferences

```
┌─────────────────────────────────────────────────────────────────────┐
│  Table: user_preferences                                          │
│                                                                    │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │  Column                  │ Type      │ Default    │ Check  │ │
│  ├──────────────────────────────────────────────────────────────┤ │
│  │  id                      │ TEXT      │ 'default'  │ PK     │ │
│  │  default_voice_id        │ TEXT      │ NULL       │        │ │
│  │  default_persona_id      │ TEXT      │ NULL       │ FK     │ │
│  │  default_llm_provider    │ TEXT      │ 'ollama'   │ CHECK  │ │
│  │  quick_production_enabled│ INTEGER   │ 1          │        │ │
│  │  created_at              │ TEXT      │ now()      │        │ │
│  │  updated_at              │ TEXT      │ now()      │        │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                    │
│  Constraints:                                                       │
│    CHECK(default_llm_provider IN ('ollama', 'gemini', 'groq'))    │
│    FOREIGN KEY (default_persona_id) REFERENCES system_prompts(id) │
│                                                                    │
│  Indexes:                                                           │
│    idx_user_preferences_id                                         │
│                                                                    │
│  Query Functions:                                                   │
│    • getUserLLMProvider() → Returns user's preferred provider      │
│    • updateUserLLMProvider(provider) → Saves selection             │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 5. Error Handling Flow

```
┌──────────────────┐
│  Provider.chat() │
└────────┬─────────┘
         │
         ▼
┌───────────────────────────────────────────────────────────────────┐
│  Try: API Call                                                    │
└───────────────────────────────┬───────────────────────────────────┘
                                │
                  ┌─────────────┴─────────────┐
                  │                           │
                  ▼                           ▼
         ┌─────────────────┐         ┌─────────────────┐
         │   Success       │         │     Error        │
         └────────┬────────┘         └────────┬────────┘
                  │                           │
                  ▼                           ▼
         ┌─────────────────┐         ┌─────────────────┐
         │ Return response │         │  Error Type?    │
         └─────────────────┘         └────────┬────────┘
                                               │
         ┌─────────────────┬──────────────────┼──────────┬────────────┐
         ▼                 ▼                  ▼          ▼            ▼
   ┌───────────┐    ┌───────────┐    ┌───────────┐ ┌──────┐  ┌──────────┐
   │  Network  │    │  Invalid  │    │  Rate     │ │Model │  │ Safety   │
   │  Error    │    │  API Key  │    │  Limit    │ │Not   │  │  Filter  │
   └─────┬─────┘    └─────┬─────┘    └─────┬─────┘ └───┬──┘  └────┬─────┘
         │                │                │           │           │
         ▼                ▼                ▼           ▼           ▼
   "Check      "Get key at   "Wait 30s    "Use        "Content
    internet"   console..."   (auto)"      valid       blocked...
                                      model"      Rephrase."
```

### Error Messages by Provider

```
┌─────────────────────────────────────────────────────────────────────┐
│  Error Message Matrix                                               │
│                                                                      │
│  ┌────────────────┬─────────────────────────────────────────────┐  │
│  │ Error Type     │ Ollama                │ Gemini    │ Groq    │  │
│  ├────────────────┼─────────────────────────────────────────────┤  │
│  │ Server Down     │ ECONNREFUSED          │ -         │ -       │  │
│  │ Action          │ Start: ollama serve   │ -         │ -       │  │
│  ├────────────────┼─────────────────────────────────────────────┤  │
│  │ Invalid Key     │ -                     │ 401       │ 401     │  │
│  │ Action          │ -                     │ Get key   │ Get key │  │
│  │                 │                       │ at aist..│ at con..│  │
│  ├────────────────┼─────────────────────────────────────────────┤  │
│  │ Model Not Found │ Model not found       │ 404       │ 404     │  │
│  │ Action          │ ollama pull <model>   │ Check     │ Check   │
│  │                 │                       │ model     │ model   │
│  ├────────────────┼─────────────────────────────────────────────┤  │
│  │ Rate Limit      │ -                     │ 429       │ 429     │  │
│  │ Action          │ -                     │ Wait 60s  │ Wait 30s│  │
│  ├────────────────┼─────────────────────────────────────────────┤  │
│  │ Safety Filter   │ -                     │ Blocked   │ -       │  │
│  │ Action          │ -                     │ Rephrase  │ -       │  │
│  └────────────────┴─────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 6. HTTP Header Monitoring (Groq)

```
┌─────────────────────────────────────────────────────────────────────┐
│  Groq API Response Headers                                         │
│                                                                      │
│  HTTP/1.1 200 OK                                                    │
│  Content-Type: application/json                                    │
│  x-ratelimit-remaining-requests: 998                               │
│  x-ratelimit-limit-requests: 1000                                  │
│  x-ratelimit-reset-requests: 1737550800                            │
│  retry-after: 30                                                   │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ Header Monitoring Implementation                          │   │
│  │                                                             │   │
│  private monitorRateLimits(headers: Headers): void {           │   │
│  │  const remaining = headers.get('x-ratelimit-remaining-..');│   │
│  │  const limit = headers.get('x-ratelimit-limit-requests');  │   │
│  │  const reset = headers.get('x-ratelimit-reset-requests');  │   │
│  │                                                             │   │
│  │  if (remaining !== null) {                                 │   │
│  │    console.log(                                            │   │
│  │      `[GroqProvider] Rate limit: ${remaining}/${limit}`    │   │
│  │    );                                                      │   │
│  │  }                                                         │   │
│  │                                                             │   │
│  │  const retryAfter = headers.get('retry-after');            │   │
│  │  if (retryAfter) {                                         │   │
│  │    console.warn(                                           │   │
│  │      `[GroqProvider] Rate limit hit, retry-after: ${..}`  │   │
│  │    );                                                      │   │
│  │  }                                                         │   │
│  │ }                                                           │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 7. Environment Variable Configuration

```
┌─────────────────────────────────────────────────────────────────────┐
│  .env.local Configuration Template                                  │
│                                                                      │
│  # =============================================================   │
│  # LLM Provider Selection                                          │
│  # =============================================================   │
│  LLM_PROVIDER=ollama  # Can be overridden by UI                    │
│                                                                      │
│  # =============================================================   │
│  # Ollama Configuration (Primary, FOSS)                             │
│  # =============================================================   │
│  OLLAMA_BASE_URL=http://localhost:11434                            │
│  OLLAMA_MODEL=llama3.2                                             │
│  OLLAMA_RATE_LIMIT_ENABLED=false                                   │
│  OLLAMA_RATE_LIMIT_REQUESTS_PER_MINUTE=0                           │
│                                                                      │
│  # =============================================================   │
│  # Gemini Configuration (Optional, Cloud)                           │
│  # =============================================================   │
│  GEMINI_API_KEY=your_key_here  # Get at aistudio.google.com        │
│  GEMINI_MODEL=gemini-2.5-flash                                     │
│  GEMINI_RATE_LIMIT_ENABLED=true                                    │
│  GEMINI_RATE_LIMIT_REQUESTS_PER_MINUTE=1                           │
│                                                                      │
│  # =============================================================   │
│  # Groq Configuration (Optional, Ultra-Fast Cloud)                  │
│  # =============================================================   │
│  GROQ_API_KEY=your_key_here  # Get at console.groq.com              │
│  GROQ_MODEL=llama-3.3-70b-versatile                                │
│  GROQ_RATE_LIMIT_ENABLED=true                                      │
│  GROQ_RATE_LIMIT_REQUESTS_PER_MINUTE=2                             │
│  GROQ_RATE_LIMIT_SECONDS_PER_REQUEST=30                            │
│                                                                      │
│  # =============================================================   │
│  # Rate Limiting Notes                                             │
│  # =============================================================   │
│  # Ollama: No limit (local), disabled by default                    │
│  # Gemini: 15 RPM actual, 1 RPM local (15x safety factor)          │
│  # Groq: 30 RPM actual, 2 RPM local (15x safety factor)            │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 8. Provider Comparison Matrix

```
┌─────────────────────────────────────────────────────────────────────┐
│  LLM Provider Feature Comparison                                    │
│                                                                      │
│  ┌──────────────────┬────────────┬────────────┬──────────────────┐ │
│  │ Feature          │  Ollama    │  Gemini    │     Groq         │ │
│  ├──────────────────┼────────────┼────────────┼──────────────────┤ │
│  │ Deployment       │  Local     │  Cloud     │  Cloud           │ │
│  │ Privacy          │  100%      │  Cloud     │  Cloud           │ │
│  │                  │  local     │  (Google)  │  (Groq)          │ │
│  ├──────────────────┼────────────┼────────────┼──────────────────┤ │
│  │ Rate Limit       │  Unlimited │  15 RPM    │  30 RPM          │ │
│  │ (Free Tier)      │            │  1,500 RPD │  1,000 RPD       │ │
│  ├──────────────────┼────────────┼────────────┼──────────────────┤ │
│  │ Local Limit      │  Disabled  │  1 RPM     │  2 RPM           │ │
│  │ (Safety Factor)  │            │  (15x)     │  (15x)           │ │
│  ├──────────────────┼────────────┼────────────┼──────────────────┤ │
│  │ Default Model    │  llama3.2  │  gemini-   │  llama-3.3-      │ │
│  │                  │            │  2.5-flash │  70b-versatile   │ │
│  ├──────────────────┼────────────┼────────────┼──────────────────┤ │
│  │ Latency (P50)    │  2-3s      │  1-2s      │  0.5-1s          │ │
│  │ Latency (P95)    │  5-8s      │  3-5s      │  1-2s            │ │
│  ├──────────────────┼────────────┼────────────┼──────────────────┤ │
│  │ Cost (per 1K)    │  Free      │  Free      │  Free            │ │
│  │                  │  (local)   │  (1.5K/d)  │  (1K/d)          │ │
│  ├──────────────────┼────────────┼────────────┼──────────────────┤ │
│  │ Setup            │  Install   │  API key   │  API key         │ │
│  │                  │  Ollama    │  required  │  required        │ │
│  ├──────────────────┼────────────┼────────────┼──────────────────┤ │
│  │ Script Quality   │  Good      │  Excellent │  Excellent       │ │
│  │                  │  (3B)      │  (Google)  │  (70B)           │ │
│  ├──────────────────┼────────────┼────────────┼──────────────────┤ │
│  │ Use Cases        │  • Privacy │  • Speed  │  • Ultra-fast    │ │
│  │                  │  • No cost │  • Quality│  • Best quality  │ │
│  │                  │  • Offline │  • Cloud  │  • Llama 3.3     │ │
│  └──────────────────┴────────────┴────────────┴──────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 9. Testing Strategy

```
┌─────────────────────────────────────────────────────────────────────┐
│  Unit Testing: LLM Provider Interface                              │
│                                                                      │
│  describe('LLMProvider Interface', () => {                         │
│    it('should have consistent chat() signature', () => {           │
│      const providers = [                                            │
│        new OllamaProvider(),                                       │
│        new GeminiProvider('test-key'),                             │
│        new GroqProvider('test-key')                                │
│      ];                                                             │
│                                                                      │
│      providers.forEach(provider => {                                │
│        expect(provider.chat).toBeDefined();                        │
│        expect(typeof provider.chat).toBe('function');              │
│      });                                                            │
│    });                                                              │
│  });                                                                │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ Integration Testing: Provider Factory                      │   │
│  │                                                             │   │
│  describe('Provider Factory', () => {                           │   │
│    it('should create OllamaProvider', () => {                  │   │
│      const provider = createLLMProvider('ollama');              │   │
│      expect(provider).toBeInstanceOf(OllamaProvider);           │   │
│    });                                                           │   │
│                                                                  │   │
│    it('should create GeminiProvider', () => {                   │   │
│      process.env.GEMINI_API_KEY = 'test-key';                   │   │
│      const provider = createLLMProvider('gemini');              │   │
│      expect(provider).toBeInstanceOf(GeminiProvider);           │   │
│    });                                                           │   │
│                                                                  │   │
│    it('should create GroqProvider', () => {                     │   │
│      process.env.GROQ_API_KEY = 'test-key';                     │   │
│      const provider = createLLMProvider('groq');                │   │
│      expect(provider).toBeInstanceOf(GroqProvider);             │   │
│    });                                                           │   │
│  });                                                             │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ Rate Limiter Testing                                         │   │
│  │                                                             │   │
│  describe('RateLimiter', () => {                                │   │
│    it('should enforce 2 RPM for Groq', async () => {           │   │
│      const limiter = new RateLimiter();                         │   │
│      const start = Date.now();                                  │   │
│                                                                  │   │
│      await limiter.wait('groq', 2, true);  // R1               │   │
│      await limiter.wait('groq', 2, true);  // R2               │   │
│      await limiter.wait('groq', 2, true);  // R3 (should wait)  │   │
│                                                                  │   │
│      const elapsed = Date.now() - start;                        │   │
│      expect(elapsed).toBeGreaterThanOrEqual(30000); // 30s      │   │
│    });                                                           │   │
│  });                                                             │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 10. Future Extensibility: Adding a New Provider

```
┌─────────────────────────────────────────────────────────────────────┐
│  Step-by-Step: Adding "OpenAI" Provider                             │
│                                                                      │
│  Step 1: Implement LLMProvider Interface                            │
│  ─────────────────────────────────────                              │
│  // src/lib/llm/openai-provider.ts                                  │
│  import type { LLMProvider } from './provider';                     │
│                                                                     │
│  export class OpenAIProvider implements LLMProvider {               │
│    constructor(apiKey: string, model: string = 'gpt-4') { ... }     │
│    async chat(messages, systemPrompt): Promise<string> { ... }      │
│    private handleError(error): Error { ... }                        │
│  }                                                                  │
│                                                                     │
│  ─────────────────────────────────────────────────────────────────  │
│                                                                      │
│  Step 2: Add to Factory                                              │
│  ────────────────────                                               │
│  // src/lib/llm/factory.ts                                          │
│  import { OpenAIProvider } from './openai-provider';               │
│                                                                     │
│  export function createLLMProvider(userPref?: string) {            │
│    // ... existing cases ...                                        │
│    if (provider === 'openai') {                                     │
│      return new OpenAIProvider(                                    │
│        process.env.OPENAI_API_KEY,                                 │
│        process.env.OPENAI_MODEL || 'gpt-4'                         │
│      );                                                             │
│    }                                                                │
│  }                                                                  │
│                                                                     │
│  ─────────────────────────────────────────────────────────────────  │
│                                                                      │
│  Step 3: Database Migration                                          │
│  ───────────────────────                                            │
│  // src/lib/db/migrations/022_add_openai_provider.ts               │
│  export function up(db) {                                           │
│    db.exec(`                                                        │
│      ALTER TABLE user_preferences                                  │
│      DROP COLUMN default_llm_provider;                             │
│    `);                                                              │
│    db.exec(`                                                        │
│      ALTER TABLE user_preferences                                  │
│      ADD COLUMN default_llm_provider TEXT                          │
│      DEFAULT 'ollama'                                               │
│      CHECK(default_llm_provider IN (                                │
│        'ollama', 'gemini', 'groq', 'openai'                         │
│      ))                                                             │
│    `);                                                              │
│  }                                                                  │
│                                                                     │
│  ─────────────────────────────────────────────────────────────────  │
│                                                                      │
│  Step 4: Add to UI                                                   │
│  ───────────────                                                     │
│  // components/features/settings/ai-configuration.tsx              │
│  <SelectItem value="openai">OpenAI (Cloud)</SelectItem>            │
│                                                                     │
│  ─────────────────────────────────────────────────────────────────  │
│                                                                      │
│  Step 5: Environment Configuration                                   │
│  ────────────────────────────                                       │
│  # .env.local                                                       │
│  OPENAI_API_KEY=your_key_here                                       │
│  OPENAI_MODEL=gpt-4                                                 │
│  OPENAI_RATE_LIMIT_ENABLED=true                                     │
│  OPENAI_RATE_LIMIT_REQUESTS_PER_MINUTE=10                           │
│                                                                     │
│  ─────────────────────────────────────────────────────────────────  │
│                                                                      │
│  Result: OpenAI provider fully integrated with zero code changes    │
│  to script generation, chat interface, or conversation logic!       │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Summary

This architecture enables:

1. **Runtime Provider Switching** - UI-based selection without application restart
2. **Unified API** - Single `LLMProvider` interface across all providers
3. **Extensibility** - Add new providers in 5 steps without modifying existing code
4. **Rate Limiting** - Proactive quota management with sliding window algorithm
5. **Error Handling** - Consistent, actionable error messages per provider
6. **Testing** - Mockable interface for comprehensive unit testing
7. **Monitoring** - HTTP header tracking for proactive rate limit management

**Key Files:**
- `src/lib/llm/provider.ts` - Interface definition
- `src/lib/llm/factory.ts` - Provider factory
- `src/lib/llm/*-provider.ts` - Provider implementations
- `src/lib/llm/rate-limiter.ts` - Sliding window rate limiter
- `src/lib/db/migrations/020_user_preferences_default_provider.ts` - Database schema

---

**Document Version:** 1.0
**Last Updated:** 2026-01-22
**Author:** Winston (System Architect)
**Status:** Implemented ✅
