import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { User, Mail, Tag, Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../../context/AuthContext';
import { useConfirm } from '../../../context/ConfirmContext';
import styles from './TherapyTeam.module.css';
import { apiClient } from '../../../api/client';

// Zespół terapeutyczny
const TherapyTeam = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const confirm = useConfirm();
  const [team, setTeam] = useState([]);
  const [loading, setLoading] = useState(true);
  const [availableTherapists, setAvailableTherapists] = useState([]);
  const [showAssign, setShowAssign] = useState(false);
  const [selectedTherapistId, setSelectedTherapistId] = useState('');

  useEffect(() => {
    fetchTeam();
  }, [id]);

  // Pobranie zespołu
  const fetchTeam = async () => {
    try {
      const response = await apiClient.get(`/patients/${id}/team`);
      setTeam(response.data);
    } catch (error) {
      console.error('Błąd podczas pobierania zespołu:', error);
    } finally {
      setLoading(false);
    }
  };

  // Pobranie wolnych terapeutów
  const fetchAvailableTherapists = async () => {
    try {
      const response = await apiClient.get('/staff?role=therapist&status=active');
      const data = response.data;
      const existingIds = team.map(t => t.id);
      setAvailableTherapists(data.filter(t => !existingIds.includes(t.id)));
    } catch (error) {
      console.error('Błąd podczas pobierania dostępnych terapeutów:', error);
    }
  };

  const handleShowAssign = () => {
    fetchAvailableTherapists();
    setShowAssign(true);
  };

  // Przypisanie terapeuty
  const handleAddTherapist = async () => {
    if (!selectedTherapistId) return;
    try {
      await apiClient.post(`/patients/${id}/team`, { therapist_id: selectedTherapistId });
      setShowAssign(false);
      setSelectedTherapistId('');
      fetchTeam();
      toast.success('Pomyślnie przypisano terapeutę do zespołu');
    } catch (error) {
      console.error('Błąd podczas przypisywania terapeuty:', error);
      toast.error('Błąd podczas przypisywania terapeuty');
    }
  };

  // Usunięcie terapeuty
  const handleRemoveTherapist = async (therapistId) => {
    const isConfirmed = await confirm({
      title: 'Usuwanie z zespołu',
      message: 'Czy na pewno chcesz usunąć tego terapeutę z zespołu?'
    });

    if (!isConfirmed) return;

    try {
      await apiClient.delete(`/patients/${id}/team/${therapistId}`);
      fetchTeam();
      toast.success('Pomyślnie usunięto terapeutę z zespołu');
    } catch (error) {
      console.error('Błąd podczas usuwania terapeuty:', error);
      toast.error('Błąd podczas usuwania terapeuty');
    }
  };

  if (loading) return <div className={styles.container}>Ładowanie...</div>;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerTitle}>
          <h3>Zespół terapeutyczny</h3>
          <p>
            Specjaliści przypisani do prowadzenia terapii z tym pacjentem.
          </p>
        </div>
        {user.role === 'admin' && !showAssign && (
          <button 
            onClick={handleShowAssign}
            className={styles.addButton}
          >
            <Plus size={18} />
            Przypisz terapeutę
          </button>
        )}
      </div>

      {showAssign && (
        <div className={styles.assignForm}>
          <select 
            value={selectedTherapistId} 
            onChange={(e) => setSelectedTherapistId(e.target.value)}
            className={styles.select}
          >
            <option value="">Wybierz terapeutę...</option>
            {availableTherapists.map(t => (
              <option key={t.id} value={t.id}>{t.name} {t.surname} ({t.specialization})</option>
            ))}
          </select>
          <button 
            onClick={handleAddTherapist}
            disabled={!selectedTherapistId}
            className={styles.confirmButton}
          >
            Dodaj
          </button>
          <button 
            onClick={() => setShowAssign(false)}
            className={styles.cancelFormButton}
          >
            Anuluj
          </button>
        </div>
      )}

      <div className={styles.grid}>
        {team.length > 0 ? team.map(member => (
          <div key={member.id} className={styles.card}>
            <div className={styles.avatar}>
              <User size={24} />
            </div>
            <div className={styles.memberInfo}>
              <div className={styles.memberName}>
                {member.name} {member.surname}
              </div>
              <div className={styles.specialization}>
                <Tag size={14} />
                {member.specialization}
              </div>
              <div className={styles.email}>
                <Mail size={14} />
                {member.email}
              </div>
            </div>
            {user.role === 'admin' && (
              <button 
                onClick={() => handleRemoveTherapist(member.id)}
                className={styles.removeButton}
                title="Usuń z zespołu"
              >
                <Trash2 size={18} />
              </button>
            )}
          </div>
        )) : (
          <div className={styles.emptyState}>
            Brak przypisanych terapeutów.
          </div>
        )}
      </div>
    </div>
  );
};

export default TherapyTeam;
