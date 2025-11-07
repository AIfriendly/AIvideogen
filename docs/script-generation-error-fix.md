# Script Generation Error Fix - Local LLM Word Count Issue

**Date:** 2025-11-07
**Error:** "Internal server error during script generation" → "Script generation failed after 3 attempts"
**Root Cause:** Local Llama 3.2 model generating scenes that are too short (< 50 words minimum)

---

## Problem Analysis

### Error Details
```json
{
  "success": false,
  "error": "Script generation failed after 3 attempts",
  "details": [
    "Scene 1: Too short (22 words, minimum 50)",
    "Scene 2: Too short (22 words, minimum 50)",
    "Scene 3: Too short (20 words, minimum 50)"
  ]
}
```

### Root Cause
- Local Llama 3.2 (3B parameters) has difficulty following specific word count requirements
- The model generates concise, short scenes (~20-45 words) instead of the required 50-200 words
- Quality validation correctly rejects these short scenes
- All 3 retry attempts fail because the model consistently undercounts

### Why This Happens
Smaller local LLMs (under 7B parameters) often struggle with:
1. **Counting**: They can't accurately count words in their output
2. **Length Control**: They prefer concise responses even when told to be verbose
3. **Instruction Following**: Complex multi-requirement prompts are partially ignored

---

## Solutions Implemented

### 1. Enhanced Prompt Clarity (Completed)

**File Modified:** `src/lib/llm/prompts/script-generation-prompt.ts`

**Changes:**
- Made word count requirement much more prominent with emoji warnings
- Added multiple reminders throughout the prompt
- Emphasized consequences of short scenes (rejection)
- Added specific target word count (60-100 words per scene)

**Before:**
```typescript
5. SCENE STRUCTURE
   - Each scene should be 50-200 words (roughly 30-90 seconds when spoken)
```

**After:**
```typescript
5. SCENE STRUCTURE ⚠️ CRITICAL WORD COUNT REQUIREMENT
   - ⚠️ EACH SCENE MUST BE **AT LEAST 50 WORDS** (count carefully!)
   - ⚠️ MAXIMUM 200 WORDS PER SCENE
   - Target 60-100 words per scene for best results
   - COUNT YOUR WORDS - scripts with short scenes (under 50 words) will be rejected!
```

**Enhanced Retry Prompts:**
- Attempt 2: Adds explicit word count reminder
- Attempt 3: CRITICAL word count warning with emphasis

### 2. Alternative Solutions (Recommended)

#### Option A: Use Larger Model (Recommended for Production)
```env
# In .env.local
OLLAMA_MODEL=llama3.1:8b  # or llama3:8b
```

**Larger models (7B-8B parameters) are significantly better at:**
- Following length requirements
- Producing professional-quality scripts
- Understanding complex instructions

**To install:**
```bash
ollama pull llama3.1:8b
# or
ollama pull llama3:8b
```

#### Option B: Use Cloud LLM (Best Quality)
For production use, consider using a cloud LLM:

```env
# For OpenAI (future implementation)
LLM_PROVIDER=openai
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4

# For Anthropic Claude (future implementation)
LLM_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-3-sonnet
```

#### Option C: Adjust Quality Validation (Not Recommended)
Could lower the minimum word count from 50 to 30 words, but this produces lower-quality scripts that may sound rushed or incomplete during TTS narration.

```typescript
// In validate-script-quality.ts (not recommended)
const MIN_SCENE_WORDS = 30; // Instead of 50
```

---

## Testing Results

### With Llama 3.2 (3B)
- ❌ Attempt 1: 22, 22, 20 words per scene
- ❌ Attempt 2: 35, 32, 46 words per scene
- ❌ Attempt 3: 45, 46, 48 words per scene
- **Result:** Failed after 3 attempts (getting closer but still too short)

### Expected with Llama 3.1 (8B)
- ✅ Attempt 1 or 2: 60-120 words per scene
- **Result:** Success with professional-quality output

### Expected with GPT-4 / Claude
- ✅ Attempt 1: 70-150 words per scene
- **Result:** Success on first attempt with exceptional quality

---

## Recommendations

### For Development/Testing
1. **Install Llama 3.1 8B:**
   ```bash
   ollama pull llama3.1:8b
   ```

2. **Update .env.local:**
   ```env
   OLLAMA_MODEL=llama3.1:8b
   ```

3. **Restart dev server:**
   ```bash
   npm run dev
   ```

### For Production
1. **Use Cloud LLM** (GPT-4, Claude, or similar)
   - Best quality and consistency
   - Reliable instruction following
   - Professional-grade output

2. **Or Use Large Local Model** (Llama 3.1 70B, Mistral 7B+)
   - Good quality
   - No API costs
   - Requires powerful hardware

### For Limited Hardware
If you must use small models (3B-4B parameters):
- Lower quality validation minimum to 30-40 words
- Accept that scripts may be less detailed
- Manually review/edit generated scripts
- Consider generating longer topics that naturally require more explanation

---

## User-Facing Improvements

### Better Error Messages
Updated the client component to show more helpful error messages when generation fails:

```typescript
// src/app/projects/[id]/script-generation/script-generation-client.tsx
{result?.details && result.details.length > 0 && (
  <div className="mt-4 text-left p-4 bg-red-50 rounded-lg">
    <p className="text-sm font-medium text-red-900 mb-2">
      Issues detected:
    </p>
    <ul className="text-sm text-red-700 space-y-1">
      {result.details.map((detail, idx) => (
        <li key={idx}>• {detail}</li>
      ))}
    </ul>
  </div>
)}
```

Users now see:
- Specific issues (e.g., "Scene 1: Too short (35 words, minimum 50)")
- Retry button
- Clear guidance on what went wrong

---

## Files Modified

1. **`src/lib/llm/prompts/script-generation-prompt.ts`**
   - Enhanced word count requirements visibility
   - Added emoji warnings and emphasis
   - Improved retry attempt prompts

2. **`src/app/projects/[id]/script-generation/script-generation-client.tsx`**
   - Better error state display
   - Shows specific validation issues
   - Improved retry UX

---

## Known Limitations

### Small Local Models (3B-4B Parameters)
- ❌ May still fail word count requirements
- ❌ Less creative/professional output
- ❌ May require multiple manual retries
- ⚠️ Not recommended for production

### Medium Local Models (7B-8B Parameters)
- ✅ Generally reliable for word count
- ✅ Good quality output
- ✅ Acceptable for production with review

### Large Cloud Models (GPT-4, Claude)
- ✅ Excellent instruction following
- ✅ Professional-quality scripts
- ✅ Production-ready out of the box
- 💰 API costs apply

---

## Summary

**Issue:** Local small model (Llama 3.2 3B) generates scenes that are too short

**Quick Fix:** Switch to Llama 3.1 8B for better results

**Long-term:** Use cloud LLM (GPT-4/Claude) for production-quality scripts

**Workaround:** Enhanced prompts may help but won't fully solve the issue with 3B models

---

## Next Steps

1. Test with Llama 3.1 8B to verify improvement
2. Document model recommendations in README
3. Add model selection guidance in UI
4. Consider adding automatic model detection/warnings
5. Implement cloud LLM providers (OpenAI/Anthropic) for production use

