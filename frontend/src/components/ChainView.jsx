export default function ChainView({ blocks }) {

  return (

    <div className="bg-gray-900 border border-gray-700 p-4 rounded-xl">

      <h2 className="text-sm text-gray-400 mb-3">
        Chain View
      </h2>

      <div className="flex gap-2 overflow-x-auto">

        {blocks.map((b) => (

          <div
            key={b.id}
            className="px-3 py-2 bg-gray-800 rounded text-xs"
          >
            #{b.id}
          </div>

        ))}

      </div>

    </div>

  );
}