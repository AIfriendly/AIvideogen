# State Management Architecture

### Hybrid Approach: Zustand + SQLite

**Client State (Zustand):**
- Active workflow step
- Current conversation messages (recent N)
- UI state (loading, errors, modals)
- Temporary selections (before save)

**Persistent State (SQLite):**
- Project metadata
- Complete conversation history
- Generated content (script, voice selection)
- Clip selections
- File references

### Zustand Store Examples

**Workflow Store:**
```typescript
// stores/workflow-store.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type WorkflowStep = 'topic' | 'voice' | 'script' | 'clips' | 'curation' | 'assembly';

interface WorkflowState {
  projectId: string | null;
  currentStep: WorkflowStep;
  topic: string | null;
  selectedVoice: string | null;
  script: Scene[] | null;
  clipSelections: Map<number, string>; // sceneNumber -> clipUrl

  // Actions
  setProject: (id: string) => void;
  setStep: (step: WorkflowStep) => void;
  setTopic: (topic: string) => void;
  setVoice: (voiceId: string) => void;
  setScript: (scenes: Scene[]) => void;
  selectClip: (sceneNumber: number, clipUrl: string) => void;
  reset: () => void;
}

export const useWorkflowStore = create<WorkflowState>()(
  persist(
    (set) => ({
      projectId: null,
      currentStep: 'topic',
      topic: null,
      selectedVoice: null,
      script: null,
      clipSelections: new Map(),

      setProject: (id) => set({ projectId: id }),
      setStep: (step) => set({ currentStep: step }),
      setTopic: (topic) => set({ topic }),
      setVoice: (voiceId) => set({ selectedVoice: voiceId }),
      setScript: (script) => set({ script }),
      selectClip: (sceneNumber, clipUrl) =>
        set((state) => {
          const newSelections = new Map(state.clipSelections);
          newSelections.set(sceneNumber, clipUrl);
          return { clipSelections: newSelections };
        }),
      reset: () => set({
        projectId: null,
        currentStep: 'topic',
        topic: null,
        selectedVoice: null,
        script: null,
        clipSelections: new Map(),
      }),
    }),
    {
      name: 'workflow-storage', // localStorage key
    }
  )
);
```

**Conversation Store:**
```typescript
// stores/conversation-store.ts
import { create } from 'zustand';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface ConversationState {
  messages: Message[];
  isLoading: boolean;

  addMessage: (message: Message) => void;
  setMessages: (messages: Message[]) => void;
  setLoading: (loading: boolean) => void;
  clearMessages: () => void;
}

export const useConversationStore = create<ConversationState>((set) => ({
  messages: [],
  isLoading: false,

  addMessage: (message) =>
    set((state) => ({ messages: [...state.messages, message] })),
  setMessages: (messages) => set({ messages }),
  setLoading: (loading) => set({ isLoading: loading }),
  clearMessages: () => set({ messages: [] }),
}));
```

**Project Store (Story 1.6):**
```typescript
// stores/project-store.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface Project {
  id: string;
  name: string;
  topic: string | null;
  lastActive: string;
  createdAt: string;
}

interface ProjectState {
  activeProjectId: string | null;
  projects: Project[];

  // Actions
  setActiveProject: (id: string) => void;
  loadProjects: (projects: Project[]) => void;
  addProject: (project: Project) => void;
  updateProject: (id: string, updates: Partial<Project>) => void;
  removeProject: (id: string) => void;
}

export const useProjectStore = create<ProjectState>()(
  persist(
    (set) => ({
      activeProjectId: null,
      projects: [],

      setActiveProject: (id) => {
        set({ activeProjectId: id });
        // Update last_active timestamp in database
        fetch(`/api/projects/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lastActive: new Date().toISOString() }),
        });
      },

      loadProjects: (projects) => set({ projects }),

      addProject: (project) =>
        set((state) => ({
          projects: [project, ...state.projects],
          activeProjectId: project.id,
        })),

      updateProject: (id, updates) =>
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === id ? { ...p, ...updates } : p
          ),
        })),

      removeProject: (id) =>
        set((state) => ({
          projects: state.projects.filter((p) => p.id !== id),
          activeProjectId: state.activeProjectId === id ? null : state.activeProjectId,
        })),
    }),
    {
      name: 'project-storage', // localStorage key
      partialize: (state) => ({
        activeProjectId: state.activeProjectId // Only persist active project ID
      }),
    }
  )
);
```

**Synchronization Pattern:**
```typescript
// Save workflow state to database
async function saveWorkflowState() {
  const state = useWorkflowStore.getState();
  await fetch('/api/projects/' + state.projectId, {
    method: 'PUT',
    body: JSON.stringify({
      currentStep: state.currentStep,
      topic: state.topic,
      selectedVoice: state.selectedVoice,
      script: state.script,
      clipSelections: Array.from(state.clipSelections.entries()),
    }),
  });
}

// Load workflow state from database
async function loadWorkflowState(projectId: string) {
  const response = await fetch('/api/projects/' + projectId);
  const project = await response.json();

  useWorkflowStore.setState({
    projectId: project.id,
    currentStep: project.currentStep,
    topic: project.topic,
    selectedVoice: project.selectedVoice,
    script: project.script,
    clipSelections: new Map(project.clipSelections),
  });
}
```

---
