import { Game } from '@/types/game';
import { format, parseISO } from 'date-fns';
import { Clock, TrendingUp, BarChart3, Percent } from 'lucide-react';
import { motion } from 'framer-motion';
import BettingSites from './BettingSites';
import { useState, useEffect } from 'react';
import { fetchBettingOdds } from '@/lib/betting-api';

interface GameCardProps {
  game: Game;
  onGameClick?: (game: Game) => void;
}

export default function GameCard({ game, onGameClick }: GameCardProps) {
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'final':
        return 'text-green-600';
      case 'in progress':
        return 'text-blue-600';
      case 'scheduled':
      case 'pre-game':
        return 'text-gray-600';
      default:
        return 'text-gray-600';
    }
  };

  const formatGameTime = (dateString: string | null) => {
    if (!dateString) return null;
    try {
      const date = parseISO(dateString);
      return format(date, 'h:mm a');
    } catch (e) {
      return null;
    }
  };

  const getTeamLogo = (teamName: string) => {
    // Map team name variations to their correct file names
    const teamMapping: Record<string, string> = {
      // Eastern Conference
      "atlanta hawks": "atlanta-hawks",
      "hawks": "atlanta-hawks",
      "boston celtics": "boston-celtics",
      "celtics": "boston-celtics",
      "brooklyn nets": "brooklyn-nets",
      "nets": "brooklyn-nets",
      "charlotte hornets": "charlotte-hornets",
      "hornets": "charlotte-hornets",
      "chicago bulls": "chicago-bulls",
      "bulls": "chicago-bulls",
      "cleveland cavaliers": "cleveland-cavaliers",
      "cavaliers": "cleveland-cavaliers",
      "cavs": "cleveland-cavaliers",
      "detroit pistons": "detroit-pistons",
      "pistons": "detroit-pistons",
      "indiana pacers": "indiana-pacers",
      "pacers": "indiana-pacers",
      "miami heat": "miami-heat",
      "heat": "miami-heat",
      "milwaukee bucks": "milwaukee-bucks",
      "bucks": "milwaukee-bucks",
      "new york knicks": "new-york-knicks",
      "knicks": "new-york-knicks",
      "ny knicks": "new-york-knicks",
      "orlando magic": "orlando-magic",
      "magic": "orlando-magic",
      "philadelphia 76ers": "philadelphia-76ers",
      "sixers": "philadelphia-76ers",
      "76ers": "philadelphia-76ers",
      "toronto raptors": "toronto-raptors",
      "raptors": "toronto-raptors",
      "washington wizards": "washington-wizards",
      "wizards": "washington-wizards",

      // Western Conference
      "dallas mavericks": "dallas-mavericks",
      "mavericks": "dallas-mavericks",
      "mavs": "dallas-mavericks",
      "denver nuggets": "denver-nuggets",
      "nuggets": "denver-nuggets",
      "golden state warriors": "golden-state-warriors",
      "warriors": "golden-state-warriors",
      "houston rockets": "houston-rockets",
      "rockets": "houston-rockets",
      "los angeles clippers": "los-angeles-clippers",
      "la clippers": "los-angeles-clippers",
      "clippers": "los-angeles-clippers",
      "los angeles lakers": "los-angeles-lakers",
      "la lakers": "los-angeles-lakers",
      "lakers": "los-angeles-lakers",
      "memphis grizzlies": "memphis-grizzlies",
      "grizzlies": "memphis-grizzlies",
      "minnesota timberwolves": "minnesota-timberwolves",
      "timberwolves": "minnesota-timberwolves",
      "wolves": "minnesota-timberwolves",
      "new orleans pelicans": "new-orleans-pelicans",
      "pelicans": "new-orleans-pelicans",
      "oklahoma city thunder": "oklahoma-city-thunder",
      "okc thunder": "oklahoma-city-thunder",
      "okc": "oklahoma-city-thunder",
      "thunder": "oklahoma-city-thunder",
      "phoenix suns": "phoenix-suns",
      "suns": "phoenix-suns",
      "portland trail blazers": "portland-trail-blazers",
      "trail blazers": "portland-trail-blazers",
      "blazers": "portland-trail-blazers",
      "sacramento kings": "sacramento-kings",
      "kings": "sacramento-kings",
      "san antonio spurs": "san-antonio-spurs",
      "spurs": "san-antonio-spurs",
      "utah jazz": "utah-jazz",
      "jazz": "utah-jazz",
    };
    
    // Normalize team name for lookup
    const normalizedName = teamName.toLowerCase().trim();
    
    // Get the mapped filename or use a basic format as fallback
    const mappedName = teamMapping[normalizedName] || normalizedName.replace(/\s+/g, '-');
    
    // For debugging
    console.log(`Team: ${teamName}, Looking for: ${mappedName}.png`);
    
    return `/nba-logos/teams/${mappedName}.png`;
  };

  const generateSvgLogo = (teamName: string) => {
    // Generate random color based on team name
    const getColorFromString = (str: string) => {
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
      }
      const hue = Math.abs(hash % 360);
      return `hsl(${hue}, 70%, 60%)`;
    };

    const bgColor = getColorFromString(teamName);
    const initials = teamName
      .split(' ')
      .map(word => word[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();

    const svgContent = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80">
        <circle cx="40" cy="40" r="38" fill="${bgColor}" />
        <text x="40" y="48" font-family="Arial, sans-serif" font-size="24" font-weight="bold" text-anchor="middle" fill="white">${initials}</text>
      </svg>
    `;

    // Use encodeURIComponent to safely encode the SVG
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgContent)}`;
  };

  const isFutureGame = game.status.toLowerCase() === 'scheduled' || game.status.toLowerCase() === 'pre-game';
  
  // Use the betting API instead of generating random odds
  const [odds, setOdds] = useState<any>(null);
  const [isLoadingOdds, setIsLoadingOdds] = useState(false);
  
  useEffect(() => {
    const loadOdds = async () => {
      if (!isFutureGame) return;
      
      try {
        setIsLoadingOdds(true);
        const bettingData = await fetchBettingOdds(game.game_id, game.home_team, game.away_team);
        
        // Use DraftKings as the default odds provider for the summary card
        const draftKingsOdds = bettingData.find(site => site.name === 'DraftKings');
        
        if (draftKingsOdds) {
          // Extract spread, total, and win probability from the odds
          const homeOdds = parseInt(draftKingsOdds.odds.homeTeamOdds);
          const awayOdds = parseInt(draftKingsOdds.odds.awayTeamOdds.replace('+', ''));
          
          // Calculate win probability based on moneyline odds
          const homeWinProb = homeOdds < 0 
            ? Math.round(-homeOdds / (-homeOdds + 100) * 100) 
            : Math.round(100 / (homeOdds + 100) * 100);
          
          const awayWinProb = 100 - homeWinProb;
          
          // Extract spread from the odds
          const spread = homeOdds < awayOdds ? (homeOdds / -100) * 10 : (awayOdds / 100) * 10;
          
          // Extract total from over/under
          const totalPoints = parseFloat(draftKingsOdds.odds.overUnder.replace('O/U ', ''));
          
          setOdds({
            homeMoneyline: homeOdds,
            awayMoneyline: awayOdds,
            spread: homeOdds < awayOdds ? -Math.abs(spread) : Math.abs(spread),
            totalPoints,
            homeWinProb,
            awayWinProb
          });
        }
      } catch (err) {
        console.error('Error loading odds:', err);
      } finally {
        setIsLoadingOdds(false);
      }
    };
    
    loadOdds();
  }, [game.game_id, game.home_team, game.away_team, isFutureGame]);

  return (
    <motion.div 
      className="overflow-hidden rounded-xl cursor-pointer"
      whileHover={{ scale: 1.02 }}
      transition={{ type: "spring", stiffness: 400, damping: 10 }}
      onClick={() => onGameClick && onGameClick(game)}
    >
      <div className="bg-gradient-to-r from-slate-600 to-slate-700 p-1">
        <div className="bg-slate-900 rounded-lg p-6">
          {/* Game header with status */}
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-slate-400" />
              <span className="text-sm font-medium text-slate-400">
                {formatGameTime(game.game_time)}
              </span>
            </div>
            <motion.div 
              whileHover={{ scale: 1.05 }}
              className={`px-3 py-1 rounded-full text-sm font-medium ${
                game.status.toLowerCase() === 'final' 
                  ? 'bg-green-500/20 text-green-300 border border-green-500/30' 
                  : game.status.toLowerCase() === 'in progress'
                  ? 'bg-slate-500/20 text-slate-300 border border-slate-500/30'
                  : 'bg-slate-700/30 text-slate-400 border border-slate-600/30'
              }`}
            >
              {game.status}
            </motion.div>
          </div>
          
          {/* Teams and scores */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-4 items-center mb-6">
            {/* Away team */}
            <motion.div 
              className="flex flex-col items-center lg:items-end space-y-3"
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              <div className="flex items-center space-x-4 lg:flex-row-reverse lg:space-x-reverse">
                <div className="text-slate-200 font-bold text-lg">{game.away_team}</div>
                <motion.div 
                  className="w-16 h-16 relative rounded-full bg-slate-800 flex items-center justify-center overflow-hidden"
                  whileHover={{ scale: 1.1, rotate: 10 }}
                >
                  <img 
                    src={getTeamLogo(game.away_team)} 
                    alt={game.away_team}
                    className="w-14 h-14 object-contain"
                    onError={(e) => {
                      e.currentTarget.src = generateSvgLogo(game.away_team);
                    }}
                  />
                </motion.div>
              </div>
              <div className={`text-4xl font-bold ${
                isFutureGame ? 'text-slate-600' : 'text-slate-200'
              }`}>
                {game.away_score || '-'}
              </div>
              {isFutureGame && (
                <div className="flex items-center text-sm text-slate-400">
                  <Percent className="w-3 h-3 mr-1" />
                  <span>{odds?.awayWinProb}%</span>
                </div>
              )}
            </motion.div>
            
            {/* VS */}
            <motion.div 
              className="flex flex-col items-center justify-center space-y-2"
              animate={{ 
                scale: [1, 1.05, 1],
              }}
              transition={{ 
                duration: 2, 
                repeat: Infinity,
                repeatType: "reverse" 
              }}
            >
              <div className="text-slate-500 text-2xl font-bold">VS</div>
              {isFutureGame && (
                <div className="px-4 py-1 rounded-full bg-slate-800 text-slate-400 text-xs">
                  {formatGameTime(game.game_time)}
                </div>
              )}
            </motion.div>
            
            {/* Home team */}
            <motion.div 
              className="flex flex-col items-center lg:items-start space-y-3"
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              <div className="flex items-center space-x-4">
                <motion.div 
                  className="w-16 h-16 relative rounded-full bg-slate-800 flex items-center justify-center overflow-hidden"
                  whileHover={{ scale: 1.1, rotate: -10 }}
                >
                  <img 
                    src={getTeamLogo(game.home_team)} 
                    alt={game.home_team}
                    className="w-14 h-14 object-contain"
                    onError={(e) => {
                      e.currentTarget.src = generateSvgLogo(game.home_team);
                    }}
                  />
                </motion.div>
                <div className="text-slate-200 font-bold text-lg">{game.home_team}</div>
              </div>
              <div className={`text-4xl font-bold ${
                isFutureGame ? 'text-slate-600' : 'text-slate-200'
              }`}>
                {game.home_score || '-'}
              </div>
              {isFutureGame && (
                <div className="flex items-center text-sm text-slate-400">
                  <Percent className="w-3 h-3 mr-1" />
                  <span>{odds?.homeWinProb}%</span>
                </div>
              )}
            </motion.div>
          </div>

          {/* Betting info for future games */}
          {isFutureGame && (
            <motion.div 
              className="grid grid-cols-3 gap-4 mt-6 pt-4 border-t border-slate-800"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <motion.div 
                className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg p-3 text-center"
                whileHover={{ y: -5, boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)" }}
              >
                <div className="text-xs text-slate-500 mb-1">SPREAD</div>
                <div className="text-slate-200 font-bold flex justify-center items-center">
                  <span className="text-sm text-slate-400 mr-1">{game.home_team.split(' ').pop()}</span>
                  <span>{odds && odds.spread > 0 ? '+' : ''}{odds?.spread}</span>
                </div>
              </motion.div>
              
              <motion.div 
                className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg p-3 text-center"
                whileHover={{ y: -5, boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)" }}
              >
                <div className="text-xs text-slate-500 mb-1">TOTAL</div>
                <div className="text-slate-200 font-bold">O/U {odds?.totalPoints}</div>
              </motion.div>
              
              <motion.div 
                className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg p-3 text-center"
                whileHover={{ y: -5, boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)" }}
              >
                <div className="text-xs text-slate-500 mb-1">ML</div>
                <div className="text-slate-200 font-bold flex flex-col text-xs">
                  <div className="flex justify-between px-2">
                    <span>{game.away_team.split(' ').pop()}</span>
                    <span className={odds && odds.awayMoneyline > 0 ? 'text-green-400' : 'text-red-400'}>
                      {odds && odds.awayMoneyline > 0 ? '+' : ''}{odds?.awayMoneyline}
                    </span>
                  </div>
                  <div className="flex justify-between px-2 mt-1">
                    <span>{game.home_team.split(' ').pop()}</span> 
                    <span className={odds && odds.homeMoneyline > 0 ? 'text-green-400' : 'text-red-400'}>
                      {odds && odds.homeMoneyline > 0 ? '+' : ''}{odds?.homeMoneyline}
                    </span>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}

          {/* Betting Sites with redirect */}
          {isFutureGame && (
            <BettingSites 
              gameId={game.game_id} 
              homeTeam={game.home_team} 
              awayTeam={game.away_team}
            />
          )}

          {/* Game in progress indicator */}
          {game.status.toLowerCase() === 'in progress' && (
            <motion.div 
              className="mt-4 p-2 rounded-lg bg-slate-800/20 border border-slate-700/30 flex items-center justify-center space-x-2"
              animate={{ 
                borderColor: ['rgba(100, 116, 139, 0.3)', 'rgba(148, 163, 184, 0.5)', 'rgba(100, 116, 139, 0.3)'],
              }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <div className="flex space-x-1">
                <motion.div 
                  className="w-2 h-2 rounded-full bg-slate-400"
                  animate={{ 
                    opacity: [1, 0.4, 1],
                  }}
                  transition={{ duration: 1, repeat: Infinity, delay: 0 }}
                />
                <motion.div 
                  className="w-2 h-2 rounded-full bg-slate-400"
                  animate={{ 
                    opacity: [1, 0.4, 1],
                  }}
                  transition={{ duration: 1, repeat: Infinity, delay: 0.3 }}
                />
                <motion.div 
                  className="w-2 h-2 rounded-full bg-slate-400"
                  animate={{ 
                    opacity: [1, 0.4, 1],
                  }}
                  transition={{ duration: 1, repeat: Infinity, delay: 0.6 }}
                />
              </div>
              <span className="text-slate-400 text-sm font-medium">LIVE</span>
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
} 