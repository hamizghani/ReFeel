import { useEffect, useState } from "react";
import {
  ArrowUpRightIcon,
  PlayIcon,
  PauseIcon,
  MagnifyingGlassPlusIcon,
  MagnifyingGlassMinusIcon,
} from "@phosphor-icons/react";
import type { Evidence, Listing } from "../domain";
const detailPositions: Record<string, [number, number]> = {
  "cloud-poplin": [75.75, 76.2],
  "moss-knit": [74, 75],
  "airloom-linen": [67, 60],
  "petal-tee": [63, 35],
  "sunday-denim": [38, 50],
  "ink-trousers": [71, 76],
  "apricot-slip": [66, 48],
  "tide-shirt": [51, 43],
  "oat-vest": [74, 75],
  "lilac-wrap": [68, 66],
  "rose-jacket": [65, 64],
  "sage-skirt": [45, 29],
  "my-blue-blouse": [59, 74],
};
export default function SourceCapture({
  listing,
  evidence,
  onAvailable,
}: {
  listing: Listing;
  evidence: Evidence;
  onAvailable?: (value: boolean) => void;
}) {
  const [failed, setFailed] = useState(false),
    [retry, setRetry] = useState(0),
    [marker, setMarker] = useState(true),
    [zoom, setZoom] = useState(1),
    [frame, setFrame] = useState(0),
    [playing, setPlaying] = useState(false);
  const sequence =
    evidence.property === "Movement" &&
    !!listing.model &&
    evidence.support !== "unavailable";
  useEffect(() => {
    setFailed(false);
    setZoom(1);
    setFrame(0);
    setPlaying(false);
    onAvailable?.(true);
  }, [evidence.source]);
  useEffect(() => {
    if (!playing) return;
    let count = 0;
    const id = setInterval(() => {
      count++;
      setFrame((count % 3) + 1);
      if (count >= 3) {
        setPlaying(false);
        clearInterval(id);
      }
    }, 650);
    return () => clearInterval(id);
  }, [playing]);
  const src =
    sequence && frame
      ? evidence.source.replace(".svg", `-frame${frame}.svg`)
      : evidence.source;
  const point =
    evidence.property === "Surface"
      ? detailPositions[listing.id] || [50, 50]
      : evidence.property === "Movement"
        ? [50, 72]
        : [50, 45];
  return (
    <figure className="source-figure">
      <div className={`source-image ${failed ? "source-failed" : ""}`}>
        {failed ? (
          <div className="source-recovery" role="alert">
            <h3>The capture frame could not load.</h3>
            <p>This observation cannot be inspected right now.</p>
            <button
              className="button secondary"
              onClick={() => {
                setRetry(retry + 1);
                setFailed(false);
                onAvailable?.(true);
              }}
            >
              Retry source frame
            </button>
          </div>
        ) : (
          <div
            className="source-zoom"
            style={{
              transform: `scale(${zoom})`,
              transformOrigin: `${point[0]}% ${point[1]}%`,
            }}
          >
            <img
              key={`${src}-${retry}`}
              src={src + (retry ? `?retry=${retry}` : "")}
              width="800"
              height="680"
              alt={`Prepared ${evidence.property.toLowerCase()} capture frame for ${listing.name}`}
              onError={() => {
                setFailed(true);
                setPlaying(false);
                onAvailable?.(false);
              }}
            />
            {marker && evidence.support !== "unavailable" && (
              <span
                className="source-marker"
                style={{ left: point[0] + "%", top: point[1] + "%" }}
                role="img"
                aria-label="Observed detail marker"
              >
                <span />
              </span>
            )}
          </div>
        )}
        <div className="source-caption">
          <span>Prepared capture frame</span>
          <span>{frame ? `Sequence frame ${frame} of 3` : evidence.frame}</span>
        </div>
      </div>
      <figcaption>
        <span>
          Source ·{" "}
          {evidence.property === "Movement"
            ? "Movement sequence"
            : evidence.property === "Surface"
              ? "Surface close-up"
              : evidence.property === "Stretch"
                ? "Front view"
                : "Full garment view"}
        </span>
        <div className="source-controls">
          <button
            className="text-link"
            onClick={() => setMarker(!marker)}
            aria-pressed={marker}
          >
            {marker ? "Hide marker" : "Show marker"}
          </button>
          <button
            className="source-icon"
            disabled={failed || zoom >= 2}
            aria-label="Zoom source frame in"
            onClick={() => setZoom(Math.min(2, zoom + 0.25))}
          >
            <MagnifyingGlassPlusIcon size={20} />
          </button>
          <button
            className="source-icon"
            disabled={failed || zoom <= 1}
            aria-label="Zoom source frame out"
            onClick={() => setZoom(Math.max(1, zoom - 0.25))}
          >
            <MagnifyingGlassMinusIcon size={20} />
          </button>
        </div>
      </figcaption>
      {sequence && !failed && (
        <div className="sequence-controls">
          <button
            className="button secondary"
            onClick={() => {
              setFrame(1);
              setPlaying(!playing);
            }}
          >
            {playing ? <PauseIcon size={18} /> : <PlayIcon size={18} />}{" "}
            {playing ? "Pause sequence" : "Play sequence"}
          </button>
          {[1, 2, 3].map((n) => (
            <button
              key={n}
              className={`button ${frame === n ? "primary" : "secondary"}`}
              aria-label={`Show sequence frame ${n}`}
              aria-pressed={frame === n}
              onClick={() => {
                setPlaying(false);
                setFrame(n);
              }}
            >
              {n}
            </button>
          ))}
        </div>
      )}
      <a
        className="text-link"
        href={evidence.source}
        target="_blank"
        rel="noreferrer"
      >
        Open original source frame <ArrowUpRightIcon size={16} />
      </a>
    </figure>
  );
}
