import { useState } from 'react';
import { X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import styles from './AddPatientModal.module.css';
import { useAuth } from '../../context/AuthContext';
import { apiClient } from '../../api/client';

// Modal dodawania i edycji pacjenta
const AddPatientModal = ({ onClose, onSuccess, initialData = null }) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    surname: initialData?.surname || '',
    birth_date: initialData?.birth_date || '',
    pesel: initialData?.pesel || '',
    address: initialData?.address || '',
    parent_phone_1: initialData?.parent_phone_1 || '',
    parent_phone_2: initialData?.parent_phone_2 || '',
    parent_email_1: initialData?.parent_email_1 || '',
    parent_email_2: initialData?.parent_email_2 || '',
    customSignature: initialData?.signature || '',
    status: initialData?.status || 'aktywny'
  });
  const [useCustomSignature, setUseCustomSignature] = useState(!!initialData?.signature);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEditing = !!initialData;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Obsługa wysyłania formularza
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (formData.pesel.length !== 11) {
      setError('PESEL musi mieć 11 cyfr.');
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = { ...formData };
      if (!useCustomSignature && !isEditing) {
        delete payload.customSignature;
      }

      const url = isEditing ? `/patients/${initialData.id}` : '/patients';
      const response = isEditing 
        ? await apiClient.put(url, payload)
        : await apiClient.post(url, payload);

      const data = response.data;

      if (data.success) {
        toast.success(isEditing ? 'Dane pacjenta zaktualizowane' : 'Pacjent dodany pomyślnie');
        onSuccess();
      } else {
        const msg = data.message || 'Wystąpił błąd.';
        setError(msg);
        toast.error(msg);
      }
    } catch (err) {
      console.error('Błąd podczas zapisywania pacjenta:', err);
      const msg = err.response?.data?.message || err.response?.data?.error || 'Błąd połączenia z serwerem.';
      setError(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2>{isEditing ? 'Edycja pacjenta' : 'Nowy pacjent'}</h2>
          <button className={styles.closeButton} onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          {error && <div className={styles.error}>{error}</div>}

          <div className={styles.row}>
            <div>
              <label className={styles.label}>Imię</label>
              <input 
                type="text" 
                name="name" 
                required 
                className={styles.input} 
                value={formData.name} 
                onChange={handleChange} 
              />
            </div>
            <div>
              <label className={styles.label}>Nazwisko</label>
              <input 
                type="text" 
                name="surname" 
                required 
                className={styles.input} 
                value={formData.surname} 
                onChange={handleChange} 
              />
            </div>
          </div>

          <div className={styles.row}>
            <div>
              <label className={styles.label}>Data urodzenia</label>
              <input 
                type="date" 
                name="birth_date" 
                className={styles.input} 
                value={formData.birth_date} 
                onChange={handleChange} 
              />
            </div>
            <div>
              <label className={styles.label}>PESEL</label>
              <input 
                type="text" 
                name="pesel" 
                required 
                maxLength={11}
                className={styles.input} 
                value={formData.pesel} 
                onChange={handleChange} 
              />
            </div>
          </div>

          {!isEditing && (
            <div className={styles.row}>
              <div>
                <label className={styles.label}>Sygnatura</label>
                <div className={styles.checkboxWrapper} style={{ marginTop: '0.5rem' }}>
                  <input 
                    type="checkbox" 
                    id="useCustom" 
                    checked={useCustomSignature} 
                    onChange={(e) => setUseCustomSignature(e.target.checked)} 
                  />
                  <label htmlFor="useCustom" style={{ fontSize: '0.75rem' }}>Własna sygnatura</label>
                </div>
                {useCustomSignature && (
                  <input 
                    type="text" 
                    name="customSignature" 
                    placeholder="np. PAC/2026/99"
                    className={styles.input} 
                    value={formData.customSignature} 
                    onChange={handleChange} 
                  />
                )}
              </div>
              <div>
                {/* Spacer */}
              </div>
            </div>
          )}

          {isEditing && (
            <div className={styles.row}>
              <div>
                <label className={styles.label}>Status</label>
                <select 
                  name="status" 
                  className={styles.input} 
                  value={formData.status} 
                  onChange={handleChange}
                >
                  <option value="aktywny">Aktywny</option>
                  <option value="nieaktywny">Nieaktywny</option>
                  <option value="zarchiwizowany">Zarchiwizowany</option>
                </select>
              </div>
              <div></div>
            </div>
          )}

          <div className={styles.fullRow}>
            <label className={styles.label}>Adres</label>
            <input 
              type="text" 
              name="address" 
              required 
              className={styles.input} 
              value={formData.address} 
              onChange={handleChange} 
            />
          </div>

          <div className={styles.row}>
            <div>
              <label className={styles.label}>Telefon rodzica 1</label>
              <input 
                type="text" 
                name="parent_phone_1" 
                required 
                className={styles.input} 
                value={formData.parent_phone_1} 
                onChange={handleChange} 
              />
            </div>
            <div>
              <label className={styles.label}>Telefon rodzica 2</label>
              <input 
                type="text" 
                name="parent_phone_2" 
                className={styles.input} 
                value={formData.parent_phone_2} 
                onChange={handleChange} 
              />
            </div>
          </div>

          <div className={styles.row}>
            <div>
              <label className={styles.label}>Email rodzica 1</label>
              <input 
                type="email" 
                name="parent_email_1" 
                className={styles.input} 
                value={formData.parent_email_1} 
                onChange={handleChange} 
              />
            </div>
            <div>
              <label className={styles.label}>Email rodzica 2</label>
              <input 
                type="email" 
                name="parent_email_2" 
                className={styles.input} 
                value={formData.parent_email_2} 
                onChange={handleChange} 
              />
            </div>
          </div>

          <div className={styles.footer}>
            <button type="button" className={styles.cancelButton} onClick={onClose}>
              Anuluj
            </button>
            <button type="submit" className={styles.submitButton} disabled={isSubmitting}>
              {isSubmitting ? (isEditing ? 'Zapisywanie...' : 'Dodawanie...') : (isEditing ? 'Zapisz zmiany' : 'Dodaj pacjenta')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddPatientModal;
