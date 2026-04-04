import { createRoot } from "react-dom/client";
import { setBaseUrl } from "@workspace/api-client-react";
import App from "./App";
import "./index.css";

const rawBaseUrl = import.meta.env.VITE_API_URL?.trim() || null;
const BASE_URL = rawBaseUrl ? rawBaseUrl.replace(/\/api\/?$/, "") : null;

setBaseUrl(BASE_URL);

createRoot(document.getElementById("root")!).render(<App />);
