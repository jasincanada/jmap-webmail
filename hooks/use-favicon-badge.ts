"use client";

import { useEffect, useRef } from "react";

const SIZE = 32;
const DYNAMIC_ATTR = "data-dynamic-favicon";

export function useFaviconBadge(count: number) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const countRef = useRef(count);
  countRef.current = count;

  useEffect(() => {
    // Grab the base favicon href from whatever the document currently has
    // (Next.js renders one from app/icon.svg). We NEVER remove or edit
    // that link — Next.js's metadata reconciler owns it and pulling it
    // out from under React crashes reconciliation with
    // "parentNode is null". Our badge lives on its own link tagged with
    // data-dynamic-favicon.
    const baseLink = document.querySelector<HTMLLinkElement>("link[rel~='icon']:not([data-dynamic-favicon])");
    if (!baseLink?.href) return;

    const canvas = document.createElement("canvas");
    canvas.width = SIZE;
    canvas.height = SIZE;
    canvasRef.current = canvas;

    fetch(baseLink.href)
      .then((r) => r.blob())
      .then((blob) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const img = new Image();
          img.onload = () => {
            imageRef.current = img;
            if (countRef.current > 0) {
              applyBadge(canvas, img, countRef.current);
            }
          };
          img.src = reader.result as string;
        };
        reader.readAsDataURL(blob);
      })
      .catch(() => {
        /* favicon not loadable — badge will draw without base icon */
      });

    return () => {
      clearDynamicFavicon();
    };
  }, []);

  useEffect(() => {
    if (count <= 0) {
      clearDynamicFavicon();
      return;
    }

    if (canvasRef.current) {
      applyBadge(canvasRef.current, imageRef.current, count);
    }
  }, [count]);
}

function applyBadge(
  canvas: HTMLCanvasElement,
  image: HTMLImageElement | null,
  count: number,
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return;
  }

  ctx.clearRect(0, 0, SIZE, SIZE);

  if (image) {
    ctx.drawImage(image, 0, 0, SIZE, SIZE);
  }

  const label = count > 9 ? "+" : String(count);
  const fontSize = SIZE * 0.55;
  const padding = 2;
  ctx.font = `bold ${fontSize}px arial,sans-serif`;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  const textWidth = ctx.measureText(label).width;
  const badgeW = textWidth + padding * 2;
  const badgeH = fontSize + padding;
  const x = SIZE - badgeW - 1;
  const y = SIZE - badgeH;

  ctx.fillStyle = "#ef4444";
  ctx.beginPath();
  // roundRect is Baseline 2023; fall back to fillRect on Safari 15 and below.
  if (typeof ctx.roundRect === "function") {
    ctx.roundRect(x, y, badgeW, badgeH, 3);
    ctx.fill();
  } else {
    ctx.fillRect(x, y, badgeW, badgeH);
  }

  ctx.strokeStyle = "#b91c1c";
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = "#ffffff";
  ctx.fillText(label, x + padding, y + padding / 2);

  setDynamicFavicon(canvas.toDataURL("image/png"));
}

/**
 * Upsert a dynamic favicon link marked with data-dynamic-favicon. The
 * app/icon.svg managed by Next.js is left alone. Browsers pick the
 * last matching link for rel="icon", so the dynamic link takes
 * precedence on Chromium; Firefox/Safari fall back to the static icon,
 * which is fine — the count-based badge remains a Chromium nicety.
 */
function setDynamicFavicon(href: string) {
  let link = document.querySelector<HTMLLinkElement>(`link[${DYNAMIC_ATTR}]`);
  if (!link) {
    link = document.createElement("link");
    link.setAttribute(DYNAMIC_ATTR, "");
    link.rel = "icon";
    link.type = "image/png";
    document.head.appendChild(link);
  }
  if (link.href !== href) {
    link.href = href;
  }
}

function clearDynamicFavicon() {
  document.querySelector(`link[${DYNAMIC_ATTR}]`)?.remove();
}
