package main

import (
	"crypto/rand"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
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
		old, _, err := GetProduct(db, id)
		if err != nil {
			if errors.Is(err, sql.ErrNoRows) {
				writeJSON(w, http.StatusNotFound, map[string]any{"success": false, "error": "produk tidak ditemukan"})
				return
			}
			writeJSON(w, http.StatusInternalServerError, map[string]any{"success": false, "error": err.Error()})
			return
		}
		p := Product{Name: req.Name, Price: req.Price, ImageURL: req.ImageURL, HasSizes: req.HasSizes}
		if err := UpdateProduct(db, id, p, req.Variants); err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]any{"success": false, "error": err.Error()})
			return
		}
		if old.ImageURL != "" && old.ImageURL != req.ImageURL {
			deletePhotoFile(old.ImageURL)
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
		p, _, err := GetProduct(db, id)
		if err != nil {
			if errors.Is(err, sql.ErrNoRows) {
				writeJSON(w, http.StatusNotFound, map[string]any{"success": false, "error": "produk tidak ditemukan"})
				return
			}
			writeJSON(w, http.StatusInternalServerError, map[string]any{"success": false, "error": err.Error()})
			return
		}
		if err := DeleteProduct(db, id); err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]any{"success": false, "error": err.Error()})
			return
		}
		deletePhotoFile(p.ImageURL)
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

func uploadImageHandler(w http.ResponseWriter, r *http.Request) {
	r.Body = http.MaxBytesReader(w, r.Body, 5<<20)
	if err := r.ParseMultipartForm(5 << 20); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"success": false, "error": "file terlalu besar atau form salah"})
		return
	}
	file, _, err := r.FormFile("photo")
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"success": false, "error": "tidak ada file photo"})
		return
	}
	defer file.Close()

	data, err := io.ReadAll(file)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"success": false, "error": "gagal baca file"})
		return
	}
	ctype := http.DetectContentType(data)
	var ext string
	switch ctype {
	case "image/jpeg":
		ext = ".jpg"
	case "image/png":
		ext = ".png"
	case "image/webp":
		ext = ".webp"
	case "image/gif":
		ext = ".gif"
	default:
		writeJSON(w, http.StatusBadRequest, map[string]any{"success": false, "error": "hanya boleh gambar JPG/PNG/WebP/GIF"})
		return
	}
	b := make([]byte, 16)
	if _, err := rand.Read(b); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{"success": false, "error": "gagal buat nama file"})
		return
	}
	name := hex.EncodeToString(b) + ext
	if err := os.MkdirAll("data/uploads", 0755); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{"success": false, "error": "gagal buat folder upload"})
		return
	}
	if err := os.WriteFile(filepath.Join("data/uploads", name), data, 0644); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{"success": false, "error": "gagal simpan file"})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": map[string]any{"url": "/api/uploads/" + name}})
}

func serveUploadHandler(w http.ResponseWriter, r *http.Request) {
	name := r.PathValue("filename")
	ok, _ := regexp.MatchString(`^[a-f0-9]{32}\.(jpg|png|webp|gif)$`, name)
	if !ok {
		writeJSON(w, http.StatusBadRequest, map[string]any{"success": false, "error": "nama file tidak valid"})
		return
	}
	http.ServeFile(w, r, filepath.Join("data/uploads", name))
}

func deletePhotoFile(imageURL string) {
	if !strings.HasPrefix(imageURL, "/api/uploads/") {
		return
	}
	name := strings.TrimPrefix(imageURL, "/api/uploads/")
	os.Remove(filepath.Join("data/uploads", name))
}
