import { useState, useEffect, useCallback } from 'react';
import styles from './AuditLog.module.css';
import { useAuth } from '../../context/AuthContext';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { apiClient } from '../../api/client';

// Komponent logów audytowych
const AuditLog = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const { user } = useAuth();

  // Pobieranie logów z API z uwzględnieniem strony i wyszukiwania
  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await apiClient.get(`/logs?page=${page}&limit=20&search=${encodeURIComponent(search)}`);
      setLogs(data.logs || []);
      setTotalPages(data.totalPages || 1);
      setTotal(data.total || 0);
    } catch (error) {
      console.error('Błąd pobierania logów:', error);
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchLogs();
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchLogs]);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('pl-PL');
  };

  const getActionClass = (action) => {
    if (action.startsWith('ADD')) return styles.add;
    if (action.startsWith('UPDATE') || action.startsWith('CHANGE') || action.startsWith('ASSIGN')) return styles.update;
    if (action.startsWith('DELETE') || action.startsWith('ARCHIVE') || action.startsWith('REMOVE')) return styles.delete;
    return '';
  };

  const handleSearchChange = (e) => {
    setSearch(e.target.value);
    setPage(1);
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Dziennik Zdarzeń</h1>
        <div className={styles.controls}>
          <div className={styles.searchWrapper}>
            <Search size={18} className={styles.searchIcon} />
            <input 
              type="text" 
              placeholder="Szukaj akcji, opisu, nazwiska..." 
              className={styles.searchInput}
              value={search}
              onChange={handleSearchChange}
            />
          </div>
        </div>
      </div>

      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Data</th>
              <th>Użytkownik</th>
              <th>Akcja</th>
              <th>Opis</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="4" style={{ textAlign: 'center', padding: '48px' }}>Ładowanie danych...</td></tr>
            ) : logs.length > 0 ? (
              logs.map(log => (
                <tr key={log.id} className={getActionClass(log.action)}>
                  <td className={styles.timestamp}>{formatDate(log.timestamp)}</td>
                  <td>{log.name ? `${log.name} ${log.surname}` : 'System'}</td>
                  <td className={styles.actionCell}>{log.action_pl || log.action}</td>
                  <td>{log.description}</td>
                </tr>
              ))
            ) : (
              <tr><td colSpan="4" style={{ textAlign: 'center', padding: '48px' }}>Brak wyników dopasowanych do wyszukiwania.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className={styles.pagination}>
        <div className={styles.pageInfo}>
          Pokazano {logs.length} z {total} zdarzeń
        </div>
        <div className={styles.paginationControls}>
          <button 
            className={styles.pageBtn}
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            <ChevronLeft size={18} /> Poprzednia
          </button>
          <span className={styles.pageNumber}>Strona {page} z {totalPages}</span>
          <button 
            className={styles.pageBtn}
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages || totalPages === 0}
          >
            Następna <ChevronRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuditLog;
