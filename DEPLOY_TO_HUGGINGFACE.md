# Deploying Backend to Hugging Face Spaces

Hugging Face Spaces provides a generous free tier with 2 vCPU and 16 GB RAM, which is perfect for handling the memory-intensive 3D optimization tasks that were causing crashes on Render.

## Step 1: Create a New Space

1.  Go to [huggingface.co/spaces](https://huggingface.co/spaces) and click **"Create new Space"**.
2.  **Space Name**: `rntbci-backend` (or similar).
3.  **License**: `MIT` (optional).
4.  **Sdk**: Select **Docker**.
5.  **Space Hardware**: `CPU basic \u2022 2 vCPU \u2022 16 GB \u2022 Free`.
6.  Click **"Create Space"**.

## Step 2: Upload Files

You need to upload the contents of the `backend` folder to your Space.

**Option A: Via Web Interface (Easiest)**
1.  In your new Space, go the **"Files"** tab.
2.  Delete the default `README.md` if you want, or just click **"Add file"** -> **"Upload files"**.
3.  Drag and drop **ALL files and folders** from your local `d:\Projects\RNTBCI_mobile\backend\` folder into the browser window.
    -   Include: `api.py`, `Dockerfile`, `requirements.txt`, `core/`, `assets/`, `Surface model (1).stl`, etc.
4.  Commit the changes.

**Option B: Via Git**
1.  Clone the Space repository locally:
    ```bash
    git clone https://huggingface.co/spaces/<your-username>/rntbci-backend
    ```
2.  Copy all files from your local `backend` folder into the cloned directory.
3.  Add, commit, and push:
    ```bash
    git add .
    git commit -m "Deploy backend"
    git push
    ```

## Step 3: Configure Environment Variables

1.  in your Space, go to **"Settings"**.
2.  Scroll down to **"Variables and secrets"**.
3.  Click **"New secret"**.
4.  **Name**: `MONGO_URI`
5.  **Value**: (Paste your MongoDB connection string from your `.env` file)
    -   *Note: Ensure the connection string is correct and your IP is whitelisted on MongoDB Atlas (allow 0.0.0.0/0).*
6.  Click **"Save"**.

## Step 4: Verification

1.  The Space will start building. Click the **"Logs"** tab to verify.
2.  Once "Running", you will see a preview window.
3.  Your API URL will be: `https://<your-username>-rntbci-backend.hf.space`
4.  **Update your Mobile App**:
    -   Open `d:\Projects\RNTBCI_mobile\mobile_app\src\lib\api.ts` (or wherever your API URL is defined).
    -   Replace the Render URL with your new Hugging Face Space URL.
    -   Append `/` at the end if needed (e.g. `https://my-space.hf.space/`).

## Troubleshooting

-   **Build Failures**: Check the "Logs" tab -> "Build".
-   **Runtime Errors**: Check "Logs" -> "Container".
-   **502 Errors**: If these persist (unlikely with 16GB RAM), check the logs for OOM messages.
