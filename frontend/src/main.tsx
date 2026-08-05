import { createRoot } from "react-dom/client";
import App from "./app/App.tsx";
// Wrap the tree so every screen can read auth via useAuth().
import { AuthProvider } from "./app/auth/AuthContext.tsx";
import "./styles/index.css";

createRoot(document.getElementById("root")!).render(
  <AuthProvider>
    <App />
  </AuthProvider>,
);
