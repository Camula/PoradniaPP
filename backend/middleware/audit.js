const { pool } = require('../database');

// Middleware audytu
const auditLog = (action, description) => {
    return async (req, res, next) => {
        // ID użytkownika z sesji
        const userId = req.user?.id || null;
        
        // Kopia danych żądania
        const bodyCopy = { ...req.body };
        
        // Ukrywanie haseł
        const sensitiveFields = ['password', 'currentPassword', 'newPassword'];
        sensitiveFields.forEach(field => {
            if (bodyCopy[field]) bodyCopy[field] = '********';
        });

        const payload = {
            method: req.method,
            url: req.originalUrl,
            body: bodyCopy,
            params: req.params,
            query: req.query
        };

        // Zapis do logów
        try {
            // Format JSONB
            await pool.query(`
                INSERT INTO audit_log (user_id, action, description, payload)
                VALUES ($1, $2, $3, $4::jsonb)
            `, [userId ? parseInt(userId) : null, action, description, JSON.stringify(payload)]);
        } catch (error) {
            // Błąd zapisu
            console.error(`[AUDIT ERROR] Nie udało się zapisać akcji ${action}:`, error.message);
        }
        
        next();
    };
};

module.exports = auditLog;
