import type { Employee, Floor } from '../types';
export declare function createEmployee(data: Partial<Employee>): Employee;
export declare function canDeleteEmployee(employees: Employee[], employeeId: string): {
    allowed: boolean;
    error?: string;
};
export declare function buildTrainingFloor(floor: Partial<Floor>): Floor;
//# sourceMappingURL=employee-operations.d.ts.map