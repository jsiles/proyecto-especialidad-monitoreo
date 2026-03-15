import { useState } from "react";
import { useNavigate } from "react-router";
import { Server, User, Lock } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Checkbox } from "../components/ui/checkbox";

export function Login() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Mock login - navigate to dashboard
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-[#f5f7fa] flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        {/* Login Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl text-gray-700 font-medium">Login</h1>
        </div>

        {/* Login Card with Background */}
        <div className="bg-[#2c3e50] rounded-lg shadow-2xl overflow-hidden relative">
          {/* Blurred Server Background */}
          <div className="absolute inset-0 opacity-20">
            <div className="absolute inset-0 bg-gradient-to-br from-[#1e293b] to-[#334155]"></div>
            <div className="absolute top-10 left-10 w-32 h-24 bg-[#3b82f6] opacity-30 blur-2xl rounded-lg"></div>
            <div className="absolute bottom-10 right-10 w-40 h-32 bg-[#3b82f6] opacity-30 blur-2xl rounded-lg"></div>
            <div className="absolute top-1/3 right-1/4 w-24 h-20 bg-[#3b82f6] opacity-20 blur-xl rounded-lg"></div>
          </div>

          {/* Login Form */}
          <div className="relative flex items-center justify-center min-h-[500px] p-8">
            <div className="w-full max-w-md">
              {/* Logo and Title */}
              <div className="text-center mb-8">
                <div className="flex items-center justify-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-[#3b82f6] rounded-lg flex items-center justify-center">
                    <Server className="w-7 h-7 text-white" />
                  </div>
                  <h2 className="text-2xl text-white font-medium">
                    Server Monitoring Platform
                  </h2>
                </div>
              </div>

              {/* Form */}
              <form onSubmit={handleLogin} className="space-y-6">
                <div className="bg-[#1e293b]/60 backdrop-blur-sm rounded-lg p-8 space-y-6">
                  {/* Username Input */}
                  <div className="space-y-2">
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2">
                        <User className="w-5 h-5 text-gray-400" />
                      </div>
                      <Input
                        type="text"
                        placeholder="Username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="w-full bg-[#2c3e50] border-[#3b4a5f] text-white placeholder:text-gray-400 pl-12 py-6 rounded-md"
                      />
                    </div>
                  </div>

                  {/* Password Input */}
                  <div className="space-y-2">
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2">
                        <Lock className="w-5 h-5 text-gray-400" />
                      </div>
                      <Input
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-[#2c3e50] border-[#3b4a5f] text-white placeholder:text-gray-400 pl-12 py-6 rounded-md"
                      />
                    </div>
                  </div>

                  {/* Remember Me */}
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="remember"
                      checked={rememberMe}
                      onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                      className="border-gray-400"
                    />
                    <label htmlFor="remember" className="text-gray-300 text-sm cursor-pointer">
                      Remember Me
                    </label>
                  </div>

                  {/* Login Button */}
                  <Button
                    type="submit"
                    className="w-full bg-[#3b82f6] hover:bg-[#2563eb] text-white py-6 rounded-md"
                  >
                    Login
                  </Button>

                  {/* Forgot Password Link */}
                  <div className="text-center">
                    <button
                      type="button"
                      className="text-gray-300 hover:text-white text-sm underline"
                    >
                      Forgot Password?
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
