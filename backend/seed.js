const { pool, initDb } = require('./database');
const { fakerPL: faker } = require('@faker-js/faker');
const bcrypt = require('bcrypt');

const seed = async () => {
    console.log('Rozpoczynanie seedowania...');

    // Inicjalizacja DB
    await initDb();

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // Czyszczenie danych
        console.log('Czyszczenie danych...');

        await client.query(`
            TRUNCATE audit_log, therapy_notes, appointments, patient_therapists, referrals, patients, rooms RESTART IDENTITY CASCADE;
            DELETE FROM users WHERE role != 'admin';
        `);

        // Seedowanie
        console.log('Wstawianie danych...');

        // Dane terapeutów
        const therapistsData = [
            { name: 'Jan', surname: 'Kowalski', spec: 'Logopeda', email: 'jan.kowalski@poradnia.pl', color: '#ffcccc' },
            { name: 'Anna', surname: 'Nowak', spec: 'Pedagog', email: 'anna.nowak@poradnia.pl', color: '#ccffcc' },
            { name: 'Piotr', surname: 'Wiśniewski', spec: 'Psycholog', email: 'piotr.wisniewski@poradnia.pl', color: '#ccccff' },
            { name: 'Maria', surname: 'Wójcik', spec: 'Fizjoterapeuta', email: 'maria.wojcik@poradnia.pl', color: '#ffffcc' },
            { name: 'Krzysztof', surname: 'Kowalczyk', spec: 'Terapeuta SI', email: 'krzysztof.kowalczyk@poradnia.pl', color: '#ffccff' },
            { name: 'Agnieszka', surname: 'Kamińska', spec: 'Pedagog specjalny', email: 'agnieszka.kaminska@poradnia.pl', color: '#ccffff' }
        ];

        const hashedPassword = await bcrypt.hash('password123', 10);
        const therapistIds = [];
        for (const t of therapistsData) {
            const res = await client.query(
                'INSERT INTO users (name, surname, email, password, role, specialization, calendar_color, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id',
                [t.name, t.surname, t.email, hashedPassword, 'therapist', t.spec, t.color, 'active']
            );
            therapistIds.push(res.rows[0].id);
        }

        // Dane sal
        const roomsData = [
            { name: 'Sala 1 - Logopedyczna', status: 'active' },
            { name: 'Sala 2 - Integracji Sensorycznej', status: 'active' },
            { name: 'Sala 3 - Psychologiczna', status: 'active' },
            { name: 'Sala 4 - Fizjoterapii', status: 'active' },
            { name: 'Sala 5 - Pedagogiczna', status: 'active' },
            { name: 'Sala 6 - Remont', status: 'inactive' },
            { name: 'Sala 7 - Wyłączona', status: 'inactive' }
        ];

        const activeRoomIds = [];
        for (const r of roomsData) {
            const res = await client.query(
                'INSERT INTO rooms (name, status) VALUES ($1, $2) RETURNING id',
                [r.name, r.status]
            );
            if (r.status === 'active') activeRoomIds.push(res.rows[0].id);
        }

        // Generowanie PESEL
        function generatePesel() {
            const year = faker.number.int({ min: 10, max: 23 });
            const month = faker.number.int({ min: 21, max: 32 });
            const day = faker.number.int({ min: 1, max: 28 });
            const yy = year.toString().padStart(2, '0');
            const mm = month.toString().padStart(2, '0');
            const dd = day.toString().padStart(2, '0');
            const random4 = faker.string.numeric(4);
            let pesel = yy + mm + dd + random4;
            const weights = [1, 3, 7, 9, 1, 3, 7, 9, 1, 3];
            let sum = 0;
            for (let i = 0; i < 10; i++) sum += parseInt(pesel[i]) * weights[i];
            const control = (10 - (sum % 10)) % 10;
            return pesel + control;
        }

        // Generowanie telefonu
        function generatePhoneNumber() {
            return `${faker.string.numeric(3)} ${faker.string.numeric(3)} ${faker.string.numeric(3)}`;
        }

        // Pacjenci
        const patientsData = [
            ...Array(25).fill({ status: 'aktywny', hasReferral: true, expiresSoon: false }),
            ...Array(3).fill({ status: 'aktywny', hasReferral: true, expiresSoon: true, archived: false }),
            ...Array(4).fill({ status: 'nieaktywny', hasReferral: false, expiresSoon: false }),
            ...Array(6).fill({ status: 'zarchiwizowany', hasReferral: true, expiresSoon: true, archived: true })
        ];

        const year = new Date().getFullYear();
        let patientNumber = 1;
        const activePatients = [];

        for (const pd of patientsData) {
            const signature = `PAC/${year}/${patientNumber.toString().padStart(2, '0')}`;
            const name = faker.person.firstName();
            const surname = faker.person.lastName();
            const birthDate = faker.date.birthdate({ min: 3, max: 18, mode: 'age' }).toISOString().split('T')[0];
            const pesel = generatePesel();
            const address = `${faker.location.streetAddress()}, ${faker.location.city()}`;
            const phone1 = generatePhoneNumber();
            const phone2 = faker.datatype.boolean(0.3) ? generatePhoneNumber() : null;
            const email = faker.internet.email();

            const pRes = await client.query(
                `INSERT INTO patients (signature, year, number_in_year, name, surname, birth_date, pesel, address, parent_phone_1, parent_phone_2, parent_email_1, status)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING id`,
                [signature, year, patientNumber, name, surname, birthDate, pesel, address, phone1, phone2, email, pd.status]
            );
            const patientId = pRes.rows[0].id;
            patientNumber++;

            if (pd.hasReferral) {
                let expiryDate;
                if (pd.archived) {
                    const date = new Date();
                    date.setMonth(date.getMonth() - 1);
                    date.setDate(date.getDate() - faker.number.int({ min: 1, max: 20 }));
                    expiryDate = date.toISOString().split('T')[0];
                } else if (pd.expiresSoon) {
                    const date = new Date();
                    date.setDate(date.getDate() + faker.number.int({ min: 1, max: 20 }));
                    expiryDate = date.toISOString().split('T')[0];
                } else {
                    const date = new Date();
                    date.setMonth(date.getMonth() + faker.number.int({ min: 2, max: 12 }));
                    expiryDate = date.toISOString().split('T')[0];
                }
                await client.query(
                    'INSERT INTO referrals (patient_id, referral_number, issuing_facility, expiry_date) VALUES ($1, $2, $3, $4)',
                    [patientId, `SK/${year}/${faker.number.int({ min: 100, max: 999 })}`, 'Poradnia PP', expiryDate]
                );
            }

            if (pd.status === 'aktywny') {
                activePatients.push({ id: patientId, therapistIds: [] });
                const tCount = faker.number.int({ min: 1, max: 2 });
                const selectedTherapists = faker.helpers.arrayElements(therapistIds, tCount);
                for (const tid of selectedTherapists) {
                    await client.query('INSERT INTO patient_therapists (patient_id, therapist_id) VALUES ($1, $2)', [patientId, tid]);
                    activePatients[activePatients.length - 1].therapistIds.push(tid);
                }
            }
        }

        const appointmentTypes = ['Konsultacja', 'Wizyta logopedyczna', 'Wizyta pedagogiczna', 'Integracja Sensoryczna (SI)', 'Wizyta psychologiczna'];
        const sampleNotes = [
            'Postępy w wymowie głosek szumiących.',
            'Dziecko dobrze współpracuje podczas zajęć.',
            'Wymaga dalszej pracy nad koncentracją.',
            'Zalecane ćwiczenia w domu - zestaw nr 3.',
            'Poprawa płynności mowy w sytuacjach zadaniowych.',
            'Rozszerzenie zasobu słownictwa czynnego.',
            'Praca nad koordynacją wzrokowo-ruchową.',
            'Dobra reakcja na nowe bodźce sensoryczne.',
            'Wykazuje dużą motywację do wykonywania ćwiczeń.',
            'Trudności z utrzymaniem kontaktu wzrokowego.'
        ];

        const bookedSlots = new Set();
        const now = new Date();
        const startDate = new Date(now);
        startDate.setDate(now.getDate() - 14);
        const endDate = new Date(now);
        endDate.setDate(now.getDate() + 28);

        let cancelledCount = 0;

        for (const p of activePatients) {
            const team = p.therapistIds;
            if (team.length === 0) continue;

            for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 7)) {
                for (let i = 0; i < 3; i++) {
                    const appointmentDate = new Date(d);
                    const randomDayOffset = faker.number.int({ min: 1, max: 6 }); 
                    const currentDay = appointmentDate.getDay() || 7;
                    appointmentDate.setDate(appointmentDate.getDate() - currentDay + randomDayOffset);

                    if (appointmentDate < startDate || appointmentDate > endDate) continue;

                    const tId = team[faker.number.int({ min: 0, max: team.length - 1 })];

                    let attempts = 0;
                    let scheduled = false;
                    while (attempts < 50 && !scheduled) {
                        const hour = faker.number.int({ min: 8, max: 18 });
                        const rId = faker.helpers.arrayElement(activeRoomIds);
                        const dateStr = appointmentDate.toISOString().split('T')[0];

                        const roomKey = `${dateStr}-${hour}-${rId}`;
                        const therapistKey = `${dateStr}-${hour}-T${tId}`;
                        const patientKey = `${dateStr}-${hour}-P${p.id}`;

                        if (!bookedSlots.has(roomKey) && !bookedSlots.has(therapistKey) && !bookedSlots.has(patientKey)) {
                            bookedSlots.add(roomKey);
                            bookedSlots.add(therapistKey);
                            bookedSlots.add(patientKey);

                            const aptStart = new Date(appointmentDate);
                            aptStart.setHours(hour, 0, 0, 0);
                            const aptEnd = new Date(aptStart);
                            aptEnd.setHours(hour + 1, 0, 0, 0);

                            let status = 'Zaplanowana';
                            if (aptStart < now) {
                                if (cancelledCount < 5 && faker.datatype.boolean(0.1)) {
                                    status = 'Odwołana';
                                    cancelledCount++;
                                } else {
                                    status = 'Odbyta';
                                }
                            } else {
                                if (cancelledCount < 5 && faker.datatype.boolean(0.05)) {
                                    status = 'Odwołana';
                                    cancelledCount++;
                                }
                            }

                            const aptType = faker.helpers.arrayElement(appointmentTypes);

                            const aRes = await client.query(
                                `INSERT INTO appointments (patient_id, therapist_id, room_id, type, status, start_time, end_time, notes)
                                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
                                [p.id, tId, rId, aptType, status, aptStart.toISOString(), aptEnd.toISOString(), null]
                            );

                            if (status === 'Odbyta') {
                                await client.query(
                                    'INSERT INTO therapy_notes (patient_id, therapist_id, appointment_id, content) VALUES ($1, $2, $3, $4)',
                                    [p.id, tId, aRes.rows[0].id, faker.helpers.arrayElement(sampleNotes)]
                                );
                            }

                            scheduled = true;
                        }
                        attempts++;
                    }
                }
            }
        }

        await client.query('COMMIT');
        console.log('Seedowanie zakończone!');
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Błąd seedowania:', error);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
};

seed();