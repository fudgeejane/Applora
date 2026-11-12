
import { Routes, Route } from "react-router-dom";


// LAYOUTS
import PublicLayout from "../layouts/PublicLayout";
import PrivateLayout from "../layouts/PrivateLayout";

// PRIVATE PAGES
import DashboardPage from "../pages/app/DashboardPage";
import ApplicationsPage from "../pages/app/ApplicationsPage";
import ApplicationDetailsPage from "../pages/app/ApplicationDetailsPage";
import ResumePage from "../pages/app/ResumePage";
import InterviewsPage from "../pages/app/InterviewsPage";
import ChatBotPage from "../pages/app/ChatBotPage";
import SettingsPage from "../pages/app/SettingsPage"; 
import HelpCenterPage from "../pages/app/HelpCenterPage";

// PUBLIC PAGES
import LandingPage from "../pages/public/LandingPage";
import ContactPage from "../pages/public/ContactPage";
import TermsPage from "../pages/public/TermsPage";
import PrivacyPage from "../pages/public/PrivacyPage";
import SignInPage from "../pages/public/SignInPage";
import SignUpPage from "../pages/public/SignUpPage";

// AUTH PAGES
import VerifyEmail from "../pages/auth/VerifyEmail";
import CompleteProfile from "../pages/auth/CompleteProfile";

import {
  GuestRoute,
  ProtectedRoute,
  ProfileRoute,
} from "../components/auth/RouteGuards";

function NotFoundPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-6 text-center">
      <div>
        <h1 className="text-6xl font-bold text-blue-600">404</h1>
        <h2 className="mt-4 text-2xl font-bold">Page Not Found</h2>
        <p className="mt-3 text-gray-500">
          The page you're looking for doesn't exist.
        </p>
      </div>
    </div>
  );
}

function AppRoutes() {
  return (
    <Routes>
      {/* Logged-out users only */}
      <Route element={<GuestRoute />}>
        <Route element={<PublicLayout />}>
          <Route path="/" element={<LandingPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/signin" element={<SignInPage />} />
          <Route path="/signup" element={<SignUpPage />} />
        </Route>

        <Route path="/verify-email" element={<VerifyEmail />} />
      </Route>

      {/* Logged-in users with incomplete profiles */}
      <Route element={<ProfileRoute />}>
        <Route
          path="/complete-profile"
          element={<CompleteProfile />}
        />
      </Route>

      {/* Logged-in users with completed profiles */}
      <Route element={<ProtectedRoute />}>
        <Route element={<PrivateLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/applications" element={<ApplicationsPage />} />
          <Route path="/applications/:applicationId" element={<ApplicationDetailsPage />} />
          <Route path="/resume" element={<ResumePage />} />
          <Route path="/interviews" element={<InterviewsPage />} />
          <Route path="/ai-assistant" element={<ChatBotPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/help-center" element={<HelpCenterPage />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default AppRoutes;
