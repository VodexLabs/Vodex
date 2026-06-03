"use client";

import { IcyBirdSvgA, IcyBirdSvgB } from "@/components/layout/icy-bird-svg";

function IcyTrail({ variant }: { variant: "a" | "b" }) {
  return (
    <span className="vodex-footer-bird-trail" aria-hidden>
      <span className="vodex-footer-bird-trail-particle vodex-footer-bird-trail-particle--0" />
      <span className="vodex-footer-bird-trail-particle vodex-footer-bird-trail-particle--1" />
      <span className="vodex-footer-bird-trail-particle vodex-footer-bird-trail-particle--2" />
      <span
        className={`vodex-footer-bird-trail-snowflake ${variant === "b" ? "vodex-footer-bird-trail-snowflake--b" : ""}`}
      />
      <span className="vodex-footer-bird-trail-streak" aria-hidden />
    </span>
  );
}

/** Two crystal icy birds on mirrored elliptical paths, clipped inside the footer. */
export function FooterIcedBirds() {
  return (
    <div className="vodex-footer-birds-arena" aria-hidden data-testid="footer-iced-birds">
      <div className="vodex-footer-birds-layer">
        <div
          className="vodex-footer-bird-flyer vodex-footer-bird-orbit vodex-footer-bird-orbit--a"
          data-testid="footer-iced-bird-a"
        >
          <IcyTrail variant="a" />
          <IcyBirdSvgA className="vodex-footer-bird-graphic" uid="footer-a" />
        </div>

        <div
          className="vodex-footer-bird-flyer vodex-footer-bird-orbit vodex-footer-bird-orbit--b"
          data-testid="footer-iced-bird-b"
        >
          <IcyTrail variant="b" />
          <IcyBirdSvgB className="vodex-footer-bird-graphic" uid="footer-b" />
        </div>
      </div>
    </div>
  );
}
