import fs from "node:fs";

const p = "src/components/create/workspace/workspace-launcher.tsx";
let s = fs.readFileSync(p, "utf8");

const logoutStart = s.indexOf('      <div className="border-t border-border p-1.5">');
if (logoutStart >= 0 && s.slice(logoutStart, logoutStart + 400).includes("Log out")) {
  const end = s.indexOf("    </motion.div>", logoutStart);
  if (end > logoutStart) s = s.slice(0, logoutStart) + s.slice(end);
}

const chromeStart = s.indexOf("{showAppChrome ? (");
if (chromeStart >= 0) {
  const chromeEnd = s.indexOf("          <div className=\"min-w-0 flex-1\">", chromeStart);
  const replacement = `          <button
            ref={logoRef}
            type="button"
            onClick={() => {
              if (!openWs && logoRef.current) setWsRect(logoRef.current.getBoundingClientRect());
              setOpenWs((v) => !v);
              setOpenApp(false);
            }}
            className="group flex size-10 shrink-0 items-center justify-center rounded-xl bg-background/90 p-1.5 ring-1 ring-border/50 transition hover:bg-surface hover:ring-accent/25"
            aria-label="Workspace menu"
          >
            <LogoIcon size={28} className="opacity-95 transition group-hover:opacity-100" />
          </button>

          {hasAppIcon && project?.icon_url ? (
            <motion.div layout={false} className="relative flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-background shadow-md ring-2 ring-accent/15">
              <Image src={project.icon_url} alt="" width={40} height={40} className="size-full object-cover" unoptimized />
            </motion.div>
          ) : null}

`;
  s = s.slice(0, chromeStart) + replacement + s.slice(chromeEnd);
}

fs.writeFileSync(p, s);
console.log("done", { logout: !s.includes("handleLogout"), chrome: !s.includes("showAppChrome") });
