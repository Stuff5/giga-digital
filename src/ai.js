// GameVault AI Merchant Assistant Module
// Multi-provider intelligent co-pilot for digital game key merchants

let aiChatHistory = [];
let isAIGenerating = false;

// Safe HTML escaping helper
function escapeHtml(str) {
  if (typeof escapeHTML === "function") return escapeHTML(str);
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Sanitize user-provided API key (remove accidental quotes, var assignments, Bearer prefixes, whitespace)
function sanitizeApiKey(raw) {
  if (!raw || typeof raw !== "string") return "";
  let key = raw.trim();
  // Strip surrounding single or double quotes
  key = key.replace(/^["']+|["']+$/g, "");
  // Strip common prefix formats like API_KEY=, GEMINI_API_KEY=, OPENAI_API_KEY=
  key = key.replace(/^[A-Z0-9_]*API[A-Z0-9_]*\s*=\s*/i, "");
  // Strip Bearer prefix
  key = key.replace(/^Bearer\s+/i, "");
  return key.trim();
}

// Detect provider from API key prefix/signature
function detectProviderFromKey(key) {
  if (!key) return null;
  const clean = sanitizeApiKey(key);
  if (clean.startsWith("AIzaSy")) return "gemini";
  if (clean.startsWith("sk-")) return "openai";
  return null;
}

// Normalize Gemini model names (auto-migrating legacy or invalid variants like gemini-2.5-flash-lite / gemini-1.5-flash)
function normalizeGeminiModel(model) {
  if (!model || typeof model !== "string") return "gemini-2.5-flash";
  const m = model.trim();
  if (
    m === "gemini-1.5-flash" ||
    m === "gemini-1.5-pro" ||
    m === "gemini-2.5-flash-lite" ||
    m.includes("flash-lite") ||
    m === "gemini-1.5-flash-latest"
  ) {
    return "gemini-2.5-flash";
  }
  return m;
}

// Extract answer text from Gemini generateContent response, safely filtering out reasoning/thinking tokens
function extractGeminiCandidateText(data) {
  if (!data || !data.candidates || !data.candidates[0] || !data.candidates[0].content || !data.candidates[0].content.parts) {
    return "";
  }
  const parts = data.candidates[0].content.parts;
  // Gemini 2.5 thinking models output thought parts: { text: "...", thought: true }
  const answerParts = parts.filter(p => !p.thought && typeof p.text === "string");
  if (answerParts.length > 0) {
    return answerParts.map(p => p.text).join("");
  }
  return parts.map(p => p.text || "").join("");
}

// Resilient Gemini generateContent caller that handles parameter sensitivity (e.g. 400 on temperature for thinking models)
async function sendGeminiGenerateContent(endpoint, contents, cfg, apiKey) {
  const payloads = [
    // 1. GenerationConfig with maxOutputTokens (cleanest for Gemini 2.5 thinking models)
    {
      contents: contents,
      generationConfig: {
        maxOutputTokens: 8192
      }
    },
    // 2. GenerationConfig with temperature (standard config)
    {
      contents: contents,
      generationConfig: {
        temperature: cfg && cfg.temperature ? cfg.temperature : 0.7,
        maxOutputTokens: 8192
      }
    },
    // 3. Minimal payload without generationConfig (failsafe fallback)
    {
      contents: contents
    }
  ];

  let lastErr = null;
  let lastStatus = 0;
  const authKey = apiKey || (cfg && cfg.apiKey) || "";

  for (let i = 0; i < payloads.length; i++) {
    const payload = payloads[i];
    let res;
    try {
      const headers = { "Content-Type": "application/json" };
      if (authKey) {
        headers["x-goog-api-key"] = authKey;
      }
      res = await fetch(endpoint, {
        method: "POST",
        headers: headers,
        body: JSON.stringify(payload)
      });
    } catch (netErr) {
      throw netErr;
    }

    if (res.ok) {
      const data = await res.json();
      const text = extractGeminiCandidateText(data);
      return { ok: true, text: text || "OK", data };
    }

    lastStatus = res.status;
    let errData = {};
    try { errData = await res.json(); } catch(e) {}
    lastErr = errData;

    // If 404, model name is not on this endpoint version; payload variant won't help
    if (res.status === 404) {
      break;
    }

    // If 400 (INVALID_ARGUMENT), payload might have incompatible parameter; retry with minimal payload
    if (res.status === 400 && i < payloads.length - 1) {
      console.warn(`Gemini generateContent returned 400 with payload attempt ${i+1}, retrying simplified payload...`, errData);
      continue;
    }

    // Other statuses (403, 429) won't change with payload variation
    break;
  }

  return { ok: false, status: lastStatus, errData: lastErr };
}

// Update model dropdown and UI elements based on provider
function updateAIProviderUI(provider, currentModel) {
  const customBaseUrlGroup = document.getElementById("settings-ai-custom-url-group");
  const modelSelect = document.getElementById("settings-ai-model");
  const keyLink = document.getElementById("link-get-api-key");
  const isGemini = provider === "gemini";

  if (customBaseUrlGroup) {
    customBaseUrlGroup.style.display = isGemini ? "none" : "block";
  }

  if (keyLink) {
    if (isGemini) {
      keyLink.href = "https://aistudio.google.com/app/apikey";
      keyLink.innerHTML = 'Get free Gemini API key &nearr;';
    } else {
      keyLink.href = "https://platform.openai.com/api-keys";
      keyLink.innerHTML = 'Get OpenAI API key &nearr;';
    }
  }

  if (modelSelect) {
    const geminiOptions = `
      <option value="gemini-2.5-pro">Gemini 2.5 Pro (Recommended - Deep Reasoning)</option>
      <option value="gemini-2.5-flash">Gemini 2.5 Flash (Fast & Intelligent)</option>
      <option value="gemma-4-26b-a4b-it">Gemma 4 26B (High Speed MoE)</option>
      <option value="gemma-4-31b-it">Gemma 4 31B (Flagship Open Weights)</option>
      <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
    `;
    const openaiOptions = `
      <option value="gpt-4o-mini">GPT-4o Mini (Recommended)</option>
      <option value="gpt-4o">GPT-4o (High Intelligence)</option>
      <option value="deepseek-chat">DeepSeek Chat</option>
      <option value="custom">Custom Model (Specified in Request)</option>
    `;

    modelSelect.innerHTML = isGemini ? geminiOptions : openaiOptions;
    let effModel = currentModel;
    if (isGemini) {
      effModel = normalizeGeminiModel(currentModel);
    }
    if (effModel) {
      if (!Array.from(modelSelect.options).some(o => o.value === effModel)) {
        const customOpt = document.createElement("option");
        customOpt.value = effModel;
        customOpt.textContent = `${effModel} (Active)`;
        modelSelect.insertBefore(customOpt, modelSelect.firstChild);
      }
      modelSelect.value = effModel;
    }
  }
}

// Fetch list of available models supported by a Google Gemini API key
async function getGeminiAvailableModels(apiKey) {
  const cleanKey = sanitizeApiKey(apiKey);
  if (!cleanKey) return [];

  const foundModels = [];
  let lastServerErr = "";

  for (const apiVer of ["v1beta", "v1", "v1alpha"]) {
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/${apiVer}/models?key=${encodeURIComponent(cleanKey)}`, {
        headers: { "x-goog-api-key": cleanKey }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.models && Array.isArray(data.models)) {
          data.models.forEach(m => {
            const supportsGenerate = m.supportedGenerationMethods && m.supportedGenerationMethods.includes("generateContent");
            if (supportsGenerate) {
              const cleanName = m.name.replace(/^models\//, "");
              if (!foundModels.some(existing => existing.id === cleanName)) {
                foundModels.push({
                  id: cleanName,
                  name: m.displayName || cleanName,
                  version: apiVer
                });
              }
            }
          });
        }
      } else {
        let errData = {};
        try { errData = await res.json(); } catch (e) {}
        const msg = (errData.error && errData.error.message) || `HTTP ${res.status}`;
        lastServerErr = msg;
        console.warn(`ListModels error on ${apiVer}:`, msg);
      }
    } catch (e) {
      console.warn(`ListModels error on ${apiVer}:`, e);
      lastServerErr = e.message || "Network request failed";
    }
  }

  if (foundModels.length === 0 && lastServerErr) {
    throw new Error(lastServerErr);
  }

  return foundModels;
}

// Fetch list of available models supported by an OpenAI / compatible API key
async function getOpenAIAvailableModels(apiKey, baseUrl) {
  const cleanKey = sanitizeApiKey(apiKey);
  const cleanUrl = (baseUrl || "https://api.openai.com/v1").replace(/\/+$/, "");
  const res = await fetch(`${cleanUrl}/models`, {
    headers: { "Authorization": `Bearer ${cleanKey}` }
  });
  if (!res.ok) {
    let errData = {};
    try { errData = await res.json(); } catch(e) {}
    throw new Error((errData.error && errData.error.message) || `Failed to list models (HTTP ${res.status})`);
  }
  const data = await res.json();
  const rawList = data.data || [];
  const filtered = rawList.filter(m => m.id && (m.id.includes("gpt") || m.id.includes("chat") || m.id.includes("claude") || m.id.includes("deepseek") || m.id.includes("llama") || m.id.includes("mistral")));
  const list = filtered.length > 0 ? filtered : rawList;
  return list.map(m => ({ id: m.id, name: m.id, version: "v1" }));
}

// Populate model dropdown with list of models
function populateModelDropdown(modelItems) {
  const select = document.getElementById("settings-ai-model");
  if (!select || !Array.isArray(modelItems) || modelItems.length === 0) return;
  const currentVal = normalizeGeminiModel(select.value);
  select.innerHTML = modelItems.map(m => `<option value="${escapeHtml(m.id)}">${escapeHtml(m.name ? `${m.name} (${m.id})` : m.id)}</option>`).join("");
  if (modelItems.some(m => m.id === currentVal)) {
    select.value = currentVal;
  } else {
    const best = modelItems.find(m => m.id === "gemini-2.5-flash") ||
                 modelItems.find(m => m.id === "gemini-2.5-pro") ||
                 modelItems.find(m => m.id === "gemini-2.0-flash") ||
                 modelItems.find(m => m.id === "gpt-4o-mini") ||
                 modelItems[0];
    select.value = best ? best.id : modelItems[0].id;
  }
  if (!state.aiSettings) state.aiSettings = {};
  state.aiSettings.model = select.value;
  saveStateToStorage();
  if (window.supabaseClient) {
    dbSaveSettings("aiSettings", state.aiSettings);
  }
}

// Interactively discover models and refresh dropdown
async function discoverAndPopulateAIModels() {
  const provider = document.getElementById("settings-ai-provider") ? document.getElementById("settings-ai-provider").value : "gemini";
  const apiKey = sanitizeApiKey(document.getElementById("settings-ai-apikey") ? document.getElementById("settings-ai-apikey").value : "");
  const baseUrl = (document.getElementById("settings-ai-baseurl") ? document.getElementById("settings-ai-baseurl").value : "https://api.openai.com/v1").trim();
  const icon = document.getElementById("ai-models-refresh-icon");
  const errDetails = document.getElementById("ai-test-error-details");

  if (!apiKey) {
    showToast("Please enter an API key first.", "warning");
    return;
  }

  if (icon) icon.classList.add("fa-spin");

  try {
    let models = [];
    if (provider === "gemini") {
      models = await getGeminiAvailableModels(apiKey);
    } else {
      models = await getOpenAIAvailableModels(apiKey, baseUrl);
    }

    if (!models || models.length === 0) {
      throw new Error(`No text generation models returned for this ${provider === 'gemini' ? 'Google' : 'OpenAI'} key. Check if the Generative API is enabled in your developer console.`);
    }

    populateModelDropdown(models.map(m => ({ id: m.id, name: m.name ? `${m.name}` : m.id })));
    showToast(`Discovered ${models.length} available models!`, "success");

    if (errDetails) {
      errDetails.style.display = "block";
      errDetails.style.background = "rgba(0, 204, 136, 0.1)";
      errDetails.style.border = "1px solid var(--accent-teal)";
      errDetails.innerHTML = `
        <div style="color: var(--accent-teal); font-weight: 600; margin-bottom: 4px;">
          <i class="fa-solid fa-circle-check"></i> Discovered ${models.length} Models Authorized for your Key
        </div>
        <div style="color: var(--text-muted); font-size: 0.78rem;">
          The Model dropdown was updated with models confirmed for your account.<br>
          <strong>Available:</strong> ${models.slice(0, 6).map(m => `<code>${escapeHtml(m.id)}</code>`).join(', ')}${models.length > 6 ? ` and ${models.length - 6} more...` : ''}
        </div>
      `;
    }
  } catch (err) {
    console.error("Discover models failed:", err);
    showToast(`Discover failed: ${err.message}`, "error");
    if (errDetails) {
      errDetails.style.display = "block";
      errDetails.style.background = "rgba(255, 77, 77, 0.1)";
      errDetails.style.border = "1px solid var(--accent-danger)";
      errDetails.innerHTML = `
        <div style="color: var(--accent-danger); font-weight: 600; margin-bottom: 4px;">
          <i class="fa-solid fa-triangle-exclamation"></i> Model Discovery Failed
        </div>
        <div style="color: var(--text-main); font-size: 0.8rem;">
          ${escapeHtml(err.message)}
        </div>
      `;
    }
  } finally {
    if (icon) icon.classList.remove("fa-spin");
  }
}

// Initialize AI Assistant UI and bindings
function initAIAssistant() {
  loadAIChatHistory();
  bindAIEvents();
  syncAISettingsUI();
  updateAIContextBadge();
}

// Load previous chat history from localStorage
function loadAIChatHistory() {
  try {
    const saved = localStorage.getItem("gv_ai_chat_history");
    if (saved) {
      aiChatHistory = JSON.parse(saved);
    } else {
      aiChatHistory = [
        {
          role: "assistant",
          content: "👋 Hello! I am your **GameVault AI Merchant Co-Pilot**.\n\nI have real-time access to your store inventory, sales velocity, profit margins, and supplier records. How can I assist you today?\n\n*Try one of the quick analysis prompts below or ask me any question!*",
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ];
    }
  } catch (e) {
    console.error("Error loading AI chat history:", e);
    aiChatHistory = [];
  }
  renderAIChatMessages();
}

// Save chat history to localStorage
function saveAIChatHistory() {
  try {
    localStorage.setItem("gv_ai_chat_history", JSON.stringify(aiChatHistory));
  } catch (e) {
    console.error("Error saving AI chat history:", e);
  }
}

// Synchronize AI settings with Settings View DOM
function syncAISettingsUI() {
  const providerSelect = document.getElementById("settings-ai-provider");
  const apiKeyInput = document.getElementById("settings-ai-apikey");
  const baseUrlInput = document.getElementById("settings-ai-baseurl");
  const includeContextCheck = document.getElementById("settings-ai-include-context");

  const cfg = state.aiSettings || {
    provider: "gemini",
    apiKey: "",
    geminiApiKey: "",
    openaiApiKey: "",
    model: "gemini-2.5-flash",
    customBaseUrl: "https://api.openai.com/v1",
    includeContext: true
  };

  // Auto-migrate legacy single apiKey if specific slots are empty
  if (cfg.apiKey) {
    if (cfg.apiKey.startsWith("sk-") && !cfg.openaiApiKey) {
      cfg.openaiApiKey = cfg.apiKey;
    } else if (cfg.apiKey.startsWith("AIzaSy") && !cfg.geminiApiKey) {
      cfg.geminiApiKey = cfg.apiKey;
    }
  }

  // Auto-migrate deprecated or invalid models to modern gemini-2.5-flash
  const normalizedModel = normalizeGeminiModel(cfg.model);
  if (cfg.model !== normalizedModel) {
    cfg.model = normalizedModel;
    if (state.aiSettings) state.aiSettings.model = normalizedModel;
    saveStateToStorage();
  }

  const provider = cfg.provider || "gemini";
  if (providerSelect) providerSelect.value = provider;

  const currentKey = provider === "gemini"
    ? (cfg.geminiApiKey || (cfg.provider === "gemini" ? cfg.apiKey : ""))
    : (cfg.openaiApiKey || (cfg.provider === "openai" ? cfg.apiKey : ""));

  if (apiKeyInput) {
    apiKeyInput.value = currentKey || "";
    apiKeyInput.placeholder = provider === "gemini" ? "AIzaSy... (Free key from Google AI Studio)" : "sk-... (OpenAI API key)";
  }

  if (baseUrlInput) baseUrlInput.value = cfg.customBaseUrl || "https://api.openai.com/v1";
  if (includeContextCheck) includeContextCheck.checked = cfg.includeContext !== false;

  // Update dynamic options and sub-panels
  updateAIProviderUI(provider, cfg.model || (provider === "gemini" ? "gemini-2.5-flash" : "gpt-4o-mini"));

  // Update AI status label in drawer
  const statusLabel = document.getElementById("ai-drawer-provider-badge");
  if (statusLabel) {
    const cleanKey = sanitizeApiKey(currentKey);
    if (cleanKey) {
      statusLabel.textContent = provider === "gemini" ? "Gemini Active" : "OpenAI Active";
      statusLabel.className = "badge badge-active";
    } else {
      statusLabel.textContent = "Demo / Offline Mode";
      statusLabel.className = "badge badge-disputed";
    }
  }
}

// Generate live structured business context for AI prompt
function getAIAppContext() {
  const now = new Date();
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  
  // Inventory stats
  const availableKeys = state.inventory ? state.inventory.filter(i => !i.isSold && !i.isRecycled) : [];
  const totalStockCount = availableKeys.length;
  let totalStockVal = 0;
  const stockByGame = {};
  const stockByPlatform = {};
  const stockBySupplier = {};

  availableKeys.forEach(item => {
    totalStockVal += (parseFloat(item.cost) || 0);
    const title = (item.title || item.gameTitle || "Unknown Title").trim();
    stockByGame[title] = (stockByGame[title] || 0) + 1;
    const plat = item.platform || "Other";
    stockByPlatform[plat] = (stockByPlatform[plat] || 0) + 1;
    const sup = item.source || item.supplier || "Direct/Unknown";
    stockBySupplier[sup] = (stockBySupplier[sup] || 0) + 1;
  });

  const lowStockThreshold = state.lowStockThreshold || 5;
  const lowStockGames = Object.entries(stockByGame)
    .filter(([_, qty]) => qty <= lowStockThreshold)
    .sort((a, b) => a[1] - b[1])
    .slice(0, 10);

  // Sales stats
  const allSales = state.sales ? state.sales.filter(s => !s.isRecycled) : [];
  const totalSalesCount = allSales.length;
  let totalRevenue = 0;
  let totalCost = 0;
  let totalProfit = 0;
  
  let curMonthRevenue = 0;
  let curMonthCost = 0;
  let curMonthProfit = 0;
  let curMonthSalesCount = 0;

  const salesByGame = {};
  const profitByGame = {};
  const salesByPlatform = {};

  allSales.forEach(s => {
    const rev = parseFloat(s.sellPrice) || 0;
    const cost = parseFloat(s.cost) || 0;
    const profit = parseFloat(s.profit) || (rev - cost);
    const title = (s.title || s.gameTitle || "Unknown Game").trim();
    const plat = s.platform || "Other";

    totalRevenue += rev;
    totalCost += cost;
    totalProfit += profit;

    salesByGame[title] = (salesByGame[title] || 0) + 1;
    profitByGame[title] = (profitByGame[title] || 0) + profit;
    salesByPlatform[plat] = (salesByPlatform[plat] || 0) + rev;

    if (s.saleDate && s.saleDate.startsWith(currentMonthStr)) {
      curMonthRevenue += rev;
      curMonthCost += cost;
      curMonthProfit += profit;
      curMonthSalesCount++;
    }
  });

  const topGrossingGames = Object.entries(profitByGame)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([t, p]) => `${t} (Profit: ${formatCurrency(p)}, Qty: ${salesByGame[t] || 0})`);

  const topSellingPlatforms = Object.entries(salesByPlatform)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([p, rev]) => `${p}: ${formatCurrency(rev)}`);

  // Operating Expenses & Payouts
  let totalExpenses = 0;
  let curMonthExpenses = 0;
  if (state.expenses && Array.isArray(state.expenses)) {
    state.expenses.forEach(e => {
      const amt = parseFloat(e.amount) || 0;
      totalExpenses += amt;
      if (e.date && e.date.startsWith(currentMonthStr)) {
        curMonthExpenses += amt;
      }
    });
  }

  let totalPayouts = 0;
  let curMonthPayouts = 0;
  if (state.payouts && Array.isArray(state.payouts)) {
    state.payouts.forEach(p => {
      const amt = parseFloat(p.amount) || 0;
      totalPayouts += amt;
      if (p.date && p.date.startsWith(currentMonthStr)) {
        curMonthPayouts += amt;
      }
    });
  }

  const overallMargin = totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) : "0.0";
  const curMonthMargin = curMonthRevenue > 0 ? ((curMonthProfit / curMonthRevenue) * 100).toFixed(1) : "0.0";
  const curMonthNetNet = curMonthProfit - curMonthExpenses;

  return `
--- LIVE STORE CONTEXT (${now.toISOString().split('T')[0]}) ---
Currency: ${state.currency || "EUR"}
Total Available Inventory Keys: ${totalStockCount} (Total Stock Value: ${formatCurrency(totalStockVal)})
Low Stock Alert Threshold: ${lowStockThreshold} keys
Low Stock Warning Titles: ${lowStockGames.length > 0 ? lowStockGames.map(([t, q]) => `${t} (${q} keys remaining)`).join(', ') : 'None, stock is healthy.'}
Top Stock Sourcing Suppliers: ${Object.entries(stockBySupplier).sort((a,b)=>b[1]-a[1]).slice(0, 5).map(([s, c]) => `${s} (${c} keys)`).join(', ')}

All-Time Sales: ${totalSalesCount} transactions | Gross Revenue: ${formatCurrency(totalRevenue)} | Total Gross Profit: ${formatCurrency(totalProfit)} | Margin: ${overallMargin}%
Current Month (${currentMonthStr}) Sales: ${curMonthSalesCount} sales | Revenue: ${formatCurrency(curMonthRevenue)} | Gross Profit: ${formatCurrency(curMonthProfit)} (Margin: ${curMonthMargin}%)
Current Month Expenses: ${formatCurrency(curMonthExpenses)} | Current Month Net-Net Profit: ${formatCurrency(curMonthNetNet)}
Current Month Payouts Collected: ${formatCurrency(curMonthPayouts)}

Top 5 Most Profitable Games:
${topGrossingGames.length > 0 ? topGrossingGames.map((g, idx) => `  ${idx+1}. ${g}`).join('\n') : '  No sales recorded yet.'}

Top Platforms by Revenue:
${topSellingPlatforms.length > 0 ? topSellingPlatforms.map((p, idx) => `  ${idx+1}. ${p}`).join('\n') : '  No sales recorded yet.'}
--------------------------------------------------
`;
}

// Update the live context pill in the drawer
function updateAIContextBadge() {
  const badge = document.getElementById("ai-context-live-pill");
  if (!badge) return;
  const availKeys = state.inventory ? state.inventory.filter(i => !i.isSold && !i.isRecycled).length : 0;
  const salesCount = state.sales ? state.sales.filter(s => !s.isRecycled).length : 0;
  badge.innerHTML = `<i class="fa-solid fa-circle" style="color: var(--accent-teal); font-size: 0.55rem;"></i> Live: ${availKeys} Keys • ${salesCount} Sales`;
}

// Simple safe markdown to HTML parser for chat bubbles
function formatAIMarkdown(text) {
  if (!text) return "";
  let html = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // Code blocks (```code```)
  html = html.replace(/```([a-z]*)\n([\s\S]*?)```/g, function(match, lang, code) {
    return `<pre class="ai-code-block"><button class="btn-copy-code" title="Copy code" onclick="copyAIText(this)"><i class="fa-solid fa-copy"></i></button><code>${code.trim()}</code></pre>`;
  });

  // Inline code (`code`)
  html = html.replace(/`([^`]+)`/g, '<code class="ai-inline-code">$1</code>');

  // Headers (### Header)
  html = html.replace(/^### (.*$)/gim, '<h5 class="ai-msg-h5">$1</h5>');
  html = html.replace(/^## (.*$)/gim, '<h4 class="ai-msg-h4">$1</h4>');
  html = html.replace(/^# (.*$)/gim, '<h3 class="ai-msg-h3">$1</h3>');

  // Bold & Italic
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');

  // Bullet points
  html = html.replace(/^\s*[-*]\s+(.*)$/gim, '<li class="ai-msg-li">$1</li>');
  html = html.replace(/(<li[\s\S]*?<\/li>)/g, '<ul class="ai-msg-ul">$1</ul>');
  // Clean redundant nested uls
  html = html.replace(/<\/ul>\s*<ul class="ai-msg-ul">/g, '');

  // Line breaks
  html = html.replace(/\n\n/g, '<br><br>');
  html = html.replace(/(?<!>)\n/g, '<br>');

  return html;
}

// Render chat messages inside drawer
function renderAIChatMessages() {
  const container = document.getElementById("ai-chat-messages");
  if (!container) return;

  if (aiChatHistory.length === 0) {
    container.innerHTML = `
      <div style="padding: 30px 15px; text-align: center; color: var(--text-muted); font-size: 0.85rem;">
        <i class="fa-solid fa-robot" style="font-size: 2rem; margin-bottom: 12px; color: var(--accent-purple); display: block;"></i>
        No conversation history yet.<br>Ask a question or pick a prompt below!
      </div>
    `;
    return;
  }

  let html = "";
  aiChatHistory.forEach((msg, idx) => {
    const isUser = msg.role === "user";
    html += `
      <div class="ai-msg-wrapper ${isUser ? 'user-wrapper' : 'assistant-wrapper'}">
        <div class="ai-msg-avatar">
          <i class="fa-solid ${isUser ? 'fa-user' : 'fa-wand-magic-sparkles'}"></i>
        </div>
        <div class="ai-msg-content">
          <div class="ai-msg-bubble ${isUser ? 'ai-bubble-user' : 'ai-bubble-assistant'}">
            ${isUser ? escapeHtml(msg.content) : formatAIMarkdown(msg.content)}
          </div>
          <div class="ai-msg-meta">
            <span>${msg.time || ''}</span>
            ${!isUser ? `<button type="button" class="btn-copy-msg" title="Copy response" onclick="copyAIText(this)"><i class="fa-regular fa-copy"></i> Copy</button>` : ''}
          </div>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
  container.scrollTop = container.scrollHeight;
}

// Copy helper function for AI code and messages
window.copyAIText = function(btn) {
  const pre = btn.closest(".ai-code-block");
  let text = "";
  if (pre) {
    const code = pre.querySelector("code");
    text = code ? code.innerText : "";
  } else {
    const bubble = btn.closest(".ai-msg-content").querySelector(".ai-msg-bubble");
    text = bubble ? bubble.innerText : "";
  }

  if (navigator.clipboard && text) {
    navigator.clipboard.writeText(text).then(() => {
      showToast("Copied to clipboard.", "info");
    }).catch(err => {
      console.error("Clipboard copy failed:", err);
    });
  }
};

// Built-in rule-based offline analytics generator
function generateLocalAIAnalysis(promptQuery) {
  const lower = promptQuery.toLowerCase();
  const now = new Date();
  const curMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  
  const availKeys = state.inventory ? state.inventory.filter(i => !i.isSold && !i.isRecycled) : [];
  const sales = state.sales ? state.sales.filter(s => !s.isRecycled) : [];
  const lowThresh = state.lowStockThreshold || 5;

  if (lower.includes("restock") || lower.includes("low stock") || lower.includes("inventory")) {
    const stockMap = {};
    availKeys.forEach(k => {
      const t = (k.title || k.gameTitle || "Unknown Game").trim();
      stockMap[t] = (stockMap[t] || 0) + 1;
    });

    const lowStock = Object.entries(stockMap)
      .filter(([_, q]) => q <= lowThresh)
      .sort((a, b) => a[1] - b[1]);

    let response = `### ⚠️ Inventory Restock & Stock Alert Report\n\n`;
    response += `**Current Inventory Status:**\n- Total Active Keys: **${availKeys.length}**\n- Low Stock Warning Threshold: **${lowThresh} keys**\n\n`;

    if (lowStock.length > 0) {
      response += `**Critical Titles Needing Sourcing:**\n`;
      lowStock.forEach(([title, qty]) => {
        response += `- **${title}**: Only **${qty}** key${qty === 1 ? '' : 's'} remaining!\n`;
      });
      response += `\n💡 *Actionable Advice:* Prioritize contacting suppliers for these titles or checking bundle deals to avoid stockouts on high-demand items.`;
    } else {
      response += `✅ **Great news!** No titles currently fall below your low-stock threshold of ${lowThresh} keys. Your inventory is healthy!`;
    }
    return response;
  }

  if (lower.includes("profit") || lower.includes("sales") || lower.includes("margin") || lower.includes("audit")) {
    let rev = 0, cost = 0, profit = 0;
    const profitByTitle = {};
    sales.forEach(s => {
      const r = parseFloat(s.sellPrice) || 0;
      const c = parseFloat(s.cost) || 0;
      const p = parseFloat(s.profit) || (r - c);
      rev += r;
      cost += c;
      profit += p;
      const t = (s.title || s.gameTitle || "Unknown Game").trim();
      profitByTitle[t] = (profitByTitle[t] || 0) + p;
    });

    const margin = rev > 0 ? ((profit / rev) * 100).toFixed(1) : "0.0";
    const topProfits = Object.entries(profitByTitle).sort((a,b) => b[1] - a[1]).slice(0, 5);

    let response = `### 📊 Sales & Margin Performance Audit\n\n`;
    response += `**Key Financial Metrics:**\n`;
    response += `- Total Gross Revenue: **${formatCurrency(rev)}**\n`;
    response += `- Total Product Cost: **${formatCurrency(cost)}**\n`;
    response += `- Total Gross Profit: **${formatCurrency(profit)}**\n`;
    response += `- Overall Profit Margin: **${margin}%**\n\n`;

    response += `**Top 5 Net Profit Generating Titles:**\n`;
    topProfits.forEach(([t, p], i) => {
      response += `${i + 1}. **${t}**: **${formatCurrency(p)}** net profit\n`;
    });

    response += `\n💡 *Strategic Recommendation:* Your top profit drivers should be permanently kept in stock. Consider bundling them with slower-moving titles to boost overall basket value.`;
    return response;
  }

  if (lower.includes("pricing") || lower.includes("markup")) {
    let response = `### 💰 Pricing & Markup Analysis\n\n`;
    response += `**Current Strategy Settings:**\n`;
    response += `- Default Markup Type: **${state.defaultMarkupType === 'flat' ? 'Flat Surcharge' : 'Percentage'}**\n`;
    response += `- Target Markup Value: **${state.defaultMarkupValue}${state.defaultMarkupType === 'flat' ? state.currency : '%'}**\n\n`;

    // Detect low margin sales (<10%)
    const lowMarginSales = sales.filter(s => {
      const r = parseFloat(s.sellPrice) || 0;
      const p = parseFloat(s.profit) || 0;
      return r > 0 && (p / r) < 0.10;
    });

    response += `- Sales below 10% profit margin: **${lowMarginSales.length} transactions**\n`;
    if (lowMarginSales.length > 0) {
      response += `\n⚠️ *Warning:* You have ${lowMarginSales.length} sales with under 10% margins. Check if marketplace commissions (e.g. Kinguin/Eneba seller fees) are eroding your bottom line.\n`;
    } else {
      response += `\n✅ Your margins across closed transactions are safely above minimum thresholds.\n`;
    }
    return response;
  }

  // Default fallback response
  return `### 🤖 GameVault Store Summary\n\n` +
         `Here is your immediate store status:\n` +
         `- **Active Keys Available:** ${availKeys.length}\n` +
         `- **Total Transactions Recorded:** ${sales.length}\n` +
         `- **Default Currency:** ${state.currency}\n\n` +
         `💡 **Unlock Full AI Powers:** To have freeform, deep reasoning conversations, configure your **Google Gemini API Key** (Free) or **OpenAI API Key** in **Settings ⚙️ -> Cloud Integrations & AI**!`;
}

// Call Google Gemini API
async function callGeminiAPI(userQuery, appContext, cfg) {
  let model = normalizeGeminiModel(cfg.model);
  if (state.aiSettings && state.aiSettings.model !== model) {
    state.aiSettings.model = model;
    saveStateToStorage();
  }
  const apiKey = sanitizeApiKey(cfg.apiKey);

  if (!apiKey) {
    throw new Error("Missing Google Gemini API Key. Please enter your key in Settings.");
  }

  // Pre-flight key format validation
  if (apiKey.startsWith("sk-")) {
    throw new Error("Invalid Gemini API Key: The key provided starts with 'sk-', which is an OpenAI key format. Please switch your Provider dropdown to 'OpenAI / Compatible'.");
  }

  const systemInstruction = `You are GameVault AI, an elite digital game keys eCommerce analytics assistant.
Your job is to assist game key merchants with pricing, supplier sourcing, restock planning, profit margin audits, and market strategies.
Answer concisely and cleanly with markdown formatting (bullet points, bold highlights, small markdown tables if comparing numbers).
Here is the real-time context of the merchant's store:
${cfg.includeContext !== false ? appContext : "Context disabled by user."}
Always ground your answers in these real figures when available.`;

  const contents = [
    {
      role: "user",
      parts: [{ text: `${systemInstruction}\n\nMerchant's Request: ${userQuery}` }]
    }
  ];

  // Try API endpoints: v1beta first (where modern models live), then v1, then v1alpha
  const apiVersionsToTry = ["v1beta", "v1", "v1alpha"];
  let lastErrorMsg = "";
  const cleanReqModel = (model || "").replace(/^models\//, "");

  for (const apiVer of apiVersionsToTry) {
    const endpoint = `https://generativelanguage.googleapis.com/${apiVer}/models/${encodeURIComponent(cleanReqModel)}:generateContent?key=${encodeURIComponent(apiKey)}`;

    let result;
    try {
      result = await sendGeminiGenerateContent(endpoint, contents, cfg, apiKey);
    } catch (netErr) {
      console.error(`Gemini fetch network error on ${apiVer}:`, netErr);
      throw new Error(
        "Network request to Google Gemini blocked or offline. If you are using Brave Shields, uBlock Origin, or an ad-blocker, please disable shields for this page or allow 'generativelanguage.googleapis.com'."
      );
    }

    if (result.ok) {
      return result.text;
    }

    const errData = result.errData || {};
    const rawMsg = (errData.error && errData.error.message) || "";
    const status = result.status;

    // If 404, try next API version (e.g. try v1beta then v1 then v1alpha)
    if (status === 404) {
      lastErrorMsg = rawMsg || `Model '${cleanReqModel}' not found on API version ${apiVer}`;
      continue;
    }

    // For other error codes, throw immediately
    if (status === 400) {
      if (rawMsg.includes("API key not valid") || rawMsg.includes("API_KEY_INVALID")) {
        throw new Error(`Invalid API Key (HTTP 400): Google rejected this API key. Please ensure you copied the complete key from Google AI Studio (Gemini keys start with 'AIzaSy...'). Server: ${rawMsg}`);
      }
      if (rawMsg.includes("User location is not supported") || rawMsg.includes("LOCATION")) {
        throw new Error(`Region Not Supported (HTTP 400): Google Gemini is not available in your current geographic region without a VPN or supported Cloud project. Server: ${rawMsg}`);
      }
      throw new Error(`Google API Bad Request (HTTP 400): ${rawMsg || "Please verify your model name and key."}`);
    } else if (status === 403) {
      throw new Error(`Permission Denied (HTTP 403): The API key lacks permissions or Gemini API is not enabled. Server: ${rawMsg}`);
    } else if (status === 429) {
      throw new Error(`Rate Limit Exceeded (HTTP 429): Google Gemini rate limit reached. Please wait a minute before sending another request. Server: ${rawMsg}`);
    }
    throw new Error(rawMsg || `Gemini API error (HTTP ${status})`);
  }

  // All API versions returned 404 for this specific model name.
  // Query ListModels to find what models ARE authorized on this key and auto-heal!
  console.warn(`Model '${cleanReqModel}' not found on v1beta, v1, or v1alpha. Querying ListModels for authorized models on this key...`);
  try {
    const discovered = await getGeminiAvailableModels(apiKey);
    if (discovered && discovered.length > 0) {
      // Refresh the model dropdown in the UI
      populateModelDropdown(discovered.map(d => ({ id: d.id, name: `${d.name} (${d.id})` })));

      const priorityOrder = [
        "gemini-2.5-pro",
        "gemma-4-26b-a4b-it",
        "gemma-4-31b-it",
        "gemini-2.5-flash",
        "gemini-2.0-flash",
        "gemini-2.5-flash-preview-tts",
        "gemini-2.5-pro-preview-tts"
      ];

      // Sort candidate models, putting the one that failed at the very back
      const candidates = [...discovered].sort((a, b) => {
        if (a.id === cleanReqModel) return 1;
        if (b.id === cleanReqModel) return -1;
        const idxA = priorityOrder.indexOf(a.id);
        const idxB = priorityOrder.indexOf(b.id);
        return (idxA === -1 ? 999 : idxA) - (idxB === -1 ? 999 : idxB);
      });

      console.log(`Auto-discovered ${discovered.length} models. Retrying candidates in order:`, candidates.map(c => c.id));

      for (const cand of candidates) {
        if (cand.id === cleanReqModel) continue; // Don't retry the model that just failed

        const versToTry = cand.version ? [cand.version, "v1beta", "v1", "v1alpha"] : ["v1beta", "v1", "v1alpha"];
        const uniqueVers = [...new Set(versToTry)];

        for (const apiVer of uniqueVers) {
          try {
            const fbEndpoint = `https://generativelanguage.googleapis.com/${apiVer}/models/${encodeURIComponent(cand.id)}:generateContent?key=${encodeURIComponent(apiKey)}`;
            const fbResult = await sendGeminiGenerateContent(fbEndpoint, contents, cfg, apiKey);
            if (fbResult.ok) {
              if (!state.aiSettings) state.aiSettings = {};
              state.aiSettings.model = cand.id;
              const modelSelect = document.getElementById("settings-ai-model");
              if (modelSelect) modelSelect.value = cand.id;
              saveStateToStorage();
              if (window.supabaseClient) {
                dbSaveSettings("aiSettings", state.aiSettings);
              }
              console.log(`Auto-healed connection using working model: ${cand.id} on ${apiVer}`);
              return fbResult.text;
            } else {
              console.warn(`Fallback retry failed on ${apiVer} with ${cand.id}:`, fbResult.errData);
            }
          } catch (e) {
            console.warn(`Fallback retry network error on ${apiVer} with ${cand.id}:`, e);
          }
        }
      }

      // Also attempt Google's OpenAI-compatible endpoint as transparent fallback across candidates
      for (const cand of candidates) {
        if (cand.id === cleanReqModel) continue;
        try {
          const oaiRes = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${apiKey}`
            },
            body: JSON.stringify({
              model: cand.id,
              messages: [
                { role: "system", content: systemInstruction },
                { role: "user", content: userQuery }
              ],
              max_tokens: 8192
            })
          });
          if (oaiRes.ok) {
            const oaiData = await oaiRes.json();
            if (oaiData.choices && oaiData.choices[0] && oaiData.choices[0].message) {
              if (!state.aiSettings) state.aiSettings = {};
              state.aiSettings.model = cand.id;
              const modelSelect = document.getElementById("settings-ai-model");
              if (modelSelect) modelSelect.value = cand.id;
              saveStateToStorage();
              return oaiData.choices[0].message.content;
            }
          }
        } catch (oaiE) {}
      }

      const modelListStr = discovered.map(d => d.id).slice(0, 8).join(", ");
      const bestFallback = candidates.find(c => c.id !== cleanReqModel) || discovered[0];
      throw new Error(`The model '${model}' was not found for generateContent (${lastErrorMsg || 'HTTP 404'}). Discovered models for your API key: [${modelListStr}]. Recommended: '${bestFallback.id}'.`);
    }
  } catch (discErr) {
    if (discErr.message && discErr.message.includes("Discovered models for your API key")) {
      throw discErr;
    }
  }

  // Also attempt Google's OpenAI-compatible endpoint as transparent fallback
  try {
    const oaiRes = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model || "gemini-2.5-flash",
        messages: [
          { role: "system", content: systemInstruction },
          { role: "user", content: userQuery }
        ],
        temperature: cfg.temperature || 0.7,
        max_tokens: 8192
      })
    });
    if (oaiRes.ok) {
      const oaiData = await oaiRes.json();
      if (oaiData.choices && oaiData.choices[0] && oaiData.choices[0].message) {
        return oaiData.choices[0].message.content;
      }
    }
  } catch (oaiE) {}

  throw new Error(`Model Not Found (HTTP 404): '${model}' was not found on v1beta or v1. Server: ${lastErrorMsg}. Try selecting 'gemini-2.5-flash' or click 'Discover models'.`);
}

// Call OpenAI or Compatible API
async function callOpenAIAPI(userQuery, appContext, cfg) {
  const baseUrl = (cfg.customBaseUrl || "https://api.openai.com/v1").replace(/\/+$/, "");
  const endpoint = `${baseUrl}/chat/completions`;
  const model = cfg.model || "gpt-4o-mini";
  const apiKey = sanitizeApiKey(cfg.apiKey);

  if (!apiKey) {
    throw new Error("Missing API Key. Please enter your OpenAI/compatible API key in Settings.");
  }

  // Pre-flight key format validation
  if (apiKey.startsWith("AIzaSy")) {
    throw new Error("Invalid OpenAI API Key: The key provided starts with 'AIzaSy', which is a Google Gemini key. Please select 'Google Gemini' as your provider.");
  }

  const systemInstruction = `You are GameVault AI, an elite digital game keys eCommerce analytics assistant.
Your job is to assist game key merchants with pricing, supplier sourcing, restock planning, profit margin audits, and market strategies.
Answer concisely and cleanly with markdown formatting.
Here is the real-time context of the merchant's store:
${cfg.includeContext !== false ? appContext : "Context disabled by user."}
Always ground your answers in these real figures when available.`;

  const messages = [
    { role: "system", content: systemInstruction },
    { role: "user", content: userQuery }
  ];

  let res;
  try {
    res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model,
        messages: messages,
        temperature: cfg.temperature || 0.7,
        max_tokens: 2048
      })
    });
  } catch (netErr) {
    console.error("OpenAI fetch network error:", netErr);
    throw new Error(
      `Network request to ${baseUrl} blocked or failed. Please check your internet connection, CORS settings, or ad-blocker.`
    );
  }

  if (!res.ok) {
    let errData = {};
    try { errData = await res.json(); } catch(e) {}
    const rawMsg = (errData.error && errData.error.message) || "";
    const status = res.status;

    if (status === 401) {
      throw new Error(`Unauthorized (HTTP 401): Incorrect API key or expired token. Server: ${rawMsg}`);
    } else if (status === 429) {
      throw new Error(`Quota / Rate Limit Exceeded (HTTP 429): You may have run out of API credits or exceeded rate limits. Check your OpenAI billing at platform.openai.com. Server: ${rawMsg}`);
    } else if (status === 404) {
      throw new Error(`Not Found (HTTP 404): The endpoint '${endpoint}' or model '${model}' was not found. Verify your Base URL and model selection.`);
    }
    throw new Error(rawMsg || `OpenAI API error (HTTP ${res.status})`);
  }

  const data = await res.json();
  if (data.choices && data.choices[0] && data.choices[0].message) {
    return data.choices[0].message.content;
  }
  throw new Error("No response received from OpenAI API.");
}

// Send user query and process response
async function sendAIMessage(queryText) {
  if (isAIGenerating) return;
  const text = queryText || (document.getElementById("ai-prompt-input") ? document.getElementById("ai-prompt-input").value.trim() : "");
  if (!text) return;

  const inputElem = document.getElementById("ai-prompt-input");
  if (inputElem) inputElem.value = "";

  const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  
  aiChatHistory.push({
    role: "user",
    content: text,
    time: timeStr
  });
  renderAIChatMessages();

  isAIGenerating = true;
  const chatContainer = document.getElementById("ai-chat-messages");
  const typingIndicator = document.createElement("div");
  typingIndicator.id = "ai-typing-indicator";
  typingIndicator.className = "ai-msg-wrapper assistant-wrapper";
  typingIndicator.innerHTML = `
    <div class="ai-msg-avatar"><i class="fa-solid fa-wand-magic-sparkles"></i></div>
    <div class="ai-msg-content">
      <div class="ai-bubble-assistant ai-typing-bubble">
        <span class="dot"></span><span class="dot"></span><span class="dot"></span>
      </div>
    </div>
  `;
  if (chatContainer) {
    chatContainer.appendChild(typingIndicator);
    chatContainer.scrollTop = chatContainer.scrollHeight;
  }

  let assistantReply = "";
  const cfg = state.aiSettings || {};

  try {
    const appContext = getAIAppContext();
    const provider = cfg.provider || "gemini";
    const apiKey = provider === "gemini"
      ? (cfg.geminiApiKey || (cfg.provider === "gemini" ? cfg.apiKey : ""))
      : (cfg.openaiApiKey || (cfg.provider === "openai" ? cfg.apiKey : ""));

    const activeCfg = {
      ...cfg,
      provider,
      apiKey
    };

    if (apiKey && apiKey.trim()) {
      if (provider === "gemini") {
        assistantReply = await callGeminiAPI(text, appContext, activeCfg);
      } else {
        assistantReply = await callOpenAIAPI(text, appContext, activeCfg);
      }
    } else {
      await new Promise(r => setTimeout(r, 600));
      assistantReply = generateLocalAIAnalysis(text);
    }
  } catch (err) {
    console.error("AI Assistant request error:", err);
    assistantReply = `⚠️ **Error communicating with AI Provider:**\n\n> ${err.message || 'Unknown network or API error.'}\n\n*Please verify your API key and connection in Settings -> Cloud Integrations & AI.*`;
  } finally {
    isAIGenerating = false;
    const ind = document.getElementById("ai-typing-indicator");
    if (ind) ind.remove();

    aiChatHistory.push({
      role: "assistant",
      content: assistantReply,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });
    saveAIChatHistory();
    renderAIChatMessages();
  }
}

// Test AI Connection directly from Settings view
async function testAIConnection() {
  const btn = document.getElementById("btn-test-ai-connection");
  const statusBadge = document.getElementById("ai-test-status-badge");
  const errDetails = document.getElementById("ai-test-error-details");
  if (!btn || !statusBadge) return;

  const providerSelect = document.getElementById("settings-ai-provider");
  const apiKeyInput = document.getElementById("settings-ai-apikey");
  const modelSelect = document.getElementById("settings-ai-model");
  const baseUrlInput = document.getElementById("settings-ai-baseurl");

  let provider = providerSelect ? providerSelect.value : "gemini";
  let apiKey = apiKeyInput ? sanitizeApiKey(apiKeyInput.value) : "";
  let model = modelSelect ? modelSelect.value : (provider === "gemini" ? "gemini-2.5-flash" : "gpt-4o-mini");
  if (provider === "gemini") {
    model = normalizeGeminiModel(model);
  }
  const baseUrl = baseUrlInput ? baseUrlInput.value.trim() : "https://api.openai.com/v1";

  // If sanitized key differs from input (e.g. had surrounding quotes or spaces), update input
  if (apiKeyInput && apiKeyInput.value !== apiKey) {
    apiKeyInput.value = apiKey;
  }

  if (errDetails) {
    errDetails.style.display = "none";
    errDetails.innerHTML = "";
  }

  if (!apiKey) {
    statusBadge.textContent = "API Key Required";
    statusBadge.className = "badge badge-disputed";
    if (errDetails) {
      errDetails.style.display = "block";
      errDetails.style.background = "rgba(255, 77, 77, 0.1)";
      errDetails.style.border = "1px solid var(--accent-danger)";
      errDetails.innerHTML = `
        <div style="color: var(--accent-danger); font-weight: 600; margin-bottom: 4px;">
          <i class="fa-solid fa-circle-exclamation"></i> API Key Missing
        </div>
        <div style="color: var(--text-muted); font-size: 0.8rem;">
          Please enter an API key to test connection.<br>
          <a href="${provider === 'gemini' ? 'https://aistudio.google.com/app/apikey' : 'https://platform.openai.com/api-keys'}" target="_blank" style="color: var(--accent-teal); text-decoration: underline;">
            ${provider === 'gemini' ? 'Get free Google Gemini API Key &nearr;' : 'Get OpenAI API Key &nearr;'}
          </a>
        </div>
      `;
    }
    showToast("Please enter an API Key to test.", "warning");
    return;
  }

  // Provider mismatch validation: explain clearly with action buttons instead of silent hijacking
  const detected = detectProviderFromKey(apiKey);
  if (detected && detected !== provider) {
    statusBadge.textContent = "Key Mismatch";
    statusBadge.className = "badge badge-disputed";
    if (errDetails) {
      errDetails.style.display = "block";
      errDetails.style.background = "rgba(255, 170, 0, 0.1)";
      errDetails.style.border = "1px solid var(--accent-gold)";

      if (detected === "openai" && provider === "gemini") {
        errDetails.innerHTML = `
          <div style="color: var(--accent-gold); font-weight: 600; margin-bottom: 6px;">
            <i class="fa-solid fa-triangle-exclamation"></i> OpenAI API Key entered for Google Gemini
          </div>
          <div style="color: var(--text-main); font-size: 0.82rem; line-height: 1.5; margin-bottom: 8px;">
            The key you entered starts with <code>sk-...</code>, which is an <strong>OpenAI</strong> API key format.<br>
            Google Gemini keys start with <code>AIzaSy...</code> and are <strong>100% free</strong> with no credit card required at Google AI Studio.
          </div>
          <div style="display: flex; gap: 8px; flex-wrap: wrap;">
            <a href="https://aistudio.google.com/app/apikey" target="_blank" class="btn btn-primary btn-sm" style="text-decoration: none;">
              <i class="fa-solid fa-key"></i> Get Free Google Gemini Key &nearr;
            </a>
            <button type="button" class="btn btn-secondary btn-sm" id="btn-fix-switch-openai">
              <i class="fa-solid fa-arrow-right-arrow-left"></i> Switch Provider to OpenAI
            </button>
          </div>
        `;
        const btnFix = document.getElementById("btn-fix-switch-openai");
        if (btnFix) {
          btnFix.addEventListener("click", () => {
            if (providerSelect) {
              providerSelect.value = "openai";
              updateAIProviderUI("openai", "gpt-4o-mini");
            }
            if (!state.aiSettings) state.aiSettings = {};
            state.aiSettings.openaiApiKey = apiKey;
            state.aiSettings.provider = "openai";
            testAIConnection();
          });
        }
      } else if (detected === "gemini" && provider === "openai") {
        errDetails.innerHTML = `
          <div style="color: var(--accent-gold); font-weight: 600; margin-bottom: 6px;">
            <i class="fa-solid fa-triangle-exclamation"></i> Google Gemini Key entered for OpenAI
          </div>
          <div style="color: var(--text-main); font-size: 0.82rem; line-height: 1.5; margin-bottom: 8px;">
            The key you entered starts with <code>AIzaSy...</code>, which is a <strong>Google Gemini</strong> API key format.
          </div>
          <div style="display: flex; gap: 8px; flex-wrap: wrap;">
            <button type="button" class="btn btn-primary btn-sm" id="btn-fix-switch-gemini">
              <i class="fa-solid fa-arrow-right-arrow-left"></i> Switch Provider to Google Gemini
            </button>
          </div>
        `;
        const btnFix = document.getElementById("btn-fix-switch-gemini");
        if (btnFix) {
          btnFix.addEventListener("click", () => {
            if (providerSelect) {
              providerSelect.value = "gemini";
              updateAIProviderUI("gemini", "gemini-2.5-flash");
            }
            if (!state.aiSettings) state.aiSettings = {};
            state.aiSettings.geminiApiKey = apiKey;
            state.aiSettings.provider = "gemini";
            testAIConnection();
          });
        }
      }
    }
    showToast("API key format does not match selected provider.", "warning");
    return;
  }

  btn.disabled = true;
  statusBadge.textContent = "Testing...";
  statusBadge.className = "badge";

  try {
    const testCfg = {
      provider,
      apiKey,
      model,
      customBaseUrl: baseUrl,
      includeContext: false
    };

    let reply = "";
    if (provider === "gemini") {
      reply = await callGeminiAPI("Reply with the single word 'OK' if the API connection is active.", "", testCfg);
    } else {
      reply = await callOpenAIAPI("Reply with the single word 'OK' if the API connection is active.", "", testCfg);
    }

    statusBadge.textContent = "Connected & Verified ✓";
    statusBadge.className = "badge badge-active";
    showToast("AI Assistant connected successfully!", "success");

    const activeModel = (provider === "gemini")
      ? normalizeGeminiModel(state.aiSettings && state.aiSettings.model ? state.aiSettings.model : model)
      : ((state.aiSettings && state.aiSettings.model) || model);

    if (errDetails) {
      errDetails.style.display = "block";
      errDetails.style.background = "rgba(0, 204, 136, 0.1)";
      errDetails.style.border = "1px solid var(--accent-teal)";
      errDetails.innerHTML = `
        <div style="color: var(--accent-teal); font-weight: 600; margin-bottom: 4px;">
          <i class="fa-solid fa-circle-check"></i> Connection Successful!
        </div>
        <div style="color: var(--text-muted); font-size: 0.8rem;">
          Successfully authenticated with <strong>${provider === 'gemini' ? 'Google Gemini' : 'OpenAI'}</strong> (Model: <code>${escapeHtml(activeModel)}</code>).<br>
          Verification response: <em>"${escapeHtml(reply.trim().slice(0, 100))}"</em>
        </div>
      `;
    }

    if (!state.aiSettings) state.aiSettings = {};
    if (provider === "gemini") {
      state.aiSettings.geminiApiKey = apiKey;
    } else {
      state.aiSettings.openaiApiKey = apiKey;
    }
    state.aiSettings.provider = provider;
    state.aiSettings.apiKey = apiKey;
    state.aiSettings.model = activeModel;
    state.aiSettings.customBaseUrl = baseUrl;
    state.aiSettings.includeContext = document.getElementById("settings-ai-include-context") ? document.getElementById("settings-ai-include-context").checked : true;
    state.aiSettings.temperature = 0.7;

    saveStateToStorage();
    if (window.supabaseClient) {
      dbSaveSettings("aiSettings", state.aiSettings);
    }
    syncAISettingsUI();
  } catch (err) {
    console.error("Test AI Connection Failed:", err);
    statusBadge.textContent = "Connection Failed ✗";
    statusBadge.className = "badge badge-sold";
    showToast(`Test failed: ${err.message}`, "error");

    if (errDetails) {
      errDetails.style.display = "block";
      errDetails.style.background = "rgba(255, 77, 77, 0.1)";
      errDetails.style.border = "1px solid var(--accent-danger)";

      const errMsg = err.message || "Unknown error";
      let tips = "";

      if (errMsg.includes("blocked or offline") || errMsg.includes("Failed to fetch")) {
        tips = `
          <li><strong>Ad-Blocker / Brave Shields:</strong> Extensions like uBlock Origin, Privacy Badger, or Brave Shields may block browser connections to Google or OpenAI API endpoints. Please try disabling shields for this local page.</li>
          <li><strong>Network / Firewall:</strong> Check if your network connection is active and allows outgoing HTTPS requests to API endpoints.</li>
        `;
      } else if (errMsg.includes("Invalid API Key") || errMsg.includes("400") || errMsg.includes("API_KEY_INVALID")) {
        tips = `
          <li>Verify that you copied the complete API key without missing any characters at the beginning or end.</li>
          <li>Click the <strong>eye icon</strong> in the input box to verify the visible characters.</li>
          <li>For Google Gemini, generate a key at <a href="https://aistudio.google.com/app/apikey" target="_blank" style="color: var(--accent-teal); text-decoration: underline;">Google AI Studio</a>. Keys usually start with <code>AIzaSy...</code>.</li>
        `;
      } else if (errMsg.includes("Unauthorized") || errMsg.includes("401")) {
        tips = `
          <li>For OpenAI, check your key at <a href="https://platform.openai.com/api-keys" target="_blank" style="color: var(--accent-teal); text-decoration: underline;">platform.openai.com/api-keys</a>.</li>
          <li>Ensure the key has not expired or been revoked.</li>
        `;
      } else if (errMsg.includes("Quota") || errMsg.includes("Rate Limit") || errMsg.includes("429")) {
        tips = `
          <li><strong>OpenAI:</strong> OpenAI accounts do not include free API usage ($0 default balance). Add prepaid credits at <a href="https://platform.openai.com/settings/organization/billing" target="_blank" style="color: var(--accent-teal); text-decoration: underline;">OpenAI Billing Settings &nearr;</a>.</li>
          <li><strong>Free Alternative:</strong> Google Gemini offers a 100% free tier (15 requests/min, no credit card required). Switch Provider to <strong>Google Gemini</strong> and get a free key at <a href="https://aistudio.google.com/app/apikey" target="_blank" style="color: var(--accent-teal); text-decoration: underline;">Google AI Studio &nearr;</a>.</li>
        `;
      } else if (errMsg.includes("Model Not Found") || errMsg.includes("404") || errMsg.includes("not found for API version")) {
        tips = `
          <li>Click the <strong>'Discover models'</strong> button above the model selector to auto-load the exact models authorized for your key.</li>
          <li>Alternatively, select <code>gemini-2.5-flash</code> or <code>gemini-2.5-pro</code> from the dropdown.</li>
        `;
      } else if (errMsg.includes("Region Not Supported")) {
        tips = `
          <li>Google Gemini API free tier is restricted in a few select jurisdictions. Using a VPN or switching to an OpenAI-compatible endpoint resolves this.</li>
        `;
      }

      errDetails.innerHTML = `
        <div style="color: var(--accent-danger); font-weight: 600; margin-bottom: 6px;">
          <i class="fa-solid fa-triangle-exclamation"></i> Connection Diagnostic:
        </div>
        <div style="color: var(--text-main); margin-bottom: 8px; word-break: break-word; font-size: 0.8rem;">
          ${escapeHtml(errMsg)}
        </div>
        ${tips ? `<ul style="margin: 0; padding-left: 18px; color: var(--text-muted); font-size: 0.75rem; line-height: 1.5;">${tips}</ul>` : ''}
      `;
    }
  } finally {
    btn.disabled = false;
  }
}

// Toggle slide-over AI assistant drawer
function toggleAIDrawer(open) {
  const drawer = document.getElementById("ai-assistant-drawer");
  const overlay = document.getElementById("ai-assistant-overlay");
  if (!drawer) return;

  const shouldOpen = open !== undefined ? open : !drawer.classList.contains("open");
  if (shouldOpen) {
    drawer.classList.add("open");
    if (overlay) overlay.classList.add("active");
    updateAIContextBadge();
    const input = document.getElementById("ai-prompt-input");
    if (input) setTimeout(() => input.focus(), 250);
  } else {
    drawer.classList.remove("open");
    if (overlay) overlay.classList.remove("active");
  }
}

// Bind all AI-related event listeners
function bindAIEvents() {
  const btnTopbar = document.getElementById("btn-topbar-ai");
  const btnFloating = document.getElementById("btn-floating-ai");
  const btnClose = document.getElementById("btn-close-ai-drawer");
  const overlay = document.getElementById("ai-assistant-overlay");

  if (btnTopbar) btnTopbar.addEventListener("click", () => toggleAIDrawer());
  if (btnFloating) btnFloating.addEventListener("click", () => toggleAIDrawer());
  if (btnClose) btnClose.addEventListener("click", () => toggleAIDrawer(false));
  if (overlay) overlay.addEventListener("click", () => toggleAIDrawer(false));

  document.addEventListener("keydown", (e) => {
    if ((e.ctrlKey && e.code === "Space") || (e.altKey && (e.key === "a" || e.key === "A"))) {
      e.preventDefault();
      toggleAIDrawer();
    } else if (e.key === "Escape") {
      const drawer = document.getElementById("ai-assistant-drawer");
      if (drawer && drawer.classList.contains("open")) {
        toggleAIDrawer(false);
      }
    }
  });

  const form = document.getElementById("ai-chat-form");
  const input = document.getElementById("ai-prompt-input");
  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      sendAIMessage();
    });
  }
  if (input) {
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendAIMessage();
      }
    });
  }

  const chipsContainer = document.getElementById("ai-quick-chips");
  if (chipsContainer) {
    chipsContainer.addEventListener("click", (e) => {
      const chip = e.target.closest(".ai-prompt-chip");
      if (chip) {
        const query = chip.getAttribute("data-prompt") || chip.innerText.trim();
        sendAIMessage(query);
      }
    });
  }

  const btnClearChat = document.getElementById("btn-clear-ai-chat");
  if (btnClearChat) {
    btnClearChat.addEventListener("click", () => {
      if (confirm("Clear AI conversation history?")) {
        aiChatHistory = [
          {
            role: "assistant",
            content: "👋 Chat cleared. How can I assist your business today?",
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ];
        saveAIChatHistory();
        renderAIChatMessages();
        showToast("AI chat history cleared.", "info");
      }
    });
  }

  const btnOpenSettings = document.getElementById("btn-ai-drawer-settings");
  if (btnOpenSettings) {
    btnOpenSettings.addEventListener("click", () => {
      toggleAIDrawer(false);
      const navSettings = document.getElementById("nav-settings");
      if (navSettings) navSettings.click();
      setTimeout(() => {
        const card = document.getElementById("card-ai-settings");
        if (card) card.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 200);
    });
  }

  const btnSaveAISettings = document.getElementById("btn-save-ai-settings");
  if (btnSaveAISettings) {
    btnSaveAISettings.addEventListener("click", () => {
      const provider = document.getElementById("settings-ai-provider") ? document.getElementById("settings-ai-provider").value : "gemini";
      const rawKey = document.getElementById("settings-ai-apikey") ? document.getElementById("settings-ai-apikey").value : "";
      const apiKey = sanitizeApiKey(rawKey);
      const rawModel = document.getElementById("settings-ai-model") ? document.getElementById("settings-ai-model").value : (provider === "gemini" ? "gemini-2.5-flash" : "gpt-4o-mini");
      const model = provider === "gemini" ? normalizeGeminiModel(rawModel) : rawModel;
      const baseUrl = document.getElementById("settings-ai-baseurl") ? document.getElementById("settings-ai-baseurl").value.trim() : "https://api.openai.com/v1";
      const includeContext = document.getElementById("settings-ai-include-context") ? document.getElementById("settings-ai-include-context").checked : true;

      // Update input field to sanitized version
      const keyInput = document.getElementById("settings-ai-apikey");
      if (keyInput) keyInput.value = apiKey;

      if (!state.aiSettings) state.aiSettings = {};
      if (provider === "gemini") {
        state.aiSettings.geminiApiKey = apiKey;
      } else {
        state.aiSettings.openaiApiKey = apiKey;
      }
      state.aiSettings.provider = provider;
      state.aiSettings.apiKey = apiKey;
      state.aiSettings.model = model;
      state.aiSettings.customBaseUrl = baseUrl;
      state.aiSettings.includeContext = includeContext;
      state.aiSettings.temperature = 0.7;

      saveStateToStorage();
      if (window.supabaseClient) {
        dbSaveSettings("aiSettings", state.aiSettings);
      }
      syncAISettingsUI();
      showToast("AI Assistant configuration saved.", "success");
    });
  }

  const btnTestConn = document.getElementById("btn-test-ai-connection");
  if (btnTestConn) {
    btnTestConn.addEventListener("click", testAIConnection);
  }

  const providerSelect = document.getElementById("settings-ai-provider");
  if (providerSelect) {
    let prevProvider = providerSelect.value;
    providerSelect.addEventListener("focus", () => {
      prevProvider = providerSelect.value;
    });
    providerSelect.addEventListener("change", (e) => {
      const newProvider = e.target.value;
      const keyInput = document.getElementById("settings-ai-apikey");
      const currentRawKey = keyInput ? sanitizeApiKey(keyInput.value) : "";

      if (!state.aiSettings) state.aiSettings = {};

      // Save key for the previous provider
      if (prevProvider === "gemini") {
        state.aiSettings.geminiApiKey = currentRawKey;
      } else if (prevProvider === "openai") {
        state.aiSettings.openaiApiKey = currentRawKey;
      }

      state.aiSettings.provider = newProvider;

      // Restore key for the newly selected provider
      const nextKey = newProvider === "gemini"
        ? (state.aiSettings.geminiApiKey || "")
        : (state.aiSettings.openaiApiKey || "");

      if (keyInput) {
        keyInput.value = nextKey;
      }

      const defaultModel = newProvider === "gemini" ? "gemini-2.5-flash" : "gpt-4o-mini";
      updateAIProviderUI(newProvider, defaultModel);
      state.aiSettings.model = defaultModel;

      const errDetails = document.getElementById("ai-test-error-details");
      if (errDetails) {
        errDetails.style.display = "none";
        errDetails.innerHTML = "";
      }

      const statusBadge = document.getElementById("ai-test-status-badge");
      if (statusBadge) {
        statusBadge.textContent = nextKey ? "Ready to Test" : "API Key Required";
        statusBadge.className = nextKey ? "badge badge-active" : "badge badge-disputed";
      }

      prevProvider = newProvider;
    });
  }

  // Discover and fetch authorized models from provider API
  const btnFetchModels = document.getElementById("btn-fetch-ai-models");
  if (btnFetchModels) {
    btnFetchModels.addEventListener("click", discoverAndPopulateAIModels);
  }

  // Toggle API key visibility (show/hide password text)
  const btnToggleKeyVis = document.getElementById("btn-toggle-ai-key-vis");
  const keyInput = document.getElementById("settings-ai-apikey");
  const eyeIcon = document.getElementById("ai-key-eye-icon");
  if (btnToggleKeyVis && keyInput) {
    btnToggleKeyVis.addEventListener("click", () => {
      const isPassword = keyInput.type === "password";
      keyInput.type = isPassword ? "text" : "password";
      if (eyeIcon) {
        eyeIcon.className = isPassword ? "fa-solid fa-eye-slash" : "fa-solid fa-eye";
      }
    });
  }

  // Synchronize active provider key when typing or pasting without aggressive hijacking
  if (keyInput) {
    keyInput.addEventListener("input", (e) => {
      const raw = e.target.value;
      const curProvider = document.getElementById("settings-ai-provider") ? document.getElementById("settings-ai-provider").value : "gemini";
      if (!state.aiSettings) state.aiSettings = {};
      if (curProvider === "gemini") {
        state.aiSettings.geminiApiKey = sanitizeApiKey(raw);
      } else {
        state.aiSettings.openaiApiKey = sanitizeApiKey(raw);
      }
    });
  }
}
