export default function Header({ blockHeight }) {

  return (

    <header className="flex justify-between items-center px-6 h-16 border-b border-gray-800">

      <h1 className="text-xl font-bold">
        Audit<span className="text-cyan-400">Chain</span>
      </h1>

      <div className="text-sm text-gray-400">
        Block Height: {blockHeight}
      </div>

    </header>

  );
}