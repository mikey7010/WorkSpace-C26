import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';

// HR & Operations Pages
import HrDashboard from './pages/hr/HrDashboard';
import DepartmentsHub from './pages/hr/DepartmentsHub';
import WorkReportsFeed from './pages/hr/WorkReportsFeed';
import RecruitmentPipeline from './pages/hr/RecruitmentPipeline';
import OnboardingTracker from './pages/hr/OnboardingTracker';
import HrDirectives from './pages/hr/HrDirectives';
import ManpowerPlanMatrix from './pages/hr/ManpowerPlanMatrix';

// Department Head Page
import DeptDashboard from './pages/dept/DeptDashboard';

// Task Board
import TaskBoard from './pages/admin/TaskBoard';

function PrivateRoute({ children, hrOnly = false }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;

  const isHr = user.role === 'hr_admin' || user.role === 'admin';
  if (hrOnly && !isHr) return <Navigate to="/dept-dashboard" replace />;

  return children;
}

function HomeRedirect() {
  const { user } = useAuth();
  const isHr = user?.role === 'hr_admin' || user?.role === 'admin';
  return isHr ? <Navigate to="/hr-dashboard" replace /> : <Navigate to="/dept-dashboard" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<PrivateRoute><HomeRedirect /></PrivateRoute>} />
          
          <Route element={<PrivateRoute><Layout /></PrivateRoute>}>
            {/* Core Manpower Plan & Executive Routes */}
            <Route path="/hr-dashboard"   element={<PrivateRoute hrOnly><HrDashboard /></PrivateRoute>} />
            <Route path="/manpower-plan"  element={<PrivateRoute><ManpowerPlanMatrix /></PrivateRoute>} />
            <Route path="/departments"    element={<PrivateRoute hrOnly><DepartmentsHub /></PrivateRoute>} />
            <Route path="/recruitment"    element={<PrivateRoute hrOnly><RecruitmentPipeline /></PrivateRoute>} />

            {/* Shared Operational Routes */}
            <Route path="/work-reports"   element={<PrivateRoute><WorkReportsFeed /></PrivateRoute>} />
            <Route path="/onboarding"     element={<PrivateRoute><OnboardingTracker /></PrivateRoute>} />
            <Route path="/directives"     element={<PrivateRoute><HrDirectives /></PrivateRoute>} />
            <Route path="/tasks"          element={<PrivateRoute><TaskBoard /></PrivateRoute>} />

            {/* Department Head Route */}
            <Route path="/dept-dashboard" element={<PrivateRoute><DeptDashboard /></PrivateRoute>} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
