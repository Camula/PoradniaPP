import styles from './ConfirmDialog.module.css';

// Modal potwierdzenia
const ConfirmDialog = ({ title, message, resolve, onClose, confirmText = 'Potwierdź', cancelText = 'Anuluj', variant = 'danger' }) => {
  // Anulowanie
  const handleCancel = () => {
    onClose();
    resolve(false);
  };

  // Potwierdzenie
  const handleConfirm = () => {
    onClose();
    resolve(true);
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h3>{title}</h3>
        </div>
        <div className={styles.body}>
          <p>{message}</p>
        </div>
        <div className={styles.footer}>
          <button className={styles.cancelBtn} onClick={handleCancel}>{cancelText}</button>
          <button className={`${styles.confirmBtn} ${styles[variant]}`} onClick={handleConfirm}>{confirmText}</button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
