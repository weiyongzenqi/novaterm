import { ThemeProvider } from './themes';
import AppLayout from './components/layout/AppLayout';
import './App.css';

function App() {
  return (
    <ThemeProvider defaultTheme="dracula">
      <AppLayout />
    </ThemeProvider>
  );
}

export default App;
