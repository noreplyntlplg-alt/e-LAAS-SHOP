/**
 * PERSONAL SHOP ACCOUNTING SYSTEM
 * Google Apps Script + Google Sheets
 *
 * ระบบบัญชีร้านค้าทั่วไป
 * ภาษา: ไทย
 * ฟอนต์เอกสาร: TH Sarabun New
 *
 * หมายเหตุ:
 * 1. เรียก setupSystem() หนึ่งครั้งเพื่อสร้างฐานข้อมูล
 * 2. ระบบใช้ Spreadsheet จริง ไม่ใช้ข้อมูลจำลอง
 * 3. เปลี่ยนรหัสผ่านเริ่มต้นทันทีหลังเข้าสู่ระบบ
 * 4. ห้ามเปิดเผย Script Properties หรือ Session Token
 */

const APP = Object.freeze({
  NAME: 'ระบบบัญชีคอมพิวเตอร์ส่วนบุคคลประเภทร้านค้าทั่วไป',
  VERSION: '1.0.0',
  TIMEZONE: 'Asia/Bangkok',
  CURRENCY: 'THB',
  FONT: 'TH Sarabun New',
  SESSION_HOURS: 8,
  SESSION_PREFIX: 'ACCOUNT_SESSION_',
  DB_PROPERTY: 'ACCOUNTING_SPREADSHEET_ID',
  INITIAL_ADMIN: 'sxaiq54',
  INITIAL_PASSWORD: 'Sxxnga2011.54'
});

const SCHEMAS = {
  Users: [
    'id', 'username', 'passwordHash', 'name', 'role',
    'status', 'createdAt', 'updatedAt', 'lastLogin'
  ],
  Settings: [
    'key', 'value', 'updatedAt'
  ],
  Products: [
    'id', 'code', 'name', 'category', 'unit',
    'costPrice', 'sellPrice', 'quantity', 'minQuantity',
    'status', 'createdAt', 'updatedAt'
  ],
  Customers: [
    'id', 'code', 'name', 'phone', 'address',
    'taxId', 'email', 'note', 'status',
    'createdAt', 'updatedAt'
  ],
  Suppliers: [
    'id', 'code', 'name', 'phone', 'address',
    'taxId', 'email', 'note', 'status',
    'createdAt', 'updatedAt'
  ],
  Transactions: [
    'id', 'documentNo', 'date', 'type', 'category',
    'description', 'amount', 'paymentMethod',
    'customerId', 'supplierId', 'reference',
    'createdBy', 'status', 'createdAt', 'updatedAt'
  ],
  Receipts: [
    'id', 'documentNo', 'date', 'customerId',
    'description', 'amount', 'paymentMethod',
    'reference', 'createdBy', 'status',
    'createdAt', 'updatedAt'
  ],
  Payments: [
    'id', 'documentNo', 'date', 'supplierId',
    'description', 'amount', 'paymentMethod',
    'reference', 'createdBy', 'status',
    'createdAt', 'updatedAt'
  ],
  JournalEntries: [
    'id', 'documentNo', 'date', 'description',
    'reference', 'debitTotal', 'creditTotal',
    'createdBy', 'status', 'createdAt', 'updatedAt'
  ],
  JournalLines: [
    'id', 'journalId', 'accountCode', 'accountName',
    'description', 'debit', 'credit', 'lineNo'
  ],
  Accounts: [
    'code', 'name', 'type', 'normalBalance',
    'parentCode', 'status'
  ],
  StockMovements: [
    'id', 'date', 'productId', 'movementType',
    'quantity', 'unitCost', 'reference',
    'description', 'createdBy', 'createdAt'
  ],
  AuditLogs: [
    'id', 'timestamp', 'username', 'action',
    'entity', 'recordId', 'details'
  ],
  DocumentCounters: [
    'key', 'value'
  ]
};

const DEFAULT_ACCOUNTS = [
  ['1000', 'เงินสด', 'Asset', 'Debit', '', 'Active'],
  ['1010', 'เงินฝากธนาคาร', 'Asset', 'Debit', '', 'Active'],
  ['1100', 'ลูกหนี้การค้า', 'Asset', 'Debit', '', 'Active'],
  ['1200', 'สินค้าคงเหลือ', 'Asset', 'Debit', '', 'Active'],
  ['2000', 'เจ้าหนี้การค้า', 'Liability', 'Credit', '', 'Active'],
  ['2100', 'เงินกู้ยืม', 'Liability', 'Credit', '', 'Active'],
  ['3000', 'ทุนเจ้าของ', 'Equity', 'Credit', '', 'Active'],
  ['3100', 'กำไรสะสม', 'Equity', 'Credit', '', 'Active'],
  ['4000', 'รายได้จากการขาย', 'Revenue', 'Credit', '', 'Active'],
  ['4100', 'รายได้อื่น', 'Revenue', 'Credit', '', 'Active'],
  ['5000', 'ต้นทุนขาย', 'Expense', 'Debit', '', 'Active'],
  ['6000', 'ค่าใช้จ่ายทั่วไป', 'Expense', 'Debit', '', 'Active'],
  ['6100', 'ค่าเช่า', 'Expense', 'Debit', '', 'Active'],
  ['6200', 'ค่าสาธารณูปโภค', 'Expense', 'Debit', '', 'Active'],
  ['6300', 'ค่าใช้จ่ายเงินเดือน', 'Expense', 'Debit', '', 'Active']
];

/* =========================================================
   WEB APP
========================================================= */

function doGet() {
  return HtmlService.createTemplateFromFile('index')
    .evaluate()
    .setTitle(APP.NAME)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.SAMEORIGIN);
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/* =========================================================
   INSTALLATION
========================================================= */

function setupSystem() {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    let ss = getDatabase_();

    if (!ss) {
      ss = SpreadsheetApp.create(APP.NAME + ' - ฐานข้อมูล');
      PropertiesService.getScriptProperties()
        .setProperty(APP.DB_PROPERTY, ss.getId());
    }

    Object.keys(SCHEMAS).forEach(function(sheetName) {
      let sh = ss.getSheetByName(sheetName);

      if (!sh) {
        sh = ss.insertSheet(sheetName);
      }

      const headers = SCHEMAS[sheetName];
      const current = sh.getRange(1, 1, 1, headers.length)
        .getValues()[0];

      const empty = current.every(function(v) {
        return v === '';
      });

      if (empty) {
        sh.getRange(1, 1, 1, headers.length).setValues([headers]);
      }

      sh.setFrozenRows(1);
      sh.getRange(1, 1, 1, headers.length)
        .setFontFamily(APP.FONT)
        .setFontSize(14)
        .setFontWeight('bold')
        .setBackground('#17365D')
        .setFontColor('#FFFFFF');

      sh.getDataRange().setFontFamily(APP.FONT);
      sh.autoResizeColumns(1, headers.length);
    });

    seedAccounts_(ss);
    seedSettings_(ss);
    seedAdmin_(ss);

    SpreadsheetApp.flush();

    return {
      success: true,
      message: 'ติดตั้งระบบและตรวจสอบฐานข้อมูลเรียบร้อย',
      spreadsheetId: ss.getId(),
      spreadsheetUrl: ss.getUrl()
    };

  } finally {
    lock.releaseLock();
  }
}

function getDatabase_() {
  const id = PropertiesService.getScriptProperties()
    .getProperty(APP.DB_PROPERTY);

  if (id) {
    try {
      return SpreadsheetApp.openById(id);
    } catch (err) {
      throw new Error('ไม่สามารถเปิดฐานข้อมูลได้ กรุณาตรวจสอบสิทธิ์');
    }
  }

  const active = SpreadsheetApp.getActiveSpreadsheet();

  if (active) {
    PropertiesService.getScriptProperties()
      .setProperty(APP.DB_PROPERTY, active.getId());
    return active;
  }

  return null;
}

function requireDatabase_() {
  const ss = getDatabase_();

  if (!ss) {
    throw new Error('ยังไม่ได้ติดตั้งระบบ กรุณาเรียก setupSystem() ก่อน');
  }

  return ss;
}

function seedAccounts_(ss) {
  const sh = ss.getSheetByName('Accounts');

  if (sh.getLastRow() <= 1) {
    sh.getRange(2, 1, DEFAULT_ACCOUNTS.length, 6)
      .setValues(DEFAULT_ACCOUNTS);
  }
}

function seedSettings_(ss) {
  const sh = ss.getSheetByName('Settings');

  if (sh.getLastRow() > 1) return;

  const rows = [
    ['businessName', 'ร้านค้าทั่วไป', new Date()],
    ['businessAddress', '', new Date()],
    ['businessPhone', '', new Date()],
    ['businessTaxId', '', new Date()],
    ['currency', 'THB', new Date()],
    ['documentFont', APP.FONT, new Date()],
    ['fiscalYearStartMonth', '1', new Date()],
    ['systemVersion', APP.VERSION, new Date()]
  ];

  sh.getRange(2, 1, rows.length, 3).setValues(rows);
}

function seedAdmin_(ss) {
  const sh = ss.getSheetByName('Users');

  if (sh.getLastRow() > 1) return;

  const now = new Date();

  sh.appendRow([
    Utilities.getUuid(),
    APP.INITIAL_ADMIN,
    hashPassword_(APP.INITIAL_PASSWORD),
    'ผู้ดูแลระบบ',
    'Admin',
    'Active',
    now,
    now,
    ''
  ]);
}

/* =========================================================
   AUTHENTICATION
========================================================= */

function apiLogin(username, password) {
  try {
    username = String(username || '').trim();
    password = String(password || '');

    if (!username || !password) {
      return {
        success: false,
        message: 'กรุณากรอกชื่อผู้ใช้และรหัสผ่าน'
      };
    }

    const users = readRows_('Users');
    const user = users.find(function(u) {
      return String(u.username).toLowerCase() === username.toLowerCase();
    });

    if (!user || user.status !== 'Active') {
      return {
        success: false,
        message: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง'
      };
    }

    if (user.passwordHash !== hashPassword_(password)) {
      return {
        success: false,
        message: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง'
      };
    }

    const token = Utilities.getUuid() + Utilities.getUuid();
    const session = {
      userId: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
      createdAt: Date.now()
    };

    CacheService.getScriptCache().put(
      APP.SESSION_PREFIX + token,
      JSON.stringify(session),
      APP.SESSION_HOURS * 3600
    );

    updateRecord_('Users', user.id, {
      lastLogin: new Date(),
      updatedAt: new Date()
    });

    audit_(session, 'LOGIN', 'Users', user.id, 'เข้าสู่ระบบ');

    return {
      success: true,
      token: token,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role
      }
    };

  } catch (err) {
    return {
      success: false,
      message: err.message
    };
  }
}

function apiLogout(token) {
  const session = getSession_(token);
  CacheService.getScriptCache()
    .remove(APP.SESSION_PREFIX + token);

  audit_(session, 'LOGOUT', 'Users', session.userId, 'ออกจากระบบ');

  return { success: true };
}

function getSession_(token) {
  if (!token) {
    throw new Error('กรุณาเข้าสู่ระบบใหม่');
  }

  const raw = CacheService.getScriptCache()
    .get(APP.SESSION_PREFIX + token);

  if (!raw) {
    throw new Error('Session หมดอายุ กรุณาเข้าสู่ระบบใหม่');
  }

  return JSON.parse(raw);
}

function requireAdmin_(session) {
  if (session.role !== 'Admin') {
    throw new Error('ไม่มีสิทธิ์ดำเนินการ');
  }
}

function hashPassword_(password) {
  const bytes = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    String(password),
    Utilities.Charset.UTF_8
  );

  return bytes.map(function(b) {
    const v = (b + 256) % 256;
    return ('0' + v.toString(16)).slice(-2);
  }).join('');
}

/* =========================================================
   INITIAL DATA
========================================================= */

function apiGetBootstrap(token) {
  const session = getSession_(token);

  return {
    success: true,
    app: {
      name: APP.NAME,
      version: APP.VERSION,
      font: APP.FONT
    },
    user: {
      id: session.userId,
      username: session.username,
      name: session.name,
      role: session.role
    },
    settings: getSettings_(),
    accounts: readRows_('Accounts')
  };
}

function apiHealthCheck(token) {
  getSession_(token);

  const ss = requireDatabase_();

  return {
    success: true,
    database: ss.getName(),
    timestamp: Utilities.formatDate(
      new Date(),
      APP.TIMEZONE,
      'yyyy-MM-dd HH:mm:ss'
    ),
    sheets: Object.keys(SCHEMAS).map(function(name) {
      const sh = ss.getSheetByName(name);

      return {
        name: name,
        exists: !!sh,
        rows: sh ? Math.max(0, sh.getLastRow() - 1) : 0
      };
    })
  };
}

/* =========================================================
   GENERIC DATA ACCESS
========================================================= */

function apiList(token, entity, options) {
  getSession_(token);

  if (!SCHEMAS[entity]) {
    throw new Error('ไม่พบประเภทข้อมูล');
  }

  options = options || {};

  let rows = readRows_(entity);

  if (options.status) {
    rows = rows.filter(function(r) {
      return String(r.status) === String(options.status);
    });
  }

  if (options.search) {
    const q = String(options.search).toLowerCase();

    rows = rows.filter(function(row) {
      return Object.keys(row).some(function(key) {
        return String(row[key] == null ? '' : row[key])
          .toLowerCase().indexOf(q) !== -1;
      });
    });
  }

  if (options.startDate || options.endDate) {
    rows = rows.filter(function(row) {
      if (!row.date) return true;

      const d = normalizeDate_(row.date);

      if (options.startDate && d < String(options.startDate)) {
        return false;
      }

      if (options.endDate && d > String(options.endDate)) {
        return false;
      }

      return true;
    });
  }

  rows.sort(function(a, b) {
    return String(b.createdAt || b.date || '')
      .localeCompare(String(a.createdAt || a.date || ''));
  });

  const total = rows.length;
  const page = Math.max(1, Number(options.page || 1));
  const pageSize = Math.min(500, Math.max(1, Number(options.pageSize || 100)));
  const start = (page - 1) * pageSize;

  return {
    success: true,
    data: rows.slice(start, start + pageSize),
    total: total,
    page: page,
    pageSize: pageSize
  };
}

function apiSave(token, entity, payload) {
  const session = getSession_(token);

  if (!SCHEMAS[entity]) {
    throw new Error('ไม่รองรับข้อมูลประเภทนี้');
  }

  if (['JournalEntries', 'JournalLines', 'StockMovements',
       'Users', 'Accounts', 'Settings'].indexOf(entity) !== -1) {
    throw new Error('ข้อมูลประเภทนี้ต้องบันทึกผ่านฟังก์ชันเฉพาะ');
  }

  payload = payload || {};

  const schema = SCHEMAS[entity];
  const allowed = {};
  schema.forEach(function(key) {
    if (Object.prototype.hasOwnProperty.call(payload, key)) {
      allowed[key] = payload[key];
    }
  });

  validateEntity_(entity, allowed);

  const now = new Date();

  if (allowed.id) {
    const old = findById_(entity, allowed.id);

    if (!old) {
      throw new Error('ไม่พบรายการที่ต้องการแก้ไข');
    }

    allowed.updatedAt = now;

    updateRecord_(entity, allowed.id, allowed);

    audit_(session, 'UPDATE', entity, allowed.id, 'แก้ไขข้อมูล');

    return {
      success: true,
      id: allowed.id,
      message: 'แก้ไขข้อมูลเรียบร้อย'
    };
  }

  allowed.id = Utilities.getUuid();
  allowed.createdAt = now;
  allowed.updatedAt = now;

  if (schema.indexOf('status') !== -1 && !allowed.status) {
    allowed.status = 'Active';
  }

  if (schema.indexOf('code') !== -1 && !allowed.code) {
    allowed.code = nextDocumentNo_(entity);
  }

  appendObject_(entity, allowed);

  audit_(session, 'CREATE', entity, allowed.id, 'เพิ่มข้อมูล');

  return {
    success: true,
    id: allowed.id,
    message: 'บันทึกข้อมูลเรียบร้อย'
  };
}

function apiDelete(token, entity, id) {
  const session = getSession_(token);

  if (!SCHEMAS[entity]) {
    throw new Error('ไม่พบประเภทข้อมูล');
  }

  if (['JournalEntries', 'JournalLines', 'StockMovements',
       'Accounts', 'Settings', 'Users'].indexOf(entity) !== -1) {
    throw new Error('ไม่อนุญาตให้ลบข้อมูลประเภทนี้โดยตรง');
  }

  const row = findById_(entity, id);

  if (!row) {
    throw new Error('ไม่พบรายการ');
  }

  updateRecord_(entity, id, {
    status: 'Deleted',
    updatedAt: new Date()
  });

  audit_(session, 'DELETE', entity, id, 'ทำเครื่องหมายลบ');

  return {
    success: true,
    message: 'ยกเลิกรายการเรียบร้อย'
  };
}

function validateEntity_(entity, data) {
  const required = {
    Products: ['name'],
    Customers: ['name'],
    Suppliers: ['name'],
    Transactions: ['date', 'type', 'amount', 'description'],
    Receipts: ['date', 'amount'],
    Payments: ['date', 'amount']
  };

  (required[entity] || []).forEach(function(field) {
    if (data[field] === undefined ||
        data[field] === null ||
        data[field] === '') {
      throw new Error('กรุณากรอกข้อมูล ' + field);
    }
  });

  if (data.amount !== undefined) {
    data.amount = Number(data.amount);

    if (!Number.isFinite(data.amount) || data.amount < 0) {
      throw new Error('จำนวนเงินไม่ถูกต้อง');
    }
  }

  ['costPrice', 'sellPrice', 'quantity', 'minQuantity'].forEach(function(k) {
    if (data[k] !== undefined) {
      data[k] = Number(data[k]);

      if (!Number.isFinite(data[k])) {
        throw new Error('ค่าตัวเลขไม่ถูกต้อง: ' + k);
      }
    }
  });
}

/* =========================================================
   DASHBOARD
========================================================= */

function apiGetDashboard(token, filters) {
  getSession_(token);

  filters = filters || {};

  const start = filters.startDate || firstDayOfMonth_();
  const end = filters.endDate || today_();

  const transactions = readRows_('Transactions')
    .filter(isActive_);

  const period = transactions.filter(function(t) {
    const d = normalizeDate_(t.date);
    return d >= start && d <= end;
  });

  const income = period
    .filter(function(t) {
      return t.type === 'Income';
    })
    .reduce(function(sum, t) {
      return sum + Number(t.amount || 0);
    }, 0);

  const expense = period
    .filter(function(t) {
      return t.type === 'Expense';
    })
    .reduce(function(sum, t) {
      return sum + Number(t.amount || 0);
    }, 0);

  const products = readRows_('Products').filter(isActive_);

  const lowStock = products.filter(function(p) {
    return Number(p.quantity || 0) <= Number(p.minQuantity || 0);
  });

  const stockValue = products.reduce(function(sum, p) {
    return sum + Number(p.quantity || 0) *
      Number(p.costPrice || 0);
  }, 0);

  const customers = readRows_('Customers').filter(isActive_);
  const suppliers = readRows_('Suppliers').filter(isActive_);

  return {
    success: true,
    period: {
      startDate: start,
      endDate: end
    },
    summary: {
      income: income,
      expense: expense,
      net: income - expense,
      transactionCount: period.length,
      productCount: products.length,
      lowStockCount: lowStock.length,
      stockValue: stockValue,
      customerCount: customers.length,
      supplierCount: suppliers.length
    },
    recentTransactions: period.slice(-10).reverse(),
    lowStockProducts: lowStock.slice(0, 20)
  };
}

/* =========================================================
   JOURNAL ENTRIES
========================================================= */

function apiCreateJournal(token, payload) {
  const session = getSession_(token);
  payload = payload || {};

  const lines = Array.isArray(payload.lines) ? payload.lines : [];

  if (lines.length < 2) {
    throw new Error('รายการบัญชีต้องมีอย่างน้อย 2 บรรทัด');
  }

  let debitTotal = 0;
  let creditTotal = 0;

  lines.forEach(function(line) {
    const debit = Number(line.debit || 0);
    const credit = Number(line.credit || 0);

    if (debit < 0 || credit < 0 ||
        !Number.isFinite(debit) ||
        !Number.isFinite(credit)) {
      throw new Error('ยอดเดบิตหรือเครดิตไม่ถูกต้อง');
    }

    if ((debit > 0 && credit > 0) ||
        (debit === 0 && credit === 0)) {
      throw new Error('แต่ละบรรทัดต้องมีเดบิตหรือเครดิตเพียงด้านเดียว');
    }

    debitTotal += debit;
    creditTotal += credit;
  });

  debitTotal = roundMoney_(debitTotal);
  creditTotal = roundMoney_(creditTotal);

  if (debitTotal <= 0 || debitTotal !== creditTotal) {
    throw new Error('รายการบัญชีไม่สมดุล เดบิตต้องเท่ากับเครดิต');
  }

  const accounts = readRows_('Accounts');

  lines.forEach(function(line) {
    const account = accounts.find(function(a) {
      return String(a.code) === String(line.accountCode) &&
        a.status === 'Active';
    });

    if (!account) {
      throw new Error('ไม่พบรหัสบัญชี ' + line.accountCode);
    }
  });

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    const id = Utilities.getUuid();
    const docNo = nextDocumentNo_('JournalEntries');
    const now = new Date();

    appendObject_('JournalEntries', {
      id: id,
      documentNo: docNo,
      date: payload.date || today_(),
      description: String(payload.description || ''),
      reference: String(payload.reference || ''),
      debitTotal: debitTotal,
      creditTotal: creditTotal,
      createdBy: session.username,
      status: 'Posted',
      createdAt: now,
      updatedAt: now
    });

    lines.forEach(function(line, index) {
      appendObject_('JournalLines', {
        id: Utilities.getUuid(),
        journalId: id,
        accountCode: String(line.accountCode),
        accountName: String(line.accountName || ''),
        description: String(line.description || ''),
        debit: Number(line.debit || 0),
        credit: Number(line.credit || 0),
        lineNo: index + 1
      });
    });

    audit_(session, 'CREATE_JOURNAL', 'JournalEntries', id, docNo);

    return {
      success: true,
      id: id,
      documentNo: docNo,
      message: 'บันทึกสมุดรายวันเรียบร้อย'
    };

  } finally {
    lock.releaseLock();
  }
}

function apiGetJournal(token, journalId) {
  getSession_(token);

  const entry = findById_('JournalEntries', journalId);

  if (!entry) {
    throw new Error('ไม่พบรายการสมุดรายวัน');
  }

  const lines = readRows_('JournalLines')
    .filter(function(line) {
      return String(line.journalId) === String(journalId);
    })
    .sort(function(a, b) {
      return Number(a.lineNo) - Number(b.lineNo);
    });

  return {
    success: true,
    entry: entry,
    lines: lines
  };
}

/* =========================================================
   STOCK MOVEMENT
========================================================= */

function apiStockMovement(token, payload) {
  const session = getSession_(token);
  payload = payload || {};

  const product = findById_('Products', payload.productId);

  if (!product || product.status !== 'Active') {
    throw new Error('ไม่พบสินค้า หรือสินค้าไม่พร้อมใช้งาน');
  }

  const quantity = Number(payload.quantity);

  if (!Number.isFinite(quantity) || quantity <= 0) {
    throw new Error('จำนวนสินค้าต้องมากกว่า 0');
  }

  const type = String(payload.movementType || '');

  if (['IN', 'OUT', 'ADJUST'].indexOf(type) === -1) {
    throw new Error('ประเภทการเคลื่อนไหวสินค้าไม่ถูกต้อง');
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    const current = Number(product.quantity || 0);
    let next = current;

    if (type === 'IN') next += quantity;
    if (type === 'OUT') next -= quantity;
    if (type === 'ADJUST') next = quantity;

    if (next < 0) {
      throw new Error('จำนวนสินค้าไม่เพียงพอ');
    }

    updateRecord_('Products', product.id, {
      quantity: next,
      updatedAt: new Date()
    });

    const movementId = Utilities.getUuid();

    appendObject_('StockMovements', {
      id: movementId,
      date: payload.date || today_(),
      productId: product.id,
      movementType: type,
      quantity: quantity,
      unitCost: Number(payload.unitCost || product.costPrice || 0),
      reference: String(payload.reference || ''),
      description: String(payload.description || ''),
      createdBy: session.username,
      createdAt: new Date()
    });

    audit_(session, 'STOCK_MOVEMENT', 'Products', product.id,
      type + ' ' + quantity);

    return {
      success: true,
      movementId: movementId,
      previousQuantity: current,
      newQuantity: next
    };

  } finally {
    lock.releaseLock();
  }
}

/* =========================================================
   REPORTS
========================================================= */

function apiGetReport(token, reportType, filters) {
  getSession_(token);

  filters = filters || {};

  const start = filters.startDate || firstDayOfMonth_();
  const end = filters.endDate || today_();

  if (reportType === 'income-expense') {
    return reportIncomeExpense_(start, end);
  }

  if (reportType === 'trial-balance') {
    return reportTrialBalance_(start, end);
  }

  if (reportType === 'stock') {
    return reportStock_();
  }

  if (reportType === 'transactions') {
    return reportTransactions_(start, end);
  }

  throw new Error('ไม่รองรับรายงานประเภทนี้');
}

function reportIncomeExpense_(start, end) {
  const rows = readRows_('Transactions')
    .filter(isActive_)
    .filter(function(t) {
      const d = normalizeDate_(t.date);
      return d >= start && d <= end;
    });

  const income = rows.filter(function(t) {
    return t.type === 'Income';
  });

  const expense = rows.filter(function(t) {
    return t.type === 'Expense';
  });

  const sum = function(list) {
    return roundMoney_(list.reduce(function(total, item) {
      return total + Number(item.amount || 0);
    }, 0));
  };

  return {
    success: true,
    reportType: 'income-expense',
    startDate: start,
    endDate: end,
    income: sum(income),
    expense: sum(expense),
    net: roundMoney_(sum(income) - sum(expense)),
    rows: rows
  };
}

function reportTrialBalance_(start, end) {
  const accounts = readRows_('Accounts')
    .filter(function(a) {
      return a.status === 'Active';
    });

  const entries = readRows_('JournalEntries')
    .filter(function(e) {
      return e.status === 'Posted';
    })
    .filter(function(e) {
      const d = normalizeDate_(e.date);
      return d >= start && d <= end;
    });

  const entryIds = {};
  entries.forEach(function(e) {
    entryIds[String(e.id)] = true;
  });

  const lines = readRows_('JournalLines')
    .filter(function(line) {
      return !!entryIds[String(line.journalId)];
    });

  const result = accounts.map(function(account) {
    const related = lines.filter(function(line) {
      return String(line.accountCode) === String(account.code);
    });

    const debit = roundMoney_(related.reduce(function(s, line) {
      return s + Number(line.debit || 0);
    }, 0));

    const credit = roundMoney_(related.reduce(function(s, line) {
      return s + Number(line.credit || 0);
    }, 0));

    return {
      code: account.code,
      name: account.name,
      type: account.type,
      debit: debit,
      credit: credit,
      balance: roundMoney_(debit - credit)
    };
  });

  return {
    success: true,
    reportType: 'trial-balance',
    startDate: start,
    endDate: end,
    rows: result,
    totalDebit: roundMoney_(result.reduce(function(s, r) {
      return s + r.debit;
    }, 0)),
    totalCredit: roundMoney_(result.reduce(function(s, r) {
      return s + r.credit;
    }, 0))
  };
}

function reportStock_() {
  const rows = readRows_('Products')
    .filter(isActive_)
    .map(function(p) {
      const quantity = Number(p.quantity || 0);
      const cost = Number(p.costPrice || 0);

      return {
        id: p.id,
        code: p.code,
        name: p.name,
        quantity: quantity,
        unit: p.unit,
        costPrice: cost,
        stockValue: roundMoney_(quantity * cost),
        minQuantity: Number(p.minQuantity || 0),
        lowStock: quantity <= Number(p.minQuantity || 0)
      };
    });

  return {
    success: true,
    reportType: 'stock',
    rows: rows,
    totalValue: roundMoney_(rows.reduce(function(s, p) {
      return s + p.stockValue;
    }, 0))
  };
}

function reportTransactions_(start, end) {
  const rows = readRows_('Transactions')
    .filter(isActive_)
    .filter(function(t) {
      const d = normalizeDate_(t.date);
      return d >= start && d <= end;
    });

  return {
    success: true,
    reportType: 'transactions',
    rows: rows
  };
}

/* =========================================================
   SETTINGS
========================================================= */

function apiGetSettings(token) {
  getSession_(token);

  return {
    success: true,
    settings: getSettings_()
  };
}

function apiSaveSettings(token, settings) {
  const session = getSession_(token);
  requireAdmin_(session);

  settings = settings || {};

  const allowed = [
    'businessName',
    'businessAddress',
    'businessPhone',
    'businessTaxId',
    'currency',
    'documentFont',
    'fiscalYearStartMonth'
  ];

  const sh = requireDatabase_().getSheetByName('Settings');
  const rows = readRows_('Settings');

  allowed.forEach(function(key) {
    if (!Object.prototype.hasOwnProperty.call(settings, key)) return;

    const existing = rows.find(function(r) {
      return r.key === key;
    });

    if (existing) {
      updateByKey_('Settings', 'key', key, {
        value: String(settings[key]),
        updatedAt: new Date()
      });
    } else {
      appendObject_('Settings', {
        key: key,
        value: String(settings[key]),
        updatedAt: new Date()
      });
    }
  });

  audit_(session, 'SAVE_SETTINGS', 'Settings', '', 'ปรับปรุงการตั้งค่า');

  return {
    success: true,
    message: 'บันทึกการตั้งค่าเรียบร้อย'
  };
}

function getSettings_() {
  const rows = readRows_('Settings');
  const result = {};

  rows.forEach(function(r) {
    result[String(r.key)] = r.value;
  });

  return result;
}

/* =========================================================
   USERS
========================================================= */

function apiListUsers(token) {
  const session = getSession_(token);
  requireAdmin_(session);

  const users = readRows_('Users').map(function(u) {
    return {
      id: u.id,
      username: u.username,
      name: u.name,
      role: u.role,
      status: u.status,
      createdAt: u.createdAt,
      lastLogin: u.lastLogin
    };
  });

  return {
    success: true,
    data: users
  };
}

function apiCreateUser(token, payload) {
  const session = getSession_(token);
  requireAdmin_(session);

  payload = payload || {};

  const username = String(payload.username || '').trim();
  const password = String(payload.password || '');
  const name = String(payload.name || '').trim();
  const role = String(payload.role || 'Staff');

  if (!username || !password || !name) {
    throw new Error('กรุณากรอกชื่อผู้ใช้ รหัสผ่าน และชื่อผู้ใช้งาน');
  }

  if (password.length < 8) {
    throw new Error('รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร');
  }

  if (['Admin', 'Staff', 'Viewer'].indexOf(role) === -1) {
    throw new Error('ระดับผู้ใช้ไม่ถูกต้อง');
  }

  const exists = readRows_('Users').some(function(u) {
    return String(u.username).toLowerCase() === username.toLowerCase();
  });

  if (exists) {
    throw new Error('ชื่อผู้ใช้นี้มีอยู่แล้ว');
  }

  const id = Utilities.getUuid();
  const now = new Date();

  appendObject_('Users', {
    id: id,
    username: username,
    passwordHash: hashPassword_(password),
    name: name,
    role: role,
    status: 'Active',
    createdAt: now,
    updatedAt: now,
    lastLogin: ''
  });

  audit_(session, 'CREATE_USER', 'Users', id, username);

  return {
    success: true,
    id: id,
    message: 'สร้างผู้ใช้งานเรียบร้อย'
  };
}

function apiSetUserStatus(token, userId, status) {
  const session = getSession_(token);
  requireAdmin_(session);

  if (String(userId) === String(session.userId)) {
    throw new Error('ไม่สามารถปิดใช้งานบัญชีของตนเองได้');
  }

  if (['Active', 'Inactive'].indexOf(status) === -1) {
    throw new Error('สถานะไม่ถูกต้อง');
  }

  updateRecord_('Users', userId, {
    status: status,
    updatedAt: new Date()
  });

  audit_(session, 'USER_STATUS', 'Users', userId, status);

  return {
    success: true,
    message: 'ปรับสถานะผู้ใช้งานเรียบร้อย'
  };
}

function apiChangePassword(token, oldPassword, newPassword) {
  const session = getSession_(token);
  const user = findById_('Users', session.userId);

  if (!user || user.passwordHash !== hashPassword_(oldPassword)) {
    throw new Error('รหัสผ่านเดิมไม่ถูกต้อง');
  }

  if (String(newPassword || '').length < 8) {
    throw new Error('รหัสผ่านใหม่ต้องมีอย่างน้อย 8 ตัวอักษร');
  }

  updateRecord_('Users', user.id, {
    passwordHash: hashPassword_(newPassword),
    updatedAt: new Date()
  });

  audit_(session, 'CHANGE_PASSWORD', 'Users', user.id, 'เปลี่ยนรหัสผ่าน');

  return {
    success: true,
    message: 'เปลี่ยนรหัสผ่านเรียบร้อย'
  };
}

/* =========================================================
   AUDIT LOGS
========================================================= */

function apiGetAuditLogs(token, options) {
  const session = getSession_(token);
  requireAdmin_(session);

  options = options || {};

  let rows = readRows_('AuditLogs').reverse();

  const limit = Math.min(500, Math.max(1, Number(options.limit || 100)));

  return {
    success: true,
    data: rows.slice(0, limit)
  };
}

function audit_(session, action, entity, recordId, details) {
  try {
    appendObject_('AuditLogs', {
      id: Utilities.getUuid(),
      timestamp: new Date(),
      username: session ? session.username : 'SYSTEM',
      action: action,
      entity: entity,
      recordId: recordId || '',
      details: String(details || '')
    });
  } catch (err) {
    console.error('Audit log error: ' + err.message);
  }
}

/* =========================================================
   EXPORT DATA
========================================================= */

function apiExportData(token, entity, filters) {
  getSession_(token);

  if (!SCHEMAS[entity]) {
    throw new Error('ไม่รองรับข้อมูลที่ต้องการส่งออก');
  }

  filters = filters || {};

  let rows = readRows_(entity);

  if (filters.startDate || filters.endDate) {
    rows = rows.filter(function(r) {
      if (!r.date) return true;

      const d = normalizeDate_(r.date);

      if (filters.startDate && d < filters.startDate) return false;
      if (filters.endDate && d > filters.endDate) return false;

      return true;
    });
  }

  return {
    success: true,
    entity: entity,
    headers: SCHEMAS[entity],
    rows: rows
  };
}

/* =========================================================
   DOCUMENT GENERATION
========================================================= */

function apiCreateDocument(token, documentType, recordId) {
  const session = getSession_(token);

  const allowed = ['receipt', 'payment', 'journal'];

  if (allowed.indexOf(documentType) === -1) {
    throw new Error('ไม่รองรับเอกสารประเภทนี้');
  }

  let record;
  let title;

  if (documentType === 'receipt') {
    record = findById_('Receipts', recordId);
    title = 'ใบเสร็จรับเงิน';
  } else if (documentType === 'payment') {
    record = findById_('Payments', recordId);
    title = 'ใบสำคัญจ่าย';
  } else {
    record = findById_('JournalEntries', recordId);
    title = 'ใบสำคัญบันทึกบัญชี';
  }

  if (!record) {
    throw new Error('ไม่พบข้อมูลเอกสาร');
  }

  const settings = getSettings_();

  const doc = DocumentApp.create(
    title + ' ' + (record.documentNo || record.id)
  );

  const body = doc.getBody();
  body.clear();

  body.setAttributes({
    [DocumentApp.Attribute.FONT_FAMILY]: APP.FONT,
    [DocumentApp.Attribute.FONT_SIZE]: 16
  });

  const heading = body.appendParagraph(settings.businessName || APP.NAME);
  heading.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  heading.setFontFamily(APP.FONT);
  heading.setFontSize(20);
  heading.setBold(true);

  const sub = body.appendParagraph(title);
  sub.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  sub.setFontFamily(APP.FONT);
  sub.setFontSize(18);
  sub.setBold(true);

  body.appendParagraph('เลขที่เอกสาร: ' + (record.documentNo || ''));
  body.appendParagraph('วันที่: ' + normalizeDate_(record.date));
  body.appendParagraph('รายละเอียด: ' + (record.description || ''));
  body.appendParagraph('จำนวนเงิน: ' +
    formatMoney_(record.amount || record.debitTotal || 0) + ' บาท');

  if (settings.businessAddress) {
    body.appendParagraph('ที่อยู่: ' + settings.businessAddress);
  }

  if (settings.businessPhone) {
    body.appendParagraph('โทรศัพท์: ' + settings.businessPhone);
  }

  body.appendParagraph('');
  body.appendParagraph('ลงชื่อ ................................................');
  body.appendParagraph('ผู้รับเงิน / ผู้จ่ายเงิน');
  body.appendParagraph('');
  body.appendParagraph('เอกสารสร้างจากระบบบัญชีร้านค้าทั่วไป');

  doc.saveAndClose();

  audit_(session, 'CREATE_DOCUMENT', documentType, recordId, doc.getId());

  return {
    success: true,
    documentId: doc.getId(),
    documentUrl: doc.getUrl(),
    message: 'สร้างเอกสารเรียบร้อย'
  };
}

/* =========================================================
   DATABASE HELPERS
========================================================= */

function readRows_(sheetName) {
  const ss = requireDatabase_();
  const sh = ss.getSheetByName(sheetName);

  if (!sh) {
    throw new Error('ไม่พบชีต ' + sheetName);
  }

  const values = sh.getDataRange().getValues();

  if (values.length <= 1) {
    return [];
  }

  const headers = values[0];

  return values.slice(1)
    .filter(function(row) {
      return row.some(function(v) {
        return v !== '' && v !== null;
      });
    })
    .map(function(row) {
      const obj = {};

      headers.forEach(function(header, index) {
        let value = row[index];

        if (Object.prototype.toString.call(value) === '[object Date]') {
          if (!isNaN(value.getTime())) {
            value = Utilities.formatDate(
              value,
              APP.TIMEZONE,
              'yyyy-MM-dd HH:mm:ss'
            );
          } else {
            value = '';
          }
        }

        obj[header] = value;
      });

      return obj;
    });
}
function appendObject_(sheetName, object) {
  const ss = requireDatabase_();
  const sh = ss.getSheetByName(sheetName);

  if (!sh) {
    throw new Error('ไม่พบชีต ' + sheetName);
  }

  const headers = SCHEMAS[sheetName];

  if (!headers) {
    throw new Error('ไม่พบโครงสร้างชีต');
  }

  const row = headers.map(function(key) {
    return object[key] === undefined ? '' : object[key];
  });

  sh.appendRow(row);
}

function findById_(sheetName, id) {
  return readRows_(sheetName).find(function(row) {
    return String(row.id) === String(id);
  }) || null;
}

function updateRecord_(sheetName, id, updates) {
  const ss = requireDatabase_();
  const sh = ss.getSheetByName(sheetName);

  if (!sh) {
    throw new Error('ไม่พบชีต ' + sheetName);
  }

  const values = sh.getDataRange().getValues();

  if (values.length <= 1) {
    throw new Error('ไม่พบข้อมูล');
  }

  const headers = values[0];
  const idIndex = headers.indexOf('id');

  if (idIndex === -1) {
    throw new Error('ชีตนี้ไม่มีคอลัมน์ id');
  }

  for (let i = 1; i < values.length; i++) {
    if (String(values[i][idIndex]) === String(id)) {
      Object.keys(updates).forEach(function(key) {
        const col = headers.indexOf(key);

        if (col !== -1) {
          sh.getRange(i + 1, col + 1).setValue(updates[key]);
        }
      });

      return true;
    }
  }

  throw new Error('ไม่พบรายการที่ต้องการแก้ไข');
}

function updateByKey_(sheetName, keyName, keyValue, updates) {
  const ss = requireDatabase_();
  const sh = ss.getSheetByName(sheetName);
  const values = sh.getDataRange().getValues();

  const headers = values[0];
  const keyIndex = headers.indexOf(keyName);

  for (let i = 1; i < values.length; i++) {
    if (String(values[i][keyIndex]) === String(keyValue)) {
      Object.keys(updates).forEach(function(key) {
        const col = headers.indexOf(key);

        if (col !== -1) {
          sh.getRange(i + 1, col + 1).setValue(updates[key]);
        }
      });

      return true;
    }
  }

  return false;
}

/* =========================================================
   DOCUMENT NUMBER
========================================================= */

function nextDocumentNo_(entity) {
  const ss = requireDatabase_();
  const sh = ss.getSheetByName('DocumentCounters');

  const prefixMap = {
    Products: 'PRD',
    Customers: 'CUS',
    Suppliers: 'SUP',
    Transactions: 'TRN',
    Receipts: 'RCT',
    Payments: 'PAY',
    JournalEntries: 'JV'
  };

  const prefix = prefixMap[entity] || 'DOC';
  const year = Utilities.formatDate(
    new Date(),
    APP.TIMEZONE,
    'yyyy'
  );

  const key = prefix + '-' + year;
  const values = sh.getDataRange().getValues();

  for (let i = 1; i < values.length; i++) {
    if (String(values[i][0]) === key) {
      const next = Number(values[i][1] || 0) + 1;
      sh.getRange(i + 1, 2).setValue(next);
      return key + '-' + String(next).padStart(5, '0');
    }
  }

  sh.appendRow([key, 1]);

  return key + '-00001';
}

/* =========================================================
   DATE AND NUMBER HELPERS
========================================================= */

function today_() {
  return Utilities.formatDate(
    new Date(),
    APP.TIMEZONE,
    'yyyy-MM-dd'
  );
}

function firstDayOfMonth_() {
  const now = new Date();

  return Utilities.formatDate(
    new Date(now.getFullYear(), now.getMonth(), 1),
    APP.TIMEZONE,
    'yyyy-MM-dd'
  );
}

function normalizeDate_(value) {
  if (!value) return '';

  if (Object.prototype.toString.call(value) === '[object Date]') {
    return Utilities.formatDate(
      value,
      APP.TIMEZONE,
      'yyyy-MM-dd'
    );
  }

  const text = String(value);

  if (/^\d{4}-\d{2}-\d{2}/.test(text)) {
    return text.substring(0, 10);
  }

  const parsed = new Date(value);

  if (isNaN(parsed.getTime())) {
    return text;
  }

  return Utilities.formatDate(
    parsed,
    APP.TIMEZONE,
    'yyyy-MM-dd'
  );
}

function roundMoney_(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

function formatMoney_(value) {
  return Number(value || 0).toLocaleString('th-TH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function isActive_(row) {
  return row.status !== 'Deleted' &&
    row.status !== 'Inactive';
}

/* =========================================================
   ADMIN UTILITY
========================================================= */

function getDatabaseUrl() {
  const ss = requireDatabase_();
  return ss.getUrl();
}

function resetSessionCache() {
  // Session จะหมดอายุตามเวลาที่กำหนด
  return {
    success: true,
    message: 'Session จะหมดอายุตามระบบ Cache'
  };
}