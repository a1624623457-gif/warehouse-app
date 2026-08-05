import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import path from "path";

const DB_PATH = path.join(process.cwd(), "warehouse.db");

function initDB() {
  const sqlite = new Database(DB_PATH);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  sqlite.pragma("busy_timeout = 5000");

  // Enable WAL checkpoint on close
  process.on("exit", () => {
    try { sqlite.close(); } catch {}
  });

  // Create tables
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin','editor','viewer')) DEFAULT 'viewer',
      display_name TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      last_login_ip TEXT,
      last_login_at TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS zones (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      is_fixed INTEGER NOT NULL DEFAULT 0,
      is_virtual INTEGER NOT NULL DEFAULT 0,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS spec_types (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category TEXT NOT NULL,
      label TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS shelves (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      zone_id INTEGER NOT NULL REFERENCES zones(id),
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      UNIQUE(name, zone_id)
    );

    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      model TEXT NOT NULL DEFAULT '',
      spec_type_id INTEGER REFERENCES spec_types(id),
      image_url TEXT,
      expiry_date TEXT,
      unit_price REAL,
      zone_id INTEGER REFERENCES zones(id),
      shelf_id INTEGER REFERENCES shelves(id),
      today_in INTEGER NOT NULL DEFAULT 0,
      today_out INTEGER NOT NULL DEFAULT 0,
      current_stock INTEGER NOT NULL DEFAULT 0,
      notes TEXT,
      created_by INTEGER REFERENCES users(id),
      updated_by INTEGER REFERENCES users(id),
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS product_edit_locks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL UNIQUE REFERENCES products(id),
      locked_by INTEGER NOT NULL REFERENCES users(id),
      locked_at TEXT DEFAULT (datetime('now')),
      expires_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS stock_movements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL REFERENCES products(id),
      user_id INTEGER NOT NULL REFERENCES users(id),
      change_type TEXT NOT NULL CHECK(change_type IN ('in','out','adjustment')),
      quantity INTEGER NOT NULL,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- FTS5 virtual table for full-text search
    CREATE VIRTUAL TABLE IF NOT EXISTS products_fts USING fts5(
      name, model, content='products', content_rowid='id'
    );

    -- Triggers to keep FTS in sync
    CREATE TRIGGER IF NOT EXISTS products_ai AFTER INSERT ON products BEGIN
      INSERT INTO products_fts(rowid, name, model) VALUES (new.id, new.name, new.model);
    END;

    CREATE TRIGGER IF NOT EXISTS products_ad AFTER DELETE ON products BEGIN
      INSERT INTO products_fts(products_fts, rowid, name, model) VALUES('delete', old.id, old.name, old.model);
    END;

    CREATE TRIGGER IF NOT EXISTS products_au AFTER UPDATE ON products BEGIN
      INSERT INTO products_fts(products_fts, rowid, name, model) VALUES('delete', old.id, old.name, old.model);
      INSERT INTO products_fts(rowid, name, model) VALUES (new.id, new.name, new.model);
    END;
  `);

  // Seed admin user if not exists
  const existingAdmin = sqlite
    .prepare("SELECT id FROM users WHERE username = ?")
    .get("admin");

  if (!existingAdmin) {
    const hash = bcrypt.hashSync("admin123", 10);
    sqlite
      .prepare(
        "INSERT INTO users (username, password_hash, role, display_name) VALUES (?, ?, ?, ?)"
      )
      .run("admin", hash, "admin", "管理员");
    console.log("✅ Admin user created: admin / admin123");
  }

  // Seed default zones if not exists
  const existingZone = sqlite.prepare("SELECT id FROM zones LIMIT 1").get();
  if (!existingZone) {
    const zoneStmt = sqlite.prepare(
      "INSERT INTO zones (name, is_fixed, is_virtual, sort_order) VALUES (?, ?, ?, ?)"
    );
    const zones = [
      ["A", 0, 0, 1],
      ["B", 0, 0, 2],
      ["C", 0, 0, 3],
      ["D", 0, 0, 4],
      ["零库存", 1, 1, 96],
      ["临期", 1, 1, 98],
      ["过期", 1, 1, 99],
    ];
    for (const [name, isFixed, isVirtual, sortOrder] of zones) {
      zoneStmt.run(name, isFixed, isVirtual, sortOrder);
    }
    console.log("✅ Default zones seeded");
  }

  // Seed shelves
  const existingShelf = sqlite.prepare("SELECT id FROM shelves LIMIT 1").get();
  if (!existingShelf) {
    const shelfStmt = sqlite.prepare(
      "INSERT INTO shelves (name, zone_id) VALUES (?, ?)"
    );
    const shelves = [
      ["A001", 1],
      ["A002", 1],
      ["A003", 1],
      ["B001", 2],
      ["B002", 2],
      ["C001", 3],
      ["C002", 3],
      ["D001", 4],
    ];
    for (const [name, zoneId] of shelves) {
      shelfStmt.run(name, zoneId);
    }
    console.log("✅ Shelves seeded");
  }

  // Seed spec types if not exists
  const existingSpec = sqlite
    .prepare("SELECT id FROM spec_types LIMIT 1")
    .get();
  if (!existingSpec) {
    const specStmt = sqlite.prepare(
      "INSERT INTO spec_types (category, label) VALUES (?, ?)"
    );
    const specs = [
      ["服装类", "S"],
      ["服装类", "M"],
      ["服装类", "L"],
      ["服装类", "XL"],
      ["服装类", "XXL"],
      ["液体类", "100ml"],
      ["液体类", "250ml"],
      ["液体类", "500ml"],
      ["液体类", "1L"],
      ["液体类", "5L"],
      ["固体类", "100g"],
      ["固体类", "250g"],
      ["固体类", "500g"],
      ["固体类", "1kg"],
      ["固体类", "5kg"],
      ["固体类", "25kg"],
      ["通用类", "件"],
      ["通用类", "箱"],
      ["通用类", "袋"],
      ["通用类", "盒"],
      ["通用类", "个"],
      ["通用类", "本"],
      ["通用类", "套"],
    ];
    for (const [cat, label] of specs) {
      specStmt.run(cat, label);
    }
    console.log("✅ Spec types seeded");
  }

  // Insert sample products if none exist
  const existingProduct = sqlite
    .prepare("SELECT id FROM products LIMIT 1")
    .get();
  if (!existingProduct) {
    const productStmt = sqlite.prepare(`
      INSERT INTO products (name, model, spec_type_id, expiry_date, unit_price, zone_id, shelf_id, current_stock, today_in, today_out, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const samples = [
      [
        "ADM腮红678-01",
        "100g",
        12,
        "2027-06-15",
        38.5,
        1,
        1, // A001
        120,
        50,
        20,
        "畅销款",
      ],
      [
        "ADM腮红678-02",
        "100g",
        12,
        "2027-09-20",
        42.0,
        1,
        1, // A001
        85,
        85, // today_in = current_stock since no out
        0,
        "新批次",
      ],
      [
        "庞斯液体腮红356-10",
        "250ml",
        7,
        "2026-08-10",
        28.0,
        3,
        6, // C001
        15,
        5,
        8,
        "临期产品",
      ],
      [
        "多来没R673腮红膏-031",
        "50g",
        null,
        "2026-08-02",
        55.0,
        1,
        null,
        8,
        0,
        3,
        "已过期",
      ],
      [
        "纯棉T恤-白色",
        "L",
        2,
        null,
        29.9,
        2,
        4, // B001
        200,
        100,
        50,
        "夏季新品",
      ],
    ];
    for (const sample of samples) {
      productStmt.run(
        sample[0], // name
        sample[1], // model
        sample[2], // spec_type_id
        sample[3], // expiry_date
        sample[4], // unit_price
        sample[5], // zone_id
        sample[6], // shelf_id
        sample[7], // current_stock
        sample[8], // today_in
        sample[9], // today_out
        sample[10] // notes
      );
    }
    console.log("✅ Sample products seeded");
  }

  sqlite.close();
  console.log("✅ Database initialization complete!");
}

initDB();
