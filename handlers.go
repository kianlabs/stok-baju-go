package main

import (
	"database/sql"
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
)

type createProductRequest struct {
	Name     string    `json:"name"`
	Price    int       `json:"price"`
	ImageURL string    `json:"image_url"`
	HasSizes bool      `json:"has_sizes"`
	Variants []Variant `json:"variants"`
}

type adjustStockRequest struct {
	Mode  string `json:"mode"`
	Delta int    `json:"delta"`
	Stock int    `json:"stock"`
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}

func validateProductRequest(req createProductRequest) error {
	if req.Name == "" || req.Price < 0 {
		return errors.New("nama tidak boleh kosong atau harga tidak boleh negatif")
	}
	if !req.HasSizes && len(req.Variants) != 1 {
		return errors.New("produk tanpa ukuran harus punya tepat 1 varian")
	}
	if req.HasSizes {
		seen := map[string]bool{}
		for _, v := range req.Variants {
			if v.SizeLabel == nil {
				return errors.New("ukuran tidak boleh kosong")
			}
			label := *v.SizeLabel
			if seen[label] {
				return errors.New("ukuran tidak boleh duplikat")
			}
			seen[label] = true
		}
	}
	return nil
}

func listProductsHandler(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		products, err := ListProducts(db)
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]any{"success": false, "error": err.Error()})
			return
		}

		writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": products})
	}
}

func getProductHandler(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		idStr := r.PathValue("id")
		id, err := strconv.ParseInt(idStr, 10, 64)
		if err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]any{"success": false, "error": err.Error()})
			return
		}

		p, variants, err := GetProduct(db, id)
		if err != nil {
			writeJSON(w, http.StatusNotFound, map[string]any{"success": false, "error": err.Error()})
			return
		}
		writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": map[string]any{"product": p, "variants": variants}})
	}
}

func createProductHandler(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req createProductRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]any{"success": false, "error": err.Error()})
			return
		}
		if err := validateProductRequest(req); err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]any{"success": false, "error": err.Error()})
			return
		}
		p := Product{Name: req.Name, Price: req.Price, ImageURL: req.ImageURL, HasSizes: req.HasSizes}
		id, err := CreateProduct(db, p, req.Variants)
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]any{"success": false, "error": err.Error()})
			return
		}
		writeJSON(w, http.StatusCreated, map[string]any{"success": true, "data": map[string]any{"id": id}})
	}
}

func updateProductHandler(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		idStr := r.PathValue("id")
		id, err := strconv.ParseInt(idStr, 10, 64)
		if err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]any{"success": false, "error": err.Error()})
			return
		}
		var req createProductRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]any{"success": false, "error": err.Error()})
			return
		}
		if err := validateProductRequest(req); err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]any{"success": false, "error": err.Error()})
			return
		}
		p := Product{Name: req.Name, Price: req.Price, ImageURL: req.ImageURL, HasSizes: req.HasSizes}
		if err := UpdateProduct(db, id, p, req.Variants); err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]any{"success": false, "error": err.Error()})
			return
		}
		writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": map[string]any{"id": id}})
	}
}

func deleteProductHandler(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		idStr := r.PathValue("id")
		id, err := strconv.ParseInt(idStr, 10, 64)
		if err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]any{"success": false, "error": err.Error()})
			return
		}
		if err := DeleteProduct(db, id); err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]any{"success": false, "error": err.Error()})
			return
		}
		writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": map[string]any{"id": id}})
	}
}

func adjustStockHandler(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		idStr := r.PathValue("id")
		id, err := strconv.ParseInt(idStr, 10, 64)
		if err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]any{"success": false, "error": err.Error()})
			return
		}
		var req adjustStockRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]any{"success": false, "error": err.Error()})
			return
		}
		if req.Mode != "delta" && req.Mode != "set" {
			writeJSON(w, http.StatusBadRequest, map[string]any{"success": false, "error": "mode harus delta atau set"})
			return
		}
		var next int
		if req.Mode == "delta" {
			next, err = AdjustStock(db, id, req.Delta, -1)
		} else {
			next, err = AdjustStock(db, id, 0, req.Stock)
		}
		if err != nil {
			if errors.Is(err, sql.ErrNoRows) {
				writeJSON(w, http.StatusNotFound, map[string]any{"success": false, "error": "varian tidak ditemukan"})
				return
			}
			writeJSON(w, http.StatusInternalServerError, map[string]any{"success": false, "error": err.Error()})
			return
		}
		writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": map[string]any{"id": id, "stock": next}})
	}
}
