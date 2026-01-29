# Project Context for AI Agents

**Project:** AI Video Generator
**Last Updated:** 2026-01-28

## Project Overview

This is an AI-powered video generation system that creates videos from text prompts using various AI providers (DVIDS, NASA APIs, etc.).

## Technology Stack

### Backend
- **Python 3.x** with async/await patterns
- **FFmpeg** for video processing and generation
- **MCP (Model Context Protocol)** for provider integrations

### API Integrations
- **DVIDS API** - Military video source
- **NASA API** - Space imagery/video
- **GLM Models** (via Z.ai) - Primary LLM provider
  - glm-4.7 for complex tasks
  - glm-4.5-air for lightweight tasks

### Key Dependencies
- `uv` - Package management
- `pydantic` - Data validation
- `pyyaml` - Configuration

## Project Structure

```
D:\BMAD video generator/
├── docs/                    # Documentation (PRD, architecture, epics)
│   ├── architecture/        # Architecture decisions and design
│   ├── epics/              # Epic definitions
│   ├── sprint-artifacts/   # Sprint tracking and stories
│   └── project_context.md  # This file
├── _bmad-output/           # Generated artifacts (gitignored)
├── bmad-assist/            # BMAD framework installation
└── scripts/                # Utility scripts
```

## Development Workflow

We use **BMAD (Business Model-Architecture-Development)** methodology:

1. **Epic Definition** (`docs/epics/`) - High-level feature requirements
2. **Story Creation** - Break epics into implementable stories
3. **Story Validation** - Review stories for completeness
4. **Development** - Implement story requirements
5. **Code Review** - Multi-provider validation
6. **Testing** - E2E and integration tests

## Critical Rules for AI Agents

### Do's
- Always check `docs/sprint-artifacts/sprint-status.yaml` for current state
- Use relative paths from project root
- Follow BMAD workflow phases in order
- Reference existing patterns in `docs/architecture/`

### Don'ts
- Never hardcode absolute paths (use `ProjectPaths` from bmad-assist)
- Don't skip validation phases
- Don't commit files in `_bmad-output/` or `.bmad-assist/`
- Avoid modifying bundled BMAD workflows in `bmad-assist/`

## Configuration

- **BMAD Config:** `bmad-assist.yaml` (project root and bmad-assist dir)
- **GLM Settings:** `~/.claude/glm.json`
- **Sprint Status:** `docs/sprint-artifacts/sprint-status.yaml`

## Current Sprint Status

- **Active Epic:** Epic 9 (NASA API Integration)
- **Active Story:** 9.1
- **Next Phase:** CREATE_STORY

## Common Patterns

### Adding a New Story
1. Create story in `docs/sprint-artifacts/stories/`
2. Update `sprint-status.yaml`
3. Run story validation before development

### Provider Configuration
```yaml
providers:
  master:
    provider: claude-subprocess
    model: opus
    model_name: glm-4.7
    settings: ~/.claude/glm.json
```

### Video Processing Pipeline
1. Fetch source content (DVIDS/NASA)
2. Process with FFmpeg
3. Generate metadata
4. Store in `_bmad-output/implementation-artifacts/`

## Important Notes

- **Windows Platform:** This project runs on Windows - use proper path handling
- **FFmpeg Required:** Video processing requires FFmpeg in PATH
- **GLM Primary:** We use GLM models via Z.ai API, not Anthropic directly
- **MCP Integration:** All API calls go through MCP providers

## Contact/Support

- BMAD Framework: `bmad-assist/` directory
- Issues: Check `docs/sprint-artifacts/` for current sprint blockers
