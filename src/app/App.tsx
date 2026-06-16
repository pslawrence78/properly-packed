import { BrowserRouter } from "react-router-dom";
import { getRouterBasename } from "../lib/deployment-base";
import { AppShell } from "./AppShell";

export function App() {
  return (
    <BrowserRouter
      basename={getRouterBasename()}
      future={{ v7_relativeSplatPath: true, v7_startTransition: true }}
    >
      <AppShell />
    </BrowserRouter>
  );
}
