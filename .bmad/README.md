# BMAD Workspace Configuration

This directory contains workspace-specific configuration for the **AI Video Generator** project.

## Current Status

**Configuration Mode:** Global BMAD config (temporary fix)
**Location:** `BMAD-METHOD\bmad\bmm\config.yaml` (hardcoded to this workspace)

## The Configuration Issue

### Problem
BMAD's global config uses `{project-root}` which resolves to the BMAD installation directory, not the workspace. This causes workflows to look for files in the wrong location.

### Current Solution (Temporary)
We've hardcoded the workspace paths in the global BMAD config:
```yaml
output_folder: 'd:\BMAD video generator\docs'
dev_story_location: 'd:\BMAD video generator\docs\stories'
```

**Trade-off:**
- ✅ Works for this project
- ❌ Not portable to other projects
- ❌ Requires editing BMAD installation for each project

## Future Solutions

### Option 1: Workspace-Specific Config (Best)
Create `.bmad/workspace-config.yaml` in each workspace (already created in this project).

**Requires:** BMAD agents updated to check for workspace config first

### Option 2: Workspace Parameter
Pass workspace path when activating agents:
```
@BMAD-METHOD\bmad\bmm\agents\sm.md --workspace="d:\BMAD video generator"
```

**Requires:** Agent activation system updated to accept parameters

### Option 3: Auto-Detection
BMAD detects workspace by:
- Checking Claude Code working directory
- Looking for `.bmad/` directory or marker files
- Using that as workspace root

**Requires:** Core BMAD workflow engine updated

### Option 4: Environment Variable
```bash
set BMAD_WORKSPACE=d:\BMAD video generator
```

**Requires:** Workflows updated to read environment variables

## Workspace Structure

```
d:\BMAD video generator/
├── .bmad/
│   ├── workspace-config.yaml    ← Workspace-specific config
│   └── README.md                 ← This file
├── docs/
│   ├── prd.md                    ← Product requirements
│   ├── epics.md                  ← Epic breakdown
│   ├── architecture.md           ← Solution architecture
│   ├── tech-spec-epic-1.md       ← Epic 1 technical spec
│   ├── bmm-workflow-status.md    ← Workflow status tracker
│   └── stories/                  ← User stories
│       ├── story-1.1.md
│       ├── story-1.2.md
│       └── ...
├── ai-video-generator/           ← Application codebase
│   ├── src/
│   ├── package.json
│   └── ...
└── BMAD-METHOD/                  ← BMAD framework installation
    └── bmad/bmm/config.yaml      ← Global BMAD config (currently hardcoded)
```

## Recommendations

### For This Project (Now)
**Status:** Working with current fix
**Action:** No immediate changes needed

### For Multi-Project Support (Future)
1. Implement workspace detection in BMAD core
2. Update agents to check for `.bmad/workspace-config.yaml`
3. Fall back to global config if workspace config not found
4. Restore generic paths to global BMAD config

### For New Projects
When starting a new project with BMAD:
1. Create `.bmad/workspace-config.yaml` in project root
2. Copy template from this file
3. Update project-specific values
4. Either:
   - Update global BMAD config paths for that project, OR
   - Wait for BMAD to support workspace detection

---

**Created:** 2025-11-02
**Project:** AI Video Generator
**BMAD Version:** 6.0.0-alpha.0
