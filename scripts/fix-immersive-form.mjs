import fs from "node:fs";

const p = "src/components/create/workspace/immersive-workspace.tsx";
let s = fs.readFileSync(p, "utf8");

s = s.replace(
  `<div className={cn("rounded-xl", modeStyle.composerWrap)}>`,
  `<form
              className={cn("rounded-xl", modeStyle.composerWrap)}
              onSubmit={(e) => {
                e.preventDefault();
                submitDebug("create", "form submit");
                void submit("form");
              }}
            >`,
);

s = s.replace(
  `onChange={(e) => setInput(e.target.value)}`,
  `onChange={(e) => {
                  setInput(e.target.value);
                  if (process.env.NODE_ENV !== "production" && e.target.value.length === 1) {
                    submitDebug("create", "input value changed", { len: e.target.value.length });
                  }
                }}`,
);

s = s.replace(
  `void submit();`,
  `submitDebug("create", "Enter pressed");
                    void submit("enter");`,
);

s = s.replace(
  `            </form>
          </div>
        </motion.div>

        <motion.div layout={false} className="flex min-w-0 flex-1 flex-col overflow-hidden bg-atmosphere">`,
  `            </form>
          </motion.div>
        </motion.div>

        <motion.div layout={false} className="flex min-w-0 flex-1 flex-col overflow-hidden bg-atmosphere">`,
);

// Fix wrong closing if motion.div was wrong - use correct structure
s = s.replace(
  `            </form>
          </motion.div>
        </motion.div>

        <motion.div layout={false} className="flex min-w-0 flex-1 flex-col overflow-hidden bg-atmosphere">`,
  `            </form>
          </motion.div>
        </motion.div>

        <div className="flex min-w-0 flex-1 flex-col overflow-hidden bg-atmosphere">`,
);

// If we have duplicate motion.div issues, fix left column close
s = s.replace(
  `          </motion.div>
        </motion.div>

        <motion.div layout={false} className="flex min-w-0 flex-1 flex-col overflow-hidden bg-atmosphere">`,
  `          </motion.div>
        </motion.div>

        <motion.div className="flex min-w-0 flex-1 flex-col overflow-hidden bg-atmosphere">`,
);

fs.writeFileSync(p, s);
console.log("fixed form", s.includes("<form"), s.includes("</form>"));
