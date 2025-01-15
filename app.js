// Config the env and DB conncetion
import { config } from "dotenv";
import { connectToMongoDB } from "./src/config/DB.js";
import "./src/config/cloudinary.js";
import path from 'path';

// import passport from 'passport';
// import './config/passport.js';

// app.use(passport.initialize());
config();
connectToMongoDB();

// Define the server with express library
import express from "express";
const app = express();
const port = Number(process.env.PORT) || 3003;

// Global Middlewares (imports + use)
import cors from "cors";
import cookieParser from "cookie-parser";

app.use(cors({
    optionsSuccessStatus: 200,
    credentials: true,
    origin: ["http://localhost:9999","https://buy-wise.onrender.com"]
}));

app.use(express.json());
app.use(cookieParser());

// Routes (imports + use)

import {authRouter }from './src/routes/auth.route.js';
import { productRouter } from './src/routes/product.route.js';
import { categoryRouter } from './src/routes/category.route.js';
// import {VendorAnalyticsRouter} from './src/routes/vendor.analytics.routes.js';
import {analyticsRouter} from './src/routes/analytics.routes.js';
import { vendorRouter } from './src/routes/vendor.routes.js';


// Routes
app.use('/vendor', vendorRouter);

app.use('/analytics', analyticsRouter);

app.use('/user', authRouter);

app.use('/products', productRouter);

app.use('/categories', categoryRouter);

// Serve React app for all non-API routes (last route)
app.get('*', (req, res) => {
    res.sendFile(path.resolve('dist', 'index.html'));
});



app.listen(port, () => console.log(`Server running on port:http://localhost:${port}`));