/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  Calculator, 
  TrendingDown, 
  TrendingUp, 
  Info, 
  History, 
  Euro,
  FileText,
  RefreshCw,
  Coffee,
  Bus,
  Baby,
  HeartPulse,
  Check,
  Users
} from 'lucide-react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip as RechartsTooltip, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Legend,
  AreaChart,
  Area 
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { calcularNominaDetallada, obtenerInflacionAcumulada, obtenerParametros, RetribucionFlexible, PersonalSituation, DEFAULT_PERSONAL_SITUATION } from './lib/calculator';

const YEARS = Array.from({ length: 2026 - 2012 + 1 }, (_, i) => 2012 + i);

const COLORS = {
  neto: '#10b981', // green-500
  espe: '#f59e0b', // amber-500
  irpf: '#ef4444', // red-500
  ss: '#3b82f6', // blue-500
  coste: '#6366f1', // indigo-500
};

export default function App() {
  const [bruto, setBruto] = useState<number>(35000);
  const [anio, setAnio] = useState<number>(2024);
  const [view, setView] = useState<'summary' | 'comparison' | 'parameters'>('summary');

  const [flexEnabled, setFlexEnabled] = useState(false);
  const [flex, setFlex] = useState<RetribucionFlexible>({
    restaurante: 0,
    transporte: 0,
    guarderia: 0,
    medico: 0
  });

  const [personal, setPersonal] = useState<PersonalSituation>(DEFAULT_PERSONAL_SITUATION);

  const baseResult = useMemo(() => calcularNominaDetallada(bruto, anio, undefined, undefined), [bruto, anio]);
  const result = useMemo(() => calcularNominaDetallada(bruto, anio, flexEnabled ? flex : undefined, personal), [bruto, anio, flexEnabled, flex, personal]);

  const ahorroFiscalAnual = baseResult.irpfFinal - result.irpfFinal;

  const historicalData = useMemo(() => {
    return YEARS.map(y => {
      const res = calcularNominaDetallada(bruto, y, flexEnabled ? flex : undefined, personal);
      const inflacion = obtenerInflacionAcumulada(y, 2026);
      return {
        anio: y,
        neto: res.neto,
        netoReal2026: res.neto * inflacion,
        irpf: res.irpfFinal,
        ss: res.cotTrabajador,
        inflacionPct: (inflacion - 1) * 100
      };
    });
  }, [bruto]);

  const pieData = result.totalFlexAnual > 0 ? [
    { name: 'Sueldo Líquido (Cash)', value: result.netoLiquido, color: COLORS.neto },
    { name: 'Retribución Flexible', value: result.totalFlexAnual, color: COLORS.espe },
    { name: 'Retención IRPF', value: result.irpfFinal, color: COLORS.irpf },
    { name: 'Seguridad Social', value: result.cotTrabajador, color: COLORS.ss },
  ] : [
    { name: 'Sueldo Neto', value: result.netoLiquido, color: COLORS.neto },
    { name: 'Retención IRPF', value: result.irpfFinal, color: COLORS.irpf },
    { name: 'Seguridad Social', value: result.cotTrabajador, color: COLORS.ss },
  ];

  const formatEuro = (val: number) => 
    new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(val);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans p-4 md:p-8">
      <header className="max-w-6xl mx-auto mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-800 flex items-center gap-3">
            <Calculator className="w-8 h-8 text-indigo-600" />
            Calculadora IRPF Histórica
          </h1>
          <p className="text-slate-500 mt-1">Análisis detallado de fiscalidad y poder adquisitivo en España (2012-2026)</p>
        </div>
        
        <div className="flex bg-white rounded-xl shadow-sm p-1 border border-slate-200">
          <button 
            onClick={() => setView('summary')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${view === 'summary' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'}`}
          >
            Resumen
          </button>
          <button 
            onClick={() => setView('comparison')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${view === 'comparison' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'}`}
          >
            Evolución
          </button>
          <button 
            onClick={() => setView('parameters')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${view === 'parameters' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'}`}
          >
            Parámetros
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Controls Panel */}
        <section className="lg:col-span-4 space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-indigo-500" />
              Configuración
            </h2>
            
            <div className="space-y-8">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Salario Bruto Anual
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium">€</span>
                  <input 
                    type="number" 
                    value={bruto}
                    onChange={(e) => setBruto(Number(e.target.value))}
                    className="w-full pl-8 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-mono text-lg"
                  />
                </div>
                <input 
                  type="range" 
                  min="0" 
                  max="150000" 
                  step="1000"
                  value={bruto}
                  onChange={(e) => setBruto(Number(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer mt-4 accent-indigo-600"
                />
                <div className="flex justify-between text-[10px] text-slate-400 mt-1 uppercase tracking-wider font-bold">
                  <span>0€</span>
                  <span>150.000€</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-4">
                  Año de Cálculo
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {YEARS.map(y => (
                    <button
                      key={y}
                      onClick={() => setAnio(y)}
                      className={`py-2 rounded-lg text-xs font-semibold border transition-all ${
                        anio === y 
                          ? 'bg-indigo-50 border-indigo-500 text-indigo-700 shadow-sm ring-1 ring-indigo-500' 
                          : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                      }`}
                    >
                      {y}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100">
                <details className="group">
                  <summary className="flex items-center justify-between cursor-pointer list-none text-sm font-medium text-slate-700 mb-4">
                    <span className="flex items-center gap-2"><Users className="w-4 h-4" /> Datos Personales y Familiares</span>
                    <span className="transition group-open:rotate-180">
                      <svg fill="none" height="24" shapeRendering="geometricPrecision" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" viewBox="0 0 24 24" width="24"><path d="M6 9l6 6 6-6"></path></svg>
                    </span>
                  </summary>
                  <div className="text-slate-600 mt-3 group-open:animate-fadeIn grid grid-cols-1 gap-4">
                     <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-xs text-slate-500">Edad</label>
                          <input type="number" min="16" max="120" value={personal.age} onChange={e => setPersonal({...personal, age: Number(e.target.value)})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                        </div>
                     </div>
                     <div className="space-y-2 mt-2">
                       <p className="text-xs font-bold text-slate-600 border-b border-slate-100 pb-1">Descendientes</p>
                       <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-xs text-slate-500">Hijos a cargo {"<"} 25 años</label>
                            <input type="number" min="0" max="15" value={personal.hijos} onChange={e => setPersonal({...personal, hijos: Number(e.target.value)})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs text-slate-500">Hijos {"<"} 3 años</label>
                            <input type="number" min="0" max="15" value={personal.hijosMenos3} onChange={e => setPersonal({...personal, hijosMenos3: Number(e.target.value)})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                          </div>
                          <div className="space-y-1 col-span-2 flex items-center gap-2">
                            <input type="checkbox" id="hijosExclusiva" checked={personal.hijosExclusiva} onChange={e => setPersonal({...personal, hijosExclusiva: e.target.checked})} className="rounded text-indigo-600" />
                            <label htmlFor="hijosExclusiva" className="text-xs text-slate-500">Tengo los hijos en exclusiva a efectos fiscales (familia monoparental o custodia íntegra)</label>
                          </div>
                       </div>
                     </div>
                     <div className="space-y-2 mt-2">
                       <p className="text-xs font-bold text-slate-600 border-b border-slate-100 pb-1">Ascendientes a cargo</p>
                       <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-xs text-slate-500">Menores de 75 años</label>
                            <input type="number" min="0" max="10" value={personal.ascendientes} onChange={e => setPersonal({...personal, ascendientes: Number(e.target.value)})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs text-slate-500">Mayores de 75 años</label>
                            <input type="number" min="0" max="10" value={personal.ascendientesMayores75} onChange={e => setPersonal({...personal, ascendientesMayores75: Number(e.target.value)})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                          </div>
                          <div className="space-y-1 col-span-2">
                            <label className="text-xs text-slate-500">¿Cuántas personas se aplican este mínimo? (ej. hermanos compartiendo el cuidado)</label>
                            <input type="number" min="1" max="10" value={personal.ascendientesCompartidos} onChange={e => setPersonal({...personal, ascendientesCompartidos: Number(e.target.value)})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                          </div>
                       </div>
                     </div>
                     <div className="space-y-2 mt-2">
                       <p className="text-xs font-bold text-slate-600 border-b border-slate-100 pb-1">Discapacidad</p>
                       <div className="space-y-1">
                          <label className="text-xs text-slate-500">Grado de discapacidad (Contribuyente)</label>
                          <select value={personal.discapacidad} onChange={e => setPersonal({...personal, discapacidad: Number(e.target.value)})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none">
                            <option value={0}>Menos del 33% (Ninguna)</option>
                            <option value={33}>Entre 33% y 65%</option>
                            <option value={65}>Igual o superior al 65%</option>
                          </select>
                       </div>
                       <div className="space-y-1 col-span-2 flex items-center gap-2 mt-1">
                         <input type="checkbox" id="movilidadReducida" checked={personal.movilidadReducida} onChange={e => setPersonal({...personal, movilidadReducida: e.target.checked})} className="rounded text-indigo-600" />
                         <label htmlFor="movilidadReducida" className="text-xs text-slate-500">Tiene acreditada necesidad de ayuda de terceras personas o movilidad reducida</label>
                       </div>
                     </div>
                     <div className="space-y-2 mt-2">
                       <p className="text-xs font-bold text-slate-600 border-b border-slate-100 pb-1">Otros</p>
                       <div className="space-y-1 col-span-2 flex items-center gap-2">
                         <input type="checkbox" id="movilidadGeografica" checked={personal.movilidadGeografica} onChange={e => setPersonal({...personal, movilidadGeografica: e.target.checked})} className="rounded text-indigo-600" />
                         <label htmlFor="movilidadGeografica" className="text-xs text-slate-500">He aceptado un puesto de trabajo en otro municipio (*aplica reducción por Movilidad Geográfica)</label>
                       </div>
                     </div>
                  </div>
                </details>
              </div>

              <div className="pt-4 border-t border-slate-100">
                <div className="flex items-center justify-between mb-4">
                  <label className="text-sm font-medium text-slate-700">
                    Retribución Flexible (Mensual)
                  </label>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer"
                      checked={flexEnabled}
                      onChange={(e) => setFlexEnabled(e.target.checked)}
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>

                <AnimatePresence>
                  {flexEnabled && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="grid grid-cols-1 md:grid-cols-2 gap-4 overflow-hidden"
                    >
                      <div className="space-y-1">
                        <label className="text-xs text-slate-500 flex items-center gap-1"><Coffee className="w-3 h-3"/> Restaurante</label>
                        <div className="relative">
                          <input type="number" min="0" value={flex.restaurante} onChange={e => setFlex({...flex, restaurante: Number(e.target.value)})} className="w-full pl-3 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">€/mes</span>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-slate-500 flex items-center gap-1"><Bus className="w-3 h-3"/> Transporte</label>
                        <div className="relative">
                          <input type="number" min="0" value={flex.transporte} onChange={e => setFlex({...flex, transporte: Number(e.target.value)})} className="w-full pl-3 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">€/mes</span>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-slate-500 flex items-center gap-1"><Baby className="w-3 h-3"/> Guardería</label>
                        <div className="relative">
                          <input type="number" min="0" value={flex.guarderia} onChange={e => setFlex({...flex, guarderia: Number(e.target.value)})} className="w-full pl-3 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">€/mes</span>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-slate-500 flex items-center gap-1"><HeartPulse className="w-3 h-3"/> Seguro Médico</label>
                        <div className="relative">
                          <input type="number" min="0" value={flex.medico} onChange={e => setFlex({...flex, medico: Number(e.target.value)})} className="w-full pl-3 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">€/mes</span>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

        </section>

        {/* Content Panel */}
        <section className="lg:col-span-8">
          <AnimatePresence mode="wait">
            {view === 'summary' && (
              <motion.div 
                key="summary"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Distribución Anual</h3>
                    <div className="h-[240px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={pieData}
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                            stroke="none"
                          >
                            {pieData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <RechartsTooltip 
                            formatter={(value: number) => formatEuro(value)}
                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="mt-4 space-y-2">
                       {pieData.map(item => (
                         <div key={item.name} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                              <span className="text-sm text-slate-600">{item.name}</span>
                            </div>
                            <span className="text-sm font-mono font-bold text-slate-800">{formatEuro(item.value)}</span>
                         </div>
                       ))}
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                      <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Presión Fiscal Bruta</p>
                        <p className="text-2xl font-black text-slate-800 mt-1">{(result.porcentajeRetencion + result.porcentajeSS).toFixed(2)}%</p>
                      </div>
                      <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center">
                        <TrendingDown className="w-6 h-6 text-red-500" />
                      </div>
                    </div>

                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                      <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Detalle IRPF</h3>
                      <div className="space-y-3">
                        <div className="flex justify-between text-sm items-center">
                          <span className="text-slate-500">Base Imponible IRPF</span>
                          <span className="font-mono">{formatEuro(result.baseImponible)}</span>
                        </div>
                        {result.totalExentoIrpf > 0 && (
                          <div className="flex justify-between text-sm items-center">
                            <span className="text-slate-500 text-xs pl-4 text-emerald-600 flex items-center gap-1">
                              <Check className="w-3 h-3"/> Exención Ret. Flexible
                            </span>
                            <span className="text-emerald-600 font-medium font-mono">-{formatEuro(result.totalExentoIrpf)}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-sm items-center">
                          <span className="text-slate-500 text-xs pl-4">Reducción Art. 20</span>
                          <span className="text-indigo-600 font-medium font-mono">-{formatEuro(result.redTrabajo)}</span>
                        </div>
                        <div className="flex justify-between text-sm items-center">
                          <span className="text-slate-500 text-xs pl-4 text-emerald-600">Deducción SMI / Otros</span>
                          <span className="text-emerald-600 font-medium font-mono">-{formatEuro(result.deduccionSmi)}</span>
                        </div>
                        <div className="pt-2 mt-2 border-t border-slate-100 flex justify-between items-center">
                          <span className="font-bold text-slate-800">Cuota Líquida</span>
                          <span className="font-mono font-bold text-red-600">{formatEuro(result.irpfFinal)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {flexEnabled && result.totalFlexAnual > 0 && (
                    <div className="bg-amber-50 p-6 rounded-2xl border border-amber-100 md:col-span-2 flex flex-col md:flex-row justify-between items-center gap-4">
                      <div className="flex gap-4 items-center">
                        <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center shrink-0">
                          <Coffee className="w-5 h-5 text-amber-600" />
                        </div>
                        <div>
                          <h4 className="font-bold text-amber-900">Total Retribución Flexible</h4>
                          <p className="text-amber-700 text-sm">Disfrutas de un valor anual en servicios exentos.</p>
                        </div>
                      </div>
                      <div className="text-2xl font-black text-amber-900 font-mono">
                        {formatEuro(result.totalFlexAnual)}
                      </div>
                    </div>
                  )}

                  <div className={`p-6 rounded-2xl border ${flexEnabled && result.totalFlexAnual > 0 ? "bg-slate-50 border-slate-200" : "bg-emerald-50 border-emerald-100 md:col-span-2"}`}>
                    <div className="flex gap-4">
                      <div className={`w-10 h-10 ${flexEnabled && result.totalFlexAnual > 0 ? "bg-slate-200" : "bg-emerald-100"} rounded-full flex items-center justify-center shrink-0`}>
                        <TrendingUp className={`w-6 h-6 ${flexEnabled && result.totalFlexAnual > 0 ? "text-slate-600" : "text-emerald-600"}`} />
                      </div>
                      <div>
                        <h4 className={`font-bold ${flexEnabled && result.totalFlexAnual > 0 ? "text-slate-800" : "text-emerald-900"}`}>Líquido Ingresado en Banco</h4>
                        <p className={`text-sm mt-1 ${flexEnabled && result.totalFlexAnual > 0 ? "text-slate-500" : "text-emerald-700"}`}>Cash contante y sonante disponible en cuenta anualmente.</p>
                        <p className={`text-3xl font-black mt-2 font-mono ${flexEnabled && result.totalFlexAnual > 0 ? "text-slate-800" : "text-emerald-900"}`}>{formatEuro(result.netoLiquido)}</p>
                      </div>
                    </div>
                  </div>

                  {flexEnabled && result.totalFlexAnual > 0 && (
                    <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-100">
                      <div className="flex gap-4">
                        <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center shrink-0">
                          <TrendingUp className="w-6 h-6 text-emerald-600" />
                        </div>
                        <div>
                          <h4 className="font-bold text-emerald-900">Valor Neto Real Anual</h4>
                          <p className="text-emerald-700 text-sm mt-1">Líquido en banco + Especie (Ret. Flexible).</p>
                          <p className="text-3xl font-black text-emerald-900 mt-2 font-mono">{formatEuro(result.netoTotal)}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className={`bg-indigo-900 text-white p-6 rounded-2xl shadow-lg relative overflow-hidden ${flexEnabled && ahorroFiscalAnual > 0 ? 'md:col-span-1' : 'md:col-span-2'}`}>
                    <div className="relative z-10">
                      <p className="text-indigo-200 text-sm font-medium flex items-center gap-1">
                        Líquido Mensual (12 pagas)
                      </p>
                      <div className="text-4xl font-black mt-2 font-mono">
                        {formatEuro(result.mensual12)}
                      </div>
                      <div className="mt-4 flex flex-wrap items-center gap-2">
                        <div className="text-xs font-medium bg-white/10 w-fit px-3 py-1.5 rounded-full border border-white/10 flex items-center gap-2">
                          <Euro className="w-3 h-3" />
                          {formatEuro(result.mensual14)} x 14 pagas
                        </div>
                      </div>
                    </div>
                    <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-indigo-500/20 rounded-full blur-3xl"></div>
                  </div>

                  {flexEnabled && ahorroFiscalAnual > 0 && (
                    <div className="bg-gradient-to-br from-emerald-400 to-emerald-600 text-white p-6 rounded-2xl shadow-md relative overflow-hidden md:col-span-1 flex flex-col justify-center">
                      <div className="relative z-10 flex items-start sm:items-center gap-4 sm:flex-row flex-col">
                        <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center shrink-0">
                          <Check className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <p className="font-bold text-lg">Ahorro Fiscal Anual</p>
                          <p className="text-emerald-100 text-sm leading-tight mt-1">Estás ahorrando <strong>{formatEuro(ahorroFiscalAnual)}</strong> en impuestos ({formatEuro(ahorroFiscalAnual/12)}/mes).</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {view === 'comparison' && (
              <motion.div 
                key="comparison"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <h3 className="text-lg font-bold text-slate-800 mb-2 flex items-center gap-2">
                    <History className="w-5 h-5 text-indigo-500" />
                    Evolución del Poder Adquisitivo
                  </h3>
                  <p className="text-slate-500 text-sm mb-6">Comparativa del salario neto ajustado por la inflación acumulada (IPC) base 2026.</p>
                  
                  <div className="h-[400px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={historicalData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorNeto" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={COLORS.neto} stopOpacity={0.1}/>
                            <stop offset="95%" stopColor={COLORS.neto} stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="colorReal" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={COLORS.coste} stopOpacity={0.1}/>
                            <stop offset="95%" stopColor={COLORS.coste} stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="anio" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={(val) => `${val/1000}k`} />
                        <RechartsTooltip 
                          formatter={(value: number) => formatEuro(value)}
                          labelStyle={{ fontWeight: 'bold' }}
                          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                        />
                        <Area type="monotone" dataKey="neto" name="Neto Nominal" stroke={COLORS.neto} strokeWidth={3} fillOpacity={1} fill="url(#colorNeto)" />
                        <Area type="monotone" dataKey="netoReal2026" name="Poder Adq. en 2026" stroke={COLORS.coste} strokeWidth={3} strokeDasharray="5 5" fillOpacity={1} fill="url(#colorReal)" />
                        <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-md overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400">
                        <th className="pb-3 pr-4 font-semibold uppercase tracking-wider text-[10px]">Año</th>
                        <th className="pb-3 pr-4 font-semibold uppercase tracking-wider text-[10px]">Nominal</th>
                        <th className="pb-3 pr-4 font-semibold uppercase tracking-wider text-[10px]">IPC Acum.</th>
                        <th className="pb-3 pr-4 font-semibold uppercase tracking-wider text-[10px]">Neto Real (2026)</th>
                        <th className="pb-3 font-semibold uppercase tracking-wider text-[10px]">Pérdida/Ganancia vs 2026</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                      {historicalData.map(d => {
                        const diff = d.netoReal2026 - historicalData[historicalData.length - 1].neto;
                        return (
                          <tr key={d.anio} className="hover:bg-white/5 transition-colors">
                            <td className="py-3 pr-4 font-bold">{d.anio}</td>
                            <td className="py-3 pr-4 font-mono text-slate-300">{formatEuro(d.neto)}</td>
                            <td className="py-3 pr-4 text-slate-400">+{d.inflacionPct.toFixed(1)}%</td>
                            <td className="py-3 pr-4 font-mono text-emerald-400 font-bold">{formatEuro(d.netoReal2026)}</td>
                            <td className={`py-3 font-mono font-bold ${diff >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                              {diff > 0 ? '+' : ''}{formatEuro(diff)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}

            {view === 'parameters' && (
              <motion.div 
                key="parameters"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                       <FileText className="w-4 h-4" />
                       Tramos IRPF {anio}
                    </h3>
                    <div className="space-y-4">
                      {obtenerParametros(anio).tramosIrpf.map((t, i, arr) => {
                        const start = i === 0 ? 0 : arr[i-1].limit;
                        const end = t.limit === Infinity ? 'En adelante' : formatEuro(t.limit);
                        return (
                          <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                            <div>
                              <p className="text-[10px] text-slate-400 font-bold uppercase">De {formatEuro(start)} hasta</p>
                              <p className="text-sm font-bold text-slate-700">{end}</p>
                            </div>
                            <div className="bg-indigo-600 text-white px-3 py-1 rounded-lg font-mono text-sm font-bold shadow-sm">
                              {(t.rate * 100).toFixed(2)}%
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                      <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <Info className="w-4 h-4" />
                        Seguridad Social
                      </h3>
                      <div className="space-y-4">
                        <div className="flex justify-between items-end border-b border-slate-100 pb-2">
                          <span className="text-sm text-slate-500">Base Máxima Anual</span>
                          <span className="font-mono font-bold text-slate-800">{formatEuro(obtenerParametros(anio).baseMax)}</span>
                        </div>
                        <div className="flex justify-between items-end border-b border-slate-100 pb-2">
                          <span className="text-sm text-slate-500">Aportación MEI (Emp.)</span>
                          <span className="font-mono font-bold text-indigo-600">{(obtenerParametros(anio).mei[1] * 100).toFixed(3)}%</span>
                        </div>
                        <div className="flex justify-between items-end border-b border-slate-100 pb-2">
                           <span className="text-sm text-slate-500">Cuota Solidaridad</span>
                           <span className="font-bold text-slate-800">{obtenerParametros(anio).solidaridad.length > 0 ? 'Activa' : 'No disponible'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-amber-50 p-6 rounded-2xl border border-amber-100">
                      <h4 className="text-xs font-bold text-amber-800 uppercase tracking-widest mb-2 flex items-center gap-2">
                        <Info className="w-4 h-4" />
                        Nota Técnica {anio}
                      </h4>
                      <p className="text-xs text-amber-700 leading-relaxed">
                        Los cálculos incluyen el Mínimo Personal y Familiar de <strong>{formatEuro(obtenerParametros(anio).irpfMinimo)}</strong>. 
                        Se aplica una reducción por gastos fijos de <strong>{formatEuro(obtenerParametros(anio).gastosFijos)}</strong> anuales. 
                        Los tramos corresponden a la escala estatal aplicable de forma simplificada.
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      </main>

      <footer className="max-w-6xl mx-auto mt-12 pt-8 border-t border-slate-200 text-center">
        <p className="text-slate-400 text-xs flex items-center justify-center gap-2">
          Hecho con ❤️ para el análisis fiscal • Datos basados en la normativa vigente en cada ejercicio.
        </p>
        <p className="text-slate-300 text-[10px] mt-2 max-w-2xl mx-auto">
          Esta herramienta es informativa. Los resultados son estimaciones basadas en perfiles de contribuyente soltero, sin hijos y menor de 65 años, sin otras circunstancias personales que puedan dar derecho a deducciones adicionales.
        </p>
      </footer>
    </div>
  );
}
