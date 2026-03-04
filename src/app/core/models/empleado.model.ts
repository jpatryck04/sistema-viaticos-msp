/**
 * 👤 MODELO DE EMPLEADO
 * 
 * Interfaz que define la estructura de datos de un empleado
 * del Ministerio de Salud Pública.
 */

export interface Empleado {
  /** Número de cédula único del empleado */
  cedula: string;
  
  /** Nombre completo del empleado */
  nombreCompleto: string;
  
  /** Cargo o puesto ocupado */
  cargo: string;
  
  /** Asignación diaria en moneda local (RD$) */
  asignacionDiaria: number;
  
  /** Departamento o unidad donde trabaja */
  departamento: string;
  
  /** Salario mensual */
  sueldo: number;
  
  /** Indica si el empleado está activo en el sistema */
  activo: boolean;
}