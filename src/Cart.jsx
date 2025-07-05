import React, { useState } from "react";

function generateOrderText(cart, fields) {
  let txt = `Заказ\n`;
  if (fields.company) txt += `Компания: ${fields.company}\n`;
  if (fields.email) txt += `Почта: ${fields.email}\n`;
  if (fields.phone) txt += `Телефон: ${fields.phone}\n`;
  txt += `\nТовары:\n`;
  txt += `Код | Наименование | Артикул | Производитель | Цена | Кол-во | Сумма\n`;
  cart.forEach(item => {
    txt += `${item.code} | ${item.name} | ${item.article || ''} | ${item.manufacturer || ''} | ${item.price} | ${item.qty} | ${item.price * item.qty}\n`;
  });
  const total = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  txt += `\nИтого: ${total}`;
  return txt;
}

export default function Cart({ cart, removeFromCart, setCart }) {
  const [showForm, setShowForm] = useState(false);
  const [fields, setFields] = useState({ company: "", email: "", phone: "" });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [selected, setSelected] = useState([]);

  const total = cart.reduce((sum, item) => sum + item.price * item.qty, 0);

  const handleField = e => setFields(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSend = async (e, customCart) => {
    e.preventDefault();
    setSending(true);
    setSent(false);
    const txt = generateOrderText(customCart || cart, fields);
    // Скачивание файла
    const blob = new Blob([txt], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "order.txt";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    // EmailJS (заготовка)
    /*
    await emailjs.send('YOUR_SERVICE_ID', 'YOUR_TEMPLATE_ID', {
      message: txt,
      company: fields.company,
      email: fields.email,
      phone: fields.phone
    }, 'YOUR_USER_ID');
    */
    setSending(false);
    setSent(true);
  };

  const handleQtyChange = (code, value) => {
    const qty = Number(value);
    setCart(prev => prev.map(i => i.code === code ? { ...i, qty: qty > 0 ? qty : 1 } : i));
  };

  const handleSelect = (code, checked) => {
    setSelected(sel => checked ? [...sel, code] : sel.filter(c => c !== code));
  };

  const handleSelectAll = (checked) => {
    setSelected(checked ? cart.map(i => i.code) : []);
  };

  const handleRemoveSelected = () => {
    setCart(prev => prev.filter(i => !selected.includes(i.code)));
    setSelected([]);
  };

  const handleOrderSelected = (e) => {
    const selectedCart = cart.filter(i => selected.includes(i.code));
    handleSend(e, selectedCart);
  };

  const handleRemoveAll = () => {
    setCart([]);
    setSelected([]);
  };

  return (
    <div style={{marginTop: 32}}>
      <h3>Корзина</h3>
      {cart.length === 0 ? <div>Корзина пуста</div> : (
        <>
          <div style={{marginBottom:8}}>
            <button onClick={handleRemoveAll}>Удалить все</button>
            <button onClick={handleRemoveSelected} disabled={selected.length === 0} style={{marginLeft:8}}>Удалить выбранные</button>
            <button onClick={handleOrderSelected} disabled={selected.length === 0} style={{marginLeft:8}}>Заказать выбранные</button>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th><input type="checkbox" checked={selected.length === cart.length && cart.length > 0} onChange={e => handleSelectAll(e.target.checked)} /></th>
                <th style={{ textAlign: "left" }}>Наименование</th>
                <th>Код</th>
                <th>Артикул</th>
                <th>Производитель</th>
                <th>Цена</th>
                <th>Кол-во</th>
                <th>Сумма</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {cart.map(item => (
                <tr key={item.code} style={selected.includes(item.code) ? {background:'#e3f0ff'} : {}}>
                  <td><input type="checkbox" checked={selected.includes(item.code)} onChange={e => handleSelect(item.code, e.target.checked)} /></td>
                  <td>{item.name}</td>
                  <td>{item.code}</td>
                  <td>{item.article}</td>
                  <td>{item.manufacturer}</td>
                  <td>{item.price}</td>
                  <td>
                    <input
                      type="number"
                      min="1"
                      value={item.qty}
                      onChange={e => handleQtyChange(item.code, e.target.value)}
                      style={{ width: 60 }}
                    />
                  </td>
                  <td>{item.price * item.qty}</td>
                  <td>
                    <button onClick={() => removeFromCart(item.code)}>Удалить</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{marginTop:8, fontWeight:'bold'}}>Итого: {total}</div>
          {!showForm && (
            <button style={{marginTop:16}} onClick={() => setShowForm(true)}>Оформить заказ</button>
          )}
          {showForm && (
            <form onSubmit={handleSend} style={{marginTop:16, background:'#f8f8f8', padding:16, borderRadius:8, maxWidth:400}}>
              <div style={{marginBottom:8}}>
                <label>Название компании: <input name="company" value={fields.company} onChange={handleField} /></label>
              </div>
              <div style={{marginBottom:8}}>
                <label>Почта: <input name="email" value={fields.email} onChange={handleField} type="email" /></label>
              </div>
              <div style={{marginBottom:8}}>
                <label>Телефон: <input name="phone" value={fields.phone} onChange={handleField} type="tel" /></label>
              </div>
              <button type="submit" disabled={sending}>{sending ? "Отправка..." : "Отправить"}</button>
              {sent && <span style={{marginLeft:8, color:'green'}}>Заказ отправлен и сохранён!</span>}
            </form>
          )}
        </>
      )}
    </div>
  );
} 