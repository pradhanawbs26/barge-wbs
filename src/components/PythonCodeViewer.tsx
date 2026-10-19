import React, { useState } from 'react';
import { Copy, Check, Download, FileCode, Terminal, ExternalLink, ShieldCheck } from 'lucide-react';

interface PythonCodeViewerProps {
  pythonCode: string;
}

export const PythonCodeViewer: React.FC<PythonCodeViewerProps> = ({ pythonCode }) => {
  const [copiedApp, setCopiedApp] = useState(false);
  const [copiedReqs, setCopiedReqs] = useState(false);
  const [copiedSecrets, setCopiedSecrets] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<'app' | 'requirements' | 'secrets' | 'guide'>('app');

  const requirementsContent = `streamlit>=1.35.0
pandas>=2.0.0
numpy>=1.24.0
plotly>=5.18.0
st-gsheets-connection>=0.1.0`;

  const secretsContent = `# .streamlit/secrets.toml
# Konfigurasi Koneksi Google Sheets untuk st.connection("gsheets", type=GSheetsConnection)

# Opsi 1: Spreadsheet Publik (Anyone with the link can view)
[connections.gsheets]
spreadsheet = "https://docs.google.com/spreadsheets/d/YOUR_SPREADSHEET_ID_HERE/edit"

# Opsi 2: Service Account Google Cloud (Untuk Private Sheet)
# [connections.gsheets]
# spreadsheet = "https://docs.google.com/spreadsheets/d/YOUR_SPREADSHEET_ID_HERE/edit"
# type = "service_account"
# project_id = "your-gcp-project-id"
# private_key_id = "your-private-key-id"
# private_key = "-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----\\n"
# client_email = "your-service-account@your-gcp-project-id.iam.gserviceaccount.com"`;

  const copyToClipboard = (text: string, type: 'app' | 'reqs' | 'secrets') => {
    navigator.clipboard.writeText(text);
    if (type === 'app') {
      setCopiedApp(true);
      setTimeout(() => setCopiedApp(false), 2000);
    } else if (type === 'reqs') {
      setCopiedReqs(true);
      setTimeout(() => setCopiedReqs(false), 2000);
    } else {
      setCopiedSecrets(true);
      setTimeout(() => setCopiedSecrets(false), 2000);
    }
  };

  const downloadFile = (content: string, fileName: string) => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
              <FileCode className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Skrip Lengkap Streamlit, Pandas & Plotly (app.py)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Mengintegrasikan Google Sheets Connection (`st.connection`), cache 10 menit (`@st.cache_data`), dan styling Cupertino.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => downloadFile(pythonCode, 'app.py')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
          >
            <Download className="w-3.5 h-3.5" />
            Unduh app.py
          </button>
          <button
            onClick={() =>
              copyToClipboard(
                activeSubTab === 'app'
                  ? pythonCode
                  : activeSubTab === 'requirements'
                  ? requirementsContent
                  : secretsContent,
                activeSubTab === 'app' ? 'app' : activeSubTab === 'requirements' ? 'reqs' : 'secrets'
              )
            }
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition shadow-sm"
          >
            {copiedApp || copiedReqs || copiedSecrets ? (
              <>
                <Check className="w-3.5 h-3.5" />
                Tersalin!
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                Salin File Ini
              </>
            )}
          </button>
        </div>
      </div>

      {/* Sub tabs */}
      <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
        <button
          onClick={() => setActiveSubTab('app')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
            activeSubTab === 'app'
              ? 'bg-slate-900 text-white'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          app.py (Skrip Utama)
        </button>
        <button
          onClick={() => setActiveSubTab('requirements')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
            activeSubTab === 'requirements'
              ? 'bg-slate-900 text-white'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          requirements.txt
        </button>
        <button
          onClick={() => setActiveSubTab('secrets')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
            activeSubTab === 'secrets'
              ? 'bg-slate-900 text-white'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          .streamlit/secrets.toml
        </button>
        <button
          onClick={() => setActiveSubTab('guide')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
            activeSubTab === 'guide'
              ? 'bg-slate-900 text-white'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          📖 Panduan Menjalankan
        </button>
      </div>

      {/* Content based on sub tab */}
      {activeSubTab === 'app' && (
        <div className="relative">
          <div className="bg-slate-950 rounded-xl p-4 overflow-x-auto text-slate-100 font-mono text-xs leading-relaxed max-h-[540px]">
            <pre>{pythonCode}</pre>
          </div>
        </div>
      )}

      {activeSubTab === 'requirements' && (
        <div className="space-y-4">
          <p className="text-xs text-slate-600">
            Daftar paket dependensi yang dibutuhkan untuk menjalankan aplikasi Streamlit.
          </p>
          <div className="bg-slate-950 rounded-xl p-4 overflow-x-auto text-emerald-400 font-mono text-xs max-h-[300px]">
            <pre>{requirementsContent}</pre>
          </div>
          <button
            onClick={() => downloadFile(requirementsContent, 'requirements.txt')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200"
          >
            <Download className="w-3.5 h-3.5" />
            Unduh requirements.txt
          </button>
        </div>
      )}

      {activeSubTab === 'secrets' && (
        <div className="space-y-4">
          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-800 flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <strong>Penting untuk Keamanan:</strong> Jangan mempublikasikan private key atau token ke GitHub publik. Simpan konfigurasi ini di file lokal <code>.streamlit/secrets.toml</code> atau pada panel Secrets di Streamlit Community Cloud.
            </div>
          </div>
          <div className="bg-slate-950 rounded-xl p-4 overflow-x-auto text-amber-300 font-mono text-xs max-h-[340px]">
            <pre>{secretsContent}</pre>
          </div>
        </div>
      )}

      {activeSubTab === 'guide' && (
        <div className="space-y-4 text-xs text-slate-700 leading-relaxed">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
              <h4 className="font-bold text-slate-900 text-sm mb-2 flex items-center gap-1.5">
                <Terminal className="w-4 h-4 text-indigo-600" />
                1. Cara Menjalankan di Komputer Lokal
              </h4>
              <ol className="list-decimal list-inside space-y-1.5 text-slate-600">
                <li>Buka terminal pada direktori proyek.</li>
                <li>Buat virtual environment (opsional tapi disarankan):
                  <code className="block bg-slate-900 text-emerald-400 p-1.5 rounded mt-1">python -m venv venv && source venv/bin/activate</code>
                </li>
                <li>Install dependensi:
                  <code className="block bg-slate-900 text-emerald-400 p-1.5 rounded mt-1">pip install -r requirements.txt</code>
                </li>
                <li>Jalankan Streamlit:
                  <code className="block bg-slate-900 text-emerald-400 p-1.5 rounded mt-1">streamlit run app.py</code>
                </li>
                <li>Buka browser pada alamat <code>http://localhost:8501</code>.</li>
              </ol>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
              <h4 className="font-bold text-slate-900 text-sm mb-2 flex items-center gap-1.5">
                <ExternalLink className="w-4 h-4 text-indigo-600" />
                2. Cara Deploy ke Streamlit Cloud
              </h4>
              <ol className="list-decimal list-inside space-y-1.5 text-slate-600">
                <li>Push repository ini ke GitHub.</li>
                <li>Buka <a href="https://share.streamlit.io" target="_blank" rel="noreferrer" className="text-indigo-600 underline">share.streamlit.io</a> dan pilih repository Anda.</li>
                <li>Atur file utama ke <code>app.py</code>.</li>
                <li>Pada tab <strong>Advanced Settings &gt; Secrets</strong>, masukkan URL spreadsheet Google Anda seperti contoh di tab <code>secrets.toml</code>.</li>
                <li>Klik <strong>Deploy</strong>! Aplikasi langsung online secara otomatis.</li>
              </ol>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
