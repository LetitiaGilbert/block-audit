import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  LineElement,
  CategoryScale,
  LinearScale
} from "chart.js";

ChartJS.register(LineElement, CategoryScale, LinearScale);

export default function Charts() {

  const data = {

    labels: ["1","2","3","4","5"],

    datasets: [
      {
        data: [12,19,3,5,2],
        borderColor: "#22d3ee"
      }
    ]
  };

  return (

    <div className="bg-gray-900 p-4 rounded-xl">

      <h2 className="text-sm text-gray-400 mb-3">
        Event Volume
      </h2>

      <Line data={data} />

    </div>

  );
}