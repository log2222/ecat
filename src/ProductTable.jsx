import React, { useEffect, useState, useRef } from "react";
import * as XLSX from "xlsx";
import emailjs from 'emailjs-com';

const PAGE_SIZES = [10, 25];

const SORTS = {
  default: { label: "По умолчанию" },
  price_asc: { label: "Цена", dir: "asc" },
  price_desc: { label: "Цена", dir: "desc" },
  name_asc: { label: "Наименование", dir: "asc" },
  name_desc: { label: "Наименование", dir: "desc" },
};

const CartIcon = ({ onClick }) => (
  <button onClick={onClick} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }} title="Добавить в корзину / Экспресс-счёт">
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61l1.38-7.39H6"/></svg>
  </button>
);

function downloadOrderTxt(item, fields) {
  let txt = `Экспресс-счёт\n`;
  txt += `Код: ${item.code}\nНаименование: ${item.name}\nАртикул: ${item.article || ''}\nПроизводитель: ${item.manufacturer || ''}\nЦена: ${item.price}\n`;
  if (fields) {
    if (fields.name) txt += `Имя: ${fields.name}\n`;
    if (fields.phone) txt += `Телефон: ${fields.phone}\n`;
    if (fields.email) txt += `Почта: ${fields.email}\n`;
  }
  const blob = new Blob([txt], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `order_${item.code}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function sendOrderEmail(item, fields) {
  const templateParams = {
    code: item.code,
    name: item.name,
    article: item.article || '',
    manufacturer: item.manufacturer || '',
    price: item.price,
    qty: fields.qty || 1,
    user_name: fields.name || '',
    user_phone: fields.phone || '',
    user_email: fields.email || ''
  };
  return emailjs.send(
    'service_tn4zeli',
    'template_8956i1h',
    templateParams,
    'n-CjgkgKWU--0Pgsz'
  );
}

export default function ProductTable({ groupId, resetQuantitiesTrigger, onQtyChange }) {
  const [allProducts, setAllProducts] = useState([]); // все товары выбранной группы
  const [products, setProducts] = useState([]); // отображаемые товары
  const [quantities, setQuantities] = useState({});
  const [search, setSearch] = useState("");
  const [articleSearch, setArticleSearch] = useState("");
  const [manufacturerSearch, setManufacturerSearch] = useState("");
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [sort, setSort] = useState("default");
  const [sortDir, setSortDir] = useState("asc");
  const [pageSize, setPageSize] = useState(25);
  const [customPageSize, setCustomPageSize] = useState("");
  const [page, setPage] = useState(1);
  const lastGroupId = useRef(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalItem, setModalItem] = useState(null);
  const [modalQty, setModalQty] = useState(1);
  const [showExpress, setShowExpress] = useState(false);
  const [expressFields, setExpressFields] = useState({ name: '', phone: '', email: '' });
  const [popoverPos, setPopoverPos] = useState({ top: 0, left: 0 });
  const cartIconRefs = useRef({});
  const [activeCartCode, setActiveCartCode] = useState(null);

  // Сброс количеств и товаров при изменении resetQuantitiesTrigger
  useEffect(() => {
    setQuantities({});
    setProducts([]);
    setAllProducts([]);
    setPage(1);
    lastGroupId.current = null;
  }, [resetQuantitiesTrigger]);

  // Загружаем все товары выбранной группы
  useEffect(() => {
    fetch(`/items.json`)
      .then(r => r.json())
      .then(data => {
        if (groupId && groupId.length > 0) {
          const filtered = data.filter(item => groupId.includes(item.group_code));
          setAllProducts(filtered);
        } else {
          setAllProducts(data); // Показывать все товары, если groupId не задан
        }
        lastGroupId.current = groupId ? groupId.join(",") : null;
        setPage(1);
      });
  }, [groupId]);

  // Фильтрация и сортировка
  useEffect(() => {
    if (!allProducts.length) {
      setProducts([]);
      setPage(1);
      return;
    }
    let filtered = allProducts;
    if (search) {
      filtered = filtered.filter(p => p.name && p.name.toLowerCase().includes(search.toLowerCase()));
    }
    if (articleSearch) {
      filtered = filtered.filter(p => p.article && p.article.toLowerCase().includes(articleSearch.toLowerCase()));
    }
    if (manufacturerSearch) {
      filtered = filtered.filter(p => p.manufacturer && p.manufacturer.toLowerCase().includes(manufacturerSearch.toLowerCase()));
    }
    if (priceMin) {
      filtered = filtered.filter(p => Number(p.price) >= Number(priceMin));
    }
    if (priceMax) {
      filtered = filtered.filter(p => Number(p.price) <= Number(priceMax));
    }
    // Сортировка
    if (sort !== "default") {
      filtered = [...filtered].sort((a, b) => {
        let aVal = a[sort] || "";
        let bVal = b[sort] || "";
        if (typeof aVal === "string") aVal = aVal.toLowerCase();
        if (typeof bVal === "string") bVal = bVal.toLowerCase();
        if (aVal < bVal) return sortDir === "asc" ? -1 : 1;
        if (aVal > bVal) return sortDir === "asc" ? 1 : -1;
        return 0;
      });
    }
    setProducts(filtered);
    setPage(1);
    // Сбросить количества для скрытых товаров
    setQuantities(q => {
      const newQ = {};
      for (const p of filtered) {
        if (q[p.code]) newQ[p.code] = q[p.code];
      }
      return newQ;
    });
  }, [search, articleSearch, manufacturerSearch, priceMin, priceMax, allProducts, sort, sortDir]);

  // Сброс страницы при смене pageSize
  useEffect(() => { setPage(1); }, [pageSize]);

  const handleQtyChange = (code, value, product) => {
    setQuantities(q => ({ ...q, [code]: value }));
    const qty = Number(value);
    onQtyChange(product, qty);
  };

  // Сортировка по клику на заголовок
  const handleSort = (col) => {
    if (sort === col) {
      setSortDir(dir => dir === "asc" ? "desc" : "asc");
    } else {
      setSort(col);
      setSortDir("asc");
    }
  };

  // Визуальные стрелки
  const arrow = (col) => {
    if (sort === col) {
      return sortDir === "asc" ? " ▲" : " ▼";
    }
    return "";
  };

  // Постраничный вывод
  const total = products.length;
  let pageSizeNum = pageSize === 'all' ? total : Number(pageSize);
  if (customPageSize && !isNaN(Number(customPageSize)) && Number(customPageSize) > 0) {
    pageSizeNum = Number(customPageSize);
  }
  const totalPages = pageSizeNum === 0 ? 1 : Math.ceil(total / pageSizeNum);
  const pagedProducts = pageSizeNum === 0 || pageSize === 'all' ? products : products.slice((page - 1) * pageSizeNum, page * pageSizeNum);

  // Селектор количества на странице
  const PageSizeSelector = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, margin: '8px 0' }}>
      <span>Показывать по:</span>
      {PAGE_SIZES.map(sz => (
        <button key={sz} className="page-size-btn" style={{ padding: '2px 8px', border: pageSize === sz ? '1px solid #1976d2' : '1px solid #ccc', background: pageSize === sz ? '#e3f0ff' : '#fff', cursor: 'pointer' }} onClick={() => { setPageSize(sz); setCustomPageSize(""); }}>
          {sz}
        </button>
      ))}
      <button className="page-size-btn" style={{ padding: '2px 8px', border: pageSize === 'all' ? '1px solid #1976d2' : '1px solid #ccc', background: pageSize === 'all' ? '#e3f0ff' : '#fff', cursor: 'pointer' }} onClick={() => { setPageSize('all'); setCustomPageSize(""); }}>все</button>
      <input
        type="number"
        min={1}
        placeholder="другое"
        value={customPageSize}
        onChange={e => { setCustomPageSize(e.target.value); setPageSize(""); }}
        style={{ width: 60, marginLeft: 4, padding: 2 }}
      />
    </div>
  );

  // Навигация по страницам
  const Pagination = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, margin: '8px 0' }}>
      <button onClick={() => setPage(1)} disabled={page === 1}>⏮</button>
      <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>←</button>
      <span>Стр.</span>
      <input
        type="number"
        min={1}
        max={totalPages}
        value={page}
        onChange={e => {
          let val = Number(e.target.value);
          if (isNaN(val)) val = 1;
          setPage(val);
        }}
        onBlur={e => {
          let val = Number(e.target.value);
          if (isNaN(val) || val < 1) val = 1;
          if (val > totalPages) val = totalPages;
          setPage(val);
        }}
        onKeyDown={e => {
          if (e.key === 'Enter') {
            let val = Number(e.target.value);
            if (isNaN(val) || val < 1) val = 1;
            if (val > totalPages) val = totalPages;
            setPage(val);
          }
        }}
        style={{ width: 50, textAlign: 'center' }}
      />
      <span>из {totalPages}</span>
      <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>→</button>
      <button onClick={() => setPage(totalPages)} disabled={page === totalPages}>⏭</button>
    </div>
  );

  // Сохранить в JSON
  const handleSaveJson = () => {
    const blob = new Blob([JSON.stringify(products, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "products.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Сохранить в XLSX
  const handleSaveXlsx = () => {
    const ws = XLSX.utils.json_to_sheet(products);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Products");
    const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([wbout], { type: "application/octet-stream" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "products.xlsx";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCartIconClick = (item) => {
    setModalItem(item);
    setShowExpress(false);
    setExpressFields({ name: '', phone: '', email: '' });
    setModalOpen(true);
    setActiveCartCode(item.code);
    // Если товар уже есть в корзине — подставить его количество
    setModalQty(quantities[item.code] ? Number(quantities[item.code]) : 1);
    // Позиционируем popover рядом с иконкой
    setTimeout(() => {
      const ref = cartIconRefs.current[item.code];
      if (ref) {
        const rect = ref.getBoundingClientRect();
        setPopoverPos({
          top: rect.bottom + window.scrollY + 6,
          left: rect.left + window.scrollX - 20
        });
      }
    }, 0);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setActiveCartCode(null);
  };

  const handleAddToCart = () => {
    if (modalItem) {
      onQtyChange(modalItem, modalQty);
      setQuantities(q => ({ ...q, [modalItem.code]: modalQty }));
      setModalOpen(false);
      setActiveCartCode(null);
    }
  };

  const handleExpressSend = () => {
    if (modalItem) {
      sendOrderEmail(modalItem, { ...expressFields, qty: modalQty })
        .then(() => {
          alert('Заказ успешно отправлен на почту!');
        })
        .catch(() => {
          alert('Ошибка отправки письма!');
        });
      downloadOrderTxt(modalItem, expressFields);
      setModalOpen(false);
      setActiveCartCode(null);
    }
  };

  return (
    <div>
      {/* Фильтры над таблицей */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
        <input
          type="text"
          placeholder="Поиск по наименованию..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ width: 200, padding: 4, boxSizing: 'border-box' }}
        />
        {search && (
          <button onClick={() => setSearch("")} style={{ marginLeft: -28, background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 16, color: '#888' }}>×</button>
        )}
        <input
          type="text"
          placeholder="Поиск по артикулу..."
          value={articleSearch}
          onChange={e => setArticleSearch(e.target.value)}
          style={{ width: 150, padding: 4, boxSizing: 'border-box' }}
        />
        {articleSearch && (
          <button onClick={() => setArticleSearch("")} style={{ marginLeft: -28, background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 16, color: '#888' }}>×</button>
        )}
        <input
          type="text"
          placeholder="Поиск по производителю..."
          value={manufacturerSearch}
          onChange={e => setManufacturerSearch(e.target.value)}
          style={{ width: 150, padding: 4, boxSizing: 'border-box' }}
        />
        {manufacturerSearch && (
          <button onClick={() => setManufacturerSearch("")} style={{ marginLeft: -28, background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 16, color: '#888' }}>×</button>
        )}
        <input
          type="number"
          placeholder="Цена от"
          value={priceMin}
          onChange={e => setPriceMin(e.target.value)}
          style={{ width: 90, padding: 4, boxSizing: 'border-box' }}
        />
        {priceMin && (
          <button onClick={() => setPriceMin("")} style={{ marginLeft: -28, background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 16, color: '#888' }}>×</button>
        )}
        <input
          type="number"
          placeholder="Цена до"
          value={priceMax}
          onChange={e => setPriceMax(e.target.value)}
          style={{ width: 90, padding: 4, boxSizing: 'border-box' }}
        />
        {priceMax && (
          <button onClick={() => setPriceMax("")} style={{ marginLeft: -28, background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 16, color: '#888' }}>×</button>
        )}
        {/* Выпадающий список сортировки */}
        <select value={sort} onChange={e => setSort(e.target.value)} style={{ marginLeft: 16, padding: 4 }}>
          <option value="default">Без сортировки</option>
          <option value="name">Наименование</option>
          <option value="article">Артикул</option>
          <option value="manufacturer">Производитель</option>
          <option value="price">Цена</option>
        </select>
        <select value={sortDir} onChange={e => setSortDir(e.target.value)} style={{ padding: 4 }}>
          <option value="asc">По возрастанию</option>
          <option value="desc">По убыванию</option>
        </select>
      </div>
      {/* Кнопки экспорта */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        <button className="export-btn" onClick={handleSaveXlsx}>Сохранить в XLSX</button>
        <button className="export-btn" onClick={handleSaveJson}>Сохранить в JSON</button>
      </div>
      <div className="page-size-panel">{PageSizeSelector}</div>
      {Pagination}
      <table className="product-table-zebra" style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'center', cursor: 'default' }}>Код</th>
            <th style={{ textAlign: 'left', cursor: 'pointer' }} onClick={() => handleSort("name")}>Наименование ↕{arrow("name")}</th>
            <th style={{ textAlign: 'center', cursor: 'pointer' }} onClick={() => handleSort("article")}>Артикул ↕{arrow("article")}</th>
            <th style={{ textAlign: 'center', cursor: 'pointer' }} onClick={() => handleSort("manufacturer")}>Производитель ↕{arrow("manufacturer")}</th>
            <th style={{ textAlign: 'center', cursor: 'pointer' }} onClick={() => handleSort("price")}>Цена ↕{arrow("price")}</th>
            <th style={{ textAlign: 'center', cursor: 'default' }}>Склад</th>
            <th style={{ textAlign: 'center', cursor: 'default' }}>Кол-во</th>
            <th style={{ textAlign: 'center', cursor: 'default' }}>Сумма</th>
          </tr>
        </thead>
        <tbody>
          {pagedProducts.map(p => (
            <tr key={p.code} style={activeCartCode === p.code ? { background: '#e6e9f0', border: '2px solid #4a5a6a' } : {}}>
              <td data-label="Код" style={{ position: 'relative' }}>
                <span ref={el => cartIconRefs.current[p.code] = el} style={{ display: 'inline-block' }}>
                  <CartIcon onClick={() => handleCartIconClick(p)} />
                </span>
                {p.code}
              </td>
              <td data-label="Наименование">
                <a href="#" target="_blank" rel="noopener noreferrer">{p.name}</a>
              </td>
              <td data-label="Артикул" style={{ textAlign: 'center' }}>{p.article || ''}</td>
              <td data-label="Производитель" style={{ textAlign: 'center' }}>{p.manufacturer || ''}</td>
              <td data-label="Цена">{p.price}</td>
              <td data-label="Склад">—</td>
              <td data-label="Кол-во">
                <input
                  type="number"
                  min="0"
                  value={quantities[p.code] || ""}
                  onChange={e => handleQtyChange(p.code, e.target.value, p)}
                  style={{ width: 60 }}
                />
              </td>
              <td data-label="Сумма">
                {quantities[p.code] && !isNaN(Number(quantities[p.code])) && Number(quantities[p.code]) > 0
                  ? (Number(quantities[p.code]) * Number((p.price + "").replace(/\s/g, "").replace(",", "."))).toLocaleString()
                  : ""
                }
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {Pagination}
      <div className="page-size-panel">{PageSizeSelector}</div>
      {modalOpen && modalItem && (
        <div style={{ position: 'absolute', top: popoverPos.top, left: popoverPos.left, zIndex: 2000, minWidth: 220, width: window.innerWidth < 700 ? '95vw' : undefined }}>
          <div style={{ position: 'relative' }}>
            <div style={{ position: 'absolute', top: -12, left: 24 }}>
              <svg width="32" height="16"><polygon points="16,0 28,16 4,16" fill="#e6e9f0" stroke="#4a5a6a"/></svg>
            </div>
            <div style={{ background: '#e6e9f0', color: '#222', borderRadius: 8, padding: window.innerWidth < 700 ? 8 : 14, minWidth: 180, boxShadow: '0 4px 24px #0006', position: 'relative', border: '2px solid #4a5a6a' }}>
              <button onClick={handleCloseModal} style={{ position: 'absolute', top: 4, right: 8, background: 'none', border: 'none', fontSize: 18, color: '#888', cursor: 'pointer' }}>×</button>
              {!showExpress ? (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, justifyContent: 'center' }}>
                    <button onClick={() => setModalQty(q => Math.max(1, q - 1))}>-</button>
                    <input type="number" min={1} value={modalQty} onChange={e => setModalQty(Number(e.target.value) || 1)} style={{ width: 60, textAlign: 'center' }} />
                    <button onClick={() => setModalQty(q => q + 1)}>+</button>
                  </div>
                  <button onClick={handleAddToCart} style={{ background: '#42a5f5', color: '#fff', border: 'none', borderRadius: 4, padding: '4px 10px', marginBottom: 8, cursor: 'pointer', width: '100%', fontSize: 15 }}>В корзину</button>
                  <button onClick={() => setShowExpress(true)} style={{ background: '#4a5a6a', color: '#fff', border: 'none', borderRadius: 4, padding: '4px 10px', cursor: 'pointer', width: '100%', fontSize: 15 }}>Заказать</button>
                </>
              ) : (
                <>
                  <div style={{ marginBottom: 8 }}>
                    <input type="text" placeholder="Имя (необязательно)" value={expressFields.name} onChange={e => setExpressFields(f => ({ ...f, name: e.target.value }))} style={{ width: '100%', marginBottom: 6, padding: 6 }} />
                    <input type="text" placeholder="Телефон (необязательно)" value={expressFields.phone} onChange={e => setExpressFields(f => ({ ...f, phone: e.target.value }))} style={{ width: '100%', marginBottom: 6, padding: 6 }} />
                    <input type="email" placeholder="Почта (необязательно)" value={expressFields.email} onChange={e => setExpressFields(f => ({ ...f, email: e.target.value }))} style={{ width: '100%', marginBottom: 6, padding: 6 }} />
                  </div>
                  <button onClick={handleExpressSend} style={{ background: '#29486a', color: '#fff', border: 'none', borderRadius: 4, padding: '8px 16px', cursor: 'pointer', width: '100%' }}>Отправить</button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 