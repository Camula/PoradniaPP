# PoradniaPP - System Zarządzania Poradnią Psychologiczno-Pedagogiczną

System wspomagający pracę poradni, umożliwiający zarządzanie pacjentami, dokumentacją (skierowania, notatki) oraz harmonogramem wizyt. Projekt został stworzony z myślą o ułatwieniu komunikacji między administratorem a zespołem terapeutów oraz zapewnieniu bezpieczeństwa danych wrażliwych.

**Autor:** Kamil Jarzyna

---

## Główne Funkcjonalności

### Panel Administratora
- Zarządzanie bazą pacjentów, personelu oraz sal terapeutycznych.
- Monitorowanie skierowań i automatyczne alerty o ich wygasaniu.
- Pełny wgląd w Dziennik Zdarzeń (Audit Log) - historia wszystkich zmian w systemie (z maskowaniem danych wrażliwych).
- Statystyki obłożenia poradni i analityka pacjentów.

### Panel Terapeuty
- Dostęp do kart pacjentów przypisanych do danego terapeuty (izolacja danych).
- Zarządzanie historią terapii i dodawanie notatek z wizyt.
- Interaktywny kalendarz wizyt z systemem wykrywania konfliktów (sala/terapeuta/pacjent).
- Szybki podgląd dzisiejszego harmonogramu na pulpicie startowym.

---

## Technologie

- **Frontend:** React 19, Vite, CSS Modules, PWA (Progressive Web App), Axios.
- **Backend:** Node.js, Express, PostgreSQL (asynchroniczny model `pg`, `TIMESTAMPTZ`).
- **Infrastruktura:** Docker, Docker Compose, Nginx.
- **Bezpieczeństwo:** Autoryzacja **JWT (Bearer Token)**, haszowanie `bcrypt`, autoryzacja ról (RBAC), logowanie audytowe (Audit Log).
- **Narzędzia:** Lucide React (ikony), Faker.js (generowanie danych testowych).

---

## Struktura Projektu

- `frontend/` - Aplikacja kliencka (React).
- `backend/` - Serwer API i logika biznesowa (asynchroniczna).
- `docker-compose.yml` - Orkiestracja stosu aplikacyjnego.

---

## Instrukcja Uruchomienia (Docker)

Projekt został w pełni skonteneryzowany. Wymagany jest zainstalowany **Docker Desktop** i wolny port `8080`.

### 1. Uruchomienie całego stosu
W głównym folderze projektu uruchom:

```bash
docker compose up --build -d
```

### 2. Inicjalizacja bazy danych (Seed)
Po uruchomieniu kontenerów, można zasilić ją danymi testowymi:

```bash
docker compose exec backend npm run seed
```

Aplikacja będzie dostępna pod adresem: `http://localhost:8080`

---

## Dane do logowania (Testowe)

- **Administrator:** `admin@poradnia.pl` / `admin123`
- **Terapeuta:** `jan.kowalski@poradnia.pl` / `password123`

---

## Lokalne uruchamianie (Opcjonalnie)
Domyślne hasła i klucze zaszyte są na potrzeby testów w pliku `docker-compose.yml`. W celu uruchomienia projektu klasycznie (np. przez `npm start` poza Dockerem):
1. Skopiuj plik `.env.example` do pliku `.env`.
2. Uzupełnij w nim własne hasła i klucze.
