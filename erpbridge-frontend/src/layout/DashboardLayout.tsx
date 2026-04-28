import { useState } from "react";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div
      className="flex h-screen w-screen bg-gradient-to-br 
                 from-gray-50 via-gray-100 to-gray-200 
                 text-gray-800 transition-colors duration-500"
    >
      {/* Overlay para móvil */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`
          fixed lg:static inset-y-0 left-0 z-50
          transform transition-transform duration-300 ease-in-out
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
          lg:translate-x-0
        `}
      >
        <Sidebar 
          isOpen={sidebarOpen} 
          onClose={() => setSidebarOpen(false)} 
        />
      </div>

      {/* Main content area */}
      <div className="flex flex-col flex-1 overflow-hidden w-full">
        {/* Header */}
        <Header onMenuClick={() => setSidebarOpen(true)} />

        {/* Main content */}
        <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto">
          <div
            className="bg-white/80 backdrop-blur-md rounded-xl md:rounded-2xl shadow-lg 
                       border border-gray-200 p-4 md:p-6 lg:p-8 transition-all duration-300"
          >
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}