/* ============================================================
   SHOP-LAAS
   app.js
   Frontend JavaScript
   GitHub Pages → Google Apps Script API → Google Sheets

   ระบบ:
   - Login
   - Session
   - Dashboard
   - Products
   - Customers
   - Suppliers
   - Sales
   - Purchases
   - Expenses
   - Stock
   - Reports
   - Accounting
   - Settings
   - PDF
   - Excel
   - Logout

   IMPORTANT:
   เปลี่ยน API_URL ให้เป็น Web App URL ของ Google Apps Script
   ============================================================ */

"use strict";

/* ============================================================
   1. CONFIGURATION
   ============================================================ */

const SHOP_LAAS_CONFIG = {
    systemName: "SHOP-LAAS",
    version: "1.0.0",

    /*
     * ใส่ URL ของ Google Apps Script Web App ตรงนี้
     *
     * ตัวอย่าง:
     * https://script.google.com/macros/s/XXXXXXXXXXXXXXXXXXXX/exec
     *
     * ห้ามใส่ URL ของหน้า GitHub
     */
    API_URL: "https://script.google.com/macros/s/AKfycbwAe57-8WoYewAb0UN1r5nY6pG59mEiKgAMUEWnHSprNkBxmEYHe0jTu1s-Zlmx-6w/exec",

    timezone: "Asia/Bangkok",

    storage: {
        session: "SHOP_LAAS_SESSION",
        user: "SHOP_LAAS_USER",
        settings: "SHOP_LAAS_SETTINGS"
    },

    pagination: {
        pageSize: 10
    },

    currency: "THB"
};


/* ============================================================
   2. GLOBAL STATE
   ============================================================ */

const AppState = {
    initialized: false,
    loggedIn: false,
    loading: false,

    session: null,
    user: null,

    currentPage: "dashboard",

    settings: {},

    products: [],
    customers: [],
    suppliers: [],
    sales: [],
    purchases: [],
    expenses: [],
    accounts: [],
    journal: [],
    stockMovements: [],

    saleCart: [],
    purchaseCart: [],

    dashboard: null,

    pagination: {
        products: 1,
        customers: 1,
        suppliers: 1,
        sales: 1,
        purchases: 1,
        expenses: 1,
        journal: 1
    }
};


/* ============================================================
   3. BASIC DOM HELPERS
   ============================================================ */

function $(selector) {
    return document.querySelector(selector);
}


function $$(selector) {
    return Array.from(document.querySelectorAll(selector));
}


function getElement(id) {
    return document.getElementById(id);
}


function safeText(value) {
    if (value === null || value === undefined) {
        return "";
    }

    return String(value);
}


function escapeHtml(value) {
    const text = safeText(value);

    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


function showElement(element) {
    if (!element) {
        return;
    }

    element.style.display = "";
    element.removeAttribute("hidden");
}


function hideElement(element) {
    if (!element) {
        return;
    }

    element.style.display = "none";
}


function toggleElement(element, visible) {
    if (!element) {
        return;
    }

    if (visible) {
        showElement(element);
    } else {
        hideElement(element);
    }
}


/* ============================================================
   4. NUMBER / DATE HELPERS
   ============================================================ */

function toNumber(value) {
    if (value === null || value === undefined || value === "") {
        return 0;
    }

    if (typeof value === "number") {
        return Number.isFinite(value) ? value : 0;
    }

    const cleaned = String(value)
        .replace(/,/g, "")
        .replace(/฿/g, "")
        .trim();

    const number = Number(cleaned);

    return Number.isFinite(number) ? number : 0;
}


function formatNumber(value, decimals = 2) {
    const number = toNumber(value);

    return number.toLocaleString("th-TH", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    });
}


function formatMoney(value) {
    return formatNumber(value, 2) + " บาท";
}


function formatMoneyShort(value) {
    return formatNumber(value, 2);
}


function formatInteger(value) {
    return formatNumber(value, 0);
}


function formatDate(value) {
    if (!value) {
        return "";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return safeText(value);
    }

    return date.toLocaleDateString("th-TH", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
    });
}


function formatDateTime(value) {
    if (!value) {
        return "";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return safeText(value);
    }

    return date.toLocaleString("th-TH", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit"
    });
}


function todayInputValue() {
    const now = new Date();

    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}


function generateClientId(prefix = "ID") {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 100000);

    return `${prefix}-${timestamp}-${random}`;
}


/* ============================================================
   5. STORAGE
   ============================================================ */

function saveSession(session) {
    try {
        localStorage.setItem(
            SHOP_LAAS_CONFIG.storage.session,
            JSON.stringify(session)
        );
    } catch (error) {
        console.error("saveSession:", error);
    }
}


function getStoredSession() {
    try {
        const raw = localStorage.getItem(
            SHOP_LAAS_CONFIG.storage.session
        );

        if (!raw) {
            return null;
        }

        return JSON.parse(raw);
    } catch (error) {
        console.error("getStoredSession:", error);
        return null;
    }
}


function saveStoredUser(user) {
    try {
        localStorage.setItem(
            SHOP_LAAS_CONFIG.storage.user,
            JSON.stringify(user)
        );
    } catch (error) {
        console.error("saveStoredUser:", error);
    }
}


function getStoredUser() {
    try {
        const raw = localStorage.getItem(
            SHOP_LAAS_CONFIG.storage.user
        );

        if (!raw) {
            return null;
        }

        return JSON.parse(raw);
    } catch (error) {
        console.error("getStoredUser:", error);
        return null;
    }
}


function clearSessionStorage() {
    try {
        localStorage.removeItem(
            SHOP_LAAS_CONFIG.storage.session
        );

        localStorage.removeItem(
            SHOP_LAAS_CONFIG.storage.user
        );
    } catch (error) {
        console.error("clearSessionStorage:", error);
    }
}


/* ============================================================
   6. API
   ============================================================ */

function getApiUrl() {
    return SHOP_LAAS_CONFIG.API_URL;
}


function validateApiUrl() {
    const url = getApiUrl();

    if (!url) {
        return false;
    }

    if (url.includes("ใส่_URL")) {
        return false;
    }

    if (!url.startsWith("https://script.google.com/")) {
        return false;
    }

    return true;
}


async function apiRequest(action, params = {}) {
    if (!validateApiUrl()) {
        throw new Error(
            "ยังไม่ได้ตั้งค่า API_URL ของ Google Apps Script ใน app.js"
        );
    }

    const payload = {
        action: action,
        ...params
    };

    console.log("SHOP-LAAS API REQUEST:", payload);

    let response;

    try {
        response = await fetch(getApiUrl(), {
            method: "POST",
            headers: {
                "Content-Type": "text/plain;charset=utf-8"
            },
            body: JSON.stringify(payload)
        });
    } catch (error) {
        console.error("FETCH ERROR:", error);

        throw new Error(
            "ไม่สามารถเชื่อมต่อ Google Apps Script ได้ กรุณาตรวจสอบ URL ของ Web App และการ Deploy"
        );
    }

    if (!response.ok) {
        throw new Error(
            `Google Apps Script ตอบกลับ HTTP ${response.status}`
        );
    }

    let result;

    try {
        result = await response.json();
    } catch (error) {
        console.error("JSON ERROR:", error);

        const text = await response.text();

        console.error("RAW RESPONSE:", text);

        throw new Error(
            "Google Apps Script ส่งข้อมูลกลับมาไม่ใช่ JSON"
        );
    }

    console.log("SHOP-LAAS API RESPONSE:", result);

    if (!result) {
        throw new Error("ไม่ได้รับข้อมูลจาก Google Apps Script");
    }

    return result;
}


/* ============================================================
   7. RESULT HELPERS
   ============================================================ */

function isApiSuccess(result) {
    if (!result) {
        return false;
    }

    if (result.success === true) {
        return true;
    }

    if (
        result.status === "success" ||
        result.status === "SUCCESS" ||
        result.ok === true
    ) {
        return true;
    }

    return false;
}


function getApiMessage(result, fallback = "ดำเนินการไม่สำเร็จ") {
    if (!result) {
        return fallback;
    }

    return (
        result.message ||
        result.error ||
        result.msg ||
        fallback
    );
}


function getApiData(result) {
    if (!result) {
        return null;
    }

    if (result.data !== undefined) {
        return result.data;
    }

    if (result.result !== undefined) {
        return result.result;
    }

    return result;
}


/* ============================================================
   8. LOADING
   ============================================================ */

function setLoading(loading, message = "กำลังดำเนินการ...") {
    AppState.loading = loading;

    let overlay = getElement("loadingOverlay");

    if (!overlay) {
        overlay = document.createElement("div");

        overlay.id = "loadingOverlay";

        overlay.innerHTML = `
            <div class="loading-box">
                <div class="loading-spinner"></div>
                <div class="loading-message"></div>
            </div>
        `;

        document.body.appendChild(overlay);

        const style = document.createElement("style");

        style.textContent = `
            #loadingOverlay {
                position: fixed;
                inset: 0;
                z-index: 99999;
                background: rgba(0,0,0,0.35);
                display: flex;
                align-items: center;
                justify-content: center;
                backdrop-filter: blur(2px);
            }

            #loadingOverlay.hidden {
                display: none;
            }

            .loading-box {
                min-width: 220px;
                padding: 25px;
                border-radius: 14px;
                background: #ffffff;
                box-shadow: 0 15px 40px rgba(0,0,0,0.20);
                text-align: center;
            }

            .loading-spinner {
                width: 38px;
                height: 38px;
                margin: 0 auto 15px;
                border: 4px solid #dbe5ef;
                border-top-color: #0d2b4d;
                border-radius: 50%;
                animation: shopLaasSpin 0.8s linear infinite;
            }

            .loading-message {
                color: #243447;
                font-size: 15px;
            }

            @keyframes shopLaasSpin {
                from {
                    transform: rotate(0deg);
                }

                to {
                    transform: rotate(360deg);
                }
            }
        `;

        document.head.appendChild(style);
    }

    const messageElement = overlay.querySelector(".loading-message");

    if (messageElement) {
        messageElement.textContent = message;
    }

    if (loading) {
        overlay.classList.remove("hidden");
        overlay.style.display = "flex";
    } else {
        overlay.classList.add("hidden");
        overlay.style.display = "none";
    }
}


/* ============================================================
   9. TOAST / ALERT
   ============================================================ */

function showToast(message, type = "success") {
    let container = getElement("toastContainer");

    if (!container) {
        container = document.createElement("div");

        container.id = "toastContainer";

        container.style.position = "fixed";
        container.style.right = "20px";
        container.style.bottom = "20px";
        container.style.zIndex = "100000";
        container.style.display = "flex";
        container.style.flexDirection = "column";
        container.style.gap = "10px";

        document.body.appendChild(container);
    }

    const toast = document.createElement("div");

    toast.className = `shop-toast shop-toast-${type}`;

    toast.textContent = message;

    toast.style.padding = "13px 18px";
    toast.style.borderRadius = "10px";
    toast.style.background = "#0d2b4d";
    toast.style.color = "#ffffff";
    toast.style.boxShadow = "0 8px 25px rgba(0,0,0,0.18)";
    toast.style.maxWidth = "360px";
    toast.style.fontSize = "14px";

    if (type === "error") {
        toast.style.background = "#b42318";
    }

    if (type === "warning") {
        toast.style.background = "#9a6700";
    }

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = "0";
        toast.style.transform = "translateY(10px)";
        toast.style.transition = "all 0.25s ease";

        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 3500);
}


function showError(message) {
    showToast(message, "error");
}


function showSuccess(message) {
    showToast(message, "success");
}


function showWarning(message) {
    showToast(message, "warning");
}


/* ============================================================
   10. LOGIN ELEMENTS
   ============================================================ */

function getLoginForm() {
    return (
        getElement("loginForm") ||
        document.querySelector("form")
    );
}


function getLoginUsernameInput() {
    return (
        getElement("loginUsername") ||
        getElement("username") ||
        document.querySelector(
            'input[name="username"]'
        )
    );
}


function getLoginPasswordInput() {
    return (
        getElement("loginPassword") ||
        getElement("password") ||
        document.querySelector(
            'input[name="password"]'
        )
    );
}


function getLoginButton() {
    return (
        getElement("loginBtn") ||
        getElement("loginButton") ||
        document.querySelector(
            '[data-action="login"]'
        )
    );
}


/* ============================================================
   11. LOGIN
   ============================================================ */

async function handleLogin(event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }

    const usernameInput = getLoginUsernameInput();
    const passwordInput = getLoginPasswordInput();

    if (!usernameInput || !passwordInput) {
        showError(
            "ไม่พบช่องชื่อผู้ใช้หรือรหัสผ่านในหน้า index.html"
        );

        console.error(
            "Login inputs not found.",
            {
                usernameInput,
                passwordInput
            }
        );

        return false;
    }

    const username = usernameInput.value.trim();
    const password = passwordInput.value;

    if (!username) {
        showWarning("กรุณากรอกชื่อผู้ใช้");
        usernameInput.focus();
        return false;
    }

    if (!password) {
        showWarning("กรุณากรอกรหัสผ่าน");
        passwordInput.focus();
        return false;
    }

    if (!validateApiUrl()) {
        showError(
            "ยังไม่ได้ตั้งค่า API_URL ใน app.js"
        );

        return false;
    }

    const button = getLoginButton();

    const originalButtonText = button
        ? button.innerHTML
        : "";

    try {
        setLoading(true, "กำลังตรวจสอบข้อมูลเข้าสู่ระบบ...");

        if (button) {
            button.disabled = true;
            button.innerHTML = "กำลังเข้าสู่ระบบ...";
        }

        const result = await apiRequest(
            "login",
            {
                username: username,
                password: password
            }
        );

        if (!isApiSuccess(result)) {
            const message = getApiMessage(
                result,
                "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง"
            );

            showError(message);

            return false;
        }

        const data = getApiData(result);

        let session = null;
        let user = null;

        if (data) {
            session =
                data.session ||
                data.token ||
                data.sessionId ||
                null;

            user =
                data.user ||
                data.account ||
                null;
        }

        /*
         * รองรับกรณี Code.gs ส่ง session มาอยู่ใน result โดยตรง
         */
        if (!session && result.session) {
            session = result.session;
        }

        if (!user && result.user) {
            user = result.user;
        }

        /*
         * ถ้า API ไม่มี session แต่ login สำเร็จ
         * ยังคงเก็บผลลัพธ์ไว้เพื่อให้ระบบใช้งานต่อได้
         */
        if (!session) {
            session = {
                authenticated: true,
                username: username,
                loginTime: new Date().toISOString()
            };
        }

        if (!user) {
            user = {
                username: username
            };
        }

        AppState.loggedIn = true;
        AppState.session = session;
        AppState.user = user;

        saveSession(session);
        saveStoredUser(user);

        showSuccess("เข้าสู่ระบบสำเร็จ");

        showApplication();

        await initializeApplicationAfterLogin();

        return true;

    } catch (error) {
        console.error("LOGIN ERROR:", error);

        showError(
            error.message ||
            "เกิดข้อผิดพลาดในการเข้าสู่ระบบ"
        );

        return false;

    } finally {
        setLoading(false);

        if (button) {
            button.disabled = false;
            button.innerHTML = originalButtonText || "เข้าสู่ระบบ";
        }
    }
}


/* ============================================================
   12. SESSION
   ============================================================ */

function getSessionValue() {
    const session = AppState.session;

    if (!session) {
        return "";
    }

    if (typeof session === "string") {
        return session;
    }

    return (
        session.sessionId ||
        session.session ||
        session.token ||
        session.id ||
        ""
    );
}


function getUsername() {
    if (AppState.user) {
        return (
            AppState.user.username ||
            AppState.user.userName ||
            AppState.user["ชื่อผู้ใช้"] ||
            ""
        );
    }

    const storedUser = getStoredUser();

    if (storedUser) {
        return (
            storedUser.username ||
            storedUser.userName ||
            storedUser["ชื่อผู้ใช้"] ||
            ""
        );
    }

    return "";
}


async function restoreSession() {
    const storedSession = getStoredSession();
    const storedUser = getStoredUser();

    if (!storedSession) {
        return false;
    }

    AppState.session = storedSession;
    AppState.user = storedUser;

    /*
     * ตรวจสอบกับ API ถ้า Code.gs รองรับ verifySession
     */
    try {
        if (validateApiUrl()) {
            const sessionValue = getSessionValue();

            if (sessionValue) {
                const result = await apiRequest(
                    "verifySession",
                    {
                        session: sessionValue,
                        token: sessionValue,
                        username: getUsername()
                    }
                );

                if (isApiSuccess(result)) {
                    AppState.loggedIn = true;

                    showApplication();

                    return true;
                }
            }
        }
    } catch (error) {
        console.warn(
            "verifySession failed:",
            error
        );
    }

    /*
     * ถ้า verifySession ใช้งานไม่ได้
     * ใช้ข้อมูล local session ต่อ
     */
    if (storedSession) {
        AppState.loggedIn = true;

        showApplication();

        return true;
    }

    return false;
}


/* ============================================================
   13. LOGOUT
   ============================================================ */

async function logout() {
    const confirmed = window.confirm(
        "ต้องการออกจากระบบใช่หรือไม่?"
    );

    if (!confirmed) {
        return;
    }

    try {
        const sessionValue = getSessionValue();

        if (validateApiUrl() && sessionValue) {
            try {
                await apiRequest(
                    "logout",
                    {
                        session: sessionValue,
                        token: sessionValue,
                        username: getUsername()
                    }
                );
            } catch (error) {
                console.warn(
                    "Server logout error:",
                    error
                );
            }
        }
    } finally {
        AppState.loggedIn = false;
        AppState.session = null;
        AppState.user = null;

        clearSessionStorage();

        showLogin();

        showSuccess("ออกจากระบบแล้ว");
    }
}


/* ============================================================
   14. LOGIN / APPLICATION VISIBILITY
   ============================================================ */

function showLogin() {
    const loginPage =
        getElement("loginPage") ||
        getElement("loginScreen") ||
        document.querySelector(".login-page");

    const appPage =
        getElement("appPage") ||
        getElement("appScreen") ||
        document.querySelector(".app");

    if (loginPage) {
        showElement(loginPage);
    }

    if (appPage) {
        hideElement(appPage);
    }

    document.body.classList.remove("logged-in");
}


function showApplication() {
    const loginPage =
        getElement("loginPage") ||
        getElement("loginScreen") ||
        document.querySelector(".login-page");

    const appPage =
        getElement("appPage") ||
        getElement("appScreen") ||
        document.querySelector(".app");

    if (loginPage) {
        hideElement(loginPage);
    }

    if (appPage) {
        showElement(appPage);
    }

    document.body.classList.add("logged-in");

    updateUserDisplay();
}


/* ============================================================
   15. USER DISPLAY
   ============================================================ */

function updateUserDisplay() {
    const username = getUsername();

    const selectors = [
        "#currentUsername",
        "#displayUsername",
        "#userName",
        "#profileUsername",
        "[data-user-name]"
    ];

    selectors.forEach((selector) => {
        $$(selector).forEach((element) => {
            element.textContent = username;
        });
    });
}


/* ============================================================
   16. NAVIGATION
   ============================================================ */

function normalizePageName(page) {
    if (!page) {
        return "dashboard";
    }

    return String(page)
        .trim()
        .replace(/^#/, "")
        .toLowerCase();
}


function showPage(page) {
    const normalizedPage = normalizePageName(page);

    AppState.currentPage = normalizedPage;

    const pages = $(
        ".page"
    );

    if (pages) {
        $$(".page").forEach((element) => {
            const pageName =
                element.dataset.page ||
                element.id
                    .replace(/^page[-_]?/, "")
                    .replace(/^view[-_]?/, "")
                    .toLowerCase();

            if (pageName === normalizedPage) {
                showElement(element);
            } else {
                hideElement(element);
            }
        });
    }

    $$(".nav-item, .menu-item, [data-page]").forEach((element) => {
        const target =
            element.dataset.page ||
            element.dataset.target;

        if (target) {
            if (
                normalizePageName(target) ===
                normalizedPage
            ) {
                element.classList.add("active");
            } else {
                element.classList.remove("active");
            }
        }
    });

    updatePageTitle(normalizedPage);

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });

    loadPageData(normalizedPage);
}


function updatePageTitle(page) {
    const titles = {
        dashboard: "แดชบอร์ด",
        sales: "ระบบขายสินค้า",
        sale: "ระบบขายสินค้า",
        purchases: "ระบบซื้อสินค้า",
        purchase: "ระบบซื้อสินค้า",
        products: "สินค้าและสต็อก",
        stock: "สต็อกสินค้า",
        customers: "ลูกค้า",
        suppliers: "ผู้จำหน่าย",
        expenses: "รายจ่าย",
        reports: "รายงาน",
        accounting: "บัญชี",
        journal: "สมุดรายวัน",
        settings: "ตั้งค่าระบบ",
        profile: "ข้อมูลผู้ใช้"
    };

    const title = titles[page] || "SHOP-LAAS";

    const selectors = [
        "#pageTitle",
        "#contentTitle",
        "#currentPageTitle"
    ];

    selectors.forEach((selector) => {
        $$(selector).forEach((element) => {
            element.textContent = title;
        });
    });
}


/* ============================================================
   17. SIDEBAR
   ============================================================ */

function setupSidebar() {
    $$(".sidebar-toggle, #sidebarToggle").forEach((button) => {
        button.addEventListener("click", function () {
            document.body.classList.toggle("sidebar-collapsed");
        });
    });

    $$(".nav-item, .menu-item, [data-page]").forEach((element) => {
        if (
            element.tagName === "BUTTON" ||
            element.tagName === "A" ||
            element.dataset.page
        ) {
            element.addEventListener("click", function (event) {
                const page =
                    this.dataset.page ||
                    this.dataset.target;

                if (!page) {
                    return;
                }

                event.preventDefault();

                showPage(page);
            });
        }
    });
}


/* ============================================================
   18. GLOBAL EVENT HANDLERS
   ============================================================ */

function setupGlobalEvents() {
    const loginForm = getLoginForm();

    if (loginForm) {
        loginForm.addEventListener(
            "submit",
            handleLogin
        );
    }

    const loginButton = getLoginButton();

    if (
        loginButton &&
        !loginForm
    ) {
        loginButton.addEventListener(
            "click",
            handleLogin
        );
    }

    $$(".logout-button, #logoutBtn, #logoutButton").forEach(
        (button) => {
            button.addEventListener(
                "click",
                logout
            );
        }
    );

    $$(".password-toggle").forEach((button) => {
        button.addEventListener("click", function () {
            const targetId = this.dataset.target;

            if (!targetId) {
                return;
            }

            const input = getElement(targetId);

            if (!input) {
                return;
            }

            if (input.type === "password") {
                input.type = "text";
            } else {
                input.type = "password";
            }
        });
    });

    document.addEventListener(
        "click",
        handleDocumentClick
    );

    document.addEventListener(
        "change",
        handleDocumentChange
    );

    document.addEventListener(
        "input",
        handleDocumentInput
    );
}


function handleDocumentClick(event) {
    const pageElement =
        event.target.closest("[data-page]");

    if (pageElement) {
        const page =
            pageElement.dataset.page ||
            pageElement.dataset.target;

        if (page) {
            event.preventDefault();

            showPage(page);

            return;
        }
    }

    const actionElement =
        event.target.closest("[data-action]");

    if (!actionElement) {
        return;
    }

    const action = actionElement.dataset.action;

    if (!action) {
        return;
    }

    switch (action) {
        case "login":
            handleLogin(event);
            break;

        case "logout":
            logout();
            break;

        case "refresh":
            refreshCurrentPage();
            break;

        case "new-product":
            openProductModal();
            break;

        case "new-customer":
            openCustomerModal();
            break;

        case "new-supplier":
            openSupplierModal();
            break;

        case "new-expense":
            openExpenseModal();
            break;

        case "new-sale":
            showPage("sales");
            break;

        case "new-purchase":
            showPage("purchases");
            break;

        case "add-sale-item":
            addSaleItemFromForm();
            break;

        case "clear-sale-cart":
            clearSaleCart();
            break;

        case "submit-sale":
            submitSale();
            break;

        case "add-purchase-item":
            addPurchaseItemFromForm();
            break;

        case "clear-purchase-cart":
            clearPurchaseCart();
            break;

        case "submit-purchase":
            submitPurchase();
            break;

        case "export-sales-excel":
            exportTableToExcel("salesTable", "รายงานการขาย");
            break;

        case "export-purchases-excel":
            exportTableToExcel("purchasesTable", "รายงานการซื้อ");
            break;

        case "export-products-excel":
            exportTableToExcel("productsTable", "สินค้า");
            break;

        case "print":
            window.print();
            break;

        case "pdf-sales":
            exportSalesPdf();
            break;

        case "pdf-purchases":
            exportPurchasesPdf();
            break;

        case "dashboard":
            showPage("dashboard");
            break;

        default:
            break;
    }
}


function handleDocumentChange(event) {
    const target = event.target;

    if (!target) {
        return;
    }

    if (target.dataset.refreshProducts === "true") {
        loadProducts();
    }

    if (target.dataset.action === "calculate-sale") {
        updateSaleTotals();
    }

    if (target.dataset.action === "calculate-purchase") {
        updatePurchaseTotals();
    }
}


function handleDocumentInput(event) {
    const target = event.target;

    if (!target) {
        return;
    }

    if (
        target.matches(
            "#saleProductSearch, #productSearch"
        )
    ) {
        filterProductOptions(
            target.value
        );
    }

    if (
        target.matches(
            "#customerSearch"
        )
    ) {
        filterCustomerOptions(
            target.value
        );
    }

    if (
        target.matches(
            "#supplierSearch"
        )
    ) {
        filterSupplierOptions(
            target.value
        );
    }
}


/* ============================================================
   19. INITIALIZE
   ============================================================ */

async function initializeApp() {
    if (AppState.initialized) {
        return;
    }

    AppState.initialized = true;

    console.log(
        "SHOP-LAAS initializing..."
    );

    setupGlobalEvents();
    setupSidebar();

    setDefaultDates();

    showLogin();

    const restored = await restoreSession();

    if (restored) {
        await initializeApplicationAfterLogin();
    }

    console.log(
        "SHOP-LAAS initialized."
    );
}


async function initializeApplicationAfterLogin() {
    updateUserDisplay();

    await loadSettings();

    await loadDashboard();

    await loadProducts();

    await loadCustomers();

    await loadSuppliers();

    await loadExpenses();

    await loadAccounts();

    updateAllCartDisplays();

    showPage(
        AppState.currentPage || "dashboard"
    );
}


/* ============================================================
   20. DEFAULT DATES
   ============================================================ */

function setDefaultDates() {
    const dateInputs = [
        "saleDate",
        "purchaseDate",
        "expenseDate",
        "reportStartDate",
        "reportEndDate"
    ];

    dateInputs.forEach((id) => {
        const input = getElement(id);

        if (!input) {
            return;
        }

        if (!input.value) {
            input.value = todayInputValue();
        }
    });
}


/* ============================================================
   21. PAGE DATA
   ============================================================ */

async function loadPageData(page) {
    if (!AppState.loggedIn) {
        return;
    }

    try {
        switch (normalizePageName(page)) {
            case "dashboard":
                await loadDashboard();
                break;

            case "products":
            case "stock":
                await loadProducts();
                break;

            case "customers":
                await loadCustomers();
                break;

            case "suppliers":
                await loadSuppliers();
                break;

            case "sales":
            case "sale":
                await loadSales();
                break;

            case "purchases":
            case "purchase":
                await loadPurchases();
                break;

            case "expenses":
                await loadExpenses();
                break;

            case "reports":
                await loadReports();
                break;

            case "accounting":
            case "journal":
                await loadJournal();
                break;

            case "settings":
                await loadSettings();
                break;

            default:
                break;
        }
    } catch (error) {
        console.error(
            "loadPageData:",
            error
        );
    }
}


async function refreshCurrentPage() {
    await loadPageData(
        AppState.currentPage
    );

    showSuccess("รีเฟรชข้อมูลแล้ว");
}


/* ============================================================
   22. DASHBOARD
   ============================================================ */

async function loadDashboard() {
    if (!validateApiUrl()) {
        return;
    }

    try {
        const result = await apiRequest(
            "dashboard",
            {
                session: getSessionValue(),
                token: getSessionValue(),
                username: getUsername()
            }
        );

        if (!isApiSuccess(result)) {
            console.warn(
                "Dashboard API:",
                getApiMessage(result)
            );

            return;
        }

        AppState.dashboard =
            getApiData(result);

        renderDashboard(
            AppState.dashboard
        );

    } catch (error) {
        console.error(
            "loadDashboard:",
            error
        );
    }
}


function renderDashboard(data) {
    if (!data) {
        return;
    }

    const mappings = {
        totalSales: [
            "#totalSales",
            "#dashboardTotalSales"
        ],

        totalPurchases: [
            "#totalPurchases",
            "#dashboardTotalPurchases"
        ],

        totalExpenses: [
            "#totalExpenses",
            "#dashboardTotalExpenses"
        ],

        totalProducts: [
            "#totalProducts",
            "#dashboardTotalProducts"
        ],

        totalCustomers: [
            "#totalCustomers",
            "#dashboardTotalCustomers"
        ],

        totalSuppliers: [
            "#totalSuppliers",
            "#dashboardTotalSuppliers"
        ],

        stockValue: [
            "#stockValue",
            "#dashboardStockValue"
        ],

        netIncome: [
            "#netIncome",
            "#dashboardNetIncome"
        ]
    };

    Object.keys(mappings).forEach((key) => {
        const value = data[key];

        if (value === undefined) {
            return;
        }

        mappings[key].forEach((selector) => {
            $$(selector).forEach((element) => {
                if (
                    key.includes("Sales") ||
                    key.includes("Purchases") ||
                    key.includes("Expenses") ||
                    key.includes("Value") ||
                    key.includes("Income")
                ) {
                    element.textContent =
                        formatMoney(value);
                } else {
                    element.textContent =
                        formatInteger(value);
                }
            });
        });
    });
}


/* ============================================================
   23. SETTINGS
   ============================================================ */

async function loadSettings() {
    if (!validateApiUrl()) {
        return;
    }

    try {
        const result = await apiRequest(
            "listRows",
            {
                sheetName: "Settings",
                session: getSessionValue(),
                token: getSessionValue()
            }
        );

        if (!isApiSuccess(result)) {
            return;
        }

        const data = getApiData(result);

        const rows =
            Array.isArray(data)
                ? data
                : data.rows || [];

        const settings = {};

        rows.forEach((row) => {
            if (!row) {
                return;
            }

            const key =
                row.key ||
                row.Key ||
                row["คีย์"] ||
                row.settingKey;

            const value =
                row.value ||
                row.Value ||
                row["ค่า"] ||
                row.settingValue;

            if (key) {
                settings[key] = value;
            }
        });

        AppState.settings = settings;

        renderSettings(settings);

    } catch (error) {
        console.error(
            "loadSettings:",
            error
        );
    }
}


function renderSettings(settings) {
    if (!settings) {
        return;
    }

    const shopName =
        settings.shopName ||
        settings["ชื่อร้าน"] ||
        settings.name;

    if (shopName) {
        $$("#shopName, #storeName").forEach(
            (element) => {
                element.textContent = shopName;
            }
        );
    }

    const shopAddress =
        settings.shopAddress ||
        settings["ที่อยู่ร้าน"];

    if (shopAddress) {
        $$("#shopAddress, #storeAddress").forEach(
            (element) => {
                element.textContent =
                    shopAddress;
            }
        );
    }
}


/* ============================================================
   24. PRODUCTS
   ============================================================ */

async function loadProducts() {
    if (!validateApiUrl()) {
        return;
    }

    try {
        setLoading(
            true,
            "กำลังโหลดข้อมูลสินค้า..."
        );

        const result = await apiRequest(
            "listRows",
            {
                sheetName: "Products",
                session: getSessionValue(),
                token: getSessionValue()
            }
        );

        if (!isApiSuccess(result)) {
            throw new Error(
                getApiMessage(
                    result,
                    "ไม่สามารถโหลดสินค้าได้"
                )
            );
        }

        const data = getApiData(result);

        AppState.products =
            normalizeArrayData(data);

        renderProducts(
            AppState.products
        );

        populateProductSelects(
            AppState.products
        );

    } catch (error) {
        console.error(
            "loadProducts:",
            error
        );

        showError(error.message);

    } finally {
        setLoading(false);
    }
}


function normalizeArrayData(data) {
    if (Array.isArray(data)) {
        return data;
    }

    if (!data) {
        return [];
    }

    if (Array.isArray(data.rows)) {
        return data.rows;
    }

    if (Array.isArray(data.data)) {
        return data.data;
    }

    if (Array.isArray(data.items)) {
        return data.items;
    }

    return [];
}


function getProductId(product) {
    return (
        product.id ||
        product.ID ||
        product.productID ||
        product["สินค้าID"] ||
        product["รหัสสินค้า"] ||
        product.code ||
        ""
    );
}


function getProductName(product) {
    return (
        product.name ||
        product.productName ||
        product["ชื่อสินค้า"] ||
        product["สินค้า"] ||
        ""
    );
}


function getProductCode(product) {
    return (
        product.code ||
        product.productCode ||
        product["รหัสสินค้า"] ||
        getProductId(product)
    );
}


function getProductPrice(product) {
    return toNumber(
        product.price ||
        product.salePrice ||
        product["ราคาขาย"] ||
        product["ราคา"] ||
        0
    );
}


function getProductCost(product) {
    return toNumber(
        product.cost ||
        product.costPrice ||
        product["ราคาทุน"] ||
        0
    );
}


function getProductQuantity(product) {
    return toNumber(
        product.quantity ||
        product.qty ||
        product.stock ||
        product["จำนวนคงเหลือ"] ||
        product["จำนวน"] ||
        0
    );
}


function getProductTaxRate(product) {
    return toNumber(
        product.taxRate ||
        product["ภาษี%"] ||
        product["อัตราภาษี"] ||
        0
    );
}


function renderProducts(products) {
    const table = getElement("productsTable");

    if (!table) {
        return;
    }

    let tbody =
        table.querySelector("tbody");

    if (!tbody) {
        tbody =
            document.createElement("tbody");

        table.appendChild(tbody);
    }

    tbody.innerHTML = "";

    products.forEach((product, index) => {
        const row =
            document.createElement("tr");

        const id =
            getProductId(product);

        const code =
            getProductCode(product);

        const name =
            getProductName(product);

        const price =
            getProductPrice(product);

        const cost =
            getProductCost(product);

        const quantity =
            getProductQuantity(product);

        const taxRate =
            getProductTaxRate(product);

        row.innerHTML = `
            <td>${index + 1}</td>
            <td>${escapeHtml(code)}</td>
            <td>${escapeHtml(name)}</td>
            <td>${formatMoneyShort(cost)}</td>
            <td>${formatMoneyShort(price)}</td>
            <td>${formatNumber(quantity, 2)}</td>
            <td>${formatNumber(taxRate, 2)}%</td>
            <td>
                <button
                    type="button"
                    class="btn btn-sm"
                    data-product-id="${escapeHtml(id)}"
                    onclick="editProduct('${escapeHtml(id)}')">
                    แก้ไข
                </button>

                <button
                    type="button"
                    class="btn btn-sm btn-danger"
                    data-product-id="${escapeHtml(id)}"
                    onclick="deleteProduct('${escapeHtml(id)}')">
                    ลบ
                </button>
            </td>
        `;

        tbody.appendChild(row);
    });
}


function populateProductSelects(products) {
    const selects = [
        "#saleProduct",
        "#purchaseProduct",
        "#productSelect"
    ];

    selects.forEach((selector) => {
        const select = $(selector);

        if (!select) {
            return;
        }

        const currentValue =
            select.value;

        select.innerHTML =
            `<option value="">-- เลือกสินค้า --</option>`;

        products.forEach((product) => {
            const id =
                getProductId(product);

            const name =
                getProductName(product);

            const code =
                getProductCode(product);

            const option =
                document.createElement("option");

            option.value = id;

            option.textContent =
                `${code} - ${name}`;

            select.appendChild(option);
        });

        if (currentValue) {
            select.value =
                currentValue;
        }
    });
}


/* ============================================================
   25. PRODUCT CRUD
   ============================================================ */

function openProductModal(product = null) {
    const modal =
        getElement("productModal");

    if (!modal) {
        return;
    }

    const form =
        getElement("productForm");

    if (form) {
        form.reset();

        if (product) {
            fillFormFromObject(
                form,
                product
            );
        }
    }

    showElement(modal);
}


function closeProductModal() {
    const modal =
        getElement("productModal");

    hideElement(modal);
}


function fillFormFromObject(form, object) {
    if (!form || !object) {
        return;
    }

    Object.keys(object).forEach((key) => {
        const input =
            form.querySelector(
                `[name="${CSS.escape(key)}"]`
            );

        if (input) {
            input.value =
                object[key] ?? "";
        }
    });

    const aliases = {
        productID: [
            "id",
            "productID",
            "รหัสสินค้า"
        ],

        name: [
            "name",
            "productName",
            "ชื่อสินค้า"
        ],

        price: [
            "price",
            "salePrice",
            "ราคาขาย"
        ],

        cost: [
            "cost",
            "costPrice",
            "ราคาทุน"
        ],

        quantity: [
            "quantity",
            "qty",
            "จำนวน"
        ],

        taxRate: [
            "taxRate",
            "ภาษี%"
        ]
    };

    Object.keys(aliases).forEach((field) => {
        const target =
            form.querySelector(
                `[name="${field}"]`
            );

        if (!target) {
            return;
        }

        const keys =
            aliases[field];

        for (const key of keys) {
            if (object[key] !== undefined) {
                target.value =
                    object[key];

                break;
            }
        }
    });
}


async function saveProduct() {
    const form =
        getElement("productForm");

    if (!form) {
        return;
    }

    const formData =
        new FormData(form);

    const product = {};

    formData.forEach((value, key) => {
        product[key] = value;
    });

    try {
        setLoading(
            true,
            "กำลังบันทึกสินค้า..."
        );

        const id =
            product.id ||
            product.productID ||
            product["สินค้าID"];

        let result;

        if (id) {
            result = await apiRequest(
                "updateRow",
                {
                    sheetName: "Products",
                    id: id,
                    data: product,
                    session: getSessionValue(),
                    token: getSessionValue()
                }
            );
        } else {
            result = await apiRequest(
                "insertRow",
                {
                    sheetName: "Products",
                    data: product,
                    session: getSessionValue(),
                    token: getSessionValue()
                }
            );
        }

        if (!isApiSuccess(result)) {
            throw new Error(
                getApiMessage(
                    result,
                    "บันทึกสินค้าไม่สำเร็จ"
                )
            );
        }

        showSuccess("บันทึกสินค้าเรียบร้อย");

        closeProductModal();

        await loadProducts();

    } catch (error) {
        console.error(
            "saveProduct:",
            error
        );

        showError(error.message);

    } finally {
        setLoading(false);
    }
}


async function editProduct(id) {
    const product =
        AppState.products.find(
            (item) =>
                String(getProductId(item)) ===
                String(id)
        );

    if (!product) {
        showError("ไม่พบข้อมูลสินค้า");
        return;
    }

    openProductModal(product);
}


async function deleteProduct(id) {
    const confirmed =
        window.confirm(
            "ต้องการลบสินค้านี้ใช่หรือไม่?"
        );

    if (!confirmed) {
        return;
    }

    try {
        setLoading(
            true,
            "กำลังลบสินค้า..."
        );

        const result =
            await apiRequest(
                "deleteRow",
                {
                    sheetName: "Products",
                    id: id,
                    session: getSessionValue(),
                    token: getSessionValue()
                }
            );

        if (!isApiSuccess(result)) {
            throw new Error(
                getApiMessage(
                    result,
                    "ลบสินค้าไม่สำเร็จ"
                )
            );
        }

        showSuccess(
            "ลบสินค้าเรียบร้อย"
        );

        await loadProducts();

    } catch (error) {
        console.error(
            "deleteProduct:",
            error
        );

        showError(error.message);

    } finally {
        setLoading(false);
    }
}


/* ============================================================
   26. CUSTOMERS
   ============================================================ */

async function loadCustomers() {
    if (!validateApiUrl()) {
        return;
    }

    try {
        const result =
            await apiRequest(
                "listRows",
                {
                    sheetName: "Customers",
                    session: getSessionValue(),
                    token: getSessionValue()
                }
            );

        if (!isApiSuccess(result)) {
            throw new Error(
                getApiMessage(
                    result,
                    "โหลดข้อมูลลูกค้าไม่สำเร็จ"
                )
            );
        }

        AppState.customers =
            normalizeArrayData(
                getApiData(result)
            );

        renderCustomers(
            AppState.customers
        );

        populateCustomerSelects(
            AppState.customers
        );

    } catch (error) {
        console.error(
            "loadCustomers:",
            error
        );
    }
}


function getCustomerId(customer) {
    return (
        customer.id ||
        customer.ID ||
        customer.customerID ||
        customer["ลูกค้าID"] ||
        customer["รหัสลูกค้า"] ||
        ""
    );
}


function getCustomerName(customer) {
    return (
        customer.name ||
        customer.customerName ||
        customer["ชื่อลูกค้า"] ||
        customer["ชื่อ"] ||
        ""
    );
}


function getCustomerPhone(customer) {
    return (
        customer.phone ||
        customer.tel ||
        customer["โทรศัพท์"] ||
        customer["เบอร์โทร"] ||
        ""
    );
}


function renderCustomers(customers) {
    const table =
        getElement("customersTable");

    if (!table) {
        return;
    }

    let tbody =
        table.querySelector("tbody");

    if (!tbody) {
        tbody =
            document.createElement("tbody");

        table.appendChild(tbody);
    }

    tbody.innerHTML = "";

    customers.forEach(
        (customer, index) => {
            const row =
                document.createElement("tr");

            row.innerHTML = `
                <td>${index + 1}</td>
                <td>${escapeHtml(
                    getCustomerId(customer)
                )}</td>
                <td>${escapeHtml(
                    getCustomerName(customer)
                )}</td>
                <td>${escapeHtml(
                    getCustomerPhone(customer)
                )}</td>
                <td>
                    <button
                        type="button"
                        class="btn btn-sm"
                        onclick="editCustomer('${escapeHtml(
                            getCustomerId(customer)
                        )}')">
                        แก้ไข
                    </button>

                    <button
                        type="button"
                        class="btn btn-sm btn-danger"
                        onclick="deleteCustomer('${escapeHtml(
                            getCustomerId(customer)
                        )}')">
                        ลบ
                    </button>
                </td>
            `;

            tbody.appendChild(row);
        }
    );
}


function populateCustomerSelects(customers) {
    const selects = [
        "#saleCustomer",
        "#customerSelect"
    ];

    selects.forEach((selector) => {
        const select = $(selector);

        if (!select) {
            return;
        }

        select.innerHTML =
            `<option value="">-- ลูกค้าทั่วไป --</option>`;

        customers.forEach(
            (customer) => {
                const option =
                    document.createElement("option");

                option.value =
                    getCustomerId(customer);

                option.textContent =
                    getCustomerName(customer);

                select.appendChild(option);
            }
        );
    });
}


function openCustomerModal(customer = null) {
    const modal =
        getElement("customerModal");

    if (!modal) {
        return;
    }

    const form =
        getElement("customerForm");

    if (form) {
        form.reset();

        if (customer) {
            fillFormFromObject(
                form,
                customer
            );
        }
    }

    showElement(modal);
}


function closeCustomerModal() {
    hideElement(
        getElement("customerModal")
    );
}


async function saveCustomer() {
    const form =
        getElement("customerForm");

    if (!form) {
        return;
    }

    const formData =
        new FormData(form);

    const customer = {};

    formData.forEach((value, key) => {
        customer[key] = value;
    });

    try {
        setLoading(
            true,
            "กำลังบันทึกลูกค้า..."
        );

        const id =
            customer.id ||
            customer.customerID ||
            customer["ลูกค้าID"];

        const result =
            await apiRequest(
                id
                    ? "updateRow"
                    : "insertRow",
                {
                    sheetName: "Customers",
                    id: id,
                    data: customer,
                    session: getSessionValue(),
                    token: getSessionValue()
                }
            );

        if (!isApiSuccess(result)) {
            throw new Error(
                getApiMessage(
                    result,
                    "บันทึกลูกค้าไม่สำเร็จ"
                )
            );
        }

        showSuccess(
            "บันทึกลูกค้าเรียบร้อย"
        );

        closeCustomerModal();

        await loadCustomers();

    } catch (error) {
        console.error(
            "saveCustomer:",
            error
        );

        showError(error.message);

    } finally {
        setLoading(false);
    }
}


async function editCustomer(id) {
    const customer =
        AppState.customers.find(
            (item) =>
                String(getCustomerId(item)) ===
                String(id)
        );

    if (!customer) {
        showError("ไม่พบข้อมูลลูกค้า");
        return;
    }

    openCustomerModal(customer);
}


async function deleteCustomer(id) {
    const confirmed =
        window.confirm(
            "ต้องการลบลูกค้านี้ใช่หรือไม่?"
        );

    if (!confirmed) {
        return;
    }

    try {
        setLoading(
            true,
            "กำลังลบลูกค้า..."
        );

        const result =
            await apiRequest(
                "deleteRow",
                {
                    sheetName: "Customers",
                    id: id,
                    session: getSessionValue(),
                    token: getSessionValue()
                }
            );

        if (!isApiSuccess(result)) {
            throw new Error(
                getApiMessage(
                    result,
                    "ลบลูกค้าไม่สำเร็จ"
                )
            );
        }

        showSuccess(
            "ลบลูกค้าเรียบร้อย"
        );

        await loadCustomers();

    } catch (error) {
        console.error(
            "deleteCustomer:",
            error
        );

        showError(error.message);

    } finally {
        setLoading(false);
    }
}


/* ============================================================
   27. SUPPLIERS
   ============================================================ */

async function loadSuppliers() {
    if (!validateApiUrl()) {
        return;
    }

    try {
        const result =
            await apiRequest(
                "listRows",
                {
                    sheetName: "Suppliers",
                    session: getSessionValue(),
                    token: getSessionValue()
                }
            );

        if (!isApiSuccess(result)) {
            throw new Error(
                getApiMessage(
                    result,
                    "โหลดข้อมูลผู้จำหน่ายไม่สำเร็จ"
                )
            );
        }

        AppState.suppliers =
            normalizeArrayData(
                getApiData(result)
            );

        renderSuppliers(
            AppState.suppliers
        );

        populateSupplierSelects(
            AppState.suppliers
        );

    } catch (error) {
        console.error(
            "loadSuppliers:",
            error
        );
    }
}


function getSupplierId(supplier) {
    return (
        supplier.id ||
        supplier.ID ||
        supplier.supplierID ||
        supplier["ผู้จำหน่ายID"] ||
        supplier["รหัสผู้จำหน่าย"] ||
        ""
    );
}


function getSupplierName(supplier) {
    return (
        supplier.name ||
        supplier.supplierName ||
        supplier["ชื่อผู้จำหน่าย"] ||
        supplier["ชื่อ"] ||
        ""
    );
}


function getSupplierPhone(supplier) {
    return (
        supplier.phone ||
        supplier.tel ||
        supplier["โทรศัพท์"] ||
        supplier["เบอร์โทร"] ||
        ""
    );
}


function renderSuppliers(suppliers) {
    const table =
        getElement("suppliersTable");

    if (!table) {
        return;
    }

    let tbody =
        table.querySelector("tbody");

    if (!tbody) {
        tbody =
            document.createElement("tbody");

        table.appendChild(tbody);
    }

    tbody.innerHTML = "";

    suppliers.forEach(
        (supplier, index) => {
            const row =
                document.createElement("tr");

            row.innerHTML = `
                <td>${index + 1}</td>
                <td>${escapeHtml(
                    getSupplierId(supplier)
                )}</td>
                <td>${escapeHtml(
                    getSupplierName(supplier)
                )}</td>
                <td>${escapeHtml(
                    getSupplierPhone(supplier)
                )}</td>
                <td>
                    <button
                        type="button"
                        class="btn btn-sm"
                        onclick="editSupplier('${escapeHtml(
                            getSupplierId(supplier)
                        )}')">
                        แก้ไข
                    </button>

                    <button
                        type="button"
                        class="btn btn-sm btn-danger"
                        onclick="deleteSupplier('${escapeHtml(
                            getSupplierId(supplier)
                        )}')">
                        ลบ
                    </button>
                </td>
            `;

            tbody.appendChild(row);
        }
    );
}


function populateSupplierSelects(suppliers) {
    const selects = [
        "#purchaseSupplier",
        "#supplierSelect"
    ];

    selects.forEach((selector) => {
        const select = $(selector);

        if (!select) {
            return;
        }

        select.innerHTML =
            `<option value="">-- เลือกผู้จำหน่าย --</option>`;

        suppliers.forEach(
            (supplier) => {
                const option =
                    document.createElement("option");

                option.value =
                    getSupplierId(supplier);

                option.textContent =
                    getSupplierName(supplier);

                select.appendChild(option);
            }
        );
    });
}


function openSupplierModal(supplier = null) {
    const modal =
        getElement("supplierModal");

    if (!modal) {
        return;
    }

    const form =
        getElement("supplierForm");

    if (form) {
        form.reset();

        if (supplier) {
            fillFormFromObject(
                form,
                supplier
            );
        }
    }

    showElement(modal);
}


function closeSupplierModal() {
    hideElement(
        getElement("supplierModal")
    );
}


async function saveSupplier() {
    const form =
        getElement("supplierForm");

    if (!form) {
        return;
    }

    const formData =
        new FormData(form);

    const supplier = {};

    formData.forEach((value, key) => {
        supplier[key] = value;
    });

    try {
        setLoading(
            true,
            "กำลังบันทึกผู้จำหน่าย..."
        );

        const id =
            supplier.id ||
            supplier.supplierID ||
            supplier["ผู้จำหน่ายID"];

        const result =
            await apiRequest(
                id
                    ? "updateRow"
                    : "insertRow",
                {
                    sheetName: "Suppliers",
                    id: id,
                    data: supplier,
                    session: getSessionValue(),
                    token: getSessionValue()
                }
            );

        if (!isApiSuccess(result)) {
            throw new Error(
                getApiMessage(
                    result,
                    "บันทึกผู้จำหน่ายไม่สำเร็จ"
                )
            );
        }

        showSuccess(
            "บันทึกผู้จำหน่ายเรียบร้อย"
        );

        closeSupplierModal();

        await loadSuppliers();

    } catch (error) {
        console.error(
            "saveSupplier:",
            error
        );

        showError(error.message);

    } finally {
        setLoading(false);
    }
}


async function editSupplier(id) {
    const supplier =
        AppState.suppliers.find(
            (item) =>
                String(getSupplierId(item)) ===
                String(id)
        );

    if (!supplier) {
        showError("ไม่พบข้อมูลผู้จำหน่าย");
        return;
    }

    openSupplierModal(supplier);
}


async function deleteSupplier(id) {
    const confirmed =
        window.confirm(
            "ต้องการลบผู้จำหน่ายนี้ใช่หรือไม่?"
        );

    if (!confirmed) {
        return;
    }

    try {
        setLoading(
            true,
            "กำลังลบผู้จำหน่าย..."
        );

        const result =
            await apiRequest(
                "deleteRow",
                {
                    sheetName: "Suppliers",
                    id: id,
                    session: getSessionValue(),
                    token: getSessionValue()
                }
            );

        if (!isApiSuccess(result)) {
            throw new Error(
                getApiMessage(
                    result,
                    "ลบผู้จำหน่ายไม่สำเร็จ"
                )
            );
        }

        showSuccess(
            "ลบผู้จำหน่ายเรียบร้อย"
        );

        await loadSuppliers();

    } catch (error) {
        console.error(
            "deleteSupplier:",
            error
        );

        showError(error.message);

    } finally {
        setLoading(false);
    }
}


/* ============================================================
   28. SALES
   ============================================================ */

async function loadSales() {
    if (!validateApiUrl()) {
        return;
    }

    try {
        const result =
            await apiRequest(
                "listRows",
                {
                    sheetName: "Sales",
                    session: getSessionValue(),
                    token: getSessionValue()
                }
            );

        if (!isApiSuccess(result)) {
            throw new Error(
                getApiMessage(
                    result,
                    "โหลดข้อมูลการขายไม่สำเร็จ"
                )
            );
        }

        AppState.sales =
            normalizeArrayData(
                getApiData(result)
            );

        renderSales(
            AppState.sales
        );

    } catch (error) {
        console.error(
            "loadSales:",
            error
        );
    }
}


function getSaleId(sale) {
    return (
        sale.id ||
        sale.ID ||
        sale.saleID ||
        sale["ขายID"] ||
        sale["เลขที่ขาย"] ||
        sale.documentNo ||
        sale["เลขที่เอกสาร"] ||
        ""
    );
}


function getSaleTotal(sale) {
    return toNumber(
        sale.grandTotal ||
        sale.total ||
        sale["ยอดสุทธิ"] ||
        sale["รวมทั้งสิ้น"] ||
        0
    );
}


function renderSales(sales) {
    const table =
        getElement("salesTable");

    if (!table) {
        return;
    }

    let tbody =
        table.querySelector("tbody");

    if (!tbody) {
        tbody =
            document.createElement("tbody");

        table.appendChild(tbody);
    }

    tbody.innerHTML = "";

    sales.forEach(
        (sale, index) => {
            const row =
                document.createElement("tr");

            const date =
                sale.date ||
                sale.saleDate ||
                sale["วันที่"] ||
                sale.createdAt;

            const customer =
                sale.customerName ||
                sale["ชื่อลูกค้า"] ||
                sale["ลูกค้า"] ||
                "ลูกค้าทั่วไป";

            row.innerHTML = `
                <td>${index + 1}</td>
                <td>${escapeHtml(
                    getSaleId(sale)
                )}</td>
                <td>${escapeHtml(
                    formatDate(date)
                )}</td>
                <td>${escapeHtml(
                    customer
                )}</td>
                <td>${formatMoney(
                    getSaleTotal(sale)
                )}</td>
                <td>
                    <button
                        type="button"
                        class="btn btn-sm"
                        onclick="viewSale('${escapeHtml(
                            getSaleId(sale)
                        )}')">
                        ดู
                    </button>
                </td>
            `;

            tbody.appendChild(row);
        }
    );
}


function addSaleItemFromForm() {
    const productSelect =
        getElement("saleProduct");

    const quantityInput =
        getElement("saleQuantity");

    if (!productSelect) {
        showError(
            "ไม่พบช่องเลือกสินค้า"
        );

        return;
    }

    const productId =
        productSelect.value;

    const quantity =
        quantityInput
            ? toNumber(quantityInput.value)
            : 1;

    if (!productId) {
        showWarning(
            "กรุณาเลือกสินค้า"
        );

        return;
    }

    if (quantity <= 0) {
        showWarning(
            "จำนวนสินค้าต้องมากกว่า 0"
        );

        return;
    }

    const product =
        AppState.products.find(
            (item) =>
                String(getProductId(item)) ===
                String(productId)
        );

    if (!product) {
        showError(
            "ไม่พบข้อมูลสินค้า"
        );

        return;
    }

    const stock =
        getProductQuantity(product);

    if (quantity > stock) {
        showWarning(
            `สินค้าเหลือ ${formatNumber(stock, 2)} หน่วย`
        );

        return;
    }

    const existing =
        AppState.saleCart.find(
            (item) =>
                String(item.productID) ===
                String(productId)
        );

    if (existing) {
        const newQuantity =
            existing.quantity +
            quantity;

        if (newQuantity > stock) {
            showWarning(
                `สินค้าเหลือ ${formatNumber(stock, 2)} หน่วย`
            );

            return;
        }

        existing.quantity =
            newQuantity;

    } else {
        AppState.saleCart.push({
            productID: getProductId(product),
            code: getProductCode(product),
            name: getProductName(product),
            quantity: quantity,
            price: getProductPrice(product),
            cost: getProductCost(product),
            taxRate: getProductTaxRate(product)
        });
    }

    updateSaleCartDisplay();

    if (quantityInput) {
        quantityInput.value = "1";
    }
}


function removeSaleItem(index) {
    AppState.saleCart.splice(
        index,
        1
    );

    updateSaleCartDisplay();
}


function updateSaleItemQuantity(
    index,
    quantity
) {
    const item =
        AppState.saleCart[index];

    if (!item) {
        return;
    }

    const product =
        AppState.products.find(
            (productItem) =>
                String(
                    getProductId(productItem)
                ) ===
                String(item.productID)
        );

    const stock =
        product
            ? getProductQuantity(product)
            : Infinity;

    let newQuantity =
        toNumber(quantity);

    if (newQuantity <= 0) {
        removeSaleItem(index);
        return;
    }

    if (newQuantity > stock) {
        newQuantity = stock;
    }

    item.quantity =
        newQuantity;

    updateSaleCartDisplay();
}


function clearSaleCart() {
    AppState.saleCart = [];

    updateSaleCartDisplay();
}


function calculateSaleSubtotal() {
    return AppState.saleCart.reduce(
        (sum, item) =>
            sum +
            toNumber(item.quantity) *
            toNumber(item.price),
        0
    );
}


function calculateSaleTax() {
    return AppState.saleCart.reduce(
        (sum, item) => {
            const lineTotal =
                toNumber(item.quantity) *
                toNumber(item.price);

            const taxRate =
                toNumber(item.taxRate);

            return sum +
                (
                    lineTotal *
                    taxRate /
                    100
                );
        },
        0
    );
}


function calculateSaleTotal() {
    return (
        calculateSaleSubtotal() +
        calculateSaleTax()
    );
}


function updateSaleTotals() {
    const subtotal =
        calculateSaleSubtotal();

    const tax =
        calculateSaleTax();

    const total =
        subtotal + tax;

    setTextByIds(
        [
            "saleSubtotal",
            "salesSubtotal"
        ],
        formatMoneyShort(subtotal)
    );

    setTextByIds(
        [
            "saleTax",
            "salesTax"
        ],
        formatMoneyShort(tax)
    );

    setTextByIds(
        [
            "saleTotal",
            "salesTotal",
            "grandTotal"
        ],
        formatMoneyShort(total)
    );
}


function updateSaleCartDisplay() {
    const container =
        getElement("saleCart");

    if (!container) {
        updateSaleTotals();

        return;
    }

    container.innerHTML = "";

    if (
        AppState.saleCart.length === 0
    ) {
        container.innerHTML = `
            <div class="empty-state">
                ยังไม่มีสินค้าในรายการขาย
            </div>
        `;

        updateSaleTotals();

        return;
    }

    AppState.saleCart.forEach(
        (item, index) => {
            const lineTotal =
                toNumber(item.quantity) *
                toNumber(item.price);

            const row =
                document.createElement("div");

            row.className =
                "sale-cart-item";

            row.innerHTML = `
                <div class="sale-cart-info">
                    <strong>
                        ${escapeHtml(item.name)}
                    </strong>

                    <small>
                        ${escapeHtml(item.code)}
                    </small>
                </div>

                <div class="sale-cart-price">
                    ${formatMoneyShort(item.price)}
                </div>

                <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value="${item.quantity}"
                    class="cart-quantity"
                    onchange="updateSaleItemQuantity(
                        ${index},
                        this.value
                    )">

                <div class="sale-cart-total">
                    ${formatMoneyShort(lineTotal)}
                </div>

                <button
                    type="button"
                    class="btn btn-sm btn-danger"
                    onclick="removeSaleItem(${index})">
                    ลบ
                </button>
            `;

            container.appendChild(row);
        }
    );

    updateSaleTotals();
}


async function submitSale() {
    if (
        AppState.saleCart.length === 0
    ) {
        showWarning(
            "กรุณาเพิ่มสินค้าในรายการขาย"
        );

        return;
    }

    const saleDate =
        getValue(
            "saleDate"
        ) || todayInputValue();

    const customerSelect =
        getElement("saleCustomer");

    const paymentMethod =
        getValue(
            "salePaymentMethod"
        ) ||
        getValue(
            "paymentMethod"
        ) ||
        "เงินสด";

    const customerID =
        customerSelect
            ? customerSelect.value
            : "";

    const customer =
        AppState.customers.find(
            (item) =>
                String(
                    getCustomerId(item)
                ) ===
                String(customerID)
        );

    const header = {
        date: saleDate,

        "ลูกค้าID":
            customerID,

        customerID:
            customerID,

        customerName:
            customer
                ? getCustomerName(customer)
                : "ลูกค้าทั่วไป",

        paymentMethod:
            paymentMethod
    };

    const items =
        AppState.saleCart.map(
            (item) => ({
                productID:
                    item.productID,

                productCode:
                    item.code,

                productName:
                    item.name,

                quantity:
                    toNumber(item.quantity),

                price:
                    toNumber(item.price),

                cost:
                    toNumber(item.cost),

                taxRate:
                    toNumber(item.taxRate)
            })
        );

    try {
        setLoading(
            true,
            "กำลังบันทึกการขาย..."
        );

        const result =
            await apiRequest(
                "createSale",
                {
                    header: header,
                    items: items,
                    session: getSessionValue(),
                    token: getSessionValue()
                }
            );

        if (!isApiSuccess(result)) {
            throw new Error(
                getApiMessage(
                    result,
                    "บันทึกการขายไม่สำเร็จ"
                )
            );
        }

        const data =
            getApiData(result);

        showSuccess(
            "บันทึกการขายเรียบร้อย"
        );

        clearSaleCart();

        await loadProducts();

        await loadSales();

        await loadDashboard();

        if (data) {
            showSaleResult(data);
        }

    } catch (error) {
        console.error(
            "submitSale:",
            error
        );

        showError(error.message);

    } finally {
        setLoading(false);
    }
}


function showSaleResult(data) {
    const documentNumber =
        data.documentNo ||
        data.saleID ||
        data.id ||
        data["เลขที่เอกสาร"];

    if (documentNumber) {
        showToast(
            `เลขที่เอกสาร: ${documentNumber}`,
            "success"
        );
    }
}


function viewSale(id) {
    const sale =
        AppState.sales.find(
            (item) =>
                String(getSaleId(item)) ===
                String(id)
        );

    if (!sale) {
        showError(
            "ไม่พบข้อมูลรายการขาย"
        );

        return;
    }

    showDocumentPreview(
        "ใบขายสินค้า",
        sale
    );
}


/* ============================================================
   29. PURCHASES
   ============================================================ */

async function loadPurchases() {
    if (!validateApiUrl()) {
        return;
    }

    try {
        const result =
            await apiRequest(
                "listRows",
                {
                    sheetName: "Purchases",
                    session: getSessionValue(),
                    token: getSessionValue()
                }
            );

        if (!isApiSuccess(result)) {
            throw new Error(
                getApiMessage(
                    result,
                    "โหลดข้อมูลการซื้อไม่สำเร็จ"
                )
            );
        }

        AppState.purchases =
            normalizeArrayData(
                getApiData(result)
            );

        renderPurchases(
            AppState.purchases
        );

    } catch (error) {
        console.error(
            "loadPurchases:",
            error
        );
    }
}


function getPurchaseId(purchase) {
    return (
        purchase.id ||
        purchase.ID ||
        purchase.purchaseID ||
        purchase["ซื้อID"] ||
        purchase["เลขที่ซื้อ"] ||
        purchase.documentNo ||
        purchase["เลขที่เอกสาร"] ||
        ""
    );
}


function getPurchaseTotal(purchase) {
    return toNumber(
        purchase.grandTotal ||
        purchase.total ||
        purchase["ยอดสุทธิ"] ||
        purchase["รวมทั้งสิ้น"] ||
        0
    );
}


function renderPurchases(purchases) {
    const table =
        getElement("purchasesTable");

    if (!table) {
        return;
    }

    let tbody =
        table.querySelector("tbody");

    if (!tbody) {
        tbody =
            document.createElement("tbody");

        table.appendChild(tbody);
    }

    tbody.innerHTML = "";

    purchases.forEach(
        (purchase, index) => {
            const row =
                document.createElement("tr");

            const date =
                purchase.date ||
                purchase.purchaseDate ||
                purchase["วันที่"] ||
                purchase.createdAt;

            const supplier =
                purchase.supplierName ||
                purchase["ชื่อผู้จำหน่าย"] ||
                purchase["ผู้จำหน่าย"] ||
                "";

            row.innerHTML = `
                <td>${index + 1}</td>
                <td>${escapeHtml(
                    getPurchaseId(purchase)
                )}</td>
                <td>${escapeHtml(
                    formatDate(date)
                )}</td>
                <td>${escapeHtml(
                    supplier
                )}</td>
                <td>${formatMoney(
                    getPurchaseTotal(purchase)
                )}</td>
                <td>
                    <button
                        type="button"
                        class="btn btn-sm"
                        onclick="viewPurchase('${escapeHtml(
                            getPurchaseId(purchase)
                        )}')">
                        ดู
                    </button>
                </td>
            `;

            tbody.appendChild(row);
        }
    );
}


function addPurchaseItemFromForm() {
    const productSelect =
        getElement("purchaseProduct");

    const quantityInput =
        getElement("purchaseQuantity");

    const priceInput =
        getElement("purchasePrice");

    if (!productSelect) {
        showError(
            "ไม่พบช่องเลือกสินค้า"
        );

        return;
    }

    const productId =
        productSelect.value;

    const quantity =
        quantityInput
            ? toNumber(quantityInput.value)
            : 1;

    const product =
        AppState.products.find(
            (item) =>
                String(getProductId(item)) ===
                String(productId)
        );

    if (!product) {
        showWarning(
            "กรุณาเลือกสินค้า"
        );

        return;
    }

    if (quantity <= 0) {
        showWarning(
            "จำนวนต้องมากกว่า 0"
        );

        return;
    }

    const price =
        priceInput &&
        priceInput.value !== ""
            ? toNumber(priceInput.value)
            : getProductCost(product);

    AppState.purchaseCart.push({
        productID:
            getProductId(product),

        code:
            getProductCode(product),

        name:
            getProductName(product),

        quantity:
            quantity,

        price:
            price,

        cost:
            price,

        taxRate:
            getProductTaxRate(product)
    });

    updatePurchaseCartDisplay();

    if (quantityInput) {
        quantityInput.value = "1";
    }

    if (priceInput) {
        priceInput.value = "";
    }
}


function removePurchaseItem(index) {
    AppState.purchaseCart.splice(
        index,
        1
    );

    updatePurchaseCartDisplay();
}


function clearPurchaseCart() {
    AppState.purchaseCart = [];

    updatePurchaseCartDisplay();
}


function calculatePurchaseSubtotal() {
    return AppState.purchaseCart.reduce(
        (sum, item) =>
            sum +
            toNumber(item.quantity) *
            toNumber(item.price),
        0
    );
}


function calculatePurchaseTax() {
    return AppState.purchaseCart.reduce(
        (sum, item) => {
            const lineTotal =
                toNumber(item.quantity) *
                toNumber(item.price);

            const taxRate =
                toNumber(item.taxRate);

            return sum +
                (
                    lineTotal *
                    taxRate /
                    100
                );
        },
        0
    );
}


function updatePurchaseTotals() {
    const subtotal =
        calculatePurchaseSubtotal();

    const tax =
        calculatePurchaseTax();

    const total =
        subtotal + tax;

    setTextByIds(
        [
            "purchaseSubtotal",
            "purchasesSubtotal"
        ],
        formatMoneyShort(subtotal)
    );

    setTextByIds(
        [
            "purchaseTax",
            "purchasesTax"
        ],
        formatMoneyShort(tax)
    );

    setTextByIds(
        [
            "purchaseTotal",
            "purchasesTotal"
        ],
        formatMoneyShort(total)
    );
}


function updatePurchaseCartDisplay() {
    const container =
        getElement("purchaseCart");

    if (!container) {
        updatePurchaseTotals();

        return;
    }

    container.innerHTML = "";

    if (
        AppState.purchaseCart.length === 0
    ) {
        container.innerHTML = `
            <div class="empty-state">
                ยังไม่มีสินค้าในรายการซื้อ
            </div>
        `;

        updatePurchaseTotals();

        return;
    }

    AppState.purchaseCart.forEach(
        (item, index) => {
            const lineTotal =
                toNumber(item.quantity) *
                toNumber(item.price);

            const row =
                document.createElement("div");

            row.className =
                "purchase-cart-item";

            row.innerHTML = `
                <div>
                    <strong>
                        ${escapeHtml(item.name)}
                    </strong>

                    <small>
                        ${escapeHtml(item.code)}
                    </small>
                </div>

                <div>
                    ${formatMoneyShort(item.price)}
                </div>

                <div>
                    ${formatNumber(
                        item.quantity,
                        2
                    )}
                </div>

                <div>
                    ${formatMoneyShort(lineTotal)}
                </div>

                <button
                    type="button"
                    class="btn btn-sm btn-danger"
                    onclick="removePurchaseItem(${index})">
                    ลบ
                </button>
            `;

            container.appendChild(row);
        }
    );

    updatePurchaseTotals();
}


async function submitPurchase() {
    if (
        AppState.purchaseCart.length === 0
    ) {
        showWarning(
            "กรุณาเพิ่มสินค้าในรายการซื้อ"
        );

        return;
    }

    const purchaseDate =
        getValue(
            "purchaseDate"
        ) || todayInputValue();

    const supplierID =
        getValue(
            "purchaseSupplier"
        ) ||
        getValue(
            "supplierSelect"
        );

    const supplier =
        AppState.suppliers.find(
            (item) =>
                String(
                    getSupplierId(item)
                ) ===
                String(supplierID)
        );

    const paymentMethod =
        getValue(
            "purchasePaymentMethod"
        ) ||
        getValue(
            "purchasePayment"
        ) ||
        "เงินสด";

    const header = {
        date: purchaseDate,

        /*
         * Code.gs ของเราใช้ supplierID
         */
        supplierID:
            supplierID,

        supplierName:
            supplier
                ? getSupplierName(supplier)
                : "",

        paymentMethod:
            paymentMethod
    };

    const items =
        AppState.purchaseCart.map(
            (item) => ({
                productID:
                    item.productID,

                productCode:
                    item.code,

                productName:
                    item.name,

                quantity:
                    toNumber(item.quantity),

                price:
                    toNumber(item.price),

                cost:
                    toNumber(item.cost),

                taxRate:
                    toNumber(item.taxRate)
            })
        );

    try {
        setLoading(
            true,
            "กำลังบันทึกการซื้อ..."
        );

        const result =
            await apiRequest(
                "createPurchase",
                {
                    header: header,
                    items: items,
                    session: getSessionValue(),
                    token: getSessionValue()
                }
            );

        if (!isApiSuccess(result)) {
            throw new Error(
                getApiMessage(
                    result,
                    "บันทึกการซื้อไม่สำเร็จ"
                )
            );
        }

        showSuccess(
            "บันทึกการซื้อเรียบร้อย"
        );

        clearPurchaseCart();

        await loadProducts();

        await loadPurchases();

        await loadDashboard();

    } catch (error) {
        console.error(
            "submitPurchase:",
            error
        );

        showError(error.message);

    } finally {
        setLoading(false);
    }
}


function viewPurchase(id) {
    const purchase =
        AppState.purchases.find(
            (item) =>
                String(
                    getPurchaseId(item)
                ) ===
                String(id)
        );

    if (!purchase) {
        showError(
            "ไม่พบข้อมูลรายการซื้อ"
        );

        return;
    }

    showDocumentPreview(
        "ใบซื้อสินค้า",
        purchase
    );
}


/* ============================================================
   30. EXPENSES
   ============================================================ */

async function loadExpenses() {
    if (!validateApiUrl()) {
        return;
    }

    try {
        const result =
            await apiRequest(
                "listRows",
                {
                    sheetName: "Expenses",
                    session: getSessionValue(),
                    token: getSessionValue()
                }
            );

        if (!isApiSuccess(result)) {
            throw new Error(
                getApiMessage(
                    result,
                    "โหลดรายจ่ายไม่สำเร็จ"
                )
            );
        }

        AppState.expenses =
            normalizeArrayData(
                getApiData(result)
            );

        renderExpenses(
            AppState.expenses
        );

    } catch (error) {
        console.error(
            "loadExpenses:",
            error
        );
    }
}


function getExpenseId(expense) {
    return (
        expense.id ||
        expense.ID ||
        expense.expenseID ||
        expense["รายจ่ายID"] ||
        ""
    );
}


function getExpenseAmount(expense) {
    return toNumber(
        expense.amount ||
        expense["จำนวนเงิน"] ||
        expense.total ||
        0
    );
}


function renderExpenses(expenses) {
    const table =
        getElement("expensesTable");

    if (!table) {
        return;
    }

    let tbody =
        table.querySelector("tbody");

    if (!tbody) {
        tbody =
            document.createElement("tbody");

        table.appendChild(tbody);
    }

    tbody.innerHTML = "";

    expenses.forEach(
        (expense, index) => {
            const row =
                document.createElement("tr");

            const date =
                expense.date ||
                expense.expenseDate ||
                expense["วันที่"];

            const description =
                expense.description ||
                expense["รายละเอียด"] ||
                expense["รายการ"] ||
                "";

            row.innerHTML = `
                <td>${index + 1}</td>
                <td>${escapeHtml(
                    getExpenseId(expense)
                )}</td>
                <td>${escapeHtml(
                    formatDate(date)
                )}</td>
                <td>${escapeHtml(
                    description
                )}</td>
                <td>${formatMoney(
                    getExpenseAmount(expense)
                )}</td>
                <td>
                    <button
                        type="button"
                        class="btn btn-sm btn-danger"
                        onclick="deleteExpense('${escapeHtml(
                            getExpenseId(expense)
                        )}')">
                        ลบ
                    </button>
                </td>
            `;

            tbody.appendChild(row);
        }
    );
}


function openExpenseModal(expense = null) {
    const modal =
        getElement("expenseModal");

    if (!modal) {
        return;
    }

    const form =
        getElement("expenseForm");

    if (form) {
        form.reset();

        if (expense) {
            fillFormFromObject(
                form,
                expense
            );
        }
    }

    showElement(modal);
}


function closeExpenseModal() {
    hideElement(
        getElement("expenseModal")
    );
}


async function saveExpense() {
    const form =
        getElement("expenseForm");

    if (!form) {
        return;
    }

    const formData =
        new FormData(form);

    const expense = {};

    formData.forEach((value, key) => {
        expense[key] = value;
    });

    try {
        setLoading(
            true,
            "กำลังบันทึกรายจ่าย..."
        );

        const id =
            expense.id ||
            expense.expenseID ||
            expense["รายจ่ายID"];

        const result =
            await apiRequest(
                id
                    ? "updateRow"
                    : "insertRow",
                {
                    sheetName: "Expenses",
                    id: id,
                    data: expense,
                    session: getSessionValue(),
                    token: getSessionValue()
                }
            );

        if (!isApiSuccess(result)) {
            throw new Error(
                getApiMessage(
                    result,
                    "บันทึกรายจ่ายไม่สำเร็จ"
                )
            );
        }

        showSuccess(
            "บันทึกรายจ่ายเรียบร้อย"
        );

        closeExpenseModal();

        await loadExpenses();

        await loadDashboard();

    } catch (error) {
        console.error(
            "saveExpense:",
            error
        );

        showError(error.message);

    } finally {
        setLoading(false);
    }
}


async function deleteExpense(id) {
    const confirmed =
        window.confirm(
            "ต้องการลบรายจ่ายนี้ใช่หรือไม่?"
        );

    if (!confirmed) {
        return;
    }

    try {
        setLoading(
            true,
            "กำลังลบรายจ่าย..."
        );

        const result =
            await apiRequest(
                "deleteRow",
                {
                    sheetName: "Expenses",
                    id: id,
                    session: getSessionValue(),
                    token: getSessionValue()
                }
            );

        if (!isApiSuccess(result)) {
            throw new Error(
                getApiMessage(
                    result,
                    "ลบรายจ่ายไม่สำเร็จ"
                )
            );
        }

        showSuccess(
            "ลบรายจ่ายเรียบร้อย"
        );

        await loadExpenses();

    } catch (error) {
        console.error(
            "deleteExpense:",
            error
        );

        showError(error.message);

    } finally {
        setLoading(false);
    }
}


/* ============================================================
   31. ACCOUNTS / JOURNAL
   ============================================================ */

async function loadAccounts() {
    if (!validateApiUrl()) {
        return;
    }

    try {
        const result =
            await apiRequest(
                "listRows",
                {
                    sheetName: "Accounts",
                    session: getSessionValue(),
                    token: getSessionValue()
                }
            );

        if (!isApiSuccess(result)) {
            return;
        }

        AppState.accounts =
            normalizeArrayData(
                getApiData(result)
            );

        renderAccounts(
            AppState.accounts
        );

    } catch (error) {
        console.error(
            "loadAccounts:",
            error
        );
    }
}


function renderAccounts(accounts) {
    const table =
        getElement("accountsTable");

    if (!table) {
        return;
    }

    let tbody =
        table.querySelector("tbody");

    if (!tbody) {
        tbody =
            document.createElement("tbody");

        table.appendChild(tbody);
    }

    tbody.innerHTML = "";

    accounts.forEach(
        (account, index) => {
            const row =
                document.createElement("tr");

            row.innerHTML = `
                <td>${index + 1}</td>
                <td>${escapeHtml(
                    account.code ||
                    account.accountCode ||
                    account["รหัสบัญชี"] ||
                    ""
                )}</td>
                <td>${escapeHtml(
                    account.name ||
                    account.accountName ||
                    account["ชื่อบัญชี"] ||
                    ""
                )}</td>
                <td>${escapeHtml(
                    account.type ||
                    account.accountType ||
                    account["ประเภทบัญชี"] ||
                    ""
                )}</td>
            `;

            tbody.appendChild(row);
        }
    );
}


async function loadJournal() {
    if (!validateApiUrl()) {
        return;
    }

    try {
        const result =
            await apiRequest(
                "journalReport",
                {
                    startDate:
                        getValue(
                            "reportStartDate"
                        ),

                    endDate:
                        getValue(
                            "reportEndDate"
                        ),

                    session:
                        getSessionValue(),

                    token:
                        getSessionValue()
                }
            );

        if (!isApiSuccess(result)) {
            throw new Error(
                getApiMessage(
                    result,
                    "โหลดสมุดรายวันไม่สำเร็จ"
                )
            );
        }

        AppState.journal =
            normalizeArrayData(
                getApiData(result)
            );

        renderJournal(
            AppState.journal
        );

    } catch (error) {
        console.error(
            "loadJournal:",
            error
        );
    }
}


function renderJournal(rows) {
    const table =
        getElement("journalTable");

    if (!table) {
        return;
    }

    let tbody =
        table.querySelector("tbody");

    if (!tbody) {
        tbody =
            document.createElement("tbody");

        table.appendChild(tbody);
    }

    tbody.innerHTML = "";

    rows.forEach(
        (row, index) => {
            const tr =
                document.createElement("tr");

            tr.innerHTML = `
                <td>${index + 1}</td>
                <td>${escapeHtml(
                    formatDate(
                        row.date ||
                        row["วันที่"]
                    )
                )}</td>

                <td>${escapeHtml(
                    row.documentNo ||
                    row["เลขที่เอกสาร"] ||
                    ""
                )}</td>

                <td>${escapeHtml(
                    row.accountCode ||
                    row["รหัสบัญชี"] ||
                    ""
                )}</td>

                <td>${escapeHtml(
                    row.accountName ||
                    row["ชื่อบัญชี"] ||
                    ""
                )}</td>

                <td>
                    ${formatMoneyShort(
                        row.debit ||
                        row["เดบิต"] ||
                        0
                    )}
                </td>

                <td>
                    ${formatMoneyShort(
                        row.credit ||
                        row["เครดิต"] ||
                        0
                    )}
                </td>
            `;

            tbody.appendChild(tr);
        }
    );
}


/* ============================================================
   32. REPORTS
   ============================================================ */

async function loadReports() {
    const startDate =
        getValue(
            "reportStartDate"
        );

    const endDate =
        getValue(
            "reportEndDate"
        );

    if (!validateApiUrl()) {
        return;
    }

    try {
        setLoading(
            true,
            "กำลังโหลดรายงาน..."
        );

        await Promise.all([
            loadSalesReport(
                startDate,
                endDate
            ),

            loadPurchaseReport(
                startDate,
                endDate
            ),

            loadExpenseReport(
                startDate,
                endDate
            )
        ]);

    } catch (error) {
        console.error(
            "loadReports:",
            error
        );

        showError(
            error.message ||
            "โหลดรายงานไม่สำเร็จ"
        );

    } finally {
        setLoading(false);
    }
}


async function loadSalesReport(
    startDate,
    endDate
) {
    const result =
        await apiRequest(
            "salesReport",
            {
                startDate:
                    startDate,

                endDate:
                    endDate,

                session:
                    getSessionValue(),

                token:
                    getSessionValue()
            }
        );

    if (!isApiSuccess(result)) {
        return;
    }

    const data =
        getApiData(result);

    renderReportData(
        "salesReport",
        data
    );
}


async function loadPurchaseReport(
    startDate,
    endDate
) {
    const result =
        await apiRequest(
            "purchaseReport",
            {
                startDate:
                    startDate,

                endDate:
                    endDate,

                session:
                    getSessionValue(),

                token:
                    getSessionValue()
            }
        );

    if (!isApiSuccess(result)) {
        return;
    }

    const data =
        getApiData(result);

    renderReportData(
        "purchaseReport",
        data
    );
}


async function loadExpenseReport(
    startDate,
    endDate
) {
    const result =
        await apiRequest(
            "expenseReport",
            {
                startDate:
                    startDate,

                endDate:
                    endDate,

                session:
                    getSessionValue(),

                token:
                    getSessionValue()
            }
        );

    if (!isApiSuccess(result)) {
        return;
    }

    const data =
        getApiData(result);

    renderReportData(
        "expenseReport",
        data
    );
}


function renderReportData(
    reportName,
    data
) {
    if (!data) {
        return;
    }

    const id =
        reportName === "salesReport"
            ? "salesReport"
            : reportName === "purchaseReport"
                ? "purchaseReport"
                : "expenseReport";

    const container =
        getElement(id);

    if (!container) {
        return;
    }

    if (Array.isArray(data)) {
        renderGenericTable(
            container,
            data
        );

        return;
    }

    const rows =
        data.rows ||
        data.items ||
        data.data;

    if (Array.isArray(rows)) {
        renderGenericTable(
            container,
            rows
        );

        return;
    }

    container.innerHTML = `
        <pre>${escapeHtml(
            JSON.stringify(
                data,
                null,
                2
            )
        )}</pre>
    `;
}


function renderGenericTable(
    container,
    rows
) {
    if (!rows.length) {
        container.innerHTML = `
            <div class="empty-state">
                ไม่พบข้อมูล
            </div>
        `;

        return;
    }

    const headers =
        Object.keys(rows[0]);

    let html = `
        <div class="table-responsive">
            <table class="data-table">
                <thead>
                    <tr>
    `;

    headers.forEach(
        (header) => {
            html += `
                <th>
                    ${escapeHtml(header)}
                </th>
            `;
        }
    );

    html += `
                    </tr>
                </thead>
                <tbody>
    `;

    rows.forEach(
        (row) => {
            html += `
                <tr>
            `;

            headers.forEach(
                (header) => {
                    html += `
                        <td>
                            ${escapeHtml(
                                row[header]
                            )}
                        </td>
                    `;
                }
            );

            html += `
                </tr>
            `;
        }
    );

    html += `
                </tbody>
            </table>
        </div>
    `;

    container.innerHTML = html;
}


/* ============================================================
   33. STOCK
   ============================================================ */

async function loadStockReport() {
    if (!validateApiUrl()) {
        return;
    }

    try {
        const result =
            await apiRequest(
                "stockReport",
                {
                    session:
                        getSessionValue(),

                    token:
                        getSessionValue()
                }
            );

        if (!isApiSuccess(result)) {
            throw new Error(
                getApiMessage(
                    result,
                    "โหลดสต็อกไม่สำเร็จ"
                )
            );
        }

        const data =
            getApiData(result);

        renderStockReport(data);

    } catch (error) {
        console.error(
            "loadStockReport:",
            error
        );

        showError(error.message);
    }
}


function renderStockReport(data) {
    const container =
        getElement("stockReport");

    if (!container) {
        return;
    }

    const rows =
        normalizeArrayData(data);

    if (!rows.length) {
        container.innerHTML = `
            <div class="empty-state">
                ไม่พบข้อมูลสต็อก
            </div>
        `;

        return;
    }

    renderGenericTable(
        container,
        rows
    );
}


/* ============================================================
   34. SEARCH
   ============================================================ */

function filterProductOptions(keyword) {
    const text =
        safeText(keyword)
            .toLowerCase()
            .trim();

    const products =
        AppState.products.filter(
            (product) => {
                const code =
                    getProductCode(product)
                        .toLowerCase();

                const name =
                    getProductName(product)
                        .toLowerCase();

                return (
                    code.includes(text) ||
                    name.includes(text)
                );
            }
        );

    const select =
        getElement("saleProduct");

    if (!select) {
        return;
    }

    select.innerHTML =
        `<option value="">-- เลือกสินค้า --</option>`;

    products.forEach(
        (product) => {
            const option =
                document.createElement("option");

            option.value =
                getProductId(product);

            option.textContent =
                `${getProductCode(product)} - ${getProductName(product)}`;

            select.appendChild(option);
        }
    );
}


function filterCustomerOptions(keyword) {
    const text =
        safeText(keyword)
            .toLowerCase()
            .trim();

    const customers =
        AppState.customers.filter(
            (customer) =>
                getCustomerName(customer)
                    .toLowerCase()
                    .includes(text)
        );

    const select =
        getElement("saleCustomer");

    if (!select) {
        return;
    }

    select.innerHTML =
        `<option value="">-- ลูกค้าทั่วไป --</option>`;

    customers.forEach(
        (customer) => {
            const option =
                document.createElement("option");

            option.value =
                getCustomerId(customer);

            option.textContent =
                getCustomerName(customer);

            select.appendChild(option);
        }
    );
}


function filterSupplierOptions(keyword) {
    const text =
        safeText(keyword)
            .toLowerCase()
            .trim();

    const suppliers =
        AppState.suppliers.filter(
            (supplier) =>
                getSupplierName(supplier)
                    .toLowerCase()
                    .includes(text)
        );

    const select =
        getElement("purchaseSupplier");

    if (!select) {
        return;
    }

    select.innerHTML =
        `<option value="">-- เลือกผู้จำหน่าย --</option>`;

    suppliers.forEach(
        (supplier) => {
            const option =
                document.createElement("option");

            option.value =
                getSupplierId(supplier);

            option.textContent =
                getSupplierName(supplier);

            select.appendChild(option);
        }
    );
}


/* ============================================================
   35. MODAL
   ============================================================ */

function closeAllModals() {
    $$(".modal").forEach(
        (modal) => {
            hideElement(modal);
        }
    );
}


function setupModalClose() {
    document.addEventListener(
        "click",
        function (event) {
            if (
                event.target.matches(
                    ".modal-close, [data-close-modal]"
                )
            ) {
                const modal =
                    event.target.closest(".modal");

                hideElement(modal);

                return;
            }

            if (
                event.target.classList.contains(
                    "modal"
                )
            ) {
                hideElement(
                    event.target
                );
            }
        }
    );
}


/* ============================================================
   36. DOCUMENT PREVIEW
   ============================================================ */

function showDocumentPreview(
    title,
    data
) {
    let modal =
        getElement(
            "documentPreviewModal"
        );

    if (!modal) {
        modal =
            document.createElement("div");

        modal.id =
            "documentPreviewModal";

        modal.className =
            "modal";

        document.body.appendChild(modal);
    }

    modal.innerHTML = `
        <div class="modal-content document-preview">
            <div class="modal-header">
                <h2>
                    ${escapeHtml(title)}
                </h2>

                <button
                    type="button"
                    class="modal-close">
                    ×
                </button>
            </div>

            <div class="modal-body">
                ${renderDocumentData(data)}
            </div>

            <div class="modal-footer">
                <button
                    type="button"
                    class="btn"
                    onclick="window.print()">
                    พิมพ์
                </button>

                <button
                    type="button"
                    class="btn btn-primary modal-close">
                    ปิด
                </button>
            </div>
        </div>
    `;

    showElement(modal);
}


function renderDocumentData(data) {
    if (!data) {
        return "";
    }

    const entries =
        Object.entries(data);

    let html = `
        <div class="document-data">
    `;

    entries.forEach(
        ([key, value]) => {
            html += `
                <div class="document-row">
                    <div class="document-label">
                        ${escapeHtml(key)}
                    </div>

                    <div class="document-value">
                        ${escapeHtml(value)}
                    </div>
                </div>
            `;
        }
    );

    html += `
        </div>
    `;

    return html;
}


/* ============================================================
   37. PDF EXPORT
   ============================================================ */

function ensureJsPdfAvailable() {
    if (
        window.jspdf &&
        window.jspdf.jsPDF
    ) {
        return true;
    }

    showError(
        "ยังไม่ได้โหลด jsPDF ใน index.html"
    );

    return false;
}


function exportSalesPdf() {
    if (!ensureJsPdfAvailable()) {
        return;
    }

    const {
        jsPDF
    } = window.jspdf;

    const doc =
        new jsPDF();

    doc.setFontSize(18);

    doc.text(
        "SHOP-LAAS",
        20,
        20
    );

    doc.setFontSize(14);

    doc.text(
        "รายงานการขาย",
        20,
        30
    );

    doc.setFontSize(10);

    let y = 45;

    AppState.sales.forEach(
        (sale, index) => {
            if (y > 275) {
                doc.addPage();

                y = 20;
            }

            const documentNo =
                getSaleId(sale);

            const total =
                getSaleTotal(sale);

            const date =
                sale.date ||
                sale.saleDate ||
                sale["วันที่"];

            doc.text(
                `${index + 1}. ${documentNo}`,
                20,
                y
            );

            doc.text(
                formatDate(date),
                80,
                y
            );

            doc.text(
                formatMoneyShort(total),
                145,
                y
            );

            y += 8;
        }
    );

    doc.save(
        "SHOP-LAAS-รายงานการขาย.pdf"
    );
}


function exportPurchasesPdf() {
    if (!ensureJsPdfAvailable()) {
        return;
    }

    const {
        jsPDF
    } = window.jspdf;

    const doc =
        new jsPDF();

    doc.setFontSize(18);

    doc.text(
        "SHOP-LAAS",
        20,
        20
    );

    doc.setFontSize(14);

    doc.text(
        "รายงานการซื้อ",
        20,
        30
    );

    doc.setFontSize(10);

    let y = 45;

    AppState.purchases.forEach(
        (purchase, index) => {
            if (y > 275) {
                doc.addPage();

                y = 20;
            }

            const documentNo =
                getPurchaseId(purchase);

            const total =
                getPurchaseTotal(purchase);

            const date =
                purchase.date ||
                purchase.purchaseDate ||
                purchase["วันที่"];

            doc.text(
                `${index + 1}. ${documentNo}`,
                20,
                y
            );

            doc.text(
                formatDate(date),
                80,
                y
            );

            doc.text(
                formatMoneyShort(total),
                145,
                y
            );

            y += 8;
        }
    );

    doc.save(
        "SHOP-LAAS-รายงานการซื้อ.pdf"
    );
}


/* ============================================================
   38. EXCEL EXPORT
   ============================================================ */

function ensureSheetJsAvailable() {
    if (window.XLSX) {
        return true;
    }

    showError(
        "ยังไม่ได้โหลด SheetJS XLSX ใน index.html"
    );

    return false;
}


function exportTableToExcel(
    tableId,
    filename
) {
    if (!ensureSheetJsAvailable()) {
        return;
    }

    const table =
        getElement(tableId);

    if (!table) {
        showError(
            "ไม่พบตารางที่ต้องการส่งออก"
        );

        return;
    }

    const workbook =
        XLSX.utils.book_new();

    const worksheet =
        XLSX.utils.table_to_sheet(
            table
        );

    XLSX.utils.book_append_sheet(
        workbook,
        worksheet,
        "ข้อมูล"
    );

    XLSX.writeFile(
        workbook,
        `${filename}.xlsx`
    );
}


function exportProductsExcel() {
    exportTableToExcel(
        "productsTable",
        "SHOP-LAAS-สินค้า"
    );
}


function exportCustomersExcel() {
    exportTableToExcel(
        "customersTable",
        "SHOP-LAAS-ลูกค้า"
    );
}


function exportSuppliersExcel() {
    exportTableToExcel(
        "suppliersTable",
        "SHOP-LAAS-ผู้จำหน่าย"
    );
}


/* ============================================================
   39. UTILITY DOM
   ============================================================ */

function getValue(id) {
    const element =
        getElement(id);

    if (!element) {
        return "";
    }

    return element.value;
}


function setValue(id, value) {
    const element =
        getElement(id);

    if (!element) {
        return;
    }

    element.value =
        value ?? "";
}


function setTextByIds(
    ids,
    value
) {
    ids.forEach(
        (id) => {
            const element =
                getElement(id);

            if (element) {
                element.textContent =
                    value;
            }
        }
    );
}


function updateAllCartDisplays() {
    updateSaleCartDisplay();
    updatePurchaseCartDisplay();
}


/* ============================================================
   40. FILTER TABLE
   ============================================================ */

function filterTable(
    tableId,
    keyword
) {
    const table =
        getElement(tableId);

    if (!table) {
        return;
    }

    const text =
        safeText(keyword)
            .toLowerCase()
            .trim();

    const rows =
        table.querySelectorAll(
            "tbody tr"
        );

    rows.forEach(
        (row) => {
            const rowText =
                row.textContent
                    .toLowerCase();

            row.style.display =
                rowText.includes(text)
                    ? ""
                    : "none";
        }
    );
}


/* ============================================================
   41. PAGINATION
   ============================================================ */

function paginateArray(
    array,
    page,
    pageSize =
        SHOP_LAAS_CONFIG.pagination.pageSize
) {
    const safePage =
        Math.max(
            1,
            toNumber(page)
        );

    const start =
        (safePage - 1) *
        pageSize;

    const end =
        start + pageSize;

    return {
        data:
            array.slice(
                start,
                end
            ),

        page:
            safePage,

        pageSize:
            pageSize,

        total:
            array.length,

        totalPages:
            Math.max(
                1,
                Math.ceil(
                    array.length /
                    pageSize
                )
            )
    };
}


function renderPagination(
    containerId,
    pagination,
    callbackName
) {
    const container =
        getElement(containerId);

    if (!container) {
        return;
    }

    container.innerHTML = "";

    if (
        pagination.totalPages <= 1
    ) {
        return;
    }

    for (
        let page = 1;
        page <= pagination.totalPages;
        page++
    ) {
        const button =
            document.createElement("button");

        button.type = "button";

        button.className =
            page === pagination.page
                ? "pagination-btn active"
                : "pagination-btn";

        button.textContent =
            page;

        button.onclick = function () {
            if (
                typeof window[
                    callbackName
                ] === "function"
            ) {
                window[
                    callbackName
                ](page);
            }
        };

        container.appendChild(
            button
        );
    }
}


/* ============================================================
   42. PRINT
   ============================================================ */

function printElement(elementId) {
    const element =
        getElement(elementId);

    if (!element) {
        showError(
            "ไม่พบข้อมูลสำหรับพิมพ์"
        );

        return;
    }

    const printWindow =
        window.open(
            "",
            "_blank"
        );

    if (!printWindow) {
        showError(
            "เบราว์เซอร์บล็อกหน้าต่างพิมพ์ กรุณาอนุญาต Pop-up"
        );

        return;
    }

    printWindow.document.open();

    printWindow.document.write(`
        <!DOCTYPE html>
        <html lang="th">
        <head>
            <meta charset="UTF-8">

            <title>
                SHOP-LAAS
            </title>

            <style>
                body {
                    font-family:
                        Arial,
                        "Noto Sans Thai",
                        sans-serif;

                    padding: 30px;
                    color: #111;
                }

                table {
                    width: 100%;
                    border-collapse: collapse;
                }

                th,
                td {
                    border: 1px solid #999;
                    padding: 7px;
                }

                th {
                    background: #eeeeee;
                }

                @media print {
                    body {
                        padding: 0;
                    }
                }
            </style>
        </head>

        <body>
            ${element.innerHTML}
        </body>
        </html>
    `);

    printWindow.document.close();

    printWindow.focus();

    setTimeout(
        () => {
            printWindow.print();
            printWindow.close();
        },
        500
    );
}


/* ============================================================
   43. API HEALTH CHECK
   ============================================================ */

async function checkApiConnection() {
    if (!validateApiUrl()) {
        return {
            success: false,
            message:
                "ยังไม่ได้ตั้งค่า API_URL"
        };
    }

    try {
        const result =
            await apiRequest(
                "systemCheck",
                {}
            );

        return {
            success:
                isApiSuccess(result),

            data:
                getApiData(result),

            message:
                getApiMessage(
                    result,
                    "API ทำงาน"
                )
        };

    } catch (error) {
        return {
            success: false,
            message:
                error.message
        };
    }
}


async function renderApiStatus() {
    const status =
        await checkApiConnection();

    const elements = [
        "#apiStatus",
        "#systemApiStatus",
        "#connectionStatus"
    ];

    elements.forEach(
        (selector) => {
            $$(selector).forEach(
                (element) => {
                    element.textContent =
                        status.success
                            ? "เชื่อมต่อแล้ว"
                            : status.message;

                    element.classList.toggle(
                        "success",
                        status.success
                    );

                    element.classList.toggle(
                        "error",
                        !status.success
                    );
                }
            );
        }
    );
}


/* ============================================================
   44. SYSTEM CHECK
   ============================================================ */

async function systemCheck() {
    try {
        setLoading(
            true,
            "กำลังตรวจสอบระบบ..."
        );

        const result =
            await apiRequest(
                "systemCheck",
                {
                    session:
                        getSessionValue(),

                    token:
                        getSessionValue()
                }
            );

        console.log(
            "SYSTEM CHECK:",
            result
        );

        const container =
            getElement(
                "systemCheckResult"
            );

        if (container) {
            container.innerHTML = `
                <pre>${escapeHtml(
                    JSON.stringify(
                        result,
                        null,
                        2
                    )
                )}</pre>
            `;
        }

        if (
            isApiSuccess(result)
        ) {
            showSuccess(
                "ตรวจสอบระบบเรียบร้อย"
            );
        } else {
            showWarning(
                getApiMessage(
                    result,
                    "ตรวจสอบระบบแล้ว"
                )
            );
        }

    } catch (error) {
        console.error(
            "systemCheck:",
            error
        );

        showError(
            error.message
        );

    } finally {
        setLoading(false);
    }
}


/* ============================================================
   45. KEYBOARD SHORTCUTS
   ============================================================ */

function setupKeyboardShortcuts() {
    document.addEventListener(
        "keydown",
        function (event) {
            if (
                event.ctrlKey &&
                event.key.toLowerCase() === "k"
            ) {
                event.preventDefault();

                const search =
                    getElement(
                        "globalSearch"
                    );

                if (search) {
                    search.focus();
                }
            }

            if (
                event.key === "Escape"
            ) {
                closeAllModals();
            }
        }
    );
}


/* ============================================================
   46. FORM HANDLERS
   ============================================================ */

function setupForms() {
    const productForm =
        getElement("productForm");

    if (productForm) {
        productForm.addEventListener(
            "submit",
            function (event) {
                event.preventDefault();

                saveProduct();
            }
        );
    }

    const customerForm =
        getElement("customerForm");

    if (customerForm) {
        customerForm.addEventListener(
            "submit",
            function (event) {
                event.preventDefault();

                saveCustomer();
            }
        );
    }

    const supplierForm =
        getElement("supplierForm");

    if (supplierForm) {
        supplierForm.addEventListener(
            "submit",
            function (event) {
                event.preventDefault();

                saveSupplier();
            }
        );
    }

    const expenseForm =
        getElement("expenseForm");

    if (expenseForm) {
        expenseForm.addEventListener(
            "submit",
            function (event) {
                event.preventDefault();

                saveExpense();
            }
        );
    }
}


/* ============================================================
   47. SEARCH FOR GLOBAL TABLES
   ============================================================ */

function setupSearchInputs() {
    const searchMappings = [
        {
            input: "productSearch",
            table: "productsTable"
        },

        {
            input: "customerSearch",
            table: "customersTable"
        },

        {
            input: "supplierSearch",
            table: "suppliersTable"
        },

        {
            input: "salesSearch",
            table: "salesTable"
        },

        {
            input: "purchaseSearch",
            table: "purchasesTable"
        },

        {
            input: "expenseSearch",
            table: "expensesTable"
        }
    ];

    searchMappings.forEach(
        (mapping) => {
            const input =
                getElement(
                    mapping.input
                );

            if (!input) {
                return;
            }

            input.addEventListener(
                "input",
                function () {
                    filterTable(
                        mapping.table,
                        this.value
                    );
                }
            );
        }
    );
}


/* ============================================================
   48. DATE REPORT BUTTON
   ============================================================ */

function setupReportButtons() {
    $$("#runReport, #runReportBtn").forEach(
        (button) => {
            button.addEventListener(
                "click",
                function () {
                    loadReports();
                }
            );
        }
    );

    $$("#loadStockReport").forEach(
        (button) => {
            button.addEventListener(
                "click",
                function () {
                    loadStockReport();
                }
            );
        }
    );

    $$("#systemCheckBtn").forEach(
        (button) => {
            button.addEventListener(
                "click",
                function () {
                    systemCheck();
                }
            );
        }
    );
}


/* ============================================================
   49. MOBILE MENU
   ============================================================ */

function setupMobileMenu() {
    const buttons = $(
        ".mobile-menu-toggle, #mobileMenuToggle"
    );

    if (!buttons) {
        return;
    }

    buttons.addEventListener(
        "click",
        function () {
            document.body.classList.toggle(
                "mobile-menu-open"
            );
        }
    );
}


/* ============================================================
   50. APPLICATION START
   ============================================================ */

document.addEventListener(
    "DOMContentLoaded",
    async function () {
        setupModalClose();

        setupKeyboardShortcuts();

        setupForms();

        setupSearchInputs();

        setupReportButtons();

        setupMobileMenu();

        await initializeApp();
    }
);


/* ============================================================
   51. GLOBAL EXPORTS
   ============================================================ */

window.SHOP_LAAS = {
    config:
        SHOP_LAAS_CONFIG,

    state:
        AppState,

    apiRequest:
        apiRequest,

    login:
        handleLogin,

    logout:
        logout,

    showPage:
        showPage,

    loadDashboard:
        loadDashboard,

    loadProducts:
        loadProducts,

    loadCustomers:
        loadCustomers,

    loadSuppliers:
        loadSuppliers,

    loadSales:
        loadSales,

    loadPurchases:
        loadPurchases,

    loadExpenses:
        loadExpenses,

    loadReports:
        loadReports,

    loadJournal:
        loadJournal,

    loadStockReport:
        loadStockReport,

    refresh:
        refreshCurrentPage
};


/* ============================================================
   52. GLOBAL FUNCTIONS FOR INLINE HTML
   ============================================================ */

window.handleLogin =
    handleLogin;

window.logout =
    logout;

window.showPage =
    showPage;

window.openProductModal =
    openProductModal;

window.closeProductModal =
    closeProductModal;

window.saveProduct =
    saveProduct;

window.editProduct =
    editProduct;

window.deleteProduct =
    deleteProduct;

window.openCustomerModal =
    openCustomerModal;

window.closeCustomerModal =
    closeCustomerModal;

window.saveCustomer =
    saveCustomer;

window.editCustomer =
    editCustomer;

window.deleteCustomer =
    deleteCustomer;

window.openSupplierModal =
    openSupplierModal;

window.closeSupplierModal =
    closeSupplierModal;

window.saveSupplier =
    saveSupplier;

window.editSupplier =
    editSupplier;

window.deleteSupplier =
    deleteSupplier;

window.openExpenseModal =
    openExpenseModal;

window.closeExpenseModal =
    closeExpenseModal;

window.saveExpense =
    saveExpense;

window.deleteExpense =
    deleteExpense;

window.addSaleItemFromForm =
    addSaleItemFromForm;

window.removeSaleItem =
    removeSaleItem;

window.updateSaleItemQuantity =
    updateSaleItemQuantity;

window.clearSaleCart =
    clearSaleCart;

window.updateSaleTotals =
    updateSaleTotals;

window.submitSale =
    submitSale;

window.viewSale =
    viewSale;

window.addPurchaseItemFromForm =
    addPurchaseItemFromForm;

window.removePurchaseItem =
    removePurchaseItem;

window.clearPurchaseCart =
    clearPurchaseCart;

window.updatePurchaseTotals =
    updatePurchaseTotals;

window.submitPurchase =
    submitPurchase;

window.viewPurchase =
    viewPurchase;

window.loadReports =
    loadReports;

window.loadStockReport =
    loadStockReport;

window.systemCheck =
    systemCheck;

window.exportSalesPdf =
    exportSalesPdf;

window.exportPurchasesPdf =
    exportPurchasesPdf;

window.exportProductsExcel =
    exportProductsExcel;

window.exportCustomersExcel =
    exportCustomersExcel;

window.exportSuppliersExcel =
    exportSuppliersExcel;

window.exportTableToExcel =
    exportTableToExcel;

window.printElement =
    printElement;

window.filterTable =
    filterTable;


/* ============================================================
   END OF SHOP-LAAS app.js
   ============================================================ */
