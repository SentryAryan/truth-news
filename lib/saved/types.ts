export type ToggleSavedResult =
  | { ok: true; saved: boolean }
  | { ok: false; error: string };
