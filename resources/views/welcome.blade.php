<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>VolunTrack - Interactive SaaS Capstone Console</title>
    <!-- Tailwind CSS CDN for instant styling -->
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <style>
        body {
            font-family: 'Plus Jakarta Sans', sans-serif;
        }
    </style>
</head>
<body class="bg-[#FDFDFC] text-[#1b1b18] min-h-screen flex flex-col justify-between">

    <!-- Top Navigation Header -->
    <header class="border-b border-[#e3e3e0] bg-white py-4 px-6 md:px-12 shadow-sm">
        <div class="max-w-7xl mx-auto flex items-center justify-between">
            <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#FF750F] to-[#ED8936] flex items-center justify-center text-white font-extrabold text-xl shadow-md">
                    V
                </div>
                <div>
                    <span class="text-xl font-extrabold tracking-tight text-[#1b1b18]">Volun<span class="text-[#FF750F]">Track</span></span>
                    <span class="block text-[10px] text-gray-500 uppercase tracking-widest font-semibold leading-none">SaaS Interactive Navigator</span>
                </div>
            </div>
            
            <div class="flex items-center gap-4">
                <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    Local Host Server Active
                </span>
            </div>
        </div>
    </header>

    <!-- Main Content Grid -->
    <main class="flex-1 py-8 px-6 md:px-12 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        <!-- Left Column: Interactive Navigators & Actions -->
        <div class="lg:col-span-7 space-y-6">
            
            <!-- 1. Auto-Login & Session Manager -->
            <div class="bg-white border border-[#e3e3e0] p-6 rounded-2xl shadow-sm space-y-4">
                <div class="flex items-center justify-between border-b border-gray-100 pb-3">
                    <h3 class="font-extrabold text-lg text-gray-900 flex items-center gap-2">
                        🔑 1. Quick Auth Session Manager
                    </h3>
                    <span id="active-user-badge" class="text-xs font-bold px-2.5 py-1 rounded-full bg-gray-100 text-gray-600">
                        No Active Session
                    </span>
                </div>
                
                <p class="text-xs text-gray-500">Select any pre-seeded database user role below to instantly log in and generate their Sanctum authentication token:</p>
                
                <div class="flex flex-col sm:flex-row gap-3">
                    <select id="user-select" class="flex-1 border border-gray-300 rounded-lg p-2.5 text-sm bg-gray-50 focus:ring-orange-500 focus:border-orange-500 outline-none">
                        <option value="superadmin">General System Admin (SuperAdmin - vms.com)</option>
                        <option value="rc_admin">Red Cross Admin (OrgAdmin - Red Cross)</option>
                        <option value="rc_coord">Red Cross Coordinator (Coordinator - Red Cross)</option>
                        <option value="rc_vol" selected>Sarah Jenkins (Volunteer - Red Cross)</option>
                        <option value="sc_vol">Save the Children Volunteer (Volunteer - Save the Children)</option>
                    </select>
                    
                    <button onclick="autologin()" class="px-5 py-2.5 bg-gradient-to-r from-[#FF750F] to-[#ED8936] text-white rounded-lg font-bold text-sm shadow-md hover:brightness-105 active:scale-95 transition">
                        Quick Login
                    </button>
                </div>
                <div class="hidden text-xs font-mono bg-gray-50 p-2.5 rounded border border-gray-200 break-all text-gray-600" id="token-display"></div>
            </div>

            <!-- 2. Interactive Navigation Deck -->
            <div class="bg-white border border-[#e3e3e0] p-6 rounded-2xl shadow-sm space-y-6">
                <div>
                    <h3 class="font-extrabold text-lg text-gray-900 flex items-center gap-2">
                        🧭 2. Interactive Endpoint Explorer
                    </h3>
                    <p class="text-xs text-gray-500 mt-1">Click any active action below to execute real-time backend SaaS transactions using the logged-in token:</p>
                </div>

                <!-- Volunteer Portal Workspace -->
                <div class="space-y-3">
                    <span class="block text-xs font-bold text-emerald-600 uppercase tracking-wider border-b border-emerald-100 pb-1">Volunteer Portal Actions</span>
                    <div class="flex flex-wrap gap-2.5">
                        <button onclick="apiCall('/api/volunteer/events', 'GET')" class="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg font-semibold text-xs border border-emerald-200 transition">
                            🔍 Browse Events (With Match Scores)
                        </button>
                        <button onclick="apiCall('/api/volunteer/schedule', 'GET')" class="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg font-semibold text-xs border border-emerald-200 transition">
                            📅 Get My Schedule
                        </button>
                    </div>

                    <!-- AI Bot Workspace -->
                    <div class="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-3 mt-3">
                        <span class="block text-xs font-extrabold text-gray-700">🤖 Ask VolunBot (RAG context Dialogue)</span>
                        <div class="flex gap-2">
                            <input type="text" id="ai-query" placeholder="Ask e.g. 'How many hours do I have?' or 'When is my next shift?'" class="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-xs outline-none bg-white focus:ring-1 focus:ring-orange-500">
                            <button onclick="askBot()" class="px-4 py-2 bg-[#FF750F] text-white rounded-lg text-xs font-bold shadow hover:brightness-105 active:scale-95 transition">
                                Ask AI
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Coordinator Workspace -->
                <div class="space-y-3 pt-3 border-t border-gray-100">
                    <span class="block text-xs font-bold text-blue-600 uppercase tracking-wider border-b border-blue-100 pb-1">Coordinator Desk Actions</span>
                    <div class="flex flex-wrap gap-2.5">
                        <button onclick="apiCall('/api/coordinator/events', 'GET')" class="px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg font-semibold text-xs border border-blue-200 transition">
                            📋 List Org Events & Shifts
                        </button>
                        <button onclick="apiCall('/api/coordinator/reports', 'GET')" class="px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg font-semibold text-xs border border-blue-200 transition">
                            📊 View Analytical Reports List
                        </button>
                        <button onclick="apiCall('/api/coordinator/reports', 'POST', {period: 'Q1 2026'})" class="px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg font-semibold text-xs border border-blue-200 transition">
                            💾 Compile Periodical Impact Report (Q1 2026)
                        </button>
                        <button onclick="apiCall('/api/coordinator/applications/1/ai-feedback', 'GET')" class="px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg font-semibold text-xs border border-blue-200 transition">
                            🧠 Get AI Screening Suggestions (Sarah Jenkins)
                        </button>
                    </div>
                </div>

                <!-- SuperAdmin Workspace -->
                <div class="space-y-3 pt-3 border-t border-gray-100">
                    <span class="block text-xs font-bold text-purple-600 uppercase tracking-wider border-b border-purple-100 pb-1">SuperAdmin Platform Actions</span>
                    <div class="flex flex-wrap gap-2.5">
                        <button onclick="apiCall('/api/superadmin/onboard-tenant', 'POST', {org_name: 'UNICEF Ethiopia', org_email: 'unicef@et.org', org_address: 'Bole, Addis Ababa', admin_full_name: 'Liyu Kebede', admin_email: 'liyu@unicef.org', admin_password: 'securepassword123'})" class="px-3.5 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg font-semibold text-xs border border-purple-200 transition">
                            🏢 Onboard New Organization Tenant atomically
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Right Column: Real-time Output Terminal Console -->
        <div class="lg:col-span-5 space-y-6 lg:sticky lg:top-8">
            <div class="bg-gray-950 text-emerald-400 p-6 rounded-2xl shadow-xl font-mono text-xs space-y-4 h-[550px] flex flex-col justify-between">
                
                <div class="flex items-center justify-between border-b border-gray-800 pb-2.5">
                    <div class="flex items-center gap-1.5">
                        <span class="w-3.5 h-3.5 rounded-full bg-red-500"></span>
                        <span class="w-3.5 h-3.5 rounded-full bg-yellow-500"></span>
                        <span class="w-3.5 h-3.5 rounded-full bg-green-500"></span>
                    </div>
                    <span class="text-gray-400 font-bold tracking-wider">💻 VolunTrack API Live Output</span>
                </div>

                <!-- Console Display Box -->
                <div class="flex-1 overflow-y-auto space-y-3 scrollbar-thin scrollbar-thumb-gray-800 scrollbar-track-transparent pr-1">
                    <div id="console-welcome" class="text-gray-400 space-y-2 leading-relaxed">
                        <p class="text-emerald-500 font-bold">Welcome to the SaaS Command Center Console!</p>
                        <p>1. Choose an account from the "Quick Auth" dropdown.</p>
                        <p>2. Click "Quick Login" to authenticate and save the token.</p>
                        <p>3. Execute any endpoint check above to view raw JSON payloads, database states, and logical multi-tenancy isolation scoping in real-time!</p>
                    </div>
                    <pre id="console-output" class="text-emerald-300 font-mono whitespace-pre-wrap break-all hidden"></pre>
                </div>

                <div class="flex items-center justify-between border-t border-gray-800 pt-2 text-[10px] text-gray-500">
                    <span id="response-status">Status: IDLE</span>
                    <span id="response-latency">Latency: --</span>
                </div>
            </div>
        </div>

    </main>

    <!-- Footer -->
    <footer class="border-t border-[#e3e3e0] bg-white py-4 text-center text-xs text-gray-500 mt-8">
        <div class="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-2">
            <span>&copy; 2026 VolunTrack SaaS Corp. All Rights Reserved. Built with Laravel 12 & Livewire.</span>
            <span>Academic Capstone &bull; Core AI Architecture Project</span>
        </div>
    </footer>

    <!-- Frontend Interactive Javascript Logic -->
    <script>
        // Pre-seeded credentials configuration
        const credentials = {
            superadmin: { email: 'superadmin@vms.com', password: 'password' },
            rc_admin: { email: 'redcross.admin@vms.com', password: 'password' },
            rc_coord: { email: 'redcross.coord@vms.com', password: 'password' },
            rc_vol: { email: 'redcross.vol@vms.com', password: 'password' },
            sc_vol: { email: 'savechildren.vol@vms.com', password: 'password' }
        };

        let activeToken = localStorage.getItem('vms_auth_token') || '';
        let activeUserRole = localStorage.getItem('vms_user_role') || '';
        let activeUserName = localStorage.getItem('vms_user_name') || '';

        // Initialize state UI
        updateBadge();

        function updateBadge() {
            const badge = document.getElementById('active-user-badge');
            if (activeToken) {
                badge.innerText = `Active: ${activeUserRole.toUpperCase()} (${activeUserName})`;
                badge.className = 'text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700';
            } else {
                badge.innerText = 'No Active Session';
                badge.className = 'text-xs font-bold px-2.5 py-1 rounded-full bg-gray-100 text-gray-600';
            }
        }

        async function autologin() {
            const selectedKey = document.getElementById('user-select').value;
            const creds = credentials[selectedKey];

            showLoading();

            const start = performance.now();
            try {
                const response = await fetch('/api/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                    body: JSON.stringify(creds)
                });

                const data = await response.json();
                const latency = Math.round(performance.now() - start);

                showOutput(data, response.status, latency);

                if (response.ok && data.access_token) {
                    activeToken = data.access_token;
                    activeUserRole = data.role;
                    activeUserName = data.user.full_name;

                    localStorage.setItem('vms_auth_token', activeToken);
                    localStorage.setItem('vms_user_role', activeUserRole);
                    localStorage.setItem('vms_user_name', activeUserName);

                    updateBadge();
                }
            } catch (err) {
                const latency = Math.round(performance.now() - start);
                showOutput({ error: 'Connection failed', message: err.message }, 500, latency);
            }
        }

        async function apiCall(endpoint, method = 'GET', body = null) {
            if (!activeToken) {
                alert('Please authenticate first by selecting a user and clicking "Quick Login"!');
                return;
            }

            showLoading();

            const start = performance.now();
            try {
                const headers = {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'Authorization': `Bearer ${activeToken}`
                };

                const options = { method, headers };
                if (body) {
                    options.body = JSON.stringify(body);
                }

                const response = await fetch(endpoint, options);
                const data = await response.json();
                const latency = Math.round(performance.now() - start);

                showOutput(data, response.status, latency);
            } catch (err) {
                const latency = Math.round(performance.now() - start);
                showOutput({ error: 'Endpoint call failed', message: err.message }, 500, latency);
            }
        }

        async function askBot() {
            const query = document.getElementById('ai-query').value.trim();
            if (!query) {
                alert('Please input a query prompt!');
                return;
            }
            document.getElementById('ai-query').value = '';
            await apiCall('/api/volunteer/chat', 'POST', { message: query });
        }

        function showLoading() {
            document.getElementById('console-welcome').classList.add('hidden');
            const output = document.getElementById('console-output');
            output.classList.remove('hidden');
            output.innerText = 'Executing safe server transaction... Please wait...';
            document.getElementById('response-status').innerText = 'Status: CONNECTING';
            document.getElementById('response-latency').innerText = 'Latency: --';
        }

        function showOutput(data, status, latency) {
            const output = document.getElementById('console-output');
            output.innerText = JSON.stringify(data, null, 4);
            document.getElementById('response-status').innerText = `Status: ${status}`;
            document.getElementById('response-latency').innerText = `Latency: ${latency}ms`;
        }
    </script>

</body>
</html>
