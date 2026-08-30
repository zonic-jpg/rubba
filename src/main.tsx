import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles.css";
import { backendMisconfigured } from "./lib/supabase";

const root = document.getElementById("root")!;

if (backendMisconfigured) {
  // Fail closed: never boot the app into an unauthenticated super-admin demo
  // mode on a production deploy that is missing its Supabase configuration.
  root.innerHTML =
    '<div style="max-width:560px;margin:15vh auto;font-family:system-ui;padding:0 20px;text-align:center">' +
    '<h1 style="font-size:20px">Rubba is not configured</h1>' +
    '<p style="color:#555;line-height:1.5">This deployment is missing its backend settings ' +
    '(<code>VITE_SUPABASE_URL</code> / <code>VITE_SUPABASE_ANON_KEY</code>). ' +
    'The site will not start until these are set, to avoid running in an insecure demo mode.</p>' +
    "</div>";
} else {
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}
