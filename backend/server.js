// Serwer Express
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
require('dotenv').config();
const { pool, initDb, generateSignature } = require('./database');
const auditLog = require('./middleware/audit');
const { authenticateToken, checkPatientAccess } = require('./middleware/auth');

// Mapowanie akcji
const ACTION_MAP = {
    'ADD_PATIENT': 'Dodanie pacjenta',
    'UPDATE_PATIENT': 'Edycja danych pacjenta',
    'DELETE_PATIENT': 'Usunięcie pacjenta',
    'ADD_REFERRAL': 'Dodanie skierowania',
    'UPDATE_REFERRAL': 'Edycja skierowania',
    'DELETE_REFERRAL': 'Usunięcie skierowania',
    'ADD_NOTE': 'Dodanie notatki',
    'UPDATE_NOTE': 'Edycja notatki',
    'DELETE_NOTE': 'Usunięcie notatki',
    'ADD_ROOM': 'Dodanie sali',
    'UPDATE_ROOM': 'Edycja sali',
    'DELETE_ROOM': 'Usunięcie sali',
    'ASSIGN_THERAPIST': 'Przypisanie terapeuty',
    'REMOVE_THERAPIST': 'Usunięcie terapeuty',
    'ADD_STAFF': 'Dodanie pracownika',
    'UPDATE_STAFF': 'Edycja pracownika',
    'ARCHIVE_STAFF': 'Archiwizacja pracownika',
    'DELETE_STAFF': 'Usunięcie pracownika',
    'ADD_APPOINTMENT': 'Dodanie wizyty',
    'UPDATE_APPOINTMENT': 'Edycja wizyty',
    'UPDATE_APPOINTMENT_STATUS': 'Zmiana statusu wizyty',
    'DELETE_APPOINTMENT': 'Usunięcie wizyty'
};

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Middleware autoryzacji
app.use((req, res, next) => {
    if (req.path === '/api/login') {
        return next();
    }
    authenticateToken(req, res, next);
});

initDb();

// Logowanie
app.post('/api/login', auditLog('LOGIN', 'Logowanie użytkownika'), async (req, res) => {
    const { email, password } = req.body;
    try {
        const result = await pool.query(
            'SELECT id, name, surname, email, password, role FROM users WHERE email = $1',
            [email]
        );
        const user = result.rows[0];
        
        if (user && await bcrypt.compare(password, user.password)) {
            const token = jwt.sign(
                { id: user.id, role: user.role },
                process.env.JWT_SECRET,
                { expiresIn: '24h' }
            );
            const { password: _, ...userWithoutPassword } = user;
            res.json({ success: true, user: userWithoutPassword, token });
        } else {
            res.status(401).json({ success: false, message: 'Błędny email lub hasło' });
        }
    } catch (error) {
        console.error('Błąd logowania:', error);
        res.status(500).json({ success: false, message: 'Błąd serwera' });
    }
});

// Pobieranie pacjentów
app.get('/api/patients', async (req, res) => {
    const userId = req.user?.id;
    const userRole = req.user?.role;
    const showAll = req.query.all === 'true' && userRole === 'admin';

    let query = `
        SELECT 
            p.*, 
            MAX(r.expiry_date) as referral_expiry_date,
            CASE 
                WHEN MAX(r.expiry_date) >= CURRENT_DATE THEN 'aktywny'
                WHEN MAX(r.expiry_date) < CURRENT_DATE THEN 'zarchiwizowany'
                ELSE 'nieaktywny'
            END as current_status
    `;

    let params = [];
    let pIdx = 1;

    if (userRole === 'therapist') {
        query += `, (SELECT 1 FROM patient_therapists pt WHERE pt.patient_id = p.id AND pt.therapist_id = $${pIdx}) as is_assigned `;
        params.push(userId);
        pIdx++;
    } else {
        query += `, 1 as is_assigned `;
    }

    query += `
        FROM patients p
        LEFT JOIN referrals r ON p.id = r.patient_id
    `;

    if (userRole === 'therapist' && !showAll) {
        query += ` WHERE p.id IN (SELECT patient_id FROM patient_therapists WHERE therapist_id = $${pIdx}) `;
        params.push(userId);
        pIdx++;
    }

    query += ` GROUP BY p.id ORDER BY p.surname ASC, p.name ASC`;

    try {
        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (error) {
        console.error('Błąd przy pobieraniu listy pacjentów:', error);
        res.status(500).json({ error: 'Błąd serwera' });
    }
});

// Pobieranie danych pacjenta.
app.get('/api/patients/:id', checkPatientAccess, async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query(`
            SELECT p.*, 
                   MAX(r.expiry_date) as referral_expiry_date,
                   CASE 
                       WHEN MAX(r.expiry_date) >= CURRENT_DATE THEN 'aktywny'
                       WHEN MAX(r.expiry_date) < CURRENT_DATE THEN 'zarchiwizowany'
                       ELSE 'nieaktywny'
                   END as current_status
            FROM patients p
            LEFT JOIN referrals r ON p.id = r.patient_id
            WHERE p.id = $1
            GROUP BY p.id
        `, [id]);
        const patient = result.rows[0];
        if (patient) {
            res.json(patient);
        } else {
            res.status(404).json({ error: 'Nie znaleziono pacjenta' });
        }
    } catch (error) {
        console.error('Błąd przy pobieraniu danych pacjenta:', error);
        res.status(500).json({ error: 'Błąd serwera' });
    }
});

// Dodawanie pacjenta.
app.post('/api/patients', auditLog('ADD_PATIENT', 'Dodanie nowego pacjenta'), async (req, res) => {
    const userRole = req.user?.role;
    if (userRole !== 'admin') return res.status(403).json({ error: 'Brak uprawnień' });

    const { name, surname, birth_date, pesel, address, parent_phone_1, parent_phone_2, parent_email_1, parent_email_2, customSignature } = req.body;
    
    let signature, year, number_in_year;
    if (customSignature) {
        signature = customSignature;
        const parts = customSignature.split('/');
        year = parseInt(parts[1]) || new Date().getFullYear();
        number_in_year = parseInt(parts[2]) || 0;
    } else {
        const sigData = await generateSignature();
        signature = sigData.signature;
        year = sigData.year;
        number_in_year = sigData.number_in_year;
    }
    
    try {
        const result = await pool.query(`
            INSERT INTO patients (signature, year, number_in_year, name, surname, birth_date, pesel, address, parent_phone_1, parent_phone_2, parent_email_1, parent_email_2)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            RETURNING id
        `, [signature, year, number_in_year, name, surname, birth_date, pesel, address, parent_phone_1, parent_phone_2, parent_email_1, parent_email_2]);
        res.json({ success: true, id: result.rows[0].id, signature });
    } catch (error) {
        console.error('Błąd przy dodawaniu pacjenta:', error);
        res.status(400).json({ success: false, message: 'Błąd podczas dodawania pacjenta (np. PESEL lub sygnatura już istnieje)' });
    }
});

// Aktualizacja danych pacjenta.
app.put('/api/patients/:id', auditLog('UPDATE_PATIENT', 'Edycja danych pacjenta'), async (req, res) => {
    const userRole = req.user?.role;
    if (userRole !== 'admin') return res.status(403).json({ error: 'Brak uprawnień' });

    const { id } = req.params;
    const { name, surname, birth_date, pesel, address, parent_phone_1, parent_phone_2, parent_email_1, parent_email_2, status } = req.body;
    
    try {
        await pool.query(`
            UPDATE patients 
            SET name = $1, surname = $2, birth_date = $3, pesel = $4, address = $5, parent_phone_1 = $6, parent_phone_2 = $7, parent_email_1 = $8, parent_email_2 = $9, status = $10
            WHERE id = $11
        `, [name, surname, birth_date, pesel, address, parent_phone_1, parent_phone_2, parent_email_1, parent_email_2, status, id]);
        res.json({ success: true });
    } catch (error) {
        console.error('Błąd przy edycji pacjenta:', error);
        res.status(400).json({ success: false, message: 'Błąd podczas edycji pacjenta' });
    }
});

// Usunięcie pacjenta.
app.delete('/api/patients/:id', auditLog('DELETE_PATIENT', 'Usunięcie pacjenta'), async (req, res) => {
    const userRole = req.user?.role;
    if (userRole !== 'admin') return res.status(403).json({ error: 'Brak uprawnień' });

    const { id } = req.params;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        await client.query('DELETE FROM patient_therapists WHERE patient_id = $1', [id]);
        await client.query('DELETE FROM patients WHERE id = $1', [id]);
        await client.query('COMMIT');
        res.json({ success: true });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Błąd przy usuwaniu pacjenta:', error);
        res.status(400).json({ success: false, message: 'Nie można usunąć pacjenta (prawdopodobnie posiada powiązane wizyty lub skierowania)' });
    } finally {
        client.release();
    }
});

// Pobieranie skierowań pacjenta.
app.get('/api/patients/:id/referrals', checkPatientAccess, async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query('SELECT * FROM referrals WHERE patient_id = $1 ORDER BY expiry_date DESC', [id]);
        res.json(result.rows);
    } catch (error) {
        console.error('Błąd przy pobieraniu skierowań:', error);
        res.status(500).json({ error: 'Błąd serwera' });
    }
});

// Dodawanie skierowania.
app.post('/api/patients/:id/referrals', auditLog('ADD_REFERRAL', 'Dodanie skierowania'), async (req, res) => {
    const userRole = req.user?.role;
    if (userRole !== 'admin') return res.status(403).json({ error: 'Brak uprawnień' });

    const { id } = req.params;
    const { referral_number, issuing_facility, expiry_date } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO referrals (patient_id, referral_number, issuing_facility, expiry_date) VALUES ($1, $2, $3, $4) RETURNING id',
            [id, referral_number, issuing_facility, expiry_date]
        );
        res.json({ success: true, id: result.rows[0].id });
    } catch (error) {
        console.error('Błąd przy dodawaniu skierowania:', error);
        res.status(400).json({ success: false, message: 'Błąd podczas dodawania skierowania' });
    }
});

// Edycja skierowania.
app.put('/api/patients/:id/referrals/:refId', auditLog('UPDATE_REFERRAL', 'Edycja skierowania'), async (req, res) => {
    const userRole = req.user?.role;
    if (userRole !== 'admin') return res.status(403).json({ error: 'Brak uprawnień' });

    const { id, refId } = req.params;
    const { referral_number, issuing_facility, expiry_date } = req.body;
    try {
        await pool.query(
            'UPDATE referrals SET referral_number = $1, issuing_facility = $2, expiry_date = $3 WHERE id = $4 AND patient_id = $5',
            [referral_number, issuing_facility, expiry_date, refId, id]
        );
        res.json({ success: true });
    } catch (error) {
        console.error('Błąd przy edycji skierowania:', error);
        res.status(400).json({ success: false, message: 'Błąd podczas edycji skierowania' });
    }
});

// Usuwanie skierowania.
app.delete('/api/patients/:id/referrals/:refId', auditLog('DELETE_REFERRAL', 'Usunięcie skierowania'), async (req, res) => {
    const userRole = req.user?.role;
    if (userRole !== 'admin') return res.status(403).json({ error: 'Brak uprawnień' });

    const { id, refId } = req.params;
    try {
        await pool.query('DELETE FROM referrals WHERE id = $1 AND patient_id = $2', [refId, id]);
        res.json({ success: true });
    } catch (error) {
        console.error('Błąd przy usuwaniu skierowania:', error);
        res.status(400).json({ success: false, message: 'Błąd podczas usuwania skierowania' });
    }
});

// Pobieranie notatek pacjenta.
app.get('/api/patients/:id/notes', checkPatientAccess, async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query(`
            SELECT tn.*, u.name, u.surname, a.start_time, a.type as appointment_type
            FROM therapy_notes tn
            LEFT JOIN users u ON tn.therapist_id = u.id
            LEFT JOIN appointments a ON tn.appointment_id = a.id
            WHERE tn.patient_id = $1 
            ORDER BY tn.created_at DESC
        `, [id]);
        res.json(result.rows);
    } catch (error) {
        console.error('Błąd przy pobieraniu notatek:', error);
        res.status(500).json({ error: 'Błąd serwera' });
    }
});

// Dodawanie notatki.
app.post('/api/patients/:id/notes', checkPatientAccess, auditLog('ADD_NOTE', 'Dodanie notatki terapeutycznej'), async (req, res) => {
    const userId = req.user?.id;
    const { id } = req.params;
    const { content, appointment_id } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO therapy_notes (patient_id, therapist_id, content, appointment_id) VALUES ($1, $2, $3, $4) RETURNING id',
            [id, userId, content, appointment_id || null]
        );
        res.json({ success: true, id: result.rows[0].id });
    } catch (error) {
        console.error('Błąd przy dodawaniu notatki:', error);
        res.status(400).json({ success: false, message: 'Błąd podczas dodawania notatki' });
    }
});

// Edycja notatki.
app.put('/api/patients/:id/notes/:noteId', checkPatientAccess, auditLog('UPDATE_NOTE', 'Edycja notatki terapeutycznej'), async (req, res) => {
    const userId = req.user?.id;
    const { noteId } = req.params;
    const { content } = req.body;
    try {
        const noteResult = await pool.query('SELECT therapist_id FROM therapy_notes WHERE id = $1', [noteId]);
        const note = noteResult.rows[0];
        if (!note || note.therapist_id != userId) {
            return res.status(403).json({ error: 'Brak uprawnień do edycji tej notatki' });
        }
        await pool.query('UPDATE therapy_notes SET content = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [content, noteId]);
        res.json({ success: true });
    } catch (error) {
        console.error('Błąd przy edycji notatki:', error);
        res.status(400).json({ success: false, message: 'Błąd podczas edycji notatki' });
    }
});

// Usuwanie notatki.
app.delete('/api/patients/:id/notes/:noteId', checkPatientAccess, auditLog('DELETE_NOTE', 'Usunięcie notatki terapeutycznej'), async (req, res) => {
    const userId = req.user?.id;
    const { noteId } = req.params;
    try {
        const noteResult = await pool.query('SELECT therapist_id FROM therapy_notes WHERE id = $1', [noteId]);
        const note = noteResult.rows[0];
        if (!note || note.therapist_id != userId) {
            return res.status(403).json({ error: 'Brak uprawnień do usunięcia tej notatki' });
        }
        await pool.query('DELETE FROM therapy_notes WHERE id = $1', [noteId]);
        res.json({ success: true });
    } catch (error) {
        console.error('Błąd przy usuwaniu notatki:', error);
        res.status(400).json({ success: false, message: 'Błąd podczas usuwania notatki' });
    }
});

// Pobieranie zespołu pacjenta.
app.get('/api/patients/:id/team', checkPatientAccess, async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query(`
            SELECT u.id, u.name, u.surname, u.email, u.specialization 
            FROM patient_therapists pt
            JOIN users u ON pt.therapist_id = u.id
            WHERE pt.patient_id = $1
            ORDER BY u.surname ASC, u.name ASC
        `, [id]);
        res.json(result.rows);
    } catch (error) {
        console.error('Błąd przy pobieraniu zespołu pacjenta:', error);
        res.status(500).json({ error: 'Błąd serwera' });
    }
});

// Pobieranie listy sal.
app.get('/api/rooms', async (req, res) => {
    const { active } = req.query;
    try {
        let result;
        if (active === 'true') {
            result = await pool.query("SELECT * FROM rooms WHERE status = 'active' ORDER BY name ASC");
        } else {
            result = await pool.query('SELECT * FROM rooms ORDER BY name ASC');
        }
        res.json(result.rows);
    } catch (error) {
        console.error('Błąd przy pobieraniu listy sal:', error);
        res.status(500).json({ error: 'Błąd serwera' });
    }
});

// Dodawanie sali.
app.post('/api/rooms', auditLog('ADD_ROOM', 'Dodanie nowej sali'), async (req, res) => {
    const userRole = req.user?.role;
    if (userRole !== 'admin') return res.status(403).json({ error: 'Brak uprawnień' });

    const { name, status } = req.body;
    try {
        const result = await pool.query('INSERT INTO rooms (name, status) VALUES ($1, $2) RETURNING id', [name, status || 'active']);
        res.json({ success: true, id: result.rows[0].id });
    } catch (error) {
        console.error('Błąd przy dodawaniu sali:', error);
        res.status(400).json({ success: false, message: 'Błąd podczas dodawania sali' });
    }
});

// Edycja sali.
app.put('/api/rooms/:id', auditLog('UPDATE_ROOM', 'Edycja sali'), async (req, res) => {
    const userRole = req.user?.role;
    if (userRole !== 'admin') return res.status(403).json({ error: 'Brak uprawnień' });

    const { name, status } = req.body;
    const { id } = req.params;
    try {
        await pool.query('UPDATE rooms SET name = $1, status = $2 WHERE id = $3', [name, status, id]);
        res.json({ success: true });
    } catch (error) {
        console.error('Błąd przy edycji sali:', error);
        res.status(400).json({ success: false, message: 'Błąd podczas edycji sali' });
    }
});

// Usuwanie sali.
app.delete('/api/rooms/:id', auditLog('DELETE_ROOM', 'Usunięcie sali'), async (req, res) => {
    const userRole = req.user?.role;
    if (userRole !== 'admin') return res.status(403).json({ error: 'Brak uprawnień' });

    const { id } = req.params;
    try {
        await pool.query('DELETE FROM rooms WHERE id = $1', [id]);
        res.json({ success: true });
    } catch (error) {
        console.error('Błąd przy usuwaniu sali:', error);
        res.status(400).json({ success: false, message: 'Błąd podczas usuwania sali' });
    }
});

// Pobieranie personelu.
app.get('/api/staff', async (req, res) => {
    const { role, status } = req.query;
    let query = 'SELECT id, name, surname, email, role, specialization, status FROM users';
    let params = [];
    let pIdx = 1;
    if (role || status) {
        query += ' WHERE ';
        let filters = [];
        if (role) {
            filters.push(`role = $${pIdx}`);
            params.push(role);
            pIdx++;
        }
        if (status) {
            filters.push(`status = $${pIdx}`);
            params.push(status);
            pIdx++;
        }
        query += filters.join(' AND ');
    }
    query += ' ORDER BY surname ASC, name ASC';
    try {
        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (error) {
        console.error('Błąd przy pobieraniu personelu:', error);
        res.status(500).json({ error: 'Błąd serwera' });
    }
});

// Przypisanie terapeuty.
app.post('/api/patients/:id/team', auditLog('ASSIGN_THERAPIST', 'Przypisanie terapeuty do pacjenta'), async (req, res) => {
    const userRole = req.user?.role;
    if (userRole !== 'admin') return res.status(403).json({ error: 'Brak uprawnień' });

    const { id } = req.params;
    const { therapist_id } = req.body;
    try {
        await pool.query('INSERT INTO patient_therapists (patient_id, therapist_id) VALUES ($1, $2)', [id, therapist_id]);
        res.json({ success: true });
    } catch (error) {
        console.error('Błąd przy przypisywaniu terapeuty:', error);
        res.status(400).json({ success: false, message: 'Błąd podczas przypisywania terapeuty' });
    }
});

// Usunięcie terapeuty.
app.delete('/api/patients/:id/team/:therapistId', auditLog('REMOVE_THERAPIST', 'Usunięcie terapeuty z zespołu'), async (req, res) => {
    const userRole = req.user?.role;
    if (userRole !== 'admin') return res.status(403).json({ error: 'Brak uprawnień' });

    const { id, therapistId } = req.params;
    try {
        await pool.query('DELETE FROM patient_therapists WHERE patient_id = $1 AND therapist_id = $2', [id, therapistId]);
        res.json({ success: true });
    } catch (error) {
        console.error('Błąd przy usuwaniu terapeuty z zespołu:', error);
        res.status(400).json({ success: false, message: 'Błąd podczas usuwania terapeuty' });
    }
});

// Dodawanie pracownika
app.post('/api/staff', auditLog('ADD_STAFF', 'Dodanie pracownika'), async (req, res) => {
    const userRole = req.user?.role;
    if (userRole !== 'admin') return res.status(403).json({ error: 'Brak uprawnień' });

    const { name, surname, email, password, role, specialization } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const result = await pool.query(`
            INSERT INTO users (name, surname, email, password, role, specialization)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id
        `, [name, surname, email, hashedPassword, role, specialization]);
        res.json({ success: true, id: result.rows[0].id });
    } catch (error) {
        console.error('Błąd dodawania pracownika:', error);
        res.status(400).json({ success: false, message: 'Błąd podczas dodawania pracownika' });
    }
});

// Edycja pracownika
app.put('/api/staff/:id', auditLog('UPDATE_STAFF', 'Edycja pracownika'), async (req, res) => {
    const userRole = req.user?.role;
    if (userRole !== 'admin') return res.status(403).json({ error: 'Brak uprawnień' });

    const { name, surname, email, role, specialization, status, password } = req.body;
    const { id } = req.params;
    try {
        if (password) {
            const hashedPassword = await bcrypt.hash(password, 10);
            await pool.query(`
                UPDATE users 
                SET name = $1, surname = $2, email = $3, role = $4, specialization = $5, status = $6, password = $7
                WHERE id = $8
            `, [name, surname, email, role, specialization, status, hashedPassword, id]);
        } else {
            await pool.query(`
                UPDATE users 
                SET name = $1, surname = $2, email = $3, role = $4, specialization = $5, status = $6
                WHERE id = $7
            `, [name, surname, email, role, specialization, status, id]);
        }
        res.json({ success: true });
    } catch (error) {
        console.error('Błąd edycji pracownika:', error);
        res.status(400).json({ success: false, message: 'Błąd podczas edycji pracownika' });
    }
});

// Archiwizacja konta pracownika.
app.patch('/api/staff/:id/archive', auditLog('ARCHIVE_STAFF', 'Archiwizacja pracownika'), async (req, res) => {
    const userRole = req.user?.role;
    if (userRole !== 'admin') return res.status(403).json({ error: 'Brak uprawnień' });

    const { id } = req.params;
    const { status } = req.body;
    try {
        await pool.query('UPDATE users SET status = $1 WHERE id = $2', [status, id]);
        res.json({ success: true });
    } catch (error) {
        console.error('Błąd przy archiwizacji pracownika:', error);
        res.status(400).json({ success: false, message: 'Błąd podczas archiwizacji' });
    }
});

// Całkowite usunięcie pracownika.
app.delete('/api/staff/:id', auditLog('DELETE_STAFF', 'Usunięcie pracownika'), async (req, res) => {
    const userRole = req.user?.role;
    if (userRole !== 'admin') return res.status(403).json({ error: 'Brak uprawnień' });

    const { id } = req.params;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        await client.query('DELETE FROM appointments WHERE therapist_id = $1', [id]);
        await client.query('DELETE FROM therapy_notes WHERE therapist_id = $1', [id]);
        await client.query('DELETE FROM patient_therapists WHERE therapist_id = $1', [id]);
        await client.query('UPDATE audit_log SET user_id = NULL WHERE user_id = $1', [id]);
        await client.query('DELETE FROM users WHERE id = $1', [id]);
        await client.query('COMMIT');
        res.json({ success: true });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Błąd przy usuwaniu pracownika:', error);
        res.status(400).json({ success: false, message: 'Błąd podczas usuwania pracownika' });
    } finally {
        client.release();
    }
});

// Pobieranie listy wizyt.
app.get('/api/appointments', async (req, res) => {
    const { start, end, therapist_id, room_id, patient_id } = req.query;
    const userId = req.user?.id;
    const userRole = req.user?.role;
    
    let query = `
        SELECT a.*, 
               p.name as patient_name, p.surname as patient_surname,
               u.calendar_color, u.name as therapist_name, u.surname as therapist_surname,
               r.name as room_name
        FROM appointments a
        JOIN patients p ON a.patient_id = p.id
        JOIN users u ON a.therapist_id = u.id
        LEFT JOIN rooms r ON a.room_id = r.id
        WHERE 1=1
    `;
    const params = [];
    let pIdx = 1;

    if (start && end) {
        query += ` AND a.start_time < $${pIdx} AND a.end_time > $${pIdx+1}`;
        params.push(end, start);
        pIdx += 2;
    } else if (start) {
        query += ` AND a.end_time > $${pIdx}`;
        params.push(start);
        pIdx++;
    } else if (end) {
        query += ` AND a.start_time < $${pIdx}`;
        params.push(end);
        pIdx++;
    }

    const effectiveTherapistId = userRole === 'therapist' ? userId : therapist_id;
    if (effectiveTherapistId) {
        query += ` AND a.therapist_id = $${pIdx}`;
        params.push(effectiveTherapistId);
        pIdx++;
    }

    if (room_id) {
        query += ` AND a.room_id = $${pIdx}`;
        params.push(room_id);
        pIdx++;
    }
    if (patient_id) {
        query += ` AND a.patient_id = $${pIdx}`;
        params.push(patient_id);
        pIdx++;
    }

    query += ` ORDER BY a.start_time ASC LIMIT 1000`;

    try {
        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (error) {
        console.error('Błąd przy pobieraniu wizyt:', error);
        res.status(500).json({ error: 'Błąd serwera' });
    }
});

// Rezerwacja wizyty
app.post('/api/appointments', checkPatientAccess, auditLog('ADD_APPOINTMENT', 'Dodanie wizyty'), async (req, res) => {
    const { patient_id, therapist_id, room_id, type, start_time, notes } = req.body;
    
    if (!start_time || typeof start_time !== 'string') {
        return res.status(400).json({ error: 'Nieprawidłowa data wizyty' });
    }

    try {
        const patientValidResult = await pool.query(`
            SELECT 1 FROM referrals
            WHERE patient_id = $1
            AND expiry_date >= $2::date
            LIMIT 1
        `, [patient_id, start_time.split('T')[0]]);
        
        if (patientValidResult.rows.length === 0) {
            return res.status(403).json({ error: 'Pacjent nieaktywny lub brak ważnego skierowania' });
        }

        const startDate = new Date(start_time);
        const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);
        const end_time = endDate.toISOString();

        const conflictResult = await pool.query(`
            SELECT id FROM appointments
            WHERE (therapist_id = $1 OR room_id = $2 OR patient_id = $3)
            AND status != 'Odwołana'
            AND start_time < $4
            AND end_time > $5
        `, [therapist_id, room_id, patient_id, end_time, start_time]);

        if (conflictResult.rows.length > 0) {
            return res.status(409).json({ error: 'Konflikt terminu: terapeuta, sala lub pacjent są zajęci w tym czasie' });
        }

        const result = await pool.query(`
            INSERT INTO appointments (patient_id, therapist_id, room_id, type, status, start_time, end_time, notes)
            VALUES ($1, $2, $3, $4, 'Zaplanowana', $5, $6, $7)
            RETURNING id
        `, [patient_id, therapist_id, room_id, type, start_time, end_time, notes]);
        
        res.json({ success: true, id: result.rows[0].id });
    } catch (error) {
        console.error('Błąd przy dodawaniu wizyty:', error);
        res.status(400).json({ success: false, message: 'Błąd podczas dodawania wizyty' });
    }
});

// Edycja danych wizyty.
app.put('/api/appointments/:id', auditLog('UPDATE_APPOINTMENT', 'Edycja wizyty'), async (req, res) => {
    const { id } = req.params;
    const { patient_id, therapist_id, room_id, type, status, start_time, notes } = req.body;
    const userId = req.user?.id;
    const userRole = req.user?.role;
    
    try {
        const appointmentResult = await pool.query('SELECT therapist_id FROM appointments WHERE id = $1', [id]);
        const appointment = appointmentResult.rows[0];
        
        if (!appointment) {
            return res.status(404).json({ error: 'Nie znaleziono wizyty' });
        }

        if (userRole === 'therapist' && appointment.therapist_id != userId) {
            return res.status(403).json({ error: 'Brak uprawnień do edycji tej wizyty' });
        }

        const startDate = new Date(start_time);
        const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);
        const end_time = endDate.toISOString();

        if (status !== 'Odwołana') {
            const conflictResult = await pool.query(`
                SELECT id FROM appointments
                WHERE (therapist_id = $1 OR room_id = $2 OR patient_id = $3)
                AND status != 'Odwołana'
                AND start_time < $4
                AND end_time > $5
                AND id != $6
            `, [therapist_id, room_id, patient_id, end_time, start_time, id]);

            if (conflictResult.rows.length > 0) {
                return res.status(409).json({ error: 'Konflikt terminu: terapeuta, sala lub pacjent są zajęci w tym czasie' });
            }
        }

        await pool.query(`
            UPDATE appointments 
            SET patient_id = $1, therapist_id = $2, room_id = $3, type = $4, status = $5, start_time = $6, end_time = $7, notes = $8
            WHERE id = $9
        `, [patient_id, therapist_id, room_id, type, status, start_time, end_time, notes, id]);
        
        res.json({ success: true });
    } catch (error) {
        console.error('Błąd przy edycji wizyty:', error);
        res.status(400).json({ success: false, message: 'Błąd podczas edycji wizyty' });
    }
});

// Zmiana statusu wizyty.
app.patch('/api/appointments/:id/status', auditLog('UPDATE_APPOINTMENT_STATUS', 'Zmiana statusu wizyty'), async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    const userId = req.user?.id;
    const userRole = req.user?.role;
    const validStatuses = ['Zaplanowana', 'Odbyta', 'Odwołana'];

    if (!validStatuses.includes(status)) {
        return res.status(400).json({ success: false, message: 'Nieprawidłowy status' });
    }

    try {
        const appointmentResult = await pool.query('SELECT therapist_id FROM appointments WHERE id = $1', [id]);
        const appointment = appointmentResult.rows[0];
        
        if (!appointment) {
            return res.status(404).json({ error: 'Nie znaleziono wizyty' });
        }

        if (userRole === 'therapist' && appointment.therapist_id != userId) {
            return res.status(403).json({ error: 'Brak uprawnień do zmiany statusu tej wizyty' });
        }

        await pool.query('UPDATE appointments SET status = $1 WHERE id = $2', [status, id]);
        res.json({ success: true });
    } catch (error) {
        console.error('Błąd przy aktualizacji statusu wizyty:', error);
        res.status(400).json({ success: false, message: 'Błąd podczas aktualizacji statusu' });
    }
});

// Usuwanie wizyty.
app.delete('/api/appointments/:id', auditLog('DELETE_APPOINTMENT', 'Usunięcie wizyty'), async (req, res) => {
    const { id } = req.params;
    const userId = req.user?.id;
    const userRole = req.user?.role;
    
    try {
        const appointmentResult = await pool.query('SELECT therapist_id FROM appointments WHERE id = $1', [id]);
        const appointment = appointmentResult.rows[0];
        
        if (!appointment) {
            return res.status(404).json({ error: 'Nie znaleziono wizyty' });
        }

        if (userRole === 'therapist' && appointment.therapist_id != userId) {
            return res.status(403).json({ error: 'Brak uprawnień do usunięcia tej wizyty' });
        }

        await pool.query('DELETE FROM appointments WHERE id = $1', [id]);
        res.json({ success: true });
    } catch (error) {
        console.error('Błąd przy usuwaniu wizyty:', error);
        res.status(400).json({ success: false, message: 'Błąd podczas usuwania wizyty' });
    }
});

// Pobieranie statystyk.
app.get('/api/dashboard/stats', async (req, res) => {
    const userId = req.user?.id;
    const userRole = req.user?.role;

    try {
        if (userRole === 'admin') {
            const activePatientsRes = await pool.query(`
                SELECT COUNT(DISTINCT patient_id)::int as count 
                FROM referrals 
                WHERE expiry_date >= CURRENT_DATE
            `);
            const activePatients = activePatientsRes.rows[0].count;

            const todayAppointmentsRes = await pool.query(`
                SELECT COUNT(*)::int as count 
                FROM appointments 
                WHERE start_time::date = CURRENT_DATE AND status != 'Odwołana'
            `);
            const todayAppointments = todayAppointmentsRes.rows[0].count;

            const completedMonthRes = await pool.query(`
                SELECT COUNT(*)::int as count 
                FROM appointments 
                WHERE status = 'Odbyta' 
                AND EXTRACT(MONTH FROM start_time) = EXTRACT(MONTH FROM CURRENT_DATE)
                AND EXTRACT(YEAR FROM start_time) = EXTRACT(YEAR FROM CURRENT_DATE)
            `);
            const completedMonth = completedMonthRes.rows[0].count;

            // Ostatnie 7 dni obłożenia
            const weeklyOccupancyRes = await pool.query(`
                WITH days AS (
                    SELECT generate_series(
                        CURRENT_DATE - INTERVAL '6 days',
                        CURRENT_DATE,
                        INTERVAL '1 day'
                    )::date AS date
                )
                SELECT 
                    to_char(days.date, 'DD.MM') as name,
                    COUNT(a.id)::int as value
                FROM days
                LEFT JOIN appointments a ON a.start_time::date = days.date AND a.status != 'Odwołana'
                GROUP BY days.date
                ORDER BY days.date
            `);
            const weeklyOccupancy = weeklyOccupancyRes.rows;

            res.json({
                counters: [
                    { label: 'Aktywni Pacjenci', value: activePatients, icon: 'Users' },
                    { label: 'Wizyty Dzisiaj', value: todayAppointments, icon: 'Calendar' },
                    { label: 'Zrealizowane (Miesiąc)', value: completedMonth, icon: 'CheckCircle' }
                ],
                chartData: weeklyOccupancy
            });
        } else {
            const myPatientsRes = await pool.query(`
                SELECT COUNT(*)::int as count 
                FROM patient_therapists 
                WHERE therapist_id = $1
            `, [userId]);
            const myPatients = myPatientsRes.rows[0].count;

            const todayAppointmentsRes = await pool.query(`
                SELECT COUNT(*)::int as count 
                FROM appointments 
                WHERE therapist_id = $1 
                AND start_time::date = CURRENT_DATE 
                AND status != 'Odwołana'
            `, [userId]);
            const todayAppointments = todayAppointmentsRes.rows[0].count;

            const completedMonthRes = await pool.query(`
                SELECT COUNT(*)::int as count 
                FROM appointments 
                WHERE therapist_id = $1 
                AND status = 'Odbyta' 
                AND EXTRACT(MONTH FROM start_time) = EXTRACT(MONTH FROM CURRENT_DATE)
                AND EXTRACT(YEAR FROM start_time) = EXTRACT(YEAR FROM CURRENT_DATE)
            `, [userId]);
            const completedMonth = completedMonthRes.rows[0].count;

            const statusDistributionRes = await pool.query(`
                SELECT status as name, COUNT(*)::int as value
                FROM appointments
                WHERE therapist_id = $1
                AND EXTRACT(MONTH FROM start_time) = EXTRACT(MONTH FROM CURRENT_DATE)
                AND EXTRACT(YEAR FROM start_time) = EXTRACT(YEAR FROM CURRENT_DATE)
                GROUP BY status
            `, [userId]);
            const statusDistribution = statusDistributionRes.rows;

            res.json({
                counters: [
                    { label: 'Moi Pacjenci', value: myPatients, icon: 'Users' },
                    { label: 'Moje Wizyty Dziś', value: todayAppointments, icon: 'Calendar' },
                    { label: 'Moje Odbyte (Miesiąc)', value: completedMonth, icon: 'CheckCircle' }
                ],
                chartData: statusDistribution
            });
        }
    } catch (error) {
        console.error('Błąd przy generowaniu statystyk dashboardu:', error);
        res.status(500).json({ error: 'Błąd serwera' });
    }
});

// Pobieranie alertów.
app.get('/api/dashboard/alerts', async (req, res) => {
    const userId = req.user?.id;
    const userRole = req.user?.role;

    try {
        if (userRole === 'admin') {
            // Skierowania kończące się w ciągu 30 dni
            const expiringReferralsRes = await pool.query(`
                SELECT p.name, p.surname, r.expiry_date, r.referral_number
                FROM referrals r
                JOIN patients p ON r.patient_id = p.id
                WHERE r.expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'
                ORDER BY r.expiry_date ASC
            `);
            const expiringReferrals = expiringReferralsRes.rows;

            const alerts = expiringReferrals.map(r => ({
                type: 'warning',
                message: `Skierowanie nr ${r.referral_number} dla ${r.name} ${r.surname} wygasa ${r.expiry_date.toISOString().split('T')[0]}`,
                patient_name: `${r.name} ${r.surname}`
            }));

            // Pacjenci bez żadnego skierowania
            const missingReferralsRes = await pool.query(`
                SELECT id, name, surname 
                FROM patients 
                WHERE status != 'zarchiwizowany'
                AND id NOT IN (SELECT DISTINCT patient_id FROM referrals)
            `);
            const missingReferrals = missingReferralsRes.rows;

            missingReferrals.forEach(p => {
                alerts.push({
                    type: 'info',
                    message: `Brak skierowania dla ${p.name} ${p.surname}`,
                    patient_id: p.id,
                    patient_name: `${p.name} ${p.surname}`
                });
            });

            res.json(alerts);
        } else {
            // Brakujące notatki dla odbytych wizyt terapeuty
            const missingNotesRes = await pool.query(`
                SELECT a.id, a.start_time, p.id as patient_id, p.name, p.surname
                FROM appointments a
                JOIN patients p ON a.patient_id = p.id
                LEFT JOIN therapy_notes tn ON a.id = tn.appointment_id
                WHERE a.therapist_id = $1 
                AND a.status = 'Odbyta'
                AND tn.id IS NULL
                ORDER BY a.start_time DESC
            `, [userId]);
            const missingNotes = missingNotesRes.rows;

            res.json(missingNotes.map(m => ({
                type: 'error',
                message: `Brak notatki do wizyty z dnia ${m.start_time.toISOString().split('T')[0]} (${m.name} ${m.surname})`,
                appointment_id: m.id,
                patient_id: m.patient_id,
                patient_name: `${m.name} ${m.surname}`,
                appointment_date: m.start_time.toISOString().split('T')[0]
            })));
        }
    } catch (error) {
        console.error('Błąd przy pobieraniu alertów:', error);
        res.status(500).json({ error: 'Błąd serwera' });
    }
});

// Pobieranie logów
app.get('/api/logs', async (req, res) => {
    const userRole = req.user?.role;
    if (userRole !== 'admin') return res.status(403).json({ error: 'Brak uprawnień' });

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit) || 20));
    const search = req.query.search || '';
    const offset = (page - 1) * limit;

    let query = `
        SELECT audit_log.id, audit_log.user_id, audit_log.action, audit_log.description, audit_log.payload, 
               audit_log.timestamp, 
               users.name, users.surname 
        FROM audit_log 
        LEFT JOIN users ON audit_log.user_id = users.id 
    `;
    let countQuery = `SELECT COUNT(*)::int as total FROM audit_log LEFT JOIN users ON audit_log.user_id = users.id `;
    let params = [];
    let pIdx = 1;

    if (search) {
        const searchPattern = `%${search}%`;
        const whereClause = ` WHERE (audit_log.description ILIKE $${pIdx} OR users.surname ILIKE $${pIdx} OR users.name ILIKE $${pIdx} OR audit_log.action ILIKE $${pIdx}) `;
        query += whereClause;
        countQuery += whereClause;
        params.push(searchPattern);
        pIdx++;
    }

    query += ` ORDER BY audit_log.timestamp DESC LIMIT $${pIdx} OFFSET $${pIdx+1} `;
    
    try {
        const countResult = await pool.query(countQuery, params);
        const total = countResult.rows[0].total;
        
        const logsResult = await pool.query(query, [...params, limit, offset]);
        const logs = logsResult.rows;
        
        const translatedLogs = logs.map(log => ({
            ...log,
            action_pl: ACTION_MAP[log.action] || log.action
        }));

        res.json({
            logs: translatedLogs,
            total,
            totalPages: Math.ceil(total / limit),
            currentPage: page
        });
    } catch (error) {
        console.error('Błąd pobierania logów:', error);
        res.status(500).json({ error: 'Błąd serwera' });
    }
});

app.listen(PORT, () => {
    console.log(`Serwer działa na porcie ${PORT}`);
});
