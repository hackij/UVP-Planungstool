import { readFile } from "node:fs/promises";
import path from "node:path";

const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".gif": "image/gif",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
};

const ASSET_ROOT = path.join(process.cwd(), "dist", "client");

const extensionOf = (pathname) => {
  const match = pathname.match(/\.[a-z0-9]+$/i);
  return match?.[0].toLowerCase() ?? "";
};

const safeAssetUrl = (pathname) => {
  const decoded = decodeURIComponent(pathname);
  if (decoded.includes("..") || decoded.includes("\\")) return null;
  const assetPath = decoded === "/" || !extensionOf(decoded) ? "index.html" : decoded.replace(/^\/+/, "");
  return path.join(ASSET_ROOT, assetPath);
};

const serveAsset = async (pathname) => {
  const assetUrl = safeAssetUrl(pathname);
  if (!assetUrl) return new Response("Not found", { status: 404 });
  try {
    const body = await readFile(assetUrl);
    return new Response(body, {
      headers: {
        "content-type": MIME_TYPES[extensionOf(assetUrl)] ?? "application/octet-stream",
      },
    });
  } catch {
    if (pathname !== "/") return serveAsset("/");
    return new Response("Not found", { status: 404 });
  }
};

export default {
  async fetch(request) {
    const url = new URL(request.url);
    return serveAsset(url.pathname);
  },
};
