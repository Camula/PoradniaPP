import { useRef, useCallback, useState, useEffect } from 'react';
import { format } from 'date-fns';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import plLocale from '@fullcalendar/core/locales/pl';
import { useAuth } from '../../context/AuthContext';
import AppointmentModal from './AppointmentModal';
import styles from './CalendarPage.module.css';
import { apiClient } from '../../api/client';

// Kalendarz
const CalendarPage = () => {
  const { user } = useAuth();
  const calendarRef = useRef(null);

  // Filtry
  const [filterTherapist, setFilterTherapist] = useState('');
  const [filterRoom, setFilterRoom] = useState('');
  const [filterPatient, setFilterPatient] = useState('');
  const [patientSearch, setPatientSearch] = useState('');

  // Opcje filtrów
  const [patients, setPatients] = useState([]);
  const [therapists, setTherapists] = useState([]);
  const [rooms, setRooms] = useState([]);

  // Modal wizyty
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedAppointment, setSelectedAppointment] = useState(null);

  useEffect(() => {
    if (!user) return;
    const fetchFilterOptions = async () => {
      try {
        const [patientsRes, staffRes, roomsRes] = await Promise.all([
          apiClient.get('/patients?all=true'),
          apiClient.get('/staff?role=therapist'),
          apiClient.get('/rooms?active=true')
        ]);
        
        setPatients(patientsRes.data);
        setTherapists(staffRes.data);
        setRooms(roomsRes.data);
      } catch (error) {
        console.error('Błąd podczas ładowania opcji filtrów:', error);
      }
    };
    fetchFilterOptions();
  }, [user]);

  // Pobieranie wizyt
  const fetchEvents = useCallback(async (info, successCallback, failureCallback) => {
    if (!user) return failureCallback(new Error('Brak uprawnień'));

    try {
      const queryParams = new URLSearchParams({
        start: info.startStr,
        end: info.endStr
      });

      const effectiveTherapistId = user.role === 'therapist' ? user.id : filterTherapist;
      if (effectiveTherapistId) queryParams.append('therapist_id', effectiveTherapistId);
      if (filterRoom) queryParams.append('room_id', filterRoom);
      if (filterPatient) queryParams.append('patient_id', filterPatient);

      const response = await apiClient.get(`/appointments?${queryParams.toString()}`);
      const data = response.data;

      const events = data.map(app => ({
        id: app.id,
        title: `${app.patient_name} ${app.patient_surname} - ${app.type}`,
        start: app.start_time,
        end: app.end_time,
        backgroundColor: app.calendar_color || '#3498db',
        borderColor: app.calendar_color || '#3498db',
        extendedProps: { ...app }
      }));

      successCallback(events);
    } catch (error) {
      console.error('Błąd podczas pobierania wizyt do kalendarza:', error);
      failureCallback(error);
    }
  }, [user, filterTherapist, filterRoom, filterPatient]);

  const handleDateClick = (arg) => {
    setSelectedDate(arg.dateStr);
    setSelectedAppointment(null);
    setIsModalOpen(true);
  };

  const handleEventClick = (arg) => {
    setSelectedAppointment(arg.event.extendedProps);
    setSelectedDate(null);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
  };

  const handleModalSave = () => {
    if (calendarRef.current) {
      calendarRef.current.getApi().refetchEvents();
    }
  };

  return (
    <div className={styles.calendarContainer}>
      {user.role === 'admin' && (
        <div className={styles.filterBar}>
          <div className={styles.filterGroup}>
            <label>Terapeuta:</label>
            <select value={filterTherapist} onChange={(e) => setFilterTherapist(e.target.value)}>
              <option value="">Wszyscy</option>
              {therapists.map(t => (
                <option key={t.id} value={t.id}>{t.name} {t.surname}</option>
              ))}
            </select>
          </div>
          <div className={styles.filterGroup}>
            <label>Sala:</label>
            <select value={filterRoom} onChange={(e) => setFilterRoom(e.target.value)}>
              <option value="">Wszystkie</option>
              {rooms.map(r => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </div>
          <div className={styles.filterGroup}>
            <label>Pacjent:</label>
            <input 
              type="text" 
              placeholder="Szukaj pacjenta..." 
              value={patientSearch} 
              list="patient-list"
              onChange={(e) => {
                const val = e.target.value;
                setPatientSearch(val);
                const found = patients.find(p => `${p.surname} ${p.name}` === val);
                if (found) {
                  setFilterPatient(found.id);
                } else if (val === '') {
                  setFilterPatient('');
                }
              }}
              className={styles.searchInput}
            />
            <datalist id="patient-list">
              {patients.map(p => (
                <option key={p.id} value={`${p.surname} ${p.name}`} />
              ))}
            </datalist>
          </div>
        </div>
      )}

      <div className={styles.calendarWrapper}>
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="timeGridWeek"
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay'
          }}
          locales={[plLocale]}
          locale="pl"
          events={fetchEvents}
          dateClick={handleDateClick}
          eventClick={handleEventClick}
          slotMinTime="08:00:00"
          slotMaxTime="20:00:00"
          slotDuration="00:30:00"
          slotLabelInterval="01:00:00"
          expandRows={false}
          allDaySlot={false}
          showNonCurrentDates={false}
          dayMaxEvents={3}
          height="auto"
        />
      </div>

      <AppointmentModal 
        isOpen={isModalOpen}
        onClose={handleModalClose}
        selectedDate={selectedDate}
        appointment={selectedAppointment}
        onSave={handleModalSave}
      />
    </div>
  );
};

export default CalendarPage;CalendarPage;