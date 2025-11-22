/**
 * Distrito del Perú
 */
export interface District {
  code: string;
  name: string;
}

/**
 * Provincia del Perú
 */
export interface Province {
  code: string;
  name: string;
  ubigeo: string;
  districts: District[];
}

/**
 * Departamento (Región) del Perú
 */
export interface Department {
  code: string;
  name: string;
  ubigeo: string;
  provinces: Province[];
}
