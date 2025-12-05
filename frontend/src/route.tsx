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
const Calendar = lazy(() => import("@/pages/calendar"));
const Analytics = lazy(() => import("@/pages/analytics"));
const AvailabilitySettings = lazy(() => import("@/pages/settings/availability"));
const TeamManagement = lazy(() => import("@/pages/settings/team"));
const Profile = lazy(() => import("@/pages/settings/profile"));
const LocationSettings = lazy(() => import("@/pages/settings/location"));
const CalendarSettings = lazy(() => import("@/pages/settings/calendar"));
const ServicesSettings = lazy(() => import("@/pages/settings/services"));
const EditService = lazy(() => import("@/pages/settings/edit-service"));
const Manage = lazy(() => import("@/pages/settings/manage"));
const Settings = lazy(() => import("@/pages/settings"));
const AdminDashboard = lazy(() => import("@/pages/admin/dashboard"));
const Appointment = lazy(() => import("@/pages/appointment"));
const GroupAppointment = lazy(() => import("@/pages/group-appointment"));
const OrganizationAppointment = lazy(() => import("@/pages/organization-appointment"));
const BookingPreview = lazy(() => import("@/pages/booking-v2/preview"));
const Reception = lazy(() => import("@/pages/reception"));
const NotFound = lazy(() => import("@/pages/notFound"));

// Tasks Module
const TasksDashboard = lazy(() => import("@/pages/tasks"));

// Assistants Module
const AssistantsDashboard = lazy(() => import("@/pages/assistants"));
const VAProfiles = lazy(() => import("@/pages/assistants/va-profiles"));
const ClientProfiles = lazy(() => import("@/pages/assistants/client-profiles"));

const Router = () => {
  return (
    <>
      <Route path="/" element={<LandingPage />} errorElement={<ErrorFallback />}></Route>
      <Route path="/login" element={<Login />} errorElement={<ErrorFallback />}></Route>
      <Route path="/signup" element={<Signup />} errorElement={<ErrorFallback />}></Route>
      <Route path="/forgot-password" element={<ForgotPassword />} errorElement={<ErrorFallback />}></Route>
      <Route path="/home" element={<Home />} errorElement={<ErrorFallback />}></Route>
      <Route path="/calendar" element={<Calendar />} errorElement={<ErrorFallback />}></Route>
      <Route path="/analytics" element={<Analytics />} errorElement={<ErrorFallback />}></Route>
      <Route path="/settings" element={<Settings />} errorElement={<ErrorFallback />}></Route>
      <Route path="/settings/availability" element={<AvailabilitySettings />} errorElement={<ErrorFallback />}></Route>
      <Route path="/settings/team" element={<TeamManagement />} errorElement={<ErrorFallback />}></Route>
      <Route path="/settings/profile" element={<Profile />} errorElement={<ErrorFallback />}></Route>
      <Route path="/settings/location" element={<LocationSettings />} errorElement={<ErrorFallback />}></Route>
      <Route path="/settings/calendar" element={<CalendarSettings />} errorElement={<ErrorFallback />}></Route>
      <Route path="/settings/services" element={<ServicesSettings />} errorElement={<ErrorFallback />}></Route>
      <Route path="/settings/services/:serviceId" element={<EditService />} errorElement={<ErrorFallback />}></Route>
      <Route path="/settings/edit-service/:serviceId" element={<EditService />} errorElement={<ErrorFallback />}></Route>
      <Route path="/settings/manage" element={<Manage />} errorElement={<ErrorFallback />}></Route>
      <Route path="/admin/dashboard" element={<AdminDashboard />} errorElement={<ErrorFallback />}></Route>
      <Route path="/schedule/in/:meetId" element={<Appointment />} errorElement={<ErrorFallback />}></Route>
      <Route path="/schedule/gr/:groupId" element={<GroupAppointment />} errorElement={<ErrorFallback />}></Route>
      <Route path="/schedule/org/:orgSlug" element={<OrganizationAppointment />} errorElement={<ErrorFallback />}></Route>
      <Route path="/schedule/org/:orgSlug/:serviceSlug" element={<OrganizationAppointment />} errorElement={<ErrorFallback />}></Route>
      <Route path="/preview" element={<BookingPreview />} errorElement={<ErrorFallback />}></Route>
      <Route path="/reception" element={<Reception />} errorElement={<ErrorFallback />}></Route>
      
      {/* Tasks Module Routes */}
      <Route path="/tasks" element={<TasksDashboard />} errorElement={<ErrorFallback />}></Route>
      
      {/* Assistants Module Routes */}
      <Route path="/assistants" element={<AssistantsDashboard />} errorElement={<ErrorFallback />}></Route>
      <Route path="/assistants/va-profiles" element={<VAProfiles />} errorElement={<ErrorFallback />}></Route>
      <Route path="/assistants/client-profiles" element={<ClientProfiles />} errorElement={<ErrorFallback />}></Route>
      
      <Route path="*" element={<NotFound />} />
    </>
  );
};

export default Router;
