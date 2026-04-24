/**
 * Core logic for Spanish Salary and Tax Calculation (2012-2026)
 * Based on provided Python fiscal model.
 */

export interface TaxBracket {
  limit: number;
  rate: number;
}

export interface SolidarityBracket {
  limitMultiplier: number;
  rate: number;
}

export interface FiscalParameters {
  baseMax: number;
  ssTipos: {
    comunes: [number, number];
    desempleo: [number, number];
    fogasa: [number, number];
    fp: [number, number];
    atep: [number, number];
  };
  mei: [number, number];
  solidaridad: SolidarityBracket[];
  irpfMinimo: number;
  minimoExento: number;
  gastosFijos: number;
  art20Meta: {
    U_Inf: number | string;
    R_Max: number | string;
    U_Sup: number | string;
    R_Min: number | string;
  };
  reduccionTrabajo: (rnPrevio: number) => number;
  tramosIrpf: TaxBracket[];
  deduccionSmi: (bruto: number) => number;
}

export const IPC_ANUAL_DIC: Record<number, number> = {
  2013: 0.003, 2014: -0.01, 2015: 0.000, 2016: 0.016, 2017: 0.011, 
  2018: 0.012, 2019: 0.008, 2020: -0.005, 2021: 0.065, 2022: 0.057, 
  2023: 0.031, 2024: 0.028, 2025: 0.029, 2026: 0.030
};

export function obtenerInflacionAcumulada(anioBase: number, anioDestino: number = 2026): number {
  if (anioBase === anioDestino) return 1.0;
  let multiplicador = 1.0;
  if (anioBase < anioDestino) {
    for (let anio = anioBase + 1; anio <= anioDestino; anio++) {
      multiplicador *= (1 + (IPC_ANUAL_DIC[anio] || 0));
    }
  } else {
    for (let anio = anioDestino + 1; anio <= anioBase; anio++) {
      multiplicador /= (1 + (IPC_ANUAL_DIC[anio] || 0));
    }
  }
  return multiplicador;
}

export interface PersonalSituation {
  age: number;
  pagas: 12 | 14;
  hijos: number;
  hijosMenos3: number;
  hijosExclusiva: boolean;
  ascendientes: number;     // menores de 75 (o en total)
  ascendientesMayores75: number; 
  ascendientesCompartidos: number; // how many people apply the minimum 
  discapacidad: number; // 0, 33, 65
  movilidadReducida: boolean;
  movilidadGeografica: boolean;
  discapacidadDescendientes33: number; // numero de hijos
  discapacidadDescendientes65: number;
  discapacidadAscendientes33: number;
  discapacidadAscendientes65: number;
}

export const DEFAULT_PERSONAL_SITUATION: PersonalSituation = {
  age: 30,
  pagas: 12,
  hijos: 0,
  hijosMenos3: 0,
  hijosExclusiva: false,
  ascendientes: 0,
  ascendientesMayores75: 0,
  ascendientesCompartidos: 1,
  discapacidad: 0,
  movilidadReducida: false,
  movilidadGeografica: false,
  discapacidadDescendientes33: 0,
  discapacidadDescendientes65: 0,
  discapacidadAscendientes33: 0,
  discapacidadAscendientes65: 0,
};

export function calcularMinimoPersonalFamiliar(anio: number, si: PersonalSituation): number {
  let minimoPersonal = anio <= 2014 ? 5151 : 5550;
  if (si.age > 65 && si.age <= 75) minimoPersonal += 1150;
  else if (si.age > 75) minimoPersonal += 2550; // 1150 + 1400

  let minimoDescendientes = 0;
  if (si.hijos > 0) {
    if (si.hijos >= 1) minimoDescendientes += 2400;
    if (si.hijos >= 2) minimoDescendientes += 2700;
    if (si.hijos >= 3) minimoDescendientes += 4000;
    if (si.hijos >= 4) minimoDescendientes += 4500 * (si.hijos - 3);
    
    minimoDescendientes += si.hijosMenos3 * 2800;
    
    if (!si.hijosExclusiva) {
      minimoDescendientes /= 2;
    }
  }

  let minimoAscendientes = 0;
  const totalAscendientes = si.ascendientes + si.ascendientesMayores75;
  if (totalAscendientes > 0) {
    minimoAscendientes += (si.ascendientes * 1150) + (si.ascendientesMayores75 * 2550);
    if (si.ascendientesCompartidos > 1) {
       minimoAscendientes /= si.ascendientesCompartidos;
    }
  }

  let minimoDiscapacidad = 0;
  if (si.discapacidad >= 33 && si.discapacidad < 65) {
     minimoDiscapacidad += 3000;
  } else if (si.discapacidad >= 65) {
     minimoDiscapacidad += 9000;
  }
  if ((si.discapacidad >= 33 || si.discapacidad >= 65) && si.movilidadReducida) {
     minimoDiscapacidad += 3000;
  }
  
  // Discapacidad Descendientes
  const discDesc33 = si.discapacidadDescendientes33 * 3000;
  const discDesc65 = si.discapacidadDescendientes65 * 9000;
  minimoDiscapacidad += (!si.hijosExclusiva && (si.hijos > 0)) ? (discDesc33 + discDesc65) / 2 : (discDesc33 + discDesc65);

  // Discapacidad Ascendientes
  const discAsc33 = si.discapacidadAscendientes33 * 3000;
  const discAsc65 = si.discapacidadAscendientes65 * 9000;
  minimoDiscapacidad += (si.ascendientesCompartidos > 1) ? (discAsc33 + discAsc65) / si.ascendientesCompartidos : (discAsc33 + discAsc65);

  return minimoPersonal + minimoDescendientes + minimoAscendientes + minimoDiscapacidad;
}

export function obtenerParametros(anio: number, si: PersonalSituation = DEFAULT_PERSONAL_SITUATION): FiscalParameters {
  const p: any = {};

  const baseMaxMap: Record<number, number> = {
    2012: 39150.0, 2013: 41108.4, 2014: 43164.0, 2015: 43272.0, 2016: 43704.0, 2017: 45014.4, 
    2018: 45014.4, 2019: 48841.2, 2020: 48841.2, 2021: 48841.2, 2022: 49672.8, 2023: 53946.0, 
    2024: 56646.0, 2025: 58914.0, 2026: 61214.4
  };
  p.baseMax = baseMaxMap[anio] || 61214.4;

  p.ssTipos = {
    comunes: [0.236, 0.047],
    desempleo: [0.055, 0.0155],
    fogasa: [0.002, 0.0],
    fp: [0.006, 0.001],
    atep: [0.015, 0.0]
  };

  if (anio === 2023) p.mei = [0.005, 0.001];
  else if (anio === 2024) p.mei = [0.0058, 0.0012];
  else if (anio === 2025) p.mei = [0.0067, 0.0013];
  else if (anio >= 2026) p.mei = [0.0075, 0.0015];
  else p.mei = [0.0, 0.0];

  if (anio === 2025) p.solidaridad = [{ limitMultiplier: 1.10, rate: 0.0092 }, { limitMultiplier: 1.50, rate: 0.0100 }, { limitMultiplier: Infinity, rate: 0.0117 }];
  else if (anio >= 2026) p.solidaridad = [{ limitMultiplier: 1.10, rate: 0.0115 }, { limitMultiplier: 1.50, rate: 0.0125 }, { limitMultiplier: Infinity, rate: 0.0146 }];
  else p.solidaridad = [];

  p.irpfMinimo = calcularMinimoPersonalFamiliar(anio, si);
  
  const minimoExentoMap: Record<number, number> = {
    2012: 11162, 2013: 11162, 2014: 11162, 2015: 12000, 2016: 12000, 2017: 12000, 
    2018: 12643, 2019: 14000, 2020: 14000, 2021: 14000, 2022: 14000, 2023: 15000,
    2024: 15876, 2025: 15876, 2026: 15876
  };
  p.minimoExento = minimoExentoMap[anio] || 15876;
  p.gastosFijos = anio <= 2014 ? 0 : (2000 + (si.movilidadGeografica ? 2000 : 0));

  function getArt20Params(a: number) {
    if (a <= 2014) return { U_Inf: 9180, R_Max: 4080, U_Sup: 13260, R_Min: 2652 };
    if (a >= 2015 && a <= 2017) return { U_Inf: 11250, R_Max: 3700, U_Sup: 14450, R_Min: 0 };
    if (a === 2018) return { U_Inf: "Transitorio", R_Max: "Transitorio", U_Sup: "Transitorio", R_Min: "Transitorio" };
    if (a >= 2019 && a <= 2022) return { U_Inf: 13115, R_Max: 5565, U_Sup: 16825, R_Min: 0 };
    if (a === 2023) return { U_Inf: 14047.5, R_Max: 6498, U_Sup: 19747.5, R_Min: 0 };
    return { U_Inf: 14852, R_Max: 7302, U_Sup: 19747.5, R_Min: 0 };
  }
  p.art20Meta = getArt20Params(anio);

  p.reduccionTrabajo = (rnPrevio: number) => {
    if (anio <= 2014) {
      if (rnPrevio <= 9180) return 4080.0;
      if (rnPrevio <= 13260) return 4080.0 - 0.35 * (rnPrevio - 9180.0);
      return 2652.0;
    }
    if (anio >= 2015 && anio <= 2017) {
      if (rnPrevio <= 11250) return 3700.0;
      if (rnPrevio <= 14450) return 3700.0 - 1.15625 * (rnPrevio - 11250.0);
      return 0.0;
    }
    if (anio === 2018) {
      const pre = rnPrevio <= 11250 ? 3700.0 : (rnPrevio <= 14450 ? 3700.0 - 1.15625 * (rnPrevio - 11250.0) : 0.0);
      const post = rnPrevio <= 13115 ? 5565.0 : (rnPrevio <= 16825 ? Math.max(0.0, 5565.0 - 1.5 * (rnPrevio - 13115.0)) : 0.0);
      return (pre / 2.0) + (post / 2.0);
    }
    if (anio >= 2019 && anio <= 2022) {
      if (rnPrevio <= 13115) return 5565.0;
      if (rnPrevio <= 16825) return Math.max(0.0, 5565.0 - 1.5 * (rnPrevio - 13115.0));
      return 0.0;
    }
    if (anio === 2023) {
      if (rnPrevio <= 14047.5) return 6498.0;
      if (rnPrevio <= 19747.5) return Math.max(0.0, 6498.0 - 1.14 * (rnPrevio - 14047.5));
      return 0.0;
    }
    if (anio >= 2024) {
      if (rnPrevio <= 14852) return 7302.0;
      if (rnPrevio <= 17673.52) return 7302.0 - 1.75 * (rnPrevio - 14852.0);
      if (rnPrevio <= 19747.50) return 2364.34 - 1.14 * (rnPrevio - 17673.52);
      return 0.0;
    }
    return 0.0;
  };

  if (anio <= 2014) p.tramosIrpf = [{ limit: 17707, rate: 0.2475 }, { limit: 33007, rate: 0.30 }, { limit: 53407, rate: 0.40 }, { limit: 120000, rate: 0.47 }, { limit: 175000, rate: 0.49 }, { limit: 300000, rate: 0.51 }, { limit: Infinity, rate: 0.52 }];
  else if (anio === 2015) p.tramosIrpf = [{ limit: 12450, rate: 0.195 }, { limit: 20200, rate: 0.245 }, { limit: 34000, rate: 0.305 }, { limit: 60000, rate: 0.38 }, { limit: Infinity, rate: 0.46 }];
  else if (anio >= 2016 && anio <= 2020) p.tramosIrpf = [{ limit: 12450, rate: 0.19 }, { limit: 20200, rate: 0.24 }, { limit: 35200, rate: 0.30 }, { limit: 60000, rate: 0.37 }, { limit: Infinity, rate: 0.45 }];
  else p.tramosIrpf = [{ limit: 12450, rate: 0.19 }, { limit: 20200, rate: 0.24 }, { limit: 35200, rate: 0.30 }, { limit: 60000, rate: 0.37 }, { limit: 300000, rate: 0.45 }, { limit: Infinity, rate: 0.47 }];

  p.deduccionSmi = (bruto: number) => {
    if (anio === 2026) {
      if (bruto <= 17094) return 590.89;
      return Math.max(0.0, 590.89 - 0.20 * (bruto - 17094.0));
    }
    if (anio === 2025) {
      if (bruto <= 16576) return 340.0;
      if (bruto <= 18276) return Math.max(0, 340.0 - 0.20 * (bruto - 16576.0));
    }
    return 0.0;
  };

  return p as FiscalParameters;
}

export interface RetribucionFlexible {
  restaurante: number;
  transporte: number;
  guarderia: number;
  medico: number;
}

export function calcularNominaDetallada(
  bruto: number, 
  anio: number, 
  flex: RetribucionFlexible = { restaurante: 0, transporte: 0, guarderia: 0, medico: 0 },
  personalSituation: PersonalSituation = DEFAULT_PERSONAL_SITUATION
) {
  const p = obtenerParametros(anio, personalSituation);
  
  const baseCotizacion = Math.min(bruto, p.baseMax);
  const excesoBase = Math.max(0, bruto - p.baseMax);
  
  const tipoEmpresa = Object.values(p.ssTipos).reduce((acc, current) => acc + current[0], 0) + p.mei[0];
  const tipoTrabajador = Object.values(p.ssTipos).reduce((acc, current) => acc + current[1], 0) + p.mei[1];
  
  let cotEmpresa = baseCotizacion * tipoEmpresa;
  let cotTrabajador = baseCotizacion * tipoTrabajador;
  
  if (p.solidaridad && p.solidaridad.length > 0 && excesoBase > 0) {
    const l1 = p.baseMax * 0.10;
    const l2 = p.baseMax * 0.50;
    const e1 = Math.min(excesoBase, l1);
    const e2 = Math.min(Math.max(0, excesoBase - l1), l2 - l1);
    const e3 = Math.max(0, excesoBase - l2);
    const qSol = (e1 * p.solidaridad[0].rate) + (e2 * p.solidaridad[1].rate) + (e3 * p.solidaridad[2].rate);
    cotEmpresa += qSol * (5 / 6);
    cotTrabajador += qSol * (1 / 6);
  }

  const costeLaboral = bruto + cotEmpresa;
  
  // Cálculo exenciones Retribución Flexible
  const totalFlexMensual = flex.restaurante + flex.transporte + flex.guarderia + flex.medico;
  const totalFlexAnual = totalFlexMensual * 12;
  
  // Límites Legales Estimados de Exención en IRPF:
  // Restaurante: ~11€/dia * 220 dias = 2420 aprox.
  // Transporte: max 1500€/año
  // Seguro de Salud: max 500€/año
  // Guardería: 100% exento (sin límite superior específico, sujeto al 30% general)
  const exentoRestaurante = Math.min(flex.restaurante * 12, 2420);
  const exentoTransporte = Math.min(flex.transporte * 12, 1500);
  const exentoMedico = Math.min(flex.medico * 12, 500);
  const exentoGuarderia = flex.guarderia * 12;
  
  let totalExentoIrpf = exentoRestaurante + exentoTransporte + exentoMedico + exentoGuarderia;
  
  // La retribución flexible total (exenta o no) no puede superar el 30% del salario base
  if (totalFlexAnual > bruto * 0.30) {
    totalExentoIrpf = Math.min(totalExentoIrpf, bruto * 0.30);
  }

  const brutoIrpf = bruto - totalExentoIrpf;
  const rnPrevioSinFijos = brutoIrpf - cotTrabajador;
  const redTrabajo = p.reduccionTrabajo(rnPrevioSinFijos);
  const rendimientoNeto = Math.max(0, rnPrevioSinFijos - p.gastosFijos);
  const baseImponible = Math.max(0, rendimientoNeto - redTrabajo);
  
  let cuotaIntegra = 0.0;
  let limAnt = 0.0;
  for (const t of p.tramosIrpf) {
    if (baseImponible > t.limit) {
      cuotaIntegra += (t.limit - limAnt) * t.rate;
      limAnt = t.limit;
    } else {
      cuotaIntegra += (baseImponible - limAnt) * t.rate;
      break;
    }
  }
  
  const cuotaMinimo = p.irpfMinimo * p.tramosIrpf[0].rate;
  const cuotaTeorica = Math.max(0, cuotaIntegra - cuotaMinimo);
  const deduccion = p.deduccionSmi(bruto);
  const cuotaTrasSmi = Math.max(0, cuotaTeorica - deduccion);
  const limiteRetencion = Math.max(0, (bruto - p.minimoExento) * 0.43);
  const irpfFinal = Math.min(cuotaTrasSmi, limiteRetencion);
  
  const netoTotal = bruto - cotTrabajador - irpfFinal; // Valor total que percibe (Cash + Especie)
  const netoLiquido = netoTotal - totalFlexAnual; // Liquido a ingresar en banco (Cash)
  
  return {
    bruto,
    brutoIrpf,
    anio,
    cotEmpresa,
    cotTrabajador,
    costeLaboral,
    rendimientoNeto,
    redTrabajo,
    baseImponible,
    cuotaIntegra,
    cuotaMinimo,
    cuotaTeorica,
    deduccionSmi: deduccion,
    irpfFinal,
    neto: netoTotal, // for backwards compatibility
    netoTotal,
    netoLiquido,
    totalFlexAnual,
    totalExentoIrpf,
    mensual12: netoLiquido / 12,
    mensual14: netoLiquido / 14,
    mensual12Total: netoTotal / 12,
    mensual14Total: netoTotal / 14,
    porcentajeRetencion: (irpfFinal / bruto) * 100 || 0,
    porcentajeSS: (cotTrabajador / bruto) * 100 || 0,
  };
}
