import React from "react";

export default function WeeksCell({ row }) {
  if (!row?.start || !row?.end) {
    return <div style={{ textAlign: "center", color: "rgba(203,213,225,.5)" }}>-</div>;
  }

  const startDate = new Date(row.start);
  const endDate = new Date(row.end);

  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    return <div style={{ textAlign: "center", color: "rgba(203,213,225,.5)" }}>-</div>;
  }

  // Calculate difference in milliseconds
  const diffTime = endDate - startDate;
  
  // Convert to weeks with 1 decimal place
  const diffDays = diffTime / (1000 * 60 * 60 * 24);
  const weeks = diffDays / 7;
  const weeksFormatted = weeks.toFixed(1);

  return (
    <div
      style={{
        textAlign: "center",
        fontSize: "10.5px",
        color: "inherit",
        padding: "4px 2px",
        whiteSpace: "nowrap",
      }}
    >
      {weeksFormatted}
    </div>
  );
}

