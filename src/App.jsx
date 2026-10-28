import { useEffect, useMemo, useState } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  updateProfile,
} from "firebase/auth";
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";
import { auth, db } from "./firebase";
import {
  LayoutDashboard,
  List,
  BarChart3,
  PiggyBank,
  User,
  LogOut,
  Moon,
  Sun,
  Plus,
  Edit3,
  Trash2,
  Search,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Download,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceLine,
} from "recharts";

const CATS = [
  "Food",
  "Transport",
  "Shopping",
  "Bills",
  "Entertainment",
  "Education",
  "Health",
  "Other",
];

const money = (n) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(n || 0));

const blank = {
  title: "",
  amount: "",
  type: "expense",
  category: "Food",
  date: new Date().toISOString().slice(0, 10),
  note: "",
};

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState("dashboard");
  const [dark, setDark] = useState(
    () => localStorage.getItem("theme") !== "light"
  );
  const [items, setItems] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    return onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    localStorage.setItem("theme", dark ? "dark" : "light");
  }, [dark]);

  const load = async () => {
    if (!auth.currentUser) return;

    try {
      setLoadError("");

      const uid = auth.currentUser.uid;

      // FIX: removed orderBy so Firestore does not require
      // a composite index for userId + date.
      const transactionQuery = query(
        collection(db, "transactions"),
        where("userId", "==", uid)
      );

      const budgetQuery = query(
        collection(db, "budgets"),
        where("userId", "==", uid)
      );

      const [transactionSnapshot, budgetSnapshot] = await Promise.all([
        getDocs(transactionQuery),
        getDocs(budgetQuery),
      ]);

      // FIX: sort transactions locally instead of using
      // Firestore orderBy.
      setItems(
        transactionSnapshot.docs
          .map((snapshot) => ({
            id: snapshot.id,
            ...snapshot.data(),
          }))
          .sort((a, b) =>
            String(b.date || "").localeCompare(String(a.date || ""))
          )
      );

      setBudgets(
        budgetSnapshot.docs.map((snapshot) => ({
          id: snapshot.id,
          ...snapshot.data(),
        }))
      );
    } catch (error) {
      console.error("Failed to load data:", error);
      setLoadError("Could not refresh your data. Please try again.");
    }
  };

  useEffect(() => {
    if (user) {
      load();
    } else {
      setItems([]);
      setBudgets([]);
    }
  }, [user]);

  const exportCSV = () => {
    const headers = [
      "Title",
      "Amount",
      "Type",
      "Category",
      "Date",
      "Note",
    ];

    const rows = items.map((item) => [
      item.title,
      item.amount,
      item.type,
      item.category,
      item.date,
      item.note || "",
    ]);

    const escapeCSV = (value) =>
      `"${String(value ?? "").replace(/"/g, '""')}"`;

    const csv = [headers, ...rows]
      .map((row) => row.map(escapeCSV).join(","))
      .join("\n");

    const blob = new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "CloudSpend-transactions.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return <div className="loading">Loading CloudSpend…</div>;
  }

  if (!user) {
    return <Auth />;
  }

  return (
    <div className="shell">
      <aside>
        <div className="brand">
          ₹ <span>CloudSpend</span>
        </div>

        <nav>
          {[
            ["dashboard", "Dashboard", LayoutDashboard],
            ["transactions", "Transactions", List],
            ["analytics", "Analytics", BarChart3],
            ["budgets", "Budgets", PiggyBank],
            ["profile", "Profile", User],
          ].map(([pageId, label, Icon]) => (
            <button
              key={pageId}
              className={page === pageId ? "nav active" : "nav"}
              onClick={() => setPage(pageId)}
            >
              <Icon size={19} />
              {label}
            </button>
          ))}
        </nav>

        <div className="bottom">
          <button
            className="nav"
            onClick={() => setDark((current) => !current)}
          >
            {dark ? <Sun /> : <Moon />}
            {dark ? "Light mode" : "Dark mode"}
          </button>

          <button className="nav" onClick={() => signOut(auth)}>
            <LogOut />
            Logout
          </button>
        </div>
      </aside>

      <main>
        <header>
          <span>{user.email}</span>
          <button
            className="icon"
            onClick={() => setDark((current) => !current)}
          >
            {dark ? <Sun /> : <Moon />}
          </button>
        </header>

        <div className="page">
          {loadError && (
            <div className="message">
              {loadError}{" "}
              <button className="link" onClick={load}>
                Retry
              </button>
            </div>
          )}

          {page === "dashboard" && (
            <Dashboard items={items} setPage={setPage} />
          )}

          {page === "transactions" && (
            <Transactions
              items={items}
              reload={load}
              exportCSV={exportCSV}
            />
          )}

          {page === "analytics" && <Analytics items={items} />}

          {page === "budgets" && (
            <Budgets budgets={budgets} items={items} reload={load} />
          )}

          {page === "profile" && <Profile user={user} />}
        </div>
      </main>
    </div>
  );
}

function Auth() {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setMessage("");

    try {
      if (mode === "login") {
        await signInWithEmailAndPassword(auth, email, password);
      } else if (mode === "register") {
        if (password !== confirm) {
          setMessage("Passwords do not match.");
          return;
        }

        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await sendPasswordResetEmail(auth, email);
        setMessage("Password reset email sent.");
      }
    } catch (error) {
      setMessage(error.message.replace("Firebase: ", ""));
    }
  };

  return (
    <div className="auth">
      <div className="authbox">
        <div className="logo">₹</div>

        <h1>
          {mode === "login"
            ? "Welcome back"
            : mode === "register"
              ? "Create account"
              : "Reset password"}
        </h1>

        <p className="muted">
          {mode === "login"
            ? "Track your money, simply."
            : mode === "register"
              ? "Start managing your expenses."
              : "We'll send a reset link to your email."}
        </p>

        {message && <div className="message">{message}</div>}

        <form onSubmit={submit}>
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>

          {mode !== "forgot" && (
            <label>
              Password
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </label>
          )}

          {mode === "register" && (
            <label>
              Confirm password
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
              />
            </label>
          )}

          <button type="submit" className="primary">
            {mode === "login"
              ? "Login"
              : mode === "register"
                ? "Create account"
                : "Send reset link"}
          </button>
        </form>

        {mode === "login" && (
          <button className="link" onClick={() => setMode("forgot")}>
            Forgot password?
          </button>
        )}

        <button
          className="link"
          onClick={() =>
            setMode(mode === "register" ? "login" : "register")
          }
        >
          {mode === "register"
            ? "Already have an account? Login"
            : "Create a new account"}
        </button>
      </div>
    </div>
  );
}

function Dashboard({ items, setPage }) {
  const [period, setPeriod] = useState("30");

  const income = items
    .filter((item) => item.type === "income")
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);

  const expense = items
    .filter((item) => item.type === "expense")
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);

  const chartData = useMemo(() => {
  const sorted = [...items].sort((a, b) => {
    const dateOrder = String(a.date || "").localeCompare(
      String(b.date || "")
    );

    if (dateOrder !== 0) return dateOrder;

    return (
      (a.createdAt?.seconds || 0) -
      (b.createdAt?.seconds || 0)
    );
  });

  const days = period === "all" ? Infinity : Number(period);
  const cutoff = new Date();
  cutoff.setHours(0, 0, 0, 0);

  if (days !== Infinity) {
    cutoff.setDate(cutoff.getDate() - days + 1);
  }

  let balance = 0;
  const result = [];

  sorted.forEach((item) => {
    const date = item.date || "Unknown";
    const amount = Number(item.amount || 0);

    const transactionDate =
      date === "Unknown"
        ? null
        : new Date(`${date}T00:00:00`);

    if (
      days !== Infinity &&
      transactionDate &&
      transactionDate < cutoff
    ) {
      balance += item.type === "income" ? amount : -amount;
      return;
    }

    balance += item.type === "income" ? amount : -amount;

    result.push({
      date:
        date === "Unknown"
          ? date
          : new Date(`${date}T00:00:00`).toLocaleDateString(
              "en-IN",
              { day: "numeric", month: "short" }
            ),
      balance,
      income: item.type === "income" ? amount : 0,
      expense: item.type === "expense" ? amount : 0,
      transaction: item.title,
    });
  });

  return result;
}, [items, period]);

  return (
    <>
      <div className="head">
        <div>
          <small>FINANCIAL COMMAND CENTER</small>
          <h1>Dashboard</h1>
          <p className="muted">Your money. Your momentum.</p>
        </div>

        <button
          className="primary"
          onClick={() => setPage("transactions")}
        >
          <Plus /> Add transaction
        </button>
      </div>

      <div className="stats">
        <Stat
          icon={<Wallet />}
          label="Net balance"
          value={money(income - expense)}
        />
        <Stat
          icon={<ArrowUpRight />}
          label="Total income"
          value={money(income)}
        />
        <Stat
          icon={<ArrowDownRight />}
          label="Total spending"
          value={money(expense)}
        />
      </div>

      <section className="card flow-card">
        <div className="section flow-heading">
          <div>
            <small className="eyebrow">LIVE MONEY FLOW</small>
            <h2>Balance trajectory</h2>
            <p className="muted">
              Income lifts your balance. Spending brings it down.
            </p>
          </div>

          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
          >
            <option value="7">7 days</option>
            <option value="30">30 days</option>
            <option value="all">All time</option>
          </select>
        </div>

        <div className="flow-total">
          <strong>{money(income - expense)}</strong>
          <span><i /> CURRENT NET BALANCE</span>
        </div>

        <div className="flow-chart">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={chartData}
                margin={{ top: 15, right: 12, left: 8, bottom: 4 }}
              >
                <defs>
                  <linearGradient
                    id="balanceGlow"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="0%"
                      stopColor="#9b7bff"
                      stopOpacity={0.42}
                    />
                    <stop
                      offset="95%"
                      stopColor="#45e6ff"
                      stopOpacity={0.015}
                    />
                  </linearGradient>
                </defs>

                <CartesianGrid
                  stroke="#8b91b5"
                  strokeOpacity={0.12}
                  vertical={false}
                />

                <XAxis
                  dataKey="date"
                  tick={{ fill: "#969fbd", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  minTickGap={24}
                />

                <YAxis
                  tickFormatter={(value) =>
                    value === 0
                      ? "₹0"
                      : `₹${
                          Math.abs(value) >= 1000
                            ? (value / 1000).toFixed(1) + "k"
                            : value
                        }`
                  }
                  tick={{ fill: "#969fbd", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  width={55}
                />

                <ReferenceLine
                  y={0}
                  stroke="#aab2ce"
                  strokeOpacity={0.35}
                />

                <Tooltip
                  contentStyle={{
                    background: "#11172b",
                    border: "1px solid #51427e",
                    borderRadius: 12,
                    color: "#f4f2ff",
                  }}
                  formatter={(value) => [money(value), "Running balance"]}
                  labelStyle={{ color: "#b9a5ff" }}
                />

                <Area
                  type="monotone"
                  dataKey="balance"
                  stroke="#9b7bff"
                  strokeWidth={3}
                  fill="url(#balanceGlow)"
                  dot={false}
                  activeDot={{ r: 5 }}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty">
              Add your first transaction to start your balance graph.
            </div>
          )}
        </div>

        <div className="flow-legend">
          <span><i className="legend-purple" /> Running balance</span>
          <span><i className="legend-cyan" /> Income increases it</span>
          <span><i className="legend-red" /> Expenses decrease it</span>
        </div>
      </section>

      <section className="card">
        <div className="section">
          <h2>Recent transactions</h2>
          <button className="link" onClick={() => setPage("transactions")}>
            View all
          </button>
        </div>

        {items.slice(0, 7).map((item) => (
          <div className="row" key={item.id}>
            <div>
              <b>{item.title}</b>
              <small>{item.category} · {item.date}</small>
            </div>
            <strong className={item.type}>
              {item.type === "income" ? "+" : "-"}
              {money(item.amount)}
            </strong>
          </div>
        ))}

        {!items.length && (
          <div className="empty">No transactions yet.</div>
        )}
      </section>
    </>
  );
}

function Stat({ icon, label, value }) {
  return (
    <div className="stat card">
      <div className="staticon">{icon}</div>
      <div>
        <small>{label}</small>
        <strong>{value}</strong>
      </div>
    </div>
  );
}

function Transactions({ items, reload, exportCSV }) {
  const [form, setForm] = useState({ ...blank });
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState("");
  const [cat, setCat] = useState("All");
  const [type, setType] = useState("All");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const filtered = items.filter(
    (item) =>
      (
        String(item.title || "") +
        String(item.category || "") +
        String(item.note || "")
      )
        .toLowerCase()
        .includes(search.toLowerCase()) &&
      (cat === "All" || item.category === cat) &&
      (type === "All" || item.type === type)
  );

  const closeModal = () => {
    setOpen(false);
    setEditing(null);
    setForm({ ...blank });
  };

  const save = async (e) => {
    e.preventDefault();

    if (saving) return;

    if (!auth.currentUser) {
      alert("Please sign in again.");
      return;
    }

    const data = {
      title: form.title.trim(),
      amount: Number(form.amount),
      type: form.type,
      category: form.category,
      date: form.date,
      note: form.note || "",
      userId: auth.currentUser.uid,
    };

    if (
      !data.title ||
      !Number.isFinite(data.amount) ||
      data.amount <= 0 ||
      !data.date ||
      !["income", "expense"].includes(data.type)
    ) {
      alert("Please enter a title, valid amount, date, and transaction type.");
      return;
    }

    setSaving(true);

    try {
      if (editing) {
        await updateDoc(
          doc(db, "transactions", editing.id),
          data
        );
      } else {
        await addDoc(collection(db, "transactions"), {
          ...data,
          createdAt: serverTimestamp(),
        });
      }

      closeModal();

      reload().catch((error) => {
        console.error("Transaction saved, but refresh failed:", error);
      });
    } catch (error) {
      console.error("Transaction save failed:", error);
      alert(`Could not save transaction: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const edit = (item) => {
    setEditing(item);
    setForm({
      ...blank,
      ...item,
      amount: String(item.amount ?? ""),
      type: item.type === "income" ? "income" : "expense",
    });
    setOpen(true);
  };

  const del = async (id) => {
    if (!window.confirm("Delete this transaction?")) return;

    try {
      await deleteDoc(doc(db, "transactions", id));
      await reload();
    } catch (error) {
      console.error("Delete transaction failed:", error);
      alert("Could not delete transaction. Check your Firebase permissions.");
    }
  };

  return (
    <>
      <div className="head">
        <div>
          <small>MONEY LOG</small>
          <h1>Transactions</h1>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button
            className="primary"
            onClick={() => {
              setForm({ ...blank });
              setEditing(null);
              setOpen(true);
            }}
          >
            <Plus /> Add transaction
          </button>

          <button className="primary" onClick={exportCSV}>
            <Download /> Export CSV
          </button>
        </div>
      </div>

      <div className="filters card">
        <div className="search">
          <Search />
          <input
            placeholder="Search…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select value={cat} onChange={(e) => setCat(e.target.value)}>
          <option value="All">All</option>
          {CATS.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>

        <select value={type} onChange={(e) => setType(e.target.value)}>
          <option value="All">All</option>
          <option value="income">Income</option>
          <option value="expense">Expense</option>
        </select>
      </div>

      <section className="card">
        {filtered.map((item) => (
          <div className="row" key={item.id}>
            <div>
              <b>{item.title}</b>
              <small>
                {item.category} · {item.date}{" "}
                {item.note ? `· ${item.note}` : ""}
              </small>
            </div>

            <div className="actions">
              <strong className={item.type}>
                {item.type === "income" ? "+" : "-"}
                {money(item.amount)}
              </strong>

              <button
                className="icon"
                aria-label="Edit transaction"
                onClick={() => edit(item)}
              >
                <Edit3 />
              </button>

              <button
                className="icon"
                aria-label="Delete transaction"
                onClick={() => del(item.id)}
              >
                <Trash2 />
              </button>
            </div>
          </div>
        ))}

        {!filtered.length && (
          <div className="empty">No matching transactions.</div>
        )}
      </section>

      {open && (
        <Modal
          title={editing ? "Edit transaction" : "Add transaction"}
          close={closeModal}
        >
          <form onSubmit={save}>
            {["title", "amount", "date", "note"].map((key) => (
              <label key={key}>
                {key[0].toUpperCase() + key.slice(1)}
                <input
                  type={
                    key === "amount"
                      ? "number"
                      : key === "date"
                        ? "date"
                        : "text"
                  }
                  value={form[key] ?? ""}
                  onChange={(e) =>
                    setForm((current) => ({
                      ...current,
                      [key]: e.target.value,
                    }))
                  }
                  required={key !== "note"}
                  min={key === "amount" ? "0.01" : undefined}
                  step={key === "amount" ? "0.01" : undefined}
                />
              </label>
            ))}

            <label>
              Type
              <select
                value={form.type}
                onChange={(e) =>
                  setForm((current) => ({
                    ...current,
                    type: e.target.value,
                  }))
                }
              >
                <option value="expense">Expense</option>
                <option value="income">Income</option>
              </select>
            </label>

            <label>
              Category
              <select
                value={form.category}
                onChange={(e) =>
                  setForm((current) => ({
                    ...current,
                    category: e.target.value,
                  }))
                }
              >
                {CATS.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>

            <button
              type="submit"
              className="primary"
              disabled={saving}
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </form>
        </Modal>
      )}
    </>
  );
}

function Analytics({ items }) {
  const data = useMemo(() => {
    const categories = {};

    items
      .filter((item) => item.type === "expense")
      .forEach((item) => {
        categories[item.category] =
          (categories[item.category] || 0) +
          Number(item.amount || 0);
      });

    return Object.entries(categories).map(([name, value]) => ({
      name,
      value,
    }));
  }, [items]);

  const colors = {
    Food: "#FF6B35",
    Transport: "#00E5FF",
    Shopping: "#FF4FA3",
    Bills: "#B8F34A",
    Entertainment: "#9B5DE5",
    Education: "#F9C74F",
    Health: "#F94144",
    Other: "#43D9A3",
  };

  const fallbackColors = [
    "#FF6B35",
    "#00E5FF",
    "#FF4FA3",
    "#B8F34A",
    "#9B5DE5",
    "#F9C74F",
    "#F94144",
    "#43D9A3",
  ];

  return (
    <>
      <div className="head">
        <div>
          <small>INSIGHTS</small>
          <h1>Analytics</h1>
          <p className="muted">Understand where your money goes.</p>
        </div>
      </div>

      <section className="card chart">
        <h2>Expenses by category</h2>

        {data.length ? (
          <ResponsiveContainer width="100%" height={350}>
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                outerRadius={120}
                label
              >
                {data.map((entry, index) => (
                  <Cell
                    key={entry.name}
                    fill={
                      colors[entry.name] ||
                      fallbackColors[index % fallbackColors.length]
                    }
                    stroke="#101326"
                    strokeWidth={2}
                  />
                ))}
              </Pie>

              <Tooltip formatter={(value) => money(value)} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="empty">Add expenses to see your chart.</div>
        )}
      </section>
    </>
  );
}

function Budgets({ budgets, items, reload }) {
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState(null);
  const [cat, setCat] = useState("Food");
  const [limit, setLimit] = useState("");
  const [saving, setSaving] = useState(false);

  const closeModal = () => {
    setOpen(false);
    setEdit(null);
    setCat("Food");
    setLimit("");
  };

  const save = async (e) => {
    e.preventDefault();

    if (saving) return;

    if (!auth.currentUser) {
      alert("Please sign in again.");
      return;
    }

    const amount = Number(limit);

    if (!Number.isFinite(amount) || amount <= 0) {
      alert("Enter a valid budget limit.");
      return;
    }

    setSaving(true);

    try {
      const data = {
        category: cat,
        limit: amount,
        userId: auth.currentUser.uid,
      };

      if (edit) {
        await updateDoc(doc(db, "budgets", edit.id), data);
      } else {
        await addDoc(collection(db, "budgets"), data);
      }

      closeModal();

      reload().catch((error) => {
        console.error("Budget refresh failed:", error);
      });
    } catch (error) {
      console.error("Save budget failed:", error);
      alert(`Could not save budget: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const spent = (category) =>
    items
      .filter(
        (item) =>
          item.type === "expense" &&
          item.category === category
      )
      .reduce(
        (sum, item) => sum + Number(item.amount || 0),
        0
      );

  const deleteBudget = async (id) => {
    if (!window.confirm("Delete budget?")) return;

    try {
      await deleteDoc(doc(db, "budgets", id));
      await reload();
    } catch (error) {
      console.error("Delete budget failed:", error);
      alert("Could not delete budget.");
    }
  };

  return (
    <>
      <div className="head">
        <div>
          <small>PLAN AHEAD</small>
          <h1>Budgets</h1>
        </div>

        <button
          className="primary"
          onClick={() => {
            setEdit(null);
            setCat("Food");
            setLimit("");
            setOpen(true);
          }}
        >
          <Plus /> Add budget
        </button>
      </div>

      <div className="budgets">
        {budgets.map((budget) => {
          const totalSpent = spent(budget.category);

          const percent =
            budget.limit > 0
              ? Math.min(
                  100,
                  (totalSpent / budget.limit) * 100
                )
              : 0;

          return (
            <section
              className="card budget"
              key={budget.id}
            >
              <div className="section">
                <div>
                  <h2>{budget.category}</h2>

                  <p className="muted">
                    {money(totalSpent)} of{" "}
                    {money(budget.limit)}
                  </p>
                </div>

                <div className="actions">
                  <button
                    className="icon"
                    aria-label="Edit budget"
                    onClick={() => {
                      setEdit(budget);
                      setCat(budget.category);
                      setLimit(String(budget.limit));
                      setOpen(true);
                    }}
                  >
                    <Edit3 />
                  </button>

                  <button
                    className="icon"
                    aria-label="Delete budget"
                    onClick={() =>
                      deleteBudget(budget.id)
                    }
                  >
                    <Trash2 />
                  </button>
                </div>
              </div>

              <div className="progress">
                <span
                  style={{ width: percent + "%" }}
                />
              </div>

              <small>
                {percent >= 100
                  ? "Budget exceeded"
                  : Math.round(percent) + "% used"}
              </small>
            </section>
          );
        })}
      </div>

      {open && (
        <Modal
          title={edit ? "Edit budget" : "Add budget"}
          close={closeModal}
        >
          <form onSubmit={save}>
            <label>
              Category

              <select
                value={cat}
                onChange={(e) =>
                  setCat(e.target.value)
                }
              >
                {CATS.map((category) => (
                  <option
                    key={category}
                    value={category}
                  >
                    {category}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Monthly limit (₹)

              <input
                type="number"
                min="1"
                value={limit}
                onChange={(e) =>
                  setLimit(e.target.value)
                }
                required
              />
            </label>

            <button
              type="submit"
              className="primary"
              disabled={saving}
            >
              {saving ? "Saving…" : "Save budget"}
            </button>
          </form>
        </Modal>
      )}
    </>
  );
}

function Profile({ user }) {
  const [name, setName] = useState(user.displayName || "");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const saveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage("");

    try {
      await updateProfile(auth.currentUser, {
        displayName: name,
      });

      setMessage("Profile updated.");
    } catch (error) {
      console.error("Profile update failed:", error);
      setMessage("Could not update profile.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="head">
        <div>
          <small>ACCOUNT</small>
          <h1>Profile</h1>
        </div>
      </div>

      <section className="card profile">
        <div className="avatar">
          {(name || user.email || "U")[0].toUpperCase()}
        </div>

        <h2>{name || "Your profile"}</h2>
        <p className="muted">{user.email}</p>

        <form onSubmit={saveProfile}>
          <label>
            Display name

            <input
              value={name}
              onChange={(e) =>
                setName(e.target.value)
              }
            />
          </label>

          <button
            type="submit"
            className="primary"
            disabled={saving}
          >
            {saving ? "Saving…" : "Save profile"}
          </button>

          {message && (
            <p className="success">{message}</p>
          )}
        </form>
      </section>
    </>
  );
}

function Modal({ title, close, children }) {
  return (
    <div
      className="modalbg"
      onMouseDown={close}
    >
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(e) =>
          e.stopPropagation()
        }
      >
        <div className="section">
          <h2>{title}</h2>

          <button
            type="button"
            className="icon"
            aria-label="Close modal"
            onClick={close}
          >
            ×
          </button>
        </div>

        {children}
      </div>
    </div>
  );
}