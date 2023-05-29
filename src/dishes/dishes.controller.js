const path = require("path");

// Use the existing dishes data
const dishes = require(path.resolve("src/data/dishes-data"));

// Use this function to assign ID's when necessary
const nextId = require("../utils/nextId");

// handler for a GET request to /dishes route
function list(req, res) {
  res.json({ data: dishes });
}

// middleware to check if the request body has the requisite data properties
function bodyDataHas(propertyName) {
  return function (req, res, next) {
    const { data = {} } = req.body;
    if (data[propertyName]) {
      return next();
    }
    return next({ status: 400, message: `Dish must include a ${propertyName}` });
  };
}

// middleware to check if the request body has a valid price property
function pricePropertyValid(req, res, next) {
  const { data: { price } = {} } = req.body;
  if (Number.isInteger(price) && price > 0) {
    return next();
  } else {
    return next({ status: 400, message: `Dish must have a price that is an integer greater than 0` });
  }
}

// handler for a POST request to /dishes route
function create(req, res) {
  const { data: { name, description, price, image_url } = {} } = req.body;
  const newDish = {
    id: nextId(),
    name,
    description,
    price,
    image_url,
  };
  dishes.push(newDish);
  res.status(201).json({ data: newDish });
}

// middleware to check if the dish ID exists
function dishExists(req, res, next) {
  const { dishId } = req.params;
  const foundDish = dishes.find((dish) => dish.id === dishId);
  if (foundDish) {
    res.locals.dish = foundDish;
    return next();
  }
  next({
    status: 404,
    message: `Dish does not exist: ${dishId}.`,
  });
}

// handler for a GET request to /dishes/:dishId route
function read(req, res) {
  res.json({ data: res.locals.dish });
}

// middleware to check if the dish ID matches the dishId route parameter
function dishIdMatches(req, res, next) {
  const { dishId } = req.params;
  const { id } = req.body.data || {};

  if (id && id !== dishId) {
    return next({ status: 400, message: `Dish id does not match route id. Dish: ${id}, Route: ${dishId}` });
  }

  return next();
}

// handler for a PUT request to /dishes/:dishId route
function update(req, res) {
  const dish = res.locals.dish;
  const { data: { name, description, price, image_url } = {} } = req.body;

  // Update the dish
  dish.name = name;
  dish.description = description;
  dish.price = price;
  dish.image_url = image_url;
  

  res.json({ data: dish });
}

module.exports = {
  create: [bodyDataHas("name"), bodyDataHas("description"), bodyDataHas("price"), bodyDataHas("image_url"), pricePropertyValid, create],
  list,
  read: [dishExists, read],
  update: [dishExists, dishIdMatches, bodyDataHas("name"), bodyDataHas("description"), bodyDataHas("price"), bodyDataHas("image_url"), pricePropertyValid, update],
};