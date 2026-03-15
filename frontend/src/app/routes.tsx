import { createBrowserRouter } from "react-router";
import { Login } from "./pages/Login";
import { Dashboard } from "./pages/Dashboard";
import { AlertsManagement } from "./pages/AlertsManagement";
import { Reports } from "./pages/Reports";
import { ServersPage } from "./pages/ServersPage";
import { Layout } from "./components/Layout";
import { ProtectedRoute } from "./components/ProtectedRoute";

export const router = createBrowserRouter([
  {
    path: "/login",
    Component: Login,
  },
  {
    path: "/",
    Component: ProtectedRoute,
    children: [
      {
        path: "/",
        Component: Layout,
        children: [
          { index: true, Component: Dashboard },
          { path: "servers", Component: ServersPage },
          { path: "alerts", Component: AlertsManagement },
          { path: "reports", Component: Reports },
        ],
      },
    ],
  },
]);
