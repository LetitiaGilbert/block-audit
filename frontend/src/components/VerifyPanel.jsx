export default function VerifyPanel({ block, onClose }) {

  return (

    <div className="fixed bottom-5 right-5 bg-gray-900 p-6 border border-cyan-400 rounded-xl w-72">

      <div className="flex justify-between mb-3">

        <h2 className="text-cyan-400 font-bold">
          Block Verification
        </h2>

        <button onClick={onClose}>✕</button>

      </div>

      <p>Block #{block.id}</p>

      <p className="text-sm text-gray-400">
        Hash: {block.hash}
      </p>

      <p className="text-green-400 mt-3">
        ✓ HASH VALID
      </p>

    </div>

  );
}