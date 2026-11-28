package main

import (
	"database/sql"
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"strings"
)

type createOrderRequest struct {
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
}

type updatePaymentRequest struct {
	Payment string `json:"payment"`
	Bank    string `json:"bank"`
}

func validateOrderRequest(req createOrderRequest) error {
	if strings.TrimSpace(req.CustomerName) == "" {
		return errors.New("nama customer tidak boleh kosong")
	}
	if strings.TrimSpace(req.WhatsApp) == "" {
		return errors.New("nomor whatsapp tidak boleh kosong")
	}
	if req.Price <= 0 {
		return errors.New("harga harus lebih dari 0")
	}
	if req.Fulfillment != "pickup" && req.Fulfillment != "delivery" {
		return errors.New("pilih salah satu pickup atau delivery")
	}
	if req.Payment == "transfer" && strings.TrimSpace(req.Bank) == "" {
		return errors.New("bank tidak boleh kosong")
	}
	if strings.TrimSpace(req.ProductName) == "" {
		return errors.New("nama barang tidak boleh kosong")
	}
	if strings.TrimSpace(req.KeepDate) == "" {
		return errors.New("tanggal keep tidak boleh kosong")
	}
	if req.Quantity < 1 {
		return errors.New("jumlah keep minimal 1")
	}
	if req.Payment != "unpaid" && req.Payment != "transfer" && req.Payment != "cash" {
		return errors.New("status lunas tidak valid")
	}
	return nil
}

func listOrdersHandler(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		orders, err := ListOrders(db)
		if err != nil {
			writeError(w, http.StatusInternalServerError, err.Error())
			return
		}
		writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": orders})
	}
}

func getOrderHandler(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		idStr := r.PathValue("id")
		id, err := strconv.ParseInt(idStr, 10, 64)
		if err != nil {
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}
		o, err := GetOrder(db, id)
		if err != nil {
			writeError(w, http.StatusNotFound, err.Error())
			return
		}
		writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": o})
	}
}

func createOrderHandler(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req createOrderRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}
		if err := validateOrderRequest(req); err != nil {
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}
		if req.Payment != "transfer" {
			req.Bank = ""
		}
		o := Order{
			CustomerName: req.CustomerName,
			WhatsApp:     req.WhatsApp,
			ProductName:  req.ProductName,
			ImageURL:     req.ImageURL,
			Size:         req.Size,
			Quantity:     req.Quantity,
			Price:        req.Price,
			KeepDate:     req.KeepDate,
			Fulfillment:  req.Fulfillment,
			Payment:      req.Payment,
			Bank:         req.Bank,
		}
		id, err := CreateOrder(db, o)
		if err != nil {
			writeError(w, http.StatusInternalServerError, err.Error())
			return
		}
		saved, err := GetOrder(db, id)
		if err != nil {
			writeError(w, http.StatusInternalServerError, err.Error())
			return
		}
		writeJSON(w, http.StatusCreated, map[string]any{"success": true, "data": saved})
	}
}

func updateOrderHandler(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		idStr := r.PathValue("id")
		id, err := strconv.ParseInt(idStr, 10, 64)
		if err != nil {
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}
		var req createOrderRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}
		if err := validateOrderRequest(req); err != nil {
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}
		_, err = GetOrder(db, id)
		if err != nil {
			if errors.Is(err, sql.ErrNoRows) {
				writeError(w, http.StatusNotFound, "pesanan tidak ditemukan")
				return
			}
			writeError(w, http.StatusInternalServerError, err.Error())
			return
		}
		if req.Payment != "transfer" {
			req.Bank = ""
		}
		o := Order{
			CustomerName: req.CustomerName,
			WhatsApp:     req.WhatsApp,
			ProductName:  req.ProductName,
			ImageURL:     req.ImageURL,
			Size:         req.Size,
			Quantity:     req.Quantity,
			Price:        req.Price,
			KeepDate:     req.KeepDate,
			Fulfillment:  req.Fulfillment,
			Payment:      req.Payment,
			Bank:         req.Bank,
		}
		if err := UpdateOrder(db, id, o); err != nil {
			writeError(w, http.StatusInternalServerError, err.Error())
			return
		}
		saved, err := GetOrder(db, id)
		if err != nil {
			writeError(w, http.StatusInternalServerError, err.Error())
			return
		}
		writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": saved})
	}
}

func deleteOrderHandler(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		idStr := r.PathValue("id")
		id, err := strconv.ParseInt(idStr, 10, 64)
		if err != nil {
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}
		_, err = GetOrder(db, id)
		if err != nil {
			if errors.Is(err, sql.ErrNoRows) {
				writeError(w, http.StatusNotFound, "pesanan tidak ditemukan")
				return
			}
			writeError(w, http.StatusInternalServerError, err.Error())
			return
		}
		if err := DeleteOrder(db, id); err != nil {
			writeError(w, http.StatusInternalServerError, err.Error())
			return
		}
		writeJSON(w, http.StatusOK, map[string]any{
			"success": true,
			"data":    map[string]any{"id": id},
		})
	}
}

func updateOrderPaymentHandler(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		idStr := r.PathValue("id")
		id, err := strconv.ParseInt(idStr, 10, 64)
		if err != nil {
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}
		var req updatePaymentRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}
		if req.Payment != "unpaid" && req.Payment != "transfer" && req.Payment != "cash" {
			writeError(w, http.StatusBadRequest, "status lunas tidak valid")
			return
		}
		if req.Payment == "transfer" && strings.TrimSpace(req.Bank) == "" {
			writeError(w, http.StatusBadRequest, "bank tidak boleh kosong")
			return
		}
		_, err = GetOrder(db, id)
		if err != nil {
			if errors.Is(err, sql.ErrNoRows) {
				writeError(w, http.StatusNotFound, "pesanan tidak ditemukan")
				return
			}
			writeError(w, http.StatusInternalServerError, err.Error())
			return
		}
		if req.Payment != "transfer" {
			req.Bank = ""
		}
		if err := UpdateOrderPayment(db, id, req.Payment, req.Bank); err != nil {
			writeError(w, http.StatusInternalServerError, err.Error())
			return
		}
		saved, err := GetOrder(db, id)
		if err != nil {
			writeError(w, http.StatusInternalServerError, err.Error())
			return
		}
		writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": saved})
	}
}
