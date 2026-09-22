/** The Mosaic mark in a bar: the white lockup, linking home. */
export function BrandMark({ href = "/", title = "Library" }: { href?: string; title?: string }) {
  return <a className="brand" href={href} title={title}><img src="/brand/mosaic-logo-white.svg" alt="Mosaic" /></a>;
}
