/**
 * External dependencies.
 */
import { lazy } from "react";
import { Route } from "react-router-dom";
import ErrorFallback from "./components/error-fallback";

/**
 * Lazy load components.
 */
const LandingPage = lazy(() => import("@/pages/landing"));
const Home = lazy(() => import("@/pages/home"));
const Appointment = lazy(() => import("@/pages/appointment"));
const GroupAppointment = lazy(() => import("@/pages/group-appointment"));
const NotFound = lazy(() => import("@/pages/notFound"));

const Router = () => {
  return (
    <>
      <Route path="/" element={<LandingPage />} errorElement={<ErrorFallback />}></Route>
      <Route path="/home" element={<Home />} errorElement={<ErrorFallback />}></Route>
      <Route path="/schedule/in/:meetId" element={<Appointment />} errorElement={<ErrorFallback />}></Route>
      <Route path="/schedule/gr/:groupId" element={<GroupAppointment />} errorElement={<ErrorFallback />}></Route>
      <Route path="*" element={<NotFound />} />
    </>
  );
};

export default Router;
