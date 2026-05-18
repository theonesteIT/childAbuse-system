import { Navigate, Outlet } from "react-router-dom";
import { getAuthRole, isAuthenticated } from "../utils/authStorage";

export default function ProtectedRoute({ requiredRole }) {
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole) {
    const role = getAuthRole();
    if (role !== requiredRole) {
      return <Navigate to={role === "admin" ? "/admin/dashboard" : "/reporter/dashboard"} replace />;
    }
  }

  return <Outlet />;
}
