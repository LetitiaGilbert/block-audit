export default function BlockExplorer({ blocks, onSelect }) {

  return (

    <div className="bg-gray-900 p-4 rounded-xl">

      <h2 className="text-sm text-gray-400 mb-3">
        Block Explorer
      </h2>

      {blocks.map((b) => (

        <div
          key={b.id}
          onClick={() => onSelect(b)}
          className="bg-gray-800 p-2 rounded mb-2 cursor-pointer hover:bg-gray-700"
        >

          Block #{b.id}

        </div>

      ))}

    </div>

  );
}