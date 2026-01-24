# 7.9. Topic Suggestions UI (Feature 2.7)

**Location:** Channel Intelligence page, below RAG status

**Purpose:** Display AI-generated video ideas with one-click video creation.

### 7.9.1 Topic Suggestions Panel

```
┌─────────────────────────────────────────────────────────────────┐
│  🎯 Topic Suggestions                          [Get New Ideas]  │
│  AI-generated video ideas based on your channel and niche      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Why Modern Drone Warfare is Changing Naval Strategy    │   │
│  │                                                          │   │
│  │  Analysis of how autonomous drones are reshaping        │   │
│  │  maritime combat doctrine and carrier operations...     │   │
│  │                                                          │   │
│  │  📰 Trending in News  •  92% match to your style        │   │
│  │                                                          │   │
│  │                                      [Create Video]      │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  F-35 Maintenance Costs: The Hidden Crisis              │   │
│  │                                                          │   │
│  │  Deep dive into the lifecycle costs and maintenance     │   │
│  │  challenges facing the F-35 program...                  │   │
│  │                                                          │   │
│  │  📺 Competitor Gap  •  87% match to your style          │   │
│  │                                                          │   │
│  │                                      [Create Video]      │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  China's New Aircraft Carrier: Capabilities Analysis    │   │
│  │                                                          │   │
│  │  Technical breakdown of the Fujian carrier and what     │   │
│  │  it means for Pacific power balance...                  │   │
│  │                                                          │   │
│  │  🔥 Your Channel Style  •  95% match                    │   │
│  │                                                          │   │
│  │                                      [Create Video]      │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 7.9.2 TopicSuggestionCard Component

**Specifications:**

| Property | Value |
|----------|-------|
| **Width** | 100% (max 720px) |
| **Background** | Slate 800 |
| **Border** | 1px solid Slate 700 |
| **Border Radius** | 12px |
| **Padding** | 20px |
| **Margin Bottom** | 16px |

**Content Layout:**

| Element | Style |
|---------|-------|
| **Title** | 18px font-semibold, Slate 100, line-height 1.4 |
| **Description** | 14px, Slate 400, max 2 lines with ellipsis |
| **Source Badge** | 12px, pill shape, colored by type |
| **Match Score** | 14px, Slate 300, percentage display |
| **Create Video Button** | Primary button, right-aligned |

**Source Badge Colors:**

| Source | Background | Text |
|--------|------------|------|
| 📰 Trending in News | Amber 900 | Amber 200 |
| 📺 Competitor Gap | Purple 900 | Purple 200 |
| 🔥 Your Channel Style | Indigo 900 | Indigo 200 |
| 🌐 Industry Trend | Cyan 900 | Cyan 200 |

### 7.9.3 Create Video Button States

**Default State (Defaults Configured):**
```
┌───────────────────┐
│   Create Video    │  ← Primary button (Indigo 500)
└───────────────────┘
```

**Hover State:**
```
┌───────────────────┐
│   Create Video    │  ← Darker indigo, slight scale up
└───────────────────┘
    ┌─────────────────────────────────────┐
    │ One-click: Uses your default voice  │  ← Tooltip
    │ (Sophia) and persona (Documentary)  │
    └─────────────────────────────────────┘
```

**No Defaults Configured State:**
```
┌─────────────────────────┐
│ ⚙️ Configure Defaults   │  ← Secondary button
└─────────────────────────┘
```
- Clicking navigates to `/settings/quick-production`

**Loading State (After Click):**
```
┌───────────────────┐
│   ⏳ Creating...  │  ← Disabled, spinner
└───────────────────┘
```

### 7.9.4 Quick Production Confirmation Toast

**Displayed after clicking "Create Video":**

```
┌─────────────────────────────────────────────────────────────────┐
│  🚀 Creating Video                                              │
│                                                                 │
│  Topic: "Why Modern Drone Warfare is Changing Naval Strategy" │
│                                                                 │
│  Using:                                                         │
│  • Voice: Sophia (af_nova)                                     │
│  • Persona: Documentary Filmmaker                               │
│                                                                 │
│  Redirecting to progress page...                               │
└─────────────────────────────────────────────────────────────────┘
```

**Toast Specifications:**
- **Position:** Top-right
- **Width:** 400px
- **Duration:** 3 seconds (auto-dismiss)
- **Background:** Slate 800
- **Border:** 1px solid Indigo 500
- **Icon:** Rocket emoji

---
