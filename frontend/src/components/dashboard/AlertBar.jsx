import { useState } from 'react';
import { AlertCircle, Info, Edit3 } from 'lucide-react';
import QuickNoteModal from './QuickNoteModal';
import styles from './AlertBar.module.css';

// Alerty dashboardu
const AlertBar = ({ alerts = [], onRefresh, userId }) => {
  const [selectedAlert, setSelectedAlert] = useState(null);

  if (alerts.length === 0) {
    return (
      <div className={styles.emptyState}>
        <p>Brak pilnych powiadomień.</p>
      </div>
    );
  }

  // Styl alertu
  const getAlertClass = (type) => {
    switch (type) {
      case 'error': return styles.error;
      case 'warning': return styles.warning;
      case 'info':
      default: return styles.info;
    }
  };

  // Ikona alertu
  const getAlertIcon = (type) => {
    switch (type) {
      case 'error': return <AlertCircle size={20} className={styles.icon} />;
      case 'warning': return <AlertCircle size={20} className={styles.icon} />; // Alternatively Warning icon if available
      case 'info':
      default: return <Info size={20} className={styles.icon} />;
    }
  };

  return (
    <div className={styles.alertContainer}>
      {alerts.map((alert, index) => (
        <div 
          key={index} 
          className={`${styles.alertItem} ${getAlertClass(alert.type)}`}
        >
          {getAlertIcon(alert.type)}
          <div className={styles.content}>
            <span className={styles.message}>{alert.message}</span>
            {alert.date && <span className={styles.date}>{alert.date}</span>}
            
            {alert.appointment_id && (
              <button 
                className={styles.actionBtn}
                onClick={() => setSelectedAlert(alert)}
              >
                <Edit3 size={14} />
                Dopisz notatkę
              </button>
            )}
          </div>
        </div>
      ))}

      {selectedAlert && (
        <QuickNoteModal 
          alertData={selectedAlert}
          userId={userId}
          onClose={() => setSelectedAlert(null)}
          onSave={onRefresh}
        />
      )}
    </div>
  );
};

export default AlertBar;
