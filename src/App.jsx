import React from "react";
import BasicInit from "./components/BasicInit.jsx";
import { WillowDark } from "@svar-ui/react-gantt";

export default function App() {
  const skinSettings = {};
  return (
    <div className="wx-willow-dark-theme" style={{ height: "100vh" }}>
      <WillowDark />
      <BasicInit skinSettings={skinSettings} />
    </div>
  );
}



