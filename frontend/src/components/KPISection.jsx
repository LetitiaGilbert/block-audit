function Card({ title, value }) {

  return (

    <div className="bg-gray-900 border border-gray-700 p-4 rounded-xl">

      <p className="text-xs text-gray-400">{title}</p>

      <h2 className="text-2xl font-bold mt-1">{value}</h2>

    </div>

  );
}

export default function KPISection({ totalEvents }) {

  return (

    <div className="grid grid-cols-4 gap-4">

      <Card title="Total Events Logged" value={totalEvents} />

      <Card title="Chain Integrity" value="100%" />

      <Card title="Avg Block Time" value="28s" />

      <Card title="Active Actors" value="247" />

    </div>

  );
}