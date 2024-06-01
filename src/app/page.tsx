"use client";

import React, { useState } from "react";
import { callSplit } from "../anchorClient";
import {
  useConnection,
  useWallet,
  useAnchorWallet,
} from "@solana/wallet-adapter-react";
import Papa from "papaparse"; // CSVファイルを解析するためのライブラリ

const Home: React.FC = () => {
  const { publicKey, connected } = useWallet();
  const wallet = useAnchorWallet();
  const { connection } = useConnection();
  const [status, setStatus] = useState<string>("");
  const [resultUrl, setResultUrl] = useState<string>("");
  const [csvData, setCsvData] = useState<{ address: string; amount: number }[]>(
    []
  );

  const handleCsvUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results: any) => {
          const data = results.data as { address: string; amount: string }[];
          const formattedData = data.map((item: any) => ({
            address: item.address,
            amount: parseFloat(item.amount),
          }));
          setCsvData(formattedData);
        },
        error: (error: any) => {
          console.error("Error parsing CSV file:", error);
        },
      });
    }
  };

  const handleHelloClick = async () => {
    if (!connected) {
      setStatus("ウォレットが接続されていません");
      return;
    }

    setStatus("プログラム実行中...");

    try {
      const result = await callSplit(wallet, connection, csvData);
      setStatus("プログラムが正常に実行されました");
      setResultUrl(`https://solscan.io/tx/${result}?cluster=devnet`);
    } catch (err: any) {
      setStatus(`プログラムの実行に失敗しました: ${err.message}`);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4 space-y-4">
      <div className="w-full max-w-xl bg-white p-8 rounded-lg shadow-md">
        <h1 className="text-2xl font-semibold mb-6 text-center">
          PYUSDトークンの送付
        </h1>
        <input
          type="file"
          accept=".csv"
          onChange={handleCsvUpload}
          className="mb-4 border border-gray-300 rounded-md p-2"
        />
        {csvData.length > 0 && (
          <div className="mb-4">
            <h2 className="text-lg font-semibold mb-2">CSVデータ</h2>
            <table className="min-w-full bg-white border border-gray-300 rounded-md overflow-hidden">
              <thead>
                <tr className="bg-gray-200">
                  <th className="py-2 px-4 border-b">アドレス</th>
                  <th className="py-2 px-4 border-b">金額</th>
                </tr>
              </thead>
              <tbody>
                {csvData.map((item, index) => (
                  <tr key={index} className="even:bg-gray-100">
                    <td className="py-2 px-4 border-b">{item.address}</td>
                    <td className="py-2 px-4 border-b">{item.amount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <button
          onClick={handleHelloClick}
          disabled={!connected || csvData.length === 0}
          className="relative w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        >
          プログラムを実行
        </button>
      </div>
      {status && (
        <div className="mt-4 p-4 bg-gray-200 rounded-md shadow-inner max-w-xl w-full text-center">
          <p className="text-sm text-gray-600 break-all">{status}</p>
        </div>
      )}
      {resultUrl && (
        <div className="mt-4 p-4 max-w-xl w-full text-center">
          <p className="text-left text-sm text-gray-600 break-all">
            <span className="font-semibold">実行結果</span>:{" "}
            <a
              href={resultUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600"
            >
              {resultUrl}
            </a>
          </p>
        </div>
      )}
    </div>
  );
};

export default Home;
