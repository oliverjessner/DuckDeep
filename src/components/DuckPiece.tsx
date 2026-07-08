import blueDuckSheet from "../../assets/sprites/blue_duck_sprite.png";
import greenDuckSheet from "../../assets/sprites/green_duck_sprite.png";
import type { BoardGraph, Duck } from "../game/types";
import { useEffect, useState } from "react";

type DuckPieceProps = {
  duck: Duck;
  graph: BoardGraph;
  eligible: boolean;
  selected: boolean;
  moving: boolean;
  onDuckClick: (duckId: string) => void;
};

const rowByStatus = {
  active: 0,
  secured: 2,
  eliminated: 2,
  winner: 3,
};

const DUCK_SHEET_WIDTH = 1448;
const DUCK_SHEET_HEIGHT = 1086;
const DUCK_COLUMNS = 6;
const DUCK_ROWS = 4;
const DUCK_FRAME_HEIGHT = DUCK_SHEET_HEIGHT / DUCK_ROWS;
const DUCK_CROP_WIDTH = 210;

const DUCK_FRAME_CENTERS: Record<number, number[]> = {
  0: [152, 357.5, 577.5, 794.5, 1006.5, 1225.5],
  1: [150, 365.5, 576, 789, 999.5, 1237],
  2: [144, 353, 674, 893, 1018, 1239],
  3: [159, 377.5, 595, 802, 1012.5, 1236.5],
};

const DUCK_ROW_CROPS: Record<number, { y: number; height: number }> = {
  0: { y: 0, height: DUCK_FRAME_HEIGHT },
  1: { y: 300, height: 250 },
  2: { y: DUCK_FRAME_HEIGHT * 2, height: DUCK_FRAME_HEIGHT },
  3: { y: DUCK_FRAME_HEIGHT * 3, height: DUCK_FRAME_HEIGHT },
};

function useDuckFrame(shouldAnimate: boolean, frameMs: number) {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    if (!shouldAnimate) {
      setFrame(0);
      return;
    }
    const timer = window.setInterval(() => {
      setFrame((current) => (current + 1) % DUCK_COLUMNS);
    }, frameMs);
    return () => window.clearInterval(timer);
  }, [frameMs, shouldAnimate]);

  return frame;
}

export function DuckPiece({ duck, graph, eligible, selected, moving, onDuckClick }: DuckPieceProps) {
  const animationState = duck.status === "winner" ? "celebrate" : moving ? "move" : duck.status;
  const row = duck.status === "winner" ? 3 : moving ? 1 : rowByStatus[duck.status];
  const frame = useDuckFrame(duck.status === "active" || duck.status === "winner", moving ? 85 : 145);
  const cropX = (DUCK_FRAME_CENTERS[row][frame] ?? DUCK_FRAME_CENTERS[row][0]) - DUCK_CROP_WIDTH / 2;
  const rowCrop = DUCK_ROW_CROPS[row];
  const viewBox = `${cropX} ${rowCrop.y} ${DUCK_CROP_WIDTH} ${rowCrop.height}`;
  if (!duck.nodeId || duck.status === "eliminated") return null;
  const node = graph.nodes[duck.nodeId];
  if (!node) return null;
  const sheet = duck.side === "human" ? blueDuckSheet : greenDuckSheet;
  const className = [
    "duck-piece",
    `side-${duck.side}`,
    `duck-${animationState}`,
    eligible ? "is-eligible" : "",
    selected ? "is-selected" : "",
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <button
      type="button"
      className={className}
      style={{ left: `${(node.x / graph.viewBox.width) * 100}%`, top: `${(node.y / graph.viewBox.height) * 100}%` }}
      disabled={!eligible}
      onClick={() => onDuckClick(duck.id)}
      aria-label={`${duck.side === "human" ? "Human" : "AI"} duck ${duck.id}`}
    >
      <svg
        className="duck-sprite"
        viewBox={viewBox}
        preserveAspectRatio="xMidYMid meet"
        focusable="false"
        aria-hidden="true"
      >
        <image href={sheet} width={DUCK_SHEET_WIDTH} height={DUCK_SHEET_HEIGHT} />
      </svg>
      <span className="duck-label">{duck.id}</span>
    </button>
  );
}
