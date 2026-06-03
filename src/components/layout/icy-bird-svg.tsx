import { cn } from "@/lib/utils";

type BirdProps = { className?: string; uid?: string };

/** Faceted crystal ice bird — opaque body, crisp edges, minimal bloom. */
function CrystalBirdArt({ uid }: { uid: string }) {
  const id = (n: string) => `${n}-${uid}`;
  return (
    <>
      <defs>
        <linearGradient id={id("core")} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="45%" stopColor="#e0f7ff" />
          <stop offset="100%" stopColor="#38bdf8" />
        </linearGradient>
        <linearGradient id={id("wing")} x1="0%" y1="30%" x2="100%" y2="70%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="55%" stopColor="#a5f3fc" />
          <stop offset="100%" stopColor="#0ea5e9" />
        </linearGradient>
        <linearGradient id={id("edge")} x1="0%" y1="50%" x2="100%" y2="50%">
          <stop offset="0%" stopColor="#f0f9ff" />
          <stop offset="100%" stopColor="#22d3ee" />
        </linearGradient>
      </defs>

      {/* Thin outer ring — not a blur blob */}
      <ellipse
        cx="58"
        cy="34"
        rx="44"
        ry="24"
        fill="none"
        stroke="#7dd3fc"
        strokeWidth="0.6"
        opacity="0.22"
        className="vodex-icy-bird-halo"
      />

      <g className="vodex-icy-bird-body">
        {/* Tail crystals */}
        <path
          d="M8 38 L2 44 L10 42 L6 48 L14 44 Z"
          fill={`url(#${id("edge")})`}
          stroke="#ffffff"
          strokeWidth="0.5"
        />
        <path d="M14 36 L10 40 L16 39 Z" fill="#ffffff" stroke="#bae6fd" strokeWidth="0.4" />

        <g className="vodex-icy-bird-wing vodex-icy-bird-wing--left">
          <path
            d="M32 30 L10 14 L20 22 L14 34 L26 28 Z"
            fill={`url(#${id("wing")})`}
            stroke="#ffffff"
            strokeWidth="0.75"
            strokeLinejoin="round"
          />
          <path d="M28 28 L14 10 L24 18 Z" fill="#ffffff" stroke="#e0f2fe" strokeWidth="0.45" />
          <path
            d="M26 32 L8 28 L18 36 Z"
            fill="#bae6fd"
            fillOpacity="0.55"
            stroke="#38bdf8"
            strokeWidth="0.4"
          />
          <path d="M22 24 L12 16 L20 20 Z" fill="#f0f9ff" stroke="#ffffff" strokeWidth="0.35" />
        </g>

        {/* Body — solid, readable silhouette */}
        <path
          d="M36 36 C40 24 50 16 62 14 C74 12 86 18 92 28 C96 36 90 44 78 46 C66 48 52 46 44 42 Z"
          fill={`url(#${id("core")})`}
          stroke="#ffffff"
          strokeWidth="0.9"
          strokeLinejoin="round"
        />
        <path d="M52 18 L64 16 L70 24 L58 26 Z" fill="#ffffff" opacity="0.75" stroke="#e0f2fe" strokeWidth="0.35" />
        <path d="M48 32 L58 30 L62 36 L52 38 Z" fill="#7dd3fc" opacity="0.35" stroke="none" />

        <g className="vodex-icy-bird-wing vodex-icy-bird-wing--right">
          <path
            d="M84 28 L106 12 L96 20 L102 32 L90 26 Z"
            fill={`url(#${id("wing")})`}
            stroke="#ffffff"
            strokeWidth="0.75"
            strokeLinejoin="round"
          />
          <path d="M88 26 L102 8 L92 16 Z" fill="#ffffff" stroke="#e0f2fe" strokeWidth="0.45" />
          <path
            d="M90 30 L108 26 L98 34 Z"
            fill="#bae6fd"
            fillOpacity="0.55"
            stroke="#38bdf8"
            strokeWidth="0.4"
          />
          <path d="M94 22 L104 14 L96 18 Z" fill="#f0f9ff" stroke="#ffffff" strokeWidth="0.35" />
        </g>

        {/* Head + beak + eye */}
        <path d="M64 12 L76 10 L82 16 L74 20 L66 18 Z" fill="#ffffff" stroke="#bae6fd" strokeWidth="0.5" />
        <path d="M78 14 L84 15 L80 17 Z" fill="#38bdf8" stroke="#0ea5e9" strokeWidth="0.35" />
        <circle cx="72" cy="15" r="2.6" fill="#ffffff" stroke="#7dd3fc" strokeWidth="0.4" />
        <circle cx="73" cy="14.8" r="1.25" fill="#06b6d4" className="vodex-icy-bird-eye" />
        <circle cx="73.6" cy="14.4" r="0.45" fill="#ffffff" opacity="0.95" />

        {/* Crystal highlights */}
        <path d="M46 22 L50 18 L54 22 L50 24 Z" fill="#ffffff" opacity="0.9" />
        <path d="M80 34 L84 30 L88 34 L84 36 Z" fill="#ffffff" opacity="0.65" />
      </g>

      {/* Crisp silhouette outline */}
      <path
        className="vodex-icy-bird-outline"
        d="M8 38 L14 36 L32 30 L36 36 C50 16 74 12 92 28 C96 36 84 28 106 12 L90 26 L64 12 L82 16 L78 46 L44 42 L26 32 L8 38 Z"
        fill="none"
        stroke="#ffffff"
        strokeWidth="0.55"
        strokeLinejoin="round"
        opacity="0.45"
      />
    </>
  );
}

export function IcyBirdSvgA({ className, uid = "a" }: BirdProps) {
  return (
    <svg
      viewBox="0 0 116 64"
      className={cn("vodex-icy-bird-svg", className)}
      aria-hidden
      data-testid="icy-bird-svg-a"
    >
      <CrystalBirdArt uid={uid} />
    </svg>
  );
}

export function IcyBirdSvgB({ className, uid = "b" }: BirdProps) {
  return (
    <svg
      viewBox="0 0 116 64"
      className={cn("vodex-icy-bird-svg", className)}
      aria-hidden
      data-testid="icy-bird-svg-b"
      style={{ transform: "scaleX(-1)" }}
    >
      <CrystalBirdArt uid={uid} />
    </svg>
  );
}
