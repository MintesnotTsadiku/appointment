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
const Login = lazy(() => import("@/pages/auth/login"));
const Signup = lazy(() => import("@/pages/auth/signup"));
const ForgotPassword = lazy(() => import("@/pages/auth/forgot-password"));
const Home = lazy(() => import("@/pages/home"));
const Appointment = lazy(() => import("@/pages/appointment"));
const GroupAppointment = lazy(() => import("@/pages/group-appointment"));
const OrganizationAppointment = lazy(() => import("@/pages/organization-appointment"));
const BookingPreview = lazy(() => import("@/pages/booking-v2/preview"));
const NotFound = lazy(() => import("@/pages/notFound"));

const Router = () => {
  return (
    <>
      <Route path="/" element={<LandingPage />} errorElement={<ErrorFallback />}></Route>
      <Route path="/login" element={<Login />} errorElement={<ErrorFallback />}></Route>
      <Route path="/signup" element={<Signup />} errorElement={<ErrorFallback />}></Route>
      <Route path="/forgot-password" element={<ForgotPassword />} errorElement={<ErrorFallback />}></Route>
      <Route path="/home" element={<Home />} errorElement={<ErrorFallback />}></Route>
      <Route path="/schedule/in/:meetId" element={<Appointment />} errorElement={<ErrorFallback />}></Route>
      <Route path="/schedule/gr/:groupId" element={<GroupAppointment />} errorElement={<ErrorFallback />}></Route>
      <Route path="/schedule/org/:orgSlug" element={<OrganizationAppointment />} errorElement={<ErrorFallback />}></Route>
      <Route path="/schedule/org/:orgSlug/:serviceSlug" element={<OrganizationAppointment />} errorElement={<ErrorFallback />}></Route>
      <Route path="/preview" element={<BookingPreview />} errorElement={<ErrorFallback />}></Route>
      <Route path="*" element={<NotFound />} />
    </>
  );
};

export default Router;
