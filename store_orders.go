package main

import (
	"context"
	"database/sql"
	"time"
)

func ListOrders(db *sql.DB) ([]Order, error) {
	rows, err := db.Query(`SELECT
  id,
  customer_name,
  whatsapp,
  product_name,
  product_id,
  variant_id,
  image_url,
  size,
  quantity,
  price,
  keep_date,
  fulfillment,
  payment,
  bank,
  created_at,
  updated_at
FROM orders
ORDER BY id DESC`)
	if err != nil {
		return nil, err
	}
	defer func() { _ = rows.Close() }()

	out := []Order{}
	for rows.Next() {
		var o Order
		if err := rows.Scan(
			&o.ID,
			&o.CustomerName,
			&o.WhatsApp,
			&o.ProductName,
			&o.ProductID,
			&o.VariantID,
			&o.ImageURL,
			&o.Size,
			&o.Quantity,
			&o.Price,
			&o.KeepDate,
			&o.Fulfillment,
			&o.Payment,
			&o.Bank,
			&o.CreatedAt,
			&o.UpdatedAt,
		); err != nil {
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
	err := db.QueryRow(`SELECT
  id,
  customer_name,
  whatsapp,
  product_name,
  product_id,
  variant_id,
  image_url,
  size,
  quantity,
  price,
  keep_date,
  fulfillment,
  payment,
  bank,
  created_at,
  updated_at
FROM orders
WHERE id = ?`, id).Scan(
		&o.ID,
		&o.CustomerName,
		&o.WhatsApp,
		&o.ProductName,
		&o.ProductID,
		&o.VariantID,
		&o.ImageURL,
		&o.Size,
		&o.Quantity,
		&o.Price,
		&o.KeepDate,
		&o.Fulfillment,
		&o.Payment,
		&o.Bank,
		&o.CreatedAt,
		&o.UpdatedAt,
	)
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
	res, err := tx.Exec(`INSERT INTO orders (
  customer_name,
  whatsapp,
  product_name,
  product_id,
  variant_id,
  image_url,
  size,
  quantity,
  price,
  keep_date,
  fulfillment,
  payment,
  bank,
  created_at,
  updated_at
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		o.CustomerName,
		o.WhatsApp,
		o.ProductName,
		o.ProductID,
		o.VariantID,
		o.ImageURL,
		o.Size,
		o.Quantity,
		o.Price,
		o.KeepDate,
		o.Fulfillment,
		o.Payment,
		o.Bank,
		now,
		now,
	)

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
	_, err = tx.Exec(`UPDATE orders SET
  customer_name = ?,
  whatsapp = ?,
  product_name = ?,
  image_url = ?,
  size = ?,
  quantity = ?,
  price = ?,
  keep_date = ?,
  fulfillment = ?,
  payment = ?,
  bank = ?,
  updated_at = ?
WHERE id = ?`,
		o.CustomerName,
		o.WhatsApp,
		o.ProductName,
		o.ImageURL,
		o.Size,
		o.Quantity,
		o.Price,
		o.KeepDate,
		o.Fulfillment,
		o.Payment,
		o.Bank,
		now,
		id,
	)
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
	_, err = tx.Exec(`UPDATE orders SET
  payment = ?,
  bank = ?,
  updated_at = ?
WHERE id = ?`,
		payment,
		bank,
		now,
		id,
	)
	if err != nil {
		return err
	}
	if err := tx.Commit(); err != nil {
		return err
	}
	return nil
}

func AdjustStock(db *sql.DB, variantID int64, delta int, setTo int) (int, error) {
	var cur int
	err := db.QueryRow(
		"SELECT stock FROM product_variants WHERE id = ?",
		variantID,
	).Scan(&cur)
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
	_, err = db.Exec(
		"UPDATE product_variants SET stock = ? WHERE id = ?",
		next,
		variantID,
	)
	if err != nil {
		return 0, err
	}
	return next, nil
}
