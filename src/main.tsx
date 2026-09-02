import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles.css";
import { backendMisconfigured } from "./lib/supabase";

const root = document.getElementById("root")!;

if (backendMisconfigured) {
  // Fail closed: never boot the app into an unauthenticated super-admin demo
  // mode on a production deploy that is missing its Supabase configuration.
  // A visitor who lands here gets plain "come back later" copy; the settings
  // that are actually missing are named in the console for whoever deploys it.
  console.error(
    "Rubba boot blocked: VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are missing, " +
      "which would otherwise start the app in an insecure demo mode.",
  );
  root.innerHTML =
    '<div style="max-width:560px;margin:15vh auto;font-family:system-ui;padding:0 20px;text-align:center">' +
    '<h1 style="font-size:20px">Rubba is taking a short break</h1>' +
    '<p style="color:#555;line-height:1.5">We can\'t load your planner right now. ' +
    "Please try again in a few minutes.</p>" +
    "</div>";
} else {
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}
