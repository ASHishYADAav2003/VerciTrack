"use client";
// app/farmer/profile/page.tsx — farmer edits their own public profile

import { useState, useEffect, useRef } from "react";

type Profile = {
  name: string;
  email: string;
  farmName: string;
  location: string;
  phone: string;
  bio: string;
  walletAddress: string;
  organic: boolean;
  photoUrl: string;
  status: string;
};

const EMPTY: Profile = {
  name: "", email: "", farmName: "", location: "",
  phone: "", bio: "", walletAddress: "", organic: false,
  photoUrl: "", status: "",
};

export default function FarmerProfilePage() {
  const [profile, setProfile] = useState<Profile>(EMPTY);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [mapLocation, setMapLocation] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  // Load profile on mount
  useEffect(() => {
    fetch("/api/farmer/profile")
      .then(r => r.json())
      .then(d => {
        setProfile({
          name: d.name || "",
          email: d.email || "",
          farmName: d.farmName || "",
          location: d.location || "",
          phone: d.phone || "",
          bio: d.bio || "",
          walletAddress: d.walletAddress || "",
          organic: d.organic || false,
          photoUrl: d.photoUrl || "",
          status: d.status || "",
        });
        setMapLocation(d.location || "");
      })
      .catch(() => {});
  }, []);

  const set = (field: keyof Profile, val: string | boolean) =>
    setProfile(p => ({ ...p, [field]: val }));

  const showMsg = (text: string, ok: boolean) => {
    setMsg({ text, ok });
    setTimeout(() => setMsg(null), 3500);
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setPhotoPreview(URL.createObjectURL(f));
  };

  const uploadPhoto = async () => {
    const f = fileRef.current?.files?.[0];
    if (!f) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("photo", f);
    try {
      const res = await fetch("/api/farmer/upload-photo", { method: "POST", body: fd });
      const data = await res.json();
      if (res.ok) {
        setProfile(p => ({ ...p, photoUrl: data.photoUrl }));
        setPhotoPreview(null);
        if (fileRef.current) fileRef.current.value = "";
        showMsg("Profile photo updated.", true);
      } else {
        showMsg(data.error || "Upload failed.", false);
      }
    } catch {
      showMsg("Network error.", false);
    }
    setUploading(false);
  };

  const saveProfile = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/farmer/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: profile.name,
          farmName: profile.farmName,
          location: profile.location,
          phone: profile.phone,
          bio: profile.bio,
          walletAddress: profile.walletAddress,
          organic: profile.organic,
        }),
      });
      if (res.ok) {
        setMapLocation(profile.location);
        showMsg("Profile saved successfully.", true);
      } else {
        showMsg("Failed to save profile.", false);
      }
    } catch {
      showMsg("Network error.", false);
    }
    setSaving(false);
  };

  const mapSrc = mapLocation
    ? `https://maps.google.com/maps?q=${encodeURIComponent(mapLocation)}&output=embed&z=10`
    : null;

  const avatarSrc = photoPreview || profile.photoUrl || null;

  return (
    <div>
      <style>{`
        .pr-input { width: 100%; border: 1.5px solid var(--border); border-radius: 10px; padding: 10px 13px; font-size: 13px; font-family: inherit; color: var(--text); background: #fff; outline: none; transition: border-color 0.15s, box-shadow 0.15s; }
        .pr-input:focus { border-color: var(--accent); box-shadow: 0 0 0 3px rgba(234,179,7,0.12); }
        .pr-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: var(--bk-muted); display: block; margin-bottom: 5px; }
        .pr-section { background: #fff; border: 1px solid var(--border); border-radius: 12px; padding: 24px; margin-bottom: 16px; }
        .pr-section-title { font-size: 13px; font-weight: 700; color: var(--text); margin-bottom: 18px; padding-bottom: 12px; border-bottom: 1px solid var(--border); letter-spacing: -0.01em; }
        .pr-row { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 14px; }
        .pr-field { margin-bottom: 14px; }
        .pr-field:last-child { margin-bottom: 0; }
        .pr-organic { display: flex; align-items: center; gap: 10px; padding: 12px 14px; border: 1.5px solid var(--border); border-radius: 10px; cursor: pointer; transition: border-color 0.15s; }
        .pr-organic:hover { border-color: var(--accent); }
        .pr-organic input[type="checkbox"] { width: 16px; height: 16px; accent-color: var(--accent); cursor: pointer; }
        .pr-map { width: 100%; height: 280px; border-radius: 10px; border: 1px solid var(--border); overflow: hidden; }
        .pr-map-empty { width: 100%; height: 280px; border-radius: 10px; border: 2px dashed var(--border); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; background: #FAFAFA; }
        .pr-save-btn { background: var(--accent); color: #000; border: none; border-radius: 10px; padding: 11px 24px; font-weight: 600; font-size: 13px; cursor: pointer; font-family: inherit; transition: background 0.15s; }
        .pr-save-btn:hover { background: var(--accent-d); }
        .pr-save-btn:disabled { opacity: 0.6; cursor: not-allowed; }
      `}</style>

      {/* Toast */}
      {msg && (
        <div style={{
          position: "fixed", top: 20, right: 24, zIndex: 9999,
          background: msg.ok ? "#EAB307" : "#991B1B",
          color: msg.ok ? "#000" : "#fff",
          padding: "10px 18px", borderRadius: 10, fontSize: 13, fontWeight: 600,
          boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
        }}>{msg.text}</div>
      )}

      <div className="page-header">
        <div className="page-title">My Profile</div>
        <div className="page-sub">Manage your public producer page — visible to buyers on the marketplace</div>
      </div>

      {/* Photo + identity */}
      <div className="pr-section">
        <div className="pr-section-title">Profile photo & identity</div>
        <div style={{ display: "flex", gap: 24, alignItems: "flex-start", flexWrap: "wrap" }}>

          {/* Avatar */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 100, height: 100, borderRadius: "50%", overflow: "hidden",
              background: avatarSrc ? "transparent" : "#0A0A0A",
              border: "3px solid var(--accent)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "2.5rem", color: "#EAB307", fontWeight: 800, flexShrink: 0,
            }}>
              {avatarSrc
                ? <img src={avatarSrc} alt="Profile" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                : (profile.name || "BK").slice(0, 2).toUpperCase()
              }
            </div>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp"
              onChange={handlePhotoChange} style={{ display: "none" }} id="photo-input" />
            {photoPreview ? (
              <button className="pr-save-btn" onClick={uploadPhoto} disabled={uploading}>
                {uploading ? "Uploading…" : "Save photo"}
              </button>
            ) : (
              <label htmlFor="photo-input" style={{
                fontSize: 12, fontWeight: 500, color: "var(--bk-muted)",
                border: "1.5px solid var(--border)", borderRadius: 8,
                padding: "6px 14px", cursor: "pointer", background: "#FAFAFA",
              }}>
                Change photo
              </label>
            )}
            <span style={{ fontSize: 10, color: "var(--bk-muted)", textAlign: "center" }}>JPG, PNG or WebP<br />Max 5MB</span>
          </div>

          {/* Name + status */}
          <div style={{ flex: 1, minWidth: 200 }}>
            <div className="pr-field">
              <label className="pr-label">Full name</label>
              <input className="pr-input" value={profile.name} onChange={e => set("name", e.target.value)} placeholder="Your name" />
            </div>
            <div className="pr-field">
              <label className="pr-label">Email</label>
              <input className="pr-input" value={profile.email} disabled style={{ opacity: 0.6, cursor: "not-allowed" }} />
            </div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 4 }}>
              <span style={{
                fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 4,
                background: profile.status === "approved" ? "#F0FDF4" : "#FFFBEB",
                color: profile.status === "approved" ? "#166534" : "#92400E",
                border: `1px solid ${profile.status === "approved" ? "#BBF7D0" : "#FCD34D"}`,
              }}>
                {profile.status === "approved" ? "Verified producer" : " Pending approval"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Plantation details */}
      <div className="pr-section">
        <div className="pr-section-title">Plantation details</div>
        <div className="pr-row">
          <div>
            <label className="pr-label">Farm / Plantation name</label>
            <input className="pr-input" value={profile.farmName} onChange={e => set("farmName", e.target.value)} placeholder="e.g. Highland Coffee Farm" />
          </div>
          <div>
            <label className="pr-label">Phone number</label>
            <input className="pr-input" value={profile.phone} onChange={e => set("phone", e.target.value)} placeholder="+383 44 000 000" />
          </div>
        </div>
        <div className="pr-field">
          <label className="pr-label">About your plantation</label>
          <textarea className="pr-input" rows={4} value={profile.bio} onChange={e => set("bio", e.target.value)}
            placeholder="Describe your plantation, your farming practices, the region your bees forage in…"
            style={{ resize: "vertical", lineHeight: 1.6 }} />
        </div>
        <div className="pr-field">
          <label className="pr-label">Blockchain wallet address</label>
          <input className="pr-input" value={profile.walletAddress} onChange={e => set("walletAddress", e.target.value)}
            placeholder="0x…" style={{ fontFamily: "monospace", fontSize: 12 }} />
        </div>
        <div>
          <label className="pr-organic">
            <input type="checkbox" checked={profile.organic} onChange={e => set("organic", e.target.checked)} />
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>Organic producer</div>
              <div style={{ fontSize: 11, color: "var(--bk-muted)" }}>Mark if your plantation holds organic certification</div>
            </div>
          </label>
        </div>
      </div>

      {/* Location + Map */}
      <div className="pr-section">
        <div className="pr-section-title">Plantation location</div>
        <div className="pr-field">
          <label className="pr-label">Region or address</label>
          <div style={{ display: "flex", gap: 10 }}>
            <input className="pr-input" value={profile.location}
              onChange={e => set("location", e.target.value)}
              placeholder="e.g. Prizren, Kosovo or Rugova Valley, Kosovo" />
            <button
              onClick={() => setMapLocation(profile.location)}
              style={{ padding: "10px 16px", background: "#000", color: "#EAB307", border: "none", borderRadius: 10, fontFamily: "inherit", fontWeight: 600, fontSize: 12, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0 }}>
              Show on map
            </button>
          </div>
          <p style={{ fontSize: 11, color: "var(--bk-muted)", marginTop: 6 }}>
            Enter your city, region, or village — this will appear as an embedded map on your public producer page. Exact address not required.
          </p>
        </div>

        {mapSrc ? (
          <iframe
            className="pr-map"
            src={mapSrc}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            title="Plantation location"
            style={{ border: 0 }}
          />
        ) : (
          <div className="pr-map-empty">
            <span style={{ fontSize: "1.8rem" }}></span>
            <p style={{ fontSize: 13, fontWeight: 600, color: "#000", margin: 0 }}>No location set</p>
            <p style={{ fontSize: 11, color: "var(--bk-muted)", margin: 0 }}>Enter your region above and click "Show on map"</p>
          </div>
        )}
      </div>

      {/* Save */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 32 }}>
        <button className="pr-save-btn" onClick={saveProfile} disabled={saving}>
          {saving ? "Saving…" : "Save profile"}
        </button>
      </div>
    </div>
  );
}
