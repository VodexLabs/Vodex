"use client";

import { IcyBirdSvgA, IcyBirdSvgB } from "@/components/layout/icy-bird-svg";

function IcyTrail({ side }: { side: "left" | "right" }) {
  return (
    <span className={`vodex-footer-bird-trail vodex-footer-bird-trail--${side}`} aria-hidden>
      <span className="vodex-footer-bird-trail-crystal vodex-footer-bird-trail-crystal--0" />
      <span className="vodex-footer-bird-trail-crystal vodex-footer-bird-trail-crystal--1" />
      <span className="vodex-footer-bird-trail-dot" />
      <span className="vodex-footer-bird-trail-streak" />
    </span>
  );
}

/** Left + right icy birds on mirrored loops that brush the center. */
export function FooterIcedBirds() {
  return (
    <div className="vodex-footer-birds-arena" aria-hidden data-testid="footer-iced-birds">
      <div className="vodex-footer-birds-layer">
        <div
          className="vodex-footer-bird-flyer vodex-footer-bird-orbit vodex-footer-bird-orbit--a"
          data-testid="footer-iced-bird-a"
        >
          <IcyTrail side="left" />
          <IcyBirdSvgA className="vodex-footer-bird-graphic" uid="footer-a" />
        </div>

        <div
          className="vodex-footer-bird-flyer vodex-footer-bird-orbit vodex-footer-bird-orbit--b"
          data-testid="footer-iced-bird-b"
        >
          <IcyTrail side="right" />
          <IcyBirdSvgB className="vodex-footer-bird-graphic" uid="footer-b" />
        </div>
      </div>
    </div>
  );
}
