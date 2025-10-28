import React from "react";
import BasicInit from "./components/BasicInit.jsx";

export default function App() {
  const skinSettings = {};
  return (
    <div className="wx-willow-dark-theme" style={{ height: "100vh" }}>
      <BasicInit skinSettings={skinSettings} />
    </div>
  );
}



