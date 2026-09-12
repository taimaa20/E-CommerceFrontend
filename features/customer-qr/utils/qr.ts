/**
 * Single place that decides how a QR image is rendered.
 *
 * Today: hits the public qrserver.com endpoint — perfect for demo, no
 * dependencies, real scannable codes.
 *
 * Tomorrow: swap the body for a local generator (e.g. `qrcode` lib or a
 * self-hosted endpoint) without touching any component.
 */

const ENDPOINT = "https://api.qrserver.com/v1/create-qr-code/";

export interface QrImageOptions {
  size?: number;          // pixel size of the resulting square image
  margin?: number;        // quiet zone in modules (0–10)
  fgColor?: string;       // hex without #
  bgColor?: string;       // hex without #
}

export function buildQrImageUrl(value: string, opts: QrImageOptions = {}): string {
  const size = Math.max(80, Math.min(1000, opts.size ?? 360));
  const margin = Math.max(0, Math.min(10, opts.margin ?? 1));
  const params = new URLSearchParams({
    size: `${size}x${size}`,
    data: value,
    margin: String(margin),
    qzone: "1",
    format: "svg",
    ecc: "M",
    color: (opts.fgColor ?? "111827").replace(/^#/, ""),
    bgcolor: (opts.bgColor ?? "ffffff").replace(/^#/, ""),
  });
  return `${ENDPOINT}?${params.toString()}`;
}

/** Same payload, PNG variant — used for downloads where SVG isn't ideal. */
export function buildQrDownloadUrl(value: string, size = 720): string {
  const params = new URLSearchParams({
    size: `${size}x${size}`,
    data: value,
    margin: "1",
    qzone: "1",
    format: "png",
    ecc: "M",
  });
  return `${ENDPOINT}?${params.toString()}`;
}
