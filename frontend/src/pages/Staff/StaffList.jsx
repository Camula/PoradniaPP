import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { useConfirm } from '../../context/ConfirmContext';
import styles from './StaffList.module.css';
import { useAuth } from '../../context/AuthContext';
import { Trash2 } from 'lucide-react';
import { apiClient } from '../../api/client';

// Zarządzanie personelem
const StaffList = () => {
  const { user } = useAuth();
  const confirm = useConfirm();
  const [staff, setStaff] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    surname: '',
    email: '',
    password: '',
    role: 'therapist',
    specialization: '',
    status: 'active'
  });

  // Pobranie pracowników
  const fetchStaff = async () => {
    try {
      const res = await apiClient.get('/staff');
      setStaff(res.data);
    } catch (error) {
      console.error('Błąd pobierania personelu:', error);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  // Otwarcie modala
  const handleOpenModal = (item = null) => {
    if (item) {
      setEditingStaff(item);
      setFormData({
        name: item.name,
        surname: item.surname,
        email: item.email,
        password: '',
        role: item.role,
        specialization: item.specialization || '',
        status: item.status
      });
    } else {
      setEditingStaff(null);
      setFormData({
        name: '',
        surname: '',
        email: '',
        password: '',
        role: 'therapist',
        specialization: '',
        status: 'active'
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingStaff(null);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Zapis pracownika
  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (editingStaff) {
        await apiClient.put(`/staff/${editingStaff.id}`, formData);
        toast.success('Pomyślnie zaktualizowano dane pracownika');
      } else {
        await apiClient.post('/staff', formData);
        toast.success('Pomyślnie dodano pracownika');
      }
      fetchStaff();
      handleCloseModal();
    } catch (error) {
      console.error('Błąd zapisu:', error);
      toast.error('Wystąpił błąd podczas zapisywania');
    }
  };

  // Status pracownika
  const handleToggleStatus = async (item) => {
    const isArchiving = item.status === 'active';
    const newStatus = isArchiving ? 'inactive' : 'active';

    if (isArchiving) {
      const confirmed = await confirm({
        title: 'Archiwizacja pracownika',
        message: `Czy na pewno chcesz zarchiwizować pracownika ${item.name} ${item.surname}?`,
        confirmText: 'Zarchiwizuj',
        type: 'danger'
      });
      if (!confirmed) return;
    }

    try {
      await apiClient.patch(`/staff/${item.id}/archive`, { status: newStatus });
      toast.success(isArchiving ? 'Pracownik został zarchiwizowany' : 'Pracownik został przywrócony');
      fetchStaff();
    } catch (error) {
      console.error('Błąd zmiany statusu:', error);
      toast.error('Wystąpił błąd podczas zmiany statusu');
    }
  };

  // Usuwanie pracownika
  const handleDeleteStaff = async (item) => {
    const confirmed = await confirm({
      title: 'Usuwanie pracownika',
      message: `Czy na pewno chcesz TRWALE usunąć pracownika ${item.name} ${item.surname}? Wszystkie powiązane wizyty i notatki zostaną usunięte.`,
      confirmText: 'Usuń trwale',
      type: 'danger'
    });

    if (!confirmed) return;

    try {
      await apiClient.delete(`/staff/${item.id}`);
      toast.success('Pracownik został pomyślnie usunięty');
      fetchStaff();
    } catch (error) {
      console.error('Błąd usuwania:', error);
      toast.error('Wystąpił błąd podczas usuwania');
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Zarządzanie Personelem</h1>
        <button className={styles.btn_add} onClick={() => handleOpenModal()}>Dodaj pracownika</button>
      </div>

      <table className={styles.table}>
        <thead>
          <tr>
            <th>Imię i Nazwisko</th>
            <th>Email</th>
            <th>Rola</th>
            <th>Specjalizacja</th>
            <th>Status</th>
            <th>Akcje</th>
          </tr>
        </thead>
        <tbody>
          {staff.map(item => (
            <tr key={item.id}>
              <td>{item.name} {item.surname}</td>
              <td>{item.email}</td>
              <td>{item.role === 'admin' ? 'Admin' : 'Terapeuta'}</td>
              <td>{item.specialization || '-'}</td>
              <td>
                <span className={item.status === 'active' ? styles.status_active : styles.status_inactive}>
                  {item.status === 'active' ? 'Aktywny' : 'Nieaktywny'}
                </span>
              </td>
              <td>
                <button className={styles.btn_edit} onClick={() => handleOpenModal(item)}>Edytuj</button>
                <button className={styles.btn_archive} onClick={() => handleToggleStatus(item)}>
                  {item.status === 'active' ? 'Archiwizuj' : 'Przywróć'}
                </button>
                {user.role === 'admin' && (
                  <button className={styles.btn_delete} onClick={() => handleDeleteStaff(item)} title="Usuń trwale">
                    <Trash2 size={16} />
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {isModalOpen && (
        <div className={styles.modal}>
          <div className={styles.modal_content}>
            <h2>{editingStaff ? 'Edytuj pracownika' : 'Dodaj pracownika'}</h2>
            <form onSubmit={handleSubmit}>
              <div className={styles.form_group}>
                <label>Imię</label>
                <input type="text" name="name" value={formData.name} onChange={handleInputChange} required />
              </div>
              <div className={styles.form_group}>
                <label>Nazwisko</label>
                <input type="text" name="surname" value={formData.surname} onChange={handleInputChange} required />
              </div>
              <div className={styles.form_group}>
                <label>Email</label>
                <input type="email" name="email" value={formData.email} onChange={handleInputChange} required />
              </div>
              {editingStaff ? (
                <div className={styles.form_group}>
                  <label>Nowe hasło (opcjonalnie)</label>
                  <input type="password" name="password" value={formData.password} onChange={handleInputChange} placeholder="Pozostaw puste, aby nie zmieniać" />
                </div>
              ) : (
                <div className={styles.form_group}>
                  <label>Hasło</label>
                  <input type="password" name="password" value={formData.password} onChange={handleInputChange} required />
                </div>
              )}
              <div className={styles.form_group}>
                <label>Rola</label>
                <select name="role" value={formData.role} onChange={handleInputChange}>
                  <option value="therapist">Terapeuta</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className={styles.form_group}>
                <label>Specjalizacja</label>
                <input type="text" name="specialization" value={formData.specialization} onChange={handleInputChange} />
              </div>
              <div className={styles.modal_actions}>
                <button type="button" className={styles.btn_cancel} onClick={handleCloseModal}>Anuluj</button>
                <button type="submit" className={styles.btn_save}>Zapisz</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffList;
