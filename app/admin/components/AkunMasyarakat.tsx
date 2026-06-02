"use client";

import { useState, useEffect } from "react";
import { Edit, Trash2 } from "lucide-react";
import axios from "axios";

interface Account {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  region: string;
}

const api = axios.create({
  baseURL: "/api",
});

export default function AkunMasyarakat() {
  const regions = ["Balige", "Laguboti", "Silimbat", "Porsea"];
  const filterOptions = ["Semua", ...regions];
  const [selectedRegion, setSelectedRegion] = useState<string>("Semua");
  const [showForm, setShowForm] = useState(false);
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Account>({
    id: "",
    name: "",
    phone: "",
    email: "",
    address: regions[0],
    region: regions[0],
  });
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [notification, setNotification] = useState<{
    open: boolean;
    title: string;
    message: string;
    type: "success" | "warning";
  }>({
    open: false,
    title: "",
    message: "",
    type: "success",
  });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const fetchAccounts = async () => {
    try {
      const res = await api.get("/users");
      const users = res.data?.data || res.data;

      const mapped = users.map((u: any) => ({
        id: u.id.toString(),
        name: u.fullName,
        phone: u.phoneNumber || "",
        email: u.email,
        address: u.region || "",
        region: u.region || "",
      }));

      setAccounts(mapped);
    } catch (err) {
      console.error("Gagal fetch:", err);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const filteredAccounts =
    selectedRegion === "Semua"
      ? accounts
      : accounts.filter((account) => account.region === selectedRegion);

  const handleFormChange = (field: keyof Account, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleAddClick = () => {
    setEditingAccountId(null);
    setFormData({
      id: "",
      name: "",
      phone: "",
      email: "",
      address: regions[0],
      region: regions[0],
    });
    setShowForm(true);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {
      if (editingAccountId) {
        await api.put(`/users/${editingAccountId}`, {
          fullName: formData.name,
          email: formData.email,
          phoneNumber: formData.phone,
          region: formData.address,
        });

        setNotification({
          open: true,
          title: "Data berhasil diedit",
          message: "Perubahan akun berhasil disimpan.",
          type: "success",
        });
      } else {
        await api.post("/users", {
          fullName: formData.name,
          email: formData.email,
          phoneNumber: formData.phone,
          password: "123456",
          role: "WARGA",
          region: formData.address,
        });

        setNotification({
          open: true,
          title: "Akun berhasil ditambahkan",
          message: "Akun masyarakat berhasil ditambahkan.",
          type: "success",
        });
      }

      await fetchAccounts();
      setShowForm(false);
      setEditingAccountId(null);
    } catch (err) {
      console.error(err);
      alert("Gagal simpan data");
    }
  };

  const handleEdit = (account: Account) => {
    setEditingAccountId(account.id);
    setFormData({
      id: account.id,
      name: account.name,
      phone: account.phone,
      email: account.email,
      address: account.address,
      region: account.region,
    });
    setShowForm(true);
  };

  const confirmDelete = (id: string) => {
    setDeleteTargetId(id);
    setShowDeleteConfirm(true);
  };

  const handleDelete = async () => {
    if (!deleteTargetId) return;

    try {
      await api.delete(`/users/${deleteTargetId}`);

      setAccounts((prev) =>
        prev.filter((account) => account.id !== deleteTargetId)
      );

      setNotification({
        open: true,
        title: "Data berhasil dihapus",
        message: "Akun masyarakat berhasil dihapus.",
        type: "warning",
      });
    } catch (err) {
      console.error(err);
      alert("Gagal menghapus data");
    }

    setShowDeleteConfirm(false);
    setDeleteTargetId(null);
  };

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Akun Masyarakat</h2>
          <p className="text-sm text-slate-600 mt-1">
            Kelola data akun masyarakat berdasarkan wilayah dan tambahkan akun baru jika diperlukan.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Filter wilayah
            </label>
            <select
              value={selectedRegion}
              onChange={(e) => setSelectedRegion(e.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-green-600"
            >
              {filterOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleAddClick}
            className="inline-flex items-center justify-center rounded-2xl bg-[#064E3B] px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#06543a]"
          >
            Tambah Akun
          </button>
        </div>
      </div>

      {/* ── Form Modal ── */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl overflow-hidden rounded-[28px] bg-white shadow-2xl">
            {/* Modal Header */}
            <div className="bg-[#064E3B] px-6 py-5 text-white">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-200">
                    {editingAccountId ? "Edit Akun" : "Tambah Akun"}
                  </p>
                  <h3 className="mt-3 text-2xl font-bold">Input Data Akun Masyarakat</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="rounded-full border border-white/20 bg-white/10 px-3 py-2 text-white transition hover:bg-white/20"
                >
                  ×
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">

                {/* ID — readonly, diisi server */}
                <label className="space-y-2 text-sm font-medium text-slate-700">
                  ID Akun
                  <input
                    type="text"
                    value={formData.id}
                    readOnly
                    tabIndex={-1}
                    placeholder="Otomatis dari sistem"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm text-slate-400 outline-none cursor-not-allowed"
                  />
                </label>

                {/* Nama */}
                <label className="space-y-2 text-sm font-medium text-slate-700">
                  Nama Lengkap
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleFormChange("name", e.target.value)}
                    placeholder="Masukkan nama lengkap"
                    required
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-[#064E3B] focus:ring-2 focus:ring-[#064E3B]/10"
                  />
                </label>

                {/* No HP */}
                <label className="space-y-2 text-sm font-medium text-slate-700">
                  No HP
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleFormChange("phone", e.target.value)}
                    placeholder="08xxxxxxxxxx"
                    required
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-[#064E3B] focus:ring-2 focus:ring-[#064E3B]/10"
                  />
                </label>

                {/* Email */}
                <label className="space-y-2 text-sm font-medium text-slate-700">
                  Email
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleFormChange("email", e.target.value)}
                    placeholder="contoh@email.com"
                    required
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-[#064E3B] focus:ring-2 focus:ring-[#064E3B]/10"
                  />
                </label>

                {/* Alamat / Kecamatan — full width */}
                <label className="md:col-span-2 space-y-2 text-sm font-medium text-slate-700">
                  Alamat (Kecamatan)
                  <select
                    value={formData.address}
                    onChange={(e) => {
                      const value = e.target.value;
                      setFormData((prev) => ({
                        ...prev,
                        address: value,
                        region: value, // selalu sinkron
                      }));
                    }}
                    required
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-[#064E3B] focus:ring-2 focus:ring-[#064E3B]/10"
                  >
                    {regions.map((region) => (
                      <option key={region} value={region}>
                        {region}
                      </option>
                    ))}
                  </select>
                </label>

                {/* Actions */}
                <div className="md:col-span-2 flex flex-col gap-3 sm:flex-row sm:justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="rounded-2xl border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="rounded-2xl bg-[#064E3B] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#06543a]"
                  >
                    {editingAccountId ? "Simpan Perubahan" : "Simpan Akun"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ── Notification Toast ── */}
      {notification.open && (
        <div className="fixed inset-x-0 top-6 z-50 mx-auto w-fit rounded-3xl border border-slate-200 bg-white px-6 py-4 shadow-2xl">
          <div className="flex items-start gap-4">
            <div
              className={`flex h-11 w-11 items-center justify-center rounded-2xl ${
                notification.type === "success"
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-amber-100 text-amber-700"
              }`}
            >
              {notification.type === "success" ? "✓" : "!"}
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">{notification.title}</p>
              <p className="mt-1 text-sm text-slate-600">{notification.message}</p>
            </div>
            <button
              type="button"
              onClick={() => setNotification((prev) => ({ ...prev, open: false }))}
              className="ml-4 rounded-full px-2 text-slate-400 transition hover:text-slate-700"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* ── Delete Confirm Modal ── */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/70 p-4">
          <div className="w-full max-w-md rounded-[28px] bg-white p-6 shadow-2xl">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-100 text-red-600">
                !
              </div>
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Konfirmasi Hapus
                </p>
                <h3 className="mt-2 text-xl font-bold text-slate-900">
                  Apakah Anda yakin ingin menghapus akun ini?
                </h3>
              </div>
            </div>
            <p className="mt-4 text-sm text-slate-600">
              Penghapusan data tidak dapat dikembalikan. Pastikan akun yang akan dihapus sudah benar.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeleteTargetId(null);
                }}
                className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="rounded-2xl bg-red-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-700"
              >
                Hapus Akun
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Tabel ── */}
      <div className="overflow-x-auto rounded-3xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200 text-left">
          <thead className="bg-slate-50 text-sm uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-5 py-4">ID</th>
              <th className="px-5 py-4">Nama</th>
              <th className="px-5 py-4">No HP</th>
              <th className="px-5 py-4">Email</th>
              <th className="px-5 py-4">Alamat</th>
              <th className="px-5 py-4">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white text-sm text-slate-700">
            {filteredAccounts.map((account) => (
              <tr key={account.id}>
                <td className="px-5 py-4 font-semibold">{account.id}</td>
                <td className="px-5 py-4">{account.name}</td>
                <td className="px-5 py-4">{account.phone}</td>
                <td className="px-5 py-4">{account.email}</td>
                <td className="px-5 py-4">{account.address}</td>
                <td className="px-5 py-4">
                  <div className="flex justify-end gap-1">
                    <button
                      type="button"
                      onClick={() => handleEdit(account)}
                      className="p-2 text-white bg-yellow-400 rounded-lg transition-all"
                      title="Edit akun"
                    >
                      <Edit size={18} />
                    </button>
                    <button
                      type="button"
                      onClick={() => confirmDelete(account.id)}
                      className="p-2 text-white bg-red-600 rounded-lg transition-all"
                      title="Hapus akun"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredAccounts.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-8 text-center text-sm text-slate-500">
                  {selectedRegion === "Semua"
                    ? "Belum ada akun masyarakat yang terdaftar."
                    : `Tidak ada akun masyarakat untuk wilayah ${selectedRegion}.`}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}