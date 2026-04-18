import { useState } from 'react';
import { Search, Phone } from 'lucide-react';
import styles from './QuickContact.module.css';

// Widget szybkiego kontaktu z rodzicami pacjenta.
const QuickContact = ({ patients = [] }) => {
  const [searchTerm, setSearchTerm] = useState('');

  // Filtrowanie pacjentów po nazwisku, sygnaturze lub imieniu
  const filteredPatients = patients.filter(p => 
    p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.surname?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.signature?.toLowerCase().includes(searchTerm.toLowerCase())
  ).slice(0, 5);

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Szybki kontakt</h2>
      <div className={styles.searchBox}>
        <Search size={18} className={styles.searchIcon} />
        <input 
          type="text" 
          placeholder="Szukaj pacjenta..." 
          className={styles.searchInput}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
      <div className={styles.list}>
        {filteredPatients.length > 0 ? (
          filteredPatients.map(p => (
            <div key={p.id} className={styles.item}>
              <div className={styles.info}>
                <span className={styles.name}>{p.name} {p.surname}</span>
                <span className={styles.signature}>{p.signature}</span>
              </div>
              <div className={styles.contact}>
                <Phone size={14} />
                <span>
                  {p.parent_phone_1}
                  {p.parent_phone_1 && p.parent_phone_2 && ' / '}
                  {p.parent_phone_2}
                  {!p.parent_phone_1 && !p.parent_phone_2 && 'Brak nr'}
                </span>
              </div>
            </div>
          ))
        ) : (
          <p className={styles.empty}>Nie znaleziono pacjentów.</p>
        )}
      </div>
    </div>
  );
};

export default QuickContact;
