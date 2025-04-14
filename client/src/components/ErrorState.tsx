import { motion } from 'framer-motion';
import { AlertCircle } from 'lucide-react';

interface ErrorStateProps {
  message: string;
}

export default function ErrorState({ message }: ErrorStateProps) {
  return (
    <motion.div 
      className="rounded-xl overflow-hidden"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="bg-gradient-to-r from-slate-600 to-slate-700 p-1">
        <div className="bg-slate-900 rounded-lg p-6 text-center">
          <motion.div 
            className="flex justify-center mb-4"
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <motion.div
              animate={{ 
                rotate: [0, 5, 0, -5, 0],
                scale: [1, 1.1, 1] 
              }}
              transition={{ 
                rotate: { duration: 2, repeat: Infinity, repeatType: "reverse" },
                scale: { duration: 1, repeat: Infinity, repeatType: "reverse" }
              }}
            >
              <AlertCircle className="w-12 h-12 text-slate-400" />
            </motion.div>
          </motion.div>
          <motion.div 
            className="text-xl font-bold text-slate-300 mb-2"
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.2 }}
          >
            Error Loading Games
          </motion.div>
          <motion.div 
            className="text-slate-400"
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.3 }}
          >
            {message}
          </motion.div>
          <motion.button
            className="mt-4 px-4 py-2 bg-gradient-to-r from-slate-600 to-slate-700 rounded-lg text-slate-200 font-medium text-sm"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => window.location.reload()}
          >
            Try Again
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
} 