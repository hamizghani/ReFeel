import React from "react";
import { createRoot } from "react-dom/client";
import { StoreProvider } from "./store";
import App from "./App";
import "./styles.css";
import "./marketplace.css";
class Recovery extends React.Component<
  { children: React.ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <main className="page recovery">
        <h1>Let’s find your way back.</h1>
        <p>
          This view could not open. Your saved choices are still on this device.
        </p>
        <a className="button primary" href="/shop">
          Return to the shop
        </a>
      </main>
    ) : (
      this.props.children
    );
  }
}
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Recovery>
      <StoreProvider>
        <App />
      </StoreProvider>
    </Recovery>
  </React.StrictMode>,
);
