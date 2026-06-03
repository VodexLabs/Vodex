"use client";

import Image from "next/image";

/** Premium static icy bird PNG (transparent, trail baked in). */
export const FOOTER_ICY_BIRD_SRC = "/footer/icy-bird-static.png";

const BIRD_WIDTH = 420;
const BIRD_HEIGHT = 234;

/** Two static crystal birds anchored to the left/right footer edges. */
export function FooterIcedBirds() {
  return (
    <div className="vodex-footer-birds-arena" aria-hidden data-testid="footer-iced-birds">
      <div className="vodex-footer-birds-layer">
        <div className="vodex-footer-bird-static vodex-footer-bird-static--left" data-testid="footer-iced-bird-a">
          <Image
            src={FOOTER_ICY_BIRD_SRC}
            alt=""
            width={BIRD_WIDTH}
            height={BIRD_HEIGHT}
            className="vodex-footer-bird-png"
            sizes="(max-width: 768px) 110px, 150px"
            draggable={false}
          />
        </div>
        <div className="vodex-footer-bird-static vodex-footer-bird-static--right" data-testid="footer-iced-bird-b">
          <Image
            src={FOOTER_ICY_BIRD_SRC}
            alt=""
            width={BIRD_WIDTH}
            height={BIRD_HEIGHT}
            className="vodex-footer-bird-png vodex-footer-bird-png--mirrored"
            sizes="(max-width: 768px) 110px, 150px"
            draggable={false}
          />
        </div>
      </div>
    </div>
  );
}
