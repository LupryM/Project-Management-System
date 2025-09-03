import { supabase } from './supabaseClient';

export const logActivity = async ({ 
  type, 
  details, 
  projectId = null, 
  taskId = null, 
  userId 
}) => {
  try {
    const { error } = await supabase
      .from('project_logs')
      .insert({
        activity_type: type,
        activity_details: details,
        project_id: projectId,
        task_id: taskId,
        user_id: userId,
      });

    if (error) {
      console.error('Error logging activity:', error);
      throw error;
    }
    
    return true;
  } catch (error) {
    console.error('Failed to log activity:', error);
    return false;
  }
};

// Helper function to format common activity messages
export const formatActivity = {
  userRoleChange: (adminEmail, userEmail, oldRole, newRole) => 
    `User role changed by ${adminEmail}: ${userEmail} from ${oldRole} to ${newRole}`,
  
  projectCreated: (userName, projectTitle) =>
    `${userName} created project: ${projectTitle}`,
  
  projectUpdated: (userName, projectTitle) =>
    `${userName} updated project: ${projectTitle}`,
  
  taskAssigned: (userName, taskTitle, assigneeName) =>
    `${userName} assigned task "${taskTitle}" to ${assigneeName}`,
  
  taskStatusChange: (userName, taskTitle, oldStatus, newStatus) =>
    `${userName} changed task "${taskTitle}" status from ${oldStatus} to ${newStatus}`,
  
  fileUploaded: (userName, fileName, projectTitle) =>
    `${userName} uploaded file "${fileName}" to project ${projectTitle}`
};