# Future Epics

Based on PRD Section 2 (Future Enhancements) and current implementation status:

**Completed Epics (No Longer Future):**
- ~~Epic 7: LLM Provider Enhancement~~ ✅ **COMPLETE** - Groq integration with pluggable architecture
- ~~Epic 8: DVIDS API Integration~~ ✅ **COMPLETE** - Official DVIDS Search API migration
- ~~Epic 9: NASA API Integration~~ 🔄 **PLANNED** - Official NASA API migration (Epic 9 document created)

---

## Future Epics (Re-numbered)

### Epic 10: Advanced Editing & Customization

**Goal:** Enable users to refine generated content without regenerating entire videos.

**Features:**
- Script editing in UI (edit generated scripts per scene)
- Voiceover regeneration per scene (regenerate voiceover for individual scenes)
- Voice switching (change voice for specific scenes without regenerating all)

**Technical Approach:**
- Add script editing interface to project management UI
- Implement selective voiceover regeneration (per-scene vs full project)
- Add voice switching capability with consistency handling

**User Value:** Creators can fine-tune their videos without time-consuming full regeneration.

**Story Estimate:** 3-4 stories

---

### Epic 11: Enhanced Visual Control

**Goal:** Provide users with manual search capabilities and text overlay functionality.

**Features:**
- Manual visual search within UI (search DVIDS/NASA/YouTube directly from curation interface)
- Text overlays (add text/typography to video scenes)
- Overlay customization (fonts, colors, positioning, animation)

**Technical Approach:**
- Add manual search interface to visual curation UI
- Implement text overlay rendering in video assembly pipeline
- Add overlay customization controls

**User Value:** Creators have more control over visual selection and can add branding/text to videos.

**Story Estimate:** 4-5 stories

---

### Epic 12: Stock Footage API Integration (Pexels, Pixabay)

**Goal:** Add professional stock footage sources as alternatives or supplements to domain-specific providers.

**Technical Approach:**
- Integrate Pexels API for high-quality stock video clips
- Integrate Pixabay API for additional royalty-free content
- Implement source selection/priority system (YouTube vs DVIDS vs NASA vs stock)
- Allow mixed sourcing (some scenes from different providers)

**User Value:** Access to professional, commercial-grade stock footage for creators who need more polished visuals or want broader content variety.

**Story Estimate:** 3-4 stories per API integration

**Infrastructure Reuse:** Follows Epic 8/Epic 9 API provider pattern

---

### Epic 13: Custom Persona Creation

**Goal:** Enable users to create and manage custom personas beyond the 4 preset personas.

**Features:**
- User-defined personas (custom tone, style, format preferences)
- Persona import/export (share personas with others, backup custom personas)
- Advanced LLM settings (temperature, max tokens, frequency penalty)

**Technical Approach:**
- Add persona creation UI with tone/style/format controls
- Implement persona serialization (JSON export/import)
- Expose LLM configuration options for advanced users

**User Value:** Advanced users can create personas that match their exact brand voice and content style.

**Story Estimate:** 3-4 stories

---

## Historical Notes

**Epic Reassignments (for reference):**
- Voice selection moved from Future Epic 6 to Core Epic 2 (original planning)
- Preset persona system moved from Epic 9 to Core Epic 1 (Story 1.8)
- Channel Intelligence (RAG) moved from Future Epic 6 to Enhancement Epic 6 (2025-11-29)
- Epic 7 reassigned from "Advanced Editing" to "LLM Provider Enhancement" (2025-12)
- Epic 8 reassigned from "Enhanced Visual Control" to "DVIDS API Integration" (2026-01)
- Epic 9 reassigned from "Stock Footage APIs" to "NASA API Integration" (2026-01)

**Current Epic Count:** 50 stories total (Epics 1-6: 43 + Epic 7: 3 + Epic 8: 5 + Epic 9: 5)

**Next Future Epic:** Epic 10 (Advanced Editing & Customization)
