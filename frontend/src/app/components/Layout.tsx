import { Outlet, Link, useLocation, useNavigate } from "react-router";
import { Server, Bell, FileText, LogOut, User, Menu as MenuIcon, Database, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useAlerts } from "../../hooks/useAlerts";
import { Input } from "./ui/input";
import { getErrorMessage } from "../../services/api";

export function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, user, saveProfile } = useAuth();
  const { activeAlerts } = useAlerts(true, 10000);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [profileData, setProfileData] = useState({ username: "", email: "" });
  const [profileError, setProfileError] = useState("");
  const [profileSuccess, setProfileSuccess] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  useEffect(() => {
    setIsRealtimeConnected(Boolean(window.__monitoringRealtimeConnected));

    const handleStatusChange = (event: Event) => {
      const customEvent = event as CustomEvent<{ isConnected?: boolean }>;
      setIsRealtimeConnected(Boolean(customEvent.detail?.isConnected));
    };

    window.addEventListener('monitoring:websocket-status', handleStatusChange as EventListener);

    return () => {
      window.removeEventListener('monitoring:websocket-status', handleStatusChange as EventListener);
    };
  }, []);

  useEffect(() => {
    if (!isProfileOpen) {
      return;
    }

    setProfileData({
      username: user?.username || "",
      email: user?.email || "",
    });
  }, [isProfileOpen, user]);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleOpenProfile = () => {
    setProfileError("");
    setProfileSuccess("");
    setIsProfileOpen(true);
  };

  const handleCloseProfile = () => {
    setIsProfileOpen(false);
    setProfileError("");
    setProfileSuccess("");
  };

  const handleSaveProfile = async (event: React.FormEvent) => {
    event.preventDefault();
    setProfileError("");
    setProfileSuccess("");
    setIsSavingProfile(true);

    try {
      await saveProfile({
        username: profileData.username.trim(),
        email: profileData.email.trim(),
      });
      setProfileSuccess("User profile updated successfully!");
    } catch (error) {
      setProfileError(getErrorMessage(error));
    } finally {
      setIsSavingProfile(false);
    }
  };

  const navItems = [
    { path: "/", label: "Dashboard", icon: Server },
    { path: "/servers", label: "Servers", icon: Database },
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
             <span
               className={`hidden md:inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${
                 isRealtimeConnected
                   ? "bg-emerald-500/15 text-emerald-200"
                   : "bg-amber-500/15 text-amber-200"
               }`}
             >
               <span
                 className={`h-2 w-2 rounded-full ${
                   isRealtimeConnected ? "bg-emerald-400" : "bg-amber-400"
                 }`}
               />
               {isRealtimeConnected ? "Tiempo real conectado" : "Tiempo real desconectado"}
             </span>
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
            <button
              type="button"
              onClick={handleOpenProfile}
              className="relative p-2 hover:bg-[#34495e] rounded-md transition-colors"
              aria-label="Edit user profile"
            >
              <User className="w-5 h-5" />
            </button>
            <button className="relative p-2 hover:bg-[#34495e] rounded-md transition-colors">
              <Bell className="w-5 h-5" />
              {activeAlerts.length > 0 && (
                <>
                  <span
                    data-testid="header-alert-indicator"
                    className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-500"
                  />
                  <span className="sr-only">Pending alerts</span>
                </>
              )}
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

      {isProfileOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg bg-white text-gray-900 shadow-xl">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <div>
                <h2 className="text-lg font-semibold">Edit user profile</h2>
                <p className="text-sm text-gray-500">Update your account information.</p>
              </div>
              <button
                type="button"
                onClick={handleCloseProfile}
                className="rounded-md p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                aria-label="Close profile form"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4 px-6 py-5">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Username</label>
                <Input
                  value={profileData.username}
                  onChange={(event) =>
                    setProfileData((prev) => ({ ...prev, username: event.target.value }))
                  }
                  minLength={3}
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Email</label>
                <Input
                  type="email"
                  value={profileData.email}
                  onChange={(event) =>
                    setProfileData((prev) => ({ ...prev, email: event.target.value }))
                  }
                />
              </div>

              {profileError && (
                <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {profileError}
                </div>
              )}

              {profileSuccess && (
                <div className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
                  {profileSuccess}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleCloseProfile}
                  className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingProfile}
                  className="rounded-md bg-[#3b82f6] px-4 py-2 text-sm text-white hover:bg-[#2563eb] disabled:opacity-60"
                >
                  {isSavingProfile ? "Saving..." : "Save changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="p-6">
        <Outlet />
      </main>
    </div>
  );
}
