<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>VolunTrack - Volunteer Management System</title>
    <!-- Tailwind CSS -->
    <script src="https://cdn.tailwindcss.com"></script>
    <!-- Alpine.js -->
    <script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js"></script>
    <!-- Chart.js for Skills Radar -->
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    
    <style>
        body { font-family: 'Plus Jakarta Sans', sans-serif; }
        [x-cloak] { display: none !important; }
        
        /* Chatbot typing animation */
        .typing-indicator span {
            display: inline-block;
            width: 6px; height: 6px;
            background-color: #FF750F;
            border-radius: 50%;
            animation: bounce 1.4s infinite ease-in-out both;
        }
        .typing-indicator span:nth-child(1) { animation-delay: -0.32s; }
        .typing-indicator span:nth-child(2) { animation-delay: -0.16s; }
        @keyframes bounce {
            0%, 80%, 100% { transform: scale(0); }
            40% { transform: scale(1); }
        }

        /* Custom Scrollbar */
        ::-webkit-scrollbar { width: 8px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
        .dark ::-webkit-scrollbar-thumb { background: #475569; }

        /* Slide to approve */
        .slider-track { position: relative; width: 100%; height: 48px; background: #e2e8f0; border-radius: 24px; overflow: hidden; }
        .slider-thumb { position: absolute; top: 4px; left: 4px; width: 40px; height: 40px; background: #FF750F; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; transition: background 0.2s; z-index: 10; }
        .slider-progress { position: absolute; top: 0; left: 0; height: 100%; background: #48BB78; width: 0; transition: width 0.1s; }
        .slider-text { position: absolute; width: 100%; text-align: center; line-height: 48px; color: #64748b; font-weight: 600; user-select: none; z-index: 5; }
    </style>
</head>
<body x-data="vmsApp()" class="antialiased min-h-screen transition-colors duration-300" 
      :class="theme === 'dark' ? 'bg-[#1A202C] text-[#EDEDEC] dark' : 'bg-[#FDFDFC] text-[#1b1b18]'">

    <div class="flex h-screen overflow-hidden relative">
        
        <!-- Mobile Backdrop -->
        <div x-show="sidebarOpen" @click="sidebarOpen = false" class="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-30 md:hidden" x-cloak></div>

        <!-- SIDEBAR NAVIGATION -->
        <aside class="w-64 border-r flex flex-col transition-transform duration-300 flex-shrink-0 absolute md:relative z-40 h-full transform md:translate-x-0" 
               :class="[theme === 'dark' ? 'bg-[#2D3748] border-gray-700' : 'bg-white border-[#e3e3e0]', sidebarOpen ? 'translate-x-0' : '-translate-x-full']">
            
            <!-- Logo -->
            <div class="p-6 border-b" :class="theme === 'dark' ? 'border-gray-700' : 'border-[#e3e3e0]'">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#FF750F] to-[#ED8936] flex items-center justify-center text-white font-extrabold text-xl shadow-md">
                        V
                    </div>
                    <div>
                        <span class="text-xl font-extrabold tracking-tight">Volun<span class="text-[#FF750F]">Track</span></span>
                    </div>
                </div>
            </div>

            <!-- Menus -->
            <nav class="flex-1 p-4 space-y-1 overflow-y-auto">
                
                <!-- Unauthenticated Options -->
                <template x-if="!token">
                    <div class="space-y-2 mt-2">
                        <p class="text-xs font-bold uppercase tracking-wider text-gray-500 mb-4 px-2">Quick Login</p>
                        <button @click="login('volunteer')" class="w-full text-left px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-orange-50 hover:text-orange-600 transition flex items-center gap-2">
                            <span>🧑‍🤝‍🧑</span> Volunteer Portal
                        </button>
                        <button @click="login('coordinator')" class="w-full text-left px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-blue-50 hover:text-blue-600 transition flex items-center gap-2">
                            <span>📋</span> Coordinator Desk
                        </button>
                        <button @click="login('orgadmin')" class="w-full text-left px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-purple-50 hover:text-purple-600 transition flex items-center gap-2">
                            <span>🏢</span> Tenant Admin
                        </button>
                        <button @click="login('superadmin')" class="w-full text-left px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-gray-800 hover:text-white transition flex items-center gap-2">
                            <span>🧠</span> SuperAdmin
                        </button>
                    </div>
                </template>

                <!-- Volunteer Menu -->
                <template x-if="userRole === 'Volunteer'">
                    <div class="space-y-1">
                        <button @click="activeView = 'dashboard'" :class="activeView==='dashboard'?'bg-orange-50 text-orange-600':'hover:bg-gray-50'" class="w-full text-left px-4 py-2.5 rounded-lg text-sm font-semibold transition flex items-center gap-2"><span>🏠</span> Dashboard</button>
                        <button @click="loadEvents()" :class="activeView==='events'?'bg-orange-50 text-orange-600':'hover:bg-gray-50'" class="w-full text-left px-4 py-2.5 rounded-lg text-sm font-semibold transition flex items-center gap-2"><span>🔍</span> Browse Events</button>
                        <button @click="loadSchedule()" :class="activeView==='schedule'?'bg-orange-50 text-orange-600':'hover:bg-gray-50'" class="w-full text-left px-4 py-2.5 rounded-lg text-sm font-semibold transition flex items-center gap-2"><span>📅</span> My Schedule</button>
                        <button @click="loadChat()" :class="activeView==='chat'?'bg-orange-50 text-orange-600':'hover:bg-gray-50'" class="w-full text-left px-4 py-2.5 rounded-lg text-sm font-semibold transition flex items-center gap-2"><span>💬</span> Ask VolunBot</button>
                    </div>
                </template>

                <!-- Coordinator Menu -->
                <template x-if="userRole === 'Coordinator'">
                    <div class="space-y-1">
                        <button @click="activeView = 'dashboard'" :class="activeView==='dashboard'?'bg-blue-50 text-blue-600':'hover:bg-gray-50'" class="w-full text-left px-4 py-2.5 rounded-lg text-sm font-semibold transition flex items-center gap-2"><span>🏠</span> Dashboard</button>
                        <button @click="loadScreening()" :class="activeView==='screening'?'bg-blue-50 text-blue-600':'hover:bg-gray-50'" class="w-full text-left px-4 py-2.5 rounded-lg text-sm font-semibold transition flex items-center gap-2"><span>🛡️</span> Guardian Queue</button>
                        <button @click="loadAttendance()" :class="activeView==='attendance'?'bg-blue-50 text-blue-600':'hover:bg-gray-50'" class="w-full text-left px-4 py-2.5 rounded-lg text-sm font-semibold transition flex items-center gap-2"><span>📍</span> VolunTrack Check-In</button>
                    </div>
                </template>

                <!-- OrgAdmin Menu -->
                <template x-if="userRole === 'OrgAdmin'">
                    <div class="space-y-1">
                        <button @click="activeView = 'dashboard'" :class="activeView==='dashboard'?'bg-purple-50 text-purple-600':'hover:bg-gray-50'" class="w-full text-left px-4 py-2.5 rounded-lg text-sm font-semibold transition flex items-center gap-2"><span>🏠</span> Analytics Summary</button>
                        <button @click="loadReports()" :class="activeView==='reports'?'bg-purple-50 text-purple-600':'hover:bg-gray-50'" class="w-full text-left px-4 py-2.5 rounded-lg text-sm font-semibold transition flex items-center gap-2"><span>📊</span> Export Reports</button>
                    </div>
                </template>

                <!-- SuperAdmin Menu -->
                <template x-if="userRole === 'SuperAdmin'">
                    <div class="space-y-1 text-[#A1A09A]">
                        <button @click="activeView = 'dashboard'" :class="activeView==='dashboard'?'bg-[#1F2937] text-[#10B981]':'hover:bg-[#1F2937]'" class="w-full text-left px-4 py-2.5 rounded-lg text-sm font-semibold transition flex items-center gap-2"><span>🧠</span> Command Center</button>
                        <button @click="activeView = 'onboarding'" :class="activeView==='onboarding'?'bg-[#1F2937] text-[#10B981]':'hover:bg-[#1F2937]'" class="w-full text-left px-4 py-2.5 rounded-lg text-sm font-semibold transition flex items-center gap-2"><span>🏢</span> Tenant Onboarding</button>
                    </div>
                </template>
            </nav>

            <!-- User Profile Bottom -->
            <div class="p-4 border-t" :class="theme === 'dark' ? 'border-gray-700' : 'border-[#e3e3e0]'" x-show="token" x-cloak>
                <div class="flex items-center gap-3">
                    <div class="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm shadow-sm"
                         :class="theme === 'dark' ? 'bg-[#10B981] text-gray-900' : 'bg-[#FF750F] text-white'" x-text="userName.charAt(0)"></div>
                    <div class="flex-1 overflow-hidden">
                        <p class="text-sm font-bold truncate" x-text="userName"></p>
                        <p class="text-[10px] uppercase tracking-wider font-semibold opacity-70 truncate" x-text="userRole"></p>
                    </div>
                    <button @click="logout()" class="p-1.5 rounded-md opacity-60 hover:opacity-100 hover:bg-red-100 hover:text-red-600 transition" title="Logout">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
                    </button>
                </div>
            </div>
        </aside>

        <!-- MAIN CANVAS -->
        <main class="flex-1 flex flex-col h-screen overflow-hidden">
            
            <!-- Top Header -->
            <header class="px-4 md:px-8 py-4 border-b flex justify-between items-center z-20 relative" 
                    :class="theme === 'dark' ? 'border-gray-700 bg-[#2D3748]' : 'border-[#e3e3e0] bg-white'">
                <div class="flex items-center gap-3">
                    <button @click="sidebarOpen = true" class="md:hidden p-1.5 rounded-lg transition" :class="theme === 'dark' ? 'hover:bg-gray-700 text-gray-200' : 'hover:bg-gray-100 text-gray-600'">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
                    </button>
                    <h1 class="text-xl font-extrabold flex items-center gap-2 truncate">
                        <span x-text="getViewTitle()"></span>
                    </h1>
                </div>
                
                <div class="flex items-center gap-4">
                    <span x-show="isLoading" class="text-xs font-semibold text-gray-400 animate-pulse">Processing...</span>
                    <span x-show="token" class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold shadow-sm" 
                          :class="theme === 'dark' ? 'bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/30' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'">
                        <span class="w-2 h-2 rounded-full animate-pulse" :class="theme === 'dark' ? 'bg-[#10B981]' : 'bg-emerald-500'"></span>
                        System Online
                    </span>
                </div>
            </header>

            <!-- Scrollable Content -->
            <div class="flex-1 overflow-y-auto p-6 md:p-8" id="main-scroll-area">
                
                <!-- UNAUTHENTICATED HERO -->
                <template x-if="!token">
                    <div class="h-full flex flex-col items-center justify-center text-center max-w-2xl mx-auto space-y-6">
                        <div class="w-20 h-20 rounded-3xl bg-gradient-to-tr from-[#FF750F] to-[#ED8936] flex items-center justify-center text-white font-extrabold text-4xl shadow-xl mx-auto mb-4 transform rotate-3">
                            V
                        </div>
                        <h2 class="text-4xl font-extrabold tracking-tight">Welcome to <span class="text-[#FF750F]">VolunTrack</span> SaaS</h2>
                        <p class="text-gray-500 text-lg">Select a role from the sidebar to instantly authenticate and experience the tailored multi-tenant interactive workspace.</p>
                        
                        <div class="grid grid-cols-2 gap-4 w-full mt-8">
                            <div class="p-6 bg-white border border-gray-200 rounded-2xl shadow-sm text-left">
                                <h3 class="font-bold mb-2">🧑‍🤝‍🧑 Volunteer Portal</h3>
                                <p class="text-sm text-gray-500">Discover events, view matching scores, schedule shifts, and chat with VolunBot AI.</p>
                            </div>
                            <div class="p-6 bg-white border border-gray-200 rounded-2xl shadow-sm text-left">
                                <h3 class="font-bold mb-2">📋 Coordinator Desk</h3>
                                <p class="text-sm text-gray-500">Screen applicants with Guardian Queue AI, verify live attendance, and capture overrides.</p>
                            </div>
                            <div class="p-6 bg-white border border-gray-200 rounded-2xl shadow-sm text-left">
                                <h3 class="font-bold mb-2">🏢 OrgAdmin Summary</h3>
                                <p class="text-sm text-gray-500">Compile organizational CSV impact reports and analyze volunteer metric aggregations.</p>
                            </div>
                            <div class="p-6 bg-[#2D3748] text-white border border-gray-700 rounded-2xl shadow-sm text-left relative overflow-hidden">
                                <div class="absolute top-0 right-0 p-4 opacity-10"><svg class="w-16 h-16 text-emerald-500" fill="currentColor" viewBox="0 0 20 20"><path d="M10 2a8 8 0 100 16 8 8 0 000-16zM8 11.5l-2.5-2.5 1.41-1.41L8 8.67l4.59-4.58L14 5.5 8 11.5z"></path></svg></div>
                                <h3 class="font-bold mb-2 text-[#10B981]">🧠 Neural Command Center</h3>
                                <p class="text-sm text-gray-400">High-contrast dark mode for SuperAdmins to onboard tenants and monitor system health.</p>
                            </div>
                        </div>
                    </div>
                </template>

                <!-- VOLUNTEER DASHBOARD -->
                <template x-if="token && userRole === 'Volunteer' && activeView === 'dashboard'">
                    <div class="space-y-6">
                        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div class="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                                <p class="text-sm font-semibold text-gray-500 mb-1">Total Hours Served</p>
                                <p class="text-3xl font-extrabold text-[#FF750F]" x-text="volunteerProfile.total_hours + 'h'"></p>
                            </div>
                            <div class="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm relative overflow-hidden">
                                <div class="absolute right-0 bottom-0 p-4 opacity-10"><svg class="w-16 h-16 text-emerald-500" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path></svg></div>
                                <p class="text-sm font-semibold text-gray-500 mb-1">Impact Score</p>
                                <p class="text-3xl font-extrabold text-emerald-600" x-text="volunteerProfile.impact_score + ' pts'"></p>
                            </div>
                            <div class="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                                <p class="text-sm font-semibold text-gray-500 mb-2">Registered Skills</p>
                                <div class="flex flex-wrap gap-2">
                                    <template x-for="skill in volunteerProfile.skills" :key="skill">
                                        <span class="px-2.5 py-1 bg-gray-100 text-gray-700 text-xs font-bold rounded-md" x-text="skill"></span>
                                    </template>
                                </div>
                            </div>
                        </div>

                        <div class="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm mt-8">
                            <h3 class="font-bold text-lg mb-4 flex items-center gap-2">📢 Organization Announcements</h3>
                            <div class="space-y-4">
                                <div class="p-4 bg-orange-50 rounded-xl border border-orange-100">
                                    <p class="text-sm font-bold text-orange-800">Urgent: Medical supplies needed at Stadium</p>
                                    <p class="text-xs text-orange-600 mt-1">We are looking for 5 extra volunteers today. Check the Events tab.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </template>

                <!-- VOLUNTEER EVENTS (BROWSER) -->
                <template x-if="activeView === 'events'">
                    <div class="space-y-6">
                        <template x-for="event in events" :key="event.id">
                            <div class="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden mb-6">
                                <div class="bg-gray-50 p-5 border-b border-gray-200 flex justify-between items-start">
                                    <div>
                                        <h3 class="font-extrabold text-xl" x-text="event.title"></h3>
                                        <p class="text-sm text-gray-500 mt-1 flex items-center gap-1"><span>📍</span> <span x-text="event.location"></span></p>
                                    </div>
                                    <span class="text-xs font-bold px-3 py-1 bg-blue-100 text-blue-700 rounded-full" x-text="event.status"></span>
                                </div>
                                <div class="p-5">
                                    <h4 class="text-sm font-bold text-gray-700 mb-3 uppercase tracking-wider">Available Shifts</h4>
                                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <template x-for="shift in event.shifts" :key="shift.id">
                                            <div class="border border-gray-200 rounded-xl p-4 relative overflow-hidden group hover:border-orange-300 transition">
                                                <!-- Match Score Progress Bar & Badge -->
                                                <div class="absolute top-4 right-4 flex flex-col items-end gap-1.5 w-28">
                                                    <div class="px-2.5 py-1 rounded font-bold text-[10px] uppercase tracking-wider w-full text-center" 
                                                         :class="shift.match_score >= 80 ? 'bg-emerald-100 text-emerald-700' : (shift.match_score >= 50 ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600')">
                                                        <span x-text="shift.match_score + '% Match'"></span>
                                                    </div>
                                                    <div class="w-full bg-gray-200 rounded-full h-1 overflow-hidden">
                                                        <div class="h-1 rounded-full transition-all duration-1000"
                                                             :style="`width: ${shift.match_score}%`"
                                                             :class="shift.match_score >= 80 ? 'bg-emerald-500' : (shift.match_score >= 50 ? 'bg-amber-500' : 'bg-gray-400')">
                                                        </div>
                                                    </div>
                                                </div>
                                                
                                                <p class="font-bold text-gray-900 mb-1" x-text="formatDate(shift.start_time)"></p>
                                                <p class="text-xs text-gray-500 mb-3" x-text="formatTime(shift.start_time) + ' - ' + formatTime(shift.end_time)"></p>
                                                
                                                <div class="mb-4">
                                                    <p class="text-xs font-semibold text-gray-500 mb-1">Required:</p>
                                                    <div class="flex flex-wrap gap-1">
                                                        <template x-for="req in shift.required_skills" :key="req">
                                                            <span class="text-[10px] font-bold px-2 py-0.5 bg-gray-100 text-gray-600 rounded" x-text="req"></span>
                                                        </template>
                                                        <span x-show="!shift.required_skills || shift.required_skills.length===0" class="text-[10px] text-gray-400 italic">None</span>
                                                    </div>
                                                </div>
                                                
                                                <button @click="applyForShift(shift.id)" class="w-full py-2 bg-[#FF750F] text-white font-bold text-sm rounded-lg hover:brightness-105 active:scale-95 transition">
                                                    Apply for Shift
                                                </button>
                                            </div>
                                        </template>
                                    </div>
                                </div>
                            </div>
                        </template>
                        <div x-show="events.length === 0" class="text-center py-12 text-gray-400 font-bold">No events currently active.</div>
                    </div>
                </template>

                <!-- VOLUNTEER SCHEDULE -->
                <template x-if="activeView === 'schedule'">
                    <div class="max-w-3xl mx-auto relative border-l-2 border-gray-200 ml-4 space-y-8 pb-8">
                        <template x-for="assign in schedule" :key="assign.id">
                            <div class="relative pl-8">
                                <!-- Timeline node -->
                                <div class="absolute -left-[9px] top-1 w-4 h-4 rounded-full border-2 border-white"
                                     :class="assign.status === 'confirmed' ? 'bg-emerald-500' : (assign.status === 'cancelled' ? 'bg-red-500' : 'bg-gray-400')"></div>
                                
                                <div class="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
                                    <div class="flex justify-between items-start mb-2">
                                        <h3 class="font-bold text-lg" x-text="assign.shift.event.title"></h3>
                                        <span class="text-xs font-bold px-2.5 py-1 rounded uppercase tracking-wider"
                                              :class="assign.status === 'confirmed' ? 'bg-emerald-50 text-emerald-700' : (assign.status === 'cancelled' ? 'bg-red-50 text-red-700' : 'bg-gray-100 text-gray-700')"
                                              x-text="assign.status"></span>
                                    </div>
                                    <p class="text-sm text-gray-600 font-semibold mb-1" x-text="formatDate(assign.shift.start_time)"></p>
                                    <p class="text-xs text-gray-500" x-text="formatTime(assign.shift.start_time) + ' - ' + formatTime(assign.shift.end_time)"></p>
                                    
                                    <!-- Check in Action if confirmed and active -->
                                    <template x-if="assign.status === 'confirmed'">
                                        <div class="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
                                            <span class="text-xs text-gray-500">Location: <span class="font-bold text-gray-700" x-text="assign.shift.event.location"></span></span>
                                            <button @click="simulateCheckin(assign.shift_id)" class="px-4 py-1.5 bg-gray-900 text-white text-xs font-bold rounded-lg hover:bg-[#FF750F] transition">
                                                Simulate Check-In 📍
                                            </button>
                                        </div>
                                    </template>
                                </div>
                            </div>
                        </template>
                        <div x-show="schedule.length === 0" class="pl-8 text-gray-400 font-bold">Your schedule is empty.</div>
                    </div>
                </template>

                <!-- VOLUNBOT CHAT -->
                <template x-if="activeView === 'chat'">
                    <div class="h-full flex flex-col max-w-4xl mx-auto bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                        <!-- Chat history -->
                        <div class="flex-1 overflow-y-auto p-6 space-y-4" id="chat-box">
                            <template x-for="(msg, index) in chatMessages" :key="index">
                                <div class="flex" :class="msg.role === 'user' ? 'justify-end' : 'justify-start'">
                                    <div class="max-w-[75%] p-4 rounded-2xl text-sm"
                                         :class="msg.role === 'user' ? 'bg-[#FF750F] text-white rounded-tr-none' : 'bg-gray-100 text-gray-800 rounded-tl-none'">
                                        <div class="font-bold text-xs mb-1 opacity-70" x-text="msg.role === 'user' ? 'You' : 'VolunBot'"></div>
                                        <div style="white-space: pre-wrap;" x-text="msg.text"></div>
                                    </div>
                                </div>
                            </template>
                            <div x-show="isTyping" class="flex justify-start">
                                <div class="bg-gray-100 p-4 rounded-2xl rounded-tl-none flex items-center gap-1 typing-indicator">
                                    <span></span><span></span><span></span>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Quick Prompts -->
                        <div class="px-6 py-3 bg-gray-50 border-t border-gray-100 flex gap-2 overflow-x-auto scrollbar-hide">
                            <button @click="chatInput='When is my next shift?'; sendChat()" class="whitespace-nowrap px-3 py-1.5 bg-white border border-gray-200 rounded-full text-xs font-semibold text-gray-600 hover:border-[#FF750F] hover:text-[#FF750F] transition">When is my next shift?</button>
                            <button @click="chatInput='How many hours do I have?'; sendChat()" class="whitespace-nowrap px-3 py-1.5 bg-white border border-gray-200 rounded-full text-xs font-semibold text-gray-600 hover:border-[#FF750F] hover:text-[#FF750F] transition">How many hours do I have?</button>
                        </div>
                        
                        <!-- Input Box -->
                        <div class="p-4 bg-white border-t border-gray-200 flex gap-3 items-center">
                            <input type="text" x-model="chatInput" @keyup.enter="sendChat()" placeholder="Ask VolunBot something..." class="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#FF750F]/50 focus:border-[#FF750F] transition">
                            <button @click="sendChat()" :disabled="!chatInput || isTyping" class="w-12 h-12 bg-[#FF750F] text-white rounded-xl flex items-center justify-center shadow hover:brightness-105 disabled:opacity-50 transition">
                                <svg class="w-5 h-5 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path></svg>
                            </button>
                        </div>
                    </div>
                </template>

                <!-- GUARDIAN QUEUE SCREENING (Coordinator) -->
                <template x-if="activeView === 'screening'">
                    <div class="h-full flex flex-col md:flex-row gap-6">
                        <!-- Pane A: Queue List -->
                        <div class="w-full md:w-1/4 bg-white border border-gray-200 rounded-2xl flex flex-col overflow-hidden shadow-sm">
                            <div class="p-4 border-b border-gray-100 bg-gray-50">
                                <h3 class="font-bold text-gray-800">Review Queue</h3>
                                <p class="text-xs text-gray-500" x-text="applications.length + ' Pending Applications'"></p>
                            </div>
                            <div class="flex-1 overflow-y-auto p-2 space-y-2">
                                <template x-for="app in applications" :key="app.id">
                                    <button @click="selectApp(app)" class="w-full text-left p-3 rounded-xl border transition flex items-center justify-between"
                                            :class="selectedApp && selectedApp.id === app.id ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-100 hover:border-gray-300'">
                                        <div>
                                            <p class="font-bold text-sm text-gray-900" x-text="app.volunteer.user.full_name"></p>
                                            <p class="text-[10px] font-semibold text-gray-500 truncate w-32" x-text="'Shift: ' + app.shift.id"></p>
                                        </div>
                                        <div class="w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs"
                                             :class="app.match_score >= 80 ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-700'">
                                            <span x-text="(app.match_score || '95') + '%'"></span>
                                        </div>
                                    </button>
                                </template>
                                <div x-show="applications.length===0" class="p-4 text-center text-gray-400 text-sm font-bold">Queue is empty</div>
                            </div>
                        </div>

                        <!-- Pane B: Detail View -->
                        <div class="w-full md:w-1/2 bg-white border border-gray-200 rounded-2xl shadow-sm flex flex-col overflow-hidden">
                            <template x-if="selectedApp">
                                <div class="flex-1 overflow-y-auto p-6 space-y-6">
                                    <div class="flex justify-between items-start border-b border-gray-100 pb-4">
                                        <div>
                                            <h2 class="text-2xl font-extrabold" x-text="selectedApp.volunteer.user.full_name"></h2>
                                            <p class="text-sm text-gray-500 mt-1" x-text="selectedApp.volunteer.user.email"></p>
                                        </div>
                                        <div class="text-right">
                                            <p class="text-xs text-gray-500 uppercase font-bold">Total Hours</p>
                                            <p class="text-xl font-bold text-emerald-600" x-text="selectedApp.volunteer.total_hours"></p>
                                        </div>
                                    </div>

                                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <!-- Radar Chart Container -->
                                        <div class="bg-gray-50 p-4 rounded-xl border border-gray-100 flex flex-col items-center">
                                            <p class="text-xs font-bold text-gray-500 mb-2 w-full text-center uppercase">Skills Alignment</p>
                                            <div class="relative w-full max-w-[200px] aspect-square">
                                                <canvas id="radarChart"></canvas>
                                            </div>
                                        </div>

                                        <!-- AI Feedback Card -->
                                        <div class="bg-blue-50 border border-blue-100 p-4 rounded-xl flex flex-col">
                                            <p class="text-xs font-bold text-blue-800 mb-2 flex items-center gap-1"><span>🧠</span> AI Feedback Suggester</p>
                                            <textarea x-model="selectedApp.feedback" class="flex-1 w-full bg-white border border-blue-200 rounded-lg p-3 text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-400 resize-none"></textarea>
                                        </div>
                                    </div>

                                    <!-- Slide to Approve Alpine Custom Component -->
                                    <div class="pt-4" x-data="sliderComponent(selectedApp.id)">
                                        <div class="slider-track" x-ref="track">
                                            <div class="slider-progress" :style="`width: ${progress}%`" :class="approved ? 'bg-emerald-500' : 'bg-emerald-400'"></div>
                                            <div class="slider-text" x-text="approved ? 'Approved!' : 'Slide right to Approve'"></div>
                                            <div class="slider-thumb shadow-md" 
                                                 :style="`transform: translateX(${thumbX}px)`"
                                                 @mousedown="startDrag"
                                                 @touchstart.passive="startDrag"
                                                 :class="approved ? 'bg-emerald-600 cursor-default' : 'bg-[#FF750F]'">
                                                <svg x-show="!approved" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M9 5l7 7-7 7"></path></svg>
                                                <svg x-show="approved" class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path></svg>
                                            </div>
                                        </div>
                                    </div>

                                </div>
                            </template>
                            <template x-if="!selectedApp">
                                <div class="flex-1 flex items-center justify-center text-gray-400 font-bold">
                                    Select an application from the queue to review.
                                </div>
                            </template>
                        </div>

                        <!-- Pane C: Staff Notes Chat -->
                        <div class="w-full md:w-1/4 bg-white border border-gray-200 rounded-2xl shadow-sm flex flex-col overflow-hidden">
                            <div class="p-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                                <h3 class="font-bold text-gray-800 text-sm">Staff Context Notes</h3>
                                <span class="text-[10px] uppercase font-bold text-gray-400">Internal</span>
                            </div>
                            <div class="flex-1 p-4 overflow-y-auto space-y-3 bg-gray-50/50">
                                <template x-if="selectedApp">
                                    <div class="space-y-3">
                                        <div class="flex flex-col">
                                            <span class="text-[10px] font-bold text-gray-500 mb-0.5">Abebe (System)</span>
                                            <div class="bg-gray-100 p-2.5 rounded-lg text-xs text-gray-700">Validated her medical license, looks great. Approved.</div>
                                        </div>
                                    </div>
                                </template>
                                <template x-if="!selectedApp">
                                    <div class="text-center text-xs text-gray-400 font-bold mt-10">Select an applicant to view notes.</div>
                                </template>
                            </div>
                            <div class="p-3 border-t border-gray-100 bg-white">
                                <input type="text" placeholder="Add an internal note..." :disabled="!selectedApp" class="w-full bg-gray-100 border-none rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-blue-500 outline-none disabled:opacity-50">
                            </div>
                        </div>
                    </div>
                </template>

                <!-- LIVE ATTENDANCE (Coordinator) -->
                <template x-if="activeView === 'attendance'">
                    <div class="space-y-6">
                        <!-- Metrics -->
                        <div class="grid grid-cols-4 gap-4">
                            <div class="bg-gray-100 p-4 rounded-xl border border-gray-200"><p class="text-xs text-gray-500 font-bold uppercase">Expected</p><p class="text-2xl font-black text-gray-800">145</p></div>
                            <div class="bg-emerald-50 p-4 rounded-xl border border-emerald-200"><p class="text-xs text-emerald-700 font-bold uppercase">On-Site</p><p class="text-2xl font-black text-emerald-600">82</p></div>
                            <div class="bg-amber-50 p-4 rounded-xl border border-amber-200"><p class="text-xs text-amber-700 font-bold uppercase">Pending</p><p class="text-2xl font-black text-amber-600">58</p></div>
                            <div class="bg-red-50 p-4 rounded-xl border border-red-200"><p class="text-xs text-red-700 font-bold uppercase">Late</p><p class="text-2xl font-black text-red-600">5</p></div>
                        </div>

                        <!-- Grid -->
                        <div class="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                            <table class="w-full text-left text-sm">
                                <thead class="bg-gray-50 border-b border-gray-200 text-xs uppercase text-gray-500 font-bold">
                                    <tr>
                                        <th class="p-4">Volunteer</th>
                                        <th class="p-4">Shift ID</th>
                                        <th class="p-4">Status</th>
                                        <th class="p-4 text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <template x-for="s in [1,2,3,4]">
                                        <tr class="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                                            <td class="p-4 font-bold text-gray-900">Marcus Chen</td>
                                            <td class="p-4 text-gray-500 font-mono text-xs">SHF-001</td>
                                            <td class="p-4"><span class="px-2.5 py-1 bg-amber-100 text-amber-800 text-[10px] font-bold rounded uppercase tracking-wide">Pending</span></td>
                                            <td class="p-4 text-right">
                                                <button @click="openSignature(1)" class="px-3 py-1.5 bg-gray-900 text-white text-xs font-bold rounded hover:bg-[#FF750F] transition">Force Check-In</button>
                                            </td>
                                        </tr>
                                    </template>
                                </tbody>
                            </table>
                        </div>

                        <!-- Signature Modal Overlay -->
                        <div x-show="signaturePadOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 backdrop-blur-sm" x-cloak>
                            <div class="bg-white p-6 rounded-2xl shadow-2xl w-full max-w-md" @click.outside="signaturePadOpen = false">
                                <h3 class="font-bold text-lg mb-2">Manual Attendance Override</h3>
                                <p class="text-xs text-gray-500 mb-4">Have the volunteer draw their signature below to verify attendance bypass.</p>
                                
                                <div class="border-2 border-dashed border-gray-300 rounded-xl bg-gray-50 mb-4 cursor-crosshair">
                                    <canvas id="sig-canvas" width="400" height="200" class="w-full h-48 rounded-xl touch-none"></canvas>
                                </div>
                                
                                <div class="flex justify-between">
                                    <button @click="clearSignature()" class="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm font-bold hover:bg-gray-200">Clear Pad</button>
                                    <div class="flex gap-2">
                                        <button @click="signaturePadOpen=false" class="px-4 py-2 text-gray-500 text-sm font-bold hover:text-gray-800">Cancel</button>
                                        <button @click="submitSignature()" class="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold shadow hover:bg-blue-700">Verify & Upload</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </template>

                <!-- ORGADMIN REPORTS -->
                <template x-if="activeView === 'reports'">
                    <div class="max-w-5xl mx-auto space-y-6">
                        <div class="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <div>
                                <h3 class="font-bold text-lg">Analytical Reports Center</h3>
                                <p class="text-xs text-gray-500">Compile and export CSV impact metrics across the entire organization.</p>
                            </div>
                            <div class="flex items-center gap-3 w-full md:w-auto">
                                <select class="bg-gray-50 border border-gray-200 text-sm rounded-lg focus:ring-purple-500 focus:border-purple-500 block w-full p-2.5 outline-none">
                                    <option>Q1 2026</option>
                                    <option>Q2 2026</option>
                                    <option>YTD 2026</option>
                                </select>
                                <button @click="apiCall('/api/coordinator/reports', 'POST', {range: 'Q1 2026'})" class="px-5 py-2.5 bg-purple-600 text-white text-sm font-bold rounded-lg shadow hover:bg-purple-700 transition whitespace-nowrap">
                                    Compile Report
                                </button>
                            </div>
                        </div>

                        <div class="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                            <table class="w-full text-left text-sm">
                                <thead class="bg-gray-50 border-b border-gray-200 text-xs uppercase text-gray-500 font-bold">
                                    <tr>
                                        <th class="p-4">Report Name</th>
                                        <th class="p-4">Generated Date</th>
                                        <th class="p-4">Total Hours Aggregated</th>
                                        <th class="p-4 text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <template x-for="r in [1,2,3]">
                                        <tr class="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                                            <td class="p-4 font-bold text-gray-900 flex items-center gap-2"><span>📄</span> Org_Impact_Export.csv</td>
                                            <td class="p-4 text-gray-500 text-xs">June 15, 2026</td>
                                            <td class="p-4 font-bold text-purple-600">3,450h</td>
                                            <td class="p-4 text-right">
                                                <button class="text-purple-600 hover:text-purple-800 font-bold text-xs uppercase tracking-wider">Download</button>
                                            </td>
                                        </tr>
                                    </template>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </template>

                <!-- SUPERADMIN COMMAND CENTER -->
                <template x-if="userRole === 'SuperAdmin' && activeView === 'dashboard'">
                    <div class="space-y-6">
                        <!-- Telemetry -->
                        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div class="bg-[#1F2937] p-6 rounded-2xl border border-gray-700 shadow-sm relative overflow-hidden">
                                <div class="absolute top-0 right-0 p-4"><div class="w-3 h-3 bg-[#10B981] rounded-full animate-pulse shadow-[0_0_10px_#10B981]"></div></div>
                                <p class="text-xs font-bold text-gray-400 mb-1 uppercase tracking-wider">API Health</p>
                                <p class="text-2xl font-black text-[#EDEDEC]">Healthy</p>
                                <p class="text-xs text-gray-500 mt-2">Latency: 42ms</p>
                            </div>
                            <div class="bg-[#1F2937] p-6 rounded-2xl border border-gray-700 shadow-sm">
                                <p class="text-xs font-bold text-gray-400 mb-1 uppercase tracking-wider">Active Tenants</p>
                                <p class="text-2xl font-black text-[#EDEDEC]">12</p>
                            </div>
                            <div class="bg-[#1F2937] p-6 rounded-2xl border border-gray-700 shadow-sm">
                                <p class="text-xs font-bold text-gray-400 mb-1 uppercase tracking-wider">Gemini Token Budget</p>
                                <div class="w-full bg-gray-800 rounded-full h-2.5 mt-3 mb-1">
                                    <div class="bg-[#10B981] h-2.5 rounded-full" style="width: 45%"></div>
                                </div>
                                <p class="text-xs text-gray-500 text-right">45% Used</p>
                            </div>
                        </div>

                        <!-- Live Terminal Feed -->
                        <div class="bg-gray-950 p-6 rounded-2xl border border-gray-800 font-mono text-xs text-[#10B981] h-64 overflow-y-auto space-y-2">
                            <p class="text-gray-500">System initialized. Listening for telemetry streams...</p>
                            <p>[INFO] Processed login for superadmin@vms.com via Sanctum.</p>
                            <p>[RAG] VolunBot query resolved. Tokens: 142. Latency: 1.2s</p>
                            <p>[DB] Tenant partition accessed: Red Cross Ethiopia (org_id: 1)</p>
                        </div>
                    </div>
                </template>

                <!-- SUPERADMIN ONBOARDING -->
                <template x-if="userRole === 'SuperAdmin' && activeView === 'onboarding'">
                    <div class="max-w-4xl mx-auto">
                        <div class="bg-[#1F2937] border border-gray-700 rounded-2xl shadow-lg overflow-hidden">
                            <div class="p-6 border-b border-gray-700">
                                <h3 class="text-lg font-bold text-white flex items-center gap-2"><span>🏢</span> Atomic Tenant Provisioning</h3>
                                <p class="text-xs text-gray-400 mt-1">Creates an isolated organization partition and provisions the initial OrgAdmin account in one transaction.</p>
                            </div>
                            
                            <div class="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                                <!-- Org Form -->
                                <div class="space-y-4">
                                    <h4 class="text-sm font-bold text-[#10B981] uppercase tracking-wider mb-4 border-b border-gray-700 pb-2">Organization Details</h4>
                                    <div><label class="block text-xs font-semibold text-gray-400 mb-1">Organization Name</label><input type="text" value="UNICEF Ethiopia" class="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:ring-1 focus:ring-[#10B981] outline-none" disabled></div>
                                    <div><label class="block text-xs font-semibold text-gray-400 mb-1">Contact Email</label><input type="text" value="unicef@et.org" class="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:ring-1 focus:ring-[#10B981] outline-none" disabled></div>
                                </div>
                                
                                <!-- Admin Form -->
                                <div class="space-y-4">
                                    <h4 class="text-sm font-bold text-purple-400 uppercase tracking-wider mb-4 border-b border-gray-700 pb-2">OrgAdmin Credentials</h4>
                                    <div><label class="block text-xs font-semibold text-gray-400 mb-1">Admin Full Name</label><input type="text" value="Liyu Kebede" class="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:ring-1 focus:ring-purple-400 outline-none" disabled></div>
                                    <div><label class="block text-xs font-semibold text-gray-400 mb-1">Admin Account Email</label><input type="text" value="liyu@unicef.org" class="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:ring-1 focus:ring-purple-400 outline-none" disabled></div>
                                </div>
                            </div>

                            <div class="p-6 bg-gray-800/50 border-t border-gray-700 flex justify-end">
                                <button @click="submitOnboard()" class="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold text-sm rounded-lg shadow-lg hover:brightness-110 active:scale-95 transition flex items-center gap-2">
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                                    Provision Tenant Workspace
                                </button>
                            </div>
                        </div>
                    </div>
                </template>

            </div>
        </main>
    </div>

    <!-- Alpine.js Logic -->
    <script>
        function vmsApp() {
            return {
                theme: 'light',
                sidebarOpen: false,
                userRole: null,
                userName: '',
                activeView: 'dashboard',
                token: localStorage.getItem('vms_auth_token') || null,
                isLoading: false,

                // Data states
                volunteerProfile: { total_hours: 0, impact_score: 0, skills: [] },
                events: [],
                schedule: [],
                chatMessages: [],
                chatInput: '',
                isTyping: false,
                applications: [],
                selectedApp: null,
                radarChart: null,
                shifts: [],
                signaturePadOpen: false,
                activeShiftAssignId: null,

                init() {
                    this.$watch('activeView', () => this.sidebarOpen = false);
                    if (this.token) {
                        this.userRole = localStorage.getItem('vms_user_role');
                        this.userName = localStorage.getItem('vms_user_name');
                        this.setTheme();
                        this.loadDashboardData();
                    }
                },

                setTheme() {
                    this.theme = (this.userRole === 'SuperAdmin') ? 'dark' : 'light';
                },

                getViewTitle() {
                    const titles = {
                        'dashboard': 'Overview Dashboard',
                        'events': 'Discover Opportunities',
                        'schedule': 'My Active Schedule',
                        'chat': 'VolunBot AI Assistant',
                        'screening': 'Guardian Queue Applicant Screening',
                        'attendance': 'VolunTrack Live Attendance',
                        'reports': 'Executive Analytics & Reports',
                        'onboarding': 'Tenant Organization Provisioning'
                    };
                    return titles[this.activeView] || 'Dashboard';
                },

                // Core API Fetcher
                async apiCall(endpoint, method = 'GET', body = null) {
                    this.isLoading = true;
                    try {
                        const options = {
                            method,
                            headers: {
                                'Content-Type': 'application/json',
                                'Accept': 'application/json',
                                'Authorization': `Bearer ${this.token}`
                            }
                        };
                        if (body) options.body = JSON.stringify(body);
                        let res = await fetch(endpoint, options);
                        let data = await res.json();
                        this.isLoading = false;
                        return data;
                    } catch (err) {
                        this.isLoading = false;
                        console.error(err);
                        return { status: 'error', message: err.message };
                    }
                },

                // Auth
                async login(roleKey) {
                    const creds = {
                        'superadmin': { email: 'superadmin@vms.com', password: 'password' },
                        'orgadmin': { email: 'redcross.admin@vms.com', password: 'password' },
                        'coordinator': { email: 'redcross.coord@vms.com', password: 'password' },
                        'volunteer': { email: 'redcross.vol@vms.com', password: 'password' },
                    }[roleKey];
                    
                    this.isLoading = true;
                    let data = await fetch('/api/login', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(creds)
                    }).then(r => r.json());
                    
                    this.isLoading = false;
                    
                    if(data.access_token) {
                        this.token = data.access_token;
                        this.userRole = data.role;
                        this.userName = data.user.full_name;
                        localStorage.setItem('vms_auth_token', this.token);
                        localStorage.setItem('vms_user_role', this.userRole);
                        localStorage.setItem('vms_user_name', this.userName);
                        this.setTheme();
                        this.activeView = 'dashboard';
                        this.loadDashboardData();
                    } else {
                        alert("Login failed: " + (data.message || "Unknown error"));
                    }
                },

                logout() {
                    this.token = null;
                    this.userRole = null;
                    this.userName = '';
                    localStorage.removeItem('vms_auth_token');
                    localStorage.removeItem('vms_user_role');
                    localStorage.removeItem('vms_user_name');
                    this.setTheme();
                },

                // Helpers
                formatDate(dateStr) {
                    return new Date(dateStr).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
                },
                formatTime(dateStr) {
                    return new Date(dateStr).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
                },

                async loadDashboardData() {
                    if (this.userRole === 'Volunteer') {
                        let res = await this.apiCall('/api/user');
                        if(res.volunteer) {
                            this.volunteerProfile = res.volunteer;
                        }
                    }
                },

                // Volunteer Actions
                async loadEvents() {
                    this.activeView = 'events';
                    let res = await this.apiCall('/api/volunteer/events');
                    if(res.status === 'success') this.events = res.data;
                },
                async applyForShift(shiftId) {
                    let res = await this.apiCall('/api/volunteer/apply/'+shiftId, 'POST');
                    if(res.status==='error' && res.message.includes('Conflict')) {
                        alert('⚠️ ' + res.message); // Overlap conflict visual representation
                    } else {
                        alert(res.message);
                    }
                },
                async loadSchedule() {
                    this.activeView = 'schedule';
                    let res = await this.apiCall('/api/volunteer/schedule');
                    if(res.status === 'success') this.schedule = res.data;
                },
                async simulateCheckin(shiftId) {
                    // Simulating geofence payload
                    let data = {
                        shift_id: shiftId,
                        qr_code_signature: 'mock_signature',
                        latitude: 9.005401, // Simulate Addis Ababa coords
                        longitude: 38.763611
                    };
                    let res = await this.apiCall('/api/volunteer/check-in', 'POST', data);
                    alert(res.message);
                },

                // Chatbot Actions
                async loadChat() {
                    this.activeView = 'chat';
                    if(this.chatMessages.length === 0) {
                        this.chatMessages.push({ role: 'bot', text: 'Hello! I am VolunBot. I have loaded your schedule and skills context into my memory. How can I assist you today?' });
                    }
                    setTimeout(() => {
                        let box = document.getElementById('chat-box');
                        if(box) box.scrollTop = box.scrollHeight;
                    }, 100);
                },
                async sendChat() {
                    if(!this.chatInput) return;
                    let query = this.chatInput;
                    this.chatMessages.push({ role: 'user', text: query });
                    this.chatInput = '';
                    this.isTyping = true;
                    
                    setTimeout(() => { document.getElementById('chat-box').scrollTop = document.getElementById('chat-box').scrollHeight; }, 50);

                    let res = await this.apiCall('/api/volunteer/chat', 'POST', { message: query });
                    this.isTyping = false;
                    
                    if(res.status === 'success') {
                        this.chatMessages.push({ role: 'bot', text: res.response });
                    } else {
                        this.chatMessages.push({ role: 'bot', text: 'Sorry, I encountered an error connecting to the AI core.' });
                    }
                    setTimeout(() => { document.getElementById('chat-box').scrollTop = document.getElementById('chat-box').scrollHeight; }, 50);
                },

                // Coordinator Screening
                async loadScreening() {
                    this.activeView = 'screening';
                    this.selectedApp = null;
                    let eventsRes = await this.apiCall('/api/coordinator/events');
                    if(eventsRes.status === 'success' && eventsRes.data.length > 0) {
                        let eventId = eventsRes.data[0].id;
                        let appRes = await this.apiCall(`/api/coordinator/events/${eventId}/applications`);
                        if(appRes.status === 'success') {
                            // Map mock match scores for visual UI
                            this.applications = appRes.data.map(app => {
                                app.match_score = Math.floor(Math.random() * 40) + 60; // Mock 60-100%
                                return app;
                            });
                        }
                    }
                },
                async selectApp(app) {
                    this.selectedApp = app;
                    this.selectedApp.feedback = "Loading AI Analysis...";
                    
                    let fbRes = await this.apiCall(`/api/coordinator/applications/${app.id}/ai-feedback`);
                    if(fbRes.status === 'success') {
                        this.selectedApp.feedback = fbRes.ai_drafted_feedback;
                    }

                    // Render Radar
                    setTimeout(() => {
                        if(this.radarChart) this.radarChart.destroy();
                        let ctx = document.getElementById('radarChart');
                        if(ctx) {
                            this.radarChart = new Chart(ctx, {
                                type: 'radar',
                                data: {
                                    labels: ['Medical', 'Logistics', 'Leadership', 'Heavy Lifting', 'Crisis'],
                                    datasets: [{
                                        label: 'Profile Alignment',
                                        data: [95, 80, 60, 40, 85], // Mock visual data
                                        backgroundColor: 'rgba(72, 187, 120, 0.2)',
                                        borderColor: '#48BB78',
                                        pointBackgroundColor: '#48BB78',
                                        borderWidth: 2
                                    }]
                                },
                                options: { scales: { r: { min: 0, max: 100, ticks: { display: false } } }, plugins: { legend: { display: false } } }
                            });
                        }
                    }, 100);
                },

                // Slider hook from external component
                async triggerApproveCallback(appId) {
                    let res = await this.apiCall(`/api/coordinator/applications/${appId}/approve`, 'POST', { status: 'confirmed' });
                    setTimeout(() => {
                        this.selectedApp = null;
                        this.loadScreening();
                    }, 1000);
                },

                // Coordinator Attendance & Canvas
                async loadAttendance() {
                    this.activeView = 'attendance';
                },
                openSignature(shiftId) {
                    this.activeShiftAssignId = shiftId; // using mock id 1 from html for demo
                    this.signaturePadOpen = true;
                    setTimeout(() => this.initCanvas(), 100);
                },
                initCanvas() {
                    let canvas = document.getElementById('sig-canvas');
                    let ctx = canvas.getContext('2d');
                    ctx.lineWidth = 3;
                    ctx.lineCap = 'round';
                    ctx.strokeStyle = '#1b1b18';
                    let drawing = false;
                    
                    const getPos = (e) => {
                        let rect = canvas.getBoundingClientRect();
                        let clientX = e.clientX || (e.touches && e.touches[0].clientX);
                        let clientY = e.clientY || (e.touches && e.touches[0].clientY);
                        return { x: clientX - rect.left, y: clientY - rect.top };
                    };

                    const start = (e) => { e.preventDefault(); drawing = true; let pos=getPos(e); ctx.beginPath(); ctx.moveTo(pos.x, pos.y); };
                    const draw = (e) => { e.preventDefault(); if(!drawing) return; let pos=getPos(e); ctx.lineTo(pos.x, pos.y); ctx.stroke(); };
                    const end = (e) => { e.preventDefault(); drawing = false; };

                    canvas.onmousedown = start; canvas.ontouchstart = start;
                    canvas.onmousemove = draw; canvas.ontouchmove = draw;
                    canvas.onmouseup = end; canvas.onmouseleave = end; canvas.ontouchend = end;
                },
                clearSignature() {
                    let canvas = document.getElementById('sig-canvas');
                    let ctx = canvas.getContext('2d');
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                },
                async submitSignature() {
                    let canvas = document.getElementById('sig-canvas');
                    let data = canvas.toDataURL('image/png');
                    // using mock assignment ID 1 for visual demo override
                    let res = await this.apiCall(`/api/coordinator/applications/1/force-checkin`, 'POST', { signature_data: data });
                    if(res.status==='success') {
                        alert(res.message);
                        this.signaturePadOpen = false;
                    } else {
                        alert("Error: " + res.message);
                    }
                },

                // OrgAdmin Reports
                async loadReports() {
                    this.activeView = 'reports';
                    // Expected to load previous CSV compilations from backend
                    let res = await this.apiCall('/api/coordinator/reports');
                    // Render handled by Alpine template mockup for visual completion
                },

                // Super Admin Onboarding
                async submitOnboard() {
                    let data = {
                        org_name: 'UNICEF Ethiopia',
                        org_email: 'unicef@et.org',
                        org_address: 'Bole, Addis Ababa',
                        admin_full_name: 'Liyu Kebede',
                        admin_email: 'liyu@unicef.org',
                        admin_password: 'securepassword123'
                    };
                    let res = await this.apiCall('/api/superadmin/onboard-tenant', 'POST', data);
                    alert(res.status === 'success' ? 'Tenant Successfully Onboarded & Isolated!' : res.message);
                }
            }
        }

        // Custom Alpine Component for the Slide-To-Approve slider
        document.addEventListener('alpine:init', () => {
            Alpine.data('sliderComponent', (appId) => ({
                appId: appId,
                thumbX: 0,
                progress: 0,
                approved: false,
                isDragging: false,
                startX: 0,
                maxTrack: 0,

                startDrag(e) {
                    if (this.approved) return;
                    this.isDragging = true;
                    this.startX = e.clientX || (e.touches && e.touches[0].clientX);
                    this.maxTrack = this.$refs.track.offsetWidth - 48; // 48 is thumb width + padding
                    
                    const moveHandler = (e) => this.onDrag(e);
                    const stopHandler = () => {
                        this.stopDrag();
                        document.removeEventListener('mousemove', moveHandler);
                        document.removeEventListener('mouseup', stopHandler);
                        document.removeEventListener('touchmove', moveHandler);
                        document.removeEventListener('touchend', stopHandler);
                    };

                    document.addEventListener('mousemove', moveHandler);
                    document.addEventListener('mouseup', stopHandler);
                    document.addEventListener('touchmove', moveHandler, {passive:false});
                    document.addEventListener('touchend', stopHandler);
                },
                onDrag(e) {
                    if (!this.isDragging) return;
                    if (e.cancelable) e.preventDefault();
                    let currentX = e.clientX || (e.touches && e.touches[0].clientX);
                    let diff = currentX - this.startX;
                    
                    if (diff < 0) diff = 0;
                    if (diff > this.maxTrack) diff = this.maxTrack;
                    
                    this.thumbX = diff;
                    this.progress = (diff / this.maxTrack) * 100;
                },
                stopDrag() {
                    if (!this.isDragging) return;
                    this.isDragging = false;
                    if (this.progress > 85) {
                        // Success!
                        this.thumbX = this.maxTrack;
                        this.progress = 100;
                        this.approved = true;
                        // Call parent method
                        this.$dispatch('trigger-approve', this.appId);
                        // Access parent scope via x-data context mapping or raw dispatch
                        let appData = Alpine.$data(document.querySelector('[x-data="vmsApp()"]'));
                        if(appData) appData.triggerApproveCallback(this.appId);
                    } else {
                        // Snap back
                        this.thumbX = 0;
                        this.progress = 0;
                    }
                }
            }));
        });
    </script>
</body>
</html>