import React from 'react';
import { format, addDays, subDays } from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { motion } from 'framer-motion';

interface CustomDatePickerProps {
  date: Date | undefined;
  setDate: (date: Date | undefined) => void;
}

export function CustomDatePicker({ date, setDate }: CustomDatePickerProps) {
  if (!date) return null;

  const handlePrevDay = () => {
    setDate(subDays(date, 1));
  };

  const handleNextDay = () => {
    setDate(addDays(date, 1));
  };

  const today = new Date();
  const isToday = format(date, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd');

  return (
    <motion.div 
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center justify-center bg-gradient-to-r from-slate-600 to-slate-700 rounded-xl p-1 shadow-xl"
    >
      <div className="flex items-center bg-slate-900 rounded-lg p-3 w-full">
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          className="p-2 rounded-full text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          onClick={handlePrevDay}
        >
          <ChevronLeft className="h-5 w-5" />
        </motion.button>
        
        <div className="flex-1 flex flex-col items-center">
          <div className="text-slate-200 font-bold text-xl">
            {format(date, 'EEEE')}
          </div>
          <div className="text-slate-400">
            {format(date, 'MMMM d, yyyy')}
          </div>
        </div>
        
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          className="p-2 rounded-full text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          onClick={handleNextDay}
        >
          <ChevronRight className="h-5 w-5" />
        </motion.button>
      </div>
    </motion.div>
  );
} 