import { create } from "zustand";
import { DEFAULT_CODE, DEFAULT_PROMPT } from "@/lib/cad/scripts";

export type SectionId = "prompt" | "blocks" | "cad" | "skilled" | "settings";
export type ToolId = "sel" | "mov" | "rot" | "scl" | "ext" | "cut" | "bvl" | "dec";
export type StudioMode =
  | "modeling"
  | "sculpting"
  | "texture"
  | "vertex"
  | "uv"
  | "material"
  | "lighting";

export type CommandBody =
  | { kind: "tool"; tool: ToolId }
  | { kind: "scale"; ratio: number }
  | { kind: "position"; x: number; y: number; z: number }
  | { kind: "reset-camera" }
  | { kind: "screenshot" }
  | { kind: "vertex" };

export type Command = CommandBody & { id: number };

export type StudioState = {
  entered: boolean;
  section: SectionId;
  sidebarCollapsed: boolean;
  prompt: string;
  sourceCode: string;
  revision: number;
  activeTool: ToolId;
  mode: StudioMode;
  ratio: number;
  position: { x: number; y: number; z: number };
  faceCount: number;
  autoRotate: boolean;
  showGrid: boolean;
  showGizmo: boolean;
  keyLight: number;
  roughness: number;
  metalness: number;
  tint: string;
  generating: boolean;
  error: string | null;
  status: string | null;
  lastMs: number | null;
  command: Command | null;
};

const STORAGE_KEY = "typeless-studio-v1";

const SECTIONS: SectionId[] = ["prompt", "blocks", "cad", "skilled", "settings"];
const TOOLS: ToolId[] = ["sel", "mov", "rot", "scl", "ext", "cut", "bvl", "dec"];
const MODES: StudioMode[] = [
  "modeling",
  "sculpting",
  "texture",
  "vertex",
  "uv",
  "material",
  "lighting",
];

let commandSeq = 0;

export const useStudio = create<StudioState>(() => ({
  entered: false,
  section: "prompt",
  sidebarCollapsed: false,
  prompt: DEFAULT_PROMPT,
  sourceCode: DEFAULT_CODE,
  revision: 0,
  activeTool: "dec",
  mode: "modeling",
  ratio: 1,
  position: { x: 0, y: 0, z: 0 },
  faceCount: 0,
  autoRotate: true,
  showGrid: true,
  showGizmo: true,
  keyLight: 1.2,
  roughness: 0.35,
  metalness: 0.8,
  tint: "#2563eb",
  generating: false,
  error: null,
  status: null,
  lastMs: null,
  command: null,
}));

export function issue(body: CommandBody) {
  commandSeq += 1;
  useStudio.setState({ command: { ...body, id: commandSeq } });
}

export function commitCode(code: string) {
  const revision = useStudio.getState().revision + 1;
  useStudio.setState({ sourceCode: code, revision, error: null, status: null });
}

export function resetModel() {
  const revision = useStudio.getState().revision + 1;
  useStudio.setState({
    prompt: DEFAULT_PROMPT,
    sourceCode: DEFAULT_CODE,
    revision,
    ratio: 1,
    position: { x: 0, y: 0, z: 0 },
    mode: "modeling",
    activeTool: "dec",
    error: null,
    status: "New model",
    tint: "#2563eb",
  });
}

function isSection(value: unknown): value is SectionId {
  return typeof value === "string" && SECTIONS.includes(value as SectionId);
}
function isTool(value: unknown): value is ToolId {
  return typeof value === "string" && TOOLS.includes(value as ToolId);
}
function isMode(value: unknown): value is StudioMode {
  return typeof value === "string" && MODES.includes(value as StudioMode);
}

export function loadSession(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const data = JSON.parse(raw) as Record<string, unknown>;
    const patch: Partial<StudioState> = {};
    if (typeof data.prompt === "string") patch.prompt = data.prompt.slice(0, 2000);
    if (typeof data.sourceCode === "string" && data.sourceCode.includes("return")) {
      patch.sourceCode = data.sourceCode.slice(0, 20000);
    }
    if (typeof data.ratio === "number" && Number.isFinite(data.ratio)) {
      patch.ratio = Math.min(3, Math.max(0.05, data.ratio));
    }
    if (typeof data.autoRotate === "boolean") patch.autoRotate = data.autoRotate;
    if (typeof data.showGrid === "boolean") patch.showGrid = data.showGrid;
    if (typeof data.showGizmo === "boolean") patch.showGizmo = data.showGizmo;
    if (typeof data.sidebarCollapsed === "boolean") patch.sidebarCollapsed = data.sidebarCollapsed;
    if (isSection(data.section)) patch.section = data.section;
    if (isTool(data.activeTool)) patch.activeTool = data.activeTool;
    if (isMode(data.mode)) patch.mode = data.mode;
    if (typeof data.keyLight === "number") patch.keyLight = data.keyLight;
    if (typeof data.roughness === "number") patch.roughness = data.roughness;
    if (typeof data.metalness === "number") patch.metalness = data.metalness;
    if (typeof data.tint === "string" && /^#[0-9a-fA-F]{6}$/.test(data.tint)) patch.tint = data.tint;
    useStudio.setState(patch);
    return true;
  } catch {
    return false;
  }
}

export function saveSession() {
  if (typeof window === "undefined") return;
  const s = useStudio.getState();
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        prompt: s.prompt,
        sourceCode: s.sourceCode,
        ratio: s.ratio,
        autoRotate: s.autoRotate,
        showGrid: s.showGrid,
        showGizmo: s.showGizmo,
        sidebarCollapsed: s.sidebarCollapsed,
        section: s.section,
        activeTool: s.activeTool,
        mode: s.mode,
        keyLight: s.keyLight,
        roughness: s.roughness,
        metalness: s.metalness,
        tint: s.tint,
      }),
    );
  } catch {
    /* quota or private mode */
  }
}

export function clearSession() {
  if (typeof window !== "undefined") localStorage.removeItem(STORAGE_KEY);
  resetModel();
  useStudio.setState({
    section: "settings",
    sidebarCollapsed: false,
    autoRotate: true,
    showGrid: true,
    showGizmo: true,
    keyLight: 1.2,
    roughness: 0.35,
    metalness: 0.8,
    lastMs: null,
  });
}

export function toggleFullscreen() {
  if (typeof document === "undefined") return;
  if (!document.fullscreenElement) {
    void document.documentElement.requestFullscreen().catch(() => {});
  } else if (document.exitFullscreen) {
    void document.exitFullscreen();
  }
}

export const SECTION_TITLES: { id: SectionId; title: string }[] = [
  { id: "prompt", title: "typeless prompt" },
  { id: "blocks", title: "component blocks" },
  { id: "cad", title: "image/CAD" },
  { id: "skilled", title: "/Skilled" },
  { id: "settings", title: "Settings" },
];

export const TOOL_LIST: { id: ToolId; label: string; title: string }[] = [
  { id: "sel", label: "sel", title: "Select" },
  { id: "mov", label: "mov", title: "Move" },
  { id: "rot", label: "rot", title: "Rotate" },
  { id: "scl", label: "scl", title: "Scale" },
  { id: "ext", label: "ext", title: "Extrude" },
  { id: "cut", label: "cut", title: "Loop Cut" },
  { id: "bvl", label: "bvl", title: "Bevel" },
  { id: "dec", label: "dec", title: "Decimate" },
];
