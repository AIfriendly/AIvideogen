# 7.12. Navigation Updates for Quick Production

### 7.12.1 Settings Sidebar Extension

**Add to Settings navigation:**
```
Settings
├── General
├── LLM Provider
├── Voice Settings
├── Channel Intelligence    ← NEW
└── Quick Production        ← NEW
```

### 7.12.2 Main Sidebar Enhancement

**Add Channel Intelligence to main sidebar:**
```
┌─────────────────────┐
│  AI Video Generator │
├─────────────────────┤
│  🏠 Home            │
│  💬 Projects        │
│  ─────────────────  │
│  🧠 Channel Intel   │  ← NEW: Quick access to topic suggestions
│  ─────────────────  │
│  ⚙️ Settings        │
└─────────────────────┘
```

### 7.12.3 User Journey: Quick Production Flow

```
1. User navigates to Channel Intelligence (sidebar)
           ↓
2. Views Topic Suggestions panel
           ↓
3. Clicks "Create Video" on interesting topic
           ↓
4. System validates defaults exist
   ├── No defaults → Redirect to /settings/quick-production
   └── Has defaults → Continue
           ↓
5. Toast notification confirms action
           ↓
6. Redirect to /projects/[id]/progress
           ↓
7. Watch real-time pipeline progress
           ↓
8. Auto-redirect to /projects/[id]/export
           ↓
9. Download and share video
```

---
