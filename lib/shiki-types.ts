// Shared, structured-clone-friendly payloads for the Shiki Web Worker.
export type WorkerTokenStyle = {
  color?: string;
  backgroundColor?: string;
  fontStyle?: string;
  fontWeight?: string;
  textDecoration?: string;
};

export type WorkerToken = {
  content: string;
  style: WorkerTokenStyle;
};

export type WorkerTokens = {
  fg: string;
  lines: WorkerToken[][];
};

export type HighlightRequest = {
  id: number;
  content: string;
  lang: string;
  theme: "dark-plus" | "light-plus";
};

export type HighlightResponse =
  | ({ id: number; ok: true } & WorkerTokens)
  | { id: number; ok: false; error: string };
