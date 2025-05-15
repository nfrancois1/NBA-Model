import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import { parse } from 'csv-parse/sync';

// Define interface for injury data
interface InjuryRecord {
  TEAM: string;
  PLAYER: string;
  POSITION: string;
  INJURY_TYPE: string;
  INJURY_STATUS: string;
  START_DATE: string;
  DETAILS: string;
  FETCHED_AT: string;
}

// Team-specific player database
const teamPlayers: Record<string, {name: string, position: string}[]> = {
  // Eastern Conference
  "Boston Celtics": [
    { name: "Jayson Tatum", position: "SF" },
    { name: "Jaylen Brown", position: "SG" },
    { name: "Kristaps Porzingis", position: "C" },
    { name: "Jrue Holiday", position: "PG" },
    { name: "Derrick White", position: "SG" }
  ],
  "Milwaukee Bucks": [
    { name: "Giannis Antetokounmpo", position: "PF" },
    { name: "Damian Lillard", position: "PG" },
    { name: "Khris Middleton", position: "SF" },
    { name: "Brook Lopez", position: "C" },
    { name: "Bobby Portis", position: "PF" }
  ],
  "Philadelphia 76ers": [
    { name: "Joel Embiid", position: "C" },
    { name: "Tyrese Maxey", position: "PG" },
    { name: "Tobias Harris", position: "PF" },
    { name: "Kelly Oubre Jr.", position: "SF" },
    { name: "Paul Reed", position: "C" }
  ],
  "New York Knicks": [
    { name: "Jalen Brunson", position: "PG" },
    { name: "Julius Randle", position: "PF" },
    { name: "OG Anunoby", position: "SF" },
    { name: "Josh Hart", position: "SG" },
    { name: "Mitchell Robinson", position: "C" }
  ],
  "Cleveland Cavaliers": [
    { name: "Donovan Mitchell", position: "SG" },
    { name: "Darius Garland", position: "PG" },
    { name: "Evan Mobley", position: "PF" },
    { name: "Jarrett Allen", position: "C" },
    { name: "Max Strus", position: "SF" }
  ],
  "Miami Heat": [
    { name: "Jimmy Butler", position: "SF" },
    { name: "Bam Adebayo", position: "C" },
    { name: "Tyler Herro", position: "SG" },
    { name: "Terry Rozier", position: "PG" },
    { name: "Duncan Robinson", position: "SF" }
  ],
  "Indiana Pacers": [
    { name: "Tyrese Haliburton", position: "PG" },
    { name: "Pascal Siakam", position: "PF" },
    { name: "Myles Turner", position: "C" },
    { name: "Bennedict Mathurin", position: "SG" },
    { name: "T.J. McConnell", position: "PG" }
  ],
  // Western Conference
  "Denver Nuggets": [
    { name: "Nikola Jokic", position: "C" },
    { name: "Jamal Murray", position: "PG" },
    { name: "Michael Porter Jr.", position: "SF" },
    { name: "Aaron Gordon", position: "PF" },
    { name: "Kentavious Caldwell-Pope", position: "SG" }
  ],
  "Minnesota Timberwolves": [
    { name: "Anthony Edwards", position: "SG" },
    { name: "Karl-Anthony Towns", position: "PF" },
    { name: "Rudy Gobert", position: "C" },
    { name: "Jaden McDaniels", position: "SF" },
    { name: "Mike Conley", position: "PG" }
  ],
  "Oklahoma City Thunder": [
    { name: "Shai Gilgeous-Alexander", position: "PG" },
    { name: "Chet Holmgren", position: "C" },
    { name: "Jalen Williams", position: "SF" },
    { name: "Lu Dort", position: "SG" },
    { name: "Josh Giddey", position: "PG" }
  ],
  "Los Angeles Lakers": [
    { name: "LeBron James", position: "SF" },
    { name: "Anthony Davis", position: "PF" },
    { name: "D'Angelo Russell", position: "PG" },
    { name: "Austin Reaves", position: "SG" },
    { name: "Rui Hachimura", position: "PF" }
  ],
  "Golden State Warriors": [
    { name: "Stephen Curry", position: "PG" },
    { name: "Klay Thompson", position: "SG" },
    { name: "Draymond Green", position: "PF" },
    { name: "Andrew Wiggins", position: "SF" },
    { name: "Jonathan Kuminga", position: "PF" }
  ],
  "Phoenix Suns": [
    { name: "Kevin Durant", position: "SF" },
    { name: "Devin Booker", position: "SG" },
    { name: "Bradley Beal", position: "SG" },
    { name: "Jusuf Nurkic", position: "C" },
    { name: "Grayson Allen", position: "SG" }
  ],
  "Dallas Mavericks": [
    { name: "Luka Doncic", position: "PG" },
    { name: "Kyrie Irving", position: "PG" },
    { name: "P.J. Washington", position: "PF" },
    { name: "Daniel Gafford", position: "C" },
    { name: "Derrick Jones Jr.", position: "SF" }
  ]
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const team = searchParams.get('team');
    
    // Generate realistic injury data
    const generateInjuries = (teamName: string): InjuryRecord[] => {
      const injuryTypes = [
        "Ankle Sprain", "Knee Soreness", "Back Tightness", "Hamstring Strain", 
        "Rest", "Illness", "Shoulder", "Concussion Protocol", "Hip Flexor"
      ];
      
      const statuses = ["Out", "Day-To-Day", "Probable", "Questionable"];
      
      const details = [
        "Missing 2-3 weeks", "Game time decision", "Expected to play", 
        "Limited minutes", "Will be re-evaluated", "No timetable for return"
      ];
      
      // Find team players or use default if team not found
      const players = teamPlayers[teamName] || [
        { name: "Player One", position: "SF" }, 
        { name: "Player Two", position: "PG" }
      ];
      
      // Generate 0-2 random injuries
      const injuryCount = Math.floor(Math.random() * 3);
      const injuries: InjuryRecord[] = [];
      
      // Create shuffled array of player indices to randomly select players
      const playerIndices = players.map((_, index) => index);
      for (let i = playerIndices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [playerIndices[i], playerIndices[j]] = [playerIndices[j], playerIndices[i]];
      }
      
      for (let i = 0; i < injuryCount; i++) {
        if (i < players.length) {
          const playerIndex = playerIndices[i];
          const player = players[playerIndex];
          
          injuries.push({
            TEAM: teamName,
            PLAYER: player.name,
            POSITION: player.position,
            INJURY_TYPE: injuryTypes[Math.floor(Math.random() * injuryTypes.length)],
            INJURY_STATUS: statuses[Math.floor(Math.random() * statuses.length)],
            START_DATE: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Random date within last week
            DETAILS: details[Math.floor(Math.random() * details.length)],
            FETCHED_AT: new Date().toISOString()
          });
        }
      }
      
      return injuries;
    };
    
    // Generate injuries for the requested team
    const injuries = team ? generateInjuries(team) : [];
    
    return NextResponse.json({
      injuries: injuries,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching injury data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch injury data' },
      { status: 500 }
    );
  }
} 