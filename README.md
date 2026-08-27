# Angkor Hosting ⚡

> **Next-Generation High Performance Minecraft & Game Server Hosting**

An ultra-modern, lightning-fast game hosting platform web application built with obsidian glassmorphism, responsive cyber-aesthetic HUD elements, interactive server sizing tools, and multi-channel order checkout.

---

## ✨ Key Features & Upgrades

- **⚡ Cyber Gaming Design System**: Obsidian glass panels (`backdrop-filter: blur(14px)`), neon mint (`#00f5c4`), and electric violet accents.
- **🌐 Interactive Live Web Console (Pterodactyl UI)**: Fully functional simulated terminal responding to Minecraft commands (`/tps`, `/list`, `/say`, `/op`, `/version`, `/help`, etc.) with server lifecycle buttons (Start, Restart, Stop).
- **🎛️ Interactive RAM & Plan Calculator**: Real-time slider calculating memory, CPU allocations, and NVMe disk sizing based on player count and server modpack load.
- **📡 Global Low-Latency Node Ping Tester**: Interactive latency diagnostic tool simulating connection speeds across Singapore, Frankfurt, New York, and Tokyo nodes.
- **🛒 Dynamic Checkout Configurator Wizard**:
  - Billing cycle selector with automated discount calculations (10% on 3-month, 20% on 12-month).
  - Server location & software version dropdown (Paper, Purpur, Forge, Fabric, Bedrock).
  - Free custom subdomain prefix setup (`*.angkor.host`).
  - Power add-ons (Automated Daily Backups, Dedicated IPv4, VIP Support).
  - Multi-channel instant dispatch: Discord Ticket, Telegram Bot with URL-encoded order payloads, Messenger, and 1-Click Copy Invoice.
- **📚 Interactive Setup Tutorial & Knowledgebase**: Step-by-step onboarding guide, Aikar's GC startup flags generator, and searchable FAQ accordion.
- **📱 Fully Responsive**: Custom mobile navigation drawer, fluid typography, and touch-friendly controls.

---

## 📁 Project Structure

```
├── c2/
│   ├── main.js        # Core JavaScript engine (Canvas, calculators, console sim, checkout)
│   └── style.css       # Complete modular design system & responsive stylesheet
├── checkout/
│   └── index.html      # Interactive Server Configurator & Order Wizard
├── img/                # Visual assets & brand media
├── plan/
│   └── mc/
│       └── index.html  # Full 10 Minecraft Hosting Tiers catalog
├── privacy/
│   └── index.html      # GDPR-compliant Privacy Policy
├── svg/                # Hardware & infrastructure vector icons
├── terms/
│   └── index.html      # Terms of Service & SLA documentation
├── tutorial/
│   └── index.html      # Step-by-step Setup Guide & Knowledgebase
└── index.html          # Main Landing Page
```

---

## 🚀 Getting Started

Simply open `index.html` in any modern web browser or serve it using any static web server:

```bash
# Using Python
python -m http.server 8000

# Using Node.js npx serve
npx serve .
```

Navigate to `http://localhost:8000` to view the website.

---

## 📄 License

MIT License &copy; 2026 Angkor Hosting.

