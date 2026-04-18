import { useEffect, useState } from 'react';
import { useParams, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { ArrowLeft, User, FileText, History, Users } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import styles from './PatientCard.module.css';
import { apiClient } from '../../api/client';

// Szczegóły pacjenta
const PatientCard = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Dane pacjenta
    apiClient.get(`/patients/${id}`)
      .then(res => {
        setPatient(res.data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Błąd podczas pobierania karty pacjenta:', err);
        navigate('/patients');
      });
  }, [id, navigate]);

  const getStatusClass = (status) => {
    switch (status) {
      case 'aktywny': return styles.statusActive;
      case 'nieaktywny': return styles.statusInactive;
      case 'zarchiwizowany': return styles.statusArchived;
      default: return styles.statusInactive;
    }
  };

  if (loading) return <div className={styles.container}>Ładowanie...</div>;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <button className={styles.backButton} onClick={() => navigate('/patients')}>
          <ArrowLeft size={20} />
          Powrót do listy
        </button>
        <div className={styles.patientInfo}>
          <h1>{patient.surname} {patient.name}</h1>
          <div className={styles.headerBadges}>
            <span className={styles.signature}>{patient.signature}</span>
            <span className={`${styles.statusTag} ${getStatusClass(patient.current_status)}`}>
              {patient.current_status}
            </span>
          </div>
        </div>
      </header>

      <nav className={styles.tabs}>
        <NavLink to="info" className={({ isActive }) => isActive ? `${styles.tab} ${styles.activeTab}` : styles.tab}>
          <User size={18} />
          Dane osobowe
        </NavLink>
        <NavLink to="referrals" className={({ isActive }) => isActive ? `${styles.tab} ${styles.activeTab}` : styles.tab}>
          <FileText size={18} />
          Skierowania
        </NavLink>
        <NavLink to="history" className={({ isActive }) => isActive ? `${styles.tab} ${styles.activeTab}` : styles.tab}>
          <History size={18} />
          Historia terapii
        </NavLink>
        <NavLink to="team" className={({ isActive }) => isActive ? `${styles.tab} ${styles.activeTab}` : styles.tab}>
          <Users size={18} />
          Zespół terapeutyczny
        </NavLink>
      </nav>

      <div className={styles.tabContent}>
        <Outlet context={{ patient }} />
      </div>
    </div>
  );
};

export default PatientCard;
