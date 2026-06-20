// Shared presentation helpers for the client portal (dashboard + project detail).

export type StatusMeta = { label: string; tone: string };

// Keys match the projects.status CHECK constraint in the DB.
export const STATUS_META: Record<string, StatusMeta> = {
  discovery:   { label: 'Discovery',    tone: 'neutral' },
  in_progress: { label: 'In progress',  tone: 'accent'  },
  review:      { label: 'In review',    tone: 'amber'   },
  delivered:   { label: 'Delivered',    tone: 'green'   },
  on_hold:     { label: 'On hold',      tone: 'muted'   },
  archived:    { label: 'Archived',     tone: 'subtle'  },
};

// Escape user/DB-supplied text before injecting into innerHTML.
export function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Render a YYYY-MM-DD (or ISO) date as e.g. "Jun 19, 2026". Falls back to the
// raw string if it can't be parsed.
export function fmtDate(value: string | null | undefined): string {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}
