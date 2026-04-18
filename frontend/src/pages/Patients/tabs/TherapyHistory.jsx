import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Trash2, Edit2, MessageSquare, Clock } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useConfirm } from '../../../context/ConfirmContext';
import { useAuth } from '../../../context/AuthContext';
import styles from './TherapyHistory.module.css';
import { apiClient } from '../../../api/client';

// Historia terapii
const TherapyHistory = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const confirm = useConfirm();
  const [notes, setNotes] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [currentNote, setCurrentNote] = useState({ content: '' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotes();
  }, [id]);

  // Pobranie notatek
  const fetchNotes = async () => {
    try {
      const response = await apiClient.get(`/patients/${id}/notes`);
      setNotes(response.data);
    } catch (error) {
      console.error('Błąd podczas pobierania notatek:', error);
    } finally {
      setLoading(false);
    }
  };

  // Zapisanie notatki
  const handleSubmit = async (e) => {
    e.preventDefault();
    const isEditingMode = !!currentNote.id;
    const url = isEditingMode 
      ? `/patients/${id}/notes/${currentNote.id}`
      : `/patients/${id}/notes`;

    try {
      const response = isEditingMode 
        ? await apiClient.put(url, currentNote)
        : await apiClient.post(url, currentNote);

      toast.success(isEditingMode ? 'Pomyślnie zaktualizowano notatkę' : 'Pomyślnie dodano notatkę');
      setIsEditing(false);
      setCurrentNote({ content: '' });
      fetchNotes();
    } catch (error) {
      console.error('Błąd podczas zapisywania notatki:', error);
      toast.error('Wystąpił błąd podczas zapisywania');
    }
  };

  // Usuwanie notatki
  const handleDelete = async (noteId) => {
    const confirmed = await confirm({
      title: 'Usuwanie notatki',
      message: 'Czy na pewno chcesz usunąć tę notatkę?',
      confirmText: 'Usuń',
      type: 'danger'
    });
    if (!confirmed) return;

    try {
      await apiClient.delete(`/patients/${id}/notes/${noteId}`);
      toast.success('Pomyślnie usunięto notatkę');
      fetchNotes();
    } catch (error) {
      console.error('Błąd podczas usuwania notatki:', error);
      toast.error('Wystąpił błąd podczas usuwania');
    }
  };
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('pl-PL');
  };

  if (loading) return <div className={styles.container}>Ładowanie...</div>;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3>Historia terapii</h3>
      </div>

      {isEditing && (
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label>Treść notatki</label>
            <textarea 
              required
              value={currentNote.content}
              onChange={e => setCurrentNote({...currentNote, content: e.target.value})}
              className={styles.textarea}
              placeholder="Wpisz przebieg sesji, obserwacje lub zalecenia..."
            />
          </div>
          <div className={styles.formActions}>
            <button type="button" onClick={() => setIsEditing(false)} className={styles.cancelButton}>Anuluj</button>
            <button type="submit" className={styles.submitButton}>Zapisz</button>
          </div>
        </form>
      )}

      <div className={styles.notesList}>
        {notes.length > 0 ? notes.map(note => (
          <div key={note.id} className={styles.noteCard}>
            <div className={styles.noteHeader}>
              <div className={styles.therapistInfo}>
                <div className={styles.avatar}>
                  {note.name[0]}{note.surname[0]}
                </div>
                <div className={styles.metaInfo}>
                  <div className={styles.therapistName}>{note.name} {note.surname}</div>
                  <div className={styles.timestamp}>
                    <Clock size={12} />
                    {formatDate(note.created_at)}
                  </div>
                </div>
              </div>
              {user.id == note.therapist_id && (
                <div className={styles.actionButtons}>
                  <button 
                    onClick={() => {
                      setCurrentNote(note);
                      setIsEditing(true);
                    }}
                    className={`${styles.iconButton} ${styles.editButton}`}
                  >
                    <Edit2 size={16} />
                  </button>
                  <button 
                    onClick={() => handleDelete(note.id)}
                    className={`${styles.iconButton} ${styles.deleteButton}`}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              )}
            </div>
            {note.appointment_id && (
              <div className={styles.appointmentRef}>
                <strong>Dotyczy wizyty:</strong> {new Date(note.start_time).toLocaleDateString('pl-PL')} ({note.appointment_type})
              </div>
            )}
            <div className={styles.content}>
              {note.content}
            </div>
          </div>
        )) : (
          <div className={styles.emptyState}>
            <MessageSquare size={48} className={styles.emptyIcon} />
            <p>Brak notatek dla tego pacjenta.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TherapyHistory;
