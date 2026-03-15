import { Outlet, Link, useLocation, useNavigate } from "react-router";
import { Server, Bell, FileText, LogOut, User, Download, Menu as MenuIcon } from "lucide-react";
import { useState } from "react";

export function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    navigate('/login');
  };

  const navItems = [
    { path: "/", label: "Dashboard", icon: Server },
    { path: "/alerts", label: "Alerts", icon: Bell },
    { path: "/reports", label: "Reports", icon: FileText },
  ];

  return (
    <div className="min-h-screen bg-[#f5f7fa]">
      {/* Header */}
      <header className="bg-[#2c3e50] text-white shadow-md">
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Server className="w-8 h-8 text-[#3b82f6]" />
            <h1 className="font-semibold text-xl">Server Monitoring</h1>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
                    isActive
                      ? "bg-[#34495e] text-white"
                      : "text-gray-300 hover:bg-[#34495e] hover:text-white"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Right side icons */}
          <div className="flex items-center gap-4">
            <button className="relative p-2 hover:bg-[#34495e] rounded-md transition-colors">
              <User className="w-5 h-5" />
            </button>
            <button className="relative p-2 hover:bg-[#34495e] rounded-md transition-colors">
              <Download className="w-5 h-5" />
            </button>
            <button className="relative p-2 hover:bg-[#34495e] rounded-md transition-colors">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>
            <button
              onClick={handleLogout}
              className="p-2 hover:bg-[#34495e] rounded-md transition-colors"
            >
              <LogOut className="w-5 h-5" />
            </button>

            {/* Mobile menu button */}
            <button
              className="md:hidden p-2 hover:bg-[#34495e] rounded-md transition-colors"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <MenuIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <nav className="md:hidden border-t border-[#34495e] py-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-2 px-6 py-3 ${
                    isActive
                      ? "bg-[#34495e] text-white"
                      : "text-gray-300 hover:bg-[#34495e] hover:text-white"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        )}
      </header>

      {/* Main Content */}
      <main className="p-6">
        <Outlet />
      </main>
    </div>
  );
}
