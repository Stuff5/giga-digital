// GameVault AI Merchant Assistant Module
// Multi-provider intelligent co-pilot for digital game key merchants

let aiChatHistory = [];
let isAIGenerating = false;

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
  const modelSelect = document.getElementById("settings-ai-model");
  const baseUrlInput = document.getElementById("settings-ai-baseurl");
  const includeContextCheck = document.getElementById("settings-ai-include-context");
  const customBaseUrlGroup = document.getElementById("settings-ai-custom-url-group");

  const cfg = state.aiSettings || {
    provider: "gemini",
    apiKey: "",
    model: "gemini-1.5-flash",
    customBaseUrl: "https://api.openai.com/v1",
    includeContext: true
  };

  if (providerSelect) providerSelect.value = cfg.provider || "gemini";
  if (apiKeyInput) apiKeyInput.value = cfg.apiKey || "";
  if (modelSelect) modelSelect.value = cfg.model || "gemini-1.5-flash";
  if (baseUrlInput) baseUrlInput.value = cfg.customBaseUrl || "https://api.openai.com/v1";
  if (includeContextCheck) includeContextCheck.checked = cfg.includeContext !== false;

  // Toggle provider specific fields visibility
  if (customBaseUrlGroup) {
    customBaseUrlGroup.style.display = cfg.provider === "openai" ? "block" : "none";
  }

  // Update AI status label in drawer
  const statusLabel = document.getElementById("ai-drawer-provider-badge");
  if (statusLabel) {
    if (cfg.apiKey && cfg.apiKey.trim()) {
      statusLabel.textContent = cfg.provider === "gemini" ? "Gemini Active" : "OpenAI Active";
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
    const title = item.gameTitle || "Unknown Title";
    stockByGame[title] = (stockByGame[title] || 0) + 1;
    const plat = item.platform || "Other";
    stockByPlatform[plat] = (stockByPlatform[plat] || 0) + 1;
    const sup = item.source || "Direct/Unknown";
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
    const title = s.gameTitle || "Unknown";
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
      const t = k.gameTitle || "Unknown";
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
      const t = s.gameTitle || "Unknown";
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
  const model = cfg.model || "gemini-1.5-flash";
  const apiKey = cfg.apiKey.trim();
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

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

  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: contents,
      generationConfig: {
        temperature: cfg.temperature || 0.7,
        maxOutputTokens: 2048
      }
    })
  });

  if (!res.ok) {
    let errData = {};
    try { errData = await res.json(); } catch(e) {}
    const msg = (errData.error && errData.error.message) || `Gemini API error (HTTP ${res.status})`;
    throw new Error(msg);
  }

  const data = await res.json();
  if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts) {
    return data.candidates[0].content.parts.map(p => p.text).join("");
  }
  throw new Error("No text response received from Gemini API.");
}

// Call OpenAI or Compatible API
async function callOpenAIAPI(userQuery, appContext, cfg) {
  const baseUrl = (cfg.customBaseUrl || "https://api.openai.com/v1").replace(/\/+$/, "");
  const endpoint = `${baseUrl}/chat/completions`;
  const model = cfg.model || "gpt-4o-mini";
  const apiKey = cfg.apiKey.trim();

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

  const res = await fetch(endpoint, {
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

  if (!res.ok) {
    let errData = {};
    try { errData = await res.json(); } catch(e) {}
    const msg = (errData.error && errData.error.message) || `OpenAI API error (HTTP ${res.status})`;
    throw new Error(msg);
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

    if (cfg.apiKey && cfg.apiKey.trim()) {
      if (cfg.provider === "gemini") {
        assistantReply = await callGeminiAPI(text, appContext, cfg);
      } else {
        assistantReply = await callOpenAIAPI(text, appContext, cfg);
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
  if (!btn || !statusBadge) return;

  const providerSelect = document.getElementById("settings-ai-provider");
  const apiKeyInput = document.getElementById("settings-ai-apikey");
  const modelSelect = document.getElementById("settings-ai-model");
  const baseUrlInput = document.getElementById("settings-ai-baseurl");

  const provider = providerSelect ? providerSelect.value : "gemini";
  const apiKey = apiKeyInput ? apiKeyInput.value.trim() : "";
  const model = modelSelect ? modelSelect.value : "gemini-1.5-flash";
  const baseUrl = baseUrlInput ? baseUrlInput.value.trim() : "https://api.openai.com/v1";

  if (!apiKey) {
    statusBadge.textContent = "API Key Required";
    statusBadge.className = "badge badge-disputed";
    showToast("Please enter an API Key to test.", "warning");
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
      reply = await callGeminiAPI("Reply with 'OK' if connection is active.", "", testCfg);
    } else {
      reply = await callOpenAIAPI("Reply with 'OK' if connection is active.", "", testCfg);
    }

    statusBadge.textContent = "Connected & Verified ✓";
    statusBadge.className = "badge badge-active";
    showToast("AI Assistant connected successfully!", "success");

    state.aiSettings = {
      provider,
      apiKey,
      model,
      customBaseUrl: baseUrl,
      includeContext: document.getElementById("settings-ai-include-context") ? document.getElementById("settings-ai-include-context").checked : true,
      temperature: 0.7
    };
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
      const apiKey = document.getElementById("settings-ai-apikey") ? document.getElementById("settings-ai-apikey").value.trim() : "";
      const model = document.getElementById("settings-ai-model") ? document.getElementById("settings-ai-model").value : "gemini-1.5-flash";
      const baseUrl = document.getElementById("settings-ai-baseurl") ? document.getElementById("settings-ai-baseurl").value.trim() : "https://api.openai.com/v1";
      const includeContext = document.getElementById("settings-ai-include-context") ? document.getElementById("settings-ai-include-context").checked : true;

      state.aiSettings = {
        provider,
        apiKey,
        model,
        customBaseUrl: baseUrl,
        includeContext,
        temperature: 0.7
      };
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
    providerSelect.addEventListener("change", (e) => {
      const isGemini = e.target.value === "gemini";
      const customBaseUrlGroup = document.getElementById("settings-ai-custom-url-group");
      const modelSelect = document.getElementById("settings-ai-model");

      if (customBaseUrlGroup) {
        customBaseUrlGroup.style.display = isGemini ? "none" : "block";
      }

      if (modelSelect) {
        if (isGemini) {
          modelSelect.innerHTML = `
            <option value="gemini-1.5-flash">Gemini 1.5 Flash (Recommended - Fast & Free Tier)</option>
            <option value="gemini-2.0-flash">Gemini 2.0 Flash (Next-Gen Fast)</option>
            <option value="gemini-1.5-pro">Gemini 1.5 Pro (Deep Reasoning)</option>
          `;
        } else {
          modelSelect.innerHTML = `
            <option value="gpt-4o-mini">GPT-4o Mini (Recommended)</option>
            <option value="gpt-4o">GPT-4o (High Intelligence)</option>
            <option value="deepseek-chat">DeepSeek Chat</option>
            <option value="custom">Custom Model (Specified in Request)</option>
          `;
        }
      }
    });
  }
}
