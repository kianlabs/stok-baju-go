package main

import (
	"crypto/rand"
	"encoding/hex"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"regexp"
	"strings"
)

func uploadImageHandler(w http.ResponseWriter, r *http.Request) {
	r.Body = http.MaxBytesReader(w, r.Body, 5<<20)
	if err := r.ParseMultipartForm(5 << 20); err != nil {
		writeError(w, http.StatusBadRequest, "file terlalu besar atau form salah")
		return
	}
	file, _, err := r.FormFile("photo")
	if err != nil {
		writeError(w, http.StatusBadRequest, "tidak ada file photo")
		return
	}
	defer func() { _ = file.Close() }()

	data, err := io.ReadAll(file)
	if err != nil {
		writeError(w, http.StatusBadRequest, "gagal baca file")
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
		writeError(w, http.StatusBadRequest, "hanya boleh gambar JPG/PNG/WebP/GIF")
		return
	}
	b := make([]byte, 16)
	if _, err := rand.Read(b); err != nil {
		writeError(w, http.StatusInternalServerError, "gagal buat nama file")
		return
	}
	name := hex.EncodeToString(b) + ext
	if err := os.MkdirAll("data/uploads", 0o755); err != nil {
		writeError(w, http.StatusInternalServerError, "gagal buat folder upload")
		return
	}
	if err := os.WriteFile(filepath.Join("data/uploads", name), data, 0o644); err != nil {
		writeError(w, http.StatusInternalServerError, "gagal simpan file")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"success": true,
		"data":    map[string]any{"url": "/api/uploads/" + name},
	})
}

func serveUploadHandler(w http.ResponseWriter, r *http.Request) {
	name := r.PathValue("filename")
	ok, _ := regexp.MatchString(`^[a-f0-9]{32}\.(jpg|png|webp|gif)$`, name)
	if !ok {
		writeError(w, http.StatusBadRequest, "nama file tidak valid")
		return
	}
	http.ServeFile(w, r, filepath.Join("data/uploads", name))
}

func deletePhotoFile(imageURL string) {
	if !strings.HasPrefix(imageURL, "/api/uploads/") {
		return
	}
	name := strings.TrimPrefix(imageURL, "/api/uploads/")
	if err := os.Remove(filepath.Join("data/uploads", name)); err != nil {
		log.Println(err)
	}
}
