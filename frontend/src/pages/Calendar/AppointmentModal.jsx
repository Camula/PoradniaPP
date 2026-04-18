import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { useConfirm } from '../../context/ConfirmContext';
import { useAuth } from '../../context/AuthContext';
import styles from './AppointmentModal.module.css';
import { apiClient } from '../../api/client';

// Modal wizyty
const AppointmentModal = ({ isOpen, onClose, selectedDate, appointment, onSave }) => {
  const { user } = useAuth();
  const confirm = useConfirm();
  const [patients, setPatients] = useState([]);
  const [therapists, setTherapists] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [viewMode, setViewMode] = useState('create');
  
  const [formData, setFormData] = useState({
    patient_id: '',
    therapist_id: '',
    room_id: '',
    type: 'Konsultacja',
    status: 'Zaplanowana',
    date: '',
    hour: '08',
    minute: '00'
  });
  const [error, setError] = useState('');

  // Inicjalizacja
  useEffect(() => {
    if (isOpen) {
      if (appointment) {
        setViewMode('summary');
        let date = '';
        let hour = '08';
        let minute = '00';
        if (appointment.start_time) {
          const d = new Date(appointment.start_time);
          const tzOffset = d.getTimezoneOffset() * 60000;
          const localStr = new Date(d.getTime() - tzOffset).toISOString();
          date = localStr.split('T')[0];
          hour = String(d.getHours()).padStart(2, '0');
          minute = String(d.getMinutes()).padStart(2, '0');
        }
        setFormData({
          patient_id: appointment.patient_id || '',
          therapist_id: appointment.therapist_id || '',
          room_id: appointment.room_id || '',
          type: appointment.type || 'Konsultacja',
          status: appointment.status || 'Zaplanowana',
          date,
          hour,
          minute
        });
      } else {
        setViewMode('create');
        let date = '';
        let hour = '08';
        let minute = '00';
        if (selectedDate) {
          const d = new Date(selectedDate);
          const tzOffset = d.getTimezoneOffset() * 60000;
          const localStr = new Date(d.getTime() - tzOffset).toISOString();
          date = localStr.split('T')[0];
          if (typeof selectedDate === 'string' && selectedDate.includes('T')) {
            hour = String(d.getHours()).padStart(2, '0');
            minute = String(d.getMinutes()).padStart(2, '0');
          } else if (selectedDate instanceof Date && (selectedDate.getHours() !== 0 || selectedDate.getMinutes() !== 0)) {
            hour = String(d.getHours()).padStart(2, '0');
            minute = String(d.getMinutes()).padStart(2, '0');
          }
        }
        setFormData({
          patient_id: '',
          therapist_id: user.role === 'therapist' ? user.id : '',
          room_id: '',
          type: 'Konsultacja',
          status: 'Zaplanowana',
          date,
          hour,
          minute
        });
      }
      setError('');
      fetchOptions();
    }
  }, [isOpen, appointment, selectedDate, user]);

  // Pobieranie opcji
  const fetchOptions = async () => {
    try {
      const patientsUrl = user.role === 'admin' ? '/patients?all=true' : '/patients';
      
      const [patientsRes, staffRes, roomsRes] = await Promise.all([
        apiClient.get(patientsUrl),
        apiClient.get('/staff?role=therapist'),
        apiClient.get('/rooms?active=true')
      ]);
      
      setPatients(patientsRes.data);
      setTherapists(staffRes.data);
      setRooms(roomsRes.data);
    } catch (err) {
      console.error('Błąd podczas pobierania opcji wizyty:', err);
      setError('Błąd podczas pobierania opcji');
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Zapis
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.patient_id) {
      setError("Proszę wybrać pacjenta z listy.");
      return;
    }
    
    const dateTimeStr = `${formData.date}T${formData.hour}:${formData.minute}`;
    const d = new Date(dateTimeStr);
    const hour = parseInt(formData.hour, 10);
    
    if (hour < 8 || hour > 19) {
      setError("Wizyty można planować tylko w godzinach 08:00 - 20:00. Ostatnia wizyta może rozpocząć się o 19:00.");
      return;
    }
    
    const startIso = d.toISOString();
    
    const payload = {
      patient_id: formData.patient_id,
      therapist_id: formData.therapist_id,
      room_id: formData.room_id,
      type: formData.type,
      status: formData.status,
      start_time: startIso
    };

    try {
      const url = appointment ? `/appointments/${appointment.id}` : '/appointments';
      const res = appointment 
        ? await apiClient.put(url, payload)
        : await apiClient.post(url, payload);
      
      toast.success(appointment ? 'Pomyślnie zaktualizowano wizytę' : 'Pomyślnie zaplanowano wizytę');
      onSave();
      onClose();
    } catch (err) {
      console.error('Błąd podczas zapisywania wizyty:', err);
      const errorMessage = err.response?.data?.error || err.message || 'Błąd zapisu wizyty';
      setError(errorMessage);
      toast.error(errorMessage);
    }
  };

  // Usuwanie
  const handleDelete = async () => {
    const confirmed = await confirm({
      title: 'Usuwanie wizyty',
      message: 'Czy na pewno chcesz usunąć tę wizytę?',
      confirmText: 'Usuń',
      type: 'danger'
    });
    if (!confirmed) return;

    try {
      await apiClient.delete(`/appointments/${appointment.id}`);
      toast.success('Pomyślnie usunięto wizytę');
      onSave();
      onClose();
    } catch (err) {
      console.error('Błąd podczas usuwania wizyty:', err);
      const errorMessage = err.response?.data?.error || err.message || 'Błąd usuwania wizyty';
      setError(errorMessage);
      toast.error(errorMessage);
    }
  };

  // Kopiowanie wizyty
  const handleCopyNextWeek = async () => {
    try {
      const start = new Date(appointment.start_time);
      const nextWeek = new Date(start.getTime() + 24 * 60 * 60 * 1000 * 7);
      
      const payload = {
        patient_id: appointment.patient_id,
        therapist_id: appointment.therapist_id,
        room_id: appointment.room_id,
        type: appointment.type,
        status: 'Zaplanowana',
        start_time: nextWeek.toISOString()
      };

      await apiClient.post('/appointments', payload);
      
      toast.success('Pomyślnie skopiowano wizytę na kolejny tydzień');
      onSave();
      onClose();
    } catch (err) {
      console.error('Błąd podczas kopiowania wizyty:', err);
      const errorMessage = err.response?.data?.error || err.message || 'Błąd kopiowania wizyty';
      setError(errorMessage);
      toast.error(errorMessage);
    }
  };

  if (!isOpen) return null;

  const getPatientName = (id) => {
    const p = patients.find(p => String(p.id) === String(id));
    return p ? `${p.surname} ${p.name}` : id;
  };

  const getTherapistName = (id) => {
    const t = therapists.find(t => String(t.id) === String(id));
    return t ? `${t.name} ${t.surname}` : id;
  };

  const getRoomName = (id) => {
    const r = rooms.find(r => String(r.id) === String(id));
    return r ? r.name : id;
  };

  const renderSummary = () => (
    <div className={styles.summary}>
      <div className={styles.summaryItem}>
        <label>Pacjent</label>
        <p>{getPatientName(formData.patient_id)}</p>
      </div>
      <div className={styles.summaryItem}>
        <label>Terapeuta</label>
        <p>{getTherapistName(formData.therapist_id)}</p>
      </div>
      <div className={styles.summaryItem}>
        <label>Sala</label>
        <p>{getRoomName(formData.room_id)}</p>
      </div>
      <div className={styles.summaryItem}>
        <label>Data</label>
        <p>{formData.date}</p>
      </div>
      <div className={styles.summaryItem}>
        <label>Czas</label>
        <p>{formData.hour}:{formData.minute}</p>
      </div>
      <div className={styles.summaryItem}>
        <label>Rodzaj wizyty</label>
        <p>{formData.type}</p>
      </div>
      <div className={styles.summaryItem}>
        <label>Status</label>
        <p>{formData.status}</p>
      </div>
      <div className={styles.actions}>
        <button type="button" onClick={handleDelete} className={styles.deleteButton}>Usuń</button>
        <button type="button" onClick={handleCopyNextWeek} className={styles.copyButton}>Skopiuj na za tydzień</button>
        <button type="button" onClick={() => setViewMode('edit')} className={styles.submitButton}>Edytuj</button>
      </div>
    </div>
  );

  const renderForm = () => (
    <form onSubmit={handleSubmit}>
      <div className={styles.formGroup}>
        <label>Pacjent</label>
        <select name="patient_id" value={formData.patient_id} onChange={handleChange} required>
          <option value="">Wybierz pacjenta...</option>
          {patients.sort((a, b) => a.surname.localeCompare(b.surname)).map(p => (
            <option key={p.id} value={p.id}>{p.surname} {p.name}</option>
          ))}
        </select>
      </div>
      
      <div className={styles.formGroup}>
        <label>Terapeuta</label>
        <select name="therapist_id" value={formData.therapist_id} onChange={handleChange} required disabled={user.role === 'therapist'}>
          <option value="">Wybierz terapeutę...</option>
          {therapists.map(t => (
            <option key={t.id} value={t.id}>{t.name} {t.surname}</option>
          ))}
        </select>
      </div>
      
      <div className={styles.formGroup}>
        <label>Sala</label>
        <select name="room_id" value={formData.room_id} onChange={handleChange} required>
          <option value="">Wybierz salę...</option>
          {rooms.map(r => (
            <option key={r.id} value={r.id}>{r.name}</option>
          ))}
        </select>
      </div>
      
      <div className={styles.formGroup}>
        <label>Rodzaj wizyty</label>
        <select name="type" value={formData.type} onChange={handleChange} required>
          <option value="Konsultacja">Konsultacja</option>
          <option value="Badanie wstępne">Badanie wstępne</option>
          <option value="Wizyta logopedyczna">Wizyta logopedyczna</option>
          <option value="Wizyta pedagogiczna">Wizyta pedagogiczna</option>
          <option value="Integracja Sensoryczna (SI)">Integracja Sensoryczna (SI)</option>
          <option value="Wizyta psychologiczna">Wizyta psychologiczna</option>
        </select>
      </div>
      
      <div className={styles.formGroup}>
        <label>Status</label>
        <select name="status" value={formData.status} onChange={handleChange} required>
          <option value="Zaplanowana">Zaplanowana</option>
          <option value="Odbyta">Odbyta</option>
          <option value="Odwołana">Odwołana</option>
        </select>
      </div>
      
      <div className={styles.formGroup}>
        <label>Data wizyty</label>
        <input type="date" name="date" value={formData.date} onChange={handleChange} required />
      </div>

      <div className={styles.formGroup}>
        <label>Godzina</label>
        <div className={styles.timeSelects}>
          <select name="hour" value={formData.hour} onChange={handleChange} required>
            {Array.from({ length: 12 }, (_, i) => i + 8).map(h => {
              const val = String(h).padStart(2, '0');
              return <option key={val} value={val}>{val}</option>;
            })}
          </select>
          <select name="minute" value={formData.minute} onChange={handleChange} required>
            {Array.from({ length: 12 }, (_, i) => i * 5).map(m => {
              const val = String(m).padStart(2, '0');
              return <option key={val} value={val}>{val}</option>;
            })}
          </select>
        </div>
      </div>
      
      <div className={styles.actions}>
        {viewMode === 'edit' ? (
          <>
            <button type="button" onClick={() => setViewMode('summary')} className={styles.cancelButton}>Anuluj</button>
            <button type="submit" className={styles.submitButton}>Zapisz zmianę</button>
          </>
        ) : (
          <>
            <button type="button" onClick={onClose} className={styles.cancelButton}>Anuluj</button>
            <button type="submit" className={styles.submitButton}>Zaplanuj</button>
          </>
        )}
      </div>
    </form>
  );

  const getHeaderTitle = () => {
    if (viewMode === 'summary') return 'Szczegóły wizyty';
    if (viewMode === 'edit') return 'Edytuj wizytę';
    return 'Nowa wizyta';
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2>{getHeaderTitle()}</h2>
          <button onClick={onClose} className={styles.closeButton}>&times;</button>
        </div>
        
        {error && <div className={styles.error}>{error}</div>}
        
        {viewMode === 'summary' ? renderSummary() : renderForm()}
      </div>
    </div>
  );
};

export default AppointmentModal;