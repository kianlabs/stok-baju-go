package main

import (
	"database/sql"
	_ "modernc.org/sqlite"
	"os"
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
	ProductID    int    `json:"product_id"`
	VariantID    int    `json:"variant_id"`
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
  product_id INTEGER NOT NULL,
  variant_id INTEGER NOT NULL,
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
