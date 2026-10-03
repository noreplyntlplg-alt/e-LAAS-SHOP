(function () {
    "use strict";

    var CONFIG = {
        API_URL: "https://script.google.com/macros/s/AKfycbw8gnDcBxWV8W-RFRvi1e-yZmpa03O3P8M2iX-QAAB93TLZDQHO_8qAPInSghM9mtZm/exec",
        SESSION_KEY: "privateFinanceSessionToken",
        USER_KEY: "privateFinanceCurrentUser",
        EXPIRES_KEY: "privateFinanceSessionExpiresAt",
        APP_NAME: "e-LAAS Private Finance",
        REQUEST_TIMEOUT: 30000,
        LOCALE: "th-TH",
        CURRENCY: "THB"
    };

    var state = {
        token: null,
        expiresAt: null,
        user: null,
        bootstrap: null,
        settings: [],
        accounts: [],
        categories: [],
        customers: [],
        vendors: [],
        users: [],
        documents: [],
        currentPage: "dashboard",
        initialized: false,
        loginRunning: false,
        apiRunning: false,
        modalOpen: false,
        editingId: null,
        currentEntity: null,
        currentRows: [],
        dashboardData: null,
        reportData: null,
        filters: {}
    };

    function getElement(id) {
        return document.getElementById(id);
    }

    function query(selector, root) {
        var base = root || document;
        return base.querySelector(selector);
    }

    function queryAll(selector, root) {
        var base = root || document;
        return Array.prototype.slice.call(base.querySelectorAll(selector));
    }

    function trimValue(value) {
        if (value === null || value === undefined) {
            return "";
        }
        return String(value).trim();
    }

    function escapeHtml(value) {
        var text = value === null || value === undefined ? "" : String(value);

        return text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function parseMaybeJson(value) {
        if (value === null || value === undefined) {
            return value;
        }

        if (typeof value !== "string") {
            return value;
        }

        var text = value.trim();

        if (!text) {
            return value;
        }

        try {
            return JSON.parse(text);
        } catch (error) {
            return value;
        }
    }

    function getStorage() {
        try {
            return window.localStorage;
        } catch (error) {
            return null;
        }
    }

    function getSessionStorage() {
        try {
            return window.sessionStorage;
        } catch (error) {
            return null;
        }
    }

    function storageGet(key) {
        var storage = getStorage();

        if (storage) {
            try {
                var value = storage.getItem(key);

                if (value !== null && value !== "") {
                    return value;
                }
            } catch (error) {
            }
        }

        var sessionStorage = getSessionStorage();

        if (sessionStorage) {
            try {
                return sessionStorage.getItem(key);
            } catch (error2) {
            }
        }

        return null;
    }

    function storageSet(key, value) {
        var storage = getStorage();

        if (storage) {
            try {
                storage.setItem(key, String(value));
                return true;
            } catch (error) {
            }
        }

        var sessionStorage = getSessionStorage();

        if (sessionStorage) {
            try {
                sessionStorage.setItem(key, String(value));
                return true;
            } catch (error2) {
            }
        }

        return false;
    }

    function storageRemove(key) {
        var storage = getStorage();

        if (storage) {
            try {
                storage.removeItem(key);
            } catch (error) {
            }
        }

        var sessionStorage = getSessionStorage();

        if (sessionStorage) {
            try {
                sessionStorage.removeItem(key);
            } catch (error2) {
            }
        }
    }

    function getApiUrl() {
        var url = CONFIG.API_URL;

        if (
            window.APP_CONFIG &&
            typeof window.APP_CONFIG === "object" &&
            window.APP_CONFIG.API_URL
        ) {
            url = window.APP_CONFIG.API_URL;
        }

        if (!url || url === "YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL") {
            var html = document.documentElement;

            if (html) {
                var dataUrl = html.getAttribute("data-api-url");

                if (dataUrl) {
                    url = dataUrl;
                }
            }
        }

        if ((!url || url === "YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL") && document.body) {
            var bodyUrl = document.body.getAttribute("data-api-url");

            if (bodyUrl) {
                url = bodyUrl;
            }
        }

        return trimValue(url);
    }

    function normalizeResponse(raw) {
        var value = parseMaybeJson(raw);

        if (value && typeof value === "object") {
            if (value.body !== undefined) {
                var body = parseMaybeJson(value.body);

                if (body && typeof body === "object") {
                    return body;
                }
            }

            if (value.response !== undefined) {
                var response = parseMaybeJson(value.response);

                if (response && typeof response === "object") {
                    return response;
                }
            }

            if (value.result !== undefined) {
                var result = parseMaybeJson(value.result);

                if (result && typeof result === "object") {
                    if (
                        value.success !== undefined ||
                        value.ok !== undefined ||
                        value.status !== undefined
                    ) {
                        var mergedResult = {};
                        Object.keys(value).forEach(function (key) {
                            if (key !== "result") {
                                mergedResult[key] = value[key];
                            }
                        });
                        mergedResult.data = result;
                        return mergedResult;
                    }

                    return result;
                }
            }

            if (value.data !== undefined) {
                var data = parseMaybeJson(value.data);

                if (data && typeof data === "object") {
                    if (
                        value.success !== undefined ||
                        value.ok !== undefined ||
                        value.status !== undefined ||
                        value.message !== undefined
                    ) {
                        var mergedData = {};
                        Object.keys(value).forEach(function (key) {
                            if (key !== "data") {
                                mergedData[key] = value[key];
                            }
                        });
                        mergedData.data = data;
                        return mergedData;
                    }

                    return data;
                }
            }
        }

        return value;
    }

    function responseIsSuccess(response) {
        var data = normalizeResponse(response);

        if (!data) {
            return false;
        }

        if (data.success === true) {
            return true;
        }

        if (data.ok === true) {
            return true;
        }

        if (data.status === "success") {
            return true;
        }

        if (data.status === "ok") {
            return true;
        }

        if (data.success === false) {
            return false;
        }

        if (data.ok === false) {
            return false;
        }

        if (data.error) {
            return false;
        }

        return true;
    }

    function getResponseMessage(response) {
        var data = normalizeResponse(response);

        if (!data) {
            return "";
        }

        if (data.message) {
            return String(data.message);
        }

        if (data.error) {
            if (typeof data.error === "string") {
                return data.error;
            }

            if (data.error.message) {
                return String(data.error.message);
            }
        }

        return "";
    }

    function extractToken(response) {
        var data = normalizeResponse(response);

        if (!data || typeof data !== "object") {
            return null;
        }

        if (data.token) {
            return String(data.token);
        }

        if (data.sessionToken) {
            return String(data.sessionToken);
        }

        if (data.accessToken) {
            return String(data.accessToken);
        }

        if (data.sessionId) {
            return String(data.sessionId);
        }

        if (data.data && typeof data.data === "object") {
            if (data.data.token) {
                return String(data.data.token);
            }

            if (data.data.sessionToken) {
                return String(data.data.sessionToken);
            }

            if (data.data.accessToken) {
                return String(data.data.accessToken);
            }

            if (data.data.sessionId) {
                return String(data.data.sessionId);
            }
        }

        if (data.result && typeof data.result === "object") {
            if (data.result.token) {
                return String(data.result.token);
            }

            if (data.result.sessionToken) {
                return String(data.result.sessionToken);
            }

            if (data.result.accessToken) {
                return String(data.result.accessToken);
            }

            if (data.result.sessionId) {
                return String(data.result.sessionId);
            }
        }

        return null;
    }

    function extractExpiresAt(response) {
        var data = normalizeResponse(response);

        if (!data || typeof data !== "object") {
            return null;
        }

        if (data.expiresAt) {
            return data.expiresAt;
        }

        if (data.data && typeof data.data === "object" && data.data.expiresAt) {
            return data.data.expiresAt;
        }

        if (data.result && typeof data.result === "object" && data.result.expiresAt) {
            return data.result.expiresAt;
        }

        return null;
    }

    function extractUser(response) {
        var data = normalizeResponse(response);

        if (!data || typeof data !== "object") {
            return null;
        }

        if (data.user && typeof data.user === "object") {
            return data.user;
        }

        if (data.data && typeof data.data === "object") {
            if (data.data.user && typeof data.data.user === "object") {
                return data.data.user;
            }

            if (
                data.data.username ||
                data.data.fullName ||
                data.data.role
            ) {
                return data.data;
            }
        }

        if (data.result && typeof data.result === "object") {
            if (data.result.user && typeof data.result.user === "object") {
                return data.result.user;
            }
        }

        return null;
    }

    function isUnauthorized(responseOrError) {
        var message = "";

        if (responseOrError) {
            if (responseOrError.message) {
                message += " " + String(responseOrError.message);
            }

            if (responseOrError.code) {
                message += " " + String(responseOrError.code);
            }

            if (responseOrError.status) {
                message += " " + String(responseOrError.status);
            }

            if (typeof responseOrError === "object") {
                message += " " + getResponseMessage(responseOrError);
            }
        }

        message = message.toLowerCase();

        if (message.indexOf("unauthorized") >= 0) {
            return true;
        }

        if (message.indexOf("invalid token") >= 0) {
            return true;
        }

        if (message.indexOf("session expired") >= 0) {
            return true;
        }

        if (message.indexOf("หมดอายุ") >= 0) {
            return true;
        }

        if (message.indexOf("เข้าสู่ระบบ") >= 0 && message.indexOf("token") >= 0) {
            return true;
        }

        if (responseOrError && responseOrError.status === 401) {
            return true;
        }

        return false;
    }

    function createApiError(message, status, raw) {
        var error = new Error(message || "เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์");
        error.status = status || 0;
        error.raw = raw || null;
        error.code = raw && raw.code ? raw.code : "";
        return error;
    }

    function fetchWithTimeout(url, options) {
        var controller = null;
        var timeoutId = null;

        if (window.AbortController) {
            controller = new AbortController();
            options.signal = controller.signal;
        }

        var promise = fetch(url, options);

        if (controller) {
            var timeoutPromise = new Promise(function (resolve, reject) {
                timeoutId = window.setTimeout(function () {
                    try {
                        controller.abort();
                    } catch (error) {
                    }

                    reject(createApiError(
                        "การเชื่อมต่อใช้เวลานานเกินกำหนด",
                        408,
                        null
                    ));
                }, CONFIG.REQUEST_TIMEOUT);
            });

            return Promise.race([
                promise,
                timeoutPromise
            ]).finally(function () {
                if (timeoutId) {
                    window.clearTimeout(timeoutId);
                }
            });
        }

        return promise;
    }

    function buildJsonRequest(action, payload, includeToken) {
        var request = {};

        request.action = action;

        if (includeToken && state.token) {
            request.token = state.token;
        }

        if (payload && typeof payload === "object") {
            Object.keys(payload).forEach(function (key) {
                request[key] = payload[key];
            });
        }

        return request;
    }

    function buildFormBody(request) {
        var params = new URLSearchParams();

        Object.keys(request).forEach(function (key) {
            var value = request[key];

            if (value === null || value === undefined) {
                params.set(key, "");
                return;
            }

            if (typeof value === "object") {
                params.set(key, JSON.stringify(value));
                return;
            }

            params.set(key, String(value));
        });

        return params.toString();
    }

    function apiRequest(action, payload, options) {
        var requestOptions = options || {};
        var includeToken = requestOptions.includeToken !== false;
        var request = buildJsonRequest(action, payload || {}, includeToken);
        var apiUrl = getApiUrl();

        if (!apiUrl) {
            return Promise.reject(
                createApiError(
                    "ยังไม่ได้กำหนด URL ของ Google Apps Script Web App",
                    0,
                    null
                )
            );
        }

        state.apiRunning = true;

        var fetchOptions = {
            method: "POST",
            headers: {
                "Content-Type": "text/plain;charset=UTF-8",
                "Accept": "application/json,text/plain,*/*"
            },
            body: JSON.stringify(request),
            redirect: "follow",
            cache: "no-store"
        };

        return fetchWithTimeout(apiUrl, fetchOptions)
            .then(function (response) {
                var status = response.status;

                return response.text().then(function (text) {
                    var parsed = parseMaybeJson(text);
                    var normalized = normalizeResponse(parsed);

                    if (!response.ok) {
                        var httpMessage = getResponseMessage(normalized);

                        if (!httpMessage) {
                            httpMessage = "เซิร์ฟเวอร์ตอบกลับ HTTP " + status;
                        }

                        throw createApiError(
                            httpMessage,
                            status,
                            normalized
                        );
                    }

                    if (
                        normalized &&
                        typeof normalized === "object" &&
                        responseIsSuccess(normalized) === false
                    ) {
                        throw createApiError(
                            getResponseMessage(normalized) || "คำขอไม่สำเร็จ",
                            status,
                            normalized
                        );
                    }

                    return normalized;
                });
            })
            .catch(function (error) {
                var canRetryAsForm =
                    action === "login" ||
                    action === "ping" ||
                    action === "me" ||
                    action === "bootstrap" ||
                    action === "dashboard" ||
                    action === "report" ||
                    action === "list" ||
                    action === "get" ||
                    action === "settings" ||
                    action === "auditlogs" ||
                    action === "getRecentTransactions" ||
                    action === "getDocumentWithItems";

                if (!canRetryAsForm) {
                    throw error;
                }

                var formOptions = {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
                        "Accept": "application/json,text/plain,*/*"
                    },
                    body: buildFormBody(request),
                    redirect: "follow",
                    cache: "no-store"
                };

                return fetchWithTimeout(apiUrl, formOptions)
                    .then(function (response) {
                        var status = response.status;

                        return response.text().then(function (text) {
                            var parsed = parseMaybeJson(text);
                            var normalized = normalizeResponse(parsed);

                            if (!response.ok) {
                                var message = getResponseMessage(normalized);

                                if (!message) {
                                    message = "เซิร์ฟเวอร์ตอบกลับ HTTP " + status;
                                }

                                throw createApiError(
                                    message,
                                    status,
                                    normalized
                                );
                            }

                            if (
                                normalized &&
                                typeof normalized === "object" &&
                                responseIsSuccess(normalized) === false
                            ) {
                                throw createApiError(
                                    getResponseMessage(normalized) || "คำขอไม่สำเร็จ",
                                    status,
                                    normalized
                                );
                            }

                            return normalized;
                        });
                    });
            })
            .finally(function () {
                state.apiRunning = false;
            });
    }

    function saveSession(token, expiresAt, user) {
        state.token = token || null;
        state.expiresAt = expiresAt || null;
        state.user = user || null;

        if (token) {
            storageSet(CONFIG.SESSION_KEY, token);
        }

        if (expiresAt) {
            storageSet(CONFIG.EXPIRES_KEY, expiresAt);
        }

        if (user) {
            try {
                storageSet(CONFIG.USER_KEY, JSON.stringify(user));
            } catch (error) {
            }
        }
    }

    function loadStoredSession() {
        var token = storageGet(CONFIG.SESSION_KEY);
        var expiresAt = storageGet(CONFIG.EXPIRES_KEY);
        var userText = storageGet(CONFIG.USER_KEY);
        var user = null;

        if (userText) {
            try {
                user = JSON.parse(userText);
            } catch (error) {
                user = null;
            }
        }

        state.token = token || null;
        state.expiresAt = expiresAt || null;
        state.user = user;

        return token;
    }

    function clearSession() {
        state.token = null;
        state.expiresAt = null;
        state.user = null;

        storageRemove(CONFIG.SESSION_KEY);
        storageRemove(CONFIG.EXPIRES_KEY);
        storageRemove(CONFIG.USER_KEY);
    }

    function setElementVisible(element, visible) {
        if (!element) {
            return;
        }

        if (visible) {
            element.classList.remove("hidden");
            element.removeAttribute("hidden");
            element.style.display = "";
        } else {
            element.classList.add("hidden");
            element.setAttribute("hidden", "hidden");
            element.style.display = "none";
        }
    }

    function showLoginScreen() {
        var loginScreen = getElement("loginScreen");
        var appShell = getElement("appShell");
        var loginPage = getElement("loginPage");
        var app = getElement("app");

        if (loginScreen) {
            setElementVisible(loginScreen, true);
        }

        if (loginPage) {
            setElementVisible(loginPage, true);
        }

        if (appShell) {
            setElementVisible(appShell, false);
        }

        if (app) {
            setElementVisible(app, false);
        }
    }

    function showApplication() {
        var loginScreen = getElement("loginScreen");
        var appShell = getElement("appShell");
        var loginPage = getElement("loginPage");
        var app = getElement("app");

        if (loginScreen) {
            setElementVisible(loginScreen, false);
        }

        if (loginPage) {
            setElementVisible(loginPage, false);
        }

        if (appShell) {
            setElementVisible(appShell, true);
        }

        if (app) {
            setElementVisible(app, true);
        }

        document.body.classList.add("authenticated");
        document.body.classList.remove("unauthenticated");
    }

    function showUnauthenticated() {
        document.body.classList.remove("authenticated");
        document.body.classList.add("unauthenticated");
        showLoginScreen();
    }

    function setLoading(element, loading, loadingText) {
        if (!element) {
            return;
        }

        if (loading) {
            if (!element.dataset.originalText) {
                element.dataset.originalText = element.innerHTML;
            }

            element.disabled = true;
            element.setAttribute("aria-busy", "true");

            element.innerHTML =
                '<span class="login-spinner" aria-hidden="true"></span>' +
                escapeHtml(loadingText || "กำลังดำเนินการ");
        } else {
            element.disabled = false;
            element.removeAttribute("aria-busy");

            if (element.dataset.originalText) {
                element.innerHTML = element.dataset.originalText;
                delete element.dataset.originalText;
            }
        }
    }

    function ensureToastContainer() {
        var container = getElement("toastContainer");

        if (container) {
            return container;
        }

        container = document.createElement("div");
        container.id = "toastContainer";
        container.className = "toast-container";
        document.body.appendChild(container);

        return container;
    }

    function showToast(message, type) {
        var container = ensureToastContainer();
        var toast = document.createElement("div");

        toast.className = "toast toast-" + (type || "info");
        toast.setAttribute("role", "alert");

        toast.innerHTML =
            '<div class="toast-message">' +
            escapeHtml(message || "") +
            "</div>";

        container.appendChild(toast);

        window.setTimeout(function () {
            toast.classList.add("toast-hide");

            window.setTimeout(function () {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, 3500);
    }

    function confirmAction(message) {
        return Promise.resolve(window.confirm(message || "ยืนยันการดำเนินการหรือไม่"));
    }

    function formatMoney(value) {
        var number = Number(value);

        if (!isFinite(number)) {
            number = 0;
        }

        return number.toLocaleString(CONFIG.LOCALE, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }

    function formatNumber(value) {
        var number = Number(value);

        if (!isFinite(number)) {
            number = 0;
        }

        return number.toLocaleString(CONFIG.LOCALE);
    }

    function parseNumber(value) {
        if (typeof value === "number") {
            return isFinite(value) ? value : 0;
        }

        var text = trimValue(value)
            .replace(/,/g, "")
            .replace(/บาท/g, "");

        if (!text) {
            return 0;
        }

        var number = Number(text);

        return isFinite(number) ? number : 0;
    }

    function formatDate(value) {
        if (!value) {
            return "";
        }

        var date = new Date(value);

        if (isNaN(date.getTime())) {
            return String(value);
        }

        return date.toLocaleDateString(CONFIG.LOCALE, {
            year: "numeric",
            month: "2-digit",
            day: "2-digit"
        });
    }

    function inputDate(value) {
        if (!value) {
            var now = new Date();
            var year = now.getFullYear();
            var month = String(now.getMonth() + 1).padStart(2, "0");
            var day = String(now.getDate()).padStart(2, "0");
            return year + "-" + month + "-" + day;
        }

        var date = new Date(value);

        if (isNaN(date.getTime())) {
            return String(value).substring(0, 10);
        }

        var yearValue = date.getFullYear();
        var monthValue = String(date.getMonth() + 1).padStart(2, "0");
        var dayValue = String(date.getDate()).padStart(2, "0");

        return yearValue + "-" + monthValue + "-" + dayValue;
    }

    function todayDate() {
        return inputDate(new Date());
    }

    function createId() {
        var time = Date.now().toString(36);
        var random = Math.random().toString(36).substring(2, 12);
        return time + random;
    }

    function getValue(object, keys, fallback) {
        if (!object || typeof object !== "object") {
            return fallback;
        }

        for (var i = 0; i < keys.length; i += 1) {
            var key = keys[i];

            if (
                object[key] !== undefined &&
                object[key] !== null &&
                object[key] !== ""
            ) {
                return object[key];
            }
        }

        return fallback;
    }

    function normalizeArray(value) {
        if (!value) {
            return [];
        }

        if (Array.isArray(value)) {
            return value;
        }

        if (typeof value === "object") {
            if (Array.isArray(value.rows)) {
                return value.rows;
            }

            if (Array.isArray(value.items)) {
                return value.items;
            }

            if (Array.isArray(value.data)) {
                return value.data;
            }

            if (Array.isArray(value.results)) {
                return value.results;
            }
        }

        return [];
    }

    function findById(array, id) {
        var wanted = trimValue(id);

        for (var i = 0; i < array.length; i += 1) {
            var item = array[i];

            if (trimValue(item.id) === wanted) {
                return item;
            }
        }

        return null;
    }

    function normalizeBootstrap(data) {
        var source = normalizeResponse(data);

        if (!source || typeof source !== "object") {
            return {};
        }

        var result = source.data && typeof source.data === "object"
            ? source.data
            : source;

        return result;
    }

    function applyBootstrap(data) {
        var source = normalizeBootstrap(data);

        state.bootstrap = source;

        state.settings = normalizeArray(
            getValue(source, ["settings", "setting"], [])
        );

        state.accounts = normalizeArray(
            getValue(source, ["accounts", "bankAccounts"], [])
        );

        state.categories = normalizeArray(
            getValue(source, ["categories"], [])
        );

        state.customers = normalizeArray(
            getValue(source, ["customers", "customer"], [])
        );

        state.vendors = normalizeArray(
            getValue(source, ["vendors", "suppliers"], [])
        );

        state.users = normalizeArray(
            getValue(source, ["users"], [])
        );

        state.documents = normalizeArray(
            getValue(source, ["documents"], [])
        );

        var bootstrapUser = getValue(source, ["user", "currentUser"], null);

        if (bootstrapUser && typeof bootstrapUser === "object") {
            state.user = bootstrapUser;
            storageSet(CONFIG.USER_KEY, JSON.stringify(bootstrapUser));
        }

        renderUserInformation();
        renderPermissionUI();
    }

    function renderUserInformation() {
        var name = "";

        if (state.user) {
            name = getValue(
                state.user,
                ["fullName", "name", "username"],
                "ผู้ใช้งาน"
            );
        }

        var username = state.user
            ? getValue(state.user, ["username"], "")
            : "";

        var role = state.user
            ? getValue(state.user, ["role"], "")
            : "";

        var elements = [
            getElement("userDisplayName"),
            getElement("currentUserName"),
            getElement("profileName")
        ];

        elements.forEach(function (element) {
            if (element) {
                element.textContent = name;
            }
        });

        var usernameElements = [
            getElement("userUsername"),
            getElement("currentUsername"),
            getElement("profileUsername")
        ];

        usernameElements.forEach(function (element) {
            if (element) {
                element.textContent = username;
            }
        });

        var roleElements = [
            getElement("userRole"),
            getElement("currentUserRole"),
            getElement("profileRole")
        ];

        roleElements.forEach(function (element) {
            if (element) {
                element.textContent = role;
            }
        });
    }

    function isAdmin() {
        if (!state.user) {
            return false;
        }

        var role = trimValue(
            getValue(state.user, ["role"], "")
        ).toLowerCase();

        return (
            role === "admin" ||
            role === "administrator" ||
            role === "ผู้ดูแลระบบ" ||
            role === "ผู้ดูแล"
        );
    }

    function renderPermissionUI() {
        var protectedSelectors = [
            '[data-admin-only]',
            '[data-role="admin"]'
        ];

        protectedSelectors.forEach(function (selector) {
            queryAll(selector).forEach(function (element) {
                setElementVisible(element, isAdmin());
            });
        });
    }

    function bindLoginForm() {
        var form = getElement("loginForm");
        var button = getElement("loginButton");

        if (!form) {
            return;
        }

        form.addEventListener(
            "submit",
            function (event) {
                event.preventDefault();
                event.stopPropagation();
                event.stopImmediatePropagation();
                event.returnValue = false;

                handleLogin();

                return false;
            },
            true
        );

        if (button) {
            button.addEventListener(
                "click",
                function (event) {
                    event.preventDefault();
                    event.stopPropagation();
                    event.stopImmediatePropagation();
                    event.returnValue = false;

                    if (!state.loginRunning) {
                        handleLogin();
                    }

                    return false;
                },
                true
            );
        }

        form.setAttribute("novalidate", "novalidate");
    }

    function getLoginUsername() {
        var element = getElement("loginUsername");

        if (element) {
            return trimValue(element.value);
        }

        var namedElement = query('#loginForm input[name="username"]');

        if (namedElement) {
            return trimValue(namedElement.value);
        }

        return "";
    }

    function getLoginPassword() {
        var element = getElement("loginPassword");

        if (element) {
            return element.value || "";
        }

        var namedElement = query('#loginForm input[name="password"]');

        if (namedElement) {
            return namedElement.value || "";
        }

        return "";
    }

    function handleLogin() {
        if (state.loginRunning) {
            return;
        }

        var username = getLoginUsername();
        var password = getLoginPassword();

        if (!username) {
            showToast("กรุณากรอกชื่อผู้ใช้", "warning");

            var usernameInput = getElement("loginUsername");

            if (usernameInput) {
                usernameInput.focus();
            }

            return;
        }

        if (!password) {
            showToast("กรุณากรอกรหัสผ่าน", "warning");

            var passwordInput = getElement("loginPassword");

            if (passwordInput) {
                passwordInput.focus();
            }

            return;
        }

        var button = getElement("loginButton");

        state.loginRunning = true;
        setLoading(button, true, "กำลังเข้าสู่ระบบ");

        apiRequest(
            "login",
            {
                username: username,
                password: password
            },
            {
                includeToken: false
            }
        )
            .then(function (response) {
                var token = extractToken(response);
                var expiresAt = extractExpiresAt(response);
                var user = extractUser(response);

                if (!responseIsSuccess(response)) {
                    throw createApiError(
                        getResponseMessage(response) || "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง",
                        401,
                        response
                    );
                }

                if (!token) {
                    throw createApiError(
                        "เข้าสู่ระบบสำเร็จ แต่ Google Apps Script ไม่ได้ส่ง Session Token กลับมา",
                        500,
                        response
                    );
                }

                saveSession(token, expiresAt, user);

                showApplication();

                return apiRequest(
                    "bootstrap",
                    {},
                    {
                        includeToken: true
                    }
                );
            })
            .then(function (bootstrapResponse) {
                applyBootstrap(bootstrapResponse);

                showApplication();

                showToast("เข้าสู่ระบบสำเร็จ", "success");

                return navigate("dashboard");
            })
            .catch(function (error) {
                if (isUnauthorized(error)) {
                    clearSession();
                    showUnauthenticated();
                }

                var message = error && error.message
                    ? error.message
                    : "เข้าสู่ระบบไม่สำเร็จ";

                showToast(message, "error");
            })
            .finally(function () {
                state.loginRunning = false;
                setLoading(button, false);
            });
    }

    function logout() {
        var currentToken = state.token;

        clearSession();
        showUnauthenticated();

        if (currentToken) {
            apiRequest(
                "logout",
                {},
                {
                    includeToken: true
                }
            ).catch(function () {
            });
        }

        showToast("ออกจากระบบแล้ว", "success");
    }

    function bindLogout() {
        queryAll(
            "#logoutButton, #logoutBtn, [data-action='logout']"
        ).forEach(function (button) {
            button.addEventListener("click", function (event) {
                event.preventDefault();
                logout();
            });
        });
    }

    function restoreSession() {
        var token = loadStoredSession();

        if (!token) {
            showUnauthenticated();
            return Promise.resolve(false);
        }

        showApplication();

        return apiRequest(
            "me",
            {},
            {
                includeToken: true
            }
        )
            .then(function (response) {
                var user = extractUser(response);

                if (user) {
                    state.user = user;
                    storageSet(CONFIG.USER_KEY, JSON.stringify(user));
                }

                return apiRequest(
                    "bootstrap",
                    {},
                    {
                        includeToken: true
                    }
                );
            })
            .then(function (bootstrapResponse) {
                applyBootstrap(bootstrapResponse);
                showApplication();
                return navigate("dashboard");
            })
            .then(function () {
                return true;
            })
            .catch(function (error) {
                if (isUnauthorized(error)) {
                    clearSession();
                    showUnauthenticated();
                    return false;
                }

                showApplication();
                showToast(
                    error.message || "ไม่สามารถโหลดข้อมูลระบบได้",
                    "error"
                );

                return true;
            });
    }

    function bindNavigation() {
        document.addEventListener("click", function (event) {
            var target = event.target;

            if (!target) {
                return;
            }

            var link = target.closest
                ? target.closest("[data-page]")
                : null;

            if (!link) {
                return;
            }

            if (
                link.id === "loginButton" ||
                link.closest("#loginForm")
            ) {
                return;
            }

            var page = link.getAttribute("data-page");

            if (!page) {
                return;
            }

            event.preventDefault();

            navigate(page);
        });
    }

    function setActiveNavigation(page) {
        queryAll("[data-page]").forEach(function (element) {
            var itemPage = element.getAttribute("data-page");

            if (itemPage === page) {
                element.classList.add("active");
                element.setAttribute("aria-current", "page");
            } else {
                element.classList.remove("active");
                element.removeAttribute("aria-current");
            }
        });
    }

    function showPageSection(page) {
        var sections = queryAll(
            "[data-page-section], .page-section, section[id^='page-']"
        );

        sections.forEach(function (section) {
            var sectionPage = section.getAttribute("data-page-section");

            if (!sectionPage && section.id) {
                sectionPage = section.id.replace(/^page-/, "");
            }

            if (sectionPage === page) {
                setElementVisible(section, true);
            } else if (sectionPage) {
                setElementVisible(section, false);
            }
        });

        var exact = getElement("page-" + page);

        if (exact) {
            setElementVisible(exact, true);
        }
    }

    function setPageTitle(page) {
        var titles = {
            dashboard: "แดชบอร์ด",
            income: "รายรับ",
            expense: "รายจ่าย",
            transfers: "โอนเงินระหว่างบัญชี",
            accounts: "เงินสด / ธนาคาร",
            customers: "ลูกค้า",
            vendors: "ผู้จำหน่าย / เจ้าหนี้",
            documents: "ทะเบียนเอกสาร",
            users: "ผู้ใช้งานและสิทธิ์",
            settings: "ตั้งค่ากิจการ",
            auditlogs: "Audit Log",
            reports: "รายงาน"
        };

        var title = titles[page] || "แดชบอร์ด";

        var elements = [
            getElement("pageTitle"),
            getElement("contentTitle"),
            getElement("currentPageTitle")
        ];

        elements.forEach(function (element) {
            if (element) {
                element.textContent = title;
            }
        });

        document.title = title + " | " + CONFIG.APP_NAME;
    }

    function navigate(page) {
        if (!state.token) {
            showUnauthenticated();
            return Promise.resolve(false);
        }

        if (!page) {
            page = "dashboard";
        }

        state.currentPage = page;

        setActiveNavigation(page);
        showPageSection(page);
        setPageTitle(page);

        if (page === "dashboard") {
            return loadDashboard();
        }

        if (page === "income") {
            return loadEntityPage("income");
        }

        if (page === "expense") {
            return loadEntityPage("expense");
        }

        if (page === "transfers") {
            return loadEntityPage("transfers");
        }

        if (page === "accounts") {
            return loadEntityPage("accounts");
        }

        if (page === "customers") {
            return loadEntityPage("customers");
        }

        if (page === "vendors") {
            return loadEntityPage("vendors");
        }

        if (page === "documents") {
            return loadEntityPage("documents");
        }

        if (page === "users") {
            if (!isAdmin()) {
                showToast("คุณไม่มีสิทธิ์เข้าถึงหน้านี้", "error");
                return Promise.resolve(false);
            }

            return loadEntityPage("users");
        }

        if (page === "settings") {
            if (!isAdmin()) {
                showToast("คุณไม่มีสิทธิ์เข้าถึงหน้านี้", "error");
                return Promise.resolve(false);
            }

            return loadSettings();
        }

        if (page === "auditlogs") {
            if (!isAdmin()) {
                showToast("คุณไม่มีสิทธิ์เข้าถึงหน้านี้", "error");
                return Promise.resolve(false);
            }

            return loadAuditLogs();
        }

        if (page === "reports") {
            return loadReports();
        }

        return Promise.resolve(true);
    }

    function findPageContainer(page) {
        var candidates = [
            "page-" + page,
            page + "Page",
            page + "Container",
            page + "TableContainer",
            page + "List"
        ];

        for (var i = 0; i < candidates.length; i += 1) {
            var element = getElement(candidates[i]);

            if (element) {
                return element;
            }
        }

        var dataContainer = query(
            '[data-page-container="' + page + '"]'
        );

        if (dataContainer) {
            return dataContainer;
        }

        return null;
    }

    function findTableContainer(page) {
        var pageContainer = findPageContainer(page);

        if (pageContainer) {
            var table = pageContainer.querySelector("[data-table-container]");

            if (table) {
                return table;
            }

            var tbody = pageContainer.querySelector("tbody");

            if (tbody) {
                return tbody.closest("table");
            }
        }

        var global = query(
            '[data-table-for="' + page + '"]'
        );

        if (global) {
            return global;
        }

        return null;
    }

    function setContainerHtml(container, html) {
        if (!container) {
            return;
        }

        container.innerHTML = html;
    }

    function getEntityConfig(entity) {
        var configs = {
            income: {
                title: "รายรับ",
                action: "list",
                addAction: "add-income",
                columns: [
                    ["date", "วันที่"],
                    ["docNo", "เลขที่เอกสาร"],
                    ["description", "รายการ"],
                    ["accountName", "บัญชี"],
                    ["amount", "จำนวนเงิน"],
                    ["paymentMethod", "วิธีรับเงิน"]
                ]
            },
            expense: {
                title: "รายจ่าย",
                action: "list",
                addAction: "add-expense",
                columns: [
                    ["date", "วันที่"],
                    ["docNo", "เลขที่เอกสาร"],
                    ["description", "รายการ"],
                    ["accountName", "บัญชี"],
                    ["amount", "จำนวนเงิน"],
                    ["paymentMethod", "วิธีจ่ายเงิน"]
                ]
            },
            transfers: {
                title: "โอนเงินระหว่างบัญชี",
                action: "list",
                addAction: "add-transfer",
                columns: [
                    ["date", "วันที่"],
                    ["docNo", "เลขที่เอกสาร"],
                    ["fromAccountName", "จากบัญชี"],
                    ["toAccountName", "ไปบัญชี"],
                    ["amount", "จำนวนเงิน"],
                    ["description", "รายละเอียด"]
                ]
            },
            accounts: {
                title: "เงินสด / ธนาคาร",
                action: "list",
                addAction: "add-account",
                columns: [
                    ["code", "รหัส"],
                    ["name", "ชื่อบัญชี"],
                    ["type", "ประเภท"],
                    ["openingBalance", "ยอดยกมา"],
                    ["active", "สถานะ"]
                ]
            },
            customers: {
                title: "ลูกค้า",
                action: "list",
                addAction: "add-customer",
                columns: [
                    ["code", "รหัส"],
                    ["name", "ชื่อลูกค้า"],
                    ["taxId", "เลขผู้เสียภาษี"],
                    ["phone", "โทรศัพท์"],
                    ["email", "อีเมล"],
                    ["active", "สถานะ"]
                ]
            },
            vendors: {
                title: "ผู้จำหน่าย / เจ้าหนี้",
                action: "list",
                addAction: "add-vendor",
                columns: [
                    ["code", "รหัส"],
                    ["name", "ชื่อผู้จำหน่าย"],
                    ["taxId", "เลขผู้เสียภาษี"],
                    ["phone", "โทรศัพท์"],
                    ["email", "อีเมล"],
                    ["active", "สถานะ"]
                ]
            },
            documents: {
                title: "ทะเบียนเอกสาร",
                action: "list",
                addAction: "add-document",
                columns: [
                    ["date", "วันที่"],
                    ["docNo", "เลขที่"],
                    ["docType", "ประเภทเอกสาร"],
                    ["partyName", "คู่ค้า"],
                    ["total", "รวม"],
                    ["status", "สถานะ"]
                ]
            },
            users: {
                title: "ผู้ใช้งาน",
                action: "list",
                addAction: "add-user",
                columns: [
                    ["username", "ชื่อผู้ใช้"],
                    ["fullName", "ชื่อ-นามสกุล"],
                    ["role", "สิทธิ์"],
                    ["active", "สถานะ"],
                    ["lastLoginAt", "เข้าใช้ล่าสุด"]
                ]
            }
        };

        return configs[entity] || null;
    }

    function getListData(response) {
        var source = normalizeResponse(response);

        if (Array.isArray(source)) {
            return source;
        }

        if (!source || typeof source !== "object") {
            return [];
        }

        if (Array.isArray(source.rows)) {
            return source.rows;
        }

        if (Array.isArray(source.items)) {
            return source.items;
        }

        if (Array.isArray(source.data)) {
            return source.data;
        }

        if (Array.isArray(source.results)) {
            return source.results;
        }

        if (source.data && typeof source.data === "object") {
            if (Array.isArray(source.data.rows)) {
                return source.data.rows;
            }

            if (Array.isArray(source.data.items)) {
                return source.data.items;
            }
        }

        return [];
    }

    function getCellValue(row, key) {
        if (!row) {
            return "";
        }

        if (key === "date") {
            return formatDate(
                getValue(row, ["date", "transactionDate", "documentDate"], "")
            );
        }

        if (key === "amount" || key === "total" || key === "openingBalance") {
            return formatMoney(
                getValue(row, [key], 0)
            );
        }

        if (key === "active") {
            var active = getValue(row, ["active"], true);

            if (
                active === true ||
                active === "true" ||
                active === 1 ||
                active === "1"
            ) {
                return "ใช้งาน";
            }

            return "ปิดใช้งาน";
        }

        return getValue(row, [key], "");
    }

    function renderEntityTable(entity, rows) {
        var config = getEntityConfig(entity);
        var container = findTableContainer(entity);

        if (!config) {
            return;
        }

        if (!container) {
            return;
        }

        state.currentRows = rows;

        var html = "";

        html += '<div class="entity-toolbar">';
        html += '<div class="entity-toolbar-title">';
        html += escapeHtml(config.title);
        html += "</div>";

        html += '<div class="entity-toolbar-actions">';

        html +=
            '<button type="button" class="btn btn-primary" data-action="' +
            escapeHtml(config.addAction) +
            '">เพิ่มรายการ</button>';

        html +=
            '<button type="button" class="btn btn-secondary" data-action="export-current-xlsx" data-entity="' +
            escapeHtml(entity) +
            '">Excel</button>';

        html += "</div>";
        html += "</div>";

        html += '<div class="table-responsive">';
        html += '<table class="data-table">';
        html += "<thead>";
        html += "<tr>";

        config.columns.forEach(function (column) {
            html += "<th>" + escapeHtml(column[1]) + "</th>";
        });

        html += "<th>จัดการ</th>";
        html += "</tr>";
        html += "</thead>";

        html += "<tbody>";

        if (!rows.length) {
            html += '<tr>';
            html += '<td colspan="' + String(config.columns.length + 1) + '" class="empty-state">';
            html += "ไม่พบข้อมูล";
            html += "</td>";
            html += "</tr>";
        } else {
            rows.forEach(function (row) {
                var id = getValue(row, ["id"], "");

                html += "<tr>";

                config.columns.forEach(function (column) {
                    var key = column[0];
                    var value = getCellValue(row, key);

                    html += "<td>" + escapeHtml(value) + "</td>";
                });

                html += "<td class=\"table-actions\">";

                html +=
                    '<button type="button" class="btn btn-sm btn-secondary" data-action="edit-row" data-entity="' +
                    escapeHtml(entity) +
                    '" data-id="' +
                    escapeHtml(id) +
                    '">แก้ไข</button>';

                html +=
                    '<button type="button" class="btn btn-sm btn-danger" data-action="delete-row" data-entity="' +
                    escapeHtml(entity) +
                    '" data-id="' +
                    escapeHtml(id) +
                    '">ลบ</button>';

                html += "</td>";

                html += "</tr>";
            });
        }

        html += "</tbody>";
        html += "</table>";
        html += "</div>";

        setContainerHtml(container, html);
    }

    function loadEntityPage(entity) {
        var config = getEntityConfig(entity);

        if (!config) {
            return Promise.resolve(false);
        }

        var payload = {
            entity: entity
        };

        return apiRequest(
            "list",
            payload,
            {
                includeToken: true
            }
        )
            .then(function (response) {
                var rows = getListData(response);

                renderEntityTable(entity, rows);

                if (entity === "accounts") {
                    state.accounts = rows;
                }

                if (entity === "customers") {
                    state.customers = rows;
                }

                if (entity === "vendors") {
                    state.vendors = rows;
                }

                if (entity === "users") {
                    state.users = rows;
                }

                if (entity === "documents") {
                    state.documents = rows;
                }

                return rows;
            })
            .catch(function (error) {
                if (isUnauthorized(error)) {
                    clearSession();
                    showUnauthenticated();
                }

                showToast(
                    error.message || "ไม่สามารถโหลดข้อมูลได้",
                    "error"
                );

                return [];
            });
    }

    function loadDashboard() {
        var dateFromElement = getElement("dashboardDateFrom");
        var dateToElement = getElement("dashboardDateTo");

        var dateFrom = dateFromElement
            ? dateFromElement.value
            : todayDate();

        var dateTo = dateToElement
            ? dateToElement.value
            : todayDate();

        return apiRequest(
            "dashboard",
            {
                dateFrom: dateFrom,
                dateTo: dateTo
            },
            {
                includeToken: true
            }
        )
            .then(function (response) {
                var data = normalizeResponse(response);

                state.dashboardData = data;

                renderDashboard(data);

                return data;
            })
            .catch(function (error) {
                if (isUnauthorized(error)) {
                    clearSession();
                    showUnauthenticated();
                }

                showToast(
                    error.message || "ไม่สามารถโหลดแดชบอร์ดได้",
                    "error"
                );

                renderDashboard({
                    income: 0,
                    expense: 0,
                    net: 0,
                    balance: 0
                });

                return null;
            });
    }

    function getDashboardNumber(data, keys) {
        var value = getValue(data, keys, 0);

        if (
            value === null ||
            value === undefined ||
            value === ""
        ) {
            if (data && data.data && typeof data.data === "object") {
                value = getValue(data.data, keys, 0);
            }
        }

        return parseNumber(value);
    }

    function setTextByIds(ids, value) {
        ids.forEach(function (id) {
            var element = getElement(id);

            if (element) {
                element.textContent = value;
            }
        });
    }

    function renderDashboard(data) {
        var source = normalizeResponse(data) || {};

        var income = getDashboardNumber(
            source,
            ["income", "totalIncome", "incomeTotal", "total_income"]
        );

        var expense = getDashboardNumber(
            source,
            ["expense", "totalExpense", "expenseTotal", "total_expense"]
        );

        var net = getDashboardNumber(
            source,
            ["net", "netIncome", "profit", "balanceNet"]
        );

        var balance = getDashboardNumber(
            source,
            ["balance", "totalBalance", "cashBalance"]
        );

        if (!net && (income || expense)) {
            net = income - expense;
        }

        setTextByIds(
            ["dashboardIncome", "totalIncome", "incomeTotal"],
            formatMoney(income)
        );

        setTextByIds(
            ["dashboardExpense", "totalExpense", "expenseTotal"],
            formatMoney(expense)
        );

        setTextByIds(
            ["dashboardNet", "netIncome", "profitTotal"],
            formatMoney(net)
        );

        setTextByIds(
            ["dashboardBalance", "totalBalance", "balanceTotal"],
            formatMoney(balance)
        );

        var recent = getValue(
            source,
            ["recentTransactions", "recent", "transactions"],
            []
        );

        renderRecentTransactions(normalizeArray(recent));
    }

    function renderRecentTransactions(rows) {
        var container = query(
            "[data-recent-transactions]"
        );

        if (!container) {
            container = getElement("recentTransactions");
        }

        if (!container) {
            return;
        }

        var html = "";

        if (!rows.length) {
            html =
                '<div class="empty-state">ยังไม่มีรายการล่าสุด</div>';
        } else {
            html += '<div class="table-responsive">';
            html += '<table class="data-table">';
            html += "<thead>";
            html += "<tr>";
            html += "<th>วันที่</th>";
            html += "<th>ประเภท</th>";
            html += "<th>รายการ</th>";
            html += "<th class=\"text-right\">จำนวนเงิน</th>";
            html += "</tr>";
            html += "</thead>";
            html += "<tbody>";

            rows.slice(0, 10).forEach(function (row) {
                html += "<tr>";

                html +=
                    "<td>" +
                    escapeHtml(
                        formatDate(
                            getValue(row, ["date", "transactionDate"], "")
                        )
                    ) +
                    "</td>";

                html +=
                    "<td>" +
                    escapeHtml(
                        getValue(row, ["type", "transactionType"], "")
                    ) +
                    "</td>";

                html +=
                    "<td>" +
                    escapeHtml(
                        getValue(
                            row,
                            ["description", "name", "detail"],
                            ""
                        )
                    ) +
                    "</td>";

                html +=
                    '<td class="text-right">' +
                    escapeHtml(
                        formatMoney(
                            getValue(row, ["amount"], 0)
                        )
                    ) +
                    "</td>";

                html += "</tr>";
            });

            html += "</tbody>";
            html += "</table>";
            html += "</div>";
        }

        container.innerHTML = html;
    }

    function ensureModal() {
        var modal = getElement("modalContainer");

        if (modal) {
            return modal;
        }

        modal = document.createElement("div");
        modal.id = "modalContainer";
        modal.className = "modal-container hidden";
        document.body.appendChild(modal);

        return modal;
    }

    function closeModal() {
        var modal = getElement("modalContainer");

        if (!modal) {
            return;
        }

        modal.classList.add("hidden");
        modal.setAttribute("hidden", "hidden");
        modal.innerHTML = "";

        state.modalOpen = false;
        state.editingId = null;
        state.currentEntity = null;
    }

    function openModal(title, bodyHtml, submitText, submitHandler) {
        var modal = ensureModal();

        modal.innerHTML =
            '<div class="modal-backdrop" data-modal-close="true"></div>' +
            '<div class="modal-dialog" role="dialog" aria-modal="true">' +
            '<div class="modal-header">' +
            '<h3 class="modal-title">' +
            escapeHtml(title) +
            "</h3>" +
            '<button type="button" class="modal-close" data-modal-close="true">×</button>' +
            "</div>" +
            '<form id="dynamicModalForm" class="modal-form">' +
            '<div class="modal-body">' +
            bodyHtml +
            "</div>" +
            '<div class="modal-footer">' +
            '<button type="button" class="btn btn-secondary" data-modal-close="true">ยกเลิก</button>' +
            '<button type="submit" class="btn btn-primary" id="dynamicModalSubmit">' +
            escapeHtml(submitText || "บันทึก") +
            "</button>" +
            "</div>" +
            "</form>" +
            "</div>";

        modal.classList.remove("hidden");
        modal.removeAttribute("hidden");

        state.modalOpen = true;

        queryAll("[data-modal-close]", modal).forEach(function (element) {
            element.addEventListener("click", function (event) {
                event.preventDefault();
                closeModal();
            });
        });

        var form = getElement("dynamicModalForm");

        if (form) {
            form.addEventListener("submit", function (event) {
                event.preventDefault();
                event.stopPropagation();

                if (typeof submitHandler === "function") {
                    submitHandler(form);
                }

                return false;
            });
        }
    }

    function fieldText(name, label, value, required) {
        return (
            '<div class="form-field">' +
            '<label for="field-' +
            escapeHtml(name) +
            '">' +
            escapeHtml(label) +
            (required ? ' <span class="required">*</span>' : "") +
            "</label>" +
            '<input type="text" id="field-' +
            escapeHtml(name) +
            '" name="' +
            escapeHtml(name) +
            '" value="' +
            escapeHtml(value || "") +
            '"' +
            (required ? " required" : "") +
            ">" +
            "</div>"
        );
    }

    function fieldNumber(name, label, value, required) {
        return (
            '<div class="form-field">' +
            '<label for="field-' +
            escapeHtml(name) +
            '">' +
            escapeHtml(label) +
            (required ? ' <span class="required">*</span>' : "") +
            "</label>" +
            '<input type="number" step="0.01" id="field-' +
            escapeHtml(name) +
            '" name="' +
            escapeHtml(name) +
            '" value="' +
            escapeHtml(value === undefined || value === null ? "" : value) +
            '"' +
            (required ? " required" : "") +
            ">" +
            "</div>"
        );
    }

    function fieldDate(name, label, value, required) {
        return (
            '<div class="form-field">' +
            '<label for="field-' +
            escapeHtml(name) +
            '">' +
            escapeHtml(label) +
            (required ? ' <span class="required">*</span>' : "") +
            "</label>" +
            '<input type="date" id="field-' +
            escapeHtml(name) +
            '" name="' +
            escapeHtml(name) +
            '" value="' +
            escapeHtml(inputDate(value)) +
            '"' +
            (required ? " required" : "") +
            ">" +
            "</div>"
        );
    }

    function fieldTextarea(name, label, value) {
        return (
            '<div class="form-field form-field-full">' +
            '<label for="field-' +
            escapeHtml(name) +
            '">' +
            escapeHtml(label) +
            "</label>" +
            '<textarea id="field-' +
            escapeHtml(name) +
            '" name="' +
            escapeHtml(name) +
            '" rows="3">' +
            escapeHtml(value || "") +
            "</textarea>" +
            "</div>"
        );
    }

    function fieldSelect(name, label, options, value, required) {
        var html =
            '<div class="form-field">' +
            '<label for="field-' +
            escapeHtml(name) +
            '">' +
            escapeHtml(label) +
            (required ? ' <span class="required">*</span>' : "") +
            "</label>" +
            '<select id="field-' +
            escapeHtml(name) +
            '" name="' +
            escapeHtml(name) +
            '"' +
            (required ? " required" : "") +
            ">";

        options.forEach(function (option) {
            var selected =
                String(option.value) === String(value)
                    ? " selected"
                    : "";

            html +=
                '<option value="' +
                escapeHtml(option.value) +
                '"' +
                selected +
                ">" +
                escapeHtml(option.label) +
                "</option>";
        });

        html += "</select>";
        html += "</div>";

        return html;
    }

    function fieldCheckbox(name, label, value) {
        var checked =
            value === true ||
            value === "true" ||
            value === 1 ||
            value === "1";

        return (
            '<div class="form-field checkbox-field">' +
            '<label>' +
            '<input type="checkbox" name="' +
            escapeHtml(name) +
            '"' +
            (checked ? " checked" : "") +
            ">" +
            "<span>" +
            escapeHtml(label) +
            "</span>" +
            "</label>" +
            "</div>"
        );
    }

    function formValue(form, name) {
        var element = form.elements[name];

        if (!element) {
            return "";
        }

        if (element.type === "checkbox") {
            return element.checked;
        }

        return element.value;
    }

    function accountOptions(value) {
        var options = [
            {
                value: "",
                label: "เลือกบัญชี"
            }
        ];

        state.accounts.forEach(function (account) {
            options.push({
                value: getValue(account, ["id"], ""),
                label:
                    getValue(account, ["code"], "") +
                    " - " +
                    getValue(account, ["name"], "")
            });
        });

        return fieldSelect(
            "accountId",
            "บัญชี",
            options,
            value,
            true
        );
    }

    function categoryOptions(value, type) {
        var options = [
            {
                value: "",
                label: "เลือกหมวดหมู่"
            }
        ];

        state.categories.forEach(function (category) {
            var categoryType = trimValue(
                getValue(category, ["type"], "")
            ).toLowerCase();

            if (
                type &&
                categoryType &&
                categoryType !== type.toLowerCase()
            ) {
                return;
            }

            options.push({
                value: getValue(category, ["id"], ""),
                label:
                    getValue(category, ["code"], "") +
                    " - " +
                    getValue(category, ["name"], "")
            });
        });

        return fieldSelect(
            "categoryId",
            "หมวดหมู่",
            options,
            value,
            false
        );
    }

    function customerOptions(value) {
        var options = [
            {
                value: "",
                label: "ไม่ระบุ"
            }
        ];

        state.customers.forEach(function (customer) {
            options.push({
                value: getValue(customer, ["id"], ""),
                label:
                    getValue(customer, ["code"], "") +
                    " - " +
                    getValue(customer, ["name"], "")
            });
        });

        return fieldSelect(
            "customerId",
            "ลูกค้า",
            options,
            value,
            false
        );
    }

    function vendorOptions(value) {
        var options = [
            {
                value: "",
                label: "ไม่ระบุ"
            }
        ];

        state.vendors.forEach(function (vendor) {
            options.push({
                value: getValue(vendor, ["id"], ""),
                label:
                    getValue(vendor, ["code"], "") +
                    " - " +
                    getValue(vendor, ["name"], "")
            });
        });

        return fieldSelect(
            "vendorId",
            "ผู้จำหน่าย / เจ้าหนี้",
            options,
            value,
            false
        );
    }

    function openIncomeForm(row) {
        var item = row || {};

        var html = '<div class="form-grid">';

        html += fieldDate(
            "date",
            "วันที่",
            getValue(item, ["date"], todayDate()),
            true
        );

        html += fieldText(
            "docNo",
            "เลขที่เอกสาร",
            getValue(item, ["docNo"], ""),
            false
        );

        html += accountOptions(
            getValue(item, ["accountId"], "")
        );

        html += categoryOptions(
            getValue(item, ["categoryId"], ""),
            "income"
        );

        html += fieldText(
            "counterpartyName",
            "ผู้จ่ายเงิน / คู่ค้า",
            getValue(item, ["counterpartyName", "counterparty"], ""),
            false
        );

        html += fieldText(
            "description",
            "รายละเอียด",
            getValue(item, ["description"], ""),
            true
        );

        html += fieldNumber(
            "amount",
            "จำนวนเงิน",
            getValue(item, ["amount"], ""),
            true
        );

        html += fieldSelect(
            "paymentMethod",
            "วิธีรับเงิน",
            [
                {
                    value: "",
                    label: "เลือกวิธีรับเงิน"
                },
                {
                    value: "เงินสด",
                    label: "เงินสด"
                },
                {
                    value: "โอนเงิน",
                    label: "โอนเงิน"
                },
                {
                    value: "เช็ค",
                    label: "เช็ค"
                },
                {
                    value: "อื่น ๆ",
                    label: "อื่น ๆ"
                }
            ],
            getValue(item, ["paymentMethod"], ""),
            false
        );

        html += fieldText(
            "reference",
            "เลขที่อ้างอิง",
            getValue(item, ["reference"], ""),
            false
        );

        html += "</div>";

        openModal(
            row ? "แก้ไขรายรับ" : "เพิ่มรายรับ",
            html,
            "บันทึกรายรับ",
            function (form) {
                var data = {
                    id: getValue(item, ["id"], "") || createId(),
                    date: formValue(form, "date"),
                    docNo: formValue(form, "docNo"),
                    accountId: formValue(form, "accountId"),
                    categoryId: formValue(form, "categoryId"),
                    counterpartyName: formValue(form, "counterpartyName"),
                    description: formValue(form, "description"),
                    amount: parseNumber(formValue(form, "amount")),
                    paymentMethod: formValue(form, "paymentMethod"),
                    reference: formValue(form, "reference")
                };

                saveEntity(
                    row ? "update" : "saveincome",
                    "income",
                    data
                );
            }
        );
    }

    function openExpenseForm(row) {
        var item = row || {};

        var html = '<div class="form-grid">';

        html += fieldDate(
            "date",
            "วันที่",
            getValue(item, ["date"], todayDate()),
            true
        );

        html += fieldText(
            "docNo",
            "เลขที่เอกสาร",
            getValue(item, ["docNo"], ""),
            false
        );

        html += accountOptions(
            getValue(item, ["accountId"], "")
        );

        html += categoryOptions(
            getValue(item, ["categoryId"], ""),
            "expense"
        );

        html += fieldText(
            "counterpartyName",
            "ผู้รับเงิน / คู่ค้า",
            getValue(item, ["counterpartyName", "counterparty"], ""),
            false
        );

        html += fieldText(
            "description",
            "รายละเอียด",
            getValue(item, ["description"], ""),
            true
        );

        html += fieldNumber(
            "amount",
            "จำนวนเงิน",
            getValue(item, ["amount"], ""),
            true
        );

        html += fieldSelect(
            "paymentMethod",
            "วิธีจ่ายเงิน",
            [
                {
                    value: "",
                    label: "เลือกวิธีจ่ายเงิน"
                },
                {
                    value: "เงินสด",
                    label: "เงินสด"
                },
                {
                    value: "โอนเงิน",
                    label: "โอนเงิน"
                },
                {
                    value: "เช็ค",
                    label: "เช็ค"
                },
                {
                    value: "อื่น ๆ",
                    label: "อื่น ๆ"
                }
            ],
            getValue(item, ["paymentMethod"], ""),
            false
        );

        html += fieldText(
            "reference",
            "เลขที่อ้างอิง",
            getValue(item, ["reference"], ""),
            false
        );

        html += "</div>";

        openModal(
            row ? "แก้ไขรายจ่าย" : "เพิ่มรายจ่าย",
            html,
            "บันทึกรายจ่าย",
            function (form) {
                var data = {
                    id: getValue(item, ["id"], "") || createId(),
                    date: formValue(form, "date"),
                    docNo: formValue(form, "docNo"),
                    accountId: formValue(form, "accountId"),
                    categoryId: formValue(form, "categoryId"),
                    counterpartyName: formValue(form, "counterpartyName"),
                    description: formValue(form, "description"),
                    amount: parseNumber(formValue(form, "amount")),
                    paymentMethod: formValue(form, "paymentMethod"),
                    reference: formValue(form, "reference")
                };

                saveEntity(
                    row ? "update" : "saveexpense",
                    "expense",
                    data
                );
            }
        );
    }

    function openTransferForm(row) {
        var item = row || {};

        var accountList = [
            {
                value: "",
                label: "เลือกบัญชี"
            }
        ];

        state.accounts.forEach(function (account) {
            accountList.push({
                value: getValue(account, ["id"], ""),
                label:
                    getValue(account, ["code"], "") +
                    " - " +
                    getValue(account, ["name"], "")
            });
        });

        var html = '<div class="form-grid">';

        html += fieldDate(
            "date",
            "วันที่",
            getValue(item, ["date"], todayDate()),
            true
        );

        html += fieldText(
            "docNo",
            "เลขที่เอกสาร",
            getValue(item, ["docNo"], ""),
            false
        );

        html += fieldSelect(
            "fromAccountId",
            "จากบัญชี",
            accountList,
            getValue(item, ["fromAccountId"], ""),
            true
        );

        html += fieldSelect(
            "toAccountId",
            "ไปบัญชี",
            accountList,
            getValue(item, ["toAccountId"], ""),
            true
        );

        html += fieldNumber(
            "amount",
            "จำนวนเงิน",
            getValue(item, ["amount"], ""),
            true
        );

        html += fieldText(
            "description",
            "รายละเอียด",
            getValue(item, ["description"], ""),
            false
        );

        html += fieldText(
            "reference",
            "เลขที่อ้างอิง",
            getValue(item, ["reference"], ""),
            false
        );

        html += "</div>";

        openModal(
            row ? "แก้ไขรายการโอน" : "โอนเงินระหว่างบัญชี",
            html,
            "บันทึกการโอน",
            function (form) {
                var fromAccountId = formValue(
                    form,
                    "fromAccountId"
                );

                var toAccountId = formValue(
                    form,
                    "toAccountId"
                );

                if (
                    fromAccountId &&
                    toAccountId &&
                    fromAccountId === toAccountId
                ) {
                    showToast(
                        "บัญชีต้นทางและปลายทางต้องไม่ใช่บัญชีเดียวกัน",
                        "warning"
                    );
                    return;
                }

                var data = {
                    id: getValue(item, ["id"], "") || createId(),
                    date: formValue(form, "date"),
                    docNo: formValue(form, "docNo"),
                    fromAccountId: fromAccountId,
                    toAccountId: toAccountId,
                    amount: parseNumber(
                        formValue(form, "amount")
                    ),
                    description: formValue(
                        form,
                        "description"
                    ),
                    reference: formValue(
                        form,
                        "reference"
                    )
                };

                saveEntity(
                    "savetransfer",
                    "transfers",
                    data
                );
            }
        );
    }

    function openAccountForm(row) {
        var item = row || {};

        var html = '<div class="form-grid">';

        html += fieldText(
            "code",
            "รหัสบัญชี",
            getValue(item, ["code"], ""),
            true
        );

        html += fieldText(
            "name",
            "ชื่อบัญชี",
            getValue(item, ["name"], ""),
            true
        );

        html += fieldSelect(
            "type",
            "ประเภท",
            [
                {
                    value: "cash",
                    label: "เงินสด"
                },
                {
                    value: "bank",
                    label: "ธนาคาร"
                },
                {
                    value: "other",
                    label: "อื่น ๆ"
                }
            ],
            getValue(item, ["type"], "cash"),
            true
        );

        html += fieldNumber(
            "openingBalance",
            "ยอดยกมา",
            getValue(item, ["openingBalance"], 0),
            false
        );

        html += fieldCheckbox(
            "active",
            "เปิดใช้งานบัญชี",
            getValue(item, ["active"], true)
        );

        html += fieldTextarea(
            "description",
            "รายละเอียด",
            getValue(item, ["description"], "")
        );

        html += "</div>";

        openModal(
            row ? "แก้ไขบัญชี" : "เพิ่มบัญชี",
            html,
            "บันทึกบัญชี",
            function (form) {
                var data = {
                    id: getValue(item, ["id"], "") || createId(),
                    code: formValue(form, "code"),
                    name: formValue(form, "name"),
                    type: formValue(form, "type"),
                    openingBalance: parseNumber(
                        formValue(form, "openingBalance")
                    ),
                    active: formValue(form, "active"),
                    description: formValue(
                        form,
                        "description"
                    )
                };

                saveEntity(
                    row ? "update" : "create",
                    "accounts",
                    data
                );
            }
        );
    }

    function openPartyForm(row, entity) {
        var item = row || {};
        var title = entity === "customers"
            ? "ลูกค้า"
            : "ผู้จำหน่าย / เจ้าหนี้";

        var html = '<div class="form-grid">';

        html += fieldText(
            "code",
            "รหัส",
            getValue(item, ["code"], ""),
            true
        );

        html += fieldText(
            "name",
            entity === "customers"
                ? "ชื่อลูกค้า"
                : "ชื่อผู้จำหน่าย",
            getValue(item, ["name"], ""),
            true
        );

        html += fieldText(
            "taxId",
            "เลขประจำตัวผู้เสียภาษี",
            getValue(item, ["taxId"], ""),
            false
        );

        html += fieldText(
            "phone",
            "โทรศัพท์",
            getValue(item, ["phone"], ""),
            false
        );

        html += fieldText(
            "email",
            "อีเมล",
            getValue(item, ["email"], ""),
            false
        );

        html += fieldText(
            "contactPerson",
            "ผู้ติดต่อ",
            getValue(item, ["contactPerson"], ""),
            false
        );

        html += fieldTextarea(
            "address",
            "ที่อยู่",
            getValue(item, ["address"], "")
        );

        html += fieldTextarea(
            "notes",
            "หมายเหตุ",
            getValue(item, ["notes"], "")
        );

        html += fieldCheckbox(
            "active",
            "เปิดใช้งาน",
            getValue(item, ["active"], true)
        );

        html += "</div>";

        openModal(
            row ? "แก้ไข" + title : "เพิ่ม" + title,
            html,
            "บันทึก",
            function (form) {
                var data = {
                    id: getValue(item, ["id"], "") || createId(),
                    code: formValue(form, "code"),
                    name: formValue(form, "name"),
                    taxId: formValue(form, "taxId"),
                    address: formValue(form, "address"),
                    phone: formValue(form, "phone"),
                    email: formValue(form, "email"),
                    contactPerson: formValue(
                        form,
                        "contactPerson"
                    ),
                    active: formValue(form, "active"),
                    notes: formValue(form, "notes")
                };

                saveEntity(
                    row ? "update" : "create",
                    entity,
                    data
                );
            }
        );
    }

    function openUserForm(row) {
        var item = row || {};

        var html = '<div class="form-grid">';

        html += fieldText(
            "username",
            "ชื่อผู้ใช้",
            getValue(item, ["username"], ""),
            true
        );

        html += fieldText(
            "password",
            row ? "รหัสผ่านใหม่" : "รหัสผ่าน",
            "",
            !row
        );

        html += fieldText(
            "fullName",
            "ชื่อ-นามสกุล",
            getValue(item, ["fullName"], ""),
            true
        );

        html += fieldSelect(
            "role",
            "สิทธิ์",
            [
                {
                    value: "admin",
                    label: "Admin"
                },
                {
                    value: "staff",
                    label: "Staff"
                },
                {
                    value: "user",
                    label: "User"
                }
            ],
            getValue(item, ["role"], "user"),
            true
        );

        html += fieldCheckbox(
            "active",
            "เปิดใช้งาน",
            getValue(item, ["active"], true)
        );

        html += "</div>";

        openModal(
            row ? "แก้ไขผู้ใช้งาน" : "เพิ่มผู้ใช้งาน",
            html,
            "บันทึกผู้ใช้งาน",
            function (form) {
                var password = formValue(
                    form,
                    "password"
                );

                var data = {
                    id: getValue(item, ["id"], "") || createId(),
                    username: formValue(
                        form,
                        "username"
                    ),
                    fullName: formValue(
                        form,
                        "fullName"
                    ),
                    role: formValue(form, "role"),
                    active: formValue(form, "active")
                };

                if (password) {
                    data.password = password;
                }

                saveEntity(
                    row ? "update" : "create",
                    "users",
                    data
                );
            }
        );
    }

    function getDocumentTypes() {
        return [
            {
                value: "quotation",
                label: "ใบเสนอราคา"
            },
            {
                value: "invoice",
                label: "ใบแจ้งหนี้"
            },
            {
                value: "billing",
                label: "ใบวางบิล"
            },
            {
                value: "receipt",
                label: "ใบเสร็จรับเงิน"
            },
            {
                value: "payment_receipt",
                label: "ใบรับเงิน"
            },
            {
                value: "receipt_voucher",
                label: "ใบสำคัญรับ"
            },
            {
                value: "payment_voucher",
                label: "ใบสำคัญจ่าย"
            },
            {
                value: "payment_certificate",
                label: "หนังสือรับรองการจ่ายเงิน"
            },
            {
                value: "other",
                label: "อื่น ๆ"
            }
        ];
    }

    function openDocumentForm(row) {
        var item = row || {};

        var html = '<div class="form-grid">';

        html += fieldSelect(
            "docType",
            "ประเภทเอกสาร",
            getDocumentTypes(),
            getValue(item, ["docType"], "quotation"),
            true
        );

        html += fieldDate(
            "date",
            "วันที่",
            getValue(item, ["date"], todayDate()),
            true
        );

        html += fieldDate(
            "dueDate",
            "วันครบกำหนด",
            getValue(item, ["dueDate"], ""),
            false
        );

        html += customerOptions(
            getValue(item, ["customerId"], "")
        );

        html += vendorOptions(
            getValue(item, ["vendorId"], "")
        );

        html += fieldText(
            "partyName",
            "ชื่อลูกค้า / คู่ค้า",
            getValue(item, ["partyName"], ""),
            false
        );

        html += fieldText(
            "taxId",
            "เลขประจำตัวผู้เสียภาษี",
            getValue(item, ["taxId"], ""),
            false
        );

        html += fieldText(
            "phone",
            "โทรศัพท์",
            getValue(item, ["phone"], ""),
            false
        );

        html += fieldTextarea(
            "address",
            "ที่อยู่",
            getValue(item, ["address"], "")
        );

        html += fieldText(
            "subject",
            "เรื่อง",
            getValue(item, ["subject"], ""),
            false
        );

        html += fieldNumber(
            "discount",
            "ส่วนลด",
            getValue(item, ["discount"], 0),
            false
        );

        html += fieldNumber(
            "taxRate",
            "อัตราภาษี %",
            getValue(item, ["taxRate"], 7),
            false
        );

        html += fieldTextarea(
            "notes",
            "หมายเหตุ",
            getValue(item, ["notes"], "")
        );

        html += "</div>";

        html += '<div class="document-items-section">';
        html += "<h4>รายการเอกสาร</h4>";
        html += '<div id="documentItemsContainer"></div>';
        html +=
            '<button type="button" class="btn btn-secondary" id="addDocumentItem">เพิ่มรายการ</button>';
        html += "</div>";

        openModal(
            row ? "แก้ไขเอกสาร" : "สร้างเอกสาร",
            html,
            "บันทึกเอกสาร",
            function (form) {
                var items = readDocumentItems();

                var data = {
                    id: getValue(item, ["id"], "") || createId(),
                    docType: formValue(
                        form,
                        "docType"
                    ),
                    date: formValue(form, "date"),
                    dueDate: formValue(
                        form,
                        "dueDate"
                    ),
                    customerId: formValue(
                        form,
                        "customerId"
                    ),
                    vendorId: formValue(
                        form,
                        "vendorId"
                    ),
                    partyName: formValue(
                        form,
                        "partyName"
                    ),
                    taxId: formValue(
                        form,
                        "taxId"
                    ),
                    phone: formValue(
                        form,
                        "phone"
                    ),
                    address: formValue(
                        form,
                        "address"
                    ),
                    subject: formValue(
                        form,
                        "subject"
                    ),
                    discount: parseNumber(
                        formValue(
                            form,
                            "discount"
                        )
                    ),
                    taxRate: parseNumber(
                        formValue(
                            form,
                            "taxRate"
                        )
                    ),
                    notes: formValue(
                        form,
                        "notes"
                    )
                };

                saveDocument(
                    data,
                    items
                );
            }
        );

        var addButton = getElement("addDocumentItem");

        if (addButton) {
            addButton.addEventListener(
                "click",
                function () {
                    addDocumentItemRow();
                }
            );
        }

        var existingItems = getValue(
            item,
            ["items"],
            []
        );

        if (Array.isArray(existingItems) && existingItems.length) {
            existingItems.forEach(function (documentItem) {
                addDocumentItemRow(documentItem);
            });
        } else {
            addDocumentItemRow();
        }
    }

    function addDocumentItemRow(item) {
        var container = getElement(
            "documentItemsContainer"
        );

        if (!container) {
            return;
        }

        var data = item || {};

        var row = document.createElement("div");
        row.className = "document-item-row";

        row.innerHTML =
            '<input type="text" class="document-item-description" placeholder="รายการ" value="' +
            escapeHtml(
                getValue(data, ["description", "name"], "")
            ) +
            '">' +
            '<input type="number" step="0.01" class="document-item-qty" placeholder="จำนวน" value="' +
            escapeHtml(
                getValue(data, ["quantity", "qty"], 1)
            ) +
            '">' +
            '<input type="number" step="0.01" class="document-item-price" placeholder="ราคา/หน่วย" value="' +
            escapeHtml(
                getValue(data, ["unitPrice", "price"], 0)
            ) +
            '">' +
            '<input type="number" step="0.01" class="document-item-total" placeholder="รวม" value="' +
            escapeHtml(
                getValue(data, ["total", "amount"], 0)
            ) +
            '" readonly>' +
            '<button type="button" class="btn btn-sm btn-danger document-item-remove">ลบ</button>';

        container.appendChild(row);

        var quantityInput = query(
            ".document-item-qty",
            row
        );

        var priceInput = query(
            ".document-item-price",
            row
        );

        var totalInput = query(
            ".document-item-total",
            row
        );

        function calculate() {
            var quantity = parseNumber(
                quantityInput.value
            );

            var price = parseNumber(
                priceInput.value
            );

            totalInput.value = (
                quantity * price
            ).toFixed(2);
        }

        quantityInput.addEventListener(
            "input",
            calculate
        );

        priceInput.addEventListener(
            "input",
            calculate
        );

        var removeButton = query(
            ".document-item-remove",
            row
        );

        if (removeButton) {
            removeButton.addEventListener(
                "click",
                function () {
                    row.remove();
                }
            );
        }

        calculate();
    }

    function readDocumentItems() {
        var container = getElement(
            "documentItemsContainer"
        );

        if (!container) {
            return [];
        }

        var rows = queryAll(
            ".document-item-row",
            container
        );

        var items = [];

        rows.forEach(function (row, index) {
            var descriptionInput = query(
                ".document-item-description",
                row
            );

            var quantityInput = query(
                ".document-item-qty",
                row
            );

            var priceInput = query(
                ".document-item-price",
                row
            );

            var totalInput = query(
                ".document-item-total",
                row
            );

            var description = descriptionInput
                ? trimValue(descriptionInput.value)
                : "";

            var quantity = quantityInput
                ? parseNumber(quantityInput.value)
                : 0;

            var unitPrice = priceInput
                ? parseNumber(priceInput.value)
                : 0;

            var total = totalInput
                ? parseNumber(totalInput.value)
                : quantity * unitPrice;

            if (!description && !quantity && !unitPrice) {
                return;
            }

            items.push({
                id: createId(),
                lineNo: index + 1,
                description: description,
                quantity: quantity,
                unitPrice: unitPrice,
                total: total
            });
        });

        return items;
    }

    function saveDocument(data, items) {
        var button = getElement(
            "dynamicModalSubmit"
        );

        setLoading(button, true, "กำลังบันทึก");

        apiRequest(
            "savedocument",
            {
                data: data,
                items: items
            },
            {
                includeToken: true
            }
        )
            .then(function (response) {
                if (!responseIsSuccess(response)) {
                    throw createApiError(
                        getResponseMessage(response) ||
                        "ไม่สามารถบันทึกเอกสารได้",
                        400,
                        response
                    );
                }

                closeModal();

                showToast(
                    "บันทึกเอกสารสำเร็จ",
                    "success"
                );

                return loadEntityPage(
                    "documents"
                );
            })
            .catch(function (error) {
                showToast(
                    error.message ||
                    "ไม่สามารถบันทึกเอกสารได้",
                    "error"
                );
            })
            .finally(function () {
                setLoading(button, false);
            });
    }

    function saveEntity(action, entity, data) {
        var button = getElement(
            "dynamicModalSubmit"
        );

        setLoading(button, true, "กำลังบันทึก");

        var payload = {
            entity: entity,
            data: data
        };

        apiRequest(
            action,
            payload,
            {
                includeToken: true
            }
        )
            .then(function (response) {
                if (!responseIsSuccess(response)) {
                    throw createApiError(
                        getResponseMessage(response) ||
                        "ไม่สามารถบันทึกข้อมูลได้",
                        400,
                        response
                    );
                }

                closeModal();

                showToast(
                    "บันทึกข้อมูลสำเร็จ",
                    "success"
                );

                return loadEntityPage(entity);
            })
            .catch(function (error) {
                if (isUnauthorized(error)) {
                    clearSession();
                    showUnauthenticated();
                    return;
                }

                showToast(
                    error.message ||
                    "ไม่สามารถบันทึกข้อมูลได้",
                    "error"
                );
            })
            .finally(function () {
                setLoading(button, false);
            });
    }

    function deleteEntity(entity, id) {
        if (!id) {
            showToast(
                "ไม่พบรหัสข้อมูลที่ต้องการลบ",
                "error"
            );
            return;
        }

        confirmAction(
            "ยืนยันการลบข้อมูลรายการนี้หรือไม่"
        ).then(function (confirmed) {
            if (!confirmed) {
                return;
            }

            return apiRequest(
                "delete",
                {
                    entity: entity,
                    id: id
                },
                {
                    includeToken: true
                }
            );
        }).then(function (response) {
            if (!response) {
                return;
            }

            if (!responseIsSuccess(response)) {
                throw createApiError(
                    getResponseMessage(response) ||
                    "ไม่สามารถลบข้อมูลได้",
                    400,
                    response
                );
            }

            showToast(
                "ลบข้อมูลสำเร็จ",
                "success"
            );

            return loadEntityPage(entity);
        }).catch(function (error) {
            if (isUnauthorized(error)) {
                clearSession();
                showUnauthenticated();
                return;
            }

            showToast(
                error.message ||
                "ไม่สามารถลบข้อมูลได้",
                "error"
            );
        });
    }

    function editEntity(entity, id) {
        var row = findById(
            state.currentRows,
            id
        );

        if (!row) {
            showToast(
                "ไม่พบข้อมูลรายการนี้",
                "error"
            );
            return;
        }

        if (entity === "income") {
            openIncomeForm(row);
            return;
        }

        if (entity === "expense") {
            openExpenseForm(row);
            return;
        }

        if (entity === "transfers") {
            openTransferForm(row);
            return;
        }

        if (entity === "accounts") {
            openAccountForm(row);
            return;
        }

        if (
            entity === "customers" ||
            entity === "vendors"
        ) {
            openPartyForm(row, entity);
            return;
        }

        if (entity === "users") {
            openUserForm(row);
            return;
        }

        if (entity === "documents") {
            openDocumentForm(row);
            return;
        }
    }

    function handleAction(action, element) {
        if (action === "logout") {
            logout();
            return;
        }

        if (action === "add-income") {
            openIncomeForm(null);
            return;
        }

        if (action === "add-expense") {
            openExpenseForm(null);
            return;
        }

        if (action === "add-transfer") {
            openTransferForm(null);
            return;
        }

        if (action === "add-account") {
            openAccountForm(null);
            return;
        }

        if (action === "add-customer") {
            openPartyForm(null, "customers");
            return;
        }

        if (action === "add-vendor") {
            openPartyForm(null, "vendors");
            return;
        }

        if (action === "add-user") {
            if (isAdmin()) {
                openUserForm(null);
            } else {
                showToast(
                    "คุณไม่มีสิทธิ์",
                    "error"
                );
            }

            return;
        }

        if (action === "add-document") {
            openDocumentForm(null);
            return;
        }

        if (action === "edit-row") {
            var editEntityName = element.getAttribute(
                "data-entity"
            );

            var editId = element.getAttribute(
                "data-id"
            );

            editEntity(
                editEntityName,
                editId
            );

            return;
        }

        if (action === "delete-row") {
            var deleteEntityName = element.getAttribute(
                "data-entity"
            );

            var deleteId = element.getAttribute(
                "data-id"
            );

            deleteEntity(
                deleteEntityName,
                deleteId
            );

            return;
        }

        if (action === "export-current-xlsx") {
            var exportEntity = element.getAttribute(
                "data-entity"
            );

            exportCurrentEntity(
                exportEntity
            );

            return;
        }

        if (action === "refresh") {
            navigate(state.currentPage);
            return;
        }

        if (action === "close-modal") {
            closeModal();
        }
    }

    function bindGlobalActions() {
        document.addEventListener(
            "click",
            function (event) {
                var target = event.target;

                if (!target) {
                    return;
                }

                var actionElement = target.closest
                    ? target.closest("[data-action]")
                    : null;

                if (!actionElement) {
                    return;
                }

                if (actionElement.closest("#loginForm")) {
                    return;
                }

                var action = actionElement.getAttribute(
                    "data-action"
                );

                if (!action) {
                    return;
                }

                handleAction(
                    action,
                    actionElement
                );
            },
            false
        );
    }

    function loadSettings() {
        return apiRequest(
            "settings",
            {},
            {
                includeToken: true
            }
        )
            .then(function (response) {
                var rows = getListData(response);

                if (!rows.length) {
                    var normalized = normalizeResponse(
                        response
                    );

                    if (
                        normalized &&
                        typeof normalized === "object"
                    ) {
                        rows = normalizeArray(
                            getValue(
                                normalized,
                                ["settings"],
                                []
                            )
                        );
                    }
                }

                state.settings = rows;

                renderSettings(rows);

                return rows;
            })
            .catch(function (error) {
                showToast(
                    error.message ||
                    "ไม่สามารถโหลดการตั้งค่าได้",
                    "error"
                );

                return [];
            });
    }

    function renderSettings(rows) {
        var container = getElement(
            "settingsContainer"
        );

        if (!container) {
            container = query(
                '[data-settings-container]'
            );
        }

        if (!container) {
            return;
        }

        var html = "";

        html +=
            '<div class="entity-toolbar">' +
            '<div class="entity-toolbar-title">ตั้งค่ากิจการ</div>' +
            "</div>";

        html +=
            '<div class="table-responsive">' +
            '<table class="data-table">';

        html += "<thead><tr>";
        html += "<th>Key</th>";
        html += "<th>Value</th>";
        html += "<th>รายละเอียด</th>";
        html += "<th>จัดการ</th>";
        html += "</tr></thead>";

        html += "<tbody>";

        if (!rows.length) {
            html +=
                '<tr><td colspan="4" class="empty-state">ไม่พบข้อมูลการตั้งค่า</td></tr>';
        } else {
            rows.forEach(function (row) {
                var id = getValue(
                    row,
                    ["id"],
                    ""
                );

                html += "<tr>";

                html +=
                    "<td>" +
                    escapeHtml(
                        getValue(
                            row,
                            ["key"],
                            ""
                        )
                    ) +
                    "</td>";

                html +=
                    "<td>" +
                    escapeHtml(
                        getValue(
                            row,
                            ["value"],
                            ""
                        )
                    ) +
                    "</td>";

                html +=
                    "<td>" +
                    escapeHtml(
                        getValue(
                            row,
                            ["description"],
                            ""
                        )
                    ) +
                    "</td>";

                html +=
                    '<td><button type="button" class="btn btn-sm btn-secondary" data-action="edit-setting" data-id="' +
                    escapeHtml(id) +
                    '">แก้ไข</button></td>';

                html += "</tr>";
            });
        }

        html += "</tbody>";
        html += "</table>";
        html += "</div>";

        container.innerHTML = html;
    }

    function editSetting(id) {
        var row = findById(
            state.settings,
            id
        );

        if (!row) {
            showToast(
                "ไม่พบการตั้งค่า",
                "error"
            );
            return;
        }

        var html = '<div class="form-grid">';

        html += fieldText(
            "key",
            "Key",
            getValue(row, ["key"], ""),
            true
        );

        html += fieldText(
            "value",
            "Value",
            getValue(row, ["value"], ""),
            false
        );

        html += fieldTextarea(
            "description",
            "รายละเอียด",
            getValue(
                row,
                ["description"],
                ""
            )
        );

        html += "</div>";

        openModal(
            "แก้ไขการตั้งค่า",
            html,
            "บันทึก",
            function (form) {
                var payload = {
                    id: id,
                    key: formValue(
                        form,
                        "key"
                    ),
                    value: formValue(
                        form,
                        "value"
                    ),
                    description: formValue(
                        form,
                        "description"
                    )
                };

                var button = getElement(
                    "dynamicModalSubmit"
                );

                setLoading(
                    button,
                    true,
                    "กำลังบันทึก"
                );

                apiRequest(
                    "updatesetting",
                    {
                        data: payload
                    },
                    {
                        includeToken: true
                    }
                )
                    .then(function (response) {
                        if (!responseIsSuccess(response)) {
                            throw createApiError(
                                getResponseMessage(
                                    response
                                ) ||
                                "ไม่สามารถบันทึกการตั้งค่าได้",
                                400,
                                response
                            );
                        }

                        closeModal();

                        showToast(
                            "บันทึกการตั้งค่าสำเร็จ",
                            "success"
                        );

                        return loadSettings();
                    })
                    .catch(function (error) {
                        showToast(
                            error.message ||
                            "ไม่สามารถบันทึกการตั้งค่าได้",
                            "error"
                        );
                    })
                    .finally(function () {
                        setLoading(
                            button,
                            false
                        );
                    });
            }
        );
    }

    function loadAuditLogs() {
        return apiRequest(
            "auditlogs",
            {},
            {
                includeToken: true
            }
        )
            .then(function (response) {
                var rows = getListData(response);

                renderAuditLogs(rows);

                return rows;
            })
            .catch(function (error) {
                showToast(
                    error.message ||
                    "ไม่สามารถโหลด Audit Log ได้",
                    "error"
                );

                return [];
            });
    }

    function renderAuditLogs(rows) {
        var container = getElement(
            "auditlogsContainer"
        );

        if (!container) {
            container = query(
                '[data-auditlogs-container]'
            );
        }

        if (!container) {
            return;
        }

        var html = "";

        html +=
            '<div class="table-responsive">' +
            '<table class="data-table">';

        html += "<thead>";
        html += "<tr>";
        html += "<th>เวลา</th>";
        html += "<th>ผู้ใช้งาน</th>";
        html += "<th>Action</th>";
        html += "<th>Entity</th>";
        html += "<th>รายละเอียด</th>";
        html += "</tr>";
        html += "</thead>";

        html += "<tbody>";

        if (!rows.length) {
            html +=
                '<tr><td colspan="5" class="empty-state">ไม่พบ Audit Log</td></tr>';
        } else {
            rows.forEach(function (row) {
                html += "<tr>";

                html +=
                    "<td>" +
                    escapeHtml(
                        formatDate(
                            getValue(
                                row,
                                ["createdAt", "timestamp"],
                                ""
                            )
                        )
                    ) +
                    "</td>";

                html +=
                    "<td>" +
                    escapeHtml(
                        getValue(
                            row,
                            ["username", "user"],
                            ""
                        )
                    ) +
                    "</td>";

                html +=
                    "<td>" +
                    escapeHtml(
                        getValue(
                            row,
                            ["action"],
                            ""
                        )
                    ) +
                    "</td>";

                html +=
                    "<td>" +
                    escapeHtml(
                        getValue(
                            row,
                            ["entity"],
                            ""
                        )
                    ) +
                    "</td>";

                html +=
                    "<td>" +
                    escapeHtml(
                        getValue(
                            row,
                            ["details", "description"],
                            ""
                        )
                    ) +
                    "</td>";

                html += "</tr>";
            });
        }

        html += "</tbody>";
        html += "</table>";
        html += "</div>";

        container.innerHTML = html;
    }

    function loadReports() {
        var dateFromElement = getElement(
            "reportDateFrom"
        );

        var dateToElement = getElement(
            "reportDateTo"
        );

        var dateFrom = dateFromElement
            ? dateFromElement.value
            : todayDate();

        var dateTo = dateToElement
            ? dateToElement.value
            : todayDate();

        return apiRequest(
            "report",
            {
                reportType: "summary",
                dateFrom: dateFrom,
                dateTo: dateTo
            },
            {
                includeToken: true
            }
        )
            .then(function (response) {
                var data = normalizeResponse(
                    response
                );

                state.reportData = data;

                renderReport(data);

                return data;
            })
            .catch(function (error) {
                showToast(
                    error.message ||
                    "ไม่สามารถโหลดรายงานได้",
                    "error"
                );

                return null;
            });
    }

    function renderReport(data) {
        var container = getElement(
            "reportsContainer"
        );

        if (!container) {
            container = query(
                "[data-reports-container]"
            );
        }

        if (!container) {
            return;
        }

        var rows = getListData(data);

        var income = getDashboardNumber(
            data,
            ["income", "totalIncome"]
        );

        var expense = getDashboardNumber(
            data,
            ["expense", "totalExpense"]
        );

        var net = income - expense;

        var html = "";

        html += '<div class="report-summary">';
        html +=
            '<div class="report-card"><span>รายรับ</span><strong>' +
            escapeHtml(formatMoney(income)) +
            "</strong></div>";

        html +=
            '<div class="report-card"><span>รายจ่าย</span><strong>' +
            escapeHtml(formatMoney(expense)) +
            "</strong></div>";

        html +=
            '<div class="report-card"><span>สุทธิ</span><strong>' +
            escapeHtml(formatMoney(net)) +
            "</strong></div>";

        html += "</div>";

        if (rows.length) {
            html +=
                '<div class="table-responsive">' +
                '<table class="data-table">';

            html += "<thead><tr>";

            var keys = Object.keys(rows[0]);

            keys.forEach(function (key) {
                html +=
                    "<th>" +
                    escapeHtml(key) +
                    "</th>";
            });

            html += "</tr></thead><tbody>";

            rows.forEach(function (row) {
                html += "<tr>";

                keys.forEach(function (key) {
                    html +=
                        "<td>" +
                        escapeHtml(
                            getCellValue(
                                row,
                                key
                            )
                        ) +
                        "</td>";
                });

                html += "</tr>";
            });

            html += "</tbody></table></div>";
        }

        container.innerHTML = html;
    }

    function exportCurrentEntity(entity) {
        var rows = state.currentRows || [];

        if (!rows.length) {
            showToast(
                "ไม่มีข้อมูลสำหรับส่งออก",
                "warning"
            );
            return;
        }

        var config = getEntityConfig(entity);

        if (!config) {
            return;
        }

        var exportRows = [];

        rows.forEach(function (row) {
            var output = {};

            config.columns.forEach(function (column) {
                output[column[1]] = getCellValue(
                    row,
                    column[0]
                );
            });

            exportRows.push(output);
        });

        exportXlsx(
            exportRows,
            entity + "-" + todayDate()
        );
    }

    function exportXlsx(rows, filename) {
        if (
            window.XLSX &&
            window.XLSX.utils &&
            typeof window.XLSX.utils.json_to_sheet === "function"
        ) {
            var worksheet =
                window.XLSX.utils.json_to_sheet(
                    rows
                );

            var workbook =
                window.XLSX.utils.book_new();

            window.XLSX.utils.book_append_sheet(
                workbook,
                worksheet,
                "ข้อมูล"
            );

            window.XLSX.writeFile(
                workbook,
                filename + ".xlsx"
            );

            showToast(
                "ดาวน์โหลด Excel แล้ว",
                "success"
            );

            return;
        }

        exportCsv(
            rows,
            filename
        );

        showToast(
            "ยังไม่ได้โหลดไลบรารี Excel จึงส่งออกเป็น CSV แทน",
            "warning"
        );
    }

    function exportCsv(rows, filename) {
        if (!rows.length) {
            return;
        }

        var keys = Object.keys(rows[0]);

        var lines = [];

        lines.push(
            keys.map(csvEscape).join(",")
        );

        rows.forEach(function (row) {
            var values = [];

            keys.forEach(function (key) {
                values.push(
                    csvEscape(
                        row[key]
                    )
                );
            });

            lines.push(
                values.join(",")
            );
        });

        var blob = new Blob(
            [
                "\uFEFF" +
                lines.join("\r\n")
            ],
            {
                type: "text/csv;charset=utf-8"
            }
        );

        downloadBlob(
            blob,
            filename + ".csv"
        );
    }

    function csvEscape(value) {
        var text = value === null ||
            value === undefined
            ? ""
            : String(value);

        text = text.replace(/"/g, '""');

        return '"' + text + '"';
    }

    function downloadBlob(blob, filename) {
        var url = URL.createObjectURL(
            blob
        );

        var link = document.createElement(
            "a"
        );

        link.href = url;
        link.download = filename;
        link.style.display = "none";

        document.body.appendChild(
            link
        );

        link.click();

        window.setTimeout(function () {
            if (link.parentNode) {
                link.parentNode.removeChild(
                    link
                );
            }

            URL.revokeObjectURL(
                url
            );
        }, 100);
    }

    function printCurrentDocument() {
        window.print();
    }

    function bindKeyboard() {
        document.addEventListener(
            "keydown",
            function (event) {
                if (
                    event.key === "Escape" &&
                    state.modalOpen
                ) {
                    closeModal();
                }
            }
        );
    }

    function bindLoginEnterProtection() {
        document.addEventListener(
            "keydown",
            function (event) {
                var target = event.target;

                if (!target) {
                    return;
                }

                var form = target.closest
                    ? target.closest("#loginForm")
                    : null;

                if (!form) {
                    return;
                }

                if (event.key === "Enter") {
                    event.preventDefault();
                    event.stopPropagation();

                    if (!state.loginRunning) {
                        handleLogin();
                    }

                    return false;
                }
            },
            true
        );
    }

    function bindExistingButtons() {
        var dashboardRefresh = getElement(
            "dashboardRefresh"
        );

        if (dashboardRefresh) {
            dashboardRefresh.addEventListener(
                "click",
                function (event) {
                    event.preventDefault();
                    loadDashboard();
                }
            );
        }

        var reportRefresh = getElement(
            "reportRefresh"
        );

        if (reportRefresh) {
            reportRefresh.addEventListener(
                "click",
                function (event) {
                    event.preventDefault();
                    loadReports();
                }
            );
        }

        var printButton = getElement(
            "printButton"
        );

        if (printButton) {
            printButton.addEventListener(
                "click",
                function (event) {
                    event.preventDefault();
                    printCurrentDocument();
                }
            );
        }
    }

    function bindEditSettingAction() {
        document.addEventListener(
            "click",
            function (event) {
                var target = event.target;

                if (!target) {
                    return;
                }

                var element = target.closest
                    ? target.closest(
                        "[data-action='edit-setting']"
                    )
                    : null;

                if (!element) {
                    return;
                }

                event.preventDefault();

                editSetting(
                    element.getAttribute(
                        "data-id"
                    )
                );
            }
        );
    }

    function testApi() {
        return apiRequest(
            "ping",
            {},
            {
                includeToken: false
            }
        );
    }

    function initApiUrl() {
        var apiUrl = getApiUrl();

        if (
            !apiUrl ||
            apiUrl === "YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL"
        ) {
            return false;
        }

        return true;
    }

    function initializeDateFields() {
        var dateFields = [
            "dashboardDateFrom",
            "dashboardDateTo",
            "reportDateFrom",
            "reportDateTo"
        ];

        dateFields.forEach(function (id) {
            var element = getElement(id);

            if (!element) {
                return;
            }

            if (!element.value) {
                element.value = todayDate();
            }
        });
    }

    function init() {
        if (state.initialized) {
            return;
        }

        state.initialized = true;

        bindLoginForm();
        bindLogout();
        bindNavigation();
        bindGlobalActions();
        bindKeyboard();
        bindLoginEnterProtection();
        bindExistingButtons();
        bindEditSettingAction();
        initializeDateFields();

        document.body.classList.add(
            "private-finance-app"
        );

        if (!initApiUrl()) {
            showUnauthenticated();

            showToast(
                "ยังไม่ได้กำหนด URL ของ Google Apps Script Web App ใน CONFIG.API_URL",
                "error"
            );

            return;
        }

        restoreSession();
    }

    window.PrivateFinanceApp = {
        init: init,
        login: handleLogin,
        logout: logout,
        navigate: navigate,
        apiRequest: apiRequest,
        loadDashboard: loadDashboard,
        loadReports: loadReports,
        loadSettings: loadSettings,
        loadAuditLogs: loadAuditLogs,
        closeModal: closeModal,
        printCurrentDocument: printCurrentDocument,
        exportCurrentEntity: exportCurrentEntity,
        testApi: testApi,
        getState: function () {
            return state;
        }
    };

    window.App = window.PrivateFinanceApp;

    if (document.readyState === "loading") {
        document.addEventListener(
            "DOMContentLoaded",
            init
        );
    } else {
        init();
    }
})();
