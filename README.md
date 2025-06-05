# Grocery Product API 🛒

A simple REST API using **Node.js** and **Express.js** to manage grocery products. Data is saved in `grocery.json`, and all incoming requests are logged in `logs.txt`.

---

## Features

* Full CRUD: Create, Read, Update, Delete
* Filter by category, brand, price, stock
* Pagination support
* Request logging to `logs.txt`
* No database required – uses local JSON file

---

## API Endpoints

### 🔹 GET `/products`

Returns all products. Supports filters:

**Query parameters:**

* `category`, `brand`
* `inStock` (`true`/`false`)
* `priceMin`, `priceMax`
* `page`, `limit` (for pagination)

**Example:**
`/products?category=fruit&priceMin=10&page=1&limit=5`

---

### 🔹 GET `/products/:id`

Get one product by ID.

---

### 🔹 POST `/products`

Add a new product.
**Required fields:**

```json
{
  "name": "Apple",
  "category": "Fruits",
  "price": 25,
  "inStock": true,
  "quantity": 100,
  "brand": "FarmFresh"
}
```

---

### 🔹 PUT `/products/:id`

Update product by ID.
All fields must be included.

---

### 🔹 DELETE `/products/:id`

Delete product by ID.

---

## 📝 logs.txt

Every request is saved in `logs.txt` with:

* Timestamp
* HTTP method
* Request URL

**Example log entry:**

```
2025-06-05T12:34:56.789Z GET /products
```

The file is created automatically if it doesn't exist.

---

## Getting Started

```bash
npm install
node index.js
```

Visit:
`http://localhost:3000/products`
