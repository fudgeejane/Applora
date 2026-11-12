import api from "./api";

export async function uploadResume(file, { name, occupation }, onUploadProgress) {
  const formData = new FormData();
  formData.append("name", name.trim());
  formData.append("occupation", occupation.trim());
  formData.append("resume", file);
  const response = await api.post("/resumes/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
    onUploadProgress,
  });
  return response.data.resume;
}
