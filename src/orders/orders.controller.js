const path = require("path");

// Use the existing order data
const orders = require(path.resolve("src/data/orders-data"));

// Use this function to assigh ID's when necessary
const nextId = require("../utils/nextId");

// handler for a GET request to /orders route
function list(req, res) {
  res.json({ data: orders });
}

// middleware to check if the request body has the requisite data properties
function bodyDataHas(propertyName) {
  return function (req, res, next) {
    const { data = {} } = req.body;
    if (data[propertyName]) {
      return next();
    }
    return next({ status: 400, message: `Order must include a ${propertyName}` });
  };
}

// middleware to check if the request body has a valid dishes property
function checkDishes(req, res, next) {
  const { data = {} } = req.body;

  if (!Array.isArray(data.dishes) || data.dishes.length === 0) {
    return next({ status: 400, message: "Order must include at least one dish" });
  }

  return next();
}

// middleware to check if the request body has a valid dish quantity property
function dishQuantityPropertyValid(req, res, next) {
  const { data = {} } = req.body;
  const { dishes = [] } = data;

  for (let i = 0; i < dishes.length; i++) {
    const { quantity } = dishes[i];
    if (!quantity || !Number.isInteger(quantity) || quantity <= 0) {
      return next({ status: 400, message: `Dish ${i} must have a quantity that is an integer greater than 0` });
    }
  }

  return next();
}

// handler for a POST request to /orders route
function create(req, res) {
  const { data: { deliverTo, mobileNumber, status, dishes } = {} } = req.body;
  const newOrder = {
    id: nextId(),
    deliverTo,
    mobileNumber,
    status,
    dishes,
  };
  orders.push(newOrder);
  res.status(201).json({ data: newOrder });
}

// middleware to check if the order ID exists
function orderExists(req, res, next) {
  const { orderId } = req.params;
  const foundOrder = orders.find((order) => order.id === orderId);
  if (foundOrder) {
    res.locals.order = foundOrder;
    return next();
  }
  next({
    status: 404,
    message: `Order does not exist: ${orderId}.`,
  });
}

// handler for a GET request to /orders/:orderId route
function read(req, res) {
  res.json({ data: res.locals.order });
}

// middleware to check if the order ID in the request body matches the order ID in the request URL
function orderIdMatches(req, res, next) {
  const { orderId } = req.params;
  const { data: { id } = {} } = req.body;
  if (id && id !== orderId) {
    return next({ status: 400, message: `Order id does not match route id. Order: ${id}, Route: ${orderId}` });
  }
  return next();
}

// middleware to check if the order has a status
function orderStatusValid(req, res, next) {
  const { data: { status } = {} } = req.body;
  if (!status || status === "invalid") {
    return next({ status: 400, message: `Order must have a status of pending, preparing, out-for-delivery, delivered` });
  }
  return next();
}

// middleware to check if the order status is not delivered
function orderStatusNotDelivered(req, res, next) {
  const { data: { status } = {} } = req.body;
  if (status === "delivered") {
    return next({ status: 400, message: `A delivered order cannot be changed` });
  }
  return next();
}

// handler for a PUT request to /orders/:orderId route
function update(req, res) {
  const { data: { deliverTo, mobileNumber, status, dishes } = {} } = req.body;
  const order = res.locals.order;
  order.deliverTo = deliverTo;
  order.mobileNumber = mobileNumber;
  order.status = status;
  order.dishes = dishes;
  res.json({ data: order });
}

// middleware to check if the order status is pending
function orderStatusPending(req, res, next) {
  const order = res.locals.order;
  if (order.status === "pending") {
    return next();
  }
  return next({ status: 400, message: `An order cannot be deleted unless it is pending` });
}

// handler for a DELETE request to /orders/:orderId route
function destroy(req, res) {
  const { orderId } = req.params;
  const index = orders.findIndex((order) => order.id === orderId);
  orders.splice(index, 1);
  res.sendStatus(204);
}

module.exports = {
  list,
  create: [bodyDataHas("deliverTo"), bodyDataHas("mobileNumber"), checkDishes, dishQuantityPropertyValid, create],
  read: [orderExists, read],
  update: [orderExists, bodyDataHas("deliverTo"), bodyDataHas("mobileNumber"), bodyDataHas("status"), orderStatusValid, orderStatusNotDelivered, orderIdMatches, checkDishes, dishQuantityPropertyValid, update],
  delete: [orderExists, orderStatusPending, destroy],
};