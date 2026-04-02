export default function HealthPanel() {

  const items = [
    "Hash Chain",
    "Merkle Roots",
    "Signatures",
    "IPFS Anchors"
  ];

  return (

    <div className="bg-gray-900 p-4 rounded-xl">

      <h2 className="text-sm text-gray-400 mb-3">
        System Health
      </h2>

      {items.map((i) => (

        <div
          key={i}
          className="flex justify-between border-b border-gray-800 py-2"
        >

          <span>{i}</span>

          <span className="text-green-400">
            OK
          </span>

        </div>

      ))}

    </div>

  );
}