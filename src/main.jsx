import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
// Il browser scarica solo i font davvero usati dallo stile scelto (vedi data-font in index.css)
import "@fontsource-variable/bricolage-grotesque/opsz.css";
import "@fontsource-variable/onest";
import "@fontsource-variable/unbounded";
import "@fontsource-variable/fraunces/soft.css";
import "@fontsource-variable/lexend";
import "./index.css";
import App from "./App.jsx";
import { initNative } from "./native";

initNative();

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);
