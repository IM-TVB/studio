/**
 * Angkor Hosting - Interactive Features & Utilities
 */

document.addEventListener('DOMContentLoaded', () => {
    initMobileNav();
    initParticleCanvas();
    initBillingToggle();
    initRamCalculator();
    initConsoleSimulator();
    initPingTester();
    initFaqAccordion();
    initCheckoutConfigurator();
    initCopyButtons();
    initSmoothScroll();
});

/* ============================================================
   Toast Notification System
   ============================================================ */
function showToast(message, type = 'success', duration = 3000) {
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    const icon = type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ';
    toast.innerHTML = `
        <span class="toast-icon">${icon}</span>
        <span class="toast-message">${message}</span>
    `;

    container.appendChild(toast);

    // Trigger enter animation
    requestAnimationFrame(() => {
        toast.classList.add('show');
    });

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

/* ============================================================
   Mobile Navigation Drawer
   ============================================================ */
function initMobileNav() {
    const hamburger = document.querySelector('.mobile-menu-btn');
    const navDrawer = document.querySelector('.mobile-nav-drawer');
    const backdrop = document.querySelector('.mobile-backdrop');
    const closeBtn = document.querySelector('.mobile-drawer-close');

    if (!hamburger || !navDrawer) return;

    function openNav() {
        navDrawer.classList.add('active');
        if (backdrop) backdrop.classList.add('active');
        document.body.classList.add('no-scroll');
    }

    function closeNav() {
        navDrawer.classList.remove('active');
        if (backdrop) backdrop.classList.remove('active');
        document.body.classList.remove('no-scroll');
    }

    hamburger.addEventListener('click', openNav);
    if (closeBtn) closeBtn.addEventListener('click', closeNav);
    if (backdrop) backdrop.addEventListener('click', closeNav);

    navDrawer.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', closeNav);
    });
}

/* ============================================================
   Interactive Cyber Background Particle Canvas
   ============================================================ */
function initParticleCanvas() {
    const canvas = document.getElementById('particle-canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let width, height;
    let particles = [];
    const particleCount = window.innerWidth < 768 ? 25 : 55;

    function resize() {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
    }

    window.addEventListener('resize', resize);
    resize();

    class Particle {
        constructor() {
            this.reset();
        }

        reset() {
            this.x = Math.random() * width;
            this.y = Math.random() * height;
            this.vx = (Math.random() - 0.5) * 0.4;
            this.vy = (Math.random() - 0.5) * 0.4;
            this.radius = Math.random() * 1.8 + 0.8;
            this.alpha = Math.random() * 0.5 + 0.2;
            this.color = Math.random() > 0.3 ? '#00f5c4' : '#a855f7';
        }

        update() {
            this.x += this.vx;
            this.y += this.vy;

            if (this.x < 0 || this.x > width) this.vx *= -1;
            if (this.y < 0 || this.y > height) this.vy *= -1;
        }

        draw() {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fillStyle = this.color;
            ctx.globalAlpha = this.alpha;
            ctx.shadowBlur = 8;
            ctx.shadowColor = this.color;
            ctx.fill();
            ctx.shadowBlur = 0;
            ctx.globalAlpha = 1;
        }
    }

    for (let i = 0; i < particleCount; i++) {
        particles.push(new Particle());
    }

    function animate() {
        ctx.clearRect(0, 0, width, height);

        // Draw connecting lines
        for (let i = 0; i < particles.length; i++) {
            for (let j = i + 1; j < particles.length; j++) {
                const dx = particles[i].x - particles[j].x;
                const dy = particles[i].y - particles[j].y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < 120) {
                    ctx.beginPath();
                    ctx.moveTo(particles[i].x, particles[i].y);
                    ctx.lineTo(particles[j].x, particles[j].y);
                    ctx.strokeStyle = '#00f5c4';
                    ctx.globalAlpha = (1 - dist / 120) * 0.15;
                    ctx.lineWidth = 0.8;
                    ctx.stroke();
                    ctx.globalAlpha = 1;
                }
            }
        }

        particles.forEach(p => {
            p.update();
            p.draw();
        });

        requestAnimationFrame(animate);
    }

    animate();
}

/* ============================================================
   Monthly / Annual Billing Toggle (20% OFF)
   ============================================================ */
function initBillingToggle() {
    const toggleInputs = document.querySelectorAll('.billing-toggle-input');
    if (!toggleInputs.length) return;

    toggleInputs.forEach(input => {
        input.addEventListener('change', (e) => {
            const isAnnual = e.target.checked;
            updatePrices(isAnnual);
        });
    });

    function updatePrices(isAnnual) {
        document.querySelectorAll('.price-val').forEach(el => {
            const monthlyPrice = parseFloat(el.getAttribute('data-monthly'));
            if (isNaN(monthlyPrice)) return;

            if (isAnnual) {
                // 20% discount on annual billing
                const discounted = (monthlyPrice * 0.8).toFixed(2);
                el.textContent = `$${discounted}`;
            } else {
                el.textContent = `$${monthlyPrice.toFixed(2)}`;
            }
        });

        document.querySelectorAll('.billing-period-text').forEach(el => {
            el.textContent = isAnnual ? '/mo (billed annually)' : '/mo';
        });

        // Update checkout buy links if present
        document.querySelectorAll('.plan-buy-btn').forEach(btn => {
            const href = btn.getAttribute('href');
            if (href && href.includes('/checkout/')) {
                const url = new URL(href, window.location.origin);
                url.searchParams.set('billing', isAnnual ? 'annual' : 'monthly');
                btn.setAttribute('href', url.pathname + url.search);
            }
        });
    }
}

/* ============================================================
   Interactive RAM & Plan Calculator
   ============================================================ */
function initRamCalculator() {
    const playerSlider = document.getElementById('calc-players');
    const playerVal = document.getElementById('calc-player-val');
    const serverType = document.getElementById('calc-server-type');
    const resultRam = document.getElementById('calc-res-ram');
    const resultCpu = document.getElementById('calc-res-cpu');
    const resultDisk = document.getElementById('calc-res-disk');
    const resultPlan = document.getElementById('calc-res-plan');
    const resultPrice = document.getElementById('calc-res-price');
    const resultBtn = document.getElementById('calc-res-btn');
    const ramMeter = document.getElementById('calc-ram-meter-fill');

    if (!playerSlider || !playerVal) return;

    // Plans database
    const plans = [
        { name: 'Sapling', ram: 1, cpu: '1 vCPU', disk: '10GB NVMe', price: 0.89, maxPlayers: 3, type: 'Vanilla / Proxy' },
        { name: 'Sprout', ram: 2, cpu: '1 vCPU', disk: '20GB NVMe', price: 1.79, maxPlayers: 6, type: 'Vanilla / Light Paper' },
        { name: 'Sapwood', ram: 4, cpu: '2 vCPU', disk: '40GB NVMe', price: 3.49, maxPlayers: 15, type: 'Paper / Spigot / Plugins' },
        { name: 'Grove', ram: 6, cpu: '2 vCPU', disk: '60GB NVMe', price: 5.29, maxPlayers: 25, type: 'SMP + 20+ Plugins' },
        { name: 'Canopy', ram: 8, cpu: '3 vCPU', disk: '80GB NVMe', price: 6.99, maxPlayers: 40, type: 'Light Modpack / Large SMP' },
        { name: 'Timber', ram: 10, cpu: '3 vCPU', disk: '100GB NVMe', price: 9.49, maxPlayers: 60, type: 'Heavy Modpack / Network' },
        { name: 'Heartwood', ram: 12, cpu: '4 vCPU', disk: '120GB NVMe', price: 11.69, maxPlayers: 80, type: 'Large Modpacks / Hub' },
        { name: 'Ironwood', ram: 14, cpu: '4 vCPU', disk: '140GB NVMe', price: 13.69, maxPlayers: 100, type: 'Mega Modded / 100+ Players' },
        { name: 'Ancient', ram: 16, cpu: '4 vCPU', disk: '160GB NVMe', price: 15.69, maxPlayers: 120, type: 'Custom Network / Enterprise' }
    ];

    function calculate() {
        const players = parseInt(playerSlider.value, 10);
        playerVal.textContent = players >= 100 ? '100+ Players' : `${players} Players`;

        const typeMultiplier = parseFloat(serverType ? serverType.value : 1);
        const estimatedRamNeeded = Math.ceil((players * 0.18 + 1) * typeMultiplier);

        // Find best matching plan
        let selectedPlan = plans.find(p => p.ram >= estimatedRamNeeded) || plans[plans.length - 1];

        if (resultRam) resultRam.textContent = `${selectedPlan.ram}GB RAM`;
        if (resultCpu) resultCpu.textContent = selectedPlan.cpu;
        if (resultDisk) resultDisk.textContent = selectedPlan.disk;
        if (resultPlan) resultPlan.textContent = selectedPlan.name;
        if (resultPrice) resultPrice.textContent = `$${selectedPlan.price.toFixed(2)}`;
        
        if (ramMeter) {
            const percentage = Math.min(100, Math.max(10, (selectedPlan.ram / 16) * 100));
            ramMeter.style.width = `${percentage}%`;
        }

        if (resultBtn) {
            resultBtn.href = `/checkout/?plan=${encodeURIComponent(selectedPlan.name)}&price=${selectedPlan.price}&ram=${selectedPlan.ram}GB&cpu=${encodeURIComponent(selectedPlan.cpu)}&disk=${encodeURIComponent(selectedPlan.disk)}`;
        }
    }

    playerSlider.addEventListener('input', calculate);
    if (serverType) serverType.addEventListener('change', calculate);
    calculate();
}

/* ============================================================
   Interactive Live Web Console Simulator (Pterodactyl UI)
   ============================================================ */
function initConsoleSimulator() {
    const consoleOutput = document.getElementById('sim-console-output');
    const consoleInput = document.getElementById('sim-console-input');
    const consoleForm = document.getElementById('sim-console-form');
    const serverStatusBadge = document.getElementById('sim-server-status');
    const btnStart = document.getElementById('sim-btn-start');
    const btnRestart = document.getElementById('sim-btn-restart');
    const btnStop = document.getElementById('sim-btn-stop');

    if (!consoleOutput || !consoleInput) return;

    let isRunning = true;
    let players = ['Steve', 'Alex', 'Herobrine', 'AngkorMiner'];

    function getTimestamp() {
        const now = new Date();
        return now.toTimeString().split(' ')[0];
    }

    function appendLog(line, isCommand = false, isError = false) {
        const p = document.createElement('div');
        p.className = `console-line ${isCommand ? 'console-cmd' : ''} ${isError ? 'console-err' : ''}`;
        p.textContent = line;
        consoleOutput.appendChild(p);
        consoleOutput.scrollTop = consoleOutput.scrollHeight;
    }

    const initialLogs = [
        `[${getTimestamp()}] [Server thread/INFO]: Starting minecraft server version 1.20.4`,
        `[${getTimestamp()}] [Server thread/INFO]: Loading properties from server.properties`,
        `[${getTimestamp()}] [Server thread/INFO]: Default game type: SURVIVAL`,
        `[${getTimestamp()}] [Server thread/INFO]: Generating keypair for authentication...`,
        `[${getTimestamp()}] [Server thread/INFO]: Starting Minecraft server on *:25565`,
        `[${getTimestamp()}] [Server thread/INFO]: Using epoll channel type for low-latency network`,
        `[${getTimestamp()}] [Server thread/INFO]: Preparing level "world"`,
        `[${getTimestamp()}] [Server thread/INFO]: Preparing start region for dimension minecraft:overworld`,
        `[${getTimestamp()}] [Server thread/INFO]: Time elapsed: 1420 ms`,
        `[${getTimestamp()}] [Server thread/INFO]: Done (2.104s)! For help, type "help"`
    ];

    // Populate initial logs
    initialLogs.forEach(log => appendLog(log));

    if (consoleForm) {
        consoleForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const cmd = consoleInput.value.trim();
            if (!cmd) return;

            consoleInput.value = '';
            if (!isRunning) {
                appendLog(`[${getTimestamp()}] [Server thread/WARN]: Server is currently offline. Click 'Start' to turn it on.`, false, true);
                return;
            }

            appendLog(`> ${cmd}`, true);
            handleCommand(cmd.toLowerCase());
        });
    }

    function handleCommand(cmd) {
        setTimeout(() => {
            const parts = cmd.split(' ');
            const base = parts[0].startsWith('/') ? parts[0].substring(1) : parts[0];

            switch (base) {
                case 'help':
                    appendLog(`[${getTimestamp()}] [Server thread/INFO]: Available commands: /tps, /list, /say <msg>, /op <player>, /version, /ping, /help, /clear`);
                    break;
                case 'tps':
                    appendLog(`[${getTimestamp()}] [Server thread/INFO]: TPS from last 1m, 5m, 15m: 20.00, 20.00, 20.00 (Stable 100%)`);
                    appendLog(`[${getTimestamp()}] [Server thread/INFO]: Memory usage: 1.24 GB / 8.00 GB (15.5%) | CPU: 4.2%`);
                    break;
                case 'list':
                    appendLog(`[${getTimestamp()}] [Server thread/INFO]: There are ${players.length}/50 players online: ${players.join(', ')}`);
                    break;
                case 'say':
                    const msg = parts.slice(1).join(' ') || 'Hello Angkor Hosting!';
                    appendLog(`[${getTimestamp()}] [Server thread/INFO]: [Server] ${msg}`);
                    break;
                case 'op':
                    const target = parts[1] || 'Player';
                    appendLog(`[${getTimestamp()}] [Server thread/INFO]: Made ${target} a server operator`);
                    break;
                case 'version':
                    appendLog(`[${getTimestamp()}] [Server thread/INFO]: This server is running Paper version git-Paper-498 (MC: 1.20.4) on Angkor AMD Ryzen 9 7950X3D`);
                    break;
                case 'ping':
                    appendLog(`[${getTimestamp()}] [Server thread/INFO]: Pong! Latency to host: 12ms`);
                    break;
                case 'clear':
                    consoleOutput.innerHTML = '';
                    appendLog(`[${getTimestamp()}] [Console cleared]`);
                    break;
                default:
                    appendLog(`[${getTimestamp()}] [Server thread/INFO]: Unknown command "${cmd}". Type "help" for help.`);
                    break;
            }
        }, 150);
    }

    if (btnStart) {
        btnStart.addEventListener('click', () => {
            if (isRunning) {
                showToast('Server is already running', 'info');
                return;
            }
            isRunning = true;
            if (serverStatusBadge) {
                serverStatusBadge.textContent = 'ONLINE';
                serverStatusBadge.className = 'sim-status-badge status-online';
            }
            appendLog(`[${getTimestamp()}] [System]: Server process initiated.`);
            appendLog(`[${getTimestamp()}] [Server thread/INFO]: Starting minecraft server 1.20.4...`);
            setTimeout(() => appendLog(`[${getTimestamp()}] [Server thread/INFO]: Done! Server is ready for connections.`), 800);
            showToast('Server started successfully!', 'success');
        });
    }

    if (btnRestart) {
        btnRestart.addEventListener('click', () => {
            appendLog(`[${getTimestamp()}] [Server thread/INFO]: Server restarting in 3 seconds...`);
            if (serverStatusBadge) {
                serverStatusBadge.textContent = 'RESTARTING';
                serverStatusBadge.className = 'sim-status-badge status-restarting';
            }
            setTimeout(() => {
                appendLog(`[${getTimestamp()}] [Server thread/INFO]: Server reboot complete. All 20 TPS restored.`);
                if (serverStatusBadge) {
                    serverStatusBadge.textContent = 'ONLINE';
                    serverStatusBadge.className = 'sim-status-badge status-online';
                }
                showToast('Server restarted!', 'success');
            }, 1200);
        });
    }

    if (btnStop) {
        btnStop.addEventListener('click', () => {
            if (!isRunning) return;
            isRunning = false;
            if (serverStatusBadge) {
                serverStatusBadge.textContent = 'OFFLINE';
                serverStatusBadge.className = 'sim-status-badge status-offline';
            }
            appendLog(`[${getTimestamp()}] [Server thread/INFO]: Stopping the server...`);
            appendLog(`[${getTimestamp()}] [Server thread/INFO]: Saving players & world chunks`);
            appendLog(`[${getTimestamp()}] [Server thread/INFO]: Closing epoll listeners...`);
            appendLog(`[${getTimestamp()}] [Server thread/INFO]: Server stopped cleanly.`);
            showToast('Server stopped.', 'info');
        });
    }
}

/* ============================================================
   Live Node Latency / Ping Tester
   ============================================================ */
function initPingTester() {
    const pingButtons = document.querySelectorAll('.test-ping-btn');
    if (!pingButtons.length) return;

    pingButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const target = btn.getAttribute('data-node');
            const resultEl = document.getElementById(`ping-val-${target}`);
            if (!resultEl) return;

            btn.disabled = true;
            resultEl.textContent = 'Testing...';
            resultEl.className = 'ping-val ping-testing';

            // Realistic low latency simulation based on node
            const latencies = {
                sg: Math.floor(Math.random() * 8 + 12),     // Singapore 12-20ms
                de: Math.floor(Math.random() * 10 + 24),    // Frankfurt 24-34ms
                us: Math.floor(Math.random() * 12 + 35),    // New York 35-47ms
                jp: Math.floor(Math.random() * 8 + 18)      // Tokyo 18-26ms
            };

            setTimeout(() => {
                const latency = latencies[target] || 25;
                resultEl.textContent = `${latency} ms`;
                resultEl.className = latency < 30 ? 'ping-val ping-fast' : 'ping-val ping-good';
                btn.disabled = false;
            }, 500 + Math.random() * 400);
        });
    });
}

/* ============================================================
   Interactive FAQ Accordion
   ============================================================ */
function initFaqAccordion() {
    const faqItems = document.querySelectorAll('.faq-accordion-item');
    if (!faqItems.length) return;

    faqItems.forEach(item => {
        const header = item.querySelector('.faq-header');
        if (!header) return;

        header.addEventListener('click', () => {
            const isOpen = item.classList.contains('active');
            
            // Optional: close other accordions
            faqItems.forEach(other => {
                if (other !== item) other.classList.remove('active');
            });

            item.classList.toggle('active', !isOpen);
        });
    });

    // Search filter for FAQ
    const faqSearch = document.getElementById('faq-search-input');
    if (faqSearch) {
        faqSearch.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase().trim();
            faqItems.forEach(item => {
                const text = item.textContent.toLowerCase();
                if (text.includes(term)) {
                    item.style.display = 'block';
                } else {
                    item.style.display = 'none';
                }
            });
        });
    }
}

/* ============================================================
   Enhanced Checkout Configurator & Order Wizard
   ============================================================ */
function initCheckoutConfigurator() {
    const form = document.getElementById('checkout-config-form');
    if (!form) return;

    const params = new URLSearchParams(window.location.search);
    let plan = params.get('plan') || 'Sapwood';
    let basePrice = parseFloat(params.get('price')) || 3.49;
    let ram = params.get('ram') || '4GB';
    let cpu = params.get('cpu') || '2vCPU';
    let disk = params.get('disk') || '40GB';
    let billing = params.get('billing') || 'monthly';

    // Form inputs
    const planNameEl = document.getElementById('co-plan-name');
    const planPriceEl = document.getElementById('co-plan-price');
    const planRamEl = document.getElementById('co-plan-ram');
    const planCpuEl = document.getElementById('co-plan-cpu');
    const planDiskEl = document.getElementById('co-plan-disk');
    const totalAmountEl = document.getElementById('co-total-price');
    const discountNoticeEl = document.getElementById('co-discount-notice');

    const locationSelect = document.getElementById('co-location');
    const softwareSelect = document.getElementById('co-software');
    const subdomainInput = document.getElementById('co-subdomain');
    const billingCycleRadios = document.querySelectorAll('input[name="billing_cycle"]');
    const addonCheckboxes = document.querySelectorAll('.addon-checkbox');

    const discordBtn = document.getElementById('co-discord-btn');
    const telegramBtn = document.getElementById('co-telegram-btn');
    const messengerBtn = document.getElementById('co-messenger-btn');
    const copyInvoiceBtn = document.getElementById('co-copy-invoice-btn');

    // Populate initial UI
    if (planNameEl) planNameEl.textContent = plan;
    if (planRamEl) planRamEl.textContent = ram;
    if (planCpuEl) planCpuEl.textContent = cpu;
    if (planDiskEl) planDiskEl.textContent = disk;

    // Set initial radio
    billingCycleRadios.forEach(radio => {
        if (radio.value === billing) radio.checked = true;
    });

    function calculateTotal() {
        let selectedCycle = 'monthly';
        billingCycleRadios.forEach(r => {
            if (r.checked) selectedCycle = r.value;
        });

        let multiplier = 1;
        let discountPercent = 0;
        let months = 1;

        if (selectedCycle === 'quarterly') {
            multiplier = 3;
            discountPercent = 0.10; // 10% off
            months = 3;
        } else if (selectedCycle === 'annual') {
            multiplier = 12;
            discountPercent = 0.20; // 20% off
            months = 12;
        }

        // Addons
        let addonsCostMonthly = 0;
        let selectedAddonNames = [];
        addonCheckboxes.forEach(cb => {
            if (cb.checked) {
                const cost = parseFloat(cb.getAttribute('data-price')) || 0;
                addonsCostMonthly += cost;
                selectedAddonNames.push(cb.getAttribute('data-name'));
            }
        });

        const discountedPlanMonthly = basePrice * (1 - discountPercent);
        const monthlyTotalRate = discountedPlanMonthly + addonsCostMonthly;
        const finalBilledTotal = (discountedPlanMonthly * months) + (addonsCostMonthly * months);

        if (planPriceEl) {
            planPriceEl.textContent = `$${discountedPlanMonthly.toFixed(2)}`;
        }

        if (totalAmountEl) {
            totalAmountEl.textContent = `$${finalBilledTotal.toFixed(2)}`;
        }

        if (discountNoticeEl) {
            if (discountPercent > 0) {
                discountNoticeEl.textContent = `Includes ${discountPercent * 100}% ${selectedCycle} savings! Billed $${finalBilledTotal.toFixed(2)} every ${months} months.`;
                discountNoticeEl.style.display = 'block';
            } else {
                discountNoticeEl.textContent = `Billed monthly ($${finalBilledTotal.toFixed(2)}/mo). Cancel anytime.`;
                discountNoticeEl.style.display = 'block';
            }
        }

        updateActionLinks(selectedCycle, months, finalBilledTotal, selectedAddonNames);
    }

    function updateActionLinks(cycle, months, total, addons) {
        const location = locationSelect ? locationSelect.value : 'Singapore';
        const software = softwareSelect ? softwareSelect.value : 'Paper 1.20.4';
        const subdomain = subdomainInput && subdomainInput.value.trim() ? `${subdomainInput.value.trim()}.angkor.host` : 'Auto-generated';

        const orderText = `🎮 NEW ANGKOR HOSTING ORDER
━━━━━━━━━━━━━━━━━━━━━━━━━━
• Plan: ${plan} (${ram} RAM, ${cpu}, ${disk})
• Cycle: ${cycle.toUpperCase()} (${months} Month${months > 1 ? 's' : ''})
• Location: ${location}
• Software: ${software}
• Subdomain: ${subdomain}
• Addons: ${addons.length ? addons.join(', ') : 'None'}
• Total Amount: $${total.toFixed(2)}
━━━━━━━━━━━━━━━━━━━━━━━━━━
Please provision my server!`;

        // Discord link (community server / ticket)
        if (discordBtn) {
            discordBtn.href = "https://discord.gg/9vGv3yqg2k";
        }

        // Telegram deep link with text
        if (telegramBtn) {
            telegramBtn.href = `https://t.me/angkorhosting_bot?start=order_${encodeURIComponent(orderText)}`;
        }

        // Messenger deep link
        if (messengerBtn) {
            messengerBtn.href = "https://m.me/angkorhosting";
        }

        // Store current text on copy button
        if (copyInvoiceBtn) {
            copyInvoiceBtn.setAttribute('data-order-text', orderText);
        }
    }

    // Attach listeners
    if (locationSelect) locationSelect.addEventListener('change', calculateTotal);
    if (softwareSelect) softwareSelect.addEventListener('change', calculateTotal);
    if (subdomainInput) subdomainInput.addEventListener('input', calculateTotal);
    billingCycleRadios.forEach(r => r.addEventListener('change', calculateTotal));
    addonCheckboxes.forEach(cb => cb.addEventListener('change', calculateTotal));

    if (copyInvoiceBtn) {
        copyInvoiceBtn.addEventListener('click', () => {
            const text = copyInvoiceBtn.getAttribute('data-order-text');
            if (text) {
                navigator.clipboard.writeText(text).then(() => {
                    showToast('Order summary copied to clipboard! Paste it in Discord or Telegram.', 'success');
                }).catch(() => {
                    showToast('Failed to copy. Please select manually.', 'error');
                });
            }
        });
    }

    calculateTotal();
}

/* ============================================================
   1-Click Copy Code & Text Snippets
   ============================================================ */
function initCopyButtons() {
    document.querySelectorAll('.copy-snippet-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const targetId = btn.getAttribute('data-copy-target');
            const target = targetId ? document.getElementById(targetId) : btn.closest('.code-block-wrapper')?.querySelector('code');
            
            if (!target) return;

            const textToCopy = target.innerText || target.textContent;
            navigator.clipboard.writeText(textToCopy).then(() => {
                const originalText = btn.textContent;
                btn.textContent = 'Copied!';
                btn.classList.add('copied');
                showToast('Code copied to clipboard!', 'success');
                setTimeout(() => {
                    btn.textContent = originalText;
                    btn.classList.remove('copied');
                }, 2000);
            }).catch(() => {
                showToast('Could not copy to clipboard', 'error');
            });
        });
    });
}

/* ============================================================
   Smooth Scrolling for Anchor Links
   ============================================================ */
function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            if (href === '#' || !href) return;

            const target = document.querySelector(href);
            if (target) {
                e.preventDefault();
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
}

