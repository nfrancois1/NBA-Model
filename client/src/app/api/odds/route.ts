import { NextRequest, NextResponse } from 'next/server';

// Use a real API key from a service like The Odds API
const API_KEY = process.env.ODDS_API_KEY;
console.log('ODDS_API_KEY:', API_KEY); // Debug log to check if the key is loaded

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const gameId = searchParams.get('gameId');
  const homeTeam = searchParams.get('homeTeam');
  const awayTeam = searchParams.get('awayTeam');
  
  if (!gameId && (!homeTeam || !awayTeam)) {
    return NextResponse.json(
      { error: 'Missing gameId OR homeTeam and awayTeam parameters' },
      { status: 400 }
    );
  }
  
  try {
    // Fetch all NBA odds from The Odds API
    const oddsResponse = await fetch(
      `https://api.the-odds-api.com/v4/sports/basketball_nba/odds/?apiKey=${API_KEY}&regions=us&markets=h2h,spreads,totals`
    );

    if (!oddsResponse.ok) {
      // Log the full response for debugging
      const errorText = await oddsResponse.text();
      console.error('External odds API error:', oddsResponse.status, errorText);
      throw new Error(`Error fetching odds: ${oddsResponse.statusText}`);
    }

    const oddsData = await oddsResponse.json();
    
    // Try to find a game by team names (more reliable)
    let event;
    if (homeTeam && awayTeam) {
      // Normalize team names for comparison
      const normalizedHomeTeam = homeTeam.toLowerCase().trim();
      const normalizedAwayTeam = awayTeam.toLowerCase().trim();
      
      event = oddsData.find((ev: any) => {
        const evHomeTeam = ev.home_team.toLowerCase().trim();
        const evAwayTeam = ev.away_team.toLowerCase().trim();
        return (
          (evHomeTeam.includes(normalizedHomeTeam) || normalizedHomeTeam.includes(evHomeTeam)) &&
          (evAwayTeam.includes(normalizedAwayTeam) || normalizedAwayTeam.includes(evAwayTeam))
        );
      });
    }
    
    // If no match by team names, try by ID
    if (!event && gameId) {
      event = oddsData.find((ev: any) => ev.id === gameId);
    }

    if (!event) {
      // If no match, return a 404 with a clear error
      return NextResponse.json(
        { error: 'No odds found for this game' },
        { status: 404 }
      );
    }

    // Add original team names to the event data for easier parsing (optional, for frontend mapping)
    if (homeTeam && awayTeam) {
      return NextResponse.json({
        ...event,
        original_request: {
          home_team: homeTeam,
          away_team: awayTeam,
          gameId: gameId
        }
      });
    }

    // Pass through the real odds event as-is
    return NextResponse.json(event);
  } catch (error) {
    // Log the error for debugging
    console.error('Error fetching odds data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch odds data', details: error instanceof Error ? error.message : error },
      { status: 500 }
    );
  }
} 