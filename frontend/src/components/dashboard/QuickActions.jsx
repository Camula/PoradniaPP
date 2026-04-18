import { useNavigate } from 'react-router-dom';
import { UserPlus, CalendarPlus } from 'lucide-react';
import styles from './QuickActions.module.css';

// Szybkie linki na dashboardzie.
const QuickActions = ({ userRole }) => {
  const navigate = useNavigate();

  const isAdmin = userRole === 'admin';

  const actions = isAdmin ? [
    { label: 'Nowy pacjent', icon: <UserPlus size={20} />, path: '/patients', color: 'primary' },
    { label: 'Zaplanuj wizytę', icon: <CalendarPlus size={20} />, path: '/calendar', color: 'accent' },
  ] : [
    { label: 'Harmonogram', icon: <CalendarPlus size={20} />, path: '/calendar', color: 'primary' },
    { label: 'Baza pacjentów', icon: <UserPlus size={20} />, path: '/patients', color: 'accent' },
  ];

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Szybkie akcje</h2>
      <div className={styles.actionsGrid}>
        {actions.map((action, index) => (
          <button
            key={index}
            className={`${styles.actionButton} ${styles[action.color]}`}
            onClick={() => navigate(action.path)}
          >
            {action.icon}
            <span className={styles.label}>{action.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default QuickActions;
