import { cn } from "@/lib/utils";

type BirdProps = { className?: string; uid?: string; mirrored?: boolean };

function CrystalBirdPaths({ uid }: { uid: string }) {
  const g = (name: string) => `${name}-${uid}`;
  return (
    <>
      <defs>
        <linearGradient id={g("body")} x1="20%" y1="0%" x2="80%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="35%" stopColor="#e0f7fa" />
          <stop offset="70%" stopColor="#7dd3fc" />
          <stop offset="100%" stopColor="#38bdf8" />
        </linearGradient>
        <linearGradient id={g("wing")} x1="0%" y1="50%" x2="100%" y2="50%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.98" />
          <stop offset="50%" stopColor="#bae6fd" stopOpacity="0.92" />
          <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0.78" />
        </linearGradient>
        <linearGradient id={g("shard")} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f0f9ff" />
          <stop offset="100%" stopColor="#67e8f9" stopOpacity="0.88" />
        </linearGradient>
        <radialGradient id={g("aura")} cx="50%" cy="45%" r="55%">
          <stop offset="0%" stopColor="#bae6fd" stopOpacity="0.45" />
          <stop offset="70%" stopColor="#38bdf8" stopOpacity="0.1" />
          <stop offset="100%" stopColor="#38bdf8" stopOpacity="0" />
        </radialGradient>
      </defs>

      <ellipse cx="50" cy="30" rx="36" ry="20" fill={`url(#${g("aura")})`} className="vodex-icy-bird-aura" />

      <g className="vodex-icy-bird-body">
        <path d="M12 34 L8 40 L14 38 Z" fill={`url(#${g("shard")})`} stroke="#e0f2fe" strokeWidth="0.4" />
        <path d="M16 32 L10 36 L15 35 Z" fill="#ffffff" opacity="0.72" stroke="#bae6fd" strokeWidth="0.35" />

        <g className="vodex-icy-bird-wing vodex-icy-bird-wing--left">
          <path
            d="M28 28 L14 18 L22 24 L18 32 Z"
            fill={`url(#${g("wing")})`}
            stroke="#ffffff"
            strokeWidth="0.45"
          />
          <path d="M26 26 L16 14 L24 20 Z" fill="#ffffff" opacity="0.88" stroke="#e0f2fe" strokeWidth="0.35" />
          <path d="M24 30 L12 26 L20 32 Z" fill={`url(#${g("shard")})`} stroke="#7dd3fc" strokeWidth="0.35" />
        </g>

        <path
          d="M34 32 C38 22 46 16 56 15 C64 14 72 18 76 26 C78 32 74 38 66 40 C58 42 48 40 42 36 Z"
          fill={`url(#${g("body")})`}
          stroke="#ffffff"
          strokeWidth="0.65"
          strokeLinejoin="round"
        />
        <path d="M48 20 L58 18 L62 24 L52 26 Z" fill="#ffffff" opacity="0.58" stroke="#e0f2fe" strokeWidth="0.3" />

        <g className="vodex-icy-bird-wing vodex-icy-bird-wing--right">
          <path
            d="M72 26 L88 16 L80 22 L84 30 Z"
            fill={`url(#${g("wing")})`}
            stroke="#ffffff"
            strokeWidth="0.45"
          />
          <path d="M74 24 L86 12 L78 18 Z" fill="#ffffff" opacity="0.88" stroke="#e0f2fe" strokeWidth="0.35" />
          <path d="M76 28 L90 24 L82 32 Z" fill={`url(#${g("shard")})`} stroke="#7dd3fc" strokeWidth="0.35" />
        </g>

        <path d="M58 14 L66 12 L70 16 L64 18 Z" fill="#ffffff" stroke="#bae6fd" strokeWidth="0.4" />
        <circle cx="64" cy="15" r="2.2" fill="#ffffff" />
        <circle cx="64.8" cy="14.8" r="1.1" fill="#0ea5e9" className="vodex-icy-bird-eye" />
        <path d="M66 14 L70 15 L68 16 Z" fill="#38bdf8" opacity="0.92" />

        <circle cx="44" cy="12" r="0.9" fill="#ffffff" opacity="0.92" className="vodex-icy-bird-sparkle" />
        <circle cx="78" cy="20" r="0.7" fill="#ffffff" opacity="0.8" className="vodex-icy-bird-sparkle vodex-icy-bird-sparkle--d1" />
        <circle cx="32" cy="22" r="0.6" fill="#e0f2fe" opacity="0.85" className="vodex-icy-bird-sparkle vodex-icy-bird-sparkle--d2" />
      </g>
    </>
  );
}

export function IcyBirdSvgA({ className, uid = "a" }: BirdProps) {
  return (
    <svg
      viewBox="0 0 100 58"
      className={cn("vodex-icy-bird-svg", className)}
      aria-hidden
      data-testid="icy-bird-svg-a"
    >
      <CrystalBirdPaths uid={uid} />
    </svg>
  );
}

export function IcyBirdSvgB({ className, uid = "b" }: BirdProps) {
  return (
    <svg
      viewBox="0 0 100 58"
      className={cn("vodex-icy-bird-svg vodex-icy-bird-svg--mirrored", className)}
      aria-hidden
      data-testid="icy-bird-svg-b"
      style={{ transform: "scaleX(-1)" }}
    >
      <CrystalBirdPaths uid={uid} />
    </svg>
  );
}
