"use client";

/** Two subtle icy birds looping behind footer links (always visible mid-flight). */
export function FooterIcedBirds() {
  return (
    <div
      className="vodex-footer-birds-layer pointer-events-none absolute inset-0"
      aria-hidden
      data-testid="footer-iced-birds"
    >
      <span className="vodex-footer-bird-trail vodex-footer-bird-trail--a" />
      <span className="vodex-footer-bird-trail vodex-footer-bird-trail--b" />
      <svg
        className="vodex-footer-bird vodex-footer-bird--a"
        viewBox="0 0 64 32"
        aria-hidden
        data-testid="footer-iced-bird-a"
      >
        <defs>
          <linearGradient id="vodexFooterBirdGradA" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f0f9ff" />
            <stop offset="55%" stopColor="#bae6fd" />
            <stop offset="100%" stopColor="#38bdf8" />
          </linearGradient>
        </defs>
        <path
          d="M4 20 C18 8 28 8 38 14 L52 10 L48 18 C38 22 28 26 14 24 Z"
          fill="url(#vodexFooterBirdGradA)"
          opacity="0.88"
        />
      </svg>
      <svg
        className="vodex-footer-bird vodex-footer-bird--b"
        viewBox="0 0 64 32"
        aria-hidden
        data-testid="footer-iced-bird-b"
      >
        <defs>
          <linearGradient id="vodexFooterBirdGradB" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#e0f2fe" />
            <stop offset="100%" stopColor="#ffffff" />
          </linearGradient>
        </defs>
        <path
          d="M6 18 C20 6 32 10 42 16 L58 12 L54 20 C42 24 28 24 16 22 Z"
          fill="url(#vodexFooterBirdGradB)"
          opacity="0.72"
        />
      </svg>
    </div>
  );
}
