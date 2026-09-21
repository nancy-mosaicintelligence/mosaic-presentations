// The editor's side of the deck's message bridge (v1). Origin, source and version are checked both ways.
export type BridgeMessage = { v: 1; type: string; [k: string]: any };
export class PlayerBridge {
  private handler = (e: MessageEvent) => {
    const f = this.frame(); if (!f || e.source !== f.contentWindow || e.origin !== window.location.origin) return;
    const m = e.data; if (!m || m.v !== 1 || typeof m.type !== "string") return;
    this.onMessage(m as BridgeMessage);
  };
  constructor(private frame: () => HTMLIFrameElement | null, private onMessage: (m: BridgeMessage) => void) {}
  attach() { window.addEventListener("message", this.handler); }
  detach() { window.removeEventListener("message", this.handler); }
  send(m: { type: string; [k: string]: any }) { this.frame()?.contentWindow?.postMessage({ v: 1, ...m }, window.location.origin); }
}
