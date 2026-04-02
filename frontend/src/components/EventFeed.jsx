export default function EventFeed({ events }) {

  return (

    <div className="bg-gray-900 p-4 rounded-xl">

      <h2 className="text-sm text-gray-400 mb-3">
        Live Event Feed
      </h2>

      <div className="space-y-2">

        {events.map((e, i) => (

          <div
            key={i}
            className="bg-gray-800 p-2 rounded text-sm"
          >
            {e.actor} - {e.action}
          </div>

        ))}

      </div>

    </div>

  );
}