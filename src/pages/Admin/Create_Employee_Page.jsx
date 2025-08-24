import React, { useState } from "react";
import "./Css/Create_Employee_Page.css"; // Assuming you have a CSS file for styling

const CreateEmployee = () => {
  const [employee, setEmployee] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    department: "Engineering",
    position: "",
    hireDate: "",
    employmentType: "Full-time",
  });

  const departments = ["Engineering", "Design", "HR", "Finance", "Operations"];
  const employmentTypes = ["Full-time", "Part-time", "Contract", "Intern"];

  return (
    <div className="employee-form-container">
      <h2>New Employee Onboarding</h2>

      <div className="form-section">
        <h3>Basic Information</h3>
        <div className="form-row">
          <input
            placeholder="First Name"
            value={employee.firstName}
            onChange={(e) =>
              setEmployee({ ...employee, firstName: e.target.value })
            }
          />
          <input
            placeholder="Last Name"
            value={employee.lastName}
            onChange={(e) =>
              setEmployee({ ...employee, lastName: e.target.value })
            }
          />
        </div>

        <div className="form-row">
          <input
            type="email"
            placeholder="Company Email"
            value={employee.email}
            onChange={(e) =>
              setEmployee({ ...employee, email: e.target.value })
            }
          />
          <input
            type="tel"
            placeholder="Phone Number"
            value={employee.phone}
            onChange={(e) =>
              setEmployee({ ...employee, phone: e.target.value })
            }
          />
        </div>
      </div>

      <div className="form-section">
        <h3>Employment Details</h3>
        <div className="form-row">
          <select
            value={employee.department}
            onChange={(e) =>
              setEmployee({ ...employee, department: e.target.value })
            }
          >
            {departments.map((dept) => (
              <option key={dept} value={dept}>
                {dept}
              </option>
            ))}
          </select>

          <input
            placeholder="Job Title"
            value={employee.position}
            onChange={(e) =>
              setEmployee({ ...employee, position: e.target.value })
            }
          />
        </div>

        <div className="form-row">
          <select
            value={employee.employmentType}
            onChange={(e) =>
              setEmployee({ ...employee, employmentType: e.target.value })
            }
          >
            {employmentTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>

          <input
            type="date"
            value={employee.hireDate}
            onChange={(e) =>
              setEmployee({ ...employee, hireDate: e.target.value })
            }
          />
        </div>
      </div>

      <button className="submit-btn">Create Employee</button>
    </div>
  );
};

export default CreateEmployee;
