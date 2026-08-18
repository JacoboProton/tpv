import type { Employee, EmployeeRole } from '../types';
export type { EmployeeRole };
export declare function hasRole(employee: Employee | null, requiredRole: EmployeeRole): boolean;
export declare function isAdmin(employee: Employee | null): boolean;
export declare function requiresAdmin(entryPoint: string): boolean;
export declare function canAccess(employee: Employee | null, entryPoint: string): boolean;
export declare function formatEmployeeName(employee: Employee | null): string;
//# sourceMappingURL=employees.d.ts.map