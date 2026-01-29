# Epic Summary

| Epic | Name | Stories | Dependencies | Phase |
|------|------|---------|--------------|-------|
| 1 | Conversational Topic Discovery + Persona System | 8 | None | Foundation |
| 2 | Content Generation Pipeline + Voice Selection | 6 | Epic 1 | Core |
| 3 | Visual Content Sourcing (YouTube API + Duration Filtering + Segment Downloads + Advanced CV Filtering) | 9 | Epic 2 | Core |
| 4 | Visual Curation Interface | 6 | Epic 2, 3 | Core |
| 5 | Video Assembly & Output | 6 | Epic 2, 4 | Delivery |
| 6 | Channel Intelligence & Content Research (RAG-Powered + Quick Production Flow) | 9 | Epic 1, 5 | Enhancement |
| 7 | LLM Provider Enhancement (Groq Integration + Pluggable Architecture) | 3 | Epic 1, 2 | Enhancement |
| 8 | DVIDS Video Provider API Integration | 5 | Epic 6 | Enhancement |
| 9 | NASA Video Provider API Integration | 6 | Epic 6, Epic 8 | Enhancement |

**Total Stories:** 52 stories (Epics 1-6: 43 stories + Epic 7: 3 stories + Epic 8: 5 stories + Epic 9: 6 stories + Epic 5: +1 story (5.6))

**Notes:**
- Epic 1 includes Story 1.8 for the unified persona system (Feature 1.9) with 4 preset personas
- Epic 3 includes Stories 3.2b, 3.7, and 3.7b for advanced CV content filtering
- Story 2.4 uses the project's selected persona for script generation style
- Epic 6 implements PRD Feature 2.7 (RAG-Powered Channel Intelligence) with ChromaDB vector search
- Epic 6 includes Stories 6.8a and 6.8b for Quick Production Flow (one-click video creation from topic suggestions)
- Epic 7 implements Groq integration with ultra-fast inference and pluggable provider architecture
- Epic 8 migrates DVIDS from web scraping to official API with HLS download support
- Epic 9 migrates NASA from web scraping to official API with direct MP4 download, reusing Epic 8 infrastructure
- Epic 9 includes Story 9.6 for cache cleanup integration using Epic 5 Story 5.6 service
- Epic 5 includes Story 5.6 for post-generation cache cleanup (automatic deletion of intermediate files)

**Recommended Development Order:**
1. **Core Features:** Epic 1 → Epic 2 → Epic 3 → Epic 4 → Epic 5 ✅ Complete
2. **Enhancement:** Epic 6 (in development)
3. **Provider Enhancements:** Epic 7 (LLM providers) ✅ Complete
4. **Content Source Enhancements:** Epic 8 (DVIDS API migration) ✅ Complete
5. **Content Source Enhancements:** Epic 9 (NASA API migration, reuses Epic 8 infrastructure)

**Critical Path:** Epics 1-5 are sequential and comprise the core functionality. Epic 6 enhances the brainstorming experience with channel-specific context. Epic 7 adds LLM provider flexibility. Epic 8 improves domain-specific content sourcing reliability with infrastructure patterns. Epic 9 applies Epic 8 patterns to NASA with infrastructure reuse.

---
