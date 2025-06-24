const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 4000;

app.use(cors());
app.use(express.json());

let restaurants = []; // In-memory for now

app.get('/api/restaurants', (req, res) => {
  res.json(restaurants);
});

app.post('/api/restaurants', (req, res) => {
  const newRestaurant = req.body;
  if (!newRestaurant.name) {
    return res.status(400).json({ error: 'Name is required' });
  }
  restaurants.push(newRestaurant);
  res.status(201).json(newRestaurant);
});

app.put('/api/restaurants/:name', (req, res) => {
  const name = req.params.name;
  const updated = req.body;

  restaurants = restaurants.map((r) =>
    r.name === name ? { ...r, ...updated } : r
  );
  res.json({ message: 'Updated' });
});

app.delete('/api/restaurants/:name', (req, res) => {
  const name = req.params.name;
  restaurants = restaurants.filter((r) => r.name !== name);
  res.json({ message: 'Deleted' });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
