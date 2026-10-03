(function () {
    'use strict';

    const CONFIG = {
        API_URL: 'https://script.google.com/macros/s/AKfycbw8gnDcBxWV8W-RFRvi1e-yZmpa03O3P8M2iX-QAAB93TLZDQHO_8qAPInSghM9mtZm/exec',
        APP_NAME: 'e-LAAS Private Finance',
        SESSION_KEY: 'elaas_private_finance_session',
        USER_KEY: 'elaas_private_finance_user',
        SETTINGS_KEY: 'elaas_private_finance_settings',
        LOCALE: 'th-TH',
        CURRENCY: 'THB',
        REQUEST_TIMEOUT: 30000
    };

    const state = {
        token: '',
        user: null,
        settings: {},
        accounts: [],
        categories: [],
        customers: [],
        vendors: [],
        users: [],
        documentTypes: [],
        currentPage: 'dashboard',
        currentEntity: '',
        currentRows: [],
        currentPageNumber: 1,
        pageSize: 20,
        totalRows: 0,
        filters: {},
        editingId: '',
        currentModal: null,
        initialized: false,
        loading: false,
        dashboardData: null,
        reportData: null,
        currentDocument: null,
        currentDocumentItems: [],
        chartInstances: {},
        searchTimer: null
    };

    const DOCUMENT_TYPES = [
        {
            code: 'QUOTATION',
            name: 'ใบเสนอราคา'
        },
        {
            code: 'INVOICE',
            name: 'ใบแจ้งหนี้'
        },
        {
            code: 'BILLING',
            name: 'ใบวางบิล'
        },
        {
            code: 'RECEIPT',
            name: 'ใบเสร็จรับเงิน'
        },
        {
            code: 'RECEIVE',
            name: 'ใบรับเงิน'
        },
        {
            code: 'RECEIVE_VOUCHER',
            name: 'ใบสำคัญรับ'
        },
        {
            code: 'PAYMENT_VOUCHER',
            name: 'ใบสำคัญจ่าย'
        },
        {
            code: 'PAYMENT_CERTIFICATE',
            name: 'หนังสือรับรองการจ่ายเงิน'
        },
        {
            code: 'OTHER',
            name: 'อื่น ๆ'
        }
    ];

    const PAGE_CONFIG = {
        dashboard: {
            title: 'แดชบอร์ด',
            subtitle: 'ภาพรวมข้อมูลทางการเงินของกิจการ'
        },
        income: {
            title: 'รายรับ',
            subtitle: 'จัดการรายการรายรับของกิจการ'
        },
        expense: {
            title: 'รายจ่าย',
            subtitle: 'จัดการรายการรายจ่ายของกิจการ'
        },
        transfers: {
            title: 'โอนเงินระหว่างบัญชี',
            subtitle: 'บันทึกการโอนเงินระหว่างบัญชี'
        },
        accounts: {
            title: 'เงินสด / ธนาคาร',
            subtitle: 'จัดการบัญชีเงินสดและบัญชีธนาคาร'
        },
        categories: {
            title: 'หมวดหมู่',
            subtitle: 'จัดการหมวดหมู่รายรับและรายจ่าย'
        },
        customers: {
            title: 'ลูกค้า',
            subtitle: 'จัดการข้อมูลลูกค้า'
        },
        vendors: {
            title: 'ผู้จำหน่าย / เจ้าหนี้',
            subtitle: 'จัดการข้อมูลผู้จำหน่ายและเจ้าหนี้'
        },
        documents: {
            title: 'ทะเบียนเอกสาร',
            subtitle: 'จัดการเอกสารทางธุรกิจและการเงิน'
        },
        reports: {
            title: 'รายงาน',
            subtitle: 'รายงานข้อมูลทางการเงิน'
        },
        users: {
            title: 'ผู้ใช้งานและสิทธิ์',
            subtitle: 'จัดการผู้ใช้งานและสิทธิ์การใช้งาน'
        },
        settings: {
            title: 'ตั้งค่ากิจการ',
            subtitle: 'ตั้งค่าระบบและข้อมูลกิจการ'
        },
        auditlogs: {
            title: 'Audit Log',
            subtitle: 'ประวัติการทำรายการในระบบ'
        }
    };

    const ENTITY_CONFIG = {
        income: {
            sheet: 'Income',
            action: 'list',
            title: 'รายรับ',
            createAction: 'saveincome',
            type: 'income'
        },
        expense: {
            sheet: 'Expenses',
            action: 'list',
            title: 'รายจ่าย',
            createAction: 'saveexpense',
            type: 'expense'
        },
        transfers: {
            sheet: 'Transfers',
            action: 'list',
            title: 'โอนเงิน',
            createAction: 'savetransfer',
            type: 'transfer'
        },
        accounts: {
            sheet: 'Accounts',
            action: 'list',
            title: 'บัญชี',
            createAction: 'create',
            updateAction: 'update',
            deleteAction: 'delete',
            type: 'accounts'
        },
        categories: {
            sheet: 'Categories',
            action: 'list',
            title: 'หมวดหมู่',
            createAction: 'create',
            updateAction: 'update',
            deleteAction: 'delete',
            type: 'categories'
        },
        customers: {
            sheet: 'Customers',
            action: 'list',
            title: 'ลูกค้า',
            createAction: 'create',
            updateAction: 'update',
            deleteAction: 'delete',
            type: 'customers'
        },
        vendors: {
            sheet: 'Customers/Vendors',
            action: 'list',
            title: 'ผู้จำหน่าย',
            createAction: 'create',
            updateAction: 'update',
            deleteAction: 'delete',
            type: 'vendors'
        },
        documents: {
            sheet: 'Documents',
            action: 'list',
            title: 'เอกสาร',
            createAction: 'savedocument',
            type: 'documents'
        },
        users: {
            sheet: 'Users',
            action: 'list',
            title: 'ผู้ใช้งาน',
            createAction: 'create',
            updateAction: 'update',
            deleteAction: 'delete',
            type: 'users'
        }
    };

    function $(selector, parent) {
        const root = parent || document;
        return root.querySelector(selector);
    }

    function $$(selector, parent) {
        const root = parent || document;
        return Array.prototype.slice.call(root.querySelectorAll(selector));
    }

    function byId(id) {
        return document.getElementById(id);
    }

    function hasElement(id) {
        return !!byId(id);
    }

    function escapeHtml(value) {
        if (value === null || value === undefined) {
            return '';
        }

        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function safeText(value) {
        if (value === null || value === undefined) {
            return '';
        }

        return String(value);
    }

    function parseNumber(value) {
        if (value === null || value === undefined || value === '') {
            return 0;
        }

        if (typeof value === 'number') {
            return Number.isFinite(value) ? value : 0;
        }

        const normalized = String(value)
            .replace(/,/g, '')
            .replace(/[^\d.-]/g, '');

        const number = Number(normalized);

        return Number.isFinite(number) ? number : 0;
    }

    function formatMoney(value) {
        const amount = parseNumber(value);

        return new Intl.NumberFormat(CONFIG.LOCALE, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(amount);
    }

    function formatNumber(value) {
        const amount = parseNumber(value);

        return new Intl.NumberFormat(CONFIG.LOCALE, {
            maximumFractionDigits: 2
        }).format(amount);
    }

    function formatMoneyWithCurrency(value) {
        return formatMoney(value) + ' บาท';
    }

    function formatDate(value) {
        if (!value) {
            return '';
        }

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            return safeText(value);
        }

        return new Intl.DateTimeFormat(CONFIG.LOCALE, {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        }).format(date);
    }

    function formatDateTime(value) {
        if (!value) {
            return '';
        }

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            return safeText(value);
        }

        return new Intl.DateTimeFormat(CONFIG.LOCALE, {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }).format(date);
    }

    function toInputDate(value) {
        if (!value) {
            const now = new Date();
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const day = String(now.getDate()).padStart(2, '0');

            return year + '-' + month + '-' + day;
        }

        if (/^\d{4}-\d{2}-\d{2}$/.test(String(value))) {
            return String(value);
        }

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            return '';
        }

        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');

        return year + '-' + month + '-' + day;
    }

    function nowIso() {
        return new Date().toISOString();
    }

    function generateId() {
        if (window.crypto && typeof window.crypto.randomUUID === 'function') {
            return window.crypto.randomUUID();
        }

        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substring(2, 12);

        return timestamp + '-' + random;
    }

    function debounce(callback, wait) {
        let timeout = null;

        return function () {
            const context = this;
            const args = arguments;

            window.clearTimeout(timeout);

            timeout = window.setTimeout(function () {
                callback.apply(context, args);
            }, wait);
        };
    }

    function isConfiguredApi() {
        return (
            CONFIG.API_URL &&
            CONFIG.API_URL.indexOf('PASTE_YOUR_GOOGLE_APPS_SCRIPT') === -1 &&
            /^https:\/\/script\.google\.com\//i.test(CONFIG.API_URL)
        );
    }

    function assertApiConfigured() {
        if (!isConfiguredApi()) {
            throw new Error(
                'ยังไม่ได้ตั้งค่า API_URL ใน app.js กรุณาใส่ URL Google Apps Script Web App ที่ลงท้ายด้วย /exec'
            );
        }
    }

    function getStorage(key) {
        try {
            return localStorage.getItem(key);
        } catch (error) {
            console.error('localStorage read error:', error);
            return null;
        }
    }

    function setStorage(key, value) {
        try {
            localStorage.setItem(key, value);
            return true;
        } catch (error) {
            console.error('localStorage write error:', error);
            return false;
        }
    }

    function removeStorage(key) {
        try {
            localStorage.removeItem(key);
        } catch (error) {
            console.error('localStorage remove error:', error);
        }
    }

    function setLoading(loading, message) {
        state.loading = loading;

        const loginButton = byId('loginButton');
        const loginSubmitButton = byId('loginSubmit');
        const globalLoader = byId('globalLoader');

        if (loginButton) {
            loginButton.disabled = loading;
            loginButton.textContent = loading
                ? 'กำลังเข้าสู่ระบบ...'
                : 'เข้าสู่ระบบ';
        }

        if (loginSubmitButton) {
            loginSubmitButton.disabled = loading;
            loginSubmitButton.textContent = loading
                ? 'กำลังดำเนินการ...'
                : 'เข้าสู่ระบบ';
        }

        if (globalLoader) {
            globalLoader.classList.toggle('hidden', !loading);

            const loaderText = globalLoader.querySelector('[data-loader-text]');

            if (loaderText) {
                loaderText.textContent = message || 'กำลังโหลดข้อมูล...';
            }
        }

        document.body.classList.toggle('is-loading', loading);
    }

    function showElement(element) {
        if (!element) {
            return;
        }

        element.classList.remove('hidden');

        if (element.style) {
            element.style.display = '';
        }
    }

    function hideElement(element) {
        if (!element) {
            return;
        }

        element.classList.add('hidden');

        if (element.style) {
            element.style.display = 'none';
        }
    }

    function showToast(message, type, duration) {
        const toastType = type || 'info';
        const timeout = duration || 3500;

        let container = byId('toastContainer');

        if (!container) {
            container = document.createElement('div');
            container.id = 'toastContainer';
            container.className = 'toast-container';
            document.body.appendChild(container);
        }

        const toast = document.createElement('div');
        toast.className = 'toast toast-' + toastType;

        const iconMap = {
            success: '✓',
            error: '!',
            warning: '!',
            info: 'i'
        };

        const icon = iconMap[toastType] || 'i';

        toast.innerHTML =
            '<span class="toast-icon">' +
            escapeHtml(icon) +
            '</span>' +
            '<span class="toast-message">' +
            escapeHtml(message) +
            '</span>' +
            '<button type="button" class="toast-close" aria-label="ปิด">×</button>';

        container.appendChild(toast);

        const closeButton = toast.querySelector('.toast-close');

        if (closeButton) {
            closeButton.addEventListener('click', function () {
                removeToast(toast);
            });
        }

        window.setTimeout(function () {
            removeToast(toast);
        }, timeout);
    }

    function removeToast(toast) {
        if (!toast) {
            return;
        }

        toast.classList.add('toast-leaving');

        window.setTimeout(function () {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 250);
    }

    function confirmAction(message) {
        return new Promise(function (resolve) {
            const result = window.confirm(message);
            resolve(result);
        });
    }

    function normalizeResponse(response) {
        if (!response) {
            throw new Error('ไม่ได้รับข้อมูลตอบกลับจากเซิร์ฟเวอร์');
        }

        if (typeof response === 'string') {
            try {
                response = JSON.parse(response);
            } catch (error) {
                return {
                    ok: true,
                    data: response
                };
            }
        }

        if (response.success === false) {
            throw new Error(
                response.message ||
                response.error ||
                'ระบบไม่สามารถดำเนินการได้'
            );
        }

        if (response.ok === false) {
            throw new Error(
                response.message ||
                response.error ||
                'ระบบไม่สามารถดำเนินการได้'
            );
        }

        return response;
    }

    function unwrapResponse(response) {
        const normalized = normalizeResponse(response);

        if (
            Object.prototype.hasOwnProperty.call(
                normalized,
                'data'
            )
        ) {
            return normalized.data;
        }

        return normalized;
    }

    function serializeValue(value) {
        if (value === null || value === undefined) {
            return '';
        }

        if (typeof value === 'object') {
            return JSON.stringify(value);
        }

        return String(value);
    }

    async function fetchWithTimeout(url, options) {
        const controller = new AbortController();
        const timeoutId = window.setTimeout(
            function () {
                controller.abort();
            },
            CONFIG.REQUEST_TIMEOUT
        );

        const requestOptions = Object.assign(
            {},
            options || {},
            {
                signal: controller.signal
            }
        );

        try {
            return await fetch(url, requestOptions);
        } finally {
            window.clearTimeout(timeoutId);
        }
    }

    async function apiRequest(action, payload, options) {
        assertApiConfigured();

        const params = payload || {};
        const requestOptions = options || {};

        const requestData = Object.assign(
            {},
            params,
            {
                action: action
            }
        );

        if (
            state.token &&
            action !== 'login'
        ) {
            requestData.token = state.token;
        }

        const body = new URLSearchParams();

        Object.keys(requestData).forEach(function (key) {
            body.set(
                key,
                serializeValue(requestData[key])
            );
        });

        let response;

        try {
            response = await fetchWithTimeout(
                CONFIG.API_URL,
                {
                    method: 'POST',
                    body: body,
                    redirect: 'follow',
                    credentials: 'omit',
                    mode: 'cors',
                    cache: 'no-store'
                }
            );
        } catch (error) {
            if (error && error.name === 'AbortError') {
                throw new Error(
                    'การเชื่อมต่อใช้เวลานานเกินกำหนด กรุณาตรวจสอบ Google Apps Script และลองใหม่อีกครั้ง'
                );
            }

            throw new Error(
                'ไม่สามารถเชื่อมต่อ Google Apps Script ได้ กรุณาตรวจสอบ API_URL และการ Deploy Web App'
            );
        }

        const contentType =
            response.headers.get('content-type') || '';

        const text = await response.text();

        if (!response.ok) {
            throw new Error(
                'เซิร์ฟเวอร์ตอบกลับ HTTP ' +
                response.status +
                ': ' +
                text.substring(0, 500)
            );
        }

        let parsed;

        if (
            contentType.indexOf('application/json') !== -1 ||
            contentType.indexOf('text/json') !== -1
        ) {
            try {
                parsed = JSON.parse(text);
            } catch (error) {
                throw new Error(
                    'Google Apps Script ส่งข้อมูล JSON กลับมาไม่ถูกต้อง'
                );
            }
        } else {
            try {
                parsed = JSON.parse(text);
            } catch (error) {
                throw new Error(
                    'ได้รับข้อมูลจาก Google Apps Script แต่ไม่ใช่ JSON ที่ระบบรองรับ'
                );
            }
        }

        const normalized = normalizeResponse(parsed);

        if (
            normalized.message &&
            /session|token|หมดอายุ|unauthorized|ไม่อนุญาต/i.test(
                String(normalized.message)
            )
        ) {
            if (action !== 'login') {
                clearSession();
            }
        }

        if (
            normalized.error &&
            /session|token|หมดอายุ|unauthorized|ไม่อนุญาต/i.test(
                String(normalized.error)
            )
        ) {
            if (action !== 'login') {
                clearSession();
            }
        }

        return normalized;
    }

    function clearSession() {
        state.token = '';
        state.user = null;

        removeStorage(CONFIG.SESSION_KEY);
        removeStorage(CONFIG.USER_KEY);

        hideApp();
        showLogin();
    }

    function saveSession(token, user) {
        state.token = token || '';
        state.user = user || null;

        if (state.token) {
            setStorage(
                CONFIG.SESSION_KEY,
                state.token
            );
        } else {
            removeStorage(CONFIG.SESSION_KEY);
        }

        if (state.user) {
            setStorage(
                CONFIG.USER_KEY,
                JSON.stringify(state.user)
            );
        } else {
            removeStorage(CONFIG.USER_KEY);
        }
    }

    function loadStoredSession() {
        const token = getStorage(CONFIG.SESSION_KEY);
        const storedUser = getStorage(CONFIG.USER_KEY);

        state.token = token || '';

        if (storedUser) {
            try {
                state.user = JSON.parse(storedUser);
            } catch (error) {
                state.user = null;
            }
        }

        return !!state.token;
    }

    async function login(username, password) {
        if (!username || !password) {
            throw new Error(
                'กรุณากรอกชื่อผู้ใช้และรหัสผ่าน'
            );
        }

        const response = await apiRequest(
            'login',
            {
                username: username,
                password: password
            }
        );

        console.log(
            'LOGIN RESPONSE:',
            response
        );

        const data = unwrapResponse(response);

        if (!data) {
            throw new Error(
                'ระบบไม่ส่งข้อมูล Login กลับมา'
            );
        }

        const token =
            data.token ||
            data.sessionToken ||
            data.accessToken ||
            '';

        const user =
            data.user ||
            data.account ||
            null;

        if (!token) {
            throw new Error(
                'เข้าสู่ระบบไม่สำเร็จ: Google Apps Script ไม่ได้ส่ง Session Token กลับมา'
            );
        }

        saveSession(
            token,
            user
        );

        await loadBootstrap();

        showApp();

        navigate('dashboard');

        return {
            token: token,
            user: user
        };
    }

    async function handleLoginSubmit(event) {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }

        const usernameElement =
            byId('username') ||
            byId('loginUsername') ||
            $('[name="username"]');

        const passwordElement =
            byId('password') ||
            byId('loginPassword') ||
            $('[name="password"]');

        if (!usernameElement || !passwordElement) {
            showToast(
                'ไม่พบช่องชื่อผู้ใช้หรือรหัสผ่านในหน้า Login',
                'error'
            );

            return false;
        }

        const username =
            usernameElement.value.trim();

        const password =
            passwordElement.value;

        if (!username) {
            showToast(
                'กรุณากรอกชื่อผู้ใช้',
                'warning'
            );

            usernameElement.focus();

            return false;
        }

        if (!password) {
            showToast(
                'กรุณากรอกรหัสผ่าน',
                'warning'
            );

            passwordElement.focus();

            return false;
        }

        try {
            setLoading(
                true,
                'กำลังตรวจสอบข้อมูลเข้าสู่ระบบ...'
            );

            await login(
                username,
                password
            );

            if (passwordElement) {
                passwordElement.value = '';
            }

            showToast(
                'เข้าสู่ระบบสำเร็จ',
                'success'
            );
        } catch (error) {
            console.error(
                'LOGIN ERROR:',
                error
            );

            clearSession();

            showLogin();

            showToast(
                error && error.message
                    ? error.message
                    : 'ไม่สามารถเข้าสู่ระบบได้',
                'error',
                6000
            );
        } finally {
            setLoading(false);
        }

        return false;
    }

    async function logout() {
        try {
            if (state.token) {
                await apiRequest(
                    'logout',
                    {}
                );
            }
        } catch (error) {
            console.warn(
                'Logout server error:',
                error
            );
        } finally {
            clearSession();
            showToast(
                'ออกจากระบบแล้ว',
                'success'
            );
        }
    }

    async function restoreSession() {
        if (!loadStoredSession()) {
            showLogin();
            return false;
        }

        try {
            setLoading(
                true,
                'กำลังตรวจสอบ Session...'
            );

            const response =
                await apiRequest(
                    'me',
                    {}
                );

            const data =
                unwrapResponse(response);

            if (
                data &&
                (
                    data.user ||
                    data.account
                )
            ) {
                state.user =
                    data.user ||
                    data.account;

                setStorage(
                    CONFIG.USER_KEY,
                    JSON.stringify(
                        state.user
                    )
                );
            }

            await loadBootstrap();

            showApp();

            navigate(
                state.currentPage ||
                'dashboard'
            );

            return true;
        } catch (error) {
            console.warn(
                'Restore session failed:',
                error
            );

            clearSession();

            return false;
        } finally {
            setLoading(false);
        }
    }

    async function loadBootstrap() {
        const response =
            await apiRequest(
                'bootstrap',
                {}
            );

        const data =
            unwrapResponse(response) ||
            {};

        state.settings =
            normalizeArrayOrObject(
                data.settings
            );

        state.accounts =
            normalizeArray(
                data.accounts
            );

        state.categories =
            normalizeArray(
                data.categories
            );

        state.customers =
            normalizeArray(
                data.customers
            );

        state.vendors =
            normalizeArray(
                data.vendors ||
                data.suppliers
            );

        state.users =
            normalizeArray(
                data.users
            );

        state.documentTypes =
            normalizeArray(
                data.documentTypes
            );

        if (!state.documentTypes.length) {
            state.documentTypes =
                DOCUMENT_TYPES.slice();
        }

        if (data.user) {
            state.user = data.user;

            setStorage(
                CONFIG.USER_KEY,
                JSON.stringify(
                    data.user
                )
            );
        }

        renderUserInfo();
        applyPermissions();

        return data;
    }

    function normalizeArray(value) {
        if (Array.isArray(value)) {
            return value;
        }

        if (!value) {
            return [];
        }

        if (Array.isArray(value.rows)) {
            return value.rows;
        }

        if (Array.isArray(value.items)) {
            return value.items;
        }

        if (Array.isArray(value.records)) {
            return value.records;
        }

        if (typeof value === 'object') {
            return Object.keys(value).map(
                function (key) {
                    const item = value[key];

                    if (
                        item &&
                        typeof item === 'object'
                    ) {
                        if (!item.id) {
                            item.id = key;
                        }
                    }

                    return item;
                }
            );
        }

        return [];
    }

    function normalizeArrayOrObject(value) {
        if (!value) {
            return {};
        }

        if (
            typeof value === 'object' &&
            !Array.isArray(value)
        ) {
            return value;
        }

        const array =
            normalizeArray(value);

        const object = {};

        array.forEach(
            function (item) {
                if (!item) {
                    return;
                }

                const key =
                    item.key ||
                    item.name ||
                    item.id;

                if (key) {
                    object[key] =
                        item.value !== undefined
                            ? item.value
                            : item;
                }
            }
        );

        return object;
    }

    function getSetting(key, fallback) {
        if (
            state.settings &&
            Object.prototype.hasOwnProperty.call(
                state.settings,
                key
            )
        ) {
            const value =
                state.settings[key];

            if (
                value &&
                typeof value === 'object' &&
                value.value !== undefined
            ) {
                return value.value;
            }

            return value;
        }

        return fallback;
    }

    function isAdmin() {
        if (!state.user) {
            return false;
        }

        const role =
            String(
                state.user.role ||
                state.user.userRole ||
                ''
            ).toLowerCase();

        return (
            role === 'admin' ||
            role === 'administrator' ||
            role === 'owner' ||
            role === 'ผู้ดูแลระบบ'
        );
    }

    function hasPermission(permission) {
        if (isAdmin()) {
            return true;
        }

        if (!state.user) {
            return false;
        }

        const permissions =
            state.user.permissions ||
            state.user.permission ||
            [];

        if (Array.isArray(permissions)) {
            return permissions.indexOf(
                permission
            ) !== -1;
        }

        if (
            permissions &&
            typeof permissions === 'object'
        ) {
            return permissions[permission] === true;
        }

        return false;
    }

    function applyPermissions() {
        const adminOnly =
            $$('[data-admin-only]');

        adminOnly.forEach(
            function (element) {
                if (isAdmin()) {
                    showElement(element);
                } else {
                    hideElement(element);
                }
            }
        );

        const permissionElements =
            $$('[data-permission]');

        permissionElements.forEach(
            function (element) {
                const permission =
                    element.getAttribute(
                        'data-permission'
                    );

                if (
                    permission &&
                    hasPermission(permission)
                ) {
                    showElement(element);
                } else {
                    hideElement(element);
                }
            }
        );
    }

    function renderUserInfo() {
        const user =
            state.user || {};

        const name =
            user.fullName ||
            user.name ||
            user.username ||
            'ผู้ใช้งาน';

        const role =
            user.role ||
            'user';

        const username =
            user.username ||
            '';

        const elements = [
            byId('userDisplayName'),
            byId('currentUserName'),
            byId('profileName')
        ];

        elements.forEach(
            function (element) {
                if (element) {
                    element.textContent =
                        name;
                }
            }
        );

        const roleElements = [
            byId('userRole'),
            byId('currentUserRole'),
            byId('profileRole')
        ];

        roleElements.forEach(
            function (element) {
                if (element) {
                    element.textContent =
                        role;
                }
            }
        );

        const usernameElements = [
            byId('userUsername'),
            byId('currentUsername')
        ];

        usernameElements.forEach(
            function (element) {
                if (element) {
                    element.textContent =
                        username;
                }
            }
        );

        const avatarElements =
            $$('[data-user-avatar]');

        avatarElements.forEach(
            function (element) {
                const first =
                    String(name)
                        .trim()
                        .charAt(0)
                        .toUpperCase();

                element.textContent =
                    first || 'U';
            }
        );
    }

    function showLogin() {
        const loginScreen =
            byId('loginScreen') ||
            byId('loginPage') ||
            $('.login-screen');

        const appShell =
            byId('appShell') ||
            byId('app') ||
            $('.app-shell');

        if (loginScreen) {
            showElement(loginScreen);
        }

        if (appShell) {
            hideElement(appShell);
        }

        document.body.classList.add(
            'login-active'
        );

        document.body.classList.remove(
            'app-active'
        );
    }

    function hideLogin() {
        const loginScreen =
            byId('loginScreen') ||
            byId('loginPage') ||
            $('.login-screen');

        if (loginScreen) {
            hideElement(loginScreen);
        }

        document.body.classList.remove(
            'login-active'
        );
    }

    function showApp() {
        const appShell =
            byId('appShell') ||
            byId('app') ||
            $('.app-shell');

        hideLogin();

        if (appShell) {
            showElement(appShell);
        }

        document.body.classList.add(
            'app-active'
        );

        renderUserInfo();
        applyPermissions();
    }

    function hideApp() {
        const appShell =
            byId('appShell') ||
            byId('app') ||
            $('.app-shell');

        if (appShell) {
            hideElement(appShell);
        }

        document.body.classList.remove(
            'app-active'
        );
    }

    function setPageTitle(page) {
        const config =
            PAGE_CONFIG[page] ||
            {
                title: page,
                subtitle: ''
            };

        const titleElements = [
            byId('pageTitle'),
            byId('contentTitle'),
            byId('currentPageTitle')
        ];

        titleElements.forEach(
            function (element) {
                if (element) {
                    element.textContent =
                        config.title;
                }
            }
        );

        const subtitleElements = [
            byId('pageSubtitle'),
            byId('contentSubtitle'),
            byId('currentPageSubtitle')
        ];

        subtitleElements.forEach(
            function (element) {
                if (element) {
                    element.textContent =
                        config.subtitle;
                }
            }
        );

        document.title =
            config.title +
            ' | ' +
            CONFIG.APP_NAME;
    }

    function setActiveNavigation(page) {
        const navigation =
            $$('[data-page]');

        navigation.forEach(
            function (element) {
                const target =
                    element.getAttribute(
                        'data-page'
                    );

                element.classList.toggle(
                    'active',
                    target === page
                );

                element.setAttribute(
                    'aria-current',
                    target === page
                        ? 'page'
                        : 'false'
                );
            }
        );
    }

    function showPageSection(page) {
        const sections =
            $$('[data-page-section]');

        if (sections.length) {
            sections.forEach(
                function (section) {
                    const target =
                        section.getAttribute(
                            'data-page-section'
                        );

                    section.classList.toggle(
                        'active',
                        target === page
                    );

                    if (target === page) {
                        showElement(section);
                    } else {
                        hideElement(section);
                    }
                }
            );

            return;
        }

        const pages = Object.keys(
            PAGE_CONFIG
        );

        pages.forEach(
            function (pageName) {
                const section =
                    byId(
                        'page-' +
                        pageName
                    );

                if (!section) {
                    return;
                }

                if (pageName === page) {
                    showElement(section);
                    section.classList.add(
                        'active'
                    );
                } else {
                    hideElement(section);
                    section.classList.remove(
                        'active'
                    );
                }
            }
        );
    }

    async function navigate(page) {
        if (!page) {
            return;
        }

        const allowedPages = Object.keys(
            PAGE_CONFIG
        );

        if (
            allowedPages.indexOf(page) === -1
        ) {
            page = 'dashboard';
        }

        if (
            (
                page === 'users' ||
                page === 'settings' ||
                page === 'auditlogs'
            ) &&
            !isAdmin()
        ) {
            showToast(
                'คุณไม่มีสิทธิ์เข้าถึงหน้านี้',
                'warning'
            );

            return;
        }

        state.currentPage = page;

        setStorage(
            'elaas_private_finance_current_page',
            page
        );

        setPageTitle(page);
        setActiveNavigation(page);
        showPageSection(page);

        closeSidebarMobile();

        try {
            if (page === 'dashboard') {
                await renderDashboard();
                return;
            }

            if (page === 'reports') {
                await renderReportsPage();
                return;
            }

            if (page === 'settings') {
                await renderSettingsPage();
                return;
            }

            if (page === 'auditlogs') {
                await renderAuditLogsPage();
                return;
            }

            await renderEntityPage(page);
        } catch (error) {
            console.error(
                'NAVIGATION ERROR:',
                error
            );

            showToast(
                error.message ||
                'ไม่สามารถโหลดข้อมูลหน้านี้ได้',
                'error'
            );
        }
    }

    function openSidebarMobile() {
        const sidebar =
            $('.sidebar') ||
            byId('sidebar');

        if (sidebar) {
            sidebar.classList.add(
                'mobile-open'
            );
        }

        document.body.classList.add(
            'sidebar-open'
        );
    }

    function closeSidebarMobile() {
        const sidebar =
            $('.sidebar') ||
            byId('sidebar');

        if (sidebar) {
            sidebar.classList.remove(
                'mobile-open'
            );
        }

        document.body.classList.remove(
            'sidebar-open'
        );
    }

    function toggleSidebar() {
        const sidebar =
            $('.sidebar') ||
            byId('sidebar');

        if (!sidebar) {
            return;
        }

        if (
            window.innerWidth <= 900
        ) {
            if (
                sidebar.classList.contains(
                    'mobile-open'
                )
            ) {
                closeSidebarMobile();
            } else {
                openSidebarMobile();
            }

            return;
        }

        sidebar.classList.toggle(
            'collapsed'
        );

        document.body.classList.toggle(
            'sidebar-collapsed'
        );
    }

    function getPageContainer(page) {
        const possibleIds = [
            'pageContent',
            'mainContent',
            'content',
            'appContent',
            'viewContainer',
            'dynamicContent'
        ];

        for (
            let index = 0;
            index < possibleIds.length;
            index += 1
        ) {
            const element =
                byId(
                    possibleIds[index]
                );

            if (element) {
                return element;
            }
        }

        const existingSection =
            byId(
                'page-' +
                page
            );

        if (existingSection) {
            return existingSection;
        }

        let container =
            byId('generatedPageContent');

        if (!container) {
            container =
                document.createElement(
                    'main'
                );

            container.id =
                'generatedPageContent';

            container.className =
                'generated-page-content';

            document.body.appendChild(
                container
            );
        }

        return container;
    }

    function renderDashboardCards(data) {
        const income =
            parseNumber(
                data.income ||
                data.totalIncome ||
                data.total_income
            );

        const expense =
            parseNumber(
                data.expense ||
                data.totalExpense ||
                data.total_expense
            );

        const transferIn =
            parseNumber(
                data.transferIn ||
                data.totalTransferIn
            );

        const transferOut =
            parseNumber(
                data.transferOut ||
                data.totalTransferOut
            );

        const net =
            data.net !== undefined
                ? parseNumber(data.net)
                : income -
                  expense;

        const balance =
            data.balance !== undefined
                ? parseNumber(data.balance)
                : net +
                  transferIn -
                  transferOut;

        setTextByIds(
            [
                'dashboardIncome',
                'totalIncome',
                'incomeTotal'
            ],
            formatMoney(income)
        );

        setTextByIds(
            [
                'dashboardExpense',
                'totalExpense',
                'expenseTotal'
            ],
            formatMoney(expense)
        );

        setTextByIds(
            [
                'dashboardNet',
                'netTotal'
            ],
            formatMoney(net)
        );

        setTextByIds(
            [
                'dashboardBalance',
                'balanceTotal',
                'cashBalance'
            ],
            formatMoney(balance)
        );

        setTextByIds(
            [
                'dashboardTransferIn',
                'transferInTotal'
            ],
            formatMoney(transferIn)
        );

        setTextByIds(
            [
                'dashboardTransferOut',
                'transferOutTotal'
            ],
            formatMoney(transferOut)
        );
    }

    function setTextByIds(ids, value) {
        ids.forEach(
            function (id) {
                const element =
                    byId(id);

                if (element) {
                    element.textContent =
                        value;
                }
            }
        );
    }

    async function renderDashboard() {
        const container =
            getPageContainer(
                'dashboard'
            );

        const today =
            toInputDate(
                new Date()
            );

        const firstDay =
            new Date();

        firstDay.setDate(1);

        const dateFrom =
            toInputDate(firstDay);

        const dateTo =
            today;

        const existingDashboard =
            byId('page-dashboard');

        if (
            existingDashboard &&
            existingDashboard.children.length
        ) {
            setLoading(
                true,
                'กำลังโหลดแดชบอร์ด...'
            );
        } else {
            container.innerHTML =
                createDashboardSkeleton();
        }

        try {
            const response =
                await apiRequest(
                    'dashboard',
                    {
                        dateFrom: dateFrom,
                        dateTo: dateTo
                    }
                );

            const data =
                unwrapResponse(response) ||
                {};

            state.dashboardData =
                data;

            renderDashboardCards(data);

            renderDashboardHTML(
                container,
                data
            );
        } finally {
            setLoading(false);
        }
    }

    function createDashboardSkeleton() {
        return (
            '<section class="dashboard-page">' +
            '<div class="dashboard-toolbar">' +
            '<div>' +
            '<h2>ภาพรวมทางการเงิน</h2>' +
            '<p>ข้อมูลสรุปของกิจการ</p>' +
            '</div>' +
            '<div class="dashboard-actions">' +
            '<button type="button" class="btn btn-primary" data-action="refresh-dashboard">รีเฟรช</button>' +
            '</div>' +
            '</div>' +
            '<div class="dashboard-cards">' +
            createStatCard(
                'รายรับ',
                'dashboardIncome',
                '0.00'
            ) +
            createStatCard(
                'รายจ่าย',
                'dashboardExpense',
                '0.00'
            ) +
            createStatCard(
                'คงเหลือสุทธิ',
                'dashboardNet',
                '0.00'
            ) +
            createStatCard(
                'ยอดคงเหลือ',
                'dashboardBalance',
                '0.00'
            ) +
            '</div>' +
            '<div class="dashboard-grid">' +
            '<div class="card">' +
            '<div class="card-header">' +
            '<h3>รายการล่าสุด</h3>' +
            '</div>' +
            '<div id="dashboardRecentTransactions" class="table-responsive"></div>' +
            '</div>' +
            '<div class="card">' +
            '<div class="card-header">' +
            '<h3>สรุปตามบัญชี</h3>' +
            '</div>' +
            '<div id="dashboardAccountsSummary" class="table-responsive"></div>' +
            '</div>' +
            '</div>' +
            '</section>'
        );
    }

    function createStatCard(title, id, value) {
        return (
            '<div class="stat-card">' +
            '<div class="stat-card-title">' +
            escapeHtml(title) +
            '</div>' +
            '<div class="stat-card-value" id="' +
            escapeHtml(id) +
            '">' +
            escapeHtml(value) +
            '</div>' +
            '<div class="stat-card-currency">บาท</div>' +
            '</div>'
        );
    }

    function renderDashboardHTML(container, data) {
        if (!container) {
            return;
        }

        if (
            !byId('dashboardIncome')
        ) {
            container.innerHTML =
                createDashboardSkeleton();
        }

        renderDashboardCards(data);

        const recent =
            normalizeArray(
                data.recentTransactions ||
                data.transactions ||
                data.recent
            );

        const accountSummary =
            normalizeArray(
                data.accounts ||
                data.accountSummary ||
                data.accountBalances
            );

        const recentContainer =
            byId(
                'dashboardRecentTransactions'
            );

        if (recentContainer) {
            recentContainer.innerHTML =
                renderTransactionMiniTable(
                    recent
                );
        }

        const accountContainer =
            byId(
                'dashboardAccountsSummary'
            );

        if (accountContainer) {
            accountContainer.innerHTML =
                renderAccountSummaryTable(
                    accountSummary
                );
        }

        renderDashboardChart(
            data
        );
    }

    function renderTransactionMiniTable(rows) {
        if (!rows.length) {
            return (
                '<div class="empty-state">' +
                '<div class="empty-icon">○</div>' +
                '<div>ยังไม่มีรายการล่าสุด</div>' +
                '</div>'
            );
        }

        let html =
            '<table class="data-table">' +
            '<thead>' +
            '<tr>' +
            '<th>วันที่</th>' +
            '<th>รายการ</th>' +
            '<th>ประเภท</th>' +
            '<th class="text-right">จำนวนเงิน</th>' +
            '</tr>' +
            '</thead>' +
            '<tbody>';

        rows.slice(0, 10).forEach(
            function (row) {
                const amount =
                    parseNumber(
                        row.amount ||
                        row.total
                    );

                const type =
                    row.type ||
                    row.transactionType ||
                    '';

                html +=
                    '<tr>' +
                    '<td>' +
                    escapeHtml(
                        formatDate(
                            row.date ||
                            row.createdAt
                        )
                    ) +
                    '</td>' +
                    '<td>' +
                    escapeHtml(
                        row.description ||
                        row.name ||
                        row.docNo ||
                        '-'
                    ) +
                    '</td>' +
                    '<td>' +
                    escapeHtml(type) +
                    '</td>' +
                    '<td class="text-right">' +
                    escapeHtml(
                        formatMoney(
                            amount
                        )
                    ) +
                    '</td>' +
                    '</tr>';
            }
        );

        html +=
            '</tbody>' +
            '</table>';

        return html;
    }

    function renderAccountSummaryTable(rows) {
        if (!rows.length) {
            return (
                '<div class="empty-state">' +
                '<div>ยังไม่มีข้อมูลบัญชี</div>' +
                '</div>'
            );
        }

        let html =
            '<table class="data-table">' +
            '<thead>' +
            '<tr>' +
            '<th>รหัส</th>' +
            '<th>บัญชี</th>' +
            '<th>ประเภท</th>' +
            '<th class="text-right">ยอดคงเหลือ</th>' +
            '</tr>' +
            '</thead>' +
            '<tbody>';

        rows.forEach(
            function (row) {
                html +=
                    '<tr>' +
                    '<td>' +
                    escapeHtml(
                        row.code ||
                        ''
                    ) +
                    '</td>' +
                    '<td>' +
                    escapeHtml(
                        row.name ||
                        ''
                    ) +
                    '</td>' +
                    '<td>' +
                    escapeHtml(
                        row.type ||
                        ''
                    ) +
                    '</td>' +
                    '<td class="text-right">' +
                    escapeHtml(
                        formatMoney(
                            row.balance ||
                            row.currentBalance ||
                            row.amount
                        )
                    ) +
                    '</td>' +
                    '</tr>';
            }
        );

        html +=
            '</tbody>' +
            '</table>';

        return html;
    }

    function renderDashboardChart(data) {
        if (
            !window.Chart
        ) {
            return;
        }

        const canvas =
            byId(
                'dashboardChart'
            );

        if (!canvas) {
            return;
        }

        const chartData =
            data.chart ||
            data.monthly ||
            data.monthlySummary ||
            {};

        const labels =
            chartData.labels ||
            [];

        const income =
            chartData.income ||
            [];

        const expense =
            chartData.expense ||
            [];

        if (
            state.chartInstances.dashboard
        ) {
            state.chartInstances.dashboard.destroy();
        }

        state.chartInstances.dashboard =
            new window.Chart(
                canvas,
                {
                    type: 'bar',
                    data: {
                        labels: labels,
                        datasets: [
                            {
                                label: 'รายรับ',
                                data: income
                            },
                            {
                                label: 'รายจ่าย',
                                data: expense
                            }
                        ]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                position: 'bottom'
                            }
                        }
                    }
                }
            );
    }

    async function renderEntityPage(page) {
        const config =
            ENTITY_CONFIG[page];

        if (!config) {
            return;
        }

        const container =
            getPageContainer(page);

        const filterState =
            state.filters[page] ||
            {};

        container.innerHTML =
            createEntityPageHTML(
                page,
                config
            );

        applyEntityFiltersToForm(
            page,
            filterState
        );

        await loadEntityRows(
            page,
            1
        );
    }

    function createEntityPageHTML(page, config) {
        let title =
            config.title;

        let actionButton =
            '';

        if (
            page !== 'users' ||
            isAdmin()
        ) {
            actionButton =
                '<button type="button" class="btn btn-primary" data-action="create" data-entity="' +
                escapeHtml(page) +
                '">' +
                '＋ เพิ่มรายการ' +
                '</button>';
        }

        const filterHtml =
            createEntityFilterHTML(
                page
            );

        return (
            '<section class="entity-page" data-entity-page="' +
            escapeHtml(page) +
            '">' +
            '<div class="page-toolbar">' +
            '<div>' +
            '<h2>' +
            escapeHtml(title) +
            '</h2>' +
            '<p>' +
            escapeHtml(
                PAGE_CONFIG[page]
                    ? PAGE_CONFIG[page].subtitle
                    : ''
            ) +
            '</p>' +
            '</div>' +
            '<div class="toolbar-actions">' +
            actionButton +
            '<button type="button" class="btn btn-secondary" data-action="export-entity" data-entity="' +
            escapeHtml(page) +
            '">' +
            'ส่งออก Excel' +
            '</button>' +
            '</div>' +
            '</div>' +
            filterHtml +
            '<div class="card">' +
            '<div class="card-body no-padding">' +
            '<div id="entityTableContainer" class="table-responsive">' +
            '<div class="loading-state">กำลังโหลดข้อมูล...</div>' +
            '</div>' +
            '</div>' +
            '</div>' +
            '<div id="entityPagination" class="pagination-container"></div>' +
            '</section>'
        );
    }

    function createEntityFilterHTML(page) {
        if (
            page === 'income' ||
            page === 'expense' ||
            page === 'transfers'
        ) {
            return (
                '<div class="card filter-card">' +
                '<div class="filter-grid">' +
                '<div class="form-group">' +
                '<label>วันที่เริ่มต้น</label>' +
                '<input type="date" id="filterDateFrom">' +
                '</div>' +
                '<div class="form-group">' +
                '<label>วันที่สิ้นสุด</label>' +
                '<input type="date" id="filterDateTo">' +
                '</div>' +
                '<div class="form-group">' +
                '<label>ค้นหา</label>' +
                '<input type="search" id="filterSearch" placeholder="เลขที่เอกสาร / รายการ / ชื่อ">' +
                '</div>' +
                '<div class="form-group filter-actions">' +
                '<button type="button" class="btn btn-primary" data-action="apply-filter" data-entity="' +
                escapeHtml(page) +
                '">ค้นหา</button>' +
                '<button type="button" class="btn btn-secondary" data-action="clear-filter" data-entity="' +
                escapeHtml(page) +
                '">ล้าง</button>' +
                '</div>' +
                '</div>' +
                '</div>'
            );
        }

        if (
            page === 'documents'
        ) {
            return (
                '<div class="card filter-card">' +
                '<div class="filter-grid">' +
                '<div class="form-group">' +
                '<label>วันที่เริ่มต้น</label>' +
                '<input type="date" id="filterDateFrom">' +
                '</div>' +
                '<div class="form-group">' +
                '<label>วันที่สิ้นสุด</label>' +
                '<input type="date" id="filterDateTo">' +
                '</div>' +
                '<div class="form-group">' +
                '<label>ประเภทเอกสาร</label>' +
                '<select id="filterDocumentType">' +
                '<option value="">ทั้งหมด</option>' +
                createDocumentTypeOptions('') +
                '</select>' +
                '</div>' +
                '<div class="form-group">' +
                '<label>ค้นหา</label>' +
                '<input type="search" id="filterSearch" placeholder="เลขที่เอกสาร / ลูกค้า">' +
                '</div>' +
                '<div class="form-group filter-actions">' +
                '<button type="button" class="btn btn-primary" data-action="apply-filter" data-entity="' +
                escapeHtml(page) +
                '">ค้นหา</button>' +
                '<button type="button" class="btn btn-secondary" data-action="clear-filter" data-entity="' +
                escapeHtml(page) +
                '">ล้าง</button>' +
                '</div>' +
                '</div>' +
                '</div>'
            );
        }

        return (
            '<div class="card filter-card">' +
            '<div class="filter-grid">' +
            '<div class="form-group form-group-wide">' +
            '<label>ค้นหา</label>' +
            '<input type="search" id="filterSearch" placeholder="ค้นหา">' +
            '</div>' +
            '<div class="form-group filter-actions">' +
            '<button type="button" class="btn btn-primary" data-action="apply-filter" data-entity="' +
            escapeHtml(page) +
            '">ค้นหา</button>' +
            '<button type="button" class="btn btn-secondary" data-action="clear-filter" data-entity="' +
            escapeHtml(page) +
            '">ล้าง</button>' +
            '</div>' +
            '</div>' +
            '</div>'
        );
    }

    function createDocumentTypeOptions(selected) {
        const types =
            state.documentTypes.length
                ? state.documentTypes
                : DOCUMENT_TYPES;

        let html = '';

        types.forEach(
            function (type) {
                const code =
                    type.code ||
                    type.id ||
                    '';

                const name =
                    type.name ||
                    type.label ||
                    code;

                html +=
                    '<option value="' +
                    escapeHtml(code) +
                    '"' +
                    (
                        code === selected
                            ? ' selected'
                            : ''
                    ) +
                    '>' +
                    escapeHtml(name) +
                    '</option>';
            }
        );

        return html;
    }

    function applyEntityFiltersToForm(page, filters) {
        const dateFrom =
            byId('filterDateFrom');

        const dateTo =
            byId('filterDateTo');

        const search =
            byId('filterSearch');

        const documentType =
            byId('filterDocumentType');

        if (dateFrom) {
            dateFrom.value =
                filters.dateFrom ||
                '';
        }

        if (dateTo) {
            dateTo.value =
                filters.dateTo ||
                '';
        }

        if (search) {
            search.value =
                filters.search ||
                '';
        }

        if (documentType) {
            documentType.value =
                filters.documentType ||
                '';
        }
    }

    async function loadEntityRows(page, pageNumber) {
        const config =
            ENTITY_CONFIG[page];

        if (!config) {
            return;
        }

        const tableContainer =
            byId(
                'entityTableContainer'
            );

        if (tableContainer) {
            tableContainer.innerHTML =
                '<div class="loading-state">กำลังโหลดข้อมูล...</div>';
        }

        const filters =
            state.filters[page] ||
            {};

        const payload = {
            entity: page,
            sheet: config.sheet,
            page: pageNumber,
            pageSize: state.pageSize,
            filters: filters
        };

        const response =
            await apiRequest(
                'list',
                payload
            );

        const data =
            unwrapResponse(response);

        let rows = [];
        let total = 0;

        if (Array.isArray(data)) {
            rows = data;
            total = data.length;
        } else if (data) {
            rows =
                normalizeArray(
                    data.rows ||
                    data.items ||
                    data.records
                );

            total =
                parseNumber(
                    data.total ||
                    data.totalRows ||
                    data.count
                );

            if (!total) {
                total = rows.length;
            }
        }

        state.currentRows = rows;
        state.currentEntity = page;
        state.currentPageNumber =
            pageNumber;
        state.totalRows = total;

        renderEntityTable(
            page,
            rows
        );

        renderPagination(
            page,
            pageNumber,
            total
        );
    }

    function renderEntityTable(page, rows) {
        const container =
            byId(
                'entityTableContainer'
            );

        if (!container) {
            return;
        }

        if (!rows.length) {
            container.innerHTML =
                '<div class="empty-state">' +
                '<div class="empty-icon">○</div>' +
                '<h3>ยังไม่มีข้อมูล</h3>' +
                '<p>ยังไม่พบรายการในระบบ</p>' +
                '</div>';

            return;
        }

        let html = '';

        if (page === 'income') {
            html =
                renderIncomeTable(
                    rows
                );
        } else if (page === 'expense') {
            html =
                renderExpenseTable(
                    rows
                );
        } else if (page === 'transfers') {
            html =
                renderTransferTable(
                    rows
                );
        } else if (page === 'accounts') {
            html =
                renderAccountsTable(
                    rows
                );
        } else if (page === 'categories') {
            html =
                renderCategoriesTable(
                    rows
                );
        } else if (page === 'customers') {
            html =
                renderCustomersTable(
                    rows
                );
        } else if (page === 'vendors') {
            html =
                renderVendorsTable(
                    rows
                );
        } else if (page === 'documents') {
            html =
                renderDocumentsTable(
                    rows
                );
        } else if (page === 'users') {
            html =
                renderUsersTable(
                    rows
                );
        } else {
            html =
                renderGenericTable(
                    rows,
                    page
                );
        }

        container.innerHTML = html;
    }

    function renderIncomeTable(rows) {
        let html =
            '<table class="data-table">' +
            '<thead>' +
            '<tr>' +
            '<th>วันที่</th>' +
            '<th>เลขที่เอกสาร</th>' +
            '<th>บัญชี</th>' +
            '<th>หมวดหมู่</th>' +
            '<th>รายการ</th>' +
            '<th>ช่องทางชำระ</th>' +
            '<th class="text-right">จำนวนเงิน</th>' +
            '<th class="text-center">จัดการ</th>' +
            '</tr>' +
            '</thead>' +
            '<tbody>';

        rows.forEach(
            function (row) {
                html +=
                    '<tr>' +
                    '<td>' +
                    escapeHtml(
                        formatDate(
                            row.date
                        )
                    ) +
                    '</td>' +
                    '<td>' +
                    escapeHtml(
                        row.docNo ||
                        row.documentNo ||
                        '-'
                    ) +
                    '</td>' +
                    '<td>' +
                    escapeHtml(
                        getAccountName(
                            row.accountId ||
                            row.account
                        )
                    ) +
                    '</td>' +
                    '<td>' +
                    escapeHtml(
                        getCategoryName(
                            row.categoryId ||
                            row.category
                        )
                    ) +
                    '</td>' +
                    '<td>' +
                    escapeHtml(
                        row.description ||
                        row.counterpartyName ||
                        '-'
                    ) +
                    '</td>' +
                    '<td>' +
                    escapeHtml(
                        row.paymentMethod ||
                        '-'
                    ) +
                    '</td>' +
                    '<td class="text-right amount-income">' +
                    escapeHtml(
                        formatMoney(
                            row.amount
                        )
                    ) +
                    '</td>' +
                    '<td class="text-center">' +
                    createRowActions(
                        'income',
                        row
                    ) +
                    '</td>' +
                    '</tr>';
            }
        );

        html +=
            '</tbody></table>';

        return html;
    }

    function renderExpenseTable(rows) {
        let html =
            '<table class="data-table">' +
            '<thead>' +
            '<tr>' +
            '<th>วันที่</th>' +
            '<th>เลขที่เอกสาร</th>' +
            '<th>บัญชี</th>' +
            '<th>หมวดหมู่</th>' +
            '<th>รายการ</th>' +
            '<th>ช่องทางชำระ</th>' +
            '<th class="text-right">จำนวนเงิน</th>' +
            '<th class="text-center">จัดการ</th>' +
            '</tr>' +
            '</thead>' +
            '<tbody>';

        rows.forEach(
            function (row) {
                html +=
                    '<tr>' +
                    '<td>' +
                    escapeHtml(
                        formatDate(
                            row.date
                        )
                    ) +
                    '</td>' +
                    '<td>' +
                    escapeHtml(
                        row.docNo ||
                        row.documentNo ||
                        '-'
                    ) +
                    '</td>' +
                    '<td>' +
                    escapeHtml(
                        getAccountName(
                            row.accountId ||
                            row.account
                        )
                    ) +
                    '</td>' +
                    '<td>' +
                    escapeHtml(
                        getCategoryName(
                            row.categoryId ||
                            row.category
                        )
                    ) +
                    '</td>' +
                    '<td>' +
                    escapeHtml(
                        row.description ||
                        row.counterpartyName ||
                        '-'
                    ) +
                    '</td>' +
                    '<td>' +
                    escapeHtml(
                        row.paymentMethod ||
                        '-'
                    ) +
                    '</td>' +
                    '<td class="text-right amount-expense">' +
                    escapeHtml(
                        formatMoney(
                            row.amount
                        )
                    ) +
                    '</td>' +
                    '<td class="text-center">' +
                    createRowActions(
                        'expense',
                        row
                    ) +
                    '</td>' +
                    '</tr>';
            }
        );

        html +=
            '</tbody></table>';

        return html;
    }

    function renderTransferTable(rows) {
        let html =
            '<table class="data-table">' +
            '<thead>' +
            '<tr>' +
            '<th>วันที่</th>' +
            '<th>เลขที่เอกสาร</th>' +
            '<th>จากบัญชี</th>' +
            '<th>ไปบัญชี</th>' +
            '<th>รายละเอียด</th>' +
            '<th class="text-right">จำนวนเงิน</th>' +
            '<th class="text-center">จัดการ</th>' +
            '</tr>' +
            '</thead>' +
            '<tbody>';

        rows.forEach(
            function (row) {
                html +=
                    '<tr>' +
                    '<td>' +
                    escapeHtml(
                        formatDate(
                            row.date
                        )
                    ) +
                    '</td>' +
                    '<td>' +
                    escapeHtml(
                        row.docNo ||
                        row.documentNo ||
                        '-'
                    ) +
                    '</td>' +
                    '<td>' +
                    escapeHtml(
                        getAccountName(
                            row.fromAccountId ||
                            row.fromAccount
                        )
                    ) +
                    '</td>' +
                    '<td>' +
                    escapeHtml(
                        getAccountName(
                            row.toAccountId ||
                            row.toAccount
                        )
                    ) +
                    '</td>' +
                    '<td>' +
                    escapeHtml(
                        row.description ||
                        '-'
                    ) +
                    '</td>' +
                    '<td class="text-right">' +
                    escapeHtml(
                        formatMoney(
                            row.amount
                        )
                    ) +
                    '</td>' +
                    '<td class="text-center">' +
                    createRowActions(
                        'transfers',
                        row
                    ) +
                    '</td>' +
                    '</tr>';
            }
        );

        html +=
            '</tbody></table>';

        return html;
    }

    function renderAccountsTable(rows) {
        let html =
            '<table class="data-table">' +
            '<thead>' +
            '<tr>' +
            '<th>รหัสบัญชี</th>' +
            '<th>ชื่อบัญชี</th>' +
            '<th>ประเภท</th>' +
            '<th class="text-right">ยอดยกมา</th>' +
            '<th>สถานะ</th>' +
            '<th>รายละเอียด</th>' +
            '<th class="text-center">จัดการ</th>' +
            '</tr>' +
            '</thead>' +
            '<tbody>';

        rows.forEach(
            function (row) {
                html +=
                    '<tr>' +
                    '<td>' +
                    escapeHtml(
                        row.code ||
                        ''
                    ) +
                    '</td>' +
                    '<td>' +
                    escapeHtml(
                        row.name ||
                        ''
                    ) +
                    '</td>' +
                    '<td>' +
                    escapeHtml(
                        row.type ||
                        ''
                    ) +
                    '</td>' +
                    '<td class="text-right">' +
                    escapeHtml(
                        formatMoney(
                            row.openingBalance
                        )
                    ) +
                    '</td>' +
                    '<td>' +
                    renderStatus(
                        row.active
                    ) +
                    '</td>' +
                    '<td>' +
                    escapeHtml(
                        row.description ||
                        ''
                    ) +
                    '</td>' +
                    '<td class="text-center">' +
                    createRowActions(
                        'accounts',
                        row
                    ) +
                    '</td>' +
                    '</tr>';
            }
        );

        html +=
            '</tbody></table>';

        return html;
    }

    function renderCategoriesTable(rows) {
        let html =
            '<table class="data-table">' +
            '<thead>' +
            '<tr>' +
            '<th>รหัส</th>' +
            '<th>ชื่อหมวดหมู่</th>' +
            '<th>ประเภท</th>' +
            '<th>สถานะ</th>' +
            '<th>รายละเอียด</th>' +
            '<th class="text-center">จัดการ</th>' +
            '</tr>' +
            '</thead>' +
            '<tbody>';

        rows.forEach(
            function (row) {
                html +=
                    '<tr>' +
                    '<td>' +
                    escapeHtml(
                        row.code ||
                        ''
                    ) +
                    '</td>' +
                    '<td>' +
                    escapeHtml(
                        row.name ||
                        ''
                    ) +
                    '</td>' +
                    '<td>' +
                    escapeHtml(
                        row.type ||
                        ''
                    ) +
                    '</td>' +
                    '<td>' +
                    renderStatus(
                        row.active
                    ) +
                    '</td>' +
                    '<td>' +
                    escapeHtml(
                        row.description ||
                        ''
                    ) +
                    '</td>' +
                    '<td class="text-center">' +
                    createRowActions(
                        'categories',
                        row
                    ) +
                    '</td>' +
                    '</tr>';
            }
        );

        html +=
            '</tbody></table>';

        return html;
    }

    function renderCustomersTable(rows) {
        return renderPartyTable(
            rows,
            'customers'
        );
    }

    function renderVendorsTable(rows) {
        return renderPartyTable(
            rows,
            'vendors'
        );
    }

    function renderPartyTable(rows, entity) {
        let html =
            '<table class="data-table">' +
            '<thead>' +
            '<tr>' +
            '<th>รหัส</th>' +
            '<th>ชื่อ</th>' +
            '<th>เลขประจำตัวผู้เสียภาษี</th>' +
            '<th>ผู้ติดต่อ</th>' +
            '<th>โทรศัพท์</th>' +
            '<th>อีเมล</th>' +
            '<th>สถานะ</th>' +
            '<th class="text-center">จัดการ</th>' +
            '</tr>' +
            '</thead>' +
            '<tbody>';

        rows.forEach(
            function (row) {
                html +=
                    '<tr>' +
                    '<td>' +
                    escapeHtml(
                        row.code ||
                        ''
                    ) +
                    '</td>' +
                    '<td>' +
                    escapeHtml(
                        row.name ||
                        ''
                    ) +
                    '</td>' +
                    '<td>' +
                    escapeHtml(
                        row.taxId ||
                        ''
                    ) +
                    '</td>' +
                    '<td>' +
                    escapeHtml(
                        row.contactPerson ||
                        ''
                    ) +
                    '</td>' +
                    '<td>' +
                    escapeHtml(
                        row.phone ||
                        ''
                    ) +
                    '</td>' +
                    '<td>' +
                    escapeHtml(
                        row.email ||
                        ''
                    ) +
                    '</td>' +
                    '<td>' +
                    renderStatus(
                        row.active
                    ) +
                    '</td>' +
                    '<td class="text-center">' +
                    createRowActions(
                        entity,
                        row
                    ) +
                    '</td>' +
                    '</tr>';
            }
        );

        html +=
            '</tbody></table>';

        return html;
    }

    function renderDocumentsTable(rows) {
        let html =
            '<table class="data-table">' +
            '<thead>' +
            '<tr>' +
            '<th>วันที่</th>' +
            '<th>เลขที่เอกสาร</th>' +
            '<th>ประเภท</th>' +
            '<th>ลูกค้า / ผู้จำหน่าย</th>' +
            '<th>สถานะ</th>' +
            '<th class="text-right">ยอดรวม</th>' +
            '<th class="text-center">จัดการ</th>' +
            '</tr>' +
            '</thead>' +
            '<tbody>';

        rows.forEach(
            function (row) {
                const type =
                    getDocumentTypeName(
                        row.docType ||
                        row.documentType ||
                        row.type
                    );

                html +=
                    '<tr>' +
                    '<td>' +
                    escapeHtml(
                        formatDate(
                            row.date
                        )
                    ) +
                    '</td>' +
                    '<td>' +
                    escapeHtml(
                        row.docNo ||
                        row.documentNo ||
                        ''
                    ) +
                    '</td>' +
                    '<td>' +
                    escapeHtml(
                        type
                    ) +
                    '</td>' +
                    '<td>' +
                    escapeHtml(
                        row.partyName ||
                        row.customerName ||
                        row.vendorName ||
                        ''
                    ) +
                    '</td>' +
                    '<td>' +
                    renderDocumentStatus(
                        row.status
                    ) +
                    '</td>' +
                    '<td class="text-right">' +
                    escapeHtml(
                        formatMoney(
                            row.total ||
                            row.grandTotal ||
                            row.amount
                        )
                    ) +
                    '</td>' +
                    '<td class="text-center">' +
                    createDocumentActions(
                        row
                    ) +
                    '</td>' +
                    '</tr>';
            }
        );

        html +=
            '</tbody></table>';

        return html;
    }

    function renderUsersTable(rows) {
        let html =
            '<table class="data-table">' +
            '<thead>' +
            '<tr>' +
            '<th>ชื่อผู้ใช้</th>' +
            '<th>ชื่อ-นามสกุล</th>' +
            '<th>สิทธิ์</th>' +
            '<th>สถานะ</th>' +
            '<th>เข้าสู่ระบบล่าสุด</th>' +
            '<th class="text-center">จัดการ</th>' +
            '</tr>' +
            '</thead>' +
            '<tbody>';

        rows.forEach(
            function (row) {
                html +=
                    '<tr>' +
                    '<td>' +
                    escapeHtml(
                        row.username ||
                        ''
                    ) +
                    '</td>' +
                    '<td>' +
                    escapeHtml(
                        row.fullName ||
                        ''
                    ) +
                    '</td>' +
                    '<td>' +
                    escapeHtml(
                        row.role ||
                        ''
                    ) +
                    '</td>' +
                    '<td>' +
                    renderStatus(
                        row.active
                    ) +
                    '</td>' +
                    '<td>' +
                    escapeHtml(
                        formatDateTime(
                            row.lastLoginAt
                        )
                    ) +
                    '</td>' +
                    '<td class="text-center">' +
                    createRowActions(
                        'users',
                        row
                    ) +
                    '</td>' +
                    '</tr>';
            }
        );

        html +=
            '</tbody></table>';

        return html;
    }

    function renderGenericTable(rows, page) {
        const keys =
            getUsefulObjectKeys(
                rows
            );

        if (!keys.length) {
            return (
                '<div class="empty-state">ไม่พบข้อมูล</div>'
            );
        }

        let html =
            '<table class="data-table">' +
            '<thead><tr>';

        keys.forEach(
            function (key) {
                html +=
                    '<th>' +
                    escapeHtml(
                        prettifyKey(
                            key
                        )
                    ) +
                    '</th>';
            }
        );

        html +=
            '<th>จัดการ</th>' +
            '</tr></thead><tbody>';

        rows.forEach(
            function (row) {
                html +=
                    '<tr>';

                keys.forEach(
                    function (key) {
                        html +=
                            '<td>' +
                            escapeHtml(
                                displayValue(
                                    row[key]
                                )
                            ) +
                            '</td>';
                    }
                );

                html +=
                    '<td>' +
                    createRowActions(
                        page,
                        row
                    ) +
                    '</td>' +
                    '</tr>';
            }
        );

        html +=
            '</tbody></table>';

        return html;
    }

    function getUsefulObjectKeys(rows) {
        const keys = [];
        const excluded = [
            'passwordHash',
            'salt'
        ];

        rows.forEach(
            function (row) {
                if (
                    !row ||
                    typeof row !== 'object'
                ) {
                    return;
                }

                Object.keys(row).forEach(
                    function (key) {
                        if (
                            excluded.indexOf(
                                key
                            ) === -1 &&
                            keys.indexOf(
                                key
                            ) === -1
                        ) {
                            keys.push(key);
                        }
                    }
                );
            }
        );

        return keys.slice(0, 15);
    }

    function prettifyKey(key) {
        const map = {
            id: 'ID',
            date: 'วันที่',
            docNo: 'เลขที่เอกสาร',
            code: 'รหัส',
            name: 'ชื่อ',
            description: 'รายละเอียด',
            amount: 'จำนวนเงิน',
            active: 'สถานะ',
            createdAt: 'สร้างเมื่อ',
            updatedAt: 'แก้ไขเมื่อ',
            reference: 'อ้างอิง'
        };

        return map[key] ||
            String(key)
                .replace(
                    /([A-Z])/g,
                    ' $1'
                )
                .replace(
                    /^./,
                    function (char) {
                        return char.toUpperCase();
                    }
                );
    }

    function displayValue(value) {
        if (
            value === null ||
            value === undefined
        ) {
            return '';
        }

        if (
            typeof value === 'boolean'
        ) {
            return value
                ? 'ใช้งาน'
                : 'ไม่ใช้งาน';
        }

        if (
            typeof value === 'object'
        ) {
            return JSON.stringify(
                value
            );
        }

        return String(value);
    }

    function renderStatus(value) {
        const active =
            value === true ||
            value === 'true' ||
            value === 1 ||
            value === '1' ||
            value === 'ใช้งาน' ||
            value === 'active';

        return active
            ? '<span class="badge badge-success">ใช้งาน</span>'
            : '<span class="badge badge-secondary">ไม่ใช้งาน</span>';
    }

    function renderDocumentStatus(value) {
        const status =
            String(
                value ||
                'active'
            ).toLowerCase();

        if (
            status === 'cancelled' ||
            status === 'canceled' ||
            status === 'ยกเลิก'
        ) {
            return (
                '<span class="badge badge-danger">ยกเลิก</span>'
            );
        }

        if (
            status === 'paid' ||
            status === 'ชำระแล้ว'
        ) {
            return (
                '<span class="badge badge-success">ชำระแล้ว</span>'
            );
        }

        if (
            status === 'pending' ||
            status === 'รอดำเนินการ'
        ) {
            return (
                '<span class="badge badge-warning">รอดำเนินการ</span>'
            );
        }

        return (
            '<span class="badge badge-info">ใช้งาน</span>'
        );
    }

    function createRowActions(entity, row) {
        const id =
            row.id ||
            row.ID ||
            row._id ||
            '';

        const encodedId =
            escapeHtml(
                String(id)
            );

        return (
            '<div class="row-actions">' +
            '<button type="button" class="btn-icon" title="แก้ไข" data-action="edit" data-entity="' +
            escapeHtml(entity) +
            '" data-id="' +
            encodedId +
            '">✎</button>' +
            '<button type="button" class="btn-icon danger" title="ลบ" data-action="delete" data-entity="' +
            escapeHtml(entity) +
            '" data-id="' +
            encodedId +
            '">×</button>' +
            '</div>'
        );
    }

    function createDocumentActions(row) {
        const id =
            row.id ||
            row.ID ||
            '';

        const encodedId =
            escapeHtml(
                String(id)
            );

        return (
            '<div class="row-actions">' +
            '<button type="button" class="btn-icon" title="ดู" data-action="view-document" data-id="' +
            encodedId +
            '">ดู</button>' +
            '<button type="button" class="btn-icon" title="แก้ไข" data-action="edit" data-entity="documents" data-id="' +
            encodedId +
            '">✎</button>' +
            '<button type="button" class="btn-icon" title="PDF" data-action="pdf-document" data-id="' +
            encodedId +
            '">PDF</button>' +
            '<button type="button" class="btn-icon danger" title="ยกเลิก" data-action="cancel-document" data-id="' +
            encodedId +
            '">ยกเลิก</button>' +
            '</div>'
        );
    }

    function getAccountName(idOrValue) {
        if (!idOrValue) {
            return '-';
        }

        const value =
            String(idOrValue);

        const account =
            state.accounts.find(
                function (item) {
                    return (
                        String(
                            item.id ||
                            ''
                        ) === value ||
                        String(
                            item.code ||
                            ''
                        ) === value ||
                        String(
                            item.name ||
                            ''
                        ) === value
                    );
                }
            );

        if (account) {
            return (
                account.code
                    ? account.code +
                      ' - '
                    : ''
            ) +
            (
                account.name ||
                value
            );
        }

        return value;
    }

    function getCategoryName(idOrValue) {
        if (!idOrValue) {
            return '-';
        }

        const value =
            String(idOrValue);

        const category =
            state.categories.find(
                function (item) {
                    return (
                        String(
                            item.id ||
                            ''
                        ) === value ||
                        String(
                            item.code ||
                            ''
                        ) === value ||
                        String(
                            item.name ||
                            ''
                        ) === value
                    );
                }
            );

        if (category) {
            return (
                category.code
                    ? category.code +
                      ' - '
                    : ''
            ) +
            (
                category.name ||
                value
            );
        }

        return value;
    }

    function getDocumentTypeName(codeOrName) {
        if (!codeOrName) {
            return '-';
        }

        const value =
            String(codeOrName);

        const type =
            (
                state.documentTypes.length
                    ? state.documentTypes
                    : DOCUMENT_TYPES
            ).find(
                function (item) {
                    return (
                        String(
                            item.code ||
                            ''
                        ) === value ||
                        String(
                            item.id ||
                            ''
                        ) === value ||
                        String(
                            item.name ||
                            ''
                        ) === value
                    );
                }
            );

        return type
            ? (
                type.name ||
                type.label ||
                value
            )
            : value;
    }

    function renderPagination(page, current, total) {
        const container =
            byId(
                'entityPagination'
            );

        if (!container) {
            return;
        }

        const totalPages =
            Math.max(
                1,
                Math.ceil(
                    total /
                    state.pageSize
                )
            );

        if (
            totalPages <= 1
        ) {
            container.innerHTML =
                '<div class="pagination-info">' +
                'ทั้งหมด ' +
                formatNumber(total) +
                ' รายการ' +
                '</div>';

            return;
        }

        let html =
            '<div class="pagination">' +
            '<button type="button" class="pagination-btn" data-action="page" data-entity="' +
            escapeHtml(page) +
            '" data-page-number="' +
            Math.max(
                1,
                current - 1
            ) +
            '"' +
            (
                current <= 1
                    ? ' disabled'
                    : ''
            ) +
            '>‹</button>';

        const start =
            Math.max(
                1,
                current - 2
            );

        const end =
            Math.min(
                totalPages,
                current + 2
            );

        for (
            let index = start;
            index <= end;
            index += 1
        ) {
            html +=
                '<button type="button" class="pagination-btn ' +
                (
                    index === current
                        ? 'active'
                        : ''
                ) +
                '" data-action="page" data-entity="' +
                escapeHtml(page) +
                '" data-page-number="' +
                index +
                '">' +
                index +
                '</button>';
        }

        html +=
            '<button type="button" class="pagination-btn" data-action="page" data-entity="' +
            escapeHtml(page) +
            '" data-page-number="' +
            Math.min(
                totalPages,
                current + 1
            ) +
            '"' +
            (
                current >= totalPages
                    ? ' disabled'
                    : ''
            ) +
            '>›</button>' +
            '<span class="pagination-info">ทั้งหมด ' +
            formatNumber(total) +
            ' รายการ</span>' +
            '</div>';

        container.innerHTML =
            html;
    }

    async function applyFilter(page) {
        const filters = {
            dateFrom:
                byId('filterDateFrom')
                    ? byId('filterDateFrom').value
                    : '',
            dateTo:
                byId('filterDateTo')
                    ? byId('filterDateTo').value
                    : '',
            search:
                byId('filterSearch')
                    ? byId('filterSearch').value.trim()
                    : '',
            documentType:
                byId('filterDocumentType')
                    ? byId('filterDocumentType').value
                    : ''
        };

        state.filters[page] =
            filters;

        await loadEntityRows(
            page,
            1
        );
    }

    async function clearFilter(page) {
        state.filters[page] =
            {};

        applyEntityFiltersToForm(
            page,
            {}
        );

        await loadEntityRows(
            page,
            1
        );
    }

    function findCurrentRow(entity, id) {
        const rows =
            state.currentRows || [];

        return rows.find(
            function (row) {
                return (
                    String(
                        row.id ||
                        row.ID ||
                        row._id ||
                        ''
                    ) ===
                    String(id)
                );
            }
        );
    }

    async function openCreateModal(entity) {
        state.editingId = '';

        if (entity === 'income') {
            openIncomeModal();
            return;
        }

        if (entity === 'expense') {
            openExpenseModal();
            return;
        }

        if (entity === 'transfers') {
            openTransferModal();
            return;
        }

        if (entity === 'accounts') {
            openAccountModal();
            return;
        }

        if (entity === 'categories') {
            openCategoryModal();
            return;
        }

        if (entity === 'customers') {
            openPartyModal(
                'customers'
            );
            return;
        }

        if (entity === 'vendors') {
            openPartyModal(
                'vendors'
            );
            return;
        }

        if (entity === 'documents') {
            openDocumentModal();
            return;
        }

        if (entity === 'users') {
            if (!isAdmin()) {
                showToast(
                    'เฉพาะผู้ดูแลระบบเท่านั้นที่สามารถจัดการผู้ใช้งานได้',
                    'warning'
                );

                return;
            }

            openUserModal();
            return;
        }
    }

    async function openEditModal(entity, id) {
        const row =
            findCurrentRow(
                entity,
                id
            );

        if (!row) {
            try {
                const response =
                    await apiRequest(
                        'get',
                        {
                            entity: entity,
                            id: id
                        }
                    );

                const data =
                    unwrapResponse(
                        response
                    );

                state.editingId = id;

                if (entity === 'income') {
                    openIncomeModal(
                        data
                    );
                } else if (entity === 'expense') {
                    openExpenseModal(
                        data
                    );
                } else if (entity === 'transfers') {
                    openTransferModal(
                        data
                    );
                } else if (entity === 'accounts') {
                    openAccountModal(
                        data
                    );
                } else if (entity === 'categories') {
                    openCategoryModal(
                        data
                    );
                } else if (
                    entity === 'customers' ||
                    entity === 'vendors'
                ) {
                    openPartyModal(
                        entity,
                        data
                    );
                } else if (entity === 'documents') {
                    openDocumentModal(
                        data
                    );
                } else if (entity === 'users') {
                    openUserModal(
                        data
                    );
                }

                return;
            } catch (error) {
                showToast(
                    error.message ||
                    'ไม่สามารถโหลดข้อมูลได้',
                    'error'
                );

                return;
            }
        }

        state.editingId =
            id;

        if (entity === 'income') {
            openIncomeModal(
                row
            );
            return;
        }

        if (entity === 'expense') {
            openExpenseModal(
                row
            );
            return;
        }

        if (entity === 'transfers') {
            openTransferModal(
                row
            );
            return;
        }

        if (entity === 'accounts') {
            openAccountModal(
                row
            );
            return;
        }

        if (entity === 'categories') {
            openCategoryModal(
                row
            );
            return;
        }

        if (
            entity === 'customers' ||
            entity === 'vendors'
        ) {
            openPartyModal(
                entity,
                row
            );
            return;
        }

        if (entity === 'documents') {
            openDocumentModal(
                row
            );
            return;
        }

        if (entity === 'users') {
            openUserModal(
                row
            );
        }
    }

    async function deleteEntity(entity, id) {
        const confirmed =
            await confirmAction(
                'ยืนยันการลบรายการนี้หรือไม่?\nการลบข้อมูลอาจไม่สามารถย้อนกลับได้'
            );

        if (!confirmed) {
            return;
        }

        const config =
            ENTITY_CONFIG[entity];

        if (!config) {
            return;
        }

        try {
            setLoading(
                true,
                'กำลังลบข้อมูล...'
            );

            await apiRequest(
                config.deleteAction ||
                'delete',
                {
                    entity: entity,
                    sheet: config.sheet,
                    id: id
                }
            );

            showToast(
                'ลบข้อมูลสำเร็จ',
                'success'
            );

            await loadEntityRows(
                entity,
                state.currentPageNumber
            );
        } catch (error) {
            console.error(
                'DELETE ERROR:',
                error
            );

            showToast(
                error.message ||
                'ไม่สามารถลบข้อมูลได้',
                'error'
            );
        } finally {
            setLoading(false);
        }
    }

    function openModal(options) {
        const settings =
            options || {};

        let container =
            byId('modalContainer');

        if (!container) {
            container =
                document.createElement(
                    'div'
                );

            container.id =
                'modalContainer';

            container.className =
                'modal-container';

            document.body.appendChild(
                container
            );
        }

        const fields =
            settings.fields || [];

        let fieldsHtml = '';

        fields.forEach(
            function (field) {
                fieldsHtml +=
                    createFormField(
                        field
                    );
            }
        );

        container.innerHTML =
            '<div class="modal-backdrop" data-modal-close></div>' +
            '<div class="modal-dialog ' +
            escapeHtml(
                settings.size ||
                ''
            ) +
            '">' +
            '<div class="modal-header">' +
            '<div>' +
            '<h2>' +
            escapeHtml(
                settings.title ||
                ''
            ) +
            '</h2>' +
            (
                settings.subtitle
                    ? '<p>' +
                      escapeHtml(
                          settings.subtitle
                      ) +
                      '</p>'
                    : ''
            ) +
            '</div>' +
            '<button type="button" class="modal-close" data-modal-close>×</button>' +
            '</div>' +
            '<form id="dynamicModalForm" class="modal-form">' +
            '<div class="modal-body">' +
            fieldsHtml +
            '</div>' +
            '<div class="modal-footer">' +
            '<button type="button" class="btn btn-secondary" data-modal-close>ยกเลิก</button>' +
            '<button type="submit" class="btn btn-primary" id="modalSubmitButton">' +
            escapeHtml(
                settings.submitLabel ||
                'บันทึก'
            ) +
            '</button>' +
            '</div>' +
            '</form>' +
            '</div>';

        showElement(
            container
        );

        container.classList.add(
            'open'
        );

        state.currentModal =
            container;

        const form =
            byId(
                'dynamicModalForm'
            );

        if (form) {
            form.addEventListener(
                'submit',
                async function (event) {
                    event.preventDefault();
                    event.stopPropagation();

                    const values =
                        collectFormValues(
                            form,
                            fields
                        );

                    try {
                        setModalLoading(
                            true
                        );

                        await settings.onSubmit(
                            values
                        );

                        closeModal();
                    } catch (error) {
                        console.error(
                            'MODAL SUBMIT ERROR:',
                            error
                        );

                        showToast(
                            error.message ||
                            'ไม่สามารถบันทึกข้อมูลได้',
                            'error',
                            6000
                        );
                    } finally {
                        setModalLoading(
                            false
                        );
                    }

                    return false;
                }
            );
        }

        container.addEventListener(
            'click',
            function (event) {
                const target =
                    event.target;

                if (
                    target &&
                    target.closest(
                        '[data-modal-close]'
                    )
                ) {
                    closeModal();
                }
            }
        );

        if (
            typeof settings.afterOpen ===
            'function'
        ) {
            settings.afterOpen(
                container
            );
        }
    }

    function closeModal() {
        const container =
            byId('modalContainer');

        if (!container) {
            return;
        }

        container.classList.remove(
            'open'
        );

        hideElement(
            container
        );

        container.innerHTML =
            '';

        state.currentModal =
            null;
    }

    function setModalLoading(loading) {
        const button =
            byId(
                'modalSubmitButton'
            );

        if (button) {
            button.disabled =
                loading;

            button.textContent =
                loading
                    ? 'กำลังบันทึก...'
                    : 'บันทึก';
        }
    }

    function createFormField(field) {
        const type =
            field.type ||
            'text';

        const name =
            field.name ||
            '';

        const label =
            field.label ||
            name;

        const required =
            field.required
                ? ' required'
                : '';

        const wrapperClass =
            field.className ||
            'form-group';

        const value =
            field.value !== undefined &&
            field.value !== null
                ? field.value
                : '';

        let input = '';

        if (type === 'textarea') {
            input =
                '<textarea id="field-' +
                escapeHtml(name) +
                '" name="' +
                escapeHtml(name) +
                '" rows="' +
                escapeHtml(
                    field.rows ||
                    '3'
                ) +
                '"' +
                required +
                '>' +
                escapeHtml(
                    value
                ) +
                '</textarea>';
        } else if (
            type === 'select'
        ) {
            input =
                '<select id="field-' +
                escapeHtml(name) +
                '" name="' +
                escapeHtml(name) +
                '"' +
                required +
                '>' +
                (
                    field.optionsHtml ||
                    createSelectOptions(
                        field.options ||
                        [],
                        value
                    )
                ) +
                '</select>';
        } else if (
            type === 'checkbox'
        ) {
            input =
                '<label class="checkbox-label">' +
                '<input type="checkbox" id="field-' +
                escapeHtml(name) +
                '" name="' +
                escapeHtml(name) +
                '"' +
                (
                    value === true ||
                    value === 'true' ||
                    value === 1 ||
                    value === '1'
                        ? ' checked'
                        : ''
                ) +
                '>' +
                '<span>' +
                escapeHtml(
                    field.checkboxLabel ||
                    label
                ) +
                '</span>' +
                '</label>';
        } else {
            input =
                '<input type="' +
                escapeHtml(type) +
                '" id="field-' +
                escapeHtml(name) +
                '" name="' +
                escapeHtml(name) +
                '" value="' +
                escapeHtml(
                    value
                ) +
                '"' +
                required +
                (
                    field.placeholder
                        ? ' placeholder="' +
                          escapeHtml(
                              field.placeholder
                          ) +
                          '"'
                        : ''
                ) +
                (
                    field.step
                        ? ' step="' +
                          escapeHtml(
                              field.step
                          ) +
                          '"'
                        : ''
                ) +
                (
                    field.min !== undefined
                        ? ' min="' +
                          escapeHtml(
                              field.min
                          ) +
                          '"'
                        : ''
                ) +
                (
                    field.readonly
                        ? ' readonly'
                        : ''
                ) +
                '>';
        }

        if (type === 'checkbox') {
            return (
                '<div class="' +
                escapeHtml(
                    wrapperClass
                ) +
                ' checkbox-group">' +
                input +
                '</div>'
            );
        }

        return (
            '<div class="' +
            escapeHtml(
                wrapperClass
            ) +
            '">' +
            '<label for="field-' +
            escapeHtml(name) +
            '">' +
            escapeHtml(label) +
            (
                field.required
                    ? ' <span class="required">*</span>'
                    : ''
            ) +
            '</label>' +
            input +
            (
                field.help
                    ? '<small class="form-help">' +
                      escapeHtml(
                          field.help
                      ) +
                      '</small>'
                    : ''
            ) +
            '</div>'
        );
    }

    function createSelectOptions(options, selected) {
        let html =
            '<option value="">-- เลือก --</option>';

        options.forEach(
            function (option) {
                const value =
                    option.value !== undefined
                        ? option.value
                        : option.id;

                const label =
                    option.label !== undefined
                        ? option.label
                        : option.name;

                html +=
                    '<option value="' +
                    escapeHtml(
                        value
                    ) +
                    '"' +
                    (
                        String(
                            value
                        ) ===
                        String(
                            selected
                        )
                            ? ' selected'
                            : ''
                    ) +
                    '>' +
                    escapeHtml(
                        label
                    ) +
                    '</option>';
            }
        );

        return html;
    }

    function collectFormValues(form, fields) {
        const values = {};

        fields.forEach(
            function (field) {
                const name =
                    field.name;

                const element =
                    form.querySelector(
                        '[name="' +
                        CSS.escape(
                            name
                        ) +
                        '"]'
                    );

                if (!element) {
                    values[name] =
                        field.value !== undefined
                            ? field.value
                            : '';

                    return;
                }

                if (
                    field.type ===
                    'checkbox'
                ) {
                    values[name] =
                        element.checked;
                } else if (
                    field.type ===
                    'number'
                ) {
                    values[name] =
                        parseNumber(
                            element.value
                        );
                } else {
                    values[name] =
                        element.value;
                }
            }
        );

        return values;
    }

    function accountOptions(selected) {
        return state.accounts.map(
            function (account) {
                return {
                    value:
                        account.id ||
                        account.code ||
                        '',
                    label:
                        (
                            account.code
                                ? account.code +
                                  ' - '
                                : ''
                        ) +
                        (
                            account.name ||
                            ''
                        )
                };
            }
        );
    }

    function categoryOptions(type, selected) {
        const filtered =
            state.categories.filter(
                function (category) {
                    if (!type) {
                        return true;
                    }

                    return (
                        !category.type ||
                        String(
                            category.type
                        ).toLowerCase() ===
                        String(
                            type
                        ).toLowerCase()
                    );
                }
            );

        return filtered.map(
            function (category) {
                return {
                    value:
                        category.id ||
                        category.code ||
                        '',
                    label:
                        (
                            category.code
                                ? category.code +
                                  ' - '
                                : ''
                        ) +
                        (
                            category.name ||
                            ''
                        )
                };
            }
        );
    }

    function openIncomeModal(data) {
        const row =
            data || {};

        const fields = [
            {
                name: 'date',
                label: 'วันที่',
                type: 'date',
                value:
                    toInputDate(
                        row.date
                    ),
                required: true
            },
            {
                name: 'docNo',
                label: 'เลขที่เอกสาร',
                type: 'text',
                value:
                    row.docNo ||
                    row.documentNo ||
                    '',
                placeholder:
                    'เว้นว่างได้หากต้องการให้ระบบจัดเลขที่'
            },
            {
                name: 'accountId',
                label: 'บัญชีรับเงิน',
                type: 'select',
                value:
                    row.accountId ||
                    row.account ||
                    '',
                options:
                    accountOptions(
                        row.accountId
                    ),
                required: true
            },
            {
                name: 'categoryId',
                label: 'หมวดหมู่รายรับ',
                type: 'select',
                value:
                    row.categoryId ||
                    row.category ||
                    '',
                options:
                    categoryOptions(
                        'income',
                        row.categoryId
                    )
            },
            {
                name: 'counterpartyName',
                label: 'ผู้จ่าย / ลูกค้า',
                type: 'text',
                value:
                    row.counterpartyName ||
                    row.customerName ||
                    ''
            },
            {
                name: 'description',
                label: 'รายละเอียด',
                type: 'text',
                value:
                    row.description ||
                    '',
                required: true
            },
            {
                name: 'amount',
                label: 'จำนวนเงิน',
                type: 'number',
                value:
                    row.amount ||
                    '',
                min: '0',
                step: '0.01',
                required: true
            },
            {
                name: 'paymentMethod',
                label: 'ช่องทางรับเงิน',
                type: 'select',
                value:
                    row.paymentMethod ||
                    '',
                options: [
                    {
                        value: 'เงินสด',
                        label: 'เงินสด'
                    },
                    {
                        value: 'โอนเงิน',
                        label: 'โอนเงิน'
                    },
                    {
                        value: 'บัตร',
                        label: 'บัตร'
                    },
                    {
                        value: 'เช็ค',
                        label: 'เช็ค'
                    },
                    {
                        value: 'อื่น ๆ',
                        label: 'อื่น ๆ'
                    }
                ]
            },
            {
                name: 'reference',
                label: 'เลขอ้างอิง',
                type: 'text',
                value:
                    row.reference ||
                    ''
            }
        ];

        openModal({
            title:
                state.editingId
                    ? 'แก้ไขรายรับ'
                    : 'เพิ่มรายรับ',
            subtitle:
                'กรอกข้อมูลรายการรายรับ',
            fields: fields,
            submitLabel:
                'บันทึกรายรับ',
            onSubmit:
                async function (
                    values
                ) {
                    values.id =
                        state.editingId ||
                        row.id ||
                        '';

                    await apiRequest(
                        'saveincome',
                        {
                            data: values
                        }
                    );

                    showToast(
                        'บันทึกรายรับสำเร็จ',
                        'success'
                    );

                    await loadEntityRows(
                        'income',
                        state.currentPageNumber
                    );
                }
        });
    }

    function openExpenseModal(data) {
        const row =
            data || {};

        const fields = [
            {
                name: 'date',
                label: 'วันที่',
                type: 'date',
                value:
                    toInputDate(
                        row.date
                    ),
                required: true
            },
            {
                name: 'docNo',
                label: 'เลขที่เอกสาร',
                type: 'text',
                value:
                    row.docNo ||
                    row.documentNo ||
                    '',
                placeholder:
                    'เว้นว่างได้หากต้องการให้ระบบจัดเลขที่'
            },
            {
                name: 'accountId',
                label: 'บัญชีจ่ายเงิน',
                type: 'select',
                value:
                    row.accountId ||
                    row.account ||
                    '',
                options:
                    accountOptions(
                        row.accountId
                    ),
                required: true
            },
            {
                name: 'categoryId',
                label: 'หมวดหมู่รายจ่าย',
                type: 'select',
                value:
                    row.categoryId ||
                    row.category ||
                    '',
                options:
                    categoryOptions(
                        'expense',
                        row.categoryId
                    )
            },
            {
                name: 'counterpartyName',
                label: 'ผู้รับเงิน / ผู้จำหน่าย',
                type: 'text',
                value:
                    row.counterpartyName ||
                    row.vendorName ||
                    ''
            },
            {
                name: 'description',
                label: 'รายละเอียด',
                type: 'text',
                value:
                    row.description ||
                    '',
                required: true
            },
            {
                name: 'amount',
                label: 'จำนวนเงิน',
                type: 'number',
                value:
                    row.amount ||
                    '',
                min: '0',
                step: '0.01',
                required: true
            },
            {
                name: 'paymentMethod',
                label: 'ช่องทางจ่ายเงิน',
                type: 'select',
                value:
                    row.paymentMethod ||
                    '',
                options: [
                    {
                        value: 'เงินสด',
                        label: 'เงินสด'
                    },
                    {
                        value: 'โอนเงิน',
                        label: 'โอนเงิน'
                    },
                    {
                        value: 'บัตร',
                        label: 'บัตร'
                    },
                    {
                        value: 'เช็ค',
                        label: 'เช็ค'
                    },
                    {
                        value: 'อื่น ๆ',
                        label: 'อื่น ๆ'
                    }
                ]
            },
            {
                name: 'reference',
                label: 'เลขอ้างอิง',
                type: 'text',
                value:
                    row.reference ||
                    ''
            }
        ];

        openModal({
            title:
                state.editingId
                    ? 'แก้ไขรายจ่าย'
                    : 'เพิ่มรายจ่าย',
            subtitle:
                'กรอกข้อมูลรายการรายจ่าย',
            fields: fields,
            submitLabel:
                'บันทึกรายจ่าย',
            onSubmit:
                async function (
                    values
                ) {
                    values.id =
                        state.editingId ||
                        row.id ||
                        '';

                    await apiRequest(
                        'saveexpense',
                        {
                            data: values
                        }
                    );

                    showToast(
                        'บันทึกรายจ่ายสำเร็จ',
                        'success'
                    );

                    await loadEntityRows(
                        'expense',
                        state.currentPageNumber
                    );
                }
        });
    }

    function openTransferModal(data) {
        const row =
            data || {};

        const fields = [
            {
                name: 'date',
                label: 'วันที่',
                type: 'date',
                value:
                    toInputDate(
                        row.date
                    ),
                required: true
            },
            {
                name: 'docNo',
                label: 'เลขที่เอกสาร',
                type: 'text',
                value:
                    row.docNo ||
                    row.documentNo ||
                    ''
            },
            {
                name: 'fromAccountId',
                label: 'จากบัญชี',
                type: 'select',
                value:
                    row.fromAccountId ||
                    row.fromAccount ||
                    '',
                options:
                    accountOptions(
                        row.fromAccountId
                    ),
                required: true
            },
            {
                name: 'toAccountId',
                label: 'ไปบัญชี',
                type: 'select',
                value:
                    row.toAccountId ||
                    row.toAccount ||
                    '',
                options:
                    accountOptions(
                        row.toAccountId
                    ),
                required: true
            },
            {
                name: 'amount',
                label: 'จำนวนเงิน',
                type: 'number',
                value:
                    row.amount ||
                    '',
                min: '0',
                step: '0.01',
                required: true
            },
            {
                name: 'description',
                label: 'รายละเอียด',
                type: 'text',
                value:
                    row.description ||
                    ''
            },
            {
                name: 'reference',
                label: 'เลขอ้างอิง',
                type: 'text',
                value:
                    row.reference ||
                    ''
            }
        ];

        openModal({
            title:
                state.editingId
                    ? 'แก้ไขรายการโอน'
                    : 'โอนเงินระหว่างบัญชี',
            subtitle:
                'บันทึกการเคลื่อนไหวระหว่างบัญชี',
            fields: fields,
            submitLabel:
                'บันทึกการโอน',
            onSubmit:
                async function (
                    values
                ) {
                    if (
                        values.fromAccountId ===
                        values.toAccountId
                    ) {
                        throw new Error(
                            'บัญชีต้นทางและบัญชีปลายทางต้องไม่เป็นบัญชีเดียวกัน'
                        );
                    }

                    values.id =
                        state.editingId ||
                        row.id ||
                        '';

                    await apiRequest(
                        'savetransfer',
                        {
                            data: values
                        }
                    );

                    showToast(
                        'บันทึกรายการโอนสำเร็จ',
                        'success'
                    );

                    await loadEntityRows(
                        'transfers',
                        state.currentPageNumber
                    );
                }
        });
    }

    function openAccountModal(data) {
        const row =
            data || {};

        const fields = [
            {
                name: 'code',
                label: 'รหัสบัญชี',
                type: 'text',
                value:
                    row.code ||
                    '',
                required: true
            },
            {
                name: 'name',
                label: 'ชื่อบัญชี',
                type: 'text',
                value:
                    row.name ||
                    '',
                required: true
            },
            {
                name: 'type',
                label: 'ประเภทบัญชี',
                type: 'select',
                value:
                    row.type ||
                    '',
                options: [
                    {
                        value: 'เงินสด',
                        label: 'เงินสด'
                    },
                    {
                        value: 'ธนาคาร',
                        label: 'ธนาคาร'
                    },
                    {
                        value: 'e-Wallet',
                        label: 'e-Wallet'
                    },
                    {
                        value: 'อื่น ๆ',
                        label: 'อื่น ๆ'
                    }
                ],
                required: true
            },
            {
                name: 'openingBalance',
                label: 'ยอดยกมา',
                type: 'number',
                value:
                    row.openingBalance ||
                    0,
                step: '0.01'
            },
            {
                name: 'active',
                label: 'สถานะ',
                type: 'checkbox',
                value:
                    row.active !== undefined
                        ? row.active
                        : true,
                checkboxLabel:
                    'เปิดใช้งานบัญชี'
            },
            {
                name: 'description',
                label: 'รายละเอียด',
                type: 'textarea',
                value:
                    row.description ||
                    ''
            }
        ];

        openModal({
            title:
                state.editingId
                    ? 'แก้ไขบัญชี'
                    : 'เพิ่มบัญชี',
            fields: fields,
            submitLabel:
                'บันทึกบัญชี',
            onSubmit:
                async function (
                    values
                ) {
                    values.id =
                        state.editingId ||
                        row.id ||
                        '';

                    const action =
                        values.id
                            ? 'update'
                            : 'create';

                    await apiRequest(
                        action,
                        {
                            entity: 'accounts',
                            sheet: 'Accounts',
                            data: values,
                            id: values.id
                        }
                    );

                    showToast(
                        'บันทึกบัญชีสำเร็จ',
                        'success'
                    );

                    await loadBootstrap();

                    await loadEntityRows(
                        'accounts',
                        1
                    );
                }
        });
    }

    function openCategoryModal(data) {
        const row =
            data || {};

        const fields = [
            {
                name: 'code',
                label: 'รหัสหมวดหมู่',
                type: 'text',
                value:
                    row.code ||
                    '',
                required: true
            },
            {
                name: 'name',
                label: 'ชื่อหมวดหมู่',
                type: 'text',
                value:
                    row.name ||
                    '',
                required: true
            },
            {
                name: 'type',
                label: 'ประเภท',
                type: 'select',
                value:
                    row.type ||
                    '',
                options: [
                    {
                        value: 'income',
                        label: 'รายรับ'
                    },
                    {
                        value: 'expense',
                        label: 'รายจ่าย'
                    },
                    {
                        value: 'both',
                        label: 'ใช้ได้ทั้งสองประเภท'
                    }
                ],
                required: true
            },
            {
                name: 'active',
                label: 'สถานะ',
                type: 'checkbox',
                value:
                    row.active !== undefined
                        ? row.active
                        : true,
                checkboxLabel:
                    'เปิดใช้งานหมวดหมู่'
            },
            {
                name: 'description',
                label: 'รายละเอียด',
                type: 'textarea',
                value:
                    row.description ||
                    ''
            }
        ];

        openModal({
            title:
                state.editingId
                    ? 'แก้ไขหมวดหมู่'
                    : 'เพิ่มหมวดหมู่',
            fields: fields,
            submitLabel:
                'บันทึกหมวดหมู่',
            onSubmit:
                async function (
                    values
                ) {
                    values.id =
                        state.editingId ||
                        row.id ||
                        '';

                    const action =
                        values.id
                            ? 'update'
                            : 'create';

                    await apiRequest(
                        action,
                        {
                            entity: 'categories',
                            sheet: 'Categories',
                            data: values,
                            id: values.id
                        }
                    );

                    showToast(
                        'บันทึกหมวดหมู่สำเร็จ',
                        'success'
                    );

                    await loadBootstrap();

                    await loadEntityRows(
                        'categories',
                        1
                    );
                }
        });
    }

    function openPartyModal(entity, data) {
        const row =
            data || {};

        const title =
            entity === 'customers'
                ? 'ลูกค้า'
                : 'ผู้จำหน่าย / เจ้าหนี้';

        const fields = [
            {
                name: 'code',
                label: 'รหัส',
                type: 'text',
                value:
                    row.code ||
                    '',
                required: true
            },
            {
                name: 'name',
                label: 'ชื่อ',
                type: 'text',
                value:
                    row.name ||
                    '',
                required: true
            },
            {
                name: 'taxId',
                label: 'เลขประจำตัวผู้เสียภาษี',
                type: 'text',
                value:
                    row.taxId ||
                    ''
            },
            {
                name: 'address',
                label: 'ที่อยู่',
                type: 'textarea',
                value:
                    row.address ||
                    ''
            },
            {
                name: 'phone',
                label: 'โทรศัพท์',
                type: 'text',
                value:
                    row.phone ||
                    ''
            },
            {
                name: 'email',
                label: 'อีเมล',
                type: 'email',
                value:
                    row.email ||
                    ''
            },
            {
                name: 'contactPerson',
                label: 'ผู้ติดต่อ',
                type: 'text',
                value:
                    row.contactPerson ||
                    ''
            },
            {
                name: 'active',
                label: 'สถานะ',
                type: 'checkbox',
                value:
                    row.active !== undefined
                        ? row.active
                        : true,
                checkboxLabel:
                    'เปิดใช้งาน'
            },
            {
                name: 'notes',
                label: 'หมายเหตุ',
                type: 'textarea',
                value:
                    row.notes ||
                    ''
            }
        ];

        openModal({
            title:
                state.editingId
                    ? 'แก้ไข' + title
                    : 'เพิ่ม' + title,
            fields: fields,
            submitLabel:
                'บันทึกข้อมูล',
            size:
                'modal-large',
            onSubmit:
                async function (
                    values
                ) {
                    values.id =
                        state.editingId ||
                        row.id ||
                        '';

                    const action =
                        values.id
                            ? 'update'
                            : 'create';

                    await apiRequest(
                        action,
                        {
                            entity: entity,
                            sheet:
                                'Customers',
                            partyType:
                                entity,
                            data: values,
                            id: values.id
                        }
                    );

                    showToast(
                        'บันทึกข้อมูลสำเร็จ',
                        'success'
                    );

                    await loadBootstrap();

                    await loadEntityRows(
                        entity,
                        1
                    );
                }
        });
    }

    function openUserModal(data) {
        if (!isAdmin()) {
            showToast(
                'เฉพาะผู้ดูแลระบบเท่านั้น',
                'warning'
            );

            return;
        }

        const row =
            data || {};

        const isEdit =
            !!(
                state.editingId ||
                row.id
            );

        const fields = [
            {
                name: 'username',
                label: 'ชื่อผู้ใช้',
                type: 'text',
                value:
                    row.username ||
                    '',
                required: true,
                readonly:
                    isEdit
            },
            {
                name: 'password',
                label:
                    isEdit
                        ? 'รหัสผ่านใหม่'
                        : 'รหัสผ่าน',
                type: 'password',
                value: '',
                required:
                    !isEdit,
                placeholder:
                    isEdit
                        ? 'เว้นว่างหากไม่ต้องการเปลี่ยน'
                        : ''
            },
            {
                name: 'fullName',
                label: 'ชื่อ-นามสกุล',
                type: 'text',
                value:
                    row.fullName ||
                    ''
            },
            {
                name: 'role',
                label: 'สิทธิ์',
                type: 'select',
                value:
                    row.role ||
                    'user',
                options: [
                    {
                        value: 'admin',
                        label: 'ผู้ดูแลระบบ'
                    },
                    {
                        value: 'staff',
                        label: 'เจ้าหน้าที่'
                    },
                    {
                        value: 'user',
                        label: 'ผู้ใช้งาน'
                    }
                ],
                required: true
            },
            {
                name: 'active',
                label: 'สถานะ',
                type: 'checkbox',
                value:
                    row.active !== undefined
                        ? row.active
                        : true,
                checkboxLabel:
                    'เปิดใช้งานผู้ใช้งาน'
            }
        ];

        openModal({
            title:
                isEdit
                    ? 'แก้ไขผู้ใช้งาน'
                    : 'เพิ่มผู้ใช้งาน',
            fields: fields,
            submitLabel:
                'บันทึกผู้ใช้งาน',
            onSubmit:
                async function (
                    values
                ) {
                    values.id =
                        state.editingId ||
                        row.id ||
                        '';

                    if (
                        isEdit &&
                        !values.password
                    ) {
                        delete values.password;
                    }

                    const action =
                        values.id
                            ? 'update'
                            : 'create';

                    await apiRequest(
                        action,
                        {
                            entity: 'users',
                            sheet: 'Users',
                            data: values,
                            id: values.id
                        }
                    );

                    showToast(
                        'บันทึกผู้ใช้งานสำเร็จ',
                        'success'
                    );

                    await loadBootstrap();

                    await loadEntityRows(
                        'users',
                        1
                    );
                }
        });
    }

    async function openDocumentModal(data) {
        const row =
            data || {};

        let detail =
            row;

        if (
            state.editingId &&
            !row.items
        ) {
            try {
                const response =
                    await apiRequest(
                        'getDocumentWithItems',
                        {
                            id:
                                state.editingId
                        }
                    );

                detail =
                    unwrapResponse(
                        response
                    ) ||
                    row;
            } catch (error) {
                console.warn(
                    'Document detail error:',
                    error
                );
            }
        }

        const partyOptions = [];

        state.customers.forEach(
            function (customer) {
                partyOptions.push({
                    value:
                        customer.id ||
                        customer.code ||
                        '',
                    label:
                        'ลูกค้า: ' +
                        (
                            customer.name ||
                            ''
                        )
                });
            }
        );

        state.vendors.forEach(
            function (vendor) {
                partyOptions.push({
                    value:
                        vendor.id ||
                        vendor.code ||
                        '',
                    label:
                        'ผู้จำหน่าย: ' +
                        (
                            vendor.name ||
                            ''
                        )
                });
            }
        );

        const fields = [
            {
                name: 'docType',
                label: 'ประเภทเอกสาร',
                type: 'select',
                value:
                    detail.docType ||
                    detail.documentType ||
                    '',
                optionsHtml:
                    '<option value="">-- เลือกประเภทเอกสาร --</option>' +
                    createDocumentTypeOptions(
                        detail.docType ||
                        detail.documentType ||
                        ''
                    ),
                required: true
            },
            {
                name: 'date',
                label: 'วันที่',
                type: 'date',
                value:
                    toInputDate(
                        detail.date
                    ),
                required: true
            },
            {
                name: 'dueDate',
                label: 'วันครบกำหนด',
                type: 'date',
                value:
                    toInputDate(
                        detail.dueDate
                    )
            },
            {
                name: 'docNo',
                label: 'เลขที่เอกสาร',
                type: 'text',
                value:
                    detail.docNo ||
                    detail.documentNo ||
                    '',
                placeholder:
                    'เว้นว่างเพื่อให้ระบบออกเลขที่'
            },
            {
                name: 'partyId',
                label: 'ลูกค้า / ผู้จำหน่าย',
                type: 'select',
                value:
                    detail.customerId ||
                    detail.vendorId ||
                    detail.partyId ||
                    '',
                options:
                    partyOptions
            },
            {
                name: 'partyName',
                label: 'ชื่อคู่ค้า',
                type: 'text',
                value:
                    detail.partyName ||
                    detail.customerName ||
                    detail.vendorName ||
                    ''
            },
            {
                name: 'taxId',
                label: 'เลขประจำตัวผู้เสียภาษี',
                type: 'text',
                value:
                    detail.taxId ||
                    ''
            },
            {
                name: 'address',
                label: 'ที่อยู่',
                type: 'textarea',
                value:
                    detail.address ||
                    ''
            },
            {
                name: 'phone',
                label: 'โทรศัพท์',
                type: 'text',
                value:
                    detail.phone ||
                    ''
            },
            {
                name: 'subject',
                label: 'เรื่อง / รายละเอียด',
                type: 'text',
                value:
                    detail.subject ||
                    detail.description ||
                    ''
            },
            {
                name: 'discount',
                label: 'ส่วนลด',
                type: 'number',
                value:
                    detail.discount ||
                    0,
                min: '0',
                step: '0.01'
            },
            {
                name: 'taxRate',
                label: 'ภาษีมูลค่าเพิ่ม (%)',
                type: 'number',
                value:
                    detail.taxRate !== undefined
                        ? detail.taxRate
                        : 7,
                min: '0',
                step: '0.01'
            },
            {
                name: 'notes',
                label: 'หมายเหตุ',
                type: 'textarea',
                value:
                    detail.notes ||
                    ''
            }
        ];

        openModal({
            title:
                state.editingId
                    ? 'แก้ไขเอกสาร'
                    : 'สร้างเอกสาร',
            subtitle:
                'กรอกข้อมูลเอกสารและรายการสินค้า',
            fields: fields,
            submitLabel:
                'บันทึกเอกสาร',
            size:
                'modal-xlarge',
            afterOpen:
                function (container) {
                    appendDocumentItemsEditor(
                        container,
                        detail.items ||
                        detail.documentItems ||
                        []
                    );
                },
            onSubmit:
                async function (
                    values
                ) {
                    const items =
                        collectDocumentItems();

                    if (!items.length) {
                        throw new Error(
                            'กรุณาเพิ่มรายการในเอกสารอย่างน้อย 1 รายการ'
                        );
                    }

                    const calculated =
                        calculateDocumentTotals(
                            items,
                            values.discount,
                            values.taxRate
                        );

                    const documentData =
                        Object.assign(
                            {},
                            values,
                            {
                                id:
                                    state.editingId ||
                                    detail.id ||
                                    '',
                                subtotal:
                                    calculated.subtotal,
                                discount:
                                    calculated.discount,
                                taxAmount:
                                    calculated.taxAmount,
                                total:
                                    calculated.total,
                                grandTotal:
                                    calculated.total
                            }
                        );

                    await apiRequest(
                        'savedocument',
                        {
                            data:
                                documentData,
                            items:
                                items
                        }
                    );

                    showToast(
                        'บันทึกเอกสารสำเร็จ',
                        'success'
                    );

                    await loadEntityRows(
                        'documents',
                        1
                    );
                }
        });
    }

    function appendDocumentItemsEditor(
        container,
        existingItems
    ) {
        const form =
            container.querySelector(
                '#dynamicModalForm'
            );

        if (!form) {
            return;
        }

        state.currentDocumentItems =
            normalizeArray(
                existingItems
            ).map(
                function (item) {
                    return Object.assign(
                        {},
                        item
                    );
                }
            );

        const body =
            form.querySelector(
                '.modal-body'
            );

        if (!body) {
            return;
        }

        const wrapper =
            document.createElement(
                'div'
            );

        wrapper.className =
            'document-items-editor';

        wrapper.innerHTML =
            '<div class="document-items-header">' +
            '<div>' +
            '<h3>รายการในเอกสาร</h3>' +
            '<p>เพิ่มสินค้า บริการ หรือรายการที่เกี่ยวข้อง</p>' +
            '</div>' +
            '<button type="button" class="btn btn-secondary" data-action="add-document-item">＋ เพิ่มรายการ</button>' +
            '</div>' +
            '<div id="documentItemsRows"></div>' +
            '<div id="documentTotals" class="document-totals"></div>';

        body.appendChild(
            wrapper
        );

        renderDocumentItemsRows();
    }

    function renderDocumentItemsRows() {
        const container =
            byId(
                'documentItemsRows'
            );

        if (!container) {
            return;
        }

        let html = '';

        state.currentDocumentItems.forEach(
            function (item, index) {
                html +=
                    '<div class="document-item-row" data-item-index="' +
                    index +
                    '">' +
                    '<div class="form-group">' +
                    '<label>รายการ</label>' +
                    '<input type="text" data-item-field="description" value="' +
                    escapeHtml(
                        item.description ||
                        item.name ||
                        ''
                    ) +
                    '">' +
                    '</div>' +
                    '<div class="form-group">' +
                    '<label>จำนวน</label>' +
                    '<input type="number" data-item-field="quantity" value="' +
                    escapeHtml(
                        item.quantity !== undefined
                            ? item.quantity
                            : 1
                    ) +
                    '" min="0" step="0.01">' +
                    '</div>' +
                    '<div class="form-group">' +
                    '<label>หน่วย</label>' +
                    '<input type="text" data-item-field="unit" value="' +
                    escapeHtml(
                        item.unit ||
                        ''
                    ) +
                    '">' +
                    '</div>' +
                    '<div class="form-group">' +
                    '<label>ราคาต่อหน่วย</label>' +
                    '<input type="number" data-item-field="unitPrice" value="' +
                    escapeHtml(
                        item.unitPrice !== undefined
                            ? item.unitPrice
                            : 0
                    ) +
                    '" min="0" step="0.01">' +
                    '</div>' +
                    '<div class="form-group">' +
                    '<label>รวม</label>' +
                    '<input type="text" class="item-line-total" value="' +
                    escapeHtml(
                        formatMoney(
                            parseNumber(
                                item.quantity
                            ) *
                            parseNumber(
                                item.unitPrice
                            )
                        )
                    ) +
                    '" readonly>' +
                    '</div>' +
                    '<div class="form-group item-remove">' +
                    '<label>&nbsp;</label>' +
                    '<button type="button" class="btn btn-danger" data-action="remove-document-item" data-index="' +
                    index +
                    '">ลบ</button>' +
                    '</div>' +
                    '</div>';
            }
        );

        if (!html) {
            html =
                '<div class="empty-state compact">' +
                'ยังไม่มีรายการ กด “เพิ่มรายการ” เพื่อเริ่มต้น' +
                '</div>';
        }

        container.innerHTML =
            html;

        updateDocumentTotalsFromEditor();
    }

    function collectDocumentItems() {
        const rows =
            $$('.document-item-row');

        const items = [];

        rows.forEach(
            function (row) {
                const index =
                    parseInt(
                        row.getAttribute(
                            'data-item-index'
                        ),
                        10
                    );

                const original =
                    state.currentDocumentItems[
                        index
                    ] || {};

                const description =
                    getItemField(
                        row,
                        'description'
                    );

                const quantity =
                    parseNumber(
                        getItemField(
                            row,
                            'quantity'
                        )
                    );

                const unit =
                    getItemField(
                        row,
                        'unit'
                    );

                const unitPrice =
                    parseNumber(
                        getItemField(
                            row,
                            'unitPrice'
                        )
                    );

                if (
                    !description &&
                    quantity === 0 &&
                    unitPrice === 0
                ) {
                    return;
                }

                items.push(
                    Object.assign(
                        {},
                        original,
                        {
                            id:
                                original.id ||
                                generateId(),
                            description:
                                description,
                            quantity:
                                quantity ||
                                1,
                            unit:
                                unit,
                            unitPrice:
                                unitPrice,
                            amount:
                                (
                                    quantity ||
                                    1
                                ) *
                                unitPrice
                        }
                    )
                );
            }
        );

        return items;
    }

    function getItemField(row, field) {
        const element =
            row.querySelector(
                '[data-item-field="' +
                CSS.escape(field) +
                '"]'
            );

        return element
            ? element.value
            : '';
    }

    function calculateDocumentTotals(
        items,
        discount,
        taxRate
    ) {
        let subtotal = 0;

        items.forEach(
            function (item) {
                const quantity =
                    parseNumber(
                        item.quantity
                    ) || 1;

                const unitPrice =
                    parseNumber(
                        item.unitPrice
                    );

                subtotal +=
                    quantity *
                    unitPrice;
            }
        );

        const discountAmount =
            Math.max(
                0,
                parseNumber(
                    discount
                )
            );

        const afterDiscount =
            Math.max(
                0,
                subtotal -
                discountAmount
            );

        const rate =
            Math.max(
                0,
                parseNumber(
                    taxRate
                )
            );

        const taxAmount =
            afterDiscount *
            rate /
            100;

        const total =
            afterDiscount +
            taxAmount;

        return {
            subtotal:
                subtotal,
            discount:
                discountAmount,
            afterDiscount:
                afterDiscount,
            taxAmount:
                taxAmount,
            total:
                total
        };
    }

    function updateDocumentTotalsFromEditor() {
        const items =
            collectDocumentItems();

        const discountElement =
            byId(
                'field-discount'
            );

        const taxElement =
            byId(
                'field-taxRate'
            );

        const discount =
            discountElement
                ? parseNumber(
                    discountElement.value
                )
                : 0;

        const taxRate =
            taxElement
                ? parseNumber(
                    taxElement.value
                )
                : 7;

        const totals =
            calculateDocumentTotals(
                items,
                discount,
                taxRate
            );

        const container =
            byId(
                'documentTotals'
            );

        if (!container) {
            return;
        }

        container.innerHTML =
            '<div class="total-row">' +
            '<span>รวมก่อนส่วนลด</span>' +
            '<strong>' +
            escapeHtml(
                formatMoney(
                    totals.subtotal
                )
            ) +
            ' บาท</strong>' +
            '</div>' +
            '<div class="total-row">' +
            '<span>ส่วนลด</span>' +
            '<strong>' +
            escapeHtml(
                formatMoney(
                    totals.discount
                )
            ) +
            ' บาท</strong>' +
            '</div>' +
            '<div class="total-row">' +
            '<span>ภาษี ' +
            escapeHtml(
                formatNumber(
                    taxRate
                )
            ) +
            '%</span>' +
            '<strong>' +
            escapeHtml(
                formatMoney(
                    totals.taxAmount
                )
            ) +
            ' บาท</strong>' +
            '</div>' +
            '<div class="total-row grand-total">' +
            '<span>ยอดรวมสุทธิ</span>' +
            '<strong>' +
            escapeHtml(
                formatMoney(
                    totals.total
                )
            ) +
            ' บาท</strong>' +
            '</div>';
    }

    function addDocumentItem() {
        state.currentDocumentItems.push(
            {
                id:
                    generateId(),
                description:
                    '',
                quantity:
                    1,
                unit:
                    '',
                unitPrice:
                    0,
                amount:
                    0
            }
        );

        renderDocumentItemsRows();
    }

    function removeDocumentItem(index) {
        const numericIndex =
            parseInt(
                index,
                10
            );

        if (
            Number.isNaN(
                numericIndex
            )
        ) {
            return;
        }

        state.currentDocumentItems.splice(
            numericIndex,
            1
        );

        renderDocumentItemsRows();
    }

    function updateDocumentItemInput(
        element
    ) {
        const row =
            element.closest(
                '.document-item-row'
            );

        if (!row) {
            return;
        }

        const index =
            parseInt(
                row.getAttribute(
                    'data-item-index'
                ),
                10
            );

        if (
            Number.isNaN(
                index
            )
        ) {
            return;
        }

        const item =
            state.currentDocumentItems[
                index
            ] || {};

        const field =
            element.getAttribute(
                'data-item-field'
            );

        if (!field) {
            return;
        }

        if (
            field === 'quantity' ||
            field === 'unitPrice'
        ) {
            item[field] =
                parseNumber(
                    element.value
                );
        } else {
            item[field] =
                element.value;
        }

        item.amount =
            (
                parseNumber(
                    item.quantity
                ) || 1
            ) *
            parseNumber(
                item.unitPrice
            );

        const totalElement =
            row.querySelector(
                '.item-line-total'
            );

        if (totalElement) {
            totalElement.value =
                formatMoney(
                    item.amount
                );
        }

        updateDocumentTotalsFromEditor();
    }

    async function viewDocument(id) {
        try {
            setLoading(
                true,
                'กำลังโหลดเอกสาร...'
            );

            const response =
                await apiRequest(
                    'getDocumentWithItems',
                    {
                        id: id
                    }
                );

            const data =
                unwrapResponse(
                    response
                );

            openDocumentViewModal(
                data
            );
        } catch (error) {
            showToast(
                error.message ||
                'ไม่สามารถโหลดเอกสารได้',
                'error'
            );
        } finally {
            setLoading(false);
        }
    }

    function openDocumentViewModal(data) {
        const row =
            data || {};

        const items =
            normalizeArray(
                row.items ||
                row.documentItems
            );

        let itemHtml =
            '<table class="data-table">' +
            '<thead>' +
            '<tr>' +
            '<th>รายการ</th>' +
            '<th>จำนวน</th>' +
            '<th>หน่วย</th>' +
            '<th class="text-right">ราคา/หน่วย</th>' +
            '<th class="text-right">รวม</th>' +
            '</tr>' +
            '</thead><tbody>';

        items.forEach(
            function (item) {
                itemHtml +=
                    '<tr>' +
                    '<td>' +
                    escapeHtml(
                        item.description ||
                        item.name ||
                        ''
                    ) +
                    '</td>' +
                    '<td>' +
                    escapeHtml(
                        formatNumber(
                            item.quantity
                        )
                    ) +
                    '</td>' +
                    '<td>' +
                    escapeHtml(
                        item.unit ||
                        ''
                    ) +
                    '</td>' +
                    '<td class="text-right">' +
                    escapeHtml(
                        formatMoney(
                            item.unitPrice
                        )
                    ) +
                    '</td>' +
                    '<td class="text-right">' +
                    escapeHtml(
                        formatMoney(
                            item.amount ||
                            (
                                parseNumber(
                                    item.quantity
                                ) *
                                parseNumber(
                                    item.unitPrice
                                )
                            )
                        )
                    ) +
                    '</td>' +
                    '</tr>';
            }
        );

        itemHtml +=
            '</tbody></table>';

        openModal({
            title:
                getDocumentTypeName(
                    row.docType ||
                    row.documentType
                ) +
                ' ' +
                (
                    row.docNo ||
                    row.documentNo ||
                    ''
                ),
            subtitle:
                'รายละเอียดเอกสาร',
            fields: [
                {
                    name: 'view',
                    label: 'ข้อมูล',
                    type: 'textarea',
                    value:
                        '',
                    readonly: true,
                    help:
                        'ดูรายละเอียดเพิ่มเติมจากรายการด้านล่าง'
                }
            ],
            submitLabel:
                'ปิด',
            afterOpen:
                function (container) {
                    const body =
                        container.querySelector(
                            '.modal-body'
                        );

                    if (!body) {
                        return;
                    }

                    body.innerHTML =
                        '<div class="document-preview">' +
                        '<div class="document-meta-grid">' +
                        '<div><span>ประเภท</span><strong>' +
                        escapeHtml(
                            getDocumentTypeName(
                                row.docType ||
                                row.documentType
                            )
                        ) +
                        '</strong></div>' +
                        '<div><span>เลขที่</span><strong>' +
                        escapeHtml(
                            row.docNo ||
                            row.documentNo ||
                            '-'
                        ) +
                        '</strong></div>' +
                        '<div><span>วันที่</span><strong>' +
                        escapeHtml(
                            formatDate(
                                row.date
                            )
                        ) +
                        '</strong></div>' +
                        '<div><span>ครบกำหนด</span><strong>' +
                        escapeHtml(
                            formatDate(
                                row.dueDate
                            )
                        ) +
                        '</strong></div>' +
                        '<div><span>คู่ค้า</span><strong>' +
                        escapeHtml(
                            row.partyName ||
                            row.customerName ||
                            row.vendorName ||
                            '-'
                        ) +
                        '</strong></div>' +
                        '<div><span>เลขภาษี</span><strong>' +
                        escapeHtml(
                            row.taxId ||
                            '-'
                        ) +
                        '</strong></div>' +
                        '</div>' +
                        '<div class="document-items-preview">' +
                        itemHtml +
                        '</div>' +
                        '<div class="document-total-preview">' +
                        '<div><span>รวมก่อนส่วนลด</span><strong>' +
                        escapeHtml(
                            formatMoney(
                                row.subtotal
                            )
                        ) +
                        ' บาท</strong></div>' +
                        '<div><span>ส่วนลด</span><strong>' +
                        escapeHtml(
                            formatMoney(
                                row.discount
                            )
                        ) +
                        ' บาท</strong></div>' +
                        '<div><span>ภาษี</span><strong>' +
                        escapeHtml(
                            formatMoney(
                                row.taxAmount
                            )
                        ) +
                        ' บาท</strong></div>' +
                        '<div class="grand"><span>ยอดรวม</span><strong>' +
                        escapeHtml(
                            formatMoney(
                                row.total ||
                                row.grandTotal
                            )
                        ) +
                        ' บาท</strong></div>' +
                        '</div>' +
                        '</div>';
                },
            onSubmit:
                async function () {
                    closeModal();
                }
        });

        const submitButton =
            byId(
                'modalSubmitButton'
            );

        if (submitButton) {
            submitButton.textContent =
                'ปิด';
        }
    }

    async function cancelDocument(id) {
        const confirmed =
            await confirmAction(
                'ยืนยันยกเลิกเอกสารนี้หรือไม่?'
            );

        if (!confirmed) {
            return;
        }

        try {
            setLoading(
                true,
                'กำลังยกเลิกเอกสาร...'
            );

            await apiRequest(
                'cancelDocument',
                {
                    id: id
                }
            );

            showToast(
                'ยกเลิกเอกสารสำเร็จ',
                'success'
            );

            await loadEntityRows(
                'documents',
                state.currentPageNumber
            );
        } catch (error) {
            showToast(
                error.message ||
                'ไม่สามารถยกเลิกเอกสารได้',
                'error'
            );
        } finally {
            setLoading(false);
        }
    }

    async function cancelTransaction(
        entity,
        id
    ) {
        const confirmed =
            await confirmAction(
                'ยืนยันยกเลิกรายการนี้หรือไม่?'
            );

        if (!confirmed) {
            return;
        }

        let action = '';

        if (entity === 'income') {
            action =
                'cancelIncome';
        } else if (entity === 'expense') {
            action =
                'cancelExpense';
        }

        if (!action) {
            await deleteEntity(
                entity,
                id
            );

            return;
        }

        try {
            setLoading(
                true,
                'กำลังยกเลิกรายการ...'
            );

            await apiRequest(
                action,
                {
                    id: id
                }
            );

            showToast(
                'ยกเลิกรายการสำเร็จ',
                'success'
            );

            await loadEntityRows(
                entity,
                state.currentPageNumber
            );
        } catch (error) {
            showToast(
                error.message ||
                'ไม่สามารถยกเลิกรายการได้',
                'error'
            );
        } finally {
            setLoading(false);
        }
    }

    async function renderReportsPage() {
        const container =
            getPageContainer(
                'reports'
            );

        container.innerHTML =
            '<section class="reports-page">' +
            '<div class="page-toolbar">' +
            '<div>' +
            '<h2>รายงาน</h2>' +
            '<p>สรุปข้อมูลทางการเงินตามช่วงเวลา</p>' +
            '</div>' +
            '</div>' +
            '<div class="card filter-card">' +
            '<div class="filter-grid">' +
            '<div class="form-group">' +
            '<label>ประเภทรายงาน</label>' +
            '<select id="reportType">' +
            '<option value="income_expense">รายรับ - รายจ่าย</option>' +
            '<option value="cash_bank">เงินสด / ธนาคาร</option>' +
            '<option value="transactions">รายการทั้งหมด</option>' +
            '<option value="documents">ทะเบียนเอกสาร</option>' +
            '</select>' +
            '</div>' +
            '<div class="form-group">' +
            '<label>วันที่เริ่มต้น</label>' +
            '<input type="date" id="reportDateFrom" value="' +
            escapeHtml(
                toInputDate(
                    new Date(
                        new Date().getFullYear(),
                        new Date().getMonth(),
                        1
                    )
                )
            ) +
            '">' +
            '</div>' +
            '<div class="form-group">' +
            '<label>วันที่สิ้นสุด</label>' +
            '<input type="date" id="reportDateTo" value="' +
            escapeHtml(
                toInputDate(
                    new Date()
                )
            ) +
            '">' +
            '</div>' +
            '<div class="form-group filter-actions">' +
            '<button type="button" class="btn btn-primary" data-action="run-report">สร้างรายงาน</button>' +
            '<button type="button" class="btn btn-secondary" data-action="export-report">Excel</button>' +
            '</div>' +
            '</div>' +
            '</div>' +
            '<div id="reportSummary" class="dashboard-cards"></div>' +
            '<div class="card">' +
            '<div class="card-header">' +
            '<h3>ผลรายงาน</h3>' +
            '</div>' +
            '<div id="reportTableContainer" class="table-responsive">' +
            '<div class="empty-state">เลือกช่วงเวลาแล้วกด “สร้างรายงาน”</div>' +
            '</div>' +
            '</div>' +
            '</section>';

        await runReport();
    }

    async function runReport() {
        const reportTypeElement =
            byId('reportType');

        const dateFromElement =
            byId('reportDateFrom');

        const dateToElement =
            byId('reportDateTo');

        if (
            !reportTypeElement ||
            !dateFromElement ||
            !dateToElement
        ) {
            return;
        }

        const reportType =
            reportTypeElement.value;

        const dateFrom =
            dateFromElement.value;

        const dateTo =
            dateToElement.value;

        try {
            setLoading(
                true,
                'กำลังสร้างรายงาน...'
            );

            const response =
                await apiRequest(
                    'report',
                    {
                        reportType:
                            reportType,
                        dateFrom:
                            dateFrom,
                        dateTo:
                            dateTo
                    }
                );

            const data =
                unwrapResponse(
                    response
                ) ||
                {};

            state.reportData =
                data;

            renderReportResult(
                data
            );
        } catch (error) {
            showToast(
                error.message ||
                'ไม่สามารถสร้างรายงานได้',
                'error'
            );
        } finally {
            setLoading(false);
        }
    }

    function renderReportResult(data) {
        const rows =
            normalizeArray(
                data.rows ||
                data.items ||
                data.records ||
                data.data
            );

        const summary =
            data.summary ||
            {};

        const summaryContainer =
            byId(
                'reportSummary'
            );

        if (summaryContainer) {
            summaryContainer.innerHTML =
                createStatCard(
                    'รายรับ',
                    'reportIncome',
                    formatMoney(
                        summary.income ||
                        data.income ||
                        0
                    )
                ) +
                createStatCard(
                    'รายจ่าย',
                    'reportExpense',
                    formatMoney(
                        summary.expense ||
                        data.expense ||
                        0
                    )
                ) +
                createStatCard(
                    'สุทธิ',
                    'reportNet',
                    formatMoney(
                        summary.net ||
                        data.net ||
                        0
                    )
                );
        }

        const tableContainer =
            byId(
                'reportTableContainer'
            );

        if (!tableContainer) {
            return;
        }

        if (!rows.length) {
            tableContainer.innerHTML =
                '<div class="empty-state">ไม่พบข้อมูลในช่วงเวลาที่เลือก</div>';

            return;
        }

        tableContainer.innerHTML =
            renderGenericTable(
                rows,
                'reports'
            );
    }

    async function renderSettingsPage() {
        if (!isAdmin()) {
            showToast(
                'เฉพาะผู้ดูแลระบบเท่านั้น',
                'warning'
            );

            return;
        }

        const container =
            getPageContainer(
                'settings'
            );

        let settings = [];

        try {
            const response =
                await apiRequest(
                    'settings',
                    {}
                );

            const data =
                unwrapResponse(
                    response
                );

            settings =
                normalizeArray(
                    data
                );

            if (!settings.length) {
                settings =
                    Object.keys(
                        state.settings
                    ).map(
                        function (key) {
                            const value =
                                state.settings[
                                    key
                                ];

                            if (
                                value &&
                                typeof value ===
                                'object'
                            ) {
                                return {
                                    key:
                                        key,
                                    value:
                                        value.value ||
                                        '',
                                    description:
                                        value.description ||
                                        ''
                                };
                            }

                            return {
                                key:
                                    key,
                                value:
                                    value,
                                description:
                                    ''
                            };
                        }
                    );
            }
        } catch (error) {
            settings =
                Object.keys(
                    state.settings
                ).map(
                    function (key) {
                        return {
                            key:
                                key,
                            value:
                                state.settings[
                                    key
                                ],
                            description:
                                ''
                        };
                    }
                );
        }

        let rowsHtml = '';

        settings.forEach(
            function (setting) {
                rowsHtml +=
                    '<tr>' +
                    '<td>' +
                    escapeHtml(
                        setting.key ||
                        ''
                    ) +
                    '</td>' +
                    '<td>' +
                    escapeHtml(
                        setting.value ||
                        ''
                    ) +
                    '</td>' +
                    '<td>' +
                    escapeHtml(
                        setting.description ||
                        ''
                    ) +
                    '</td>' +
                    '<td class="text-center">' +
                    '<button type="button" class="btn-icon" data-action="edit-setting" data-key="' +
                    escapeHtml(
                        setting.key ||
                        ''
                    ) +
                    '">✎</button>' +
                    '</td>' +
                    '</tr>';
            }
        );

        container.innerHTML =
            '<section class="settings-page">' +
            '<div class="page-toolbar">' +
            '<div>' +
            '<h2>ตั้งค่ากิจการ</h2>' +
            '<p>ข้อมูลและค่าการทำงานของระบบ</p>' +
            '</div>' +
            '<div class="toolbar-actions">' +
            '<button type="button" class="btn btn-primary" data-action="create-setting">＋ เพิ่มการตั้งค่า</button>' +
            '</div>' +
            '</div>' +
            '<div class="card">' +
            '<div class="card-body no-padding">' +
            '<div class="table-responsive">' +
            '<table class="data-table">' +
            '<thead>' +
            '<tr>' +
            '<th>Key</th>' +
            '<th>Value</th>' +
            '<th>รายละเอียด</th>' +
            '<th>จัดการ</th>' +
            '</tr>' +
            '</thead>' +
            '<tbody>' +
            rowsHtml +
            '</tbody>' +
            '</table>' +
            '</div>' +
            '</div>' +
            '</div>' +
            '</section>';
    }

    function openSettingModal(key) {
        const existing =
            key
                ? (
                    state.settings[
                        key
                    ] || {}
                )
                : {};

        const currentValue =
            existing &&
            typeof existing ===
            'object'
                ? existing.value ||
                  ''
                : existing;

        const currentDescription =
            existing &&
            typeof existing ===
            'object'
                ? existing.description ||
                  ''
                : '';

        openModal({
            title:
                key
                    ? 'แก้ไขการตั้งค่า'
                    : 'เพิ่มการตั้งค่า',
            fields: [
                {
                    name: 'key',
                    label: 'Key',
                    type: 'text',
                    value:
                        key ||
                        '',
                    required: true,
                    readonly:
                        !!key
                },
                {
                    name: 'value',
                    label: 'Value',
                    type: 'text',
                    value:
                        currentValue ||
                        ''
                },
                {
                    name: 'description',
                    label: 'รายละเอียด',
                    type: 'textarea',
                    value:
                        currentDescription ||
                        ''
                }
            ],
            submitLabel:
                'บันทึกการตั้งค่า',
            onSubmit:
                async function (
                    values
                ) {
                    await apiRequest(
                        'updatesetting',
                        {
                            key:
                                values.key,
                            value:
                                values.value,
                            description:
                                values.description
                        }
                    );

                    showToast(
                        'บันทึกการตั้งค่าสำเร็จ',
                        'success'
                    );

                    await loadBootstrap();

                    await renderSettingsPage();
                }
        });
    }

    async function renderAuditLogsPage() {
        if (!isAdmin()) {
            showToast(
                'เฉพาะผู้ดูแลระบบเท่านั้น',
                'warning'
            );

            return;
        }

        const container =
            getPageContainer(
                'auditlogs'
            );

        container.innerHTML =
            '<section class="auditlogs-page">' +
            '<div class="page-toolbar">' +
            '<div>' +
            '<h2>Audit Log</h2>' +
            '<p>ประวัติการทำรายการของผู้ใช้งาน</p>' +
            '</div>' +
            '<div class="toolbar-actions">' +
            '<button type="button" class="btn btn-secondary" data-action="refresh-auditlogs">รีเฟรช</button>' +
            '</div>' +
            '</div>' +
            '<div class="card filter-card">' +
            '<div class="filter-grid">' +
            '<div class="form-group">' +
            '<label>วันที่เริ่มต้น</label>' +
            '<input type="date" id="auditDateFrom">' +
            '</div>' +
            '<div class="form-group">' +
            '<label>วันที่สิ้นสุด</label>' +
            '<input type="date" id="auditDateTo">' +
            '</div>' +
            '<div class="form-group">' +
            '<label>ค้นหา</label>' +
            '<input type="search" id="auditSearch" placeholder="ผู้ใช้ / Action / รายละเอียด">' +
            '</div>' +
            '<div class="form-group filter-actions">' +
            '<button type="button" class="btn btn-primary" data-action="load-auditlogs">ค้นหา</button>' +
            '</div>' +
            '</div>' +
            '</div>' +
            '<div class="card">' +
            '<div id="auditLogsContainer" class="table-responsive">' +
            '<div class="loading-state">กำลังโหลด...</div>' +
            '</div>' +
            '</div>' +
            '</section>';

        await loadAuditLogs();
    }

    async function loadAuditLogs() {
        const container =
            byId(
                'auditLogsContainer'
            );

        if (container) {
            container.innerHTML =
                '<div class="loading-state">กำลังโหลด Audit Log...</div>';
        }

        try {
            const response =
                await apiRequest(
                    'auditlogs',
                    {
                        dateFrom:
                            byId(
                                'auditDateFrom'
                            )
                                ? byId(
                                    'auditDateFrom'
                                ).value
                                : '',
                        dateTo:
                            byId(
                                'auditDateTo'
                            )
                                ? byId(
                                    'auditDateTo'
                                ).value
                                : '',
                        search:
                            byId(
                                'auditSearch'
                            )
                                ? byId(
                                    'auditSearch'
                                ).value.trim()
                                : ''
                    }
                );

            const data =
                unwrapResponse(
                    response
                );

            const rows =
                normalizeArray(
                    data
                );

            if (!container) {
                return;
            }

            if (!rows.length) {
                container.innerHTML =
                    '<div class="empty-state">ไม่พบ Audit Log</div>';

                return;
            }

            let html =
                '<table class="data-table">' +
                '<thead>' +
                '<tr>' +
                '<th>เวลา</th>' +
                '<th>ผู้ใช้</th>' +
                '<th>Action</th>' +
                '<th>Entity</th>' +
                '<th>รายละเอียด</th>' +
                '<th>IP</th>' +
                '</tr>' +
                '</thead><tbody>';

            rows.forEach(
                function (row) {
                    html +=
                        '<tr>' +
                        '<td>' +
                        escapeHtml(
                            formatDateTime(
                                row.createdAt ||
                                row.timestamp ||
                                row.time
                            )
                        ) +
                        '</td>' +
                        '<td>' +
                        escapeHtml(
                            row.username ||
                            row.user ||
                            ''
                        ) +
                        '</td>' +
                        '<td>' +
                        escapeHtml(
                            row.action ||
                            ''
                        ) +
                        '</td>' +
                        '<td>' +
                        escapeHtml(
                            row.entity ||
                            ''
                        ) +
                        '</td>' +
                        '<td>' +
                        escapeHtml(
                            row.description ||
                            row.details ||
                            row.message ||
                            ''
                        ) +
                        '</td>' +
                        '<td>' +
                        escapeHtml(
                            row.ip ||
                            ''
                        ) +
                        '</td>' +
                        '</tr>';
                }
            );

            html +=
                '</tbody></table>';

            container.innerHTML =
                html;
        } catch (error) {
            if (container) {
                container.innerHTML =
                    '<div class="empty-state error-state">' +
                    escapeHtml(
                        error.message ||
                        'ไม่สามารถโหลด Audit Log ได้'
                    ) +
                    '</div>';
            }
        }
    }

    async function exportCurrentEntity(
        entity
    ) {
        if (
            !state.currentRows ||
            !state.currentRows.length
        ) {
            showToast(
                'ไม่มีข้อมูลสำหรับส่งออก',
                'warning'
            );

            return;
        }

        const rows =
            state.currentRows;

        const filename =
            entity +
            '_' +
            formatFileDate(
                new Date()
            );

        await exportXlsx(
            rows,
            filename
        );
    }

    async function exportReport() {
        if (
            !state.reportData
        ) {
            showToast(
                'กรุณาสร้างรายงานก่อน',
                'warning'
            );

            return;
        }

        const rows =
            normalizeArray(
                state.reportData.rows ||
                state.reportData.items ||
                state.reportData.records ||
                state.reportData.data
            );

        if (!rows.length) {
            showToast(
                'รายงานไม่มีข้อมูล',
                'warning'
            );

            return;
        }

        await exportXlsx(
            rows,
            'report_' +
            formatFileDate(
                new Date()
            )
        );
    }

    async function exportXlsx(
        rows,
        filename
    ) {
        if (
            window.XLSX
        ) {
            try {
                const workbook =
                    window.XLSX.utils.book_new();

                const worksheet =
                    window.XLSX.utils.json_to_sheet(
                        rows
                    );

                window.XLSX.utils.book_append_sheet(
                    workbook,
                    worksheet,
                    'ข้อมูล'
                );

                window.XLSX.writeFile(
                    workbook,
                    filename +
                    '.xlsx'
                );

                showToast(
                    'ส่งออก Excel สำเร็จ',
                    'success'
                );

                return;
            } catch (error) {
                console.error(
                    'XLSX ERROR:',
                    error
                );
            }
        }

        const csv =
            convertRowsToCsv(
                rows
            );

        downloadBlob(
            csv,
            filename +
            '.csv',
            'text/csv;charset=utf-8'
        );

        showToast(
            'ไม่พบไลบรารี Excel จึงส่งออกเป็น CSV แทน',
            'warning',
            6000
        );
    }

    function convertRowsToCsv(rows) {
        if (!rows.length) {
            return '';
        }

        const keys =
            getUsefulObjectKeys(
                rows
            );

        const lines = [];

        lines.push(
            keys.map(
                function (key) {
                    return csvEscape(
                        prettifyKey(
                            key
                        )
                    );
                }
            ).join(',')
        );

        rows.forEach(
            function (row) {
                lines.push(
                    keys.map(
                        function (key) {
                            return csvEscape(
                                displayValue(
                                    row[key]
                                )
                            );
                        }
                    ).join(',')
                );
            }
        );

        return '\uFEFF' +
            lines.join('\r\n');
    }

    function csvEscape(value) {
        const text =
            String(
                value === null ||
                value === undefined
                    ? ''
                    : value
            );

        if (
            text.indexOf('"') !== -1 ||
            text.indexOf(',') !== -1 ||
            text.indexOf('\n') !== -1 ||
            text.indexOf('\r') !== -1
        ) {
            return '"' +
                text.replace(
                    /"/g,
                    '""'
                ) +
                '"';
        }

        return text;
    }

    function downloadBlob(
        content,
        filename,
        mimeType
    ) {
        const blob =
            content instanceof Blob
                ? content
                : new Blob(
                    [content],
                    {
                        type:
                            mimeType ||
                            'application/octet-stream'
                    }
                );

        const url =
            URL.createObjectURL(
                blob
            );

        const anchor =
            document.createElement(
                'a'
            );

        anchor.href =
            url;

        anchor.download =
            filename;

        document.body.appendChild(
            anchor
        );

        anchor.click();

        window.setTimeout(
            function () {
                document.body.removeChild(
                    anchor
                );

                URL.revokeObjectURL(
                    url
                );
            },
            100
        );
    }

    function formatFileDate(date) {
        const year =
            date.getFullYear();

        const month =
            String(
                date.getMonth() + 1
            ).padStart(
                2,
                '0'
            );

        const day =
            String(
                date.getDate()
            ).padStart(
                2,
                '0'
            );

        return (
            year +
            month +
            day
        );
    }

    async function downloadDocumentPdf(id) {
        try {
            setLoading(
                true,
                'กำลังเตรียม PDF...'
            );

            const response =
                await apiRequest(
                    'getDocumentWithItems',
                    {
                        id: id
                    }
                );

            const data =
                unwrapResponse(
                    response
                );

            if (
                window.html2pdf
            ) {
                await generatePdfWithHtml2Pdf(
                    data
                );

                showToast(
                    'สร้าง PDF สำเร็จ',
                    'success'
                );

                return;
            }

            if (
                window.jspdf &&
                window.jspdf.jsPDF
            ) {
                generatePdfWithJsPdf(
                    data
                );

                return;
            }

            printDocument(
                data
            );
        } catch (error) {
            console.error(
                'PDF ERROR:',
                error
            );

            showToast(
                error.message ||
                'ไม่สามารถสร้าง PDF ได้',
                'error'
            );
        } finally {
            setLoading(false);
        }
    }

    async function generatePdfWithHtml2Pdf(
        data
    ) {
        const element =
            createPrintableDocumentElement(
                data
            );

        document.body.appendChild(
            element
        );

        const filename =
            (
                data.docNo ||
                data.documentNo ||
                'document'
            ) +
            '.pdf';

        try {
            await window.html2pdf()
                .set(
                    {
                        margin: 10,
                        filename:
                            filename,
                        image: {
                            type:
                                'jpeg',
                            quality:
                                0.95
                        },
                        html2canvas: {
                            scale: 2,
                            useCORS:
                                true
                        },
                        jsPDF: {
                            unit:
                                'mm',
                            format:
                                'a4',
                            orientation:
                                'portrait'
                        }
                    }
                )
                .from(
                    element
                )
                .save();
        } finally {
            if (
                element.parentNode
            ) {
                element.parentNode.removeChild(
                    element
                );
            }
        }
    }

    function generatePdfWithJsPdf(data) {
        const JsPDF =
            window.jspdf.jsPDF;

        const pdf =
            new JsPDF({
                orientation:
                    'portrait',
                unit:
                    'mm',
                format:
                    'a4'
            });

        const hasThaiFont =
            !!(
                window.TH_SARABUN_FONT &&
                typeof window.TH_SARABUN_FONT ===
                'string'
            );

        if (
            hasThaiFont &&
            typeof pdf.addFileToVFS ===
            'function' &&
            typeof pdf.addFont ===
            'function'
        ) {
            try {
                pdf.addFileToVFS(
                    'THSarabunNew.ttf',
                    window.TH_SARABUN_FONT
                );

                pdf.addFont(
                    'THSarabunNew.ttf',
                    'THSarabunNew',
                    'normal'
                );

                pdf.setFont(
                    'THSarabunNew'
                );
            } catch (error) {
                console.warn(
                    'Thai font registration failed:',
                    error
                );
            }
        }

        pdf.setFontSize(
            16
        );

        pdf.text(
            safePdfText(
                getDocumentTypeName(
                    data.docType ||
                    data.documentType
                )
            ),
            20,
            20
        );

        pdf.setFontSize(
            11
        );

        pdf.text(
            safePdfText(
                'เลขที่: ' +
                (
                    data.docNo ||
                    data.documentNo ||
                    '-'
                )
            ),
            20,
            30
        );

        pdf.text(
            safePdfText(
                'วันที่: ' +
                formatDate(
                    data.date
                )
            ),
            20,
            37
        );

        pdf.text(
            safePdfText(
                'คู่ค้า: ' +
                (
                    data.partyName ||
                    data.customerName ||
                    data.vendorName ||
                    '-'
                )
            ),
            20,
            44
        );

        let y = 58;

        const items =
            normalizeArray(
                data.items ||
                data.documentItems
            );

        items.forEach(
            function (item) {
                const line =
                    (
                        item.description ||
                        item.name ||
                        ''
                    ) +
                    '  x' +
                    (
                        item.quantity ||
                        1
                    ) +
                    '  ' +
                    formatMoney(
                        item.amount ||
                        (
                            parseNumber(
                                item.quantity
                            ) *
                            parseNumber(
                                item.unitPrice
                            )
                        )
                    );

                pdf.text(
                    safePdfText(
                        line
                    ),
                    20,
                    y
                );

                y += 7;

                if (
                    y > 275
                ) {
                    pdf.addPage();
                    y = 20;
                }
            }
        );

        y += 5;

        pdf.text(
            safePdfText(
                'รวมก่อนส่วนลด: ' +
                formatMoney(
                    data.subtotal
                )
            ),
            120,
            y
        );

        y += 7;

        pdf.text(
            safePdfText(
                'ส่วนลด: ' +
                formatMoney(
                    data.discount
                )
            ),
            120,
            y
        );

        y += 7;

        pdf.text(
            safePdfText(
                'ภาษี: ' +
                formatMoney(
                    data.taxAmount
                )
            ),
            120,
            y
        );

        y += 8;

        pdf.setFontSize(
            14
        );

        pdf.text(
            safePdfText(
                'ยอดรวม: ' +
                formatMoney(
                    data.total ||
                    data.grandTotal
                ) +
                ' บาท'
            ),
            120,
            y
        );

        pdf.save(
            (
                data.docNo ||
                data.documentNo ||
                'document'
            ) +
            '.pdf'
        );

        showToast(
            'สร้าง PDF สำเร็จ',
            'success'
        );
    }

    function safePdfText(text) {
        return String(
            text || ''
        );
    }

    function createPrintableDocumentElement(
        data
    ) {
        const element =
            document.createElement(
                'div'
            );

        element.className =
            'print-document';

        const items =
            normalizeArray(
                data.items ||
                data.documentItems
            );

        let itemsHtml = '';

        items.forEach(
            function (item, index) {
                const quantity =
                    parseNumber(
                        item.quantity
                    ) || 1;

                const unitPrice =
                    parseNumber(
                        item.unitPrice
                    );

                const amount =
                    parseNumber(
                        item.amount
                    ) ||
                    quantity *
                    unitPrice;

                itemsHtml +=
                    '<tr>' +
                    '<td>' +
                    escapeHtml(
                        index + 1
                    ) +
                    '</td>' +
                    '<td>' +
                    escapeHtml(
                        item.description ||
                        item.name ||
                        ''
                    ) +
                    '</td>' +
                    '<td class="right">' +
                    escapeHtml(
                        formatNumber(
                            quantity
                        )
                    ) +
                    '</td>' +
                    '<td>' +
                    escapeHtml(
                        item.unit ||
                        ''
                    ) +
                    '</td>' +
                    '<td class="right">' +
                    escapeHtml(
                        formatMoney(
                            unitPrice
                        )
                    ) +
                    '</td>' +
                    '<td class="right">' +
                    escapeHtml(
                        formatMoney(
                            amount
                        )
                    ) +
                    '</td>' +
                    '</tr>';
            }
        );

        element.innerHTML =
            '<div class="print-document-inner">' +
            '<div class="print-header">' +
            '<h1>' +
            escapeHtml(
                getSetting(
                    'businessName',
                    'กิจการ'
                )
            ) +
            '</h1>' +
            '<h2>' +
            escapeHtml(
                getDocumentTypeName(
                    data.docType ||
                    data.documentType
                )
            ) +
            '</h2>' +
            '</div>' +
            '<div class="print-meta">' +
            '<div><strong>เลขที่:</strong> ' +
            escapeHtml(
                data.docNo ||
                data.documentNo ||
                '-'
            ) +
            '</div>' +
            '<div><strong>วันที่:</strong> ' +
            escapeHtml(
                formatDate(
                    data.date
                )
            ) +
            '</div>' +
            '<div><strong>ครบกำหนด:</strong> ' +
            escapeHtml(
                formatDate(
                    data.dueDate
                )
            ) +
            '</div>' +
            '<div><strong>คู่ค้า:</strong> ' +
            escapeHtml(
                data.partyName ||
                data.customerName ||
                data.vendorName ||
                '-'
            ) +
            '</div>' +
            '<div><strong>เลขประจำตัวผู้เสียภาษี:</strong> ' +
            escapeHtml(
                data.taxId ||
                '-'
            ) +
            '</div>' +
            '<div><strong>โทรศัพท์:</strong> ' +
            escapeHtml(
                data.phone ||
                '-'
            ) +
            '</div>' +
            '</div>' +
            '<table class="print-items">' +
            '<thead>' +
            '<tr>' +
            '<th>ลำดับ</th>' +
            '<th>รายการ</th>' +
            '<th>จำนวน</th>' +
            '<th>หน่วย</th>' +
            '<th>ราคา/หน่วย</th>' +
            '<th>จำนวนเงิน</th>' +
            '</tr>' +
            '</thead>' +
            '<tbody>' +
            itemsHtml +
            '</tbody>' +
            '</table>' +
            '<div class="print-totals">' +
            '<div><span>รวมก่อนส่วนลด</span><strong>' +
            escapeHtml(
                formatMoney(
                    data.subtotal
                )
            ) +
            ' บาท</strong></div>' +
            '<div><span>ส่วนลด</span><strong>' +
            escapeHtml(
                formatMoney(
                    data.discount
                )
            ) +
            ' บาท</strong></div>' +
            '<div><span>ภาษี</span><strong>' +
            escapeHtml(
                formatMoney(
                    data.taxAmount
                )
            ) +
            ' บาท</strong></div>' +
            '<div class="grand-total"><span>ยอดรวมสุทธิ</span><strong>' +
            escapeHtml(
                formatMoney(
                    data.total ||
                    data.grandTotal
                )
            ) +
            ' บาท</strong></div>' +
            '</div>' +
            '<div class="print-notes">' +
            '<strong>หมายเหตุ:</strong> ' +
            escapeHtml(
                data.notes ||
                ''
            ) +
            '</div>' +
            '<div class="print-signatures">' +
            '<div>ลงชื่อ ______________________________</div>' +
            '<div>ผู้รับ / ผู้จ่าย / ผู้มีอำนาจ</div>' +
            '<div>วันที่ ______________________________</div>' +
            '</div>' +
            '</div>';

        return element;
    }

    function printDocument(data) {
        const printable =
            createPrintableDocumentElement(
                data
            );

        const printWindow =
            window.open(
                '',
                '_blank',
                'width=900,height=1000'
            );

        if (!printWindow) {
            showToast(
                'เบราว์เซอร์บล็อกหน้าต่างพิมพ์ กรุณาอนุญาต Popup',
                'warning'
            );

            return;
        }

        printWindow.document.open();

        printWindow.document.write(
            '<!DOCTYPE html>' +
            '<html lang="th">' +
            '<head>' +
            '<meta charset="UTF-8">' +
            '<title>' +
            escapeHtml(
                data.docNo ||
                data.documentNo ||
                'document'
            ) +
            '</title>' +
            '<style>' +
            'body{font-family:"TH Sarabun New","TH Sarabun",Arial,sans-serif;font-size:18px;margin:0;padding:20px;color:#111}' +
            '.print-document-inner{max-width:190mm;margin:auto}' +
            '.print-header{text-align:center;margin-bottom:20px}' +
            '.print-header h1{font-size:28px;margin:0 0 5px}' +
            '.print-header h2{font-size:24px;margin:0}' +
            '.print-meta{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-bottom:20px}' +
            '.print-items{width:100%;border-collapse:collapse}' +
            '.print-items th,.print-items td{border:1px solid #222;padding:6px}' +
            '.print-items th{text-align:center}' +
            '.right{text-align:right}' +
            '.print-totals{margin-top:15px;margin-left:auto;width:75%}' +
            '.print-totals>div{display:flex;justify-content:space-between;padding:4px 0}' +
            '.print-totals .grand-total{font-size:22px;border-top:2px solid #111;margin-top:5px;padding-top:8px}' +
            '.print-notes{margin-top:30px;min-height:50px}' +
            '.print-signatures{margin-top:70px;display:flex;justify-content:space-between;text-align:center}' +
            '@media print{body{padding:0}.print-document-inner{max-width:none}}' +
            '</style>' +
            '</head>' +
            '<body>' +
            printable.innerHTML +
            '</body>' +
            '</html>'
        );

        printWindow.document.close();

        printWindow.focus();

        window.setTimeout(
            function () {
                printWindow.print();
            },
            500
        );
    }

    function setupLoginForm() {
        const loginForm =
            byId('loginForm');

        if (!loginForm) {
            console.warn(
                'ไม่พบ #loginForm'
            );

            return;
        }

        if (
            loginForm.dataset.appBound ===
            'true'
        ) {
            return;
        }

        loginForm.dataset.appBound =
            'true';

        loginForm.addEventListener(
            'submit',
            handleLoginSubmit
        );

        const loginButton =
            byId('loginButton') ||
            loginForm.querySelector(
                'button[type="submit"]'
            );

        if (loginButton) {
            loginButton.type =
                'submit';
        }
    }

    function setupNavigation() {
        document.addEventListener(
            'click',
            async function (event) {
                const navigation =
                    event.target.closest(
                        '[data-page]'
                    );

                if (
                    navigation &&
                    navigation.getAttribute(
                        'data-page'
                    )
                ) {
                    event.preventDefault();

                    const page =
                        navigation.getAttribute(
                            'data-page'
                        );

                    await navigate(
                        page
                    );

                    return;
                }

                const actionElement =
                    event.target.closest(
                        '[data-action]'
                    );

                if (
                    !actionElement
                ) {
                    return;
                }

                const action =
                    actionElement.getAttribute(
                        'data-action'
                    );

                if (
                    action ===
                    'logout'
                ) {
                    event.preventDefault();
                    await logout();
                    return;
                }

                if (
                    action ===
                    'toggle-sidebar'
                ) {
                    event.preventDefault();
                    toggleSidebar();
                    return;
                }

                if (
                    action ===
                    'refresh-dashboard'
                ) {
                    event.preventDefault();
                    await renderDashboard();
                    return;
                }

                if (
                    action ===
                    'create'
                ) {
                    event.preventDefault();

                    const entity =
                        actionElement.getAttribute(
                            'data-entity'
                        );

                    await openCreateModal(
                        entity
                    );

                    return;
                }

                if (
                    action ===
                    'edit'
                ) {
                    event.preventDefault();

                    const entity =
                        actionElement.getAttribute(
                            'data-entity'
                        );

                    const id =
                        actionElement.getAttribute(
                            'data-id'
                        );

                    await openEditModal(
                        entity,
                        id
                    );

                    return;
                }

                if (
                    action ===
                    'delete'
                ) {
                    event.preventDefault();

                    const entity =
                        actionElement.getAttribute(
                            'data-entity'
                        );

                    const id =
                        actionElement.getAttribute(
                            'data-id'
                        );

                    await deleteEntity(
                        entity,
                        id
                    );

                    return;
                }

                if (
                    action ===
                    'apply-filter'
                ) {
                    event.preventDefault();

                    const entity =
                        actionElement.getAttribute(
                            'data-entity'
                        );

                    await applyFilter(
                        entity
                    );

                    return;
                }

                if (
                    action ===
                    'clear-filter'
                ) {
                    event.preventDefault();

                    const entity =
                        actionElement.getAttribute(
                            'data-entity'
                        );

                    await clearFilter(
                        entity
                    );

                    return;
                }

                if (
                    action ===
                    'page'
                ) {
                    event.preventDefault();

                    const entity =
                        actionElement.getAttribute(
                            'data-entity'
                        );

                    const pageNumber =
                        parseInt(
                            actionElement.getAttribute(
                                'data-page-number'
                            ),
                            10
                        );

                    await loadEntityRows(
                        entity,
                        pageNumber
                    );

                    return;
                }

                if (
                    action ===
                    'view-document'
                ) {
                    event.preventDefault();

                    const id =
                        actionElement.getAttribute(
                            'data-id'
                        );

                    await viewDocument(
                        id
                    );

                    return;
                }

                if (
                    action ===
                    'pdf-document'
                ) {
                    event.preventDefault();

                    const id =
                        actionElement.getAttribute(
                            'data-id'
                        );

                    await downloadDocumentPdf(
                        id
                    );

                    return;
                }

                if (
                    action ===
                    'cancel-document'
                ) {
                    event.preventDefault();

                    const id =
                        actionElement.getAttribute(
                            'data-id'
                        );

                    await cancelDocument(
                        id
                    );

                    return;
                }

                if (
                    action ===
                    'cancel-income'
                ) {
                    event.preventDefault();

                    const id =
                        actionElement.getAttribute(
                            'data-id'
                        );

                    await cancelTransaction(
                        'income',
                        id
                    );

                    return;
                }

                if (
                    action ===
                    'cancel-expense'
                ) {
                    event.preventDefault();

                    const id =
                        actionElement.getAttribute(
                            'data-id'
                        );

                    await cancelTransaction(
                        'expense',
                        id
                    );

                    return;
                }

                if (
                    action ===
                    'add-document-item'
                ) {
                    event.preventDefault();

                    addDocumentItem();

                    return;
                }

                if (
                    action ===
                    'remove-document-item'
                ) {
                    event.preventDefault();

                    const index =
                        actionElement.getAttribute(
                            'data-index'
                        );

                    removeDocumentItem(
                        index
                    );

                    return;
                }

                if (
                    action ===
                    'run-report'
                ) {
                    event.preventDefault();

                    await runReport();

                    return;
                }

                if (
                    action ===
                    'export-report'
                ) {
                    event.preventDefault();

                    await exportReport();

                    return;
                }

                if (
                    action ===
                    'export-entity'
                ) {
                    event.preventDefault();

                    const entity =
                        actionElement.getAttribute(
                            'data-entity'
                        );

                    await exportCurrentEntity(
                        entity
                    );

                    return;
                }

                if (
                    action ===
                    'refresh-auditlogs' ||
                    action ===
                    'load-auditlogs'
                ) {
                    event.preventDefault();

                    await loadAuditLogs();

                    return;
                }

                if (
                    action ===
                    'create-setting'
                ) {
                    event.preventDefault();

                    openSettingModal(
                        ''
                    );

                    return;
                }

                if (
                    action ===
                    'edit-setting'
                ) {
                    event.preventDefault();

                    const key =
                        actionElement.getAttribute(
                            'data-key'
                        );

                    openSettingModal(
                        key
                    );

                    return;
                }
            }
        );
    }

    function setupGlobalEvents() {
        document.addEventListener(
            'input',
            function (event) {
                const element =
                    event.target;

                if (
                    element &&
                    element.matches(
                        '[data-item-field]'
                    )
                ) {
                    updateDocumentItemInput(
                        element
                    );
                }

                if (
                    element &&
                    (
                        element.id ===
                        'field-discount' ||
                        element.id ===
                        'field-taxRate'
                    )
                ) {
                    updateDocumentTotalsFromEditor();
                }
            }
        );

        document.addEventListener(
            'keydown',
            function (event) {
                if (
                    event.key ===
                    'Escape'
                ) {
                    const modal =
                        byId(
                            'modalContainer'
                        );

                    if (
                        modal &&
                        modal.classList.contains(
                            'open'
                        )
                    ) {
                        closeModal();
                    }
                }

                if (
                    event.ctrlKey &&
                    event.key.toLowerCase() ===
                    'k'
                ) {
                    const search =
                        byId(
                            'globalSearch'
                        );

                    if (search) {
                        event.preventDefault();
                        search.focus();
                    }
                }
            }
        );

        window.addEventListener(
            'resize',
            debounce(
                function () {
                    if (
                        window.innerWidth >
                        900
                    ) {
                        closeSidebarMobile();
                    }
                },
                150
            )
        );
    }

    function setupGlobalSearch() {
        const search =
            byId(
                'globalSearch'
            );

        if (!search) {
            return;
        }

        search.addEventListener(
            'input',
            debounce(
                function () {
                    const keyword =
                        search.value.trim();

                    if (
                        keyword.length <
                        2
                    ) {
                        return;
                    }

                    performGlobalSearch(
                        keyword
                    );
                },
                500
            )
        );
    }

    async function performGlobalSearch(
        keyword
    ) {
        if (!state.token) {
            return;
        }

        try {
            const response =
                await apiRequest(
                    'list',
                    {
                        entity:
                            'search',
                        search:
                            keyword,
                        page:
                            1,
                        pageSize:
                            10
                    }
                );

            const data =
                unwrapResponse(
                    response
                );

            renderSearchResults(
                normalizeArray(
                    data
                )
            );
        } catch (error) {
            console.warn(
                'Global search error:',
                error
            );
        }
    }

    function renderSearchResults(rows) {
        let container =
            byId(
                'globalSearchResults'
            );

        if (!container) {
            container =
                document.createElement(
                    'div'
                );

            container.id =
                'globalSearchResults';

            container.className =
                'global-search-results';

            const search =
                byId(
                    'globalSearch'
                );

            if (
                search &&
                search.parentNode
            ) {
                search.parentNode.appendChild(
                    container
                );
            }
        }

        if (!rows.length) {
            container.innerHTML =
                '<div class="search-empty">ไม่พบข้อมูล</div>';

            return;
        }

        let html = '';

        rows.forEach(
            function (row) {
                html +=
                    '<button type="button" class="search-result-item" data-action="search-result" data-id="' +
                    escapeHtml(
                        row.id ||
                        ''
                    ) +
                    '">' +
                    '<strong>' +
                    escapeHtml(
                        row.name ||
                        row.docNo ||
                        row.description ||
                        ''
                    ) +
                    '</strong>' +
                    '<span>' +
                    escapeHtml(
                        row.type ||
                        row.entity ||
                        ''
                    ) +
                    '</span>' +
                    '</button>';
            }
        );

        container.innerHTML =
            html;
    }

    function setupFormSubmitProtection() {
        const forms =
            $$('form');

        forms.forEach(
            function (form) {
                if (
                    form.id ===
                    'loginForm'
                ) {
                    return;
                }

                form.addEventListener(
                    'submit',
                    function (event) {
                        if (
                            form.hasAttribute(
                                'data-native-submit'
                            )
                        ) {
                            return;
                        }

                        if (
                            form.closest(
                                '#modalContainer'
                            )
                        ) {
                            return;
                        }

                        if (
                            form.getAttribute(
                                'action'
                            ) ===
                            ''
                        ) {
                            event.preventDefault();
                        }
                    }
                );
            }
        );
    }

    function restoreCurrentPage() {
        const stored =
            getStorage(
                'elaas_private_finance_current_page'
            );

        if (
            stored &&
            PAGE_CONFIG[stored]
        ) {
            state.currentPage =
                stored;
        } else {
            state.currentPage =
                'dashboard';
        }
    }

    async function pingServer() {
        try {
            const response =
                await apiRequest(
                    'ping',
                    {}
                );

            return !!response;
        } catch (error) {
            console.warn(
                'Ping failed:',
                error
            );

            return false;
        }
    }

    function setupApiStatus() {
        const status =
            byId(
                'apiStatus'
            );

        if (!status) {
            return;
        }

        if (!isConfiguredApi()) {
            status.textContent =
                'ยังไม่ได้ตั้งค่า API';

            status.classList.add(
                'error'
            );

            return;
        }

        status.textContent =
            'กำลังตรวจสอบระบบ...';

        pingServer()
            .then(
                function (online) {
                    if (online) {
                        status.textContent =
                            'เชื่อมต่อระบบแล้ว';

                        status.classList.remove(
                            'error'
                        );

                        status.classList.add(
                            'online'
                        );
                    } else {
                        status.textContent =
                            'เชื่อมต่อไม่ได้';

                        status.classList.add(
                            'error'
                        );
                    }
                }
            );
    }

    async function init() {
        if (
            state.initialized
        ) {
            return;
        }

        state.initialized =
            true;

        restoreCurrentPage();

        setupLoginForm();
        setupNavigation();
        setupGlobalEvents();
        setupGlobalSearch();
        setupFormSubmitProtection();

        if (
            !isConfiguredApi()
        ) {
            showLogin();
            setupApiStatus();

            console.warn(
                'กรุณาตั้งค่า CONFIG.API_URL ใน app.js'
            );

            return;
        }

        setupApiStatus();

        const restored =
            await restoreSession();

        if (!restored) {
            showLogin();
        }
    }

    window.App = {
        config:
            CONFIG,

        state:
            state,

        login:
            login,

        logout:
            logout,

        navigate:
            navigate,

        apiRequest:
            apiRequest,

        loadBootstrap:
            loadBootstrap,

        openModal:
            openModal,

        closeModal:
            closeModal,

        showToast:
            showToast,

        exportXlsx:
            exportXlsx,

        downloadDocumentPdf:
            downloadDocumentPdf,

        renderDashboard:
            renderDashboard,

        runReport:
            runReport,

        clearSession:
            clearSession
    };

    if (
        document.readyState ===
        'loading'
    ) {
        document.addEventListener(
            'DOMContentLoaded',
            init,
            {
                once: true
            }
        );
    } else {
        init();
    }
})();
