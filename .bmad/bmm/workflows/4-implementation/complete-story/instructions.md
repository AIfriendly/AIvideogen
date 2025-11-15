# Complete Story Workflow Instructions

## Purpose
Automate the full story lifecycle from creation to implementation, testing, and GitHub push. This workflow is orchestrated by the **SM (Scrum Master)** agent (or dynamically selected agent in enhanced mode) who coordinates multiple sub-agents while preserving context and minimizing duplicate file reads.

## Enhancement Mode
This workflow supports two modes:
- **Standard Mode** (default): Original behavior with sequential execution
- **Enhanced Mode** (opt-in): Advanced features including parallel testing, self-learning, and dynamic agent selection

To enable Enhanced Mode, set `ENHANCEMENT_MODE: enhanced` in your config.yaml

## CRITICAL EXECUTION POLICY

**🚨 CONTINUOUS EXECUTION REQUIRED:**
- This workflow MUST run **Steps 1-11 without interruption**
- **DO NOT** pause mid-workflow to ask user if they want to continue
- **DO NOT** stop after Step 6 asking "What would you like to do?"
- **RUN ALL STEPS AUTOMATICALLY** from start to finish
- **ONLY pause at Step 11** (completion report) for user to manually test features
- **Purpose:** Minimize interruptions - work shouldn't pause waiting for approval between steps - the exception to this is if an issue arises that warrants my intevention

**User Interaction Points:**
- ✅ **Before workflow:** User triggers `*complete-story` command
- ❌ **During workflow:** NO user input required (Steps 1-11 run automatically)
- ✅ **After workflow:** User manually tests features, then runs `*complete-story` again for next story

## SM Agent Orchestration with Context Optimization
This workflow is executed by the **SM (Scrum Master)** agent, which:
1. **Pre-loads common documents ONCE** (config, epics, prd, tech spec, workflow-status, architecture)
2. **Maintains documents in memory** throughout the workflow execution
3. **Spawns sub-agents using Task tool** for specialized work (Architect review, Dev implementation)
4. **Passes document context** to each sub-agent by including full content in prompt text
5. **Eliminates duplicate file reads** (80% reduction in file I/O operations)
6. **Preserves context across agents** (faster execution, lower token usage)

**CRITICAL INSTRUCTION FOR SM ORCHESTRATOR:**
When instructions say "Spawn X agent", you MUST:
- Use the Task tool to spawn the specialized agent
- Include pre-loaded document content in the agent's prompt parameter
- Instruct the agent "DO NOT read these files - they are provided above in your context"
- Wait for agent completion before proceeding to next step

**Efficiency Gains:**
- **Before (without context-manager):** ~34+ file reads with duplicates across agents
- **After (with context-manager):** ~6 file reads total (80% reduction)
- **Token savings:** ~50k+ tokens across 6+ agent spawns
- **Time savings:** 6-12 seconds eliminated from file search and duplicate reads. Also, this eliminates all the time wasted when agents are waiting for my response to continue work

## What This Workflow Does

### **STANDARD MODE (Default)**

#### **Phase 0: Cleanup (Conditional)**
1. **Dev Agent** approves previous story (if exists) - marks Done, advances queue (`story-approved` workflow)

#### **Phase 1: Story Creation & Review**
2. **SM Agent** creates draft story using `create-story` workflow
3. **Architect Agent** reviews for technical feasibility and alignment
4. **If issues found:** SM Agent regenerates story with fixes (max 3 iterations)
5. **If approved:** Continue to Phase 2

#### **Phase 2: Preparation**
6. **SM Agent** marks story as Ready for Development (`story-ready` workflow)
7. **SM Agent** generates Story Context XML (`story-context` workflow)

#### **Phase 3: Implementation & Verification**
8. **Dev Agent** implements all tasks (`dev-story` workflow)
9. **Dev Agent** runs build verification (`npm run build`) and fixes any errors
10. **SM Agent** tests database operations via Supabase MCP (if applicable)

#### **Phase 4: Finalization**
11. **Dev Agent** pushes changes to GitHub with auto-generated commit message (only if build succeeds)
12. **SM Agent** generates completion report with next steps

### **ENHANCED MODE (When ENHANCEMENT_MODE=enhanced)**

#### **Phase 0: Prerequisites & Validation (NEW)**
0. **Dynamic Agent** checks environment prerequisites (npm, git, disk space, API keys)
0.5. **Product Manager** validates market alignment (if enabled)

#### **Phase 1: Story Creation & Multi-Aspect Review**
2. **Dynamically Selected Agent** creates story based on type (frontend→Sally, backend→Winston, etc.)
3. **Parallel Reviews:** Technical (Winston), UX (Sally), Test (Murat), Business (Mary) - all run simultaneously
4. **Smart Regeneration:** Error categorization and learned fixes applied
5. **Auto-approval** if confidence > 95%

#### **Phase 2: Enhanced Preparation**
6. **Smart Story Approval** with risk assessment and effort estimation
7. **Enhanced Context Generation** with design tokens, performance budgets, and learned patterns

#### **Phase 3: Phased Implementation & Comprehensive Testing**
8. **Phased Implementation:**
   - 7a: Code generation & scaffolding (parallel)
   - 7b: Core implementation with learned patterns
   - 7c: Unit test creation (parallel)
   - 7d: Integration testing
   - 7e: Local validation with security scanning
9. **Intelligent Build** with error categorization and auto-fixes
10. **Parallel Testing Suite:**
   - Unit, Integration, E2E tests (simultaneous)
   - Performance regression checks
   - Visual regression testing
   - Accessibility validation (WCAG 2.1 AA)
   - Database testing with rollback verification

#### **Phase 4: Advanced Finalization**
9.5. **Feature Flag Setup** for gradual rollout (if new feature)
9.6. **Rollback Plan Generation** with automated scripts
11. **Smart Git Operations** with semantic commits and PR creation
11.5. **Documentation Auto-Deployment** to docs site, API portal, wiki
12. **Enhanced Report** with metrics, learned patterns, and rollout plan

---

## When to Use This Workflow

**✅ Use complete-story when:**
- You want full automation from story creation to GitHub push
- The story is well-defined in epics.md with clear requirements
- You have Supabase MCP configured for database testing
- You want minimal manual intervention

**❌ Don't use complete-story when:**
- Story requirements are ambiguous (use `create-story` manually first)
- You want to review architect feedback before regenerating
- Implementation requires manual testing beyond database operations
- Story involves complex infrastructure changes requiring human oversight

---

## Execution Steps

### **Step 0: Context-Manager Initialization (CRITICAL)**

**🚨 EXECUTION MODE: FULLY AUTOMATED**
- Execute Steps 1-11 **continuously without stopping**
- **DO NOT pause** to ask user questions between steps
- **DO NOT offer options** like "What would you like to do next?"
- Only user interaction: Final completion report (Step 11) for manual testing

**BEFORE executing any sub-agents, the context-manager MUST:**

1. **Load all documents from `context_documents` section:**
   ```yaml
   # Required documents (load first)
   - config: "{project-root}/bmad/bmm/config.yaml"
   - epics: "{output_folder}/epics.md"
   - prd: "{output_folder}/prd.md"
   - workflow_status: "{output_folder}/workflow-status.md"

   # Optional documents (load if exists)
   - solution_architecture: "{output_folder}/architecture.md"

   # Dynamic documents (discover based on workflow-status)
   - tech_spec: "{output_folder}/tech-spec-epic-{epic_num}.md"
     (where epic_num is extracted from workflow_status TODO_STORY or IN_PROGRESS_STORY)
   ```

2. **Extract session variables from config:**
   ```yaml
   user_name: from config.yaml
   communication_language: from config.yaml
   output_folder: from config.yaml
   dev_story_location: from config.yaml
   ```

3. **Store all documents in context-manager memory:**
   - Documents are now loaded ONCE
   - Will be automatically available to ALL sub-agents
   - No sub-agent needs to read these files again
   - Context-manager maintains this state throughout entire workflow

**Token Efficiency:**
- Documents loaded: ~6 files (~15k-20k tokens total)
- Documents in context-manager memory: Cached for all agents
- Estimated savings: ~50k+ tokens across 6+ agent spawns (SM × 3, Architect × 2, Dev × 1)
- Each agent receives pre-loaded context automatically

---

### **Step 1: Approve Previous Story (Conditional)**

**Condition:** workflow-status has `IN_PROGRESS_STORY` populated

**Agent:** `general-purpose` (acting as Dev)
**Task:** Execute `story-approved` workflow

**Purpose:** Before starting the next story, mark the previous story (that you just tested) as Done and advance the story queue.

**Process:**
1. **Check for IN_PROGRESS story in workflow-status** (already loaded in context-manager memory)
2. **If IN_PROGRESS_STORY exists:**
   - Read the story file at `{story_dir}/{in_progress_story_file}`
   - Update story status from "Ready" OR "Implemented" → "Done"
   - Add completion notes with date to Dev Agent Record section
   - Invoke `workflow-status` update action `complete_story`:
     - Move IN_PROGRESS → DONE
     - Move TODO → IN_PROGRESS
     - Move BACKLOG → TODO
3. **If no IN_PROGRESS_STORY:**
   - Skip this step (first story in sequence)

**Expected Output:**
- Previous story marked Done
- Story queue advanced
- Next story moved to IN_PROGRESS (becomes the story to create in Step 2)

**On Failure:** Abort workflow (cannot proceed without clean queue state)

**Workflow Benefit:** Maintains clean story lifecycle - test → approve → next story creation

---

### **Step 2: Load Workflow Configuration**

```bash
# Load this workflow file
workflow_file = "{project-root}/bmad/bmm/workflows/4-implementation/complete-story/workflow.yaml"
```

### **Step 3: Discover Next Story**

**Context-manager reads workflow-status from memory (already loaded in Step 0):**
```bash
# No file read needed - workflow_status already in context
# Extract:
# - TODO_STORY: Next story to work on (e.g., "3.5")
# - IN_PROGRESS_STORY: Current story (should be empty or completed)
# - Epic number and story number
```

### **Step 4: Spawn SM Agent for Story Creation**

**CRITICAL:** Context-manager MUST use the Task tool to spawn the SM agent. Do not just describe what should happen - **actually execute the Task tool call**.

**Agent:** `general-purpose` (acting as SM)
**Task:** Execute `create-story` workflow
**How to Execute:**
```
Use Task tool with:
- subagent_type: "general-purpose"
- description: "Create Story {epic_num}.{story_num}"
- prompt: Include pre-loaded context (epics, PRD, tech_spec, workflow-status, config) in the prompt text
```

**Inputs:**
- Epic number (from workflow-status in context)
- Story number (from workflow-status in context - advanced by Step 1 if previous story existed)
- Non-interactive mode: `true`
- **Context passed in prompt:** epics, PRD, tech_spec, solution_architecture (from context-manager memory)

**Expected Output:**
- Story file created at `{story_dir}/story-{epic_num}.{story_num}.md`
- Story status: Draft

**Note:** SM agent receives pre-loaded documents via prompt text - no file reads needed!

### **Step 5: Spawn Architect Agent for Review**

**CRITICAL:** Context-manager MUST use the Task tool to spawn the architect-reviewer agent.

**Agent:** `architect-reviewer`
**Task:** Review story for technical feasibility
**How to Execute:**
```
Use Task tool with:
- subagent_type: "architect-reviewer"
- description: "Review Story {epic_num}.{story_num}"
- prompt: Include story file path and pre-loaded context in prompt
```

**Inputs:**
- Story file path (from Step 4)
- **Context passed in prompt:** tech_spec, epics, solution_architecture (from context-manager memory)

**Expected Output:**
- Review verdict: `APPROVED` or `REQUIRES CHANGES`
- List of issues (if any)
- List of recommendations

**Note:** Architect agent receives pre-loaded documents via prompt - no duplicate file reads!

### **Step 6: Conditional - Regenerate Story (if needed)**

**Condition:** Architect verdict == `REQUIRES CHANGES`

**Agent:** `general-purpose` (acting as SM)
**Task:** Execute `create-story` workflow WITH architect feedback
**Inputs:**
- Architect feedback (from Step 5)
- Same epic/story numbers
- Overwrite existing story file

**Max Iterations:** 2
**After max iterations:** Prompt user for manual intervention

**Loop:** Return to Step 5 for architect re-review

### **Step 7: Mark Story Ready**

**Condition:** Architect verdict == `APPROVED`

**Agent:** `general-purpose` (acting as SM)
**Task:** Execute `story-ready` workflow
**Inputs:**
- Story file path (from Step 4 or Step 6)

**Expected Output:**
- Story status updated to: Ready
- Workflow-status updated

### **Step 8: Generate Story Context**

**Agent:** `general-purpose` (acting as SM)
**Task:** Execute `story-context` workflow
**Inputs:**
- Story file path

**Expected Output:**
- Story Context XML created at `{story_dir}/story-context-{epic_num}.{story_num}.xml`

### **Step 9: Implement Story**

**Agent:** `general-purpose` (acting as Dev)
**Task:** Execute `dev-story` workflow
**Inputs:**
- Story file path
- Story Context XML path

**Expected Output:**
- List of files created
- List of files modified
- Test results (pass/fail)
- Implementation status: `completed` or `blocked`

**On Failure:**
- Generate error report
- Abort workflow
- Notify user of blockers

### **Step 10: Build Verification (CRITICAL)**

**Condition:** Step 9 status == `completed`

**Agent:** `general-purpose` (acting as Dev)
**Task:** Run local build and fix any errors before git push

**Build Process:**
1. **Run build command:**
   ```bash
   npm run build
   ```

2. **If build succeeds:**
   - Capture build output
   - Proceed to Step 10 (Database Testing) or Step 11 (Git Push)

3. **If build fails:**
   - Capture all TypeScript/build errors
   - Analyze each error (type mismatches, missing imports, etc.)
   - Fix errors systematically:
     - Update type definitions
     - Fix property name mismatches (e.g., field_name → name)
     - Add missing imports
     - Resolve any schema compatibility issues
   - Re-run build
   - Repeat until build succeeds (max 3 attempts)

**Expected Output:**
- Build status: `success` or `failed`
- Build errors: List of errors if any
- Fixes applied: List of fixes if errors were found

**On Failure (after max retries):**
- Report all unresolved build errors
- Abort workflow (DO NOT proceed to git push)
- Generate detailed error report for manual intervention

**CRITICAL:** Never push code that doesn't build. This step is mandatory before git operations.

### **Step 11: Test Database Operations (if applicable)**

**Condition:** Story involves database changes (check story tasks for migration/schema keywords)

**Agent:** `general-purpose` (acting as SM)
**Task:** Execute database tests via Supabase MCP

**Test Coverage:**
1. **RLS Policies**
   - Create second test user
   - Test SELECT (user sees only own data)
   - Test INSERT (user creates for self only)
   - Test UPDATE (cross-user blocked)
   - Test DELETE (cross-user blocked)

2. **Migration Verification**
   - Execute migration SQL via `mcp__supabase__apply_migration`
   - Verify schema changes via `mcp__supabase__list_tables`
   - Check data integrity with sample queries

3. **Security Advisors**
   - Run `mcp__supabase__get_advisors` with type: `security`
   - Check for RLS disabled warnings
   - Verify no new critical issues

**Expected Output:**
- Test results: Pass/fail for each test
- Security advisor summary
- Data migration stats (rows affected, etc.)

**On Failure:**
- Report failed tests
- Continue to Step 11 (do not abort)

### **Step 12: Push to GitHub**

**Condition:** Step 10 build_status == `success` AND auto_push_to_github == `true`

**Agent:** `general-purpose` (acting as Dev)
**Task:** Git commit and push

**Commit Message Format:**
```
Implement Story {epic_num}.{story_num}: {story_title}

{Summary of changes}

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

**Commands:**
```bash
git add .
git commit -m "{commit_message}"
git push
```

**After Successful Push:**
- Update story file status from "Ready" → "Implemented"
- Update story file with completion date
- This signals to Step 1 (next workflow run) that story is ready for approval

**On Failure:**
- Report git errors
- Continue to Step 13 (do not abort)
- User can manually push later
- Do NOT update story status to "Implemented" if push fails

### **Step 13: Generate Completion Report**

**Agent:** `general-purpose` (acting as SM)
**Task:** Summarize workflow execution

**Report Sections:**
1. **Story Summary**
   - Story ID, title, status
   - Architect review iterations (if any)

2. **Implementation Summary**
   - Files created (count + list)
   - Files modified (count + list)
   - Tests run (count + results)

3. **Database Testing** (if applicable)
   - Migration status
   - RLS policy test results
   - Security advisor findings

4. **Git Status**
   - Commit hash (if pushed)
   - Push status (success/failed)

5. **Testing Summary** (NEW)
   - Brief list of features/scenarios to manually test
   - Extracted from story acceptance criteria and tasks
   - Focus on user-facing functionality and integration points
   - Example: "Test: Create template, Save template, Load template from list"

6. **Next Steps**
   - If all passed: "Manually test the features above, then run `*complete-story` again for next story"
   - If blocked: "Review errors and fix issues before approval"
   - If manual testing needed: "Perform manual testing of features listed above"

**Output File:** `{output_folder}/complete-story-report-{epic_num}.{story_num}.md`

---

## Error Handling

### **Story Creation Fails**
- **Action:** Abort workflow
- **Reason:** Cannot proceed without story
- **User Action:** Check epics.md for valid story definition, re-run workflow

### **Architect Rejects After Max Iterations**
- **Action:** Pause workflow, prompt user
- **Reason:** Story has fundamental issues requiring human review
- **User Action:** Manually review architect feedback, edit story, re-run from Step 2

### **Implementation Blocked**
- **Action:** Abort workflow, generate report
- **Reason:** Dev agent encountered errors or missing dependencies
- **User Action:** Review implementation errors, fix blockers, re-run `dev-story` workflow

### **Database Tests Fail**
- **Action:** Report failures, continue to GitHub push
- **Reason:** Tests may fail due to environment issues, not blocking
- **User Action:** Review test failures, fix database issues, re-test manually

### **Git Push Fails**
- **Action:** Report error, continue to completion report
- **Reason:** Git errors (conflicts, auth issues) don't invalidate implementation
- **User Action:** Manually resolve git issues and push

---

## Configuration Options

### **max_architect_iterations**
- **Default:** 2
- **Description:** Maximum times to regenerate story based on architect feedback
- **When to increase:** Complex stories with many integration points
- **When to decrease:** Simple CRUD stories with clear requirements

### **enable_database_testing**
- **Default:** `true`
- **Description:** Use Supabase MCP to test database operations
- **When to disable:** Story doesn't involve database changes, or Supabase MCP not available

### **auto_push_to_github**
- **Default:** `true`
- **Description:** Automatically push successful implementations to GitHub
- **When to disable:** Want to manually review changes before pushing

### **skip_manual_approval**
- **Default:** `false`
- **Description:** Skip `story-ready` workflow (story goes directly from Draft to implementation)
- **When to enable:** Full automation with no human approval gates

---

## Prerequisites

### **Required:**
1. ✅ Workflow-status file exists at `{output_folder}/workflow-status.md`
2. ✅ Epics file exists at `{output_folder}/epics.md`
3. ✅ Tech spec exists for current epic (e.g., `tech-spec-epic-3.md`)
4. ✅ Git repository initialized with remote configured

### **Optional:**
5. ⚠️ Supabase MCP configured (for database testing)
6. ⚠️ Solution architecture file exists (improves story quality)
7. ⚠️ Previous stories completed (for integration context)

---

## Example Execution

### **Scenario:** Complete Story 3.6 (after testing Story 3.5)

```yaml
# User runs: *complete-story (after manually testing Story 3.5)

# Workflow execution:
Step 1: Dev approves story-3.5.md
  ✅ Story 3.5 marked Done
  ✅ Queue advanced: 3.6 → IN_PROGRESS, 3.7 → TODO
  ✅ Story file: docs/stories/story-3.5.md → Status: Done

Step 2: SM creates story-3.6.md (Draft)
  ✅ Story file: docs/stories/story-3.6.md
  ✅ Status: Draft

Step 3: Architect reviews story-3.6.md
  ❌ Verdict: REQUIRES CHANGES
  ⚠️ Issues: 3 critical issues found

Step 4: SM regenerates story-3.6.md with architect feedback
  ✅ Story file: docs/stories/story-3.6.md (overwritten)
  ✅ Status: Draft v2

Step 3 (iteration 2): Architect re-reviews story-3.6.md
  ✅ Verdict: APPROVED
  ✅ All issues resolved

Step 5: SM marks story-3.6.md as Ready
  ✅ Status: Ready
  ✅ Workflow-status updated

Step 6: SM generates story-context-3.6.xml
  ✅ Context file: docs/stories/story-context-3.6.xml (279 lines)

Step 7: Dev implements story-3.6
  ✅ Files created: 5
  ✅ Files modified: 8
  ✅ Build passed
  ✅ Status: completed

Step 8: Build verification
  ✅ npm run build: success
  ✅ No TypeScript errors

Step 9: SM tests database operations
  ✅ Migration executed
  ✅ RLS policies tested (all passed)
  ✅ Security advisors: 0 new issues

Step 10: Dev pushes to GitHub
  ✅ Commit: b2c3d4e "Implement Story 3.6: Next Feature"
  ✅ Pushed to origin/main

Step 11: SM generates completion report
  ✅ Report: docs/complete-story-report-3.6.md
  ✅ Next action: Manually test Story 3.6, then run *complete-story again for Story 3.7

# Total time: ~15 minutes (fully automated)
# User manually tests Story 3.6, then runs *complete-story again
```

---

## Troubleshooting

### **"No story found in workflow-status"**
- **Solution:** Check `TODO_STORY` field in workflow-status.md is populated

### **"Architect keeps rejecting story"**
- **Solution:** After 2 iterations, manually review epics.md and tech spec for clarity

### **"Dev agent reports blockers"**
- **Solution:** Check implementation errors, install missing dependencies, re-run workflow

### **"Database tests fail"**
- **Solution:** Verify Supabase MCP connection, check migration SQL syntax

### **"Git push fails with conflicts"**
- **Solution:** Pull latest changes, resolve conflicts, manually push

---

## Success Criteria

**Workflow is successful if:**
1. ✅ Story created and approved by architect
2. ✅ Story marked as Ready
3. ✅ Implementation completed with no blockers
4. ✅ Database tests passed (if applicable)
5. ✅ Changes pushed to GitHub
6. ✅ Completion report generated

**Partial success if:**
- ⚠️ Implementation completed but database tests failed
- ⚠️ Implementation completed but git push failed

**Failure if:**
- ❌ Story creation failed
- ❌ Architect rejected after max iterations
- ❌ Implementation blocked with errors

---

## Future Enhancements

### **Planned Improvements:**
1. **Frontend Testing:** Add Playwright tests for UI changes
2. **Performance Testing:** Benchmark API endpoints before/after
3. **Security Scanning:** Integrate OWASP dependency check
4. **Deployment:** Auto-deploy to staging after successful tests
5. **Notifications:** Slack/email alerts on workflow completion
6. **Rollback:** Auto-rollback if production tests fail

---

## Related Workflows

- **create-story:** Story creation only (no architect review)
- **dev-story:** Implementation only (assumes story is ready)
- **story-context:** Context generation only
- **approve-story:** Final approval and status update (run after complete-story)
