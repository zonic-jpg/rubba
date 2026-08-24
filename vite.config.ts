import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
// base: "/" for Netlify/root hosts, "/rubba/" for GitHub Pages project site.
export default defineConfig({ base: process.env.VITE_BASE || "/", plugins: [react()] });
