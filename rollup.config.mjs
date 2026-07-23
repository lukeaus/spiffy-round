// ponytail: no plugins needed - source has zero runtime imports
export default {
  input: ".build/index.js",
  output: [
    { file: "dist/index.mjs", format: "es" },
    { file: "dist/index.js", format: "cjs", exports: "default" },
    {
      file: "dist/index.umd.js",
      format: "umd",
      name: "SpiffyRound",
      exports: "default",
    },
  ],
};
