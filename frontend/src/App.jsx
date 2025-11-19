import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './store/store';
import './App.css';

function App() {
  return (
    <Provider store={store}>
      <Router>
        <div className="min-h-screen bg-gray-50">
          <Routes>
            <Route path="/" element={<div className="p-8"><h1 className="text-2xl font-bold">Zent ERP</h1></div>} />
            {/* Add more routes here */}
          </Routes>
        </div>
      </Router>
    </Provider>
  );
}

export default App;
