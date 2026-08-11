// LLM Provider Configuration
// Centralized configuration for all AI translation providers and models

const llmProviders = {
    anthropic: {
        name: 'Anthropic (Claude)',
        keyPrefix: 'sk-ant-',
        storageKey: 'claudeApiKey',
        modelStorageKey: 'anthropicModel',
        models: [
            { id: 'claude-haiku-4-5-20251001', name: 'Claude Haiku 4.5 ($)' },
            { id: 'claude-sonnet-4-5-20250929', name: 'Claude Sonnet 4.5 ($$)' },
            { id: 'claude-opus-4-5-20251101', name: 'Claude Opus 4.5 ($$$)' }
        ],
        defaultModel: 'claude-sonnet-4-5-20250929'
    },
    openai: {
        name: 'OpenAI (GPT)',
        keyPrefix: 'sk-',
        storageKey: 'openaiApiKey',
        modelStorageKey: 'openaiModel',
        models: [
            { id: 'gpt-5.1-2025-11-13', name: 'GPT-5.1 ($$$)' },
            { id: 'gpt-5-mini-2025-08-07', name: 'GPT-5 Mini ($$)' },
            { id: 'gpt-5-nano-2025-08-07', name: 'GPT-5 Nano ($)' }
        ],
        defaultModel: 'gpt-5-mini-2025-08-07'
    },
    google: {
        name: 'Google (Gemini)',
        keyPrefix: 'AIza',
        storageKey: 'googleApiKey',
        modelStorageKey: 'googleModel',
        models: [
            { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash (Preview) ($$)' },
            { id: 'gemini-3-pro-preview', name: 'Gemini 3 Pro (Preview) ($$$)' },
            { id: 'gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash-Lite ($)' },
            { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash ($$)' },
            { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro ($$$)' }
        ],
        defaultModel: 'gemini-2.5-flash'
    },
    ollama: {
        name: 'Ollama (Local)',
        // No API key: keyPrefix/storageKey intentionally absent
        baseUrlStorageKey: 'ollamaUrl',
        defaultBaseUrl: 'http://localhost:11434',
        modelStorageKey: 'ollamaModel',
        models: [], // filled at runtime from GET /api/tags
        defaultModel: ''
    }
};

// Shown whenever the Ollama server can't be reached (not running, or CORS blocked).
const OLLAMA_CONNECT_HINT = 'Could not reach Ollama. Check that Ollama is running and that OLLAMA_ORIGINS allows this page.';

/**
 * Get the Ollama base URL (no trailing slash)
 * @returns {string}
 */
function getOllamaBaseUrl() {
    const saved = (localStorage.getItem(llmProviders.ollama.baseUrlStorageKey) || '').trim();
    return (saved || llmProviders.ollama.defaultBaseUrl).replace(/\/+$/, '');
}

/**
 * Call the Ollama HTTP API, mapping transport/CORS failures to a friendly error
 * @param {string} path - API path, e.g. '/api/tags'
 * @param {object} options - fetch options
 * @param {string|null} baseUrl - override base URL (defaults to the saved one)
 * @returns {Promise<object>} - parsed JSON response
 */
async function ollamaRequest(path, options = {}, baseUrl = null) {
    const url = (baseUrl ? baseUrl.trim().replace(/\/+$/, '') : getOllamaBaseUrl()) + path;

    let response;
    try {
        response = await fetch(url, options);
    } catch (error) {
        throw new Error(OLLAMA_CONNECT_HINT);
    }

    if (!response.ok) {
        if (response.status === 404) {
            throw new Error('Ollama returned 404. Check the server URL and that the model has been pulled.');
        }
        throw new Error(`Ollama request failed: ${response.status}`);
    }

    return response.json();
}

/**
 * List models installed on the Ollama server
 * @param {string|null} baseUrl - override base URL
 * @returns {Promise<string[]>} - model names
 */
async function fetchOllamaModels(baseUrl = null) {
    const data = await ollamaRequest('/api/tags', {}, baseUrl);
    return (data.models || []).map(model => model.name).filter(Boolean);
}

/**
 * Get the selected model for a provider
 * @param {string} provider - Provider key (anthropic, openai, google)
 * @returns {string} - Model ID
 */
function getSelectedModel(provider) {
    const config = llmProviders[provider];
    if (!config) return null;
    return localStorage.getItem(config.modelStorageKey) || config.defaultModel;
}

/**
 * Get the selected provider
 * @returns {string} - Provider key
 */
function getSelectedProvider() {
    return localStorage.getItem('aiProvider') || 'anthropic';
}

/**
 * Get API key for a provider
 * @param {string} provider - Provider key
 * @returns {string|null} - API key or null
 */
function getApiKey(provider) {
    const config = llmProviders[provider];
    if (!config) return null;
    return localStorage.getItem(config.storageKey);
}

/**
 * Validate API key format for a provider
 * @param {string} provider - Provider key
 * @param {string} key - API key to validate
 * @returns {boolean} - Whether key format is valid
 */
function validateApiKeyFormat(provider, key) {
    const config = llmProviders[provider];
    if (!config) return false;
    return key.startsWith(config.keyPrefix);
}

/**
 * Generate HTML options for model select dropdown
 * @param {string} provider - Provider key
 * @param {string} selectedModel - Currently selected model ID (optional)
 * @returns {string} - HTML string of option elements
 */
function generateModelOptions(provider, selectedModel = null) {
    const config = llmProviders[provider];
    if (!config) return '';

    const selected = selectedModel || getSelectedModel(provider);
    return config.models.map(model =>
        `<option value="${model.id}"${model.id === selected ? ' selected' : ''}>${model.name}</option>`
    ).join('\n');
}
