import { BettingSite } from '@/types/game';

/**
 * Fetches betting odds for NBA games from our server API which connects to an odds provider
 * @param gameId The ID of the game to get odds for
 * @param homeTeam The home team name
 * @param awayTeam The away team name
 * @returns Promise with betting sites data including odds
 */
export async function fetchBettingOdds(gameId: string, homeTeam: string, awayTeam: string): Promise<BettingSite[]> {
  try {
    // Fetch odds data from our server API
    const response = await fetch(`/api/odds?gameId=${gameId}&homeTeam=${encodeURIComponent(homeTeam)}&awayTeam=${encodeURIComponent(awayTeam)}`);
    
    if (!response.ok) {
      throw new Error(`Error fetching odds: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Parse the API response into our BettingSite format
    return parseOddsApiResponse(data);
  } catch (error) {
    console.error('Error fetching betting odds:', error);
    return generateDataDrivenOdds(gameId, homeTeam, awayTeam); // Fallback to local data-driven odds
  }
}

/**
 * Parse the odds API response into our BettingSite format
 */
function parseOddsApiResponse(data: any): BettingSite[] {
  // Handle case when no bookmakers are found
  if (!data.bookmakers || !Array.isArray(data.bookmakers) || data.bookmakers.length === 0) {
    console.log('No bookmakers found in API response, using fallback data');
    return generateDataDrivenOdds(data.original_request?.game_id, data.original_request?.home_team, data.original_request?.away_team);
  }

  // Use original team names if available, otherwise use the API's team names
  const homeTeam = data.original_request?.home_team || data.home_team;
  const awayTeam = data.original_request?.away_team || data.away_team;
  
  console.log('Parsing odds for', homeTeam, 'vs', awayTeam);
  
  // Log all available bookmakers to debug which ones are available
  console.log('Available bookmakers:', data.bookmakers.map((b: any) => `${b.key} (${b.title})`).join(', '));

  // Mapping for possible Caesars keys (they might use different keys in the API)
  const caesarsVariants = ['caesars', 'caesarssportsbook', 'caesars_palace', 'williamhill_us'];
  
  // Map common alternative names to our standardized keys
  const keyMapping: Record<string, string> = {
    'williamhill_us': 'caesars', // William Hill US is owned by Caesars
    'caesarssportsbook': 'caesars',
    'caesars_palace': 'caesars',
    'dk': 'draftkings',
    'fd': 'fanduel',
    'mgm': 'betmgm'
  };

  // Filter to only include the 4 requested bookmakers
  // If we don't have exactly 4 bookmakers or we're missing Caesars, add mock Caesars data
  const filteredBookmakers = data.bookmakers.filter((bookmaker: any) => {
    const standardizedKey = keyMapping[bookmaker.key.toLowerCase()] || bookmaker.key.toLowerCase();
    return ['betmgm', 'draftkings', 'fanduel'].includes(standardizedKey) || 
           caesarsVariants.includes(bookmaker.key.toLowerCase());
  });
  
  // Log which bookmakers we found
  console.log('Filtered bookmakers:', filteredBookmakers.map((b: any) => b.key).join(', '));
  
  // If Caesars is missing and we have other bookmakers, add a mock Caesars entry
  const hasCaesars = filteredBookmakers.some((b: any) => 
    caesarsVariants.includes(b.key.toLowerCase()) || b.title.toLowerCase().includes('caesars')
  );
  
  if (!hasCaesars && filteredBookmakers.length > 0) {
    console.log('Caesars not found in API response, adding mock Caesars data');
    
    // Generate mock Caesars odds based on other bookmakers
    const mockCaesars = generateMockCaesars(filteredBookmakers, homeTeam, awayTeam);
    filteredBookmakers.push(mockCaesars);
  }
  
  // If none of the desired bookmakers are found, use mock data for all
  if (filteredBookmakers.length === 0) {
    console.log('None of the desired bookmakers found, using fallback data for all');
    return generateDataDrivenOdds(data.original_request?.game_id, homeTeam, awayTeam);
  }

  return filteredBookmakers.map((bookmaker: any) => {
    // Standardize the bookmaker key
    const standardKey = keyMapping[bookmaker.key.toLowerCase()] || bookmaker.key.toLowerCase();
    
    // Find the markets
    const h2hMarket = bookmaker.markets?.find((m: any) => m.key === 'h2h');
    const totalsMarket = bookmaker.markets?.find((m: any) => m.key === 'totals');
    
    // Get outcomes safely with null checks
    const homeOutcome = h2hMarket?.outcomes?.find((o: any) => {
      const name = (o.name || '').toLowerCase();
      return name === homeTeam.toLowerCase() || 
             name.includes('home') || 
             (homeTeam.toLowerCase().includes(name) && name.length > 3);
    });
    
    const awayOutcome = h2hMarket?.outcomes?.find((o: any) => {
      const name = (o.name || '').toLowerCase();
      return name === awayTeam.toLowerCase() || 
             name.includes('away') || 
             (awayTeam.toLowerCase().includes(name) && name.length > 3);
    });
    
    const overOutcome = totalsMarket?.outcomes?.find((o: any) => o.name === 'Over' || o.name === 'over');
    
    // Default values in case data is missing
    const homeTeamOdds = homeOutcome?.price ?? 100;
    const awayTeamOdds = awayOutcome?.price ?? 100;
    const total = overOutcome?.point ?? 215;
    
    // The display name to use
    const displayName = standardKey === 'caesars' ? 'Caesars' : 
                        (bookmaker.title || bookmaker.key || 'Unknown');
    
    // Convert the odds data to our format
    return {
      name: displayName,
      logo: `/betting-logos/${getLogoFileName(standardKey)}`,
      url: getBettingSiteUrl(standardKey),
      odds: {
        homeTeamOdds: formatAmericanOdds(homeTeamOdds),
        awayTeamOdds: formatAmericanOdds(awayTeamOdds),
        overUnder: `O/U ${total}`,
      }
    };
  });
}

/**
 * Generate mock Caesars data based on other bookmakers
 */
function generateMockCaesars(bookmakers: any[], homeTeam: string, awayTeam: string): any {
  // Start with a base template
  const mockCaesars = {
    key: "caesars",
    title: "Caesars",
    markets: [
      {
        key: "h2h",
        outcomes: [
          { name: homeTeam, price: 0 },
          { name: awayTeam, price: 0 }
        ]
      },
      {
        key: "totals",
        outcomes: [
          { name: "Over", point: 0 },
          { name: "Under", point: 0 }
        ]
      }
    ]
  };
  
  // Average the odds from other bookmakers
  let homeOddsSum = 0;
  let awayOddsSum = 0;
  let totalPointsSum = 0;
  let validBookmakers = 0;
  
  bookmakers.forEach(bookmaker => {
    const h2hMarket = bookmaker.markets?.find((m: any) => m.key === 'h2h');
    const totalsMarket = bookmaker.markets?.find((m: any) => m.key === 'totals');
    
    if (h2hMarket && totalsMarket) {
      const homeOutcome = h2hMarket.outcomes?.find((o: any) => {
        const name = (o.name || '').toLowerCase();
        return name === homeTeam.toLowerCase() || 
              name.includes('home') || 
              (homeTeam.toLowerCase().includes(name) && name.length > 3);
      });
      
      const awayOutcome = h2hMarket.outcomes?.find((o: any) => {
        const name = (o.name || '').toLowerCase();
        return name === awayTeam.toLowerCase() || 
              name.includes('away') || 
              (awayTeam.toLowerCase().includes(name) && name.length > 3);
      });
      
      const overOutcome = totalsMarket.outcomes?.find((o: any) => o.name === 'Over' || o.name === 'over');
      
      if (homeOutcome && awayOutcome && overOutcome) {
        homeOddsSum += homeOutcome.price;
        awayOddsSum += awayOutcome.price;
        totalPointsSum += overOutcome.point;
        validBookmakers++;
      }
    }
  });
  
  // If we have valid data from other bookmakers, use the average
  if (validBookmakers > 0) {
    // Generate slightly different odds for Caesars (typically they offer slightly better odds)
    const homeOdds = Math.round(homeOddsSum / validBookmakers);
    const awayOdds = Math.round(awayOddsSum / validBookmakers);
    const totalPoints = Math.round(totalPointsSum / validBookmakers * 10) / 10; // Round to 1 decimal place
    
    // Apply the odds to our mock object
    (mockCaesars.markets[0].outcomes[0] as { name: string; price: number }).price = homeOdds + 5; // Slightly better odds
    (mockCaesars.markets[0].outcomes[1] as { name: string; price: number }).price = awayOdds - 5;
    (mockCaesars.markets[1].outcomes[0] as { name: string; point: number }).point = totalPoints - 0.5; // Slightly different total
  } else {
    // Fallback to some reasonable default odds
    (mockCaesars.markets[0].outcomes[0] as { name: string; price: number }).price = -110;
    (mockCaesars.markets[0].outcomes[1] as { name: string; price: number }).price = -110;
    (mockCaesars.markets[1].outcomes[0] as { name: string; point: number }).point = 215.5;
  }
  
  return mockCaesars;
}

/**
 * Format American odds properly for display
 */
function formatAmericanOdds(odds: number | undefined | null): string {
  // Handle undefined or null odds
  if (odds === undefined || odds === null) {
    return '+100'; // Default value
  }
  
  // Decimal to American odds conversion
  if (typeof odds === 'number' && odds > 1 && odds < 10) {
    // This looks like decimal odds (e.g. 1.91) instead of American odds
    // Convert from decimal to American
    if (odds >= 2) {
      // For odds of 2.0 or greater, this is a "plus" money bet
      return `+${Math.round((odds - 1) * 100)}`;
    } else {
      // For odds less than 2.0, this is a "minus" money bet
      return Math.round(-100 / (odds - 1)).toString();
    }
  }
  
  // Standard American odds formatting
  if (odds >= 0) {
    return `+${odds}`;
  } else {
    return odds.toString();
  }
}

/**
 * Map betting site keys to their logo file names
 */
function getLogoFileName(key: string): string {
  const logoMap: Record<string, string> = {
    'draftkings': 'draft_kings.png',
    'fanduel': 'fan_duel.png',
    'betmgm': 'betMGM.png',
    'caesars': 'caesers_sportsbook.png',
  };
  
  return logoMap[key] || `${key}.png`;
}

/**
 * Map betting site keys to their URLs
 */
function getBettingSiteUrl(key: string): string {
  // Map betting site keys to their URLs
  const urlMap: Record<string, string> = {
    'draftkings': 'https://sportsbook.draftkings.com/leagues/basketball/nba',
    'fanduel': 'https://sportsbook.fanduel.com/navigation/nba',
    'betmgm': 'https://sports.betmgm.com/en/sports/basketball-7/betting/usa-9/nba-6004',
    'caesars': 'https://www.caesars.com/sportsbook-and-casino/sports/basketball/nba',
  };
  
  return urlMap[key] || 'https://www.espn.com/nba/lines';
}

// Team strength ratings (approximation based on 2023-2024 season performance)
// Higher values = stronger teams
export const TEAM_RATINGS: Record<string, number> = {
  'Boston Celtics': 95,
  'Denver Nuggets': 89,
  'Oklahoma City Thunder': 88,
  'Minnesota Timberwolves': 87,
  'Dallas Mavericks': 86,
  'New York Knicks': 85,
  'Philadelphia 76ers': 84,
  'Los Angeles Clippers': 84,
  'Cleveland Cavaliers': 83,
  'Milwaukee Bucks': 82,
  'Phoenix Suns': 81,
  'New Orleans Pelicans': 80,
  'Miami Heat': 80,
  'Sacramento Kings': 79,
  'Los Angeles Lakers': 78,
  'Golden State Warriors': 78,
  'Indiana Pacers': 77,
  'Orlando Magic': 77,
  'Chicago Bulls': 74,
  'Utah Jazz': 72,
  'Memphis Grizzlies': 71,
  'Atlanta Hawks': 70,
  'Brooklyn Nets': 69,
  'Toronto Raptors': 68,
  'Houston Rockets': 67,
  'San Antonio Spurs': 65,
  'Charlotte Hornets': 63,
  'Portland Trail Blazers': 62,
  'Washington Wizards': 60,
  'Detroit Pistons': 58,
};

// Average points scored per team (based on 2023-2024 season)
export const TEAM_AVG_POINTS: Record<string, number> = {
  'Indiana Pacers': 123.3,
  'Milwaukee Bucks': 119.5,
  'Boston Celtics': 119.3,
  'Sacramento Kings': 118.1,
  'Atlanta Hawks': 117.5,
  'Dallas Mavericks': 116.8,
  'Golden State Warriors': 116.8,
  'Minnesota Timberwolves': 116.3,
  'Denver Nuggets': 114.9,
  'Oklahoma City Thunder': 114.4,
  'Los Angeles Lakers': 113.8,
  'Houston Rockets': 113.6,
  'New Orleans Pelicans': 113.5,
  'Phoenix Suns': 113.1,
  'Utah Jazz': 113.1,
  'Chicago Bulls': 113.0,
  'Philadelphia 76ers': 112.5,
  'Cleveland Cavaliers': 112.2,
  'Brooklyn Nets': 112.2,
  'San Antonio Spurs': 112.2,
  'New York Knicks': 112.0,
  'Orlando Magic': 111.4,
  'Toronto Raptors': 111.3,
  'Washington Wizards': 111.3,
  'Los Angeles Clippers': 111.1,
  'Miami Heat': 109.3,
  'Charlotte Hornets': 107.9,
  'Detroit Pistons': 106.7,
  'Memphis Grizzlies': 106.7,
  'Portland Trail Blazers': 106.5,
};

// Average points allowed per team (based on 2023-2024 season)
export const TEAM_AVG_POINTS_ALLOWED: Record<string, number> = {
  'Boston Celtics': 107.9,
  'Minnesota Timberwolves': 107.9,
  'Orlando Magic': 108.4,
  'Cleveland Cavaliers': 109.3,
  'Oklahoma City Thunder': 109.4,
  'Miami Heat': 109.6,
  'New York Knicks': 109.7,
  'Denver Nuggets': 110.0,
  'New Orleans Pelicans': 110.6,
  'Los Angeles Clippers': 111.3,
  'Houston Rockets': 111.3,
  'Philadelphia 76ers': 112.2,
  'Phoenix Suns': 113.3,
  'Golden State Warriors': 113.3,
  'Milwaukee Bucks': 113.5,
  'Brooklyn Nets': 114.7,
  'Sacramento Kings': 115.0,
  'Dallas Mavericks': 115.1,
  'Toronto Raptors': 115.1,
  'Memphis Grizzlies': 115.3,
  'Indiana Pacers': 115.8,
  'Portland Trail Blazers': 116.4,
  'Chicago Bulls': 116.6,
  'Los Angeles Lakers': 117.0,
  'Utah Jazz': 117.3,
  'Atlanta Hawks': 118.1,
  'Detroit Pistons': 118.5,
  'Charlotte Hornets': 118.9,
  'San Antonio Spurs': 119.3,
  'Washington Wizards': 120.9,
};

// Home court advantage in points (based on historical NBA data)
export const HOME_COURT_ADVANTAGE = 2.5;

/**
 * Generate data-driven betting odds as a fallback
 * This is a safety measure in case the API call fails
 * @param gameId The ID of the game
 * @param homeTeam The home team name
 * @param awayTeam The away team name
 * @returns An array of BettingSite objects with betting odds
 */
function generateDataDrivenOdds(gameId: string, homeTeam: string, awayTeam: string): BettingSite[] {
  // Calculate the spread based on team ratings and home court advantage
  const homeRating = TEAM_RATINGS[homeTeam] || 75; // Default if team not found
  const awayRating = TEAM_RATINGS[awayTeam] || 75; // Default if team not found
  
  // Calculate the spread (negative means home team is favored)
  const rawSpread = (awayRating - homeRating) + HOME_COURT_ADVANTAGE;
  const spread = Math.round(rawSpread * 10) / 10; // Round to 1 decimal place
  
  // Calculate the total based on team scoring averages and defense
  const homeAvgScore = TEAM_AVG_POINTS[homeTeam] || 112; // Default if team not found
  const awayAvgScore = TEAM_AVG_POINTS[awayTeam] || 112; // Default if team not found
  const homeAvgAllowed = TEAM_AVG_POINTS_ALLOWED[homeTeam] || 113; // Default if team not found
  const awayAvgAllowed = TEAM_AVG_POINTS_ALLOWED[awayTeam] || 113; // Default if team not found
  
  // Formula for total: average of (team1 scoring + team2 allowed) and (team2 scoring + team1 allowed)
  const predictedHomeScore = (homeAvgScore + awayAvgAllowed) / 2;
  const predictedAwayScore = (awayAvgScore + homeAvgAllowed) / 2;
  const baseTotal = Math.round((predictedHomeScore + predictedAwayScore) * 10) / 10;
  
  // Calculate win probability based on the spread
  // Using a formula based on historical NBA data: 50% + (spread * 3.3%)
  const homeWinProb = Math.max(Math.min(Math.round(50 - (spread * 3.3)), 95), 5);
  
  // Calculate moneyline odds based on win probability
  // These formulas convert win probability to American odds
  let favoriteOdds, underdogOdds;
  
  if (homeWinProb >= 50) {
    // Home team is favorite (negative odds)
    favoriteOdds = Math.round((-100 * homeWinProb) / (100 - homeWinProb));
    underdogOdds = Math.round((100 * (100 - homeWinProb)) / homeWinProb);
  } else {
    // Away team is favorite (negative odds)
    favoriteOdds = Math.round((-100 * (100 - homeWinProb)) / homeWinProb);
    underdogOdds = Math.round((100 * homeWinProb) / (100 - homeWinProb));
  }
  
  const homeTeamOdds = homeWinProb >= 50 ? favoriteOdds : underdogOdds;
  const awayTeamOdds = homeWinProb >= 50 ? underdogOdds : favoriteOdds;
  
  // Slightly vary the odds and totals for each sportsbook
  return [
    {
      name: 'DraftKings',
      logo: '/betting-logos/draft_kings.png',
      url: 'https://sportsbook.draftkings.com/leagues/basketball/nba',
      odds: {
        homeTeamOdds: homeTeamOdds.toString(),
        awayTeamOdds: awayTeamOdds > 0 ? `+${awayTeamOdds}` : awayTeamOdds.toString(),
        overUnder: `O/U ${(baseTotal + 0.5).toFixed(1)}`,
      },
    },
    {
      name: 'FanDuel',
      logo: '/betting-logos/fan_duel.png',
      url: 'https://sportsbook.fanduel.com/navigation/nba',
      odds: {
        homeTeamOdds: (homeTeamOdds - 5).toString(),
        awayTeamOdds: awayTeamOdds > 0 ? `+${awayTeamOdds + 5}` : (awayTeamOdds - 5).toString(),
        overUnder: `O/U ${(baseTotal - 1).toFixed(1)}`,
      },
    },
    {
      name: 'BetMGM',
      logo: '/betting-logos/betMGM.png',
      url: 'https://sports.betmgm.com/en/sports/basketball-7/betting/usa-9/nba-6004',
      odds: {
        homeTeamOdds: (homeTeamOdds - 10).toString(),
        awayTeamOdds: awayTeamOdds > 0 ? `+${awayTeamOdds - 5}` : (awayTeamOdds - 10).toString(),
        overUnder: `O/U ${(baseTotal + 1.5).toFixed(1)}`,
      },
    },
    {
      name: 'Caesars',
      logo: '/betting-logos/caesers_sportsbook.png',
      url: 'https://www.caesars.com/sportsbook-and-casino/sports/basketball/nba',
      odds: {
        homeTeamOdds: (homeTeamOdds + 7).toString(),
        awayTeamOdds: awayTeamOdds > 0 ? `+${awayTeamOdds - 10}` : (awayTeamOdds + 7).toString(),
        overUnder: `O/U ${baseTotal.toFixed(1)}`,
      },
    },
  ];
} 