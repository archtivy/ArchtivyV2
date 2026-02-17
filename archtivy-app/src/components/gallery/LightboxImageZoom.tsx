"use client";

import * as React from "react";
import Image from "next/image";

const ZOOM_MIN = 0.5;
const ZOOM_MAX = 4;
const ZOOM_STEP = 0.25;
const TRANSITION_MS = 300;

export type LightboxZoomControlsRef = {
  zoomIn: () => void;
  zoomOut: () => void;
  zoomReset: () => void;
  zoomFullscreen: () => void;
};

export interface LightboxImageZoomProps {
  src: string;
  alt: string;
  unoptimized?: boolean;
  /** When false, zoom controls are not rendered (parent renders them via ref). */
  renderControls?: boolean;
  /** Called on double-click (toggle zoom 1x / 2x). */
  onDoubleClick?: () => void;
}

export const LightboxImageZoom = React.forwardRef<LightboxZoomControlsRef, LightboxImageZoomProps>(function LightboxImageZoom(
  { src, alt, unoptimized, renderControls = true, onDoubleClick },
  ref
) {
  const [scale, setScale] = React.useState(1);
  const [pan, setPan] = React.useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = React.useState(false);
  const dragStart = React.useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const containerRef = React.useRef<HTMLDivElement | null>(null);

  const zoomIn = React.useCallback(() => setScale((s) => Math.min(ZOOM_MAX, s + ZOOM_STEP)), []);
  const zoomOut = React.useCallback(() => setScale((s) => Math.max(ZOOM_MIN, s - ZOOM_STEP)), []);
  const zoomReset = React.useCallback(() => {
    setScale(1);
    setPan({ x: 0, y: 0 });
  }, []);
  const zoomFullscreen = React.useCallback(() => {
    setScale(2);
    setPan({ x: 0, y: 0 });
  }, []);

  React.useImperativeHandle(ref, () => ({ zoomIn, zoomOut, zoomReset, zoomFullscreen }), [zoomIn, zoomOut, zoomReset, zoomFullscreen]);

  const handleDoubleClick = () => {
    if (scale <= 1) {
      setScale(2);
      setPan({ x: 0, y: 0 });
    } else {
      setScale(1);
      setPan({ x: 0, y: 0 });
    }
    onDoubleClick?.();
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
    setScale((s) => Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, s + delta)));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale <= 1) return;
    e.preventDefault();
    setIsDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
  };

  const handleMouseMove = React.useCallback(
    (e: MouseEvent) => {
      if (!isDragging) return;
      setPan({
        x: dragStart.current.panX + (e.clientX - dragStart.current.x),
        y: dragStart.current.panY + (e.clientY - dragStart.current.y),
      });
    },
    [isDragging]
  );

  const handleMouseUp = React.useCallback(() => {
    setIsDragging(false);
  }, []);

  React.useEffect(() => {
    if (!isDragging) return;
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full overflow-hidden"
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      style={{ cursor: scale > 1 ? (isDragging ? "grabbing" : "grab") : "default" }}
    >
      {renderControls && (
        <div className="absolute left-3 top-3 z-10 flex items-center gap-1 rounded border border-zinc-700/80 bg-zinc-900/80 backdrop-blur-sm" style={{ borderRadius: "4px" }}>
          <button type="button" onClick={zoomIn} className="flex h-9 w-9 items-center justify-center text-zinc-300 hover:border-[#002abf] hover:text-white focus:outline-none focus:ring-2 focus:ring-[#002abf] rounded-l" style={{ borderRadius: "4px" }} aria-label="Zoom in"><span className="text-lg font-medium">+</span></button>
          <button type="button" onClick={zoomOut} className="flex h-9 w-9 items-center justify-center text-zinc-300 hover:border-[#002abf] hover:text-white focus:outline-none focus:ring-2 focus:ring-[#002abf]" style={{ borderRadius: "4px" }} aria-label="Zoom out"><span className="text-lg font-medium">−</span></button>
          <button type="button" onClick={zoomReset} className="px-2 py-1.5 text-xs font-medium text-zinc-400 hover:border-[#002abf] hover:text-white focus:outline-none focus:ring-2 focus:ring-[#002abf]" style={{ borderRadius: "4px" }} aria-label="Reset zoom">100%</button>
          <button type="button" onClick={zoomFullscreen} className="flex h-9 w-9 items-center justify-center text-zinc-300 hover:border-[#002abf] hover:text-white focus:outline-none focus:ring-2 focus:ring-[#002abf] rounded-r" style={{ borderRadius: "4px" }} aria-label="Fullscreen zoom">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
          </button>
        </div>
      )}
      <div
        className="flex h-full w-full items-center justify-center transition-transform ease-out"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
          transformOrigin: "center center",
          transitionDuration: `${TRANSITION_MS}ms`,
        }}
        onDoubleClick={handleDoubleClick}
      >
        <Image
          src={src}
          alt={alt}
          fill
          className="object-contain select-none"
          unoptimized={unoptimized}
          priority
          sizes="(min-width: 1280px) 72vw, 100vw"
          draggable={false}
          style={{ pointerEvents: scale > 1 ? "none" : "auto" }}
        />
      </div>
    </div>
  );
});
