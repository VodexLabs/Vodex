"use client";

export function FloatingBackground() {
  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden"
      aria-hidden
    >
      <div className="ds-orb absolute -left-[22%] top-[-22%] h-[560px] w-[560px] rounded-full bg-[radial-gradient(circle_at_center,color-mix(in_oklab,var(--accent)_22%,transparent),transparent_62%)] blur-3xl" />
      <div className="ds-orb ds-orb-2 absolute right-[-14%] top-[6%] h-[460px] w-[460px] rounded-full bg-[radial-gradient(circle_at_center,color-mix(in_oklab,#9dc6ff_18%,transparent),transparent_64%)] blur-3xl" />
      <div className="ds-orb ds-orb-3 absolute bottom-[-26%] left-[12%] h-[520px] w-[520px] rounded-full bg-[radial-gradient(circle_at_center,color-mix(in_oklab,var(--accent)_14%,transparent),transparent_66%)] blur-3xl" />
      <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent,color-mix(in_oklab,var(--background)_88%,transparent))]" />
    </div>
  );
}
