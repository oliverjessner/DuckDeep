import coinSheet from "../../assets/coins/coins.png";
import type { Coin, MoveValue } from "../game/types";

type CoinTrayProps = {
  coins: Coin[];
  disabled: boolean;
  onCoinClick: (coinId: string) => void;
};

const COIN_SHEET_WIDTH = 1448;
const COIN_SHEET_HEIGHT = 1086;
const COIN_CELL_WIDTH = COIN_SHEET_WIDTH / 4;
const COIN_CROP_SIZE = 340;
const COIN_CROP_INSET_X = 11;
const FRONT_CROP_Y = 158;
const BACK_CROP_Y = 556;

function CoinArt({ value }: { value: MoveValue | "front" }) {
  const column = value === "front" ? 0 : value - 1;
  const x = column * COIN_CELL_WIDTH + COIN_CROP_INSET_X;
  const y = value === "front" ? FRONT_CROP_Y : BACK_CROP_Y;
  return (
    <svg
      className="coin-art"
      viewBox={`${x} ${y} ${COIN_CROP_SIZE} ${COIN_CROP_SIZE}`}
      preserveAspectRatio="xMidYMid meet"
      focusable="false"
      aria-hidden="true"
    >
      <image href={coinSheet} width={COIN_SHEET_WIDTH} height={COIN_SHEET_HEIGHT} />
    </svg>
  );
}

function CoinButton({ coin, disabled, onCoinClick }: { coin: Coin; disabled: boolean; onCoinClick: (coinId: string) => void }) {
  const revealed = coin.state === "revealed" || coin.state === "used";
  const className = ["coin-button", coin.state === "flipping" ? "is-flipping" : "", revealed ? "is-revealed" : ""]
    .filter(Boolean)
    .join(" ");
  return (
    <button
      className={className}
      type="button"
      disabled={disabled || coin.state !== "hidden"}
      onClick={() => onCoinClick(coin.id)}
      aria-label={revealed ? `Revealed movement coin: ${coin.value}` : "Hidden movement coin"}
    >
      <span className="coin-inner" aria-hidden="true">
        <span className="coin-face coin-front">
          <CoinArt value="front" />
        </span>
        <span className="coin-face coin-back">
          <CoinArt value={coin.value} />
        </span>
      </span>
    </button>
  );
}

export function CoinTray({ coins, disabled, onCoinClick }: CoinTrayProps) {
  return (
    <section className="coin-tray" aria-label="Movement coins">
      {coins.map((coin) => (
        <CoinButton key={coin.id} coin={coin} disabled={disabled} onCoinClick={onCoinClick} />
      ))}
    </section>
  );
}
