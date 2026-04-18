import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Plus, Trash2, Edit2, Calendar, FileText } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useConfirm } from '../../../context/ConfirmContext';
import { useAuth } from '../../../context/AuthContext';
import styles from './ReferralList.module.css';
import { apiClient } from '../../../api/client';

// Skierowania pacjenta
const ReferralList = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const confirm = useConfirm();
  const [referrals, setReferrals] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [currentReferral, setCurrentReferral] = useState({ referral_number: '', issuing_facility: '', expiry_date: '' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReferrals();
  }, [id]);

  // Pobranie skierowań
  const fetchReferrals = async () => {
    try {
      const response = await apiClient.get(`/patients/${id}/referrals`);
      setReferrals(response.data);
    } catch (error) {
      console.error('Błąd podczas pobierania skierowań:', error);
    } finally {
      setLoading(false);
    }
  };

  // Zapis skierowania
  const handleSubmit = async (e) => {
    e.preventDefault();
    const isEditingMode = !!currentReferral.id;
    const url = isEditingMode 
      ? `/patients/${id}/referrals/${currentReferral.id}`
      : `/patients/${id}/referrals`;

    try {
      const response = isEditingMode 
        ? await apiClient.put(url, currentReferral)
        : await apiClient.post(url, currentReferral);
        
      toast.success(isEditingMode ? 'Pomyślnie zaktualizowano skierowanie' : 'Pomyślnie dodano skierowanie');
      setIsEditing(false);
      setCurrentReferral({ referral_number: '', issuing_facility: '', expiry_date: '' });
      fetchReferrals();
    } catch (error) {
      console.error('Błąd podczas zapisywania skierowania:', error);
      toast.error('Wystąpił błąd podczas zapisywania');
    }
  };

  // Usuwanie skierowania
  const handleDelete = async (refId) => {
    const confirmed = await confirm({
      title: 'Usuwanie skierowania',
      message: 'Czy na pewno chcesz usunąć to skierowanie?',
      confirmText: 'Usuń',
      type: 'danger'
    });
    if (!confirmed) return;

    try {
      await apiClient.delete(`/patients/${id}/referrals/${refId}`);
      toast.success('Pomyślnie usunięto skierowanie');
      fetchReferrals();
    } catch (error) {
      console.error('Błąd podczas usuwania skierowania:', error);
      toast.error('Wystąpił błąd podczas usuwania');
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('pl-PL');
  };

  const isExpired = (expiryDate) => {
    return new Date(expiryDate) < new Date();
  };

  if (loading) return <div className={styles.container}>Ładowanie...</div>;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3>Skierowania</h3>
        {user.role === 'admin' && !isEditing && (
          <button 
            onClick={() => {
              setCurrentReferral({ referral_number: '', issuing_facility: '', expiry_date: '' });
              setIsEditing(true);
            }}
            className={styles.addButton}
          >
            <Plus size={18} />
            Dodaj skierowanie
          </button>
        )}
      </div>

      {isEditing && (
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label>Numer skierowania</label>
              <input 
                type="text" 
                required
                value={currentReferral.referral_number}
                onChange={e => setCurrentReferral({...currentReferral, referral_number: e.target.value})}
              />
            </div>
            <div className={styles.formGroup}>
              <label>Placówka wystawiająca</label>
              <input 
                type="text" 
                required
                value={currentReferral.issuing_facility}
                onChange={e => setCurrentReferral({...currentReferral, issuing_facility: e.target.value})}
              />
            </div>
            <div className={styles.formGroup}>
              <label>Data ważności</label>
              <input 
                type="date" 
                required
                value={currentReferral.expiry_date}
                onChange={e => setCurrentReferral({...currentReferral, expiry_date: e.target.value})}
              />
            </div>
          </div>
          <div className={styles.formActions}>
            <button type="button" onClick={() => setIsEditing(false)} className={styles.cancelButton}>Anuluj</button>
            <button type="submit" className={styles.submitButton}>Zapisz</button>
          </div>
        </form>
      )}

      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Numer skierowania</th>
              <th>Placówka</th>
              <th>Data ważności</th>
              <th>Status</th>
              {user.role === 'admin' && <th>Akcje</th>}
            </tr>
          </thead>
          <tbody>
            {referrals.length > 0 ? referrals.map(ref => (
              <tr key={ref.id}>
                <td>
                  <div className={styles.iconText}>
                    <FileText size={16} color="var(--text-muted)" />
                    {ref.referral_number}
                  </div>
                </td>
                <td>{ref.issuing_facility}</td>
                <td>
                  <div className={styles.iconText}>
                    <Calendar size={16} color="var(--text-muted)" />
                    {formatDate(ref.expiry_date)}
                  </div>
                </td>
                <td>
                  <span className={`${styles.statusBadge} ${isExpired(ref.expiry_date) ? styles.statusExpired : styles.statusActive}`}>
                    {isExpired(ref.expiry_date) ? 'wygasło' : 'aktywne'}
                  </span>
                </td>
                {user.role === 'admin' && (
                  <td>
                    <div className={styles.actionButtons}>
                      <button 
                        onClick={() => {
                          setCurrentReferral(ref);
                          setIsEditing(true);
                        }}
                        className={styles.editButton}
                      >
                        <Edit2 size={18} />
                      </button>
                      <button 
                        onClick={() => handleDelete(ref.id)}
                        className={styles.deleteButton}
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            )) : (
              <tr>
                <td colSpan={user.role === 'admin' ? 5 : 4} className={styles.emptyState}>
                  Brak skierowań dla tego pacjenta.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ReferralList;
