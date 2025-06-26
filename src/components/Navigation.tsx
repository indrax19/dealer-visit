import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  BarChart3, Users, UserX, Calendar, Home, Shield, LogOut, GitCompare, Menu, X
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";

const Navigation = () => {
  const { currentUser, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

  const navItems = [
    { to: "/", icon: Home, label: "Dashboard" },
    { to: "/active-users", icon: Users, label: "Active Users" },
    { to: "/expired-users", icon: UserX, label: "Expired Users" },
    { to: "/historical", icon: Calendar, label: "Historical Data" },
    { to: "/compare", icon: GitCompare, label: "Compare Data" },
  ];

  const adminItems = [
    { to: "/admin", icon: Shield, label: "Admin Panel" },
  ];

  const handleLogoClick = () => {
    navigate("/");
    setMenuOpen(false);
  };

  return (
    <nav className="bg-white shadow-sm border-b relative z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div
            className="flex items-center space-x-2 cursor-pointer"
            onClick={handleLogoClick}
          >
            <BarChart3 className="h-8 w-8 text-blue-600" />
            <h1 className="text-xl font-bold text-gray-900">TES & McSOL</h1>
          </div>

          {/* Hamburger Icon */}
          <div className="md:hidden">
            {menuOpen ? (
              <X className="h-6 w-6 text-gray-700" onClick={() => setMenuOpen(false)} />
            ) : (
              <Menu className="h-6 w-6 text-gray-700" onClick={() => setMenuOpen(true)} />
            )}
          </div>

          {/* Desktop Menu */}
          <div className="hidden md:flex md:items-center md:space-x-8">
            {navItems.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                end
                className={({ isActive }) =>
                  `flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isActive
                    ? "bg-blue-100 text-blue-700"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                  }`
                }
              >
                <Icon className="h-4 w-4" />
                <span>{label}</span>
              </NavLink>
            ))}
            {currentUser?.role === "admin" &&
              adminItems.map(({ to, icon: Icon, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) =>
                    `flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isActive
                      ? "bg-red-100 text-red-700"
                      : "text-red-600 hover:text-red-900 hover:bg-red-100"
                    }`
                  }
                >
                  <Icon className="h-4 w-4" />
                  <span>{label}</span>
                </NavLink>
              ))}
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">{currentUser?.name}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={logout}
                className="flex items-center space-x-2"
              >
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {menuOpen && (
        <div className="fixed inset-0 bg-white z-40 px-6 py-6 flex flex-col space-y-4 shadow-md md:hidden">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end
              onClick={() => setMenuOpen(false)}
              className={({ isActive }) =>
                `flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isActive
                  ? "bg-blue-100 text-blue-700"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                }`
              }
            >
              <Icon className="h-4 w-4" />
              <span>{label}</span>
            </NavLink>
          ))}
          {currentUser?.role === "admin" &&
            adminItems.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                onClick={() => setMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isActive
                    ? "bg-red-100 text-red-700"
                    : "text-red-600 hover:text-red-900 hover:bg-red-100"
                  }`
                }
              >
                <Icon className="h-4 w-4" />
                <span>{label}</span>
              </NavLink>
            ))}
          <div className="flex flex-col space-y-2 pt-2 border-t">
            <span className="text-sm text-gray-600">{currentUser?.name}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                logout();
                setMenuOpen(false);
              }}
              className="flex items-center space-x-2"
            >
              <LogOut className="h-4 w-4" />
              <span>Logout</span>
            </Button>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navigation;