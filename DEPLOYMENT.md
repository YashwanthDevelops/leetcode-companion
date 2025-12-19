# LeetCode Companion - Railway Deployment Guide

Complete guide to deploy your LeetCode Companion backend to Railway and configure the Chrome extension for production.

## Prerequisites

- Node.js and npm installed ([download](https://nodejs.org/))
- Railway account ([sign up](https://railway.app))
- Git installed and repository pushed to GitHub
- All environment variables ready (Supabase, Gemini API keys)

---

## Part 1: Deploy Backend to Railway

### Step 1: Install Railway CLI

```bash
npm install -g @railway/cli
```

Verify installation:
```bash
railway --version
```

### Step 2: Login to Railway

```bash
railway login
```

This will open your browser to authenticate.

### Step 3: Initialize Railway Project

Navigate to your backend directory:
```bash
cd "C:\My Space\AI Work\LeetCode Companion\backend"
```

Initialize Railway:
```bash
railway init
```

- Choose **"Empty Project"** or **"Create new project"**
- Name it: `leetcode-companion-api` (or your preferred name)

### Step 4: Link to Railway Project

```bash
railway link
```

Select the project you just created.

### Step 5: Set Environment Variables

Set all required environment variables in Railway:

```bash
# Supabase Configuration
railway variables set SUPABASE_URL="https://your-project.supabase.co"
railway variables set SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# Database URL (from Supabase: Settings > Database > Connection String > URI)
railway variables set DATABASE_URL="postgresql+asyncpg://postgres:password@host:5432/postgres"

# Google Gemini API Key
railway variables set GEMINI_API_KEY="your-gemini-api-key"

# JWT Secret Key (generate a random string)
railway variables set SECRET_KEY="$(python -c 'import secrets; print(secrets.token_urlsafe(32))')"

# CORS Configuration
railway variables set ALLOWED_ORIGINS="chrome-extension://*"

# Debug Mode (false for production)
railway variables set DEBUG="false"
```

> **💡 Tip**: You can also set these in the Railway dashboard:
> - Go to your project → Variables tab
> - Click "New Variable" and add each one

### Step 6: Deploy to Railway

```bash
railway up
```

This will:
1. Upload your code to Railway
2. Detect Python using `nixpacks.toml`
3. Install dependencies from `requirements.txt`
4. Start your app using the `Procfile`

Wait for deployment to complete (~2-3 minutes).

### Step 7: Generate Public URL

```bash
railway domain
```

If no domain exists, generate one:
```bash
railway domain --generate
```

Copy your Railway URL (e.g., `https://leetcode-companion-api-production.up.railway.app`)

### Step 8: Test Your Deployment

Test the health endpoint:
```bash
curl https://your-railway-url.railway.app/
```

Expected response:
```json
{
  "status": "healthy",
  "service": "leetcode-companion-api",
  "version": "1.0.0",
  "message": "Backend is live with SM-2 Memory!"
}
```

Test the health check:
```bash
curl https://your-railway-url.railway.app/health
```

---

## Part 2: Update Chrome Extension

### Step 1: Update API Configuration

Open `extension/services/api.js` and find line 11:

**Before:**
```javascript
PRODUCTION_API: 'https://your-app.railway.app',
```

**After:**
```javascript
PRODUCTION_API: 'https://your-actual-railway-url.railway.app',
```

Replace with your actual Railway URL from Step 7.

### Step 2: Enable Production Mode

In the same file, change line 17:

**Before:**
```javascript
USE_LOCAL: false
```

**After:**
```javascript
USE_LOCAL: false  // Already set correctly for production
```

> **💡 Development Tip**: Set `USE_LOCAL: true` when testing with `localhost:8000`

### Step 3: Reload Extension

1. Open Chrome and go to `chrome://extensions`
2. Enable "Developer mode" (top right)
3. Find "LeetCode Companion"
4. Click the **reload icon** (circular arrow)

---

## Part 3: Test the Extension

### Test 1: Login

1. Click the extension icon
2. Click "Sign Up" or "Login"
3. Enter your credentials
4. Verify successful login

### Test 2: Problem Analysis

1. Go to any LeetCode problem: `https://leetcode.com/problems/two-sum/`
2. Click the extension icon
3. Click **"Analyze with AI"**
4. Wait for analysis to complete
5. Verify you see:
   - Pattern names
   - Time/Space complexity
   - Key insights

### Test 3: Check Stats

1. Click the "Stats" tab in the extension
2. Verify your stats are loading from Railway
3. Check the "Problems" tab works
4. Check the "Patterns" tab works

---

## Troubleshooting

### Issue: "Failed to fetch" or CORS errors

**Solution 1:** Check Railway environment variables
```bash
railway variables
```

Ensure `ALLOWED_ORIGINS` includes `chrome-extension://*`

**Solution 2:** View Railway logs
```bash
railway logs --tail
```

Look for CORS-related errors.

**Solution 3:** Restart the deployment
```bash
railway up --detach
```

### Issue: "Session expired" immediately after login

**Cause:** `SECRET_KEY` not set or changed after users logged in.

**Solution:**
```bash
railway variables set SECRET_KEY="$(python -c 'import secrets; print(secrets.token_urlsafe(32))')"
railway up --detach
```

Users will need to log in again.

### Issue: Extension can't connect to Railway

**Check 1:** Verify `PRODUCTION_API` URL is correct in `api.js`

**Check 2:** Verify `manifest.json` includes Railway in `host_permissions`:
```json
"host_permissions": [
    "https://leetcode.com/*",
    "https://*.railway.app/*",
    "http://localhost:8000/*"
]
```

**Check 3:** Reload the extension after changes

### Issue: Database errors in Railway logs

**Cause:** `DATABASE_URL` format incorrect

**Solution:** Get the correct URL from Supabase:
1. Supabase Dashboard → Settings → Database
2. Connection String → URI
3. Replace `postgresql://` with `postgresql+asyncpg://`
4. Update Railway variable:
```bash
railway variables set DATABASE_URL="postgresql+asyncpg://postgres:password@host:5432/postgres"
```

### Issue: Gemini API errors

**Check:** Verify `GEMINI_API_KEY` is set correctly:
```bash
railway variables | grep GEMINI
```

**Solution:**
```bash
railway variables set GEMINI_API_KEY="your-actual-gemini-key"
railway up --detach
```

---

## Updating Your Backend

### For Code Changes

1. Make changes to your backend code
2. Commit and push to GitHub:
```bash
git add .
git commit -m "Update backend code"
git push
```

3. Deploy to Railway:
```bash
cd backend
railway up
```

### For Environment Variable Changes

```bash
railway variables set VARIABLE_NAME="new_value"
railway up --detach
```

---

## Viewing Logs

### Live Logs
```bash
railway logs --tail
```

### Recent Logs
```bash
railway logs
```

### In Railway Dashboard
1. Go to your project
2. Click "Deployments"
3. Click on the latest deployment
4. View "Build Logs" and "Deploy Logs"

---

## Custom Domain (Optional)

### Add Your Own Domain

1. Go to Railway Dashboard → Your Project
2. Click "Settings" → "Domains"
3. Click "Custom Domain"
4. Enter your domain (e.g., `api.yourdomain.com`)
5. Add the CNAME record to your DNS provider:
   - Name: `api` (or your subdomain)
   - Value: Your Railway domain

### Update Extension

After adding custom domain, update `extension/services/api.js`:
```javascript
PRODUCTION_API: 'https://api.yourdomain.com',
```

Reload the extension.

---

## Environment Variables Reference

| Variable | Description | Example |
|----------|-------------|---------|
| `SUPABASE_URL` | Your Supabase project URL | `https://xxx.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (secret) | `eyJhbGc...` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql+asyncpg://...` |
| `GEMINI_API_KEY` | Google Gemini API key | `AIzaSy...` |
| `SECRET_KEY` | JWT signing secret (generate random) | `random-32-char-string` |
| `ALLOWED_ORIGINS` | Comma-separated CORS origins | `chrome-extension://*` |
| `DEBUG` | Enable debug mode (localhost) | `false` |

---

## Production Checklist

- [ ] All environment variables set in Railway
- [ ] `DEBUG=false` in Railway
- [ ] Backend deployed successfully
- [ ] Health endpoint returns `200 OK`
- [ ] Extension `api.js` updated with Railway URL
- [ ] Extension `manifest.json` includes `*.railway.app`
- [ ] Extension reloaded in Chrome
- [ ] Login works
- [ ] Problem analysis works
- [ ] Stats/Problems/Patterns tabs load correctly

---

## Support

### Railway Documentation
- [Railway Docs](https://docs.railway.app/)
- [Railway Python Guide](https://docs.railway.app/guides/python)

### Project Documentation
- Check `backend/BACKEND_ENDPOINTS.md` for API reference
- Check `extension/QUICK_START.md` for extension guide

### Common Commands

```bash
# Check deployment status
railway status

# View environment variables
railway variables

# Open Railway dashboard
railway open

# SSH into container
railway shell

# View recent builds
railway builds
```

---

## Success! 🎉

Your LeetCode Companion is now deployed to production!

- **Backend**: Running on Railway
- **Database**: Supabase PostgreSQL
- **AI**: Google Gemini
- **Extension**: Connected to production

Now you can use your extension from any computer, anywhere! 🚀
