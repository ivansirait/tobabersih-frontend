"use client";
import { useState, useEffect } from 'react';
import axios from 'axios';
import { TrendingUp, AlertCircle, Loader } from 'lucide-react';

interface PredictionData {
  date: string;
  predicted_volume_kg: number;
  confidence: string;
  model_accuracy: number;
}

export default function PredictionWidget() {
  const [prediction, setPrediction] = useState<PredictionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPrediction();
  }, []);

  const fetchPrediction = async () => {
    try {
      setLoading(true);
      const res = await axios.get('http://localhost:5000/ai/predict-waste');

      if (res.data.success) {
        setPrediction(res.data.data.prediction);
        setError(null);
      }
    } catch (err: any) {
      console.error('Prediction Error:', err);
      setError(err.response?.data?.error || 'Gagal mengambil prediksi');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white p-4 md:p-6 rounded-xl md:rounded-3xl shadow-sm border border-slate-100 flex items-center justify-center">
        <Loader className="animate-spin text-blue-500" size={20} />
        <span className="ml-3 text-sm text-slate-600">Loading prediksi...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white p-4 md:p-6 rounded-xl md:rounded-3xl shadow-sm border border-red-200 flex items-start gap-3 md:gap-4">
        <AlertCircle className="text-red-500 mt-0.5" size={20} />
        <div>
          <h3 className="text-sm md:text-base font-bold text-slate-800">AI Engine Offline</h3>
          <p className="text-xs md:text-sm text-slate-600">{error}</p>
          <button
            onClick={fetchPrediction}
            className="mt-2 text-blue-600 text-xs md:text-sm font-semibold hover:underline"
          >
            Coba Lagi
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 md:p-6 rounded-xl md:rounded-3xl shadow-sm border border-blue-200">
      <div className="flex items-center justify-between mb-3 md:mb-4">
        <h3 className="text-base md:text-lg font-bold text-slate-800">Prediksi Sampah Besok</h3>
        <TrendingUp className="text-blue-600" size={20} />
      </div>

      {prediction && (
        <div className="space-y-2 md:space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-xs md:text-sm text-slate-600">Tanggal</span>
            <span className="text-xs md:text-sm font-semibold text-slate-800">{prediction.date}</span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-xs md:text-sm text-slate-600">Volume Prediksi</span>
            <span className="text-lg md:text-xl font-black text-blue-600">
              {prediction.predicted_volume_kg} kg
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-xs md:text-sm text-slate-600">Confidence</span>
            <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-bold">
              {prediction.confidence}
            </span>
          </div>

          <div className="flex justify-between items-center pt-2 md:pt-3 border-t border-blue-200">
            <span className="text-xs md:text-sm text-slate-600">Model Accuracy</span>
            <span className="text-xs md:text-sm font-semibold text-slate-800">{prediction.model_accuracy}%</span>
          </div>
        </div>
      )}
    </div>
  );
}