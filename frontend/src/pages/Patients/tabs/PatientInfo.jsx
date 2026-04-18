import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Edit2 } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import AddPatientModal from '../AddPatientModal';
import styles from './PatientInfo.module.css';
import { apiClient } from '../../../api/client';

// Dane pacjenta
const PatientInfo = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const [patient, setPatient] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Pobranie pacjenta
  const fetchPatient = () => {
    apiClient.get(`/patients/${id}`)
      .then(res => setPatient(res.data))
      .catch(error => console.error('Błąd podczas pobierania danych pacjenta:', error));
  };

  useEffect(() => {
    fetchPatient();
  }, [id]);

  if (!patient) return <div>Ładowanie danych...</div>;

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('pl-PL');
  };

  return (
    <div className={styles.container}>
      <section className={styles.card}>
        <div className={styles.sectionHeader}>
          <h3 className={styles.title}>Dane podstawowe</h3>
          {user.role === 'admin' && (
            <button 
              className={styles.editIconButton} 
              onClick={() => setIsEditModalOpen(true)}
              title="Edytuj dane pacjenta"
            >
              <Edit2 size={18} />
              <span>Edytuj dane</span>
            </button>
          )}
        </div>
        <div className={styles.dataRow}>
          <strong className={styles.label}>Imię:</strong>
          <span className={styles.value}>{patient.name}</span>
        </div>
        <div className={styles.dataRow}>
          <strong className={styles.label}>Nazwisko:</strong>
          <span className={styles.value}>{patient.surname}</span>
        </div>
        <div className={styles.dataRow}>
          <strong className={styles.label}>Data urodzenia:</strong>
          <span className={styles.value}>{formatDate(patient.birth_date)}</span>
        </div>
        <div className={styles.dataRow}>
          <strong className={styles.label}>PESEL:</strong>
          <span className={styles.value}>{patient.pesel}</span>
        </div>
        <div className={styles.dataRow}>
          <strong className={styles.label}>Sygnatura:</strong>
          <span className={styles.value}>{patient.signature}</span>
        </div>
      </section>

      <section className={styles.card}>
        <div className={styles.sectionHeader}>
          <h3 className={styles.title}>Kontakt</h3>
        </div>
        <div className={styles.dataRow}>
          <strong className={styles.label}>Adres:</strong>
          <span className={styles.value}>{patient.address}</span>
        </div>
        <div className={styles.dataRow}>
          <strong className={styles.label}>Telefon 1:</strong>
          <span className={styles.value}>{patient.parent_phone_1}</span>
        </div>
        <div className={styles.dataRow}>
          <strong className={styles.label}>Telefon 2:</strong>
          <span className={styles.value}>{patient.parent_phone_2 || '-'}</span>
        </div>
        <div className={styles.dataRow}>
          <strong className={styles.label}>Email 1:</strong>
          <span className={styles.value}>{patient.parent_email_1}</span>
        </div>
        <div className={styles.dataRow}>
          <strong className={styles.label}>Email 2:</strong>
          <span className={styles.value}>{patient.parent_email_2 || '-'}</span>
        </div>
      </section>

      {isEditModalOpen && (
        <AddPatientModal
          initialData={patient}
          onClose={() => setIsEditModalOpen(false)}
          onSuccess={() => {
            setIsEditModalOpen(false);
            fetchPatient();
          }}
        />
      )}
    </div>
  );
};

export default PatientInfo;
