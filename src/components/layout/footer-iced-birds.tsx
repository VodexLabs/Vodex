"use client";

/** Compact constellation-style icy birds (inspired by star-map aesthetic, not realistic). */
export function FooterIcedBirds() {
  return (
    <div
      className="vodex-footer-birds-layer pointer-events-none absolute inset-0"
      aria-hidden
      data-testid="footer-iced-birds"
    >
      <span className="vodex-footer-bird-trail vodex-footer-bird-trail--a" />
      <span className="vodex-footer-bird-trail vodex-footer-bird-trail--b" />

      <div className="vodex-footer-bird vodex-footer-bird--a" data-testid="footer-iced-bird-a">
        <svg viewBox="0 0 120 48" className="vodex-footer-bird-svg" aria-hidden>
          <defs>
            <linearGradient id="vodexBirdGlowA" x1="0%" y1="50%" x2="100%" y2="50%">
              <stop offset="0%" stopColor="#e0f2fe" stopOpacity="0.2" />
              <stop offset="45%" stopColor="#7dd3fc" stopOpacity="1" />
              <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.35" />
            </linearGradient>
            <filter id="vodexBirdBlurA" x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur stdDeviation="1.2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <g filter="url(#vodexBirdBlurA)" stroke="url(#vodexBirdGlowA)" strokeWidth="1.15" fill="none" strokeLinecap="round">
            <path className="vodex-footer-bird-wing" d="M8 28 L22 18 L38 20 L54 14 L72 16" />
            <path d="M22 18 L24 26 L38 24" opacity="0.7" />
            <path d="M54 14 L58 22 L72 20" opacity="0.55" />
          </g>
          <g fill="#f0f9ff">
            <circle cx="8" cy="28" r="2.2" className="vodex-footer-bird-spark" />
            <circle cx="22" cy="18" r="1.8" className="vodex-footer-bird-spark" style={{ animationDelay: "0.15s" }} />
            <circle cx="38" cy="20" r="1.6" className="vodex-footer-bird-spark" style={{ animationDelay: "0.3s" }} />
            <circle cx="54" cy="14" r="2" className="vodex-footer-bird-spark" style={{ animationDelay: "0.45s" }} />
            <circle cx="72" cy="16" r="1.7" className="vodex-footer-bird-spark" style={{ animationDelay: "0.6s" }} />
          </g>
          <circle cx="54" cy="14" r="3.5" fill="#bae6fd" opacity="0.35" />
        </svg>
      </div>

      <div className="vodex-footer-bird vodex-footer-bird--b" data-testid="footer-iced-bird-b">
        <svg viewBox="0 0 120 48" className="vodex-footer-bird-svg" aria-hidden>
          <defs>
            <linearGradient id="vodexBirdGlowB" x1="100%" y1="50%" x2="0%" y2="50%">
              <stop offset="0%" stopColor="#dbeafe" stopOpacity="0.25" />
              <stop offset="50%" stopColor="#93c5fd" stopOpacity="1" />
              <stop offset="100%" stopColor="#60a5fa" stopOpacity="0.3" />
            </linearGradient>
            <filter id="vodexBirdBlurB" x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur stdDeviation="1" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <g filter="url(#vodexBirdBlurB)" stroke="url(#vodexBirdGlowB)" strokeWidth="1.05" fill="none" strokeLinecap="round">
            <path className="vodex-footer-bird-wing" d="M112 22 L96 30 L78 26 L62 32 L44 28" />
            <path d="M96 30 L94 22 L78 24" opacity="0.65" />
          </g>
          <g fill="#ffffff">
            <circle cx="112" cy="22" r="2" className="vodex-footer-bird-spark" />
            <circle cx="96" cy="30" r="1.7" className="vodex-footer-bird-spark" style={{ animationDelay: "0.2s" }} />
            <circle cx="78" cy="26" r="1.5" className="vodex-footer-bird-spark" style={{ animationDelay: "0.35s" }} />
            <circle cx="62" cy="32" r="1.9" className="vodex-footer-bird-spark" style={{ animationDelay: "0.5s" }} />
            <circle cx="44" cy="28" r="1.6" className="vodex-footer-bird-spark" style={{ animationDelay: "0.65s" }} />
          </g>
        </svg>
      </div>
    </div>
  );
}
