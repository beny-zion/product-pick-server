// Config imports
import { config } from "dotenv";
import { connectToMongoDB } from "./src/config/DB.js";
import "./src/config/cloudinary.js";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import path from 'path';
import { fileURLToPath } from 'url';

// Route imports
import { authRouter } from './src/routes/auth.route.js';
import { productRouter } from './src/routes/product.route.js';
import { categoryRouter } from './src/routes/category.route.js';
import { analyticsRouter } from './src/routes/analytics.routes.js';
import { vendorRouter } from './src/routes/vendor.routes.js';

// Initialize app
config();
const app = express();
const port = Number(process.env.PORT) || 3003;

// Connect to DB
connectToMongoDB();

// Basic Middlewares
app.use(cors({
    optionsSuccessStatus: 200,
    credentials: true,
    origin: ["http://localhost:9999","https://buy-wise.onrender.com"]
}));
app.use(express.json());
app.use(cookieParser());

// Static files middleware
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(path.join(__dirname, 'dist')));

// API Routes
app.use('/vendor', vendorRouter);
app.use('/analytics', analyticsRouter);
app.use('/user', authRouter);
app.use('/products', productRouter);
app.use('/categories', categoryRouter);

// Catch-all handler for React Router
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Start server
app.listen(port, () => console.log(`Server running on port:http://localhost:${port}`));