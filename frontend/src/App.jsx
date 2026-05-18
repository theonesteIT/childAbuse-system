import { Navigate, Route, Routes } from "react-router-dom";
import "./App.css";
import ChildwatchPublicPage from "./pages/ChildwatchPublicPage";
import Login from "./pages/Login";
import AdminSignup from "./pages/AdminSignup";
import Register from "./pages/Register";
import AdminDashboard from "./pages/Admindashboard";
import Reporter from "./pages/Reporter";
import ProtectedRoute from "./components/ProtectedRoute";

function App() {
  return (
    <Routes>
      <Route path="/" element={<ChildwatchPublicPage />} />
      <Route path="/register" element={<Register />} />
      <Route path="/admin/signup" element={<AdminSignup />} />
      <Route path="/login" element={<Login />} />

      <Route element={<ProtectedRoute requiredRole="admin" />}>
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
      </Route>
      <Route element={<ProtectedRoute requiredRole="user" />}>
        <Route path="/reporter/dashboard" element={<Reporter />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
