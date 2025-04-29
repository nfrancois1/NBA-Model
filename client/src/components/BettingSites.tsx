import React, { useState, useEffect } from 'react';
import { BettingSite } from '@/types/game';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { fetchBettingOdds } from '@/lib/betting-api';

interface BettingSitesProps {
  gameId: string;
  homeTeam: string;
  awayTeam: string;
}

const BettingSites: React.FC<BettingSitesProps> = ({ gameId, homeTeam, awayTeam }) => {
  const [bettingSites, setBettingSites] = useState<BettingSite[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadBettingOdds = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const oddsData = await fetchBettingOdds(gameId, homeTeam, awayTeam);
        setBettingSites(oddsData);
      } catch (err) {
        console.error("Error fetching betting odds:", err);
        setError("Could not load betting odds");
      } finally {
        setIsLoading(false);
      }
    };

    loadBettingOdds();
  }, [gameId, homeTeam, awayTeam]);

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

  if (isLoading) {
    return (
      <div className="mt-4">
        <h3 className="text-lg font-semibold text-slate-200 mb-3">Betting Odds</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div 
              key={i}
              className="bg-gradient-to-br from-slate-700 to-slate-800 rounded-lg p-3 border border-slate-600/50 h-24 animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  if (error || bettingSites.length === 0) {
    return (
      <div className="mt-4">
        <h3 className="text-lg font-semibold text-slate-200 mb-3">Betting Odds</h3>
        <div className="bg-slate-800/50 rounded-lg p-4 text-center text-slate-400">
          {error || "No betting odds available for this game"}
        </div>
      </div>
    );
  }

  return (
    <div className="mt-4">
      <h3 className="text-lg font-semibold text-slate-200 mb-3">Betting Odds</h3>
      <motion.div 
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3"
        variants={container}
        initial="hidden"
        animate="show"
      >
        {bettingSites.map((site) => (
          <motion.a
            key={site.name}
            href={site.url}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-gradient-to-br from-slate-700 to-slate-800 rounded-lg p-3 border border-slate-600/50 hover:border-slate-500/70 transition-all duration-200 hover:shadow-lg hover:-translate-y-1"
            variants={item}
          >
            <div className="flex items-center mb-2">
              <div className="w-12 h-12 relative mr-2 bg-white rounded-md p-1 flex items-center justify-center">
                <img 
                  src={site.logo} 
                  alt={`${site.name} logo`}
                  className="max-w-full max-h-full object-contain"
                />
              </div>
              <div className="font-medium text-slate-200">{site.name}</div>
            </div>
            <div className="flex justify-between text-sm">
              <div>
                <div className="text-slate-400">{homeTeam.split(' ').pop()}</div>
                <div className={parseInt(site.odds.homeTeamOdds) > 0 ? "text-green-400 font-medium" : "text-red-400 font-medium"}>
                  {parseInt(site.odds.homeTeamOdds) > 0 ? `+${site.odds.homeTeamOdds}` : site.odds.homeTeamOdds}
                </div>
              </div>
              <div>
                <div className="text-slate-400">{awayTeam.split(' ').pop()}</div>
                <div className={parseInt(site.odds.awayTeamOdds) > 0 ? "text-green-400 font-medium" : "text-red-400 font-medium"}>
                  {site.odds.awayTeamOdds.startsWith('+') ? site.odds.awayTeamOdds : `+${site.odds.awayTeamOdds}`}
                </div>
              </div>
              <div>
                <div className="text-slate-400">Total</div>
                <div className="text-blue-400 font-medium">{site.odds.overUnder}</div>
              </div>
            </div>
          </motion.a>
        ))}
      </motion.div>
      <p className="text-xs text-slate-400 mt-2">
        *Odds displayed are for informational purposes only. Please visit the betting site for the most accurate and up-to-date odds.
      </p>
    </div>
  );
};

export default BettingSites; 