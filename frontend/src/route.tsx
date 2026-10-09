/**
 * External dependencies.
 */
import { lazy } from "react";
import { Navigate, Route } from "react-router-dom";
import ErrorFallback from "./components/error-fallback";
import BusinessOwnerRoute from "./components/workspace/BusinessOwnerRoute";

/**
 * Lazy load components.
 */
const LandingPage = lazy(() => import("@/pages/landing"));
const Login = lazy(() => import("@/pages/auth/login"));
const Signup = lazy(() => import("@/pages/auth/signup"));
const ForgotPassword = lazy(() => import("@/pages/auth/forgot-password"));
const Home = lazy(() => import("@/pages/home"));
const Workspaces = lazy(() => import("@/pages/workspaces"));
const Onboarding = lazy(() => import("@/pages/onboarding"));
const NoAccess = lazy(() => import("@/pages/no-access"));
const Calendar = lazy(() => import("@/pages/calendar"));
const Analytics = lazy(() => import("@/pages/analytics"));
const AvailabilitySettings = lazy(() => import("@/pages/settings/availability"));
const TeamManagement = lazy(() => import("@/pages/settings/team"));
const Profile = lazy(() => import("@/pages/settings/profile"));
const LocationSettings = lazy(() => import("@/pages/settings/location"));
const CalendarSettings = lazy(() => import("@/pages/settings/calendar"));
const IndependentBookingSettings = lazy(() => import("@/pages/settings/independent-booking"));
const IndependentBooking = lazy(() => import("@/pages/public-experience/independent-booking"));
const BusinessSettings = lazy(() => import("@/pages/settings/business"));
const NotificationSettings = lazy(() => import("@/pages/settings/notifications"));
const PaymentSettings = lazy(() => import("@/pages/settings/payments"));
const ResourceSettings = lazy(() => import("@/pages/settings/resources"));
const Customers = lazy(() => import("@/pages/customers"));
const CustomerPage = lazy(() => import("@/pages/customers/detail"));
const ManageBooking = lazy(() => import("@/pages/manage-booking"));
const MyBookings = lazy(() => import("@/pages/my-bookings"));
const ServicesSettings = lazy(() => import("@/pages/settings/services"));
const EditService = lazy(() => import("@/pages/settings/edit-service"));
const Manage = lazy(() => import("@/pages/settings/manage"));
const PublicExperienceEditor = lazy(() => import("@/pages/settings/public-experience"));
const WebsiteSetup = lazy(() => import("@/pages/settings/website-setup"));
const WebsiteContent = lazy(() => import("@/pages/settings/website-content"));
const OrganizationImport = lazy(() => import("@/pages/settings/organization-import"));
const NewsletterWorkspace = lazy(() => import("@/pages/settings/website-newsletter"));
const NewsletterAction = lazy(() => import("@/pages/public-experience/newsletter-action"));
const StaffInvitation = lazy(() => import("@/pages/public-experience/staff-invitation"));
const InternalAppearance = lazy(() => import("@/pages/settings/internal-appearance"));
const Settings = lazy(() => import("@/pages/settings"));
const AdminDashboard = lazy(() => import("@/pages/admin/dashboard"));
const AdminPayments = lazy(() => import("@/pages/admin/payments"));
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
const Assignments = lazy(() => import("@/pages/assistants/assignments"));

// Landing Pages
const AssistantLanding = lazy(() => import("@/pages/assistant-landing"));

// Public experience (tenant website + booking entry)
const PublicSitePage = lazy(() => import("@/pages/public-experience/site"));
const PublicBookingPage = lazy(() => import("@/pages/public-experience/booking"));

const Router = () => {
  return (
    <>
      <Route path="/" element={<LandingPage />} errorElement={<ErrorFallback />}></Route>
      <Route path="/assistant" element={<AssistantLanding />} errorElement={<ErrorFallback />}></Route>
      <Route path="/login" element={<Login />} errorElement={<ErrorFallback />}></Route>
      <Route path="/signup" element={<Signup />} errorElement={<ErrorFallback />}></Route>
      <Route path="/forgot-password" element={<ForgotPassword />} errorElement={<ErrorFallback />}></Route>
      <Route path="/home" element={<Home />} errorElement={<ErrorFallback />}></Route>
      <Route path="/workspaces" element={<Workspaces />} errorElement={<ErrorFallback />}></Route>
      <Route path="/onboarding" element={<Onboarding />} errorElement={<ErrorFallback />}></Route>
      <Route path="/no-access" element={<NoAccess />} errorElement={<ErrorFallback />}></Route>
      <Route path="/calendar" element={<Calendar />} errorElement={<ErrorFallback />}></Route>
      <Route path="/analytics" element={<Analytics />} errorElement={<ErrorFallback />}></Route>
      <Route path="/settings/appearance" element={<InternalAppearance />} errorElement={<ErrorFallback />} />
      <Route path="/settings" element={<Settings />} errorElement={<ErrorFallback />}></Route>
      <Route path="/settings/availability" element={<AvailabilitySettings />} errorElement={<ErrorFallback />}></Route>
      <Route path="/settings/team" element={<TeamManagement />} errorElement={<ErrorFallback />}></Route>
      <Route path="/settings/profile/details" element={<Navigate to="/settings/profile" replace />} errorElement={<ErrorFallback />}></Route>
      <Route path="/settings/profile" element={<Profile />} errorElement={<ErrorFallback />}></Route>
      <Route path="/settings/location" element={<LocationSettings />} errorElement={<ErrorFallback />}></Route>
      <Route path="/settings/calendar" element={<CalendarSettings />} errorElement={<ErrorFallback />}></Route>
      <Route path="/settings/independent-booking" element={<IndependentBookingSettings />} errorElement={<ErrorFallback />} />
      <Route path="/schedule/individual/:offeringId" element={<IndependentBooking />} errorElement={<ErrorFallback />} />
      {/* An independent provider's customers: the manage link and My bookings. */}
      <Route path="/schedule/individual/booking/:token" element={<ManageBooking />} errorElement={<ErrorFallback />} />
      <Route path="/schedule/individual/:offeringId/my-bookings" element={<MyBookings />} errorElement={<ErrorFallback />} />
      <Route path="/settings/business" element={<BusinessSettings />} errorElement={<ErrorFallback />}></Route>
      <Route path="/settings/notifications" element={<NotificationSettings />} errorElement={<ErrorFallback />}></Route>
      <Route path="/settings/payments" element={<PaymentSettings />} errorElement={<ErrorFallback />}></Route>
      <Route path="/settings/resources" element={<ResourceSettings />} errorElement={<ErrorFallback />}></Route>
      <Route path="/customers" element={<Customers />} errorElement={<ErrorFallback />}></Route>
      <Route path="/customers/:customerId" element={<CustomerPage />} errorElement={<ErrorFallback />}></Route>
      <Route path="/settings/services" element={<ServicesSettings />} errorElement={<ErrorFallback />}></Route>
      <Route path="/settings/services/:serviceId" element={<EditService />} errorElement={<ErrorFallback />}></Route>
      <Route path="/settings/edit-service/:serviceId" element={<EditService />} errorElement={<ErrorFallback />}></Route>
      <Route path="/settings/manage" element={<Manage />} errorElement={<ErrorFallback />}></Route>
      <Route element={<BusinessOwnerRoute />}>
      <Route path="/settings/public-experience" element={<PublicExperienceEditor />} errorElement={<ErrorFallback />}></Route>
      <Route path="/settings/website" element={<WebsiteSetup />} errorElement={<ErrorFallback />}></Route>
      <Route path="/settings/website/content" element={<WebsiteContent />} errorElement={<ErrorFallback />}></Route>
      <Route path="/settings/organization-import" element={<OrganizationImport />} errorElement={<ErrorFallback />}></Route>
      <Route path="/settings/website/newsletter" element={<NewsletterWorkspace />} errorElement={<ErrorFallback />} />
      </Route>
      <Route path="/newsletter/:action/:token" element={<NewsletterAction />} errorElement={<ErrorFallback />} />
      <Route path="/team/invitation/:token" element={<StaffInvitation />} errorElement={<ErrorFallback />} />
      <Route path="/admin/dashboard" element={<AdminDashboard />} errorElement={<ErrorFallback />}></Route>
      <Route path="/admin/payments" element={<AdminPayments />} errorElement={<ErrorFallback />}></Route>
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
      <Route path="/assistants/assignments" element={<Assignments />} errorElement={<ErrorFallback />}></Route>
      
      {/* Tenant public website and booking entry. Static routes above win; the
          resolver fails closed for unknown slugs. */}
      <Route path="/:slug/blog" element={<PublicSitePage />} errorElement={<ErrorFallback />} />
      <Route path="/:slug/blog/:contentSlug" element={<PublicSitePage />} errorElement={<ErrorFallback />} />
      <Route path="/:slug/gallery" element={<PublicSitePage />} errorElement={<ErrorFallback />} />
      <Route path="/:slug/gallery/:contentSlug" element={<PublicSitePage />} errorElement={<ErrorFallback />} />
      <Route path="/:slug/book" element={<PublicBookingPage />} errorElement={<ErrorFallback />}></Route>
      <Route path="/:slug/booking/:token" element={<ManageBooking />} errorElement={<ErrorFallback />}></Route>
      <Route path="/:slug/my-bookings" element={<MyBookings />} errorElement={<ErrorFallback />}></Route>
      <Route path="/:slug/:locale" element={<PublicSitePage />} errorElement={<ErrorFallback />}></Route>
      <Route path="/:slug" element={<PublicSitePage />} errorElement={<ErrorFallback />}></Route>

      <Route path="*" element={<NotFound />} />
    </>
  );
};

export default Router;
