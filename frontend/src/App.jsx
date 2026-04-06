const API_URL = "http://localhost:3000";

import { useState, useEffect } from "react";
import { Doughnut, Line } from "react-chartjs-2";
import {
Chart as ChartJS,
LineElement,
ArcElement,
CategoryScale,
LinearScale,
PointElement,
Tooltip,
Legend
} from "chart.js";

ChartJS.register(
LineElement,
ArcElement,
CategoryScale,
LinearScale,
PointElement,
Tooltip,
Legend
);

export default function App(){

const [token, setToken] = useState(localStorage.getItem('token') || '');
const [isLoggedIn, setIsLoggedIn] = useState(!!token);
const [role, setRole] = useState(localStorage.getItem('role') || '');
const [currentUser, setCurrentUser] = useState(localStorage.getItem('username') || '');
const [loginData, setLoginData] = useState({ username: '', password: '' });
const [events,setEvents] = useState([])
const [blockHeight,setBlockHeight] = useState(1042)
const [isValid, setIsValid] = useState(true);
const [newEvent, setNewEvent] = useState({
    userId: "",
    action: "CREATE",
    resource: "",
    status: "SUCCESS"
});
const [hoveredBlock, setHoveredBlock] = useState(null);
const [users, setUsers] = useState([
    { username: 'admin', role: 'admin', status: 'active' },
    { username: 'auditor', role: 'auditor', status: 'active' },
    { username: 'employee', role: 'employee', status: 'active' }
]);
const [newUser, setNewUser] = useState({ username: '', role: 'employee', status: 'active', password: '' });
const [auditUserFilter, setAuditUserFilter] = useState('');
const [auditActionFilter, setAuditActionFilter] = useState('');
const [auditDateFilter, setAuditDateFilter] = useState('');
const [auditTxFilter, setAuditTxFilter] = useState('');

    useEffect(() => {
    if (!isLoggedIn) return;
    const fetchData = async () => {
        try {
        const headers = { "Authorization": `Bearer ${token}` };
        const res = await fetch(`${API_URL}/chain`, { headers });
        const chain = await res.json();

        if (!Array.isArray(chain)) {
            console.error('Unexpected chain response', chain);
            setEvents([]);
            return;
        }

        if (role === "auditor" || role === "admin") {
            const verifyRes = await fetch(`${API_URL}/verify`, { headers });
            const verifyData = await verifyRes.json();
            setIsValid(verifyData.valid);
        } else {
            setIsValid(true);
        }

        // ✅ Extract ONLY valid event blocks
        const extractedEvents = chain
            .filter(b => b && typeof b.data === "object")
            .map(b => ({
            userId: b.data.userId,
            action: b.data.action,
            resource: b.data.resource,
            status: b.data.status,
            timestamp: b.timestamp,
            index: b.index,
            eventId: b.data.eventId || b.id || `tx-${b.index}`,
            blockHash: b.hash || '',
            transactionStatus: b.data.status || 'CONFIRMED'
            }))
            .reverse();

        setEvents(extractedEvents);
        setBlockHeight(chain.length - 1);

        } catch (err) {
        console.error("Error fetching chain:", err);
        }
    };

    fetchData();
    const interval = setInterval(fetchData, 3000);
    return () => clearInterval(interval);
    }, [isLoggedIn, token, role]);

        const handleLogin = async () => {
        try {
            const response = await fetch(`${API_URL}/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(loginData)
            });
            if (response.ok) {
                const data = await response.json();
                setToken(data.token);
                setRole(data.role || '');
                setCurrentUser(loginData.username);
                localStorage.setItem('token', data.token);
                localStorage.setItem('role', data.role || '');
                localStorage.setItem('username', loginData.username);
                setIsLoggedIn(true);
            } else {
                alert("Login failed: " + response.statusText);
            }
        } catch (error) {
            alert("Login error: " + error.message);
        }
    };

    const handleLogout = () => {
        setToken('');
        setRole('');
        setCurrentUser('');
        localStorage.removeItem('token');
        localStorage.removeItem('role');
        localStorage.removeItem('username');
        setIsLoggedIn(false);
    };

    const canAddEvent = role === "employee" || role === "admin";
    const canViewAudit = role === "auditor" || role === "admin";
    const isAdmin = role === "admin";
    const isEmployee = role === "employee";

        const lineData = {
    labels: events.slice(0, 8).map(e => `#${e.index}`),
    datasets: [
        {
        label: "Total Events",
        data: events.slice(0, 8).map((_, i) => events.length - (7 - i)),
        borderColor: "#00e5ff",
        tension: 0.4
        }
    ]
    };

    const failedEvents = events.filter(e => e.status === "FAILURE").length;

    const actionCounts = events.reduce((acc, e) => {
    acc[e.action] = (acc[e.action] || 0) + 1;
    return acc;
    }, {});

    const doughnutData = {
    labels: Object.keys(actionCounts),
    datasets: [
        {
        data: Object.values(actionCounts),
        backgroundColor: ["#00e5ff","#22c55e","#ff7849","#a855f7","#facc15","#f43f5e"]
        }
    ]
    };

    const totalUsers = users.length;
    const activeUsers = users.filter(u => u.status === 'active').length;
    const inactiveUsers = totalUsers - activeUsers;
    const suspiciousAlerts = failedEvents + (events.filter(e => e.action === 'DELETE').length || 0);
    const auditFilteredEvents = events.filter(e => {
        const matchesUser = auditUserFilter ? e.userId.toLowerCase().includes(auditUserFilter.toLowerCase()) : true;
        const matchesAction = auditActionFilter ? e.action === auditActionFilter : true;
        const matchesDate = auditDateFilter ? e.timestamp.startsWith(auditDateFilter) : true;
        const matchesTx = auditTxFilter ? e.eventId.toLowerCase().includes(auditTxFilter.toLowerCase()) : true;
        return matchesUser && matchesAction && matchesDate && matchesTx;
    });
    const employeeEvents = events.filter(e => e.userId === currentUser);
    const permissionRule = "Employees may log CREATE, READ, UPDATE, DELETE, LOGIN, LOGOUT actions only.";

    useEffect(() => {
        if (isEmployee && currentUser) {
            setNewEvent(prev => ({ ...prev, userId: currentUser }));
        }
    }, [isEmployee, currentUser]);

    const downloadFile = (filename, content, type) => {
        const blob = new Blob([content], { type });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const getExportRows = () => {
        const source = auditFilteredEvents.length ? auditFilteredEvents : events;
        return source.map(event => ({
            eventId: event.eventId,
            timestamp: event.timestamp,
            userId: event.userId,
            action: event.action,
            resource: event.resource,
            status: event.status,
            blockHash: event.blockHash,
            transactionStatus: event.transactionStatus
        }));
    };

    const handleExportCSV = () => {
        const rows = getExportRows();
        const headers = ["eventId","timestamp","userId","action","resource","status","blockHash","transactionStatus"];
        const csv = [headers.join(',')].concat(
            rows.map(row => headers.map(key => `"${String(row[key] || '').replace(/"/g, '""')}"`).join(','))
        ).join('\n');
        downloadFile(`audit-log-export-${Date.now()}.csv`, csv, 'text/csv;charset=utf-8;');
    };

    const handleExportPDF = () => {
        const rows = getExportRows();
        const htmlRows = rows.map(row => `
            <tr>
                <td>${row.eventId}</td>
                <td>${row.timestamp}</td>
                <td>${row.userId}</td>
                <td>${row.action}</td>
                <td>${row.resource}</td>
                <td>${row.status}</td>
                <td>${row.blockHash}</td>
                <td>${row.transactionStatus}</td>
            </tr>
        `).join('');

        const reportHtml = `
            <html>
            <head>
                <title>Audit Export</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 24px; color: #111; }
                    table { width: 100%; border-collapse: collapse; }
                    th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
                    th { background: #f4f4f4; }
                </style>
            </head>
            <body>
                <h1>Audit Log Export</h1>
                <p>Exported ${rows.length} records.</p>
                <table>
                    <thead>
                        <tr>
                            <th>Transaction ID</th>
                            <th>Timestamp</th>
                            <th>User</th>
                            <th>Action</th>
                            <th>Resource</th>
                            <th>Status</th>
                            <th>Block Hash</th>
                            <th>Transaction Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${htmlRows}
                    </tbody>
                </table>
            </body>
            </html>
        `;

        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.write(reportHtml);
            printWindow.document.close();
            printWindow.focus();
            printWindow.print();
        } else {
            alert('Please allow popups to export PDF.');
        }
    };

    if (!isLoggedIn) {
        return (
            <div className="min-h-screen bg-[#020617] text-white flex items-center justify-center">
                <div className="bg-[#0f172a] p-8 rounded-xl space-y-4">
                    <h1 className="text-2xl font-bold text-center">Login to AuditChain</h1>
                    <input
                        type="text"
                        placeholder="Username"
                        value={loginData.username}
                        onChange={(e) => setLoginData({...loginData, username: e.target.value})}
                        className="w-full bg-[#020617] border border-cyan-800 rounded px-3 py-2 text-white"
                    />
                    <input
                        type="password"
                        placeholder="Password"
                        value={loginData.password}
                        onChange={(e) => setLoginData({...loginData, password: e.target.value})}
                        className="w-full bg-[#020617] border border-cyan-800 rounded px-3 py-2 text-white"
                    />
                    <button
                        onClick={handleLogin}
                        className="w-full bg-cyan-500 px-4 py-2 rounded"
                    >
                        Login
                    </button>
                </div>
            </div>
        );
    }

return (
<div className="bg-[#020617] text-white min-h-screen">

{/* HEADER */}

<header className="flex justify-between items-center px-8 py-4 border-b border-gray-800">

<h1 className="text-2xl font-bold">
Audit<span className="text-cyan-400">Chain</span>
</h1>

<div className="flex gap-6 text-sm">

<span>Block Height <b className="text-cyan-400">#{blockHeight}</b></span>

<span>Role <b className="text-cyan-400">{role || 'guest'}</b></span>

<span className="bg-green-900 text-green-400 px-3 py-1 rounded-full">
● LIVE
</span>

<button
    onClick={handleLogout}
    className="bg-red-500 px-3 py-1 rounded text-white"
>
    Logout
</button>

</div>

</header>


<div className="p-8 space-y-8">

{/* KPI */}

    {canAddEvent ? (
    <div className="bg-[#0f172a] p-6 rounded-xl space-y-4">
        <h3 className="text-gray-400">Add New Audit Event</h3>
        <div className="grid grid-cols-2 gap-4">
            <input
                type="text"
                placeholder="User ID"
                value={role === 'employee' ? currentUser : newEvent.userId}
                onChange={(e) => setNewEvent({...newEvent, userId: e.target.value})}
                disabled={role === 'employee'}
                className="bg-[#020617] border border-cyan-800 rounded px-3 py-2 text-white disabled:opacity-60"
            />
            <select
                value={newEvent.action}
                onChange={(e) => setNewEvent({...newEvent, action: e.target.value})}
                className="bg-[#020617] border border-cyan-800 rounded px-3 py-2 text-white"
            >
                <option value="CREATE">CREATE</option>
                <option value="READ">READ</option>
                <option value="UPDATE">UPDATE</option>
                <option value="DELETE">DELETE</option>
                <option value="LOGIN">LOGIN</option>
                <option value="LOGOUT">LOGOUT</option>
            </select>
            <input
                type="text"
                placeholder="Resource"
                value={newEvent.resource}
                onChange={(e) => setNewEvent({...newEvent, resource: e.target.value})}
                className="bg-[#020617] border border-cyan-800 rounded px-3 py-2 text-white"
            />
            <select
                value={newEvent.status}
                onChange={(e) => setNewEvent({...newEvent, status: e.target.value})}
                className="bg-[#020617] border border-cyan-800 rounded px-3 py-2 text-white"
            >
                <option value="SUCCESS">SUCCESS</option>
                <option value="FAILURE">FAILURE</option>
            </select>
        </div>
        <button
        onClick={async () => {
            try {
                const response = await fetch(`${API_URL}/addLog`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}`
                    },
                    body: JSON.stringify(newEvent)
                });
                if (response.ok) {
                    alert("Event added successfully!");
                    setNewEvent({
                        userId: "",
                        action: "CREATE",
                        resource: "",
                        status: "SUCCESS"
                    });
                } else {
                    alert("Failed to add event: " + response.statusText);
                }
            } catch (error) {
                alert("Error adding event: " + error.message);
            }
        }}
        className="bg-cyan-500 px-4 py-2 rounded"
        >
        Add Event
        </button>
    </div>
    ) : (
    <div className="bg-[#0f172a] p-6 rounded-xl text-gray-300">
        <h3 className="text-gray-400">Audit Event Access</h3>
        <p className="text-sm">
            Only employees and admins can create or modify audit records. Auditors can review and verify logs.
        </p>
    </div>
    )}

<h2 className={`text-3xl font-bold ${isValid ? "text-green-400" : "text-red-400"}`}>
    {isValid ? "100%" : "COMPROMISED"}
</h2>

<div className="grid grid-cols-4 gap-6">

<div className="bg-[#0f172a] p-6 rounded-xl border border-cyan-900">
<p className="text-gray-400 text-sm">Total Events Logged</p>
<h2 className="text-3xl font-bold mt-2">{events.length}</h2>
</div>

<div className="bg-[#0f172a] p-6 rounded-xl border border-green-900">
<p className="text-gray-400 text-sm">Chain Integrity</p>
<h2 className={`text-3xl font-bold ${isValid ? "text-green-400" : "text-red-400"}`}>
    {isValid ? "100%" : "0%"}
</h2>
</div>

<div className="bg-[#0f172a] p-6 rounded-xl border border-orange-900">
<p className="text-gray-400 text-sm">Avg Block Time</p>
<h2 className="text-3xl font-bold">28s</h2>
</div>

<div className="bg-[#0f172a] p-6 rounded-xl border border-purple-900">
<p className="text-gray-400 text-sm">Active Actors</p>
<h2 className="text-3xl font-bold">{new Set(events.map(e => e.userId)).size}</h2>
</div>
</div>

{isEmployee && (
    <div className="bg-[#0f172a] p-6 rounded-xl border border-cyan-800">
        <h2 className="text-xl font-semibold text-gray-200">Employee Dashboard</h2>
        <div className="grid grid-cols-3 gap-6 mt-4">
            <div className="bg-[#020617] p-4 rounded-xl border border-cyan-800">
                <h3 className="text-gray-300 mb-3">My Activity</h3>
                {employeeEvents.length === 0 ? (
                    <p className="text-sm text-gray-400">No recent personal activity.</p>
                ) : (
                    employeeEvents.slice(0, 5).map(event => (
                        <div key={event.eventId} className="mb-3 p-3 rounded-xl bg-[#0b1724] border border-cyan-800">
                            <p className="text-white text-sm">{event.action} {event.resource}</p>
                            <p className="text-xs text-gray-400">{event.timestamp.split('T')[0]} • {event.status}</p>
                        </div>
                    ))
                )}
            </div>
            <div className="bg-[#020617] p-4 rounded-xl border border-cyan-800">
                <h3 className="text-gray-300 mb-3">Transaction Status</h3>
                <p className="text-sm text-gray-400">Pending / confirmed status for your actions.</p>
                <div className="mt-3 space-y-2 text-sm text-gray-300">
                    {employeeEvents.length === 0 ? (
                        <p>No recent transactions.</p>
                    ) : (
                        employeeEvents.slice(0, 5).map(event => (
                            <div key={event.eventId} className="p-3 rounded-xl bg-[#0f172a] border border-cyan-800">
                                <p>{event.eventId}</p>
                                <p>{event.transactionStatus}</p>
                            </div>
                        ))
                    )}
                </div>
            </div>
            <div className="bg-[#020617] p-4 rounded-xl border border-cyan-800">
                <h3 className="text-gray-300 mb-3">Notifications</h3>
                <p className="text-sm text-gray-400">Approval, rejection, or error events appear here.</p>
                <div className="mt-3 space-y-2 text-sm text-gray-300">
                    <p>{failedEvents > 0 ? `${failedEvents} failed event(s)` : 'No recent errors.'}</p>
                    <p>Latest: {employeeEvents[0]?.action || 'No recent activity'}</p>
                </div>
            </div>
        </div>
    </div>
)}

{isAdmin && (
    <div className="grid grid-cols-1 gap-6">
        <div className="bg-[#0f172a] p-6 rounded-xl border border-yellow-600">
            <h2 className="text-xl font-semibold text-gray-200">Admin Dashboard</h2>
            <div className="grid grid-cols-4 gap-4 mt-4">
                <div className="bg-[#020617] p-4 rounded-xl border border-cyan-800">
                    <p className="text-gray-400 text-sm">Total Users</p>
                    <p className="text-3xl font-bold">{totalUsers}</p>
                </div>
                <div className="bg-[#020617] p-4 rounded-xl border border-cyan-800">
                    <p className="text-gray-400 text-sm">Total Logs</p>
                    <p className="text-3xl font-bold">{events.length}</p>
                </div>
                <div className="bg-[#020617] p-4 rounded-xl border border-cyan-800">
                    <p className="text-gray-400 text-sm">Active Users</p>
                    <p className="text-3xl font-bold">{activeUsers}</p>
                </div>
                <div className="bg-[#020617] p-4 rounded-xl border border-cyan-800">
                    <p className="text-gray-400 text-sm">Alerts</p>
                    <p className="text-3xl font-bold">{suspiciousAlerts}</p>
                </div>
            </div>
        </div>

        <div className="grid grid-cols-3 gap-6">
            <div className="bg-[#0f172a] p-6 rounded-xl border border-cyan-800 col-span-2">
                <h3 className="text-gray-300 mb-3">User Management</h3>
                <div className="space-y-4">
                    <div className="grid grid-cols-4 gap-3">
                        <input
                            type="text"
                            placeholder="Username"
                            value={newUser.username}
                            onChange={(e) => setNewUser({...newUser, username: e.target.value})}
                            className="bg-[#020617] border border-cyan-800 rounded px-3 py-2 text-white"
                        />
                        <input
                            type="password"
                            placeholder="Password"
                            value={newUser.password}
                            onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                            className="bg-[#020617] border border-cyan-800 rounded px-3 py-2 text-white"
                        />
                        <select
                            value={newUser.role}
                            onChange={(e) => setNewUser({...newUser, role: e.target.value})}
                            className="bg-[#020617] border border-cyan-800 rounded px-3 py-2 text-white"
                        >
                            <option value="employee">Employee</option>
                            <option value="auditor">Auditor</option>
                            <option value="admin">Admin</option>
                        </select>
                        <button
                            onClick={async () => {
                                if (!newUser.username) {
                                    alert('Username is required');
                                    return;
                                }
                                if (!newUser.password) {
                                    alert('Password is required');
                                    return;
                                }
                                try {
                                    const response = await fetch(`${API_URL}/users`, {
                                        method: 'POST',
                                        headers: {
                                            'Content-Type': 'application/json',
                                            Authorization: `Bearer ${token}`
                                        },
                                        body: JSON.stringify({
                                            username: newUser.username,
                                            role: newUser.role,
                                            password: newUser.password
                                        })
                                    });
                                    if (!response.ok) {
                                        const errorData = await response.json();
                                        alert(`Unable to create user: ${errorData.error || response.statusText}`);
                                        return;
                                    }
                                    const createdUser = await response.json();
                                    setUsers([...users, { username: createdUser.username, role: createdUser.role, status: 'active' }]);
                                    setNewUser({ username: '', role: 'employee', status: 'active', password: '' });
                                    alert(`User created with password: ${createdUser.password}`);
                                } catch (error) {
                                    alert(`Create user failed: ${error.message}`);
                                }
                            }}
                            className="bg-green-500 px-4 py-2 rounded"
                        >
                            Create User
                        </button>
                    </div>
                    <div className="space-y-2">
                        {users.map((user) => (
                            <div key={user.username} className="flex items-center justify-between bg-[#020617] px-4 py-3 rounded-lg border border-cyan-800">
                                <div>
                                    <p className="font-semibold">{user.username}</p>
                                    <p className="text-sm text-gray-400">{user.role} • {user.status}</p>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setUsers(users.map(u => u.username === user.username ? { ...u, role: u.role === 'employee' ? 'auditor' : u.role === 'auditor' ? 'admin' : 'employee' } : u))}
                                        className="bg-cyan-500 px-3 py-1 rounded text-sm"
                                    >
                                        Cycle Role
                                    </button>
                                    <button
                                        onClick={() => setUsers(users.filter(u => u.username !== user.username))}
                                        className="bg-red-600 px-3 py-1 rounded text-sm"
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="bg-[#0f172a] p-6 rounded-xl border border-cyan-800">
                <h3 className="text-gray-300 mb-3">Blockchain Status</h3>
                <div className="space-y-3">
                    <div className="flex justify-between text-sm text-gray-400">
                        <span>Node Health</span>
                        <span>{isValid ? 'Healthy' : 'Degraded'}</span>
                    </div>
                    <div className="flex justify-between text-sm text-gray-400">
                        <span>Success / Failure Rate</span>
                        <span>{events.length - failedEvents}/{events.length || 1}</span>
                    </div>
                    <div className="flex justify-between text-sm text-gray-400">
                        <span>Latest Block</span>
                        <span>#{blockHeight}</span>
                    </div>
                    <div className="text-sm text-gray-300 bg-[#020617] p-3 rounded-xl border border-cyan-800">
                        System can define logging rules and approve user access from User Management.
                    </div>
                </div>
            </div>

            <div className="bg-[#0f172a] p-6 rounded-xl border border-cyan-800">
                <h3 className="text-gray-300 mb-3">Permissions / Policies</h3>
                <p className="text-sm text-gray-400 mb-4">Define what employees can log and record audit policies.</p>
                <div className="bg-[#020617] p-4 rounded-xl border border-cyan-800 text-sm text-gray-300">
                    {permissionRule}
                </div>
            </div>
        </div>

        <div className="bg-[#0f172a] p-6 rounded-xl border border-cyan-800">
            <h3 className="text-gray-300 mb-3">Audit Log Access</h3>
            <div className="grid grid-cols-4 gap-3 mb-4">
                <input
                    type="text"
                    placeholder="User filter"
                    value={auditUserFilter}
                    onChange={(e) => setAuditUserFilter(e.target.value)}
                    className="bg-[#020617] border border-cyan-800 rounded px-3 py-2 text-white"
                />
                <select
                    value={auditActionFilter}
                    onChange={(e) => setAuditActionFilter(e.target.value)}
                    className="bg-[#020617] border border-cyan-800 rounded px-3 py-2 text-white"
                >
                    <option value="">All actions</option>
                    {['LOGIN','LOGOUT','CREATE','READ','UPDATE','DELETE'].map(action => (
                        <option key={action} value={action}>{action}</option>
                    ))}
                </select>
                <input
                    type="date"
                    value={auditDateFilter}
                    onChange={(e) => setAuditDateFilter(e.target.value)}
                    className="bg-[#020617] border border-cyan-800 rounded px-3 py-2 text-white"
                />
                <input
                    type="text"
                    placeholder="Transaction ID"
                    value={auditTxFilter}
                    onChange={(e) => setAuditTxFilter(e.target.value)}
                    className="bg-[#020617] border border-cyan-800 rounded px-3 py-2 text-white"
                />
            </div>
            <div className="max-h-72 overflow-y-auto rounded-xl border border-cyan-800 bg-[#020617] p-4">
                {auditFilteredEvents.length === 0 ? (
                    <p className="text-gray-400 text-sm">No audit records match the current filters.</p>
                ) : (
                    auditFilteredEvents.map((event) => (
                        <div key={event.eventId} className="mb-3 p-3 rounded-xl bg-[#0b1724] border border-cyan-800">
                            <div className="flex justify-between text-sm text-gray-300">
                                <span>{event.userId}</span>
                                <span>{event.timestamp.split('T')[0]}</span>
                            </div>
                            <div className="mt-2 text-white">
                                <p className="font-semibold">{event.action} / {event.resource}</p>
                                <p className="text-xs text-gray-400">TX: {event.eventId}</p>
                            </div>
                        </div>
                    ))
                )}
            </div>
            <div className="mt-4 flex gap-3">
                <button onClick={handleExportCSV} className="bg-cyan-500 px-4 py-2 rounded">Export CSV</button>
                <button onClick={handleExportPDF} className="bg-purple-500 px-4 py-2 rounded">Export PDF</button>
            </div>
        </div>
    </div>
)}

{canViewAudit && !isAdmin && (
    <div className="bg-[#0f172a] p-6 rounded-xl border border-cyan-800">
        <h2 className="text-xl font-semibold text-gray-200">Auditor Dashboard</h2>
        <div className="grid grid-cols-1 gap-6 mt-4">
            <div className="bg-[#020617] p-4 rounded-xl border border-cyan-800">
                <h3 className="text-gray-300 mb-3">Audit Trail Viewer</h3>
                <div className="grid grid-cols-4 gap-3 mb-4">
                    <input
                        type="text"
                        placeholder="User"
                        value={auditUserFilter}
                        onChange={(e) => setAuditUserFilter(e.target.value)}
                        className="bg-[#0b1724] border border-cyan-800 rounded px-3 py-2 text-white"
                    />
                    <input
                        type="date"
                        value={auditDateFilter}
                        onChange={(e) => setAuditDateFilter(e.target.value)}
                        className="bg-[#0b1724] border border-cyan-800 rounded px-3 py-2 text-white"
                    />
                    <input
                        type="text"
                        placeholder="Transaction ID"
                        value={auditTxFilter}
                        onChange={(e) => setAuditTxFilter(e.target.value)}
                        className="bg-[#0b1724] border border-cyan-800 rounded px-3 py-2 text-white"
                    />
                    <select
                        value={auditActionFilter}
                        onChange={(e) => setAuditActionFilter(e.target.value)}
                        className="bg-[#0b1724] border border-cyan-800 rounded px-3 py-2 text-white"
                    >
                        <option value="">All actions</option>
                        {['LOGIN','LOGOUT','CREATE','READ','UPDATE','DELETE'].map(action => (
                            <option key={action} value={action}>{action}</option>
                        ))}
                    </select>
                </div>
                <div className="max-h-72 overflow-y-auto rounded-xl border border-cyan-800 bg-[#020617] p-4">
                    {auditFilteredEvents.length === 0 ? (
                        <p className="text-gray-400 text-sm">No matching audit logs.</p>
                    ) : auditFilteredEvents.map(event => (
                        <div key={event.eventId} className="mb-3 p-3 rounded-xl bg-[#0b1724] border border-cyan-800">
                            <div className="flex justify-between text-sm text-gray-300">
                                <span>{event.userId}</span>
                                <span>{event.timestamp.split('T')[0]}</span>
                            </div>
                            <div className="mt-2 text-white">
                                <p className="font-semibold">{event.action} / {event.resource}</p>
                                <p className="text-xs text-gray-400">TX: {event.eventId}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            <div className="grid grid-cols-2 gap-6">
                <div className="bg-[#020617] p-4 rounded-xl border border-cyan-800">
                    <h3 className="text-gray-300 mb-3">Verification Tools</h3>
                    <p className="text-sm text-gray-400">Compare hashes and validate proof integrity before approving.</p>
                    <div className="mt-3 text-sm text-gray-300 bg-[#0f172a] p-3 rounded-xl border border-cyan-800">
                        {isValid ? 'Hash chain integrity verified.' : 'Possible data tampering detected.'}
                    </div>
                </div>
                <div className="bg-[#020617] p-4 rounded-xl border border-cyan-800">
                    <h3 className="text-gray-300 mb-3">Alerts / Flags</h3>
                    <p className="text-sm text-gray-400">Suspicious activity, missing logs, and irregular patterns are shown here.</p>
                    <ul className="mt-3 space-y-2 text-sm text-gray-300">
                        <li>Failed events: {failedEvents}</li>
                        <li>Missing logs: {events.length === 0 ? 'Yes' : 'No'}</li>
                        <li>Irregular deletes: {events.filter(e => e.action === 'DELETE').length}</li>
                    </ul>
                </div>
            </div>
            <div className="grid grid-cols-2 gap-6">
                <div className="bg-[#020617] p-4 rounded-xl border border-cyan-800">
                    <h3 className="text-gray-300 mb-3">Reports</h3>
                    <button onClick={handleExportPDF} className="bg-cyan-500 px-4 py-2 rounded">Export PDF</button>
                    <button onClick={handleExportCSV} className="bg-purple-500 ml-3 px-4 py-2 rounded">Export CSV</button>
                </div>
                <div className="bg-[#020617] p-4 rounded-xl border border-cyan-800">
                    <h3 className="text-gray-300 mb-3">Timeline View</h3>
                    <p className="text-sm text-gray-400">Chronological sequence of the latest events.</p>
                    <div className="mt-3 text-sm text-gray-300 bg-[#0f172a] p-3 rounded-xl border border-cyan-800">
                        {auditFilteredEvents.slice(0, 5).map(event => (
                            <div key={event.eventId} className="mb-2">
                                <p>{event.timestamp.split('T')[1].slice(0,8)} - {event.userId} {event.action}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    </div>
)}

{role === 'employee' && (
    <div className="bg-[#0f172a] p-6 rounded-xl border border-cyan-800">
        <h2 className="text-xl font-semibold text-gray-200">Employee Dashboard</h2>
        <div className="grid grid-cols-3 gap-6 mt-4">
            <div className="bg-[#020617] p-4 rounded-xl border border-cyan-800">
                <h3 className="text-gray-300 mb-3">My Activity</h3>
                {employeeEvents.length === 0 ? (
                    <p className="text-sm text-gray-400">No recent personal activity.</p>
                ) : (
                    employeeEvents.slice(0, 5).map(event => (
                        <div key={event.eventId} className="mb-3 p-3 rounded-xl bg-[#0b1724] border border-cyan-800">
                            <p className="text-white text-sm">{event.action} {event.resource}</p>
                            <p className="text-xs text-gray-400">{event.timestamp.split('T')[0]} • {event.status}</p>
                        </div>
                    ))
                )}
            </div>
            <div className="bg-[#020617] p-4 rounded-xl border border-cyan-800">
                <h3 className="text-gray-300 mb-3">Transaction Status</h3>
                <p className="text-sm text-gray-400">Pending / confirmed status for your actions.</p>
                <div className="mt-3 space-y-2 text-sm text-gray-300">
                    {employeeEvents.slice(0, 5).map(event => (
                        <div key={event.eventId} className="p-3 rounded-xl bg-[#0f172a] border border-cyan-800">
                            <p>{event.eventId}</p>
                            <p>{event.transactionStatus}</p>
                        </div>
                    ))}
                </div>
            </div>
            <div className="bg-[#020617] p-4 rounded-xl border border-cyan-800">
                <h3 className="text-gray-300 mb-3">Notifications</h3>
                <p className="text-sm text-gray-400">Approval, rejection, or error events appear here.</p>
                <div className="mt-3 space-y-2 text-sm text-gray-300">
                    <p>{failedEvents > 0 ? `${failedEvents} failed event(s)` : 'No recent errors.'}</p>
                    <p>Latest: {employeeEvents[0]?.action || 'No recent activity'}</p>
                </div>
            </div>
        </div>
    </div>
)}

</div>


{/* CHAIN VIEW */}

<div className="bg-[#0f172a] p-6 rounded-xl">

<h2 className="mb-4 text-gray-400">Chain View</h2>

<div className="flex gap-3 overflow-x-auto">

{events.map((block) => (
    <div
    key={block.index}
    className="px-4 py-3 bg-[#020617] border border-cyan-800 rounded-lg text-sm cursor-pointer relative"
    onMouseEnter={() => setHoveredBlock(block)}
    onMouseLeave={() => setHoveredBlock(null)}
    >
    #{block.index}
    {hoveredBlock && hoveredBlock.index === block.index && (
        <div className="absolute top-full mt-2 bg-white text-black text-xs p-2 rounded shadow-lg z-10 border border-gray-300">
            <div>User: {hoveredBlock.userId || 'system'}</div>
            <div>Action: {hoveredBlock.action || 'GENESIS'}</div>
            <div>Resource: {hoveredBlock.resource || 'N/A'}</div>
            <div>Status: {hoveredBlock.status || 'N/A'}</div>
            <div>Timestamp: {new Date(hoveredBlock.timestamp).toLocaleString()}</div>
        </div>
    )}
    </div>
))}

</div>

</div>


{/* CHART + HEALTH */}

<div className="grid grid-cols-3 gap-6">

<div className="col-span-2 bg-[#0f172a] p-6 rounded-xl">

<h2 className="mb-4 text-gray-400">Event Volume</h2>

<Line data={lineData} />

</div>


<div className="bg-[#0f172a] p-6 rounded-xl space-y-4">

<h2 className="text-gray-400">System Health</h2>

{["Hash Chain","Merkle Roots","Signatures","IPFS Anchors"].map(item=>(
<div key={item} className="flex justify-between bg-[#020617] p-3 rounded-lg">

<span>{item}</span>

<span className="text-green-400">OK</span>

</div>
))}

</div>

</div>

<div className="bg-red-900 p-4 rounded">
    ⚠️ Failed Events: {failedEvents}
</div>


{/* EVENTS + BREAKDOWN */}

<div className="grid grid-cols-2 gap-6">

<div className="bg-[#0f172a] p-6 rounded-xl">

<h2 className="mb-4 text-gray-400">Live Event Feed</h2>

<div className="space-y-3">

{events.map((e,i)=>(
<div key={i} className="flex justify-between bg-[#020617] p-3 rounded">

<span>{e.userId || "system"}</span>

<span className="text-gray-400 text-sm">
    {e.action || "GENESIS"}
</span>
<span className={e.status === "SUCCESS" ? "text-green-400" : "text-red-400"}>
    {e.status}
</span>
</div>
))}

</div>

</div>


<div className="bg-[#0f172a] p-6 rounded-xl">

<h2 className="mb-4 text-gray-400">Event Breakdown</h2>

<Doughnut data={doughnutData}/>

</div>

</div>


</div>

)

}