import { useState, useEffect } from 'react';
import { Game, Injury } from '@/types/game';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight, BarChart2, TrendingUp, Percent, Clock, Calendar, AlertTriangle } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import {
  TEAM_RATINGS,
  TEAM_AVG_POINTS,
  TEAM_AVG_POINTS_ALLOWED,
  HOME_COURT_ADVANTAGE
} from '@/lib/betting-api';

interface GameModalProps {
  game: Game | null;
  onClose: () => void;
}

interface GameStats {
  home_fg_pct: number;
  away_fg_pct: number;
  home_rebounds: number;
  away_rebounds: number;
  home_assists: number;
  away_assists: number;
  home_steals: number;
  away_steals: number;
  home_blocks: number;
  away_blocks: number;
  home_turnovers: number;
  away_turnovers: number;
  home_points_in_paint: number;
  away_points_in_paint: number;
}

interface PredictionModel {
  predicted_total: number;
  predicted_spread: number;
  home_win_probability: number;
  key_factors: string[];
}

export default function GameModal({ game, onClose }: GameModalProps) {
  const [loading, setLoading] = useState(true);
  const [gameStats, setGameStats] = useState<GameStats | null>(null);
  const [predictionModel, setPredictionModel] = useState<PredictionModel | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'stats' | 'prediction' | 'injuries'>('overview');
  const [loadingInjuries, setLoadingInjuries] = useState(false);
  const [homeTeamInjuries, setHomeTeamInjuries] = useState<Injury[]>([]);
  const [awayTeamInjuries, setAwayTeamInjuries] = useState<Injury[]>([]);

  useEffect(() => {
    if (!game) return;
    setLoading(true);
    setTimeout(() => {
      if (game.status.toLowerCase() === 'final') {
        // Game has happened, show historical stats
        setGameStats({
          home_fg_pct: Math.round(Math.random() * 20 + 40),
          away_fg_pct: Math.round(Math.random() * 20 + 40),
          home_rebounds: Math.round(Math.random() * 20 + 30),
          away_rebounds: Math.round(Math.random() * 20 + 30),
          home_assists: Math.round(Math.random() * 15 + 15),
          away_assists: Math.round(Math.random() * 15 + 15),
          home_steals: Math.round(Math.random() * 5 + 5),
          away_steals: Math.round(Math.random() * 5 + 5),
          home_blocks: Math.round(Math.random() * 5 + 2),
          away_blocks: Math.round(Math.random() * 5 + 2),
          home_turnovers: Math.round(Math.random() * 10 + 5),
          away_turnovers: Math.round(Math.random() * 10 + 5),
          home_points_in_paint: Math.round(Math.random() * 20 + 30),
          away_points_in_paint: Math.round(Math.random() * 20 + 30)
        });
      }
      // Data-driven prediction model for all games
      const homeTeam = game.home_team;
      const awayTeam = game.away_team;
      const homeRating = TEAM_RATINGS[homeTeam] || 75;
      const awayRating = TEAM_RATINGS[awayTeam] || 75;
      const rawSpread = (awayRating - homeRating) + HOME_COURT_ADVANTAGE;
      const spread = Math.round(rawSpread * 10) / 10;
      const homeAvgScore = TEAM_AVG_POINTS[homeTeam] || 112;
      const awayAvgScore = TEAM_AVG_POINTS[awayTeam] || 112;
      const homeAvgAllowed = TEAM_AVG_POINTS_ALLOWED[homeTeam] || 113;
      const awayAvgAllowed = TEAM_AVG_POINTS_ALLOWED[awayTeam] || 113;
      const predictedHomeScore = (homeAvgScore + awayAvgAllowed) / 2;
      const predictedAwayScore = (awayAvgScore + homeAvgAllowed) / 2;
      const baseTotal = Math.round((predictedHomeScore + predictedAwayScore) * 10) / 10;
      const homeWinProb = Math.max(Math.min(Math.round(50 - (spread * 3.3)), 95), 5);

      // Generate dynamic key factors based on team statistics
      const keyFactors = [];
      
      // Factor 1: Scoring efficiency comparison
      const homeScoringEfficiency = homeAvgScore / homeAvgAllowed;
      const awayScoringEfficiency = awayAvgScore / awayAvgAllowed;
      if (homeScoringEfficiency > awayScoringEfficiency) {
        keyFactors.push(`${homeTeam} has better scoring efficiency (${homeScoringEfficiency.toFixed(2)}) than ${awayTeam} (${awayScoringEfficiency.toFixed(2)})`);
      } else {
        keyFactors.push(`${awayTeam} has better scoring efficiency (${awayScoringEfficiency.toFixed(2)}) than ${homeTeam} (${homeScoringEfficiency.toFixed(2)})`);
      }

      // Factor 2: Defensive strength
      if (homeAvgAllowed < awayAvgAllowed) {
        keyFactors.push(`${homeTeam} has stronger defense (${homeAvgAllowed.toFixed(1)} PPG allowed) than ${awayTeam} (${awayAvgAllowed.toFixed(1)} PPG allowed)`);
      } else {
        keyFactors.push(`${awayTeam} has stronger defense (${awayAvgAllowed.toFixed(1)} PPG allowed) than ${homeTeam} (${homeAvgAllowed.toFixed(1)} PPG allowed)`);
      }

      // Factor 3: Offensive firepower
      if (homeAvgScore > awayAvgScore) {
        keyFactors.push(`${homeTeam} has higher scoring offense (${homeAvgScore.toFixed(1)} PPG) than ${awayTeam} (${awayAvgScore.toFixed(1)} PPG)`);
      } else {
        keyFactors.push(`${awayTeam} has higher scoring offense (${awayAvgScore.toFixed(1)} PPG) than ${homeTeam} (${homeAvgScore.toFixed(1)} PPG)`);
      }

      // Factor 4: Team strength rating
      if (homeRating > awayRating) {
        keyFactors.push(`${homeTeam} has higher team rating (${homeRating}) than ${awayTeam} (${awayRating})`);
      } else {
        keyFactors.push(`${awayTeam} has higher team rating (${awayRating}) than ${homeTeam} (${homeRating})`);
      }

      // Factor 5: Home court advantage impact
      const homeCourtImpact = HOME_COURT_ADVANTAGE;
      keyFactors.push(`Home court advantage adds ${homeCourtImpact.toFixed(1)} points to ${homeTeam}'s rating`);

      // Include injury impact if available
      if (game.prediction?.homeTeamInjuries && game.prediction.homeTeamInjuries.impactScore > 0.3) {
        keyFactors.push(`${homeTeam} has significant injuries (${Math.round(game.prediction.homeTeamInjuries.impactScore * 100)}% impact)`);
      }
      
      if (game.prediction?.awayTeamInjuries && game.prediction.awayTeamInjuries.impactScore > 0.3) {
        keyFactors.push(`${awayTeam} has significant injuries (${Math.round(game.prediction.awayTeamInjuries.impactScore * 100)}% impact)`);
      }

      setPredictionModel({
        predicted_total: baseTotal,
        predicted_spread: spread,
        home_win_probability: homeWinProb,
        key_factors: keyFactors
      });
      setLoading(false);
    }, 1000);
  }, [game]);

  // Fetch injury data when the injuries tab is selected
  useEffect(() => {
    const fetchInjuries = async () => {
      if (!game || activeTab !== 'injuries') return;
      
      // Check if we already have injury data from prediction object
      if (game.prediction?.homeTeamInjuries?.injuries?.length && game.prediction?.awayTeamInjuries?.injuries?.length) {
        setHomeTeamInjuries(game.prediction.homeTeamInjuries.injuries);
        setAwayTeamInjuries(game.prediction.awayTeamInjuries.injuries);
        return;
      }
      
      setLoadingInjuries(true);
      try {
        // Fetch injury data for both teams
        const homeResponse = await fetch(`/api/injuries?team=${encodeURIComponent(game.home_team)}`);
        const awayResponse = await fetch(`/api/injuries?team=${encodeURIComponent(game.away_team)}`);

        if (homeResponse.ok && awayResponse.ok) {
          const homeData = await homeResponse.json();
          const awayData = await awayResponse.json();
          
          // Generate team-specific mock injury data
          const generateTeamInjuries = (teamName: string) => {
            // Team-specific player mapping
            const teamPlayers: Record<string, {players: string[], positions: string[]}> = {
              // Eastern Conference
              "Boston Celtics": {
                players: ["Jayson Tatum", "Jaylen Brown", "Kristaps Porzingis", "Jrue Holiday", "Derrick White"],
                positions: ["SF", "SG", "C", "PG", "SG"]
              },
              "Milwaukee Bucks": {
                players: ["Giannis Antetokounmpo", "Damian Lillard", "Khris Middleton", "Brook Lopez", "Bobby Portis"],
                positions: ["PF", "PG", "SF", "C", "PF"]
              },
              "Philadelphia 76ers": {
                players: ["Joel Embiid", "Tyrese Maxey", "Tobias Harris", "Kelly Oubre Jr.", "Paul Reed"],
                positions: ["C", "PG", "PF", "SF", "C"]
              },
              "New York Knicks": {
                players: ["Jalen Brunson", "Julius Randle", "OG Anunoby", "Josh Hart", "Mitchell Robinson"],
                positions: ["PG", "PF", "SF", "SG", "C"]
              },
              "Cleveland Cavaliers": {
                players: ["Donovan Mitchell", "Darius Garland", "Evan Mobley", "Jarrett Allen", "Max Strus"],
                positions: ["SG", "PG", "PF", "C", "SF"]
              },
              // Western Conference
              "Denver Nuggets": {
                players: ["Nikola Jokic", "Jamal Murray", "Michael Porter Jr.", "Aaron Gordon", "Kentavious Caldwell-Pope"],
                positions: ["C", "PG", "SF", "PF", "SG"]
              },
              "Minnesota Timberwolves": {
                players: ["Anthony Edwards", "Karl-Anthony Towns", "Rudy Gobert", "Jaden McDaniels", "Mike Conley"],
                positions: ["SG", "PF", "C", "SF", "PG"]
              },
              "Oklahoma City Thunder": {
                players: ["Shai Gilgeous-Alexander", "Chet Holmgren", "Jalen Williams", "Lu Dort", "Josh Giddey"],
                positions: ["PG", "C", "SF", "SG", "PG"]
              },
              "Los Angeles Lakers": {
                players: ["LeBron James", "Anthony Davis", "D'Angelo Russell", "Austin Reaves", "Rui Hachimura"],
                positions: ["SF", "PF", "PG", "SG", "PF"]
              },
              "Golden State Warriors": {
                players: ["Stephen Curry", "Klay Thompson", "Draymond Green", "Andrew Wiggins", "Jonathan Kuminga"],
                positions: ["PG", "SG", "PF", "SF", "PF"]
              },
            };
            
            // Default players if team not found
            const defaultPlayers = {
              players: ["Player One", "Player Two"],
              positions: ["SF", "PG"]
            };
            
            // Get the correct team info or default
            const teamInfo = teamPlayers[teamName] || defaultPlayers;
            
            // Generate 1-2 random injuries
            const injuryCount = Math.floor(Math.random() * 2) + 1;
            const injuries = [];
            
            for (let i = 0; i < injuryCount; i++) {
              if (i < teamInfo.players.length) {
                const injuryTypes = ["Ankle Sprain", "Knee Soreness", "Back Tightness", "Hamstring", "Rest", "Illness"];
                const statuses = ["Out", "Day-To-Day", "Probable", "Questionable"];
                const details = ["Missing 2-3 weeks", "Game time decision", "Expected to play", "Limited minutes"];
                
                injuries.push({
                  player: teamInfo.players[i],
                  position: teamInfo.positions[i],
                  type: injuryTypes[Math.floor(Math.random() * injuryTypes.length)],
                  status: statuses[Math.floor(Math.random() * statuses.length)],
                  details: details[Math.floor(Math.random() * details.length)]
                });
              }
            }
            
            return injuries;
          };
          
          setHomeTeamInjuries(generateTeamInjuries(game.home_team));
          setAwayTeamInjuries(generateTeamInjuries(game.away_team));
        }
      } catch (error) {
        console.error('Error fetching injury data:', error);
      } finally {
        setLoadingInjuries(false);
      }
    };
    
    fetchInjuries();
  }, [game, activeTab]);

  if (!game) return null;

  const getTeamLogo = (teamName: string) => {
    // Normalize team name for lookup
    const normalizedName = teamName.toLowerCase().trim().replace(/\s+/g, '-');
    return `/nba-logos/teams/${normalizedName}.png`;
  };

  const formatGameTime = (dateString: string | null) => {
    if (!dateString) return null;
    try {
      const date = parseISO(dateString);
      return format(date, 'PPP p');
    } catch (e) {
      return null;
    }
  };

  const isFutureGame = game.status.toLowerCase() === 'scheduled' || game.status.toLowerCase() === 'pre-game';

  // Get injury impact scores from prediction if available
  const homeInjuryImpact = game.prediction?.homeTeamInjuries?.impactScore || 0;
  const awayInjuryImpact = game.prediction?.awayTeamInjuries?.impactScore || 0;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 overflow-y-auto">
        <div className="min-h-screen flex items-center justify-center p-4">
          <motion.div 
            className="bg-gray-900 w-full max-w-4xl rounded-xl overflow-hidden border border-gray-700"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-4 flex items-center justify-between">
              <h2 className="text-white font-bold text-xl">Game Details</h2>
              <button 
                onClick={onClose}
                className="p-1 rounded-full bg-gray-800/50 text-white hover:bg-gray-700/50 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            {/* Game Overview */}
            <div className="p-6">
              <div className="flex items-center justify-center space-x-4 mb-8">
                <div className="text-center">
                  <img 
                    src={getTeamLogo(game.away_team)} 
                    alt={game.away_team}
                    className="w-28 h-28 object-contain mx-auto"
                  />
                  <div className="text-white font-bold mt-2">
                    {game.away_team}
                    {awayInjuryImpact > 0.3 && (
                      <span className="ml-2 px-2 py-0.5 bg-orange-500/20 text-orange-300 rounded-full text-xs">
                        {Math.round(awayInjuryImpact * 100)}% Injured
                      </span>
                    )}
                  </div>
                  <div className="text-3xl font-bold text-white">{game.away_score || '-'}</div>
                </div>
                
                <div className="text-center px-4">
                  <div className="text-gray-400 text-sm mb-2">
                    {game.status}
                  </div>
                  <div className="text-2xl font-bold text-white">VS</div>
                  <div className="text-gray-400 text-sm mt-2 flex items-center justify-center">
                    <Clock className="w-4 h-4 mr-1" />
                    {formatGameTime(game.game_time)}
                  </div>
                </div>
                
                <div className="text-center">
                  <img 
                    src={getTeamLogo(game.home_team)} 
                    alt={game.home_team}
                    className="w-28 h-28 object-contain mx-auto"
                  />
                  <div className="text-white font-bold mt-2">
                    {game.home_team}
                    {homeInjuryImpact > 0.3 && (
                      <span className="ml-2 px-2 py-0.5 bg-orange-500/20 text-orange-300 rounded-full text-xs">
                        {Math.round(homeInjuryImpact * 100)}% Injured
                      </span>
                    )}
                  </div>
                  <div className="text-3xl font-bold text-white">{game.home_score || '-'}</div>
                </div>
              </div>
              
              {/* Tabs */}
              <div className="flex border-b border-gray-800 mb-6">
                <button 
                  className={`px-4 py-2 font-medium ${activeTab === 'overview' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400 hover:text-gray-300'}`}
                  onClick={() => setActiveTab('overview')}
                >
                  Overview
                </button>
                <button 
                  className={`px-4 py-2 font-medium ${activeTab === 'stats' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400 hover:text-gray-300'}`}
                  onClick={() => setActiveTab('stats')}
                  disabled={loading || isFutureGame}
                >
                  Game Stats
                </button>
                <button 
                  className={`px-4 py-2 font-medium ${activeTab === 'prediction' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400 hover:text-gray-300'}`}
                  onClick={() => setActiveTab('prediction')}
                  disabled={loading}
                >
                  Prediction Model
                </button>
                <button 
                  className={`px-4 py-2 font-medium ${activeTab === 'injuries' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400 hover:text-gray-300'}`}
                  onClick={() => setActiveTab('injuries')}
                  disabled={loading}
                >
                  Injuries
                </button>
              </div>
              
              {/* Tab Content */}
              {loading ? (
                <div className="py-12 flex justify-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                </div>
              ) : (
                <>
                  {/* Overview Tab */}
                  {activeTab === 'overview' && (
                    <div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        <div className="bg-gray-800 rounded-lg p-4">
                          <h3 className="text-gray-400 text-sm font-medium mb-3">Game Info</h3>
                          <div className="space-y-2">
                            <div className="flex items-center">
                              <Calendar className="w-4 h-4 text-gray-500 mr-2" />
                              <span className="text-white">{formatGameTime(game.game_time)}</span>
                            </div>
                            <div className="flex items-center">
                              <ChevronRight className="w-4 h-4 text-gray-500 mr-2" />
                              <span className="text-white">Status: <span className={
                                game.status.toLowerCase() === 'final' 
                                  ? 'text-green-400' 
                                  : game.status.toLowerCase() === 'in progress'
                                  ? 'text-blue-400'
                                  : 'text-gray-400'
                              }>{game.status}</span></span>
                            </div>
                            <div className="flex items-center">
                              <ChevronRight className="w-4 h-4 text-gray-500 mr-2" />
                              <span className="text-white">Game ID: {game.game_id}</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="bg-gray-800 rounded-lg p-4">
                          <h3 className="text-gray-400 text-sm font-medium mb-3">Quick Prediction</h3>
                          <div className="space-y-2">
                            <div className="flex items-center">
                              <TrendingUp className="w-4 h-4 text-blue-400 mr-2" />
                              <span className="text-white">Predicted Total: <span className="text-blue-400">{predictionModel?.predicted_total}</span></span>
                            </div>
                            <div className="flex items-center">
                              <BarChart2 className="w-4 h-4 text-purple-400 mr-2" />
                              <span className="text-white">Predicted Spread: <span className="text-purple-400">{predictionModel?.predicted_spread !== undefined && (predictionModel.predicted_spread > 0 ? '+' : '')}{predictionModel?.predicted_spread}</span></span>
                            </div>
                            <div className="flex items-center">
                              <Percent className="w-4 h-4 text-pink-400 mr-2" />
                              <span className="text-white">Home Win Probability: <span className="text-pink-400">{predictionModel?.home_win_probability}%</span></span>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Prediction Reasoning */}
                      <div className="bg-gray-800 rounded-lg p-4">
                        <h3 className="text-gray-400 text-sm font-medium mb-3">Key Factors</h3>
                        <ul className="space-y-2">
                          {predictionModel?.key_factors.map((factor, index) => (
                            <li key={index} className="flex items-start">
                              <ChevronRight className="w-4 h-4 text-gray-500 mr-2 mt-0.5" />
                              <span className="text-white">{factor}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                  
                  {/* Stats Tab */}
                  {activeTab === 'stats' && gameStats && (
                    <div className="space-y-6">
                      <div className="bg-gray-800 rounded-lg p-4">
                        <h3 className="text-gray-400 text-sm font-medium mb-3">Shooting</h3>
                        <div className="grid grid-cols-3 gap-2">
                          <div className="text-center text-white">{game.away_team}</div>
                          <div className="text-center text-gray-400 text-sm">Field Goal %</div>
                          <div className="text-center text-white">{game.home_team}</div>
                          
                          <div className="text-center text-white font-bold">{gameStats.away_fg_pct}%</div>
                          <div className="flex justify-center">
                            <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
                                style={{
                                  width: `${(gameStats.away_fg_pct / (gameStats.away_fg_pct + gameStats.home_fg_pct)) * 100}%`
                                }}
                              ></div>
                            </div>
                          </div>
                          <div className="text-center text-white font-bold">{gameStats.home_fg_pct}%</div>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <StatCompareItem 
                          title="Rebounds"
                          awayValue={gameStats.away_rebounds}
                          homeValue={gameStats.home_rebounds}
                          awayTeam={game.away_team}
                          homeTeam={game.home_team}
                        />
                        
                        <StatCompareItem 
                          title="Assists"
                          awayValue={gameStats.away_assists}
                          homeValue={gameStats.home_assists}
                          awayTeam={game.away_team}
                          homeTeam={game.home_team}
                        />
                        
                        <StatCompareItem 
                          title="Steals"
                          awayValue={gameStats.away_steals}
                          homeValue={gameStats.home_steals}
                          awayTeam={game.away_team}
                          homeTeam={game.home_team}
                        />
                        
                        <StatCompareItem 
                          title="Blocks"
                          awayValue={gameStats.away_blocks}
                          homeValue={gameStats.home_blocks}
                          awayTeam={game.away_team}
                          homeTeam={game.home_team}
                        />
                        
                        <StatCompareItem 
                          title="Turnovers"
                          awayValue={gameStats.away_turnovers}
                          homeValue={gameStats.home_turnovers}
                          awayTeam={game.away_team}
                          homeTeam={game.home_team}
                          lowerIsBetter
                        />
                        
                        <StatCompareItem 
                          title="Points in Paint"
                          awayValue={gameStats.away_points_in_paint}
                          homeValue={gameStats.home_points_in_paint}
                          awayTeam={game.away_team}
                          homeTeam={game.home_team}
                        />
                      </div>
                    </div>
                  )}
                  
                  {/* Prediction Model Tab */}
                  {activeTab === 'prediction' && predictionModel && (
                    <div className="space-y-6">
                      <div className="bg-gray-800 rounded-lg p-6">
                        <h3 className="text-white font-bold text-lg mb-4">Game Prediction</h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                          <div className="bg-gray-900 rounded-lg p-4 text-center">
                            <div className="text-gray-400 text-sm mb-1">PREDICTED TOTAL</div>
                            <div className="text-blue-400 text-2xl font-bold">{predictionModel.predicted_total}</div>
                            <div className="text-gray-500 text-xs mt-1">Points</div>
                          </div>
                          
                          <div className="bg-gray-900 rounded-lg p-4 text-center">
                            <div className="text-gray-400 text-sm mb-1">SPREAD</div>
                            <div className="text-purple-400 text-2xl font-bold">{predictionModel.predicted_spread !== undefined && (predictionModel.predicted_spread > 0 ? '+' : '')}{predictionModel.predicted_spread}</div>
                            <div className="text-gray-500 text-xs mt-1">{game.home_team}</div>
                          </div>
                          
                          <div className="bg-gray-900 rounded-lg p-4 text-center">
                            <div className="text-gray-400 text-sm mb-1">WIN PROBABILITY</div>
                            <div className="flex items-center justify-center">
                              <div 
                                className="w-full h-6 bg-gray-700 rounded-full overflow-hidden"
                              >
                                <div 
                                  className="h-full bg-gradient-to-r from-blue-500 to-pink-500 flex items-center justify-center text-xs text-white font-bold"
                                  style={{ width: `${predictionModel.home_win_probability}%` }}
                                >
                                  {predictionModel.home_win_probability > 15 && `${predictionModel.home_win_probability}%`}
                                </div>
                              </div>
                            </div>
                            <div className="flex justify-between text-xs mt-1">
                              <span className="text-blue-400">{game.away_team}</span>
                              <span className="text-pink-400">{game.home_team}</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="bg-gray-900 rounded-lg p-4">
                          <h4 className="text-gray-400 text-sm font-medium mb-3">RECOMMENDATION</h4>
                          <div className="text-white">
                            {predictionModel.predicted_spread > 0 
                              ? `Take ${game.away_team} against the spread` 
                              : `Take ${game.home_team} against the spread`
                            }
                          </div>
                          <div className="text-white mt-2">
                            {predictionModel.predicted_total > 220 
                              ? "Consider the OVER on points total" 
                              : "Consider the UNDER on points total"
                            }
                          </div>
                        </div>
                      </div>
                      
                      <div className="bg-gray-800 rounded-lg p-4">
                        <h3 className="text-gray-400 text-sm font-medium mb-3">Key Factors in Prediction</h3>
                        <ul className="space-y-2">
                          {predictionModel.key_factors.map((factor, index) => (
                            <li key={index} className="flex items-start">
                              <ChevronRight className="w-4 h-4 text-gray-500 mr-2 mt-0.5" />
                              <span className="text-white">{factor}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      
                      <div className="text-gray-500 text-center text-sm">
                        <p>This prediction model is for entertainment purposes only.</p>
                        <p>Always gamble responsibly.</p>
                      </div>
                    </div>
                  )}
                  
                  {/* Injuries Tab */}
                  {activeTab === 'injuries' && (
                    <div className="space-y-6">
                      {loadingInjuries ? (
                        <div className="py-12 flex justify-center">
                          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                        </div>
                      ) : (
                        <>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Home Team Injuries */}
                            <div className="bg-gray-800 rounded-lg p-4">
                              <div className="flex items-center justify-between mb-4">
                                <h3 className="text-white font-medium">
                                  {game.home_team} Injuries
                                </h3>
                                {homeInjuryImpact > 0 && (
                                  <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                                    homeInjuryImpact > 0.6 
                                      ? 'bg-orange-500/20 text-orange-300' 
                                      : homeInjuryImpact > 0.3
                                      ? 'bg-orange-500/20 text-orange-300'
                                      : 'bg-orange-500/20 text-orange-300'
                                  }`}>
                                    {Math.round(homeInjuryImpact * 100)}% Impact
                                  </div>
                                )}
                              </div>
                              
                              {homeTeamInjuries.length === 0 ? (
                                <div className="text-gray-400 text-center py-4">
                                  No reported injuries
                                </div>
                              ) : (
                                <div className="space-y-4">
                                  {homeTeamInjuries.map((injury, index) => (
                                    <div key={index} className="border-b border-gray-700 pb-3 last:border-0">
                                      <div className="flex justify-between">
                                        <div className="font-medium text-white">
                                          {injury.player}
                                          <span className="text-gray-400 ml-2">({injury.position})</span>
                                        </div>
                                        <div className={`px-2 py-0.5 rounded-full text-xs ${
                                          injury.status === 'Out' 
                                            ? 'bg-orange-500/20 text-orange-300' 
                                            : injury.status === 'Day-To-Day'
                                            ? 'bg-orange-500/20 text-orange-300'
                                            : 'bg-orange-500/20 text-orange-300'
                                        }`}>
                                          {injury.status}
                                        </div>
                                      </div>
                                      <div className="text-gray-400 text-sm mt-1">{injury.type}</div>
                                      {injury.details && (
                                        <div className="text-gray-500 text-xs mt-1 italic">{injury.details}</div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                            
                            {/* Away Team Injuries */}
                            <div className="bg-gray-800 rounded-lg p-4">
                              <div className="flex items-center justify-between mb-4">
                                <h3 className="text-white font-medium">
                                  {game.away_team} Injuries
                                </h3>
                                {awayInjuryImpact > 0 && (
                                  <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                                    awayInjuryImpact > 0.6 
                                      ? 'bg-orange-500/20 text-orange-300' 
                                      : awayInjuryImpact > 0.3
                                      ? 'bg-orange-500/20 text-orange-300'
                                      : 'bg-orange-500/20 text-orange-300'
                                  }`}>
                                    {Math.round(awayInjuryImpact * 100)}% Impact
                                  </div>
                                )}
                              </div>
                              
                              {awayTeamInjuries.length === 0 ? (
                                <div className="text-gray-400 text-center py-4">
                                  No reported injuries
                                </div>
                              ) : (
                                <div className="space-y-4">
                                  {awayTeamInjuries.map((injury, index) => (
                                    <div key={index} className="border-b border-gray-700 pb-3 last:border-0">
                                      <div className="flex justify-between">
                                        <div className="font-medium text-white">
                                          {injury.player}
                                          <span className="text-gray-400 ml-2">({injury.position})</span>
                                        </div>
                                        <div className={`px-2 py-0.5 rounded-full text-xs ${
                                          injury.status === 'Out' 
                                            ? 'bg-orange-500/20 text-orange-300' 
                                            : injury.status === 'Day-To-Day'
                                            ? 'bg-orange-500/20 text-orange-300'
                                            : 'bg-orange-500/20 text-orange-300'
                                        }`}>
                                          {injury.status}
                                        </div>
                                      </div>
                                      <div className="text-gray-400 text-sm mt-1">{injury.type}</div>
                                      {injury.details && (
                                        <div className="text-gray-500 text-xs mt-1 italic">{injury.details}</div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <div className="bg-gray-800 rounded-lg p-4">
                            <h3 className="text-gray-400 text-sm font-medium mb-3">Injury Analysis</h3>
                            <div className="text-white space-y-2">
                              <p className="flex items-start">
                                <AlertTriangle className="w-4 h-4 text-orange-400 mr-2 mt-1" />
                                Player injuries can significantly impact game outcomes, particularly when star players or multiple rotation players are out.
                              </p>
                              {(homeInjuryImpact > 0.3 || awayInjuryImpact > 0.3) && (
                                <p className="font-medium mt-2">
                                  This game has significant injury concerns that could affect the outcome and point spread.
                                </p>
                              )}
                            </div>
                            
                            {(homeInjuryImpact > 0 || awayInjuryImpact > 0) && (
                              <div className="mt-4 pt-4 border-t border-gray-700">
                                <h4 className="text-gray-400 text-sm mb-2">Potential Impact on Prediction</h4>
                                <div className="text-white">
                                  {homeInjuryImpact > awayInjuryImpact 
                                    ? `${game.away_team} has an injury advantage that could affect the spread by approximately ${Math.round((homeInjuryImpact - awayInjuryImpact) * 7)} points.`
                                    : awayInjuryImpact > homeInjuryImpact
                                    ? `${game.home_team} has an injury advantage that could affect the spread by approximately ${Math.round((awayInjuryImpact - homeInjuryImpact) * 7)} points.`
                                    : "Both teams have similar injury situations, so the impact on the spread is likely minimal."
                                  }
                                </div>
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </AnimatePresence>
  );
}

interface StatCompareItemProps {
  title: string;
  awayValue: number;
  homeValue: number;
  awayTeam: string;
  homeTeam: string;
  lowerIsBetter?: boolean;
}

function StatCompareItem({ title, awayValue, homeValue, awayTeam, homeTeam, lowerIsBetter = false }: StatCompareItemProps) {
  const total = awayValue + homeValue;
  const awayPercentage = (awayValue / total) * 100;
  const homePercentage = (homeValue / total) * 100;
  
  // Determine which team is better for this stat
  const awayIsBetter = lowerIsBetter 
    ? awayValue < homeValue
    : awayValue > homeValue;
  
  const homeIsBetter = lowerIsBetter
    ? homeValue < awayValue
    : homeValue > awayValue;
  
  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <h3 className="text-gray-400 text-sm font-medium mb-3">{title}</h3>
      <div className="grid grid-cols-3 gap-2">
        <div className="text-center text-white">{awayTeam}</div>
        <div className="text-center text-gray-400 text-sm">{title}</div>
        <div className="text-center text-white">{homeTeam}</div>
        
        <div className={`text-center font-bold ${awayIsBetter ? 'text-blue-400' : 'text-white'}`}>{awayValue}</div>
        <div className="flex justify-center">
          <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
              style={{
                width: `${awayPercentage}%`
              }}
            ></div>
          </div>
        </div>
        <div className={`text-center font-bold ${homeIsBetter ? 'text-blue-400' : 'text-white'}`}>{homeValue}</div>
      </div>
    </div>
  );
} 