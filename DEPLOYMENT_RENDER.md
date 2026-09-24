# Render Deployment Guide: E-Waste Quantification & Forecasting System

This guide outlines how to deploy the entire multi-service application onto **[Render.com](https://render.com/)**, fully optimized for the **Free Tier**.

---

## Architecture Overview

The system consists of 4 distinct services:

| Service | Technology | Render Service Type | Port / Route |
| :--- | :--- | :--- | :--- |
| **`e-waste-frontend`** | React 19 + Vite SPA | **Static Site** | CDN (Serves `dist`) |
| **`e-waste-backend`** | Node.js + Express + SQLite | **Web Service** | Dynamic (`$PORT`) |
| **`e-waste-ml`** | Python 3.10 + Flask + scikit-learn | **Web Service** | Dynamic (`$PORT`) |
| **`e-waste-cv`** | Python 3.10 + Flask + PyTorch CPU | **Web Service** | Dynamic (`$PORT`) |

---

## Free Tier Optimizations Already Applied

The repository has been pre-configured with several essential optimizations to run smoothly within Render's Free tier (512MB RAM, limited build time/disk):

1. **PyTorch CPU Wheels (`cv-service`)**:
   Standard PyPI installs include ~2.5GB+ CUDA binaries which cause build timeouts (exceeding 15 min) and memory exhaustion. We configured `--extra-index-url https://download.pytorch.org/whl/cpu` in `cv-service/requirements.txt` and `render.yaml`, reducing download size by 95% (~190MB).
2. **Automated ML Model Training (`ml-service`)**:
   The `models/*.pkl` and `*.json` files are gitignored. The build command `pip install -r requirements.txt && python train.py` generates the required regression and time-series model artifacts automatically at build time.
3. **Dedicated Health Check Endpoints**:
   Render uses health checks to detect when a service is ready to receive traffic. `/health` and `/api/health` endpoints return HTTP 200 on all backend and microservice apps.
4. **Vite API URL Normalization (`frontend`)**:
   `frontend/src/services/apiBase.js` normalizes `VITE_API_BASE_URL` whether provided with or without `/api`, handling Render Blueprint's `RENDER_EXTERNAL_URL` format automatically.
5. **SPA Routing Rewrites (`frontend`)**:
   Render's static site routing rewrites all routes (`/*` &rarr; `/index.html`) so refreshing routes like `/dashboard`, `/login`, or `/cv` does not result in a 404 error.

---

## Deployment Option 1: 1-Click Blueprint (Recommended)

Render Blueprints use the included [`render.yaml`](./render.yaml) file to automatically provision, configure, and cross-link all 4 services at once.

### Step 1: Push Code to GitHub / GitLab
Ensure your latest changes are pushed to your remote repository:
```bash
git add .
git commit -m "Configure Render blueprint and optimizations"
git push origin main
```

### Step 2: Create a Blueprint Instance in Render
1. Log in to [Render Dashboard](https://dashboard.render.com/).
2. Click **New +** (top right) &rarr; select **Blueprint**.
3. Connect your Git repository (`kumaraguru-hack` or your fork).
4. Render will automatically parse `render.yaml` and display the 4 services:
   - `e-waste-frontend` (Static Site)
   - `e-waste-backend` (Web Service)
   - `e-waste-ml` (Web Service)
   - `e-waste-cv` (Web Service)
5. Click **Apply**.
6. Render will build and deploy all services in dependency order:
   - `e-waste-ml` & `e-waste-cv` start building first.
   - `e-waste-backend` links to their dynamic URLs.
   - `e-waste-frontend` builds and points its API calls to `e-waste-backend`.

---

## Deployment Option 2: Manual Dashboard Deployment

If you prefer to configure each service individually via the Render Web UI, follow the steps below in order.

### Step 1: Deploy `e-waste-ml` (ML Service)
1. In Render Dashboard, click **New +** &rarr; **Web Service**.
2. Select your repository.
3. Fill in the following details:
   - **Name**: `e-waste-ml`
   - **Region**: Select closest to you (e.g., *Singapore* or *Frankfurt*)
   - **Branch**: `main`
   - **Root Directory**: `ml-service`
   - **Runtime**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt && python train.py`
   - **Start Command**: `gunicorn -w 1 --threads 2 --timeout 120 -b 0.0.0.0:$PORT app:app`
   - **Instance Type**: `Free`
4. Expand **Advanced**:
   - **Health Check Path**: `/health`
   - **Add Environment Variable**:
     - `PYTHON_VERSION`: `3.10.12`
5. Click **Create Web Service**.
6. Once deployed, copy its URL: `https://e-waste-ml-xxxx.onrender.com`.

---

### Step 2: Deploy `e-waste-cv` (Computer Vision Service)
1. Click **New +** &rarr; **Web Service**.
2. Select your repository.
3. Configure:
   - **Name**: `e-waste-cv`
   - **Region**: Same region as ML service
   - **Branch**: `main`
   - **Root Directory**: `cv-service`
   - **Runtime**: `Python 3`
   - **Build Command**: `pip install --extra-index-url https://download.pytorch.org/whl/cpu -r requirements.txt`
   - **Start Command**: `gunicorn -w 1 --threads 2 --timeout 120 -b 0.0.0.0:$PORT app:app`
   - **Instance Type**: `Free`
4. Expand **Advanced**:
   - **Health Check Path**: `/health`
   - **Add Environment Variable**:
     - `PYTHON_VERSION`: `3.10.12`
5. Click **Create Web Service**.
6. Once deployed, copy its URL: `https://e-waste-cv-xxxx.onrender.com`.

---

### Step 3: Deploy `e-waste-backend` (Node.js API)
1. Click **New +** &rarr; **Web Service**.
2. Select your repository.
3. Configure:
   - **Name**: `e-waste-backend`
   - **Region**: Same region
   - **Branch**: `main`
   - **Root Directory**: `backend`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node app.js`
   - **Instance Type**: `Free`
4. Expand **Advanced**:
   - **Health Check Path**: `/health`
   - **Add Environment Variables**:
     - `NODE_ENV`: `production`
     - `NODE_VERSION`: `20.18.0`
     - `FLASK_URL`: `https://e-waste-ml-xxxx.onrender.com` *(URL from Step 1)*
     - `CV_URL`: `https://e-waste-cv-xxxx.onrender.com` *(URL from Step 2)*
5. Click **Create Web Service**.
6. Once deployed, copy its URL: `https://e-waste-backend-xxxx.onrender.com`.

---

### Step 4: Deploy `e-waste-frontend` (Static Site)
1. Click **New +** &rarr; **Static Site**.
2. Select your repository.
3. Configure:
   - **Name**: `e-waste-frontend`
   - **Branch**: `main`
   - **Root Directory**: `frontend`
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist`
4. Expand **Advanced**:
   - **Add Environment Variable**:
     - `VITE_API_BASE_URL`: `https://e-waste-backend-xxxx.onrender.com` *(The client automatically normalizes whether entered with or without `/api` or trailing slashes)*
5. Click **Create Static Site**.
6. **Set up SPA Redirect/Rewrite**:
   - In the frontend service settings on Render, navigate to **Redirects/Rewrites**.
   - Click **Add Rule**:
     - **Type**: `Rewrite`
     - **Source**: `/*`
     - **Destination**: `/index.html`
   - Save changes.

---

## Verifying Your Deployment

Once all services are marked **Live** (green) on the Render dashboard, run these verification steps:

### 1. Health Checks
Open these URLs in your browser or with `curl`:
- **Backend**: `https://<e-waste-backend>.onrender.com/health`
  - Expected: `{"status":"ok","uptime":...}`
- **ML Service**: `https://<e-waste-ml>.onrender.com/health`
  - Expected: `{"ok":true,"tabular_loaded":true,...}`
- **CV Service**: `https://<e-waste-cv>.onrender.com/health`
  - Expected: `{"ok":true,"model_loaded":true,...}`
- **Backend &rarr; ML Integration**: `https://<e-waste-backend>.onrender.com/api/ml/health`
  - Expected: Returns status and verifies Node can talk to Flask ML.
- **Backend &rarr; CV Integration**: `https://<e-waste-backend>.onrender.com/api/cv/health`
  - Expected: Returns status and verifies Node can talk to Flask CV.

### 2. Frontend & Authentication
1. Open your frontend URL: `https://<e-waste-frontend>.onrender.com`.
2. Navigate to the **Login** page.
3. Test pre-seeded credentials:
   - **Admin**: Username `admin` / Password `admin123`
   - **Hub**: Username `hub` / Password `hub123`
   - **Customer**: Username `customer` / Password `customer123`
   - **Service**: Username `service` / Password `service123`
   - **Industry**: Username `industry` / Password `industry123`
   - **Institute**: Username `institute` / Password `institute123`

### 3. Model Predictions & CV Detection
- Navigate to **Forecast**: Verify that the forecasting chart renders predictions using `e-waste-ml`.
- Navigate to **CV / E-Waste Classifier**: Upload an image (e.g. mobile phone, battery, laptop) and confirm image classification and bounding boxes are returned from `e-waste-cv`.

---

## Troubleshooting & FAQ

### 1. Cold Starts on Render Free Tier
* **Symptom**: First request after 15 minutes of inactivity takes 30–50 seconds or times out.
* **Why**: Render Free tier instances spin down to 0 after 15 minutes of no HTTP requests.
* **Fix**: Allow 30–60 seconds on the first visit for the instance to spin up. You can keep free instances awake during demos using an uptime monitor like [UptimeRobot](https://uptimerobot.com/) or [Cron-Job.org](https://cron-job.org/) hitting the `/health` endpoint every 10 minutes.

### 2. SQLite Database Persistence
* **Symptom**: Newly added custom records or new registered accounts disappear after a redeploy or manual restart.
* **Why**: Render Web Services have ephemeral file systems on the Free tier. When a service restarts, `backend/e-waste.db` is reinitialized from code.
* **Fix**: For production persistence:
  - Attach a **Render Disk** (requires a paid plan instance), or
  - Switch `backend/models/db.js` to a hosted managed database such as PostgreSQL (Render Free PostgreSQL or Supabase / Neon) or MySQL (PlanetScale / Aiven).

### 3. Build Times Out on `cv-service`
* **Symptom**: `cv-service` build fails after 15 minutes with timeout during `pip install torch`.
* **Fix**: Verify `cv-service/requirements.txt` starts with `--extra-index-url https://download.pytorch.org/whl/cpu` and the build command includes `--extra-index-url https://download.pytorch.org/whl/cpu`.

### 4. 404 on Refresh in Frontend
* **Symptom**: Visiting `https://frontend.onrender.com` works, but refreshing `https://frontend.onrender.com/dashboard` returns 404.
* **Fix**: Ensure the static site rewrite rule is active:
  - **Source**: `/*`
  - **Destination**: `/index.html`
  - **Action**: `Rewrite`
