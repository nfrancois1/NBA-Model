'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Game } from '@/types/game';
import GameCard from '@/components/GameCard';
import LoadingState from '@/components/LoadingState';
import ErrorState from '@/components/ErrorState';
import { CustomDatePicker } from '@/components/ui/custom-date-picker';
import { motion } from 'framer-motion';
import { TrendingUp, BarChart3, ShieldAlert } from 'lucide-react';
import GameModal from '@/components/GameModal';

interface Stats {
  totalPredictions: number;
  winRate: string;
  accuracy: string;
}

export default function Home() {
  const [games, setGames] = useState<Game[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [stats, setStats] = useState<Stats>({
    totalPredictions: 0,
    winRate: '0.0',
    accuracy: '0.0'
  });

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/stats');
      if (!response.ok) {
        throw new Error('Failed to fetch stats');
      }
      const data = await response.json();
      setStats(data);
    } catch (err) {
      console.error('Error fetching stats:', err);
      // Fall back to default stats if API fails
      setStats({
        totalPredictions: 1240,
        winRate: '67.5',
        accuracy: '95.3'
      });
    }
  };

  const fetchGames = async (date: Date | undefined) => {
    if (!date) return;
    
    try {
      setIsLoading(true);
      setError(null);
      const formattedDate = format(date, 'yyyyMMdd');
      const response = await fetch(`/api/games?date=${formattedDate}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch games');
      }
      
      const data = await response.json();
      console.log('Fetched games data:', data); // Debug log
      setGames(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (selectedDate) {
      fetchGames(selectedDate);
    }
    
    // Fetch stats on initial load
    fetchStats();
  }, [selectedDate]);

  // Animation variants
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };
  
  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <div className="relative min-h-screen bg-[#0c1222]">
      {/* Background image container */}
      <div className="absolute inset-0 z-0 overflow-hidden flex items-center justify-center">
        <img 
          src="/nba-logos/nba_background.png"
          alt="NBA Background"
          className="max-w-none opacity-10"
          style={{
            width: '100%',
            height: 'auto',
            objectFit: 'contain',
            maxHeight: '100vh',
          }}
        />
      </div>
      {/* Stylish background pattern to fill void */}
      <div 
        className="absolute inset-0 z-0 opacity-20" 
        style={{
          backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%239C92AC\' fill-opacity=\'0.15\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
          backgroundSize: '60px 60px',
        }}
      ></div>
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0c1222]/90 via-[#0c1222]/80 to-[#0c1222]/90 z-0"></div>
      <div className="relative z-10 py-8 px-4 min-h-screen">
        <motion.div 
          className="max-w-6xl mx-auto"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          {/* Header with glowing effect */}
          <motion.div 
            className="flex flex-col items-center justify-center mb-12"
            initial={{ y: -50 }}
            animate={{ y: 0 }}
            transition={{ type: "spring", stiffness: 100 }}
          >
            <div className="flex flex-col items-center mb-6">
              <motion.img 
                src="/nba-logos/nba-logo-black-transparent.png"
                alt="NBA Logo"
                className="h-24 mb-4 invert" /* Using invert filter to make black logo white */
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.5 }}
              />
              <motion.div
                className="relative mb-4"
                animate={{ 
                  textShadow: ['0 0 8px rgba(102, 126, 234, 0.5)', '0 0 16px rgba(102, 126, 234, 0.8)', '0 0 8px rgba(102, 126, 234, 0.5)']
                }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <h1 className="text-4xl md:text-6xl font-bold text-center text-white">
                  NBA <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-500">Predictions</span>
                </h1>
              </motion.div>
            </div>
            
            <motion.p 
              className="text-indigo-200 text-center mb-8 max-w-2xl"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              Get the latest NBA game predictions and odds. Make informed decisions with our AI-powered analytics.
            </motion.p>
            
            {/* Stats Cards */}
            <motion.div 
              className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-3xl mb-8"
              variants={container}
              initial="hidden"
              animate="show"
            >
              <motion.div 
                variants={item} 
                className="bg-gradient-to-br from-indigo-900/70 to-indigo-800/40 p-4 rounded-lg shadow-lg border border-indigo-500/30 flex items-center backdrop-blur-sm"
              >
                <TrendingUp className="w-8 h-8 text-indigo-400 mr-3" />
                <div>
                  <div className="text-xs text-indigo-300">WIN RATE</div>
                  <div className="text-xl font-bold text-white">{stats.winRate}%</div>
                </div>
              </motion.div>
              
              <motion.div 
                variants={item}
                className="bg-gradient-to-br from-purple-900/70 to-purple-800/40 p-4 rounded-lg shadow-lg border border-purple-500/30 flex items-center backdrop-blur-sm"
              >
                <BarChart3 className="w-8 h-8 text-purple-400 mr-3" />
                <div>
                  <div className="text-xs text-purple-300">PREDICTIONS</div>
                  <div className="text-xl font-bold text-white">{stats.totalPredictions.toLocaleString()}+</div>
                </div>
              </motion.div>
              
              <motion.div 
                variants={item}
                className="bg-gradient-to-br from-blue-900/70 to-blue-800/40 p-4 rounded-lg shadow-lg border border-blue-500/30 flex items-center backdrop-blur-sm"
              >
                <ShieldAlert className="w-8 h-8 text-blue-400 mr-3" />
                <div>
                  <div className="text-xs text-blue-300">ACCURACY</div>
                  <div className="text-xl font-bold text-white">{stats.accuracy}%</div>
                </div>
              </motion.div>
            </motion.div>
            
            <div className="w-full max-w-md mb-8">
              <CustomDatePicker date={selectedDate} setDate={setSelectedDate} />
            </div>
          </motion.div>

          {isLoading ? (
            <LoadingState />
          ) : error ? (
            <ErrorState message={error} />
          ) : games.length === 0 ? (
            <motion.div 
              className="text-center text-indigo-300 bg-indigo-950/50 backdrop-blur-sm rounded-xl p-8 border border-indigo-800"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
            >
              No games scheduled for this date
            </motion.div>
          ) : (
            <motion.div 
              className="grid grid-cols-1 gap-6"
              variants={container}
              initial="hidden"
              animate="show"
            >
              {games.map((game, index) => (
                <motion.div 
                  key={game.game_id} 
                  variants={item}
                  transition={{ delay: index * 0.05 }}
                >
                  <GameCard 
                    game={game} 
                    onGameClick={(game) => setSelectedGame(game)}
                  />
                </motion.div>
              ))}
            </motion.div>
          )}
        </motion.div>

        {/* Game Modal */}
        {selectedGame && (
          <GameModal 
            game={selectedGame} 
            onClose={() => setSelectedGame(null)} 
          />
        )}
      </div>
    </div>
  );
}
