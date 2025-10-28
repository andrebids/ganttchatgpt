import React from "react";

export default function AddTaskCell({ row, api }) {
  return (
    <button
      title="Add subtask"
      onClick={(e) => {
        e.stopPropagation();
        const parent = row?.id ?? 0;
        const start = row?.start || new Date().toISOString();
        api?.exec("add-task", {
          task: {
            text: "New subtask",
            type: "task",
            start,
            duration: 1,
            parent,
          },
        });
      }}
      style={{
        width: 24,
        height: 24,
        borderRadius: 4,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        background: "transparent",
        color: "#cbd5e1",
        border: "1px solid rgba(203,213,225,.25)",
        lineHeight: 1,
        fontSize: 14,
      }}
    >
      +
    </button>
  );
}


