import { defineConfig } from "vite";

// Two entry points:
//  - plugin.ts  -> dist/plugin.js   (the code Penpot runs, referenced by manifest.json)
//  - index.html -> dist/index.html  (the UI shown in the plugin window)
export default defineConfig({
  base: "./", // relative asset paths, so the UI also works under a sub-path
  build: {
    rollupOptions: {
      input: {
        plugin: "src/plugin.ts",
        index: "./index.html",
      },
      output: {
        entryFileNames: "[name].js",
      },
    },
  },
  preview: {
    port: 4400,
    cors: true, // Penpot loads the plugin from another origin
  },
});
