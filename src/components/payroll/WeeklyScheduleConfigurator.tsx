'use client';

import { useState } from 'react';
import { Button, Card, CardHeader, CardTitle, CardContent } from '@/components/ui';
import { Clock, Plus, Trash2, Calendar, CheckCircle, XCircle, AlertTriangle, AlertCircle, ShieldCheck } from 'lucide-react';

interface DaySchedule {
  isWorkingDay: boolean;
  startTime: string;
  endTime: string;
  lunchDuration: number; // minutos
  hasLunch: boolean;
}

interface WeeklySchedule {
  monday: DaySchedule;
  tuesday: DaySchedule;
  wednesday: DaySchedule;
  thursday: DaySchedule;
  friday: DaySchedule;
  saturday: DaySchedule;
  sunday: DaySchedule;
}

interface WeeklyScheduleConfiguratorProps {
  initialSchedule?: Partial<WeeklySchedule>;
  onScheduleChange: (schedule: WeeklySchedule, summary: ScheduleSummary) => void;
}

interface ScheduleSummary {
  totalWeeklyHours: number;
  workingDays: string[];
  workingDaysCount: number;
  averageDailyHours: number;
  scheduleText: string;
  calculationDetails: string;
  legalValidation: LegalValidation;
}

interface LegalValidation {
  isValid: boolean;
  warnings: string[];
  errors: string[];
  maxDailyHours: number;
  hasRestDay: boolean;
  exceedsWeeklyLimit: boolean;
}

const DAYS = {
  monday: 'Lunes',
  tuesday: 'Martes', 
  wednesday: 'Miércoles',
  thursday: 'Jueves',
  friday: 'Viernes',
  saturday: 'Sábado',
  sunday: 'Domingo'
} as const;

const DEFAULT_DAY: DaySchedule = {
  isWorkingDay: false,
  startTime: '09:00',
  endTime: '18:00',
  lunchDuration: 60,
  hasLunch: true
};

export const WeeklyScheduleConfigurator = ({ initialSchedule, onScheduleChange }: WeeklyScheduleConfiguratorProps) => {
  const [schedule, setSchedule] = useState<WeeklySchedule>({
    monday: { ...DEFAULT_DAY, isWorkingDay: true },
    tuesday: { ...DEFAULT_DAY, isWorkingDay: true },
    wednesday: { ...DEFAULT_DAY, isWorkingDay: true },
    thursday: { ...DEFAULT_DAY, isWorkingDay: true },
    friday: { ...DEFAULT_DAY, isWorkingDay: true },
    saturday: { ...DEFAULT_DAY, isWorkingDay: false },
    sunday: { ...DEFAULT_DAY, isWorkingDay: false },
    ...initialSchedule
  });

  // Calcular horas de un día
  const calculateDayHours = (daySchedule: DaySchedule): number => {
    if (!daySchedule.isWorkingDay) return 0;
    
    const [startHour, startMin] = daySchedule.startTime.split(':').map(Number);
    const [endHour, endMin] = daySchedule.endTime.split(':').map(Number);
    
    const startTotalMinutes = startHour * 60 + startMin;
    const endTotalMinutes = endHour * 60 + endMin;
    const workMinutes = endTotalMinutes - startTotalMinutes;
    
    const lunchMinutes = daySchedule.hasLunch ? daySchedule.lunchDuration : 0;
    const effectiveMinutes = workMinutes - lunchMinutes;
    
    return Math.max(0, effectiveMinutes / 60);
  };

  // Validar según normativa laboral chilena
  const validateLegalCompliance = (currentSchedule: WeeklySchedule, totalHours: number): LegalValidation => {
    const warnings: string[] = [];
    const errors: string[] = [];
    let maxDailyHours = 0;
    let hasRestDay = false;

    // Constantes legales chilenas
    const MAX_WEEKLY_HOURS = 44;
    const MAX_DAILY_HOURS = 10;
    const MIN_LUNCH_TIME = 30; // minutos
    const MIN_LUNCH_TRIGGER = 6; // horas para requerir colación

    // Verificar día de descanso
    const workingDaysCount = Object.values(currentSchedule).filter(day => day.isWorkingDay).length;
    hasRestDay = workingDaysCount < 7;

    // Validar cada día
    Object.entries(currentSchedule).forEach(([dayKey, daySchedule]) => {
      if (!daySchedule.isWorkingDay) return;

      const dayHours = calculateDayHours(daySchedule);
      maxDailyHours = Math.max(maxDailyHours, dayHours);

      // Error: Más de 10 horas diarias (ilegal)
      if (dayHours > MAX_DAILY_HOURS) {
        errors.push(`${DAYS[dayKey as keyof typeof DAYS]}: ${dayHours.toFixed(1)}h excede las 10h máximas diarias`);
      }

      // Warning: Más de 8 horas (requiere horas extras)
      if (dayHours > 8 && dayHours <= MAX_DAILY_HOURS) {
        warnings.push(`${DAYS[dayKey as keyof typeof DAYS]}: ${dayHours.toFixed(1)}h requiere autorización horas extraordinarias`);
      }

      // Error: Colación insuficiente para jornadas largas
      if (dayHours >= MIN_LUNCH_TRIGGER && (!daySchedule.hasLunch || daySchedule.lunchDuration < MIN_LUNCH_TIME)) {
        errors.push(`${DAYS[dayKey as keyof typeof DAYS]}: Jornada ≥6h requiere mínimo ${MIN_LUNCH_TIME}min de colación`);
      }
    });

    // Error: Más de 44 horas semanales
    const exceedsWeeklyLimit = totalHours > MAX_WEEKLY_HOURS;
    if (exceedsWeeklyLimit) {
      errors.push(`${totalHours}h semanales excede las ${MAX_WEEKLY_HOURS}h máximas legales`);
    }

    // Warning: Cerca del límite semanal
    if (totalHours > MAX_WEEKLY_HOURS * 0.9 && !exceedsWeeklyLimit) {
      warnings.push(`${totalHours}h cerca del límite semanal (${MAX_WEEKLY_HOURS}h)`);
    }

    // Error: Sin día de descanso
    if (!hasRestDay) {
      errors.push('Debe haber al menos 1 día de descanso semanal');
    }

    // Warning: Solo 1 día de descanso con jornadas largas
    if (workingDaysCount === 6 && maxDailyHours > 7) {
      warnings.push('6 días laborables con jornadas largas puede causar fatiga');
    }

    return {
      isValid: errors.length === 0,
      warnings,
      errors,
      maxDailyHours,
      hasRestDay,
      exceedsWeeklyLimit
    };
  };

  // Calcular resumen semanal
  const calculateSummary = (currentSchedule: WeeklySchedule): ScheduleSummary => {
    const workingDays: string[] = [];
    let totalHours = 0;

    Object.entries(currentSchedule).forEach(([key, daySchedule]) => {
      if (daySchedule.isWorkingDay) {
        workingDays.push(DAYS[key as keyof typeof DAYS]);
        totalHours += calculateDayHours(daySchedule);
      }
    });

    const workingDaysCount = workingDays.length;
    const averageDailyHours = workingDaysCount > 0 ? totalHours / workingDaysCount : 0;

    // Generar texto descriptivo
    let scheduleText = '';
    if (workingDaysCount === 5 && workingDays.includes('Lunes') && workingDays.includes('Viernes') && !workingDays.includes('Sábado')) {
      scheduleText = 'lunes a viernes';
    } else if (workingDaysCount === 6 && workingDays.includes('Lunes') && workingDays.includes('Sábado') && !workingDays.includes('Domingo')) {
      scheduleText = 'lunes a sábado';
    } else if (workingDaysCount === 7) {
      scheduleText = 'lunes a domingo';
    } else if (workingDaysCount > 0) {
      scheduleText = workingDays.join(', ').toLowerCase();
    } else {
      scheduleText = 'sin días laborables';
    }

    // Detalles de cálculo
    const calculationParts = Object.entries(currentSchedule)
      .filter(([_, daySchedule]) => daySchedule.isWorkingDay)
      .map(([key, daySchedule]) => {
        const dayName = DAYS[key as keyof typeof DAYS];
        const hours = calculateDayHours(daySchedule);
        const lunchText = daySchedule.hasLunch ? ` - ${daySchedule.lunchDuration}min colación` : '';
        return `${dayName}: ${daySchedule.startTime} a ${daySchedule.endTime}${lunchText} = ${hours.toFixed(1)}h`;
      });

    const calculationDetails = calculationParts.join(' | ');

    // Validación legal
    const legalValidation = validateLegalCompliance(currentSchedule, Math.round(totalHours * 10) / 10);

    return {
      totalWeeklyHours: Math.round(totalHours * 10) / 10,
      workingDays,
      workingDaysCount,
      averageDailyHours: Math.round(averageDailyHours * 10) / 10,
      scheduleText,
      calculationDetails,
      legalValidation
    };
  };

  // Actualizar un día específico
  const updateDay = (day: keyof WeeklySchedule, updates: Partial<DaySchedule>) => {
    const newSchedule = {
      ...schedule,
      [day]: { ...schedule[day], ...updates }
    };
    setSchedule(newSchedule);
    
    const summary = calculateSummary(newSchedule);
    onScheduleChange(newSchedule, summary);
  };

  // Toggle día laborable
  const toggleWorkingDay = (day: keyof WeeklySchedule) => {
    updateDay(day, { isWorkingDay: !schedule[day].isWorkingDay });
  };

  // Presets rápidos
  const applyPreset = (preset: 'standard' | 'sixDays' | 'weekend' | 'partTime' | 'overtime') => {
    let newSchedule: WeeklySchedule;
    
    switch (preset) {
      case 'standard':
        newSchedule = {
          monday: { ...DEFAULT_DAY, isWorkingDay: true },
          tuesday: { ...DEFAULT_DAY, isWorkingDay: true },
          wednesday: { ...DEFAULT_DAY, isWorkingDay: true },
          thursday: { ...DEFAULT_DAY, isWorkingDay: true },
          friday: { ...DEFAULT_DAY, isWorkingDay: true },
          saturday: { ...DEFAULT_DAY, isWorkingDay: false },
          sunday: { ...DEFAULT_DAY, isWorkingDay: false }
        };
        break;
      case 'sixDays':
        newSchedule = {
          monday: { ...DEFAULT_DAY, isWorkingDay: true },
          tuesday: { ...DEFAULT_DAY, isWorkingDay: true },
          wednesday: { ...DEFAULT_DAY, isWorkingDay: true },
          thursday: { ...DEFAULT_DAY, isWorkingDay: true },
          friday: { ...DEFAULT_DAY, isWorkingDay: true },
          saturday: { ...DEFAULT_DAY, isWorkingDay: true },
          sunday: { ...DEFAULT_DAY, isWorkingDay: false }
        };
        break;
      case 'weekend':
        newSchedule = {
          monday: { ...DEFAULT_DAY, isWorkingDay: false },
          tuesday: { ...DEFAULT_DAY, isWorkingDay: false },
          wednesday: { ...DEFAULT_DAY, isWorkingDay: false },
          thursday: { ...DEFAULT_DAY, isWorkingDay: false },
          friday: { ...DEFAULT_DAY, isWorkingDay: false },
          saturday: { ...DEFAULT_DAY, isWorkingDay: true },
          sunday: { ...DEFAULT_DAY, isWorkingDay: true }
        };
        break;
      case 'partTime':
        newSchedule = {
          monday: { ...DEFAULT_DAY, isWorkingDay: true, startTime: '09:00', endTime: '14:00', lunchDuration: 30 },
          tuesday: { ...DEFAULT_DAY, isWorkingDay: true, startTime: '09:00', endTime: '14:00', lunchDuration: 30 },
          wednesday: { ...DEFAULT_DAY, isWorkingDay: true, startTime: '09:00', endTime: '14:00', lunchDuration: 30 },
          thursday: { ...DEFAULT_DAY, isWorkingDay: false },
          friday: { ...DEFAULT_DAY, isWorkingDay: false },
          saturday: { ...DEFAULT_DAY, isWorkingDay: false },
          sunday: { ...DEFAULT_DAY, isWorkingDay: false }
        };
        break;
      case 'overtime':
        // Preset que dispara alertas para demostrar validación
        newSchedule = {
          monday: { ...DEFAULT_DAY, isWorkingDay: true, startTime: '08:00', endTime: '19:00', lunchDuration: 60 }, // 10h
          tuesday: { ...DEFAULT_DAY, isWorkingDay: true, startTime: '08:00', endTime: '19:00', lunchDuration: 60 }, // 10h
          wednesday: { ...DEFAULT_DAY, isWorkingDay: true, startTime: '08:00', endTime: '19:00', lunchDuration: 60 }, // 10h
          thursday: { ...DEFAULT_DAY, isWorkingDay: true, startTime: '08:00', endTime: '19:00', lunchDuration: 60 }, // 10h
          friday: { ...DEFAULT_DAY, isWorkingDay: true, startTime: '08:00', endTime: '19:00', lunchDuration: 60 }, // 10h
          saturday: { ...DEFAULT_DAY, isWorkingDay: false },
          sunday: { ...DEFAULT_DAY, isWorkingDay: false }
        }; // Total: 50h (excede límite)
        break;
    }
    
    setSchedule(newSchedule);
    const summary = calculateSummary(newSchedule);
    onScheduleChange(newSchedule, summary);
  };

  const summary = calculateSummary(schedule);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Calendar className="h-5 w-5 mr-2 text-blue-600" />
          Configurador de Horarios Semanales
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        
        {/* Presets rápidos */}
        <div className="flex flex-wrap gap-2 mb-6">
          <Button 
            type="button"
            variant="outline" 
            size="sm" 
            onClick={() => applyPreset('standard')}
            className="text-xs"
          >
            L-V Estándar
          </Button>
          <Button 
            type="button"
            variant="outline" 
            size="sm" 
            onClick={() => applyPreset('sixDays')}
            className="text-xs"
          >
            L-S (6 días)
          </Button>
          <Button 
            type="button"
            variant="outline" 
            size="sm" 
            onClick={() => applyPreset('partTime')}
            className="text-xs"
          >
            Part-Time
          </Button>
          <Button 
            type="button"
            variant="outline" 
            size="sm" 
            onClick={() => applyPreset('weekend')}
            className="text-xs"
          >
            Fin Semana
          </Button>
          <Button 
            type="button"
            variant="outline" 
            size="sm" 
            onClick={() => applyPreset('overtime')}
            className="text-xs text-orange-600 border-orange-200"
          >
            🚨 Horas Extras
          </Button>
        </div>

        {/* Configuración por día */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Object.entries(DAYS).map(([key, dayName]) => {
            const daySchedule = schedule[key as keyof WeeklySchedule];
            const dayHours = calculateDayHours(daySchedule);
            
            return (
              <div key={key} className={`border rounded-lg p-4 transition-all duration-200 ${
                daySchedule.isWorkingDay 
                  ? 'border-green-200 bg-green-50' 
                  : 'border-gray-200 bg-gray-50'
              }`}>
                
                {/* Header del día */}
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium text-sm">{dayName}</h3>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleWorkingDay(key as keyof WeeklySchedule)}
                    className={`h-6 w-6 rounded-full p-0 ${
                      daySchedule.isWorkingDay 
                        ? 'text-green-600 hover:text-green-700' 
                        : 'text-gray-400 hover:text-gray-500'
                    }`}
                  >
                    {daySchedule.isWorkingDay ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                  </Button>
                </div>

                {/* Configuración del horario */}
                {daySchedule.isWorkingDay && (
                  <div className="space-y-3">
                    
                    {/* Horario entrada/salida */}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Entrada</label>
                        <input
                          type="time"
                          value={daySchedule.startTime}
                          onChange={(e) => updateDay(key as keyof WeeklySchedule, { startTime: e.target.value })}
                          className="w-full text-xs px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Salida</label>
                        <input
                          type="time"
                          value={daySchedule.endTime}
                          onChange={(e) => updateDay(key as keyof WeeklySchedule, { endTime: e.target.value })}
                          className="w-full text-xs px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </div>

                    {/* Colación */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-xs text-gray-600">Colación</label>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => updateDay(key as keyof WeeklySchedule, { hasLunch: !daySchedule.hasLunch })}
                          className={`h-5 w-5 rounded p-0 ${
                            daySchedule.hasLunch 
                              ? 'text-blue-600 hover:text-blue-700' 
                              : 'text-gray-400 hover:text-gray-500'
                          }`}
                        >
                          {daySchedule.hasLunch ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                        </Button>
                      </div>
                      
                      {daySchedule.hasLunch && (
                        <div className="flex items-center space-x-2">
                          <input
                            type="number"
                            min="15"
                            max="120"
                            step="15"
                            value={daySchedule.lunchDuration}
                            onChange={(e) => updateDay(key as keyof WeeklySchedule, { lunchDuration: parseInt(e.target.value) || 60 })}
                            className="flex-1 text-xs px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                          <span className="text-xs text-gray-500">min</span>
                        </div>
                      )}
                    </div>

                    {/* Horas del día */}
                    <div className="text-center pt-2 border-t border-gray-200">
                      <div className="text-xs font-medium text-gray-900">
                        {dayHours.toFixed(1)}h
                      </div>
                      <div className="text-xs text-gray-500">
                        horas diarias
                      </div>
                    </div>

                  </div>
                )}

                {/* Día no laborable */}
                {!daySchedule.isWorkingDay && (
                  <div className="text-center py-8 text-gray-400">
                    <Clock className="h-6 w-6 mx-auto mb-2 opacity-50" />
                    <div className="text-xs">No laborable</div>
                  </div>
                )}

              </div>
            );
          })}
        </div>

        {/* Resumen semanal */}
        <div className="border-t pt-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Resumen Semanal</h3>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{summary.totalWeeklyHours}h</div>
              <div className="text-sm text-blue-700">Horas Totales</div>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{summary.workingDaysCount}</div>
              <div className="text-sm text-green-700">Días Laborables</div>
            </div>
            <div className="text-center p-3 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">{summary.averageDailyHours}h</div>
              <div className="text-sm text-purple-700">Promedio Diario</div>
            </div>
            <div className="text-center p-3 bg-orange-50 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">
                {summary.totalWeeklyHours <= 30 ? 'Part-Time' : 'Full-Time'}
              </div>
              <div className="text-sm text-orange-700">Modalidad</div>
            </div>
          </div>

          {/* Alertas de Cumplimiento Legal */}
          {(summary.legalValidation.errors.length > 0 || summary.legalValidation.warnings.length > 0) && (
            <div className="mb-4">
              <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                <AlertTriangle className="h-4 w-4 mr-2 text-orange-600" />
                Cumplimiento Normativa Laboral Chilena
              </h4>
              
              {/* Errores legales */}
              {summary.legalValidation.errors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-3">
                  <div className="flex items-center mb-2">
                    <AlertCircle className="h-4 w-4 text-red-600 mr-2" />
                    <h5 className="font-medium text-red-800 text-sm">Errores Legales (Requieren Corrección)</h5>
                  </div>
                  <ul className="space-y-1">
                    {summary.legalValidation.errors.map((error, index) => (
                      <li key={index} className="text-sm text-red-700 flex items-start">
                        <span className="text-red-500 mr-2">•</span>
                        {error}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Advertencias */}
              {summary.legalValidation.warnings.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-3">
                  <div className="flex items-center mb-2">
                    <AlertTriangle className="h-4 w-4 text-yellow-600 mr-2" />
                    <h5 className="font-medium text-yellow-800 text-sm">Advertencias (Recomendaciones)</h5>
                  </div>
                  <ul className="space-y-1">
                    {summary.legalValidation.warnings.map((warning, index) => (
                      <li key={index} className="text-sm text-yellow-700 flex items-start">
                        <span className="text-yellow-500 mr-2">•</span>
                        {warning}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Estado de cumplimiento */}
          {summary.legalValidation.isValid && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
              <div className="flex items-center">
                <ShieldCheck className="h-4 w-4 text-green-600 mr-2" />
                <h5 className="font-medium text-green-800 text-sm">✅ Cumple con la Normativa Laboral Chilena</h5>
              </div>
              <p className="text-sm text-green-700 mt-1">
                El horario configurado respeta todos los límites legales establecidos.
              </p>
            </div>
          )}

          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">Texto del Contrato:</h4>
            <p className="text-sm text-gray-700 italic">
              "La jornada de trabajo ordinaria será de <strong>{summary.scheduleText}</strong>, 
              total <strong>{summary.totalWeeklyHours} horas semanales</strong>."
            </p>
            
            {summary.calculationDetails && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <h5 className="font-medium text-gray-900 mb-1 text-xs">Detalles del Cálculo:</h5>
                <p className="text-xs text-gray-600 font-mono">{summary.calculationDetails}</p>
              </div>
            )}
          </div>
        </div>

      </CardContent>
    </Card>
  );
}

export { WeeklyScheduleConfigurator as default };