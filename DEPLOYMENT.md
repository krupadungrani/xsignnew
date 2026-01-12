# 🚀 XSignature - Deployment Guide

## Deploy to Render (Free Tier)

### Prerequisites
1. **GitHub Account** - Your code should be in a GitHub repository
2. **Render Account** - Sign up at [render.com](https://render.com)
3. **Gmail Account** - For email verification (optional)

### Step 1: Prepare Your Repository

1. **Push your code to GitHub** if you haven't already
2. **Ensure all files are committed** including the new `render.yaml`

### Step 2: Deploy to Render

#### Option A: Using Render Dashboard (Recommended)

1. **Go to [render.com](https://render.com)** and sign in
2. **Click "New +"** and select "Blueprint"
3. **Connect your GitHub repository**
4. **Select the repository** containing your XSignature code
5. **Render will automatically detect** the `render.yaml` file
6. **Click "Apply"** to start deployment

#### Option B: Manual Deployment

1. **Create a new Web Service** for the backend
2. **Create a new Static Site** for the frontend
3. **Create a new PostgreSQL Database**

### Step 3: Configure Environment Variables

After deployment, go to your backend service settings and add these environment variables:

```bash
NODE_ENV=production
DATABASE_URL=your-render-postgres-url
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-gmail@gmail.com
EMAIL_PASS=your-gmail-app-password
APP_URL=https://your-backend-service.onrender.com
```

### Step 4: Set Up Email (Optional)

For email verification to work:

1. **Enable 2-Factor Authentication** on your Gmail account
2. **Generate an App Password**:
   - Go to Google Account settings
   - Security → 2-Step Verification → App passwords
   - Generate a password for "Mail"
3. **Use the app password** in the `EMAIL_PASS` environment variable

### Step 5: Update Frontend Environment

In your frontend service settings, add:

```bash
VITE_API_URL=https://your-backend-service.onrender.com
```

### Step 6: Test Your Deployment

1. **Visit your frontend URL** (e.g., `https://digisign-pro-web.onrender.com`)
2. **Register a new account**
3. **Check the backend logs** for verification email links
4. **Click the verification link** to verify your account
5. **Login and test the application**

## 🔧 Troubleshooting

### Common Issues

1. **Database Connection Failed**
   - Check `DATABASE_URL` environment variable
   - Ensure database is created and running

2. **Email Not Sending**
   - Check Gmail app password
   - Verify `EMAIL_USER` and `EMAIL_PASS` are correct
   - Check backend logs for email errors

3. **Frontend Can't Connect to Backend**
   - Verify `VITE_API_URL` points to correct backend URL
   - Check CORS settings in backend

4. **Build Failures**
   - Check that all dependencies are in `package.json`
   - Verify Node.js version compatibility

### Checking Logs

1. **Backend Logs**: Go to your backend service → Logs
2. **Frontend Logs**: Go to your frontend service → Logs
3. **Database Logs**: Go to your database → Logs

## 📧 Email Verification Testing

### Development Mode
- Verification links are logged to the backend console
- Copy the link from the logs and visit it in your browser

### Production Mode
- Verification emails are sent to the registered email address
- Check your email inbox (and spam folder)
- Click the verification link to activate your account

## 🔒 Security Notes

1. **Never commit sensitive data** like passwords or API keys
2. **Use environment variables** for all configuration
3. **Enable HTTPS** (Render does this automatically)
4. **Regularly update dependencies** for security patches

## 📊 Monitoring

1. **Health Checks**: Monitor your service health
2. **Performance**: Check response times and resource usage
3. **Errors**: Monitor error logs and fix issues promptly

## 🎉 Success!

Once deployed, your XSignature application will be live and accessible from anywhere in the world!

**Frontend URL**: `https://your-frontend-service.onrender.com`
**Backend URL**: `https://your-backend-service.onrender.com`

---

## Need Help?

- **Render Documentation**: [docs.render.com](https://docs.render.com)
- **Email Setup Guide**: [Gmail App Passwords](https://support.google.com/accounts/answer/185833)
- **GitHub Issues**: Create an issue in your repository
