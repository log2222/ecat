import React, { useEffect, useState } from "react";

// Рекурсивно собирает все code из группы и её подгрупп
function collectGroupCodes(node) {
  let codes = [node.code];
  if (node.children && node.children.length > 0) {
    for (const child of node.children) {
      codes = codes.concat(collectGroupCodes(child));
    }
  }
  return codes;
}

// Считает количество товаров в группе и всех подгруппах
function countProducts(node, itemsByGroup) {
  let count = (itemsByGroup[node.code] || []).length;
  if (node.children && node.children.length > 0) {
    for (const child of node.children) {
      count += countProducts(child, itemsByGroup);
    }
  }
  return count;
}

// Фильтрует дерево групп по поисковому запросу
function filterTree(tree, query) {
  if (!query) return tree;
  const q = query.toLowerCase();
  function filterNode(node) {
    const match = node.name.toLowerCase().includes(q);
    if (node.children && node.children.length > 0) {
      const filteredChildren = node.children.map(filterNode).filter(Boolean);
      if (match || filteredChildren.length > 0) {
        return { ...node, children: filteredChildren };
      }
    } else if (match) {
      return { ...node };
    }
    return null;
  }
  return tree.map(filterNode).filter(Boolean);
}

// Вспомогательная функция: получить все id родителей для найденных групп
function getOpenIdsForFiltered(tree, filtered) {
  const openIds = new Set();
  function walk(origNodes, filteredNodes) {
    for (const fNode of filteredNodes) {
      const origNode = origNodes.find(n => n.id === fNode.id);
      if (!origNode) continue;
      if (fNode.children && fNode.children.length > 0) {
        openIds.add(fNode.id);
        walk(origNode.children || [], fNode.children);
      } else {
        // leaf: раскрыть всех родителей
        let parent = fNode;
        while (parent && parent.parentId) {
          openIds.add(parent.parentId);
          parent = findNodeById(tree, parent.parentId);
        }
      }
    }
  }
  walk(tree, filtered);
  return openIds;
}

// Поиск узла по id
function findNodeById(tree, id) {
  for (const node of tree) {
    if (node.id === id) return node;
    if (node.children) {
      const found = findNodeById(node.children, id);
      if (found) return found;
    }
  }
  return null;
}

// Получить все id групп
function getAllIds(nodes) {
  let ids = [];
  for (const n of nodes) {
    ids.push(n.id);
    if (n.children && n.children.length > 0) {
      ids = ids.concat(getAllIds(n.children));
    }
  }
  return ids;
}

export default function CategoryTree({ onSelect }) {
  const [tree, setTree] = useState([]);
  const [selected, setSelected] = useState(null);
  const [open, setOpen] = useState({});
  const [itemsByGroup, setItemsByGroup] = useState({});
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/groups.json")
      .then(r => r.json())
      .then(data => {
        // Добавляем parentId для автраскрытия
        function addParentId(nodes, parentId = null) {
          return nodes.map(n => ({
            ...n,
            parentId,
            children: n.children ? addParentId(n.children, n.id) : []
          }));
        }
        const treeWithParents = addParentId(data);
        setTree(treeWithParents);
        if (treeWithParents.length > 0) {
          setOpen({ [treeWithParents[0].id]: true });
        }
      });
    fetch("/items.json")
      .then(r => r.json())
      .then(items => {
        // Группируем товары по group_code
        const byGroup = {};
        for (const item of items) {
          if (!byGroup[item.group_code]) byGroup[item.group_code] = [];
          byGroup[item.group_code].push(item);
        }
        setItemsByGroup(byGroup);
      });
  }, []);

  const handleToggle = (id) => {
    setOpen(o => ({ ...o, [id]: !o[id] }));
  };

  const renderNode = (node, level = 0) => {
    const hasChildren = node.children && node.children.length > 0;
    const count = countProducts(node, itemsByGroup);
    return (
      <li key={node.id} style={{ paddingLeft: level * 16 }}>
        {hasChildren && (
          <button
            onClick={() => handleToggle(node.id)}
            style={{ marginRight: 4, cursor: "pointer", background: "none", border: "none" }}
            aria-label={open[node.id] ? "Свернуть" : "Развернуть"}
          >
            {open[node.id] ? "\u25bc" : "\u25b6"}
          </button>
        )}
        <span
          style={{
            fontWeight: selected === node.id ? "bold" : "normal",
            cursor: "pointer",
            color: selected === node.id ? "#1976d2" : "inherit"
          }}
          onClick={() => {
            setSelected(node.id);
            const codes = collectGroupCodes(node);
            onSelect(codes);
          }}
        >
          {node.name} <span style={{color:'#888'}}>({count})</span>
        </span>
        {/* Вложенные группы */}
        {hasChildren && open[node.id] && (
          <ul style={{ listStyle: "none", paddingLeft: 0 }}>
            {node.children.map(child => renderNode(child, level + 1))}
          </ul>
        )}
      </li>
    );
  };

  const filteredTree = filterTree(tree, search);

  // Авто-раскрытие при поиске
  useEffect(() => {
    if (!search) return;
    const filteredTree = filterTree(tree, search);
    const openIds = getOpenIdsForFiltered(tree, filteredTree);
    setOpen(o => {
      const newOpen = { ...o };
      openIds.forEach(id => { newOpen[id] = true; });
      return newOpen;
    });
  }, [search, tree]);

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        <button className="group-toggle-btn" onClick={() => setOpen({})} style={{ padding: '4px 8px', border: '1px solid #bbb', borderRadius: 4, background: '#eee', cursor: 'pointer' }}>Свернуть все</button>
        <button className="group-toggle-btn" onClick={() => {
          const allIds = getAllIds(tree);
          const allOpen = {};
          allIds.forEach(id => { allOpen[id] = true; });
          setOpen(allOpen);
        }} style={{ padding: '4px 8px', border: '1px solid #bbb', borderRadius: 4, background: '#eee', cursor: 'pointer' }}>Развернуть все</button>
      </div>
      <div style={{ position: 'relative' }}>
        <input
          type="text"
          placeholder="Поиск по группам..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ width: '100%', marginBottom: 8, padding: 4, boxSizing: 'border-box' }}
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            style={{ position: 'absolute', right: 8, top: 6, border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 16, color: '#888' }}
            aria-label="Очистить поиск"
            tabIndex={-1}
          >
            ×
          </button>
        )}
      </div>
      <ul style={{ listStyle: "none", paddingLeft: 0 }}>
        {filteredTree.map(node => renderNode(node, 0))}
      </ul>
    </div>
  );
} 