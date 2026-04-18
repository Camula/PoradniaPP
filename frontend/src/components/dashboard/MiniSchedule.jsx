import { Clock, User, CheckCircle, MapPin, UserCheck } from 'lucide-react';
import styles from './MiniSchedule.module.css';
import { apiClient } from '../../api/client';

// Harmonogram na dziś
const MiniSchedule = ({ appointments = [], onStatusUpdate, user }) => {
  const handleComplete = async (id) => {
    try {
      await apiClient.patch(`/appointments/${id}/status`, { status: 'Odbyta' });
      onStatusUpdate();
    } catch (error) {
      console.error('Błąd aktualizacji wizyty:', error);
    }
  };

  const now = Date.now();
  const cutoff = now - 5 * 60 * 1000;

  let filtered = appointments.filter(apt => apt.status !== 'Odwołana');

  if (user?.role === 'admin') {
    filtered = filtered
      .filter(apt => new Date(apt.start_time).getTime() >= cutoff)
      .slice(0, 5);
  } else if (user?.role === 'therapist') {
    const upcoming = filtered.filter(apt => new Date(apt.start_time).getTime() >= cutoff);
    const lastCompleted = filtered
      .filter(apt => apt.status === 'Odbyta' && new Date(apt.start_time).getTime() < cutoff)
      .sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime())
      .slice(0, 1);
    
    filtered = [...lastCompleted, ...upcoming].slice(0, 3);
  }

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Dzisiejsze wizyty</h2>
      {filtered.length > 0 ? (
        <div className={styles.list}>
          {filtered.map((apt) => (
            <div key={apt.id} className={styles.item}>
              <div className={styles.infoWrapper}>
                <div className={styles.mainInfo}>
                  <div className={styles.timeInfo}>
                    <Clock size={16} className={styles.icon} />
                    <span>{new Date(apt.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <div className={styles.patientInfo}>
                    <User size={16} className={styles.icon} />
                    <span className={styles.name}>{apt.patient_surname} {apt.patient_name}</span>
                  </div>
                </div>
                
                {user?.role === 'admin' && (
                  <div className={styles.adminExtra}>
                    <div className={styles.extraItem}>
                      <UserCheck size={14} className={styles.extraIcon} />
                      <span>{apt.therapist_name} {apt.therapist_surname}</span>
                    </div>
                    <div className={styles.extraItem}>
                      <MapPin size={14} className={styles.extraIcon} />
                      <span>{apt.room_name}</span>
                    </div>
                  </div>
                )}
              </div>

              <div className={styles.actions}>
                {user?.role === 'therapist' && apt.status === 'Zaplanowana' ? (
                  <button 
                    className={styles.doneButton}
                    onClick={() => handleComplete(apt.id)}
                    title="Oznacz jako odbytą"
                  >
                    <CheckCircle size={18} />
                    <span>Odbyta</span>
                  </button>
                ) : (
                  <span className={`${styles.status} ${styles[apt.status]}`}>
                    {apt.status}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className={styles.empty}>Brak wizyt na dziś.</p>
      )}
    </div>
  );
};

export default MiniSchedule;
