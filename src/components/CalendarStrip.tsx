import React, { useEffect, useRef } from 'react';
import { DayPonto } from '../types';
import { Calendar as CalendarIcon, Lock } from 'lucide-react';

interface CalendarStripProps {
  days: DayPonto[];
  selectedDay: number;
  today: number;
  onSelectDay: (dayNumber: number) => void;
}

export const CalendarStrip: React.FC<CalendarStripProps> = ({
  days,
  selectedDay,
  today,
  onSelectDay,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto scroll selected day into view
  useEffect(() => {
    const selectedElement = document.getElementById(`calendar-day-${selectedDay}`);
    if (selectedElement && containerRef.current) {
      selectedElement.scrollIntoView({
        behavior: 'smooth',
        inline: 'center',
        block: 'nearest',
      });
    }
  }, [selectedDay]);

  const getWeekDayName = (dayNumber: number) => {
    const date = new Date(2026, 7, dayNumber);
    const names = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];
    return names[date.getDay()];
  };

  return (
    <div className="px-4 mb-4">
      <div className="flex items-center justify-between text-xs text-slate-500 font-medium mb-1.5 px-1">
        <span className="flex items-center gap-1">
          <CalendarIcon className="w-3.5 h-3.5 text-blue-600" /> Agosto / 2026
        </span>
        <span className="text-[11px] text-slate-400">Clique para ver histórico do dia</span>
      </div>

      <div
        ref={containerRef}
        className="flex gap-2 overflow-x-auto py-2 px-1 scrollbar-none scroll-smooth snap-x"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {days.map((d) => {
          const isToday = d.day === today;
          const isSelected = d.day === selectedDay;
          const isFuture = d.day > today;
          const isWeekend = d.status === 'FOLGA';
          const weekDay = getWeekDayName(d.day);

          return (
            <button
              key={d.day}
              id={`calendar-day-${d.day}`}
              disabled={isFuture}
              onClick={() => onSelectDay(d.day)}
              className={`snap-center flex flex-col items-center min-w-[50px] py-2.5 px-2 rounded-2xl transition-all duration-200 border cursor-pointer select-none ${
                isFuture
                  ? 'bg-slate-100 text-slate-400 border-slate-200/60 opacity-60 cursor-not-allowed'
                  : isSelected
                  ? 'bg-gradient-to-b from-blue-600 to-indigo-700 text-white border-blue-500 shadow-md shadow-blue-500/25 scale-105 font-bold'
                  : isToday
                  ? 'bg-blue-50 border-blue-300 text-blue-700 font-semibold hover:bg-blue-100'
                  : isWeekend
                  ? 'bg-rose-50/70 border-rose-100 text-rose-600 hover:bg-rose-100/60'
                  : 'bg-white border-slate-200 text-slate-700 hover:border-blue-300 hover:bg-blue-50/50 shadow-xs'
              }`}
            >
              <span className={`text-[10px] uppercase font-bold tracking-wider ${
                isSelected ? 'text-blue-100' : isWeekend ? 'text-rose-500' : 'text-slate-400'
              }`}>
                {weekDay}
              </span>

              <div className="flex items-center gap-0.5 my-0.5">
                <span className="text-base font-bold leading-tight">{d.day}</span>
                {isFuture && <Lock className="w-2.5 h-2.5 text-slate-400" />}
              </div>

              <div className="mt-0.5">
                {isToday ? (
                  <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-extrabold ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-blue-600 text-white'
                  }`}>
                    Hoje
                  </span>
                ) : isWeekend ? (
                  <span className="text-[9px] text-rose-500 font-semibold">Folga</span>
                ) : d.punches.length > 0 ? (
                  <span className={`w-1.5 h-1.5 rounded-full inline-block ${
                    isSelected ? 'bg-emerald-300' : 'bg-emerald-500'
                  }`}></span>
                ) : (
                  <span className="text-[9px] text-slate-400">-</span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
