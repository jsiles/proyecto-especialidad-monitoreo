import { createBrowserRouter } from "react-router";
import { Login } from "./pages/Login";
import { Dashboard } from "./pages/Dashboard";
import { AlertsManagement } from "./pages/AlertsManagement";
import { Reports } from "./pages/Reports";
import { Layout } from "./components/Layout";

export const router = createBrowserRouter([
  {
    path: "/login",
    Component: Login,
  },
  {
    path: "/",
    Component: Layout,
    children: [
      { index: true, Component: Dashboard },
      { path: "alerts", Component: AlertsManagement },
      { path: "reports", Component: Reports },
    ],
  },
]);
