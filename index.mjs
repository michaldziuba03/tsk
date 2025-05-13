import dotenv from "dotenv";
import { CronJob } from "cron";
import * as csv from 'csv';
import express from 'express';
import { MemoryStorage } from "./memory.mjs";

dotenv.config();

const DOMAIN = "zooart6.yourtechnicaldomain.com";
const API_KEY = process.env.API_KEY;
const BASIC_USERNAME = process.env.BASIC_USERNAME;
const BASIC_PASSWORD = process.env.BASIC_PASSWORD;

if (!API_KEY) {
  throw new Error("API_KEY is not set in the environment variables.");
}

if (!BASIC_USERNAME || !BASIC_PASSWORD) {
  throw new Error("BASIC AUTH IS NOT CONFIGURED");
}

const ORDERS_SEARCH_URL = `https://${DOMAIN}/api/admin/v5/orders/orders/search`;

const storage = new MemoryStorage();

async function fetchAllOrders() {
  const body = {
    params: {
      shippmentStatus: "all", // wymagany jest jakiś parametr
    },
  };

  storage.clear("orders");

  let count = 0;
  let allOrders = 1;

  while (count < allOrders) {
    const response = await fetch(ORDERS_SEARCH_URL, {
      method: "POST",
      body: JSON.stringify(body),
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "X-API-KEY": API_KEY,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const json = await response.json();
    const data = mapOrders(json.Results);

    storage.bulkAdd("orders", data);
    count = storage.count("orders");
    allOrders = json.resultsNumberAll;
    console.log(`Fetched ${count} / ${allOrders}`);
  }

  return storage.get("orders");
}

function mapOrders(results) {
  return results.map((order) => ({
    orderID: order.orderId,
    products: mapProducts(order.orderDetails.productsResults),
    orderWorth: getOrderWorth(order),
  }));
}

function mapProducts(productsResults) {
  return productsResults.map((product) => ({
    productID: product.productId,
    quantity: product.productQuantity,
  }));
}

function getOrderWorth(order) {
  const baseCurrency = order.orderDetails.payments.orderBaseCurrency;

  const productCost = baseCurrency.orderProductsCost || 0;
  const deliveryCost = baseCurrency.orderDeliveryCost || 0;
  const payformCost = baseCurrency.orderPayformCost || 0;
  const insuranceCost = baseCurrency.orderInsuranceCost || 0;

  return productCost + deliveryCost + payformCost + insuranceCost;
}

// w realu bym użył BullMQ + Redis do takich zadań
// może ta biblioteka cron tu niepotrzebna i użyć zwykłego setInterval co 24h co lepiej by grało z początkowym pobieraniem danych
CronJob.from({
  cronTime: "0 0 * * *",
  onTick: async function () {
    console.log("Executing daily task");
    /* wada tego rozwiązania:
    pobieranie wszystkich zamówień co każdy update, lecz z drugiej strony nie wiem czy API pozwala na coś więcej
    podejrzewam, że można użyć ordersRange.ordersDateRange.ordersDateBegin i zapamiętać date ostatniego update'u */
    await fetchAllOrders();
  },
  start: true,
});

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


/* W realu bym pewnie to bym streamował kawałkami zamiast pobierać z 1000 elementów do pamięci i generować z nich CSV */
app.get("/orders", basicAuth, (req, res) => {
  let orders = storage.get("orders");
  if (!orders.length) {
    res.status(404).send("No orders found");
    return;
  }

  const minWorth = intOr(req.query.minWorth, 0);
  const maxWorth = intOr(req.query.maxWorth, Infinity);
  orders = orders.filter((order) => order.orderWorth >= minWorth && order.orderWorth <= maxWorth);

  csv.stringify(orders, (err, output) => {
    if (err) {
      res.status(500).send("Error generating CSV");
      return;
    }
    res.header("Content-Type", "text/csv");
    res.attachment("orders.csv");
    res.send(output);
  });
});

app.get("/orders/:id", basicAuth, (req, res) => {
  const orderId = req.params.id;
  const orders = storage.get("orders");
  const order = orders.find((o) => o.orderID === orderId);

  if (!order) {
    res.status(404).send("Order not found");
    return;
  }

  res.json(order);  // nie wiem czy mam to zwrócić jako json czy też jako csv
});

function intOr(input, fallback) {
  const parsed = parseInt(input);
  return isNaN(parsed) ? fallback : parsed;
}

function basicAuth(req, res, next) {
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Basic ')) {
    res.set('WWW-Authenticate', 'Basic realm="Orders API"');
    return res.status(401).send('Authentication required');
  }

  const encoded = authHeader.split(' ')[1];
  const credentials = Buffer.from(encoded, 'base64').toString('utf8');
  const [username, password] = credentials.split(':');

  if (username === BASIC_USERNAME && password === BASIC_PASSWORD) {
    return next();
  }

  res.set('WWW-Authenticate', 'Basic realm="Orders API"');
  return res.status(401).send('Invalid credentials');
}

app.listen(4000, () => {
  console.log("Server is running on port 4000");
});

fetchAllOrders(); // początkowe pobieranie zamówień
