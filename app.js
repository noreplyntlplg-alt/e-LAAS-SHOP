/* =========================================================
   SHOP-LAAS
   app.js
   Frontend Application
   ========================================================= */

"use strict";

/* =========================================================
   CONFIGURATION
   ========================================================= */

const APP_CONFIG = {
    APP_NAME: "SHOP-LAAS",
    APP_VERSION: "1.0.0",

    /*
     * ใส่ URL ของ Google Apps Script Web App
     * ตัวอย่าง:
     * https://script.google.com/macros/s/xxxxxxxxxxxxxxxx/exec
     */
    API_URL: "https://script.google.com/macros/s/AKfycbw8gnDcBxWV8W-RFRvi1e-yZmpa03O3P8M2iX-QAAB93TLZDQHO_8qAPInSghM9mtZm/exec",

    STORAGE_KEYS: {
        SESSION: "SHOP_LAAS_SESSION",
        USER: "SHOP_LAAS_USER",
        SETTINGS: "SHOP_LAAS_SETTINGS",
        LAST_PAGE: "SHOP_LAAS_LAST_PAGE"
    },

    DATE_FORMAT: "dd/MM/yyyy",
    CURRENCY: "THB"
};


/* =========================================================
   GLOBAL STATE
   ========================================================= */

const AppState = {
    initialized: false,
    currentPage: "dashboard",

    session: null,
    user: null,

    settings: {},
    dashboard: null,

    products: [],
    customers: [],
    suppliers: [],
    sales: [],
    purchases: [],
    receipts: [],
    payments: [],
    expenses: [],
    accounts: [],
    journal: [],
    stockMovements: [],

    selectedProduct: null,
    selectedCustomer: null,
    selectedSupplier: null,
    selectedSale: null,
    selectedPurchase: null,

    editingId: null,

    loading: false
};


/* =========================================================
   INITIALIZATION
   ========================================================= */

document.addEventListener("DOMContentLoaded", function () {
    initializeApplication();
});


async function initializeApplication() {

    if (AppState.initialized) {
        return;
    }

    AppState.initialized = true;

    try {

        setupGlobalEvents();

        loadLocalState();

        if (!AppState.session) {
            showLoginPage();
            return;
        }

        const verified = await verifyCurrentSession();

        if (!verified) {
            clearSession();
            showLoginPage();
            return;
        }

        await loadInitialData();

        showApplication();

        const lastPage =
            localStorage.getItem(APP_CONFIG.STORAGE_KEYS.LAST_PAGE);

        if (lastPage) {
            navigateTo(lastPage);
        } else {
            navigateTo("dashboard");
        }

    } catch (error) {

        console.error("Initialization error:", error);

        showToast(
            "เกิดข้อผิดพลาดในการเปิดระบบ",
            "error"
        );

        showLoginPage();
    }
}


/* =========================================================
   GLOBAL EVENTS
   ========================================================= */

function setupGlobalEvents() {

    document.addEventListener("click", function (event) {

        const navElement =
            event.target.closest("[data-page]");

        if (navElement) {

            event.preventDefault();

            const page =
                navElement.getAttribute("data-page");

            navigateTo(page);

            return;
        }


        const logoutElement =
            event.target.closest("[data-action='logout']");

        if (logoutElement) {

            event.preventDefault();

            logout();

            return;
        }


        const modalClose =
            event.target.closest("[data-modal-close]");

        if (modalClose) {

            closeModal();

            return;
        }

    });


    document.addEventListener("submit", function (event) {

        const form =
            event.target;

        if (!form) {
            return;
        }

        const action =
            form.getAttribute("data-form-action");

        if (!action) {
            return;
        }

        event.preventDefault();

        handleFormSubmit(action, form);
    });


    document.addEventListener("input", function (event) {

        if (
            event.target.matches("[data-search-table]")
        ) {

            filterTable(
                event.target.value,
                event.target.getAttribute("data-search-table")
            );
        }

    });


    window.addEventListener("keydown", function (event) {

        if (event.key === "Escape") {

            closeModal();
        }

    });

}


/* =========================================================
   LOCAL STORAGE
   ========================================================= */

function loadLocalState() {

    try {

        const session =
            localStorage.getItem(
                APP_CONFIG.STORAGE_KEYS.SESSION
            );

        const user =
            localStorage.getItem(
                APP_CONFIG.STORAGE_KEYS.USER
            );

        const settings =
            localStorage.getItem(
                APP_CONFIG.STORAGE_KEYS.SETTINGS
            );


        if (session) {

            AppState.session =
                JSON.parse(session);
        }


        if (user) {

            AppState.user =
                JSON.parse(user);
        }


        if (settings) {

            AppState.settings =
                JSON.parse(settings);
        }

    } catch (error) {

        console.error(
            "Cannot load local state:",
            error
        );

        clearSession();
    }
}


function saveSession(session, user) {

    AppState.session = session;
    AppState.user = user;

    localStorage.setItem(
        APP_CONFIG.STORAGE_KEYS.SESSION,
        JSON.stringify(session)
    );

    localStorage.setItem(
        APP_CONFIG.STORAGE_KEYS.USER,
        JSON.stringify(user)
    );
}


function clearSession() {

    AppState.session = null;
    AppState.user = null;

    localStorage.removeItem(
        APP_CONFIG.STORAGE_KEYS.SESSION
    );

    localStorage.removeItem(
        APP_CONFIG.STORAGE_KEYS.USER
    );
}


/* =========================================================
   API
   ========================================================= */

async function apiRequest(action, params = {}) {

    if (!APP_CONFIG.API_URL) {

        throw new Error(
            "ยังไม่ได้กำหนด API_URL ใน app.js"
        );
    }


    const requestData = {
        action: action,
        params: params
    };


    const response = await fetch(
        APP_CONFIG.API_URL,
        {
            method: "POST",

            headers: {
                "Content-Type": "text/plain;charset=utf-8"
            },

            body: JSON.stringify(requestData)
        }
    );


    if (!response.ok) {

        throw new Error(
            "HTTP Error " + response.status
        );
    }


    const text =
        await response.text();


    let data;

    try {

        data =
            JSON.parse(text);

    } catch (error) {

        console.error(
            "Invalid JSON response:",
            text
        );

        throw new Error(
            "เซิร์ฟเวอร์ส่งข้อมูลกลับมาไม่ถูกต้อง"
        );
    }


    if (!data.success) {

        throw new Error(
            data.message ||
            "เกิดข้อผิดพลาดจากเซิร์ฟเวอร์"
        );
    }


    return data;
}


/* =========================================================
   LOGIN
   ========================================================= */

async function login(username, password) {

    if (!username || !password) {

        showToast(
            "กรุณากรอกชื่อผู้ใช้และรหัสผ่าน",
            "warning"
        );

        return false;
    }


    setLoading(true);


    try {

        const result =
            await apiRequest(
                "login",
                {
                    username: username,
                    password: password
                }
            );


        if (
            !result.data ||
            !result.data.session
        ) {

            throw new Error(
                "ข้อมูลการเข้าสู่ระบบไม่ครบถ้วน"
            );
        }


        saveSession(
            result.data.session,
            result.data.user
        );


        showToast(
            "เข้าสู่ระบบสำเร็จ",
            "success"
        );


        await loadInitialData();

        showApplication();

        navigateTo("dashboard");

        return true;

    } catch (error) {

        console.error(
            "Login error:",
            error
        );

        showToast(
            error.message ||
            "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง",
            "error"
        );

        return false;

    } finally {

        setLoading(false);
    }
}


/* =========================================================
   LOGIN FORM
   ========================================================= */

function handleLoginForm(event) {

    if (event) {
        event.preventDefault();
    }


    const usernameInput =
        document.querySelector(
            "#username"
        );


    const passwordInput =
        document.querySelector(
            "#password"
        );


    if (!usernameInput || !passwordInput) {

        showToast(
            "ไม่พบช่องกรอกข้อมูลเข้าสู่ระบบ",
            "error"
        );

        return;
    }


    login(
        usernameInput.value.trim(),
        passwordInput.value
    );
}


/* =========================================================
   SESSION
   ========================================================= */

async function verifyCurrentSession() {

    if (!AppState.session) {
        return false;
    }


    try {

        const result =
            await apiRequest(
                "verifySession",
                {
                    token:
                        AppState.session.token
                }
            );


        if (!result.data) {
            return false;
        }


        if (result.data.user) {

            AppState.user =
                result.data.user;

            localStorage.setItem(
                APP_CONFIG.STORAGE_KEYS.USER,
                JSON.stringify(
                    AppState.user
                )
            );
        }


        return true;

    } catch (error) {

        console.error(
            "Session verification error:",
            error
        );

        return false;
    }
}


async function logout() {

    try {

        if (AppState.session) {

            await apiRequest(
                "logout",
                {
                    token:
                        AppState.session.token
                }
            );
        }

    } catch (error) {

        console.warn(
            "Logout API error:",
            error
        );

    } finally {

        clearSession();

        showLoginPage();

        showToast(
            "ออกจากระบบแล้ว",
            "success"
        );
    }
}


/* =========================================================
   INITIAL DATA
   ========================================================= */

async function loadInitialData() {

    setLoading(true);

    try {

        const [
            settingsResult,
            productsResult,
            customersResult,
            suppliersResult,
            accountsResult
        ] = await Promise.all([

            apiRequest(
                "listRows",
                {
                    sheet: "Settings",
                    token:
                        AppState.session.token
                }
            ),

            apiRequest(
                "listRows",
                {
                    sheet: "Products",
                    token:
                        AppState.session.token
                }
            ),

            apiRequest(
                "listRows",
                {
                    sheet: "Customers",
                    token:
                        AppState.session.token
                }
            ),

            apiRequest(
                "listRows",
                {
                    sheet: "Suppliers",
                    token:
                        AppState.session.token
                }
            ),

            apiRequest(
                "listRows",
                {
                    sheet: "Accounts",
                    token:
                        AppState.session.token
                }
            )

        ]);


        AppState.settings =
            convertSettings(
                settingsResult.data.rows || []
            );


        AppState.products =
            productsResult.data.rows || [];


        AppState.customers =
            customersResult.data.rows || [];


        AppState.suppliers =
            suppliersResult.data.rows || [];


        AppState.accounts =
            accountsResult.data.rows || [];


        localStorage.setItem(
            APP_CONFIG.STORAGE_KEYS.SETTINGS,
            JSON.stringify(
                AppState.settings
            )
        );


    } catch (error) {

        console.error(
            "Initial data error:",
            error
        );

        throw error;

    } finally {

        setLoading(false);
    }
}


/* =========================================================
   SETTINGS
   ========================================================= */

function convertSettings(rows) {

    const settings = {};

    rows.forEach(function (row) {

        const key =
            row["Key"] ||
            row["คีย์"] ||
            row["key"];

        const value =
            row["Value"] ||
            row["ค่า"] ||
            row["value"] ||
            "";

        if (key) {

            settings[key] = value;
        }

    });

    return settings;
}


/* =========================================================
   APPLICATION UI
   ========================================================= */

function showLoginPage() {

    const loginPage =
        document.querySelector(
            "#loginPage"
        );

    const app =
        document.querySelector(
            "#app"
        );


    if (loginPage) {

        loginPage.style.display =
            "flex";
    }


    if (app) {

        app.style.display =
            "none";
    }
}


function showApplication() {

    const loginPage =
        document.querySelector(
            "#loginPage"
        );

    const app =
        document.querySelector(
            "#app"
        );


    if (loginPage) {

        loginPage.style.display =
            "none";
    }


    if (app) {

        app.style.display =
            "block";
    }


    updateUserDisplay();
}


function updateUserDisplay() {

    if (!AppState.user) {
        return;
    }


    const username =
        AppState.user.username ||
        "";


    const name =
        AppState.user.name ||
        AppState.user["ชื่อ"] ||
        username;


    document
        .querySelectorAll(
            "[data-user-name]"
        )
        .forEach(function (element) {

            element.textContent =
                name;
        });


    document
        .querySelectorAll(
            "[data-user-username]"
        )
        .forEach(function (element) {

            element.textContent =
                username;
        });


    document
        .querySelectorAll(
            "[data-system-name]"
        )
        .forEach(function (element) {

            element.textContent =
                APP_CONFIG.APP_NAME;
        });
}


/* =========================================================
   NAVIGATION
   ========================================================= */

async function navigateTo(page) {

    if (!page) {
        return;
    }


    AppState.currentPage =
        page;


    localStorage.setItem(
        APP_CONFIG.STORAGE_KEYS.LAST_PAGE,
        page
    );


    updateNavigationActiveState(page);


    switch (page) {

        case "dashboard":
            await renderDashboardPage();
            break;

        case "products":
            await renderProductsPage();
            break;

        case "customers":
            await renderCustomersPage();
            break;

        case "suppliers":
            await renderSuppliersPage();
            break;

        case "sales":
            await renderSalesPage();
            break;

        case "purchases":
            await renderPurchasesPage();
            break;

        case "receipts":
            await renderReceiptsPage();
            break;

        case "payments":
            await renderPaymentsPage();
            break;

        case "expenses":
            await renderExpensesPage();
            break;

        case "stock":
            await renderStockPage();
            break;

        case "journal":
            await renderJournalPage();
            break;

        case "accounts":
            await renderAccountsPage();
            break;

        case "reports":
            await renderReportsPage();
            break;

        case "settings":
            await renderSettingsPage();
            break;

        case "users":
            await renderUsersPage();
            break;

        default:
            await renderDashboardPage();
            break;
    }
}


function updateNavigationActiveState(page) {

    document
        .querySelectorAll(
            "[data-page]"
        )
        .forEach(function (element) {

            const target =
                element.getAttribute(
                    "data-page"
                );


            if (target === page) {

                element.classList.add(
                    "active"
                );

            } else {

                element.classList.remove(
                    "active"
                );
            }

        });
}


/* =========================================================
   PAGE CONTAINER
   ========================================================= */

function getPageContainer() {

    let container =
        document.querySelector(
            "#pageContent"
        );


    if (!container) {

        container =
            document.querySelector(
                "#content"
            );
    }


    if (!container) {

        container =
            document.querySelector(
                "main"
            );
    }


    return container;
}


function setPageContent(html) {

    const container =
        getPageContainer();


    if (!container) {

        console.error(
            "ไม่พบ page container"
        );

        return;
    }


    container.innerHTML =
        html;
}


/* =========================================================
   DASHBOARD
   ========================================================= */

async function renderDashboardPage() {

    setPageContent(
        createLoadingHTML(
            "กำลังโหลดข้อมูลแดชบอร์ด..."
        )
    );


    try {

        const result =
            await apiRequest(
                "dashboard",
                {
                    token:
                        AppState.session.token
                }
            );


        AppState.dashboard =
            result.data || {};


        setPageContent(
            createDashboardHTML(
                AppState.dashboard
            )
        );


        initializeDashboardCharts();

    } catch (error) {

        console.error(
            "Dashboard error:",
            error
        );

        setPageContent(
            createErrorHTML(
                error.message
            )
        );
    }
}


function createDashboardHTML(data) {

    const totalSales =
        Number(
            data.totalSales ||
            data.salesTotal ||
            0
        );


    const totalPurchases =
        Number(
            data.totalPurchases ||
            data.purchaseTotal ||
            0
        );


    const totalExpenses =
        Number(
            data.totalExpenses ||
            data.expenseTotal ||
            0
        );


    const productCount =
        Number(
            data.productCount ||
            0
        );


    return `
        <div class="page-header">
            <div>
                <h1>แดชบอร์ด</h1>
                <p>ภาพรวมระบบบริหารร้านค้า</p>
            </div>
        </div>

        <div class="dashboard-cards">

            <div class="dashboard-card">
                <div class="dashboard-card-icon">฿</div>
                <div class="dashboard-card-content">
                    <div class="dashboard-card-title">
                        ยอดขาย
                    </div>
                    <div class="dashboard-card-value">
                        ${formatMoney(totalSales)}
                    </div>
                </div>
            </div>

            <div class="dashboard-card">
                <div class="dashboard-card-icon">🛒</div>
                <div class="dashboard-card-content">
                    <div class="dashboard-card-title">
                        ยอดซื้อ
                    </div>
                    <div class="dashboard-card-value">
                        ${formatMoney(totalPurchases)}
                    </div>
                </div>
            </div>

            <div class="dashboard-card">
                <div class="dashboard-card-icon">−</div>
                <div class="dashboard-card-content">
                    <div class="dashboard-card-title">
                        ค่าใช้จ่าย
                    </div>
                    <div class="dashboard-card-value">
                        ${formatMoney(totalExpenses)}
                    </div>
                </div>
            </div>

            <div class="dashboard-card">
                <div class="dashboard-card-icon">📦</div>
                <div class="dashboard-card-content">
                    <div class="dashboard-card-title">
                        จำนวนสินค้า
                    </div>
                    <div class="dashboard-card-value">
                        ${formatNumber(productCount)}
                    </div>
                </div>
            </div>

        </div>

        <div class="dashboard-grid">

            <div class="panel">
                <div class="panel-header">
                    <h2>สรุปข้อมูล</h2>
                </div>

                <div class="panel-body">

                    <div class="summary-row">
                        <span>ยอดขาย</span>
                        <strong>
                            ${formatMoney(totalSales)}
                        </strong>
                    </div>

                    <div class="summary-row">
                        <span>ยอดซื้อ</span>
                        <strong>
                            ${formatMoney(totalPurchases)}
                        </strong>
                    </div>

                    <div class="summary-row">
                        <span>ค่าใช้จ่าย</span>
                        <strong>
                            ${formatMoney(totalExpenses)}
                        </strong>
                    </div>

                    <div class="summary-row total">
                        <span>คงเหลือโดยประมาณ</span>
                        <strong>
                            ${formatMoney(
                                totalSales -
                                totalPurchases -
                                totalExpenses
                            )}
                        </strong>
                    </div>

                </div>
            </div>

            <div class="panel">
                <div class="panel-header">
                    <h2>สถานะระบบ</h2>
                </div>

                <div class="panel-body">

                    <div class="status-item">
                        <span>ผู้ใช้งาน</span>
                        <strong>
                            ${escapeHTML(
                                AppState.user &&
                                AppState.user.username
                                    ? AppState.user.username
                                    : "-"
                            )}
                        </strong>
                    </div>

                    <div class="status-item">
                        <span>ระบบ</span>
                        <strong>
                            ${APP_CONFIG.APP_NAME}
                        </strong>
                    </div>

                    <div class="status-item">
                        <span>เวอร์ชัน</span>
                        <strong>
                            ${APP_CONFIG.APP_VERSION}
                        </strong>
                    </div>

                </div>
            </div>

        </div>
    `;
}


function initializeDashboardCharts() {

    const chartCanvas =
        document.querySelector(
            "#salesChart"
        );


    if (!chartCanvas) {
        return;
    }


    if (
        typeof Chart ===
        "undefined"
    ) {
        return;
    }


    new Chart(
        chartCanvas,
        {
            type: "bar",

            data: {
                labels: [
                    "ยอดขาย",
                    "ยอดซื้อ",
                    "ค่าใช้จ่าย"
                ],

                datasets: [
                    {
                        label: "จำนวนเงิน",

                        data: [
                            Number(
                                AppState.dashboard.totalSales ||
                                0
                            ),

                            Number(
                                AppState.dashboard.totalPurchases ||
                                0
                            ),

                            Number(
                                AppState.dashboard.totalExpenses ||
                                0
                            )
                        ]
                    }
                ]
            },

            options: {
                responsive: true,

                maintainAspectRatio: false,

                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        }
    );
}


/* =========================================================
   PRODUCTS
   ========================================================= */

async function renderProductsPage() {

    setPageContent(
        createLoadingHTML(
            "กำลังโหลดสินค้า..."
        )
    );


    try {

        const result =
            await apiRequest(
                "listRows",
                {
                    sheet: "Products",
                    token:
                        AppState.session.token
                }
            );


        AppState.products =
            result.data.rows || [];


        setPageContent(
            createProductsHTML(
                AppState.products
            )
        );

    } catch (error) {

        console.error(
            error
        );

        setPageContent(
            createErrorHTML(
                error.message
            )
        );
    }
}


function createProductsHTML(products) {

    return `
        <div class="page-header">

            <div>
                <h1>สินค้า</h1>
                <p>จัดการข้อมูลสินค้าและสต็อก</p>
            </div>

            <div class="page-actions">
                <button
                    class="btn btn-primary"
                    onclick="openProductModal()">
                    + เพิ่มสินค้า
                </button>
            </div>

        </div>

        <div class="panel">

            <div class="panel-toolbar">

                <input
                    type="search"
                    class="form-control"
                    placeholder="ค้นหาสินค้า..."
                    data-search-table="productsTable"
                >

            </div>

            <div class="table-responsive">

                <table
                    class="data-table"
                    id="productsTable">

                    <thead>
                        <tr>
                            <th>รหัสสินค้า</th>
                            <th>ชื่อสินค้า</th>
                            <th>หมวดหมู่</th>
                            <th>หน่วย</th>
                            <th>ราคาขาย</th>
                            <th>จำนวนคงเหลือ</th>
                            <th>สถานะ</th>
                            <th>จัดการ</th>
                        </tr>
                    </thead>

                    <tbody>

                        ${products.map(function (product) {

                            const id =
                                product["รหัสสินค้า"] ||
                                product["ProductID"] ||
                                product["id"] ||
                                "";

                            const name =
                                product["ชื่อสินค้า"] ||
                                product["ProductName"] ||
                                "";

                            const category =
                                product["หมวดหมู่"] ||
                                "";

                            const unit =
                                product["หน่วย"] ||
                                "";

                            const price =
                                Number(
                                    product["ราคาขาย"] ||
                                    product["ราคาขายต่อหน่วย"] ||
                                    0
                                );

                            const quantity =
                                Number(
                                    product["จำนวนคงเหลือ"] ||
                                    product["จำนวน"] ||
                                    0
                                );

                            return `
                                <tr
                                    data-table-row="productsTable"
                                    data-search="${escapeHTML(
                                        id + " " +
                                        name + " " +
                                        category
                                    )}">

                                    <td>
                                        ${escapeHTML(id)}
                                    </td>

                                    <td>
                                        ${escapeHTML(name)}
                                    </td>

                                    <td>
                                        ${escapeHTML(category)}
                                    </td>

                                    <td>
                                        ${escapeHTML(unit)}
                                    </td>

                                    <td class="text-right">
                                        ${formatMoney(price)}
                                    </td>

                                    <td class="text-right">
                                        ${formatNumber(quantity)}
                                    </td>

                                    <td>
                                        ${getStockStatus(quantity)}
                                    </td>

                                    <td>
                                        <button
                                            class="btn btn-sm"
                                            onclick='editProduct(${JSON.stringify(product)})'>
                                            แก้ไข
                                        </button>

                                        <button
                                            class="btn btn-sm btn-danger"
                                            onclick="deleteProduct('${escapeJS(id)}')">
                                            ลบ
                                        </button>
                                    </td>

                                </tr>
                            `;

                        }).join("")}

                    </tbody>

                </table>

            </div>

        </div>
    `;
}


/* =========================================================
   PRODUCT MODAL
   ========================================================= */

function openProductModal(product = null) {

    AppState.editingId =
        product
            ? (
                product["รหัสสินค้า"] ||
                product["ProductID"] ||
                product["id"]
            )
            : null;


    const isEdit =
        Boolean(product);


    const data =
        product || {};


    openModal(
        isEdit
            ? "แก้ไขสินค้า"
            : "เพิ่มสินค้า",

        `
        <form
            data-form-action="saveProduct"
            id="productForm">

            <div class="form-grid">

                <div class="form-group">
                    <label>รหัสสินค้า</label>
                    <input
                        type="text"
                        name="รหัสสินค้า"
                        class="form-control"
                        value="${escapeHTML(
                            data["รหัสสินค้า"] ||
                            data["ProductID"] ||
                            ""
                        )}"
                        ${isEdit ? "readonly" : ""}
                        required>
                </div>

                <div class="form-group">
                    <label>ชื่อสินค้า</label>
                    <input
                        type="text"
                        name="ชื่อสินค้า"
                        class="form-control"
                        value="${escapeHTML(
                            data["ชื่อสินค้า"] ||
                            data["ProductName"] ||
                            ""
                        )}"
                        required>
                </div>

                <div class="form-group">
                    <label>หมวดหมู่</label>
                    <input
                        type="text"
                        name="หมวดหมู่"
                        class="form-control"
                        value="${escapeHTML(
                            data["หมวดหมู่"] ||
                            ""
                        )}">
                </div>

                <div class="form-group">
                    <label>หน่วย</label>
                    <input
                        type="text"
                        name="หน่วย"
                        class="form-control"
                        value="${escapeHTML(
                            data["หน่วย"] ||
                            ""
                        )}">
                </div>

                <div class="form-group">
                    <label>ราคาซื้อ</label>
                    <input
                        type="number"
                        step="0.01"
                        name="ราคาซื้อ"
                        class="form-control"
                        value="${Number(
                            data["ราคาซื้อ"] ||
                            0
                        )}">
                </div>

                <div class="form-group">
                    <label>ราคาขาย</label>
                    <input
                        type="number"
                        step="0.01"
                        name="ราคาขาย"
                        class="form-control"
                        value="${Number(
                            data["ราคาขาย"] ||
                            0
                        )}">
                </div>

                <div class="form-group">
                    <label>จำนวนคงเหลือ</label>
                    <input
                        type="number"
                        step="0.01"
                        name="จำนวนคงเหลือ"
                        class="form-control"
                        value="${Number(
                            data["จำนวนคงเหลือ"] ||
                            0
                        )}">
                </div>

                <div class="form-group">
                    <label>ภาษี %</label>
                    <input
                        type="number"
                        step="0.01"
                        name="ภาษี%"
                        class="form-control"
                        value="${Number(
                            data["ภาษี%"] ||
                            0
                        )}">
                </div>

            </div>

            <div class="modal-footer">

                <button
                    type="button"
                    class="btn"
                    data-modal-close>
                    ยกเลิก
                </button>

                <button
                    type="submit"
                    class="btn btn-primary">
                    บันทึก
                </button>

            </div>

        </form>
        `
    );
}


function editProduct(product) {

    openProductModal(product);
}


async function saveProduct(form) {

    const data =
        formToObject(form);


    try {

        setLoading(true);


        if (AppState.editingId) {

            await apiRequest(
                "updateRow",
                {
                    sheet: "Products",
                    idField: "รหัสสินค้า",
                    id: AppState.editingId,
                    data: data,
                    token:
                        AppState.session.token
                }
            );


            showToast(
                "แก้ไขสินค้าเรียบร้อยแล้ว",
                "success"
            );

        } else {

            await apiRequest(
                "insertRow",
                {
                    sheet: "Products",
                    data: data,
                    token:
                        AppState.session.token
                }
            );


            showToast(
                "เพิ่มสินค้าเรียบร้อยแล้ว",
                "success"
            );
        }


        closeModal();

        AppState.editingId = null;

        await renderProductsPage();

    } catch (error) {

        console.error(
            error
        );

        showToast(
            error.message,
            "error"
        );

    } finally {

        setLoading(false);
    }
}


async function deleteProduct(id) {

    if (!confirm(
        "ยืนยันการลบสินค้ารหัส " +
        id +
        " หรือไม่?"
    )) {

        return;
    }


    try {

        setLoading(true);


        await apiRequest(
            "deleteRow",
            {
                sheet: "Products",
                idField: "รหัสสินค้า",
                id: id,
                token:
                    AppState.session.token
            }
        );


        showToast(
            "ลบสินค้าเรียบร้อยแล้ว",
            "success"
        );


        await renderProductsPage();

    } catch (error) {

        showToast(
            error.message,
            "error"
        );

    } finally {

        setLoading(false);
    }
}


/* =========================================================
   CUSTOMERS
   ========================================================= */

async function renderCustomersPage() {

    setPageContent(
        createLoadingHTML(
            "กำลังโหลดข้อมูลลูกค้า..."
        )
    );


    try {

        const result =
            await apiRequest(
                "listRows",
                {
                    sheet: "Customers",
                    token:
                        AppState.session.token
                }
            );


        AppState.customers =
            result.data.rows || [];


        setPageContent(
            createCustomersHTML(
                AppState.customers
            )
        );

    } catch (error) {

        setPageContent(
            createErrorHTML(
                error.message
            )
        );
    }
}


function createCustomersHTML(customers) {

    return `
        <div class="page-header">

            <div>
                <h1>ลูกค้า</h1>
                <p>จัดการข้อมูลลูกค้า</p>
            </div>

            <div class="page-actions">
                <button
                    class="btn btn-primary"
                    onclick="openCustomerModal()">
                    + เพิ่มลูกค้า
                </button>
            </div>

        </div>

        <div class="panel">

            <div class="panel-toolbar">

                <input
                    type="search"
                    class="form-control"
                    placeholder="ค้นหาลูกค้า..."
                    data-search-table="customersTable">

            </div>

            <div class="table-responsive">

                <table
                    class="data-table"
                    id="customersTable">

                    <thead>

                        <tr>
                            <th>รหัสลูกค้า</th>
                            <th>ชื่อลูกค้า</th>
                            <th>เลขประจำตัวผู้เสียภาษี</th>
                            <th>โทรศัพท์</th>
                            <th>อีเมล</th>
                            <th>จัดการ</th>
                        </tr>

                    </thead>

                    <tbody>

                        ${customers.map(function (customer) {

                            const id =
                                customer["รหัสลูกค้า"] ||
                                customer["CustomerID"] ||
                                "";

                            const name =
                                customer["ชื่อลูกค้า"] ||
                                customer["CustomerName"] ||
                                "";

                            const tax =
                                customer["เลขประจำตัวผู้เสียภาษี"] ||
                                "";

                            const phone =
                                customer["โทรศัพท์"] ||
                                "";

                            const email =
                                customer["อีเมล"] ||
                                "";

                            return `
                                <tr>

                                    <td>
                                        ${escapeHTML(id)}
                                    </td>

                                    <td>
                                        ${escapeHTML(name)}
                                    </td>

                                    <td>
                                        ${escapeHTML(tax)}
                                    </td>

                                    <td>
                                        ${escapeHTML(phone)}
                                    </td>

                                    <td>
                                        ${escapeHTML(email)}
                                    </td>

                                    <td>

                                        <button
                                            class="btn btn-sm"
                                            onclick='editCustomer(${JSON.stringify(customer)})'>
                                            แก้ไข
                                        </button>

                                        <button
                                            class="btn btn-sm btn-danger"
                                            onclick="deleteCustomer('${escapeJS(id)}')">
                                            ลบ
                                        </button>

                                    </td>

                                </tr>
                            `;

                        }).join("")}

                    </tbody>

                </table>

            </div>

        </div>
    `;
}


function openCustomerModal(customer = null) {

    AppState.editingId =
        customer
            ? (
                customer["รหัสลูกค้า"] ||
                customer["CustomerID"]
            )
            : null;


    const data =
        customer || {};


    openModal(
        customer
            ? "แก้ไขลูกค้า"
            : "เพิ่มลูกค้า",

        `
        <form
            data-form-action="saveCustomer">

            <div class="form-grid">

                <div class="form-group">
                    <label>รหัสลูกค้า</label>
                    <input
                        type="text"
                        name="รหัสลูกค้า"
                        class="form-control"
                        value="${escapeHTML(
                            data["รหัสลูกค้า"] ||
                            ""
                        )}"
                        ${customer ? "readonly" : ""}
                        required>
                </div>

                <div class="form-group">
                    <label>ชื่อลูกค้า</label>
                    <input
                        type="text"
                        name="ชื่อลูกค้า"
                        class="form-control"
                        value="${escapeHTML(
                            data["ชื่อลูกค้า"] ||
                            ""
                        )}"
                        required>
                </div>

                <div class="form-group">
                    <label>เลขประจำตัวผู้เสียภาษี</label>
                    <input
                        type="text"
                        name="เลขประจำตัวผู้เสียภาษี"
                        class="form-control"
                        value="${escapeHTML(
                            data["เลขประจำตัวผู้เสียภาษี"] ||
                            ""
                        )}">
                </div>

                <div class="form-group">
                    <label>โทรศัพท์</label>
                    <input
                        type="text"
                        name="โทรศัพท์"
                        class="form-control"
                        value="${escapeHTML(
                            data["โทรศัพท์"] ||
                            ""
                        )}">
                </div>

                <div class="form-group">
                    <label>อีเมล</label>
                    <input
                        type="email"
                        name="อีเมล"
                        class="form-control"
                        value="${escapeHTML(
                            data["อีเมล"] ||
                            ""
                        )}">
                </div>

                <div class="form-group">
                    <label>ที่อยู่</label>
                    <textarea
                        name="ที่อยู่"
                        class="form-control"
                        rows="3">${escapeHTML(
                            data["ที่อยู่"] ||
                            ""
                        )}</textarea>
                </div>

            </div>

            <div class="modal-footer">

                <button
                    type="button"
                    class="btn"
                    data-modal-close>
                    ยกเลิก
                </button>

                <button
                    type="submit"
                    class="btn btn-primary">
                    บันทึก
                </button>

            </div>

        </form>
        `
    );
}


function editCustomer(customer) {

    openCustomerModal(customer);
}


async function saveCustomer(form) {

    const data =
        formToObject(form);


    try {

        setLoading(true);


        if (AppState.editingId) {

            await apiRequest(
                "updateRow",
                {
                    sheet: "Customers",
                    idField: "รหัสลูกค้า",
                    id: AppState.editingId,
                    data: data,
                    token:
                        AppState.session.token
                }
            );

        } else {

            await apiRequest(
                "insertRow",
                {
                    sheet: "Customers",
                    data: data,
                    token:
                        AppState.session.token
                }
            );
        }


        showToast(
            "บันทึกข้อมูลลูกค้าเรียบร้อยแล้ว",
            "success"
        );


        closeModal();

        AppState.editingId = null;

        await renderCustomersPage();

    } catch (error) {

        showToast(
            error.message,
            "error"
        );

    } finally {

        setLoading(false);
    }
}


async function deleteCustomer(id) {

    if (!confirm(
        "ยืนยันการลบข้อมูลลูกค้านี้หรือไม่?"
    )) {

        return;
    }


    try {

        await apiRequest(
            "deleteRow",
            {
                sheet: "Customers",
                idField: "รหัสลูกค้า",
                id: id,
                token:
                    AppState.session.token
            }
        );


        showToast(
            "ลบข้อมูลลูกค้าเรียบร้อยแล้ว",
            "success"
        );


        await renderCustomersPage();

    } catch (error) {

        showToast(
            error.message,
            "error"
        );
    }
}


/* =========================================================
   SUPPLIERS
   ========================================================= */

async function renderSuppliersPage() {

    setPageContent(
        createLoadingHTML(
            "กำลังโหลดข้อมูลผู้จำหน่าย..."
        )
    );


    try {

        const result =
            await apiRequest(
                "listRows",
                {
                    sheet: "Suppliers",
                    token:
                        AppState.session.token
                }
            );


        AppState.suppliers =
            result.data.rows || [];


        setPageContent(
            createSuppliersHTML(
                AppState.suppliers
            )
        );

    } catch (error) {

        setPageContent(
            createErrorHTML(
                error.message
            )
        );
    }
}


function createSuppliersHTML(suppliers) {

    return `
        <div class="page-header">

            <div>
                <h1>ผู้จำหน่าย</h1>
                <p>จัดการข้อมูลผู้จำหน่ายสินค้า</p>
            </div>

            <div>
                <button
                    class="btn btn-primary"
                    onclick="openSupplierModal()">
                    + เพิ่มผู้จำหน่าย
                </button>
            </div>

        </div>

        <div class="panel">

            <div class="panel-toolbar">

                <input
                    type="search"
                    class="form-control"
                    placeholder="ค้นหาผู้จำหน่าย..."
                    data-search-table="suppliersTable">

            </div>

            <div class="table-responsive">

                <table
                    class="data-table"
                    id="suppliersTable">

                    <thead>

                        <tr>
                            <th>รหัสผู้จำหน่าย</th>
                            <th>ชื่อผู้จำหน่าย</th>
                            <th>เลขประจำตัวผู้เสียภาษี</th>
                            <th>โทรศัพท์</th>
                            <th>อีเมล</th>
                            <th>จัดการ</th>
                        </tr>

                    </thead>

                    <tbody>

                        ${suppliers.map(function (supplier) {

                            const id =
                                supplier["รหัสผู้จำหน่าย"] ||
                                supplier["SupplierID"] ||
                                "";

                            const name =
                                supplier["ชื่อผู้จำหน่าย"] ||
                                supplier["SupplierName"] ||
                                "";

                            return `
                                <tr>

                                    <td>
                                        ${escapeHTML(id)}
                                    </td>

                                    <td>
                                        ${escapeHTML(name)}
                                    </td>

                                    <td>
                                        ${escapeHTML(
                                            supplier["เลขประจำตัวผู้เสียภาษี"] ||
                                            ""
                                        )}
                                    </td>

                                    <td>
                                        ${escapeHTML(
                                            supplier["โทรศัพท์"] ||
                                            ""
                                        )}
                                    </td>

                                    <td>
                                        ${escapeHTML(
                                            supplier["อีเมล"] ||
                                            ""
                                        )}
                                    </td>

                                    <td>

                                        <button
                                            class="btn btn-sm"
                                            onclick='editSupplier(${JSON.stringify(supplier)})'>
                                            แก้ไข
                                        </button>

                                        <button
                                            class="btn btn-sm btn-danger"
                                            onclick="deleteSupplier('${escapeJS(id)}')">
                                            ลบ
                                        </button>

                                    </td>

                                </tr>
                            `;

                        }).join("")}

                    </tbody>

                </table>

            </div>

        </div>
    `;
}


function openSupplierModal(supplier = null) {

    AppState.editingId =
        supplier
            ? (
                supplier["รหัสผู้จำหน่าย"] ||
                supplier["SupplierID"]
            )
            : null;


    const data =
        supplier || {};


    openModal(
        supplier
            ? "แก้ไขผู้จำหน่าย"
            : "เพิ่มผู้จำหน่าย",

        `
        <form data-form-action="saveSupplier">

            <div class="form-grid">

                <div class="form-group">
                    <label>รหัสผู้จำหน่าย</label>
                    <input
                        type="text"
                        name="รหัสผู้จำหน่าย"
                        class="form-control"
                        value="${escapeHTML(
                            data["รหัสผู้จำหน่าย"] ||
                            ""
                        )}"
                        ${supplier ? "readonly" : ""}
                        required>
                </div>

                <div class="form-group">
                    <label>ชื่อผู้จำหน่าย</label>
                    <input
                        type="text"
                        name="ชื่อผู้จำหน่าย"
                        class="form-control"
                        value="${escapeHTML(
                            data["ชื่อผู้จำหน่าย"] ||
                            ""
                        )}"
                        required>
                </div>

                <div class="form-group">
                    <label>เลขประจำตัวผู้เสียภาษี</label>
                    <input
                        type="text"
                        name="เลขประจำตัวผู้เสียภาษี"
                        class="form-control"
                        value="${escapeHTML(
                            data["เลขประจำตัวผู้เสียภาษี"] ||
                            ""
                        )}">
                </div>

                <div class="form-group">
                    <label>โทรศัพท์</label>
                    <input
                        type="text"
                        name="โทรศัพท์"
                        class="form-control"
                        value="${escapeHTML(
                            data["โทรศัพท์"] ||
                            ""
                        )}">
                </div>

                <div class="form-group">
                    <label>อีเมล</label>
                    <input
                        type="email"
                        name="อีเมล"
                        class="form-control"
                        value="${escapeHTML(
                            data["อีเมล"] ||
                            ""
                        )}">
                </div>

                <div class="form-group">
                    <label>ที่อยู่</label>
                    <textarea
                        name="ที่อยู่"
                        class="form-control"
                        rows="3">${escapeHTML(
                            data["ที่อยู่"] ||
                            ""
                        )}</textarea>
                </div>

            </div>

            <div class="modal-footer">

                <button
                    type="button"
                    class="btn"
                    data-modal-close>
                    ยกเลิก
                </button>

                <button
                    type="submit"
                    class="btn btn-primary">
                    บันทึก
                </button>

            </div>

        </form>
        `
    );
}


function editSupplier(supplier) {

    openSupplierModal(supplier);
}


async function saveSupplier(form) {

    const data =
        formToObject(form);


    try {

        setLoading(true);


        if (AppState.editingId) {

            await apiRequest(
                "updateRow",
                {
                    sheet: "Suppliers",
                    idField: "รหัสผู้จำหน่าย",
                    id: AppState.editingId,
                    data: data,
                    token:
                        AppState.session.token
                }
            );

        } else {

            await apiRequest(
                "insertRow",
                {
                    sheet: "Suppliers",
                    data: data,
                    token:
                        AppState.session.token
                }
            );
        }


        showToast(
            "บันทึกข้อมูลผู้จำหน่ายเรียบร้อยแล้ว",
            "success"
        );


        closeModal();

        AppState.editingId = null;

        await renderSuppliersPage();

    } catch (error) {

        showToast(
            error.message,
            "error"
        );

    } finally {

        setLoading(false);
    }
}


async function deleteSupplier(id) {

    if (!confirm(
        "ยืนยันการลบข้อมูลผู้จำหน่ายหรือไม่?"
    )) {

        return;
    }


    try {

        await apiRequest(
            "deleteRow",
            {
                sheet: "Suppliers",
                idField: "รหัสผู้จำหน่าย",
                id: id,
                token:
                    AppState.session.token
            }
        );


        showToast(
            "ลบข้อมูลผู้จำหน่ายเรียบร้อยแล้ว",
            "success"
        );


        await renderSuppliersPage();

    } catch (error) {

        showToast(
            error.message,
            "error"
        );
    }
}


/* =========================================================
   SALES
   ========================================================= */

async function renderSalesPage() {

    setPageContent(
        createLoadingHTML(
            "กำลังโหลดข้อมูลการขาย..."
        )
    );


    try {

        const result =
            await apiRequest(
                "listRows",
                {
                    sheet: "Sales",
                    token:
                        AppState.session.token
                }
            );


        AppState.sales =
            result.data.rows || [];


        setPageContent(
            createSalesHTML(
                AppState.sales
            )
        );

    } catch (error) {

        setPageContent(
            createErrorHTML(
                error.message
            )
        );
    }
}


function createSalesHTML(sales) {

    return `
        <div class="page-header">

            <div>
                <h1>ขายสินค้า</h1>
                <p>บันทึกและตรวจสอบรายการขาย</p>
            </div>

            <div>
                <button
                    class="btn btn-primary"
                    onclick="openSaleModal()">
                    + บันทึกการขาย
                </button>
            </div>

        </div>

        <div class="panel">

            <div class="panel-toolbar">

                <input
                    type="search"
                    class="form-control"
                    placeholder="ค้นหารายการขาย..."
                    data-search-table="salesTable">

            </div>

            <div class="table-responsive">

                <table
                    class="data-table"
                    id="salesTable">

                    <thead>

                        <tr>
                            <th>เลขที่</th>
                            <th>วันที่</th>
                            <th>ลูกค้า</th>
                            <th>วิธีชำระเงิน</th>
                            <th>ยอดรวม</th>
                            <th>สถานะ</th>
                        </tr>

                    </thead>

                    <tbody>

                        ${sales.map(function (sale) {

                            return `
                                <tr>

                                    <td>
                                        ${escapeHTML(
                                            sale["เลขที่ขาย"] ||
                                            sale["SaleID"] ||
                                            ""
                                        )}
                                    </td>

                                    <td>
                                        ${formatDate(
                                            sale["วันที่"] ||
                                            sale["วันที่ขาย"] ||
                                            ""
                                        )}
                                    </td>

                                    <td>
                                        ${escapeHTML(
                                            sale["ลูกค้า"] ||
                                            sale["ชื่อลูกค้า"] ||
                                            "-"
                                        )}
                                    </td>

                                    <td>
                                        ${escapeHTML(
                                            sale["วิธีชำระเงิน"] ||
                                            "-"
                                        )}
                                    </td>

                                    <td class="text-right">
                                        ${formatMoney(
                                            sale["ยอดรวม"] ||
                                            sale["จำนวนเงินสุทธิ"] ||
                                            0
                                        )}
                                    </td>

                                    <td>
                                        ${escapeHTML(
                                            sale["สถานะ"] ||
                                            "บันทึกแล้ว"
                                        )}
                                    </td>

                                </tr>
                            `;

                        }).join("")}

                    </tbody>

                </table>

            </div>

        </div>
    `;
}


/* =========================================================
   SALE MODAL
   ========================================================= */

function openSaleModal() {

    AppState.selectedProduct = null;

    const productOptions =
        AppState.products
            .map(function (product) {

                const id =
                    product["รหัสสินค้า"] ||
                    product["ProductID"] ||
                    "";

                const name =
                    product["ชื่อสินค้า"] ||
                    product["ProductName"] ||
                    "";

                const price =
                    Number(
                        product["ราคาขาย"] ||
                        0
                    );

                return `
                    <option
                        value="${escapeHTML(id)}"
                        data-price="${price}">
                        ${escapeHTML(name)}
                        (${escapeHTML(id)})
                    </option>
                `;

            })
            .join("");


    const customerOptions =
        AppState.customers
            .map(function (customer) {

                const id =
                    customer["รหัสลูกค้า"] ||
                    customer["CustomerID"] ||
                    "";

                const name =
                    customer["ชื่อลูกค้า"] ||
                    "";

                return `
                    <option value="${escapeHTML(id)}">
                        ${escapeHTML(name)}
                    </option>
                `;

            })
            .join("");


    openModal(
        "บันทึกการขาย",

        `
        <form
            id="saleForm"
            data-form-action="createSale">

            <div class="form-grid">

                <div class="form-group">
                    <label>วันที่ขาย</label>
                    <input
                        type="date"
                        name="date"
                        class="form-control"
                        value="${getTodayISO()}"
                        required>
                </div>

                <div class="form-group">
                    <label>ลูกค้า</label>
                    <select
                        name="customerId"
                        class="form-control">

                        <option value="">
                            ลูกค้าทั่วไป
                        </option>

                        ${customerOptions}

                    </select>
                </div>

                <div class="form-group">
                    <label>วิธีชำระเงิน</label>
                    <select
                        name="paymentMethod"
                        class="form-control">

                        <option value="เงินสด">
                            เงินสด
                        </option>

                        <option value="โอนเงิน">
                            โอนเงิน
                        </option>

                        <option value="บัตร">
                            บัตร
                        </option>

                        <option value="เครดิต">
                            เครดิต
                        </option>

                    </select>
                </div>

            </div>

            <hr>

            <div class="sale-items">

                <div class="sale-items-header">
                    <h3>รายการสินค้า</h3>

                    <button
                        type="button"
                        class="btn btn-sm btn-primary"
                        onclick="addSaleItemRow()">
                        + เพิ่มรายการ
                    </button>
                </div>

                <div id="saleItemsContainer">

                    ${createSaleItemRowHTML(productOptions)}

                </div>

            </div>

            <div class="sale-total-box">

                <div>
                    <span>รวมก่อนภาษี</span>
                    <strong id="saleSubtotal">
                        0.00
                    </strong>
                </div>

                <div>
                    <span>ภาษี</span>
                    <strong id="saleTax">
                        0.00
                    </strong>
                </div>

                <div class="total">
                    <span>ยอดสุทธิ</span>
                    <strong id="saleGrandTotal">
                        0.00
                    </strong>
                </div>

            </div>

            <div class="modal-footer">

                <button
                    type="button"
                    class="btn"
                    data-modal-close>
                    ยกเลิก
                </button>

                <button
                    type="submit"
                    class="btn btn-primary">
                    บันทึกการขาย
                </button>

            </div>

        </form>
        `
    );


    updateSaleTotals();
}


function createSaleItemRowHTML(productOptions) {

    return `
        <div class="sale-item-row">

            <select
                class="form-control sale-product"
                onchange="updateSaleItemPrice(this)">

                <option value="">
                    เลือกสินค้า
                </option>

                ${productOptions}

            </select>

            <input
                type="number"
                class="form-control sale-quantity"
                value="1"
                min="0.01"
                step="0.01"
                onchange="updateSaleTotals()"
                oninput="updateSaleTotals()">

            <input
                type="number"
                class="form-control sale-price"
                value="0"
                min="0"
                step="0.01"
                onchange="updateSaleTotals()"
                oninput="updateSaleTotals()">

            <input
                type="number"
                class="form-control sale-tax"
                value="0"
                min="0"
                step="0.01"
                onchange="updateSaleTotals()"
                oninput="updateSaleTotals()">

            <button
                type="button"
                class="btn btn-sm btn-danger"
                onclick="removeSaleItemRow(this)">
                ลบ
            </button>

        </div>
    `;
}


function addSaleItemRow() {

    const container =
        document.querySelector(
            "#saleItemsContainer"
        );


    if (!container) {
        return;
    }


    const productOptions =
        AppState.products
            .map(function (product) {

                const id =
                    product["รหัสสินค้า"] ||
                    product["ProductID"] ||
                    "";

                const name =
                    product["ชื่อสินค้า"] ||
                    product["ProductName"] ||
                    "";

                const price =
                    Number(
                        product["ราคาขาย"] ||
                        0
                    );

                return `
                    <option
                        value="${escapeHTML(id)}"
                        data-price="${price}">
                        ${escapeHTML(name)}
                        (${escapeHTML(id)})
                    </option>
                `;

            })
            .join("");


    container.insertAdjacentHTML(
        "beforeend",
        createSaleItemRowHTML(
            productOptions
        )
    );


    updateSaleTotals();
}


function removeSaleItemRow(button) {

    const row =
        button.closest(
            ".sale-item-row"
        );


    if (row) {

        row.remove();
    }


    updateSaleTotals();
}


function updateSaleItemPrice(select) {

    const row =
        select.closest(
            ".sale-item-row"
        );


    if (!row) {
        return;
    }


    const option =
        select.options[
            select.selectedIndex
        ];


    const price =
        option
            ? Number(
                option.dataset.price ||
                0
            )
            : 0;


    const priceInput =
        row.querySelector(
            ".sale-price"
        );


    if (priceInput) {

        priceInput.value =
            price.toFixed(2);
    }


    const productId =
        select.value;


    const product =
        AppState.products.find(
            function (item) {

                return (
                    String(
                        item["รหัสสินค้า"] ||
                        item["ProductID"] ||
                        ""
                    ) ===
                    String(productId)
                );
            }
        );


    if (product) {

        const taxInput =
            row.querySelector(
                ".sale-tax"
            );


        if (taxInput) {

            taxInput.value =
                Number(
                    product["ภาษี%"] ||
                    0
                );
        }
    }


    updateSaleTotals();
}


function updateSaleTotals() {

    const rows =
        document.querySelectorAll(
            ".sale-item-row"
        );


    let subtotal = 0;

    let tax = 0;


    rows.forEach(function (row) {

        const quantity =
            Number(
                row.querySelector(
                    ".sale-quantity"
                )?.value ||
                0
            );


        const price =
            Number(
                row.querySelector(
                    ".sale-price"
                )?.value ||
                0
            );


        const taxRate =
            Number(
                row.querySelector(
                    ".sale-tax"
                )?.value ||
                0
            );


        const amount =
            quantity * price;


        const rowTax =
            amount *
            taxRate /
            100;


        subtotal += amount;

        tax += rowTax;

    });


    const grandTotal =
        subtotal + tax;


    const subtotalElement =
        document.querySelector(
            "#saleSubtotal"
        );


    const taxElement =
        document.querySelector(
            "#saleTax"
        );


    const totalElement =
        document.querySelector(
            "#saleGrandTotal"
        );


    if (subtotalElement) {

        subtotalElement.textContent =
            formatMoney(subtotal);
    }


    if (taxElement) {

        taxElement.textContent =
            formatMoney(tax);
    }


    if (totalElement) {

        totalElement.textContent =
            formatMoney(grandTotal);
    }
}


async function createSale(form) {

    const header =
        formToObject(form);


    const rows =
        document.querySelectorAll(
            ".sale-item-row"
        );


    const items = [];


    rows.forEach(function (row) {

        const productId =
            row.querySelector(
                ".sale-product"
            )?.value ||
            "";


        const quantity =
            Number(
                row.querySelector(
                    ".sale-quantity"
                )?.value ||
                0
            );


        const price =
            Number(
                row.querySelector(
                    ".sale-price"
                )?.value ||
                0
            );


        const taxRate =
            Number(
                row.querySelector(
                    ".sale-tax"
                )?.value ||
                0
            );


        if (
            productId &&
            quantity > 0
        ) {

            items.push({
                productId:
                    productId,

                quantity:
                    quantity,

                unitPrice:
                    price,

                taxRate:
                    taxRate
            });
        }

    });


    if (items.length === 0) {

        showToast(
            "กรุณาเพิ่มรายการสินค้า",
            "warning"
        );

        return;
    }


    try {

        setLoading(true);


        const result =
            await apiRequest(
                "createSale",
                {
                    token:
                        AppState.session.token,

                    header: {
                        date:
                            header.date,

                        customerId:
                            header.customerId,

                        paymentMethod:
                            header.paymentMethod
                    },

                    items:
                        items
                }
            );


        showToast(
            "บันทึกการขายเรียบร้อยแล้ว",
            "success"
        );


        closeModal();

        await renderSalesPage();


        if (
            result.data &&
            result.data.sale
        ) {

            setTimeout(
                function () {

                    askPrintSale(
                        result.data.sale
                    );

                },
                300
            );
        }

    } catch (error) {

        console.error(
            "Create sale error:",
            error
        );

        showToast(
            error.message,
            "error"
        );

    } finally {

        setLoading(false);
    }
}


/* =========================================================
   PURCHASES
   ========================================================= */

async function renderPurchasesPage() {

    setPageContent(
        createLoadingHTML(
            "กำลังโหลดข้อมูลการซื้อ..."
        )
    );


    try {

        const result =
            await apiRequest(
                "listRows",
                {
                    sheet: "Purchases",
                    token:
                        AppState.session.token
                }
            );


        AppState.purchases =
            result.data.rows || [];


        setPageContent(
            createPurchasesHTML(
                AppState.purchases
            )
        );

    } catch (error) {

        setPageContent(
            createErrorHTML(
                error.message
            )
        );
    }
}


function createPurchasesHTML(purchases) {

    return `
        <div class="page-header">

            <div>
                <h1>ซื้อสินค้า</h1>
                <p>บันทึกการซื้อสินค้าเข้าสต็อก</p>
            </div>

            <div>
                <button
                    class="btn btn-primary"
                    onclick="openPurchaseModal()">
                    + บันทึกการซื้อ
                </button>
            </div>

        </div>

        <div class="panel">

            <div class="table-responsive">

                <table class="data-table">

                    <thead>

                        <tr>
                            <th>เลขที่ซื้อ</th>
                            <th>วันที่</th>
                            <th>ผู้จำหน่าย</th>
                            <th>วิธีชำระเงิน</th>
                            <th>ยอดรวม</th>
                            <th>สถานะ</th>
                        </tr>

                    </thead>

                    <tbody>

                        ${purchases.map(function (purchase) {

                            return `
                                <tr>

                                    <td>
                                        ${escapeHTML(
                                            purchase["เลขที่ซื้อ"] ||
                                            purchase["PurchaseID"] ||
                                            ""
                                        )}
                                    </td>

                                    <td>
                                        ${formatDate(
                                            purchase["วันที่"] ||
                                            ""
                                        )}
                                    </td>

                                    <td>
                                        ${escapeHTML(
                                            purchase["ผู้จำหน่าย"] ||
                                            purchase["ชื่อผู้จำหน่าย"] ||
                                            "-"
                                        )}
                                    </td>

                                    <td>
                                        ${escapeHTML(
                                            purchase["วิธีชำระเงิน"] ||
                                            "-"
                                        )}
                                    </td>

                                    <td class="text-right">
                                        ${formatMoney(
                                            purchase["ยอดรวม"] ||
                                            0
                                        )}
                                    </td>

                                    <td>
                                        ${escapeHTML(
                                            purchase["สถานะ"] ||
                                            "บันทึกแล้ว"
                                        )}
                                    </td>

                                </tr>
                            `;

                        }).join("")}

                    </tbody>

                </table>

            </div>

        </div>
    `;
}


function openPurchaseModal() {

    const productOptions =
        AppState.products
            .map(function (product) {

                const id =
                    product["รหัสสินค้า"] ||
                    product["ProductID"] ||
                    "";

                const name =
                    product["ชื่อสินค้า"] ||
                    product["ProductName"] ||
                    "";

                const price =
                    Number(
                        product["ราคาซื้อ"] ||
                        0
                    );

                return `
                    <option
                        value="${escapeHTML(id)}"
                        data-price="${price}">
                        ${escapeHTML(name)}
                    </option>
                `;

            })
            .join("");


    const supplierOptions =
        AppState.suppliers
            .map(function (supplier) {

                const id =
                    supplier["รหัสผู้จำหน่าย"] ||
                    supplier["SupplierID"] ||
                    "";

                const name =
                    supplier["ชื่อผู้จำหน่าย"] ||
                    "";

                return `
                    <option value="${escapeHTML(id)}">
                        ${escapeHTML(name)}
                    </option>
                `;

            })
            .join("");


    openModal(
        "บันทึกการซื้อ",

        `
        <form
            data-form-action="createPurchase">

            <div class="form-grid">

                <div class="form-group">
                    <label>วันที่ซื้อ</label>
                    <input
                        type="date"
                        name="date"
                        class="form-control"
                        value="${getTodayISO()}"
                        required>
                </div>

                <div class="form-group">
                    <label>ผู้จำหน่าย</label>

                    <select
                        name="supplierId"
                        class="form-control"
                        required>

                        <option value="">
                            เลือกผู้จำหน่าย
                        </option>

                        ${supplierOptions}

                    </select>
                </div>

                <div class="form-group">
                    <label>วิธีชำระเงิน</label>

                    <select
                        name="paymentMethod"
                        class="form-control">

                        <option value="เงินสด">
                            เงินสด
                        </option>

                        <option value="โอนเงิน">
                            โอนเงิน
                        </option>

                        <option value="เครดิต">
                            เครดิต
                        </option>

                    </select>

                </div>

            </div>

            <hr>

            <div class="sale-items-header">

                <h3>รายการสินค้า</h3>

                <button
                    type="button"
                    class="btn btn-sm btn-primary"
                    onclick="addPurchaseItemRow()">
                    + เพิ่มรายการ
                </button>

            </div>

            <div id="purchaseItemsContainer">

                ${createPurchaseItemRowHTML(productOptions)}

            </div>

            <div class="sale-total-box">

                <div>
                    <span>รวมก่อนภาษี</span>
                    <strong id="purchaseSubtotal">
                        0.00
                    </strong>
                </div>

                <div>
                    <span>ภาษี</span>
                    <strong id="purchaseTax">
                        0.00
                    </strong>
                </div>

                <div class="total">
                    <span>ยอดสุทธิ</span>
                    <strong id="purchaseGrandTotal">
                        0.00
                    </strong>
                </div>

            </div>

            <div class="modal-footer">

                <button
                    type="button"
                    class="btn"
                    data-modal-close>
                    ยกเลิก
                </button>

                <button
                    type="submit"
                    class="btn btn-primary">
                    บันทึกการซื้อ
                </button>

            </div>

        </form>
        `
    );


    updatePurchaseTotals();
}


function createPurchaseItemRowHTML(productOptions) {

    return `
        <div class="purchase-item-row">

            <select
                class="form-control purchase-product"
                onchange="updatePurchaseItemPrice(this)">

                <option value="">
                    เลือกสินค้า
                </option>

                ${productOptions}

            </select>

            <input
                type="number"
                class="form-control purchase-quantity"
                value="1"
                min="0.01"
                step="0.01"
                oninput="updatePurchaseTotals()">

            <input
                type="number"
                class="form-control purchase-price"
                value="0"
                min="0"
                step="0.01"
                oninput="updatePurchaseTotals()">

            <input
                type="number"
                class="form-control purchase-tax"
                value="0"
                min="0"
                step="0.01"
                oninput="updatePurchaseTotals()">

            <button
                type="button"
                class="btn btn-sm btn-danger"
                onclick="removePurchaseItemRow(this)">
                ลบ
            </button>

        </div>
    `;
}


function addPurchaseItemRow() {

    const container =
        document.querySelector(
            "#purchaseItemsContainer"
        );


    if (!container) {
        return;
    }


    const productOptions =
        AppState.products
            .map(function (product) {

                const id =
                    product["รหัสสินค้า"] ||
                    product["ProductID"] ||
                    "";

                const name =
                    product["ชื่อสินค้า"] ||
                    product["ProductName"] ||
                    "";

                const price =
                    Number(
                        product["ราคาซื้อ"] ||
                        0
                    );

                return `
                    <option
                        value="${escapeHTML(id)}"
                        data-price="${price}">
                        ${escapeHTML(name)}
                    </option>
                `;

            })
            .join("");


    container.insertAdjacentHTML(
        "beforeend",
        createPurchaseItemRowHTML(
            productOptions
        )
    );


    updatePurchaseTotals();
}


function removePurchaseItemRow(button) {

    const row =
        button.closest(
            ".purchase-item-row"
        );


    if (row) {

        row.remove();
    }


    updatePurchaseTotals();
}


function updatePurchaseItemPrice(select) {

    const row =
        select.closest(
            ".purchase-item-row"
        );


    if (!row) {
        return;
    }


    const option =
        select.options[
            select.selectedIndex
        ];


    const price =
        option
            ? Number(
                option.dataset.price ||
                0
            )
            : 0;


    const priceInput =
        row.querySelector(
            ".purchase-price"
        );


    if (priceInput) {

        priceInput.value =
            price.toFixed(2);
    }


    const productId =
        select.value;


    const product =
        AppState.products.find(
            function (item) {

                return String(
                    item["รหัสสินค้า"] ||
                    item["ProductID"] ||
                    ""
                ) ===
                String(productId);
            }
        );


    if (product) {

        const taxInput =
            row.querySelector(
                ".purchase-tax"
            );


        if (taxInput) {

            taxInput.value =
                Number(
                    product["ภาษี%"] ||
                    0
                );
        }
    }


    updatePurchaseTotals();
}


function updatePurchaseTotals() {

    const rows =
        document.querySelectorAll(
            ".purchase-item-row"
        );


    let subtotal = 0;

    let tax = 0;


    rows.forEach(function (row) {

        const quantity =
            Number(
                row.querySelector(
                    ".purchase-quantity"
                )?.value ||
                0
            );


        const price =
            Number(
                row.querySelector(
                    ".purchase-price"
                )?.value ||
                0
            );


        const taxRate =
            Number(
                row.querySelector(
                    ".purchase-tax"
                )?.value ||
                0
            );


        const amount =
            quantity * price;


        const rowTax =
            amount *
            taxRate /
            100;


        subtotal += amount;

        tax += rowTax;
    });


    const total =
        subtotal + tax;


    const subtotalElement =
        document.querySelector(
            "#purchaseSubtotal"
        );


    const taxElement =
        document.querySelector(
            "#purchaseTax"
        );


    const totalElement =
        document.querySelector(
            "#purchaseGrandTotal"
        );


    if (subtotalElement) {

        subtotalElement.textContent =
            formatMoney(subtotal);
    }


    if (taxElement) {

        taxElement.textContent =
            formatMoney(tax);
    }


    if (totalElement) {

        totalElement.textContent =
            formatMoney(total);
    }
}


async function createPurchase(form) {

    const header =
        formToObject(form);


    const rows =
        document.querySelectorAll(
            ".purchase-item-row"
        );


    const items = [];


    rows.forEach(function (row) {

        const productId =
            row.querySelector(
                ".purchase-product"
            )?.value ||
            "";


        const quantity =
            Number(
                row.querySelector(
                    ".purchase-quantity"
                )?.value ||
                0
            );


        const price =
            Number(
                row.querySelector(
                    ".purchase-price"
                )?.value ||
                0
            );


        const taxRate =
            Number(
                row.querySelector(
                    ".purchase-tax"
                )?.value ||
                0
            );


        if (
            productId &&
            quantity > 0
        ) {

            items.push({
                productId:
                    productId,

                quantity:
                    quantity,

                unitPrice:
                    price,

                taxRate:
                    taxRate
            });
        }
    });


    if (items.length === 0) {

        showToast(
            "กรุณาเพิ่มรายการสินค้า",
            "warning"
        );

        return;
    }


    try {

        setLoading(true);


        await apiRequest(
            "createPurchase",
            {
                token:
                    AppState.session.token,

                header: {
                    date:
                        header.date,

                    supplierId:
                        header.supplierId,

                    paymentMethod:
                        header.paymentMethod
                },

                items:
                    items
            }
        );


        showToast(
            "บันทึกการซื้อเรียบร้อยแล้ว",
            "success"
        );


        closeModal();

        await renderPurchasesPage();

    } catch (error) {

        showToast(
            error.message,
            "error"
        );

    } finally {

        setLoading(false);
    }
}


/* =========================================================
   RECEIPTS
   ========================================================= */

async function renderReceiptsPage() {

    setPageContent(
        createLoadingHTML(
            "กำลังโหลดใบเสร็จ..."
        )
    );


    try {

        const result =
            await apiRequest(
                "listRows",
                {
                    sheet: "Receipts",
                    token:
                        AppState.session.token
                }
            );


        AppState.receipts =
            result.data.rows || [];


        setPageContent(
            createDocumentTableHTML(
                "ใบเสร็จรับเงิน",
                "Receipts",
                AppState.receipts
            )
        );

    } catch (error) {

        setPageContent(
            createErrorHTML(
                error.message
            )
        );
    }
}


/* =========================================================
   PAYMENTS
   ========================================================= */

async function renderPaymentsPage() {

    setPageContent(
        createLoadingHTML(
            "กำลังโหลดข้อมูลการจ่ายเงิน..."
        )
    );


    try {

        const result =
            await apiRequest(
                "listRows",
                {
                    sheet: "Payments",
                    token:
                        AppState.session.token
                }
            );


        AppState.payments =
            result.data.rows || [];


        setPageContent(
            createDocumentTableHTML(
                "การจ่ายเงิน",
                "Payments",
                AppState.payments
            )
        );

    } catch (error) {

        setPageContent(
            createErrorHTML(
                error.message
            )
        );
    }
}


/* =========================================================
   EXPENSES
   ========================================================= */

async function renderExpensesPage() {

    setPageContent(
        createLoadingHTML(
            "กำลังโหลดค่าใช้จ่าย..."
        )
    );


    try {

        const result =
            await apiRequest(
                "listRows",
                {
                    sheet: "Expenses",
                    token:
                        AppState.session.token
                }
            );


        AppState.expenses =
            result.data.rows || [];


        setPageContent(
            createExpensesHTML(
                AppState.expenses
            )
        );

    } catch (error) {

        setPageContent(
            createErrorHTML(
                error.message
            )
        );
    }
}


function createExpensesHTML(expenses) {

    return `
        <div class="page-header">

            <div>
                <h1>ค่าใช้จ่าย</h1>
                <p>บันทึกค่าใช้จ่ายของร้านค้า</p>
            </div>

            <div>

                <button
                    class="btn btn-primary"
                    onclick="openExpenseModal()">
                    + เพิ่มค่าใช้จ่าย
                </button>

            </div>

        </div>

        <div class="panel">

            <div class="table-responsive">

                <table class="data-table">

                    <thead>

                        <tr>
                            <th>วันที่</th>
                            <th>รายการ</th>
                            <th>หมวดหมู่</th>
                            <th>จำนวนเงิน</th>
                            <th>หมายเหตุ</th>
                        </tr>

                    </thead>

                    <tbody>

                        ${expenses.map(function (expense) {

                            return `
                                <tr>

                                    <td>
                                        ${formatDate(
                                            expense["วันที่"] ||
                                            ""
                                        )}
                                    </td>

                                    <td>
                                        ${escapeHTML(
                                            expense["รายการ"] ||
                                            ""
                                        )}
                                    </td>

                                    <td>
                                        ${escapeHTML(
                                            expense["หมวดหมู่"] ||
                                            ""
                                        )}
                                    </td>

                                    <td class="text-right">
                                        ${formatMoney(
                                            expense["จำนวนเงิน"] ||
                                            0
                                        )}
                                    </td>

                                    <td>
                                        ${escapeHTML(
                                            expense["หมายเหตุ"] ||
                                            ""
                                        )}
                                    </td>

                                </tr>
                            `;

                        }).join("")}

                    </tbody>

                </table>

            </div>

        </div>
    `;
}


function openExpenseModal() {

    openModal(
        "เพิ่มค่าใช้จ่าย",

        `
        <form
            data-form-action="saveExpense">

            <div class="form-grid">

                <div class="form-group">
                    <label>วันที่</label>
                    <input
                        type="date"
                        name="วันที่"
                        class="form-control"
                        value="${getTodayISO()}"
                        required>
                </div>

                <div class="form-group">
                    <label>รายการ</label>
                    <input
                        type="text"
                        name="รายการ"
                        class="form-control"
                        required>
                </div>

                <div class="form-group">
                    <label>หมวดหมู่</label>
                    <input
                        type="text"
                        name="หมวดหมู่"
                        class="form-control">
                </div>

                <div class="form-group">
                    <label>จำนวนเงิน</label>
                    <input
                        type="number"
                        name="จำนวนเงิน"
                        class="form-control"
                        step="0.01"
                        min="0"
                        required>
                </div>

                <div class="form-group">
                    <label>หมายเหตุ</label>
                    <textarea
                        name="หมายเหตุ"
                        class="form-control"
                        rows="3"></textarea>
                </div>

            </div>

            <div class="modal-footer">

                <button
                    type="button"
                    class="btn"
                    data-modal-close>
                    ยกเลิก
                </button>

                <button
                    type="submit"
                    class="btn btn-primary">
                    บันทึก
                </button>

            </div>

        </form>
        `
    );
}


async function saveExpense(form) {

    const data =
        formToObject(form);


    data["จำนวนเงิน"] =
        Number(
            data["จำนวนเงิน"] ||
            0
        );


    try {

        setLoading(true);


        await apiRequest(
            "insertRow",
            {
                sheet: "Expenses",
                data: data,
                token:
                    AppState.session.token
            }
        );


        showToast(
            "บันทึกค่าใช้จ่ายเรียบร้อยแล้ว",
            "success"
        );


        closeModal();

        await renderExpensesPage();

    } catch (error) {

        showToast(
            error.message,
            "error"
        );

    } finally {

        setLoading(false);
    }
}


/* =========================================================
   STOCK
   ========================================================= */

async function renderStockPage() {

    setPageContent(
        createLoadingHTML(
            "กำลังโหลดสต็อก..."
        )
    );


    try {

        const result =
            await apiRequest(
                "stockReport",
                {
                    token:
                        AppState.session.token
                }
            );


        setPageContent(
            createStockHTML(
                result.data || {}
            )
        );

    } catch (error) {

        setPageContent(
            createErrorHTML(
                error.message
            )
        );
    }
}


function createStockHTML(data) {

    const rows =
        data.rows ||
        data.products ||
        AppState.products ||
        [];


    return `
        <div class="page-header">

            <div>
                <h1>สต็อกสินค้า</h1>
                <p>ตรวจสอบจำนวนสินค้าในคลัง</p>
            </div>

        </div>

        <div class="panel">

            <div class="table-responsive">

                <table class="data-table">

                    <thead>

                        <tr>
                            <th>รหัสสินค้า</th>
                            <th>ชื่อสินค้า</th>
                            <th>หน่วย</th>
                            <th>จำนวนคงเหลือ</th>
                            <th>ราคาทุน</th>
                            <th>มูลค่าสต็อก</th>
                            <th>สถานะ</th>
                        </tr>

                    </thead>

                    <tbody>

                        ${rows.map(function (row) {

                            const quantity =
                                Number(
                                    row["จำนวนคงเหลือ"] ||
                                    row["จำนวน"] ||
                                    0
                                );

                            const cost =
                                Number(
                                    row["ราคาซื้อ"] ||
                                    row["ราคาทุน"] ||
                                    0
                                );

                            return `
                                <tr>

                                    <td>
                                        ${escapeHTML(
                                            row["รหัสสินค้า"] ||
                                            row["ProductID"] ||
                                            ""
                                        )}
                                    </td>

                                    <td>
                                        ${escapeHTML(
                                            row["ชื่อสินค้า"] ||
                                            row["ProductName"] ||
                                            ""
                                        )}
                                    </td>

                                    <td>
                                        ${escapeHTML(
                                            row["หน่วย"] ||
                                            ""
                                        )}
                                    </td>

                                    <td class="text-right">
                                        ${formatNumber(quantity)}
                                    </td>

                                    <td class="text-right">
                                        ${formatMoney(cost)}
                                    </td>

                                    <td class="text-right">
                                        ${formatMoney(
                                            quantity * cost
                                        )}
                                    </td>

                                    <td>
                                        ${getStockStatus(
                                            quantity
                                        )}
                                    </td>

                                </tr>
                            `;

                        }).join("")}

                    </tbody>

                </table>

            </div>

        </div>
    `;
}


/* =========================================================
   JOURNAL
   ========================================================= */

async function renderJournalPage() {

    setPageContent(
        createLoadingHTML(
            "กำลังโหลดสมุดรายวัน..."
        )
    );


    try {

        const result =
            await apiRequest(
                "listRows",
                {
                    sheet: "Journal",
                    token:
                        AppState.session.token
                }
            );


        AppState.journal =
            result.data.rows || [];


        setPageContent(
            createJournalHTML(
                AppState.journal
            )
        );

    } catch (error) {

        setPageContent(
            createErrorHTML(
                error.message
            )
        );
    }
}


function createJournalHTML(journal) {

    return `
        <div class="page-header">

            <div>
                <h1>สมุดรายวัน</h1>
                <p>รายการบันทึกบัญชีของระบบ</p>
            </div>

        </div>

        <div class="panel">

            <div class="table-responsive">

                <table class="data-table">

                    <thead>

                        <tr>
                            <th>วันที่</th>
                            <th>เลขที่เอกสาร</th>
                            <th>บัญชี</th>
                            <th>คำอธิบาย</th>
                            <th>เดบิต</th>
                            <th>เครดิต</th>
                        </tr>

                    </thead>

                    <tbody>

                        ${journal.map(function (row) {

                            return `
                                <tr>

                                    <td>
                                        ${formatDate(
                                            row["วันที่"] ||
                                            ""
                                        )}
                                    </td>

                                    <td>
                                        ${escapeHTML(
                                            row["เลขที่เอกสาร"] ||
                                            ""
                                        )}
                                    </td>

                                    <td>
                                        ${escapeHTML(
                                            row["รหัสบัญชี"] ||
                                            row["บัญชี"] ||
                                            ""
                                        )}
                                    </td>

                                    <td>
                                        ${escapeHTML(
                                            row["คำอธิบาย"] ||
                                            ""
                                        )}
                                    </td>

                                    <td class="text-right">
                                        ${formatMoney(
                                            row["เดบิต"] ||
                                            0
                                        )}
                                    </td>

                                    <td class="text-right">
                                        ${formatMoney(
                                            row["เครดิต"] ||
                                            0
                                        )}
                                    </td>

                                </tr>
                            `;

                        }).join("")}

                    </tbody>

                </table>

            </div>

        </div>
    `;
}


/* =========================================================
   ACCOUNTS
   ========================================================= */

async function renderAccountsPage() {

    setPageContent(
        createLoadingHTML(
            "กำลังโหลดผังบัญชี..."
        )
    );


    try {

        const result =
            await apiRequest(
                "listRows",
                {
                    sheet: "Accounts",
                    token:
                        AppState.session.token
                }
            );


        AppState.accounts =
            result.data.rows || [];


        setPageContent(
            createAccountsHTML(
                AppState.accounts
            )
        );

    } catch (error) {

        setPageContent(
            createErrorHTML(
                error.message
            )
        );
    }
}


function createAccountsHTML(accounts) {

    return `
        <div class="page-header">

            <div>
                <h1>ผังบัญชี</h1>
                <p>Chart of Accounts</p>
            </div>

        </div>

        <div class="panel">

            <div class="table-responsive">

                <table class="data-table">

                    <thead>

                        <tr>
                            <th>รหัสบัญชี</th>
                            <th>ชื่อบัญชี</th>
                            <th>ประเภท</th>
                            <th>สถานะ</th>
                        </tr>

                    </thead>

                    <tbody>

                        ${accounts.map(function (account) {

                            return `
                                <tr>

                                    <td>
                                        ${escapeHTML(
                                            account["รหัสบัญชี"] ||
                                            account["AccountCode"] ||
                                            ""
                                        )}
                                    </td>

                                    <td>
                                        ${escapeHTML(
                                            account["ชื่อบัญชี"] ||
                                            account["AccountName"] ||
                                            ""
                                        )}
                                    </td>

                                    <td>
                                        ${escapeHTML(
                                            account["ประเภท"] ||
                                            account["ประเภทบัญชี"] ||
                                            ""
                                        )}
                                    </td>

                                    <td>
                                        ${escapeHTML(
                                            account["สถานะ"] ||
                                            "ใช้งาน"
                                        )}
                                    </td>

                                </tr>
                            `;

                        }).join("")}

                    </tbody>

                </table>

            </div>

        </div>
    `;
}


/* =========================================================
   REPORTS
   ========================================================= */

async function renderReportsPage() {

    setPageContent(`

        <div class="page-header">

            <div>
                <h1>รายงาน</h1>
                <p>รายงานการดำเนินงานของร้านค้า</p>
            </div>

        </div>

        <div class="report-grid">

            <button
                class="report-card"
                onclick="loadSalesReport()">

                <strong>รายงานยอดขาย</strong>

                <span>
                    รายงานการขายตามช่วงเวลา
                </span>

            </button>

            <button
                class="report-card"
                onclick="loadPurchaseReport()">

                <strong>รายงานการซื้อ</strong>

                <span>
                    รายงานการซื้อสินค้า
                </span>

            </button>

            <button
                class="report-card"
                onclick="loadExpenseReport()">

                <strong>รายงานค่าใช้จ่าย</strong>

                <span>
                    สรุปค่าใช้จ่าย
                </span>

            </button>

            <button
                class="report-card"
                onclick="loadJournalReport()">

                <strong>รายงานบัญชี</strong>

                <span>
                    รายงานสมุดรายวัน
                </span>

            </button>

        </div>

        <div id="reportResult"></div>
    `);
}


async function loadSalesReport() {

    await loadReport(
        "salesReport",
        "รายงานยอดขาย"
    );
}


async function loadPurchaseReport() {

    await loadReport(
        "purchaseReport",
        "รายงานการซื้อ"
    );
}


async function loadExpenseReport() {

    await loadReport(
        "expenseReport",
        "รายงานค่าใช้จ่าย"
    );
}


async function loadJournalReport() {

    await loadReport(
        "journalReport",
        "รายงานสมุดรายวัน"
    );
}


async function loadReport(
    action,
    title
) {

    const resultContainer =
        document.querySelector(
            "#reportResult"
        );


    if (!resultContainer) {
        return;
    }


    resultContainer.innerHTML =
        createLoadingHTML(
            "กำลังสร้างรายงาน..."
        );


    try {

        const startDate =
            getReportStartDate();


        const endDate =
            getReportEndDate();


        const result =
            await apiRequest(
                action,
                {
                    token:
                        AppState.session.token,

                    startDate:
                        startDate,

                    endDate:
                        endDate
                }
            );


        resultContainer.innerHTML =
            createReportResultHTML(
                title,
                result.data || {}
            );

    } catch (error) {

        resultContainer.innerHTML =
            createErrorHTML(
                error.message
            );
    }
}


function createReportResultHTML(
    title,
    data
) {

    const rows =
        data.rows ||
        data.data ||
        [];


    return `
        <div class="panel">

            <div class="panel-header">

                <h2>
                    ${escapeHTML(title)}
                </h2>

                <button
                    class="btn"
                    onclick="printCurrentReport()">
                    พิมพ์
                </button>

            </div>

            <div class="table-responsive">

                <table
                    class="data-table"
                    id="currentReportTable">

                    <thead>

                        <tr>

                            ${
                                rows.length
                                    ? Object.keys(
                                        rows[0]
                                    ).map(function (key) {

                                        return `
                                            <th>
                                                ${escapeHTML(key)}
                                            </th>
                                        `;

                                    }).join("")
                                    : `
                                        <th>
                                            ไม่มีข้อมูล
                                        </th>
                                    `
                            }

                        </tr>

                    </thead>

                    <tbody>

                        ${
                            rows.length
                                ? rows.map(function (row) {

                                    return `
                                        <tr>

                                            ${
                                                Object.keys(row)
                                                    .map(function (key) {

                                                        const value =
                                                            row[key];

                                                        const isMoney =
                                                            typeof value ===
                                                            "number";

                                                        return `
                                                            <td class="${
                                                                isMoney
                                                                    ? "text-right"
                                                                    : ""
                                                            }">
                                                                ${
                                                                    isMoney
                                                                        ? formatMoney(value)
                                                                        : escapeHTML(
                                                                            String(
                                                                                value ??
                                                                                ""
                                                                            )
                                                                        )
                                                                }
                                                            </td>
                                                        `;

                                                    })
                                                    .join("")
                                            }

                                        </tr>
                                    `;

                                }).join("")
                                : `
                                    <tr>
                                        <td>
                                            ไม่พบข้อมูล
                                        </td>
                                    </tr>
                                `
                        }

                    </tbody>

                </table>

            </div>

        </div>
    `;
}


/* =========================================================
   USERS
   ========================================================= */

async function renderUsersPage() {

    setPageContent(
        createLoadingHTML(
            "กำลังโหลดผู้ใช้งาน..."
        )
    );


    try {

        const result =
            await apiRequest(
                "listRows",
                {
                    sheet: "Users",
                    token:
                        AppState.session.token
                }
            );


        setPageContent(
            createUsersHTML(
                result.data.rows || []
            )
        );

    } catch (error) {

        setPageContent(
            createErrorHTML(
                error.message
            )
        );
    }
}


function createUsersHTML(users) {

    return `
        <div class="page-header">

            <div>
                <h1>ผู้ใช้งานระบบ</h1>
                <p>จัดการบัญชีผู้ใช้งาน</p>
            </div>

        </div>

        <div class="panel">

            <div class="table-responsive">

                <table class="data-table">

                    <thead>

                        <tr>
                            <th>ชื่อผู้ใช้</th>
                            <th>ชื่อ</th>
                            <th>บทบาท</th>
                            <th>สถานะ</th>
                            <th>เข้าสู่ระบบล่าสุด</th>
                        </tr>

                    </thead>

                    <tbody>

                        ${users.map(function (user) {

                            return `
                                <tr>

                                    <td>
                                        ${escapeHTML(
                                            user["Username"] ||
                                            user["username"] ||
                                            ""
                                        )}
                                    </td>

                                    <td>
                                        ${escapeHTML(
                                            user["Name"] ||
                                            user["ชื่อ"] ||
                                            ""
                                        )}
                                    </td>

                                    <td>
                                        ${escapeHTML(
                                            user["Role"] ||
                                            user["บทบาท"] ||
                                            ""
                                        )}
                                    </td>

                                    <td>
                                        ${escapeHTML(
                                            user["Status"] ||
                                            user["สถานะ"] ||
                                            ""
                                        )}
                                    </td>

                                    <td>
                                        ${formatDateTime(
                                            user["LastLogin"] ||
                                            user["เข้าสู่ระบบล่าสุด"] ||
                                            ""
                                        )}
                                    </td>

                                </tr>
                            `;

                        }).join("")}

                    </tbody>

                </table>

            </div>

        </div>
    `;
}


/* =========================================================
   SETTINGS
   ========================================================= */

async function renderSettingsPage() {

    const settings =
        AppState.settings || {};


    setPageContent(`

        <div class="page-header">

            <div>
                <h1>ตั้งค่าระบบ</h1>
                <p>ตั้งค่าข้อมูลพื้นฐานของร้านค้า</p>
            </div>

        </div>

        <div class="panel">

            <form
                data-form-action="saveSettings">

                <div class="form-grid">

                    <div class="form-group">
                        <label>ชื่อร้าน</label>
                        <input
                            type="text"
                            name="shopName"
                            class="form-control"
                            value="${escapeHTML(
                                settings.shopName ||
                                settings["ชื่อร้าน"] ||
                                ""
                            )}">
                    </div>

                    <div class="form-group">
                        <label>เลขประจำตัวผู้เสียภาษี</label>
                        <input
                            type="text"
                            name="taxId"
                            class="form-control"
                            value="${escapeHTML(
                                settings.taxId ||
                                settings["เลขประจำตัวผู้เสียภาษี"] ||
                                ""
                            )}">
                    </div>

                    <div class="form-group">
                        <label>เบอร์โทรศัพท์</label>
                        <input
                            type="text"
                            name="phone"
                            class="form-control"
                            value="${escapeHTML(
                                settings.phone ||
                                settings["โทรศัพท์"] ||
                                ""
                            )}">
                    </div>

                    <div class="form-group">
                        <label>อีเมล</label>
                        <input
                            type="email"
                            name="email"
                            class="form-control"
                            value="${escapeHTML(
                                settings.email ||
                                settings["อีเมล"] ||
                                ""
                            )}">
                    </div>

                    <div class="form-group form-group-full">
                        <label>ที่อยู่</label>
                        <textarea
                            name="address"
                            class="form-control"
                            rows="4">${escapeHTML(
                                settings.address ||
                                settings["ที่อยู่"] ||
                                ""
                            )}</textarea>
                    </div>

                </div>

                <div class="modal-footer">

                    <button
                        type="submit"
                        class="btn btn-primary">
                        บันทึกการตั้งค่า
                    </button>

                </div>

            </form>

        </div>
    `);
}


async function saveSettings(form) {

    const data =
        formToObject(form);


    try {

        setLoading(true);


        await apiRequest(
            "saveSettings",
            {
                token:
                    AppState.session.token,

                settings:
                    data
            }
        );


        AppState.settings =
            Object.assign(
                {},
                AppState.settings,
                data
            );


        localStorage.setItem(
            APP_CONFIG.STORAGE_KEYS.SETTINGS,
            JSON.stringify(
                AppState.settings
            )
        );


        showToast(
            "บันทึกการตั้งค่าเรียบร้อยแล้ว",
            "success"
        );

    } catch (error) {

        showToast(
            error.message,
            "error"
        );

    } finally {

        setLoading(false);
    }
}


/* =========================================================
   DOCUMENT TABLE
   ========================================================= */

function createDocumentTableHTML(
    title,
    sheet,
    rows
) {

    if (!rows.length) {

        return `
            <div class="page-header">
                <h1>
                    ${escapeHTML(title)}
                </h1>
            </div>

            <div class="panel">
                <div class="empty-state">
                    ยังไม่มีข้อมูล
                </div>
            </div>
        `;
    }


    const headers =
        Object.keys(
            rows[0]
        );


    return `
        <div class="page-header">

            <div>
                <h1>
                    ${escapeHTML(title)}
                </h1>

                <p>
                    ${escapeHTML(sheet)}
                </p>
            </div>

        </div>

        <div class="panel">

            <div class="table-responsive">

                <table class="data-table">

                    <thead>

                        <tr>

                            ${headers.map(function (header) {

                                return `
                                    <th>
                                        ${escapeHTML(header)}
                                    </th>
                                `;

                            }).join("")}

                        </tr>

                    </thead>

                    <tbody>

                        ${rows.map(function (row) {

                            return `
                                <tr>

                                    ${headers.map(function (header) {

                                        const value =
                                            row[header];

                                        return `
                                            <td>
                                                ${formatTableValue(
                                                    value
                                                )}
                                            </td>
                                        `;

                                    }).join("")}

                                </tr>
                            `;

                        }).join("")}

                    </tbody>

                </table>

            </div>

        </div>
    `;
}


/* =========================================================
   MODAL
   ========================================================= */

function openModal(
    title,
    content
) {

    let modal =
        document.querySelector(
            "#appModal"
        );


    if (!modal) {

        modal =
            document.createElement(
                "div"
            );

        modal.id =
            "appModal";

        modal.className =
            "modal";

        document.body.appendChild(
            modal
        );
    }


    modal.innerHTML = `

        <div class="modal-overlay"
             onclick="closeModal()">

            <div
                class="modal-dialog"
                onclick="event.stopPropagation()">

                <div class="modal-header">

                    <h2>
                        ${escapeHTML(title)}
                    </h2>

                    <button
                        type="button"
                        class="modal-close"
                        onclick="closeModal()">
                        ×
                    </button>

                </div>

                <div class="modal-body">

                    ${content}

                </div>

            </div>

        </div>
    `;


    modal.style.display =
        "block";
}


function closeModal() {

    const modal =
        document.querySelector(
            "#appModal"
        );


    if (modal) {

        modal.style.display =
            "none";
    }
}


/* =========================================================
   FORM HANDLER
   ========================================================= */

async function handleFormSubmit(
    action,
    form
) {

    switch (action) {

        case "saveProduct":
            await saveProduct(form);
            break;

        case "saveCustomer":
            await saveCustomer(form);
            break;

        case "saveSupplier":
            await saveSupplier(form);
            break;

        case "createSale":
            await createSale(form);
            break;

        case "createPurchase":
            await createPurchase(form);
            break;

        case "saveExpense":
            await saveExpense(form);
            break;

        case "saveSettings":
            await saveSettings(form);
            break;

        default:

            console.warn(
                "Unknown form action:",
                action
            );

            break;
    }
}


/* =========================================================
   FILTER
   ========================================================= */

function filterTable(
    keyword,
    tableId
) {

    const table =
        document.getElementById(
            tableId
        );


    if (!table) {
        return;
    }


    const rows =
        table.querySelectorAll(
            "tbody tr"
        );


    const search =
        String(
            keyword || ""
        )
        .toLowerCase()
        .trim();


    rows.forEach(function (row) {

        const text =
            row.textContent
                .toLowerCase();


        if (
            !search ||
            text.includes(search)
        ) {

            row.style.display =
                "";

        } else {

            row.style.display =
                "none";
        }

    });
}


/* =========================================================
   PRINT
   ========================================================= */

function printCurrentReport() {

    const table =
        document.querySelector(
            "#currentReportTable"
        );


    if (!table) {

        showToast(
            "ไม่พบรายงานสำหรับพิมพ์",
            "warning"
        );

        return;
    }


    const title =
        document.querySelector(
            "#reportResult h2"
        )?.textContent ||
        "รายงาน";


    printHTMLDocument(
        title,
        table.outerHTML
    );
}


function askPrintSale(sale) {

    const answer =
        confirm(
            "ต้องการพิมพ์ใบเสร็จหรือไม่?"
        );


    if (answer) {

        printSaleReceipt(sale);
    }
}


function printSaleReceipt(sale) {

    const html =
        createSaleReceiptHTML(
            sale
        );


    printHTMLDocument(
        "ใบเสร็จรับเงิน",
        html
    );
}


function createSaleReceiptHTML(
    sale
) {

    const shopName =
        AppState.settings.shopName ||
        AppState.settings["ชื่อร้าน"] ||
        "SHOP-LAAS";


    return `

        <div class="receipt-document">

            <div class="receipt-header">

                <h1>
                    ${escapeHTML(shopName)}
                </h1>

                <h2>
                    ใบเสร็จรับเงิน
                </h2>

            </div>

            <div class="receipt-info">

                <div>
                    เลขที่:
                    ${escapeHTML(
                        sale["เลขที่ขาย"] ||
                        sale.saleId ||
                        ""
                    )}
                </div>

                <div>
                    วันที่:
                    ${formatDate(
                        sale["วันที่"] ||
                        sale.date ||
                        ""
                    )}
                </div>

            </div>

            <table class="receipt-table">

                <thead>

                    <tr>
                        <th>รายการ</th>
                        <th>จำนวน</th>
                        <th>ราคา</th>
                        <th>รวม</th>
                    </tr>

                </thead>

                <tbody>

                    ${
                        sale.items
                            ? sale.items.map(
                                function (item) {

                                    const amount =
                                        Number(
                                            item.quantity ||
                                            0
                                        ) *
                                        Number(
                                            item.unitPrice ||
                                            0
                                        );

                                    return `
                                        <tr>

                                            <td>
                                                ${escapeHTML(
                                                    item.productName ||
                                                    item.productId ||
                                                    ""
                                                )}
                                            </td>

                                            <td>
                                                ${formatNumber(
                                                    item.quantity
                                                )}
                                            </td>

                                            <td>
                                                ${formatMoney(
                                                    item.unitPrice
                                                )}
                                            </td>

                                            <td>
                                                ${formatMoney(
                                                    amount
                                                )}
                                            </td>

                                        </tr>
                                    `;

                                }
                            ).join("")
                            : `
                                <tr>
                                    <td colspan="4">
                                        ไม่มีรายละเอียดรายการ
                                    </td>
                                </tr>
                            `
                    }

                </tbody>

            </table>

            <div class="receipt-total">

                <strong>
                    ยอดสุทธิ
                </strong>

                <strong>
                    ${formatMoney(
                        sale["ยอดรวม"] ||
                        sale.total ||
                        0
                    )}
                </strong>

            </div>

            <div class="receipt-footer">

                ขอบคุณที่ใช้บริการ

            </div>

        </div>
    `;
}


function printHTMLDocument(
    title,
    html
) {

    const printWindow =
        window.open(
            "",
            "_blank",
            "width=900,height=700"
        );


    if (!printWindow) {

        showToast(
            "เบราว์เซอร์บล็อกหน้าต่างพิมพ์ กรุณาอนุญาต Pop-up",
            "warning"
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
                ${escapeHTML(title)}
            </title>

            <style>

                * {
                    box-sizing: border-box;
                }

                body {
                    font-family:
                        Arial,
                        "Noto Sans Thai",
                        sans-serif;

                    margin: 0;

                    padding: 30px;

                    color: #111;
                }

                h1,
                h2,
                h3 {
                    margin-top: 0;
                }

                table {
                    width: 100%;
                    border-collapse: collapse;
                }

                th,
                td {
                    border: 1px solid #999;
                    padding: 8px;
                }

                th {
                    background: #eeeeee;
                }

                .text-right {
                    text-align: right;
                }

                .receipt-document {
                    max-width: 800px;
                    margin: 0 auto;
                }

                .receipt-header {
                    text-align: center;
                    margin-bottom: 25px;
                }

                .receipt-info {
                    display: flex;
                    justify-content:
                        space-between;

                    margin-bottom: 20px;
                }

                .receipt-total {
                    display: flex;
                    justify-content:
                        space-between;

                    border-top:
                        2px solid #222;

                    margin-top: 20px;

                    padding-top: 12px;

                    font-size: 20px;
                }

                .receipt-footer {
                    text-align: center;
                    margin-top: 40px;
                }

                @media print {

                    body {
                        padding: 0;
                    }

                    @page {
                        margin: 12mm;
                    }

                }

            </style>

        </head>

        <body>

            ${html}

        </body>

        </html>
    `);


    printWindow.document.close();


    printWindow.focus();


    setTimeout(
        function () {

            printWindow.print();

        },
        500
    );
}


/* =========================================================
   EXCEL EXPORT
   ========================================================= */

function exportTableToExcel(
    tableId,
    filename
) {

    const table =
        document.getElementById(
            tableId
        );


    if (!table) {

        showToast(
            "ไม่พบตารางสำหรับส่งออก",
            "warning"
        );

        return;
    }


    if (
        typeof XLSX ===
        "undefined"
    ) {

        showToast(
            "ไม่พบไลบรารี Excel กรุณาเพิ่ม SheetJS ใน index.html",
            "error"
        );

        return;
    }


    const workbook =
        XLSX.utils.table_to_book(
            table,
            {
                sheet: "ข้อมูล"
            }
        );


    XLSX.writeFile(
        workbook,
        filename ||
        "SHOP-LAAS.xlsx"
    );
}


/* =========================================================
   CSV EXPORT
   ========================================================= */

function exportRowsToCSV(
    rows,
    filename
) {

    if (!rows || !rows.length) {

        showToast(
            "ไม่มีข้อมูลสำหรับส่งออก",
            "warning"
        );

        return;
    }


    const headers =
        Object.keys(
            rows[0]
        );


    const csvRows = [];


    csvRows.push(
        headers.map(
            csvEscape
        ).join(",")
    );


    rows.forEach(function (row) {

        csvRows.push(

            headers.map(
                function (header) {

                    return csvEscape(
                        row[header]
                    );

                }
            ).join(",")

        );
    });


    const csv =
        "\uFEFF" +
        csvRows.join("\n");


    const blob =
        new Blob(
            [csv],
            {
                type:
                    "text/csv;charset=utf-8;"
            }
        );


    const url =
        URL.createObjectURL(
            blob
        );


    const link =
        document.createElement(
            "a"
        );


    link.href =
        url;


    link.download =
        filename ||
        "SHOP-LAAS.csv";


    document.body.appendChild(
        link
    );


    link.click();


    document.body.removeChild(
        link
    );


    URL.revokeObjectURL(
        url
    );
}


/* =========================================================
   PDF EXPORT
   ========================================================= */

function exportElementToPDF(
    elementId,
    filename
) {

    const element =
        document.getElementById(
            elementId
        );


    if (!element) {

        showToast(
            "ไม่พบข้อมูลสำหรับสร้าง PDF",
            "warning"
        );

        return;
    }


    if (
        typeof window.jspdf ===
        "undefined"
    ) {

        showToast(
            "ไม่พบไลบรารี PDF กรุณาเพิ่ม jsPDF ใน index.html",
            "error"
        );

        return;
    }


    const jsPDF =
        window.jspdf.jsPDF;


    const pdf =
        new jsPDF(
            {
                orientation: "portrait",
                unit: "mm",
                format: "a4"
            }
        );


    const title =
        AppState.settings.shopName ||
        AppState.settings["ชื่อร้าน"] ||
        "SHOP-LAAS";


    pdf.setFontSize(16);

    pdf.text(
        title,
        105,
        15,
        {
            align: "center"
        }
    );


    pdf.setFontSize(11);


    pdf.text(
        "รายงานจากระบบ SHOP-LAAS",
        105,
        22,
        {
            align: "center"
        }
    );


    const table =
        element.querySelector(
            "table"
        );


    if (
        table &&
        typeof pdf.autoTable ===
        "function"
    ) {

        const headers =
            Array.from(
                table.querySelectorAll(
                    "thead th"
                )
            )
            .map(
                function (th) {

                    return th.innerText;
                }
            );


        const body =
            Array.from(
                table.querySelectorAll(
                    "tbody tr"
                )
            )
            .map(
                function (tr) {

                    return Array.from(
                        tr.querySelectorAll(
                            "td"
                        )
                    )
                    .map(
                        function (td) {

                            return td.innerText;
                        }
                    );

                }
            );


        pdf.autoTable(
            {
                head: [headers],
                body: body,
                startY: 30,
                styles: {
                    fontSize: 8
                }
            }
        );

    } else {

        const text =
            element.innerText ||
            "";


        const lines =
            pdf.splitTextToSize(
                text,
                180
            );


        pdf.text(
            lines,
            15,
            35
        );
    }


    /*
     * สำคัญ:
     * pdf.save() จะดาวน์โหลดไฟล์ PDF
     * ลงเครื่องของผู้ใช้โดยตรง
     * ไม่ได้ส่งไฟล์ไปเก็บใน Google Drive
     */

    pdf.save(
        filename ||
        "SHOP-LAAS.pdf"
    );
}


/* =========================================================
   REPORT DATE
   ========================================================= */

function getReportStartDate() {

    const input =
        document.querySelector(
            "#reportStartDate"
        );


    if (
        input &&
        input.value
    ) {

        return input.value;
    }


    const date =
        new Date();


    date.setDate(
        date.getDate() -
        30
    );


    return toISODate(
        date
    );
}


function getReportEndDate() {

    const input =
        document.querySelector(
            "#reportEndDate"
        );


    if (
        input &&
        input.value
    ) {

        return input.value;
    }


    return getTodayISO();
}


/* =========================================================
   LOADING
   ========================================================= */

function setLoading(
    loading
) {

    AppState.loading =
        Boolean(loading);


    let element =
        document.querySelector(
            "#globalLoading"
        );


    if (!element) {

        element =
            document.createElement(
                "div"
            );

        element.id =
            "globalLoading";

        element.innerHTML = `
            <div class="global-loading-overlay">

                <div class="global-loading-box">

                    <div class="loading-spinner"></div>

                    <div>
                        กำลังประมวลผล...
                    </div>

                </div>

            </div>
        `;

        document.body.appendChild(
            element
        );
    }


    element.style.display =
        loading
            ? "block"
            : "none";
}


/* =========================================================
   TOAST
   ========================================================= */

function showToast(
    message,
    type = "info"
) {

    let container =
        document.querySelector(
            "#toastContainer"
        );


    if (!container) {

        container =
            document.createElement(
                "div"
            );

        container.id =
            "toastContainer";

        container.className =
            "toast-container";

        document.body.appendChild(
            container
        );
    }


    const toast =
        document.createElement(
            "div"
        );


    toast.className =
        "toast toast-" +
        type;


    toast.innerHTML =
        escapeHTML(
            message ||
            ""
        );


    container.appendChild(
        toast
    );


    setTimeout(
        function () {

            toast.classList.add(
                "show"
            );

        },
        10
    );


    setTimeout(
        function () {

            toast.classList.remove(
                "show"
            );


            setTimeout(
                function () {

                    if (
                        toast.parentNode
                    ) {

                        toast.parentNode.removeChild(
                            toast
                        );
                    }

                },
                300
            );

        },
        3500
    );
}


/* =========================================================
   FORM UTILITIES
   ========================================================= */

function formToObject(form) {

    const object = {};


    const formData =
        new FormData(form);


    formData.forEach(
        function (
            value,
            key
        ) {

            object[key] =
                value;
        }
    );


    return object;
}


/* =========================================================
   NUMBER FORMAT
   ========================================================= */

function formatMoney(
    value
) {

    const number =
        Number(
            value ||
            0
        );


    return number.toLocaleString(
        "th-TH",
        {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }
    );
}


function formatNumber(
    value
) {

    const number =
        Number(
            value ||
            0
        );


    return number.toLocaleString(
        "th-TH",
        {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2
        }
    );
}


/* =========================================================
   DATE FORMAT
   ========================================================= */

function formatDate(
    value
) {

    if (!value) {
        return "";
    }


    const date =
        parseDateValue(
            value
        );


    if (!date) {
        return String(value);
    }


    return date.toLocaleDateString(
        "th-TH",
        {
            day: "2-digit",
            month: "2-digit",
            year: "numeric"
        }
    );
}


function formatDateTime(
    value
) {

    if (!value) {
        return "";
    }


    const date =
        parseDateValue(
            value
        );


    if (!date) {
        return String(value);
    }


    return date.toLocaleString(
        "th-TH",
        {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        }
    );
}


function parseDateValue(
    value
) {

    if (
        value instanceof Date
    ) {

        return value;
    }


    const date =
        new Date(
            value
        );


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return null;
    }


    return date;
}


function getTodayISO() {

    return toISODate(
        new Date()
    );
}


function toISODate(
    date
) {

    const year =
        date.getFullYear();


    const month =
        String(
            date.getMonth() + 1
        )
        .padStart(
            2,
            "0"
        );


    const day =
        String(
            date.getDate()
        )
        .padStart(
            2,
            "0"
        );


    return (
        year +
        "-" +
        month +
        "-" +
        day
    );
}


/* =========================================================
   STOCK STATUS
   ========================================================= */

function getStockStatus(
    quantity
) {

    const number =
        Number(
            quantity ||
            0
        );


    if (number <= 0) {

        return `
            <span class="badge badge-danger">
                สินค้าหมด
            </span>
        `;
    }


    if (number <= 5) {

        return `
            <span class="badge badge-warning">
                ใกล้หมด
            </span>
        `;
    }


    return `
        <span class="badge badge-success">
            ปกติ
        </span>
    `;
}


/* =========================================================
   TABLE FORMAT
   ========================================================= */

function formatTableValue(
    value
) {

    if (
        value === null ||
        value === undefined
    ) {

        return "";
    }


    if (
        typeof value ===
        "number"
    ) {

        return formatMoney(
            value
        );
    }


    const text =
        String(value);


    if (
        /^\d{4}-\d{2}-\d{2}/.test(
            text
        )
    ) {

        return formatDate(
            text
        );
    }


    return escapeHTML(
        text
    );
}


/* =========================================================
   ESCAPE
   ========================================================= */

function escapeHTML(
    value
) {

    if (
        value === null ||
        value === undefined
    ) {

        return "";
    }


    return String(value)
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );
}


function escapeJS(
    value
) {

    if (
        value === null ||
        value === undefined
    ) {

        return "";
    }


    return String(value)
        .replace(
            /\\/g,
            "\\\\"
        )
        .replace(
            /'/g,
            "\\'"
        )
        .replace(
            /"/g,
            '\\"'
        )
        .replace(
            /\r/g,
            "\\r"
        )
        .replace(
            /\n/g,
            "\\n"
        );
}


function csvEscape(
    value
) {

    if (
        value === null ||
        value === undefined
    ) {

        return '""';
    }


    const text =
        String(value)
            .replace(
                /"/g,
                '""'
            );


    return '"' +
        text +
        '"';
}


/* =========================================================
   COMMON HTML
   ========================================================= */

function createLoadingHTML(
    message
) {

    return `
        <div class="loading-state">

            <div class="loading-spinner"></div>

            <p>
                ${escapeHTML(
                    message ||
                    "กำลังโหลด..."
                )}
            </p>

        </div>
    `;
}


function createErrorHTML(
    message
) {

    return `
        <div class="error-state">

            <div class="error-icon">
                !
            </div>

            <h2>
                เกิดข้อผิดพลาด
            </h2>

            <p>
                ${escapeHTML(
                    message ||
                    "ไม่สามารถโหลดข้อมูลได้"
                )}
            </p>

            <button
                class="btn btn-primary"
                onclick="navigateTo('dashboard')">
                กลับหน้าหลัก
            </button>

        </div>
    `;
}


/* =========================================================
   GLOBAL WINDOW EXPORTS
   ========================================================= */

window.login =
    login;

window.logout =
    logout;

window.navigateTo =
    navigateTo;

window.openModal =
    openModal;

window.closeModal =
    closeModal;

window.openProductModal =
    openProductModal;

window.editProduct =
    editProduct;

window.deleteProduct =
    deleteProduct;

window.openCustomerModal =
    openCustomerModal;

window.editCustomer =
    editCustomer;

window.deleteCustomer =
    deleteCustomer;

window.openSupplierModal =
    openSupplierModal;

window.editSupplier =
    editSupplier;

window.deleteSupplier =
    deleteSupplier;

window.openSaleModal =
    openSaleModal;

window.addSaleItemRow =
    addSaleItemRow;

window.removeSaleItemRow =
    removeSaleItemRow;

window.updateSaleItemPrice =
    updateSaleItemPrice;

window.updateSaleTotals =
    updateSaleTotals;

window.openPurchaseModal =
    openPurchaseModal;

window.addPurchaseItemRow =
    addPurchaseItemRow;

window.removePurchaseItemRow =
    removePurchaseItemRow;

window.updatePurchaseItemPrice =
    updatePurchaseItemPrice;

window.updatePurchaseTotals =
    updatePurchaseTotals;

window.openExpenseModal =
    openExpenseModal;

window.loadSalesReport =
    loadSalesReport;

window.loadPurchaseReport =
    loadPurchaseReport;

window.loadExpenseReport =
    loadExpenseReport;

window.loadJournalReport =
    loadJournalReport;

window.printCurrentReport =
    printCurrentReport;

window.printSaleReceipt =
    printSaleReceipt;

window.exportTableToExcel =
    exportTableToExcel;

window.exportRowsToCSV =
    exportRowsToCSV;

window.exportElementToPDF =
    exportElementToPDF;

window.handleLoginForm =
    handleLoginForm;


/* =========================================================
   END OF app.js
   ========================================================= */
