#!/usr/bin/env node
import { repairImportedThinFiles } from "../src/lib/imports/repair-imported-thin-files.ts";
import { isThinGeneratedFile } from "../src/lib/build/meaningful-file-guard.ts";

const thin = [
  { path: "src/Layout.jsx", content: "export default function Layout() { return null }" },
  { path: "src/pages/BannedPage.jsx", content: "// todo" },
  { path: "src/pages/ShopCategoryPage.jsx", content: "" },
  { path: "src/pages/TimeoutPage.jsx", content: "export default () => null" },
  { path: "src/pages/Home.jsx", content: "export default function Home() {\n  return (\n    <div className=\"min-h-screen bg-background text-foreground p-8\">\n      <h1 className=\"text-2xl font-semibold\">Reciplyy</h1>\n      <p className=\"text-muted-foreground mt-2\">Welcome back.</p>\n    </div>\n  );\n}\n" },
];

const { files, repairedPaths } = repairImportedThinFiles(thin);
if (repairedPaths.length !== 4) {
  throw new Error(`expected 4 repairs, got ${repairedPaths.length}: ${repairedPaths.join(", ")}`);
}

for (const p of repairedPaths) {
  const f = files.find((x) => x.path === p);
  if (!f?.content?.includes("export default")) {
    throw new Error(`${p}: missing export default`);
  }
  if (isThinGeneratedFile({ path: f.path, content: f.content })) {
    throw new Error(`${p}: still thin after repair`);
  }
}

console.log("verify:imported-app-thin-files OK");
