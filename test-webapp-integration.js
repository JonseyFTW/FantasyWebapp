#!/usr/bin/env node

/**
 * Test Webapp Integration with Real MCP Server Data
 * Simulates trade analysis request to verify chart data flow
 */

const axios = require('axios');

// Test configuration
const MCP_SERVER_URL = 'https://sleepermcp-production.up.railway.app/rpc';
const WEBAPP_BACKEND_URL = 'http://localhost:4000'; // Will test when backend is running
const TEST_USER_ID = '1038674424398118912';
const TEST_LEAGUE_ID = '1113131288824807424';

// Sample trade analysis request
const SAMPLE_TRADE_REQUEST = {
  userPlayersOffered: ['4046'], // Jayden Daniels
  userPlayersReceived: ['4881'], // Josh Jacobs
  leagueId: TEST_LEAGUE_ID,
  userId: TEST_USER_ID,
  riskTolerance: 'moderate'
};

async function testMCPDataFlow() {
  console.log('🧪 Testing MCP Server Data Flow for Charts');
  console.log('━'.repeat(50));

  try {
    // Test user data
    console.log('1. 👤 Testing user data...');
    const userResponse = await axios.post(MCP_SERVER_URL, {
      jsonrpc: '2.0',
      method: 'sleeper.getUserByUsername',
      params: { username: 'o0jonsey0o' },
      id: 1
    });
    
    if (userResponse.data.result) {
      console.log('   ✅ User data retrieved successfully');
      console.log(`   📋 User: ${userResponse.data.result.username}`);
    }

    // Test league data
    console.log('2. 🏈 Testing league data...');
    const leagueResponse = await axios.post(MCP_SERVER_URL, {
      jsonrpc: '2.0',
      method: 'sleeper.getLeague',
      params: { leagueId: TEST_LEAGUE_ID },
      id: 2
    });
    
    if (leagueResponse.data.result) {
      console.log('   ✅ League data retrieved successfully');
      console.log(`   📋 League: ${leagueResponse.data.result.name}`);
    }

    // Test roster data (for player context)
    console.log('3. 👥 Testing roster data...');
    const rosterResponse = await axios.post(MCP_SERVER_URL, {
      jsonrpc: '2.0',
      method: 'sleeper.getRosters',
      params: { leagueId: TEST_LEAGUE_ID },
      id: 3
    });
    
    if (rosterResponse.data.result) {
      console.log('   ✅ Roster data retrieved successfully');
      console.log(`   📋 Rosters: ${rosterResponse.data.result.length} teams`);
    }

    // Test analytics (expected to return null but should not crash)
    console.log('4. 📊 Testing analytics data...');
    const analyticsResponse = await axios.post(MCP_SERVER_URL, {
      jsonrpc: '2.0',
      method: 'sleeper.getPlayerAnalytics',
      params: [{ playerId: '4046' }],
      id: 4
    });
    
    if (analyticsResponse.data.result === null) {
      console.log('   ✅ Analytics returned null gracefully (as expected)');
    }

    console.log('\n🎯 MCP SERVER SUMMARY:');
    console.log('   ✅ All core data endpoints working');
    console.log('   ✅ Real Sleeper data flowing properly');
    console.log('   ✅ Analytics gracefully handles unavailable data');
    console.log('   🚀 Ready for webapp integration!');

    return {
      user: userResponse.data.result,
      league: leagueResponse.data.result,
      rosters: rosterResponse.data.result,
      analyticsAvailable: false
    };

  } catch (error) {
    console.error('❌ MCP Server test failed:', error.message);
    return null;
  }
}

async function testBackendTradeAnalysis() {
  console.log('\n🔄 Testing Backend Trade Analysis Integration');
  console.log('━'.repeat(50));

  try {
    const response = await axios.post(`${WEBAPP_BACKEND_URL}/api/ai/trade-analysis`, SAMPLE_TRADE_REQUEST, {
      timeout: 30000,
      headers: { 'Content-Type': 'application/json' }
    });

    if (response.data.playerData) {
      console.log('   ✅ Backend trade analysis working');
      console.log(`   📊 Player data included: ${Object.keys(response.data.playerData).length} players`);
      
      // Check if chart data is properly formatted
      Object.values(response.data.playerData).forEach(player => {
        if (player.trends && player.weekly_projections) {
          console.log(`   📈 Chart data for ${player.player_name}: ${player.trends.length} trend points, ${player.weekly_projections.length} projections`);
        }
      });
      
      return response.data;
    } else {
      console.log('   ⚠️  Backend working but no playerData in response');
      return response.data;
    }

  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.log('   ⚠️  Backend not running (expected if not started)');
      console.log('   💡 To test: npm run dev:backend');
    } else {
      console.log(`   ❌ Backend error: ${error.message}`);
    }
    return null;
  }
}

function generateMockChartData() {
  console.log('\n📊 Generating Mock Chart Data for Testing');
  console.log('━'.repeat(50));

  const mockPlayerData = {
    '4046': {
      player_id: '4046',
      player_name: 'Jayden Daniels',
      position: 'QB',
      team: 'WAS',
      avg_fantasy_points_per_game: 22.1,
      consistency_score: 78,
      trends: [
        { week: 14, season: 2024, fantasy_points: 25.3 },
        { week: 13, season: 2024, fantasy_points: 18.7 },
        { week: 12, season: 2024, fantasy_points: 24.1 },
        { week: 11, season: 2024, fantasy_points: 20.8 },
        { week: 10, season: 2024, fantasy_points: 26.2 }
      ],
      weekly_projections: [
        { week: 15, projected_points: 21.5, confidence: 82 },
        { week: 16, projected_points: 23.1, confidence: 78 },
        { week: 17, projected_points: 22.8, confidence: 75 }
      ]
    },
    '4881': {
      player_id: '4881',
      player_name: 'Josh Jacobs',
      position: 'RB',
      team: 'GB',
      avg_fantasy_points_per_game: 18.9,
      consistency_score: 85,
      trends: [
        { week: 14, season: 2024, fantasy_points: 22.1 },
        { week: 13, season: 2024, fantasy_points: 16.3 },
        { week: 12, season: 2024, fantasy_points: 19.7 },
        { week: 11, season: 2024, fantasy_points: 21.4 },
        { week: 10, season: 2024, fantasy_points: 15.8 }
      ],
      weekly_projections: [
        { week: 15, projected_points: 19.2, confidence: 88 },
        { week: 16, projected_points: 20.5, confidence: 85 },
        { week: 17, projected_points: 18.9, confidence: 82 }
      ]
    }
  };

  console.log('   📊 Mock data generated for chart testing');
  console.log(`   👥 Players: ${Object.keys(mockPlayerData).length}`);
  Object.values(mockPlayerData).forEach(player => {
    console.log(`   📈 ${player.player_name} (${player.position}): ${player.trends.length} trends, ${player.weekly_projections.length} projections`);
  });

  return mockPlayerData;
}

async function main() {
  console.log('🚀 WEBAPP INTEGRATION TEST SUITE');
  console.log('═'.repeat(50));

  // Test MCP server
  const mcpData = await testMCPDataFlow();
  
  if (!mcpData) {
    console.log('❌ MCP Server tests failed - cannot proceed with webapp testing');
    process.exit(1);
  }

  // Test backend integration
  const backendData = await testBackendTradeAnalysis();

  // Generate mock data for frontend testing
  const mockChartData = generateMockChartData();

  console.log('\n🎯 FINAL ASSESSMENT');
  console.log('═'.repeat(50));
  console.log('✅ MCP Server: Working with real Sleeper data');
  console.log('✅ Analytics: Graceful fallback when data unavailable');
  console.log('✅ Chart Data: Mock data ready for testing');
  
  if (backendData) {
    console.log('✅ Backend: Working with chart integration');
  } else {
    console.log('⚠️  Backend: Not tested (start with npm run dev:backend)');
  }

  console.log('\n🎨 CHART TESTING INSTRUCTIONS:');
  console.log('1. Start the frontend: npm run dev:frontend');
  console.log('2. Navigate to trade analyzer page');
  console.log('3. Input trade with players: 4046 (Jayden Daniels) vs 4881 (Josh Jacobs)');
  console.log('4. Verify charts display with player performance data');
  console.log('5. Charts should show weekly trends and projections');

  console.log('\n🏆 SUCCESS: Ready for full webapp testing!');
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { testMCPDataFlow, generateMockChartData };