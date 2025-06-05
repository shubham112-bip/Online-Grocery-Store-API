import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

// Variable is use to access all propertise of exress
const app = express();

// Variable is use to define PORT number
const PORT = 3000;

// ── GET __dirname & __filename (ES Modules) ─────────────────────
const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// ── Paths ───────────────────────────────────────────────────────
const DATA_PATH = path.join(__dirname, 'grocery.json');
const LOG_PATH  = path.join(__dirname, 'logs.txt');

// ── Ensure grocery.json exists (initialize with an empty array if not) ─
async function ensureDataFile() {
  try {
    await fs.access(DATA_PATH);
  } catch {
    await fs.writeFile(DATA_PATH, '[]', 'utf8');
  }
}

// ── Read & parse all products from grocery.json ───────────────────
async function readProducts() {
  const content = await fs.readFile(DATA_PATH, 'utf8');
  return JSON.parse(content);
}

// ── Write updated products array back to grocery.json ─────────────
async function writeProducts(products) {
  await fs.writeFile(DATA_PATH, JSON.stringify(products, null, 2), 'utf8');
}

// ── Middleware: parse JSON bodies ─────────────────────────────────
app.use(express.json());

// ── Middleware: log every request to logs.txt ─────────────────────
app.use(async (req, res, next) => {
  const timestamp = new Date().toISOString();
  const logEntry  = [`${timestamp} ${req.method} ${req.url}\n`];
  try {
    await fs.appendFile(LOG_PATH, logEntry, 'utf8');
  } catch {
    // If logs.txt doesn't exist, appendFile will create it automatically
    await fs.writeFile(LOG_PATH,logEntry,'utf8');
  }
  next();
});

// ── ROUTES ────────────────────────────────────────────────────────

// 1. GET /products
//    - Returns all products, possibly filtered by query strings and paginated.
app.get('/products', async (req, res) => {
  try {
    let products = await readProducts();

    // ── Filter by category, brand, inStock, price range ───────────
    const { category, brand, inStock, priceMin, priceMax, page, limit } = req.query;

    if (category) {
      products = products.filter(p => p.category.toLowerCase() === category.toLowerCase());

      if(category.length === 0)
        return res.status(400).json({error:`Category ${category} not available`});
    }
    if (brand) {
      products = products.filter(p => p.brand.toLowerCase() === brand.toLowerCase());

      if(brand.length === 0)
        return res.status(400).json({error:`Brand ${brand} not available`});
    }
    if (inStock !== undefined) {
      // inStock query might be "true" or "false"
      const boolStock = inStock.toLowerCase() === 'true';
      products = products.filter(p => p.inStock === boolStock);

    }
    if (priceMin !== undefined) {
      const min = parseFloat(priceMin);
      products = products.filter(p => p.price >= min);

      if (products.length === 0)
        return res.status(400).json(({error:`Price ${priceMin} is high`}));
    }
    if (priceMax !== undefined) {
      const max = parseFloat(priceMax);
      products = products.filter(p => p.price <= max);
      
      if(priceMax.length === 0)
        return res.status(400).json({error:`Price ${priceMax} is Min`})
    }

    // ── Pagination ───────────────────────────────────────────────
    if (page !== undefined && limit !== undefined) {
      const pageNum  = parseInt(page, 10);
      const limitNum = parseInt(limit, 10);
      const start    = (pageNum - 1) * limitNum;
      const end      = start + limitNum;
      products = products.slice(start, end);
    }

    return res.json(products);
  } catch (err) {
    console.error(err);
    return res.status(500).send('Internal Server Error');
  }
});

// 2. GET /products/:id
//    - Returns a single product by ID
app.get('/products/:id', async (req, res) => {
  try {
    const data = await readProducts();
    const id       = parseInt(req.params.id, 10);
    const products = data.products;
    const product = products.find(p => p.id === id);

    if (!product) {
      return res.status(404).send('Product not found');
    }
    return res.json(product);
  } catch (err) {
    console.error(err);
    return res.status(500).send('Internal Server Error');
  }
});

// 3. POST /products
//    - Adds a new product (requires name, category, price, inStock, quantity, brand)
app.post('/products', async (req, res) => {
  try {
    const { name, category, price, inStock, quantity, brand } = req.body;

    if (!name || !category || price === undefined || inStock === undefined || quantity === undefined || !brand) {
      return res.status(400).json({ error: 'All fields are required: name, category, price, inStock, quantity, brand' });
    }

    const products = await readProducts();
    const nextId = products.length
      ? Math.max(...products.map(p => p.id)) + 1
      : 1;

    const newProduct = {
      id: nextId,
      name,
      category,
      price: parseFloat(price),
      inStock: Boolean(inStock),
      quantity: parseInt(quantity, 10),
      brand
    };

    products.push(newProduct);
    await writeProducts(products);
    return res.status(201).json(newProduct);
  } catch (err) {
    console.error(err);
    return res.status(500).send('Internal Server Error');
  }
});

// 4. PUT /products/:id
//    - Update an existing product by ID
app.put('/products/:id', async (req, res) => {
  try {
    const { name, category, price, inStock, quantity, brand } = req.body;
    const id = parseInt(req.params.id, 10);

    if (!name || !category || price === undefined || inStock === undefined || quantity === undefined || !brand) {
      return res.status(400).json({ error: 'All fields are required: name, category, price, inStock, quantity, brand' });
    }

    const products = await readProducts();
    const idx = products.findIndex(p => p.id === id);

    if (idx === -1) {
      return res.status(404).send('Product not found');
    }

    products[idx] = {
      id,
      name,
      category,
      price: parseFloat(price),
      inStock: Boolean(inStock),
      quantity: parseInt(quantity, 10),
      brand
    };

    await writeProducts(products);
    return res.json(products[idx]);
  } catch (err) {
    console.error(err);
    return res.status(500).send('Internal Server Error');
  }
});

// 5. DELETE /products/:id
//    - Delete a product by ID
app.delete('/products/:id', async (req, res) => {
  try {
    const products = await readProducts();
    const id       = parseInt(req.params.id, 10);
    const filtered = products.filter(p => p.id !== id);

    if (filtered.length === products.length) {
      return res.status(404).send('Product not found');
    }

    await writeProducts(filtered);
    return res.status(204).end();
  } catch (err) {
    console.error(err);
    return res.status(500).send('Internal Server Error');
  }
});

// ── Initialize data file & start server ─────────────────────────
ensureDataFile().then(() => {
  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
}).catch(err => {
  console.error('Failed to initialize data file:', err);
});