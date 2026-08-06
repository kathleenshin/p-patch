import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { Search, Package, Pencil, Trash2, Plus, X } from "lucide-react";
import {
  createInventoryItem,
  deleteInventoryItem,
  fetchInventoryItems,
  updateInventoryItem,
  type InventoryItem,
} from "../../api/inventory";
import { C, serif, sans, mono, inputStyle } from "../theme";

const tdStyle: CSSProperties = { padding: "0.6875rem 1rem", fontSize: "0.84rem", color: C.brown };

export function InventoryScreen() {
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<InventoryItem | null>(null);
  const [form, setForm] = useState({ item: "", quantity: "", location: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    async function loadItems() {
      try {
        const data = await fetchInventoryItems();
        if (isActive) {
          setInventoryItems(data);
          setError(null);
        }
      } catch (err) {
        if (isActive) {
          setError(err instanceof Error ? err.message : "Unable to load inventory");
        }
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    }

    loadItems();
    return () => {
      isActive = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const normalizedSearch = search.toLowerCase();
    return inventoryItems.filter((row) =>
      row.item.toLowerCase().includes(normalizedSearch) ||
      row.location.toLowerCase().includes(normalizedSearch)
    );
  }, [inventoryItems, search]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      if (editingItem) {
        const updated = await updateInventoryItem(editingItem.id, form);
        setInventoryItems((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      } else {
        const created = await createInventoryItem(form);
        setInventoryItems((current) => [created, ...current]);
      }

      setForm({ item: "", quantity: "", location: "" });
      setEditingItem(null);
      setShowAdd(false);
      setSearch("");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to save inventory item";
      setError(message);
      console.error("Inventory save failed", err);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    try {
      await deleteInventoryItem(id);
      setInventoryItems((current) => current.filter((item) => item.id !== id));
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to delete inventory item";
      setError(message);
      console.error("Inventory delete failed", err);
    }
  }

  function openAddModal() {
    setEditingItem(null);
    setForm({ item: "", quantity: "", location: "" });
    setError(null);
    setShowAdd(true);
  }

  function openEditModal(item: InventoryItem) {
    setEditingItem(item);
    setForm({ item: item.item, quantity: item.quantity, location: item.location });
    setError(null);
    setShowAdd(true);
  }

  return (
    <div style={{ flex: 1, overflow: "auto", background: C.cream, ...sans, position: "relative" }}>
      <div className="page-content">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.375rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
            <div style={{ width: "2.25rem", height: "2.25rem", borderRadius: "0.6875rem",
              background: `linear-gradient(135deg, ${C.sage}, ${C.sageDark})`,
              display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Package size={17} color={C.white} />
            </div>
            <h1 style={{ ...serif, fontSize: "1.5rem", fontWeight: 700, color: C.brown, margin: 0 }}>Inventory</h1>
          </div>
          <div style={{ position: "relative" }}>
            <Search size={14} style={{ position: "absolute", left: "0.6875rem", top: "50%",
              transform: "translateY(-50%)", color: C.muted }} />
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search items..."
              style={{ ...inputStyle, paddingLeft: "2.125rem", width: "min(100%, 13.125rem)", fontSize: "0.8rem" }} />
          </div>
        </div>

        <div style={{ background: C.card, border: `0.0625rem solid ${C.border}`,
          borderRadius: "1.125rem", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: `linear-gradient(135deg, ${C.sage}, ${C.sageDark})` }}>
                {["Item","Qty","Location","Added By","Actions"].map((h) => (
                  <th key={h} style={{ textAlign: "left", padding: "0.6875rem 1rem",
                    fontSize: "0.66rem", fontWeight: 800,
                    color: "rgba(255,255,255,0.9)", letterSpacing: "0.08em",
                    textTransform: "uppercase", ...mono }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={5} style={{ padding: "1.875rem", textAlign: "center", color: C.muted, fontSize: "0.84rem" }}>
                  Loading inventory...
                </td></tr>
              )}
              {!loading && filtered.map((row, i) => (
                <tr key={row.id}
                  style={{ borderTop: `0.0625rem solid ${C.creamDark}`,
                    background: i % 2 === 0 ? C.card : C.cream, transition: "background 0.1s" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = C.sagePop)}
                  onMouseLeave={(e) => (e.currentTarget.style.background = i % 2 === 0 ? C.card : C.cream)}>
                  <td style={{ ...tdStyle, fontWeight: 700 }}>{row.item}</td>
                  <td style={{ ...tdStyle, ...mono, fontSize: "0.8rem",
                    color: C.sage, fontWeight: 800 }}>{row.quantity}</td>
                  <td style={{ ...tdStyle, color: C.brownLight }}>{row.location}</td>
                  <td style={{ ...tdStyle, color: C.brownLight }}>{row.added_by || "—"}</td>
                  <td style={{ ...tdStyle }}>
                    <div style={{ display: "flex", gap: "0.3125rem" }}>
                      <button onClick={() => openEditModal(row)} style={{ background: C.sageLight, border: "none", borderRadius: "0.4375rem",
                        padding: "0.25rem 0.625rem", color: C.sageDark, fontSize: "0.7rem", fontWeight: 800,
                        cursor: "pointer", fontFamily: "'Nunito', sans-serif",
                        display: "flex", alignItems: "center", gap: "0.1875rem" }}>
                        <Pencil size={11} /> Edit
                      </button>
                      <button onClick={() => setDeleteTarget(row)} style={{ background: C.terraLight, border: "none", borderRadius: "0.4375rem",
                        padding: "0.25rem 0.5625rem", color: C.terra, fontSize: "0.7rem",
                        cursor: "pointer", display: "flex", alignItems: "center" }}>
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && filtered.length === 0 && (
                <tr><td colSpan={5} style={{ padding: "1.875rem", textAlign: "center",
                  color: C.muted, fontSize: "0.84rem" }}>
                  No items match "{search}"
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <button onClick={openAddModal}
        style={{ position: "fixed", bottom: "4vw", right: "4vw",
          background: `linear-gradient(135deg, ${C.sage}, ${C.sageDark})`,
          color: C.white, border: "none", borderRadius: "3.125rem", padding: "0.6875rem 1.125rem",
          fontWeight: 800, fontSize: "0.85rem", cursor: "pointer",
          fontFamily: "'Nunito', sans-serif", boxShadow: `0 0.25rem 1rem ${C.sage}44`,
          display: "flex", alignItems: "center", gap: "0.4375rem", zIndex: 20 }}>
        <Plus size={15} /> Add Item
      </button>

      {deleteTarget && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(44,31,20,0.5)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 40 }}>
          <div style={{ background: C.card, borderRadius: "1.375rem", padding: "1.625rem", width: "min(92%, 21rem)",
            boxShadow: "0 1rem 3rem rgba(44,31,20,0.25)", border: `0.125rem solid ${C.border}` }}>
            <h3 style={{ ...serif, fontSize: "1.05rem", fontWeight: 700, color: C.brown, margin: "0 0 0.625rem" }}>
              Delete item?
            </h3>
            <p style={{ margin: "0 0 1rem", color: C.brownLight, fontSize: "0.9rem" }}>
              This will remove {deleteTarget.item} from inventory.
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.625rem" }}>
              <button onClick={() => setDeleteTarget(null)} style={{ background: C.cream, border: `0.0625rem solid ${C.border}`, borderRadius: "0.75rem", padding: "0.7rem 0.95rem", cursor: "pointer", color: C.brown }}>
                Cancel
              </button>
              <button onClick={async () => {
                if (!deleteTarget) return;
                await handleDelete(deleteTarget.id);
                setDeleteTarget(null);
              }} style={{ background: C.terra, color: C.white, border: "none", borderRadius: "0.75rem", padding: "0.7rem 0.95rem", cursor: "pointer", fontWeight: 800 }}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {showAdd && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(44,31,20,0.5)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 30 }}>
          <div style={{ background: C.card, borderRadius: "1.375rem", padding: "1.625rem", width: "min(92%, 23.125rem)",
            boxShadow: "0 1rem 3rem rgba(44,31,20,0.25)", border: `0.125rem solid ${C.border}` }}>
            <div style={{ display: "flex", alignItems: "center",
              justifyContent: "space-between", marginBottom: "1.125rem" }}>
              <h3 style={{ ...serif, fontSize: "1.05rem", fontWeight: 700, color: C.brown, margin: 0 }}>
                {editingItem ? "Edit Item" : "Add Item"}
              </h3>
              <button onClick={() => {
                setShowAdd(false);
                setEditingItem(null);
                setForm({ item: "", quantity: "", location: "" });
                setError(null);
              }}
                style={{ background: "none", border: "none", cursor: "pointer", color: C.muted }}>
                <X size={17} />
              </button>
            </div>
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "0.6875rem" }}>
              <input required placeholder="Item name" value={form.item} onChange={(e) => setForm((current) => ({ ...current, item: e.target.value }))}
                style={{ ...inputStyle, fontSize: "0.84rem" }} />
              <input required placeholder="Quantity (e.g. 12 bags)" value={form.quantity} onChange={(e) => setForm((current) => ({ ...current, quantity: e.target.value }))}
                style={{ ...inputStyle, fontSize: "0.84rem" }} />
              <input required placeholder="Location" value={form.location} onChange={(e) => setForm((current) => ({ ...current, location: e.target.value }))}
                style={{ ...inputStyle, fontSize: "0.84rem" }} />
              {error && <div style={{ color: C.terra, fontSize: "0.8rem" }}>{error}</div>}
              <button disabled={saving} type="submit"
                style={{ background: `linear-gradient(135deg, ${C.sage}, ${C.sageDark})`,
                  color: C.white, border: "none", borderRadius: "0.75rem", padding: "0.75rem",
                  fontWeight: 800, cursor: saving ? "wait" : "pointer", fontFamily: "'Nunito', sans-serif",
                  fontSize: "0.88rem", opacity: saving ? 0.8 : 1 }}>
                {saving ? "Saving..." : editingItem ? "Save Changes" : "Add to Inventory"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
