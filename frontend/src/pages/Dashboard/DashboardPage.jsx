import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import StatCards from '../../components/dashboard/StatCards';
import QuickActions from '../../components/dashboard/QuickActions';
import AlertBar from '../../components/dashboard/AlertBar';
import MiniSchedule from '../../components/dashboard/MiniSchedule';
import AnalyticsCharts from '../../components/dashboard/AnalyticsCharts';
import QuickContact from '../../components/dashboard/QuickContact';
import styles from './DashboardPage.module.css';
import { apiClient } from '../../api/client';

// Panel główny
const DashboardPage = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);

  // Pobieranie danych dashboardu
  const fetchData = async () => {
    try {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const todayStr = `${year}-${month}-${day}`;
      const startOfDay = `${todayStr}T00:00:00`;
      const endOfDay = `${todayStr}T23:59:59`;

      const [statsRes, alertsRes, aptRes, patientsRes] = await Promise.all([
        apiClient.get('/dashboard/stats'),
        apiClient.get('/dashboard/alerts'),
        apiClient.get(`/appointments?start=${startOfDay}&end=${endOfDay}`),
        apiClient.get('/patients')
      ]);

      setStats(statsRes.data);
      setAlerts(alertsRes.data);
      setAppointments(aptRes.data);
      setPatients(patientsRes.data);

    } catch (error) {
      console.error('Błąd podczas pobierania danych:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  if (loading) return <div className={styles.loading}>Ładowanie danych...</div>;

  return (
    <div className={styles.dashboardContainer}>
      {/* Statystyki */}
      <div className={styles.statsSection}>
        <StatCards stats={stats} />
      </div>

      {/* Harmonogram i wykresy */}
      <div className={styles.mainSection}>
        <MiniSchedule 
          appointments={appointments} 
          onStatusUpdate={fetchData}
          user={user}
        />
        
        <div className={styles.bottomGrid}>
          <AnalyticsCharts 
            data={stats?.chartData || []} 
            type={user?.role === 'admin' ? 'bar' : 'pie'}
            title={user?.role === 'admin' ? 'Obłożenie tygodniowe' : 'Status wizyt (Miesiąc)'}
          />
          <QuickContact patients={patients} />
        </div>
      </div>

      {/* Akcje i powiadomienia */}
      <div className={styles.sidebarSection}>
        <QuickActions userRole={user?.role} />
        
        <div className={styles.alertsCard}>
          <h2 className={styles.sectionTitle}>Powiadomienia</h2>
          <AlertBar 
            alerts={alerts} 
            onRefresh={fetchData} 
            userId={user?.id}
          />
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
