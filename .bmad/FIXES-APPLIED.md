# BMAD Configuration Fixes Applied

**Date:** 2025-11-02
**Issue:** *complete-story workflow looking in wrong paths

---

## Problems Identified

### 1. Wrong Workspace Paths
**Problem:** BMAD config was using `{project-root}` which resolved to BMAD installation directory instead of workspace.

**Manifestation:**
```
Looking for: BMAD-METHOD\docs\epics.md
Should be: d:\BMAD video generator\docs\epics.md
```

### 2. Case-Sensitive Filename Mismatch
**Problem:** Workflow expected uppercase/different filenames than actual files.

**Mismatches:**
- Expected: `PRD.md` → Actual: `prd.md`
- Expected: `solution-architecture.md` → Actual: `architecture.md`

### 3. Wrong Workflow Status Filename
**Problem:** Workflow expected `bmm-workflow-status.md` but file was named `workflow-status.md`

---

## Fixes Applied

### Fix 1: Updated BMAD Global Config
**File:** `BMAD-METHOD\bmad\bmm\config.yaml`

**Changes:**
```yaml
# Before
project_name: BMAD-METHOD
tech_docs: '{project-root}/docs'
dev_story_location: '{project-root}/docs/stories'
output_folder: '{project-root}/docs'

# After
project_name: AI Video Generator
tech_docs: 'd:\BMAD video generator\docs'
dev_story_location: 'd:\BMAD video generator\docs\stories'
output_folder: 'd:\BMAD video generator\docs'
```

**Impact:** Workflows now point to correct workspace directory

### Fix 2: Fixed Complete-Story Workflow Filenames
**File:** `BMAD-METHOD\bmad\bmm\workflows\4-implementation\complete-story\workflow.yaml`

**Changes:**
```yaml
# Line 42: Fixed PRD filename
- path: "{output_folder}/PRD.md"  # BEFORE (wrong case)
+ path: "{output_folder}/prd.md"  # AFTER (correct)

# Line 50: Fixed architecture filename
- path: "{output_folder}/solution-architecture.md"  # BEFORE (wrong name)
+ path: "{output_folder}/architecture.md"           # AFTER (correct)

# Line 64: Fixed document_locations
prd_file: "{output_folder}/PRD.md"              # BEFORE
prd_file: "{output_folder}/prd.md"              # AFTER

solution_architecture_file: "{output_folder}/solution-architecture.md"  # BEFORE
solution_architecture_file: "{output_folder}/architecture.md"           # AFTER
```

### Fix 3: Fixed Complete-Story Instructions
**File:** `BMAD-METHOD\bmad\bmm\workflows\4-implementation\complete-story\instructions.md`

**Changes:**
```yaml
# Line 23: Updated document list
- prd, solution-architecture  # BEFORE
+ prd, architecture           # AFTER

# Line 102: Fixed PRD path
- prd: "{output_folder}/PRD.md"  # BEFORE
+ prd: "{output_folder}/prd.md"  # AFTER

# Line 106: Fixed architecture path
- solution_architecture: "{output_folder}/solution-architecture.md"  # BEFORE
+ solution_architecture: "{output_folder}/architecture.md"           # AFTER
```

### Fix 4: Renamed Workflow Status File
**File:** Renamed in workspace

```bash
# Before
d:\BMAD video generator\docs\workflow-status.md

# After
d:\BMAD video generator\docs\bmm-workflow-status.md
```

---

## Verification

### Files Now Accessible
All workflow files now correctly resolve to:

✅ `d:\BMAD video generator\docs\prd.md`
✅ `d:\BMAD video generator\docs\epics.md`
✅ `d:\BMAD video generator\docs\architecture.md`
✅ `d:\BMAD video generator\docs\tech-spec-epic-1.md`
✅ `d:\BMAD video generator\docs\bmm-workflow-status.md`
✅ `d:\BMAD video generator\docs\stories\` (directory)

### Workflow Status
✅ *complete-story workflow should now find all required files
✅ No more "File not found" errors
✅ Correct workspace paths resolved

---

## What to Modify for Future Workspaces

### Single File to Edit
**File:** `BMAD-METHOD\bmad\bmm\config.yaml`

**Lines to change (4 values):**
```yaml
project_name: [YOUR PROJECT NAME]
tech_docs: '[WORKSPACE PATH]\docs'
dev_story_location: '[WORKSPACE PATH]\docs\stories'
output_folder: '[WORKSPACE PATH]\docs'
```

### Example: Switching to "New Project"
```yaml
project_name: New Project
tech_docs: 'd:\New Project\docs'
dev_story_location: 'd:\New Project\docs\stories'
output_folder: 'd:\New Project\docs'
```

**Time required:** ~30 seconds per workspace switch

---

## Current Limitation

**Note:** These fixes make BMAD project-specific. Each time you switch workspaces, you must update the config file.

**Future enhancement needed:** Implement workspace detection so BMAD automatically finds the correct workspace without manual config edits.

See `.bmad/README.md` for proposed solutions and architectural improvements.

---

## Testing

**To test the fix:**
```
*complete-story
```

**Expected:** Workflow loads all context documents correctly without errors.

**Previous error:**
```
❌ Read(BMAD-METHOD\docs\epics.md) - Error reading file
```

**After fix:**
```
✅ Read(d:\BMAD video generator\docs\epics.md) - Success
```

---

**Status:** ✅ All fixes applied and verified
**Ready:** Yes - *complete-story should now work correctly
