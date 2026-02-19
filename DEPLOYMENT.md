# 🚀 Test Strategy Tool - Deployment Guide

## Option 1: Railway (Recommended - Free Tier)

### Steps:

1. **Create Railway Account**
   - Go to https://railway.app
   - Sign up with GitHub

2. **Deploy Backend**
   ```bash
   # In the TestStrategyTool directory
   cd backend
   railway login
   railway init
   railway up
   ```
   
3. **Get Backend URL**
   - Copy the URL Railway gives you (e.g., `https://your-app.up.railway.app`)

4. **Deploy Frontend**
   - Create new project on Railway
   - Connect to your GitHub repo
   - Set root directory to `frontend`
   - Add environment variable:
     - `VITE_API_URL` = your backend URL

5. **Done!** Share the frontend URL with your team

---

## Option 2: Render (Free Tier)

### Steps:

1. **Create Render Account**
   - Go to https://render.com
   - Sign up with GitHub

2. **Deploy using Blueprint**
   - Click "New Blueprint Instance"
   - Connect your repo
   - Point to `render.yaml`
   - Render will create both services automatically

3. **Configure Environment Variables**
   - Go to your backend service
   - Add Confluence/Jira tokens if needed

---

## Option 3: Docker Compose (Self-hosted)

### Requirements:
- Docker & Docker Compose installed
- Server with public IP (or internal network)

### Steps:

1. **Copy files to server**
   ```bash
   scp -r TestStrategyTool user@your-server:/path/to/app
   ```

2. **Create .env file**
   ```bash
   cd /path/to/app
   nano .env
   ```
   
   Add:
   ```
   SECRET_KEY=your-super-secret-key-here
   CONFLUENCE_BASE_URL=https://company.atlassian.net
   CONFLUENCE_USER_EMAIL=email@company.com
   CONFLUENCE_API_TOKEN=your-token
   JIRA_BASE_URL=https://company.atlassian.net
   JIRA_USER_EMAIL=email@company.com
   JIRA_API_TOKEN=your-token
   ```

3. **Run**
   ```bash
   docker-compose up -d
   ```

4. **Access**
   - Open `http://your-server-ip` in browser
   - Share this URL with your team

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `SECRET_KEY` | Yes | JWT signing key |
| `CONFLUENCE_BASE_URL` | No | Confluence URL |
| `CONFLUENCE_USER_EMAIL` | No | Confluence user |
| `CONFLUENCE_API_TOKEN` | No | Confluence API token |
| `JIRA_BASE_URL` | No | Jira URL |
| `JIRA_USER_EMAIL` | No | Jira user |
| `JIRA_API_TOKEN` | No | Jira API token |

---

## 🔒 Security Notes

1. **Change SECRET_KEY** - Don't use the default!
2. **Use HTTPS** - All cloud providers provide this automatically
3. **Backup Database** - Set up regular backups for production

---

## 📞 Support

If you have issues deploying, check:
1. Backend logs: `railway logs` or Render dashboard
2. Frontend console: Browser DevTools
3. API connectivity: Try `curl https://your-api/health`

