# 🛡️ AI-ThreatGuard

> **AI-powered cybersecurity analysis platform for detecting, analyzing, and responding to digital threats.**

AI-ThreatGuard is a full-stack cybersecurity platform designed to help users identify potential threats such as **phishing attempts, suspicious URLs, malicious indicators, and security risks** through automated analysis and AI-assisted insights.

The platform combines **Artificial Intelligence 🤖, Cybersecurity 🔐, Threat Intelligence 🕵️, and modern web technologies 🌐** into a centralized security analysis dashboard.

---

## 🚀 Why AI-ThreatGuard?

Cybersecurity threats are becoming increasingly sophisticated. AI-ThreatGuard aims to simplify security analysis by providing users with an intuitive platform where they can:

* 🔍 Scan suspicious content and indicators
* 🎣 Detect potential phishing attempts
* 🤖 Get AI-powered security analysis
* 📊 Monitor scan results through dashboards
* 🔐 Securely authenticate and manage users
* 👨‍💼 Provide administrative security controls
* 📝 Maintain security analysis records
* ⚡ Access results through a modern, responsive interface

---

# ✨ Key Features

### 🔍 Intelligent Threat Scanning

Analyze potentially dangerous security indicators and identify possible threats.

**Capabilities include:**

* 🔎 Threat and indicator scanning
* ⚠️ Suspicious activity detection
* 📋 Security analysis results
* 📊 Risk-oriented reporting
* 🕐 Scan history and tracking

---

### 🎣 Phishing Detection

Identify potentially malicious or deceptive URLs and messages.

The phishing analysis module can help detect:

* 🚨 Suspicious URLs
* 🎭 Possible impersonation attempts
* 🔗 Malicious-looking links
* ⚠️ Potential phishing indicators
* 📈 Risk-based security results

---

### 🤖 AI Security Assistant

AI-ThreatGuard includes an AI-powered cybersecurity assistant designed to help users understand security-related issues.

Users can:

* 💬 Ask cybersecurity questions
* 🧠 Get AI-assisted explanations
* 🔍 Understand detected threats
* 🛡️ Receive security recommendations
* 📚 Learn about cybersecurity concepts

---

### 📊 Security Dashboard

A centralized dashboard provides an overview of security activity.

It can display information such as:

* 🔍 Total scans
* 🚨 Detected threats
* 🎣 Phishing detections
* 📈 Security statistics
* 🕐 Recent activity
* 📋 Scan history

Interactive visualizations are powered by **Recharts**.

---

### 🔐 Authentication & Authorization

The platform includes authentication functionality for protecting application resources.

Security-related capabilities include:

* 🔑 User authentication
* 👤 User management
* 🛂 Role-based access
* 🔒 Protected API endpoints
* 🧑‍💼 Administrative controls

---

### 👨‍💼 Administration Panel

Administrators can access dedicated tools for managing and monitoring the platform.

Administrative functionality includes:

* 👥 User management
* 📊 Platform statistics
* 🔍 Security activity monitoring
* ⚙️ Administrative controls
* 📝 System-level records

---

### 📝 Scan History

Security analysis results can be tracked and reviewed.

This allows users to:

* 🕐 Review previous scans
* 📋 Examine analysis results
* 🔎 Track detected threats
* 📊 Monitor security activity over time

---

### 🎨 Modern User Interface

The frontend is designed to provide a modern cybersecurity dashboard experience.

It uses:

* ⚛️ React
* ⚡ Vite
* 🎨 Tailwind-style UI
* 🎬 Framer Motion animations
* 📊 Recharts visualizations
* 📱 Responsive layouts

---

# 🏗️ System Architecture

AI-ThreatGuard follows a modern full-stack architecture:

```text
                    👤 User
                      │
                      ▼
              🌐 React Frontend
                      │
                      │ REST API
                      ▼
              ⚡ FastAPI Backend
                 ┌────┼────┐
                 │    │    │
                 ▼    ▼    ▼
              🔐 Auth 🔍 Scan 🤖 AI
                 │    │    │
                 └────┼────┘
                      │
                      ▼
                 🐘 PostgreSQL
                      │
                      ▼
                 📝 Scan Data
```

For production environments:

```text
                    🌐 Internet
                        │
                        ▼
                  🔀 NGINX Proxy
                        │
              ┌─────────┴─────────┐
              ▼                   ▼
       ⚛️ React Frontend     ⚡ FastAPI
                                  │
                                  ▼
                            🐘 PostgreSQL
```

---

# 🧰 Technology Stack

## 🎨 Frontend

| Technology            | Purpose             |
| --------------------- | ------------------- |
| ⚛️ React              | User interface      |
| ⚡ Vite                | Frontend build tool |
| 🎨 Tailwind-style CSS | UI styling          |
| 🎬 Framer Motion      | Animations          |
| 📊 Recharts           | Data visualization  |

## ⚙️ Backend

| Technology        | Purpose               |
| ----------------- | --------------------- |
| 🐍 Python         | Backend programming   |
| ⚡ FastAPI         | REST API framework    |
| 🗄️ SQLAlchemy    | Database ORM          |
| 🔄 Alembic        | Database migrations   |
| 🔐 Authentication | User access control   |
| 🤖 Gemini API     | AI-powered assistance |

## 🗃️ Database

🐘 **PostgreSQL**

Used for storing application data, users, scan information, and security-related records.

## 🚀 DevOps & Deployment

| Technology        | Purpose                    |
| ----------------- | -------------------------- |
| 🐳 Docker         | Containerization           |
| 🐙 Docker Compose | Multi-container deployment |
| 🔀 NGINX          | Reverse proxy              |
| ⚙️ GitHub Actions | CI/CD automation           |
| 📦 GitHub Pages   | Frontend deployment        |

---

# 📁 Project Structure

```text
ai-threatguard/
│
├── 🐍 backend/
│   ├── FastAPI application
│   ├── Authentication
│   ├── Threat scanning
│   ├── Phishing detection
│   ├── AI assistant
│   ├── Admin routes
│   ├── SQLAlchemy
│   └── Alembic migrations
│
├── ⚛️ frontend/
│   ├── React application
│   ├── Dashboard
│   ├── Security scanning UI
│   ├── AI assistant interface
│   ├── Authentication pages
│   └── Data visualizations
│
├── 🔀 nginx/
│   └── Production proxy configuration
│
├── ⚙️ .github/
│   └── workflows/
│       ├── ci-cd.yml
│       └── deploy-pages.yml
│
├── 🐳 docker-compose.yml
├── 🐳 docker-compose.dev.yml
├── 📚 API_DOCUMENTATION.md
├── 🚀 DEPLOYMENT.md
└── 📖 README.md
```

---

# ⚙️ Getting Started

## 📋 Prerequisites

Make sure the following are installed:

* 🐳 Docker
* 🐙 Docker Compose
* 🟢 Node.js *(for non-containerized frontend development)*
* 🐍 Python *(for non-containerized backend development)*
* 🐘 PostgreSQL *(if running the database locally)*

---

# 💻 Local Development

### 1️⃣ Clone the repository

```bash
git clone https://github.com/vangaaditi2025/ai-threatguard.git
cd ai-threatguard
```

### 2️⃣ Configure environment variables

Copy the example environment files:

```bash
cp .env.example .env
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Configure the required values in the generated `.env` files.

Important variables may include:

```env
DATABASE_URL=your_database_url
GEMINI_API_KEY=your_gemini_api_key
FRONTEND_ORIGINS=your_frontend_origin
```

> 🔒 **Never commit API keys, passwords, tokens, or other secrets to GitHub.**

### 3️⃣ Start the development environment

```bash
docker compose -f docker-compose.dev.yml up --build
```

### 4️⃣ Open the application

Frontend:

```text
http://localhost:3000
```

Backend API:

```text
http://localhost:8000
```

API documentation:

```text
http://localhost:8000/docs
```

---

# 🚀 Production Deployment

Start the production stack using:

```bash
docker compose up --build -d
```

Once the services are running, open:

```text
http://localhost
```

The production architecture uses **NGINX 🔀** as a reverse proxy between the client and backend services.

For detailed deployment instructions, see:

📘 `DEPLOYMENT.md`

---

# 🌐 GitHub Pages Deployment

The frontend can also be deployed through GitHub Pages using:

```text
.github/workflows/deploy-pages.yml
```

### Deployment Steps

1. 📤 Push the repository to GitHub.
2. ⚙️ Open **Repository → Settings → Pages**.
3. Select **GitHub Actions** as the deployment source.
4. Add the repository variable:

```text
VITE_API_URL
```

5. Set it to your deployed backend URL:

```text
https://api.example.com
```

6. Push changes to `main` or manually run the deployment workflow.

The frontend will then be available at:

```text
https://<your-github-username>.github.io/<your-repository>/
```

For this project:

```text
https://vangaaditi2025.github.io/ai-threatguard/
```

> ⚠️ **Important:** GitHub Pages hosts the frontend only. FastAPI, PostgreSQL, and other backend services must be deployed separately.

---

# 🔄 CI/CD Pipeline

AI-ThreatGuard includes GitHub Actions automation.

The workflow:

```text
📤 Git Push
    │
    ▼
⚙️ GitHub Actions
    │
    ├── 🐍 Validate Python
    │
    ├── ⚛️ Build Frontend
    │
    ├── 🐳 Verify Docker
    │
    └── ✅ Deployment Checks
```

Workflow configuration:

```text
.github/workflows/ci-cd.yml
```

---

# 🔐 Security Considerations

Because AI-ThreatGuard is a cybersecurity-focused application, security should be considered throughout development and deployment.

Recommended practices include:

* 🔑 Keep API keys in environment variables.
* 🚫 Never commit `.env` files containing secrets.
* 🔒 Use HTTPS in production.
* 🛡️ Protect administrative endpoints.
* 🔐 Use strong authentication credentials.
* 🧹 Validate and sanitize user input.
* 🗄️ Secure database credentials.
* 🔄 Keep dependencies updated.
* 📋 Monitor application logs.
* 🚨 Review suspicious scan results carefully.

---

# 📚 API Documentation

The backend exposes REST APIs through FastAPI.

Interactive API documentation is available at:

```text
http://localhost:8000/docs
```

Additional API details are available in:

```text
API_DOCUMENTATION.md
```

---

# 🗺️ Project Roadmap

Potential future improvements include:

* [ ] 🧠 Advanced AI threat classification
* [ ] 🌐 URL reputation analysis
* [ ] 📧 Email phishing analysis
* [ ] 📁 File threat analysis
* [ ] 🦠 Malware indicator analysis
* [ ] 🔔 Real-time security alerts
* [ ] 📊 Advanced threat intelligence dashboard
* [ ] 🧩 Integration with external threat intelligence feeds
* [ ] 📱 Mobile-responsive security dashboard improvements
* [ ] 📝 Automated security reports
* [ ] 🔐 Enhanced role-based access control
* [ ] 📈 Advanced analytics and historical trends

---

# 🎯 Use Cases

AI-ThreatGuard can be useful for:

🎓 **Students**
Learn practical concepts involving AI, cybersecurity, APIs, databases, and secure application development.

🧑‍💻 **Developers**
Experiment with integrating AI into cybersecurity applications.

🔐 **Security Learners**
Explore threat detection and phishing analysis workflows.

🏢 **Organizations**
Use the platform as a foundation for developing internal security-analysis tools.

---

# 📖 Documentation

| Document                  | Description                 |
| ------------------------- | --------------------------- |
| 📖 `README.md`            | Project overview and setup  |
| 🔌 `API_DOCUMENTATION.md` | Backend API reference       |
| 🚀 `DEPLOYMENT.md`        | Production deployment guide |

---

# 🤝 Contributing

Contributions are welcome.

```bash
# Fork the repository
# Create a feature branch
git checkout -b feature/your-feature

# Make your changes
git add .
git commit -m "Add: your feature"

# Push your branch
git push origin feature/your-feature
```

Then open a Pull Request on GitHub.

---

# 📄 License

Add your preferred open-source license here, such as **MIT License**, if applicable.

---

# ⭐ Support the Project

If you find **AI-ThreatGuard** useful:

⭐ Star the repository
🍴 Fork the project
🐛 Report bugs
💡 Suggest improvements
🤝 Contribute to the project

---

## 🛡️ AI-ThreatGuard

**Detect. Analyze. Understand. Defend.**

Built with 🤖 AI + 🔐 Cybersecurity + ⚡ Modern Web Technologies
