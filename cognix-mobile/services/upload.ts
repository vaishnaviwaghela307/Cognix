import * as FileSystem from 'expo-file-system';

const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = 'cognix_unsigned'; // You typically need to create an unsigned upload preset in Cloudinary dashboard

export const uploadToCloudinary = async (fileUri: string, type: 'image' | 'video' | 'raw' = 'image') => {
  if (!CLOUD_NAME) {
    throw new Error('Cloudinary Cloud Name not found in environment variables');
  }

  const data = new FormData();
  data.append('file', {
    uri: fileUri,
    type: 'image/jpeg', // Adjust based on file type
    name: fileUri.split('/').pop(),
  } as any);
  
  data.append('upload_preset', UPLOAD_PRESET); 
  data.append('cloud_name', CLOUD_NAME);

  try {
    const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${type}/upload`, {
      method: 'POST',
      body: data,
    });
    
    const result = await response.json();
    if (result.secure_url) {
        return result.secure_url;
    } else {
        throw new Error(result.error?.message || 'Upload failed');
    }
  } catch (error) {
    console.error('Cloudinary Upload Error:', error);
    throw error;
  }
};
