import React from "react";

export default function NameAndDateCell({ row }) {
  const name = row?.text ?? "";
  return <span>{name}</span>;
}


