import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date');

  try {
    // Run the Python script with the date parameter
    const { stdout, stderr } = await execAsync(`python ../scripts/espn_api.py ${date}`);
    
    if (stderr) {
      console.error('Python script stderr:', stderr);
    }
    
    // Parse the JSON output from the Python script
    const games = JSON.parse(stdout);
    
    return NextResponse.json(games);
  } catch (error) {
    console.error('Error fetching games:', error);
    return NextResponse.json(
      { error: 'Failed to fetch games. Please try again later.' },
      { status: 500 }
    );
  }
} 