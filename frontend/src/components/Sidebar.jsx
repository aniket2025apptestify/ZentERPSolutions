import { NavLink, useLocation } from 'react-router-dom';
import { getNavigationForRole } from '../config/navigation.jsx';

const Sidebar = ({ isOpen, onToggle, user }) => {
  const location = useLocation();
  const navigation = getNavigationForRole(user?.role);

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-20 lg:hidden transition-opacity"
          onClick={onToggle}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-30 h-screen transition-all duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } ${isOpen ? 'w-72' : 'w-20'} bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white shadow-2xl`}
      >
        <div className="flex flex-col h-full">
          {/* Logo/Brand */}
          <div className="flex items-center justify-between h-20 px-4 border-b border-slate-700/50 bg-slate-800/30 backdrop-blur-sm">
            {isOpen ? (
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
                  <span className="text-xl font-bold text-white">Z</span>
                </div>
                <div>
                  <h1 className="text-xl font-bold text-white tracking-tight">Zent ERP</h1>
                  <p className="text-xs text-slate-400">Business Suite</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center w-full">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
                  <span className="text-xl font-bold text-white">Z</span>
                </div>
              </div>
            )}
            <button
              onClick={onToggle}
              className="lg:hidden text-slate-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-slate-700/50"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto py-6 px-3 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
            <ul className="space-y-1.5">
              {navigation.map((item) => {
                const isActive = location.pathname === item.href || 
                  (item.href !== '/' && location.pathname.startsWith(item.href));
                return (
                  <li key={item.name}>
                    <NavLink
                      to={item.href}
                      className={`
                        group flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200
                        ${
                          isActive
                            ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/30'
                            : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
                        }
                      `}
                      title={!isOpen ? item.name : ''}
                    >
                      <span className={`flex-shrink-0 transition-transform ${isActive ? 'scale-110' : 'group-hover:scale-110'}`}>
                        {item.icon}
                      </span>
                      {isOpen && (
                        <span className={`ml-3 transition-all ${isActive ? 'font-semibold' : ''}`}>
                          {item.name}
                        </span>
                      )}
                      {isActive && isOpen && (
                        <span className="ml-auto h-2 w-2 rounded-full bg-white/80"></span>
                      )}
                    </NavLink>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* User Info */}
          {isOpen && user && (
            <div className="p-4 border-t border-slate-700/50 bg-slate-800/30 backdrop-blur-sm">
              <div className="flex items-center space-x-3 p-3 rounded-xl bg-slate-700/30 hover:bg-slate-700/50 transition-colors cursor-pointer">
                <div className="flex-shrink-0">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
                    <span className="text-sm font-semibold text-white">
                      {user.name?.charAt(0).toUpperCase() || 'U'}
                    </span>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{user.name || 'User'}</p>
                  <p className="text-xs text-slate-400 truncate">{user.role || 'Role'}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
