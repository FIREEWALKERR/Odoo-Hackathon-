import { UserRole } from '../types';

export interface NavItem {
  id: string;
  label: string;
  category: 'Operations' | 'Fleet & Personnel' | 'Financial & General' | 'Personal' | 'Services';
}

export const ROLE_NAVIGATION: Record<UserRole, NavItem[]> = {
  fleet_manager: [
    { id: 'dashboard', label: 'Fleet Dashboard', category: 'Operations' },
    { id: 'vehicles', label: 'Vehicle Registry', category: 'Fleet & Personnel' },
    { id: 'maintenance', label: 'Maintenance Logs', category: 'Fleet & Personnel' },
    { id: 'documents', label: 'Fleet Documents', category: 'Fleet & Personnel' }
  ],
  driver_dispatcher: [
    { id: 'dashboard', label: 'Dispatcher Dashboard', category: 'Operations' },
    { id: 'trips', label: 'Trip Management', category: 'Operations' }
  ],
  safety_officer: [
    { id: 'dashboard', label: 'Safety Dashboard', category: 'Operations' },
    { id: 'drivers', label: 'Driver Compliance', category: 'Fleet & Personnel' }
  ],
  financial_analyst: [
    { id: 'dashboard', label: 'Finance Dashboard', category: 'Operations' },
    { id: 'expenses', label: 'Expense Management', category: 'Financial & General' },
    { id: 'fuel', label: 'Fuel Logging', category: 'Financial & General' },
    { id: 'reports', label: 'Financial Reports', category: 'Financial & General' }
  ]
};

/**
 * Validates whether a given user role has permission to access a specific tab/route
 */
export function canRoleAccessTab(role: UserRole, tabId: string): boolean {
  const allowedItems = ROLE_NAVIGATION[role];
  if (!allowedItems) return false;
  return allowedItems.some(item => item.id === tabId);
}

/**
 * Returns required role access level as string for debugging or denied-view reports
 */
export function getRequiredAccessLevel(tabId: string): string {
  // Finds what roles are permitted to access this tab
  const roles: string[] = [];
  (Object.keys(ROLE_NAVIGATION) as UserRole[]).forEach(r => {
    if (ROLE_NAVIGATION[r].some(item => item.id === tabId)) {
      roles.push(r.replace('_', ' ').toUpperCase());
    }
  });
  return roles.join(', ');
}
