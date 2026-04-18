import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import styles from './Login.module.css';
import { apiClient } from '../api/client';

// Logowanie
const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const { login } = useAuth();
    const navigate = useNavigate();

    // Logowanie użytkownika
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        try {
            const response = await apiClient.post('/login', { email, password });
            const data = response.data;

            if (data.success) {
                login(data.user, data.token);
                navigate('/');
            } else {
                setError(data.message || 'Błędny email lub hasło');
            }
        } catch (err) {
            console.error('Błąd podczas logowania:', err);
            const msg = err.response?.data?.message || 'Błąd połączenia z serwerem';
            setError(msg);
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.loginCard}>
                <h1>System Poradni</h1>
                <p>Zaloguj się do swojego konta</p>
                
                {error && <div className={styles.error}>{error}</div>}
                
                <form onSubmit={handleSubmit}>
                    <div className={styles.formGroup}>
                        <label>Email</label>
                        <input 
                            type="email" 
                            value={email} 
                            onChange={(e) => setEmail(e.target.value)} 
                            required 
                        />
                    </div>
                    
                    <div className={styles.formGroup}>
                        <label>Hasło</label>
                        <input 
                            type="password" 
                            value={password} 
                            onChange={(e) => setPassword(e.target.value)} 
                            required 
                        />
                    </div>
                    
                    <button type="submit" className={styles.loginBtn}>Zaloguj się</button>
                </form>

                <div className={styles.helpText}>
                    Dane testowe:<br />
                    Admin: <code>admin@poradnia.pl / admin123</code><br />
                    Terapeuta: <code>jan.kowalski@poradnia.pl / password123</code>
                </div>
            </div>
        </div>
    );
};

export default Login;
