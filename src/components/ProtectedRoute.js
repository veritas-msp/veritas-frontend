import { Navigate, useLocation } from "react-router-dom";
import { useAuthContext } from "../contexts/AuthContext";
import { getSafeReturnPath } from "../navigation/agentRoutes";

/**
 * requiredRole : si fourni, seul un utilisateur ayant ce rôle exact peut accéder.
 * - rôle "client" → redirigé vers /client s'il tente d'accéder à /
 * - autre rôle tentant /client → redirigé vers /
 */
export default function ProtectedRoute({ children, requiredRole }) {
  const { user, userRole, loading } = useAuthContext();
  const location = useLocation();

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
        <div style={{
          width: 28, height: 28,
          border: "3px solid #dde3ed",
          borderTopColor: "#2b5fab",
          borderRadius: "50%",
          animation: "spin 0.7s linear infinite",
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: getSafeReturnPath(location.pathname, location.search) }}
      />
    );
  }

  // Route /client : seuls les clients peuvent y accéder
  if (requiredRole === "client" && userRole !== "client") {
    return <Navigate to="/" replace />;
  }

  // Route / (agents) : les clients ne peuvent pas accéder à l'interface agent
  if (!requiredRole && userRole === "client") {
    return <Navigate to="/client" replace />;
  }

  return children;
}
