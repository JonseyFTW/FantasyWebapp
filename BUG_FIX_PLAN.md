# Bug Fix Execution Plan

## Strategy: Fix in order of risk/complexity, test each step

### Phase 1: Major Bugs (Low Risk → High Risk)

#### 1. Fix Import/Export Mismatch in Tests ⚡ (5 mins)
**Risk Level:** LOW - Isolated test fix
**Files:** `backend/src/__tests__/routes/auth.test.ts`
**Plan:**
- Fix import statement from default to named export
- Run test to verify fix works
- No dependencies, safe to fix first

#### 2. Complete AI Service Function Implementations 🤖 (2-3 hours)
**Risk Level:** MEDIUM - Core AI functionality
**Files:** 
- `ai-service/src/agents/trade-analyzer.ts`
- `ai-service/src/agents/waiver-wire-analyzer.ts` 
- `ai-service/src/agents/lineup-optimizer.ts`
**Plan:**
- Research expected AI response formats for each function
- Implement proper response parsing instead of hardcoded values
- Add error handling for malformed AI responses
- Test each function with mock AI responses
- Verify AI service builds and starts successfully

#### 3. Fix Gemini Provider Implementation 🔮 (1-2 hours)  
**Risk Level:** MEDIUM - Single provider functionality
**Files:** `ai-service/src/providers/gemini-provider.ts`
**Plan:**
- Research Gemini API function calling capabilities
- Implement proper function call parsing or add fallback
- Implement proper token usage counting
- Test Gemini provider integration
- Ensure graceful degradation if Gemini doesn't support function calls

#### 4. Replace Frontend Mock Data with Real APIs 🎭 (3-4 hours)
**Risk Level:** HIGH - Core frontend functionality
**Files:**
- `frontend/src/app/dashboard/page.tsx`
- `frontend/src/components/ai/commissioner-tools.tsx`
- `frontend/src/app/page.tsx`
**Plan:**
- Phase 4a: Create API integration functions
- Phase 4b: Replace dashboard mock data with Sleeper API calls
- Phase 4c: Replace commissioner tools mock data
- Phase 4d: Replace home page stats with real analytics
- Add loading states and error handling
- Implement fallback to demo data if APIs fail
- Test with real user data

### Testing Strategy for Each Fix:

1. **Local Build Test:** Ensure Docker containers build successfully
2. **Unit Test:** Run existing tests to ensure no regressions  
3. **Integration Test:** Test the specific functionality that was fixed
4. **End-to-End Test:** Verify the fix works in the full application context

### Rollback Plan:
- Git commit after each successful fix
- Keep original code in comments during implementation
- Test rollback procedure before starting

### Dependencies to Verify:
- Sleeper MCP server running on port 3001
- Backend API endpoints working
- Database schema up to date
- Environment variables properly configured

### Success Criteria:
- All Docker services build and start successfully
- No TypeScript compilation errors
- Existing tests continue to pass
- New functionality works as expected
- No console errors in browser developer tools