package main

import (
	"embed"
	"fmt"
	"io/fs"
	"log"
	"net/http"
)

//go:embed web
var webFiles embed.FS

func main() {
	db, err := openStore()
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	mux := http.NewServeMux()
	mux.HandleFunc("GET /health", func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprint(w, "ok")
	})
	mux.HandleFunc("GET /api/products", listProductsHandler(db))
	mux.HandleFunc("POST /api/products", createProductHandler(db))
	mux.HandleFunc("GET /api/products/{id}", getProductHandler(db))
	mux.HandleFunc("PUT /api/products/{id}", updateProductHandler(db))
	mux.HandleFunc("DELETE /api/products/{id}", deleteProductHandler(db))
	mux.HandleFunc("PATCH /api/variants/{id}/stock", adjustStockHandler(db))
	mux.HandleFunc("POST /api/upload", uploadImageHandler)
	mux.HandleFunc("GET /api/uploads/{filename}", serveUploadHandler)

	webFS, err := fs.Sub(webFiles, "web")
	if err != nil {
		log.Fatal(err)
	}
	mux.Handle("/", http.FileServer(http.FS(webFS)))
	log.Fatal(http.ListenAndServe(":3006", mux))
}
