import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import Sidebar from '../Sidebar/Sidebar';
import styles from './AppLayout.module.css';

// Główny layout aplikacji.
const AppLayout = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className={styles.loading}>Ładowanie...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className={styles.layout}>
      <Sidebar />
      <main className={styles.content}>
        <div className={styles.container}>
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default AppLayout;
