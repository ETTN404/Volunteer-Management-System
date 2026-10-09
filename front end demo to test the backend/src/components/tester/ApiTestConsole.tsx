import React, { useState } from 'react';
import {
  X,
  Play,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Send,
  Database,
  Server,
  Layers,
  Code,
  Copy,
  Check,
  ChevronDown,
  ChevronRight,
  Sparkles,
  Zap,
} from 'lucide-react';
import { TestCase, ApiEndpointDef } from '../../types/vms';
import { TestSuiteRunner } from '../../services/testSuiteRunner';
import { ApiClient, ApiConfig } from '../../services/apiClient';
import { VmsStore } from '../../services/vmsStore';

interface ApiTestConsoleProps {
  isOpen: boolean;
  onClose: () => void;
  onStateModified?: () => void;
  onDataChanged?: () => void;
}

export const ApiTestConsole: React.FC<ApiTestConsoleProps> = ({
  isOpen,
  onClose,
  onStateModified,
  onDataChanged,
}) => {
  const notifyChange = () => {
    if (onStateModified) onStateModified();
    if (onDataChanged) onDataChanged();
  };
  const [activeTab, setActiveTab] = useState<'matrix' | 'runner' | 'config' | 'database'>('matrix');
  const [selectedPhaseFilter, setSelectedPhaseFilter] = useState<number | 'all'>('all');
  const [testCases, setTestCases] = useState<TestCase[]>(TestSuiteRunner.getInitialTestCases());
  const [isRunningAll, setIsRunningAll] = useState(false);
  const [expandedTestId, setExpandedTestId] = useState<string | null>('P1-01');

  // REST Runner State
  const endpoints = TestSuiteRunner.getEndpointsList();
  const [selectedEndpoint, setSelectedEndpoint] = useState<ApiEndpointDef>(endpoints[2]);
  const [customMethod, setCustomMethod] = useState<'GET' | 'POST' | 'PATCH' | 'DELETE'>('GET');
  const [customPath, setCustomPath] = useState(endpoints[2].path);
  const [requestBodyText, setRequestBodyText] = useState(
    JSON.stringify(endpoints[2].sampleBody || {}, null, 2)
  );
  const [isSendingRequest, setIsSendingRequest] = useState(false);
  const [lastResponse, setLastResponse] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  // Config State
  const [apiConfig, setApiConfigState] = useState<ApiConfig>(ApiClient.getConfig());
  const [healthStatus, setHealthStatus] = useState<string | null>(null);

  if (!isOpen) return null;

  // Run single test
  const handleRunSingleTest = async (testId: string) => {
    const updated = await TestSuiteRunner.runTest(testId);
    setTestCases((prev) => prev.map((t) => (t.id === testId ? updated : t)));
    notifyChange();
  };

  // Run all tests
  const handleRunAllTests = async () => {
    setIsRunningAll(true);
    const initial = TestSuiteRunner.getInitialTestCases();
    setTestCases(initial);

    for (const test of initial) {
      if (selectedPhaseFilter === 'all' || test.phase === selectedPhaseFilter) {
        const updated = await TestSuiteRunner.runTest(test.id);
        setTestCases((prev) => prev.map((t) => (t.id === test.id ? updated : t)));
      }
    }
    setIsRunningAll(false);
    notifyChange();
  };

  // Select endpoint in REST runner
  const handleSelectEndpoint = (ep: ApiEndpointDef) => {
    setSelectedEndpoint(ep);
    setCustomMethod(ep.method);
    setCustomPath(ep.path);
    setRequestBodyText(JSON.stringify(ep.sampleBody || {}, null, 2));
    setLastResponse(null);
  };

  // Send custom REST request
  const handleSendRestRequest = async () => {
    setIsSendingRequest(true);
    let parsedBody = undefined;
    if (customMethod !== 'GET' && requestBodyText.trim()) {
      try {
        parsedBody = JSON.parse(requestBodyText);
      } catch (e: any) {
        setLastResponse({ status: 400, error: `Invalid JSON body: ${e.message}` });
        setIsSendingRequest(false);
        return;
      }
    }

    const currentUser = VmsStore.get().users[0];
    const res = await ApiClient.request(customMethod, customPath, parsedBody, currentUser);
    setLastResponse(res);
    setIsSendingRequest(false);
    notifyChange();
  };

  // Copy response
  const handleCopyResponse = () => {
    if (lastResponse) {
      navigator.clipboard.writeText(JSON.stringify(lastResponse, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Save config
  const handleSaveConfig = (newConfig: Partial<ApiConfig>) => {
    ApiClient.setConfig(newConfig);
    setApiConfigState(ApiClient.getConfig());
    notifyChange();
  };

  // Ping health
  const handlePingHealth = async () => {
    setHealthStatus('Pinging...');
    try {
      const res = await fetch('/api/health');
      const json = await res.json();
      setHealthStatus(`✅ ${json.service} (Gemini: ${json.geminiConfigured ? 'Ready' : 'Mock Fallback'})`);
    } catch (e: any) {
      setHealthStatus(`❌ Server unreachable: ${e.message}`);
    }
  };

  // Reset DB
  const handleResetDb = () => {
    if (confirm('Reset entire VMS database to initial seed data? All mock shifts and test records will be restored.')) {
      VmsStore.resetToSeedData();
      setTestCases(TestSuiteRunner.getInitialTestCases());
      notifyChange();
    }
  };

  const filteredTests = testCases.filter(
    (t) => selectedPhaseFilter === 'all' || t.phase === selectedPhaseFilter
  );

  const passedCount = testCases.filter((t) => t.status === 'passed').length;
  const failedCount = testCases.filter((t) => t.status === 'failed').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md font-mono">
      <div className="bg-[#1e293b] border border-slate-700 rounded-lg w-full max-w-6xl h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in duration-200">
        {/* Header */}
        <div className="bg-slate-900 px-4 py-2.5 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
              <Code className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xs font-bold text-white uppercase tracking-wider">
                  VMS API & PHASE TEST WORKBENCH
                </h2>
                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  PHASES 1-9 MATRIX
                </span>
              </div>
              <p className="text-[10px] text-slate-400">
                Interactive verification suite for all 39 Laravel + MySQL + Redis backend specifications
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="hidden sm:flex items-center gap-2 text-[10px] bg-slate-950 px-2.5 py-1 rounded border border-slate-800">
              <span className="text-slate-400">TESTS:</span>
              <span className="text-emerald-400 font-bold">{passedCount} PASSED</span>
              <span className="text-slate-600">|</span>
              <span className="text-rose-400 font-bold">{failedCount} FAILED</span>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab Navigation (High Density) */}
        <div className="bg-slate-900 border-b border-slate-700 px-4 flex items-center gap-1.5 overflow-x-auto">
          {[
            { id: 'matrix', label: 'PHASE TEST MATRIX (1-9)', icon: Layers, count: testCases.length },
            { id: 'runner', label: 'REST ENDPOINT RUNNER', icon: Send },
            { id: 'config', label: 'CONNECTION CONFIG', icon: Server },
            { id: 'database', label: 'DATABASE & SEED DATA', icon: Database },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
                  isActive
                    ? 'border-indigo-500 text-indigo-300 bg-indigo-500/10'
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span className="px-1.5 py-0.2 rounded text-[9px] bg-slate-800 text-slate-300">
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 bg-slate-950/80">
          {/* TAB 1: PHASE TEST MATRIX */}
          {activeTab === 'matrix' && (
            <div className="space-y-3">
              {/* Controls Bar */}
              <div className="flex flex-wrap items-center justify-between gap-2.5 bg-[#1e293b] p-2.5 rounded-lg border border-slate-700">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">FILTER:</span>
                  {[
                    { val: 'all', label: 'ALL' },
                    { val: 1, label: 'P1 FOUNDATION' },
                    { val: 2, label: 'P2 SERVICES' },
                    { val: 4, label: 'P4 ENDPOINTS' },
                    { val: 5, label: 'P5 ASYNC JOBS' },
                    { val: 8, label: 'P8 SECURITY' },
                    { val: 9, label: 'P9 AUDIT' },
                  ].map((p) => (
                    <button
                      key={p.val}
                      onClick={() => setSelectedPhaseFilter(p.val as any)}
                      className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase transition-all border ${
                        selectedPhaseFilter === p.val
                          ? 'bg-indigo-600 text-white border-indigo-400/50'
                          : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-slate-200'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleRunAllTests}
                    disabled={isRunningAll}
                    className="flex items-center gap-1.5 px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs border border-emerald-400/40 shadow-sm disabled:opacity-50 transition-all"
                  >
                    <Play className="w-3 h-3 fill-current" />
                    <span>{isRunningAll ? 'RUNNING MATRIX...' : 'RUN ALL PHASE CHECKS'}</span>
                  </button>
                </div>
              </div>

              {/* Test Cases List (High Density) */}
              <div className="space-y-1.5">
                {filteredTests.map((test) => {
                  const isExpanded = expandedTestId === test.id;
                  const isPassed = test.status === 'passed';
                  const isFailed = test.status === 'failed';
                  const isRunning = test.status === 'running';

                  return (
                    <div
                      key={test.id}
                      className={`border rounded-lg transition-all overflow-hidden ${
                        isPassed
                          ? 'bg-emerald-950/20 border-emerald-800/40'
                          : isFailed
                          ? 'bg-rose-950/20 border-rose-800/40'
                          : 'bg-[#1e293b] border-slate-700'
                      }`}
                    >
                      {/* Row Header */}
                      <div className="p-2.5 flex items-center justify-between gap-3">
                        <div
                          className="flex items-center gap-2.5 flex-1 cursor-pointer select-none"
                          onClick={() => setExpandedTestId(isExpanded ? null : test.id)}
                        >
                          <div className="text-slate-400">
                            {isExpanded ? (
                              <ChevronDown className="w-3.5 h-3.5" />
                            ) : (
                              <ChevronRight className="w-3.5 h-3.5" />
                            )}
                          </div>

                          {/* Status Icon */}
                          <div>
                            {isPassed && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                            {isFailed && <AlertTriangle className="w-4 h-4 text-rose-400" />}
                            {isRunning && (
                              <div className="w-4 h-4 rounded-full border-2 border-indigo-400 border-t-transparent animate-spin" />
                            )}
                            {test.status === 'idle' && (
                              <div className="w-4 h-4 rounded-full border border-slate-600" />
                            )}
                          </div>

                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[11px] font-bold text-indigo-400">
                                [{test.id}]
                              </span>
                              <h4 className="text-xs font-bold text-slate-200">{test.title}</h4>
                              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-slate-900 text-slate-400 border border-slate-700">
                                {test.category}
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-400 mt-0.5">{test.description}</p>
                          </div>
                        </div>

                        {/* Action and Timing */}
                        <div className="flex items-center gap-2">
                          {test.durationMs !== undefined && (
                            <span className="text-[10px] text-slate-500">
                              {test.durationMs}ms
                            </span>
                          )}
                          <button
                            onClick={() => handleRunSingleTest(test.id)}
                            disabled={isRunning}
                            className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-bold border border-slate-600 transition-colors"
                          >
                            RUN
                          </button>
                        </div>
                      </div>

                      {/* Expanded Inspector Panel */}
                      {isExpanded && (
                        <div className="border-t border-slate-700 bg-slate-900 p-2.5 space-y-2 text-xs">
                          {/* Assertions */}
                          <div>
                            <span className="font-bold text-slate-400 uppercase tracking-wider text-[9px] block mb-1">
                              TEST ASSERTIONS:
                            </span>
                            <div className="space-y-1">
                              {test.assertions.map((a, i) => (
                                <div
                                  key={i}
                                  className={`p-1.5 rounded flex items-center justify-between text-[11px] ${
                                    a.passed ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-800/30' : 'bg-slate-950 text-slate-400'
                                  }`}
                                >
                                  <div className="flex items-center gap-1.5">
                                    <span>{a.passed ? '✓' : '○'}</span>
                                    <span>{a.rule}</span>
                                  </div>
                                  {a.actual !== undefined && (
                                    <span className="text-slate-400 text-[10px]">
                                      [ACTUAL: {String(a.actual)}]
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Payload previews */}
                          {test.responsePayload && (
                            <div>
                              <span className="font-bold text-slate-400 uppercase tracking-wider text-[9px] block mb-0.5">
                                EXECUTION RESPONSE PAYLOAD:
                              </span>
                              <pre className="bg-slate-950 p-2 rounded overflow-x-auto text-[10px] text-emerald-300 max-h-40 border border-slate-800">
                                {JSON.stringify(test.responsePayload, null, 2)}
                              </pre>
                            </div>
                          )}

                          {/* Logs */}
                          {test.logs.length > 0 && (
                            <div>
                              <span className="font-bold text-slate-400 uppercase tracking-wider text-[9px] block mb-0.5">
                                EXECUTION LOG:
                              </span>
                              <div className="bg-slate-950 p-2 rounded text-slate-400 text-[10px] space-y-0.5 border border-slate-800">
                                {test.logs.map((log, li) => (
                                  <div key={li}>{log}</div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: REST ENDPOINT RUNNER */}
          {activeTab === 'runner' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
              {/* Left Column: Endpoints Catalog */}
              <div className="bg-[#1e293b] p-3 rounded-lg border border-slate-700 space-y-2">
                <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider block">
                  VMS API ENDPOINTS CATALOG
                </span>
                <div className="space-y-1 max-h-[58vh] overflow-y-auto pr-1">
                  {endpoints.map((ep, i) => {
                    const isSelected = selectedEndpoint.path === ep.path && selectedEndpoint.method === ep.method;
                    return (
                      <button
                        key={i}
                        onClick={() => handleSelectEndpoint(ep)}
                        className={`w-full text-left p-2 rounded text-xs transition-all flex items-start gap-1.5 border ${
                          isSelected
                            ? 'bg-indigo-600 text-white border-indigo-400/50 shadow-sm'
                            : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-800'
                        }`}
                      >
                        <span
                          className={`font-bold text-[9px] px-1 py-0.2 rounded ${
                            ep.method === 'GET'
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : ep.method === 'POST'
                              ? 'bg-indigo-500/20 text-indigo-300'
                              : ep.method === 'PATCH'
                              ? 'bg-amber-500/20 text-amber-300'
                              : 'bg-rose-500/20 text-rose-300'
                          }`}
                        >
                          {ep.method}
                        </span>
                        <div className="flex-1 truncate">
                          <div className="font-semibold truncate text-[11px]">{ep.path}</div>
                          <div className="text-[9px] text-slate-400 truncate">{ep.description}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Right Column: Request Builder & Response Inspector */}
              <div className="lg:col-span-2 space-y-2.5">
                {/* Request Bar */}
                <div className="bg-[#1e293b] p-3 rounded-lg border border-slate-700 space-y-2">
                  <div className="flex items-center gap-1.5">
                    <select
                      value={customMethod}
                      onChange={(e) => setCustomMethod(e.target.value as any)}
                      className="bg-slate-900 text-emerald-400 font-bold px-2 py-1 rounded border border-slate-700 text-xs focus:outline-none"
                    >
                      <option value="GET">GET</option>
                      <option value="POST">POST</option>
                      <option value="PATCH">PATCH</option>
                      <option value="DELETE">DELETE</option>
                    </select>
                    <input
                      type="text"
                      value={customPath}
                      onChange={(e) => setCustomPath(e.target.value)}
                      className="flex-1 bg-slate-900 text-slate-200 text-xs px-2.5 py-1 rounded border border-slate-700 focus:outline-none focus:border-indigo-500"
                      placeholder="/api/volunteer/events"
                    />
                    <button
                      onClick={handleSendRestRequest}
                      disabled={isSendingRequest}
                      className="flex items-center gap-1 px-3 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs border border-indigo-400/40 shadow-sm transition-all"
                    >
                      <Send className="w-3 h-3" />
                      <span>{isSendingRequest ? 'SENDING...' : 'SEND'}</span>
                    </button>
                  </div>

                  {/* Body Editor if POST/PATCH */}
                  {customMethod !== 'GET' && (
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                        JSON REQUEST BODY:
                      </span>
                      <textarea
                        rows={4}
                        value={requestBodyText}
                        onChange={(e) => setRequestBodyText(e.target.value)}
                        className="w-full bg-slate-900 text-slate-300 text-xs p-2 rounded border border-slate-700 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  )}
                </div>

                {/* Response Viewer */}
                <div className="bg-[#1e293b] p-3 rounded-lg border border-slate-700 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white uppercase tracking-wider">
                        RESPONSE PAYLOAD
                      </span>
                      {lastResponse && (
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                            lastResponse.status < 300
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                              : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                          }`}
                        >
                          STATUS: {lastResponse.status} ({lastResponse.durationMs}ms)
                        </span>
                      )}
                    </div>
                    {lastResponse && (
                      <button
                        onClick={handleCopyResponse}
                        className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-white px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 transition-colors border border-slate-700"
                      >
                        {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        <span>{copied ? 'COPIED' : 'COPY JSON'}</span>
                      </button>
                    )}
                  </div>

                  <div className="bg-slate-950 p-2.5 rounded border border-slate-800 min-h-[220px] max-h-[300px] overflow-y-auto">
                    {lastResponse ? (
                      <pre className="text-xs text-emerald-400 whitespace-pre-wrap">
                        {JSON.stringify(lastResponse, null, 2)}
                      </pre>
                    ) : (
                      <div className="text-slate-500 text-xs text-center py-10">
                        Select an endpoint and click "Send" to inspect HTTP response payload and latency.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: LIVE / MOCK CONNECTION CONFIG */}
          {activeTab === 'config' && (
            <div className="max-w-2xl mx-auto space-y-3.5 bg-[#1e293b] p-4 rounded-lg border border-slate-700">
              <div>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">BACKEND CONNECTION & PROXY SETTINGS</h3>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Connect to your running Laravel backend (e.g. `php artisan serve` on port 8000) or test using the in-memory mock engine.
                </p>
              </div>

              {/* Mode Indicator */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-300">API EXECUTION MODE:</label>
                <div className="p-2.5 rounded border text-left bg-emerald-500/10 border-emerald-500 text-emerald-300">
                  <div className="font-bold text-xs">🟢 100% LIVE LARAVEL BACKEND</div>
                  <div className="text-[10px] opacity-80 mt-0.5">
                    Sends direct REST HTTP requests with Sanctum Bearer tokens to your running Laravel server and MySQL database.
                  </div>
                </div>
              </div>

              {/* Live Base URL */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-300">LARAVEL API BASE URL:</label>
                <input
                  type="text"
                  value={apiConfig.liveBaseUrl}
                  onChange={(e) => handleSaveConfig({ liveBaseUrl: e.target.value })}
                  placeholder="http://localhost:8000/api"
                  className="w-full bg-slate-900 text-slate-200 text-xs px-2.5 py-1.5 rounded border border-slate-700 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Bearer Token */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-300">SANCTUM BEARER TOKEN:</label>
                <input
                  type="text"
                  value={apiConfig.authToken}
                  onChange={(e) => handleSaveConfig({ authToken: e.target.value })}
                  placeholder="1|laravel_sanctum_token_..."
                  className="w-full bg-slate-900 text-slate-200 text-xs px-2.5 py-1.5 rounded border border-slate-700 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Health check */}
              <div className="pt-2 border-t border-slate-700 flex items-center justify-between">
                <button
                  onClick={handlePingHealth}
                  className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-600 transition-colors"
                >
                  PING SERVER HEALTH (/api/health)
                </button>
                {healthStatus && <span className="text-xs text-slate-300">{healthStatus}</span>}
              </div>
            </div>
          )}

          {/* TAB 4: DATABASE & SEED STATE */}
          {activeTab === 'database' && (
            <div className="space-y-3 max-w-3xl mx-auto">
              <div className="bg-[#1e293b] p-4 rounded-lg border border-slate-700 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider">DATABASE SNAPSHOT & SEEDER CONTROL</h3>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Current reactive store records in localStorage.
                    </p>
                  </div>
                  <button
                    onClick={handleResetDb}
                    className="flex items-center gap-1.5 px-3 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs border border-rose-400/40 shadow-sm transition-all"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>RESET DATABASE</span>
                  </button>
                </div>

                {/* Counts Grid */}
                {(() => {
                  const db = VmsStore.get();
                  return (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                      <div className="bg-slate-900 p-2.5 rounded border border-slate-700 text-center">
                        <div className="text-lg font-bold text-indigo-400">{db.organizations.length}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">ORGANIZATIONS</div>
                      </div>
                      <div className="bg-slate-900 p-2.5 rounded border border-slate-700 text-center">
                        <div className="text-lg font-bold text-emerald-400">{db.users.length}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">USERS & STAFF</div>
                      </div>
                      <div className="bg-slate-900 p-2.5 rounded border border-slate-700 text-center">
                        <div className="text-lg font-bold text-cyan-400">{db.events.length}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">EVENTS & SHIFTS</div>
                      </div>
                      <div className="bg-slate-900 p-2.5 rounded border border-slate-700 text-center">
                        <div className="text-lg font-bold text-amber-400">{db.auditLogs.length}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">AUDIT LOGS</div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
