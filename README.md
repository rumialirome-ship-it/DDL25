# Daily Dubai Lottery Application

This is a full-stack lottery application with a React frontend and an Express.js backend. This guide provides instructions for deploying the application to a Virtual Private Server (VPS).

## Deployment to VPS

Follow these steps to get your application running in a production environment on a Linux-based VPS.

### 1. Prerequisites on the VPS

Ensure you have the following software installed on your server.

-   **Git:** For cloning the repository.
-   **Node.js & npm:** (Version 16.x or newer is recommended).
-   **PM2:** A process manager for Node.js to keep your application running.
    ```bash
    npm install pm2 -g
    ```
-   **Nginx:** A web server and reverse proxy.
    ```bash
    sudo apt update
    sudo apt install nginx
    ```
-   **MySQL Server:** The database for the application.
    ```bash
    sudo apt update
    sudo apt install mysql-server
    sudo mysql_secure_installation
    ```

### 2. Clone the Repository

Clone your project's source code onto the VPS.

```bash
git clone <your-repository-url>
cd <your-project-directory>
```

### 3. Build the Frontend

The React frontend needs to be compiled into static HTML, CSS, and JavaScript files. Before running the build, you must make the Gemini API key available as an environment variable.

```bash
# Install all frontend dependencies
npm install

# Run the build script, replacing <YOUR_GEMINI_API_KEY> with your actual key.
API_KEY=<YOUR_GEMINI_API_KEY> npm run build
```

This command will create a `dist` directory in your project root, containing the optimized frontend application with the API key embedded.

### 4. Set Up the Backend Application

Navigate to the backend directory and install its dependencies.

```bash
# From your project's root directory, navigate to the backend
cd backend

# Install all backend dependencies
npm install
```

### 5. Set Up the Backend Database

Log in to MySQL and create a database and a user for the application.

```bash
sudo mysql
```

Inside the MySQL prompt, execute the following commands. Replace `<your_strong_password>` with a secure password.

```sql
CREATE DATABASE IF NOT EXISTS mydb;
CREATE USER IF NOT EXISTS 'ddl_user'@'localhost' IDENTIFIED BY '<your_strong_password>';
GRANT ALL PRIVILEGES ON mydb.* TO 'ddl_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

#### 5.1. Create Database Schema and Seed Data

Now run the script to automatically set up the database tables and initial user accounts. This requires the `backend/.env` file to be correctly configured (see next step).

```bash
# This assumes you are in the 'backend' directory
npm run db:seed
```

This command is **safe to run multiple times**. It performs the following actions:
1.  **Creates Schema:** Creates all required tables if they don't already exist.
2.  **Seeds/Resets Draws:** Ensures the draw schedule for the current day is correctly populated.
3.  **Seeds/Resets Users:** Ensures the default admin and client users exist and **resets their passwords to the default values**.

This process ensures the following accounts are available:
-   An **admin** user with username `01` and password `password`.
-   A **client** user with Client ID `02`, username `Sample Client`, and password `password`.

**Security Warning:** Log in and change these default passwords immediately.

### 6. Configure Environment Variables

Create a `.env` file inside the `backend` directory. This file stores sensitive configuration details.

```bash
# Still inside the 'backend' directory
nano .env
```

Paste the following content into the file, **replacing the placeholder values with your actual credentials**.

```env
# Backend Server Port
PORT=5000

# JSON Web Token Secret - IMPORTANT: Use a long, random string.
# Generate with: openssl rand -base64 32
JWT_SECRET=<your_super_strong_and_secret_jwt_key_here>

# Google Gemini API Key (For AI analysis features)
API_KEY=<YOUR_GEMINI_API_KEY>

# --- MySQL Database Connection ---
# Use 127.0.0.1 for the host to avoid potential network issues with 'localhost'.
# Use the database credentials you created in Step 5.
DB_HOST=127.0.0.1
DB_USER=ddl_user
DB_PASSWORD=<your_strong_password>
DB_DATABASE=mydb
```

Save the file (`CTRL+X`, then `Y`, then `Enter`).

### 7. Start the Application with PM2

Go back to the project's root directory and start the application using PM2.

```bash
# Go back to the root of your project
cd ..

# Start the application
pm2 start ecosystem.config.js
```

### 8. Configure Nginx and Secure with SSL

Configure Nginx as a reverse proxy for your application running on port 5000 and secure it with a free SSL certificate from Let's Encrypt.

#### A. Basic Nginx Configuration (HTTP)

Create a new Nginx configuration file:
```bash
sudo nano /etc/nginx/sites-available/your_domain.com
```

Paste in the following configuration:

```nginx
server {
    listen 80;
    server_name your_domain.com www.your_domain.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable the site, test the configuration, and restart Nginx:
```bash
sudo ln -s /etc/nginx/sites-available/your_domain.com /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

#### B. Adding SSL with Let's Encrypt (HTTPS)

Install Certbot and run it to automatically configure SSL.

```bash
sudo apt update
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your_domain.com -d www.your_domain.com
```

Follow the on-screen prompts. Your site will now be secure and accessible via HTTPS.

### 9. Managing the Application

Useful PM2 commands:

-   **List processes:** `pm2 list`
-   **View logs:** `pm2 logs ddl-backend`
-   **Restart:** `pm2 restart ddl-backend`
-   **Stop:** `pm2 stop ddl-backend`
-   **Save process list for server reboot:** `pm2 save`

### 10. Troubleshooting

#### "Access Denied" for database user

This means there is a mismatch between credentials in `backend/.env` and your MySQL database.

1.  **Check `backend/.env`:** Ensure `DB_USER`, `DB_PASSWORD`, and `DB_DATABASE` are correct.
2.  **Verify MySQL Password:** Guarantee the password is correct by running: `sudo mysql -e "ALTER USER 'ddl_user'@'localhost' IDENTIFIED BY '<your_strong_password>';"`.
3.  **Restart PM2:** You **must** run `pm2 restart ddl-backend` after changing the `.env` file.

#### Admin login fails with "Invalid credentials"

Run the dedicated script to reset the admin password back to the default (`password`).

1.  Make sure your `backend/.env` file is configured.
2.  From the `backend` directory, run: `npm run admin:reset-password`.
3.  Log in with username `01` and password `password`.
