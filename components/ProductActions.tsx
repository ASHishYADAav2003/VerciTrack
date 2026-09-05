"use client";

import { useState } from "react";

type Product = {
  id: string;
  name: string;
  batchId: string;
  price?: string;
  weight?: string;
  jarSizeG?: number;
  image?: string;
};

export function WeightSelector({ weight, jarSizeG }: { weight?: string; jarSizeG?: number }) {
  const primary = jarSizeG ? (jarSizeG >= 1000 ? `${jarSizeG / 1000}kg` : `${jarSizeG}g`) : (weight ?? "500g");
  const weights = [primary];

  return (
    <div className="pd-weight">
      <p className="pd-weight-label">Size</p>
      <div className="pd-weight-options">
        {weights.map((w) => (
          <button key={w} className="pd-weight-btn pd-weight-btn-active">{w}</button>
        ))}
      </div>
    </div>
  );
}

export function AddToCartButton({ product }: { product: Product }) {
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  function handleAdd() {
    try {
      const cart = JSON.parse(localStorage.getItem("cart") || "[]");
      const existing = cart.find((i: Product & { qty: number }) => i.batchId === product.batchId);
      if (existing) {
        existing.qty = (existing.qty || 1) + qty;
      } else {
        cart.push({ ...product, qty });
      }
      localStorage.setItem("cart", JSON.stringify(cart));
    } catch { /* localStorage unavailable */ }
    setAdded(true);
    setTimeout(() => setAdded(false), 2500);
  }

  return (
    <div className="pd-cart-row">
      <button
        className="pd-btn-primary"
        onClick={handleAdd}
        style={added ? { background: "#16A34A", flex: 1 } : { flex: 1 }}
      >
        {added ? "Added to basket" : "Add to Basket"}
      </button>

      <div className="pd-qty">
        <button className="pd-qty-btn" onClick={() => setQty((q) => Math.max(1, q - 1))}>−</button>
        <span className="pd-qty-val">{qty}</span>
        <button className="pd-qty-btn" onClick={() => setQty((q) => q + 1)}>+</button>
      </div>
    </div>
  );
}
