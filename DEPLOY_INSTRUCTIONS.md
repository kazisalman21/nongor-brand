# 🚀 Netlify Deployment Instructions for Nongor

Your project is fully configured for Netlify. Follow these steps to put your site live!

## Option 1: Drag & Drop (Easiest)

1.  **Log in** to your [Netlify Dashboard](https://app.netlify.com/).
2.  Go to the **"Sites"** tab.
3.  Drag your entire project folder (`Nongor_TEST`) and drop it into the "Drag and drop your site output folder here" area.
4.  Wait for the initial upload to finish.

## Option 2: Netlify CLI (Professional)

If you have the Netlify CLI installed:
1.  Open your terminal in the project folder.
2.  Run: `netlify deploy --prod`
3.  Follow the prompts (Publish directory: `.`, Functions directory: `netlify/functions`).

---

## ⚠️ CRITICAL STEP: Database Connection

Your site will load, **BUT orders/tracking won't work** until you connect the database.

1.  Go to your site's **dashboard** on Netlify.
2.  Click on **Site configuration** > **Environment variables**.
3.  Click **"Add a variable"**.
4.  Enter the following (OR check if it's already there from a plugin):
    *   **Key:** `NETLIFY_DATABASE_URL`
    *   **Value:** *(Your connection string)*

    > **Note:** From your screenshot, it looks like you **already have** `NETLIFY_DATABASE_URL` set! If so, you can skip this step. The code is already set to use it.
5.  Click **Create variable**.
6.  **Redeploy** your site (Site configuration > Deploys > Trigger deploy) to make sure the changes take effect (sometimes required).

## ✅ Verification

1.  Open your live site URL.
2.  Try placing a test order.
3.  Try tracking that order ID.
4.  If everything works, you are live! 🎉
