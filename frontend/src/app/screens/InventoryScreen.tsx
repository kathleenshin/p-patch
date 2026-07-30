import { useState, type CSSProperties } from "react";
import { Search, Package, Pencil, Trash2, Plus, X } from "lucide-react";
import { C, serif, sans, mono, inputStyle } from "../theme";

const inventoryData = [
  { item: "Tomato Seeds",       qty: "50 pkts",  location: "Tool Shed",      addedBy: "Alice Green" },
  { item: "Organic Fertilizer", qty: "12 bags",  location: "Plot B4",        addedBy: "Bob Stone" },
  { item: "Hand Trowels",       qty: "8 units",  location: "Tool Shed",      addedBy: "Alice Green" },
  { item: "Watering Cans",      qty: "4 units",  location: "West Gate",      addedBy: "Charlie Brown" },
  { item: "Bamboo Stakes",      qty: "120 pcs",  location: "Storage Locker", addedBy: "Bob Stone" },
  { item: "Row Cover Fabric",   qty: "3 rolls",  location: "Tool Shed",      addedBy: "Elena V." },
  { item: "Compost (bagged)",   qty: "2 bins",   location: "North End",      addedBy: "Sofia M." },
];
const tdStyle: CSSProperties = { padding: "0.6875rem 1rem", fontSize: "0.84rem", color: C.brown };

export function InventoryScreen() {
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const filtered = inventoryData.filter((r) =>
    r.item.toLowerCase().includes(search.toLowerCase()) ||
    r.location.toLowerCase().includes(search.toLowerCase())
  );

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
              {filtered.map((row, i) => (
                <tr key={i}
                  style={{ borderTop: `0.0625rem solid ${C.creamDark}`,
                    background: i % 2 === 0 ? C.card : C.cream, transition: "background 0.1s" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = C.sagePop)}
                  onMouseLeave={(e) => (e.currentTarget.style.background = i % 2 === 0 ? C.card : C.cream)}>
                  <td style={{ ...tdStyle, fontWeight: 700 }}>{row.item}</td>
                  <td style={{ ...tdStyle, ...mono, fontSize: "0.8rem",
                    color: C.sage, fontWeight: 800 }}>{row.qty}</td>
                  <td style={{ ...tdStyle, color: C.brownLight }}>{row.location}</td>
                  <td style={{ ...tdStyle, color: C.brownLight }}>{row.addedBy}</td>
                  <td style={{ ...tdStyle }}>
                    <div style={{ display: "flex", gap: "0.3125rem" }}>
                      <button style={{ background: C.sageLight, border: "none", borderRadius: "0.4375rem",
                        padding: "0.25rem 0.625rem", color: C.sageDark, fontSize: "0.7rem", fontWeight: 800,
                        cursor: "pointer", fontFamily: "'Nunito', sans-serif",
                        display: "flex", alignItems: "center", gap: "0.1875rem" }}>
                        <Pencil size={11} /> Edit
                      </button>
                      <button style={{ background: C.terraLight, border: "none", borderRadius: "0.4375rem",
                        padding: "0.25rem 0.5625rem", color: C.terra, fontSize: "0.7rem",
                        cursor: "pointer", display: "flex", alignItems: "center" }}>
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={5} style={{ padding: "1.875rem", textAlign: "center",
                  color: C.muted, fontSize: "0.84rem" }}>
                  No items match "{search}"
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <button onClick={() => setShowAdd(true)}
        style={{ position: "fixed", bottom: "4vw", right: "4vw",
          background: `linear-gradient(135deg, ${C.sage}, ${C.sageDark})`,
          color: C.white, border: "none", borderRadius: "3.125rem", padding: "0.6875rem 1.125rem",
          fontWeight: 800, fontSize: "0.85rem", cursor: "pointer",
          fontFamily: "'Nunito', sans-serif", boxShadow: `0 0.25rem 1rem ${C.sage}44`,
          display: "flex", alignItems: "center", gap: "0.4375rem", zIndex: 20 }}>
        <Plus size={15} /> Add Item
      </button>

      {showAdd && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(44,31,20,0.5)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 30 }}>
          <div style={{ background: C.card, borderRadius: "1.375rem", padding: "1.625rem", width: "min(92%, 23.125rem)",
            boxShadow: "0 1rem 3rem rgba(44,31,20,0.25)", border: `0.125rem solid ${C.border}` }}>
            <div style={{ display: "flex", alignItems: "center",
              justifyContent: "space-between", marginBottom: "1.125rem" }}>
              <h3 style={{ ...serif, fontSize: "1.05rem", fontWeight: 700, color: C.brown, margin: 0 }}>
                Add Item
              </h3>
              <button onClick={() => setShowAdd(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: C.muted }}>
                <X size={17} />
              </button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.6875rem" }}>
              {["Item name","Quantity (e.g. 12 bags)","Location","Notes"].map((p) => (
                <input key={p} placeholder={p} style={{ ...inputStyle, fontSize: "0.84rem" }} />
              ))}
              <button onClick={() => setShowAdd(false)}
                style={{ background: `linear-gradient(135deg, ${C.sage}, ${C.sageDark})`,
                  color: C.white, border: "none", borderRadius: "0.75rem", padding: "0.75rem",
                  fontWeight: 800, cursor: "pointer", fontFamily: "'Nunito', sans-serif",
                  fontSize: "0.88rem" }}>Add to Inventory</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
