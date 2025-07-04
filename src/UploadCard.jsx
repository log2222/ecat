import React, { useState } from "react";
import axios from "axios";

export default function UploadCard({ code }) {
  const [description, setDescription] = useState("");
  const [image, setImage] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!image) return alert("Выберите изображение");
    const formData = new FormData();
    formData.append("description", description);
    formData.append("image", image);
    await axios.post(`/api/products/${code}/card`, formData);
    alert("Карточка загружена!");
    setDescription("");
    setImage(null);
    window.location.reload();
  };

  return (
    <form onSubmit={handleSubmit}>
      <textarea
        value={description}
        onChange={e => setDescription(e.target.value)}
        placeholder="Описание"
        required
      />
      <input
        type="file"
        accept="image/*"
        onChange={e => setImage(e.target.files[0])}
        required
      />
      <button type="submit">Загрузить карточку</button>
    </form>
  );
} 