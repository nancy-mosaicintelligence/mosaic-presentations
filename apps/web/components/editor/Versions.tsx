"use client";
import { useState } from "react";

export type VersionMeta = { id: string; name: string; note?: string; author: string; createdAt: string; contentHash: string; schemaVersion: number; duplicatedFrom?: string };

export function VersionsPanel({ versions, currentHash, draftBasedOn, onPreview, onDuplicate, onRestore, previewing }: { versions: VersionMeta[]; currentHash: string; draftBasedOn?: string; onPreview: (v: VersionMeta | null) => void; onDuplicate: (v: VersionMeta) => void; onRestore: (v: VersionMeta) => void; previewing: string | null }) {
  const [confirm, setConfirm] = useState<string | null>(null);
  return <div className="panel">
    <p className="muted">Every version is a complete, immutable snapshot. Restoring copies one into the working draft; nothing made later is lost.</p>
    {versions.length === 0 && <p className="muted">No versions yet. “New version” in the bar above names the current state.</p>}
    <ul className="versions">
      {versions.map(v => <li key={v.id} className={previewing === v.id ? "previewing" : ""}>
        <div className="vh"><strong>{v.name}</strong>{v.contentHash === currentHash && <span className="tag">current</span>}{draftBasedOn === v.id && <span className="tag">restored</span>}</div>
        <div className="muted small">{new Date(v.createdAt).toLocaleString()} · {v.author} · <code>{v.contentHash.slice(0, 8)}</code>{v.duplicatedFrom && " · copy"}</div>
        {v.note && <p className="note">{v.note}</p>}
        <div className="actions">
          <button type="button" className="ghost" onClick={() => onPreview(previewing === v.id ? null : v)}>{previewing === v.id ? "Back to draft" : "Preview"}</button>
          <button type="button" className="ghost" onClick={() => onDuplicate(v)}>Duplicate</button>
          {confirm === v.id
            ? <span className="confirm">Replace the draft with this version? <button type="button" onClick={() => { setConfirm(null); onRestore(v); }}>Restore</button><button type="button" className="ghost" onClick={() => setConfirm(null)}>Cancel</button></span>
            : <button type="button" className="ghost" onClick={() => setConfirm(v.id)}>Restore</button>}
        </div>
      </li>)}
    </ul>
  </div>;
}
