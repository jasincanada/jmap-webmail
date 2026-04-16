"use client";

import { useEffect, useRef } from "react";

const SIZE = 32;

export function useFaviconBadge(count: number) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const originalHref = useRef<string | null>(null);
  const countRef = useRef(count);
  countRef.current = count;

  useEffect(() => {
    const link = document.querySelector<HTMLLinkElement>("link[rel~='icon']");
    if (!link?.href) return;

    originalHref.current = link.href;

    const canvas = document.createElement("canvas");
    canvas.width = SIZE;
    canvas.height = SIZE;
    canvasRef.current = canvas;

    fetch(link.href)
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
  }, []);

  useEffect(() => {
    if (count <= 0) {
      if (originalHref.current) {
        setFavicon(originalHref.current, "image/svg+xml");
      }
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

  setFavicon(canvas.toDataURL("image/png"));
}

function removeCurrentFavicons() {
  const links = document.querySelectorAll<HTMLLinkElement>("link[rel~='icon']");
  links.forEach((link) => link.remove());
}

export function setFavicon(href: string, type: string = "image/png") {
  removeCurrentFavicons();
  const link = document.createElement("link");
  link.rel = "icon";
  link.type = type;
  link.href = href;
  document.head.appendChild(link);
}
