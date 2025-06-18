export const NFL_TEAMS = {
  ARI: 'Arizona Cardinals',
  ATL: 'Atlanta Falcons',
  BAL: 'Baltimore Ravens',
  BUF: 'Buffalo Bills',
  CAR: 'Carolina Panthers',
  CHI: 'Chicago Bears',
  CIN: 'Cincinnati Bengals',
  CLE: 'Cleveland Browns',
  DAL: 'Dallas Cowboys',
  DEN: 'Denver Broncos',
  DET: 'Detroit Lions',
  GB: 'Green Bay Packers',
  HOU: 'Houston Texans',
  IND: 'Indianapolis Colts',
  JAX: 'Jacksonville Jaguars',
  KC: 'Kansas City Chiefs',
  LV: 'Las Vegas Raiders',
  LAC: 'Los Angeles Chargers',
  LAR: 'Los Angeles Rams',
  MIA: 'Miami Dolphins',
  MIN: 'Minnesota Vikings',
  NE: 'New England Patriots',
  NO: 'New Orleans Saints',
  NYG: 'New York Giants',
  NYJ: 'New York Jets',
  PHI: 'Philadelphia Eagles',
  PIT: 'Pittsburgh Steelers',
  SF: 'San Francisco 49ers',
  SEA: 'Seattle Seahawks',
  TB: 'Tampa Bay Buccaneers',
  TEN: 'Tennessee Titans',
  WAS: 'Washington Commanders',
} as const;

export const POSITIONS = {
  QB: 'Quarterback',
  RB: 'Running Back',
  WR: 'Wide Receiver',
  TE: 'Tight End',
  K: 'Kicker',
  DEF: 'Defense/Special Teams',
} as const;

export const SCORING_FORMATS = {
  standard: 'Standard',
  ppr: 'Points Per Reception',
  half_ppr: 'Half Point Per Reception',
  superflex: 'Superflex',
} as const;

export const RISK_LEVELS = {
  conservative: 'Conservative',
  moderate: 'Moderate',
  aggressive: 'Aggressive',
} as const;

export const RECOMMENDATION_TYPES = {
  start: 'Start',
  sit: 'Sit',
  pickup: 'Pickup',
  drop: 'Drop',
  trade_target: 'Trade Target',
  avoid: 'Avoid',
} as const;

export const ANALYSIS_TYPES = {
  start_sit: 'Start/Sit Analysis',
  waiver_wire: 'Waiver Wire',
  trade_analysis: 'Trade Analysis',
  draft_grade: 'Draft Grade',
  playoff_odds: 'Playoff Odds',
  power_ranking: 'Power Ranking',
  matchup_preview: 'Matchup Preview',
  season_outlook: 'Season Outlook',
} as const;

export const NOTIFICATION_TYPES = {
  score_alert: 'Score Alert',
  player_news: 'Player News',
  trade_offer: 'Trade Offer',
  waiver_success: 'Waiver Success',
  matchup_reminder: 'Matchup Reminder',
  weekly_report: 'Weekly Report',
  achievement_unlocked: 'Achievement Unlocked',
  rivalry_update: 'Rivalry Update',
} as const;

export const WEBSOCKET_EVENTS = {
  score_update: 'score_update',
  lineup_change: 'lineup_change',
  trade_proposal: 'trade_proposal',
  waiver_claim: 'waiver_claim',
  chat_message: 'chat_message',
  rivalry_update: 'rivalry_update',
  notification: 'notification',
  connection_status: 'connection_status',
} as const;

export const API_ENDPOINTS = {
  // Auth
  AUTH_LOGIN: '/api/auth/login',
  AUTH_LOGOUT: '/api/auth/logout',
  AUTH_PROFILE: '/api/auth/profile',
  
  // Users
  USERS_BASE: '/api/users',
  USERS_PROFILE: '/api/users/profile',
  USERS_PREFERENCES: '/api/users/preferences',
  
  // Leagues
  LEAGUES_BASE: '/api/leagues',
  LEAGUES_MEMBERS: '/api/leagues/:id/members',
  LEAGUES_CHAT: '/api/leagues/:id/chat',
  LEAGUES_RIVALRIES: '/api/leagues/:id/rivalries',
  
  // Players
  PLAYERS_BASE: '/api/players',
  PLAYERS_STATS: '/api/players/:id/stats',
  PLAYERS_PROJECTIONS: '/api/players/:id/projections',
  PLAYERS_RECOMMENDATIONS: '/api/players/recommendations',
  
  // AI Analysis
  AI_ANALYSIS: '/api/ai/analysis',
  AI_START_SIT: '/api/ai/start-sit',
  AI_WAIVER_WIRE: '/api/ai/waiver-wire',
  AI_TRADE_ANALYSIS: '/api/ai/trade-analysis',
  
  // Analytics
  ANALYTICS_POWER_RANKINGS: '/api/analytics/power-rankings',
  ANALYTICS_PLAYOFF_ODDS: '/api/analytics/playoff-odds',
  ANALYTICS_MATCHUP_PREVIEW: '/api/analytics/matchup-preview',
} as const;

export const CACHE_KEYS = {
  USER_PROFILE: 'user:profile',
  LEAGUE_DATA: 'league:data',
  PLAYER_STATS: 'player:stats',
  POWER_RANKINGS: 'analytics:power_rankings',
  PLAYOFF_ODDS: 'analytics:playoff_odds',
} as const;

export const CACHE_TTL = {
  SHORT: 60, // 1 minute
  MEDIUM: 300, // 5 minutes
  LONG: 3600, // 1 hour
  DAILY: 86400, // 24 hours
} as const;

export const FANTASY_CONSTANTS = {
  REGULAR_SEASON_WEEKS: 14,
  PLAYOFF_WEEKS: 4,
  TOTAL_WEEKS: 18,
  MIN_ROSTER_SIZE: 15,
  MAX_ROSTER_SIZE: 20,
  MIN_LEAGUE_SIZE: 8,
  MAX_LEAGUE_SIZE: 32,
} as const;

export const ERROR_MESSAGES = {
  VALIDATION_ERROR: 'Invalid input provided',
  AUTHENTICATION_ERROR: 'Authentication required',
  AUTHORIZATION_ERROR: 'Insufficient permissions',
  NOT_FOUND: 'Resource not found',
  RATE_LIMIT_EXCEEDED: 'Rate limit exceeded',
  INTERNAL_SERVER_ERROR: 'Internal server error',
  SERVICE_UNAVAILABLE: 'Service temporarily unavailable',
} as const;