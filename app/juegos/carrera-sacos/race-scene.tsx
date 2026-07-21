import Image from "next/image";
import type { CSSProperties } from "react";
import styles from "./race-scene.module.css";

type RaceSceneProps = {
  progress: number;
  state: "idle" | "playing" | "paused" | "completed";
  isJumping: boolean;
  nextObstacle: number | undefined;
  assistanceWindow: number;
};

type SceneStyle = CSSProperties & {
  "--mountains-position": string;
  "--trees-position": string;
  "--ground-position": string;
};

const obstaclePositions = [25, 50, 75];
const coinPositions = [13, 37, 62, 88];

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(Math.max(value, minimum), maximum);
}

function toScreenPosition(worldPosition: number, progress: number) {
  return 28 + (worldPosition - progress) * 1.65;
}

function isNearObstacle(position: number) {
  return obstaclePositions.some((obstacle) => Math.abs(obstacle - position) < 4.5);
}

export function RaceScene({
  progress,
  state,
  isJumping,
  nextObstacle,
  assistanceWindow,
}: RaceSceneProps) {
  const redProgress = clamp(progress + 2 + Math.sin(progress / 8) * 3, 0, 100);
  const purpleProgress = clamp(progress - 2 + Math.cos(progress / 10) * 4, 0, 100);
  const redScreenPosition = clamp(28 + (redProgress - progress) * 1.6, 10, 88);
  const purpleScreenPosition = clamp(28 + (purpleProgress - progress) * 1.6, 10, 88);
  const sceneStyle: SceneStyle = {
    "--mountains-position": `${-progress * 3}px`,
    "--trees-position": `${-progress * 6}px`,
    "--ground-position": `${-progress * 11}px`,
  };
  const active = state === "playing";
  const paused = state === "paused";
  const completed = state === "completed";
  const sceneLabel = `Carrera ilustrada. Tu corredor está en ${Math.round(progress)} por ciento. El rival rojo está en ${Math.round(redProgress)} por ciento y el rival morado en ${Math.round(purpleProgress)} por ciento.`;

  return (
    <div
      role="img"
      aria-label={sceneLabel}
      className={`${styles.scene} ${paused ? styles.paused : ""}`}
      style={sceneStyle}
    >
      <div aria-hidden="true" className={styles.sky} />
      <div aria-hidden="true" className={`${styles.layer} ${styles.mountains}`} />
      <div aria-hidden="true" className={`${styles.layer} ${styles.trees}`} />
      <div aria-hidden="true" className={`${styles.layer} ${styles.ground}`} />
      <div aria-hidden="true" className={`${styles.laneLine} ${styles.laneLineTop}`} />
      <div aria-hidden="true" className={`${styles.laneLine} ${styles.laneLineMiddle}`} />

      <div aria-hidden="true" className={styles.hud}>
        <span>Tu progreso: {Math.round(progress)}%</span>
        <span>{nextObstacle === undefined ? "Meta a la vista" : `Próximo salto: ${Math.max(0, Math.round(nextObstacle - progress))}%`}</span>
      </div>

      {coinPositions.map((coin) => {
        const left = toScreenPosition(coin, progress);
        if (left < -8 || left > 108) {
          return null;
        }
        return (
          <Image
            key={coin}
            aria-hidden="true"
            alt=""
            className={styles.coin}
            src="/games/carrera-sacos/objects/coin.svg"
            width={80}
            height={80}
            style={{ left: `${left}%` }}
          />
        );
      })}

      {obstaclePositions.map((obstacle) => {
        const left = toScreenPosition(obstacle, progress);
        if (left < -12 || left > 112) {
          return null;
        }
        const isNext = obstacle === nextObstacle;
        return (
          <div
            key={obstacle}
            aria-hidden="true"
            className={`${styles.obstacleWrap} ${isNext ? styles.nextObstacle : ""}`}
            style={{ left: `${left}%` }}
          >
            {isNext ? <span>Salta aquí</span> : null}
            <Image alt="" src="/games/carrera-sacos/objects/hay-bale.svg" width={150} height={115} />
          </div>
        );
      })}

      {toScreenPosition(100, progress) < 112 ? (
        <Image
          aria-hidden="true"
          alt=""
          className={styles.finish}
          src="/games/carrera-sacos/objects/finish.svg"
          width={180}
          height={300}
          style={{ left: `${toScreenPosition(100, progress)}%` }}
        />
      ) : null}

      <div
        aria-hidden="true"
        className={`${styles.racer} ${styles.purpleRacer}`}
        style={{ left: `${purpleScreenPosition}%` }}
      >
        <span className={styles.racerName}>Rival morado</span>
        <Image
          alt=""
          className={`${styles.sprite} ${active ? styles.running : ""} ${isNearObstacle(purpleProgress) ? styles.jumping : ""} ${completed ? styles.celebrating : ""}`}
          src="/games/carrera-sacos/characters/rival-purple.svg"
          width={220}
          height={260}
          priority
        />
      </div>

      <div
        aria-hidden="true"
        className={`${styles.racer} ${styles.redRacer}`}
        style={{ left: `${redScreenPosition}%` }}
      >
        <span className={styles.racerName}>Rival rojo</span>
        <Image
          alt=""
          className={`${styles.sprite} ${active ? styles.runningAlt : ""} ${isNearObstacle(redProgress) ? styles.jumping : ""} ${completed ? styles.celebrating : ""}`}
          src="/games/carrera-sacos/characters/rival-red.svg"
          width={220}
          height={260}
          priority
        />
      </div>

      <div aria-hidden="true" className={`${styles.racer} ${styles.playerRacer}`} style={{ left: "28%" }}>
        <span className={`${styles.racerName} ${styles.playerName}`}>Tú</span>
        <Image
          alt=""
          className={`${styles.sprite} ${active ? styles.running : ""} ${isJumping ? styles.jumping : ""} ${completed ? styles.celebrating : ""}`}
          src="/games/carrera-sacos/characters/player.svg"
          width={220}
          height={260}
          priority
        />
      </div>

      {nextObstacle !== undefined ? (
        <div
          aria-hidden="true"
          className={styles.jumpWindow}
          style={{
            left: `${clamp(toScreenPosition(nextObstacle - assistanceWindow, progress), 0, 100)}%`,
            width: `${clamp(assistanceWindow * 3.3, 12, 62)}%`,
          }}
        >
          Ventana amplia de salto
        </div>
      ) : null}
    </div>
  );
}
