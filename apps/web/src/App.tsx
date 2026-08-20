import { Navigate, RouterProvider, createBrowserRouter } from 'react-router-dom';
import { RequireAuth, RequireRole } from './lib/auth';
import { AppShell } from './layouts/AppShell';
import { AuthLayout } from './layouts/AuthLayout';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Dashboard from './pages/Dashboard';
import Catalog from './pages/Catalog';
import CourseDetail from './pages/CourseDetail';
import LessonViewer from './pages/LessonViewer';
import Discussion from './pages/Discussion';
import Assignments from './pages/Assignments';
import AssignmentDetail from './pages/AssignmentDetail';
import SubmissionDetail from './pages/SubmissionDetail';
import GradingQueue from './pages/GradingQueue';
import MyLearning from './pages/MyLearning';
import Certificates from './pages/Certificates';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import Billing from './pages/Billing';
import Notifications from './pages/Notifications';
import AdminUsers from './pages/AdminUsers';
import AdminAuditLog from './pages/AdminAuditLog';
import AdminFlags from './pages/AdminFlags';
import AdminApiKeys from './pages/AdminApiKeys';
import Integrations from './pages/Integrations';
import Webhooks from './pages/Webhooks';
import Reports from './pages/Reports';
import NotFound from './pages/NotFound';

const router = createBrowserRouter([
  {
    element: <AuthLayout />,
    children: [
      { path: '/login', element: <Login /> },
      { path: '/register', element: <Register /> },
      { path: '/forgot-password', element: <ForgotPassword /> },
      { path: '/reset-password', element: <ResetPassword /> },
    ],
  },
  {
    element: (
      <RequireAuth>
        <AppShell />
      </RequireAuth>
    ),
    children: [
      { path: '/', element: <Navigate to="/dashboard" replace /> },
      { path: '/dashboard', element: <Dashboard /> },
      { path: '/catalog', element: <Catalog /> },
      { path: '/catalog/:courseId', element: <CourseDetail /> },
      { path: '/catalog/:courseId/lessons/:lessonId', element: <LessonViewer /> },
      { path: '/courses/:courseId/discussion', element: <Discussion /> },
      { path: '/courses/:courseId/assignments', element: <Assignments /> },
      { path: '/courses/:courseId/assignments/:assignmentId', element: <AssignmentDetail /> },
      {
        path: '/courses/:courseId/assignments/:assignmentId/queue',
        element: (
          <RequireRole minimum="instructor">
            <GradingQueue />
          </RequireRole>
        ),
      },
      { path: '/courses/:courseId/submissions/:submissionId', element: <SubmissionDetail /> },
      {
        path: '/grading',
        element: (
          <RequireRole minimum="instructor">
            <GradingQueue />
          </RequireRole>
        ),
      },
      { path: '/learning', element: <MyLearning /> },
      { path: '/certificates', element: <Certificates /> },
      { path: '/profile', element: <Profile /> },
      { path: '/profile/:userId', element: <Profile /> },
      { path: '/settings', element: <Settings /> },
      { path: '/billing', element: <Billing /> },
      { path: '/notifications', element: <Notifications /> },
      {
        path: '/reports',
        element: (
          <RequireRole minimum="manager">
            <Reports />
          </RequireRole>
        ),
      },
      {
        path: '/integrations',
        element: (
          <RequireRole minimum="manager">
            <Integrations />
          </RequireRole>
        ),
      },
      {
        path: '/integrations/webhooks',
        element: (
          <RequireRole minimum="manager">
            <Webhooks />
          </RequireRole>
        ),
      },
      {
        path: '/admin/users',
        element: (
          <RequireRole minimum="manager">
            <AdminUsers />
          </RequireRole>
        ),
      },
      {
        path: '/admin/api-keys',
        element: (
          <RequireRole minimum="manager">
            <AdminApiKeys />
          </RequireRole>
        ),
      },
      {
        path: '/admin/flags',
        element: (
          <RequireRole minimum="admin">
            <AdminFlags />
          </RequireRole>
        ),
      },
      {
        path: '/admin/audit',
        element: (
          <RequireRole minimum="admin">
            <AdminAuditLog />
          </RequireRole>
        ),
      },
    ],
  },
  { path: '*', element: <NotFound /> },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
