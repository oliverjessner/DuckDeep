export type Side = "human" | "ai";

export type ZoneId = "surface" | "reeds" | "shallow" | "deep" | "pearl";

export type NodeType = "move" | "hole" | "goal";

export type MoveValue = 1 | 2 | 3 | 4;

export type DuckStatus = "active" | "secured" | "eliminated" | "winner";

export type CoinState = "hidden" | "flipping" | "revealed" | "used";

export type GamePhase =
  | "choose-coin"
  | "coin-flip"
  | "choose-duck"
  | "choose-path"
  | "moving"
  | "zone-transition"
  | "ai-thinking"
  | "victory"
  | "defeat";

export type BoardNode = {
  id: string;
  x: number;
  y: number;
  type: NodeType;
};

export type BoardEdge = {
  from: string;
  to: string;
};

export type BoardGraph = {
  zoneId: ZoneId;
  label: string;
  assetUrl: string;
  expectedHoleCount: number;
  viewBox: { x: number; y: number; width: number; height: number };
  nodes: Record<string, BoardNode>;
  edges: BoardEdge[];
  adjacency: Record<string, string[]>;
  holes: string[];
  goal: string | null;
};

export type Duck = {
  id: string;
  side: Side;
  nodeId: string | null;
  status: DuckStatus;
};

export type Coin = {
  id: string;
  value: MoveValue;
  state: CoinState;
};

export type MoveAnimation = {
  id: number;
  duckId: string;
  path: string[];
  step: number;
};

export type PendingResolution = "end-turn" | "zone-transition" | null;

export type GameState = {
  zone: ZoneId;
  phase: GamePhase;
  turn: Side;
  ducks: Duck[];
  coins: Coin[];
  coinCycle: number;
  currentCoinId: string | null;
  currentMoveValue: MoveValue | null;
  selectedDuckId: string | null;
  selectedPath: string[];
  animation: MoveAnimation | null;
  pendingResolution: PendingResolution;
  winner: Side | null;
  randomSeed: number;
  turnCount: number;
  message: string;
};

export type LegalMove = {
  duckId: string;
  path: string[];
  destination: string;
  landsOnHole: boolean;
  score?: number;
};
