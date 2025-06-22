# Sleeper Integration Deployment Guide

## Files Changed
- ✅ `backend/src/index.ts` - Added sleeper and user routes
- ✅ `backend/src/routes/sleeper.ts` - New Sleeper API endpoints
- ✅ `backend/src/routes/users.ts` - Updated user lookup by email/ID
- ✅ `backend/prisma/schema.prisma` - Added sleeperUsername field
- ✅ `frontend/src/app/settings/page.tsx` - Settings page for Sleeper sync
- ✅ `frontend/src/components/navigation.tsx` - Added Settings link

## Next Steps for Railway Deployment

### 1. Deploy Backend Code
```bash
git add .
git commit -m "Add Sleeper integration with MCP support"
git push origin dev
```

### 2. Railway Environment Variables
Add this environment variable to your Railway backend service:
```
MCP_SERVER_URL=http://your-sleeper-mcp-server:3001
```

### 3. Database Migration
The backend will automatically run `prisma db push` to add the new `sleeperUsername` column.

### 4. Sleeper MCP Server Setup
You need to deploy/run your Sleeper MCP server and make it accessible to Railway at the URL you set in `MCP_SERVER_URL`.

## Testing the Integration

Once deployed, you can test with:
- Username: `o0jonsey0o`
- Go to Settings page while logged in
- Enter your Sleeper username and click "Sync Leagues"

## Expected Behavior
1. Backend calls Sleeper MCP with `sleeper.getUserByUsername`
2. Gets user ID from Sleeper
3. Calls `sleeper.getUserLeagues` to fetch leagues
4. Stores user and league data in database
5. Returns league list to frontend

## Error Handling
- ✅ Better error messages for MCP connection failures
- ✅ Graceful handling of missing MCP server
- ✅ User-friendly error display on frontend

## Files Ready for Deployment
All code changes are complete and ready to deploy to Railway.