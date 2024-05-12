import * as esbuild from "esbuild";
import { glob } from "glob";

async function buildCJS() {
  console.log("Generating CommonJS build for node");
  const files = await glob("src/**/*.ts", {
    ignore: ["node_modules/**", "src/**/*.test.ts"],
  });
  return esbuild.build({
    entryPoints: files,
    bundle: false,
    platform: "node",
    outdir: "dist/cjs",
    format: "cjs",
  });
}

async function buildESM() {
  console.log("Generating ESM build");
  const files = await glob("src/**/*.ts", {
    ignore: ["node_modules/**", "src/**/*.test.ts"],
  });
  return esbuild.build({
    entryPoints: files,
    bundle: false,
    platform: "neutral",
    outdir: "dist/esm",
    format: "esm",
  });
}

async function generateBundle() {
  console.log("Generating browser bundle");
  return esbuild.build({
    entryPoints: ["src/index.ts"],
    bundle: true,
    platform: "neutral",
    sourcemap: true,
    outfile: "dist/webauthn.min.js",
    minify: true,
    target: "es2022",
  });
}

await buildCJS();
await buildESM();
await generateBundle();
