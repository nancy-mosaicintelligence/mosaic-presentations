"use client";
/** The editor's error screen: what went wrong, in words, with a way back — never a blank page. */
export default function EditorError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main className="auth"><div className="card">
    <h1>The editor hit an error</h1>
    <p>Nothing you saved is lost: the draft on the server is the last saved state.</p>
    <p className="error"><code>{error.message || String(error)}{error.digest ? ` · ${error.digest}` : ""}</code></p>
    <p><button type="button" className="primary" onClick={() => reset()}>Try again</button> <a className="btn ghost" href="/">Back to the library</a></p>
    <p className="muted small">If it happens again, send the message above to whoever maintains the app.</p>
  </div></main>;
}
