import { useState, useEffect } from 'react';
import { Trash } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useConfirm } from '../../context/ConfirmContext';
import styles from './RoomList.module.css';
import { useAuth } from '../../context/AuthContext';
import { apiClient } from '../../api/client';

// Zarządzanie salami
const RoomList = () => {
  const { user } = useAuth();
  const confirm = useConfirm();
  const [rooms, setRooms] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState(null);
  const [roomName, setRoomName] = useState('');

  // Pobieranie sal
  const fetchRooms = async () => {
    try {
      const res = await apiClient.get('/rooms');
      setRooms(res.data);
    } catch (error) {
      console.error('Błąd pobierania sal:', error);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, []);

  // Otwarcie modala
  const handleOpenModal = (room = null) => {
    if (room) {
      setEditingRoom(room);
      setRoomName(room.name);
    } else {
      setEditingRoom(null);
      setRoomName('');
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingRoom(null);
    setRoomName('');
  };

  // Zapis sali
  const handleSubmit = async (e) => {
    e.preventDefault();
    const data = editingRoom ? { name: roomName, status: editingRoom.status } : { name: roomName, status: 'active' };

    try {
      if (editingRoom) {
        await apiClient.put(`/rooms/${editingRoom.id}`, data);
        toast.success('Pomyślnie zaktualizowano nazwę sali');
      } else {
        await apiClient.post('/rooms', data);
        toast.success('Pomyślnie dodano salę');
      }
      fetchRooms();
      handleCloseModal();
    } catch (error) {
      console.error('Błąd zapisu sali:', error);
      toast.error('Wystąpił błąd podczas zapisywania');
    }
  };

  // Status sali
  const handleToggleStatus = async (room) => {
    const isDeactivating = room.status === 'active';
    const newStatus = isDeactivating ? 'inactive' : 'active';

    if (isDeactivating) {
      const confirmed = await confirm({
        title: 'Dezaktywacja sali',
        message: `Czy na pewno chcesz dezaktywować salę ${room.name}?`,
        confirmText: 'Dezaktywuj',
        type: 'danger'
      });
      if (!confirmed) return;
    }

    try {
      await apiClient.put(`/rooms/${room.id}`, { name: room.name, status: newStatus });
      toast.success(isDeactivating ? 'Sala została dezaktywowana' : 'Sala została aktywowana');
      fetchRooms();
    } catch (error) {
      console.error('Błąd zmiany statusu sali:', error);
      toast.error('Wystąpił błąd podczas zmiany statusu');
    }
  };

  // Usuwanie sali
  const handleDeleteRoom = async (room) => {
    const confirmed = await confirm({
      title: 'Usuwanie sali',
      message: `Czy na pewno chcesz trwale usunąć salę ${room.name}? Operacja jest nieodwracalna.`,
      confirmText: 'Usuń',
      type: 'danger'
    });

    if (!confirmed) return;

    try {
      await apiClient.delete(`/rooms/${room.id}`);
      toast.success('Sala została usunięta');
      fetchRooms();
    } catch (error) {
      console.error('Błąd usuwania sali:', error);
      toast.error('Wystąpił błąd podczas usuwania');
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Zarządzanie Salami</h1>
        <button className={styles.btn_add} onClick={() => handleOpenModal()}>Dodaj salę</button>
      </div>

      <table className={styles.table}>
        <thead>
          <tr>
            <th>Nazwa Sali</th>
            <th>Status</th>
            <th>Akcje</th>
          </tr>
        </thead>
        <tbody>
          {rooms.map(room => (
            <tr key={room.id}>
              <td>{room.name}</td>
              <td>
                <span className={room.status === 'active' ? styles.status_active : styles.status_inactive}>
                  {room.status === 'active' ? 'Aktywna' : 'Nieaktywna'}
                </span>
              </td>
              <td>
                <button className={styles.btn_edit} onClick={() => handleOpenModal(room)}>Zmień nazwę</button>
                <button className={styles.btn_toggle} onClick={() => handleToggleStatus(room)}>
                  {room.status === 'active' ? 'Dezaktywuj' : 'Aktywuj'}
                </button>
                <button className={styles.btn_delete} onClick={() => handleDeleteRoom(room)} title="Usuń salę">
                  <Trash size={18} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {isModalOpen && (
        <div className={styles.modal}>
          <div className={styles.modal_content}>
            <h2>{editingRoom ? 'Edytuj salę' : 'Dodaj salę'}</h2>
            <form onSubmit={handleSubmit}>
              <div className={styles.form_group}>
                <label>Nazwa Sali</label>
                <input type="text" value={roomName} onChange={(e) => setRoomName(e.target.value)} required />
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

export default RoomList;
