# 🚂 Railway Deployment Guide

This guide will help you deploy the Fantasy Football AI Web Application to Railway with proper service separation and database setup.

## 📋 Prerequisites

1. **Railway Account** with billing enabled
2. **GitHub Repository** with Railway branch
3. **API Keys** for AI providers (OpenAI, Claude, Gemini)
4. **OAuth Applications** (Google, Discord)
5. **Existing Sleeper MCP Server** running on Railway

## 🏗️ Railway Services Architecture

You'll deploy **5 services** in Railway:

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   PostgreSQL    │    │      Redis      │    │  Sleeper MCP    │
│   Database      │    │     Cache       │    │    Server       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
         ┌───────────────────────┼───────────────────────┐
         │                       │                       │
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│    Frontend     │    │    Backend      │    │   AI Service    │
│   (Next.js)     │    │   (Express)     │    │  (Express)      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🚀 Step-by-Step Deployment

### Step 1: Create Database Services

#### 1.1 PostgreSQL Database
1. Go to Railway Dashboard → **New Project** → **Provision PostgreSQL**
2. Note the generated `DATABASE_URL` (you'll need this for all services)
3. Name the service: `fantasy-football-db`

#### 1.2 Redis Cache
1. In the same project → **New Service** → **Database** → **Redis**
2. Note the generated `REDIS_URL`
3. Name the service: `fantasy-football-redis`

### Step 2: Deploy Backend API Service

1. **New Service** → **GitHub Repo** → Select your repository
2. **Service Settings:**
   - **Name**: `fantasy-football-backend`
   - **Root Directory**: `backend`
   - **Branch**: `Railway`

3. **Environment Variables:**
```bash
# Copy from backend/.env.production and replace variables:
DATABASE_URL=${PostgreSQL.DATABASE_URL}
REDIS_URL=${Redis.REDIS_URL}
JWT_SECRET=your-strong-jwt-secret-here
MCP_SERVER_URL=https://your-sleeper-mcp-service.railway.app
CORS_ORIGIN=https://your-frontend-service.railway.app
FRONTEND_URL=https://your-frontend-service.railway.app
```

4. **Deploy** and wait for completion
5. **Note the service URL** (e.g., `https://fantasy-football-backend-production.up.railway.app`)

### Step 3: Deploy AI Service

1. **New Service** → **GitHub Repo** → Select your repository
2. **Service Settings:**
   - **Name**: `fantasy-football-ai`
   - **Root Directory**: `ai-service`
   - **Branch**: `Railway`

3. **Environment Variables:**
```bash
# AI Provider Keys (add at least one):
OPENAI_API_KEY=sk-your-openai-key
ANTHROPIC_API_KEY=sk-ant-your-claude-key
GEMINI_API_KEY=your-gemini-key

# Service URLs:
REDIS_URL=${Redis.REDIS_URL}
MCP_SERVER_URL=https://your-sleeper-mcp-service.railway.app
BACKEND_SERVICE_URL=https://fantasy-football-backend-production.up.railway.app
FRONTEND_URL=https://your-frontend-service.railway.app

# AI Configuration:
DEFAULT_AI_PROVIDER=claude
CACHE_ENABLED=true
CACHE_TTL_SECONDS=3600

# CORS:
CORS_ORIGIN=https://fantasy-football-backend-production.up.railway.app,https://your-frontend-service.railway.app
```

4. **Deploy** and wait for completion
5. **Note the service URL** (e.g., `https://fantasy-football-ai-production.up.railway.app`)

### Step 4: Deploy Frontend

1. **New Service** → **GitHub Repo** → Select your repository
2. **Service Settings:**
   - **Name**: `fantasy-football-frontend`
   - **Root Directory**: `frontend`
   - **Branch**: `Railway`

3. **Environment Variables:**
```bash
# NextAuth Configuration:
NEXTAUTH_URL=${RAILWAY_STATIC_URL}
NEXTAUTH_SECRET=your-nextauth-secret-32-char-string

# OAuth (create apps at console.developers.google.com and discord.com):
GOOGLE_CLIENT_ID=your-google-oauth-client-id
GOOGLE_CLIENT_SECRET=your-google-oauth-secret
DISCORD_CLIENT_ID=your-discord-app-client-id
DISCORD_CLIENT_SECRET=your-discord-app-secret

# Database:
DATABASE_URL=${PostgreSQL.DATABASE_URL}

# Service URLs:
NEXT_PUBLIC_BACKEND_URL=https://fantasy-football-backend-production.up.railway.app
NEXT_PUBLIC_AI_SERVICE_URL=https://fantasy-football-ai-production.up.railway.app
NEXT_PUBLIC_WEBSOCKET_URL=https://fantasy-football-backend-production.up.railway.app

# Features:
NEXT_PUBLIC_ENABLE_AI_FEATURES=true
NEXT_PUBLIC_ENABLE_REAL_TIME=true
NEXT_PUBLIC_ENABLE_ANALYTICS=true
NEXT_PUBLIC_DEV_MODE=false
```

4. **Deploy** and wait for completion
5. **Note the frontend URL** (e.g., `https://fantasy-football-frontend-production.up.railway.app`)

### Step 5: Update Service URLs

After all services are deployed, update environment variables with actual URLs:

#### Backend Service:
```bash
CORS_ORIGIN=https://your-actual-frontend-url.railway.app
FRONTEND_URL=https://your-actual-frontend-url.railway.app
```

#### AI Service:
```bash
BACKEND_SERVICE_URL=https://your-actual-backend-url.railway.app
FRONTEND_URL=https://your-actual-frontend-url.railway.app
CORS_ORIGIN=https://your-actual-backend-url.railway.app,https://your-actual-frontend-url.railway.app
```

#### Frontend Service:
```bash
NEXT_PUBLIC_BACKEND_URL=https://your-actual-backend-url.railway.app
NEXT_PUBLIC_AI_SERVICE_URL=https://your-actual-ai-service-url.railway.app
NEXT_PUBLIC_WEBSOCKET_URL=https://your-actual-backend-url.railway.app
```

## 🔧 OAuth Configuration

### Google OAuth Setup
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create new project or select existing
3. Enable **Google+ API**
4. **Credentials** → **Create Credentials** → **OAuth 2.0 Client ID**
5. **Application Type**: Web Application
6. **Authorized Redirect URIs**: 
   - `https://your-frontend-url.railway.app/api/auth/callback/google`
7. Copy **Client ID** and **Client Secret**

### Discord OAuth Setup
1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. **New Application** → Name it "Fantasy Football App"
3. **OAuth2** → **General**
4. **Redirects**: 
   - `https://your-frontend-url.railway.app/api/auth/callback/discord`
5. Copy **Client ID** and **Client Secret**

## 🔍 Health Checks

After deployment, verify all services:

### Service Health Endpoints:
- **Frontend**: `https://your-frontend-url.railway.app/api/health`
- **Backend**: `https://your-backend-url.railway.app/health`
- **AI Service**: `https://your-ai-service-url.railway.app/health`
- **MCP Server**: `https://your-mcp-url.railway.app/health`

### AI Service Status:
- **AI Status**: `https://your-ai-service-url.railway.app/ai/status`

## 🐛 Troubleshooting

### Common Issues:

#### "Database connection failed"
- Verify `DATABASE_URL` is correctly set in backend service
- Check PostgreSQL service is running
- Ensure database migrations ran (check backend logs)

#### "MCP server not available"
- Verify your Sleeper MCP server is running on Railway
- Check `MCP_SERVER_URL` points to correct Railway URL
- Ensure MCP server health endpoint returns 200

#### "AI provider failed"
- Verify at least one AI provider API key is set
- Check API key validity and account credits
- Review AI service logs for specific provider errors

#### "OAuth login failed"
- Verify OAuth redirect URIs match Railway URLs exactly
- Check OAuth app is enabled and approved
- Ensure `NEXTAUTH_URL` matches your frontend URL

#### "CORS errors"
- Verify `CORS_ORIGIN` includes your frontend URL
- Check all service URLs are using HTTPS
- Ensure no trailing slashes in URLs

### Debug Commands:

```bash
# Check service logs
railway logs --service=fantasy-football-backend

# Connect to database
railway connect postgres

# Run database migrations manually
railway run --service=fantasy-football-backend npx prisma migrate deploy

# Check environment variables
railway variables --service=fantasy-football-backend
```

## 🔒 Security Checklist

- [ ] All API keys are set as environment variables (never in code)
- [ ] `NEXTAUTH_SECRET` is a strong 32+ character string
- [ ] `JWT_SECRET` is a strong random string
- [ ] OAuth apps are configured with correct redirect URIs
- [ ] CORS origins are properly configured
- [ ] Database URL is using SSL in production
- [ ] All services are using HTTPS

## 📊 Monitoring

### Railway Metrics:
- Monitor CPU, memory, and network usage
- Set up alerts for service downtime
- Review deployment logs for errors

### Application Metrics:
- **Backend**: `https://your-backend-url.railway.app/metrics`
- **AI Service**: `https://your-ai-service-url.railway.app/metrics`

## 🔄 Updates and Maintenance

### Deploy Updates:
1. Push changes to `Railway` branch
2. Railway auto-deploys on git push
3. Monitor deployment logs
4. Verify health checks pass

### Database Updates:
- Migrations run automatically on backend deployment
- Monitor for migration failures in logs
- Backup database before major schema changes

### Scaling:
- Railway auto-scales based on traffic
- Monitor resource usage in Railway dashboard
- Upgrade plan if needed for higher traffic

## 💰 Cost Optimization

### Railway Usage:
- **Starter Plan**: Good for development/testing
- **Pro Plan**: Recommended for production
- Monitor usage to avoid unexpected charges

### AI Provider Costs:
- OpenAI: ~$0.01-0.03 per 1K tokens
- Claude: ~$0.003-0.015 per 1K tokens  
- Gemini: ~$0.0005 per 1K tokens

### Database Costs:
- PostgreSQL: ~$5-20/month depending on size
- Redis: ~$3-15/month depending on usage

## 🎉 Success!

Once deployed, your Fantasy Football AI application will be available at:

**Frontend**: `https://your-frontend-url.railway.app`

Features available:
- ✅ User authentication (Google/Discord OAuth)
- ✅ AI-powered Start/Sit analysis
- ✅ Trade evaluation and recommendations
- ✅ Waiver wire pickup suggestions
- ✅ Real-time data from Sleeper API via MCP
- ✅ Multi-provider AI fallback system
- ✅ Responsive design for mobile/desktop

The application will automatically connect to your existing Sleeper MCP server and provide intelligent fantasy football recommendations to your users!