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
          className="fixed inset-0 bg-gray-600 bg-opacity-75 z-20 lg:hidden"
          onClick={onToggle}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-30 h-screen transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } ${isOpen ? 'w-64' : 'w-20'} bg-gray-900 text-white`}
      >
        <div className="flex flex-col h-full">
          {/* Logo/Brand */}
          <div className="flex items-center justify-between h-16 px-4 border-b border-gray-800">
            {isOpen ? (
              <div className="flex items-center">
                <h1 className="text-xl font-bold text-white">Zent ERP</h1>
              </div>
            ) : (
              <div className="flex items-center justify-center w-full">
                <span className="text-2xl font-bold">Z</span>
              </div>
            )}
            <button
              onClick={onToggle}
              className="lg:hidden text-gray-400 hover:text-white"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto py-4">
            <ul className="space-y-1 px-2">
              {navigation.map((item) => {
                // Check if current path starts with the item href (for nested routes)
                const isActive = location.pathname === item.href || 
                  (item.href !== '/' && location.pathname.startsWith(item.href));
                return (
                  <li key={item.name}>
                    <NavLink
                      to={item.href}
                      className={`
                        flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors
                        ${
                          isActive
                            ? 'bg-indigo-600 text-white'
                            : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                        }
                      `}
                      title={!isOpen ? item.name : ''}
                    >
                      <span className="flex-shrink-0">{item.icon}</span>
                      {isOpen && <span className="ml-3">{item.name}</span>}
                    </NavLink>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* User Info */}
          {isOpen && user && (
            <div className="p-4 border-t border-gray-800">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="h-10 w-10 rounded-full bg-indigo-600 flex items-center justify-center">
                    <span className="text-sm font-medium text-white">
                      {user.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-white">{user.name}</p>
                  <p className="text-xs text-gray-400">{user.role}</p>
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

