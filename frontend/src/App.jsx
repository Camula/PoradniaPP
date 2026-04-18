import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { ConfirmProvider } from './context/ConfirmContext';
import Login from './pages/Login';
import PatientList from './pages/Patients/PatientList';
import PatientCard from './pages/Patients/PatientCard';
import PatientInfo from './pages/Patients/tabs/PatientInfo';
import ReferralList from './pages/Patients/tabs/ReferralList';
import TherapyHistory from './pages/Patients/tabs/TherapyHistory';
import TherapyTeam from './pages/Patients/tabs/TherapyTeam';
import StaffList from './pages/Staff/StaffList';
import RoomList from './pages/Rooms/RoomList';
import AuditLog from './pages/Admin/AuditLog';
import AppLayout from './components/layout/AppLayout/AppLayout';
import CalendarPage from './pages/Calendar/CalendarPage';
import DashboardPage from './pages/Dashboard/DashboardPage';

function App() {
  return (
    <AuthProvider>
      <ConfirmProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              padding: '16px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-card)',
              color: 'var(--text-main)',
              boxShadow: 'var(--shadow-md)',
              fontSize: '14px',
              border: '1px solid #eee',
            },
            success: {
              iconTheme: {
                primary: 'var(--secondary-color)',
                secondary: '#fff',
              },
            },
            error: {
              iconTheme: {
                primary: 'var(--danger-color)',
                secondary: '#fff',
              },
            },
          }}
        />
        <Routes>
          <Route path="/login" element={<Login />} />
          
          <Route element={<AppLayout />}>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/patients" element={<PatientList />} />
            <Route path="/patients/:id" element={<PatientCard />}>
              <Route index element={<Navigate to="info" replace />} />
              <Route path="info" element={<PatientInfo />} />
              <Route path="referrals" element={<ReferralList />} />
              <Route path="history" element={<TherapyHistory />} />
              <Route path="team" element={<TherapyTeam />} />
            </Route>
            <Route path="/calendar" element={<CalendarPage />} />
            <Route path="/staff" element={<StaffList />} />
            <Route path="/rooms" element={<RoomList />} />
            <Route path="/logs" element={<AuditLog />} />
          </Route>

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </ConfirmProvider>
    </AuthProvider>
  );
}

export default App;
