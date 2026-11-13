
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/useAuth";
import LoadingPage from "../LoadingPage";

export function GuestRoute() {
  const { user, loading } = useAuth();

  if (loading) return <LoadingPage />;

  if (user) {
    return (
      <Navigate
        to={user.profileCompleted ? "/applications" : "/complete-profile"}
        replace
      />
    );
  }

  return <Outlet />;
}

export function ProtectedRoute() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <LoadingPage />;

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

  if (loading) return <LoadingPage />;

  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (user.profileCompleted) {
    return <Navigate to="/applications" replace />;
  }

  return <Outlet />;
}
