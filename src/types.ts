export interface Commit {
  id: string;
  hash: string;
  date: string;
  message: string;
  humanDetail: string; // The "Notebook Batman" style WIP highlight
  isSoul?: boolean;
}

export interface Fossil {
  id: string;
  name: string;
  size: number;
  x: number;
  y: number;
  color: string;
  birthTime: number;
}

export interface MemoryBlock {
  id: string;
  name: string;
  size: number;
  x: number;
  y: number;
  color: string;
  vx: number;
  vy: number;
}

export interface FileEntry {
  id: string;
  name: string;
  content: string;
  dust: number; // 0 to 100
  isPolished: boolean;
}

export interface RadioMessage {
  id: string;
  timestamp: string;
  sender: "dj" | "system";
  text: string;
}

export type LoopLifecycleState =
  | "LOOP_INGESTED"
  | "LOOP_HELD"
  | "LOOP_ANALYZED"
  | "LOOP_REDACTED"
  | "LOOP_COMPOSTED";

export interface Contributor {
  name: string;
  role: string;
  type: string;
}

export interface Track {
  id: string;
  title: string;
  role: string;
  insight: string;
  lyrics: string;
  duration: string;
  contributors: Contributor[];
  rights: string;
}

export interface LoopIt {
  id: string;
  trackId?: string;
  title: string;
  observation: string;
  lifecycle: LoopLifecycleState;
  timestamp: string;
  signer: string;
  retentionDays: number;
  isPrivate: boolean;
  history: string[]; // lifecycle event trail
}
