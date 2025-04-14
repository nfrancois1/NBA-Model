import { motion } from 'framer-motion';
import { CircleDashed } from 'lucide-react';

export default function LoadingState() {
  return (
    <motion.div 
      className="flex flex-col items-center justify-center py-12 px-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <motion.div
        className="w-16 h-16 text-slate-400 mb-4"
        animate={{ 
          rotate: 360,
          scale: [1, 1.1, 1]
        }}
        transition={{ 
          rotate: { duration: 2, repeat: Infinity, ease: "linear" },
          scale: { duration: 1, repeat: Infinity, repeatType: "reverse" }
        }}
      >
        <CircleDashed className="w-full h-full" />
      </motion.div>
      
      <motion.div
        className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-300 to-slate-400"
        animate={{ 
          opacity: [0.5, 1, 0.5]
        }}
        transition={{ duration: 1.5, repeat: Infinity }}
      >
        Loading Games
      </motion.div>
      
      <motion.div 
        className="flex space-x-2 mt-4"
        initial="hidden"
        animate="visible"
      >
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="w-3 h-3 rounded-full bg-slate-500"
            animate={{ 
              y: [0, -8, 0]
            }}
            transition={{ 
              duration: 0.6, 
              repeat: Infinity, 
              repeatType: "reverse",
              delay: i * 0.2
            }}
          />
        ))}
      </motion.div>
    </motion.div>
  );
} 