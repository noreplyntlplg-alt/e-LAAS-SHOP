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

    if (window.APP_CONFIG && typeof window.APP_CONFIG === "object") {
        if (window.APP_CONFIG.API_URL) {
            CONFIG.API_URL = String(window.APP_CONFIG.API_URL);
        }
    }

    if (!CONFIG.API_URL) {
        var apiElement = document.querySelector("[data-api-url]");
        if (apiElement) {
            CONFIG.API_URL = apiElement.getAttribute("data-api-url") || "";
        }
    }

    var state = {
        token: "",
        user: null,
        expiresAt: "",
        bootstrap: null,
        settings: [],
        accounts: [],
        categories: [],
        customers: [],
        vendors: [],
        users: [],
        documents: [],
        currentPage: "dashboard",
        currentEntity: "",
        currentData: [],
        currentRecord: null,
        editingId: "",
        loginInProgress: false,
        loading: false,
        initialized: false,
        dashboardData: null,
        reportData: null,
        modalOpen: false,
        modalSubmitHandler: null,
        filters: {},
        pageCache: {},
        charts: {},
        documentItems: []
    };

    var PAGE_NAMES = {
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

    var DOCUMENT_TYPES = [
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
            value: "receipt_payment",
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

    var PAYMENT_METHODS = [
        {
            value: "cash",
            label: "เงินสด"
        },
        {
            value: "bank",
            label: "ธนาคาร"
        },
        {
            value: "transfer",
            label: "โอนเงิน"
        },
        {
            value: "credit",
            label: "เครดิต"
        },
        {
            value: "other",
            label: "อื่น ๆ"
        }
    ];

    var ACCOUNT_TYPES = [
        {
            value: "cash",
            label: "เงินสด"
        },
        {
            value: "bank",
            label: "ธนาคาร"
        },
        {
            value: "wallet",
            label: "กระเป๋าเงิน / E-Wallet"
        },
        {
            value: "other",
            label: "อื่น ๆ"
        }
    ];

    var USER_ROLES = [
        {
            value: "admin",
            label: "ผู้ดูแลระบบ"
        },
        {
            value: "manager",
            label: "ผู้จัดการ"
        },
        {
            value: "staff",
            label: "เจ้าหน้าที่"
        },
        {
            value: "viewer",
            label: "ดูข้อมูล"
        }
    ];

    function byId(id) {
        return document.getElementById(id);
    }

    function qs(selector, root) {
        var scope = root || document;
        return scope.querySelector(selector);
    }

    function qsa(selector, root) {
        var scope = root || document;
        return Array.prototype.slice.call(scope.querySelectorAll(selector));
    }

    function hasElement(id) {
        return !!byId(id);
    }

    function showElement(element) {
        if (!element) {
            return;
        }

        element.classList.remove("hidden");
        element.removeAttribute("hidden");
        element.style.display = "";
    }

    function hideElement(element) {
        if (!element) {
            return;
        }

        element.classList.add("hidden");
        element.setAttribute("hidden", "hidden");
        element.style.display = "none";
    }

    function showById(id) {
        showElement(byId(id));
    }

    function hideById(id) {
        hideElement(byId(id));
    }

    function escapeHtml(value) {
        if (value === null || value === undefined) {
            return "";
        }

        return String(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function escapeAttribute(value) {
        return escapeHtml(value);
    }

    function safeText(value, fallback) {
        if (value === null || value === undefined || value === "") {
            return fallback || "";
        }

        return String(value);
    }

    function parseMaybeJson(value) {
        if (typeof value !== "string") {
            return value;
        }

        var trimmed = value.trim();

        if (!trimmed) {
            return value;
        }

        try {
            return JSON.parse(trimmed);
        } catch (error) {
            return value;
        }
    }

    function normalizeResponse(response) {
        var result = parseMaybeJson(response);

        if (result && typeof result === "object") {
            if (result.body !== undefined) {
                var body = parseMaybeJson(result.body);

                if (body && typeof body === "object") {
                    result = body;
                }
            }

            if (result.response !== undefined) {
                var responseData = parseMaybeJson(result.response);

                if (responseData && typeof responseData === "object") {
                    result = responseData;
                }
            }

            if (result.result !== undefined) {
                var resultData = parseMaybeJson(result.result);

                if (resultData && typeof resultData === "object") {
                    if (
                        result.success === undefined &&
                        result.ok === undefined &&
                        result.status === undefined
                    ) {
                        result = resultData;
                    } else {
                        result.result = resultData;
                    }
                }
            }

            if (result.data !== undefined) {
                var data = parseMaybeJson(result.data);

                if (
                    data &&
                    typeof data === "object" &&
                    result.token === undefined &&
                    result.user === undefined &&
                    result.success === undefined &&
                    result.ok === undefined
                ) {
                    result = data;
                }
            }
        }

        return result;
    }

    function responseSuccess(response) {
        var result = normalizeResponse(response);

        if (result === true) {
            return true;
        }

        if (!result || typeof result !== "object") {
            return false;
        }

        if (result.success === true) {
            return true;
        }

        if (result.ok === true) {
            return true;
        }

        if (result.status === "success") {
            return true;
        }

        if (result.status === true) {
            return true;
        }

        return false;
    }

    function extractToken(response) {
        var result = normalizeResponse(response);

        if (!result || typeof result !== "object") {
            return "";
        }

        if (result.token) {
            return String(result.token);
        }

        if (result.sessionToken) {
            return String(result.sessionToken);
        }

        if (result.accessToken) {
            return String(result.accessToken);
        }

        if (result.sessionId) {
            return String(result.sessionId);
        }

        if (result.data && typeof result.data === "object") {
            if (result.data.token) {
                return String(result.data.token);
            }

            if (result.data.sessionToken) {
                return String(result.data.sessionToken);
            }

            if (result.data.accessToken) {
                return String(result.data.accessToken);
            }

            if (result.data.sessionId) {
                return String(result.data.sessionId);
            }

            if (result.data.session && typeof result.data.session === "object") {
                if (result.data.session.token) {
                    return String(result.data.session.token);
                }

                if (result.data.session.sessionToken) {
                    return String(result.data.session.sessionToken);
                }
            }
        }

        if (result.result && typeof result.result === "object") {
            if (result.result.token) {
                return String(result.result.token);
            }

            if (result.result.sessionToken) {
                return String(result.result.sessionToken);
            }

            if (result.result.accessToken) {
                return String(result.result.accessToken);
            }

            if (result.result.sessionId) {
                return String(result.result.sessionId);
            }
        }

        return "";
    }

    function extractUser(response) {
        var result = normalizeResponse(response);

        if (!result || typeof result !== "object") {
            return null;
        }

        if (result.user && typeof result.user === "object") {
            return result.user;
        }

        if (result.data && typeof result.data === "object") {
            if (result.data.user && typeof result.data.user === "object") {
                return result.data.user;
            }
        }

        if (result.result && typeof result.result === "object") {
            if (result.result.user && typeof result.result.user === "object") {
                return result.result.user;
            }
        }

        return null;
    }

    function extractExpiresAt(response) {
        var result = normalizeResponse(response);

        if (!result || typeof result !== "object") {
            return "";
        }

        if (result.expiresAt) {
            return String(result.expiresAt);
        }

        if (result.data && typeof result.data === "object") {
            if (result.data.expiresAt) {
                return String(result.data.expiresAt);
            }
        }

        if (result.result && typeof result.result === "object") {
            if (result.result.expiresAt) {
                return String(result.result.expiresAt);
            }
        }

        return "";
    }

    function extractMessage(response) {
        var result = normalizeResponse(response);

        if (!result) {
            return "เกิดข้อผิดพลาด";
        }

        if (typeof result === "string") {
            return result;
        }

        if (result.message) {
            return String(result.message);
        }

        if (result.error) {
            if (typeof result.error === "string") {
                return result.error;
            }

            if (result.error.message) {
                return String(result.error.message);
            }
        }

        if (result.data && typeof result.data === "object") {
            if (result.data.message) {
                return String(result.data.message);
            }
        }

        return "ไม่สามารถดำเนินการได้";
    }

    function createError(message, status, code, raw) {
        var error = new Error(message || "เกิดข้อผิดพลาด");
        error.status = status || 0;
        error.code = code || "";
        error.raw = raw || null;
        return error;
    }

    function getStorage() {
        try {
            return window.localStorage;
        } catch (error) {
            return window.sessionStorage;
        }
    }

    function storageGet(key) {
        try {
            var storage = getStorage();
            return storage.getItem(key) || "";
        } catch (error) {
            return "";
        }
    }

    function storageSet(key, value) {
        try {
            var storage = getStorage();
            storage.setItem(key, String(value));
            return true;
        } catch (error) {
            return false;
        }
    }

    function storageRemove(key) {
        try {
            var storage = getStorage();
            storage.removeItem(key);
        } catch (error) {
        }
    }

    function saveSession(token, user, expiresAt) {
        state.token = token || "";
        state.user = user || null;
        state.expiresAt = expiresAt || "";

        if (state.token) {
            storageSet(CONFIG.SESSION_KEY, state.token);
        }

        if (state.user) {
            storageSet(CONFIG.USER_KEY, JSON.stringify(state.user));
        }

        if (state.expiresAt) {
            storageSet(CONFIG.EXPIRES_KEY, state.expiresAt);
        }
    }

    function loadStoredSession() {
        state.token = storageGet(CONFIG.SESSION_KEY);
        state.expiresAt = storageGet(CONFIG.EXPIRES_KEY);

        var storedUser = storageGet(CONFIG.USER_KEY);

        if (storedUser) {
            var parsedUser = parseMaybeJson(storedUser);

            if (parsedUser && typeof parsedUser === "object") {
                state.user = parsedUser;
            }
        }
    }

    function clearSession() {
        state.token = "";
        state.user = null;
        state.expiresAt = "";
        state.bootstrap = null;
        state.settings = [];
        state.accounts = [];
        state.categories = [];
        state.customers = [];
        state.vendors = [];
        state.users = [];
        state.documents = [];
        state.currentData = [];
        state.currentRecord = null;
        state.editingId = "";

        storageRemove(CONFIG.SESSION_KEY);
        storageRemove(CONFIG.USER_KEY);
        storageRemove(CONFIG.EXPIRES_KEY);
    }

    function isLoggedIn() {
        return !!state.token;
    }

    function getUserRole() {
        if (!state.user) {
            return "";
        }

        return String(
            state.user.role ||
            state.user.userRole ||
            state.user.type ||
            ""
        ).toLowerCase();
    }

    function isAdmin() {
        var role = getUserRole();

        return role === "admin" ||
            role === "administrator" ||
            role === "ผู้ดูแลระบบ";
    }

    function canAccessPage(page) {
        if (page === "users" || page === "settings" || page === "auditlogs") {
            return isAdmin();
        }

        return true;
    }

    function formatMoney(value) {
        var number = parseFloat(value);

        if (!isFinite(number)) {
            number = 0;
        }

        return new Intl.NumberFormat(CONFIG.LOCALE, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(number);
    }

    function formatInteger(value) {
        var number = parseFloat(value);

        if (!isFinite(number)) {
            number = 0;
        }

        return new Intl.NumberFormat(CONFIG.LOCALE, {
            maximumFractionDigits: 0
        }).format(number);
    }

    function formatDate(value) {
        if (!value) {
            return "";
        }

        var date = new Date(value);

        if (isNaN(date.getTime())) {
            var text = String(value);

            if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
                var parts = text.split("-");
                return parts[2] + "/" + parts[1] + "/" + (parseInt(parts[0], 10) + 543);
            }

            return text;
        }

        return new Intl.DateTimeFormat(CONFIG.LOCALE, {
            day: "2-digit",
            month: "2-digit",
            year: "numeric"
        }).format(date);
    }

    function formatDateTime(value) {
        if (!value) {
            return "";
        }

        var date = new Date(value);

        if (isNaN(date.getTime())) {
            return String(value);
        }

        return new Intl.DateTimeFormat(CONFIG.LOCALE, {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        }).format(date);
    }

    function toInputDate(value) {
        if (!value) {
            var now = new Date();

            return now.getFullYear() +
                "-" +
                String(now.getMonth() + 1).padStart(2, "0") +
                "-" +
                String(now.getDate()).padStart(2, "0");
        }

        var date = new Date(value);

        if (isNaN(date.getTime())) {
            var text = String(value);

            if (/^\d{4}-\d{2}-\d{2}/.test(text)) {
                return text.substring(0, 10);
            }

            return "";
        }

        return date.getFullYear() +
            "-" +
            String(date.getMonth() + 1).padStart(2, "0") +
            "-" +
            String(date.getDate()).padStart(2, "0");
    }

    function parseNumber(value) {
        if (value === null || value === undefined || value === "") {
            return 0;
        }

        var cleaned = String(value)
            .replace(/,/g, "")
            .replace(/บาท/g, "")
            .trim();

        var number = parseFloat(cleaned);

        if (!isFinite(number)) {
            return 0;
        }

        return number;
    }

    function generateId(prefix) {
        var randomPart = Math.random().toString(36).substring(2, 12);
        var timePart = Date.now().toString(36);

        return String(prefix || "ID") + "_" + timePart + "_" + randomPart;
    }

    function debounce(callback, wait) {
        var timeout = null;

        return function () {
            var context = this;
            var args = arguments;

            clearTimeout(timeout);

            timeout = setTimeout(function () {
                callback.apply(context, args);
            }, wait || 300);
        };
    }

    function setLoading(value, text) {
        state.loading = !!value;

        var loaders = qsa("[data-loading]");

        loaders.forEach(function (element) {
            if (state.loading) {
                showElement(element);
            } else {
                hideElement(element);
            }
        });

        var loadingText = qs("[data-loading-text]");

        if (loadingText && text) {
            loadingText.textContent = text;
        }

        var loginButton = byId("loginButton") ||
            byId("loginBtn") ||
            qs("[data-login-submit]");

        if (loginButton && state.loginInProgress) {
            loginButton.disabled = true;
        }
    }

    function showToast(message, type) {
        var container = byId("toastContainer");

        if (!container) {
            container = document.createElement("div");
            container.id = "toastContainer";
            container.className = "toast-container";
            document.body.appendChild(container);
        }

        var toast = document.createElement("div");

        toast.className = "toast toast-" + String(type || "info");

        toast.innerHTML =
            '<div class="toast-message">' +
            escapeHtml(message) +
            "</div>";

        container.appendChild(toast);

        setTimeout(function () {
            toast.classList.add("toast-hide");

            setTimeout(function () {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, 3500);
    }

    function confirmAction(message) {
        return window.confirm(message || "ยืนยันการดำเนินการหรือไม่");
    }

    function getApiUrl() {
        var url = CONFIG.API_URL;

        if (!url) {
            var element = qs("[data-api-url]");

            if (element) {
                url = element.getAttribute("data-api-url") || "";
            }
        }

        return String(url || "").trim();
    }

    function buildRequest(action, payload, includeToken) {
        var request = {};

        request.action = action;

        if (includeToken !== false && state.token) {
            request.token = state.token;
        }

        if (payload && typeof payload === "object") {
            Object.keys(payload).forEach(function (key) {
                var value = payload[key];

                if (value === undefined) {
                    return;
                }

                request[key] = value;
            });
        }

        return request;
    }

    function requestToFormData(request) {
        var params = new URLSearchParams();

        Object.keys(request).forEach(function (key) {
            var value = request[key];

            if (value === null || value === undefined) {
                return;
            }

            if (typeof value === "object") {
                params.set(key, JSON.stringify(value));
            } else {
                params.set(key, String(value));
            }
        });

        return params;
    }

    function shouldTryFormFallback(action) {
        var readActions = [
            "login",
            "ping",
            "me",
            "bootstrap",
            "dashboard",
            "report",
            "list",
            "get",
            "settings",
            "auditlogs",
            "getDocumentWithItems",
            "getRecentTransactions"
        ];

        return readActions.indexOf(action) !== -1;
    }

    async function fetchWithTimeout(url, options) {
        var controller = null;
        var timeoutId = null;

        if (window.AbortController) {
            controller = new AbortController();

            options.signal = controller.signal;

            timeoutId = setTimeout(function () {
                controller.abort();
            }, CONFIG.REQUEST_TIMEOUT);
        }

        try {
            return await fetch(url, options);
        } finally {
            if (timeoutId) {
                clearTimeout(timeoutId);
            }
        }
    }

    async function parseFetchResponse(response) {
        var text = await response.text();

        var parsed = parseMaybeJson(text);

        if (!response.ok) {
            throw createError(
                extractMessage(parsed) || "เซิร์ฟเวอร์ไม่สามารถตอบสนองได้",
                response.status,
                "",
                parsed
            );
        }

        return parsed;
    }

    async function apiRequest(action, payload, options) {
        var apiUrl = getApiUrl();

        if (!apiUrl) {
            throw createError(
                "ยังไม่ได้กำหนด URL ของ Google Apps Script Web App ใน app.js",
                0,
                "NO_API_URL",
                null
            );
        }

        var requestOptions = options || {};
        var includeToken = requestOptions.includeToken !== false;
        var request = buildRequest(action, payload || {}, includeToken);

        var jsonBody = JSON.stringify(request);

        try {
            var response = await fetchWithTimeout(apiUrl, {
                method: "POST",
                headers: {
                    "Content-Type": "text/plain;charset=UTF-8",
                    "Accept": "application/json,text/plain,*/*"
                },
                body: jsonBody,
                redirect: "follow",
                cache: "no-store"
            });

            return await parseFetchResponse(response);
        } catch (jsonError) {
            if (!shouldTryFormFallback(action)) {
                throw jsonError;
            }

            try {
                var formResponse = await fetchWithTimeout(apiUrl, {
                    method: "POST",
                    body: requestToFormData(request),
                    redirect: "follow",
                    cache: "no-store"
                });

                return await parseFetchResponse(formResponse);
            } catch (formError) {
                if (jsonError && jsonError.name === "AbortError") {
                    throw createError(
                        "การเชื่อมต่อ Google Apps Script ใช้เวลานานเกินกำหนด",
                        408,
                        "TIMEOUT",
                        null
                    );
                }

                throw formError;
            }
        }
    }

    function isUnauthorizedError(error) {
        if (!error) {
            return false;
        }

        if (error.status === 401) {
            return true;
        }

        if (String(error.code || "").toUpperCase() === "UNAUTHORIZED") {
            return true;
        }

        var message = String(error.message || "").toLowerCase();

        if (
            message.indexOf("unauthorized") !== -1 ||
            message.indexOf("session") !== -1 ||
            message.indexOf("token") !== -1 ||
            message.indexOf("หมดอายุ") !== -1 ||
            message.indexOf("เข้าสู่ระบบ") !== -1
        ) {
            return true;
        }

        return false;
    }

    async function login(username, password) {
        if (state.loginInProgress) {
            return;
        }

        username = String(username || "").trim();
        password = String(password || "");

        if (!username) {
            showToast("กรุณากรอกชื่อผู้ใช้งาน", "warning");
            return;
        }

        if (!password) {
            showToast("กรุณากรอกรหัสผ่าน", "warning");
            return;
        }

        state.loginInProgress = true;
        setLoading(true, "กำลังตรวจสอบข้อมูลเข้าสู่ระบบ");

        var button = byId("loginButton") ||
            byId("loginBtn") ||
            qs("[data-login-submit]");

        var oldButtonText = "";

        if (button) {
            oldButtonText = button.textContent;
            button.disabled = true;
            button.textContent = "กำลังเข้าสู่ระบบ...";
        }

        try {
            var response = await apiRequest(
                "login",
                {
                    username: username,
                    password: password
                },
                {
                    includeToken: false
                }
            );

            var normalized = normalizeResponse(response);

            if (!responseSuccess(normalized)) {
                throw createError(
                    extractMessage(normalized) || "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง",
                    401,
                    "LOGIN_FAILED",
                    normalized
                );
            }

            var token = extractToken(normalized);
            var user = extractUser(normalized);
            var expiresAt = extractExpiresAt(normalized);

            if (!token) {
                throw createError(
                    "เข้าสู่ระบบสำเร็จแต่เซิร์ฟเวอร์ไม่ได้ส่ง Session Token กลับมา",
                    500,
                    "NO_SESSION_TOKEN",
                    normalized
                );
            }

            saveSession(token, user, expiresAt);

            updateUserInformation();

            try {
                await loadBootstrap();
            } catch (bootstrapError) {
                if (isUnauthorizedError(bootstrapError)) {
                    clearSession();
                    throw bootstrapError;
                }

                showToast(
                    "เข้าสู่ระบบสำเร็จ แต่โหลดข้อมูลระบบเริ่มต้นไม่สำเร็จ",
                    "warning"
                );
            }

            showApplication();

            try {
                await navigate("dashboard", true);
            } catch (dashboardError) {
                showToast(
                    "เข้าสู่ระบบสำเร็จ แต่ไม่สามารถโหลด Dashboard ได้",
                    "warning"
                );
            }

            showToast("เข้าสู่ระบบสำเร็จ", "success");
        } catch (error) {
            console.error("LOGIN ERROR", error);

            var message = error.message ||
                "ไม่สามารถเข้าสู่ระบบได้";

            if (error.code === "NO_API_URL") {
                message = "ยังไม่ได้กำหนด URL ของ Google Apps Script Web App";
            }

            showToast(message, "error");

            hideApplication();
            showLoginScreen();
        } finally {
            state.loginInProgress = false;
            setLoading(false);

            if (button) {
                button.disabled = false;

                if (oldButtonText) {
                    button.textContent = oldButtonText;
                }
            }
        }
    }

    async function logout() {
        var currentToken = state.token;

        try {
            if (currentToken) {
                await apiRequest(
                    "logout",
                    {},
                    {
                        includeToken: true
                    }
                );
            }
        } catch (error) {
            console.warn("Logout API error", error);
        }

        clearSession();

        hideApplication();
        showLoginScreen();

        var passwordInput = getLoginPasswordInput();

        if (passwordInput) {
            passwordInput.value = "";
        }

        showToast("ออกจากระบบแล้ว", "success");
    }

    async function restoreSession() {
        loadStoredSession();

        if (!state.token) {
            showLoginScreen();
            return false;
        }

        try {
            var meResponse = await apiRequest(
                "me",
                {},
                {
                    includeToken: true
                }
            );

            if (!responseSuccess(meResponse)) {
                throw createError(
                    extractMessage(meResponse),
                    401,
                    "UNAUTHORIZED",
                    meResponse
                );
            }

            var user = extractUser(meResponse);

            if (user) {
                state.user = user;
                storageSet(CONFIG.USER_KEY, JSON.stringify(user));
            }

            var responseToken = extractToken(meResponse);

            if (responseToken) {
                state.token = responseToken;
                storageSet(CONFIG.SESSION_KEY, responseToken);
            }

            var responseExpires = extractExpiresAt(meResponse);

            if (responseExpires) {
                state.expiresAt = responseExpires;
                storageSet(CONFIG.EXPIRES_KEY, responseExpires);
            }

            try {
                await loadBootstrap();
            } catch (bootstrapError) {
                if (isUnauthorizedError(bootstrapError)) {
                    throw bootstrapError;
                }

                showToast(
                    "Session ยังใช้งานได้ แต่โหลดข้อมูลเริ่มต้นไม่สำเร็จ",
                    "warning"
                );
            }

            showApplication();
            updateUserInformation();

            try {
                await navigate("dashboard", true);
            } catch (dashboardError) {
                showToast(
                    "ไม่สามารถโหลด Dashboard ได้",
                    "warning"
                );
            }

            return true;
        } catch (error) {
            console.warn("RESTORE SESSION ERROR", error);

            clearSession();
            hideApplication();
            showLoginScreen();

            return false;
        }
    }

    function getLoginForm() {
        return byId("loginForm") ||
            qs("form[data-login-form]");
    }

    function getLoginUsernameInput() {
        return byId("loginUsername") ||
            byId("username") ||
            qs('input[name="username"]') ||
            qs('input[name="userName"]');
    }

    function getLoginPasswordInput() {
        return byId("loginPassword") ||
            byId("password") ||
            qs('input[name="password"]');
    }

    function getLoginSubmitButton() {
        return byId("loginButton") ||
            byId("loginBtn") ||
            qs("[data-login-submit]") ||
            qs('#loginForm button[type="submit"]');
    }

    function handleLoginSubmit(event) {
        if (event) {
            event.preventDefault();
            event.stopPropagation();

            if (event.stopImmediatePropagation) {
                event.stopImmediatePropagation();
            }

            event.returnValue = false;
        }

        if (state.loginInProgress) {
            return false;
        }

        var usernameInput = getLoginUsernameInput();
        var passwordInput = getLoginPasswordInput();

        var username = usernameInput ? usernameInput.value : "";
        var password = passwordInput ? passwordInput.value : "";

        login(username, password);

        return false;
    }

    function bindLoginEvents() {
        var form = getLoginForm();

        if (form) {
            form.setAttribute("novalidate", "novalidate");

            form.addEventListener(
                "submit",
                function (event) {
                    handleLoginSubmit(event);
                },
                true
            );
        }

        var button = getLoginSubmitButton();

        if (button) {
            button.addEventListener(
                "click",
                function (event) {
                    handleLoginSubmit(event);
                },
                true
            );
        }

        document.addEventListener(
            "keydown",
            function (event) {
                var target = event.target;

                if (!target) {
                    return;
                }

                var formElement = target.closest ?
                    target.closest("form") :
                    null;

                if (!formElement) {
                    return;
                }

                if (formElement === form && event.key === "Enter") {
                    event.preventDefault();

                    if (event.stopImmediatePropagation) {
                        event.stopImmediatePropagation();
                    }

                    handleLoginSubmit(event);
                }
            },
            true
        );
    }

    function showLoginScreen() {
        var loginScreen = byId("loginScreen") ||
            byId("loginPage") ||
            byId("loginContainer") ||
            qs("[data-login-screen]");

        var appShell = byId("appShell") ||
            byId("appLayout") ||
            byId("application") ||
            qs("[data-app-shell]");

        if (loginScreen) {
            showElement(loginScreen);
        }

        if (appShell) {
            hideElement(appShell);
        }

        qsa("[data-authenticated]").forEach(function (element) {
            hideElement(element);
        });

        document.body.classList.remove("logged-in");
        document.body.classList.add("logged-out");
    }

    function showApplication() {
        var loginScreen = byId("loginScreen") ||
            byId("loginPage") ||
            byId("loginContainer") ||
            qs("[data-login-screen]");

        var appShell = byId("appShell") ||
            byId("appLayout") ||
            byId("application") ||
            qs("[data-app-shell]");

        if (loginScreen) {
            hideElement(loginScreen);
        }

        if (appShell) {
            showElement(appShell);
        }

        qsa("[data-authenticated]").forEach(function (element) {
            showElement(element);
        });

        document.body.classList.remove("logged-out");
        document.body.classList.add("logged-in");

        updateUserInformation();
        updatePermissionVisibility();
    }

    function hideApplication() {
        var appShell = byId("appShell") ||
            byId("appLayout") ||
            byId("application") ||
            qs("[data-app-shell]");

        if (appShell) {
            hideElement(appShell);
        }
    }

    function updateUserInformation() {
        var user = state.user;

        if (!user) {
            return;
        }

        var displayName = safeText(
            user.fullName ||
            user.name ||
            user.username,
            "ผู้ใช้งาน"
        );

        var username = safeText(user.username, "");
        var role = safeText(user.role, "");

        var nameElements = [
            byId("userDisplayName"),
            byId("currentUserName"),
            byId("profileName")
        ];

        nameElements.forEach(function (element) {
            if (element) {
                element.textContent = displayName;
            }
        });

        var usernameElements = [
            byId("userUsername"),
            byId("currentUsername"),
            byId("profileUsername")
        ];

        usernameElements.forEach(function (element) {
            if (element) {
                element.textContent = username;
            }
        });

        var roleElements = [
            byId("userRole"),
            byId("currentUserRole"),
            byId("profileRole")
        ];

        roleElements.forEach(function (element) {
            if (element) {
                element.textContent = role;
            }
        });

        qsa("[data-user-name]").forEach(function (element) {
            element.textContent = displayName;
        });

        qsa("[data-user-role]").forEach(function (element) {
            element.textContent = role;
        });
    }

    function updatePermissionVisibility() {
        var restricted = [
            "users",
            "settings",
            "auditlogs"
        ];

        restricted.forEach(function (page) {
            qsa(
                '[data-page="' + page + '"], [data-nav="' + page + '"]'
            ).forEach(function (element) {
                if (isAdmin()) {
                    showElement(element);
                } else {
                    hideElement(element);
                }
            });
        });
    }

    async function loadBootstrap() {
        var response = await apiRequest(
            "bootstrap",
            {},
            {
                includeToken: true
            }
        );

        if (!responseSuccess(response)) {
            throw createError(
                extractMessage(response),
                401,
                "BOOTSTRAP_FAILED",
                response
            );
        }

        var data = normalizeResponse(response);

        if (data.data && typeof data.data === "object") {
            data = data.data;
        }

        if (data.result && typeof data.result === "object") {
            data = data.result;
        }

        state.bootstrap = data || {};

        state.settings = normalizeArray(
            data.settings ||
            data.Settings
        );

        state.accounts = normalizeArray(
            data.accounts ||
            data.Accounts
        );

        state.categories = normalizeArray(
            data.categories ||
            data.Categories
        );

        state.customers = normalizeArray(
            data.customers ||
            data.Customers
        );

        state.vendors = normalizeArray(
            data.vendors ||
            data.Vendors ||
            data.suppliers
        );

        state.users = normalizeArray(
            data.users ||
            data.Users
        );

        state.documents = normalizeArray(
            data.documents ||
            data.Documents
        );

        var bootstrapUser = extractUser(data);

        if (bootstrapUser) {
            state.user = bootstrapUser;
            storageSet(CONFIG.USER_KEY, JSON.stringify(bootstrapUser));
        }

        updateUserInformation();
        updatePermissionVisibility();

        return data;
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

            if (Array.isArray(value.data)) {
                return value.data;
            }

            if (Array.isArray(value.items)) {
                return value.items;
            }

            var keys = Object.keys(value);

            if (keys.length) {
                var output = [];

                keys.forEach(function (key) {
                    if (value[key] && typeof value[key] === "object") {
                        output.push(value[key]);
                    }
                });

                return output;
            }
        }

        return [];
    }

    async function navigate(page, silent) {
        page = String(page || "dashboard");

        if (!PAGE_NAMES[page]) {
            page = "dashboard";
        }

        if (!canAccessPage(page)) {
            if (!silent) {
                showToast("คุณไม่มีสิทธิ์เข้าถึงเมนูนี้", "warning");
            }

            page = "dashboard";
        }

        state.currentPage = page;

        updateNavigationState(page);
        showPageSection(page);

        var title = PAGE_NAMES[page];

        setTextByIds(
            [
                "pageTitle",
                "contentTitle",
                "breadcrumbCurrent"
            ],
            title
        );

        try {
            if (page === "dashboard") {
                await renderDashboard();
            } else if (page === "income") {
                await renderIncomePage();
            } else if (page === "expense") {
                await renderExpensePage();
            } else if (page === "transfers") {
                await renderTransfersPage();
            } else if (page === "accounts") {
                await renderAccountsPage();
            } else if (page === "customers") {
                await renderCustomersPage();
            } else if (page === "vendors") {
                await renderVendorsPage();
            } else if (page === "documents") {
                await renderDocumentsPage();
            } else if (page === "users") {
                await renderUsersPage();
            } else if (page === "settings") {
                await renderSettingsPage();
            } else if (page === "auditlogs") {
                await renderAuditLogsPage();
            } else if (page === "reports") {
                await renderReportsPage();
            }
        } catch (error) {
            console.error("NAVIGATION ERROR", error);

            if (isUnauthorizedError(error)) {
                clearSession();
                hideApplication();
                showLoginScreen();
                showToast("Session หมดอายุ กรุณาเข้าสู่ระบบใหม่", "warning");
                return;
            }

            showToast(
                error.message || "ไม่สามารถโหลดข้อมูลหน้าเว็บได้",
                "error"
            );
        }
    }

    function updateNavigationState(page) {
        qsa("[data-page]").forEach(function (element) {
            var target = element.getAttribute("data-page");

            if (target === page) {
                element.classList.add("active");
                element.setAttribute("aria-current", "page");
            } else {
                element.classList.remove("active");
                element.removeAttribute("aria-current");
            }
        });

        qsa("[data-nav]").forEach(function (element) {
            var target = element.getAttribute("data-nav");

            if (target === page) {
                element.classList.add("active");
            } else {
                element.classList.remove("active");
            }
        });
    }

    function showPageSection(page) {
        var sections = qsa(
            "[data-page-section], .page-section, section[id^='page-']"
        );

        sections.forEach(function (section) {
            var sectionPage = section.getAttribute("data-page-section");

            if (!sectionPage && section.id.indexOf("page-") === 0) {
                sectionPage = section.id.substring(5);
            }

            if (sectionPage === page) {
                showElement(section);
            } else {
                hideElement(section);
            }
        });
    }

    function setTextByIds(ids, value) {
        ids.forEach(function (id) {
            var element = byId(id);

            if (element) {
                element.textContent = safeText(value, "");
            }
        });
    }

    function getPageContainer(page) {
        var candidates = [
            "page-" + page + "-content",
            page + "Content",
            page + "PageContent",
            "content-" + page,
            "table-" + page,
            page + "TableContainer"
        ];

        for (var i = 0; i < candidates.length; i++) {
            var element = byId(candidates[i]);

            if (element) {
                return element;
            }
        }

        var section = byId("page-" + page);

        if (section) {
            var content = section.querySelector("[data-content]");

            if (content) {
                return content;
            }

            return section;
        }

        return null;
    }

    function findTableContainer(entity) {
        var candidates = [
            entity + "TableContainer",
            entity + "Table",
            "table" + capitalize(entity),
            "dataTable",
            "mainTableContainer"
        ];

        for (var i = 0; i < candidates.length; i++) {
            var element = byId(candidates[i]);

            if (element) {
                return element;
            }
        }

        return getPageContainer(entity);
    }

    function capitalize(value) {
        var text = String(value || "");

        if (!text) {
            return "";
        }

        return text.charAt(0).toUpperCase() + text.substring(1);
    }

    function renderEmpty(container, message) {
        if (!container) {
            return;
        }

        container.innerHTML =
            '<div class="empty-state">' +
            '<div class="empty-state-title">' +
            escapeHtml(message || "ไม่พบข้อมูล") +
            "</div>" +
            "</div>";
    }

    function createPageHeader(title, description, buttons) {
        var buttonHtml = "";

        if (Array.isArray(buttons)) {
            buttons.forEach(function (button) {
                buttonHtml +=
                    '<button type="button" class="' +
                    escapeAttribute(button.className || "btn btn-primary") +
                    '" data-action="' +
                    escapeAttribute(button.action || "") +
                    '">' +
                    escapeHtml(button.label || "ดำเนินการ") +
                    "</button>";
            });
        }

        return (
            '<div class="page-header">' +
            '<div class="page-header-text">' +
            '<h2>' +
            escapeHtml(title) +
            "</h2>" +
            '<div class="page-description">' +
            escapeHtml(description || "") +
            "</div>" +
            "</div>" +
            '<div class="page-header-actions">' +
            buttonHtml +
            "</div>" +
            "</div>"
        );
    }

    function createSearchBar(placeholder, action, exportAction) {
        return (
            '<div class="toolbar">' +
            '<div class="toolbar-search">' +
            '<input type="search" class="form-control" ' +
            'placeholder="' +
            escapeAttribute(placeholder || "ค้นหา") +
            '" data-search-input="' +
            escapeAttribute(action || "") +
            '">' +
            "</div>" +
            '<div class="toolbar-actions">' +
            '<button type="button" class="btn btn-secondary" data-action="' +
            escapeAttribute(action || "") +
            '">ค้นหา</button>' +
            (
                exportAction ?
                '<button type="button" class="btn btn-secondary" data-action="' +
                escapeAttribute(exportAction) +
                '">ส่งออก Excel</button>' :
                ""
            ) +
            "</div>" +
            "</div>"
        );
    }

    function renderTable(container, columns, rows, options) {
        if (!container) {
            return;
        }

        var settings = options || {};
        var data = Array.isArray(rows) ? rows : [];

        if (!data.length) {
            renderEmpty(container, settings.emptyMessage || "ไม่พบข้อมูล");
            return;
        }

        var html = "";

        html += '<div class="table-responsive">';
        html += '<table class="data-table">';
        html += "<thead>";
        html += "<tr>";

        columns.forEach(function (column) {
            html +=
                '<th class="' +
                escapeAttribute(column.className || "") +
                '">' +
                escapeHtml(column.label || "") +
                "</th>";
        });

        if (settings.actions) {
            html += '<th class="table-actions-header">จัดการ</th>';
        }

        html += "</tr>";
        html += "</thead>";
        html += "<tbody>";

        data.forEach(function (row, index) {
            html += "<tr>";

            columns.forEach(function (column) {
                var value = "";

                if (typeof column.render === "function") {
                    value = column.render(row, index);
                } else {
                    value = row[column.key];
                }

                html +=
                    '<td class="' +
                    escapeAttribute(column.className || "") +
                    '">' +
                    safeHtmlValue(value) +
                    "</td>";
            });

            if (settings.actions) {
                html += '<td class="table-actions">';

                if (settings.actions.edit !== false) {
                    html +=
                        '<button type="button" class="btn btn-sm btn-secondary" ' +
                        'data-action="' +
                        escapeAttribute(settings.actions.editAction || "edit-record") +
                        '" data-id="' +
                        escapeAttribute(getRowId(row)) +
                        '">แก้ไข</button>';
                }

                if (settings.actions.delete !== false) {
                    html +=
                        '<button type="button" class="btn btn-sm btn-danger" ' +
                        'data-action="' +
                        escapeAttribute(settings.actions.deleteAction || "delete-record") +
                        '" data-id="' +
                        escapeAttribute(getRowId(row)) +
                        '">ลบ</button>';
                }

                html += "</td>";
            }

            html += "</tr>";
        });

        html += "</tbody>";
        html += "</table>";
        html += "</div>";

        container.innerHTML = html;
    }

    function safeHtmlValue(value) {
        if (value === null || value === undefined) {
            return "";
        }

        if (typeof value === "string" && value.indexOf("<") !== -1) {
            return value;
        }

        return escapeHtml(value);
    }

    function getRowId(row) {
        if (!row) {
            return "";
        }

        return String(
            row.id ||
            row.ID ||
            row._id ||
            row.uuid ||
            ""
        );
    }

    function getRecordById(rows, id) {
        var list = Array.isArray(rows) ? rows : [];

        for (var i = 0; i < list.length; i++) {
            if (String(getRowId(list[i])) === String(id)) {
                return list[i];
            }
        }

        return null;
    }

    async function listEntity(entity, filters) {
        var response = await apiRequest(
            "list",
            {
                entity: entity,
                filters: filters || {}
            },
            {
                includeToken: true
            }
        );

        if (!responseSuccess(response)) {
            throw createError(
                extractMessage(response),
                0,
                "LIST_FAILED",
                response
            );
        }

        var data = normalizeResponse(response);

        if (data.data !== undefined) {
            data = parseMaybeJson(data.data);
        }

        if (data.result !== undefined) {
            data = parseMaybeJson(data.result);
        }

        if (data.rows !== undefined) {
            data = data.rows;
        }

        if (data.items !== undefined) {
            data = data.items;
        }

        return normalizeArray(data);
    }

    async function getEntity(entity, id) {
        var response = await apiRequest(
            "get",
            {
                entity: entity,
                id: id
            },
            {
                includeToken: true
            }
        );

        if (!responseSuccess(response)) {
            throw createError(
                extractMessage(response),
                0,
                "GET_FAILED",
                response
            );
        }

        var data = normalizeResponse(response);

        if (data.data !== undefined) {
            data = parseMaybeJson(data.data);
        }

        if (data.result !== undefined) {
            data = parseMaybeJson(data.result);
        }

        return data;
    }

    async function createEntity(entity, data) {
        var response = await apiRequest(
            "create",
            {
                entity: entity,
                data: data
            },
            {
                includeToken: true
            }
        );

        if (!responseSuccess(response)) {
            throw createError(
                extractMessage(response),
                0,
                "CREATE_FAILED",
                response
            );
        }

        return response;
    }

    async function updateEntity(entity, id, data) {
        var response = await apiRequest(
            "update",
            {
                entity: entity,
                id: id,
                data: data
            },
            {
                includeToken: true
            }
        );

        if (!responseSuccess(response)) {
            throw createError(
                extractMessage(response),
                0,
                "UPDATE_FAILED",
                response
            );
        }

        return response;
    }

    async function deleteEntity(entity, id) {
        var response = await apiRequest(
            "delete",
            {
                entity: entity,
                id: id
            },
            {
                includeToken: true
            }
        );

        if (!responseSuccess(response)) {
            throw createError(
                extractMessage(response),
                0,
                "DELETE_FAILED",
                response
            );
        }

        return response;
    }

    async function renderDashboard() {
        var container = getPageContainer("dashboard");

        if (!container) {
            return;
        }

        container.innerHTML =
            createPageHeader(
                "แดชบอร์ด",
                "ภาพรวมข้อมูลทางการเงินของกิจการ",
                [
                    {
                        label: "รีเฟรช",
                        action: "refresh-dashboard",
                        className: "btn btn-secondary"
                    }
                ]
            ) +
            '<div class="dashboard-loading">กำลังโหลดข้อมูล...</div>';

        var dateFrom = getFilterDate("dashboardDateFrom", "start");
        var dateTo = getFilterDate("dashboardDateTo", "end");

        try {
            var response = await apiRequest(
                "dashboard",
                {
                    dateFrom: dateFrom,
                    dateTo: dateTo
                },
                {
                    includeToken: true
                }
            );

            if (!responseSuccess(response)) {
                throw createError(
                    extractMessage(response),
                    0,
                    "DASHBOARD_FAILED",
                    response
                );
            }

            var data = normalizeResponse(response);

            if (data.data && typeof data.data === "object") {
                data = data.data;
            }

            if (data.result && typeof data.result === "object") {
                data = data.result;
            }

            state.dashboardData = data;

            renderDashboardContent(container, data);
        } catch (error) {
            console.error("DASHBOARD ERROR", error);

            container.innerHTML =
                createPageHeader(
                    "แดชบอร์ด",
                    "ภาพรวมข้อมูลทางการเงินของกิจการ",
                    [
                        {
                            label: "ลองใหม่",
                            action: "refresh-dashboard",
                            className: "btn btn-secondary"
                        }
                    ]
                ) +
                '<div class="error-state">' +
                escapeHtml(error.message || "ไม่สามารถโหลด Dashboard ได้") +
                "</div>";

            throw error;
        }
    }

    function getFilterDate(id, type) {
        var element = byId(id);

        if (element && element.value) {
            return element.value;
        }

        var now = new Date();

        if (type === "start") {
            return now.getFullYear() +
                "-" +
                String(now.getMonth() + 1).padStart(2, "0") +
                "-01";
        }

        return now.getFullYear() +
            "-" +
            String(now.getMonth() + 1).padStart(2, "0") +
            "-" +
            String(now.getDate()).padStart(2, "0");
    }

    function extractNumber(data, keys) {
        if (!data || typeof data !== "object") {
            return 0;
        }

        for (var i = 0; i < keys.length; i++) {
            var key = keys[i];

            if (data[key] !== undefined && data[key] !== null) {
                var number = parseNumber(data[key]);

                if (number !== 0 || String(data[key]) === "0") {
                    return number;
                }
            }
        }

        return 0;
    }

    function renderDashboardContent(container, data) {
        var income = extractNumber(
            data,
            [
                "income",
                "totalIncome",
                "incomeTotal",
                "totalRevenue",
                "revenue"
            ]
        );

        var expense = extractNumber(
            data,
            [
                "expense",
                "totalExpense",
                "expenseTotal",
                "totalExpenses"
            ]
        );

        var net = extractNumber(
            data,
            [
                "net",
                "netIncome",
                "profit",
                "balance"
            ]
        );

        if (!net) {
            net = income - expense;
        }

        var balance = extractNumber(
            data,
            [
                "balance",
                "cashBalance",
                "totalBalance",
                "accountBalance"
            ]
        );

        var accounts = normalizeArray(
            data.accounts ||
            data.accountBalances ||
            data.balances
        );

        var transactions = normalizeArray(
            data.recentTransactions ||
            data.transactions ||
            data.recent
        );

        var html = "";

        html += createPageHeader(
            "แดชบอร์ด",
            "ภาพรวมข้อมูลทางการเงินของกิจการ",
            [
                {
                    label: "รีเฟรช",
                    action: "refresh-dashboard",
                    className: "btn btn-secondary"
                }
            ]
        );

        html +=
            '<div class="dashboard-filters">' +
            '<div class="form-group">' +
            "<label>ตั้งแต่วันที่</label>" +
            '<input type="date" class="form-control" id="dashboardDateFrom" value="' +
            escapeAttribute(getFilterDate("dashboardDateFrom", "start")) +
            '">' +
            "</div>" +
            '<div class="form-group">' +
            "<label>ถึงวันที่</label>" +
            '<input type="date" class="form-control" id="dashboardDateTo" value="' +
            escapeAttribute(getFilterDate("dashboardDateTo", "end")) +
            '">' +
            "</div>" +
            '<div class="form-group form-group-button">' +
            '<button type="button" class="btn btn-primary" data-action="refresh-dashboard">ค้นหา</button>' +
            "</div>" +
            "</div>";

        html += '<div class="dashboard-cards">';

        html += createDashboardCard(
            "รายรับ",
            income,
            "income",
            "dashboard-income"
        );

        html += createDashboardCard(
            "รายจ่าย",
            expense,
            "expense",
            "dashboard-expense"
        );

        html += createDashboardCard(
            "คงเหลือสุทธิ",
            net,
            "net",
            "dashboard-net"
        );

        html += createDashboardCard(
            "ยอดคงเหลือ",
            balance,
            "balance",
            "dashboard-balance"
        );

        html += "</div>";

        html +=
            '<div class="dashboard-grid">';

        html +=
            '<div class="dashboard-panel">' +
            '<div class="panel-header">' +
            "<h3>ยอดเงินตามบัญชี</h3>" +
            "</div>" +
            '<div class="panel-body">';

        if (accounts.length) {
            html += '<div class="mini-table">';

            accounts.forEach(function (account) {
                var name = safeText(
                    account.name ||
                    account.accountName,
                    "-"
                );

                var amount = extractNumber(
                    account,
                    [
                        "balance",
                        "amount",
                        "currentBalance"
                    ]
                );

                html +=
                    '<div class="mini-table-row">' +
                    "<div>" +
                    escapeHtml(name) +
                    "</div>" +
                    "<strong>" +
                    formatMoney(amount) +
                    " บาท</strong>" +
                    "</div>";
            });

            html += "</div>";
        } else {
            html += '<div class="empty-state">ไม่มีข้อมูลบัญชี</div>';
        }

        html += "</div>";
        html += "</div>";

        html +=
            '<div class="dashboard-panel">' +
            '<div class="panel-header">' +
            "<h3>รายการล่าสุด</h3>" +
            "</div>" +
            '<div class="panel-body">';

        if (transactions.length) {
            html += '<div class="mini-table">';

            transactions.slice(0, 10).forEach(function (transaction) {
                var description = safeText(
                    transaction.description ||
                    transaction.detail ||
                    transaction.name,
                    "-"
                );

                var amount = extractNumber(
                    transaction,
                    [
                        "amount",
                        "total",
                        "value"
                    ]
                );

                html +=
                    '<div class="mini-table-row">' +
                    "<div>" +
                    "<div>" +
                    escapeHtml(description) +
                    "</div>" +
                    '<small>' +
                    escapeHtml(
                        formatDate(
                            transaction.date ||
                            transaction.createdAt
                        )
                    ) +
                    "</small>" +
                    "</div>" +
                    "<strong>" +
                    formatMoney(amount) +
                    " บาท</strong>" +
                    "</div>";
            });

            html += "</div>";
        } else {
            html += '<div class="empty-state">ยังไม่มีรายการล่าสุด</div>';
        }

        html += "</div>";
        html += "</div>";
        html += "</div>";

        container.innerHTML = html;
    }

    function createDashboardCard(title, amount, type, id) {
        return (
            '<div class="dashboard-card dashboard-card-' +
            escapeAttribute(type) +
            '" id="' +
            escapeAttribute(id) +
            '">' +
            '<div class="dashboard-card-title">' +
            escapeHtml(title) +
            "</div>" +
            '<div class="dashboard-card-value">' +
            formatMoney(amount) +
            "</div>" +
            '<div class="dashboard-card-unit">บาท</div>' +
            "</div>"
        );
    }

    async function renderIncomePage() {
        var container = getPageContainer("income");

        if (!container) {
            return;
        }

        container.innerHTML =
            createPageHeader(
                "รายรับ",
                "บันทึกและจัดการรายการรายรับ",
                [
                    {
                        label: "เพิ่มรายรับ",
                        action: "add-income",
                        className: "btn btn-primary"
                    },
                    {
                        label: "ส่งออก Excel",
                        action: "export-income-xlsx",
                        className: "btn btn-secondary"
                    }
                ]
            ) +
            createSearchBar(
                "ค้นหาเลขที่เอกสาร ชื่อรายการ หรือผู้ติดต่อ",
                "search-income",
                ""
            ) +
            '<div id="incomeTableContainer"></div>';

        await loadAndRenderIncome();
    }

    async function loadAndRenderIncome(filters) {
        var container = byId("incomeTableContainer") ||
            findTableContainer("income");

        if (!container) {
            return;
        }

        container.innerHTML =
            '<div class="loading-state">กำลังโหลดข้อมูลรายรับ...</div>';

        var rows = await listEntity("Income", filters || {});

        state.currentEntity = "Income";
        state.currentData = rows;

        renderTable(
            container,
            [
                {
                    label: "วันที่",
                    key: "date",
                    render: function (row) {
                        return formatDate(row.date);
                    }
                },
                {
                    label: "เลขที่เอกสาร",
                    key: "docNo"
                },
                {
                    label: "รายการ",
                    key: "description"
                },
                {
                    label: "ผู้ติดต่อ",
                    key: "counterparty"
                },
                {
                    label: "จำนวนเงิน",
                    key: "amount",
                    className: "text-right",
                    render: function (row) {
                        return formatMoney(row.amount);
                    }
                },
                {
                    label: "วิธีชำระ",
                    key: "paymentMethod",
                    render: function (row) {
                        return paymentMethodLabel(row.paymentMethod);
                    }
                }
            ],
            rows,
            {
                actions: {
                    editAction: "edit-income",
                    deleteAction: "delete-income"
                },
                emptyMessage: "ยังไม่มีรายการรายรับ"
            }
        );
    }

    async function renderExpensePage() {
        var container = getPageContainer("expense");

        if (!container) {
            return;
        }

        container.innerHTML =
            createPageHeader(
                "รายจ่าย",
                "บันทึกและจัดการรายการรายจ่าย",
                [
                    {
                        label: "เพิ่มรายจ่าย",
                        action: "add-expense",
                        className: "btn btn-primary"
                    },
                    {
                        label: "ส่งออก Excel",
                        action: "export-expense-xlsx",
                        className: "btn btn-secondary"
                    }
                ]
            ) +
            createSearchBar(
                "ค้นหาเลขที่เอกสาร รายการ หรือผู้จำหน่าย",
                "search-expense",
                ""
            ) +
            '<div id="expenseTableContainer"></div>';

        await loadAndRenderExpense();
    }

    async function loadAndRenderExpense(filters) {
        var container = byId("expenseTableContainer") ||
            findTableContainer("expense");

        if (!container) {
            return;
        }

        container.innerHTML =
            '<div class="loading-state">กำลังโหลดข้อมูลรายจ่าย...</div>';

        var rows = await listEntity("Expenses", filters || {});

        if (!rows.length) {
            rows = await listEntity("Expense", filters || {});
        }

        state.currentEntity = "Expenses";
        state.currentData = rows;

        renderTable(
            container,
            [
                {
                    label: "วันที่",
                    key: "date",
                    render: function (row) {
                        return formatDate(row.date);
                    }
                },
                {
                    label: "เลขที่เอกสาร",
                    key: "docNo"
                },
                {
                    label: "รายการ",
                    key: "description"
                },
                {
                    label: "ผู้จำหน่าย",
                    key: "counterparty"
                },
                {
                    label: "จำนวนเงิน",
                    key: "amount",
                    className: "text-right",
                    render: function (row) {
                        return formatMoney(row.amount);
                    }
                },
                {
                    label: "วิธีชำระ",
                    key: "paymentMethod",
                    render: function (row) {
                        return paymentMethodLabel(row.paymentMethod);
                    }
                }
            ],
            rows,
            {
                actions: {
                    editAction: "edit-expense",
                    deleteAction: "delete-expense"
                },
                emptyMessage: "ยังไม่มีรายการรายจ่าย"
            }
        );
    }

    async function renderTransfersPage() {
        var container = getPageContainer("transfers");

        if (!container) {
            return;
        }

        container.innerHTML =
            createPageHeader(
                "โอนเงินระหว่างบัญชี",
                "จัดการการโอนเงินระหว่างบัญชีภายในกิจการ",
                [
                    {
                        label: "เพิ่มรายการโอน",
                        action: "add-transfer",
                        className: "btn btn-primary"
                    },
                    {
                        label: "ส่งออก Excel",
                        action: "export-transfers-xlsx",
                        className: "btn btn-secondary"
                    }
                ]
            ) +
            createSearchBar(
                "ค้นหาเลขที่เอกสาร หรือรายละเอียด",
                "search-transfers",
                ""
            ) +
            '<div id="transfersTableContainer"></div>';

        await loadAndRenderTransfers();
    }

    async function loadAndRenderTransfers(filters) {
        var container = byId("transfersTableContainer") ||
            findTableContainer("transfers");

        if (!container) {
            return;
        }

        container.innerHTML =
            '<div class="loading-state">กำลังโหลดข้อมูล...</div>';

        var rows = await listEntity("Transfers", filters || {});

        state.currentEntity = "Transfers";
        state.currentData = rows;

        renderTable(
            container,
            [
                {
                    label: "วันที่",
                    key: "date",
                    render: function (row) {
                        return formatDate(row.date);
                    }
                },
                {
                    label: "เลขที่เอกสาร",
                    key: "docNo"
                },
                {
                    label: "จากบัญชี",
                    key: "fromAccountId",
                    render: function (row) {
                        return accountName(row.fromAccountId);
                    }
                },
                {
                    label: "ไปบัญชี",
                    key: "toAccountId",
                    render: function (row) {
                        return accountName(row.toAccountId);
                    }
                },
                {
                    label: "จำนวนเงิน",
                    key: "amount",
                    className: "text-right",
                    render: function (row) {
                        return formatMoney(row.amount);
                    }
                },
                {
                    label: "รายละเอียด",
                    key: "description"
                }
            ],
            rows,
            {
                actions: {
                    editAction: "edit-transfer",
                    deleteAction: "delete-transfer"
                },
                emptyMessage: "ยังไม่มีรายการโอนเงิน"
            }
        );
    }

    async function renderAccountsPage() {
        var container = getPageContainer("accounts");

        if (!container) {
            return;
        }

        container.innerHTML =
            createPageHeader(
                "เงินสด / ธนาคาร",
                "จัดการบัญชีเงินสดและบัญชีธนาคาร",
                [
                    {
                        label: "เพิ่มบัญชี",
                        action: "add-account",
                        className: "btn btn-primary"
                    },
                    {
                        label: "ส่งออก Excel",
                        action: "export-accounts-xlsx",
                        className: "btn btn-secondary"
                    }
                ]
            ) +
            '<div id="accountsTableContainer"></div>';

        await loadAndRenderAccounts();
    }

    async function loadAndRenderAccounts() {
        var container = byId("accountsTableContainer") ||
            findTableContainer("accounts");

        if (!container) {
            return;
        }

        container.innerHTML =
            '<div class="loading-state">กำลังโหลดข้อมูลบัญชี...</div>';

        var rows = await listEntity("Accounts", {});

        state.accounts = rows;
        state.currentEntity = "Accounts";
        state.currentData = rows;

        renderTable(
            container,
            [
                {
                    label: "รหัสบัญชี",
                    key: "code"
                },
                {
                    label: "ชื่อบัญชี",
                    key: "name"
                },
                {
                    label: "ประเภท",
                    key: "type",
                    render: function (row) {
                        return accountTypeLabel(row.type);
                    }
                },
                {
                    label: "ยอดยกมา",
                    key: "openingBalance",
                    className: "text-right",
                    render: function (row) {
                        return formatMoney(row.openingBalance);
                    }
                },
                {
                    label: "สถานะ",
                    key: "active",
                    render: function (row) {
                        return activeLabel(row.active);
                    }
                }
            ],
            rows,
            {
                actions: {
                    editAction: "edit-account",
                    deleteAction: "delete-account"
                },
                emptyMessage: "ยังไม่มีบัญชี"
            }
        );
    }

    async function renderCustomersPage() {
        var container = getPageContainer("customers");

        if (!container) {
            return;
        }

        container.innerHTML =
            createPageHeader(
                "ลูกค้า",
                "ทะเบียนข้อมูลลูกค้า",
                [
                    {
                        label: "เพิ่มลูกค้า",
                        action: "add-customer",
                        className: "btn btn-primary"
                    },
                    {
                        label: "ส่งออก Excel",
                        action: "export-customers-xlsx",
                        className: "btn btn-secondary"
                    }
                ]
            ) +
            createSearchBar(
                "ค้นหารหัส ชื่อ เลขประจำตัวผู้เสียภาษี หรือเบอร์โทรศัพท์",
                "search-customers",
                ""
            ) +
            '<div id="customersTableContainer"></div>';

        await loadAndRenderCustomers();
    }

    async function loadAndRenderCustomers(filters) {
        var container = byId("customersTableContainer") ||
            findTableContainer("customers");

        if (!container) {
            return;
        }

        container.innerHTML =
            '<div class="loading-state">กำลังโหลดข้อมูลลูกค้า...</div>';

        var rows = await listEntity("Customers", filters || {});

        state.customers = rows;
        state.currentEntity = "Customers";
        state.currentData = rows;

        renderTable(
            container,
            [
                {
                    label: "รหัส",
                    key: "code"
                },
                {
                    label: "ชื่อ",
                    key: "name"
                },
                {
                    label: "เลขประจำตัวผู้เสียภาษี",
                    key: "taxId"
                },
                {
                    label: "ผู้ติดต่อ",
                    key: "contactPerson"
                },
                {
                    label: "โทรศัพท์",
                    key: "phone"
                },
                {
                    label: "สถานะ",
                    key: "active",
                    render: function (row) {
                        return activeLabel(row.active);
                    }
                }
            ],
            rows,
            {
                actions: {
                    editAction: "edit-customer",
                    deleteAction: "delete-customer"
                },
                emptyMessage: "ยังไม่มีข้อมูลลูกค้า"
            }
        );
    }

    async function renderVendorsPage() {
        var container = getPageContainer("vendors");

        if (!container) {
            return;
        }

        container.innerHTML =
            createPageHeader(
                "ผู้จำหน่าย / เจ้าหนี้",
                "ทะเบียนข้อมูลผู้จำหน่ายและเจ้าหนี้",
                [
                    {
                        label: "เพิ่มผู้จำหน่าย",
                        action: "add-vendor",
                        className: "btn btn-primary"
                    },
                    {
                        label: "ส่งออก Excel",
                        action: "export-vendors-xlsx",
                        className: "btn btn-secondary"
                    }
                ]
            ) +
            createSearchBar(
                "ค้นหารหัส ชื่อ เลขประจำตัวผู้เสียภาษี หรือเบอร์โทรศัพท์",
                "search-vendors",
                ""
            ) +
            '<div id="vendorsTableContainer"></div>';

        await loadAndRenderVendors();
    }

    async function loadAndRenderVendors(filters) {
        var container = byId("vendorsTableContainer") ||
            findTableContainer("vendors");

        if (!container) {
            return;
        }

        container.innerHTML =
            '<div class="loading-state">กำลังโหลดข้อมูลผู้จำหน่าย...</div>';

        var rows = await listEntity("Vendors", filters || {});

        state.vendors = rows;
        state.currentEntity = "Vendors";
        state.currentData = rows;

        renderTable(
            container,
            [
                {
                    label: "รหัส",
                    key: "code"
                },
                {
                    label: "ชื่อ",
                    key: "name"
                },
                {
                    label: "เลขประจำตัวผู้เสียภาษี",
                    key: "taxId"
                },
                {
                    label: "ผู้ติดต่อ",
                    key: "contactPerson"
                },
                {
                    label: "โทรศัพท์",
                    key: "phone"
                },
                {
                    label: "สถานะ",
                    key: "active",
                    render: function (row) {
                        return activeLabel(row.active);
                    }
                }
            ],
            rows,
            {
                actions: {
                    editAction: "edit-vendor",
                    deleteAction: "delete-vendor"
                },
                emptyMessage: "ยังไม่มีข้อมูลผู้จำหน่าย"
            }
        );
    }

    async function renderDocumentsPage() {
        var container = getPageContainer("documents");

        if (!container) {
            return;
        }

        container.innerHTML =
            createPageHeader(
                "ทะเบียนเอกสาร",
                "จัดการเอกสารทางการเงินและเอกสารของกิจการ",
                [
                    {
                        label: "สร้างเอกสาร",
                        action: "add-document",
                        className: "btn btn-primary"
                    },
                    {
                        label: "ส่งออก Excel",
                        action: "export-documents-xlsx",
                        className: "btn btn-secondary"
                    }
                ]
            ) +
            createSearchBar(
                "ค้นหาเลขที่เอกสาร ชื่อลูกค้า หรือรายละเอียด",
                "search-documents",
                ""
            ) +
            '<div id="documentsTableContainer"></div>';

        await loadAndRenderDocuments();
    }

    async function loadAndRenderDocuments(filters) {
        var container = byId("documentsTableContainer") ||
            findTableContainer("documents");

        if (!container) {
            return;
        }

        container.innerHTML =
            '<div class="loading-state">กำลังโหลดทะเบียนเอกสาร...</div>';

        var rows = await listEntity("Documents", filters || {});

        state.documents = rows;
        state.currentEntity = "Documents";
        state.currentData = rows;

        renderTable(
            container,
            [
                {
                    label: "วันที่",
                    key: "date",
                    render: function (row) {
                        return formatDate(row.date);
                    }
                },
                {
                    label: "เลขที่",
                    key: "docNo"
                },
                {
                    label: "ประเภทเอกสาร",
                    key: "docType",
                    render: function (row) {
                        return documentTypeLabel(row.docType);
                    }
                },
                {
                    label: "คู่ค้า",
                    key: "partyName",
                    render: function (row) {
                        return safeText(
                            row.partyName ||
                            row.customerName ||
                            row.vendorName,
                            "-"
                        );
                    }
                },
                {
                    label: "ยอดรวม",
                    key: "total",
                    className: "text-right",
                    render: function (row) {
                        return formatMoney(
                            row.total ||
                            row.grandTotal ||
                            row.amount
                        );
                    }
                },
                {
                    label: "สถานะ",
                    key: "status",
                    render: function (row) {
                        return documentStatusLabel(row.status);
                    }
                }
            ],
            rows,
            {
                actions: {
                    editAction: "edit-document",
                    deleteAction: "delete-document"
                },
                emptyMessage: "ยังไม่มีเอกสาร"
            }
        );
    }

    async function renderUsersPage() {
        if (!isAdmin()) {
            showToast("คุณไม่มีสิทธิ์เข้าถึงผู้ใช้งาน", "warning");
            return;
        }

        var container = getPageContainer("users");

        if (!container) {
            return;
        }

        container.innerHTML =
            createPageHeader(
                "ผู้ใช้งานและสิทธิ์",
                "จัดการบัญชีผู้ใช้งานและสิทธิ์การเข้าถึงระบบ",
                [
                    {
                        label: "เพิ่มผู้ใช้งาน",
                        action: "add-user",
                        className: "btn btn-primary"
                    },
                    {
                        label: "ส่งออก Excel",
                        action: "export-users-xlsx",
                        className: "btn btn-secondary"
                    }
                ]
            ) +
            '<div id="usersTableContainer"></div>';

        await loadAndRenderUsers();
    }

    async function loadAndRenderUsers() {
        var container = byId("usersTableContainer") ||
            findTableContainer("users");

        if (!container) {
            return;
        }

        container.innerHTML =
            '<div class="loading-state">กำลังโหลดข้อมูลผู้ใช้งาน...</div>';

        var rows = await listEntity("Users", {});

        state.users = rows;
        state.currentEntity = "Users";
        state.currentData = rows;

        renderTable(
            container,
            [
                {
                    label: "ชื่อผู้ใช้งาน",
                    key: "username"
                },
                {
                    label: "ชื่อ-นามสกุล",
                    key: "fullName"
                },
                {
                    label: "สิทธิ์",
                    key: "role",
                    render: function (row) {
                        return userRoleLabel(row.role);
                    }
                },
                {
                    label: "สถานะ",
                    key: "active",
                    render: function (row) {
                        return activeLabel(row.active);
                    }
                },
                {
                    label: "เข้าสู่ระบบล่าสุด",
                    key: "lastLoginAt",
                    render: function (row) {
                        return formatDateTime(row.lastLoginAt);
                    }
                }
            ],
            rows,
            {
                actions: {
                    editAction: "edit-user",
                    deleteAction: "delete-user"
                },
                emptyMessage: "ยังไม่มีผู้ใช้งาน"
            }
        );
    }

    async function renderSettingsPage() {
        if (!isAdmin()) {
            showToast("คุณไม่มีสิทธิ์เข้าถึงตั้งค่ากิจการ", "warning");
            return;
        }

        var container = getPageContainer("settings");

        if (!container) {
            return;
        }

        container.innerHTML =
            createPageHeader(
                "ตั้งค่ากิจการ",
                "กำหนดค่าพื้นฐานของระบบและกิจการ",
                [
                    {
                        label: "เพิ่มการตั้งค่า",
                        action: "add-setting",
                        className: "btn btn-primary"
                    }
                ]
            ) +
            '<div id="settingsTableContainer"></div>';

        await loadAndRenderSettings();
    }

    async function loadAndRenderSettings() {
        var container = byId("settingsTableContainer") ||
            findTableContainer("settings");

        if (!container) {
            return;
        }

        container.innerHTML =
            '<div class="loading-state">กำลังโหลดการตั้งค่า...</div>';

        var response = await apiRequest(
            "settings",
            {},
            {
                includeToken: true
            }
        );

        if (!responseSuccess(response)) {
            throw createError(
                extractMessage(response),
                0,
                "SETTINGS_FAILED",
                response
            );
        }

        var data = normalizeResponse(response);

        if (data.data !== undefined) {
            data = parseMaybeJson(data.data);
        }

        if (data.result !== undefined) {
            data = parseMaybeJson(data.result);
        }

        var rows = normalizeArray(data);

        if (!rows.length && Array.isArray(state.settings)) {
            rows = state.settings;
        }

        state.settings = rows;
        state.currentEntity = "Settings";
        state.currentData = rows;

        renderTable(
            container,
            [
                {
                    label: "Key",
                    key: "key"
                },
                {
                    label: "ค่า",
                    key: "value"
                },
                {
                    label: "คำอธิบาย",
                    key: "description"
                },
                {
                    label: "แก้ไขล่าสุด",
                    key: "updatedAt",
                    render: function (row) {
                        return formatDateTime(row.updatedAt);
                    }
                }
            ],
            rows,
            {
                actions: {
                    editAction: "edit-setting",
                    deleteAction: false
                },
                emptyMessage: "ยังไม่มีการตั้งค่า"
            }
        );
    }

    async function renderAuditLogsPage() {
        if (!isAdmin()) {
            showToast("คุณไม่มีสิทธิ์เข้าถึง Audit Log", "warning");
            return;
        }

        var container = getPageContainer("auditlogs");

        if (!container) {
            return;
        }

        container.innerHTML =
            createPageHeader(
                "Audit Log",
                "ประวัติการทำรายการและกิจกรรมในระบบ",
                [
                    {
                        label: "รีเฟรช",
                        action: "refresh-auditlogs",
                        className: "btn btn-secondary"
                    },
                    {
                        label: "ส่งออก Excel",
                        action: "export-auditlogs-xlsx",
                        className: "btn btn-secondary"
                    }
                ]
            ) +
            '<div id="auditlogsTableContainer"></div>';

        await loadAndRenderAuditLogs();
    }

    async function loadAndRenderAuditLogs(filters) {
        var container = byId("auditlogsTableContainer") ||
            findTableContainer("auditlogs");

        if (!container) {
            return;
        }

        container.innerHTML =
            '<div class="loading-state">กำลังโหลด Audit Log...</div>';

        var response = await apiRequest(
            "auditlogs",
            {
                filters: filters || {}
            },
            {
                includeToken: true
            }
        );

        if (!responseSuccess(response)) {
            throw createError(
                extractMessage(response),
                0,
                "AUDIT_LOG_FAILED",
                response
            );
        }

        var data = normalizeResponse(response);

        if (data.data !== undefined) {
            data = parseMaybeJson(data.data);
        }

        if (data.result !== undefined) {
            data = parseMaybeJson(data.result);
        }

        var rows = normalizeArray(data);

        state.currentEntity = "AuditLogs";
        state.currentData = rows;

        renderTable(
            container,
            [
                {
                    label: "วันเวลา",
                    key: "createdAt",
                    render: function (row) {
                        return formatDateTime(
                            row.createdAt ||
                            row.timestamp ||
                            row.date
                        );
                    }
                },
                {
                    label: "ผู้ใช้งาน",
                    key: "username"
                },
                {
                    label: "Action",
                    key: "action"
                },
                {
                    label: "Entity",
                    key: "entity"
                },
                {
                    label: "รายละเอียด",
                    key: "description",
                    render: function (row) {
                        return safeText(
                            row.description ||
                            row.details ||
                            row.message,
                            "-"
                        );
                    }
                },
                {
                    label: "IP",
                    key: "ipAddress"
                }
            ],
            rows,
            {
                actions: {
                    edit: false,
                    delete: false
                },
                emptyMessage: "ยังไม่มี Audit Log"
            }
        );
    }

    async function renderReportsPage() {
        var container = getPageContainer("reports");

        if (!container) {
            return;
        }

        container.innerHTML =
            createPageHeader(
                "รายงาน",
                "รายงานข้อมูลทางการเงิน",
                [
                    {
                        label: "สร้างรายงาน",
                        action: "run-report",
                        className: "btn btn-primary"
                    },
                    {
                        label: "ส่งออก Excel",
                        action: "export-report-xlsx",
                        className: "btn btn-secondary"
                    },
                    {
                        label: "พิมพ์ / PDF",
                        action: "print-report",
                        className: "btn btn-secondary"
                    }
                ]
            ) +
            '<div class="report-filters">' +
            '<div class="form-group">' +
            "<label>ประเภทรายงาน</label>" +
            '<select class="form-control" id="reportType">' +
            '<option value="income_expense">รายรับ - รายจ่าย</option>' +
            '<option value="account">ยอดเงินตามบัญชี</option>' +
            '<option value="customer">รายงานลูกค้า</option>' +
            '<option value="vendor">รายงานผู้จำหน่าย</option>' +
            '<option value="documents">ทะเบียนเอกสาร</option>' +
            "</select>" +
            "</div>" +
            '<div class="form-group">' +
            "<label>ตั้งแต่วันที่</label>" +
            '<input type="date" class="form-control" id="reportDateFrom" value="' +
            escapeAttribute(getFilterDate("reportDateFrom", "start")) +
            '">' +
            "</div>" +
            '<div class="form-group">' +
            "<label>ถึงวันที่</label>" +
            '<input type="date" class="form-control" id="reportDateTo" value="' +
            escapeAttribute(getFilterDate("reportDateTo", "end")) +
            '">' +
            "</div>" +
            "</div>" +
            '<div id="reportResultContainer"></div>';
    }

    async function runReport() {
        var reportTypeElement = byId("reportType");
        var dateFromElement = byId("reportDateFrom");
        var dateToElement = byId("reportDateTo");

        var reportType = reportTypeElement ?
            reportTypeElement.value :
            "income_expense";

        var dateFrom = dateFromElement ?
            dateFromElement.value :
            getFilterDate("reportDateFrom", "start");

        var dateTo = dateToElement ?
            dateToElement.value :
            getFilterDate("reportDateTo", "end");

        var container = byId("reportResultContainer");

        if (container) {
            container.innerHTML =
                '<div class="loading-state">กำลังสร้างรายงาน...</div>';
        }

        var response = await apiRequest(
            "report",
            {
                reportType: reportType,
                dateFrom: dateFrom,
                dateTo: dateTo
            },
            {
                includeToken: true
            }
        );

        if (!responseSuccess(response)) {
            throw createError(
                extractMessage(response),
                0,
                "REPORT_FAILED",
                response
            );
        }

        var data = normalizeResponse(response);

        if (data.data !== undefined) {
            data = parseMaybeJson(data.data);
        }

        if (data.result !== undefined) {
            data = parseMaybeJson(data.result);
        }

        state.reportData = data;

        renderReportResult(container, data);
    }

    function renderReportResult(container, data) {
        if (!container) {
            return;
        }

        var rows = normalizeArray(data);

        if (!rows.length && data && Array.isArray(data.rows)) {
            rows = data.rows;
        }

        if (!rows.length && data && Array.isArray(data.items)) {
            rows = data.items;
        }

        if (!rows.length) {
            container.innerHTML =
                '<div class="empty-state">ไม่มีข้อมูลตามเงื่อนไขที่เลือก</div>';
            return;
        }

        var keys = Object.keys(rows[0] || {});

        var columns = keys.map(function (key) {
            return {
                label: key,
                key: key,
                render: function (row) {
                    var value = row[key];

                    if (
                        key.toLowerCase().indexOf("amount") !== -1 ||
                        key.toLowerCase().indexOf("total") !== -1 ||
                        key.toLowerCase().indexOf("balance") !== -1
                    ) {
                        return formatMoney(value);
                    }

                    if (
                        key.toLowerCase().indexOf("date") !== -1 ||
                        key.toLowerCase().indexOf("at") !== -1
                    ) {
                        return formatDateTime(value);
                    }

                    return safeText(value, "");
                }
            };
        });

        renderTable(
            container,
            columns,
            rows,
            {
                actions: {
                    edit: false,
                    delete: false
                },
                emptyMessage: "ไม่มีข้อมูล"
            }
        );
    }

    function accountName(id) {
        if (!id) {
            return "-";
        }

        var account = getRecordById(state.accounts, id);

        if (account) {
            return safeText(
                account.name,
                String(id)
            );
        }

        for (var i = 0; i < state.accounts.length; i++) {
            var row = state.accounts[i];

            if (
                String(row.id) === String(id) ||
                String(row.code) === String(id)
            ) {
                return safeText(row.name, String(id));
            }
        }

        return String(id);
    }

    function categoryName(id) {
        if (!id) {
            return "-";
        }

        for (var i = 0; i < state.categories.length; i++) {
            var category = state.categories[i];

            if (
                String(category.id) === String(id) ||
                String(category.code) === String(id)
            ) {
                return safeText(category.name, String(id));
            }
        }

        return String(id);
    }

    function customerName(id) {
        if (!id) {
            return "-";
        }

        for (var i = 0; i < state.customers.length; i++) {
            var customer = state.customers[i];

            if (
                String(customer.id) === String(id) ||
                String(customer.code) === String(id)
            ) {
                return safeText(customer.name, String(id));
            }
        }

        return String(id);
    }

    function vendorName(id) {
        if (!id) {
            return "-";
        }

        for (var i = 0; i < state.vendors.length; i++) {
            var vendor = state.vendors[i];

            if (
                String(vendor.id) === String(id) ||
                String(vendor.code) === String(id)
            ) {
                return safeText(vendor.name, String(id));
            }
        }

        return String(id);
    }

    function accountTypeLabel(value) {
        for (var i = 0; i < ACCOUNT_TYPES.length; i++) {
            if (ACCOUNT_TYPES[i].value === String(value)) {
                return ACCOUNT_TYPES[i].label;
            }
        }

        return safeText(value, "-");
    }

    function paymentMethodLabel(value) {
        for (var i = 0; i < PAYMENT_METHODS.length; i++) {
            if (PAYMENT_METHODS[i].value === String(value)) {
                return PAYMENT_METHODS[i].label;
            }
        }

        return safeText(value, "-");
    }

    function userRoleLabel(value) {
        for (var i = 0; i < USER_ROLES.length; i++) {
            if (USER_ROLES[i].value === String(value)) {
                return USER_ROLES[i].label;
            }
        }

        return safeText(value, "-");
    }

    function documentTypeLabel(value) {
        for (var i = 0; i < DOCUMENT_TYPES.length; i++) {
            if (DOCUMENT_TYPES[i].value === String(value)) {
                return DOCUMENT_TYPES[i].label;
            }
        }

        return safeText(value, "-");
    }

    function documentStatusLabel(value) {
        var status = String(value || "").toLowerCase();

        if (status === "cancelled" || status === "canceled") {
            return "ยกเลิก";
        }

        if (status === "paid") {
            return "ชำระแล้ว";
        }

        if (status === "pending") {
            return "รอดำเนินการ";
        }

        if (status === "draft") {
            return "ร่าง";
        }

        if (status === "issued") {
            return "ออกแล้ว";
        }

        if (!status) {
            return "-";
        }

        return String(value);
    }

    function activeLabel(value) {
        if (
            value === true ||
            value === 1 ||
            String(value).toLowerCase() === "true" ||
            String(value) === "1" ||
            String(value).toLowerCase() === "active"
        ) {
            return "ใช้งาน";
        }

        return "ปิดใช้งาน";
    }

    function getFieldValue(form, name) {
        if (!form) {
            return "";
        }

        var element = form.elements[name];

        if (!element) {
            element = form.querySelector(
                '[name="' + escapeAttribute(name) + '"]'
            );
        }

        if (!element) {
            return "";
        }

        if (element.type === "checkbox") {
            return element.checked;
        }

        return element.value;
    }

    function setFieldValue(form, name, value) {
        if (!form) {
            return;
        }

        var element = form.elements[name];

        if (!element) {
            element = form.querySelector(
                '[name="' + escapeAttribute(name) + '"]'
            );
        }

        if (!element) {
            return;
        }

        if (element.type === "checkbox") {
            element.checked =
                value === true ||
                value === 1 ||
                String(value).toLowerCase() === "true" ||
                String(value) === "1";
            return;
        }

        element.value = value === null || value === undefined ?
            "" :
            String(value);
    }

    function createSelectOptions(options, selectedValue, placeholder) {
        var html = "";

        if (placeholder !== undefined) {
            html +=
                '<option value="">' +
                escapeHtml(placeholder) +
                "</option>";
        }

        options.forEach(function (option) {
            var selected =
                String(option.value) === String(selectedValue) ?
                " selected" :
                "";

            html +=
                '<option value="' +
                escapeAttribute(option.value) +
                '"' +
                selected +
                ">" +
                escapeHtml(option.label) +
                "</option>";
        });

        return html;
    }

    function accountOptions(selected) {
        return state.accounts.map(function (account) {
            return {
                value: account.id || account.code,
                label:
                    safeText(account.code, "") +
                    (
                        account.code && account.name ?
                        " - " :
                        ""
                    ) +
                    safeText(account.name, "")
            };
        });
    }

    function categoryOptions(selected, type) {
        var options = [];

        state.categories.forEach(function (category) {
            var categoryType = String(category.type || "").toLowerCase();

            if (
                type &&
                categoryType &&
                categoryType !== String(type).toLowerCase()
            ) {
                return;
            }

            options.push({
                value: category.id || category.code,
                label:
                    safeText(category.code, "") +
                    (
                        category.code && category.name ?
                        " - " :
                        ""
                    ) +
                    safeText(category.name, "")
            });
        });

        return options;
    }

    function customerOptions() {
        return state.customers.map(function (customer) {
            return {
                value: customer.id || customer.code,
                label:
                    safeText(customer.code, "") +
                    (
                        customer.code && customer.name ?
                        " - " :
                        ""
                    ) +
                    safeText(customer.name, "")
            };
        });
    }

    function vendorOptions() {
        return state.vendors.map(function (vendor) {
            return {
                value: vendor.id || vendor.code,
                label:
                    safeText(vendor.code, "") +
                    (
                        vendor.code && vendor.name ?
                        " - " :
                        ""
                    ) +
                    safeText(vendor.name, "")
            };
        });
    }

    function createFormField(field, value) {
        var type = field.type || "text";
        var name = field.name || "";
        var label = field.label || name;
        var required = field.required ? " required" : "";
        var disabled = field.disabled ? " disabled" : "";
        var placeholder = field.placeholder || "";
        var inputValue = value === undefined || value === null ?
            "" :
            value;

        if (type === "select") {
            return (
                '<div class="form-group">' +
                "<label>" +
                escapeHtml(label) +
                (field.required ? " *" : "") +
                "</label>" +
                '<select class="form-control" name="' +
                escapeAttribute(name) +
                '"' +
                required +
                disabled +
                ">" +
                createSelectOptions(
                    field.options || [],
                    inputValue,
                    field.placeholderOption
                ) +
                "</select>" +
                "</div>"
            );
        }

        if (type === "textarea") {
            return (
                '<div class="form-group">' +
                "<label>" +
                escapeHtml(label) +
                (field.required ? " *" : "") +
                "</label>" +
                '<textarea class="form-control" name="' +
                escapeAttribute(name) +
                '" placeholder="' +
                escapeAttribute(placeholder) +
                '"' +
                required +
                disabled +
                ">" +
                escapeHtml(inputValue) +
                "</textarea>" +
                "</div>"
            );
        }

        if (type === "checkbox") {
            var checked =
                inputValue === true ||
                inputValue === 1 ||
                String(inputValue).toLowerCase() === "true" ||
                String(inputValue) === "1";

            return (
                '<div class="form-group form-group-checkbox">' +
                '<label class="checkbox-label">' +
                '<input type="checkbox" name="' +
                escapeAttribute(name) +
                '"' +
                (checked ? " checked" : "") +
                disabled +
                ">" +
                "<span>" +
                escapeHtml(label) +
                "</span>" +
                "</label>" +
                "</div>"
            );
        }

        return (
            '<div class="form-group">' +
            "<label>" +
            escapeHtml(label) +
            (field.required ? " *" : "") +
            "</label>" +
            '<input type="' +
            escapeAttribute(type) +
            '" class="form-control" name="' +
            escapeAttribute(name) +
            '" value="' +
            escapeAttribute(inputValue) +
            '" placeholder="' +
            escapeAttribute(placeholder) +
            '"' +
            required +
            disabled +
            ">" +
            "</div>"
        );
    }

    function ensureModal() {
        var modal = byId("modalContainer");

        if (!modal) {
            modal = document.createElement("div");
            modal.id = "modalContainer";
            modal.className = "modal-container hidden";
            document.body.appendChild(modal);
        }

        return modal;
    }

    function openModal(config) {
        var modal = ensureModal();

        var title = config.title || "รายการ";
        var fields = config.fields || [];
        var values = config.values || {};
        var submitLabel = config.submitLabel || "บันทึก";

        var html =
            '<div class="modal-backdrop" data-modal-close></div>' +
            '<div class="modal-dialog">' +
            '<div class="modal-header">' +
            "<h3>" +
            escapeHtml(title) +
            "</h3>" +
            '<button type="button" class="modal-close" data-modal-close aria-label="ปิด">×</button>' +
            "</div>" +
            '<form class="modal-form" id="dynamicModalForm">' +
            '<div class="modal-body">';

        fields.forEach(function (field) {
            html += createFormField(
                field,
                values[field.name]
            );
        });

        html +=
            "</div>" +
            '<div class="modal-footer">' +
            '<button type="button" class="btn btn-secondary" data-modal-close>ยกเลิก</button>' +
            '<button type="submit" class="btn btn-primary">' +
            escapeHtml(submitLabel) +
            "</button>" +
            "</div>" +
            "</form>" +
            "</div>";

        modal.innerHTML = html;

        showElement(modal);

        state.modalOpen = true;
        state.modalSubmitHandler = config.onSubmit || null;

        var form = byId("dynamicModalForm");

        if (form) {
            form.addEventListener("submit", function (event) {
                event.preventDefault();
                event.stopPropagation();

                if (typeof state.modalSubmitHandler === "function") {
                    state.modalSubmitHandler(form);
                }
            });
        }
    }

    function closeModal() {
        var modal = byId("modalContainer");

        if (!modal) {
            return;
        }

        hideElement(modal);

        modal.innerHTML = "";

        state.modalOpen = false;
        state.modalSubmitHandler = null;
        state.documentItems = [];
    }

    function formToObject(form) {
        var data = {};
        var elements = qsa("input, select, textarea", form);

        elements.forEach(function (element) {
            if (!element.name) {
                return;
            }

            if (element.type === "checkbox") {
                data[element.name] = element.checked;
            } else {
                data[element.name] = element.value;
            }
        });

        return data;
    }

    function commonFinancialFields(record, type) {
        var source = record || {};

        return [
            {
                name: "date",
                label: "วันที่",
                type: "date",
                required: true
            },
            {
                name: "docNo",
                label: "เลขที่เอกสาร",
                type: "text",
                placeholder: "เว้นว่างเพื่อให้ระบบกำหนดเลขที่"
            },
            {
                name: "accountId",
                label: "บัญชีรับเงิน / จ่ายเงิน",
                type: "select",
                required: true,
                options: accountOptions(),
                placeholderOption: "เลือกบัญชี"
            },
            {
                name: "categoryId",
                label: "หมวดหมู่",
                type: "select",
                options: categoryOptions(
                    "",
                    type
                ),
                placeholderOption: "เลือกหมวดหมู่"
            },
            {
                name: "counterparty",
                label: type === "income" ?
                    "ผู้ชำระเงิน / ลูกค้า" :
                    "ผู้รับเงิน / ผู้จำหน่าย",
                type: "text"
            },
            {
                name: "description",
                label: "รายละเอียด",
                type: "textarea",
                required: true
            },
            {
                name: "amount",
                label: "จำนวนเงิน",
                type: "number",
                required: true,
                placeholder: "0.00"
            },
            {
                name: "paymentMethod",
                label: "วิธีชำระเงิน",
                type: "select",
                options: PAYMENT_METHODS,
                placeholderOption: "เลือกวิธีชำระเงิน"
            },
            {
                name: "reference",
                label: "เลขอ้างอิง",
                type: "text"
            }
        ];
    }

    function getRecordValues(record) {
        var result = {};

        if (!record) {
            return result;
        }

        Object.keys(record).forEach(function (key) {
            result[key] = record[key];
        });

        return result;
    }

    function openIncomeModal(record) {
        var isEdit = !!record;
        var values = getRecordValues(record);

        if (!values.date) {
            values.date = toInputDate();
        }

        openModal({
            title: isEdit ? "แก้ไขรายรับ" : "เพิ่มรายรับ",
            submitLabel: isEdit ? "บันทึกการแก้ไข" : "บันทึกรายรับ",
            fields: commonFinancialFields(values, "income"),
            values: values,
            onSubmit: async function (form) {
                var data = formToObject(form);

                data.amount = parseNumber(data.amount);

                if (!data.date) {
                    showToast("กรุณาระบุวันที่", "warning");
                    return;
                }

                if (!data.description) {
                    showToast("กรุณาระบุรายละเอียด", "warning");
                    return;
                }

                if (data.amount <= 0) {
                    showToast("จำนวนเงินต้องมากกว่า 0", "warning");
                    return;
                }

                try {
                    setModalBusy(true);

                    var response;

                    if (isEdit) {
                        response = await apiRequest(
                            "saveincome",
                            {
                                id: record.id,
                                data: data
                            },
                            {
                                includeToken: true
                            }
                        );
                    } else {
                        response = await apiRequest(
                            "saveincome",
                            {
                                data: data
                            },
                            {
                                includeToken: true
                            }
                        );
                    }

                    if (!responseSuccess(response)) {
                        throw createError(
                            extractMessage(response),
                            0,
                            "SAVE_INCOME_FAILED",
                            response
                        );
                    }

                    closeModal();
                    showToast(
                        isEdit ?
                        "แก้ไขรายรับเรียบร้อยแล้ว" :
                        "บันทึกรายรับเรียบร้อยแล้ว",
                        "success"
                    );

                    await renderIncomePage();
                } catch (error) {
                    showToast(
                        error.message || "บันทึกรายรับไม่สำเร็จ",
                        "error"
                    );
                } finally {
                    setModalBusy(false);
                }
            }
        });
    }

    function openExpenseModal(record) {
        var isEdit = !!record;
        var values = getRecordValues(record);

        if (!values.date) {
            values.date = toInputDate();
        }

        openModal({
            title: isEdit ? "แก้ไขรายจ่าย" : "เพิ่มรายจ่าย",
            submitLabel: isEdit ? "บันทึกการแก้ไข" : "บันทึกรายจ่าย",
            fields: commonFinancialFields(values, "expense"),
            values: values,
            onSubmit: async function (form) {
                var data = formToObject(form);

                data.amount = parseNumber(data.amount);

                if (!data.date) {
                    showToast("กรุณาระบุวันที่", "warning");
                    return;
                }

                if (!data.description) {
                    showToast("กรุณาระบุรายละเอียด", "warning");
                    return;
                }

                if (data.amount <= 0) {
                    showToast("จำนวนเงินต้องมากกว่า 0", "warning");
                    return;
                }

                try {
                    setModalBusy(true);

                    var response;

                    if (isEdit) {
                        response = await apiRequest(
                            "saveexpense",
                            {
                                id: record.id,
                                data: data
                            },
                            {
                                includeToken: true
                            }
                        );
                    } else {
                        response = await apiRequest(
                            "saveexpense",
                            {
                                data: data
                            },
                            {
                                includeToken: true
                            }
                        );
                    }

                    if (!responseSuccess(response)) {
                        throw createError(
                            extractMessage(response),
                            0,
                            "SAVE_EXPENSE_FAILED",
                            response
                        );
                    }

                    closeModal();
                    showToast(
                        isEdit ?
                        "แก้ไขรายจ่ายเรียบร้อยแล้ว" :
                        "บันทึกรายจ่ายเรียบร้อยแล้ว",
                        "success"
                    );

                    await renderExpensePage();
                } catch (error) {
                    showToast(
                        error.message || "บันทึกรายจ่ายไม่สำเร็จ",
                        "error"
                    );
                } finally {
                    setModalBusy(false);
                }
            }
        });
    }

    function openTransferModal(record) {
        var isEdit = !!record;
        var values = getRecordValues(record);

        if (!values.date) {
            values.date = toInputDate();
        }

        openModal({
            title: isEdit ?
                "แก้ไขรายการโอนเงิน" :
                "เพิ่มรายการโอนเงิน",
            submitLabel: "บันทึก",
            fields: [
                {
                    name: "date",
                    label: "วันที่",
                    type: "date",
                    required: true
                },
                {
                    name: "docNo",
                    label: "เลขที่เอกสาร",
                    type: "text"
                },
                {
                    name: "fromAccountId",
                    label: "จากบัญชี",
                    type: "select",
                    required: true,
                    options: accountOptions(),
                    placeholderOption: "เลือกบัญชีต้นทาง"
                },
                {
                    name: "toAccountId",
                    label: "ไปบัญชี",
                    type: "select",
                    required: true,
                    options: accountOptions(),
                    placeholderOption: "เลือกบัญชีปลายทาง"
                },
                {
                    name: "amount",
                    label: "จำนวนเงิน",
                    type: "number",
                    required: true
                },
                {
                    name: "description",
                    label: "รายละเอียด",
                    type: "textarea"
                },
                {
                    name: "reference",
                    label: "เลขอ้างอิง",
                    type: "text"
                }
            ],
            values: values,
            onSubmit: async function (form) {
                var data = formToObject(form);

                data.amount = parseNumber(data.amount);

                if (
                    data.fromAccountId &&
                    data.toAccountId &&
                    String(data.fromAccountId) === String(data.toAccountId)
                ) {
                    showToast("บัญชีต้นทางและปลายทางต้องไม่เป็นบัญชีเดียวกัน", "warning");
                    return;
                }

                if (data.amount <= 0) {
                    showToast("จำนวนเงินต้องมากกว่า 0", "warning");
                    return;
                }

                try {
                    setModalBusy(true);

                    var response = await apiRequest(
                        "savetransfer",
                        {
                            id: isEdit ? record.id : "",
                            data: data
                        },
                        {
                            includeToken: true
                        }
                    );

                    if (!responseSuccess(response)) {
                        throw createError(
                            extractMessage(response),
                            0,
                            "SAVE_TRANSFER_FAILED",
                            response
                        );
                    }

                    closeModal();
                    showToast("บันทึกรายการโอนเรียบร้อยแล้ว", "success");

                    await renderTransfersPage();
                } catch (error) {
                    showToast(
                        error.message || "ไม่สามารถบันทึกรายการโอนได้",
                        "error"
                    );
                } finally {
                    setModalBusy(false);
                }
            }
        });
    }

    function openAccountModal(record) {
        var isEdit = !!record;
        var values = getRecordValues(record);

        openModal({
            title: isEdit ? "แก้ไขบัญชี" : "เพิ่มบัญชี",
            submitLabel: "บันทึก",
            fields: [
                {
                    name: "code",
                    label: "รหัสบัญชี",
                    type: "text",
                    required: true
                },
                {
                    name: "name",
                    label: "ชื่อบัญชี",
                    type: "text",
                    required: true
                },
                {
                    name: "type",
                    label: "ประเภทบัญชี",
                    type: "select",
                    required: true,
                    options: ACCOUNT_TYPES,
                    placeholderOption: "เลือกประเภท"
                },
                {
                    name: "openingBalance",
                    label: "ยอดยกมา",
                    type: "number"
                },
                {
                    name: "active",
                    label: "เปิดใช้งานบัญชี",
                    type: "checkbox"
                },
                {
                    name: "description",
                    label: "รายละเอียด",
                    type: "textarea"
                }
            ],
            values: values,
            onSubmit: async function (form) {
                var data = formToObject(form);

                data.openingBalance = parseNumber(data.openingBalance);

                if (!data.code || !data.name) {
                    showToast("กรุณากรอกรหัสและชื่อบัญชี", "warning");
                    return;
                }

                try {
                    setModalBusy(true);

                    var response = isEdit ?
                        await updateEntity(
                            "Accounts",
                            record.id,
                            data
                        ) :
                        await createEntity(
                            "Accounts",
                            data
                        );

                    if (!responseSuccess(response)) {
                        throw createError(
                            extractMessage(response),
                            0,
                            "ACCOUNT_SAVE_FAILED",
                            response
                        );
                    }

                    closeModal();
                    showToast("บันทึกบัญชีเรียบร้อยแล้ว", "success");

                    await renderAccountsPage();
                } catch (error) {
                    showToast(
                        error.message || "ไม่สามารถบันทึกบัญชีได้",
                        "error"
                    );
                } finally {
                    setModalBusy(false);
                }
            }
        });
    }

    function openCustomerModal(record) {
        openPartyModal(
            "Customers",
            record,
            "ลูกค้า",
            "add-customer",
            "edit-customer"
        );
    }

    function openVendorModal(record) {
        openPartyModal(
            "Vendors",
            record,
            "ผู้จำหน่าย / เจ้าหนี้",
            "add-vendor",
            "edit-vendor"
        );
    }

    function openPartyModal(entity, record, title, addAction, editAction) {
        var isEdit = !!record;
        var values = getRecordValues(record);

        openModal({
            title: isEdit ?
                "แก้ไข" + title :
                "เพิ่ม" + title,
            submitLabel: "บันทึก",
            fields: [
                {
                    name: "code",
                    label: "รหัส",
                    type: "text"
                },
                {
                    name: "name",
                    label: "ชื่อ",
                    type: "text",
                    required: true
                },
                {
                    name: "taxId",
                    label: "เลขประจำตัวผู้เสียภาษี",
                    type: "text"
                },
                {
                    name: "address",
                    label: "ที่อยู่",
                    type: "textarea"
                },
                {
                    name: "phone",
                    label: "โทรศัพท์",
                    type: "tel"
                },
                {
                    name: "email",
                    label: "อีเมล",
                    type: "email"
                },
                {
                    name: "contactPerson",
                    label: "ผู้ติดต่อ",
                    type: "text"
                },
                {
                    name: "active",
                    label: "เปิดใช้งาน",
                    type: "checkbox"
                },
                {
                    name: "notes",
                    label: "หมายเหตุ",
                    type: "textarea"
                }
            ],
            values: values,
            onSubmit: async function (form) {
                var data = formToObject(form);

                if (!data.name) {
                    showToast("กรุณาระบุชื่อ", "warning");
                    return;
                }

                try {
                    setModalBusy(true);

                    var response = isEdit ?
                        await updateEntity(
                            entity,
                            record.id,
                            data
                        ) :
                        await createEntity(
                            entity,
                            data
                        );

                    if (!responseSuccess(response)) {
                        throw createError(
                            extractMessage(response),
                            0,
                            "PARTY_SAVE_FAILED",
                            response
                        );
                    }

                    closeModal();
                    showToast("บันทึกข้อมูลเรียบร้อยแล้ว", "success");

                    if (entity === "Customers") {
                        await renderCustomersPage();
                    } else {
                        await renderVendorsPage();
                    }
                } catch (error) {
                    showToast(
                        error.message || "ไม่สามารถบันทึกข้อมูลได้",
                        "error"
                    );
                } finally {
                    setModalBusy(false);
                }
            }
        });
    }

    function openUserModal(record) {
        if (!isAdmin()) {
            showToast("คุณไม่มีสิทธิ์จัดการผู้ใช้งาน", "warning");
            return;
        }

        var isEdit = !!record;
        var values = getRecordValues(record);

        openModal({
            title: isEdit ?
                "แก้ไขผู้ใช้งาน" :
                "เพิ่มผู้ใช้งาน",
            submitLabel: "บันทึก",
            fields: [
                {
                    name: "username",
                    label: "ชื่อผู้ใช้งาน",
                    type: "text",
                    required: true
                },
                {
                    name: "password",
                    label: isEdit ?
                        "รหัสผ่านใหม่ หากไม่เปลี่ยนให้เว้นว่าง" :
                        "รหัสผ่าน",
                    type: "password",
                    required: !isEdit
                },
                {
                    name: "fullName",
                    label: "ชื่อ-นามสกุล",
                    type: "text",
                    required: true
                },
                {
                    name: "role",
                    label: "สิทธิ์",
                    type: "select",
                    required: true,
                    options: USER_ROLES,
                    placeholderOption: "เลือกสิทธิ์"
                },
                {
                    name: "active",
                    label: "เปิดใช้งาน",
                    type: "checkbox"
                }
            ],
            values: values,
            onSubmit: async function (form) {
                var data = formToObject(form);

                if (!data.username || !data.fullName) {
                    showToast("กรุณากรอกข้อมูลให้ครบ", "warning");
                    return;
                }

                if (!isEdit && !data.password) {
                    showToast("กรุณากรอกรหัสผ่าน", "warning");
                    return;
                }

                try {
                    setModalBusy(true);

                    var response;

                    if (isEdit) {
                        response = await updateEntity(
                            "Users",
                            record.id,
                            data
                        );
                    } else {
                        response = await createEntity(
                            "Users",
                            data
                        );
                    }

                    if (!responseSuccess(response)) {
                        throw createError(
                            extractMessage(response),
                            0,
                            "USER_SAVE_FAILED",
                            response
                        );
                    }

                    closeModal();
                    showToast("บันทึกผู้ใช้งานเรียบร้อยแล้ว", "success");

                    await renderUsersPage();
                } catch (error) {
                    showToast(
                        error.message || "ไม่สามารถบันทึกผู้ใช้งานได้",
                        "error"
                    );
                } finally {
                    setModalBusy(false);
                }
            }
        });
    }

    function openSettingModal(record) {
        if (!isAdmin()) {
            showToast("คุณไม่มีสิทธิ์แก้ไขการตั้งค่า", "warning");
            return;
        }

        var isEdit = !!record;
        var values = getRecordValues(record);

        openModal({
            title: isEdit ?
                "แก้ไขการตั้งค่า" :
                "เพิ่มการตั้งค่า",
            submitLabel: "บันทึก",
            fields: [
                {
                    name: "key",
                    label: "Key",
                    type: "text",
                    required: true
                },
                {
                    name: "value",
                    label: "ค่า",
                    type: "text"
                },
                {
                    name: "description",
                    label: "คำอธิบาย",
                    type: "textarea"
                }
            ],
            values: values,
            onSubmit: async function (form) {
                var data = formToObject(form);

                if (!data.key) {
                    showToast("กรุณาระบุ Key", "warning");
                    return;
                }

                try {
                    setModalBusy(true);

                    var response;

                    if (isEdit) {
                        response = await apiRequest(
                            "updatesetting",
                            {
                                id: record.id,
                                key: data.key,
                                value: data.value,
                                description: data.description
                            },
                            {
                                includeToken: true
                            }
                        );
                    } else {
                        response = await createEntity(
                            "Settings",
                            data
                        );
                    }

                    if (!responseSuccess(response)) {
                        throw createError(
                            extractMessage(response),
                            0,
                            "SETTING_SAVE_FAILED",
                            response
                        );
                    }

                    closeModal();
                    showToast("บันทึกการตั้งค่าเรียบร้อยแล้ว", "success");

                    await renderSettingsPage();
                } catch (error) {
                    showToast(
                        error.message || "ไม่สามารถบันทึกการตั้งค่าได้",
                        "error"
                    );
                } finally {
                    setModalBusy(false);
                }
            }
        });
    }

    function setModalBusy(value) {
        var form = byId("dynamicModalForm");

        if (!form) {
            return;
        }

        var controls = qsa(
            "input, select, textarea, button",
            form
        );

        controls.forEach(function (control) {
            control.disabled = !!value;
        });
    }

    function buildDocumentItemRow(item, index) {
        var row = item || {};

        return (
            '<div class="document-item-row" data-document-item-row="' +
            escapeAttribute(index) +
            '">' +
            '<div class="form-group">' +
            "<label>รายการ</label>" +
            '<input type="text" class="form-control" data-item-field="description" value="' +
            escapeAttribute(row.description || "") +
            '">' +
            "</div>" +
            '<div class="form-group">' +
            "<label>จำนวน</label>" +
            '<input type="number" step="0.01" class="form-control" data-item-field="quantity" value="' +
            escapeAttribute(
                row.quantity === undefined ?
                1 :
                row.quantity
            ) +
            '">' +
            "</div>" +
            '<div class="form-group">' +
            "<label>หน่วยละ</label>" +
            '<input type="number" step="0.01" class="form-control" data-item-field="unitPrice" value="' +
            escapeAttribute(row.unitPrice || "") +
            '">' +
            "</div>" +
            '<div class="form-group">' +
            "<label>รวม</label>" +
            '<input type="number" step="0.01" class="form-control" data-item-field="total" value="' +
            escapeAttribute(row.total || "") +
            '" readonly>' +
            "</div>" +
            '<div class="form-group document-item-remove">' +
            '<button type="button" class="btn btn-danger btn-sm" data-remove-document-item="' +
            escapeAttribute(index) +
            '">ลบ</button>' +
            "</div>" +
            "</div>"
        );
    }

    function openDocumentModal(record) {
        var isEdit = !!record;
        var values = getRecordValues(record);

        state.documentItems = [];

        if (record && Array.isArray(record.items)) {
            state.documentItems = record.items.slice();
        }

        if (!state.documentItems.length) {
            state.documentItems.push({
                description: "",
                quantity: 1,
                unitPrice: 0,
                total: 0
            });
        }

        var fields = [
            {
                name: "docType",
                label: "ประเภทเอกสาร",
                type: "select",
                required: true,
                options: DOCUMENT_TYPES,
                placeholderOption: "เลือกประเภทเอกสาร"
            },
            {
                name: "date",
                label: "วันที่",
                type: "date",
                required: true
            },
            {
                name: "dueDate",
                label: "วันครบกำหนด",
                type: "date"
            },
            {
                name: "customerId",
                label: "ลูกค้า",
                type: "select",
                options: customerOptions(),
                placeholderOption: "เลือกข้อมูลลูกค้า"
            },
            {
                name: "vendorId",
                label: "ผู้จำหน่าย / เจ้าหนี้",
                type: "select",
                options: vendorOptions(),
                placeholderOption: "เลือกข้อมูลผู้จำหน่าย"
            },
            {
                name: "partyName",
                label: "ชื่อคู่ค้า",
                type: "text"
            },
            {
                name: "taxId",
                label: "เลขประจำตัวผู้เสียภาษี",
                type: "text"
            },
            {
                name: "address",
                label: "ที่อยู่",
                type: "textarea"
            },
            {
                name: "phone",
                label: "โทรศัพท์",
                type: "tel"
            },
            {
                name: "subject",
                label: "เรื่อง",
                type: "text"
            },
            {
                name: "discount",
                label: "ส่วนลด",
                type: "number"
            },
            {
                name: "taxRate",
                label: "VAT %",
                type: "number"
            },
            {
                name: "notes",
                label: "หมายเหตุ",
                type: "textarea"
            }
        ];

        if (!values.date) {
            values.date = toInputDate();
        }

        if (values.taxRate === undefined || values.taxRate === "") {
            values.taxRate = 7;
        }

        var modal = ensureModal();

        var html =
            '<div class="modal-backdrop" data-modal-close></div>' +
            '<div class="modal-dialog modal-dialog-large">' +
            '<div class="modal-header">' +
            "<h3>" +
            escapeHtml(
                isEdit ?
                "แก้ไขเอกสาร" :
                "สร้างเอกสาร"
            ) +
            "</h3>" +
            '<button type="button" class="modal-close" data-modal-close aria-label="ปิด">×</button>' +
            "</div>" +
            '<form class="modal-form" id="documentModalForm">' +
            '<div class="modal-body">';

        html += '<div class="form-grid">';

        fields.forEach(function (field) {
            html += createFormField(
                field,
                values[field.name]
            );
        });

        html += "</div>";

        html +=
            '<div class="document-items-section">' +
            '<div class="document-items-header">' +
            "<h4>รายการสินค้า / บริการ</h4>" +
            '<button type="button" class="btn btn-secondary btn-sm" data-action="add-document-item">เพิ่มรายการ</button>' +
            "</div>" +
            '<div id="documentItemsContainer">';

        state.documentItems.forEach(function (item, index) {
            html += buildDocumentItemRow(item, index);
        });

        html +=
            "</div>" +
            '<div class="document-summary">' +
            '<div><span>รวมก่อนส่วนลด</span><strong id="documentSubtotal">0.00</strong></div>' +
            '<div><span>ส่วนลด</span><strong id="documentDiscount">0.00</strong></div>' +
            '<div><span>ฐานภาษี</span><strong id="documentTaxBase">0.00</strong></div>' +
            '<div><span>VAT</span><strong id="documentTax">0.00</strong></div>' +
            '<div class="document-grand-total"><span>ยอดรวมทั้งสิ้น</span><strong id="documentGrandTotal">0.00</strong></div>' +
            "</div>" +
            "</div>";

        html +=
            "</div>" +
            '<div class="modal-footer">' +
            '<button type="button" class="btn btn-secondary" data-modal-close>ยกเลิก</button>' +
            '<button type="submit" class="btn btn-primary">บันทึกเอกสาร</button>' +
            "</div>" +
            "</form>" +
            "</div>";

        modal.innerHTML = html;

        showElement(modal);

        state.modalOpen = true;

        updateDocumentTotals();

        var form = byId("documentModalForm");

        if (form) {
            form.addEventListener("submit", function (event) {
                event.preventDefault();
                event.stopPropagation();

                saveDocumentFromForm(form, record);
            });
        }
    }

    function readDocumentItems() {
        var container = byId("documentItemsContainer");

        if (!container) {
            return [];
        }

        var rows = qsa(
            "[data-document-item-row]",
            container
        );

        var items = [];

        rows.forEach(function (row) {
            var descriptionElement = row.querySelector(
                '[data-item-field="description"]'
            );

            var quantityElement = row.querySelector(
                '[data-item-field="quantity"]'
            );

            var unitPriceElement = row.querySelector(
                '[data-item-field="unitPrice"]'
            );

            var totalElement = row.querySelector(
                '[data-item-field="total"]'
            );

            var quantity = parseNumber(
                quantityElement ? quantityElement.value : 0
            );

            var unitPrice = parseNumber(
                unitPriceElement ? unitPriceElement.value : 0
            );

            var total = quantity * unitPrice;

            if (totalElement) {
                totalElement.value = total.toFixed(2);
            }

            items.push({
                description: descriptionElement ?
                    descriptionElement.value :
                    "",
                quantity: quantity,
                unitPrice: unitPrice,
                total: total
            });
        });

        return items;
    }

    function updateDocumentTotals() {
        var items = readDocumentItems();

        var subtotal = 0;

        items.forEach(function (item) {
            subtotal += parseNumber(item.total);
        });

        var discountElement = qs(
            '#documentModalForm [name="discount"]'
        );

        var taxRateElement = qs(
            '#documentModalForm [name="taxRate"]'
        );

        var discount = discountElement ?
            parseNumber(discountElement.value) :
            0;

        var taxRate = taxRateElement ?
            parseNumber(taxRateElement.value) :
            0;

        var taxBase = subtotal - discount;

        if (taxBase < 0) {
            taxBase = 0;
        }

        var tax = taxBase * taxRate / 100;

        var grandTotal = taxBase + tax;

        setTextByIds(
            ["documentSubtotal"],
            formatMoney(subtotal)
        );

        setTextByIds(
            ["documentDiscount"],
            formatMoney(discount)
        );

        setTextByIds(
            ["documentTaxBase"],
            formatMoney(taxBase)
        );

        setTextByIds(
            ["documentTax"],
            formatMoney(tax)
        );

        setTextByIds(
            ["documentGrandTotal"],
            formatMoney(grandTotal)
        );

        return {
            subtotal: subtotal,
            discount: discount,
            taxBase: taxBase,
            tax: tax,
            total: grandTotal
        };
    }

    async function saveDocumentFromForm(form, record) {
        var data = formToObject(form);
        var items = readDocumentItems();
        var totals = updateDocumentTotals();

        data.discount = parseNumber(data.discount);
        data.taxRate = parseNumber(data.taxRate);
        data.subtotal = totals.subtotal;
        data.taxBase = totals.taxBase;
        data.tax = totals.tax;
        data.total = totals.total;

        if (!data.docType) {
            showToast("กรุณาเลือกประเภทเอกสาร", "warning");
            return;
        }

        if (!data.date) {
            showToast("กรุณาระบุวันที่", "warning");
            return;
        }

        if (!items.length) {
            showToast("กรุณาเพิ่มรายการอย่างน้อย 1 รายการ", "warning");
            return;
        }

        try {
            setModalBusy(true);

            var response = await apiRequest(
                "savedocument",
                {
                    id: record ? record.id : "",
                    data: data,
                    items: items
                },
                {
                    includeToken: true
                }
            );

            if (!responseSuccess(response)) {
                throw createError(
                    extractMessage(response),
                    0,
                    "SAVE_DOCUMENT_FAILED",
                    response
                );
            }

            closeModal();
            showToast("บันทึกเอกสารเรียบร้อยแล้ว", "success");

            await renderDocumentsPage();
        } catch (error) {
            showToast(
                error.message || "ไม่สามารถบันทึกเอกสารได้",
                "error"
            );
        } finally {
            setModalBusy(false);
        }
    }

    function addDocumentItem() {
        state.documentItems = readDocumentItems();

        state.documentItems.push({
            description: "",
            quantity: 1,
            unitPrice: 0,
            total: 0
        });

        renderDocumentItems();
    }

    function removeDocumentItem(index) {
        state.documentItems = readDocumentItems();

        if (state.documentItems.length <= 1) {
            showToast("ต้องมีรายการอย่างน้อย 1 รายการ", "warning");
            return;
        }

        state.documentItems.splice(index, 1);

        renderDocumentItems();
    }

    function renderDocumentItems() {
        var container = byId("documentItemsContainer");

        if (!container) {
            return;
        }

        container.innerHTML = "";

        state.documentItems.forEach(function (item, index) {
            container.insertAdjacentHTML(
                "beforeend",
                buildDocumentItemRow(item, index)
            );
        });

        updateDocumentTotals();
    }

    async function cancelDocument(id) {
        if (!id) {
            return;
        }

        if (!confirmAction("ยืนยันยกเลิกเอกสารรายการนี้หรือไม่")) {
            return;
        }

        try {
            var response = await apiRequest(
                "cancelDocument",
                {
                    id: id
                },
                {
                    includeToken: true
                }
            );

            if (!responseSuccess(response)) {
                throw createError(
                    extractMessage(response),
                    0,
                    "CANCEL_DOCUMENT_FAILED",
                    response
                );
            }

            showToast("ยกเลิกเอกสารเรียบร้อยแล้ว", "success");

            await renderDocumentsPage();
        } catch (error) {
            showToast(
                error.message || "ไม่สามารถยกเลิกเอกสารได้",
                "error"
            );
        }
    }

    async function deleteRecord(entity, id, refreshFunction) {
        if (!id) {
            return;
        }

        if (!confirmAction("ยืนยันลบข้อมูลรายการนี้หรือไม่")) {
            return;
        }

        try {
            await deleteEntity(entity, id);

            showToast("ลบข้อมูลเรียบร้อยแล้ว", "success");

            if (typeof refreshFunction === "function") {
                await refreshFunction();
            }
        } catch (error) {
            showToast(
                error.message || "ไม่สามารถลบข้อมูลได้",
                "error"
            );
        }
    }

    async function searchEntity(entity, keyword, renderFunction) {
        var filters = {};

        if (keyword) {
            filters.search = keyword;
            filters.keyword = keyword;
        }

        try {
            var rows = await listEntity(entity, filters);

            state.currentEntity = entity;
            state.currentData = rows;

            if (typeof renderFunction === "function") {
                renderFunction(rows);
            }
        } catch (error) {
            showToast(
                error.message || "ค้นหาข้อมูลไม่สำเร็จ",
                "error"
            );
        }
    }

    function getSearchKeyword(action) {
        var input = qs(
            '[data-search-input="' +
            escapeAttribute(action) +
            '"]'
        );

        if (!input) {
            input = qs("input[data-search-input]");
        }

        return input ? input.value.trim() : "";
    }

    async function exportCurrentRows(rows, filename, title) {
        var data = Array.isArray(rows) ? rows : [];

        if (!data.length) {
            showToast("ไม่มีข้อมูลสำหรับส่งออก", "warning");
            return;
        }

        if (
            window.XLSX &&
            window.XLSX.utils &&
            typeof window.XLSX.writeFile === "function"
        ) {
            try {
                var worksheet = window.XLSX.utils.json_to_sheet(data);
                var workbook = window.XLSX.utils.book_new();

                window.XLSX.utils.book_append_sheet(
                    workbook,
                    worksheet,
                    "Data"
                );

                window.XLSX.writeFile(
                    workbook,
                    filename || "export.xlsx"
                );

                showToast("ส่งออก Excel เรียบร้อยแล้ว", "success");

                return;
            } catch (error) {
                console.error("XLSX ERROR", error);
            }
        }

        exportCsv(
            data,
            String(filename || "export.xlsx").replace(
                /\.xlsx$/i,
                ".csv"
            )
        );

        showToast(
            "ไม่พบไลบรารี XLSX จึงส่งออกเป็น CSV แทน",
            "warning"
        );
    }

    function exportCsv(rows, filename) {
        var data = Array.isArray(rows) ? rows : [];

        if (!data.length) {
            return;
        }

        var keys = Object.keys(data[0]);
        var lines = [];

        lines.push(
            keys.map(function (key) {
                return csvEscape(key);
            }).join(",")
        );

        data.forEach(function (row) {
            lines.push(
                keys.map(function (key) {
                    return csvEscape(row[key]);
                }).join(",")
            );
        });

        var blob = new Blob(
            [
                "\ufeff" +
                lines.join("\r\n")
            ],
            {
                type: "text/csv;charset=utf-8"
            }
        );

        downloadBlob(
            blob,
            filename || "export.csv"
        );
    }

    function csvEscape(value) {
        if (value === null || value === undefined) {
            return '""';
        }

        var text = String(value)
            .replace(/"/g, '""');

        return '"' + text + '"';
    }

    function downloadBlob(blob, filename) {
        var url = URL.createObjectURL(blob);
        var link = document.createElement("a");

        link.href = url;
        link.download = filename || "download";
        link.style.display = "none";

        document.body.appendChild(link);
        link.click();

        setTimeout(function () {
            if (link.parentNode) {
                link.parentNode.removeChild(link);
            }

            URL.revokeObjectURL(url);
        }, 100);
    }

    function createPrintDocument(title, contentHtml) {
        var printWindow = window.open(
            "",
            "_blank",
            "width=1000,height=800"
        );

        if (!printWindow) {
            showToast(
                "เบราว์เซอร์บล็อกหน้าต่างพิมพ์ กรุณาอนุญาต Pop-up",
                "warning"
            );

            return;
        }

        var html =
            "<!DOCTYPE html>" +
            '<html lang="th">' +
            "<head>" +
            '<meta charset="UTF-8">' +
            "<title>" +
            escapeHtml(title) +
            "</title>" +
            "<style>" +
            "body{font-family:'TH Sarabun New','TH Sarabun',Tahoma,sans-serif;padding:30px;color:#111;font-size:18px;}" +
            "h1,h2,h3{margin-top:0;}" +
            "table{width:100%;border-collapse:collapse;margin-top:20px;}" +
            "th,td{border:1px solid #333;padding:7px;text-align:left;}" +
            ".text-right{text-align:right;}" +
            ".print-header{text-align:center;margin-bottom:20px;}" +
            ".print-footer{margin-top:30px;text-align:right;}" +
            "@media print{body{padding:10mm;}button{display:none!important;}}" +
            "</style>" +
            "</head>" +
            "<body>" +
            contentHtml +
            "</body>" +
            "</html>";

        printWindow.document.open();
        printWindow.document.write(html);
        printWindow.document.close();

        setTimeout(function () {
            printWindow.focus();
            printWindow.print();
        }, 500);
    }

    function printReport() {
        var container = byId("reportResultContainer");

        if (!container) {
            showToast("ยังไม่มีรายงานให้พิมพ์", "warning");
            return;
        }

        createPrintDocument(
            "รายงาน " + CONFIG.APP_NAME,
            '<div class="print-header">' +
            "<h1>รายงาน</h1>" +
            "<p>" +
            escapeHtml(
                getValueById("reportType") ||
                "รายงานทางการเงิน"
            ) +
            "</p>" +
            "</div>" +
            container.innerHTML
        );
    }

    function getValueById(id) {
        var element = byId(id);

        if (!element) {
            return "";
        }

        return element.value || element.textContent || "";
    }

    function exportReport() {
        var rows = state.reportData;

        if (rows && rows.rows) {
            rows = rows.rows;
        }

        if (rows && rows.items) {
            rows = rows.items;
        }

        rows = normalizeArray(rows);

        exportCurrentRows(
            rows,
            "report_" + toInputDate() + ".xlsx",
            "รายงาน"
        );
    }

    function exportPageData(filename) {
        exportCurrentRows(
            state.currentData,
            filename || "export.xlsx",
            PAGE_NAMES[state.currentPage] || "ข้อมูล"
        );
    }

    async function nextDocumentNumber(docType) {
        try {
            var response = await apiRequest(
                "nextdocumentnumber",
                {
                    docType: docType
                },
                {
                    includeToken: true
                }
            );

            if (!responseSuccess(response)) {
                return "";
            }

            var data = normalizeResponse(response);

            if (data.data !== undefined) {
                data = parseMaybeJson(data.data);
            }

            if (data.result !== undefined) {
                data = parseMaybeJson(data.result);
            }

            if (typeof data === "string") {
                return data;
            }

            if (data.docNo) {
                return String(data.docNo);
            }

            if (data.number) {
                return String(data.number);
            }

            if (data.documentNumber) {
                return String(data.documentNumber);
            }

            return "";
        } catch (error) {
            console.warn("DOCUMENT NUMBER ERROR", error);
            return "";
        }
    }

    function refreshPage() {
        return navigate(
            state.currentPage,
            true
        );
    }

    async function handleAction(action, element) {
        var id = element ?
            element.getAttribute("data-id") :
            "";

        if (action === "logout") {
            await logout();
            return;
        }

        if (action === "dashboard") {
            await navigate("dashboard");
            return;
        }

        if (PAGE_NAMES[action]) {
            await navigate(action);
            return;
        }

        if (action === "refresh-dashboard") {
            await renderDashboard();
            return;
        }

        if (action === "add-income") {
            openIncomeModal(null);
            return;
        }

        if (action === "edit-income") {
            var incomeRecord = getRecordById(
                state.currentData,
                id
            );

            if (!incomeRecord) {
                try {
                    incomeRecord = await getEntity(
                        "Income",
                        id
                    );
                } catch (error) {
                    showToast(
                        error.message || "ไม่พบข้อมูลรายรับ",
                        "error"
                    );
                    return;
                }
            }

            openIncomeModal(incomeRecord);
            return;
        }

        if (action === "delete-income") {
            await deleteRecord(
                "Income",
                id,
                function () {
                    return renderIncomePage();
                }
            );
            return;
        }

        if (action === "add-expense") {
            openExpenseModal(null);
            return;
        }

        if (action === "edit-expense") {
            var expenseRecord = getRecordById(
                state.currentData,
                id
            );

            if (!expenseRecord) {
                try {
                    expenseRecord = await getEntity(
                        "Expenses",
                        id
                    );
                } catch (error) {
                    showToast(
                        error.message || "ไม่พบข้อมูลรายจ่าย",
                        "error"
                    );
                    return;
                }
            }

            openExpenseModal(expenseRecord);
            return;
        }

        if (action === "delete-expense") {
            await deleteRecord(
                "Expenses",
                id,
                function () {
                    return renderExpensePage();
                }
            );
            return;
        }

        if (action === "add-transfer") {
            openTransferModal(null);
            return;
        }

        if (action === "edit-transfer") {
            var transferRecord = getRecordById(
                state.currentData,
                id
            );

            if (!transferRecord) {
                transferRecord = await getEntity(
                    "Transfers",
                    id
                );
            }

            openTransferModal(transferRecord);
            return;
        }

        if (action === "delete-transfer") {
            await deleteRecord(
                "Transfers",
                id,
                function () {
                    return renderTransfersPage();
                }
            );
            return;
        }

        if (action === "add-account") {
            openAccountModal(null);
            return;
        }

        if (action === "edit-account") {
            var accountRecord = getRecordById(
                state.currentData,
                id
            );

            if (!accountRecord) {
                accountRecord = await getEntity(
                    "Accounts",
                    id
                );
            }

            openAccountModal(accountRecord);
            return;
        }

        if (action === "delete-account") {
            await deleteRecord(
                "Accounts",
                id,
                function () {
                    return renderAccountsPage();
                }
            );
            return;
        }

        if (action === "add-customer") {
            openCustomerModal(null);
            return;
        }

        if (action === "edit-customer") {
            var customerRecord = getRecordById(
                state.currentData,
                id
            );

            if (!customerRecord) {
                customerRecord = await getEntity(
                    "Customers",
                    id
                );
            }

            openCustomerModal(customerRecord);
            return;
        }

        if (action === "delete-customer") {
            await deleteRecord(
                "Customers",
                id,
                function () {
                    return renderCustomersPage();
                }
            );
            return;
        }

        if (action === "add-vendor") {
            openVendorModal(null);
            return;
        }

        if (action === "edit-vendor") {
            var vendorRecord = getRecordById(
                state.currentData,
                id
            );

            if (!vendorRecord) {
                vendorRecord = await getEntity(
                    "Vendors",
                    id
                );
            }

            openVendorModal(vendorRecord);
            return;
        }

        if (action === "delete-vendor") {
            await deleteRecord(
                "Vendors",
                id,
                function () {
                    return renderVendorsPage();
                }
            );
            return;
        }

        if (action === "add-document") {
            openDocumentModal(null);
            return;
        }

        if (action === "edit-document") {
            var documentRecord = getRecordById(
                state.currentData,
                id
            );

            try {
                var detailResponse = await apiRequest(
                    "getDocumentWithItems",
                    {
                        id: id
                    },
                    {
                        includeToken: true
                    }
                );

                if (responseSuccess(detailResponse)) {
                    var detailData = normalizeResponse(detailResponse);

                    if (detailData.data !== undefined) {
                        detailData = parseMaybeJson(detailData.data);
                    }

                    if (detailData.result !== undefined) {
                        detailData = parseMaybeJson(detailData.result);
                    }

                    if (detailData.document) {
                        documentRecord = detailData.document;
                    } else if (detailData.id || detailData.docNo) {
                        documentRecord = detailData;
                    }

                    if (detailData.items) {
                        documentRecord.items = normalizeArray(
                            detailData.items
                        );
                    }
                }
            } catch (error) {
                console.warn("GET DOCUMENT DETAIL ERROR", error);
            }

            if (!documentRecord) {
                showToast("ไม่พบข้อมูลเอกสาร", "warning");
                return;
            }

            openDocumentModal(documentRecord);
            return;
        }

        if (action === "delete-document") {
            await deleteRecord(
                "Documents",
                id,
                function () {
                    return renderDocumentsPage();
                }
            );
            return;
        }

        if (action === "cancel-document") {
            await cancelDocument(id);
            return;
        }

        if (action === "add-user") {
            openUserModal(null);
            return;
        }

        if (action === "edit-user") {
            var userRecord = getRecordById(
                state.currentData,
                id
            );

            if (!userRecord) {
                userRecord = await getEntity(
                    "Users",
                    id
                );
            }

            openUserModal(userRecord);
            return;
        }

        if (action === "delete-user") {
            await deleteRecord(
                "Users",
                id,
                function () {
                    return renderUsersPage();
                }
            );
            return;
        }

        if (action === "add-setting") {
            openSettingModal(null);
            return;
        }

        if (action === "edit-setting") {
            var settingRecord = getRecordById(
                state.currentData,
                id
            );

            if (!settingRecord) {
                settingRecord = await getEntity(
                    "Settings",
                    id
                );
            }

            openSettingModal(settingRecord);
            return;
        }

        if (action === "refresh-auditlogs") {
            await renderAuditLogsPage();
            return;
        }

        if (action === "run-report") {
            try {
                await runReport();
                showToast("สร้างรายงานเรียบร้อยแล้ว", "success");
            } catch (error) {
                showToast(
                    error.message || "สร้างรายงานไม่สำเร็จ",
                    "error"
                );
            }

            return;
        }

        if (action === "print-report") {
            printReport();
            return;
        }

        if (action === "export-report-xlsx") {
            exportReport();
            return;
        }

        if (action === "add-document-item") {
            addDocumentItem();
            return;
        }

        if (action === "close-modal") {
            closeModal();
            return;
        }

        if (action === "refresh-page") {
            await refreshPage();
            return;
        }

        if (action === "export-income-xlsx") {
            exportPageData("income_" + toInputDate() + ".xlsx");
            return;
        }

        if (action === "export-expense-xlsx") {
            exportPageData("expense_" + toInputDate() + ".xlsx");
            return;
        }

        if (action === "export-transfers-xlsx") {
            exportPageData("transfers_" + toInputDate() + ".xlsx");
            return;
        }

        if (action === "export-accounts-xlsx") {
            exportPageData("accounts_" + toInputDate() + ".xlsx");
            return;
        }

        if (action === "export-customers-xlsx") {
            exportPageData("customers_" + toInputDate() + ".xlsx");
            return;
        }

        if (action === "export-vendors-xlsx") {
            exportPageData("vendors_" + toInputDate() + ".xlsx");
            return;
        }

        if (action === "export-documents-xlsx") {
            exportPageData("documents_" + toInputDate() + ".xlsx");
            return;
        }

        if (action === "export-users-xlsx") {
            exportPageData("users_" + toInputDate() + ".xlsx");
            return;
        }

        if (action === "export-auditlogs-xlsx") {
            exportPageData("auditlogs_" + toInputDate() + ".xlsx");
            return;
        }

        if (action === "search-income") {
            var incomeKeyword = getSearchKeyword(action);

            await searchEntity(
                "Income",
                incomeKeyword,
                function (rows) {
                    renderTable(
                        byId("incomeTableContainer"),
                        [
                            {
                                label: "วันที่",
                                key: "date",
                                render: function (row) {
                                    return formatDate(row.date);
                                }
                            },
                            {
                                label: "เลขที่เอกสาร",
                                key: "docNo"
                            },
                            {
                                label: "รายการ",
                                key: "description"
                            },
                            {
                                label: "ผู้ติดต่อ",
                                key: "counterparty"
                            },
                            {
                                label: "จำนวนเงิน",
                                key: "amount",
                                render: function (row) {
                                    return formatMoney(row.amount);
                                }
                            }
                        ],
                        rows,
                        {
                            actions: {
                                editAction: "edit-income",
                                deleteAction: "delete-income"
                            }
                        }
                    );
                }
            );

            return;
        }

        if (action === "search-expense") {
            var expenseKeyword = getSearchKeyword(action);

            await searchEntity(
                "Expenses",
                expenseKeyword,
                function (rows) {
                    renderTable(
                        byId("expenseTableContainer"),
                        [
                            {
                                label: "วันที่",
                                key: "date",
                                render: function (row) {
                                    return formatDate(row.date);
                                }
                            },
                            {
                                label: "เลขที่เอกสาร",
                                key: "docNo"
                            },
                            {
                                label: "รายการ",
                                key: "description"
                            },
                            {
                                label: "ผู้จำหน่าย",
                                key: "counterparty"
                            },
                            {
                                label: "จำนวนเงิน",
                                key: "amount",
                                render: function (row) {
                                    return formatMoney(row.amount);
                                }
                            }
                        ],
                        rows,
                        {
                            actions: {
                                editAction: "edit-expense",
                                deleteAction: "delete-expense"
                            }
                        }
                    );
                }
            );

            return;
        }

        if (action === "search-transfers") {
            var transferKeyword = getSearchKeyword(action);

            await searchEntity(
                "Transfers",
                transferKeyword,
                function (rows) {
                    renderTable(
                        byId("transfersTableContainer"),
                        [
                            {
                                label: "วันที่",
                                key: "date",
                                render: function (row) {
                                    return formatDate(row.date);
                                }
                            },
                            {
                                label: "เลขที่เอกสาร",
                                key: "docNo"
                            },
                            {
                                label: "จากบัญชี",
                                key: "fromAccountId",
                                render: function (row) {
                                    return accountName(row.fromAccountId);
                                }
                            },
                            {
                                label: "ไปบัญชี",
                                key: "toAccountId",
                                render: function (row) {
                                    return accountName(row.toAccountId);
                                }
                            },
                            {
                                label: "จำนวนเงิน",
                                key: "amount",
                                render: function (row) {
                                    return formatMoney(row.amount);
                                }
                            }
                        ],
                        rows,
                        {
                            actions: {
                                editAction: "edit-transfer",
                                deleteAction: "delete-transfer"
                            }
                        }
                    );
                }
            );

            return;
        }

        if (action === "search-customers") {
            var customerKeyword = getSearchKeyword(action);

            await searchEntity(
                "Customers",
                customerKeyword,
                function (rows) {
                    renderTable(
                        byId("customersTableContainer"),
                        [
                            {
                                label: "รหัส",
                                key: "code"
                            },
                            {
                                label: "ชื่อ",
                                key: "name"
                            },
                            {
                                label: "เลขประจำตัวผู้เสียภาษี",
                                key: "taxId"
                            },
                            {
                                label: "โทรศัพท์",
                                key: "phone"
                            }
                        ],
                        rows,
                        {
                            actions: {
                                editAction: "edit-customer",
                                deleteAction: "delete-customer"
                            }
                        }
                    );
                }
            );

            return;
        }

        if (action === "search-vendors") {
            var vendorKeyword = getSearchKeyword(action);

            await searchEntity(
                "Vendors",
                vendorKeyword,
                function (rows) {
                    renderTable(
                        byId("vendorsTableContainer"),
                        [
                            {
                                label: "รหัส",
                                key: "code"
                            },
                            {
                                label: "ชื่อ",
                                key: "name"
                            },
                            {
                                label: "เลขประจำตัวผู้เสียภาษี",
                                key: "taxId"
                            },
                            {
                                label: "โทรศัพท์",
                                key: "phone"
                            }
                        ],
                        rows,
                        {
                            actions: {
                                editAction: "edit-vendor",
                                deleteAction: "delete-vendor"
                            }
                        }
                    );
                }
            );

            return;
        }

        if (action === "search-documents") {
            var documentKeyword = getSearchKeyword(action);

            await searchEntity(
                "Documents",
                documentKeyword,
                function (rows) {
                    renderTable(
                        byId("documentsTableContainer"),
                        [
                            {
                                label: "วันที่",
                                key: "date",
                                render: function (row) {
                                    return formatDate(row.date);
                                }
                            },
                            {
                                label: "เลขที่",
                                key: "docNo"
                            },
                            {
                                label: "ประเภท",
                                key: "docType",
                                render: function (row) {
                                    return documentTypeLabel(row.docType);
                                }
                            },
                            {
                                label: "คู่ค้า",
                                key: "partyName"
                            },
                            {
                                label: "ยอดรวม",
                                key: "total",
                                render: function (row) {
                                    return formatMoney(row.total);
                                }
                            }
                        ],
                        rows,
                        {
                            actions: {
                                editAction: "edit-document",
                                deleteAction: "delete-document"
                            }
                        }
                    );
                }
            );

            return;
        }
    }

    function bindGlobalEvents() {
        document.addEventListener(
            "click",
            function (event) {
                var closeElement = event.target.closest ?
                    event.target.closest("[data-modal-close]") :
                    null;

                if (closeElement) {
                    event.preventDefault();
                    closeModal();
                    return;
                }

                var removeItem = event.target.closest ?
                    event.target.closest("[data-remove-document-item]") :
                    null;

                if (removeItem) {
                    event.preventDefault();

                    var index = parseInt(
                        removeItem.getAttribute(
                            "data-remove-document-item"
                        ),
                        10
                    );

                    if (!isNaN(index)) {
                        removeDocumentItem(index);
                    }

                    return;
                }

                var actionElement = event.target.closest ?
                    event.target.closest("[data-action]") :
                    null;

                if (!actionElement) {
                    return;
                }

                if (
                    actionElement.id === "loginButton" ||
                    actionElement.id === "loginBtn"
                ) {
                    return;
                }

                var action = actionElement.getAttribute(
                    "data-action"
                );

                if (!action) {
                    return;
                }

                event.preventDefault();

                handleAction(
                    action,
                    actionElement
                ).catch(function (error) {
                    console.error("ACTION ERROR", error);

                    showToast(
                        error.message || "เกิดข้อผิดพลาด",
                        "error"
                    );
                });
            },
            false
        );

        document.addEventListener(
            "input",
            debounce(function (event) {
                var target = event.target;

                if (!target) {
                    return;
                }

                if (
                    target.matches &&
                    target.matches(
                        '#documentModalForm [data-item-field="quantity"], ' +
                        '#documentModalForm [data-item-field="unitPrice"], ' +
                        '#documentModalForm [name="discount"], ' +
                        '#documentModalForm [name="taxRate"]'
                    )
                ) {
                    updateDocumentTotals();
                }
            }, 150)
        );

        document.addEventListener(
            "click",
            function (event) {
                var pageElement = event.target.closest ?
                    event.target.closest("[data-page]") :
                    null;

                if (!pageElement) {
                    return;
                }

                var page = pageElement.getAttribute("data-page");

                if (!page) {
                    return;
                }

                event.preventDefault();

                navigate(page).catch(function (error) {
                    console.error("PAGE NAVIGATION ERROR", error);
                });
            }
        );
    }

    function bindLogoutButtons() {
        var logoutSelectors = [
            "#logoutBtn",
            "#logoutButton",
            "[data-logout]"
        ];

        logoutSelectors.forEach(function (selector) {
            qsa(selector).forEach(function (element) {
                element.addEventListener(
                    "click",
                    function (event) {
                        event.preventDefault();

                        logout().catch(function (error) {
                            console.error("LOGOUT ERROR", error);
                        });
                    }
                );
            });
        });
    }

    function bindSearchEnter() {
        document.addEventListener(
            "keydown",
            function (event) {
                if (event.key !== "Enter") {
                    return;
                }

                var target = event.target;

                if (!target || !target.matches) {
                    return;
                }

                if (!target.matches("[data-search-input]")) {
                    return;
                }

                event.preventDefault();

                var action = target.getAttribute(
                    "data-search-input"
                );

                if (!action) {
                    return;
                }

                handleAction(
                    action,
                    target
                ).catch(function (error) {
                    showToast(
                        error.message || "ค้นหาไม่สำเร็จ",
                        "error"
                    );
                });
            }
        );
    }

    function ensureApiConfiguration() {
        if (getApiUrl()) {
            return true;
        }

        var warning =
            "ยังไม่ได้กำหนด Google Apps Script Web App URL";

        var apiWarning = byId("apiConfigurationWarning");

        if (apiWarning) {
            apiWarning.textContent = warning;
            showElement(apiWarning);
        }

        console.warn(warning);

        return false;
    }

    function exposeGlobalApi() {
        window.App = {
            config: CONFIG,
            state: state,
            login: login,
            logout: logout,
            navigate: navigate,
            apiRequest: apiRequest,
            refreshPage: refreshPage,
            showToast: showToast,
            openModal: openModal,
            closeModal: closeModal,
            renderDashboard: renderDashboard,
            runReport: runReport,
            printReport: printReport,
            exportReport: exportReport
        };

        window.login = login;
        window.logout = logout;
        window.navigate = navigate;
    }

    async function initialize() {
        if (state.initialized) {
            return;
        }

        state.initialized = true;

        exposeGlobalApi();

        bindLoginEvents();
        bindGlobalEvents();
        bindLogoutButtons();
        bindSearchEnter();

        ensureApiConfiguration();

        loadStoredSession();

        if (state.token) {
            var restored = await restoreSession();

            if (!restored) {
                showLoginScreen();
            }
        } else {
            showLoginScreen();
        }
    }

    if (document.readyState === "loading") {
        document.addEventListener(
            "DOMContentLoaded",
            function () {
                initialize().catch(function (error) {
                    console.error(
                        "APPLICATION INITIALIZATION ERROR",
                        error
                    );

                    showToast(
                        error.message ||
                        "ไม่สามารถเริ่มต้นระบบได้",
                        "error"
                    );

                    showLoginScreen();
                });
            }
        );
    } else {
        initialize().catch(function (error) {
            console.error(
                "APPLICATION INITIALIZATION ERROR",
                error
            );

            showToast(
                error.message ||
                "ไม่สามารถเริ่มต้นระบบได้",
                "error"
            );

            showLoginScreen();
        });
    }

})();
