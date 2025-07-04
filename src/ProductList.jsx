import React, { useEffect, useState } from "react";
import axios from "axios";

export default function ProductList({ onSelect }) {
  const [products, setProducts] = useState([]);

  useEffect(() => {
    axios.get("/api/products").then(res => setProducts(res.data));
  }, []);

  return (
    <div>
      <h2>Товары</h2>
      <ul>
        {products.map(p => (
          <li key={p.code}>
            <button onClick={() => onSelect(p.code)}>
              {p.name} — {p.price} руб.
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
} 