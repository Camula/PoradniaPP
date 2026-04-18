import * as LucideIcons from 'lucide-react';
import styles from './StatCards.module.css';

// Karty statystyk na dashboardzie.
const StatCards = ({ stats }) => {
  if (!stats || !stats.counters) return null;

  return (
    <div className={styles.grid}>
      {stats.counters.map((item, index) => {
        // Dynamiczne dopasowanie ikony z biblioteki lucide
        const Icon = LucideIcons[item.icon] || LucideIcons.Activity;
        return (
          <div key={index} className={styles.card}>
            <div className={styles.iconWrapper}>
              <Icon size={28} />
            </div>
            <div className={styles.content}>
              <span className={styles.label}>{item.label}</span>
              <span className={styles.value}>{item.value}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default StatCards;
