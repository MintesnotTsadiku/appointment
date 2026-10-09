import { Navigate, Outlet } from "react-router-dom";
import { useSession } from "@/context/session";
import { useTranslation } from "@/lib/i18n";

export default function BusinessOwnerRoute() {
  const { session, loading, error, isManager } = useSession();
  const { t } = useTranslation();
  if (loading) return <main role="status" className="p-6">{t("staff.ownerRoute.checking")}</main>;
  if (error) return <main role="alert" className="p-6">{t("staff.ownerRoute.error")}</main>;
  if (!session?.authenticated) return <Navigate to="/login" replace />;
  if (!isManager) return <Navigate to={session.landing || "/no-access"} replace />;
  return <Outlet />;
}
