import { 
  LayoutDashboard, 
  Users, 
  Settings, 
  LogOut, 
  Calendar, 
  UserRound, 
  DoorOpen, 
  History 
} from 'lucide-react';

export const menuItems = [
  { 
    path: '/dashboard', 
    label: 'Dashboard', 
    icon: LayoutDashboard, 
    roles: ['admin', 'therapist'] 
  },
  { 
    path: '/patients', 
    label: 'Pacjenci', 
    icon: Users, 
    roles: ['admin', 'therapist'] 
  },
  { 
    path: '/calendar', 
    label: 'Kalendarz', 
    icon: Calendar, 
    roles: ['admin', 'therapist'] 
  },
  { 
    label: 'Zarządzanie', 
    icon: Settings, 
    roles: ['admin'],
    children: [
      { path: '/staff', label: 'Personel', icon: UserRound },
      { path: '/rooms', label: 'Sale', icon: DoorOpen },
      { path: '/logs', label: 'Dziennik Zdarzeń', icon: History }
    ]
  }
];
