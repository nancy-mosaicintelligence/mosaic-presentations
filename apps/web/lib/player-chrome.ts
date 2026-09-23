/**
 * The exit for a full-window player: a small pill at the top of the page with a way back and a
 * full-screen toggle. It shows on movement and fades when the hands are still, so the room never
 * sees it for long. Escape goes back (once out of full screen). The editor's framed player never
 * gets it — only a top-level page does, by asking for it.
 */
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");

/** Only a same-site path may be a way back (never another origin). */
export function safeBack(v: string | null | undefined): string | null {
  return v && v.startsWith("/") && !v.startsWith("//") && !v.startsWith("/\\") ? v : null;
}

export function withExit(html: string, back: string, label = "Back"): string {
  const chrome = `<style id="itwExitCss">#itwExit{position:fixed;top:14px;left:50%;transform:translateX(-50%);z-index:2147483000;display:flex;gap:4px;padding:4px;border-radius:999px;background:rgba(10,10,12,.62);border:1px solid rgba(255,255,255,.16);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);opacity:0;transition:opacity .25s;pointer-events:none;font:500 13px/1 Inter,-apple-system,system-ui,sans-serif}#itwExit.show{opacity:1;pointer-events:auto}#itwExit a,#itwExit button{appearance:none;border:0;margin:0;background:transparent;color:#fff;padding:8px 12px;border-radius:999px;text-decoration:none;font:inherit;cursor:pointer;display:inline-flex;align-items:center;gap:8px}#itwExit a:hover,#itwExit button:hover{background:rgba(255,255,255,.12)}#itwExit kbd{opacity:.55;font:inherit;font-size:11px}</style>
<nav id="itwExit" aria-label="Player"><a id="itwBack" href="${esc(back)}">← ${esc(label)}<kbd>Esc</kbd></a><button type="button" id="itwFull">Full screen</button></nav>
<script>(function(){var n=document.getElementById("itwExit"),b=document.getElementById("itwBack"),f=document.getElementById("itwFull"),t;function show(){n.classList.add("show");clearTimeout(t);t=setTimeout(function(){n.classList.remove("show")},2800)}show();window.addEventListener("mousemove",show,{passive:true});window.addEventListener("touchstart",show,{passive:true});f.addEventListener("click",function(){if(document.fullscreenElement){document.exitFullscreen()}else if(document.documentElement.requestFullscreen){document.documentElement.requestFullscreen().catch(function(){})}});document.addEventListener("fullscreenchange",function(){f.textContent=document.fullscreenElement?"Exit full screen":"Full screen"});window.addEventListener("keydown",function(e){if(e.key==="Escape"&&!document.fullscreenElement&&!e.defaultPrevented){e.preventDefault();location.href=b.getAttribute("href")}},true)})();</script>`;
  const i = html.lastIndexOf("</body>");
  return i < 0 ? html + chrome : html.slice(0, i) + chrome + html.slice(i);
}

/** The canvas the deck is designed on: every player, and the editor's stage, shows this exact frame scaled to fit. */
export const CANVAS = { w: 1920, h: 1080 };

/** A full-window page holding the deck at its canvas size, scaled to fit and centred (letterboxed), with the exit pill.
 *  Keys go to the deck; it relays Escape back so the pill's way out works with the focus inside. */
export function shellPage(o: { title: string; src: string; back: string; label?: string }): string {
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${esc(o.title)}</title><meta name="robots" content="noindex"><meta name="viewport" content="width=device-width, initial-scale=1">
<style>html,body{margin:0;height:100%;background:#000;overflow:hidden}#canvas{position:fixed;inset:0;display:block}#canvas iframe{position:absolute;left:50%;top:50%;width:${CANVAS.w}px;height:${CANVAS.h}px;margin:-${CANVAS.h / 2}px 0 0 -${CANVAS.w / 2}px;border:0;background:#000;transform-origin:50% 50%}</style></head>
<body><div id="canvas"><iframe id="deck" src="${esc(o.src)}" title="${esc(o.title)}" allow="fullscreen" allowfullscreen></iframe></div>
<script>(function(){var f=document.getElementById("deck");function fit(){var k=Math.min(window.innerWidth/${CANVAS.w},window.innerHeight/${CANVAS.h});f.style.transform="scale("+k+")"}fit();window.addEventListener("resize",fit);if(location.hash)f.src=f.getAttribute("src")+location.hash;f.addEventListener("load",function(){try{f.contentWindow.focus()}catch(e){}});window.addEventListener("message",function(e){if(e.origin!==location.origin||!e.data)return;if(e.data.type==="itw:escape"&&!document.fullscreenElement){var b=document.getElementById("itwBack");if(b)location.href=b.getAttribute("href")}});document.addEventListener("click",function(){try{f.contentWindow.focus()}catch(e){}})})();</script>
</body></html>`;
  return withExit(html, o.back, o.label || "Back");
}
