import React from "react";

const ReportsPage = () => {
  const reportUrl =
    "https://app.powerbi.com/view?r=eyJrIjoiOWVkNDIxNWYtZTk2ZS00ZmUyLWI4YjktYjg3YmQ2OTY5MjgxIiwidCI6IjRiMWI5MDhjLTU1ODItNDM3Ny1iYTA3LWEzNmQ2NWUzNDkzNCIsImMiOjh9";

  return (
    <div style={{ padding: "20px" }}>
      <h2>FUN WITH MAMA REPORT DASHBOARD</h2>
      <p style={{ color: "#666", marginBottom: "20px" }}>
        View your report below. Use Power BI controls to navigate through all
        pages.
      </p>

      <div
        style={{
          height: "90vh",
          width: "100%",
          border: "1px solid #ccc",
          borderRadius: "6px",
          overflow: "hidden",
        }}
      >
        <iframe
          title="Fun With Mama Report"
          src={reportUrl}
          width="100%"
          height="100%"
          frameBorder="0"
          allowFullScreen
        />
      </div>
    </div>
  );
};

export default ReportsPage;
