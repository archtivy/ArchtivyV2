"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { GraphData, GraphNode } from "@/lib/explore/graph";

const NODE_COLORS: Record<string, string> = {
  project: "#002abf",
  product: "#6366f1",
  brand: "#059669",
  designer: "#d97706",
};

const NODE_RADIUS: Record<string, number> = {
  project: 8,
  product: 6,
  brand: 7,
  designer: 6,
};

interface SimNode extends GraphNode {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

/**
 * Lightweight force-directed graph renderer using Canvas.
 * Replace with react-force-graph-2d for more features if needed.
 */
export function ExploreGraph() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [loading, setLoading] = useState(true);
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const simNodesRef = useRef<SimNode[]>([]);

  useEffect(() => {
    setLoading(true);
    fetch("/api/explore/graph")
      .then((res) => res.json())
      .then((data: GraphData) => {
        setGraphData(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Simple force simulation
  useEffect(() => {
    if (!graphData || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.offsetWidth;
    const height = canvas.offsetHeight;
    canvas.width = width * 2;
    canvas.height = height * 2;
    ctx.scale(2, 2);

    // Initialize positions
    const simNodes: SimNode[] = graphData.nodes.map((n, i) => ({
      ...n,
      x: width / 2 + (Math.random() - 0.5) * width * 0.6,
      y: height / 2 + (Math.random() - 0.5) * height * 0.6,
      vx: 0,
      vy: 0,
    }));
    simNodesRef.current = simNodes;

    const nodeMap = new Map(simNodes.map((n) => [n.id, n]));

    const edgesResolved = graphData.edges
      .map((e) => ({
        source: nodeMap.get(e.source),
        target: nodeMap.get(e.target),
        type: e.type,
      }))
      .filter((e) => e.source && e.target) as {
      source: SimNode;
      target: SimNode;
      type: string;
    }[];

    let animFrame: number;
    let iterations = 0;
    const MAX_ITERATIONS = 300;

    const tick = () => {
      if (iterations >= MAX_ITERATIONS) {
        draw();
        return;
      }
      iterations++;

      const alpha = 1 - iterations / MAX_ITERATIONS;

      // Repulsion (all pairs)
      for (let i = 0; i < simNodes.length; i++) {
        for (let j = i + 1; j < simNodes.length; j++) {
          const a = simNodes[i];
          const b = simNodes[j];
          let dx = b.x - a.x;
          let dy = b.y - a.y;
          let dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const force = (200 * alpha) / dist;
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;
          a.vx -= fx;
          a.vy -= fy;
          b.vx += fx;
          b.vy += fy;
        }
      }

      // Attraction (edges)
      for (const e of edgesResolved) {
        let dx = e.target.x - e.source.x;
        let dy = e.target.y - e.source.y;
        let dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const force = (dist - 80) * 0.01 * alpha;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        e.source.vx += fx;
        e.source.vy += fy;
        e.target.vx -= fx;
        e.target.vy -= fy;
      }

      // Center gravity
      for (const n of simNodes) {
        n.vx += (width / 2 - n.x) * 0.001 * alpha;
        n.vy += (height / 2 - n.y) * 0.001 * alpha;
      }

      // Apply velocity with damping
      for (const n of simNodes) {
        n.vx *= 0.6;
        n.vy *= 0.6;
        n.x += n.vx;
        n.y += n.vy;
        n.x = Math.max(20, Math.min(width - 20, n.x));
        n.y = Math.max(20, Math.min(height - 20, n.y));
      }

      draw();
      animFrame = requestAnimationFrame(tick);
    };

    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      // Edges
      ctx.lineWidth = 1;
      ctx.strokeStyle = "rgba(0,0,0,0.08)";
      for (const e of edgesResolved) {
        ctx.beginPath();
        ctx.moveTo(e.source.x, e.source.y);
        ctx.lineTo(e.target.x, e.target.y);
        ctx.stroke();
      }

      // Nodes
      for (const n of simNodes) {
        const r = NODE_RADIUS[n.type] ?? 6;
        const color = NODE_COLORS[n.type] ?? "#666";
        const isHovered = hoveredNode?.id === n.id;

        ctx.beginPath();
        ctx.arc(n.x, n.y, isHovered ? r + 2 : r, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();

        if (isHovered) {
          ctx.strokeStyle = color;
          ctx.lineWidth = 2;
          ctx.stroke();

          ctx.font = "11px system-ui, sans-serif";
          ctx.fillStyle = "#18181b";
          ctx.textAlign = "center";
          ctx.fillText(n.label, n.x, n.y - r - 6);
        }
      }
    };

    animFrame = requestAnimationFrame(tick);

    // Hover detection
    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;

      let found: SimNode | null = null;
      for (const n of simNodesRef.current) {
        const r = NODE_RADIUS[n.type] ?? 6;
        const dx = mx - n.x;
        const dy = my - n.y;
        if (dx * dx + dy * dy < (r + 4) * (r + 4)) {
          found = n;
          break;
        }
      }
      setHoveredNode(found);
      canvas.style.cursor = found ? "pointer" : "default";
    };

    canvas.addEventListener("mousemove", handleMouseMove);

    return () => {
      cancelAnimationFrame(animFrame);
      canvas.removeEventListener("mousemove", handleMouseMove);
    };
  }, [graphData, hoveredNode]);

  if (loading) {
    return (
      <div className="py-16 text-center text-sm text-zinc-500">
        Building relationship graph...
      </div>
    );
  }

  if (!graphData || graphData.nodes.length === 0) {
    return (
      <div className="py-16 text-center text-sm text-zinc-500">
        Not enough data to build a relationship graph yet.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-zinc-500">
        {Object.entries(NODE_COLORS).map(([type, color]) => (
          <span key={type} className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
            {type.charAt(0).toUpperCase() + type.slice(1)}s
          </span>
        ))}
        <span className="ml-auto text-zinc-400">
          {graphData.nodes.length} nodes · {graphData.edges.length} connections
        </span>
      </div>

      {/* Canvas */}
      <div
        className="rounded-xl border border-zinc-200 bg-white overflow-hidden dark:border-zinc-800 dark:bg-zinc-900"
        style={{ height: "calc(100vh - 280px)", minHeight: 400 }}
      >
        <canvas ref={canvasRef} className="w-full h-full" />
      </div>
    </div>
  );
}
