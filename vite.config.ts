import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react()], // only pass valid plugins here
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
