import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles.css";

// Mount the React app into panel.html.
const root = createRoot(document.getElementById("root"));
root.render(<App />);
