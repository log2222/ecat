import React, { useState, useRef, useEffect } from "react";
import CategoryTree from "./CategoryTree";
import ProductTable from "./ProductTable";
import Cart from "./Cart";

export default function App() {
  const [groupId, setGroupId] = useState(null);
  const [resetQuantitiesTrigger, setResetQuantitiesTrigger] = useState(0);
  const [cart, setCart] = useState([]);
  const cartRef = useRef(null);
  const [theme, setTheme] = useState(() => localStorage.getItem("theme") || "light");
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [showGroups, setShowGroups] = useState(false);

  useEffect(() => {
    localStorage.setItem("theme", theme);
  }, [theme]);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleSelectGroup = (groupCodes) => {
    setGroupId(groupCodes);
    setResetQuantitiesTrigger(t => t + 1);
    if (isMobile) setShowGroups(false);
  };

  // Обновить корзину при изменении количества
  const handleQtyChange = (item, qty) => {
    setCart(prev => {
      if (!qty || qty <= 0) {
        return prev.filter(i => i.code !== item.code);
      }
      const existing = prev.find(i => i.code === item.code);
      if (existing) {
        return prev.map(i =>
          i.code === item.code ? { ...i, qty } : i
        );
      }
      return [...prev, { ...item, qty }];
    });
  };

  // Удалить товар из корзины
  const removeFromCart = (code) => {
    setCart(prev => prev.filter(i => i.code !== code));
  };

  // Подсчёт количества и суммы
  const cartCount = cart.reduce((sum, item) => sum + (Number(item.qty) || 0), 0);
  const cartSum = cart.reduce((sum, item) => sum + (Number(item.price) * Number(item.qty) || 0), 0);

  // Скролл к корзине
  const scrollToCart = (e) => {
    e.preventDefault();
    if (cartRef.current) {
      cartRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className={theme === "dark" ? "dark-theme" : "light-theme"}>
      <div className="cart-fixed-panel" style={{ position: "fixed", top: 0, right: 0, padding: 8, zIndex: 1000, fontSize: 15, borderBottomLeftRadius: 8, boxShadow: '0 2px 8px #0001' }}>
        <span>Кол-во товаров в корзине: <b>{cartCount}</b>, сумма: <b>{cartSum.toLocaleString()} р.</b>, <a href="#cart" onClick={scrollToCart} className="cart-link">перейти в корзину</a></span>
        <button onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          style={{ marginLeft: 16, padding: '2px 10px', borderRadius: 4, border: '1px solid #bbb', cursor: 'pointer' }}>
          {theme === "dark" ? "Светлая тема" : "Тёмная тема"}
        </button>
      </div>
      <div style={{ display: isMobile ? "block" : "flex", alignItems: "flex-start", marginTop: 40 }}>
        {isMobile ? (
          <>
            <div style={{ width: '100%', padding: 8, marginBottom: 8 }}>
              <button
                className="show-groups-btn"
                onClick={() => setShowGroups(true)}
                style={{ padding: '8px 16px', borderRadius: 6, border: '1px solid #bbb', background: '#f5f5f5', width: '100%', fontSize: 17, marginBottom: 8 }}
              >
                Категории
              </button>
            </div>
            {showGroups && (
              <div className="groups-overlay" style={{
                position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                background: theme === 'dark' ? '#222' : '#fff',
                color: theme === 'dark' ? '#eee' : '#222',
                zIndex: 2000, overflowY: 'auto', padding: 16
              }}>
                <button onClick={() => setShowGroups(false)} style={{ position: 'absolute', top: 12, right: 16, fontSize: 28, background: 'none', border: 'none', color: '#888', cursor: 'pointer' }}>×</button>
                <CategoryTree onSelect={handleSelectGroup} />
              </div>
            )}
            <div className="main-panel" style={{ width: '100%', padding: 8 }}>
              <ProductTable groupId={groupId} resetQuantitiesTrigger={resetQuantitiesTrigger} onQtyChange={handleQtyChange} />
              <div ref={cartRef} id="cart">
                <Cart cart={cart} removeFromCart={removeFromCart} setCart={setCart} />
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="side-panel" style={{ width: 300, minWidth: 200, borderRight: "1px solid #ccc", padding: 16 }}>
              <button
                className="show-all-btn"
                onClick={() => {
                  if (groupId !== null) {
                    setGroupId(null);
                    setResetQuantitiesTrigger(t => t + 1);
                  }
                }}
                style={{ marginBottom: 8, padding: '4px 12px', borderRadius: 4, border: '1px solid #bbb', cursor: 'pointer' }}
              >
                Показать все товары (убрать фильтр по группам)
              </button>
              <CategoryTree onSelect={handleSelectGroup} />
            </div>
            <div className="main-panel" style={{ flex: 1, padding: 16 }}>
              <ProductTable groupId={groupId} resetQuantitiesTrigger={resetQuantitiesTrigger} onQtyChange={handleQtyChange} />
              <div ref={cartRef} id="cart">
                <Cart cart={cart} removeFromCart={removeFromCart} setCart={setCart} />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
} 