# 6. Chat Interface (Epic 1)

### 6.1 Overview

**Purpose:** Provide natural conversational interface for brainstorming video ideas with AI assistant.

**User Value:** Creators can explore ideas naturally, receive guidance, and refine topics before committing to production. AI maintains context across multiple turns.

**Key Features:**
- Message history display (user + assistant messages)
- Text input for user messages
- Loading indicator while AI responds
- Auto-scroll to latest message
- Topic confirmation trigger
- Context maintenance across conversation

### 6.2 Visual Design

**Chat Interface Layout:**

```
┌─────────────────────────────────────┐
│  🎬 Mars colonization ideas         │  <- Project name header
├─────────────────────────────────────┤
│                                     │
│  [Assistant Message Bubble]         │
│  👤 "Hi! What video would you..."   │
│                                     │
│  [User Message Bubble]              │
│  "I want to make a video about..."  │
│                                     │
│  [Assistant Message Bubble]         │
│  🤖 "Great! Should we focus on..."  │
│                                     │
│  ↓ (scroll) ↓                       │
│                                     │
├─────────────────────────────────────┤
│  [Message Input]                    │
│  Type your message... [Send]        │
└─────────────────────────────────────┘
```

**Chat Container:**
- **Max Width:** 800px (centered in main content area)
- **Padding:** 24px (lg) on sides
- **Background:** `#0f172a` (Slate 900)
- **Scroll:** Smooth scrolling, auto-scroll to bottom on new message

**Message List:**
- **Display:** Flex column, gap 16px (md) between messages
- **Alignment:** User messages right-aligned, assistant messages left-aligned
- **Padding Bottom:** 100px (space for input at bottom)

**Message Bubble (User):**
- **Background:** `#6366f1` (Indigo 500)
- **Color:** `#ffffff` (white text)
- **Border Radius:** 16px (top-left, top-right, bottom-left), 4px (bottom-right)
- **Padding:** 12px 16px
- **Max Width:** 70% of container
- **Align Self:** flex-end (right side)
- **Font Size:** 1rem (16px)
- **Line Height:** 1.5
- **Word Break:** break-word (prevents overflow)

**Message Bubble (Assistant):**
- **Background:** `#1e293b` (Slate 800)
- **Color:** `#f8fafc` (Slate 50)
- **Border Radius:** 16px (top-left, top-right, bottom-right), 4px (bottom-left)
- **Padding:** 12px 16px
- **Max Width:** 70% of container
- **Align Self:** flex-start (left side)
- **Font Size:** 1rem (16px)
- **Line Height:** 1.5
- **Word Break:** break-word
- **Icon:** 🤖 or avatar icon (optional, shown to left of bubble)

**Message Metadata:**
- **Timestamp:** Shown on hover or for older messages
- **Font Size:** 0.75rem (12px)
- **Color:** `#94a3b8` (Slate 400)
- **Position:** Below bubble, aligned with bubble side

**Message Input Area:**
- **Position:** Fixed at bottom of chat container
- **Background:** `#1e293b` (Slate 800)
- **Border Top:** 1px solid `#334155` (Slate 700)
- **Padding:** 16px (md)
- **Sticky:** Always visible (sticky position)

**Message Input Field:**
- **Type:** Textarea (auto-expanding, max 5 lines)
- **Placeholder:** "Type your message..."
- **Background:** `#0f172a` (Slate 900)
- **Border:** 1px solid `#334155` (Slate 700)
- **Border Radius:** 8px
- **Padding:** 12px
- **Font Size:** 1rem (16px)
- **Color:** `#f8fafc` (Slate 50)
- **Focus:** Border color changes to `#6366f1` (Indigo 500), 2px width
- **Resize:** Vertical only (auto-expands up to 5 lines)

**Send Button:**
- **Position:** Inside input field, right side (absolute positioning)
- **Style:** Icon button (paper plane icon ➤)
- **Background:** `#6366f1` (Indigo 500)
- **Size:** 40px x 40px
- **Border Radius:** 6px
- **Color:** White
- **Hover:** Darker indigo (`#4f46e5`)
- **Disabled:** Gray when input empty or AI responding
- **Action:** Sends message on click or Enter key press

### 6.3 Interaction Patterns

**Sending Message:**
1. User types message in input field
2. User presses Enter (or clicks Send button)
3. Message added to history as user message (right-aligned, indigo bubble)
4. Input field clears immediately
5. Loading indicator appears (typing dots animation in assistant bubble)
6. AI response streams in or appears as complete message
7. Assistant message added to history (left-aligned, slate bubble)
8. Auto-scroll to bottom to show new messages

**Triggering Video Creation:**
- **Command Pattern:** User says "make a video about [topic]" or "create a video" after discussion
- **Detection:** AI recognizes command intent, extracts topic from context
- **Response:** AI confirms topic: "Understood. Shall I proceed with the video on '[topic]'?"
- **Confirmation:** User confirms with "yes", "correct", "proceed", etc.
- **Action:** Topic Confirmation Dialog appears (Story 1.7), workflow advances

**Auto-Scrolling:**
- Scrolls to bottom whenever new message arrives
- User can scroll up to read history (auto-scroll disabled while user scrolling)
- Resume auto-scroll when user reaches bottom 100px range

**Loading State:**
- Typing indicator (three animated dots) in assistant message bubble
- Send button disabled
- Input field disabled (can't send while AI responding)
- Loading text: "AI is thinking..." (optional, subtle)

### 6.4 States

**Empty State (First Message):**
- Show welcome message from AI:
  - "👋 Hi! I'm your AI video assistant. What video would you like to create today? Share your ideas and I'll help you refine them into a compelling video concept."
- This is the first assistant message, auto-generated when project created

**Conversation in Progress:**
- Multiple user + assistant messages
- Scrollable history
- Input field active and ready

**Loading (AI Responding):**
- Typing indicator visible
- Input disabled
- Send button disabled
- Previous messages visible

**Error State:**
- Error message in assistant bubble: "Sorry, I couldn't process that. Please try again."
- Retry button or prompt to resend message
- Error toast notification (top-right)

---
