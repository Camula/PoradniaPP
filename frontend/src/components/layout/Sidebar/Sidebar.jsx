import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { menuItems } from './MenuItems';
import styles from './Sidebar.module.css';
import { ChevronDown, ChevronRight, LogOut } from 'lucide-react';
import clsx from 'clsx';

// Pasek boczny aplikacji.
const Sidebar = () => {
  const { user, logout } = useAuth();
  const [openSubmenus, setOpenSubmenus] = useState({});

  // Rozwijanie i zwijanie podmenu w pasku bocznym
  const toggleSubmenu = (label) => {
    setOpenSubmenus(prev => ({
      ...prev,
      [label]: !prev[label]
    }));
  };

  // Sprawdzanie uprawnień do danego elementu menu
  const hasAccess = (item) => {
    if (!item.roles) return true;
    return item.roles.includes(user?.role);
  };

  // Renderowanie pojedynczego elementu menu
  const renderMenuItem = (item) => {
    if (!hasAccess(item)) return null;

    const Icon = item.icon;
    const hasChildren = item.children && item.children.length > 0;
    const isOpen = openSubmenus[item.label];

    if (hasChildren) {
      return (
        <div key={item.label} className={styles.menuItemGroup}>
          <button 
            className={styles.menuItem} 
            onClick={() => toggleSubmenu(item.label)}
          >
            <div className={styles.menuItemContent}>
              {Icon && <Icon size={20} className={styles.icon} />}
              <span>{item.label}</span>
            </div>
            {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </button>
          {isOpen && (
            <div className={styles.submenu}>
              {item.children.map(child => renderMenuItem(child))}
            </div>
          )}
        </div>
      );
    }

    return (
      <NavLink
        key={item.path}
        to={item.path}
        className={({ isActive }) => clsx(styles.menuItem, isActive && styles.active)}
      >
        <div className={styles.menuItemContent}>
          {Icon && <Icon size={20} className={styles.icon} />}
          <span>{item.label}</span>
        </div>
      </NavLink>
    );
  };

  return (
    <aside className={styles.sidebar}>
      <div className={styles.logo}>
        <h2>PoradniaPP</h2>
        <span className={styles.roleTag}>{user?.role === 'admin' ? 'Administrator' : 'Terapeuta'}</span>
      </div>
      
      <nav className={styles.nav}>
        {menuItems.map(item => renderMenuItem(item))}
      </nav>

      <div className={styles.footer}>
        <div className={styles.userInfo}>
          <p className={styles.userName}>{user?.name} {user?.surname}</p>
          <p className={styles.userEmail}>{user?.email}</p>
        </div>
        <button onClick={logout} className={styles.logoutButton}>
          <LogOut size={20} className={styles.icon} />
          <span>Wyloguj</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
