// App.js
import React, { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { supabase } from "./lib/supabaseClient";
import "./App.css";

// Layout Components
import AdminLayout from "./components/Layouts/AdminLayout";
import ExecutiveLayout from "./components/Layouts/ExecutiveLayout";
import EmployeeLayout from "./components/Layouts/EmployeeLayout";

// Pages
import AdminDashboard from "./pages/Admin/admin_Dashboard_Page";
import ViewProjects from "./pages/Admin/Project_List_Page";
import EmployeeTasks from "./pages/Employees/Employee_Tasks";
import Settings from "./pages/General/Settings";
import UserManagement from "./pages/Admin/UserManagement";
import Login from "./pages/General/Login";
import ProjectDetail from "./pages/Admin/ProjectDetail";
import EmployeeDashboard from "./pages/Employees/Employee_Dashboard";
import ExecutiveOverview from "./pages/Executive/ExecutiveOverview";
import ExecutiveReports from "./pages/Executive/ExecutiveReports";

const queryClient = new QueryClient();

function App() {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);

 
  useEffect(() => {
    const getSession = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error) console.error("Error getting session:", error.message);
      setUser(data?.session?.user ?? null);
      setLoading(false);
    };

    getSession();

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
      }
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);


  useEffect(() => {
    const fetchUserRole = async () => {
      if (!user) {
        setUserRole(null);
        return;
      }

      const { data: profileData, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      if (error) {
        console.error("Error fetching role:", error.message);
        setUserRole("employee"); // fallback
      } else if (!profileData) {
        console.warn("No profile found, defaulting to employee");
        setUserRole("employee");
      } else {
        setUserRole(profileData.role || "employee");
      }
    };

    fetchUserRole();
  }, [user]);

  if (loading) return <div className="loading-screen">Checking session...</div>;

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {user ? (
          <>
            {/* Admin Layout */}
            {userRole === "admin" && (
              <AdminLayout>
                <Routes>
                  <Route path="/" element={<AdminDashboard />} />
                  <Route path="/dashboard" element={<AdminDashboard />} />
                  <Route path="/projects" element={<ViewProjects />} />
                  <Route
                    path="/project/:projectId"
                    element={<ProjectDetail />}
                  />
                  <Route path="/employees" element={<UserManagement />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="*" element={<Navigate to="/" />} />
                </Routes>
              </AdminLayout>
            )}

            {/* Executive Layout */}
            {userRole === "executive" && (
              <ExecutiveLayout>
                <Routes>
                  <Route path="/" element={<ExecutiveOverview />} />
                  <Route path="/overview" element={<ExecutiveOverview />} />
                  <Route path="/reports" element={<ExecutiveReports />} />
                  <Route path="*" element={<Navigate to="/" />} />
                </Routes>
              </ExecutiveLayout>
            )}

            {/* Employee Layout (default) */}
            {(userRole === "employee" || !userRole) && (
              <EmployeeLayout>
                <Routes>
                  <Route path="/" element={<EmployeeDashboard />} />
                  <Route path="/my-tasks" element={<EmployeeTasks />} />
                  <Route path="*" element={<Navigate to="/" />} />
                </Routes>
              </EmployeeLayout>
            )}
          </>
        ) : (
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="*" element={<Navigate to="/login" />} />
          </Routes>
        )}
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
