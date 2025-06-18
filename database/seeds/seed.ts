import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Create sample achievements
  const achievements = await Promise.all([
    prisma.achievement.upsert({
      where: { name: 'First Blood' },
      update: {},
      create: {
        name: 'First Blood',
        description: 'Win your first matchup of the season',
        category: 'wins',
        points: 10,
      },
    }),
    prisma.achievement.upsert({
      where: { name: 'Perfect Week' },
      update: {},
      create: {
        name: 'Perfect Week',
        description: 'All your starting players score above their projections',
        category: 'performance',
        points: 25,
      },
    }),
    prisma.achievement.upsert({
      where: { name: 'Comeback Kid' },
      update: {},
      create: {
        name: 'Comeback Kid',
        description: 'Win a matchup after being down by 20+ points',
        category: 'clutch',
        points: 20,
      },
    }),
    prisma.achievement.upsert({
      where: { name: 'High Roller' },
      update: {},
      create: {
        name: 'High Roller',
        description: 'Score 150+ points in a single week',
        category: 'scoring',
        points: 15,
      },
    }),
    prisma.achievement.upsert({
      where: { name: 'League Champion' },
      update: {},
      create: {
        name: 'League Champion',
        description: 'Win the league championship',
        category: 'championship',
        points: 100,
      },
    }),
  ]);

  console.log(`✅ Created ${achievements.length} achievements`);

  // Create sample users for testing
  const testUsers = await Promise.all([
    prisma.user.upsert({
      where: { email: 'test1@example.com' },
      update: {},
      create: {
        email: 'test1@example.com',
        displayName: 'Test User 1',
        sleeperUserId: 'sleeper_user_1',
        preferences: {
          riskTolerance: 'moderate',
          notificationSettings: {
            email: true,
            push: true,
            weeklyReport: true,
            tradeAlerts: true,
          },
          theme: 'system',
        },
      },
    }),
    prisma.user.upsert({
      where: { email: 'test2@example.com' },
      update: {},
      create: {
        email: 'test2@example.com',
        displayName: 'Test User 2',
        sleeperUserId: 'sleeper_user_2',
        preferences: {
          riskTolerance: 'aggressive',
          notificationSettings: {
            email: false,
            push: true,
            weeklyReport: false,
            tradeAlerts: true,
          },
          theme: 'dark',
        },
      },
    }),
  ]);

  console.log(`✅ Created ${testUsers.length} test users`);

  // Create sample league
  const testLeague = await prisma.league.upsert({
    where: { sleeperLeagueId: 'test_league_123' },
    update: {},
    create: {
      sleeperLeagueId: 'test_league_123',
      name: 'Test Fantasy League',
      season: 2024,
      totalRosters: 12,
      scoringFormat: 'ppr',
      settings: {
        playoffWeekStart: 15,
        playoffTeams: 6,
        rosterPositions: ['QB', 'RB', 'RB', 'WR', 'WR', 'TE', 'FLEX', 'K', 'DEF', 'BN', 'BN', 'BN', 'BN', 'BN', 'BN'],
        scoring: {
          pass_yd: 0.04,
          pass_td: 4,
          pass_int: -2,
          rush_yd: 0.1,
          rush_td: 6,
          rec: 1,
          rec_yd: 0.1,
          rec_td: 6,
          fum_lost: -2,
        },
      },
    },
  });

  console.log(`✅ Created test league: ${testLeague.name}`);

  // Create user league relationships
  const userLeagues = await Promise.all([
    prisma.userLeague.upsert({
      where: { 
        userId_leagueId: {
          userId: testUsers[0].id,
          leagueId: testLeague.id,
        }
      },
      update: {},
      create: {
        userId: testUsers[0].id,
        leagueId: testLeague.id,
        sleeperRosterId: 'roster_1',
        role: 'owner',
      },
    }),
    prisma.userLeague.upsert({
      where: { 
        userId_leagueId: {
          userId: testUsers[1].id,
          leagueId: testLeague.id,
        }
      },
      update: {},
      create: {
        userId: testUsers[1].id,
        leagueId: testLeague.id,
        sleeperRosterId: 'roster_2',
        role: 'member',
      },
    }),
  ]);

  console.log(`✅ Created ${userLeagues.length} user-league relationships`);

  // Create a sample rivalry
  const rivalry = await prisma.leagueRivalry.upsert({
    where: {
      leagueId_user1Id_user2Id: {
        leagueId: testLeague.id,
        user1Id: testUsers[0].id,
        user2Id: testUsers[1].id,
      }
    },
    update: {},
    create: {
      leagueId: testLeague.id,
      user1Id: testUsers[0].id,
      user2Id: testUsers[1].id,
      rivalryName: 'Battle of the Test Users',
      headToHeadRecord: {
        user1Wins: 2,
        user2Wins: 1,
        ties: 0,
      },
    },
  });

  console.log(`✅ Created rivalry: ${rivalry.rivalryName}`);

  // Create sample players
  const players = await Promise.all([
    prisma.player.upsert({
      where: { sleeperPlayerId: 'player_1' },
      update: {},
      create: {
        sleeperPlayerId: 'player_1',
        firstName: 'Josh',
        lastName: 'Allen',
        fullName: 'Josh Allen',
        position: 'QB',
        team: 'BUF',
        age: 27,
        experience: 6,
        fantasyPositions: ['QB'],
        metadata: {
          height: '6-5',
          weight: 237,
          college: 'Wyoming',
        },
      },
    }),
    prisma.player.upsert({
      where: { sleeperPlayerId: 'player_2' },
      update: {},
      create: {
        sleeperPlayerId: 'player_2',
        firstName: 'Christian',
        lastName: 'McCaffrey',
        fullName: 'Christian McCaffrey',
        position: 'RB',
        team: 'SF',
        age: 28,
        experience: 7,
        fantasyPositions: ['RB'],
        metadata: {
          height: '5-11',
          weight: 205,
          college: 'Stanford',
        },
      },
    }),
  ]);

  console.log(`✅ Created ${players.length} sample players`);

  // Create sample notifications
  const notifications = await Promise.all([
    prisma.notification.create({
      data: {
        userId: testUsers[0].id,
        type: 'weekly_report',
        title: 'Weekly Report Ready',
        message: 'Your week 1 fantasy report is now available',
        priority: 'medium',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      },
    }),
    prisma.notification.create({
      data: {
        userId: testUsers[1].id,
        type: 'player_news',
        title: 'Player Injury Update',
        message: 'Christian McCaffrey is questionable for this week',
        priority: 'high',
        expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
      },
    }),
  ]);

  console.log(`✅ Created ${notifications.length} sample notifications`);

  console.log('🎉 Database seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });