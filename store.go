package main

import (
	"context"
	"database/sql"
	"os"
	"time"

	_ "modernc.org/sqlite"
)

type Product struct {
	ID        int    `json:"id"`
	Name      string `json:"name"`
	Price     int    `json:"price"`
	ImageURL  string `json:"image_url"`
	HasSizes  bool   `json:"has_sizes"`
	CreatedAt string `json:"created_at"`
	UpdatedAt string `json:"updated_at"`
}

type Variant struct {
	ID        int     `json:"id"`
	ProductID int     `json:"product_id"`
	SizeLabel *string `json:"size_label"`
	Stock     int     `json:"stock"`
	SortOrder int     `json:"sort_order"`
}

type Order struct {
	ID           int    `json:"id"`
	CustomerName string `json:"customer_name"`
	WhatsApp     string `json:"whatsapp"`
	ProductName  string `json:"product_name"`
	ImageURL     string `json:"image_url"`
	Size         string `json:"size"`
	Quantity     int    `json:"quantity"`
	Price        int    `json:"price"`
	KeepDate     string `json:"keep_date"`
	Fulfillment  string `json:"fulfillment"`
	Payment      string `json:"payment"`
	Bank         string `json:"bank"`
	CreatedAt    string `json:"created_at"`
	UpdatedAt    string `json:"updated_at"`
}

func openStore() (*sql.DB, error) {
	err := os.MkdirAll("data", 0o755)
	if err != nil {
		return nil, err
	}
	db, err := sql.Open("sqlite", "data/stok-baju.db")
	if err != nil {
		return nil, err
	}
	db.SetMaxOpenConns(1)
	_, err = db.Exec("PRAGMA foreign_keys = ON")
	if err != nil {
		return nil, err
	}
	_, err = db.Exec("PRAGMA journal_mode = WAL")
	if err != nil {
		return nil, err
	}
	_, err = db.Exec(`CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  price INTEGER NOT NULL DEFAULT 0,
  image_url TEXT,
  has_sizes INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);`)
	if err != nil {
		return nil, err
	}
	_, err = db.Exec(`CREATE TABLE IF NOT EXISTS product_variants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  size_label TEXT,
  stock INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0
);`)
	if err != nil {
		return nil, err
	}
	_, err = db.Exec(`CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_name TEXT NOT NULL,
  whatsapp TEXT NOT NULL,
  product_name TEXT NOT NULL,
  image_url TEXT NOT NULL DEFAULT '',
  size TEXT NOT NULL DEFAULT '',
  quantity INTEGER NOT NULL DEFAULT 1,
  price INTEGER NOT NULL DEFAULT 0,
  keep_date TEXT NOT NULL,
  fulfillment TEXT NOT NULL DEFAULT 'pickup',
  payment TEXT NOT NULL DEFAULT 'unpaid',
  bank TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);`)
	if err != nil {
		return nil, err
	}
	return db, nil
}

func CreateProduct(db *sql.DB, p Product, variants []Variant) (int64, error) {
	tx, err := db.BeginTx(context.Background(), nil)
	if err != nil {
		return 0, err
	}
	defer func() { _ = tx.Rollback() }()

	now := time.Now().Format(time.RFC3339)
	res, err := tx.Exec(`INSERT INTO products (name, price, image_url, has_sizes, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)`, p.Name, p.Price, p.ImageURL, p.HasSizes, now, now)
	if err != nil {
		return 0, err
	}
	id, err := res.LastInsertId()
	if err != nil {
		return 0, err
	}
	for _, v := range variants {
		_, err := tx.Exec(`INSERT INTO product_variants (product_id, size_label, stock, sort_order)
	    VALUES (?, ?, ?, ?)`, id, v.SizeLabel, v.Stock, v.SortOrder)
		if err != nil {
			return 0, err
		}
	}
	if err := tx.Commit(); err != nil {
		return 0, err
	}
	return id, nil
}

func ListProducts(db *sql.DB) ([]Product, error) {
	rows, err := db.Query(`SELECT id, name, price, image_url, has_sizes, created_at, updated_at FROM products ORDER BY id`)
	if err != nil {
		return nil, err
	}
	defer func() { _ = rows.Close() }()

	var out []Product
	for rows.Next() {
		var p Product
		if err := rows.Scan(&p.ID, &p.Name, &p.Price, &p.ImageURL, &p.HasSizes, &p.CreatedAt, &p.UpdatedAt); err != nil {
			return nil, err
		}
		out = append(out, p)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return out, nil
}

func GetProduct(db *sql.DB, id int64) (Product, []Variant, error) {
	var p Product
	err := db.QueryRow(`SELECT id, name, price, image_url, has_sizes, created_at, updated_at FROM products WHERE id = ?`, id).Scan(&p.ID, &p.Name, &p.Price, &p.ImageURL, &p.HasSizes, &p.CreatedAt, &p.UpdatedAt)
	if err != nil {
		return Product{}, nil, err
	}

	rows, err := db.Query(`SELECT id, product_id, size_label, stock, sort_order FROM product_variants WHERE product_id = ? ORDER BY sort_order`, id)
	if err != nil {
		return Product{}, nil, err
	}
	defer func() { _ = rows.Close() }()

	var variants []Variant
	for rows.Next() {
		var v Variant
		if err := rows.Scan(&v.ID, &v.ProductID, &v.SizeLabel, &v.Stock, &v.SortOrder); err != nil {
			return Product{}, nil, err
		}
		variants = append(variants, v)
	}

	if err := rows.Err(); err != nil {
		return Product{}, nil, err
	}
	return p, variants, nil
}

func ListOrders(db *sql.DB) ([]Order, error) {
	rows, err := db.Query(`SELECT id, customer_name, whatsapp, product_name, image_url, size, quantity, price, keep_date, fulfillment, payment, bank, created_at, updated_at FROM orders ORDER BY id DESC`)
	if err != nil {
		return nil, err
	}
	defer func() { _ = rows.Close() }()

	out := []Order{}
	for rows.Next() {
		var o Order
		if err := rows.Scan(&o.ID, &o.CustomerName, &o.WhatsApp, &o.ProductName, &o.ImageURL, &o.Size, &o.Quantity, &o.Price, &o.KeepDate, &o.Fulfillment, &o.Payment, &o.Bank, &o.CreatedAt, &o.UpdatedAt); err != nil {
			return nil, err
		}
		out = append(out, o)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return out, nil
}

func GetOrder(db *sql.DB, id int64) (Order, error) {
	var o Order
	err := db.QueryRow(`SELECT id, customer_name, whatsapp, product_name, image_url, size, quantity, price, keep_date, fulfillment, payment, bank, created_at, updated_at FROM orders WHERE id = ?`, id).Scan(&o.ID, &o.CustomerName, &o.WhatsApp, &o.ProductName, &o.ImageURL, &o.Size, &o.Quantity, &o.Price, &o.KeepDate, &o.Fulfillment, &o.Payment, &o.Bank, &o.CreatedAt, &o.UpdatedAt)
	if err != nil {
		return Order{}, err
	}
	return o, nil
}

func CreateOrder(db *sql.DB, o Order) (int64, error) {
	tx, err := db.BeginTx(context.Background(), nil)
	if err != nil {
		return 0, err
	}
	defer func() { _ = tx.Rollback() }()

	now := time.Now().Format(time.RFC3339)
	res, err := tx.Exec(`INSERT INTO orders (customer_name, whatsapp, product_name, image_url, size, quantity, price, keep_date, fulfillment, payment, bank, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, o.CustomerName, o.WhatsApp, o.ProductName, o.ImageURL, o.Size, o.Quantity, o.Price, o.KeepDate, o.Fulfillment, o.Payment, o.Bank, now, now)

	if err != nil {
		return 0, err
	}
	id, err := res.LastInsertId()
	if err != nil {
		return 0, err
	}
	if err := tx.Commit(); err != nil {
		return 0, err
	}
	return id, nil
}

func UpdateOrder(db *sql.DB, id int64, o Order) error {
	tx, err := db.BeginTx(context.Background(), nil)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback() }()

	now := time.Now().Format(time.RFC3339)
	_, err = tx.Exec(`UPDATE orders SET customer_name = ?, whatsapp = ?, product_name = ?, image_url = ?, size = ?, quantity = ?, price = ?, keep_date = ?, fulfillment = ?, payment = ?, bank = ?, updated_at = ? WHERE id = ?`, o.CustomerName, o.WhatsApp, o.ProductName, o.ImageURL, o.Size, o.Quantity, o.Price, o.KeepDate, o.Fulfillment, o.Payment, o.Bank, now, id)
	if err != nil {
		return err
	}
	if err := tx.Commit(); err != nil {
		return err
	}
	return nil
}

func DeleteOrder(db *sql.DB, id int64) error {
	tx, err := db.BeginTx(context.Background(), nil)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback() }()

	_, err = tx.Exec(`DELETE FROM orders WHERE id = ?`, id)
	if err != nil {
		return err
	}
	if err := tx.Commit(); err != nil {
		return err
	}
	return nil
}

func UpdateOrderPayment(db *sql.DB, id int64, payment string, bank string) error {
	tx, err := db.BeginTx(context.Background(), nil)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback() }()

	now := time.Now().Format(time.RFC3339)
	_, err = tx.Exec(`UPDATE orders SET payment = ?, bank = ?, updated_at = ? WHERE id = ?`, payment, bank, now, id)
	if err != nil {
		return err
	}
	if err := tx.Commit(); err != nil {
		return err
	}
	return nil
}

func UpdateProduct(db *sql.DB, id int64, p Product, variants []Variant) error {
	tx, err := db.BeginTx(context.Background(), nil)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback() }()

	now := time.Now().Format(time.RFC3339)
	_, err = tx.Exec(`UPDATE products SET name = ?, price = ?, image_url = ?, has_sizes = ?, updated_at = ? WHERE id = ?`, p.Name, p.Price, p.ImageURL, p.HasSizes, now, id)
	if err != nil {
		return err
	}

	_, err = tx.Exec(`DELETE FROM product_variants WHERE product_id = ?`, id)
	if err != nil {
		return err
	}
	for _, v := range variants {
		_, err := tx.Exec(`INSERT INTO product_variants (product_id, size_label, stock, sort_order)
	    VALUES (?, ?, ?, ?)`, id, v.SizeLabel, v.Stock, v.SortOrder)
		if err != nil {
			return err
		}
	}
	if err := tx.Commit(); err != nil {
		return err
	}
	return nil
}

func DeleteProduct(db *sql.DB, id int64) error {
	_, err := db.Exec(`DELETE FROM products WHERE id = ?`, id)
	if err != nil {
		return err
	}
	return nil
}

func AdjustStock(db *sql.DB, variantID int64, delta int, setTo int) (int, error) {
	var cur int
	err := db.QueryRow("SELECT stock FROM product_variants WHERE id = ?", variantID).Scan(&cur)
	if err != nil {
		return 0, err
	}
	var next int
	if setTo >= 0 {
		next = setTo
	} else {
		next = cur + delta
	}
	if next < 0 {
		next = 0
	}
	_, err = db.Exec("UPDATE product_variants SET stock = ? WHERE id = ?", next, variantID)
	if err != nil {
		return 0, err
	}
	return next, nil
}
