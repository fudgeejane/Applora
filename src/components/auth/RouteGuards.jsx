
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";

export function GuestRoute() {
  const { user, loading } = useAuth();

  if (loading) return null;

  if (user) {
    return (
      <Navigate
        to={user.profileCompleted ? "/home" : "/complete-profile"}
        replace
      />
    );
  }

  return <Outlet />;
}

export function ProtectedRoute() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return null;

  if (!user) {
    return <Navigate to="/" replace state={{ from: location }} />;
  }

  if (!user.profileCompleted) {
    return <Navigate to="/complete-profile" replace />;
  }

  return <Outlet />;
}

export function ProfileRoute() {
  const { user, loading } = useAuth();

  if (loading) return null;

  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (user.profileCompleted) {
    return <Navigate to="/home" replace />;
  }

  return <Outlet />;
}
