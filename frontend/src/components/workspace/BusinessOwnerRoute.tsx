import { Navigate, Outlet } from "react-router-dom";
import { useSession } from "@/context/session";

export default function BusinessOwnerRoute() {
  const { session, loading, error, isManager } = useSession();
  if (loading) return <main role="status" className="p-6">Checking business access…</main>;
  if (error) return <main role="alert" className="p-6">Unable to confirm business access. Please sign in again.</main>;
  if (!session?.authenticated) return <Navigate to="/login" replace />;
  if (!isManager) return <Navigate to={session.landing || "/no-access"} replace />;
  return <Outlet />;
}
