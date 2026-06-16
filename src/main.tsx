import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./app/App";
import "./styles/globals.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    const serviceWorkerBase = import.meta.env.BASE_URL;

    navigator.serviceWorker
      .register(`${serviceWorkerBase}sw.js`, { scope: serviceWorkerBase })
      .then((registration) => {
        registration.addEventListener("updatefound", () => {
          const installing = registration.installing;

          installing?.addEventListener("statechange", () => {
            if (
              installing.state === "installed" &&
              navigator.serviceWorker.controller
            ) {
              window.dispatchEvent(new Event("properly-packed:update-ready"));
            }
          });
        });
      })
      .catch(() => {
        // The manifest still works if service worker registration fails.
      });
  });
}
