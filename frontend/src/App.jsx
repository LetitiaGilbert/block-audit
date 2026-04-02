const API_URL = "http://localhost:3000";

import { useState, useEffect } from "react";
import { Line, Doughnut } from "react-chartjs-2";
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

const [events,setEvents] = useState([])
const [blockHeight,setBlockHeight] = useState(1042)
const [isValid, setIsValid] = useState(true);

useEffect(() => {

    const fetchData = async () => {
        try {
        const res = await fetch(`${API_URL}/chain`);
        const data = await res.json();
        const verifyRes = await fetch(`${API_URL}/verify`);
        const verifyData = await verifyRes.json();
        setIsValid(verifyData.valid);

        setEvents(data.slice(-7).reverse()); // latest 7 blocks
        setBlockHeight(data.length - 1);

        } catch (err) {
        console.error("Error fetching chain:", err);
        }
    };

    fetchData();

    const interval = setInterval(fetchData, 3000); // auto-refresh

    return () => clearInterval(interval);

    }, []);

const lineData={
labels:["1","4","7","10","13","16","19","22"],
datasets:[
{
label:"Documents",
data:[400,800,500,900,600,1000,700,950],
borderColor:"#00e5ff",
tension:.4
},
{
label:"Supply",
data:[300,500,400,600,450,700,600,500],
borderColor:"#ff7849",
tension:.4
},
{
label:"System",
data:[200,300,250,350,300,400,350,320],
borderColor:"#a855f7",
tension:.4
}
]
}

const doughnutData={
labels:["Documents","Financial","Supply","System"],
datasets:[
{
data:[18420,12830,9847,7194],
backgroundColor:["#00e5ff","#22c55e","#ff7849","#a855f7"]
}
]
}

return(

<div className="bg-[#020617] text-white min-h-screen">

{/* HEADER */}

<header className="flex justify-between items-center px-8 py-4 border-b border-gray-800">

<h1 className="text-2xl font-bold">
Audit<span className="text-cyan-400">Chain</span>
</h1>

<div className="flex gap-6 text-sm">

<span>Block Height <b className="text-cyan-400">#{blockHeight}</b></span>

<span className="bg-green-900 text-green-400 px-3 py-1 rounded-full">
● LIVE
</span>

</div>

</header>


<div className="p-8 space-y-8">

{/* KPI */}

    <button
    onClick={async () => {
        await fetch(`${API_URL}/addLog`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            userId: "letitia",
            action: "CREATE",
            resource: "dashboard",
            status: "SUCCESS"
        })
        });
    }}
    className="bg-cyan-500 px-4 py-2 rounded"
    >
    Add Event
    </button>

<h2 className="text-3xl font-bold text-green-400">
    {isValid ? "100%" : "COMPROMISED"}
</h2>

<div className="grid grid-cols-4 gap-6">

<div className="bg-[#0f172a] p-6 rounded-xl border border-cyan-900">
<p className="text-gray-400 text-sm">Total Events Logged</p>
<h2 className="text-3xl font-bold mt-2">{events.length}</h2>
</div>

<div className="bg-[#0f172a] p-6 rounded-xl border border-green-900">
<p className="text-gray-400 text-sm">Chain Integrity</p>
<h2 className="text-3xl font-bold text-green-400">100%</h2>
</div>

<div className="bg-[#0f172a] p-6 rounded-xl border border-orange-900">
<p className="text-gray-400 text-sm">Avg Block Time</p>
<h2 className="text-3xl font-bold">28s</h2>
</div>

<div className="bg-[#0f172a] p-6 rounded-xl border border-purple-900">
<p className="text-gray-400 text-sm">Active Actors</p>
<h2 className="text-3xl font-bold">{new Set(events.map(e => e.data?.userId)).size}</h2>
</div>

</div>


{/* CHAIN VIEW */}

<div className="bg-[#0f172a] p-6 rounded-xl">

<h2 className="mb-4 text-gray-400">Chain View</h2>

<div className="flex gap-3 overflow-x-auto">

{events.map((block) => (
    <div
    key={block.index}
    className="px-4 py-3 bg-[#020617] border border-cyan-800 rounded-lg text-sm"
    >
    #{block.index}
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


{/* EVENTS + BREAKDOWN */}

<div className="grid grid-cols-2 gap-6">

<div className="bg-[#0f172a] p-6 rounded-xl">

<h2 className="mb-4 text-gray-400">Live Event Feed</h2>

<div className="space-y-3">

{events.map((e,i)=>(
<div key={i} className="flex justify-between bg-[#020617] p-3 rounded">

<span>{e.data?.userId || "system"}</span>

<span className="text-gray-400 text-sm">
    {e.data?.action || "GENESIS"}
</span>
<span className="text-gray-400 text-sm">{e.type}</span>

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

</div>

)

}