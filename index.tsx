import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

// 避免在开发模式下热更新时重复 createRoot 的警告
// @ts-ignore
const root = rootElement._reactRoot || ReactDOM.createRoot(rootElement);
// @ts-ignore
rootElement._reactRoot = root;

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);