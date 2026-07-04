# 🐄 CowSis — Cattle & Pasture Management System

A complete web system for managing cattle farms, built to replace disorganized Excel spreadsheets with a reliable, centralized, and device-accessible solution.

> **Delivered and running in production.** — V2

---

## 📋 About

### The problem

The client managed multiple cattle farms using Excel spreadsheets. Over time they became hard to maintain: duplicated data, unreliable history, no mobile access, and no way to properly track pasture rotation.

### The solution

CowSis centralizes all farm management in a modern web application — accessible from any device, with consistent data and complete audit history.

---

## ✨ Features

- **Animal management:** full registry per head (breed, weight, age, history)
- **Pasture control:** pasture mapping and rotation, capacity and current occupancy
- **History:** movement records, weigh-ins, and events per animal
- **Dashboard:** herd overview with key metrics and alerts
- **Multi-farm:** manage multiple properties in the same system
- **Authenticated access:** role-based access control

---

## 🛠️ Tech Stack

- **Framework:** Next.js (App Router)
- **Language:** TypeScript
- **ORM:** Drizzle ORM
- **Database:** PostgreSQL
- **Styling:** Tailwind CSS
- **Deployment:** Vercel

---

## 🚀 Running locally

```bash
git clone https://github.com/CoimbraJP/cowsis.git
cd cowsis
npm install
cp .env.example .env.local
# Fill in the database connection string and other variables
npm run db:migrate
npm run dev
```

Open `http://localhost:3000`

---

## 🌐 Live

[cowsis.vercel.app](https://cowsis.vercel.app)

---

## 👨‍💻 Author

**João Paulo Coimbra**
[![LinkedIn](https://img.shields.io/badge/LinkedIn-coimbrajp-0A66C2?style=flat&logo=linkedin)](https://www.linkedin.com/in/coimbrajp/)
[![GitHub](https://img.shields.io/badge/GitHub-CoimbraJP-181717?style=flat&logo=github)](https://github.com/CoimbraJP)
