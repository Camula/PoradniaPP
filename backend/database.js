const { Pool } = require('pg');
const bcrypt = require('bcrypt');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 5432,
});

// Inicjalizacja bazy danych
const initDb = async (retries = 5) => {
    while (retries > 0) {
        try {
            // Test połączenia
            await pool.query('SELECT 1');
            console.log('Połączono z bazą danych PostgreSQL.');

            // Tworzenie tabel
            await pool.query(`
                CREATE TABLE IF NOT EXISTS users (
                    id SERIAL PRIMARY KEY,
                    name TEXT NOT NULL,
                    surname TEXT NOT NULL,
                    email TEXT UNIQUE NOT NULL,
                    password TEXT NOT NULL,
                    role TEXT CHECK(role IN ('admin', 'therapist')) NOT NULL,
                    specialization TEXT,
                    calendar_color TEXT DEFAULT '#3498db',
                    status TEXT CHECK(status IN ('active', 'inactive')) DEFAULT 'active'
                );

                CREATE TABLE IF NOT EXISTS rooms (
                    id SERIAL PRIMARY KEY,
                    name TEXT NOT NULL,
                    status TEXT CHECK(status IN ('active', 'inactive')) DEFAULT 'active'
                );

                CREATE TABLE IF NOT EXISTS patients (
                    id SERIAL PRIMARY KEY,
                    signature TEXT UNIQUE NOT NULL,
                    year INTEGER NOT NULL,
                    number_in_year INTEGER NOT NULL,
                    name TEXT NOT NULL,
                    surname TEXT NOT NULL,
                    birth_date DATE,
                    pesel TEXT UNIQUE NOT NULL,
                    address TEXT NOT NULL,
                    parent_phone_1 TEXT NOT NULL,
                    parent_phone_2 TEXT,
                    parent_email_1 TEXT,
                    parent_email_2 TEXT,
                    status TEXT CHECK(status IN ('aktywny', 'nieaktywny', 'zarchiwizowany')) DEFAULT 'nieaktywny',
                    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(year, number_in_year)
                );

                CREATE TABLE IF NOT EXISTS appointments (
                    id SERIAL PRIMARY KEY,
                    patient_id INTEGER REFERENCES patients(id) ON DELETE CASCADE,
                    therapist_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                    room_id INTEGER REFERENCES rooms(id) ON DELETE CASCADE,
                    type TEXT CHECK(type IN ('Konsultacja', 'Badanie wstępne', 'Wizyta logopedyczna', 'Wizyta pedagogiczna', 'Integracja Sensoryczna (SI)', 'Wizyta psychologiczna')),
                    status TEXT CHECK(status IN ('Zaplanowana', 'Odbyta', 'Odwołana')) DEFAULT 'Zaplanowana',
                    start_time TIMESTAMPTZ,
                    end_time TIMESTAMPTZ,
                    notes TEXT
                );

                CREATE TABLE IF NOT EXISTS referrals (
                    id SERIAL PRIMARY KEY,
                    patient_id INTEGER REFERENCES patients(id) ON DELETE CASCADE,
                    referral_number TEXT NOT NULL,
                    issuing_facility TEXT NOT NULL,
                    expiry_date DATE NOT NULL,
                    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
                );

                CREATE TABLE IF NOT EXISTS therapy_notes (
                    id SERIAL PRIMARY KEY,
                    patient_id INTEGER REFERENCES patients(id) ON DELETE CASCADE,
                    therapist_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                    appointment_id INTEGER REFERENCES appointments(id) ON DELETE CASCADE,
                    content TEXT NOT NULL,
                    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
                );

                CREATE TABLE IF NOT EXISTS patient_therapists (
                    patient_id INTEGER REFERENCES patients(id) ON DELETE CASCADE,
                    therapist_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                    PRIMARY KEY(patient_id, therapist_id)
                );

                CREATE TABLE IF NOT EXISTS audit_log (
                    id SERIAL PRIMARY KEY,
                    timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
                    action TEXT NOT NULL,
                    description TEXT,
                    payload JSONB
                );
            `);

            // Domyślny administrator
            const adminCheck = await pool.query("SELECT id FROM users WHERE role = 'admin' LIMIT 1");
            if (adminCheck.rows.length === 0) {
                console.log('Tworzenie konta administratora...');
                const hashedPassword = await bcrypt.hash('admin123', 10);
                await pool.query(
                    'INSERT INTO users (name, surname, email, password, role) VALUES ($1, $2, $3, $4, $5)',
                    ['Admin', 'Systemu', 'admin@poradnia.pl', hashedPassword, 'admin']
                );
                console.log('Konto administratora zostało utworzone.');
            }

            console.log('DB gotowa.');
            return;
        } catch (error) {
            retries -= 1;
            console.error(`Błąd bazy (pozostało prób: ${retries}):`, error.message);
            if (retries === 0) {
                console.error('Błąd połączenia. Kończenie procesu.');
                process.exit(1);
            }
            await new Promise(res => setTimeout(res, 2000));
        }
    }
};

// Generowanie sygnatury pacjenta
const generateSignature = async () => {
    const year = new Date().getFullYear();
    try {
        const result = await pool.query(
            'SELECT COUNT(*)::int as count FROM patients WHERE year = $1',
            [year]
        );
        const nextNumber = (result.rows[0].count || 0) + 1;
        const formattedNumber = String(nextNumber).padStart(3, '0');
        const signature = `PAC/${year}/${formattedNumber}`;
        return { signature, year, number_in_year: nextNumber };
    } catch (error) {
        console.error('Błąd sygnatury:', error);
        throw error;
    }
};

module.exports = {
    pool,
    initDb,
    generateSignature
};
