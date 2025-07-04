import React, { useEffect, useState } from "react";
import axios from "axios";
import UploadCard from "./UploadCard";

export default function ProductCard({ code }) {
  const [product, setProduct] = useState(null);

  useEffect(() => {
    axios.get(`/api/products/${code}`).then(res => setProduct(res.data));
  }, [code]);

  if (!product) return <div>Загрузка...</div>;

  return (
    <div>
      <h3>{product.name}</h3>
      <p>Код: {product.code}</p>
      <p>Цена: {product.price} руб.</p>
      <p>Описание: {product.description || "Нет описания"}</p>
      {product.image && (
        <img src={product.image} alt={product.name} style={{maxWidth: 200}} />
      )}
      <UploadCard code={code} />
    </div>
  );
} 