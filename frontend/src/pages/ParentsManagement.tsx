import React, { useEffect, useState } from "react";
import {
  AlertTriangle,
  Check,
  Edit2,
  Eye,
  Phone,
  Search,
  Trash2,
  UserPlus,
  Users,
  X,
} from "lucide-react";

interface Parent {
  id: string;
  email: string;
  status: "ACTIVE" | "INACTIVE";
  profile?: {
    firstName: string;
    lastName: string;
    dni?: string | null;
    phone?: string | null;
    address?: string | null;
  } | null;
  children?: {
    id: string;
    email: string;
    status: "ACTIVE" | "INACTIVE";
    profile?: { firstName: string; lastName: string } | null;
  }[];
}

type ParentForm = {
  firstName: string;
  lastName: string;
  email: string;
  dni: string;
  phone: string;
  address: string;
};
const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3000";
const emptyForm: ParentForm = {
  firstName: "",
  lastName: "",
  email: "",
  dni: "",
  phone: "",
  address: "",
};
const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "0.65rem 0.85rem",
  borderRadius: 8,
  border: "1px solid var(--border)",
  background: "var(--surface-alt)",
  color: "var(--text-main)",
};
const modalBackdrop: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.65)",
  backdropFilter: "blur(5px)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 80,
  padding: "1rem",
};

const ParentsManagement: React.FC = () => {
  const userRole = localStorage.getItem("userRole");
  const [parents, setParents] = useState<Parent[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "ALL" | "ACTIVE" | "INACTIVE"
  >("ALL");
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<ParentForm>(emptyForm);
  const [editing, setEditing] = useState<Parent | null>(null);
  const [viewing, setViewing] = useState<Parent | null>(null);
  const [deleting, setDeleting] = useState<Parent | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [notification, setNotification] = useState<{
    text: string;
    type: "success" | "error";
  } | null>(null);

  useEffect(() => {
    fetchParents();
  }, []);
  useEffect(() => {
    const closeOnOutsideClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (
        !target.closest('[style*="position: fixed"]') ||
        target.closest(".glass-panel")
      )
        return;
      setViewing(null);
      setDeleting(null);
      closeForm();
    };
    document.addEventListener("click", closeOnOutsideClick);
    return () => document.removeEventListener("click", closeOnOutsideClick);
  }, []);
  const authHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem("token")}`,
  });
  const toast = (text: string, type: "success" | "error" = "success") => {
    setNotification({ text, type });
    setTimeout(() => setNotification(null), 4500);
  };
  const fetchParents = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${apiUrl}/api/parents`, {
        headers: authHeaders(),
      });
      if (!response.ok) throw new Error();
      setParents(await response.json());
    } catch {
      toast("Error al cargar la lista de tutores", "error");
    } finally {
      setLoading(false);
    }
  };
  const updateForm = (field: keyof ParentForm, value: string) =>
    setForm((current) => ({ ...current, [field]: value }));
  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setShowForm(true);
  };
  const openEdit = (parent: Parent) => {
    setEditing(parent);
    setForm({
      firstName: parent.profile?.firstName || "",
      lastName: parent.profile?.lastName || "",
      email: parent.email,
      dni: parent.profile?.dni || "",
      phone: parent.profile?.phone || "",
      address: parent.profile?.address || "",
    });
    setShowForm(true);
  };
  const closeForm = () => {
    setShowForm(false);
    setEditing(null);
    setForm(emptyForm);
  };
  const saveParent = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      const response = await fetch(
        `${apiUrl}/api/parents${editing ? `/${editing.id}` : ""}`,
        {
          method: editing ? "PUT" : "POST",
          headers: { ...authHeaders(), "Content-Type": "application/json" },
          body: JSON.stringify(form),
        },
      );
      const data = await response.json();
      if (!response.ok)
        return toast(data.error || "No se pudo guardar el tutor", "error");
      toast(
        editing
          ? "Tutor actualizado correctamente."
          : "Tutor creado. Se ha enviado su contraseña por correo.",
      );
      closeForm();
      fetchParents();
    } catch {
      toast("Error de conexión", "error");
    }
  };
  const toggleStatus = async (parent: Parent) => {
    try {
      const response = await fetch(
        `${apiUrl}/api/parents/${parent.id}/status`,
        {
          method: "PATCH",
          headers: { ...authHeaders(), "Content-Type": "application/json" },
          body: JSON.stringify({
            status: parent.status === "ACTIVE" ? "INACTIVE" : "ACTIVE",
          }),
        },
      );
      const data = await response.json();
      if (!response.ok)
        return toast(data.error || "No se pudo cambiar el estado", "error");
      toast(data.message);
      fetchParents();
    } catch {
      toast("Error de conexión", "error");
    }
  };
  const deleteParent = async () => {
    if (!deleting) return;
    try {
      const response = await fetch(`${apiUrl}/api/parents/${deleting.id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      const data = await response.json();
      if (!response.ok)
        return toast(data.error || "No se pudo eliminar el tutor", "error");
      toast("Tutor eliminado correctamente.");
      setDeleting(null);
      fetchParents();
    } catch {
      toast("Error de conexión", "error");
    }
  };
  const filtered = parents.filter((parent) => {
    const name =
      `${parent.profile?.firstName || ""} ${parent.profile?.lastName || ""}`.toLowerCase();
    const query = searchTerm.toLowerCase();
    return (
      (!query ||
        name.includes(query) ||
        parent.email.toLowerCase().includes(query) ||
        (parent.profile?.dni || "").toLowerCase().includes(query)) &&
      (statusFilter === "ALL" || parent.status === statusFilter)
    );
  });

  return (
    <div className="page-container parents-management">
      {notification && (
        <div
          style={{
            position: "fixed",
            bottom: 24,
            right: 24,
            padding: "1rem 1.5rem",
            borderRadius: 8,
            background:
              notification.type === "success" ? "var(--primary)" : "#991b1b",
            color: "#fff",
            zIndex: 100,
            display: "flex",
            gap: "0.6rem",
            alignItems: "center",
          }}
        >
          {notification.type === "success" ? (
            <Check size={18} />
          ) : (
            <AlertTriangle size={18} />
          )}
          {notification.text}
        </div>
      )}
      <div
        className="parents-management__header"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "1rem",
          flexWrap: "wrap",
          marginBottom: "1.5rem",
        }}
      >
        <div>
          <h1
            style={{
              margin: 0,
              fontSize: "1.6rem",
              display: "flex",
              alignItems: "center",
              gap: "0.65rem",
            }}
          >
            <Users style={{ color: "var(--primary)" }} size={24} /> Tutores
          </h1>
        </div>
        {userRole === "ADMIN" && (
          <button
            className="btn-primary"
            onClick={openCreate}
            style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
          >
            <UserPlus size={18} /> Nuevo Tutor
          </button>
        )}
      </div>
      <div
        className="parents-management__filters"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "1rem",
          flexWrap: "wrap",
          marginBottom: "1.5rem",
        }}
      >
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          {(
            [
              ["ALL", "Todos los tutores"],
              ["ACTIVE", "Alta"],
              ["INACTIVE", "Baja"],
            ] as const
          ).map(([value, label]) => (
            <button
              className="parents-management__filter"
              key={value}
              type="button"
              onClick={() => setStatusFilter(value)}
              style={{
                padding: "0.45rem 0.85rem",
                borderRadius: 16,
                border:
                  statusFilter === value
                    ? "1px solid var(--primary)"
                    : "1px solid var(--border)",
                background:
                  statusFilter === value
                    ? "var(--primary-light)"
                    : "var(--surface)",
                color:
                  statusFilter === value
                    ? "var(--primary-text)"
                    : "var(--text-muted)",
                fontWeight: statusFilter === value ? 700 : 500,
                cursor: "pointer",
                fontSize: "0.84rem",
              }}
            >
              {label}
            </button>
          ))}
        </div>
        <div style={{ position: "relative", flex: "1 1 240px", maxWidth: 380 }}>
          <Search
            size={17}
            style={{
              position: "absolute",
              left: 12,
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--text-muted)",
            }}
          />
          <input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Buscar tutor por nombre, DNI o correo..."
            style={{ ...inputStyle, paddingLeft: "2.4rem" }}
          />
        </div>
      </div>
      <div className="glass-panel" style={{ padding: 0, overflow: "hidden" }}>
        <div className="table-responsive">
          <table
            style={{
              width: "100%",
              minWidth: 760,
              borderCollapse: "collapse",
              textAlign: "left",
            }}
          >
            <thead>
              <tr style={{ background: "var(--surface-alt)" }}>
                {["TUTOR", "ALUMNOS ACTIVOS", "ESTADO", "ACCIONES"].map(
                  (heading) => (
                    <th
                      key={heading}
                      style={{
                        padding: "1rem 1.25rem",
                        color: "var(--text-muted)",
                        fontSize: "0.82rem",
                        textAlign: heading === "ACCIONES" ? "right" : "left",
                      }}
                    >
                      {heading}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={4}
                    style={{ padding: "3rem", textAlign: "center" }}
                  >
                    Cargando tutores...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    style={{
                      padding: "3rem",
                      textAlign: "center",
                      color: "var(--text-muted)",
                    }}
                  >
                    No se encontraron tutores.
                  </td>
                </tr>
              ) : (
                filtered.map((parent) => {
                  const activeChildren =
                    parent.children?.filter(
                      (child) => child.status === "ACTIVE",
                    ) || [];
                  const isActive = parent.status === "ACTIVE";
                  return (
                    <tr
                      key={parent.id}
                      style={{ borderTop: "1px solid var(--border)" }}
                    >
                      <td style={{ padding: "1rem 1.25rem" }}>
                        <strong>
                          {parent.profile?.firstName} {parent.profile?.lastName}
                        </strong>
                        <div
                          style={{
                            color: "var(--text-muted)",
                            fontSize: "0.82rem",
                          }}
                        >
                          {parent.email}
                        </div>
                        {parent.profile?.phone && (
                          <div
                            style={{
                              color: "var(--primary)",
                              fontSize: "0.78rem",
                            }}
                          >
                            <Phone
                              size={12}
                              style={{ verticalAlign: "middle" }}
                            />{" "}
                            {parent.profile.phone}
                          </div>
                        )}
                      </td>
                      <td
                        style={{
                          padding: "1rem 1.25rem",
                          color: "var(--text-main)",
                        }}
                      >
                        {activeChildren.length} activo(s)
                      </td>
                      <td style={{ padding: "1rem 1.25rem" }}>
                        <span
                          style={{
                            padding: "0.35rem 0.65rem",
                            borderRadius: 16,
                            background: isActive ? "#dcfce7" : "#fee2e2",
                            color: isActive ? "#166534" : "#991b1b",
                            fontSize: "0.75rem",
                            fontWeight: 700,
                          }}
                        >
                          {isActive ? "Alta" : "Baja"}
                        </span>
                        {userRole === "ADMIN" && (
                          <button
                            type="button"
                            onClick={() => toggleStatus(parent)}
                            style={{
                              marginLeft: 8,
                              padding: "0.3rem 0.55rem",
                              borderRadius: 6,
                              border: "1px solid var(--border)",
                              background: "var(--surface)",
                              cursor: "pointer",
                            }}
                          >
                            {isActive ? "Dar de baja" : "Dar de alta"}
                          </button>
                        )}
                      </td>
                      <td
                        style={{ padding: "1rem 1.25rem", textAlign: "right" }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "flex-end",
                            gap: 6,
                          }}
                        >
                          <button
                            type="button"
                            title="Ver ficha"
                            onClick={() => setViewing(parent)}
                          >
                            <Eye size={16} />
                          </button>
                          {userRole === "ADMIN" && (
                            <>
                              <button
                                type="button"
                                title="Editar"
                                onClick={() => openEdit(parent)}
                              >
                                <Edit2 size={16} />
                              </button>
                              <button
                                type="button"
                                title="Eliminar"
                                onClick={() => setDeleting(parent)}
                              >
                                <Trash2 size={16} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
      {viewing && (
        <div style={modalBackdrop}>
          <div
            className="glass-panel"
            style={{
              width: "100%",
              maxWidth: 620,
              maxHeight: "92vh",
              overflowY: "auto",
            }}
          >
            <button className="modal-close" onClick={() => setViewing(null)}>
              <X size={20} />
            </button>
            <h2>Ficha del Tutor</h2>
            <p>
              <strong>Nombre:</strong> {viewing.profile?.firstName}{" "}
              {viewing.profile?.lastName}
            </p>
            <p>
              <strong>Correo:</strong> {viewing.email}
            </p>
            <p>
              <strong>DNI / NIE:</strong> {viewing.profile?.dni || "No registrado"}
            </p>
            <p>
              <strong>Teléfono:</strong> {viewing.profile?.phone || "No registrado"}
            </p>
            <p>
              <strong>Dirección:</strong> {viewing.profile?.address || "No registrada"}
            </p>
            <p>
              <strong>Estado:</strong>{" "}
              {viewing.status === "ACTIVE" ? "Alta" : "Baja"}
            </p>
            <h3 style={{ marginTop: "1.25rem" }}>Alumnos asociados</h3>
            {viewing.children?.length ? (
              viewing.children.map((child) => (
                <div
                  key={child.id}
                  style={{
                    padding: "0.65rem 0",
                    borderBottom: "1px solid var(--border)",
                  }}
                >
                  {child.profile?.firstName} {child.profile?.lastName}{" "}
                  <span style={{ color: "var(--text-muted)" }}>
                    ({child.status === "ACTIVE" ? "Activo" : "Inactivo"})
                  </span>
                </div>
              ))
            ) : (
              <p>No tiene alumnos asociados.</p>
            )}
          </div>
        </div>
      )}
      {showForm && (
        <div style={modalBackdrop}>
          <div
            className="glass-panel"
            style={{
              width: "100%",
              maxWidth: 620,
              maxHeight: "92vh",
              overflowY: "auto",
            }}
          >
            <button className="modal-close" onClick={closeForm}>
              <X size={20} />
            </button>
            <h2>{editing ? "Editar Tutor" : "Nuevo Tutor"}</h2>
            <form
              onSubmit={saveParent}
              style={{ display: "grid", gap: "1rem" }}
            >
              {(
                [
                  "firstName",
                  "lastName",
                  "email",
                  "dni",
                  "phone",
                  "address",
                ] as const
              ).map((field) => (
                <label
                  key={field}
                  style={{ display: "grid", gap: 5, fontWeight: 600 }}
                >
                  {field === "firstName"
                    ? "Nombre *"
                    : field === "lastName"
                      ? "Apellidos *"
                      : field === "email"
                        ? "Correo electrónico *"
                        : field === "dni"
                          ? "DNI / NIE"
                          : field === "phone"
                            ? "Teléfono"
                            : "Dirección"}
                  <input
                    type={field === "email" ? "email" : "text"}
                    required={
                      field === "firstName" ||
                      field === "lastName" ||
                      field === "email"
                    }
                    value={form[field]}
                    onChange={(event) => updateForm(field, event.target.value)}
                    style={inputStyle}
                  />
                </label>
              ))}
              <div
                style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}
              >
                <button type="button" onClick={closeForm}>
                  Cancelar
                </button>
                <button className="btn-primary" type="submit">
                  {editing ? "Guardar cambios" : "Crear tutor"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {deleting && (
        <div style={modalBackdrop}>
          <div className="glass-panel" style={{ width: "100%", maxWidth: 480 }}>
            <button className="modal-close" onClick={() => setDeleting(null)}>
              <X size={20} />
            </button>
            <h2>Eliminar tutor</h2>
            <p>
              ¿Seguro que quieres eliminar a{" "}
              <strong>
                {deleting.profile?.firstName} {deleting.profile?.lastName}
              </strong>
              ? Solo se permite si no tiene alumnos asociados.
            </p>
            <div
              style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}
            >
              <button onClick={() => setDeleting(null)}>Cancelar</button>
              <button onClick={deleteParent}>Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ParentsManagement;
