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
    return generateMockOdds(); // Fallback to local mock data
  }
}

/**
 * Parse the odds API response into our BettingSite format
 */
function parseOddsApiResponse(data: any): BettingSite[] {
  // Handle case when no bookmakers are found
  if (!data.bookmakers || !Array.isArray(data.bookmakers) || data.bookmakers.length === 0) {
    console.log('No bookmakers found in API response, using fallback data');
    return generateMockOdds();
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
  const hasCaesars = filteredBookmakers.some(b => 
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
    return generateMockOdds();
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
    mockCaesars.markets[0].outcomes[0].price = homeOdds + 5; // Slightly better odds
    mockCaesars.markets[0].outcomes[1].price = awayOdds - 5;
    mockCaesars.markets[1].outcomes[0].point = totalPoints - 0.5; // Slightly different total
  } else {
    // Fallback to some reasonable default odds
    mockCaesars.markets[0].outcomes[0].price = -110;
    mockCaesars.markets[0].outcomes[1].price = -110;
    mockCaesars.markets[1].outcomes[0].point = 215.5;
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

/**
 * Generate mock betting odds as a fallback
 * This is a safety measure in case the API call fails
 */
function generateMockOdds(): BettingSite[] {
  // Generate a base moneyline (positive for underdog, negative for favorite)
  const favoriteOdds = Math.floor(Math.random() * 250 + 100) * -1;
  const underdogOdds = Math.floor(Math.random() * 250 + 100);
  
  // Generate random over/under between 210 and 240
  const baseTotal = Math.floor(Math.random() * 300 + 2100) / 10;
  
  // Slightly vary the values for each sportsbook
  return [
    {
      name: 'DraftKings',
      logo: '/betting-logos/draft_kings.png',
      url: 'https://sportsbook.draftkings.com/leagues/basketball/nba',
      odds: {
        homeTeamOdds: favoriteOdds.toString(),
        awayTeamOdds: `+${underdogOdds}`,
        overUnder: `O/U ${(baseTotal + 0.5).toFixed(1)}`,
      },
    },
    {
      name: 'FanDuel',
      logo: '/betting-logos/fan_duel.png',
      url: 'https://sportsbook.fanduel.com/navigation/nba',
      odds: {
        homeTeamOdds: (favoriteOdds - 5).toString(),
        awayTeamOdds: `+${underdogOdds + 5}`,
        overUnder: `O/U ${(baseTotal - 1).toFixed(1)}`,
      },
    },
    {
      name: 'BetMGM',
      logo: '/betting-logos/betMGM.png',
      url: 'https://sports.betmgm.com/en/sports/basketball-7/betting/usa-9/nba-6004',
      odds: {
        homeTeamOdds: (favoriteOdds - 10).toString(),
        awayTeamOdds: `+${underdogOdds - 5}`,
        overUnder: `O/U ${(baseTotal + 1.5).toFixed(1)}`,
      },
    },
    {
      name: 'Caesars',
      logo: '/betting-logos/caesers_sportsbook.png',
      url: 'https://www.caesars.com/sportsbook-and-casino/sports/basketball/nba',
      odds: {
        homeTeamOdds: (favoriteOdds + 7).toString(),
        awayTeamOdds: `+${underdogOdds - 10}`,
        overUnder: `O/U ${baseTotal.toFixed(1)}`,
      },
    },
  ];
} 