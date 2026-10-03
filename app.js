/* =========================================================
   e-LAAS Private Finance
   app.js
   Complete Frontend Application
   ========================================================= */

/* =========================================================
   1. CONFIGURATION
   ========================================================= */

const APP_CONFIG = {
    APP_NAME: "ระบบบริหารการเงิน",
    APP_SHORT_NAME: "Private Finance",
    API_URL: "https://script.google.com/macros/s/AKfycbw8gnDcBxWV8W-RFRvi1e-yZmpa03O3P8M2iX-QAAB93TLZDQHO_8qAPInSghM9mtZm/exec",
    SESSION_STORAGE_KEY: "elaas_private_session",
    USER_STORAGE_KEY: "elaas_private_user",
    PAGE_SIZE: 20,
    CURRENCY: "THB",
    LOCALE: "th-TH",
    DATE_LOCALE: "th-TH",
    DECIMAL_DIGITS: 2,
    SESSION_CHECK_INTERVAL: 5 * 60 * 1000,
    REQUEST_TIMEOUT: 30000
};

/* =========================================================
   2. APPLICATION STATE
   ========================================================= */

const AppState = {
    initialized: false,
    authenticated: false,
    token: "",
    user: null,

    currentPage: "dashboard",

    settings: {},
    bootstrap: null,

    accounts: [],
    categories: [],
    customers: [],
    vendors: [],
    users: [],
    incomes: [],
    expenses: [],
    transfers: [],
    documents: [],
    auditLogs: [],

    dashboard: null,
    report: null,

    pagination: {
        accounts: {
            page: 1,
            pageSize: APP_CONFIG.PAGE_SIZE,
            total: 0
        },
        categories: {
            page: 1,
            pageSize: APP_CONFIG.PAGE_SIZE,
            total: 0
        },
        customers: {
            page: 1,
            pageSize: APP_CONFIG.PAGE_SIZE,
            total: 0
        },
        vendors: {
            page: 1,
            pageSize: APP_CONFIG.PAGE_SIZE,
            total: 0
        },
        users: {
            page: 1,
            pageSize: APP_CONFIG.PAGE_SIZE,
            total: 0
        },
        incomes: {
            page: 1,
            pageSize: APP_CONFIG.PAGE_SIZE,
            total: 0
        },
        expenses: {
            page: 1,
            pageSize: APP_CONFIG.PAGE_SIZE,
            total: 0
        },
        transfers: {
            page: 1,
            pageSize: APP_CONFIG.PAGE_SIZE,
            total: 0
        },
        documents: {
            page: 1,
            pageSize: APP_CONFIG.PAGE_SIZE,
            total: 0
        },
        auditLogs: {
            page: 1,
            pageSize: APP_CONFIG.PAGE_SIZE,
            total: 0
        }
    },

    filters: {
        accounts: {},
        categories: {},
        customers: {},
        vendors: {},
        users: {},
        incomes: {},
        expenses: {},
        transfers: {},
        documents: {},
        auditLogs: {}
    },

    modals: {},

    documentItems: [],

    documentForm: {
        id: "",
        docNo: "",
        docType: "",
        date: "",
        dueDate: "",
        customerId: "",
        vendorId: "",
        partyName: "",
        taxId: "",
        address: "",
        phone: "",
        subject: "",
        subtotal: 0,
        discount: 0,
        taxRate: 0,
        taxAmount: 0,
        total: 0,
        notes: "",
        status: "DRAFT"
    },

    incomeForm: {
        id: "",
        date: "",
        docNo: "",
        accountId: "",
        categoryId: "",
        counterpartyType: "",
        counterpartyId: "",
        counterpartyName: "",
        description: "",
        amount: 0,
        paymentMethod: "",
        reference: "",
        status: "ACTIVE"
    },

    expenseForm: {
        id: "",
        date: "",
        docNo: "",
        accountId: "",
        categoryId: "",
        counterpartyType: "",
        counterpartyId: "",
        counterpartyName: "",
        description: "",
        amount: 0,
        paymentMethod: "",
        reference: "",
        status: "ACTIVE"
    },

    transferForm: {
        id: "",
        date: "",
        docNo: "",
        fromAccountId: "",
        toAccountId: "",
        amount: 0,
        description: "",
        reference: "",
        status: "ACTIVE"
    }
};

/* =========================================================
   3. DOM HELPERS
   ========================================================= */

function $(selector, parent) {
    const root = parent || document;
    return root.querySelector(selector);
}

function $$(selector, parent) {
    const root = parent || document;
    return Array.from(root.querySelectorAll(selector));
}

function byId(id) {
    return document.getElementById(id);
}

function createElement(tagName, className, textContent) {
    const element = document.createElement(tagName);

    if (className) {
        element.className = className;
    }

    if (textContent !== undefined && textContent !== null) {
        element.textContent = textContent;
    }

    return element;
}

function setHTML(element, html) {
    if (!element) {
        return;
    }

    element.innerHTML = html;
}

function setText(element, text) {
    if (!element) {
        return;
    }

    element.textContent = text === null || text === undefined ? "" : String(text);
}

function showElement(element) {
    if (!element) {
        return;
    }

    element.classList.remove("hidden");
    element.classList.remove("d-none");
}

function hideElement(element) {
    if (!element) {
        return;
    }

    element.classList.add("hidden");
}

function toggleElement(element, show) {
    if (!element) {
        return;
    }

    if (show) {
        showElement(element);
    } else {
        hideElement(element);
    }
}

/* =========================================================
   4. STORAGE
   ========================================================= */

function saveSession(token, user) {
    try {
        localStorage.setItem(
            APP_CONFIG.SESSION_STORAGE_KEY,
            token
        );

        localStorage.setItem(
            APP_CONFIG.USER_STORAGE_KEY,
            JSON.stringify(user || {})
        );
    } catch (error) {
        console.error("Cannot save session:", error);
    }
}

function loadSession() {
    try {
        const token = localStorage.getItem(
            APP_CONFIG.SESSION_STORAGE_KEY
        );

        const userText = localStorage.getItem(
            APP_CONFIG.USER_STORAGE_KEY
        );

        let user = null;

        if (userText) {
            user = JSON.parse(userText);
        }

        return {
            token: token || "",
            user: user
        };
    } catch (error) {
        console.error("Cannot load session:", error);

        return {
            token: "",
            user: null
        };
    }
}

function clearSession() {
    try {
        localStorage.removeItem(
            APP_CONFIG.SESSION_STORAGE_KEY
        );

        localStorage.removeItem(
            APP_CONFIG.USER_STORAGE_KEY
        );
    } catch (error) {
        console.error("Cannot clear session:", error);
    }

    AppState.token = "";
    AppState.user = null;
    AppState.authenticated = false;
}

/* =========================================================
   5. API
   ========================================================= */

async function apiRequest(action, data, options) {
    const requestOptions = options || {};

    if (
        !APP_CONFIG.API_URL ||
        APP_CONFIG.API_URL.indexOf("ใส่_URL") !== -1
    ) {
        throw new Error(
            "กรุณากำหนด API_URL ใน app.js ให้เป็น URL ของ Google Apps Script Web App"
        );
    }

    const payload = Object.assign(
        {},
        data || {},
        {
            action: action
        }
    );

    if (
        AppState.token &&
        !Object.prototype.hasOwnProperty.call(payload, "token")
    ) {
        payload.token = AppState.token;
    }

    const controller = new AbortController();

    const timeout = setTimeout(function () {
        controller.abort();
    }, requestOptions.timeout || APP_CONFIG.REQUEST_TIMEOUT);

    try {
        const response = await fetch(
            APP_CONFIG.API_URL,
            {
                method: requestOptions.method || "POST",
                headers: {
                    "Content-Type": "text/plain;charset=utf-8"
                },
                body: JSON.stringify(payload),
                signal: controller.signal
            }
        );

        clearTimeout(timeout);

        if (!response.ok) {
            throw new Error(
                "HTTP Error " + response.status
            );
        }

        const text = await response.text();

        let result;

        try {
            result = JSON.parse(text);
        } catch (parseError) {
            console.error("Invalid JSON response:", text);
            throw new Error(
                "เซิร์ฟเวอร์ส่งข้อมูลกลับมาไม่ถูกต้อง"
            );
        }

        if (!result || result.ok !== true) {
            const message =
                result &&
                result.error &&
                result.error.message
                    ? result.error.message
                    : "เกิดข้อผิดพลาดจากเซิร์ฟเวอร์";

            throw new Error(message);
        }

        return result;
    } catch (error) {
        clearTimeout(timeout);

        if (error.name === "AbortError") {
            throw new Error(
                "การเชื่อมต่อใช้เวลานานเกินกำหนด"
            );
        }

        throw error;
    }
}

async function apiGet(action, data) {
    return apiRequest(
        action,
        data,
        {
            method: "POST"
        }
    );
}

/* =========================================================
   6. ERROR HANDLING
   ========================================================= */

function getErrorMessage(error) {
    if (!error) {
        return "เกิดข้อผิดพลาด";
    }

    if (typeof error === "string") {
        return error;
    }

    if (error.message) {
        return error.message;
    }

    return "เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ";
}

function handleApiError(error) {
    const message = getErrorMessage(error);

    console.error(error);

    showToast(
        "เกิดข้อผิดพลาด",
        message,
        "error"
    );

    if (
        message.indexOf("หมดอายุ") !== -1 ||
        message.indexOf("session") !== -1 ||
        message.indexOf("ไม่ได้เข้าสู่ระบบ") !== -1 ||
        message.indexOf("ไม่มีสิทธิ์") !== -1
    ) {
        clearSession();
        showLoginScreen();
    }
}

/* =========================================================
   7. LOADING
   ========================================================= */

function showLoading(message) {
    const overlay = byId("loadingOverlay");

    if (!overlay) {
        return;
    }

    const text = $(".loading-text", overlay);

    if (text) {
        text.textContent =
            message || "กำลังดำเนินการ...";
    }

    overlay.classList.add("show");
}

function hideLoading() {
    const overlay = byId("loadingOverlay");

    if (!overlay) {
        return;
    }

    overlay.classList.remove("show");
}

/* =========================================================
   8. TOAST
   ========================================================= */

function showToast(title, message, type) {
    let container = byId("toastContainer");

    if (!container) {
        container = createElement(
            "div",
            "toast-container"
        );

        container.id = "toastContainer";

        document.body.appendChild(container);
    }

    const toast = createElement(
        "div",
        "toast toast-" + (type || "info")
    );

    const icon = createElement(
        "div",
        "toast-icon"
    );

    const content = createElement(
        "div",
        "toast-content"
    );

    const titleElement = createElement(
        "div",
        "toast-title",
        title || "แจ้งเตือน"
    );

    const messageElement = createElement(
        "div",
        "toast-message",
        message || ""
    );

    const close = createElement(
        "button",
        "toast-close",
        "×"
    );

    close.type = "button";

    if (type === "success") {
        icon.textContent = "✓";
    } else if (type === "error") {
        icon.textContent = "!";
    } else if (type === "warning") {
        icon.textContent = "!";
    } else {
        icon.textContent = "i";
    }

    close.addEventListener(
        "click",
        function () {
            toast.remove();
        }
    );

    content.appendChild(titleElement);
    content.appendChild(messageElement);

    toast.appendChild(icon);
    toast.appendChild(content);
    toast.appendChild(close);

    container.appendChild(toast);

    setTimeout(function () {
        if (toast.parentNode) {
            toast.remove();
        }
    }, 5000);
}

/* =========================================================
   9. FORMATTERS
   ========================================================= */

function toNumber(value) {
    if (typeof value === "number") {
        return Number.isFinite(value)
            ? value
            : 0;
    }

    if (value === null || value === undefined) {
        return 0;
    }

    const cleaned = String(value)
        .replace(/,/g, "")
        .replace(/[^\d.-]/g, "");

    const number = Number(cleaned);

    return Number.isFinite(number)
        ? number
        : 0;
}

function formatMoney(value) {
    const number = toNumber(value);

    return new Intl.NumberFormat(
        APP_CONFIG.LOCALE,
        {
            minimumFractionDigits:
                APP_CONFIG.DECIMAL_DIGITS,
            maximumFractionDigits:
                APP_CONFIG.DECIMAL_DIGITS
        }
    ).format(number);
}

function formatMoneyShort(value) {
    const number = toNumber(value);

    if (Math.abs(number) >= 1000000000) {
        return (
            (number / 1000000000).toFixed(2) +
            " พันล้าน"
        );
    }

    if (Math.abs(number) >= 1000000) {
        return (
            (number / 1000000).toFixed(2) +
            " ล้าน"
        );
    }

    if (Math.abs(number) >= 1000) {
        return (
            (number / 1000).toFixed(1) +
            " พัน"
        );
    }

    return formatMoney(number);
}

function formatCurrency(value) {
    return formatMoney(value) + " บาท";
}

function formatDate(value) {
    if (!value) {
        return "-";
    }

    const date = parseDate(value);

    if (!date) {
        return String(value);
    }

    return new Intl.DateTimeFormat(
        APP_CONFIG.DATE_LOCALE,
        {
            day: "2-digit",
            month: "2-digit",
            year: "numeric"
        }
    ).format(date);
}

function formatDateTime(value) {
    if (!value) {
        return "-";
    }

    const date = parseDate(value);

    if (!date) {
        return String(value);
    }

    return new Intl.DateTimeFormat(
        APP_CONFIG.DATE_LOCALE,
        {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        }
    ).format(date);
}

function formatDateInput(value) {
    if (!value) {
        return "";
    }

    const date = parseDate(value);

    if (!date) {
        return "";
    }

    const year = date.getFullYear();
    const month =
        String(date.getMonth() + 1).padStart(2, "0");
    const day =
        String(date.getDate()).padStart(2, "0");

    return year + "-" + month + "-" + day;
}

function parseDate(value) {
    if (!value) {
        return null;
    }

    if (value instanceof Date) {
        return value;
    }

    const text = String(value).trim();

    if (!text) {
        return null;
    }

    let date;

    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
        date = new Date(text + "T00:00:00");
    } else {
        date = new Date(text);
    }

    if (Number.isNaN(date.getTime())) {
        return null;
    }

    return date;
}

function getTodayString() {
    const date = new Date();

    const year = date.getFullYear();
    const month =
        String(date.getMonth() + 1).padStart(2, "0");
    const day =
        String(date.getDate()).padStart(2, "0");

    return year + "-" + month + "-" + day;
}

function getFirstDayOfMonth() {
    const date = new Date();

    const year = date.getFullYear();
    const month =
        String(date.getMonth() + 1).padStart(2, "0");

    return year + "-" + month + "-01";
}

function getCurrentYear() {
    return new Date().getFullYear();
}

function escapeHTML(value) {
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
    return escapeHTML(value);
}

/* =========================================================
   10. DATA HELPERS
   ========================================================= */

function getItemById(items, id) {
    if (!Array.isArray(items)) {
        return null;
    }

    return (
        items.find(function (item) {
            return String(item.id) === String(id);
        }) || null
    );
}

function getAccountName(id) {
    const item = getItemById(
        AppState.accounts,
        id
    );

    return item
        ? item.name
        : "-";
}

function getCategoryName(id) {
    const item = getItemById(
        AppState.categories,
        id
    );

    return item
        ? item.name
        : "-";
}

function getCustomerName(id) {
    const item = getItemById(
        AppState.customers,
        id
    );

    return item
        ? item.name
        : "-";
}

function getVendorName(id) {
    const item = getItemById(
        AppState.vendors,
        id
    );

    return item
        ? item.name
        : "-";
}

function getDocumentTypeName(type) {
    const types = {
        QUOTATION: "ใบเสนอราคา",
        INVOICE: "ใบแจ้งหนี้",
        BILLING: "ใบวางบิล",
        RECEIPT: "ใบเสร็จรับเงิน",
        PAYMENT_RECEIPT: "ใบรับเงิน",
        RECEIVING_VOUCHER: "ใบสำคัญรับ",
        PAYMENT_VOUCHER: "ใบสำคัญจ่าย",
        PAYMENT_CERTIFICATE: "หนังสือรับรองการจ่ายเงิน",
        OTHER: "อื่น ๆ"
    };

    return (
        types[type] ||
        type ||
        "-"
    );
}

function getRoleName(role) {
    const roles = {
        admin: "ผู้ดูแลระบบ",
        manager: "ผู้จัดการ",
        staff: "เจ้าหน้าที่",
        user: "ผู้ใช้งาน"
    };

    return roles[role] || role || "-";
}

function getStatusName(status) {
    const statuses = {
        ACTIVE: "ใช้งาน",
        INACTIVE: "ไม่ใช้งาน",
        DRAFT: "ร่าง",
        ISSUED: "ออกเอกสารแล้ว",
        PAID: "ชำระแล้ว",
        CANCELLED: "ยกเลิก",
        OVERDUE: "เกินกำหนด"
    };

    return statuses[status] || status || "-";
}

/* =========================================================
   11. AUTHORIZATION
   ========================================================= */

function isLoggedIn() {
    return (
        Boolean(AppState.authenticated) &&
        Boolean(AppState.token) &&
        Boolean(AppState.user)
    );
}

function isAdmin() {
    return (
        AppState.user &&
        String(AppState.user.role).toLowerCase() === "admin"
    );
}

function isManager() {
    if (!AppState.user) {
        return false;
    }

    const role =
        String(AppState.user.role).toLowerCase();

    return role === "admin" || role === "manager";
}

function canManageUsers() {
    return isAdmin();
}

function canManageSettings() {
    return isAdmin();
}

function canDelete() {
    return isAdmin() || isManager();
}

/* =========================================================
   12. LOGIN SCREEN
   ========================================================= */

function showLoginScreen() {
    const loginPage = byId("loginPage");
    const appLayout = byId("appLayout");

    if (loginPage) {
        showElement(loginPage);
    }

    if (appLayout) {
        hideElement(appLayout);
    }

    document.body.classList.remove(
        "mobile-sidebar-open"
    );
}

function showApplication() {
    const loginPage = byId("loginPage");
    const appLayout = byId("appLayout");

    if (loginPage) {
        hideElement(loginPage);
    }

    if (appLayout) {
        showElement(appLayout);
    }

    updateUserUI();
    updateConnectionStatus("online");
}

function updateUserUI() {
    if (!AppState.user) {
        return;
    }

    const fullName =
        AppState.user.fullName ||
        AppState.user.username ||
        "ผู้ใช้งาน";

    const role =
        getRoleName(AppState.user.role);

    setText(
        byId("currentUserName"),
        fullName
    );

    setText(
        byId("currentUserRole"),
        role
    );

    setText(
        byId("sidebarUserName"),
        fullName
    );

    setText(
        byId("sidebarUserRole"),
        role
    );

    const avatarLetters =
        getAvatarLetters(fullName);

    setText(
        byId("currentUserAvatar"),
        avatarLetters
    );

    setText(
        byId("sidebarUserAvatar"),
        avatarLetters
    );

    $$(".admin-only").forEach(function (element) {
        toggleElement(
            element,
            isAdmin()
        );
    });

    $$(".manager-only").forEach(function (element) {
        toggleElement(
            element,
            isManager()
        );
    });
}

function getAvatarLetters(name) {
    const text =
        String(name || "").trim();

    if (!text) {
        return "?";
    }

    const parts = text.split(/\s+/);

    if (parts.length === 1) {
        return parts[0].substring(0, 2);
    }

    return (
        parts[0].substring(0, 1) +
        parts[parts.length - 1].substring(0, 1)
    );
}

/* =========================================================
   13. LOGIN
   ========================================================= */

async function login(username, password) {
    if (!username) {
        showToast(
            "เข้าสู่ระบบ",
            "กรุณากรอกชื่อผู้ใช้งาน",
            "warning"
        );
        return false;
    }

    if (!password) {
        showToast(
            "เข้าสู่ระบบ",
            "กรุณากรอกรหัสผ่าน",
            "warning"
        );
        return false;
    }

    showLoading("กำลังเข้าสู่ระบบ...");

    try {
        const result = await apiRequest(
            "login",
            {
                username: username,
                password: password
            }
        );

        const data = result.data || {};

        AppState.token =
            data.token ||
            "";

        AppState.user =
            data.user ||
            null;

        AppState.authenticated =
            Boolean(AppState.token);

        saveSession(
            AppState.token,
            AppState.user
        );

        showApplication();

        await initializeAfterLogin();

        showToast(
            "เข้าสู่ระบบสำเร็จ",
            "ยินดีต้อนรับ " +
                (
                    AppState.user.fullName ||
                    AppState.user.username
                ),
            "success"
        );

        return true;
    } catch (error) {
        handleApiError(error);
        return false;
    } finally {
        hideLoading();
    }
}

async function logout() {
    if (!AppState.token) {
        clearSession();
        showLoginScreen();
        return;
    }

    showLoading("กำลังออกจากระบบ...");

    try {
        await apiRequest(
            "logout",
            {
                token: AppState.token
            }
        );
    } catch (error) {
        console.warn(
            "Logout request failed:",
            error
        );
    } finally {
        clearSession();
        hideLoading();
        showLoginScreen();

        showToast(
            "ออกจากระบบ",
            "ออกจากระบบเรียบร้อยแล้ว",
            "success"
        );
    }
}

async function checkExistingSession() {
    const session = loadSession();

    if (!session.token) {
        showLoginScreen();
        return false;
    }

    AppState.token =
        session.token;

    AppState.user =
        session.user;

    showLoading("กำลังตรวจสอบเซสชัน...");

    try {
        const result = await apiRequest(
            "me",
            {
                token: AppState.token
            }
        );

        AppState.user =
            result.data &&
            result.data.user
                ? result.data.user
                : AppState.user;

        AppState.authenticated = true;

        saveSession(
            AppState.token,
            AppState.user
        );

        showApplication();

        await initializeAfterLogin();

        return true;
    } catch (error) {
        console.warn(
            "Session invalid:",
            error
        );

        clearSession();
        showLoginScreen();

        return false;
    } finally {
        hideLoading();
    }
}

/* =========================================================
   14. INITIALIZATION
   ========================================================= */

async function initializeApp() {
    if (AppState.initialized) {
        return;
    }

    AppState.initialized = true;

    bindGlobalEvents();
    initializeDateFields();

    await checkExistingSession();

    setInterval(
        sessionHeartbeat,
        APP_CONFIG.SESSION_CHECK_INTERVAL
    );
}

async function initializeAfterLogin() {
    try {
        showLoading(
            "กำลังโหลดข้อมูลระบบ..."
        );

        await loadBootstrap();

        await navigateTo(
            AppState.currentPage || "dashboard"
        );
    } catch (error) {
        handleApiError(error);
    } finally {
        hideLoading();
    }
}

async function loadBootstrap() {
    const result =
        await apiRequest(
            "bootstrap",
            {}
        );

    AppState.bootstrap =
        result.data || {};

    const data =
        AppState.bootstrap;

    AppState.settings =
        data.settings || {};

    AppState.accounts =
        data.accounts || [];

    AppState.categories =
        data.categories || [];

    AppState.customers =
        data.customers || [];

    AppState.vendors =
        data.vendors || [];

    AppState.users =
        data.users || [];

    updateBusinessUI();
}

async function sessionHeartbeat() {
    if (!isLoggedIn()) {
        return;
    }

    try {
        const result =
            await apiRequest(
                "me",
                {
                    token: AppState.token
                }
            );

        if (
            result.data &&
            result.data.user
        ) {
            AppState.user =
                result.data.user;

            saveSession(
                AppState.token,
                AppState.user
            );

            updateUserUI();
        }
    } catch (error) {
        console.warn(
            "Session heartbeat failed:",
            error
        );
    }
}

/* =========================================================
   15. BUSINESS UI
   ========================================================= */

function updateBusinessUI() {
    const businessName =
        AppState.settings.business_name ||
        AppState.settings.company_name ||
        "ระบบบริหารการเงิน";

    const businessDescription =
        AppState.settings.business_description ||
        AppState.settings.company_description ||
        "ระบบจัดการรายรับ รายจ่าย และเอกสาร";

    setText(
        byId("businessName"),
        businessName
    );

    setText(
        byId("businessDescription"),
        businessDescription
    );

    setText(
        byId("sidebarBrandTitle"),
        businessName
    );

    setText(
        byId("sidebarBrandSubtitle"),
        businessDescription
    );

    setText(
        byId("loginAppTitle"),
        businessName
    );

    setText(
        byId("loginAppSubtitle"),
        businessDescription
    );
}

/* =========================================================
   16. NAVIGATION
   ========================================================= */

const PAGE_TITLES = {
    dashboard: {
        title: "Dashboard",
        subtitle: "ภาพรวมระบบการเงิน"
    },

    incomes: {
        title: "รายรับ",
        subtitle: "จัดการรายการรายรับ"
    },

    expenses: {
        title: "รายจ่าย",
        subtitle: "จัดการรายการรายจ่าย"
    },

    transfers: {
        title: "โอนเงินระหว่างบัญชี",
        subtitle: "จัดการการโอนเงิน"
    },

    accounts: {
        title: "เงินสด / ธนาคาร",
        subtitle: "จัดการบัญชีการเงิน"
    },

    customers: {
        title: "ลูกค้า",
        subtitle: "จัดการข้อมูลลูกค้า"
    },

    vendors: {
        title: "ผู้จำหน่าย / เจ้าหนี้",
        subtitle: "จัดการข้อมูลผู้จำหน่ายและเจ้าหนี้"
    },

    documents: {
        title: "ทะเบียนเอกสาร",
        subtitle: "จัดการเอกสารทางการเงิน"
    },

    users: {
        title: "ผู้ใช้งานและสิทธิ์",
        subtitle: "จัดการผู้ใช้งานระบบ"
    },

    settings: {
        title: "ตั้งค่ากิจการ",
        subtitle: "กำหนดข้อมูลกิจการและระบบ"
    },

    auditLogs: {
        title: "Audit Log",
        subtitle: "ประวัติการใช้งานระบบ"
    },

    report: {
        title: "รายงาน",
        subtitle: "รายงานข้อมูลทางการเงิน"
    }
};

async function navigateTo(page) {
    if (!isLoggedIn()) {
        showLoginScreen();
        return;
    }

    const targetPage =
        PAGE_TITLES[page]
            ? page
            : "dashboard";

    AppState.currentPage =
        targetPage;

    updatePageTitle(
        targetPage
    );

    updateActiveNavigation(
        targetPage
    );

    closeMobileSidebar();

    const pageContainer =
        byId("pageContent");

    if (!pageContainer) {
        return;
    }

    showLoading(
        "กำลังโหลดข้อมูล..."
    );

    try {
        switch (targetPage) {
            case "dashboard":
                await renderDashboard(
                    pageContainer
                );
                break;

            case "incomes":
                await renderIncomes(
                    pageContainer
                );
                break;

            case "expenses":
                await renderExpenses(
                    pageContainer
                );
                break;

            case "transfers":
                await renderTransfers(
                    pageContainer
                );
                break;

            case "accounts":
                await renderAccounts(
                    pageContainer
                );
                break;

            case "customers":
                await renderCustomers(
                    pageContainer
                );
                break;

            case "vendors":
                await renderVendors(
                    pageContainer
                );
                break;

            case "documents":
                await renderDocuments(
                    pageContainer
                );
                break;

            case "users":
                await renderUsers(
                    pageContainer
                );
                break;

            case "settings":
                await renderSettings(
                    pageContainer
                );
                break;

            case "auditLogs":
                await renderAuditLogs(
                    pageContainer
                );
                break;

            case "report":
                await renderReport(
                    pageContainer
                );
                break;

            default:
                await renderDashboard(
                    pageContainer
                );
        }
    } catch (error) {
        handleApiError(error);

        setHTML(
            pageContainer,
            `
            <div class="card">
                <div class="card-body">
                    <div class="empty-state">
                        <div class="error-icon">!</div>
                        <div class="empty-state-title">
                            ไม่สามารถโหลดข้อมูลได้
                        </div>
                        <div class="empty-state-description">
                            ${escapeHTML(
                                getErrorMessage(error)
                            )}
                        </div>
                    </div>
                </div>
            </div>
            `
        );
    } finally {
        hideLoading();
    }
}

function updatePageTitle(page) {
    const config =
        PAGE_TITLES[page] ||
        PAGE_TITLES.dashboard;

    setText(
        byId("pageTitle"),
        config.title
    );

    setText(
        byId("pageSubtitle"),
        config.subtitle
    );
}

function updateActiveNavigation(page) {
    $$(".sidebar-link").forEach(
        function (link) {
            const target =
                link.getAttribute(
                    "data-page"
                );

            link.classList.toggle(
                "active",
                target === page
            );
        }
    );
}

/* =========================================================
   17. DASHBOARD
   ========================================================= */

async function renderDashboard(container) {
    const startDate =
        getFirstDayOfMonth();

    const endDate =
        getTodayString();

    const result =
        await apiRequest(
            "dashboard",
            {
                startDate: startDate,
                endDate: endDate
            }
        );

    AppState.dashboard =
        result.data || {};

    const data =
        AppState.dashboard;

    const income =
        toNumber(
            data.totalIncome ||
            data.income ||
            0
        );

    const expense =
        toNumber(
            data.totalExpense ||
            data.expense ||
            0
        );

    const balance =
        toNumber(
            data.net ||
            data.balance ||
            income - expense
        );

    const cash =
        toNumber(
            data.cashBalance ||
            data.cash ||
            0
        );

    const bank =
        toNumber(
            data.bankBalance ||
            data.bank ||
            0
        );

    const recent =
        data.recentTransactions ||
        data.recent ||
        [];

    setHTML(
        container,
        `
        <div class="content-header">
            <div class="content-header-left">
                <div class="section-title">
                    ภาพรวมการเงิน
                </div>
                <div class="section-description">
                    ประจำเดือน ${formatDate(startDate)} - ${formatDate(endDate)}
                </div>
            </div>

            <div class="content-header-right">
                <button
                    type="button"
                    class="btn btn-outline-primary"
                    data-action="refresh-dashboard"
                >
                    ↻ รีเฟรช
                </button>

                <button
                    type="button"
                    class="btn btn-primary"
                    data-action="new-income"
                >
                    ＋ บันทึกรายรับ
                </button>

                <button
                    type="button"
                    class="btn btn-danger"
                    data-action="new-expense"
                >
                    ＋ บันทึกรายจ่าย
                </button>
            </div>
        </div>

        <div class="dashboard-grid">

            <div class="card dashboard-stat-card income">
                <div class="dashboard-stat-top">
                    <div>
                        <div class="dashboard-stat-label">
                            รายรับเดือนนี้
                        </div>

                        <div class="dashboard-stat-value amount-income">
                            ${formatMoney(income)}
                        </div>
                    </div>

                    <div class="dashboard-stat-icon">
                        ↑
                    </div>
                </div>

                <div class="dashboard-stat-bottom">
                    รายรับทั้งหมดในช่วงที่เลือก
                </div>
            </div>

            <div class="card dashboard-stat-card expense">
                <div class="dashboard-stat-top">
                    <div>
                        <div class="dashboard-stat-label">
                            รายจ่ายเดือนนี้
                        </div>

                        <div class="dashboard-stat-value amount-expense">
                            ${formatMoney(expense)}
                        </div>
                    </div>

                    <div class="dashboard-stat-icon">
                        ↓
                    </div>
                </div>

                <div class="dashboard-stat-bottom">
                    รายจ่ายทั้งหมดในช่วงที่เลือก
                </div>
            </div>

            <div class="card dashboard-stat-card balance">
                <div class="dashboard-stat-top">
                    <div>
                        <div class="dashboard-stat-label">
                            เงินคงเหลือสุทธิ
                        </div>

                        <div class="dashboard-stat-value ${balance >= 0 ? "amount-positive" : "amount-negative"}">
                            ${formatMoney(balance)}
                        </div>
                    </div>

                    <div class="dashboard-stat-icon">
                        ฿
                    </div>
                </div>

                <div class="dashboard-stat-bottom">
                    รายรับหักรายจ่าย
                </div>
            </div>

            <div class="card dashboard-stat-card cash">
                <div class="dashboard-stat-top">
                    <div>
                        <div class="dashboard-stat-label">
                            เงินสด / ธนาคาร
                        </div>

                        <div class="dashboard-stat-value">
                            ${formatMoney(cash + bank)}
                        </div>
                    </div>

                    <div class="dashboard-stat-icon">
                        ▣
                    </div>
                </div>

                <div class="dashboard-stat-bottom">
                    เงินสด ${formatMoney(cash)} / ธนาคาร ${formatMoney(bank)}
                </div>
            </div>

        </div>

        <div class="dashboard-grid-main mt-4">

            <div class="card">
                <div class="card-header">
                    <div>
                        <div class="card-title">
                            รายการล่าสุด
                        </div>

                        <div class="card-subtitle">
                            รายการทางการเงินล่าสุดของระบบ
                        </div>
                    </div>

                    <button
                        type="button"
                        class="btn btn-sm btn-outline-primary"
                        data-action="view-incomes"
                    >
                        ดูทั้งหมด
                    </button>
                </div>

                <div class="card-body">
                    ${renderRecentTransactions(
                        recent
                    )}
                </div>
            </div>

            <div class="card">
                <div class="card-header">
                    <div>
                        <div class="card-title">
                            สรุปบัญชี
                        </div>

                        <div class="card-subtitle">
                            ยอดเงินตามประเภทบัญชี
                        </div>
                    </div>
                </div>

                <div class="card-body">
                    ${renderDashboardAccounts(
                        data.accounts ||
                        data.accountBalances ||
                        []
                    )}
                </div>
            </div>

        </div>

        <div class="card mt-4">
            <div class="card-header">
                <div>
                    <div class="card-title">
                        เมนูด่วน
                    </div>
                    <div class="card-subtitle">
                        ทำรายการที่ใช้บ่อย
                    </div>
                </div>
            </div>

            <div class="card-body">
                <div class="quick-actions">

                    <button
                        type="button"
                        class="quick-action"
                        data-action="new-income"
                    >
                        <span class="quick-action-icon">
                            ↑
                        </span>
                        <span class="quick-action-text">
                            บันทึกรายรับ
                        </span>
                    </button>

                    <button
                        type="button"
                        class="quick-action"
                        data-action="new-expense"
                    >
                        <span class="quick-action-icon">
                            ↓
                        </span>
                        <span class="quick-action-text">
                            บันทึกรายจ่าย
                        </span>
                    </button>

                    <button
                        type="button"
                        class="quick-action"
                        data-action="new-transfer"
                    >
                        <span class="quick-action-icon">
                            ⇄
                        </span>
                        <span class="quick-action-text">
                            โอนเงิน
                        </span>
                    </button>

                    <button
                        type="button"
                        class="quick-action"
                        data-action="new-document"
                    >
                        <span class="quick-action-icon">
                            ▤
                        </span>
                        <span class="quick-action-text">
                            สร้างเอกสาร
                        </span>
                    </button>

                </div>
            </div>
        </div>
        `
    );
}

function renderRecentTransactions(items) {
    if (!items || !items.length) {
        return `
            <div class="empty-state">
                <div class="empty-state-icon">
                    ▤
                </div>

                <div class="empty-state-title">
                    ยังไม่มีรายการ
                </div>

                <div class="empty-state-description">
                    เมื่อมีการบันทึกรายรับ รายจ่าย หรือโอนเงิน
                    รายการจะแสดงที่นี่
                </div>
            </div>
        `;
    }

    return `
        <div class="transaction-list">
            ${items
                .slice(0, 10)
                .map(function (item) {
                    const type =
                        String(
                            item.type ||
                            item.transactionType ||
                            ""
                        ).toLowerCase();

                    let typeClass =
                        "transfer";

                    let icon = "⇄";

                    if (
                        type === "income" ||
                        type === "รายรับ"
                    ) {
                        typeClass = "income";
                        icon = "↑";
                    }

                    if (
                        type === "expense" ||
                        type === "รายจ่าย"
                    ) {
                        typeClass = "expense";
                        icon = "↓";
                    }

                    const amount =
                        toNumber(
                            item.amount
                        );

                    const sign =
                        typeClass === "expense"
                            ? "-"
                            : typeClass === "income"
                                ? "+"
                                : "";

                    return `
                        <div class="transaction-item">

                            <div class="transaction-icon ${typeClass}">
                                ${icon}
                            </div>

                            <div class="transaction-info">
                                <div class="transaction-title">
                                    ${escapeHTML(
                                        item.description ||
                                        item.docNo ||
                                        "รายการ"
                                    )}
                                </div>

                                <div class="transaction-meta">
                                    ${formatDate(
                                        item.date
                                    )}
                                    ${item.accountName
                                        ? " • " +
                                          escapeHTML(
                                              item.accountName
                                          )
                                        : ""}
                                </div>
                            </div>

                            <div class="transaction-amount ${typeClass === "income" ? "amount-income" : typeClass === "expense" ? "amount-expense" : "amount-transfer"}">
                                ${sign}${formatMoney(amount)}
                            </div>

                        </div>
                    `;
                })
                .join("")}
        </div>
    `;
}

function renderDashboardAccounts(accounts) {
    if (!accounts || !accounts.length) {
        return `
            <div class="empty-state">
                <div class="empty-state-icon">
                    ฿
                </div>

                <div class="empty-state-title">
                    ยังไม่มีข้อมูลบัญชี
                </div>

                <div class="empty-state-description">
                    เพิ่มบัญชีเงินสดหรือธนาคารเพื่อดูยอดคงเหลือ
                </div>
            </div>
        `;
    }

    return `
        <div class="transaction-list">
            ${accounts
                .slice(0, 10)
                .map(function (account) {
                    return `
                        <div class="transaction-item">

                            <div class="transaction-icon transfer">
                                ฿
                            </div>

                            <div class="transaction-info">
                                <div class="transaction-title">
                                    ${escapeHTML(
                                        account.name ||
                                        "-"
                                    )}
                                </div>

                                <div class="transaction-meta">
                                    ${escapeHTML(
                                        account.code ||
                                        ""
                                    )}
                                </div>
                            </div>

                            <div class="transaction-amount">
                                ${formatMoney(
                                    account.balance ||
                                    account.currentBalance ||
                                    0
                                )}
                            </div>

                        </div>
                    `;
                })
                .join("")}
        </div>
    `;
}

/* =========================================================
   18. INCOME PAGE
   ========================================================= */

async function renderIncomes(container) {
    const result =
        await apiRequest(
            "list",
            {
                entity: "Income",
                page:
                    AppState.pagination.incomes.page,
                pageSize:
                    AppState.pagination.incomes.pageSize,
                filters:
                    AppState.filters.incomes
            }
        );

    const data =
        result.data || {};

    AppState.incomes =
        data.items ||
        data.rows ||
        data ||
        [];

    AppState.pagination.incomes.total =
        toNumber(
            data.total ||
            AppState.incomes.length
        );

    setHTML(
        container,
        `
        <div class="content-header">
            <div class="content-header-left">
                <div class="section-title">
                    รายรับ
                </div>

                <div class="section-description">
                    รายการรายรับทั้งหมด
                </div>
            </div>

            <div class="content-header-right">
                <button
                    type="button"
                    class="btn btn-primary"
                    data-action="new-income"
                >
                    ＋ บันทึกรายรับ
                </button>
            </div>
        </div>

        <div class="filter-bar">

            <div class="filter-item-wide">
                <div class="search-box">
                    <span class="search-box-icon">
                        ⌕
                    </span>

                    <input
                        type="text"
                        class="form-control"
                        id="incomeSearch"
                        placeholder="ค้นหาเลขที่เอกสาร รายละเอียด หรือผู้ติดต่อ"
                        value="${escapeAttribute(
                            AppState.filters.incomes.search ||
                            ""
                        )}"
                    >
                </div>
            </div>

            <div class="filter-item">
                <input
                    type="date"
                    class="form-control"
                    id="incomeStartDate"
                    value="${escapeAttribute(
                        AppState.filters.incomes.startDate ||
                        ""
                    )}"
                >
            </div>

            <div class="filter-item">
                <input
                    type="date"
                    class="form-control"
                    id="incomeEndDate"
                    value="${escapeAttribute(
                        AppState.filters.incomes.endDate ||
                        ""
                    )}"
                >
            </div>

            <div class="filter-item">
                <select
                    class="form-control"
                    id="incomeAccountFilter"
                >
                    <option value="">
                        ทุกบัญชี
                    </option>

                    ${renderAccountOptions(
                        AppState.filters.incomes.accountId ||
                        ""
                    )}
                </select>
            </div>

            <div class="filter-actions">
                <button
                    type="button"
                    class="btn btn-primary"
                    data-action="filter-incomes"
                >
                    ค้นหา
                </button>

                <button
                    type="button"
                    class="btn btn-outline-secondary"
                    data-action="clear-income-filter"
                >
                    ล้าง
                </button>
            </div>

        </div>

        <div class="card">

            <div class="card-header">
                <div>
                    <div class="card-title">
                        ทะเบียนรายรับ
                    </div>

                    <div class="card-subtitle">
                        จำนวน ${formatNumber(
                            AppState.pagination.incomes.total
                        )} รายการ
                    </div>
                </div>
            </div>

            <div class="card-body">

                <div class="table-wrapper">
                    <table class="data-table official-table">

                        <thead>
                            <tr>
                                <th>
                                    วันที่
                                </th>

                                <th>
                                    เลขที่เอกสาร
                                </th>

                                <th>
                                    บัญชี
                                </th>

                                <th>
                                    หมวดหมู่
                                </th>

                                <th>
                                    รายละเอียด
                                </th>

                                <th class="text-right">
                                    จำนวนเงิน
                                </th>

                                <th>
                                    สถานะ
                                </th>

                                <th class="text-center">
                                    จัดการ
                                </th>
                            </tr>
                        </thead>

                        <tbody>
                            ${renderIncomeRows(
                                AppState.incomes
                            )}
                        </tbody>

                    </table>
                </div>

                ${renderPagination(
                    "incomes"
                )}

            </div>
        </div>
        `
    );
}

function renderIncomeRows(items) {
    if (!items.length) {
        return `
            <tr>
                <td
                    colspan="8"
                    class="table-empty"
                >
                    <div class="table-empty-icon">
                        ↑
                    </div>

                    <div class="table-empty-text">
                        ไม่พบรายการรายรับ
                    </div>
                </td>
            </tr>
        `;
    }

    return items
        .map(function (item) {
            return `
                <tr>

                    <td>
                        ${formatDate(
                            item.date
                        )}
                    </td>

                    <td>
                        <strong>
                            ${escapeHTML(
                                item.docNo ||
                                "-"
                            )}
                        </strong>
                    </td>

                    <td>
                        ${escapeHTML(
                            getAccountName(
                                item.accountId
                            )
                        )}
                    </td>

                    <td>
                        ${escapeHTML(
                            getCategoryName(
                                item.categoryId
                            )
                        )}
                    </td>

                    <td>
                        <div>
                            ${escapeHTML(
                                item.description ||
                                "-"
                            )}
                        </div>

                        ${
                            item.counterpartyName
                                ? `
                                    <div class="text-muted">
                                        ${escapeHTML(
                                            item.counterpartyName
                                        )}
                                    </div>
                                `
                                : ""
                        }
                    </td>

                    <td class="text-right amount-income">
                        ${formatMoney(
                            item.amount
                        )}
                    </td>

                    <td>
                        ${renderStatusBadge(
                            item.status
                        )}
                    </td>

                    <td>
                        <div class="actions">

                            <button
                                type="button"
                                class="btn btn-sm btn-outline-primary"
                                data-action="edit-income"
                                data-id="${escapeAttribute(
                                    item.id
                                )}"
                            >
                                แก้ไข
                            </button>

                            ${
                                canDelete()
                                    ? `
                                        <button
                                            type="button"
                                            class="btn btn-sm btn-outline-danger"
                                            data-action="delete-income"
                                            data-id="${escapeAttribute(
                                                item.id
                                            )}"
                                        >
                                            ลบ
                                        </button>
                                    `
                                    : ""
                            }

                        </div>
                    </td>

                </tr>
            `;
        })
        .join("");
}

/* =========================================================
   19. EXPENSE PAGE
   ========================================================= */

async function renderExpenses(container) {
    const result =
        await apiRequest(
            "list",
            {
                entity: "Expense",
                page:
                    AppState.pagination.expenses.page,
                pageSize:
                    AppState.pagination.expenses.pageSize,
                filters:
                    AppState.filters.expenses
            }
        );

    const data =
        result.data || {};

    AppState.expenses =
        data.items ||
        data.rows ||
        data ||
        [];

    AppState.pagination.expenses.total =
        toNumber(
            data.total ||
            AppState.expenses.length
        );

    setHTML(
        container,
        `
        <div class="content-header">
            <div class="content-header-left">
                <div class="section-title">
                    รายจ่าย
                </div>

                <div class="section-description">
                    รายการรายจ่ายทั้งหมด
                </div>
            </div>

            <div class="content-header-right">
                <button
                    type="button"
                    class="btn btn-danger"
                    data-action="new-expense"
                >
                    ＋ บันทึกรายจ่าย
                </button>
            </div>
        </div>

        <div class="filter-bar">

            <div class="filter-item-wide">
                <div class="search-box">
                    <span class="search-box-icon">
                        ⌕
                    </span>

                    <input
                        type="text"
                        class="form-control"
                        id="expenseSearch"
                        placeholder="ค้นหาเลขที่เอกสาร รายละเอียด หรือผู้ติดต่อ"
                        value="${escapeAttribute(
                            AppState.filters.expenses.search ||
                            ""
                        )}"
                    >
                </div>
            </div>

            <div class="filter-item">
                <input
                    type="date"
                    class="form-control"
                    id="expenseStartDate"
                    value="${escapeAttribute(
                        AppState.filters.expenses.startDate ||
                        ""
                    )}"
                >
            </div>

            <div class="filter-item">
                <input
                    type="date"
                    class="form-control"
                    id="expenseEndDate"
                    value="${escapeAttribute(
                        AppState.filters.expenses.endDate ||
                        ""
                    )}"
                >
            </div>

            <div class="filter-item">
                <select
                    class="form-control"
                    id="expenseAccountFilter"
                >
                    <option value="">
                        ทุกบัญชี
                    </option>

                    ${renderAccountOptions(
                        AppState.filters.expenses.accountId ||
                        ""
                    )}
                </select>
            </div>

            <div class="filter-actions">
                <button
                    type="button"
                    class="btn btn-primary"
                    data-action="filter-expenses"
                >
                    ค้นหา
                </button>

                <button
                    type="button"
                    class="btn btn-outline-secondary"
                    data-action="clear-expense-filter"
                >
                    ล้าง
                </button>
            </div>

        </div>

        <div class="card">

            <div class="card-header">
                <div>
                    <div class="card-title">
                        ทะเบียนรายจ่าย
                    </div>

                    <div class="card-subtitle">
                        จำนวน ${formatNumber(
                            AppState.pagination.expenses.total
                        )} รายการ
                    </div>
                </div>
            </div>

            <div class="card-body">

                <div class="table-wrapper">
                    <table class="data-table official-table">

                        <thead>
                            <tr>
                                <th>
                                    วันที่
                                </th>

                                <th>
                                    เลขที่เอกสาร
                                </th>

                                <th>
                                    บัญชี
                                </th>

                                <th>
                                    หมวดหมู่
                                </th>

                                <th>
                                    รายละเอียด
                                </th>

                                <th class="text-right">
                                    จำนวนเงิน
                                </th>

                                <th>
                                    สถานะ
                                </th>

                                <th class="text-center">
                                    จัดการ
                                </th>
                            </tr>
                        </thead>

                        <tbody>
                            ${renderExpenseRows(
                                AppState.expenses
                            )}
                        </tbody>

                    </table>
                </div>

                ${renderPagination(
                    "expenses"
                )}

            </div>
        </div>
        `
    );
}

function renderExpenseRows(items) {
    if (!items.length) {
        return `
            <tr>
                <td
                    colspan="8"
                    class="table-empty"
                >
                    <div class="table-empty-icon">
                        ↓
                    </div>

                    <div class="table-empty-text">
                        ไม่พบรายการรายจ่าย
                    </div>
                </td>
            </tr>
        `;
    }

    return items
        .map(function (item) {
            return `
                <tr>

                    <td>
                        ${formatDate(
                            item.date
                        )}
                    </td>

                    <td>
                        <strong>
                            ${escapeHTML(
                                item.docNo ||
                                "-"
                            )}
                        </strong>
                    </td>

                    <td>
                        ${escapeHTML(
                            getAccountName(
                                item.accountId
                            )
                        )}
                    </td>

                    <td>
                        ${escapeHTML(
                            getCategoryName(
                                item.categoryId
                            )
                        )}
                    </td>

                    <td>
                        <div>
                            ${escapeHTML(
                                item.description ||
                                "-"
                            )}
                        </div>

                        ${
                            item.counterpartyName
                                ? `
                                    <div class="text-muted">
                                        ${escapeHTML(
                                            item.counterpartyName
                                        )}
                                    </div>
                                `
                                : ""
                        }
                    </td>

                    <td class="text-right amount-expense">
                        ${formatMoney(
                            item.amount
                        )}
                    </td>

                    <td>
                        ${renderStatusBadge(
                            item.status
                        )}
                    </td>

                    <td>
                        <div class="actions">

                            <button
                                type="button"
                                class="btn btn-sm btn-outline-primary"
                                data-action="edit-expense"
                                data-id="${escapeAttribute(
                                    item.id
                                )}"
                            >
                                แก้ไข
                            </button>

                            ${
                                canDelete()
                                    ? `
                                        <button
                                            type="button"
                                            class="btn btn-sm btn-outline-danger"
                                            data-action="delete-expense"
                                            data-id="${escapeAttribute(
                                                item.id
                                            )}"
                                        >
                                            ลบ
                                        </button>
                                    `
                                    : ""
                            }

                        </div>
                    </td>

                </tr>
            `;
        })
        .join("");
}

/* =========================================================
   20. TRANSFER PAGE
   ========================================================= */

async function renderTransfers(container) {
    const result =
        await apiRequest(
            "list",
            {
                entity: "Transfers",
                page:
                    AppState.pagination.transfers.page,
                pageSize:
                    AppState.pagination.transfers.pageSize,
                filters:
                    AppState.filters.transfers
            }
        );

    const data =
        result.data || {};

    AppState.transfers =
        data.items ||
        data.rows ||
        data ||
        [];

    AppState.pagination.transfers.total =
        toNumber(
            data.total ||
            AppState.transfers.length
        );

    setHTML(
        container,
        `
        <div class="content-header">
            <div class="content-header-left">
                <div class="section-title">
                    โอนเงินระหว่างบัญชี
                </div>

                <div class="section-description">
                    รายการโอนเงินภายในกิจการ
                </div>
            </div>

            <div class="content-header-right">
                <button
                    type="button"
                    class="btn btn-primary"
                    data-action="new-transfer"
                >
                    ＋ บันทึกการโอน
                </button>
            </div>
        </div>

        <div class="card">

            <div class="card-header">
                <div>
                    <div class="card-title">
                        ทะเบียนการโอนเงิน
                    </div>

                    <div class="card-subtitle">
                        จำนวน ${formatNumber(
                            AppState.pagination.transfers.total
                        )} รายการ
                    </div>
                </div>
            </div>

            <div class="card-body">

                <div class="table-wrapper">
                    <table class="data-table official-table">

                        <thead>
                            <tr>
                                <th>
                                    วันที่
                                </th>

                                <th>
                                    เลขที่เอกสาร
                                </th>

                                <th>
                                    จากบัญชี
                                </th>

                                <th>
                                    ไปบัญชี
                                </th>

                                <th>
                                    รายละเอียด
                                </th>

                                <th class="text-right">
                                    จำนวนเงิน
                                </th>

                                <th>
                                    สถานะ
                                </th>

                                <th class="text-center">
                                    จัดการ
                                </th>
                            </tr>
                        </thead>

                        <tbody>
                            ${renderTransferRows(
                                AppState.transfers
                            )}
                        </tbody>

                    </table>
                </div>

                ${renderPagination(
                    "transfers"
                )}

            </div>
        </div>
        `
    );
}

function renderTransferRows(items) {
    if (!items.length) {
        return `
            <tr>
                <td
                    colspan="8"
                    class="table-empty"
                >
                    <div class="table-empty-icon">
                        ⇄
                    </div>

                    <div class="table-empty-text">
                        ไม่พบรายการโอนเงิน
                    </div>
                </td>
            </tr>
        `;
    }

    return items
        .map(function (item) {
            return `
                <tr>

                    <td>
                        ${formatDate(
                            item.date
                        )}
                    </td>

                    <td>
                        <strong>
                            ${escapeHTML(
                                item.docNo ||
                                "-"
                            )}
                        </strong>
                    </td>

                    <td>
                        ${escapeHTML(
                            getAccountName(
                                item.fromAccountId
                            )
                        )}
                    </td>

                    <td>
                        ${escapeHTML(
                            getAccountName(
                                item.toAccountId
                            )
                        )}
                    </td>

                    <td>
                        ${escapeHTML(
                            item.description ||
                            "-"
                        )}
                    </td>

                    <td class="text-right amount-transfer">
                        ${formatMoney(
                            item.amount
                        )}
                    </td>

                    <td>
                        ${renderStatusBadge(
                            item.status
                        )}
                    </td>

                    <td>
                        <div class="actions">

                            <button
                                type="button"
                                class="btn btn-sm btn-outline-primary"
                                data-action="edit-transfer"
                                data-id="${escapeAttribute(
                                    item.id
                                )}"
                            >
                                แก้ไข
                            </button>

                            ${
                                canDelete()
                                    ? `
                                        <button
                                            type="button"
                                            class="btn btn-sm btn-outline-danger"
                                            data-action="delete-transfer"
                                            data-id="${escapeAttribute(
                                                item.id
                                            )}"
                                        >
                                            ลบ
                                        </button>
                                    `
                                    : ""
                            }

                        </div>
                    </td>

                </tr>
            `;
        })
        .join("");
}

/* =========================================================
   21. ACCOUNTS PAGE
   ========================================================= */

async function renderAccounts(container) {
    const result =
        await apiRequest(
            "list",
            {
                entity: "Accounts",
                page:
                    AppState.pagination.accounts.page,
                pageSize:
                    AppState.pagination.accounts.pageSize,
                filters:
                    AppState.filters.accounts
            }
        );

    const data =
        result.data || {};

    AppState.accounts =
        data.items ||
        data.rows ||
        data ||
        [];

    AppState.pagination.accounts.total =
        toNumber(
            data.total ||
            AppState.accounts.length
        );

    setHTML(
        container,
        `
        <div class="content-header">

            <div class="content-header-left">
                <div class="section-title">
                    เงินสด / ธนาคาร
                </div>

                <div class="section-description">
                    บัญชีที่ใช้รับและจ่ายเงิน
                </div>
            </div>

            <div class="content-header-right">
                <button
                    type="button"
                    class="btn btn-primary"
                    data-action="new-account"
                >
                    ＋ เพิ่มบัญชี
                </button>
            </div>

        </div>

        <div class="account-grid">
            ${renderAccountCards(
                AppState.accounts
            )}
        </div>

        <div class="card mt-4">

            <div class="card-header">
                <div>
                    <div class="card-title">
                        รายการบัญชี
                    </div>

                    <div class="card-subtitle">
                        จำนวน ${formatNumber(
                            AppState.pagination.accounts.total
                        )} บัญชี
                    </div>
                </div>
            </div>

            <div class="card-body">

                <div class="table-wrapper">
                    <table class="data-table">

                        <thead>
                            <tr>
                                <th>
                                    รหัสบัญชี
                                </th>

                                <th>
                                    ชื่อบัญชี
                                </th>

                                <th>
                                    ประเภท
                                </th>

                                <th class="text-right">
                                    ยอดยกมา
                                </th>

                                <th>
                                    สถานะ
                                </th>

                                <th class="text-center">
                                    จัดการ
                                </th>
                            </tr>
                        </thead>

                        <tbody>
                            ${renderAccountRows(
                                AppState.accounts
                            )}
                        </tbody>

                    </table>
                </div>

                ${renderPagination(
                    "accounts"
                )}

            </div>
        </div>
        `
    );
}

function renderAccountCards(accounts) {
    if (!accounts.length) {
        return "";
    }

    return accounts
        .map(function (account) {
            const type =
                String(
                    account.type ||
                    "OTHER"
                ).toLowerCase();

            return `
                <div class="account-card">

                    <div class="account-card-header">

                        <div>
                            <div class="account-code">
                                ${escapeHTML(
                                    account.code ||
                                    "-"
                                )}
                            </div>

                            <div class="account-name">
                                ${escapeHTML(
                                    account.name ||
                                    "-"
                                )}
                            </div>

                            <div class="account-type">
                                ${getAccountTypeName(
                                    account.type
                                )}
                            </div>
                        </div>

                        <span class="badge account-type-${escapeAttribute(
                            type
                        )}">
                            ${getAccountTypeName(
                                account.type
                            )}
                        </span>

                    </div>

                    <div class="account-balance">
                        ${formatMoney(
                            account.balance ||
                            account.currentBalance ||
                            account.openingBalance ||
                            0
                        )}
                    </div>

                    <div class="account-footer">

                        <span>
                            ยอดคงเหลือ
                        </span>

                        <span>
                            ${account.active === false
                                ? "ปิดใช้งาน"
                                : "ใช้งาน"}
                        </span>

                    </div>

                </div>
            `;
        })
        .join("");
}

function getAccountTypeName(type) {
    const types = {
        CASH: "เงินสด",
        BANK: "ธนาคาร",
        WALLET: "กระเป๋าเงิน",
        OTHER: "อื่น ๆ"
    };

    return (
        types[type] ||
        type ||
        "อื่น ๆ"
    );
}

function renderAccountRows(items) {
    if (!items.length) {
        return `
            <tr>
                <td
                    colspan="6"
                    class="table-empty"
                >
                    ไม่พบข้อมูลบัญชี
                </td>
            </tr>
        `;
    }

    return items
        .map(function (item) {
            return `
                <tr>

                    <td>
                        ${escapeHTML(
                            item.code ||
                            "-"
                        )}
                    </td>

                    <td>
                        <strong>
                            ${escapeHTML(
                                item.name ||
                                "-"
                            )}
                        </strong>
                    </td>

                    <td>
                        ${escapeHTML(
                            getAccountTypeName(
                                item.type
                            )
                        )}
                    </td>

                    <td class="text-right">
                        ${formatMoney(
                            item.openingBalance ||
                            0
                        )}
                    </td>

                    <td>
                        ${item.active === false
                            ? `
                                <span class="badge badge-secondary">
                                    ปิดใช้งาน
                                </span>
                            `
                            : `
                                <span class="badge badge-success">
                                    ใช้งาน
                                </span>
                            `}
                    </td>

                    <td>
                        <div class="actions">

                            <button
                                type="button"
                                class="btn btn-sm btn-outline-primary"
                                data-action="edit-account"
                                data-id="${escapeAttribute(
                                    item.id
                                )}"
                            >
                                แก้ไข
                            </button>

                            ${
                                canDelete()
                                    ? `
                                        <button
                                            type="button"
                                            class="btn btn-sm btn-outline-danger"
                                            data-action="delete-account"
                                            data-id="${escapeAttribute(
                                                item.id
                                            )}"
                                        >
                                            ลบ
                                        </button>
                                    `
                                    : ""
                            }

                        </div>
                    </td>

                </tr>
            `;
        })
        .join("");
}

/* =========================================================
   22. CUSTOMER PAGE
   ========================================================= */

async function renderCustomers(container) {
    const result =
        await apiRequest(
            "list",
            {
                entity: "Customers",
                page:
                    AppState.pagination.customers.page,
                pageSize:
                    AppState.pagination.customers.pageSize,
                filters:
                    AppState.filters.customers
            }
        );

    const data =
        result.data || {};

    AppState.customers =
        data.items ||
        data.rows ||
        data ||
        [];

    AppState.pagination.customers.total =
        toNumber(
            data.total ||
            AppState.customers.length
        );

    setHTML(
        container,
        `
        <div class="content-header">

            <div class="content-header-left">
                <div class="section-title">
                    ลูกค้า
                </div>

                <div class="section-description">
                    ข้อมูลลูกค้าและผู้ติดต่อ
                </div>
            </div>

            <div class="content-header-right">
                <button
                    type="button"
                    class="btn btn-primary"
                    data-action="new-customer"
                >
                    ＋ เพิ่มลูกค้า
                </button>
            </div>

        </div>

        <div class="filter-bar">

            <div class="filter-item-wide">
                <div class="search-box">

                    <span class="search-box-icon">
                        ⌕
                    </span>

                    <input
                        type="text"
                        class="form-control"
                        id="customerSearch"
                        placeholder="ค้นหาชื่อลูกค้า รหัส เลขประจำตัวผู้เสียภาษี โทรศัพท์"
                        value="${escapeAttribute(
                            AppState.filters.customers.search ||
                            ""
                        )}"
                    >

                </div>
            </div>

            <div class="filter-actions">

                <button
                    type="button"
                    class="btn btn-primary"
                    data-action="filter-customers"
                >
                    ค้นหา
                </button>

                <button
                    type="button"
                    class="btn btn-outline-secondary"
                    data-action="clear-customer-filter"
                >
                    ล้าง
                </button>

            </div>

        </div>

        <div class="card">

            <div class="card-header">

                <div>
                    <div class="card-title">
                        ทะเบียนลูกค้า
                    </div>

                    <div class="card-subtitle">
                        จำนวน ${formatNumber(
                            AppState.pagination.customers.total
                        )} รายการ
                    </div>
                </div>

            </div>

            <div class="card-body">

                <div class="table-wrapper">
                    <table class="data-table">

                        <thead>
                            <tr>
                                <th>
                                    รหัส
                                </th>

                                <th>
                                    ชื่อลูกค้า
                                </th>

                                <th>
                                    เลขประจำตัวผู้เสียภาษี
                                </th>

                                <th>
                                    ผู้ติดต่อ
                                </th>

                                <th>
                                    โทรศัพท์
                                </th>

                                <th>
                                    อีเมล
                                </th>

                                <th>
                                    สถานะ
                                </th>

                                <th class="text-center">
                                    จัดการ
                                </th>
                            </tr>
                        </thead>

                        <tbody>
                            ${renderPartyRows(
                                AppState.customers,
                                "customer"
                            )}
                        </tbody>

                    </table>
                </div>

                ${renderPagination(
                    "customers"
                )}

            </div>
        </div>
        `
    );
}

/* =========================================================
   23. VENDOR PAGE
   ========================================================= */

async function renderVendors(container) {
    const result =
        await apiRequest(
            "list",
            {
                entity: "Vendors",
                page:
                    AppState.pagination.vendors.page,
                pageSize:
                    AppState.pagination.vendors.pageSize,
                filters:
                    AppState.filters.vendors
            }
        );

    const data =
        result.data || {};

    AppState.vendors =
        data.items ||
        data.rows ||
        data ||
        [];

    AppState.pagination.vendors.total =
        toNumber(
            data.total ||
            AppState.vendors.length
        );

    setHTML(
        container,
        `
        <div class="content-header">

            <div class="content-header-left">
                <div class="section-title">
                    ผู้จำหน่าย / เจ้าหนี้
                </div>

                <div class="section-description">
                    ข้อมูลผู้จำหน่ายและเจ้าหนี้
                </div>
            </div>

            <div class="content-header-right">

                <button
                    type="button"
                    class="btn btn-primary"
                    data-action="new-vendor"
                >
                    ＋ เพิ่มผู้จำหน่าย
                </button>

            </div>

        </div>

        <div class="filter-bar">

            <div class="filter-item-wide">
                <div class="search-box">

                    <span class="search-box-icon">
                        ⌕
                    </span>

                    <input
                        type="text"
                        class="form-control"
                        id="vendorSearch"
                        placeholder="ค้นหาชื่อผู้จำหน่าย รหัส เลขประจำตัวผู้เสียภาษี โทรศัพท์"
                        value="${escapeAttribute(
                            AppState.filters.vendors.search ||
                            ""
                        )}"
                    >

                </div>
            </div>

            <div class="filter-actions">

                <button
                    type="button"
                    class="btn btn-primary"
                    data-action="filter-vendors"
                >
                    ค้นหา
                </button>

                <button
                    type="button"
                    class="btn btn-outline-secondary"
                    data-action="clear-vendor-filter"
                >
                    ล้าง
                </button>

            </div>

        </div>

        <div class="card">

            <div class="card-header">

                <div>
                    <div class="card-title">
                        ทะเบียนผู้จำหน่าย / เจ้าหนี้
                    </div>

                    <div class="card-subtitle">
                        จำนวน ${formatNumber(
                            AppState.pagination.vendors.total
                        )} รายการ
                    </div>
                </div>

            </div>

            <div class="card-body">

                <div class="table-wrapper">

                    <table class="data-table">

                        <thead>
                            <tr>
                                <th>
                                    รหัส
                                </th>

                                <th>
                                    ชื่อผู้จำหน่าย
                                </th>

                                <th>
                                    เลขประจำตัวผู้เสียภาษี
                                </th>

                                <th>
                                    ผู้ติดต่อ
                                </th>

                                <th>
                                    โทรศัพท์
                                </th>

                                <th>
                                    อีเมล
                                </th>

                                <th>
                                    สถานะ
                                </th>

                                <th class="text-center">
                                    จัดการ
                                </th>
                            </tr>
                        </thead>

                        <tbody>
                            ${renderPartyRows(
                                AppState.vendors,
                                "vendor"
                            )}
                        </tbody>

                    </table>

                </div>

                ${renderPagination(
                    "vendors"
                )}

            </div>

        </div>
        `
    );
}

function renderPartyRows(items, type) {
    if (!items.length) {
        return `
            <tr>
                <td
                    colspan="8"
                    class="table-empty"
                >
                    ไม่พบข้อมูล
                </td>
            </tr>
        `;
    }

    const action =
        type === "customer"
            ? "customer"
            : "vendor";

    return items
        .map(function (item) {
            return `
                <tr>

                    <td>
                        ${escapeHTML(
                            item.code ||
                            "-"
                        )}
                    </td>

                    <td>
                        <strong>
                            ${escapeHTML(
                                item.name ||
                                "-"
                            )}
                        </strong>
                    </td>

                    <td>
                        ${escapeHTML(
                            item.taxId ||
                            "-"
                        )}
                    </td>

                    <td>
                        ${escapeHTML(
                            item.contactPerson ||
                            "-"
                        )}
                    </td>

                    <td>
                        ${escapeHTML(
                            item.phone ||
                            "-"
                        )}
                    </td>

                    <td>
                        ${escapeHTML(
                            item.email ||
                            "-"
                        )}
                    </td>

                    <td>
                        ${item.active === false
                            ? `
                                <span class="badge badge-secondary">
                                    ปิดใช้งาน
                                </span>
                            `
                            : `
                                <span class="badge badge-success">
                                    ใช้งาน
                                </span>
                            `}
                    </td>

                    <td>
                        <div class="actions">

                            <button
                                type="button"
                                class="btn btn-sm btn-outline-primary"
                                data-action="edit-${action}"
                                data-id="${escapeAttribute(
                                    item.id
                                )}"
                            >
                                แก้ไข
                            </button>

                            ${
                                canDelete()
                                    ? `
                                        <button
                                            type="button"
                                            class="btn btn-sm btn-outline-danger"
                                            data-action="delete-${action}"
                                            data-id="${escapeAttribute(
                                                item.id
                                            )}"
                                        >
                                            ลบ
                                        </button>
                                    `
                                    : ""
                            }

                        </div>
                    </td>

                </tr>
            `;
        })
        .join("");
}

/* =========================================================
   24. DOCUMENT PAGE
   ========================================================= */

async function renderDocuments(container) {
    const result =
        await apiRequest(
            "list",
            {
                entity: "Documents",
                page:
                    AppState.pagination.documents.page,
                pageSize:
                    AppState.pagination.documents.pageSize,
                filters:
                    AppState.filters.documents
            }
        );

    const data =
        result.data || {};

    AppState.documents =
        data.items ||
        data.rows ||
        data ||
        [];

    AppState.pagination.documents.total =
        toNumber(
            data.total ||
            AppState.documents.length
        );

    setHTML(
        container,
        `
        <div class="content-header">

            <div class="content-header-left">

                <div class="section-title">
                    ทะเบียนเอกสาร
                </div>

                <div class="section-description">
                    จัดการใบเสนอราคา ใบแจ้งหนี้ ใบวางบิล ใบเสร็จ และเอกสารอื่น ๆ
                </div>

            </div>

            <div class="content-header-right">

                <button
                    type="button"
                    class="btn btn-primary"
                    data-action="new-document"
                >
                    ＋ สร้างเอกสาร
                </button>

            </div>

        </div>

        <div class="filter-bar">

            <div class="filter-item-wide">

                <div class="search-box">

                    <span class="search-box-icon">
                        ⌕
                    </span>

                    <input
                        type="text"
                        class="form-control"
                        id="documentSearch"
                        placeholder="ค้นหาเลขที่เอกสาร ชื่อลูกค้า หรือหัวข้อ"
                        value="${escapeAttribute(
                            AppState.filters.documents.search ||
                            ""
                        )}"
                    >

                </div>

            </div>

            <div class="filter-item">

                <select
                    class="form-control"
                    id="documentTypeFilter"
                >
                    <option value="">
                        เอกสารทุกประเภท
                    </option>

                    ${renderDocumentTypeOptions(
                        AppState.filters.documents.docType ||
                        ""
                    )}
                </select>

            </div>

            <div class="filter-item">

                <select
                    class="form-control"
                    id="documentStatusFilter"
                >
                    <option value="">
                        ทุกสถานะ
                    </option>

                    ${renderStatusOptions(
                        AppState.filters.documents.status ||
                        ""
                    )}
                </select>

            </div>

            <div class="filter-actions">

                <button
                    type="button"
                    class="btn btn-primary"
                    data-action="filter-documents"
                >
                    ค้นหา
                </button>

                <button
                    type="button"
                    class="btn btn-outline-secondary"
                    data-action="clear-document-filter"
                >
                    ล้าง
                </button>

            </div>

        </div>

        <div class="card">

            <div class="card-header">

                <div>

                    <div class="card-title">
                        ทะเบียนเอกสาร
                    </div>

                    <div class="card-subtitle">
                        จำนวน ${formatNumber(
                            AppState.pagination.documents.total
                        )} รายการ
                    </div>

                </div>

            </div>

            <div class="card-body">

                <div class="table-wrapper">

                    <table class="data-table">

                        <thead>
                            <tr>

                                <th>
                                    วันที่
                                </th>

                                <th>
                                    เลขที่เอกสาร
                                </th>

                                <th>
                                    ประเภท
                                </th>

                                <th>
                                    ผู้ติดต่อ
                                </th>

                                <th>
                                    หัวข้อ
                                </th>

                                <th class="text-right">
                                    รวม
                                </th>

                                <th>
                                    สถานะ
                                </th>

                                <th class="text-center">
                                    จัดการ
                                </th>

                            </tr>
                        </thead>

                        <tbody>
                            ${renderDocumentRows(
                                AppState.documents
                            )}
                        </tbody>

                    </table>

                </div>

                ${renderPagination(
                    "documents"
                )}

            </div>

        </div>
        `
    );
}

function renderDocumentRows(items) {
    if (!items.length) {
        return `
            <tr>
                <td
                    colspan="8"
                    class="table-empty"
                >
                    <div class="table-empty-icon">
                        ▤
                    </div>

                    <div class="table-empty-text">
                        ไม่พบเอกสาร
                    </div>
                </td>
            </tr>
        `;
    }

    return items
        .map(function (item) {
            return `
                <tr>

                    <td>
                        ${formatDate(
                            item.date
                        )}
                    </td>

                    <td>
                        <strong>
                            ${escapeHTML(
                                item.docNo ||
                                "-"
                            )}
                        </strong>
                    </td>

                    <td>
                        ${escapeHTML(
                            getDocumentTypeName(
                                item.docType
                            )
                        )}
                    </td>

                    <td>
                        ${escapeHTML(
                            item.partyName ||
                            getCustomerName(
                                item.customerId
                            ) ||
                            getVendorName(
                                item.vendorId
                            ) ||
                            "-"
                        )}
                    </td>

                    <td>
                        ${escapeHTML(
                            item.subject ||
                            "-"
                        )}
                    </td>

                    <td class="text-right">
                        ${formatMoney(
                            item.total ||
                            0
                        )}
                    </td>

                    <td>
                        ${renderDocumentStatusBadge(
                            item.status
                        )}
                    </td>

                    <td>

                        <div class="actions">

                            <button
                                type="button"
                                class="btn btn-sm btn-outline-primary"
                                data-action="view-document"
                                data-id="${escapeAttribute(
                                    item.id
                                )}"
                            >
                                ดู
                            </button>

                            <button
                                type="button"
                                class="btn btn-sm btn-outline-secondary"
                                data-action="edit-document"
                                data-id="${escapeAttribute(
                                    item.id
                                )}"
                            >
                                แก้ไข
                            </button>

                            <button
                                type="button"
                                class="btn btn-sm btn-outline-primary"
                                data-action="print-document"
                                data-id="${escapeAttribute(
                                    item.id
                                )}"
                            >
                                พิมพ์
                            </button>

                            ${
                                canDelete()
                                    ? `
                                        <button
                                            type="button"
                                            class="btn btn-sm btn-outline-danger"
                                            data-action="cancel-document"
                                            data-id="${escapeAttribute(
                                                item.id
                                            )}"
                                        >
                                            ยกเลิก
                                        </button>
                                    `
                                    : ""
                            }

                        </div>

                    </td>

                </tr>
            `;
        })
        .join("");
}

/* =========================================================
   25. USERS PAGE
   ========================================================= */

async function renderUsers(container) {
    if (!canManageUsers()) {
        setHTML(
            container,
            `
            <div class="card">
                <div class="card-body">
                    <div class="empty-state">
                        <div class="error-icon">
                            !
                        </div>

                        <div class="empty-state-title">
                            ไม่มีสิทธิ์เข้าถึง
                        </div>

                        <div class="empty-state-description">
                            เฉพาะผู้ดูแลระบบเท่านั้นที่สามารถจัดการผู้ใช้งานได้
                        </div>
                    </div>
                </div>
            </div>
            `
        );

        return;
    }

    const result =
        await apiRequest(
            "list",
            {
                entity: "Users",
                page:
                    AppState.pagination.users.page,
                pageSize:
                    AppState.pagination.users.pageSize,
                filters:
                    AppState.filters.users
            }
        );

    const data =
        result.data || {};

    AppState.users =
        data.items ||
        data.rows ||
        data ||
        [];

    AppState.pagination.users.total =
        toNumber(
            data.total ||
            AppState.users.length
        );

    setHTML(
        container,
        `
        <div class="content-header">

            <div class="content-header-left">

                <div class="section-title">
                    ผู้ใช้งานและสิทธิ์
                </div>

                <div class="section-description">
                    จัดการบัญชีผู้ใช้งานและสิทธิ์การเข้าถึง
                </div>

            </div>

            <div class="content-header-right">

                <button
                    type="button"
                    class="btn btn-primary"
                    data-action="new-user"
                >
                    ＋ เพิ่มผู้ใช้งาน
                </button>

            </div>

        </div>

        <div class="card">

            <div class="card-header">

                <div>

                    <div class="card-title">
                        ผู้ใช้งานระบบ
                    </div>

                    <div class="card-subtitle">
                        จำนวน ${formatNumber(
                            AppState.pagination.users.total
                        )} คน
                    </div>

                </div>

            </div>

            <div class="card-body">

                <div class="table-wrapper">

                    <table class="data-table">

                        <thead>

                            <tr>

                                <th>
                                    ผู้ใช้งาน
                                </th>

                                <th>
                                    ชื่อผู้ใช้
                                </th>

                                <th>
                                    สิทธิ์
                                </th>

                                <th>
                                    สถานะ
                                </th>

                                <th>
                                    เข้าสู่ระบบล่าสุด
                                </th>

                                <th class="text-center">
                                    จัดการ
                                </th>

                            </tr>

                        </thead>

                        <tbody>

                            ${renderUserRows(
                                AppState.users
                            )}

                        </tbody>

                    </table>

                </div>

                ${renderPagination(
                    "users"
                )}

            </div>

        </div>
        `
    );
}

function renderUserRows(items) {
    if (!items.length) {
        return `
            <tr>
                <td
                    colspan="6"
                    class="table-empty"
                >
                    ไม่พบผู้ใช้งาน
                </td>
            </tr>
        `;
    }

    return items
        .map(function (item) {
            const role =
                String(
                    item.role ||
                    "user"
                ).toLowerCase();

            return `
                <tr>

                    <td>

                        <div class="user-row">

                            <div class="avatar avatar-sm">
                                ${escapeHTML(
                                    getAvatarLetters(
                                        item.fullName ||
                                        item.username
                                    )
                                )}
                            </div>

                            <div class="user-row-info">

                                <div class="user-row-name">
                                    ${escapeHTML(
                                        item.fullName ||
                                        "-"
                                    )}
                                </div>

                                <div class="user-row-username">
                                    ${escapeHTML(
                                        item.username ||
                                        "-"
                                    )}
                                </div>

                            </div>

                        </div>

                    </td>

                    <td>
                        ${escapeHTML(
                            item.username ||
                            "-"
                        )}
                    </td>

                    <td>
                        <span class="badge role-${escapeAttribute(
                            role
                        )}">
                            ${escapeHTML(
                                getRoleName(
                                    item.role
                                )
                            )}
                        </span>
                    </td>

                    <td>
                        ${item.active === false
                            ? `
                                <span class="badge badge-secondary">
                                    ปิดใช้งาน
                                </span>
                            `
                            : `
                                <span class="badge badge-success">
                                    ใช้งาน
                                </span>
                            `}
                    </td>

                    <td>
                        ${formatDateTime(
                            item.lastLoginAt
                        )}
                    </td>

                    <td>

                        <div class="actions">

                            <button
                                type="button"
                                class="btn btn-sm btn-outline-primary"
                                data-action="edit-user"
                                data-id="${escapeAttribute(
                                    item.id
                                )}"
                            >
                                แก้ไข
                            </button>

                            ${
                                item.username !== "sxaiq54"
                                    ? `
                                        <button
                                            type="button"
                                            class="btn btn-sm btn-outline-danger"
                                            data-action="delete-user"
                                            data-id="${escapeAttribute(
                                                item.id
                                            )}"
                                        >
                                            ปิดใช้งาน
                                        </button>
                                    `
                                    : ""
                            }

                        </div>

                    </td>

                </tr>
            `;
        })
        .join("");
}

/* =========================================================
   26. SETTINGS PAGE
   ========================================================= */

async function renderSettings(container) {
    if (!canManageSettings()) {
        setHTML(
            container,
            `
            <div class="card">
                <div class="card-body">
                    <div class="empty-state">
                        <div class="error-icon">
                            !
                        </div>

                        <div class="empty-state-title">
                            ไม่มีสิทธิ์เข้าถึง
                        </div>

                        <div class="empty-state-description">
                            เฉพาะผู้ดูแลระบบเท่านั้นที่สามารถแก้ไขตั้งค่ากิจการได้
                        </div>
                    </div>
                </div>
            </div>
            `
        );

        return;
    }

    const result =
        await apiRequest(
            "settings",
            {}
        );

    const data =
        result.data || {};

    AppState.settings =
        data.settings ||
        data ||
        AppState.settings;

    setHTML(
        container,
        `
        <div class="content-header">

            <div class="content-header-left">

                <div class="section-title">
                    ตั้งค่ากิจการ
                </div>

                <div class="section-description">
                    ข้อมูลพื้นฐานของกิจการและระบบ
                </div>

            </div>

        </div>

        <div class="settings-layout">

            <div class="settings-nav">

                <button
                    type="button"
                    class="settings-nav-item active"
                    data-settings-tab="business"
                >
                    🏢 ข้อมูลกิจการ
                </button>

                <button
                    type="button"
                    class="settings-nav-item"
                    data-settings-tab="document"
                >
                    ▤ เอกสาร
                </button>

                <button
                    type="button"
                    class="settings-nav-item"
                    data-settings-tab="system"
                >
                    ⚙ ระบบ
                </button>

            </div>

            <div class="settings-panel">

                <div
                    class="card settings-tab-panel"
                    data-settings-panel="business"
                >

                    <div class="card-header">
                        <div class="card-title">
                            ข้อมูลกิจการ
                        </div>
                    </div>

                    <div class="card-body">

                        <div class="form-row">

                            <div class="form-group">

                                <label class="form-label">
                                    ชื่อกิจการ
                                </label>

                                <input
                                    type="text"
                                    class="form-control"
                                    id="settingBusinessName"
                                    value="${escapeAttribute(
                                        AppState.settings.business_name ||
                                        AppState.settings.company_name ||
                                        ""
                                    )}"
                                >

                            </div>

                            <div class="form-group">

                                <label class="form-label">
                                    เลขประจำตัวผู้เสียภาษี
                                </label>

                                <input
                                    type="text"
                                    class="form-control"
                                    id="settingTaxId"
                                    value="${escapeAttribute(
                                        AppState.settings.tax_id ||
                                        ""
                                    )}"
                                >

                            </div>

                        </div>

                        <div class="form-group">

                            <label class="form-label">
                                ที่อยู่
                            </label>

                            <textarea
                                class="form-control"
                                id="settingAddress"
                            >${escapeHTML(
                                AppState.settings.address ||
                                ""
                            )}</textarea>

                        </div>

                        <div class="form-row-3">

                            <div class="form-group">

                                <label class="form-label">
                                    โทรศัพท์
                                </label>

                                <input
                                    type="text"
                                    class="form-control"
                                    id="settingPhone"
                                    value="${escapeAttribute(
                                        AppState.settings.phone ||
                                        ""
                                    )}"
                                >

                            </div>

                            <div class="form-group">

                                <label class="form-label">
                                    อีเมล
                                </label>

                                <input
                                    type="email"
                                    class="form-control"
                                    id="settingEmail"
                                    value="${escapeAttribute(
                                        AppState.settings.email ||
                                        ""
                                    )}"
                                >

                            </div>

                            <div class="form-group">

                                <label class="form-label">
                                    เว็บไซต์
                                </label>

                                <input
                                    type="text"
                                    class="form-control"
                                    id="settingWebsite"
                                    value="${escapeAttribute(
                                        AppState.settings.website ||
                                        ""
                                    )}"
                                >

                            </div>

                        </div>

                        <div class="form-group">

                            <label class="form-label">
                                คำอธิบายกิจการ
                            </label>

                            <textarea
                                class="form-control"
                                id="settingDescription"
                            >${escapeHTML(
                                AppState.settings.business_description ||
                                AppState.settings.company_description ||
                                ""
                            )}</textarea>

                        </div>

                        <div class="form-actions">

                            <button
                                type="button"
                                class="btn btn-primary"
                                data-action="save-business-settings"
                            >
                                บันทึกข้อมูล
                            </button>

                        </div>

                    </div>

                </div>

                <div
                    class="card settings-tab-panel hidden"
                    data-settings-panel="document"
                >

                    <div class="card-header">
                        <div class="card-title">
                            การตั้งค่าเอกสาร
                        </div>
                    </div>

                    <div class="card-body">

                        <div class="info-message">
                            <span>
                                ℹ
                            </span>

                            <span>
                                ระบบจะสร้างเลขที่เอกสารอัตโนมัติตามประเภทเอกสาร
                            </span>
                        </div>

                        <div class="form-row-3 mt-3">

                            ${renderDocumentPrefixSetting(
                                "QUOTATION",
                                "ใบเสนอราคา"
                            )}

                            ${renderDocumentPrefixSetting(
                                "INVOICE",
                                "ใบแจ้งหนี้"
                            )}

                            ${renderDocumentPrefixSetting(
                                "BILLING",
                                "ใบวางบิล"
                            )}

                            ${renderDocumentPrefixSetting(
                                "RECEIPT",
                                "ใบเสร็จรับเงิน"
                            )}

                            ${renderDocumentPrefixSetting(
                                "PAYMENT_RECEIPT",
                                "ใบรับเงิน"
                            )}

                            ${renderDocumentPrefixSetting(
                                "RECEIVING_VOUCHER",
                                "ใบสำคัญรับ"
                            )}

                            ${renderDocumentPrefixSetting(
                                "PAYMENT_VOUCHER",
                                "ใบสำคัญจ่าย"
                            )}

                            ${renderDocumentPrefixSetting(
                                "PAYMENT_CERTIFICATE",
                                "หนังสือรับรองการจ่ายเงิน"
                            )}

                            ${renderDocumentPrefixSetting(
                                "OTHER",
                                "อื่น ๆ"
                            )}

                        </div>

                        <div class="form-actions">

                            <button
                                type="button"
                                class="btn btn-primary"
                                data-action="save-document-settings"
                            >
                                บันทึกการตั้งค่า
                            </button>

                        </div>

                    </div>

                </div>

                <div
                    class="card settings-tab-panel hidden"
                    data-settings-panel="system"
                >

                    <div class="card-header">
                        <div class="card-title">
                            ระบบ
                        </div>
                    </div>

                    <div class="card-body">

                        <div class="info-grid">

                            <div class="info-item">
                                <div class="info-label">
                                    ชื่อระบบ
                                </div>

                                <div class="info-value">
                                    ${escapeHTML(
                                        APP_CONFIG.APP_NAME
                                    )}
                                </div>
                            </div>

                            <div class="info-item">
                                <div class="info-label">
                                    เวอร์ชัน
                                </div>

                                <div class="info-value">
                                    ${escapeHTML(
                                        AppState.settings.version ||
                                        "1.0.0"
                                    )}
                                </div>
                            </div>

                            <div class="info-item">
                                <div class="info-label">
                                    ผู้ใช้งานปัจจุบัน
                                </div>

                                <div class="info-value">
                                    ${escapeHTML(
                                        AppState.user.fullName ||
                                        AppState.user.username
                                    )}
                                </div>
                            </div>

                            <div class="info-item">
                                <div class="info-label">
                                    สิทธิ์
                                </div>

                                <div class="info-value">
                                    ${escapeHTML(
                                        getRoleName(
                                            AppState.user.role
                                        )
                                    )}
                                </div>
                            </div>

                        </div>

                    </div>

                </div>

            </div>

        </div>
        `
    );
}

function renderDocumentPrefixSetting(
    type,
    label
) {
    const key =
        "DOC_PREFIX_" +
        type;

    const value =
        AppState.settings[key] ||
        "";

    return `
        <div class="form-group">

            <label class="form-label">
                ${escapeHTML(
                    label
                )}
            </label>

            <input
                type="text"
                class="form-control document-prefix-setting"
                data-setting-key="${escapeAttribute(
                    key
                )}"
                value="${escapeAttribute(
                    value
                )}"
                placeholder="เช่น INV"
            >

        </div>
    `;
}

/* =========================================================
   27. AUDIT LOG
   ========================================================= */

async function renderAuditLogs(container) {
    if (!isAdmin()) {
        setHTML(
            container,
            `
            <div class="card">
                <div class="card-body">
                    <div class="empty-state">
                        <div class="error-icon">
                            !
                        </div>

                        <div class="empty-state-title">
                            ไม่มีสิทธิ์เข้าถึง
                        </div>

                        <div class="empty-state-description">
                            เฉพาะผู้ดูแลระบบเท่านั้นที่สามารถดู Audit Log ได้
                        </div>
                    </div>
                </div>
            </div>
            `
        );

        return;
    }

    const result =
        await apiRequest(
            "auditlogs",
            {
                page:
                    AppState.pagination.auditLogs.page,
                pageSize:
                    AppState.pagination.auditLogs.pageSize,
                filters:
                    AppState.filters.auditLogs
            }
        );

    const data =
        result.data || {};

    AppState.auditLogs =
        data.items ||
        data.rows ||
        data ||
        [];

    AppState.pagination.auditLogs.total =
        toNumber(
            data.total ||
            AppState.auditLogs.length
        );

    setHTML(
        container,
        `
        <div class="content-header">

            <div class="content-header-left">

                <div class="section-title">
                    Audit Log
                </div>

                <div class="section-description">
                    ประวัติการทำรายการและการใช้งานระบบ
                </div>

            </div>

        </div>

        <div class="card">

            <div class="card-header">

                <div class="card-title">
                    ประวัติการใช้งาน
                </div>

            </div>

            <div class="card-body">

                <div class="table-wrapper">

                    <table class="data-table">

                        <thead>

                            <tr>

                                <th>
                                    เวลา
                                </th>

                                <th>
                                    ผู้ใช้งาน
                                </th>

                                <th>
                                    Action
                                </th>

                                <th>
                                    Entity
                                </th>

                                <th>
                                    รายละเอียด
                                </th>

                            </tr>

                        </thead>

                        <tbody>

                            ${renderAuditRows(
                                AppState.auditLogs
                            )}

                        </tbody>

                    </table>

                </div>

                ${renderPagination(
                    "auditLogs"
                )}

            </div>

        </div>
        `
    );
}

function renderAuditRows(items) {
    if (!items.length) {
        return `
            <tr>
                <td
                    colspan="5"
                    class="table-empty"
                >
                    ไม่พบประวัติการใช้งาน
                </td>
            </tr>
        `;
    }

    return items
        .map(function (item) {
            return `
                <tr>

                    <td>
                        ${formatDateTime(
                            item.timestamp ||
                            item.createdAt
                        )}
                    </td>

                    <td>
                        <strong>
                            ${escapeHTML(
                                item.username ||
                                "-"
                            )}
                        </strong>
                    </td>

                    <td>
                        <span class="badge badge-primary">
                            ${escapeHTML(
                                item.action ||
                                "-"
                            )}
                        </span>
                    </td>

                    <td>
                        ${escapeHTML(
                            item.entity ||
                            "-"
                        )}
                    </td>

                    <td>

                        <div class="audit-detail">
                            ${escapeHTML(
                                item.details ||
                                ""
                            )}
                        </div>

                    </td>

                </tr>
            `;
        })
        .join("");
}

/* =========================================================
   28. REPORT PAGE
   ========================================================= */

async function renderReport(container) {
    const startDate =
        AppState.filters.report &&
        AppState.filters.report.startDate
            ? AppState.filters.report.startDate
            : getFirstDayOfMonth();

    const endDate =
        AppState.filters.report &&
        AppState.filters.report.endDate
            ? AppState.filters.report.endDate
            : getTodayString();

    const result =
        await apiRequest(
            "report",
            {
                startDate: startDate,
                endDate: endDate
            }
        );

    AppState.report =
        result.data || {};

    const data =
        AppState.report;

    const income =
        toNumber(
            data.totalIncome ||
            data.income ||
            0
        );

    const expense =
        toNumber(
            data.totalExpense ||
            data.expense ||
            0
        );

    const net =
        income - expense;

    setHTML(
        container,
        `
        <div class="content-header">

            <div class="content-header-left">

                <div class="section-title">
                    รายงานการเงิน
                </div>

                <div class="section-description">
                    สรุปข้อมูลระหว่างวันที่ ${formatDate(
                        startDate
                    )} ถึง ${formatDate(
                        endDate
                    )}
                </div>

            </div>

            <div class="content-header-right">

                <button
                    type="button"
                    class="btn btn-outline-primary"
                    data-action="print-report"
                >
                    พิมพ์รายงาน
                </button>

            </div>

        </div>

        <div class="filter-bar">

            <div class="filter-item">

                <label class="form-label">
                    ตั้งแต่วันที่
                </label>

                <input
                    type="date"
                    class="form-control"
                    id="reportStartDate"
                    value="${escapeAttribute(
                        startDate
                    )}"
                >

            </div>

            <div class="filter-item">

                <label class="form-label">
                    ถึงวันที่
                </label>

                <input
                    type="date"
                    class="form-control"
                    id="reportEndDate"
                    value="${escapeAttribute(
                        endDate
                    )}"
                >

            </div>

            <div class="filter-actions">

                <button
                    type="button"
                    class="btn btn-primary"
                    data-action="filter-report"
                >
                    แสดงรายงาน
                </button>

            </div>

        </div>

        <div class="dashboard-grid">

            <div class="card dashboard-stat-card income">

                <div class="dashboard-stat-label">
                    รายรับ
                </div>

                <div class="dashboard-stat-value amount-income">
                    ${formatMoney(
                        income
                    )}
                </div>

            </div>

            <div class="card dashboard-stat-card expense">

                <div class="dashboard-stat-label">
                    รายจ่าย
                </div>

                <div class="dashboard-stat-value amount-expense">
                    ${formatMoney(
                        expense
                    )}
                </div>

            </div>

            <div class="card dashboard-stat-card balance">

                <div class="dashboard-stat-label">
                    สุทธิ
                </div>

                <div class="dashboard-stat-value ${net >= 0 ? "amount-positive" : "amount-negative"}">
                    ${formatMoney(
                        net
                    )}
                </div>

            </div>

            <div class="card dashboard-stat-card cash">

                <div class="dashboard-stat-label">
                    จำนวนรายการ
                </div>

                <div class="dashboard-stat-value">
                    ${formatNumber(
                        data.transactionCount ||
                        data.totalTransactions ||
                        0
                    )}
                </div>

            </div>

        </div>

        <div class="dashboard-grid-two mt-4">

            <div class="card">

                <div class="card-header">
                    <div class="card-title">
                        รายรับตามหมวดหมู่
                    </div>
                </div>

                <div class="card-body">
                    ${renderReportCategoryRows(
                        data.incomeByCategory ||
                        []
                    )}
                </div>

            </div>

            <div class="card">

                <div class="card-header">
                    <div class="card-title">
                        รายจ่ายตามหมวดหมู่
                    </div>
                </div>

                <div class="card-body">
                    ${renderReportCategoryRows(
                        data.expenseByCategory ||
                        []
                    )}
                </div>

            </div>

        </div>

        <div class="card mt-4">

            <div class="card-header">

                <div class="card-title">
                    สรุปยอดตามบัญชี
                </div>

            </div>

            <div class="card-body">

                <div class="table-wrapper">

                    <table class="data-table">

                        <thead>

                            <tr>

                                <th>
                                    บัญชี
                                </th>

                                <th class="text-right">
                                    รายรับ
                                </th>

                                <th class="text-right">
                                    รายจ่าย
                                </th>

                                <th class="text-right">
                                    สุทธิ
                                </th>

                            </tr>

                        </thead>

                        <tbody>

                            ${renderReportAccountRows(
                                data.accountSummary ||
                                []
                            )}

                        </tbody>

                    </table>

                </div>

            </div>

        </div>
        `
    );
}

function renderReportCategoryRows(items) {
    if (!items.length) {
        return `
            <div class="empty-state">
                <div class="empty-state-icon">
                    ▤
                </div>

                <div class="empty-state-description">
                    ไม่มีข้อมูลในช่วงเวลาที่เลือก
                </div>
            </div>
        `;
    }

    return items
        .map(function (item) {
            return `
                <div class="report-total-row">

                    <div class="report-total-label">
                        ${escapeHTML(
                            item.categoryName ||
                            item.name ||
                            "-"
                        )}
                    </div>

                    <div class="report-total-value">
                        ${formatMoney(
                            item.amount ||
                            0
                        )}
                    </div>

                </div>
            `;
        })
        .join("");
}

function renderReportAccountRows(items) {
    if (!items.length) {
        return `
            <tr>
                <td
                    colspan="4"
                    class="table-empty"
                >
                    ไม่มีข้อมูล
                </td>
            </tr>
        `;
    }

    return items
        .map(function (item) {
            const income =
                toNumber(
                    item.income ||
                    0
                );

            const expense =
                toNumber(
                    item.expense ||
                    0
                );

            return `
                <tr>

                    <td>
                        ${escapeHTML(
                            item.accountName ||
                            item.name ||
                            "-"
                        )}
                    </td>

                    <td class="text-right amount-income">
                        ${formatMoney(
                            income
                        )}
                    </td>

                    <td class="text-right amount-expense">
                        ${formatMoney(
                            expense
                        )}
                    </td>

                    <td class="text-right">
                        ${formatMoney(
                            income - expense
                        )}
                    </td>

                </tr>
            `;
        })
        .join("");
}

/* =========================================================
   29. PAGINATION
   ========================================================= */

function formatNumber(value) {
    return new Intl.NumberFormat(
        APP_CONFIG.LOCALE
    ).format(
        toNumber(value)
    );
}

function renderPagination(entity) {
    const pagination =
        AppState.pagination[entity];

    if (!pagination) {
        return "";
    }

    const page =
        pagination.page || 1;

    const pageSize =
        pagination.pageSize ||
        APP_CONFIG.PAGE_SIZE;

    const total =
        pagination.total || 0;

    const totalPages =
        Math.max(
            1,
            Math.ceil(
                total / pageSize
            )
        );

    if (totalPages <= 1) {
        return `
            <div class="pagination-wrapper">

                <div class="pagination-info">
                    แสดง ${total ? 1 : 0} - ${total}
                    จาก ${formatNumber(total)} รายการ
                </div>

            </div>
        `;
    }

    const start =
        total === 0
            ? 0
            : ((page - 1) * pageSize) + 1;

    const end =
        Math.min(
            page * pageSize,
            total
        );

    const buttons = [];

    buttons.push(`
        <button
            type="button"
            class="page-link ${page <= 1 ? "disabled" : ""}"
            data-action="page"
            data-entity="${escapeAttribute(
                entity
            )}"
            data-page="${page - 1}"
            ${page <= 1 ? "disabled" : ""}
        >
            ‹
        </button>
    `);

    const firstPage =
        Math.max(
            1,
            page - 2
        );

    const lastPage =
        Math.min(
            totalPages,
            page + 2
        );

    if (firstPage > 1) {
        buttons.push(`
            <button
                type="button"
                class="page-link"
                data-action="page"
                data-entity="${escapeAttribute(
                    entity
                )}"
                data-page="1"
            >
                1
            </button>
        `);

        if (firstPage > 2) {
            buttons.push(`
                <span class="page-link disabled">
                    …
                </span>
            `);
        }
    }

    for (
        let current = firstPage;
        current <= lastPage;
        current++
    ) {
        buttons.push(`
            <button
                type="button"
                class="page-link ${current === page ? "active" : ""}"
                data-action="page"
                data-entity="${escapeAttribute(
                    entity
                )}"
                data-page="${current}"
            >
                ${current}
            </button>
        `);
    }

    if (lastPage < totalPages) {
        if (lastPage < totalPages - 1) {
            buttons.push(`
                <span class="page-link disabled">
                    …
                </span>
            `);
        }

        buttons.push(`
            <button
                type="button"
                class="page-link"
                data-action="page"
                data-entity="${escapeAttribute(
                    entity
                )}"
                data-page="${totalPages}"
            >
                ${totalPages}
            </button>
        `);
    }

    buttons.push(`
        <button
            type="button"
            class="page-link ${page >= totalPages ? "disabled" : ""}"
            data-action="page"
            data-entity="${escapeAttribute(
                entity
            )}"
            data-page="${page + 1}"
            ${page >= totalPages ? "disabled" : ""}
        >
            ›
        </button>
    `);

    return `
        <div class="pagination-wrapper">

            <div class="pagination-info">
                แสดง ${formatNumber(start)}
                - ${formatNumber(end)}
                จาก ${formatNumber(total)} รายการ
            </div>

            <div class="pagination">
                ${buttons.join("")}
            </div>

        </div>
    `;
}

/* =========================================================
   30. MODAL SYSTEM
   ========================================================= */

function ensureModalContainer() {
    let container =
        byId("modalContainer");

    if (!container) {
        container = createElement(
            "div",
            "modal-overlay"
        );

        container.id =
            "modalContainer";

        document.body.appendChild(
            container
        );
    }

    return container;
}

function openModal(options) {
    const config =
        options || {};

    const overlay =
        ensureModalContainer();

    const modalClass =
        config.size
            ? "modal " +
              config.size
            : "modal";

    setHTML(
        overlay,
        `
        <div class="${modalClass}" role="dialog" aria-modal="true">

            <div class="modal-header">

                <div class="modal-title">
                    ${escapeHTML(
                        config.title ||
                        ""
                    )}
                </div>

                <button
                    type="button"
                    class="modal-close"
                    data-action="close-modal"
                    aria-label="ปิด"
                >
                    ×
                </button>

            </div>

            <div class="modal-body">
                ${
                    config.content ||
                    ""
                }
            </div>

            ${
                config.footer === false
                    ? ""
                    : `
                        <div class="modal-footer">
                            ${
                                config.footer ||
                                `
                                    <button
                                        type="button"
                                        class="btn btn-outline-secondary"
                                        data-action="close-modal"
                                    >
                                        ปิด
                                    </button>
                                `
                            }
                        </div>
                    `
            }

        </div>
        `
    );

    overlay.classList.add("show");

    return overlay;
}

function closeModal() {
    const overlay =
        byId("modalContainer");

    if (!overlay) {
        return;
    }

    overlay.classList.remove("show");

    setTimeout(function () {
        if (
            overlay &&
            overlay.parentNode
        ) {
            overlay.remove();
        }
    }, 150);
}

/* =========================================================
   31. INCOME MODAL
   ========================================================= */

function openIncomeModal(id) {
    let item = null;

    if (id) {
        item = getItemById(
            AppState.incomes,
            id
        );
    }

    const isEdit =
        Boolean(item);

    const form =
        item
            ? Object.assign(
                {},
                AppState.incomeForm,
                item
            )
            : Object.assign(
                {},
                AppState.incomeForm,
                {
                    date: getTodayString()
                }
            );

    const content = `
        <form id="incomeForm">

            <input
                type="hidden"
                id="incomeId"
                value="${escapeAttribute(
                    form.id ||
                    ""
                )}"
            >

            <div class="form-row">

                <div class="form-group">

                    <label class="form-label required">
                        วันที่
                    </label>

                    <input
                        type="date"
                        class="form-control"
                        id="incomeDate"
                        required
                        value="${escapeAttribute(
                            formatDateInput(
                                form.date
                            )
                        )}"
                    >

                </div>

                <div class="form-group">

                    <label class="form-label">
                        เลขที่เอกสาร
                    </label>

                    <input
                        type="text"
                        class="form-control"
                        id="incomeDocNo"
                        value="${escapeAttribute(
                            form.docNo ||
                            ""
                        )}"
                        placeholder="เว้นว่างเพื่อให้ระบบกำหนด"
                    >

                </div>

            </div>

            <div class="form-row">

                <div class="form-group">

                    <label class="form-label required">
                        บัญชีรับเงิน
                    </label>

                    <select
                        class="form-control"
                        id="incomeAccountId"
                        required
                    >
                        <option value="">
                            เลือกบัญชี
                        </option>

                        ${renderAccountOptions(
                            form.accountId ||
                            ""
                        )}
                    </select>

                </div>

                <div class="form-group">

                    <label class="form-label required">
                        หมวดหมู่
                    </label>

                    <select
                        class="form-control"
                        id="incomeCategoryId"
                        required
                    >
                        <option value="">
                            เลือกหมวดหมู่รายรับ
                        </option>

                        ${renderCategoryOptions(
                            "INCOME",
                            form.categoryId ||
                            ""
                        )}
                    </select>

                </div>

            </div>

            <div class="form-row">

                <div class="form-group">

                    <label class="form-label">
                        ประเภทคู่ค้า
                    </label>

                    <select
                        class="form-control"
                        id="incomeCounterpartyType"
                    >
                        <option value="">
                            ไม่ระบุ
                        </option>

                        <option
                            value="CUSTOMER"
                            ${form.counterpartyType === "CUSTOMER" ? "selected" : ""}
                        >
                            ลูกค้า
                        </option>

                        <option
                            value="OTHER"
                            ${form.counterpartyType === "OTHER" ? "selected" : ""}
                        >
                            อื่น ๆ
                        </option>

                    </select>

                </div>

                <div class="form-group">

                    <label class="form-label">
                        ผู้ติดต่อ
                    </label>

                    <select
                        class="form-control"
                        id="incomeCounterpartyId"
                    >
                        <option value="">
                            ไม่ระบุ
                        </option>

                        ${renderCustomerOptions(
                            form.counterpartyId ||
                            ""
                        )}
                    </select>

                </div>

            </div>

            <div class="form-group">

                <label class="form-label required">
                    รายละเอียด
                </label>

                <input
                    type="text"
                    class="form-control"
                    id="incomeDescription"
                    required
                    value="${escapeAttribute(
                        form.description ||
                        ""
                    )}"
                    placeholder="รายละเอียดรายการ"
                >

            </div>

            <div class="form-row">

                <div class="form-group">

                    <label class="form-label required">
                        จำนวนเงิน
                    </label>

                    <div class="input-prefix">

                        <span class="input-prefix-symbol">
                            ฿
                        </span>

                        <input
                            type="number"
                            class="form-control currency-input"
                            id="incomeAmount"
                            required
                            min="0"
                            step="0.01"
                            value="${escapeAttribute(
                                form.amount ||
                                ""
                            )}"
                        >

                    </div>

                </div>

                <div class="form-group">

                    <label class="form-label">
                        วิธีรับเงิน
                    </label>

                    <select
                        class="form-control"
                        id="incomePaymentMethod"
                    >

                        <option value="">
                            เลือกวิธีรับเงิน
                        </option>

                        <option
                            value="CASH"
                            ${form.paymentMethod === "CASH" ? "selected" : ""}
                        >
                            เงินสด
                        </option>

                        <option
                            value="BANK_TRANSFER"
                            ${form.paymentMethod === "BANK_TRANSFER" ? "selected" : ""}
                        >
                            โอนเงิน
                        </option>

                        <option
                            value="CARD"
                            ${form.paymentMethod === "CARD" ? "selected" : ""}
                        >
                            บัตร
                        </option>

                        <option
                            value="OTHER"
                            ${form.paymentMethod === "OTHER" ? "selected" : ""}
                        >
                            อื่น ๆ
                        </option>

                    </select>

                </div>

            </div>

            <div class="form-group">

                <label class="form-label">
                    เลขอ้างอิง
                </label>

                <input
                    type="text"
                    class="form-control"
                    id="incomeReference"
                    value="${escapeAttribute(
                        form.reference ||
                        ""
                    )}"
                    placeholder="เลขอ้างอิง / หมายเหตุ"
                >

            </div>

        </form>
    `;

    const footer = `
        <button
            type="button"
            class="btn btn-outline-secondary"
            data-action="close-modal"
        >
            ยกเลิก
        </button>

        <button
            type="button"
            class="btn btn-primary"
            data-action="save-income"
        >
            ${isEdit ? "บันทึกการแก้ไข" : "บันทึกรายรับ"}
        </button>
    `;

    openModal({
        title:
            isEdit
                ? "แก้ไขรายรับ"
                : "บันทึกรายรับ",
        content: content,
        footer: footer,
        size: "modal-md"
    });
}

async function saveIncomeFromModal() {
    const form =
        byId("incomeForm");

    if (!form) {
        return;
    }

    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }

    const data = {
        id:
            valueOf("incomeId"),
        date:
            valueOf("incomeDate"),
        docNo:
            valueOf("incomeDocNo"),
        accountId:
            valueOf("incomeAccountId"),
        categoryId:
            valueOf("incomeCategoryId"),
        counterpartyType:
            valueOf("incomeCounterpartyType"),
        counterpartyId:
            valueOf("incomeCounterpartyId"),
        counterpartyName:
            getSelectedText(
                "incomeCounterpartyId"
            ),
        description:
            valueOf("incomeDescription"),
        amount:
            toNumber(
                valueOf("incomeAmount")
            ),
        paymentMethod:
            valueOf("incomePaymentMethod"),
        reference:
            valueOf("incomeReference"),
        status: "ACTIVE"
    };

    if (data.amount <= 0) {
        showToast(
            "ข้อมูลไม่ถูกต้อง",
            "จำนวนเงินต้องมากกว่า 0",
            "warning"
        );
        return;
    }

    showLoading(
        "กำลังบันทึกรายรับ..."
    );

    try {
        await apiRequest(
            "saveincome",
            {
                data: data
            }
        );

        closeModal();

        showToast(
            "บันทึกสำเร็จ",
            "บันทึกรายรับเรียบร้อยแล้ว",
            "success"
        );

        await navigateTo(
            "incomes"
        );
    } catch (error) {
        handleApiError(error);
    } finally {
        hideLoading();
    }
}

/* =========================================================
   32. EXPENSE MODAL
   ========================================================= */

function openExpenseModal(id) {
    let item = null;

    if (id) {
        item = getItemById(
            AppState.expenses,
            id
        );
    }

    const isEdit =
        Boolean(item);

    const form =
        item
            ? Object.assign(
                {},
                AppState.expenseForm,
                item
            )
            : Object.assign(
                {},
                AppState.expenseForm,
                {
                    date: getTodayString()
                }
            );

    const content = `
        <form id="expenseForm">

            <input
                type="hidden"
                id="expenseId"
                value="${escapeAttribute(
                    form.id ||
                    ""
                )}"
            >

            <div class="form-row">

                <div class="form-group">

                    <label class="form-label required">
                        วันที่
                    </label>

                    <input
                        type="date"
                        class="form-control"
                        id="expenseDate"
                        required
                        value="${escapeAttribute(
                            formatDateInput(
                                form.date
                            )
                        )}"
                    >

                </div>

                <div class="form-group">

                    <label class="form-label">
                        เลขที่เอกสาร
                    </label>

                    <input
                        type="text"
                        class="form-control"
                        id="expenseDocNo"
                        value="${escapeAttribute(
                            form.docNo ||
                            ""
                        )}"
                        placeholder="เว้นว่างเพื่อให้ระบบกำหนด"
                    >

                </div>

            </div>

            <div class="form-row">

                <div class="form-group">

                    <label class="form-label required">
                        บัญชีจ่ายเงิน
                    </label>

                    <select
                        class="form-control"
                        id="expenseAccountId"
                        required
                    >
                        <option value="">
                            เลือกบัญชี
                        </option>

                        ${renderAccountOptions(
                            form.accountId ||
                            ""
                        )}
                    </select>

                </div>

                <div class="form-group">

                    <label class="form-label required">
                        หมวดหมู่
                    </label>

                    <select
                        class="form-control"
                        id="expenseCategoryId"
                        required
                    >
                        <option value="">
                            เลือกหมวดหมู่รายจ่าย
                        </option>

                        ${renderCategoryOptions(
                            "EXPENSE",
                            form.categoryId ||
                            ""
                        )}
                    </select>

                </div>

            </div>

            <div class="form-row">

                <div class="form-group">

                    <label class="form-label">
                        ประเภทคู่ค้า
                    </label>

                    <select
                        class="form-control"
                        id="expenseCounterpartyType"
                    >

                        <option value="">
                            ไม่ระบุ
                        </option>

                        <option
                            value="VENDOR"
                            ${form.counterpartyType === "VENDOR" ? "selected" : ""}
                        >
                            ผู้จำหน่าย / เจ้าหนี้
                        </option>

                        <option
                            value="OTHER"
                            ${form.counterpartyType === "OTHER" ? "selected" : ""}
                        >
                            อื่น ๆ
                        </option>

                    </select>

                </div>

                <div class="form-group">

                    <label class="form-label">
                        ผู้ติดต่อ
                    </label>

                    <select
                        class="form-control"
                        id="expenseCounterpartyId"
                    >

                        <option value="">
                            ไม่ระบุ
                        </option>

                        ${renderVendorOptions(
                            form.counterpartyId ||
                            ""
                        )}

                    </select>

                </div>

            </div>

            <div class="form-group">

                <label class="form-label required">
                    รายละเอียด
                </label>

                <input
                    type="text"
                    class="form-control"
                    id="expenseDescription"
                    required
                    value="${escapeAttribute(
                        form.description ||
                        ""
                    )}"
                    placeholder="รายละเอียดรายการ"
                >

            </div>

            <div class="form-row">

                <div class="form-group">

                    <label class="form-label required">
                        จำนวนเงิน
                    </label>

                    <div class="input-prefix">

                        <span class="input-prefix-symbol">
                            ฿
                        </span>

                        <input
                            type="number"
                            class="form-control currency-input"
                            id="expenseAmount"
                            required
                            min="0"
                            step="0.01"
                            value="${escapeAttribute(
                                form.amount ||
                                ""
                            )}"
                        >

                    </div>

                </div>

                <div class="form-group">

                    <label class="form-label">
                        วิธีจ่ายเงิน
                    </label>

                    <select
                        class="form-control"
                        id="expensePaymentMethod"
                    >

                        <option value="">
                            เลือกวิธีจ่ายเงิน
                        </option>

                        <option
                            value="CASH"
                            ${form.paymentMethod === "CASH" ? "selected" : ""}
                        >
                            เงินสด
                        </option>

                        <option
                            value="BANK_TRANSFER"
                            ${form.paymentMethod === "BANK_TRANSFER" ? "selected" : ""}
                        >
                            โอนเงิน
                        </option>

                        <option
                            value="CARD"
                            ${form.paymentMethod === "CARD" ? "selected" : ""}
                        >
                            บัตร
                        </option>

                        <option
                            value="OTHER"
                            ${form.paymentMethod === "OTHER" ? "selected" : ""}
                        >
                            อื่น ๆ
                        </option>

                    </select>

                </div>

            </div>

            <div class="form-group">

                <label class="form-label">
                    เลขอ้างอิง
                </label>

                <input
                    type="text"
                    class="form-control"
                    id="expenseReference"
                    value="${escapeAttribute(
                        form.reference ||
                        ""
                    )}"
                    placeholder="เลขอ้างอิง / หมายเหตุ"
                >

            </div>

        </form>
    `;

    const footer = `
        <button
            type="button"
            class="btn btn-outline-secondary"
            data-action="close-modal"
        >
            ยกเลิก
        </button>

        <button
            type="button"
            class="btn btn-danger"
            data-action="save-expense"
        >
            ${isEdit ? "บันทึกการแก้ไข" : "บันทึกรายจ่าย"}
        </button>
    `;

    openModal({
        title:
            isEdit
                ? "แก้ไขรายจ่าย"
                : "บันทึกรายจ่าย",
        content: content,
        footer: footer,
        size: "modal-md"
    });
}

async function saveExpenseFromModal() {
    const form =
        byId("expenseForm");

    if (!form) {
        return;
    }

    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }

    const data = {
        id:
            valueOf("expenseId"),
        date:
            valueOf("expenseDate"),
        docNo:
            valueOf("expenseDocNo"),
        accountId:
            valueOf("expenseAccountId"),
        categoryId:
            valueOf("expenseCategoryId"),
        counterpartyType:
            valueOf("expenseCounterpartyType"),
        counterpartyId:
            valueOf("expenseCounterpartyId"),
        counterpartyName:
            getSelectedText(
                "expenseCounterpartyId"
            ),
        description:
            valueOf("expenseDescription"),
        amount:
            toNumber(
                valueOf("expenseAmount")
            ),
        paymentMethod:
            valueOf("expensePaymentMethod"),
        reference:
            valueOf("expenseReference"),
        status: "ACTIVE"
    };

    if (data.amount <= 0) {
        showToast(
            "ข้อมูลไม่ถูกต้อง",
            "จำนวนเงินต้องมากกว่า 0",
            "warning"
        );
        return;
    }

    showLoading(
        "กำลังบันทึกรายจ่าย..."
    );

    try {
        await apiRequest(
            "saveexpense",
            {
                data: data
            }
        );

        closeModal();

        showToast(
            "บันทึกสำเร็จ",
            "บันทึกรายจ่ายเรียบร้อยแล้ว",
            "success"
        );

        await navigateTo(
            "expenses"
        );
    } catch (error) {
        handleApiError(error);
    } finally {
        hideLoading();
    }
}

/* =========================================================
   33. TRANSFER MODAL
   ========================================================= */

function openTransferModal(id) {
    let item = null;

    if (id) {
        item = getItemById(
            AppState.transfers,
            id
        );
    }

    const isEdit =
        Boolean(item);

    const form =
        item
            ? Object.assign(
                {},
                AppState.transferForm,
                item
            )
            : Object.assign(
                {},
                AppState.transferForm,
                {
                    date: getTodayString()
                }
            );

    const content = `
        <form id="transferForm">

            <input
                type="hidden"
                id="transferId"
                value="${escapeAttribute(
                    form.id ||
                    ""
                )}"
            >

            <div class="form-row">

                <div class="form-group">

                    <label class="form-label required">
                        วันที่
                    </label>

                    <input
                        type="date"
                        class="form-control"
                        id="transferDate"
                        required
                        value="${escapeAttribute(
                            formatDateInput(
                                form.date
                            )
                        )}"
                    >

                </div>

                <div class="form-group">

                    <label class="form-label">
                        เลขที่เอกสาร
                    </label>

                    <input
                        type="text"
                        class="form-control"
                        id="transferDocNo"
                        value="${escapeAttribute(
                            form.docNo ||
                            ""
                        )}"
                        placeholder="เว้นว่างเพื่อให้ระบบกำหนด"
                    >

                </div>

            </div>

            <div class="form-row">

                <div class="form-group">

                    <label class="form-label required">
                        จากบัญชี
                    </label>

                    <select
                        class="form-control"
                        id="transferFromAccountId"
                        required
                    >

                        <option value="">
                            เลือกบัญชีต้นทาง
                        </option>

                        ${renderAccountOptions(
                            form.fromAccountId ||
                            ""
                        )}

                    </select>

                </div>

                <div class="form-group">

                    <label class="form-label required">
                        ไปบัญชี
                    </label>

                    <select
                        class="form-control"
                        id="transferToAccountId"
                        required
                    >

                        <option value="">
                            เลือกบัญชีปลายทาง
                        </option>

                        ${renderAccountOptions(
                            form.toAccountId ||
                            ""
                        )}

                    </select>

                </div>

            </div>

            <div class="form-group">

                <label class="form-label required">
                    จำนวนเงิน
                </label>

                <div class="input-prefix">

                    <span class="input-prefix-symbol">
                        ฿
                    </span>

                    <input
                        type="number"
                        class="form-control currency-input"
                        id="transferAmount"
                        required
                        min="0"
                        step="0.01"
                        value="${escapeAttribute(
                            form.amount ||
                            ""
                        )}"
                    >

                </div>

            </div>

            <div class="form-group">

                <label class="form-label required">
                    รายละเอียด
                </label>

                <input
                    type="text"
                    class="form-control"
                    id="transferDescription"
                    required
                    value="${escapeAttribute(
                        form.description ||
                        ""
                    )}"
                    placeholder="รายละเอียดการโอน"
                >

            </div>

            <div class="form-group">

                <label class="form-label">
                    เลขอ้างอิง
                </label>

                <input
                    type="text"
                    class="form-control"
                    id="transferReference"
                    value="${escapeAttribute(
                        form.reference ||
                        ""
                    )}"
                    placeholder="เลขอ้างอิง"
                >

            </div>

        </form>
    `;

    const footer = `
        <button
            type="button"
            class="btn btn-outline-secondary"
            data-action="close-modal"
        >
            ยกเลิก
        </button>

        <button
            type="button"
            class="btn btn-primary"
            data-action="save-transfer"
        >
            ${isEdit ? "บันทึกการแก้ไข" : "บันทึกการโอน"}
        </button>
    `;

    openModal({
        title:
            isEdit
                ? "แก้ไขรายการโอน"
                : "โอนเงินระหว่างบัญชี",
        content: content,
        footer: footer,
        size: "modal-md"
    });
}

async function saveTransferFromModal() {
    const form =
        byId("transferForm");

    if (!form) {
        return;
    }

    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }

    const fromAccountId =
        valueOf(
            "transferFromAccountId"
        );

    const toAccountId =
        valueOf(
            "transferToAccountId"
        );

    if (
        fromAccountId &&
        toAccountId &&
        fromAccountId === toAccountId
    ) {
        showToast(
            "ข้อมูลไม่ถูกต้อง",
            "บัญชีต้นทางและปลายทางต้องไม่เป็นบัญชีเดียวกัน",
            "warning"
        );

        return;
    }

    const data = {
        id:
            valueOf("transferId"),
        date:
            valueOf("transferDate"),
        docNo:
            valueOf("transferDocNo"),
        fromAccountId:
            fromAccountId,
        toAccountId:
            toAccountId,
        amount:
            toNumber(
                valueOf("transferAmount")
            ),
        description:
            valueOf(
                "transferDescription"
            ),
        reference:
            valueOf(
                "transferReference"
            ),
        status: "ACTIVE"
    };

    if (data.amount <= 0) {
        showToast(
            "ข้อมูลไม่ถูกต้อง",
            "จำนวนเงินต้องมากกว่า 0",
            "warning"
        );
        return;
    }

    showLoading(
        "กำลังบันทึกการโอน..."
    );

    try {
        await apiRequest(
            "savetransfer",
            {
                data: data
            }
        );

        closeModal();

        showToast(
            "บันทึกสำเร็จ",
            "บันทึกการโอนเงินเรียบร้อยแล้ว",
            "success"
        );

        await navigateTo(
            "transfers"
        );
    } catch (error) {
        handleApiError(error);
    } finally {
        hideLoading();
    }
}

/* =========================================================
   34. ACCOUNT MODAL
   ========================================================= */

function openAccountModal(id) {
    const item =
        id
            ? getItemById(
                AppState.accounts,
                id
            )
            : null;

    const isEdit =
        Boolean(item);

    const content = `
        <form id="accountForm">

            <input
                type="hidden"
                id="accountId"
                value="${escapeAttribute(
                    item &&
                    item.id
                        ? item.id
                        : ""
                )}"
            >

            <div class="form-row">

                <div class="form-group">

                    <label class="form-label required">
                        รหัสบัญชี
                    </label>

                    <input
                        type="text"
                        class="form-control"
                        id="accountCode"
                        required
                        value="${escapeAttribute(
                            item &&
                            item.code
                                ? item.code
                                : ""
                        )}"
                    >

                </div>

                <div class="form-group">

                    <label class="form-label required">
                        ประเภทบัญชี
                    </label>

                    <select
                        class="form-control"
                        id="accountType"
                        required
                    >

                        <option value="">
                            เลือกประเภท
                        </option>

                        <option
                            value="CASH"
                            ${item && item.type === "CASH" ? "selected" : ""}
                        >
                            เงินสด
                        </option>

                        <option
                            value="BANK"
                            ${item && item.type === "BANK" ? "selected" : ""}
                        >
                            ธนาคาร
                        </option>

                        <option
                            value="WALLET"
                            ${item && item.type === "WALLET" ? "selected" : ""}
                        >
                            กระเป๋าเงิน
                        </option>

                        <option
                            value="OTHER"
                            ${item && item.type === "OTHER" ? "selected" : ""}
                        >
                            อื่น ๆ
                        </option>

                    </select>

                </div>

            </div>

            <div class="form-group">

                <label class="form-label required">
                    ชื่อบัญชี
                </label>

                <input
                    type="text"
                    class="form-control"
                    id="accountName"
                    required
                    value="${escapeAttribute(
                        item &&
                        item.name
                            ? item.name
                            : ""
                    )}"
                >

            </div>

            <div class="form-group">

                <label class="form-label">
                    ยอดยกมา
                </label>

                <input
                    type="number"
                    class="form-control currency-input"
                    id="accountOpeningBalance"
                    step="0.01"
                    value="${escapeAttribute(
                        item &&
                        item.openingBalance
                            ? item.openingBalance
                            : "0"
                    )}"
                >

            </div>

            <div class="form-group">

                <label class="form-label">
                    รายละเอียด
                </label>

                <textarea
                    class="form-control"
                    id="accountDescription"
                >${escapeHTML(
                    item &&
                    item.description
                        ? item.description
                        : ""
                )}</textarea>

            </div>

            <div class="form-check">

                <input
                    type="checkbox"
                    id="accountActive"
                    ${!item || item.active !== false ? "checked" : ""}
                >

                <label
                    class="form-check-label"
                    for="accountActive"
                >
                    เปิดใช้งานบัญชี
                </label>

            </div>

        </form>
    `;

    const footer = `
        <button
            type="button"
            class="btn btn-outline-secondary"
            data-action="close-modal"
        >
            ยกเลิก
        </button>

        <button
            type="button"
            class="btn btn-primary"
            data-action="save-account"
        >
            ${isEdit ? "บันทึกการแก้ไข" : "เพิ่มบัญชี"}
        </button>
    `;

    openModal({
        title:
            isEdit
                ? "แก้ไขบัญชี"
                : "เพิ่มบัญชี",
        content: content,
        footer: footer
    });
}

async function saveAccountFromModal() {
    const form =
        byId("accountForm");

    if (!form) {
        return;
    }

    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }

    const data = {
        id:
            valueOf("accountId"),
        code:
            valueOf("accountCode"),
        name:
            valueOf("accountName"),
        type:
            valueOf("accountType"),
        openingBalance:
            toNumber(
                valueOf(
                    "accountOpeningBalance"
                )
            ),
        description:
            valueOf(
                "accountDescription"
            ),
        active:
            Boolean(
                byId(
                    "accountActive"
                ) &&
                byId(
                    "accountActive"
                ).checked
            )
    };

    showLoading(
        "กำลังบันทึกบัญชี..."
    );

    try {
        const action =
            data.id
                ? "update"
                : "create";

        await apiRequest(
            action,
            {
                entity: "Accounts",
                id: data.id,
                data: data
            }
        );

        closeModal();

        showToast(
            "บันทึกสำเร็จ",
            "บันทึกข้อมูลบัญชีเรียบร้อยแล้ว",
            "success"
        );

        await navigateTo(
            "accounts"
        );
    } catch (error) {
        handleApiError(error);
    } finally {
        hideLoading();
    }
}

/* =========================================================
   35. CUSTOMER MODAL
   ========================================================= */

function openCustomerModal(id) {
    const item =
        id
            ? getItemById(
                AppState.customers,
                id
            )
            : null;

    const isEdit =
        Boolean(item);

    const content =
        renderPartyForm(
            item,
            "customer"
        );

    const footer = `
        <button
            type="button"
            class="btn btn-outline-secondary"
            data-action="close-modal"
        >
            ยกเลิก
        </button>

        <button
            type="button"
            class="btn btn-primary"
            data-action="save-customer"
        >
            ${isEdit ? "บันทึกการแก้ไข" : "เพิ่มลูกค้า"}
        </button>
    `;

    openModal({
        title:
            isEdit
                ? "แก้ไขข้อมูลลูกค้า"
                : "เพิ่มลูกค้า",
        content: content,
        footer: footer,
        size: "modal-lg"
    });
}

function openVendorModal(id) {
    const item =
        id
            ? getItemById(
                AppState.vendors,
                id
            )
            : null;

    const isEdit =
        Boolean(item);

    const content =
        renderPartyForm(
            item,
            "vendor"
        );

    const footer = `
        <button
            type="button"
            class="btn btn-outline-secondary"
            data-action="close-modal"
        >
            ยกเลิก
        </button>

        <button
            type="button"
            class="btn btn-primary"
            data-action="save-vendor"
        >
            ${isEdit ? "บันทึกการแก้ไข" : "เพิ่มผู้จำหน่าย"}
        </button>
    `;

    openModal({
        title:
            isEdit
                ? "แก้ไขข้อมูลผู้จำหน่าย"
                : "เพิ่มผู้จำหน่าย",
        content: content,
        footer: footer,
        size: "modal-lg"
    });
}

function renderPartyForm(item, type) {
    const prefix =
        type === "customer"
            ? "customer"
            : "vendor";

    return `
        <form id="${prefix}Form">

            <input
                type="hidden"
                id="${prefix}Id"
                value="${escapeAttribute(
                    item &&
                    item.id
                        ? item.id
                        : ""
                )}"
            >

            <div class="form-row">

                <div class="form-group">

                    <label class="form-label required">
                        รหัส
                    </label>

                    <input
                        type="text"
                        class="form-control"
                        id="${prefix}Code"
                        required
                        value="${escapeAttribute(
                            item &&
                            item.code
                                ? item.code
                                : ""
                        )}"
                    >

                </div>

                <div class="form-group">

                    <label class="form-label required">
                        ชื่อ
                    </label>

                    <input
                        type="text"
                        class="form-control"
                        id="${prefix}Name"
                        required
                        value="${escapeAttribute(
                            item &&
                            item.name
                                ? item.name
                                : ""
                        )}"
                    >

                </div>

            </div>

            <div class="form-row">

                <div class="form-group">

                    <label class="form-label">
                        เลขประจำตัวผู้เสียภาษี
                    </label>

                    <input
                        type="text"
                        class="form-control"
                        id="${prefix}TaxId"
                        value="${escapeAttribute(
                            item &&
                            item.taxId
                                ? item.taxId
                                : ""
                        )}"
                    >

                </div>

                <div class="form-group">

                    <label class="form-label">
                        ผู้ติดต่อ
                    </label>

                    <input
                        type="text"
                        class="form-control"
                        id="${prefix}ContactPerson"
                        value="${escapeAttribute(
                            item &&
                            item.contactPerson
                                ? item.contactPerson
                                : ""
                        )}"
                    >

                </div>

            </div>

            <div class="form-group">

                <label class="form-label">
                    ที่อยู่
                </label>

                <textarea
                    class="form-control"
                    id="${prefix}Address"
                >${escapeHTML(
                    item &&
                    item.address
                        ? item.address
                        : ""
                )}</textarea>

            </div>

            <div class="form-row">

                <div class="form-group">

                    <label class="form-label">
                        โทรศัพท์
                    </label>

                    <input
                        type="text"
                        class="form-control"
                        id="${prefix}Phone"
                        value="${escapeAttribute(
                            item &&
                            item.phone
                                ? item.phone
                                : ""
                        )}"
                    >

                </div>

                <div class="form-group">

                    <label class="form-label">
                        อีเมล
                    </label>

                    <input
                        type="email"
                        class="form-control"
                        id="${prefix}Email"
                        value="${escapeAttribute(
                            item &&
                            item.email
                                ? item.email
                                : ""
                        )}"
                    >

                </div>

            </div>

            <div class="form-group">

                <label class="form-label">
                    หมายเหตุ
                </label>

                <textarea
                    class="form-control"
                    id="${prefix}Notes"
                >${escapeHTML(
                    item &&
                    item.notes
                        ? item.notes
                        : ""
                )}</textarea>

            </div>

            <div class="form-check">

                <input
                    type="checkbox"
                    id="${prefix}Active"
                    ${!item || item.active !== false ? "checked" : ""}
                >

                <label
                    class="form-check-label"
                    for="${prefix}Active"
                >
                    เปิดใช้งาน
                </label>

            </div>

        </form>
    `;
}

async function savePartyFromModal(type) {
    const prefix =
        type === "customer"
            ? "customer"
            : "vendor";

    const entity =
        type === "customer"
            ? "Customers"
            : "Vendors";

    const form =
        byId(prefix + "Form");

    if (!form) {
        return;
    }

    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }

    const data = {
        id:
            valueOf(
                prefix + "Id"
            ),
        code:
            valueOf(
                prefix + "Code"
            ),
        name:
            valueOf(
                prefix + "Name"
            ),
        taxId:
            valueOf(
                prefix + "TaxId"
            ),
        address:
            valueOf(
                prefix + "Address"
            ),
        phone:
            valueOf(
                prefix + "Phone"
            ),
        email:
            valueOf(
                prefix + "Email"
            ),
        contactPerson:
            valueOf(
                prefix +
                "ContactPerson"
            ),
        notes:
            valueOf(
                prefix + "Notes"
            ),
        active:
            Boolean(
                byId(
                    prefix + "Active"
                ) &&
                byId(
                    prefix + "Active"
                ).checked
            )
    };

    showLoading(
        "กำลังบันทึกข้อมูล..."
    );

    try {
        await apiRequest(
            data.id
                ? "update"
                : "create",
            {
                entity: entity,
                id: data.id,
                data: data
            }
        );

        closeModal();

        showToast(
            "บันทึกสำเร็จ",
            "บันทึกข้อมูลเรียบร้อยแล้ว",
            "success"
        );

        await navigateTo(
            type === "customer"
                ? "customers"
                : "vendors"
        );
    } catch (error) {
        handleApiError(error);
    } finally {
        hideLoading();
    }
}

/* =========================================================
   36. USER MODAL
   ========================================================= */

function openUserModal(id) {
    if (!isAdmin()) {
        showToast(
            "ไม่มีสิทธิ์",
            "เฉพาะผู้ดูแลระบบเท่านั้น",
            "warning"
        );

        return;
    }

    const item =
        id
            ? getItemById(
                AppState.users,
                id
            )
            : null;

    const isEdit =
        Boolean(item);

    const content = `
        <form id="userForm">

            <input
                type="hidden"
                id="userId"
                value="${escapeAttribute(
                    item &&
                    item.id
                        ? item.id
                        : ""
                )}"
            >

            <div class="form-row">

                <div class="form-group">

                    <label class="form-label required">
                        ชื่อผู้ใช้งาน
                    </label>

                    <input
                        type="text"
                        class="form-control"
                        id="userUsername"
                        required
                        ${item && item.username === "sxaiq54" ? "readonly" : ""}
                        value="${escapeAttribute(
                            item &&
                            item.username
                                ? item.username
                                : ""
                        )}"
                    >

                </div>

                <div class="form-group">

                    <label class="form-label required">
                        ชื่อ-นามสกุล
                    </label>

                    <input
                        type="text"
                        class="form-control"
                        id="userFullName"
                        required
                        value="${escapeAttribute(
                            item &&
                            item.fullName
                                ? item.fullName
                                : ""
                        )}"
                    >

                </div>

            </div>

            <div class="form-row">

                <div class="form-group">

                    <label class="form-label ${isEdit ? "" : "required"}">
                        รหัสผ่าน
                    </label>

                    <input
                        type="password"
                        class="form-control"
                        id="userPassword"
                        ${isEdit ? "" : "required"}
                        autocomplete="new-password"
                        placeholder="${isEdit ? "เว้นว่างหากไม่ต้องการเปลี่ยน" : "กำหนดรหัสผ่าน"}"
                    >

                </div>

                <div class="form-group">

                    <label class="form-label required">
                        สิทธิ์
                    </label>

                    <select
                        class="form-control"
                        id="userRole"
                        required
                        ${item && item.username === "sxaiq54" ? "disabled" : ""}
                    >

                        <option
                            value="admin"
                            ${item && item.role === "admin" ? "selected" : ""}
                        >
                            ผู้ดูแลระบบ
                        </option>

                        <option
                            value="manager"
                            ${item && item.role === "manager" ? "selected" : ""}
                        >
                            ผู้จัดการ
                        </option>

                        <option
                            value="staff"
                            ${!item || item.role === "staff" ? "selected" : ""}
                        >
                            เจ้าหน้าที่
                        </option>

                        <option
                            value="user"
                            ${item && item.role === "user" ? "selected" : ""}
                        >
                            ผู้ใช้งาน
                        </option>

                    </select>

                </div>

            </div>

            <div class="form-check">

                <input
                    type="checkbox"
                    id="userActive"
                    ${!item || item.active !== false ? "checked" : ""}
                    ${item && item.username === "sxaiq54" ? "disabled" : ""}
                >

                <label
                    class="form-check-label"
                    for="userActive"
                >
                    เปิดใช้งานผู้ใช้งาน
                </label>

            </div>

        </form>
    `;

    const footer = `
        <button
            type="button"
            class="btn btn-outline-secondary"
            data-action="close-modal"
        >
            ยกเลิก
        </button>

        <button
            type="button"
            class="btn btn-primary"
            data-action="save-user"
        >
            ${isEdit ? "บันทึกการแก้ไข" : "เพิ่มผู้ใช้งาน"}
        </button>
    `;

    openModal({
        title:
            isEdit
                ? "แก้ไขผู้ใช้งาน"
                : "เพิ่มผู้ใช้งาน",
        content: content,
        footer: footer
    });
}

async function saveUserFromModal() {
    const form =
        byId("userForm");

    if (!form) {
        return;
    }

    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }

    const id =
        valueOf("userId");

    const password =
        valueOf("userPassword");

    if (!id && !password) {
        showToast(
            "ข้อมูลไม่ครบ",
            "กรุณากำหนดรหัสผ่าน",
            "warning"
        );

        return;
    }

    const data = {
        id: id,
        username:
            valueOf("userUsername"),
        fullName:
            valueOf("userFullName"),
        role:
            valueOf("userRole"),
        active:
            Boolean(
                byId("userActive") &&
                byId("userActive").checked
            )
    };

    if (password) {
        data.password =
            password;
    }

    showLoading(
        "กำลังบันทึกผู้ใช้งาน..."
    );

    try {
        await apiRequest(
            id
                ? "update"
                : "create",
            {
                entity: "Users",
                id: id,
                data: data
            }
        );

        closeModal();

        showToast(
            "บันทึกสำเร็จ",
            "บันทึกข้อมูลผู้ใช้งานเรียบร้อยแล้ว",
            "success"
        );

        await navigateTo(
            "users"
        );
    } catch (error) {
        handleApiError(error);
    } finally {
        hideLoading();
    }
}

/* =========================================================
   37. DOCUMENT MODAL
   ========================================================= */

async function openDocumentModal(id) {
    let item = null;

    if (id) {
        item = getItemById(
            AppState.documents,
            id
        );
    }

    if (id && !item) {
        showLoading(
            "กำลังโหลดเอกสาร..."
        );

        try {
            const result =
                await apiRequest(
                    "getDocumentWithItems",
                    {
                        id: id
                    }
                );

            item =
                result.data &&
                result.data.document
                    ? result.data.document
                    : null;
        } catch (error) {
            handleApiError(error);
            hideLoading();
            return;
        } finally {
            hideLoading();
        }
    }

    const isEdit =
        Boolean(item);

    AppState.documentItems =
        item &&
        Array.isArray(
            item.items
        )
            ? item.items.map(
                function (row) {
                    return Object.assign(
                        {},
                        row
                    );
                }
            )
            : [];

    if (
        !AppState.documentItems.length
    ) {
        AppState.documentItems = [
            createDocumentItem()
        ];
    }

    const form =
        item
            ? Object.assign(
                {},
                AppState.documentForm,
                item
            )
            : Object.assign(
                {},
                AppState.documentForm,
                {
                    date:
                        getTodayString(),
                    docType:
                        "QUOTATION",
                    status:
                        "DRAFT"
                }
            );

    const content = `
        <form id="documentForm">

            <input
                type="hidden"
                id="documentId"
                value="${escapeAttribute(
                    form.id ||
                    ""
                )}"
            >

            <div class="form-row-3">

                <div class="form-group">

                    <label class="form-label required">
                        ประเภทเอกสาร
                    </label>

                    <select
                        class="form-control"
                        id="documentDocType"
                        required
                    >

                        ${renderDocumentTypeOptions(
                            form.docType ||
                            "QUOTATION"
                        )}

                    </select>

                </div>

                <div class="form-group">

                    <label class="form-label required">
                        วันที่
                    </label>

                    <input
                        type="date"
                        class="form-control"
                        id="documentDate"
                        required
                        value="${escapeAttribute(
                            formatDateInput(
                                form.date
                            )
                        )}"
                    >

                </div>

                <div class="form-group">

                    <label class="form-label">
                        เลขที่เอกสาร
                    </label>

                    <input
                        type="text"
                        class="form-control"
                        id="documentDocNo"
                        value="${escapeAttribute(
                            form.docNo ||
                            ""
                        )}"
                        placeholder="ระบบสร้างอัตโนมัติ"
                    >

                </div>

            </div>

            <div class="form-row-3">

                <div class="form-group">

                    <label class="form-label">
                        ลูกค้า
                    </label>

                    <select
                        class="form-control"
                        id="documentCustomerId"
                    >

                        <option value="">
                            เลือกลูกค้า
                        </option>

                        ${renderCustomerOptions(
                            form.customerId ||
                            ""
                        )}

                    </select>

                </div>

                <div class="form-group">

                    <label class="form-label">
                        ผู้จำหน่าย / เจ้าหนี้
                    </label>

                    <select
                        class="form-control"
                        id="documentVendorId"
                    >

                        <option value="">
                            เลือกผู้จำหน่าย
                        </option>

                        ${renderVendorOptions(
                            form.vendorId ||
                            ""
                        )}

                    </select>

                </div>

                <div class="form-group">

                    <label class="form-label">
                        วันครบกำหนด
                    </label>

                    <input
                        type="date"
                        class="form-control"
                        id="documentDueDate"
                        value="${escapeAttribute(
                            formatDateInput(
                                form.dueDate
                            )
                        )}"
                    >

                </div>

            </div>

            <div class="form-group">

                <label class="form-label">
                    ชื่อผู้ติดต่อ
                </label>

                <input
                    type="text"
                    class="form-control"
                    id="documentPartyName"
                    value="${escapeAttribute(
                        form.partyName ||
                        ""
                    )}"
                    placeholder="กรณีไม่ได้เลือกจากทะเบียน"
                >

            </div>

            <div class="form-row">

                <div class="form-group">

                    <label class="form-label">
                        เลขประจำตัวผู้เสียภาษี
                    </label>

                    <input
                        type="text"
                        class="form-control"
                        id="documentTaxId"
                        value="${escapeAttribute(
                            form.taxId ||
                            ""
                        )}"
                    >

                </div>

                <div class="form-group">

                    <label class="form-label">
                        โทรศัพท์
                    </label>

                    <input
                        type="text"
                        class="form-control"
                        id="documentPhone"
                        value="${escapeAttribute(
                            form.phone ||
                            ""
                        )}"
                    >

                </div>

            </div>

            <div class="form-group">

                <label class="form-label">
                    ที่อยู่
                </label>

                <textarea
                    class="form-control"
                    id="documentAddress"
                >${escapeHTML(
                    form.address ||
                    ""
                )}</textarea>

            </div>

            <div class="form-group">

                <label class="form-label">
                    หัวข้อ
                </label>

                <input
                    type="text"
                    class="form-control"
                    id="documentSubject"
                    value="${escapeAttribute(
                        form.subject ||
                        ""
                    )}"
                    placeholder="หัวข้อเอกสาร"
                >

            </div>

            <div class="card mt-3">

                <div class="card-header">

                    <div class="card-title">
                        รายการสินค้า / บริการ
                    </div>

                    <button
                        type="button"
                        class="btn btn-sm btn-primary"
                        data-action="add-document-item"
                    >
                        ＋ เพิ่มรายการ
                    </button>

                </div>

                <div class="card-body">

                    <div class="table-wrapper">

                        <table class="data-table document-item-table">

                            <thead>

                                <tr>

                                    <th>
                                        รายละเอียด
                                    </th>

                                    <th>
                                        จำนวน
                                    </th>

                                    <th>
                                        หน่วย
                                    </th>

                                    <th>
                                        ราคาต่อหน่วย
                                    </th>

                                    <th>
                                        ส่วนลด
                                    </th>

                                    <th>
                                        รวม
                                    </th>

                                    <th>
                                        ลบ
                                    </th>

                                </tr>

                            </thead>

                            <tbody id="documentItemsBody">

                            </tbody>

                        </table>

                    </div>

                </div>

            </div>

            <div class="document-summary">

                <div class="summary-row">

                    <span>
                        รวมก่อนส่วนลด
                    </span>

                    <strong id="documentSubtotalDisplay">
                        ${formatMoney(
                            form.subtotal ||
                            0
                        )}
                    </strong>

                </div>

                <div class="summary-row">

                    <span>
                        ส่วนลด
                    </span>

                    <div style="width:160px;">
                        <input
                            type="number"
                            class="form-control currency-input"
                            id="documentDiscount"
                            min="0"
                            step="0.01"
                            value="${escapeAttribute(
                                form.discount ||
                                0
                            )}"
                        >
                    </div>

                </div>

                <div class="summary-row">

                    <span>
                        VAT %
                    </span>

                    <div style="width:160px;">
                        <input
                            type="number"
                            class="form-control currency-input"
                            id="documentTaxRate"
                            min="0"
                            step="0.01"
                            value="${escapeAttribute(
                                form.taxRate ||
                                0
                            )}"
                        >
                    </div>

                </div>

                <div class="summary-row">

                    <span>
                        ภาษี
                    </span>

                    <strong id="documentTaxAmountDisplay">
                        ${formatMoney(
                            form.taxAmount ||
                            0
                        )}
                    </strong>

                </div>

                <div class="summary-row total">

                    <span>
                        รวมทั้งสิ้น
                    </span>

                    <strong id="documentTotalDisplay">
                        ${formatMoney(
                            form.total ||
                            0
                        )}
                    </strong>

                </div>

            </div>

            <div class="form-group mt-3">

                <label class="form-label">
                    หมายเหตุ
                </label>

                <textarea
                    class="form-control"
                    id="documentNotes"
                >${escapeHTML(
                    form.notes ||
                    ""
                )}</textarea>

            </div>

        </form>
    `;

    const footer = `
        <button
            type="button"
            class="btn btn-outline-secondary"
            data-action="close-modal"
        >
            ยกเลิก
        </button>

        <button
            type="button"
            class="btn btn-primary"
            data-action="save-document"
        >
            ${isEdit ? "บันทึกการแก้ไข" : "บันทึกเอกสาร"}
        </button>
    `;

    openModal({
        title:
            isEdit
                ? "แก้ไขเอกสาร"
                : "สร้างเอกสาร",
        content: content,
        footer: footer,
        size: "modal-xl"
    });

    renderDocumentItems();

    calculateDocumentTotals();

    bindDocumentPartyEvents();
}

function createDocumentItem() {
    return {
        id: "",
        documentId: "",
        lineNo:
            AppState.documentItems.length + 1,
        description: "",
        qty: 1,
        unit: "รายการ",
        unitPrice: 0,
        discount: 0,
        amount: 0
    };
}

function renderDocumentItems() {
    const body =
        byId(
            "documentItemsBody"
        );

    if (!body) {
        return;
    }

    setHTML(
        body,
        AppState.documentItems
            .map(function (item, index) {
                const amount =
                    calculateDocumentItemAmount(
                        item
                    );

                return `
                    <tr>

                        <td>
                            <input
                                type="text"
                                class="form-control"
                                data-document-item-field="description"
                                data-index="${index}"
                                value="${escapeAttribute(
                                    item.description ||
                                    ""
                                )}"
                                placeholder="รายละเอียด"
                            >
                        </td>

                        <td>
                            <input
                                type="number"
                                class="form-control number-input"
                                data-document-item-field="qty"
                                data-index="${index}"
                                min="0"
                                step="0.01"
                                value="${escapeAttribute(
                                    item.qty ||
                                    0
                                )}"
                            >
                        </td>

                        <td>
                            <input
                                type="text"
                                class="form-control"
                                data-document-item-field="unit"
                                data-index="${index}"
                                value="${escapeAttribute(
                                    item.unit ||
                                    ""
                                )}"
                            >
                        </td>

                        <td>
                            <input
                                type="number"
                                class="form-control currency-input"
                                data-document-item-field="unitPrice"
                                data-index="${index}"
                                min="0"
                                step="0.01"
                                value="${escapeAttribute(
                                    item.unitPrice ||
                                    0
                                )}"
                            >
                        </td>

                        <td>
                            <input
                                type="number"
                                class="form-control currency-input"
                                data-document-item-field="discount"
                                data-index="${index}"
                                min="0"
                                step="0.01"
                                value="${escapeAttribute(
                                    item.discount ||
                                    0
                                )}"
                            >
                        </td>

                        <td class="text-right">
                            <strong>
                                ${formatMoney(
                                    amount
                                )}
                            </strong>
                        </td>

                        <td class="text-center">

                            <button
                                type="button"
                                class="btn btn-sm btn-outline-danger"
                                data-action="remove-document-item"
                                data-index="${index}"
                            >
                                ×
                            </button>

                        </td>

                    </tr>
                `;
            })
            .join("")
    );

    $$(
        "[data-document-item-field]",
        body
    ).forEach(
        function (input) {
            input.addEventListener(
                "input",
                function () {
                    const index =
                        Number(
                            input.getAttribute(
                                "data-index"
                            )
                        );

                    const field =
                        input.getAttribute(
                            "data-document-item-field"
                        );

                    if (
                        !AppState.documentItems[
                            index
                        ]
                    ) {
                        return;
                    }

                    let value =
                        input.value;

                    if (
                        field === "qty" ||
                        field === "unitPrice" ||
                        field === "discount"
                    ) {
                        value =
                            toNumber(value);
                    }

                    AppState.documentItems[
                        index
                    ][field] = value;

                    renderDocumentItems();

                    calculateDocumentTotals();
                }
            );
        }
    );
}

function calculateDocumentItemAmount(item) {
    const qty =
        toNumber(
            item.qty
        );

    const unitPrice =
        toNumber(
            item.unitPrice
        );

    const discount =
        toNumber(
            item.discount
        );

    return Math.max(
        0,
        qty * unitPrice - discount
    );
}

function calculateDocumentTotals() {
    const subtotal =
        AppState.documentItems.reduce(
            function (sum, item) {
                return (
                    sum +
                    calculateDocumentItemAmount(
                        item
                    )
                );
            },
            0
        );

    const discount =
        toNumber(
            valueOf(
                "documentDiscount"
            )
        );

    const taxRate =
        toNumber(
            valueOf(
                "documentTaxRate"
            )
        );

    const taxable =
        Math.max(
            0,
            subtotal - discount
        );

    const taxAmount =
        taxable *
        (taxRate / 100);

    const total =
        taxable +
        taxAmount;

    setText(
        byId(
            "documentSubtotalDisplay"
        ),
        formatMoney(
            subtotal
        )
    );

    setText(
        byId(
            "documentTaxAmountDisplay"
        ),
        formatMoney(
            taxAmount
        )
    );

    setText(
        byId(
            "documentTotalDisplay"
        ),
        formatMoney(
            total
        )
    );

    return {
        subtotal:
            subtotal,
        discount:
            discount,
        taxRate:
            taxRate,
        taxAmount:
            taxAmount,
        total:
            total
    };
}

function bindDocumentPartyEvents() {
    const customer =
        byId(
            "documentCustomerId"
        );

    const vendor =
        byId(
            "documentVendorId"
        );

    if (customer) {
        customer.addEventListener(
            "change",
            function () {
                const item =
                    getCustomerById(
                        customer.value
                    );

                if (!item) {
                    return;
                }

                setValue(
                    "documentPartyName",
                    item.name || ""
                );

                setValue(
                    "documentTaxId",
                    item.taxId || ""
                );

                setValue(
                    "documentAddress",
                    item.address || ""
                );

                setValue(
                    "documentPhone",
                    item.phone || ""
                );
            }
        );
    }

    if (vendor) {
        vendor.addEventListener(
            "change",
            function () {
                const item =
                    getVendorById(
                        vendor.value
                    );

                if (!item) {
                    return;
                }

                setValue(
                    "documentPartyName",
                    item.name || ""
                );

                setValue(
                    "documentTaxId",
                    item.taxId || ""
                );

                setValue(
                    "documentAddress",
                    item.address || ""
                );

                setValue(
                    "documentPhone",
                    item.phone || ""
                );
            }
        );
    }

    const discount =
        byId(
            "documentDiscount"
        );

    const taxRate =
        byId(
            "documentTaxRate"
        );

    if (discount) {
        discount.addEventListener(
            "input",
            calculateDocumentTotals
        );
    }

    if (taxRate) {
        taxRate.addEventListener(
            "input",
            calculateDocumentTotals
        );
    }
}

async function saveDocumentFromModal() {
    const form =
        byId(
            "documentForm"
        );

    if (!form) {
        return;
    }

    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }

    if (
        !AppState.documentItems.length
    ) {
        showToast(
            "ข้อมูลไม่ครบ",
            "กรุณาเพิ่มรายการในเอกสารอย่างน้อย 1 รายการ",
            "warning"
        );

        return;
    }

    const totals =
        calculateDocumentTotals();

    const data = {
        id:
            valueOf(
                "documentId"
            ),
        docNo:
            valueOf(
                "documentDocNo"
            ),
        docType:
            valueOf(
                "documentDocType"
            ),
        date:
            valueOf(
                "documentDate"
            ),
        dueDate:
            valueOf(
                "documentDueDate"
            ),
        customerId:
            valueOf(
                "documentCustomerId"
            ),
        vendorId:
            valueOf(
                "documentVendorId"
            ),
        partyName:
            valueOf(
                "documentPartyName"
            ),
        taxId:
            valueOf(
                "documentTaxId"
            ),
        address:
            valueOf(
                "documentAddress"
            ),
        phone:
            valueOf(
                "documentPhone"
            ),
        subject:
            valueOf(
                "documentSubject"
            ),
        subtotal:
            totals.subtotal,
        discount:
            totals.discount,
        taxRate:
            totals.taxRate,
        taxAmount:
            totals.taxAmount,
        total:
            totals.total,
        notes:
            valueOf(
                "documentNotes"
            ),
        status:
            "DRAFT",
        items:
            AppState.documentItems.map(
                function (item, index) {
                    return Object.assign(
                        {},
                        item,
                        {
                            lineNo:
                                index + 1,
                            amount:
                                calculateDocumentItemAmount(
                                    item
                                )
                        }
                    );
                }
            )
    };

    showLoading(
        "กำลังบันทึกเอกสาร..."
    );

    try {
        await apiRequest(
            "savedocument",
            {
                data:
                    data
            }
        );

        closeModal();

        showToast(
            "บันทึกสำเร็จ",
            "บันทึกเอกสารเรียบร้อยแล้ว",
            "success"
        );

        await navigateTo(
            "documents"
        );
    } catch (error) {
        handleApiError(error);
    } finally {
        hideLoading();
    }
}

/* =========================================================
   38. DOCUMENT VIEW
   ========================================================= */

async function viewDocument(id, printAfterLoad) {
    showLoading(
        "กำลังโหลดเอกสาร..."
    );

    try {
        const result =
            await apiRequest(
                "getDocumentWithItems",
                {
                    id: id
                }
            );

        const data =
            result.data || {};

        const document =
            data.document ||
            data;

        const items =
            data.items ||
            document.items ||
            [];

        const content =
            renderDocumentPreview(
                document,
                items
            );

        openModal({
            title:
                "ดูเอกสาร " +
                (
                    document.docNo ||
                    ""
                ),
            content:
                content,
            footer: `
                <button
                    type="button"
                    class="btn btn-outline-secondary"
                    data-action="close-modal"
                >
                    ปิด
                </button>

                <button
                    type="button"
                    class="btn btn-primary"
                    data-action="print-current-document"
                >
                    พิมพ์ / PDF
                </button>
            `,
            size: "modal-xl"
        });

        if (printAfterLoad) {
            setTimeout(
                function () {
                    printDocumentPreview(
                        document,
                        items
                    );
                },
                300
            );
        }
    } catch (error) {
        handleApiError(error);
    } finally {
        hideLoading();
    }
}

function renderDocumentPreview(
    document,
    items
) {
    const businessName =
        AppState.settings.business_name ||
        AppState.settings.company_name ||
        "กิจการ";

    const businessAddress =
        AppState.settings.address ||
        "";

    const businessTaxId =
        AppState.settings.tax_id ||
        "";

    const subtotal =
        toNumber(
            document.subtotal
        );

    const discount =
        toNumber(
            document.discount
        );

    const taxAmount =
        toNumber(
            document.taxAmount
        );

    const total =
        toNumber(
            document.total
        );

    return `
        <div
            class="document-preview"
            id="currentDocumentPreview"
        >

            <div class="document-preview-header">

                <div>

                    <div class="document-preview-title">
                        ${escapeHTML(
                            getDocumentTypeName(
                                document.docType
                            )
                        )}
                    </div>

                    <div class="document-preview-company">
                        <div class="document-preview-company-name">
                            ${escapeHTML(
                                businessName
                            )}
                        </div>

                        <div class="document-preview-company-info">
                            ${escapeHTML(
                                businessAddress
                            )}
                        </div>

                        ${
                            businessTaxId
                                ? `
                                    <div class="document-preview-company-info">
                                        เลขประจำตัวผู้เสียภาษี ${escapeHTML(
                                            businessTaxId
                                        )}
                                    </div>
                                `
                                : ""
                        }

                    </div>

                </div>

                <div class="document-preview-number">

                    <div>
                        เลขที่:
                        <strong>
                            ${escapeHTML(
                                document.docNo ||
                                "-"
                            )}
                        </strong>
                    </div>

                    <div>
                        วันที่:
                        ${formatDate(
                            document.date
                        )}
                    </div>

                    ${
                        document.dueDate
                            ? `
                                <div>
                                    ครบกำหนด:
                                    ${formatDate(
                                        document.dueDate
                                    )}
                                </div>
                            `
                            : ""
                    }

                </div>

            </div>

            <div class="document-party-box">

                <div class="info-grid">

                    <div class="info-item">

                        <div class="info-label">
                            ผู้ติดต่อ
                        </div>

                        <div class="info-value">
                            ${escapeHTML(
                                document.partyName ||
                                "-"
                            )}
                        </div>

                    </div>

                    <div class="info-item">

                        <div class="info-label">
                            เลขประจำตัวผู้เสียภาษี
                        </div>

                        <div class="info-value">
                            ${escapeHTML(
                                document.taxId ||
                                "-"
                            )}
                        </div>

                    </div>

                    <div class="info-item">

                        <div class="info-label">
                            โทรศัพท์
                        </div>

                        <div class="info-value">
                            ${escapeHTML(
                                document.phone ||
                                "-"
                            )}
                        </div>

                    </div>

                    <div class="info-item">

                        <div class="info-label">
                            หัวข้อ
                        </div>

                        <div class="info-value">
                            ${escapeHTML(
                                document.subject ||
                                "-"
                            )}
                        </div>

                    </div>

                </div>

                ${
                    document.address
                        ? `
                            <div class="info-item">
                                <div class="info-label">
                                    ที่อยู่
                                </div>

                                <div class="info-value">
                                    ${escapeHTML(
                                        document.address
                                    )}
                                </div>
                            </div>
                        `
                        : ""
                }

            </div>

            <div class="document-preview-table">

                <table>

                    <thead>

                        <tr>

                            <th style="width:60px;">
                                ลำดับ
                            </th>

                            <th>
                                รายการ
                            </th>

                            <th style="width:80px;">
                                จำนวน
                            </th>

                            <th style="width:90px;">
                                หน่วย
                            </th>

                            <th style="width:120px;">
                                ราคา
                            </th>

                            <th style="width:130px;">
                                รวม
                            </th>

                        </tr>

                    </thead>

                    <tbody>

                        ${
                            items.length
                                ? items
                                    .map(
                                        function (
                                            item,
                                            index
                                        ) {
                                            return `
                                                <tr>

                                                    <td class="text-center">
                                                        ${index + 1}
                                                    </td>

                                                    <td>
                                                        ${escapeHTML(
                                                            item.description ||
                                                            "-"
                                                        )}
                                                    </td>

                                                    <td class="text-right">
                                                        ${formatMoney(
                                                            item.qty ||
                                                            0
                                                        )}
                                                    </td>

                                                    <td class="text-center">
                                                        ${escapeHTML(
                                                            item.unit ||
                                                            ""
                                                        )}
                                                    </td>

                                                    <td class="text-right">
                                                        ${formatMoney(
                                                            item.unitPrice ||
                                                            0
                                                        )}
                                                    </td>

                                                    <td class="text-right">
                                                        ${formatMoney(
                                                            item.amount ||
                                                            calculateDocumentItemAmount(
                                                                item
                                                            )
                                                        )}
                                                    </td>

                                                </tr>
                                            `;
                                        }
                                    )
                                    .join("")
                                : `
                                    <tr>
                                        <td
                                            colspan="6"
                                            class="text-center"
                                        >
                                            ไม่มีรายการ
                                        </td>
                                    </tr>
                                `
                        }

                    </tbody>

                </table>

            </div>

            <div class="document-preview-summary">

                <div class="summary-row">

                    <span>
                        รวมก่อนส่วนลด
                    </span>

                    <strong>
                        ${formatMoney(
                            subtotal
                        )}
                    </strong>

                </div>

                <div class="summary-row">

                    <span>
                        ส่วนลด
                    </span>

                    <strong>
                        ${formatMoney(
                            discount
                        )}
                    </strong>

                </div>

                <div class="summary-row">

                    <span>
                        ภาษี
                        ${document.taxRate
                            ? "(" +
                              formatMoney(
                                  document.taxRate
                              ) +
                              "%)"
                            : ""}
                    </span>

                    <strong>
                        ${formatMoney(
                            taxAmount
                        )}
                    </strong>

                </div>

                <div class="summary-row total">

                    <span>
                        รวมทั้งสิ้น
                    </span>

                    <strong>
                        ${formatMoney(
                            total
                        )}
                    </strong>

                </div>

            </div>

            ${
                document.notes
                    ? `
                        <div class="mt-4">
                            <strong>
                                หมายเหตุ
                            </strong>

                            <div class="notice mt-2">
                                ${escapeHTML(
                                    document.notes
                                )}
                            </div>
                        </div>
                    `
                    : ""
            }

            <div class="document-preview-signatures">

                <div class="signature-box">

                    <div class="signature-line"></div>

                    <div class="signature-name">
                        ผู้จัดทำ
                    </div>

                    <div class="signature-position">
                        วันที่ __________________
                    </div>

                </div>

                <div class="signature-box">

                    <div class="signature-line"></div>

                    <div class="signature-name">
                        ผู้อนุมัติ / ผู้รับเอกสาร
                    </div>

                    <div class="signature-position">
                        วันที่ __________________
                    </div>

                </div>

            </div>

        </div>
    `;
}

function printDocumentPreview(
    document,
    items
) {
    const preview =
        renderDocumentPreview(
            document,
            items
        );

    const printWindow =
        window.open(
            "",
            "_blank"
        );

    if (!printWindow) {
        showToast(
            "ไม่สามารถเปิดหน้าพิมพ์",
            "กรุณาอนุญาต Pop-up สำหรับเว็บไซต์นี้",
            "warning"
        );

        return;
    }

    printWindow.document.open();

    printWindow.document.write(
        `
        <!DOCTYPE html>

        <html lang="th">

        <head>

            <meta charset="UTF-8">

            <title>
                ${escapeHTML(
                    document.docNo ||
                    "Document"
                )}
            </title>

            <style>

                @page {
                    size: A4;
                    margin: 0;
                }

                * {
                    box-sizing: border-box;
                }

                body {
                    margin: 0;
                    padding: 0;
                    background: #ffffff;
                    color: #222222;
                    font-family:
                        "TH Sarabun New",
                        "TH Sarabun",
                        Tahoma,
                        Arial,
                        sans-serif;
                    font-size: 17px;
                }

                .document-preview {
                    width: 210mm;
                    min-height: 297mm;
                    margin: 0 auto;
                    padding: 15mm;
                    background: #ffffff;
                }

                .document-preview-header {
                    padding-bottom: 20px;
                    display: flex;
                    align-items: flex-start;
                    justify-content: space-between;
                    gap: 25px;
                    border-bottom: 2px solid #263238;
                }

                .document-preview-title {
                    color: #263238;
                    font-size: 32px;
                    font-weight: 700;
                }

                .document-preview-number {
                    text-align: right;
                    color: #555555;
                    font-size: 17px;
                }

                .document-preview-company {
                    margin-top: 20px;
                }

                .document-preview-company-name {
                    color: #263238;
                    font-size: 25px;
                    font-weight: 700;
                }

                .document-preview-company-info {
                    color: #555555;
                    font-size: 17px;
                }

                .document-party-box {
                    margin-top: 15px;
                    padding: 12px;
                    background: #fafafa;
                    border: 1px solid #dddddd;
                }

                .info-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                }

                .info-item {
                    padding: 7px 9px;
                    border-bottom: 1px solid #eeeeee;
                }

                .info-label {
                    color: #777777;
                    font-size: 14px;
                }

                .info-value {
                    color: #222222;
                    font-size: 17px;
                    font-weight: 700;
                }

                .document-preview-table {
                    margin-top: 25px;
                }

                .document-preview-table table {
                    width: 100%;
                    border-collapse: collapse;
                }

                .document-preview-table th {
                    padding: 8px;
                    border-top: 1px solid #222222;
                    border-bottom: 1px solid #222222;
                    font-weight: 700;
                    text-align: left;
                }

                .document-preview-table td {
                    padding: 8px;
                    border-bottom: 1px solid #dddddd;
                }

                .text-right {
                    text-align: right;
                }

                .text-center {
                    text-align: center;
                }

                .document-preview-summary {
                    width: 330px;
                    max-width: 100%;
                    margin: 20px 0 0 auto;
                }

                .summary-row {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 5px 0;
                }

                .summary-row.total {
                    margin-top: 7px;
                    padding-top: 10px;
                    border-top: 1px solid #222222;
                    font-size: 23px;
                    font-weight: 700;
                }

                .mt-4 {
                    margin-top: 20px;
                }

                .notice {
                    padding: 10px;
                    border: 1px solid #dddddd;
                    background: #fafafa;
                }

                .document-preview-signatures {
                    margin-top: 70px;
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 50px;
                }

                .signature-box {
                    text-align: center;
                }

                .signature-line {
                    width: 80%;
                    margin: 50px auto 7px;
                    border-bottom: 1px solid #222222;
                }

                .signature-name {
                    font-weight: 700;
                }

                .signature-position {
                    color: #666666;
                }

            </style>

        </head>

        <body>

            ${preview}

            <script>
                window.onload = function () {
                    window.print();

                    setTimeout(
                        function () {
                            window.close();
                        },
                        500
                    );
                };
            <\/script>

        </body>

        </html>
        `
    );

    printWindow.document.close();
}

/* =========================================================
   39. DELETE / CANCEL
   ========================================================= */

async function deleteEntity(
    entity,
    id,
    title
) {
    if (!id) {
        return;
    }

    if (!canDelete()) {
        showToast(
            "ไม่มีสิทธิ์",
            "คุณไม่มีสิทธิ์ลบข้อมูล",
            "warning"
        );

        return;
    }

    const confirmed =
        await confirmAction(
            "ยืนยันการลบ",
            "คุณต้องการลบ " +
                (
                    title ||
                    "รายการนี้"
                ) +
                " ใช่หรือไม่?"
        );

    if (!confirmed) {
        return;
    }

    showLoading(
        "กำลังดำเนินการ..."
    );

    try {
        await apiRequest(
            "delete",
            {
                entity: entity,
                id: id
            }
        );

        showToast(
            "ดำเนินการสำเร็จ",
            "ลบข้อมูลเรียบร้อยแล้ว",
            "success"
        );

        const page =
            entity === "Accounts"
                ? "accounts"
                : entity === "Customers"
                    ? "customers"
                    : entity === "Vendors"
                        ? "vendors"
                        : entity === "Users"
                            ? "users"
                            : entity === "Income"
                                ? "incomes"
                                : entity === "Expense"
                                    ? "expenses"
                                    : entity === "Transfers"
                                        ? "transfers"
                                        : "dashboard";

        await navigateTo(
            page
        );
    } catch (error) {
        handleApiError(error);
    } finally {
        hideLoading();
    }
}

async function cancelDocument(id) {
    const confirmed =
        await confirmAction(
            "ยืนยันการยกเลิก",
            "เอกสารที่ยกเลิกแล้วจะไม่ควรถูกนำไปใช้งานต่อ ต้องการยกเลิกเอกสารนี้หรือไม่?"
        );

    if (!confirmed) {
        return;
    }

    showLoading(
        "กำลังยกเลิกเอกสาร..."
    );

    try {
        await apiRequest(
            "cancelDocument",
            {
                id: id
            }
        );

        showToast(
            "ยกเลิกสำเร็จ",
            "ยกเลิกเอกสารเรียบร้อยแล้ว",
            "success"
        );

        await navigateTo(
            "documents"
        );
    } catch (error) {
        handleApiError(error);
    } finally {
        hideLoading();
    }
}

/* =========================================================
   40. CONFIRM
   ========================================================= */

function confirmAction(
    title,
    message
) {
    return new Promise(
        function (resolve) {
            const content = `
                <div class="confirm-dialog">

                    <div class="confirm-icon">
                        !
                    </div>

                    <div class="confirm-title">
                        ${escapeHTML(
                            title ||
                            "ยืนยัน"
                        )}
                    </div>

                    <div class="confirm-message">
                        ${escapeHTML(
                            message ||
                            ""
                        )}
                    </div>

                </div>
            `;

            const footer = `
                <button
                    type="button"
                    class="btn btn-outline-secondary"
                    id="confirmCancelButton"
                >
                    ยกเลิก
                </button>

                <button
                    type="button"
                    class="btn btn-danger"
                    id="confirmOkButton"
                >
                    ยืนยัน
                </button>
            `;

            openModal({
                title:
                    title ||
                    "ยืนยัน",
                content:
                    content,
                footer:
                    footer,
                size:
                    "modal-sm"
            });

            const ok =
                byId(
                    "confirmOkButton"
                );

            const cancel =
                byId(
                    "confirmCancelButton"
                );

            if (ok) {
                ok.addEventListener(
                    "click",
                    function () {
                        closeModal();
                        resolve(true);
                    }
                );
            }

            if (cancel) {
                cancel.addEventListener(
                    "click",
                    function () {
                        closeModal();
                        resolve(false);
                    }
                );
            }
        }
    );
}

/* =========================================================
   41. OPTIONS
   ========================================================= */

function renderAccountOptions(selectedId) {
    return AppState.accounts
        .filter(function (account) {
            return account.active !== false;
        })
        .map(function (account) {
            return `
                <option
                    value="${escapeAttribute(
                        account.id
                    )}"
                    ${String(
                        account.id
                    ) === String(
                        selectedId
                    ) ? "selected" : ""}
                >
                    ${escapeHTML(
                        account.code ||
                        ""
                    )}
                    -
                    ${escapeHTML(
                        account.name ||
                        ""
                    )}
                </option>
            `;
        })
        .join("");
}

function renderCategoryOptions(
    type,
    selectedId
) {
    return AppState.categories
        .filter(function (category) {
            return (
                category.active !== false &&
                (
                    !type ||
                    String(
                        category.type ||
                        ""
                    ).toUpperCase() ===
                    String(
                        type
                    ).toUpperCase()
                )
            );
        })
        .map(function (category) {
            return `
                <option
                    value="${escapeAttribute(
                        category.id
                    )}"
                    ${String(
                        category.id
                    ) === String(
                        selectedId
                    ) ? "selected" : ""}
                >
                    ${escapeHTML(
                        category.code ||
                        ""
                    )}
                    -
                    ${escapeHTML(
                        category.name ||
                        ""
                    )}
                </option>
            `;
        })
        .join("");
}

function renderCustomerOptions(
    selectedId
) {
    return AppState.customers
        .filter(function (item) {
            return item.active !== false;
        })
        .map(function (item) {
            return `
                <option
                    value="${escapeAttribute(
                        item.id
                    )}"
                    ${String(
                        item.id
                    ) === String(
                        selectedId
                    ) ? "selected" : ""}
                >
                    ${escapeHTML(
                        item.code ||
                        ""
                    )}
                    -
                    ${escapeHTML(
                        item.name ||
                        ""
                    )}
                </option>
            `;
        })
        .join("");
}

function renderVendorOptions(
    selectedId
) {
    return AppState.vendors
        .filter(function (item) {
            return item.active !== false;
        })
        .map(function (item) {
            return `
                <option
                    value="${escapeAttribute(
                        item.id
                    )}"
                    ${String(
                        item.id
                    ) === String(
                        selectedId
                    ) ? "selected" : ""}
                >
                    ${escapeHTML(
                        item.code ||
                        ""
                    )}
                    -
                    ${escapeHTML(
                        item.name ||
                        ""
                    )}
                </option>
            `;
        })
        .join("");
}

function renderDocumentTypeOptions(
    selected
) {
    const types = [
        [
            "QUOTATION",
            "ใบเสนอราคา"
        ],
        [
            "INVOICE",
            "ใบแจ้งหนี้"
        ],
        [
            "BILLING",
            "ใบวางบิล"
        ],
        [
            "RECEIPT",
            "ใบเสร็จรับเงิน"
        ],
        [
            "PAYMENT_RECEIPT",
            "ใบรับเงิน"
        ],
        [
            "RECEIVING_VOUCHER",
            "ใบสำคัญรับ"
        ],
        [
            "PAYMENT_VOUCHER",
            "ใบสำคัญจ่าย"
        ],
        [
            "PAYMENT_CERTIFICATE",
            "หนังสือรับรองการจ่ายเงิน"
        ],
        [
            "OTHER",
            "อื่น ๆ"
        ]
    ];

    return types
        .map(function (item) {
            return `
                <option
                    value="${item[0]}"
                    ${item[0] === selected ? "selected" : ""}
                >
                    ${item[1]}
                </option>
            `;
        })
        .join("");
}

function renderStatusOptions(
    selected
) {
    const statuses = [
        [
            "DRAFT",
            "ร่าง"
        ],
        [
            "ISSUED",
            "ออกเอกสารแล้ว"
        ],
        [
            "PAID",
            "ชำระแล้ว"
        ],
        [
            "CANCELLED",
            "ยกเลิก"
        ],
        [
            "OVERDUE",
            "เกินกำหนด"
        ]
    ];

    return statuses
        .map(function (item) {
            return `
                <option
                    value="${item[0]}"
                    ${item[0] === selected ? "selected" : ""}
                >
                    ${item[1]}
                </option>
            `;
        })
        .join("");
}

/* =========================================================
   42. STATUS BADGES
   ========================================================= */

function renderStatusBadge(
    status
) {
    const normalized =
        String(
            status ||
            "ACTIVE"
        ).toUpperCase();

    let className =
        "badge-secondary";

    if (
        normalized === "ACTIVE" ||
        normalized === "PAID"
    ) {
        className =
            "badge-success";
    }

    if (
        normalized === "DRAFT" ||
        normalized === "ISSUED"
    ) {
        className =
            "badge-primary";
    }

    if (
        normalized === "CANCELLED"
    ) {
        className =
            "badge-danger";
    }

    if (
        normalized === "OVERDUE"
    ) {
        className =
            "badge-warning";
    }

    return `
        <span class="badge ${className}">
            ${escapeHTML(
                getStatusName(
                    normalized
                )
            )}
        </span>
    `;
}

function renderDocumentStatusBadge(
    status
) {
    const normalized =
        String(
            status ||
            "DRAFT"
        ).toUpperCase();

    let className =
        "document-status-draft";

    if (
        normalized === "ISSUED"
    ) {
        className =
            "document-status-issued";
    }

    if (
        normalized === "PAID"
    ) {
        className =
            "document-status-paid";
    }

    if (
        normalized === "CANCELLED"
    ) {
        className =
            "document-status-cancelled";
    }

    if (
        normalized === "OVERDUE"
    ) {
        className =
            "document-status-overdue";
    }

    return `
        <span class="badge ${className}">
            ${escapeHTML(
                getStatusName(
                    normalized
                )
            )}
        </span>
    `;
}

/* =========================================================
   43. SELECT / FORM HELPERS
   ========================================================= */

function valueOf(id) {
    const element =
        byId(id);

    if (!element) {
        return "";
    }

    return element.value;
}

function setValue(
    id,
    value
) {
    const element =
        byId(id);

    if (!element) {
        return;
    }

    element.value =
        value === null ||
        value === undefined
            ? ""
            : value;
}

function getSelectedText(id) {
    const element =
        byId(id);

    if (!element) {
        return "";
    }

    const option =
        element.options[
            element.selectedIndex
        ];

    if (!option) {
        return "";
    }

    return option.textContent
        .trim()
        .replace(
            /^[^-]+-\s*/,
            ""
        );
}

function getCustomerById(id) {
    return getItemById(
        AppState.customers,
        id
    );
}

function getVendorById(id) {
    return getItemById(
        AppState.vendors,
        id
    );

/* =========================================================
   44. DATE INITIALIZATION
   ========================================================= */

function initializeDateFields() {
    $$(
        'input[type="date"]'
    ).forEach(
        function (input) {
            if (
                !input.value &&
                input.hasAttribute(
                    "data-default-today"
                )
            ) {
                input.value =
                    getTodayString();
            }
        }
    );
}

/* =========================================================
   45. FILTERS
   ========================================================= */

async function applyIncomeFilter() {
    AppState.filters.incomes = {
        search:
            valueOf(
                "incomeSearch"
            ),
        startDate:
            valueOf(
                "incomeStartDate"
            ),
        endDate:
            valueOf(
                "incomeEndDate"
            ),
        accountId:
            valueOf(
                "incomeAccountFilter"
            )
    };

    AppState.pagination.incomes.page =
        1;

    await navigateTo(
        "incomes"
    );
}

async function clearIncomeFilter() {
    AppState.filters.incomes = {};

    AppState.pagination.incomes.page =
        1;

    await navigateTo(
        "incomes"
    );
}

async function applyExpenseFilter() {
    AppState.filters.expenses = {
        search:
            valueOf(
                "expenseSearch"
            ),
        startDate:
            valueOf(
                "expenseStartDate"
            ),
        endDate:
            valueOf(
                "expenseEndDate"
            ),
        accountId:
            valueOf(
                "expenseAccountFilter"
            )
    };

    AppState.pagination.expenses.page =
        1;

    await navigateTo(
        "expenses"
    );
}

async function clearExpenseFilter() {
    AppState.filters.expenses = {};

    AppState.pagination.expenses.page =
        1;

    await navigateTo(
        "expenses"
    );
}

async function applyCustomerFilter() {
    AppState.filters.customers = {
        search:
            valueOf(
                "customerSearch"
            )
    };

    AppState.pagination.customers.page =
        1;

    await navigateTo(
        "customers"
    );
}

async function clearCustomerFilter() {
    AppState.filters.customers = {};

    AppState.pagination.customers.page =
        1;

    await navigateTo(
        "customers"
    );
}

async function applyVendorFilter() {
    AppState.filters.vendors = {
        search:
            valueOf(
                "vendorSearch"
            )
    };

    AppState.pagination.vendors.page =
        1;

    await navigateTo(
        "vendors"
    );
}

async function clearVendorFilter() {
    AppState.filters.vendors = {};

    AppState.pagination.vendors.page =
        1;

    await navigateTo(
        "vendors"
    );
}

async function applyDocumentFilter() {
    AppState.filters.documents = {
        search:
            valueOf(
                "documentSearch"
            ),
        docType:
            valueOf(
                "documentTypeFilter"
            ),
        status:
            valueOf(
                "documentStatusFilter"
            )
    };

    AppState.pagination.documents.page =
        1;

    await navigateTo(
        "documents"
    );
}

async function clearDocumentFilter() {
    AppState.filters.documents = {};

    AppState.pagination.documents.page =
        1;

    await navigateTo(
        "documents"
    );
}

async function applyReportFilter() {
    AppState.filters.report = {
        startDate:
            valueOf(
                "reportStartDate"
            ),
        endDate:
            valueOf(
                "reportEndDate"
            )
    };

    await navigateTo(
        "report"
    );
}

/* =========================================================
   46. PAGINATION EVENT
   ========================================================= */

async function changePage(
    entity,
    page
) {
    if (
        !AppState.pagination[
            entity
        ]
    ) {
        return;
    }

    const total =
        AppState.pagination[
            entity
        ].total || 0;

    const pageSize =
        AppState.pagination[
            entity
        ].pageSize ||
        APP_CONFIG.PAGE_SIZE;

    const totalPages =
        Math.max(
            1,
            Math.ceil(
                total / pageSize
            )
        );

    if (
        page < 1 ||
        page > totalPages
    ) {
        return;
    }

    AppState.pagination[
        entity
    ].page = page;

    const pageMap = {
        incomes: "incomes",
        expenses: "expenses",
        transfers: "transfers",
        accounts: "accounts",
        customers: "customers",
        vendors: "vendors",
        documents: "documents",
        users: "users",
        auditLogs: "auditLogs"
    };

    if (
        pageMap[entity]
    ) {
        await navigateTo(
            pageMap[entity]
        );
    }
}

/* =========================================================
   47. SETTINGS SAVE
   ========================================================= */

async function saveSetting(
    key,
    value
) {
    await apiRequest(
        "updatesetting",
        {
            key: key,
            value: value
        }
    );

    AppState.settings[
        key
    ] = value;
}

async function saveBusinessSettings() {
    const settings = {
        business_name:
            valueOf(
                "settingBusinessName"
            ),
        tax_id:
            valueOf(
                "settingTaxId"
            ),
        address:
            valueOf(
                "settingAddress"
            ),
        phone:
            valueOf(
                "settingPhone"
            ),
        email:
            valueOf(
                "settingEmail"
            ),
        website:
            valueOf(
                "settingWebsite"
            ),
        business_description:
            valueOf(
                "settingDescription"
            )
    };

    showLoading(
        "กำลังบันทึกข้อมูลกิจการ..."
    );

    try {
        for (
            const key of Object.keys(
                settings
            )
        ) {
            await saveSetting(
                key,
                settings[key]
            );
        }

        updateBusinessUI();

        showToast(
            "บันทึกสำเร็จ",
            "บันทึกข้อมูลกิจการเรียบร้อยแล้ว",
            "success"
        );
    } catch (error) {
        handleApiError(error);
    } finally {
        hideLoading();
    }
}

async function saveDocumentSettings() {
    const inputs =
        $$(
            ".document-prefix-setting"
        );

    showLoading(
        "กำลังบันทึกการตั้งค่า..."
    );

    try {
        for (
            const input of inputs
        ) {
            const key =
                input.getAttribute(
                    "data-setting-key"
                );

            const value =
                input.value.trim();

            if (!key) {
                continue;
            }

            await saveSetting(
                key,
                value
            );
        }

        showToast(
            "บันทึกสำเร็จ",
            "บันทึกการตั้งค่าเอกสารเรียบร้อยแล้ว",
            "success"
        );
    } catch (error) {
        handleApiError(error);
    } finally {
        hideLoading();
    }
}

/* =========================================================
   48. SETTINGS TABS
   ========================================================= */

function activateSettingsTab(
    tab
) {
    $$(
        "[data-settings-tab]"
    ).forEach(
        function (button) {
            button.classList.toggle(
                "active",
                button.getAttribute(
                    "data-settings-tab"
                ) === tab
            );
        }
    );

    $$(
        "[data-settings-panel]"
    ).forEach(
        function (panel) {
            toggleElement(
                panel,
                panel.getAttribute(
                    "data-settings-panel"
                ) === tab
            );
        }
    );
}

/* =========================================================
   49. SIDEBAR
   ========================================================= */

function toggleSidebar() {
    if (
        window.innerWidth <= 900
    ) {
        document.body.classList.toggle(
            "mobile-sidebar-open"
        );

        ensureMobileSidebarOverlay();

        return;
    }

    document.body.classList.toggle(
        "sidebar-collapsed"
    );
}

function closeMobileSidebar() {
    document.body.classList.remove(
        "mobile-sidebar-open"
    );

    const overlay =
        byId(
            "mobileSidebarOverlay"
        );

    if (overlay) {
        overlay.classList.remove(
            "show"
        );
    }
}

function ensureMobileSidebarOverlay() {
    let overlay =
        byId(
            "mobileSidebarOverlay"
        );

    if (!overlay) {
        overlay = createElement(
            "div",
            "mobile-sidebar-overlay"
        );

        overlay.id =
            "mobileSidebarOverlay";

        document.body.appendChild(
            overlay
        );

        overlay.addEventListener(
            "click",
            closeMobileSidebar
        );
    }

    overlay.classList.toggle(
        "show",
        document.body.classList.contains(
            "mobile-sidebar-open"
        )
    );
}

/* =========================================================
   50. CONNECTION STATUS
   ========================================================= */

function updateConnectionStatus(
    status
) {
    const element =
        byId(
            "connectionStatus"
        );

    if (!element) {
        return;
    }

    element.classList.remove(
        "online",
        "offline",
        "connecting"
    );

    element.classList.add(
        status
    );

    const label =
        $(".connection-status-label", element);

    if (label) {
        if (
            status === "online"
        ) {
            label.textContent =
                "เชื่อมต่อแล้ว";
        } else if (
            status === "offline"
        ) {
            label.textContent =
                "ออฟไลน์";
        } else {
            label.textContent =
                "กำลังเชื่อมต่อ...";
        }
    }
}

/* =========================================================
   51. GLOBAL EVENTS
   ========================================================= */

function bindGlobalEvents() {
    document.addEventListener(
        "click",
        handleDocumentClick
    );

    document.addEventListener(
        "submit",
        function (event) {
            event.preventDefault();
        }
    );

    document.addEventListener(
        "keydown",
        function (event) {
            if (
                event.key === "Escape"
            ) {
                const modal =
                    byId(
                        "modalContainer"
                    );

                if (
                    modal &&
                    modal.classList.contains(
                        "show"
                    )
                ) {
                    closeModal();
                    return;
                }

                closeMobileSidebar();
            }
        }
    );

    window.addEventListener(
        "resize",
        function () {
            if (
                window.innerWidth > 900
            ) {
                closeMobileSidebar();
            }
        }
    );

    const loginForm =
        byId(
            "loginForm"
        );

    if (loginForm) {
        loginForm.addEventListener(
            "submit",
            async function (event) {
                event.preventDefault();

                const username =
                    valueOf(
                        "loginUsername"
                    );

                const password =
                    valueOf(
                        "loginPassword"
                    );

                await login(
                    username,
                    password
                );
            }
        );
    }

    const passwordToggle =
        byId(
            "loginPasswordToggle"
        );

    if (passwordToggle) {
        passwordToggle.addEventListener(
            "click",
            function () {
                togglePasswordVisibility(
                    "loginPassword"
                );
            }
        );
    }
}

/* =========================================================
   52. DOCUMENT CLICK HANDLER
   ========================================================= */

async function handleDocumentClick(
    event
) {
    const target =
        event.target.closest(
            "[data-action]"
        );

    if (!target) {
        return;
    }

    const action =
        target.getAttribute(
            "data-action"
        );

    if (!action) {
        return;
    }

    event.preventDefault();

    try {
        switch (action) {

            case "toggle-sidebar":
                toggleSidebar();
                break;

            case "logout":
                await logout();
                break;

            case "close-modal":
                closeModal();
                break;

            case "new-income":
                openIncomeModal();
                break;

            case "edit-income":
                openIncomeModal(
                    target.getAttribute(
                        "data-id"
                    )
                );
                break;

            case "save-income":
                await saveIncomeFromModal();
                break;

            case "delete-income":
                await deleteEntity(
                    "Income",
                    target.getAttribute(
                        "data-id"
                    ),
                    "รายการรายรับ"
                );
                break;

            case "cancel-income":
                await cancelTransaction(
                    "cancelIncome",
                    target.getAttribute(
                        "data-id"
                    )
                );
                break;

            case "new-expense":
                openExpenseModal();
                break;

            case "edit-expense":
                openExpenseModal(
                    target.getAttribute(
                        "data-id"
                    )
                );
                break;

            case "save-expense":
                await saveExpenseFromModal();
                break;

            case "delete-expense":
                await deleteEntity(
                    "Expense",
                    target.getAttribute(
                        "data-id"
                    ),
                    "รายการรายจ่าย"
                );
                break;

            case "cancel-expense":
                await cancelTransaction(
                    "cancelExpense",
                    target.getAttribute(
                        "data-id"
                    )
                );
                break;

            case "new-transfer":
                openTransferModal();
                break;

            case "edit-transfer":
                openTransferModal(
                    target.getAttribute(
                        "data-id"
                    )
                );
                break;

            case "save-transfer":
                await saveTransferFromModal();
                break;

            case "delete-transfer":
                await deleteEntity(
                    "Transfers",
                    target.getAttribute(
                        "data-id"
                    ),
                    "รายการโอนเงิน"
                );
                break;

            case "new-account":
                openAccountModal();
                break;

            case "edit-account":
                openAccountModal(
                    target.getAttribute(
                        "data-id"
                    )
                );
                break;

            case "save-account":
                await saveAccountFromModal();
                break;

            case "delete-account":
                await deleteEntity(
                    "Accounts",
                    target.getAttribute(
                        "data-id"
                    ),
                    "บัญชี"
                );
                break;

            case "new-customer":
                openCustomerModal();
                break;

            case "edit-customer":
                openCustomerModal(
                    target.getAttribute(
                        "data-id"
                    )
                );
                break;

            case "save-customer":
                await savePartyFromModal(
                    "customer"
                );
                break;

            case "delete-customer":
                await deleteEntity(
                    "Customers",
                    target.getAttribute(
                        "data-id"
                    ),
                    "ลูกค้า"
                );
                break;

            case "new-vendor":
                openVendorModal();
                break;

            case "edit-vendor":
                openVendorModal(
                    target.getAttribute(
                        "data-id"
                    )
                );
                break;

            case "save-vendor":
                await savePartyFromModal(
                    "vendor"
                );
                break;

            case "delete-vendor":
                await deleteEntity(
                    "Vendors",
                    target.getAttribute(
                        "data-id"
                    ),
                    "ผู้จำหน่าย"
                );
                break;

            case "new-document":
                await openDocumentModal();
                break;

            case "edit-document":
                await openDocumentModal(
                    target.getAttribute(
                        "data-id"
                    )
                );
                break;

            case "view-document":
                await viewDocument(
                    target.getAttribute(
                        "data-id"
                    ),
                    false
                );
                break;

            case "print-document":
                await viewDocument(
                    target.getAttribute(
                        "data-id"
                    ),
                    true
                );
                break;

            case "print-current-document":
                printCurrentOpenDocument();
                break;

            case "save-document":
                await saveDocumentFromModal();
                break;

            case "cancel-document":
                await cancelDocument(
                    target.getAttribute(
                        "data-id"
                    )
                );
                break;

            case "add-document-item":
                addDocumentItem();
                break;

            case "remove-document-item":
                removeDocumentItem(
                    Number(
                        target.getAttribute(
                            "data-index"
                        )
                    )
                );
                break;

            case "new-user":
                openUserModal();
                break;

            case "edit-user":
                openUserModal(
                    target.getAttribute(
                        "data-id"
                    )
                );
                break;

            case "save-user":
                await saveUserFromModal();
                break;

            case "delete-user":
                await deleteEntity(
                    "Users",
                    target.getAttribute(
                        "data-id"
                    ),
                    "ผู้ใช้งาน"
                );
                break;

            case "save-business-settings":
                await saveBusinessSettings();
                break;

            case "save-document-settings":
                await saveDocumentSettings();
                break;

            case "filter-incomes":
                await applyIncomeFilter();
                break;

            case "clear-income-filter":
                await clearIncomeFilter();
                break;

            case "filter-expenses":
                await applyExpenseFilter();
                break;

            case "clear-expense-filter":
                await clearExpenseFilter();
                break;

            case "filter-customers":
                await applyCustomerFilter();
                break;

            case "clear-customer-filter":
                await clearCustomerFilter();
                break;

            case "filter-vendors":
                await applyVendorFilter();
                break;

            case "clear-vendor-filter":
                await clearVendorFilter();
                break;

            case "filter-documents":
                await applyDocumentFilter();
                break;

            case "clear-document-filter":
                await clearDocumentFilter();
                break;

            case "filter-report":
                await applyReportFilter();
                break;

            case "print-report":
                printCurrentPage();
                break;

            case "refresh-dashboard":
                await navigateTo(
                    "dashboard"
                );
                break;

            case "view-incomes":
                await navigateTo(
                    "incomes"
                );
                break;

            case "page":
                await changePage(
                    target.getAttribute(
                        "data-entity"
                    ),
                    Number(
                        target.getAttribute(
                            "data-page"
                        )
                    )
                );
                break;

            case "close-mobile-sidebar":
                closeMobileSidebar();
                break;

            default:
                if (
                    PAGE_TITLES[
                        action
                    ]
                ) {
                    await navigateTo(
                        action
                    );
                }
        }

        if (
            target.hasAttribute(
                "data-settings-tab"
            )
        ) {
            activateSettingsTab(
                target.getAttribute(
                    "data-settings-tab"
                )
            );
        }
    } catch (error) {
        handleApiError(error);
    }
}

/* =========================================================
   53. NAVIGATION CLICK SUPPORT
   ========================================================= */

document.addEventListener(
    "click",
    async function (event) {
        const nav =
            event.target.closest(
                "[data-page]"
            );

        if (!nav) {
            return;
        }

        if (
            nav.hasAttribute(
                "data-settings-tab"
            )
        ) {
            return;
        }

        const page =
            nav.getAttribute(
                "data-page"
            );

        if (!page) {
            return;
        }

        event.preventDefault();

        await navigateTo(
            page
        );
    }
);

/* =========================================================
   54. SETTINGS TAB SUPPORT
   ========================================================= */

document.addEventListener(
    "click",
    function (event) {
        const tab =
            event.target.closest(
                "[data-settings-tab]"
            );

        if (!tab) {
            return;
        }

        event.preventDefault();

        activateSettingsTab(
            tab.getAttribute(
                "data-settings-tab"
            )
        );
    }
);

/* =========================================================
   55. DOCUMENT ITEMS
   ========================================================= */

function addDocumentItem() {
    AppState.documentItems.push(
        createDocumentItem()
    );

    renderDocumentItems();

    calculateDocumentTotals();
}

function removeDocumentItem(
    index
) {
    if (
        index < 0 ||
        index >=
            AppState.documentItems.length
    ) {
        return;
    }

    if (
        AppState.documentItems.length <= 1
    ) {
        showToast(
            "ไม่สามารถลบได้",
            "เอกสารต้องมีรายการอย่างน้อย 1 รายการ",
            "warning"
        );

        return;
    }

    AppState.documentItems.splice(
        index,
        1
    );

    AppState.documentItems.forEach(
        function (item, currentIndex) {
            item.lineNo =
                currentIndex + 1;
        }
    );

    renderDocumentItems();

    calculateDocumentTotals();
}

/* =========================================================
   56. TRANSACTION CANCEL
   ========================================================= */

async function cancelTransaction(
    action,
    id
) {
    const confirmed =
        await confirmAction(
            "ยืนยันการยกเลิก",
            "ต้องการยกเลิกรายการนี้หรือไม่?"
        );

    if (!confirmed) {
        return;
    }

    showLoading(
        "กำลังยกเลิกรายการ..."
    );

    try {
        await apiRequest(
            action,
            {
                id: id
            }
        );

        showToast(
            "ดำเนินการสำเร็จ",
            "ยกเลิกรายการเรียบร้อยแล้ว",
            "success"
        );

        if (
            action === "cancelIncome"
        ) {
            await navigateTo(
                "incomes"
            );
        } else {
            await navigateTo(
                "expenses"
            );
        }
    } catch (error) {
        handleApiError(error);
    } finally {
        hideLoading();
    }
}

/* =========================================================
   57. PRINT CURRENT DOCUMENT
   ========================================================= */

function printCurrentOpenDocument() {
    const preview =
        byId(
            "currentDocumentPreview"
        );

    if (!preview) {
        showToast(
            "ไม่พบเอกสาร",
            "ไม่พบข้อมูลเอกสารสำหรับพิมพ์",
            "warning"
        );

        return;
    }

    const printWindow =
        window.open(
            "",
            "_blank"
        );

    if (!printWindow) {
        showToast(
            "ไม่สามารถเปิดหน้าพิมพ์",
            "กรุณาอนุญาต Pop-up สำหรับเว็บไซต์นี้",
            "warning"
        );

        return;
    }

    printWindow.document.open();

    printWindow.document.write(
        `
        <!DOCTYPE html>

        <html lang="th">

        <head>

            <meta charset="UTF-8">

            <title>
                ${escapeHTML(
                    AppState.documents &&
                    AppState.documents.length
                        ? "Document"
                        : APP_CONFIG.APP_NAME
                )}
            </title>

            <style>

                @page {
                    size: A4;
                    margin: 0;
                }

                body {
                    margin: 0;
                    background: #ffffff;
                    font-family:
                        "TH Sarabun New",
                        "TH Sarabun",
                        Tahoma,
                        Arial,
                        sans-serif;
                }

                .document-preview {
                    width: 210mm;
                    min-height: 297mm;
                    margin: 0 auto;
                    padding: 15mm;
                }

            </style>

        </head>

        <body>

            ${preview.outerHTML}

            <script>
                window.onload = function () {
                    window.print();

                    setTimeout(
                        function () {
                            window.close();
                        },
                        500
                    );
                };
            <\/script>

        </body>

        </html>
        `
    );

    printWindow.document.close();
}

/* =========================================================
   58. PRINT CURRENT PAGE
   ========================================================= */

function printCurrentPage() {
    window.print();
}

/* =========================================================
   59. PASSWORD
   ========================================================= */

function togglePasswordVisibility(
    id
) {
    const input =
        byId(id);

    if (!input) {
        return;
    }

    if (
        input.type === "password"
    ) {
        input.type = "text";
    } else {
        input.type = "password";
    }
}

/* =========================================================
   60. API PING
   ========================================================= */

async function pingServer() {
    updateConnectionStatus(
        "connecting"
    );

    try {
        await apiRequest(
            "ping",
            {},
            {
                timeout: 10000
            }
        );

        updateConnectionStatus(
            "online"
        );

        return true;
    } catch (error) {
        updateConnectionStatus(
            "offline"
        );

        return false;
    }
}

/* =========================================================
   61. INITIAL APP START
   ========================================================= */

if (
    document.readyState ===
    "loading"
) {
    document.addEventListener(
        "DOMContentLoaded",
        initializeApp
    );
} else {
    initializeApp();
}

/* =========================================================
   62. GLOBAL EXPORTS
   ========================================================= */

window.AppState =
    AppState;

window.APP_CONFIG =
    APP_CONFIG;

window.navigateTo =
    navigateTo;

window.login =
    login;

window.logout =
    logout;

window.showToast =
    showToast;

window.openIncomeModal =
    openIncomeModal;

window.openExpenseModal =
    openExpenseModal;

window.openTransferModal =
    openTransferModal;

window.openAccountModal =
    openAccountModal;

window.openCustomerModal =
    openCustomerModal;

window.openVendorModal =
    openVendorModal;

window.openUserModal =
    openUserModal;

window.openDocumentModal =
    openDocumentModal;

window.viewDocument =
    viewDocument;

window.closeModal =
    closeModal;

window.toggleSidebar =
    toggleSidebar;

window.printCurrentPage =
    printCurrentPage;

window.pingServer =
    pingServer;

/* =========================================================
   63. END OF APP.JS
   ========================================================= */
