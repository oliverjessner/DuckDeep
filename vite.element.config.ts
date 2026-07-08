import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    emptyOutDir: false,
    outDir: "dist",
    lib: {
      entry: "src/element.tsx",
      name: "DuckDeep",
      formats: ["es"],
      fileName: () => "duck-deep.element.js",
    },
  },
});
