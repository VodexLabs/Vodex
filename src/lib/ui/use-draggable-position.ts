"use client";

import * as React from "react";

export type DraggablePosition = { x: number; y: number };

export function useDraggablePosition(storageKey: string, defaultPos: DraggablePosition) {
  const [pos, setPos] = React.useState<DraggablePosition>(defaultPos);
  const dragRef = React.useRef<{
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);

  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as DraggablePosition;
      if (typeof parsed.x === "number" && typeof parsed.y === "number") {
        setPos(parsed);
      }
    } catch {
      /* ignore */
    }
  }, [storageKey]);

  const persist = React.useCallback(
    (next: DraggablePosition) => {
      setPos(next);
      try {
        localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        /* ignore */
      }
    },
    [storageKey],
  );

  const onPointerDown = React.useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0) return;
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      dragRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        originX: pos.x,
        originY: pos.y,
      };
    },
    [pos.x, pos.y],
  );

  const onPointerMove = React.useCallback(
    (e: React.PointerEvent) => {
      if (!dragRef.current) return;
      const dx = e.clientX - dragRef.current.startX;
      const dy = e.clientY - dragRef.current.startY;
      persist({
        x: Math.max(8, dragRef.current.originX + dx),
        y: Math.max(48, dragRef.current.originY + dy),
      });
    },
    [persist],
  );

  const onPointerUp = React.useCallback(() => {
    dragRef.current = null;
  }, []);

  return {
    pos,
    style: { left: pos.x, top: pos.y } as React.CSSProperties,
    dragHandlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp },
  };
}
