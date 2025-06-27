import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Music, Calendar, Settings, Home, User, LogOut, ChevronDown, UserCircle, UserPlus } from 'lucide-react';
import Cookies from 'js-cookie';

const Navigation = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const isActive = (path: string) => {
    if (path === '/organizer') {
      return location.pathname === '/organizer' || location.pathname === '/organizer/panel';
    }
    return location.pathname === path;
  };

  // Decode JWT token to get user data
  const decodeJWT = (token: string) => {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      return JSON.parse(jsonPayload);
    } catch (error) {
      console.error('Error decoding JWT:', error);
      return null;
    }
  };

  // Check authentication status and get current user from JWT
  useEffect(() => {
    const token = Cookies.get('jwt');
    if (token) {
      const decodedToken = decodeJWT(token);
      if (decodedToken && decodedToken.exp > Date.now() / 1000) {
        setUser({
          id: decodedToken.user_id,
          username: decodedToken.username,
          email: decodedToken.email,
          // Use username as fallback for name if not available
          name: decodedToken.name || decodedToken.username
        });
      } else {
        // Token expired, clear it
        handleLogout();
      }
    } else {
      setUser(null);
    }
  }, [location.pathname]); // Re-run when route changes to update auth state

  // Handle clicks outside the dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const isAuthenticated = (): boolean => {
    const token = Cookies.get('jwt');
    if (!token) return false;
    
    const decodedToken = decodeJWT(token);
    return !!(decodedToken && decodedToken.exp > Date.now() / 1000);
  };

  // Check if user is an organizer (has organizer token)
  const isOrganizer = (): boolean => {
    const organizerToken = localStorage.getItem('organizerToken');
    return !!organizerToken;
  };

  // Complete logout function - clears everything
  const handleLogout = () => {
    // Clear all cookies
    Cookies.remove('jwt');
    Cookies.remove('festifly_token'); // Clean up legacy
    
    // Clear all localStorage items (clean up legacy)
    localStorage.removeItem('festifly_token');
    localStorage.removeItem('festifly_user');
    localStorage.removeItem('jwt');
    localStorage.removeItem('organizerToken'); // Clear organizer token
    
    // Clear sessionStorage as well
    sessionStorage.clear();
    
    // Reset user state
    setUser(null);
    setIsDropdownOpen(false);
    
    // Navigate to home
    navigate('/');
    
    // Force page reload to ensure all state is cleared
    setTimeout(() => {
      window.location.reload();
    }, 100);
  };

  // Handle organizer logout (separate from regular logout)
  const handleOrganizerLogout = () => {
    localStorage.removeItem('organizerToken');
    Cookies.remove('jwt');
    setIsDropdownOpen(false);
    navigate('/organizer');
  };
  
  return (
    <nav style={{
      backgroundColor: "rgba(0, 0, 0, 0.2)",
      backdropFilter: "blur(16px)",
      borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
      position: "relative",
      zIndex: 1000
    }}>
      <div style={{
        maxWidth: "80rem",
        margin: "0 auto",
        padding: "0 1rem",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        height: "4rem"
      }}>
        <Link to="/" style={{ display: "flex", alignItems: "center", gap: "0.5rem", textDecoration: "none" }}>
          <Music size={32} color="#c084fc" />
          <span style={{ fontSize: "1.5rem", fontWeight: "bold", color: "white" }}>FestiFly</span>
        </Link>
        
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <Link
            to="/"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.25rem",
              padding: "0.5rem 0.75rem",
              borderRadius: "0.5rem",
              transition: "all 0.2s",
              textDecoration: "none",
              ...(isActive('/') 
                ? { backgroundColor: "rgb(124, 58, 237)", color: "white" } 
                : { color: "rgb(209, 213, 219)" })
            }}
          >
            <Home size={16} />
            <span>Home</span>
          </Link>
          
          <Link
            to="/discover"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.25rem",
              padding: "0.5rem 0.75rem",
              borderRadius: "0.5rem",
              transition: "all 0.2s",
              textDecoration: "none",
              ...(isActive('/discover') 
                ? { backgroundColor: "rgb(124, 58, 237)", color: "white" } 
                : { color: "rgb(209, 213, 219)" })
            }}
          >
            <Calendar size={16} />
            <span>Discover</span>
          </Link>
          
          {/* Organizer link - show for organizers or if on organizer pages */}
          {(isOrganizer() || location.pathname.startsWith('/organizer')) && (
            <Link
              to={isOrganizer() ? "/organizer/panel" : "/organizer"}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.25rem",
                padding: "0.5rem 0.75rem",
                borderRadius: "0.5rem",
                transition: "all 0.2s",
                textDecoration: "none",
                ...(isActive('/organizer') 
                  ? { backgroundColor: "rgb(124, 58, 237)", color: "white" } 
                  : { color: "rgb(209, 213, 219)" })
              }}
            >
              <Settings size={16} />
              <span>Organizer</span>
            </Link>
          )}
          
          {/* Profile dropdown */}
          <div style={{ position: "relative", marginLeft: "1rem" }} ref={dropdownRef}>
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.25rem",
                padding: "0.5rem 0.75rem",
                borderRadius: "0.5rem",
                transition: "all 0.2s",
                backgroundColor: isDropdownOpen ? "rgba(255, 255, 255, 0.1)" : "transparent",
                border: "none",
                cursor: "pointer"
              }}
            >
              <div style={{
                height: "2rem",
                width: "2rem",
                borderRadius: "9999px",
                background: isOrganizer() 
                  ? "linear-gradient(to bottom right, rgb(34, 197, 94), rgb(16, 185, 129))" 
                  : "linear-gradient(to bottom right, rgb(124, 58, 237), rgb(37, 99, 235))",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                position: "relative"
              }}>
                {user ? (
                  <span style={{ color: "white", fontWeight: "500" }}>
                    {user.name ? user.name.charAt(0).toUpperCase() : user.username?.charAt(0).toUpperCase() || "U"}
                  </span>
                ) : (
                  <UserCircle size={24} color="white" />
                )}
                {/* Organizer badge */}
                {isOrganizer() && (
                  <div style={{
                    position: "absolute",
                    top: "-2px",
                    right: "-2px",
                    width: "12px",
                    height: "12px",
                    backgroundColor: "rgb(34, 197, 94)",
                    borderRadius: "50%",
                    border: "2px solid rgba(0, 0, 0, 0.2)"
                  }} />
                )}
              </div>
              <ChevronDown 
                size={16} 
                color="white" 
                style={{ 
                  transition: "transform 0.2s",
                  transform: isDropdownOpen ? "rotate(180deg)" : "rotate(0)" 
                }} 
              />
            </button>

            {/* Dropdown menu */}
            {isDropdownOpen && (
              <div style={{
                position: "absolute",
                right: 0,
                marginTop: "0.5rem",
                width: "14rem",
                backgroundColor: "rgba(255, 255, 255, 0.1)",
                backdropFilter: "blur(16px)",
                borderRadius: "0.5rem",
                boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)",
                border: "1px solid rgba(255, 255, 255, 0.2)",
                zIndex: 1050,
                animation: "dropdownFade 0.2s ease-out forwards"
              }}>
                {isAuthenticated() || isOrganizer() ? (
                  <>
                    <div style={{
                      padding: "1rem",
                      borderBottom: "1px solid rgba(255, 255, 255, 0.1)"
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
                        <p style={{ fontSize: "0.875rem", fontWeight: "500", color: "white" }}>
                          {user?.name || user?.username || "User"}
                        </p>
                        {isOrganizer() && (
                          <span style={{
                            fontSize: "0.625rem",
                            backgroundColor: "rgb(34, 197, 94)",
                            color: "white",
                            padding: "0.125rem 0.375rem",
                            borderRadius: "0.25rem",
                            fontWeight: "500"
                          }}>
                            ORGANIZER
                          </span>
                        )}
                      </div>
                      <p style={{
                        fontSize: "0.75rem",
                        color: "rgb(209, 213, 219)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap"
                      }}>
                        {user?.email || ""}
                      </p>
                    </div>

                    {/* Regular user options */}
                    {isAuthenticated() && (
                      <Link 
                        to="/profile" 
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem",
                          padding: "0.5rem 1rem",
                          fontSize: "0.875rem",
                          color: "rgb(209, 213, 219)",
                          textDecoration: "none"
                        }}
                        onClick={() => setIsDropdownOpen(false)}
                      >
                        <User size={16} />
                        <span>View Profile</span>
                      </Link>
                    )}

                    {/* Organizer-specific options */}
                    {isOrganizer() && (
                      <>
                        <Link 
                          to="/organizer/panel" 
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.5rem",
                            padding: "0.5rem 1rem",
                            fontSize: "0.875rem",
                            color: "rgb(209, 213, 219)",
                            textDecoration: "none"
                          }}
                          onClick={() => setIsDropdownOpen(false)}
                        >
                          <Settings size={16} />
                          <span>Organizer Panel</span>
                        </Link>
                        
                        <div style={{ height: "1px", backgroundColor: "rgba(255, 255, 255, 0.1)", margin: "0.25rem 0" }} />
                        
                        <button 
                          onClick={handleOrganizerLogout}
                          style={{
                            width: "100%",
                            textAlign: "left",
                            padding: "0.5rem 1rem",
                            fontSize: "0.875rem",
                            color: "rgb(252, 165, 165)",
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: "0.5rem"
                          }}
                        >
                          <LogOut size={16} />
                          <span>Logout from Organizer</span>
                        </button>
                      </>
                    )}

                    {/* Regular logout for authenticated users */}
                    {isAuthenticated() && (
                      <>
                        <div style={{ height: "1px", backgroundColor: "rgba(255, 255, 255, 0.1)", margin: "0.25rem 0" }} />
                        <button 
                          onClick={handleLogout}
                          style={{
                            width: "100%",
                            textAlign: "left",
                            padding: "0.5rem 1rem",
                            fontSize: "0.875rem",
                            color: "rgb(252, 165, 165)",
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: "0.5rem"
                          }}
                        >
                          <LogOut size={16} />
                          <span>Logout</span>
                        </button>
                      </>
                    )}
                  </>
                ) : (
                  <>
                    <Link 
                      to="/auth" 
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        padding: "0.5rem 1rem",
                        fontSize: "0.875rem",
                        color: "rgb(209, 213, 219)",
                        textDecoration: "none"
                      }}
                      onClick={() => setIsDropdownOpen(false)}
                    >
                      <User size={16} />
                      <span>Login</span>
                    </Link>
                    
                    <Link 
                      to="/organizer" 
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        padding: "0.5rem 1rem",
                        fontSize: "0.875rem",
                        color: "rgb(34, 197, 94)",
                        textDecoration: "none"
                      }}
                      onClick={() => setIsDropdownOpen(false)}
                    >
                      <Settings size={16} />
                      <span>Organizer Login</span>
                    </Link>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes dropdownFade {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}} />
    </nav>
  );
};

export default Navigation;