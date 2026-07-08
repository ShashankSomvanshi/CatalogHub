import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Sidebar from "../Sidebar.jsx";
import AdminTopNavbar from "./AdminTopNavbar.jsx";
import DashboardFooter from "../DashboardFooter.jsx";
import { api } from "../../api/client.js";
import { getAdminMenuItems, isFullAdmin } from "../../api/access.js";
import {
  fetchRoles,
  fetchSubAdminRoles,
  getRoleId,
  getRoleName,
} from "../../api/roles.js";
import { showSuccess } from "../../utils/alerts.js";

function AddNewUserPage() {
  const navigate = useNavigate();
  const storedAdmin = JSON.parse(localStorage.getItem("auth_user") || "{}");
  const adminName = storedAdmin?.name || "Admin";
  const adminRole =
    storedAdmin?.role || storedAdmin?.role_name || "Administrator";
  const canAssignRoles = isFullAdmin(storedAdmin);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    city: "",
    state: "",
    password: "",
    confirm_password: "",
    role_id: "3",
    sub_role_id: "",
    status: "active",
    profile_pic: null,
  });
  const [loading, setLoading] = useState(false);
  const [rolesLoading, setRolesLoading] = useState(true);
  const [roles, setRoles] = useState([]);
  const [subAdminRoles, setSubAdminRoles] = useState([]);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const nextErrors = {};

    if (!form.name.trim()) nextErrors.name = "Name is required.";
    if (!form.email.trim()) nextErrors.email = "Email is required.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      nextErrors.email = "Enter a valid email address.";

    if (form.phone && !/^[0-9]{1,15}$/.test(form.phone)) {
      nextErrors.phone =
        "Phone number must contain digits only and cannot exceed 15 digits.";
    }

    if (!form.password) nextErrors.password = "Password is required.";
    if (!form.confirm_password)
      nextErrors.confirm_password = "Confirm password is required.";
    else if (form.password !== form.confirm_password)
      nextErrors.confirm_password =
        "Password and confirm password do not match.";

    if (!form.role_id) nextErrors.role_id = "Type is required.";
    if (Number(form.role_id) === 2 && !form.sub_role_id)
      nextErrors.sub_role_id = "Sub admin role is required.";

    return nextErrors;
  };

  const menuItems = getAdminMenuItems(storedAdmin);

  useEffect(() => {
    let ignore = false;

    const loadRoles = async () => {
      setRolesLoading(true);

      try {
        const [loadedRoles, loadedSubAdminRoles] = await Promise.all([
          canAssignRoles ? fetchRoles() : Promise.resolve([{ id: 3, name: "User" }]),
          canAssignRoles ? fetchSubAdminRoles() : Promise.resolve([]),
        ]);
        if (ignore) return;

        const assignableRoles = loadedRoles.filter(
          (role) =>
            getRoleId(role) !== "1" &&
            getRoleName(role).trim().toLowerCase() !== "admin",
        );

        setRoles(assignableRoles);
        setSubAdminRoles(loadedSubAdminRoles);
        if (assignableRoles.length) {
          setForm((current) =>
            assignableRoles.some((role) => getRoleId(role) === current.role_id)
              ? current
              : { ...current, role_id: getRoleId(assignableRoles[0]) },
          );
        }
      } catch (error) {
        if (!ignore) {
          setMessage({
            type: "error",
            text: error.response?.data?.message || "Unable to load roles.",
          });
        }
      } finally {
        if (!ignore) setRolesLoading(false);
      }
    };

    loadRoles();

    return () => {
      ignore = true;
    };
  }, [canAssignRoles]);

  const handleLogout = () => {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("access_token_expires_at");
    localStorage.removeItem("refresh_token_expires_at");
    localStorage.removeItem("auth_user");
    localStorage.removeItem("auth_role");
    window.location.href = "/admin";
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage({ type: "", text: "" });
    const nextErrors = validateForm();
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setLoading(true);

    try {
      const payload = {
        name: form.name,
        email: form.email,
        phone_no: form.phone,
        city: form.city,
        state: form.state,
        password: form.password,
        password_confirmation: form.confirm_password,
        role_id: Number(form.role_id),
        status: form.status,
      };

      if (Number(form.role_id) === 2) {
        payload.sub_role_id = Number(form.sub_role_id);
      }

      if (form.profile_pic) {
        payload.profile_image = form.profile_pic;
      }

      if (form.profile_pic) {
        const formData = new FormData();
        Object.entries(payload).forEach(([key, value]) =>
          formData.append(key, value),
        );
        await api.post("/api/admin/users", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      } else {
        await api.post("/api/admin/users", payload);
      }
      await showSuccess("User created successfully");
      navigate("/admin/users");
    } catch (error) {
      const apiErrors = error.response?.data?.errors || {};
      const nextApiErrors = {};

      if (apiErrors.name?.[0]) nextApiErrors.name = apiErrors.name[0];
      if (apiErrors.email?.[0]) nextApiErrors.email = apiErrors.email[0];
      if (apiErrors.phone_no?.[0])
        nextApiErrors.phone =
          "Phone number must contain digits only and cannot exceed 15 digits.";
      if (apiErrors.city?.[0]) nextApiErrors.city = apiErrors.city[0];
      if (apiErrors.state?.[0]) nextApiErrors.state = apiErrors.state[0];
      if (apiErrors.password?.[0])
        nextApiErrors.password = apiErrors.password[0];
      if (apiErrors.password_confirmation?.[0])
        nextApiErrors.confirm_password = apiErrors.password_confirmation[0];
      if (apiErrors.role_id?.[0]) nextApiErrors.role_id = apiErrors.role_id[0];
      if (apiErrors.sub_role_id?.[0])
        nextApiErrors.sub_role_id = apiErrors.sub_role_id[0];

      if (Object.keys(nextApiErrors).length > 0) {
        setErrors(nextApiErrors);
      } else {
        setMessage({
          type: "error",
          text: error.response?.data?.message || "User creation failed.",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="admin-dashboard-shell admin-panel-shell">
      <Sidebar
        adminName={adminName}
        adminRole={adminRole}
        menuItems={menuItems}
        title="Admin Panel"
        subtitle="Manage users, categories, products, and permissions."
      />

      <section className="dashboard-main admin-panel-main">
        <AdminTopNavbar
          adminName={adminName}
          adminRole={adminRole}
          onLogout={handleLogout}
        />

        <section className="dashboard-main-content admin-main-content">
          <section className="admin-form-section">
            <article className="panel-card admin-form-card">
              <div className="admin-form-head">
                <div>
                  <h3>New user details</h3>
                  <p className="subtext">
                    Create an account and assign its role.
                  </p>
                </div>
                <Link to="/admin/users" className="ghost-btn">
                  Back to Users
                </Link>
              </div>

              <form
                className="admin-record-form"
                onSubmit={handleSubmit}
                noValidate
              >
                <div className="form-grid">
                  <label>
                    <span className="field-label">
                      Name <span className="required-mark">*</span>
                    </span>
                    <input
                    
                      value={form.name}
                      onChange={(event) => {
                        setForm({ ...form, name: event.target.value });
                        setErrors({ ...errors, name: "" });
                      }}
                      placeholder="Enter full name"
                      aria-invalid={Boolean(errors.name)}
                    />
                    {errors.name && (
                      <small className="admin-field-error">{errors.name}</small>
                    )}
                  </label>
                  <label>
                    <span className="field-label">
                      Email <span className="required-mark">*</span>
                    </span>
                    <input
                      type="text"
                      inputMode="email"
                      value={form.email}
                      onChange={(event) => {
                        setForm({ ...form, email: event.target.value });
                        setErrors({ ...errors, email: "" });
                      }}
                      placeholder="name@example.com"
                      aria-invalid={Boolean(errors.email)}
                    />
                    {errors.email && (
                      <small className="admin-field-error">
                        {errors.email}
                      </small>
                    )}
                  </label>
                  <label>
                    <span className="field-label">Phone</span>
                    <input
                      inputMode="numeric"
                      value={form.phone}
                      onChange={(event) => {
                        setForm({ ...form, phone: event.target.value });
                        setErrors({ ...errors, phone: "" });
                      }}
                      placeholder="Enter up to 15 digits"
                      aria-invalid={Boolean(errors.phone)}
                    />
                    {errors.phone && (
                      <small className="admin-field-error">
                        {errors.phone}
                      </small>
                    )}
                  </label>
                  <label>
                    <span className="field-label">City</span>
                    <input
                      value={form.city}
                      onChange={(event) => {
                        setForm({ ...form, city: event.target.value });
                        setErrors({ ...errors, city: "" });
                      }}
                      placeholder="Enter city"
                      aria-invalid={Boolean(errors.city)}
                    />
                    {errors.city && (
                      <small className="admin-field-error">
                        {errors.city}
                      </small>
                    )}
                  </label>
                  <label>
                    <span className="field-label">State</span>
                    <input
                      value={form.state}
                      onChange={(event) => {
                        setForm({ ...form, state: event.target.value });
                        setErrors({ ...errors, state: "" });
                      }}
                      placeholder="Enter state"
                      aria-invalid={Boolean(errors.state)}
                    />
                    {errors.state && (
                      <small className="admin-field-error">
                        {errors.state}
                      </small>
                    )}
                  </label>
                  <label>
                    <span className="field-label">
                      Type <span className="required-mark">*</span>
                    </span>
                    <select
                      value={form.role_id}
                      onChange={(event) => {
                        setForm({
                          ...form,
                          role_id: event.target.value,
                          sub_role_id:
                            event.target.value === "2" ? form.sub_role_id : "",
                        });
                        setErrors({ ...errors, role_id: "", sub_role_id: "" });
                      }}
                      disabled={!canAssignRoles || rolesLoading || roles.length === 0}
                      aria-invalid={Boolean(errors.role_id)}
                    >
                      {roles.length === 0 ? (
                        <option value={form.role_id}>
                          {rolesLoading ? "Loading roles..." : "No roles found"}
                        </option>
                      ) : (
                        roles.map((role) => (
                          <option key={getRoleId(role)} value={getRoleId(role)}>
                            {getRoleName(role)}
                          </option>
                        ))
                      )}
                    </select>
                    {errors.role_id && (
                      <small className="admin-field-error">
                        {errors.role_id}
                      </small>
                    )}
                  </label>
                  {canAssignRoles && form.role_id === "2" ? (
                    <label>
                      <span className="field-label">
                        Sub Admin Role <span className="required-mark">*</span>
                      </span>
                      <select
                        value={form.sub_role_id}
                        onChange={(event) => {
                          setForm({ ...form, sub_role_id: event.target.value });
                          setErrors({ ...errors, sub_role_id: "" });
                        }}
                        aria-invalid={Boolean(errors.sub_role_id)}
                      >
                        <option value="">Select sub admin role</option>
                        {subAdminRoles.map((role) => (
                          <option key={getRoleId(role)} value={getRoleId(role)}>
                            {getRoleName(role)}
                          </option>
                        ))}
                      </select>
                      {errors.sub_role_id && (
                        <small className="admin-field-error">
                          {errors.sub_role_id}
                        </small>
                      )}
                    </label>
                  ) : null}
                  <label>
                    <span className="field-label">
                      Password <span className="required-mark">*</span>
                    </span>
                    <input
                      type="password"
                      value={form.password}
                      onChange={(event) => {
                        setForm({ ...form, password: event.target.value });
                        setErrors({ ...errors, password: "" });
                      }}
                      placeholder="Create password"
                      aria-invalid={Boolean(errors.password)}
                    />
                    {errors.password && (
                      <small className="admin-field-error">
                        {errors.password}
                      </small>
                    )}
                  </label>
                  <label>
                    <span className="field-label">
                      Confirm password <span className="required-mark">*</span>
                    </span>
                    <input
                      type="password"
                      value={form.confirm_password}
                      onChange={(event) => {
                        setForm({
                          ...form,
                          confirm_password: event.target.value,
                        });
                        setErrors({ ...errors, confirm_password: "" });
                      }}
                      placeholder="Re-enter password"
                      aria-invalid={Boolean(errors.confirm_password)}
                    />
                    {errors.confirm_password && (
                      <small className="admin-field-error">
                        {errors.confirm_password}
                      </small>
                    )}
                  </label>
                  <label>
                    <span className="field-label">Status</span>
                    <select
                      value={form.status}
                      onChange={(event) =>
                        setForm({ ...form, status: event.target.value })
                      }
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </label>
                  <label className="full-field">
                    <span className="field-label">Profile picture</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(event) =>
                        setForm({
                          ...form,
                          profile_pic: event.target.files?.[0] || null,
                        })
                      }
                    />
                  </label>
                </div>

                {message.text ? (
                  <p className={`status-message ${message.type}`}>
                    {message.text}
                  </p>
                ) : null}

                <div className="form-actions">
                  <button
                    type="submit"
                    className="submit-btn admin-btn"
                    disabled={loading}
                  >
                    {loading ? "Creating..." : "Create User"}
                  </button>
                  <Link to="/admin/users" className="ghost-btn">
                    Cancel
                  </Link>
                </div>
              </form>
            </article>
          </section>
        </section>

        <DashboardFooter />
      </section>
    </main>
  );
}

export default AddNewUserPage;
