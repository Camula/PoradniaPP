import { useState } from 'react';
import { X } from 'lucide-react';
import toast from 'react-hot-toast';
import styles from './QuickNoteModal.module.css';
import { apiClient } from '../../api/client';

// Szybka notatka
const QuickNoteModal = ({ alertData, onClose, onSave, userId }) => {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);

  // Zapis notatki
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim()) return;

    setLoading(true);
    try {
      await apiClient.post(`/patients/${alertData.patient_id}/notes`, {
        content,
        appointment_id: alertData.appointment_id
      });

      onSave();
      onClose();
      toast.success('Notatka została zapisana');
    } catch (error) {
      console.error('Błąd podczas zapisywania szybkiej notatki:', error);
      toast.error('Błąd połączenia');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <div>
            <h3>Dopisz notatkę</h3>
            {alertData.patient_name && (
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#666' }}>
                {alertData.patient_name} • {alertData.appointment_date}
              </p>
            )}
          </div>
          <button onClick={onClose} className={styles.closeButton}>
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className={styles.form}>
          <p className={styles.alertInfo}>{alertData.message}</p>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Wpisz treść notatki..."
            className={styles.textarea}
            required
            autoFocus
          />
          <div className={styles.actions}>
            <button type="button" onClick={onClose} className={styles.cancelBtn}>
              Anuluj
            </button>
            <button type="submit" className={styles.saveBtn} disabled={loading}>
              {loading ? 'Zapisywanie...' : 'Zapisz notatkę'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default QuickNoteModal;
