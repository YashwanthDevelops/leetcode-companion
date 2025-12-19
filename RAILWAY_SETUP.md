# Railway Deployment Setup Guide

## 🔴 Current Issue: 502 Bad Gateway

Your application is deployed but returning a **502 error** because required environment variables are not configured in Railway.

---

## ✅ Required Environment Variables

You need to set these in your Railway project dashboard:

### 1. **DATABASE_URL**
Your Supabase PostgreSQL connection string.

**Where to find it:**
- Go to your Supabase project dashboard
- Click on **Settings** → **Database**
- Scroll to **Connection string** → **URI**
- Copy the connection string (starts with `postgresql://`)

**Format:**
```
postgresql://postgres:[YOUR-PASSWORD]@db.xxxxx.supabase.co:5432/postgres
```

### 2. **SUPABASE_URL**
Your Supabase project URL.

**Where to find it:**
- Supabase dashboard → **Settings** → **API**
- Copy the **Project URL**

**Format:**
```
https://xxxxxxxxxx.supabase.co
```

### 3. **SUPABASE_SERVICE_ROLE_KEY**
Your Supabase service role key (secret key for backend auth).

**Where to find it:**
- Supabase dashboard → **Settings** → **API**
- Copy the **service_role** key (NOT the anon key)

**⚠️ IMPORTANT:** This is a secret key - never expose it publicly!

### 4. **GEMINI_API_KEY**
Your Google Gemini API key for AI-powered problem analysis.

**Where to find it:**
- Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
- Create a new API key or copy your existing one

---

## 🛠️ How to Add Environment Variables in Railway

1. **Open your Railway project dashboard**
   - Go to https://railway.app
   - Click on your `leetcode-companion` project

2. **Navigate to Variables**
   - Click on your service/deployment
   - Click on **Variables** tab

3. **Add each variable**
   Click **New Variable** and add:
   ```
   Variable Name: DATABASE_URL
   Value: postgresql://postgres:[password]@db.xxxxx.supabase.co:5432/postgres
   ```
   
   Repeat for:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `GEMINI_API_KEY`

4. **Optional: Add ALLOWED_ORIGINS** (for production CORS)
   ```
   Variable Name: ALLOWED_ORIGINS
   Value: chrome-extension://your-extension-id,https://yourdomain.com
   ```

5. **Save and Redeploy**
   - Railway will automatically redeploy when you add variables
   - Wait for the deployment to complete

---

## 🧪 Verify the Deployment

After setting environment variables:

1. **Check the health endpoint:**
   ```
   https://beneficial-harmony-production.up.railway.app/health
   ```
   
   Should return:
   ```json
   {
     "status": "ok",
     "timestamp": "2025-12-19T..."
   }
   ```

2. **Check the root endpoint:**
   ```
   https://beneficial-harmony-production.up.railway.app/
   ```
   
   Should return:
   ```json
   {
     "status": "healthy",
     "service": "leetcode-companion-api",
     "version": "1.0.0",
     "message": "Backend is live with SM-2 Memory!"
   }
   ```

---

## 📋 Environment Variables Checklist

- [ ] `DATABASE_URL` - Supabase PostgreSQL connection string
- [ ] `SUPABASE_URL` - Supabase project URL
- [ ] `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key
- [ ] `GEMINI_API_KEY` - Google Gemini API key
- [ ] `ALLOWED_ORIGINS` (optional) - Comma-separated list of allowed origins

---

## 🐛 Troubleshooting

### Still getting 502 after adding variables?

1. **Check Railway logs:**
   - In your Railway dashboard → **Deployments** → Click on latest deployment → **View Logs**
   - Look for error messages

2. **Common issues:**
   - **Database connection failed**: Check if `DATABASE_URL` is correct
   - **Supabase auth failed**: Verify `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
   - **Gemini API error**: Check if `GEMINI_API_KEY` is valid

3. **Verify variable format:**
   - No quotes around values in Railway dashboard
   - No extra spaces before/after values
   - DATABASE_URL should use `postgresql://` not `postgres://` (app handles this automatically)

---

## 🚀 Next Steps

After your backend is running:

1. **Update Chrome Extension:**
   - Get your Railway URL from dashboard
   - Update `popup.js` to use production URL for API calls
   - Update `manifest.json` host permissions if needed

2. **Test the integration:**
   - Load a LeetCode problem
   - Click "Analyze" in your extension
   - Verify it connects to your Railway backend

---

## 📝 Notes

- Railway automatically redeploys when you push to GitHub
- Environment variables persist across deployments
- You can view logs in real-time in the Railway dashboard
- The app uses Dockerfile for deployment (not Nixpacks)
