const jwt = require('jsonwebtoken');
const { pool } = require('../database');

// Weryfikacja tokena JWT
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Brak tokenu autoryzacyjnego' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Nieprawidłowy lub wygasły token' });
        }
        req.user = user;
        next();
    });
};

// Dostęp do danych pacjenta
const checkPatientAccess = async (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ error: 'Nieautoryzowany dostęp' });
    }

    const userId = req.user.id;
    const userRole = req.user.role;
    const patientId = req.params.id || req.body.patient_id;

    if (userRole === 'admin') {
        return next();
    }

    if (userRole === 'therapist') {
        if (!patientId) return next();

        try {
            const result = await pool.query(
                'SELECT 1 FROM patient_therapists WHERE patient_id = $1 AND therapist_id = $2',
                [patientId, userId]
            );

            if (result.rows.length > 0) {
                return next();
            } else {
                return res.status(403).json({ error: 'Brak uprawnień do danych tego pacjenta' });
            }
        } catch (error) {
            console.error('Błąd checkPatientAccess:', error);
            return res.status(500).json({ error: 'Błąd serwera' });
        }
    }

    return res.status(403).json({ error: 'Brak uprawnień' });
};

module.exports = {
    authenticateToken,
    checkPatientAccess
};

