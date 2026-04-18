import { useState, useEffect } from 'react';
import { Search, Plus, Edit2, Trash2, ChevronUp, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import styles from './PatientList.module.css';
import AddPatientModal from './AddPatientModal';
import { useAuth } from '../../context/AuthContext';
import { useConfirm } from '../../context/ConfirmContext';
import { apiClient } from '../../api/client';

// Lista pacjentów
const PatientList = () => {
  const [patients, setPatients] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState(null);
  const [filterMode, setFilterMode] = useState('my'); // 'my' | 'all'
  const [sortConfig, setSortConfig] = useState({ key: 'surname', direction: 'asc' });
  const { user } = useAuth();
  const navigate = useNavigate();
  const confirm = useConfirm();

  useEffect(() => {
    fetchPatients();
  }, [filterMode]);

  // Pobieranie
  const fetchPatients = async () => {
    try {
      const showAll = user.role === 'admin' || filterMode === 'all';
      const response = await apiClient.get(`/patients${showAll ? '?all=true' : ''}`);
      setPatients(response.data);
    } catch (error) {
      console.error('Błąd podczas pobierania pacjentów:', error);
    } finally {
      setLoading(false);
    }
  };

  // Edycja
  const handleEdit = (e, patient) => {
    e.stopPropagation();
    setEditingPatient(patient);
    setIsModalOpen(true);
  };

  // Usuwanie
  const handleDelete = async (e, patient) => {
    e.stopPropagation();
    const isConfirmed = await confirm({
      title: 'Usuń pacjenta',
      message: `Czy na pewno chcesz usunąć pacjenta ${patient.name} ${patient.surname}? Tej operacji nie można cofnąć.`,
      confirmText: 'Usuń',
      type: 'danger'
    });

    if (isConfirmed) {
      try {
        await apiClient.delete(`/patients/${patient.id}`);
        toast.success('Pacjent został usunięty');
        fetchPatients();
      } catch (error) {
        console.error('Błąd podczas usuwania pacjenta:', error);
        const errorMessage = error.response?.data?.error || error.response?.data?.message || 'Błąd połączenia z serwerem';
        toast.error(errorMessage);
      }
    }
  };

  const handleAdd = () => {
    setEditingPatient(null);
    setIsModalOpen(true);
  };

  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const filteredPatients = patients.filter(patient => 
    patient.surname.toLowerCase().includes(search.toLowerCase()) ||
    patient.signature.toLowerCase().includes(search.toLowerCase()) ||
    patient.pesel.includes(search)
  );

  const sortedPatients = [...filteredPatients].sort((a, b) => {
    if (!sortConfig.key) return 0;
    
    let aValue = a[sortConfig.key];
    let bValue = b[sortConfig.key];

    if (aValue === null || aValue === undefined) aValue = '';
    if (bValue === null || bValue === undefined) bValue = '';

    if (typeof aValue === 'string') {
      return sortConfig.direction === 'asc' 
        ? aValue.localeCompare(bValue, 'pl') 
        : bValue.localeCompare(aValue, 'pl');
    }

    if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  const getSortIcon = (key) => {
    if (sortConfig.key !== key) return null;
    return sortConfig.direction === 'asc' 
      ? <ChevronUp size={14} className={styles.sortIcon} /> 
      : <ChevronDown size={14} className={styles.sortIcon} />;
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'aktywny': return styles.statusActive;
      case 'nieaktywny': return styles.statusInactive;
      case 'zarchiwizowany': return styles.statusArchived;
      default: return styles.statusInactive;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('pl-PL');
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.titleWithFilter}>
          <h1>Pacjenci</h1>
        </div>
        <div className={styles.actions}>
          <div className={styles.searchWrapper}>
            <Search className={styles.searchIcon} size={18} />
            <input 
              type="text" 
              placeholder="Szukaj po nazwisku, sygnaturze lub PESEL..." 
              className={styles.searchInput}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          {user.role === 'admin' && (
            <button className={styles.addButton} onClick={handleAdd}>
              <Plus size={18} />
              Dodaj pacjenta
            </button>
          )}
        </div>
      </div>

      <div className={styles.tableWrapper}>
        {loading ? (
          <div className={styles.emptyState}>Ładowanie...</div>
        ) : sortedPatients.length > 0 ? (
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.sortableHeader} onClick={() => requestSort('signature')}>
                  Sygnatura {getSortIcon('signature')}
                </th>
                <th className={styles.sortableHeader} onClick={() => requestSort('surname')}>
                  Nazwisko {getSortIcon('surname')}
                </th>
                <th className={styles.sortableHeader} onClick={() => requestSort('name')}>
                  Imię {getSortIcon('name')}
                </th>
                <th className={styles.sortableHeader} onClick={() => requestSort('pesel')}>
                  PESEL {getSortIcon('pesel')}
                </th>
                <th className={styles.sortableHeader} onClick={() => requestSort('referral_expiry_date')}>
                  Data skierowania {getSortIcon('referral_expiry_date')}
                </th>
                <th className={styles.sortableHeader} onClick={() => requestSort('current_status')}>
                  Status {getSortIcon('current_status')}
                </th>
                {user.role === 'admin' && <th>Akcje</th>}
              </tr>
            </thead>
            <tbody>
              {sortedPatients.map(patient => (
                <tr 
                  key={patient.id} 
                  className={`${styles.clickableRow} ${!patient.is_assigned && user.role === 'therapist' ? styles.notAssigned : ''}`}
                  onClick={() => navigate(`/patients/${patient.id}`)}
                >
                  <td style={{ fontWeight: '600' }}>{patient.signature}</td>
                  <td>{patient.surname}</td>
                  <td>{patient.name}</td>
                  <td>{patient.pesel}</td>
                  <td>{formatDate(patient.referral_expiry_date)}</td>
                  <td>
                    <span className={`${styles.statusTag} ${getStatusClass(patient.current_status)}`}>
                      {patient.current_status}
                    </span>
                  </td>
                  {user.role === 'admin' && (
                    <td>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button 
                          className={styles.editButton} 
                          onClick={(e) => handleEdit(e, patient)}
                          title="Edytuj dane pacjenta"
                          style={{ background: 'none', border: 'none', color: '#3498db', cursor: 'pointer', padding: '4px' }}
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          className={styles.deleteButton} 
                          onClick={(e) => handleDelete(e, patient)}
                          title="Usuń pacjenta"
                          style={{ background: 'none', border: 'none', color: '#e74c3c', cursor: 'pointer', padding: '4px' }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className={styles.emptyState}>
            Nie znaleziono żadnych pacjentów.
          </div>
        )}
      </div>

      {isModalOpen && (
        <AddPatientModal 
          initialData={editingPatient}
          onClose={() => {
            setIsModalOpen(false);
            setEditingPatient(null);
          }} 
          onSuccess={() => {
            setIsModalOpen(false);
            setEditingPatient(null);
            fetchPatients();
          }}
        />
      )}
    </div>
  );
};

export default PatientList;
